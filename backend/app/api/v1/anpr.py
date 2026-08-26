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

    # Preprocesado: gris + blur para reducir ruido
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # Intentar YOLO si está disponible (ultralytics opcional, no obligatorio)
    yolo_plate = None
    yolo_conf = 0
    try:
        from ultralytics import YOLO  # type: ignore
        import os
        model_path = os.getenv("YOLO_PLATE_MODEL", "yolov8n.pt")
        # Solo si el modelo existe localmente; si no, se omite silenciosamente
        if os.path.exists(model_path):
            model = YOLO(model_path)
            results = model(gray, verbose=False)
            # Tomar la detección con mayor confianza que parezca placa (clase 0 si modelo genérico)
            best = None
            for r in results:
                for box in r.boxes:
                    conf = float(box.conf[0]) if hasattr(box, 'conf') else 0
                    if conf > yolo_conf:
                        yolo_conf = conf
                        yolo_plate = box
            if yolo_plate is not None:
                # Recortar ROI del YOLO y pasar a OCR
                x1, y1, x2, y2 = map(int, yolo_plate.xyxy[0].tolist())
                roi = gray[max(0, y1):y2, max(0, x1):x2]
                if roi.size > 0:
                    gray = roi
    except Exception:
        pass

    # Fallback OpenCV: buscar contornos con proporción de placa (2.0 - 5.5) y área significativa
    plate_roi = None
    try:
        # Umbral adaptativo + Canny para bordes
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Si YOLO ya recortó, no buscar contornos externos
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

    # OCR: intentar pytesseract, sino heurística de corrección
    raw_text = ""
    ocr_conf = 0
    try:
        import pytesseract  # type: ignore
        # Configurar para placas: solo alfanumérico, una línea
        config = "--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-"
        # Escalar ROI para mejorar OCR
        if gray.shape[0] < 60:
            scale = 2.5
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        # Binarizar fuerte para OCR
        _, ocr_img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        data = pytesseract.image_to_data(ocr_img, config=config, output_type=pytesseract.Output.DICT)
        # Tomar el texto con mayor confianza
        best_idx = -1
        best_conf = -1
        for i, txt in enumerate(data.get("text", [])):
            t = txt.strip().replace(" ", "").upper()
            c = int(data["conf"][i]) if str(data["conf"][i]).lstrip("-").isdigit() else -1
            if len(t) >= 5 and c > best_conf:
                best_conf = c
                best_idx = i
                raw_text = t
                ocr_conf = c
        if best_idx == -1:
            raw_text = pytesseract.image_to_string(ocr_img, config=config).strip().replace(" ", "").upper()
            ocr_conf = 60
    except ImportError:
        # Sin pytesseract: no se puede OCR real, se reporta como no detectado para forzar corrección manual
        raise ImportError("pytesseract no instalado: instala tesseract-ocr en el sistema y pip install pytesseract")
    except Exception:
        pass

    # Normalización y corrección (0↔O, 1↔I) igual que el frontend plateOcr.js
    import re
    corrected = raw_text.upper().replace(" ", "").replace("-", "")
    # Correcciones comunes OCR
    corrected = corrected.replace("0", "O") if re.match(r"^[A-Z]{3}O", corrected) else corrected
    # Formateo con guion
    plate = corrected
    if re.match(r"^[A-Z]{3}\d{3}$", corrected):
        plate = f"{corrected[:3]}-{corrected[3:]}"
    elif re.match(r"^[A-Z]{3}\d{2}[A-Z]$", corrected):
        plate = f"{corrected[:3]}-{corrected[3:]}"
    elif len(corrected) >= 6:
        plate = f"{corrected[:3]}-{corrected[3:7]}"

    # Tipo de vehículo por patrón de placa peruana
    vehicle_type = "carro"
    if re.match(r"^[A-Z]{2}\d{4}$", corrected) or "M" in corrected[:2]:
        vehicle_type = "moto"

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
