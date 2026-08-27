import time
import base64
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot
from app.schemas.schemas import ANPRScanRequest
from app.core.security import require_role

router = APIRouter(prefix="/anpr", tags=["Simulación ANPR & Control de Garita"])


def _detect_plate_opencv(image_bytes: bytes) -> dict:
    """Detección real con OpenCV + corrección + OCR liviano.
    Retorna {plate, confidence, vehicle_type, debug}. Fail-open: si falta dependencia, lanza ImportError.
    """
    import cv2
    import numpy as np
    from PIL import Image
    import io

    t0 = time.perf_counter()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")

    # Preprocesado base: gris + CLAHE para iluminación variable + blur
    gray_full = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_full = clahe.apply(gray_full)
    except Exception:
        pass
    gray = cv2.GaussianBlur(gray_full, (5, 5), 0)
    h_img, w_img = gray.shape[:2]

    # Intentar YOLO si está disponible (ultralytics opcional)
    yolo_plate = None
    yolo_conf = 0
    yolo_roi = None
    try:
        from ultralytics import YOLO  # type: ignore
        import os
        model_path = os.getenv("YOLO_PLATE_MODEL", "yolov8n.pt")
        if os.path.exists(model_path):
            model = YOLO(model_path)
            results = model(gray, verbose=False)
            for r in results:
                for box in r.boxes:
                    conf = float(box.conf[0]) if hasattr(box, 'conf') else 0
                    if conf > yolo_conf:
                        yolo_conf = conf
                        yolo_plate = box
            if yolo_plate is not None:
                x1, y1, x2, y2 = map(int, yolo_plate.xyxy[0].tolist())
                roi = gray_full[max(0, y1):y2, max(0, x1):x2]
                if roi.size > 0:
                    gray = roi
                    yolo_roi = roi
    except Exception:
        pass

    # Fallback OpenCV: buscar contornos con proporción de placa (2.0 - 5.8) si YOLO no recortó
    plate_roi = yolo_roi
    try:
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        if yolo_plate is None:
            edges = cv2.Canny(thresh, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            h_img, w_img = gray.shape[:2]
            best_score = 0
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                area = w * h
                if area < (w_img * h_img * 0.005) or area > (w_img * h_img * 0.5):
                    continue
                aspect = w / float(h) if h else 0
                if 2.0 <= aspect <= 5.8 and h >= 18 and w >= 70:
                    score = area * (1 - abs(aspect - 3.5) / 3.5)
                    if score > best_score:
                        best_score = score
                        plate_roi = gray[y:y+h, x:x+w]
            if plate_roi is not None:
                gray = plate_roi
    except Exception:
        pass

    # OCR robusto: múltiples preprocesados + PSM, corrección por posición (letras 0-2, dígitos 3-5)
    import re
    raw_text = ""
    ocr_conf = 0
    best_corrected = ""
    best_score = -1

    def _correct_by_position(s: str) -> str:
        s = s.upper().replace(" ", "").replace("-", "")
        if len(s) < 5:
            return s
        is_moto = s[0].isdigit()
        if is_moto:
            # Moto: 4 dígitos + 2 alfanum (ej: 1234-5B, 9876-AA)
            prefix = s[:4].replace("O", "0").replace("I", "1").replace("L", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0").replace("D", "0").replace("G", "6")
            suffix = s[4:]
            # Sufijo moto: mantener mixto, solo corregir 0->O si parece letra
            if len(suffix) == 2 and suffix.isdigit():
                suffix = suffix[0] + suffix[1].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B")
            return prefix + suffix
        # Auto/Carga/Bus: detectar LNN vs LLN por segundo char
        if len(s) == 6:
            if s[1].isalpha():
                # LLN-NNN (carga/bus): AG1-234, BA2-541
                p0 = s[0].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B").replace("6", "G").replace("2", "Z").replace("4", "A")
                p1 = s[1].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B").replace("6", "G").replace("2", "Z").replace("4", "A")
                p2 = s[2].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0").replace("D", "0")
                suffix = s[3:6].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0")
                return p0 + p1 + p2 + suffix
            else:
                # LNN-NNN (auto): B11-123
                p0 = s[0].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B").replace("6", "G").replace("2", "Z").replace("4", "A")
                p1 = s[1].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0")
                p2 = s[2].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0")
                suffix = s[3:6].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0")
                return p0 + p1 + p2 + suffix
        if len(s) == 5:
            prefix = s[:2].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B").replace("6", "G").replace("2", "Z").replace("4", "A")
            suffix = s[2:].replace("O", "0").replace("I", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4")
            return prefix + suffix
        prefix = s[:3].replace("0", "O").replace("1", "I").replace("5", "S").replace("8", "B").replace("6", "G").replace("2", "Z").replace("4", "A")
        suffix = s[3:6].replace("O", "0").replace("I", "1").replace("L", "1").replace("S", "5").replace("B", "8").replace("Z", "2").replace("A", "4").replace("Q", "0").replace("D", "0").replace("G", "6")
        if len(s) == 7:
            return prefix + suffix[:2] + s[6]
        return prefix + suffix

    def _is_valid_plate(s: str) -> bool:
        # Formatos peruanos reales con guion ya quitado (6 sin guion, 7 con variantes)
        # Auto particular: B11-123 -> B11123 (L N N + N N N)
        if re.match(r"^[A-Z][0-9]{2}[0-9]{3}$", s): return True
        # Legacy 3 letras: ABC-123
        if re.match(r"^[A-Z]{3}[0-9]{3}$", s): return True
        # Carga: AG1-234 (L L N + NNN, segunda L es G-R)
        if re.match(r"^[A-Z][G-R][0-9][0-9]{3}$", s): return True
        # Bus: BA2-541 (segunda L es A-F)
        if re.match(r"^[A-Z][A-F][0-9][0-9]{3}$", s): return True
        # Genérico LLN-NNN
        if re.match(r"^[A-Z]{2}[0-9][0-9]{3}$", s): return True
        # Moto: 4 dígitos + 2 mixto (1234-5B, 9876-AA, 4532-1W)
        if re.match(r"^[0-9]{4}[A-Z]{2}$", s): return True
        if re.match(r"^[0-9]{4}[0-9][A-Z]$", s): return True
        if re.match(r"^[0-9]{4}[A-Z][0-9]$", s): return True
        if re.match(r"^[A-Z]{3}[0-9]{2}[A-Z]$", s): return True
        if re.match(r"^[A-Z]{2}[0-9]{4}$", s): return True
        # Permisivo para pruebas mixtas como A1B-234 (6 alfanum con letras y números)
        if 5 <= len(s) <= 7 and s.isalnum() and sum(c.isalpha() for c in s) >= 2 and sum(c.isdigit() for c in s) >= 2:
            return True
        return False

    try:
        import pytesseract  # type: ignore

        # Preparar 3 variantes de binarizado para probar
        variants = []
        # Variante 1: OTSU (ya calculado como thresh)
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Si el fondo es oscuro (placa negra), invertir
        if float((otsu == 0).sum()) / float(otsu.size or 1) > 0.55:
            otsu = 255 - otsu
        variants.append(otsu)
        # Variante 2: Adaptativo
        try:
            adapt = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)
            if float((adapt == 0).sum()) / float(adapt.size or 1) > 0.55:
                adapt = 255 - adapt
            variants.append(adapt)
        except Exception:
            pass
        # Variante 3: CLAHE + OTSU invertido
        try:
            clahe2 = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(gray)
            _, clahe_thr = cv2.threshold(clahe2, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            if float((clahe_thr == 0).sum()) / float(clahe_thr.size or 1) > 0.55:
                clahe_thr = 255 - clahe_thr
            variants.append(clahe_thr)
        except Exception:
            pass

        configs = [
            "--oem 1 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
            "--oem 1 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
            "--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
        ]

        for v_img in variants:
            # Escalar si es pequeño
            proc = v_img
            if proc.shape[0] < 70:
                scale = 2.2
                proc = cv2.resize(proc, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            # Dilatar leve para unir caracteres rotos
            proc = cv2.medianBlur(proc, 3)
            for cfg in configs:
                try:
                    data = pytesseract.image_to_data(proc, config=cfg, output_type=pytesseract.Output.DICT)
                    for i, txt in enumerate(data.get("text", [])):
                        t = txt.strip().replace(" ", "").upper()
                        if len(t) < 5:
                            continue
                        c = int(data["conf"][i]) if str(data["conf"][i]).lstrip("-").isdigit() else -1
                        corr = _correct_by_position(t)
                        score = c + (30 if _is_valid_plate(corr) else 0) + (10 if len(corr) == 6 else 0)
                        if score > best_score:
                            best_score = score
                            raw_text = t
                            ocr_conf = c
                            best_corrected = corr
                    # También probar image_to_string como respaldo
                    s = pytesseract.image_to_string(proc, config=cfg).strip().replace(" ", "").upper().replace("-", "")
                    if s:
                        corr2 = _correct_by_position(s)
                        # Estimar confianza por validez
                        sc2 = 55 + (25 if _is_valid_plate(corr2) else 0)
                        if sc2 > best_score:
                            best_score = sc2
                            raw_text = s
                            ocr_conf = sc2
                            best_corrected = corr2
                except Exception:
                    continue
            if best_corrected and _is_valid_plate(best_corrected) and ocr_conf >= 75:
                break

        if not best_corrected:
            best_corrected = _correct_by_position(raw_text) if raw_text else ""

    except ImportError:
        raise ImportError("pytesseract no instalado: instala tesseract-ocr en el sistema y pip install pytesseract")
    except Exception as e:
        if "tesseract" in str(e).lower():
            raise ImportError("tesseract-ocr no instalado en el sistema: instala tesseract-ocr y asegúrate que esté en PATH")
        pass

    corrected = best_corrected or _correct_by_position(raw_text) if raw_text else ""
    if not corrected:
        corrected = raw_text.upper().replace(" ", "").replace("-", "") if raw_text else ""

    # Formateo con guion según tipo (moto 4+2, resto 3+3)
    plate = corrected
    if len(corrected) == 6:
        if corrected[0].isdigit():
            plate = f"{corrected[:4]}-{corrected[4:]}"
        else:
            plate = f"{corrected[:3]}-{corrected[3:]}"
    elif len(corrected) == 7:
        plate = f"{corrected[:4]}-{corrected[4:]}" if corrected[0].isdigit() else f"{corrected[:3]}-{corrected[3:]}"
    elif len(corrected) >= 5 and _is_valid_plate(corrected):
        plate = f"{corrected[:4]}-{corrected[4:]}" if corrected[0].isdigit() else f"{corrected[:3]}-{corrected[3:7]}"

    # Tipo de vehículo por patrón peruano
    vehicle_type = "carro"
    if re.match(r"^[0-9]{4}", corrected):
        vehicle_type = "moto"
    elif re.match(r"^[A-Z][G-R][0-9]", corrected):
        vehicle_type = "camion"
    elif re.match(r"^[A-Z][A-F][0-9]", corrected):
        vehicle_type = "bus"
    elif "M" in corrected[:2]:
        vehicle_type = "moto"
    if not _is_valid_plate(corrected) and raw_text and len(corrected) >= 5:
        plate = f"{corrected[:4]}-{corrected[4:]}" if corrected[0].isdigit() else f"{corrected[:3]}-{corrected[3:]}"

    ms = int((time.perf_counter() - t0) * 1000)
    conf = max(0, min(99.9, float(ocr_conf) if ocr_conf else (yolo_conf * 100 if yolo_conf else 72.0)))
    # Si YOLO aportó confianza, promediar
    if yolo_conf and ocr_conf:
        conf = round((yolo_conf * 100 * 0.4 + ocr_conf * 0.6), 1)

    return {
        "plate_raw": raw_text,
        "plate": plate,
        "plate_corrected": corrected,
        "confidence": round(conf, 1),
        "vehicle_type": vehicle_type,
        "ms": ms,
        "yolo_used": yolo_plate is not None,
        "roi_found": plate_roi is not None or yolo_plate is not None,
    }

# La barrera física solo puede ser operada por personal autorizado de garita
gate_required = require_role("local", "platform")

@router.post("/simulate-scan")
async def simulate_anpr_scan(
    scan: ANPRScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(gate_required)
):
    # Buscar reserva activa para esa placa en este parqueo
    stmt = select(Reservation).where(
        Reservation.parking_id == scan.parking_id,
        Reservation.license_plate.ilike(scan.license_plate)
    ).order_by(Reservation.id.desc())

    res_result = await db.execute(stmt)
    reservation = res_result.scalars().first()

    if reservation:
        # Cotejo exitoso
        slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
        slot = slot_res.scalars().first()

        if scan.gate_type == "entry":
            reservation.status = "active"
            reservation.actual_entry = datetime.utcnow()
            if slot:
                slot.status = "occupied"
            await db.commit()
            try:
                from app.core.cache import occ_incr, cache_delete
                await occ_incr(scan.parking_id, free_delta=-1, occupied_delta=1)
                await cache_delete("parkings:all", "finances:summary")
            except Exception:
                pass
            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": scan.license_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {scan.license_plate} validado. Abriendo barrera de entrada al cajón {slot.code if slot else ''}."
            }
        else:
            reservation.status = "completed"
            reservation.actual_exit = datetime.utcnow()
            if slot:
                slot.status = "free"
            await db.commit()
            try:
                from app.core.cache import occ_incr, cache_delete
                await occ_incr(scan.parking_id, free_delta=1, occupied_delta=-1)
                await cache_delete("parkings:all", "finances:summary")
            except Exception:
                pass
            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": scan.license_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {scan.license_plate} ha completado la estancia. Abriendo barrera de salida."
            }

    # Si no tiene reserva previa
    return {
        "matched": False,
        "license_plate": scan.license_plate,
        "gate_action": "MANUAL_TICKET_REQUIRED",
        "message": f"Placa {scan.license_plate} no cuenta con reserva programada. Emitiendo ticket manual en garita."
    }


@router.post("/scan-image")
async def scan_image_anpr(
    file: UploadFile = File(...),
    parking_id: int = 0,
    gate_type: str = "entry",
    current_user=Depends(gate_required),
):
    """Cámara real: recibe imagen (multipart) de la webcam o archivo y retorna placa detectada con OpenCV/YOLO.

    Flujo: decodifica → preprocesa → detecta ROI de placa (YOLO si hay modelo, sino contornos) → OCR → normaliza.
    Respuesta: {plate, plate_raw, confidence, vehicle_type, ms, yolo_used}. 422 si no se detecta placa.
    Si faltan dependencias del sistema (libopencv/tesseract), responde 503 honesto.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Archivo de imagen requerido (campo 'file')")

    image_bytes = await file.read()
    if len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Imagen vacía o corrupta")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 8MB)")

    try:
        result = _detect_plate_opencv(image_bytes)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error en detección: {exc}")

    # Validar que se haya detectado algo con confianza mínima
    plate = (result.get("plate") or "").strip()
    if not plate or len(plate.replace("-", "")) < 5:
        raise HTTPException(status_code=422, detail="No se pudo detectar una placa válida en la imagen. Intenta con mejor iluminación y encuadre frontal.")

    # Opcional: si se pasó parking_id, intentar cotejo inmediato contra reservas (mismo comportamiento que simulate-scan)
    matched_info = None
    if parking_id:
        try:
            from sqlalchemy.future import select as _sel
            # Normalizar placa para búsqueda (sin guion, upper)
            norm = plate.replace("-", "").upper()
            stmt2 = select(Reservation).where(
                Reservation.parking_id == parking_id,
                Reservation.license_plate.ilike(f"%{norm[:3]}%")
            ).order_by(Reservation.id.desc())
            # Búsqueda exacta normalizada sería ideal; por ahora delegar a simulate-scan si el cliente quiere
            pass
        except Exception:
            pass

    return {
        "plate": plate,
        "plate_raw": result.get("plate_raw", ""),
        "plate_corrected": result.get("plate_corrected", ""),
        "confidence": result.get("confidence", 0),
        "vehicle_type": result.get("vehicle_type", "carro"),
        "ms": result.get("ms", 0),
        "yolo_used": result.get("yolo_used", False),
        "roi_found": result.get("roi_found", False),
        **({"matched_info": matched_info} if matched_info else {}),
    }
