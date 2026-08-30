from typing import List, Optional
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Parking, Slot, FloorPlanElement, Reservation, CameraDevice
from app.schemas.schemas import (
    ParkingCreate, ParkingUpdate, ParkingResponse,
    SlotBase, SlotCreate, SlotUpdate, SlotResponse,
    FloorPlanElementBase, FloorPlanElementCreate, FloorPlanElementResponse, FloorPlanSyncRequest,
    CameraDeviceCreate, CameraDeviceUpdate, CameraDeviceResponse
)
from app.core.security import require_role
from app.core.realtime import realtime
from app.core.cache import cache_get_json, cache_set_json, cache_delete

PARKINGS_CACHE_KEY = "parkings:all"


async def invalidate_parkings_cache():
    await cache_delete(PARKINGS_CACHE_KEY)


router = APIRouter(prefix="/parkings", tags=["Estacionamientos, Cajones & Planos CAD"])

# La lectura es pública (mapa del conductor); la escritura exige rol Admin Local o Super Admin
write_required = require_role("local", "platform")

# =======================================================
# 1. CRUD DE ESTACIONAMIENTOS
# =======================================================
@router.get("", response_model=List[ParkingResponse])
async def list_parkings(
    query: Optional[str] = None,
    city: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    # Cache solo del listado completo (la llamada caliente del mapa); filtros van a DB
    if not query and not city and not status_filter:
        cached = await cache_get_json(PARKINGS_CACHE_KEY)
        if cached is not None:
            return cached

    stmt = select(Parking)
    if query:
        stmt = stmt.where(Parking.name.ilike(f"%{query}%") | Parking.address.ilike(f"%{query}%"))
    if city:
        stmt = stmt.where(Parking.city.ilike(f"%{city}%"))
    if status_filter:
        stmt = stmt.where(Parking.status == status_filter)
    
    result = await db.execute(stmt)
    parkings = result.scalars().all()

    response = []
    for p in parkings:
        slots_stmt = select(Slot).where(Slot.parking_id == p.id, Slot.status == "free")
        free_slots_res = await db.execute(slots_stmt)
        free_count = len(free_slots_res.scalars().all())
        # Contadores totales para ocupación en vivo
        all_slots_stmt = select(Slot).where(Slot.parking_id == p.id)
        all_res = await db.execute(all_slots_stmt)
        total_count = len(all_res.scalars().all())
        occupied = max(0, total_count - free_count)

        p_dict = ParkingResponse.model_validate(p)
        p_dict.available_slots = free_count
        response.append(p_dict)

        # Sincronizar contadores Redis en segundo plano (fail-open)
        try:
            from app.core.cache import occ_set
            await occ_set(p.id, free_count, occupied, total_count)
        except Exception:
            pass

    if not query and not city and not status_filter:
        await cache_set_json(PARKINGS_CACHE_KEY, [r.model_dump(mode="json") for r in response], ttl=5)

    return response

@router.get("/{parking_id}/occupancy")
async def get_occupancy(parking_id: int, db: AsyncSession = Depends(get_db)):
    """Ocupación en vivo: prioriza Redis INCR/DECR, fallback a BD."""
    from app.core.cache import occ_get
    cached = await occ_get(parking_id)
    if cached is not None:
        return {"parking_id": parking_id, **cached}
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    free_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id, Slot.status == "free"))
    occ_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id, Slot.status == "occupied"))
    all_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    free = len(free_res.scalars().all())
    occupied = len(occ_res.scalars().all())
    total = len(all_res.scalars().all())
    from app.core.cache import occ_set
    try:
        await occ_set(parking_id, free, occupied, total)
    except Exception:
        pass
    return {"parking_id": parking_id, "free": free, "occupied": occupied, "total": total, "source": "db"}


@router.get("/{parking_id}", response_model=ParkingResponse)
async def get_parking(parking_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    
    slots_stmt = select(Slot).where(Slot.parking_id == parking.id, Slot.status == "free")
    free_slots_res = await db.execute(slots_stmt)
    free_count = len(free_slots_res.scalars().all())
    
    p_dict = ParkingResponse.model_validate(parking)
    p_dict.available_slots = free_count
    return p_dict


@router.put("/{parking_id}/camera/config", response_model=ParkingResponse)
async def update_camera_config(parking_id: int, body: dict, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    if "camera_url" in body:
        parking.camera_url = body["camera_url"]
    if "camera_enabled" in body:
        parking.camera_enabled = bool(body["camera_enabled"])
    if "camera_calibration" in body:
        raw_cal = body["camera_calibration"]
        if not raw_cal:
            parking.camera_calibration = None
        else:
            from app.core.vision import parse_calibration
            parsed = parse_calibration(raw_cal if isinstance(raw_cal, str) else __import__("json").dumps(raw_cal))
            if parsed is None:
                raise HTTPException(status_code=422, detail="camera_calibration inválido: se espera {'x','y','w','h'} normalizado 0..1")
            import json as _json
            parking.camera_calibration = _json.dumps(parsed)
    await db.commit()
    await db.refresh(parking)
    await invalidate_parkings_cache()
    return ParkingResponse.model_validate(parking)


@router.post("/{parking_id}/camera/detect")
async def detect_camera_occupancy(parking_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    slots = slots_res.scalars().all()
    if not slots:
        raise HTTPException(status_code=400, detail="Este estacionamiento aún no tiene cajones definidos en el plano")
    image_bytes = await file.read()
    if len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Imagen vacía")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 8MB)")
    try:
        from app.core.vision import detect_occupancy
        slot_dicts = [{"code": s.code, "x": s.pos_x, "y": s.pos_y, "w": s.width, "h": s.height, "rot": s.rotation} for s in slots]
        occupancy = detect_occupancy(image_bytes, slot_dicts)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error en detección: {exc}")

    updated = 0
    for s in slots:
        should_occupied = occupancy.get(s.code, False)
        new_status = "occupied" if should_occupied else "free"
        # No pisar reservas activas que ya están occupied por lógica de negocio — pero visión manda para cajones libres
        # Si el slot está reservado (reservas scheduled), mantener reserved
        if s.status == "reserved":
            continue
        if s.status != new_status:
            s.status = new_status
            updated += 1
    await db.commit()

    # Sincronizar contadores Redis y cache
    try:
        from app.core.cache import occ_set
        free_c = sum(1 for s in slots if s.status == "free")
        occ_c = sum(1 for s in slots if s.status == "occupied")
        await occ_set(parking_id, free_c, occ_c, len(slots))
        await cache_delete(PARKINGS_CACHE_KEY)
    except Exception:
        pass
    try:
        await realtime.broadcast("parkings:updated", {"parking_id": parking_id, "source": "camera"})
    except Exception:
        pass

    return {"parking_id": parking_id, "updated": updated, "total": len(slots), "occupancy": occupancy}


@router.post("/vision/process-boxes")
async def process_custom_vision_boxes(
    file: UploadFile = File(...),
    slots_json: str = Form(...),
    threshold: Optional[int] = Form(None),
    debug: Optional[bool] = Form(None),
    current_user = Depends(write_required),
):
    """Procesamiento OpenCV (Adaptive Thresholding + CountNonZero) idéntico al
    car-parking-finder-main. threshold: conteo sobre caja 107x48 (default 900).
    debug=true retorna conteos y jpeg procesado/anotado para calibrar."""
    import json
    try:
        slots = json.loads(slots_json)
    except Exception:
        slots = []

    image_bytes = await file.read()
    if len(image_bytes) < 50:
        raise HTTPException(status_code=400, detail="Imagen inválida o vacía")

    white_ratio = None
    if threshold is not None:
        try:
            thr = float(threshold)
            white_ratio = thr / (107.0*48.0)
        except Exception:
            pass

    if debug:
        from app.core.vision import detect_occupancy_cv2_debug
        return detect_occupancy_cv2_debug(image_bytes, slots, white_ratio=white_ratio)

    from app.core.vision import detect_occupancy_cv2_adaptive
    occupancy = detect_occupancy_cv2_adaptive(image_bytes, slots, white_ratio=white_ratio)
    return {"occupancy": occupancy, "total_boxes": len(slots), "white_ratio": white_ratio}


@router.post("/{parking_id}/camera/count")
async def count_cars_simple(parking_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    """Cuenta autos en la foto sin necesidad de cajones definidos — ideal para prueba rápida de cámara cenital."""
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    image_bytes = await file.read()
    if len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Imagen vacía")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 8MB)")
    # Detección simple: YOLO car + fallback contornos
    import cv2
    import numpy as np
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=422, detail="No se pudo decodificar la imagen")
    from app.core.vision import detect_vehicle_boxes
    car_boxes, _engine = detect_vehicle_boxes(img)
    if not car_boxes:
        # Fallback contornos oscuros (autos) sobre asfalto claro
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            h, w = gray.shape
            for cnt in contours:
                x, y, bw, bh = cv2.boundingRect(cnt)
                area = bw*bh
                if area < w*h*0.008 or area > w*h*0.25: continue
                if 1.3 < bw/float(bh) < 3.5 and bh > 28:
                    car_boxes.append([x, y, x+bw, y+bh])
        except Exception:
            pass
    return {"parking_id": parking_id, "count": len(car_boxes), "total_detected": len(car_boxes), "boxes": car_boxes[:50]}


# =======================================================
# MONITOREO POR CÁMARA EN VIVO (Admin Local)
# =======================================================
from app.core.ipcam import extract_first_jpeg, fetch_camera_frame


async def _apply_scan_result(db, parking_id, slots, frame_bytes, source, calibration=None):
    """Recibe un frame ya descargado y devuelve el resultado completo del escaneo:
    detección IA -> actualiza cajones en BD -> eventos -> Redis -> broadcast WS ->
    imagen anotada base64. Compartido por la cámara única heredada y por cada
    dispositivo de la multi-cámara."""
    slot_dicts = [{"code": s.code, "x": s.pos_x, "y": s.pos_y, "w": s.width, "h": s.height, "rot": s.rotation} for s in slots]
    try:
        from app.core.vision import scan_parking_frame
        analysis = await asyncio.to_thread(scan_parking_frame, frame_bytes, slot_dicts, calibration)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Visión no disponible: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error en detección: {exc}")

    occupancy = analysis["occupancy"]
    prev_statuses = {s.code: s.status for s in slots}
    # Aplicar resultado a los cajones (no pisar reservas activas)
    for s in slots:
        if s.status == "reserved":
            continue
        s.status = "occupied" if occupancy.get(s.code, False) else "free"
    await db.commit()

    from app.core.camera_events import compute_events
    events = compute_events(parking_id, prev_statuses, occupancy, source=source)

    occupied_c = sum(1 for s in slots if s.status == "occupied")
    free_c = sum(1 for s in slots if s.status == "free")
    reserved_c = sum(1 for s in slots if s.status == "reserved")

    try:
        from app.core.cache import occ_set
        await occ_set(parking_id, free_c, occupied_c, len(slots))
        await cache_delete(PARKINGS_CACHE_KEY)
    except Exception:
        pass
    try:
        await realtime.broadcast("parkings:updated", {"parking_id": parking_id, "source": source})
    except Exception:
        pass

    annotated_b64 = None
    if analysis.get("annotated_jpeg"):
        import base64
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(analysis["annotated_jpeg"]).decode("ascii")

    from datetime import datetime as _dt
    return {
        "parking_id": parking_id,
        "source": source,
        "engine": analysis["engine"],
        "ts": _dt.utcnow().isoformat(),
        "vehicles_detected": len(analysis["car_boxes"]),
        "cars_in_slots": sum(1 for v in occupancy.values() if v),
        "summary": {
            "total": len(slots),
            "occupied": occupied_c,
            "free": free_c,
            "reserved": reserved_c,
            "occupancy_pct": round((occupied_c / len(slots)) * 100, 1) if slots else 0,
        },
        "slots": occupancy,
        "events": events,
        "annotated_image": annotated_b64,
    }


@router.get("/{parking_id}/camera/snapshot")
async def camera_snapshot(parking_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    """Proxy de vista previa: descarga server-side un frame de la cámara IP
    configurada para la sede y lo devuelve como JPEG. Evita problemas de CORS
    del navegador con streams MJPEG cross-origin."""
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    if not parking.camera_url:
        raise HTTPException(status_code=400, detail="Esta sede no tiene cámara configurada (camera_url)")
    try:
        frame_bytes = await asyncio.to_thread(fetch_camera_frame, parking.camera_url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar a la cámara: {exc}")
    from fastapi.responses import Response
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@router.post("/{parking_id}/camera/scan")
async def scan_camera_monitor(parking_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required), file: Optional[UploadFile] = File(None)):
    """Escaneo de ocupación en tiempo real para el monitor de cámara.

    - Con `file`: analiza ese frame (captura de webcam de garita o foto manual).
    - Sin `file`: el servidor toma un frame de la cámara IP de la sede
      (camera_url) automáticamente.
    Actualiza el estado de los cajones del plano, sincroniza contadores Redis,
    emite evento realtime y devuelve el resumen + imagen anotada (base64).
    """
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    slots = slots_res.scalars().all()
    if not slots:
        raise HTTPException(status_code=400, detail="Este estacionamiento aún no tiene cajones definidos en el plano")

    prev_statuses = {s.code: s.status for s in slots}

    source = "upload"
    if file is not None:
        image_bytes = await file.read()
        if len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="Imagen vacía")
        if len(image_bytes) > 8 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 8MB)")
    else:
        if not parking.camera_url:
            raise HTTPException(status_code=400, detail="Sin fuente de imagen: envía un frame (webcam/foto) o configura camera_url de la sede")
        try:
            image_bytes = await asyncio.to_thread(fetch_camera_frame, parking.camera_url)
            source = "camera"
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"No se pudo conectar a la cámara: {exc}")

    slot_dicts = [{"code": s.code, "x": s.pos_x, "y": s.pos_y, "w": s.width, "h": s.height, "rot": s.rotation} for s in slots]
    try:
        from app.core.vision import scan_parking_frame, parse_calibration
        analysis = await asyncio.to_thread(
            scan_parking_frame, image_bytes, slot_dicts, parse_calibration(parking.camera_calibration)
        )
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Visión no disponible: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error en detección: {exc}")

    occupancy = analysis["occupancy"]
    # Aplicar resultado a los cajones (no pisar reservas activas)
    for s in slots:
        if s.status == "reserved":
            continue
        s.status = "occupied" if occupancy.get(s.code, False) else "free"
    await db.commit()

    from app.core.camera_events import compute_events
    events = compute_events(parking_id, prev_statuses, occupancy,
                            source="garita" if file is not None else "camera")

    occupied_c = sum(1 for s in slots if s.status == "occupied")
    free_c = sum(1 for s in slots if s.status == "free")
    reserved_c = sum(1 for s in slots if s.status == "reserved")

    try:
        from app.core.cache import occ_set
        await occ_set(parking_id, free_c, occupied_c, len(slots))
        await cache_delete(PARKINGS_CACHE_KEY)
    except Exception:
        pass
    try:
        await realtime.broadcast("parkings:updated", {"parking_id": parking_id, "source": "camera-scan"})
    except Exception:
        pass

    annotated_b64 = None
    if analysis.get("annotated_jpeg"):
        import base64
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(analysis["annotated_jpeg"]).decode("ascii")

    from datetime import datetime as _dt
    return {
        "parking_id": parking_id,
        "source": source,
        "engine": analysis["engine"],
        "ts": _dt.utcnow().isoformat(),
        "vehicles_detected": len(analysis["car_boxes"]),
        "cars_in_slots": sum(1 for v in occupancy.values() if v),
        "summary": {
            "total": len(slots),
            "occupied": occupied_c,
            "free": free_c,
            "reserved": reserved_c,
            "occupancy_pct": round((occupied_c / len(slots)) * 100, 1) if slots else 0,
        },
        "slots": occupancy,
        "events": events,
        "annotated_image": annotated_b64,
    }


@router.get("/{parking_id}/camera/events")
async def list_camera_events(parking_id: int, limit: int = 60, current_user=Depends(write_required)):
    """Bitácora de eventos detectados por la IA de cámara para esta sede
    (ingresos/salidas por cajón), incluyendo los generados por el worker de
    auto-escaneo server-side. Más reciente primero."""
    from app.core.camera_events import get_events
    return {"parking_id": parking_id, "events": get_events(parking_id, limit)}


# =======================================================
# MULTI-CÁMARA POR SEDE (dispositivos independientes)
# =======================================================
@router.get("/{parking_id}/cameras", response_model=List[CameraDeviceResponse])
async def list_cameras(parking_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    """Lista todos los dispositivos de cámara de una sede."""
    res = await db.execute(
        select(CameraDevice).where(CameraDevice.parking_id == parking_id).order_by(CameraDevice.id)
    )
    return res.scalars().all()


@router.post("/{parking_id}/cameras", response_model=CameraDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(parking_id: int, cam_in: CameraDeviceCreate, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    res = await db.execute(select(Parking).where(Parking.id == parking_id))
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    db_cam = CameraDevice(
        parking_id=parking_id,
        name=(cam_in.name or "").strip() or "Cámara",
        url=cam_in.url.strip(),
        enabled=bool(cam_in.enabled),
        calibration=cam_in.calibration,
    )
    db.add(db_cam)
    await db.commit()
    await db.refresh(db_cam)
    return db_cam


@router.put("/{parking_id}/cameras/{cam_id}", response_model=CameraDeviceResponse)
async def update_camera(parking_id: int, cam_id: int, cam_in: CameraDeviceUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    res = await db.execute(select(CameraDevice).where(CameraDevice.id == cam_id, CameraDevice.parking_id == parking_id))
    cam = res.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    if cam_in.name is not None:
        cam.name = (cam_in.name or "").strip() or cam.name
    if cam_in.url is not None:
        cam.url = cam_in.url.strip()
    if cam_in.enabled is not None:
        cam.enabled = bool(cam_in.enabled)
    if "calibration" in cam_in.model_dump(exclude_unset=True):
        raw = cam_in.calibration
        if not raw:
            cam.calibration = None
        else:
            from app.core.vision import parse_calibration
            parsed = parse_calibration(raw if isinstance(raw, str) else __import__("json").dumps(raw))
            if parsed is None:
                raise HTTPException(status_code=422, detail="calibration inválido: se espera {'x','y','w','h'} normalizado 0..1")
            import json as _json
            cam.calibration = _json.dumps(parsed)
    await db.commit()
    await db.refresh(cam)
    return cam


@router.delete("/{parking_id}/cameras/{cam_id}", status_code=status.HTTP_200_OK)
async def delete_camera(parking_id: int, cam_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    res = await db.execute(select(CameraDevice).where(CameraDevice.id == cam_id, CameraDevice.parking_id == parking_id))
    cam = res.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    await db.delete(cam)
    await db.commit()
    return {"status": "success", "message": f"Cámara {cam_id} eliminada"}


@router.get("/{parking_id}/cameras/{cam_id}/snapshot")
async def camera_device_snapshot(parking_id: int, cam_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    """Proxy de vista previa de un dispositivo de cámara concreto."""
    res = await db.execute(select(CameraDevice).where(CameraDevice.id == cam_id, CameraDevice.parking_id == parking_id))
    cam = res.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    try:
        frame_bytes = await asyncio.to_thread(fetch_camera_frame, cam.url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar a la cámara: {exc}")
    from fastapi.responses import Response
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@router.post("/{parking_id}/cameras/{cam_id}/scan")
async def scan_camera_device(parking_id: int, cam_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(write_required)):
    """Escanea un dispositivo de cámara concreto: el servidor toma un frame de su
    URL, corre la IA usando la calibración propia del dispositivo y actualiza la
    ocupación del plano. Reutiliza el pipeline compartido con la cámara única."""
    res = await db.execute(select(Parking).where(Parking.id == parking_id))
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    cres = await db.execute(select(CameraDevice).where(CameraDevice.id == cam_id, CameraDevice.parking_id == parking_id))
    cam = cres.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    slots = slots_res.scalars().all()
    if not slots:
        raise HTTPException(status_code=400, detail="Este estacionamiento aún no tiene cajones definidos en el plano")
    try:
        frame_bytes = await asyncio.to_thread(fetch_camera_frame, cam.url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar a la cámara: {exc}")

    from app.core.vision import parse_calibration
    return await _apply_scan_result(db, parking_id, slots, frame_bytes,
                                    source=f"cam:{cam.id}", calibration=parse_calibration(cam.calibration))


@router.post("", response_model=ParkingResponse, status_code=status.HTTP_201_CREATED)
async def create_parking(parking_in: ParkingCreate, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    db_parking = Parking(
        name=parking_in.name,
        address=parking_in.address,
        city=parking_in.city,
        latitude=parking_in.latitude,
        longitude=parking_in.longitude,
        hourly_rate=parking_in.hourly_rate,
        tolerance_minutes=parking_in.tolerance_minutes,
        status=parking_in.status or "active",
        total_capacity=parking_in.total_capacity,
        image_url=parking_in.image_url or "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800"
    )
    db.add(db_parking)
    await db.commit()
    await db.refresh(db_parking)
    await invalidate_parkings_cache()
    await realtime.broadcast("parkings:updated", {"parking_id": db_parking.id})
    return ParkingResponse.model_validate(db_parking)

@router.put("/{parking_id}", response_model=ParkingResponse)
async def update_parking(parking_id: int, parking_in: ParkingUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    
    update_data = parking_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(parking, key, value)
    
    await db.commit()
    await db.refresh(parking)
    await invalidate_parkings_cache()
    await realtime.broadcast("parkings:updated", {"parking_id": parking.id})
    return ParkingResponse.model_validate(parking)

@router.delete("/{parking_id}", status_code=status.HTTP_200_OK)
async def delete_parking(parking_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    
    await db.delete(parking)
    await db.commit()
    await invalidate_parkings_cache()
    await realtime.broadcast("parkings:updated", {"parking_id": parking_id})
    return {"status": "success", "message": f"Estacionamiento {parking_id} eliminado exitosamente"}

# =======================================================
# 2. CRUD DE CAJONES (SLOTS)
# =======================================================
@router.get("/{parking_id}/slots", response_model=List[SlotResponse])
async def list_slots(parking_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Slot).where(Slot.parking_id == parking_id).order_by(Slot.code.asc()))
    slots = result.scalars().all()
    return [SlotResponse.model_validate(s) for s in slots]

@router.post("/{parking_id}/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_slot(parking_id: int, slot_in: SlotBase, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    db_slot = Slot(
        parking_id=parking_id,
        code=slot_in.code,
        floor_level=slot_in.floor_level or "Piso 1",
        slot_type=slot_in.slot_type or "auto",
        status=slot_in.status or "free",
        pos_x=slot_in.pos_x,
        pos_y=slot_in.pos_y,
        width=slot_in.width,
        height=slot_in.height,
        rotation=slot_in.rotation
    )
    db.add(db_slot)
    await db.commit()
    await db.refresh(db_slot)
    return SlotResponse.model_validate(db_slot)

@router.put("/{parking_id}/slots/{slot_id}", response_model=SlotResponse)
async def update_slot(parking_id: int, slot_id: int, slot_in: SlotUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    result = await db.execute(select(Slot).where(Slot.id == slot_id, Slot.parking_id == parking_id))
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Cajón no encontrado")
    
    update_data = slot_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(slot, key, value)
    
    await db.commit()
    await db.refresh(slot)
    return SlotResponse.model_validate(slot)

@router.delete("/{parking_id}/slots/{slot_id}", status_code=status.HTTP_200_OK)
async def delete_slot(parking_id: int, slot_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    result = await db.execute(select(Slot).where(Slot.id == slot_id, Slot.parking_id == parking_id))
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Cajón no encontrado")
    
    await db.delete(slot)
    await db.commit()
    return {"status": "success", "message": f"Cajón {slot_id} eliminado exitosamente"}

# =======================================================
# 3. PLANO CAD & SINCRONIZACIÓN BATCH
# =======================================================
@router.get("/{parking_id}/floor-plan")
async def get_floor_plan(parking_id: int, db: AsyncSession = Depends(get_db)):
    parking_res = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = parking_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    slots = slots_res.scalars().all()

    elem_res = await db.execute(select(FloorPlanElement).where(FloorPlanElement.parking_id == parking_id))
    elements = elem_res.scalars().all()

    return {
        "parking_id": parking_id,
        "parking_name": parking.name,
        "slots": [SlotResponse.model_validate(s) for s in slots],
        "elements": [FloorPlanElementResponse.model_validate(e) for e in elements]
    }

@router.post("/{parking_id}/floor-plan/sync", status_code=status.HTTP_200_OK)
async def sync_floor_plan(parking_id: int, sync_in: FloorPlanSyncRequest, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    from sqlalchemy import delete
    # Validar parking_id coincide
    if sync_in.parking_id and sync_in.parking_id != parking_id:
        raise HTTPException(status_code=422, detail="parking_id en body no coincide con path")
    # Validar unicidad de códigos en el payload
    incoming_codes = [s.code for s in sync_in.slots]
    if len(incoming_codes) != len(set(incoming_codes)):
        raise HTTPException(status_code=422, detail="Códigos de cajones duplicados en el payload")
    
    async with db.begin():
        from sqlalchemy import delete
        # Cajones con reserva ACTIVA (scheduled/active) NO se pueden borrar ni cambiar estado
        existing_slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
        existing_slots = existing_slots_res.scalars().all()
        # Slots con reserva ACTIVA (scheduled/active) = protegidos
        slot_ids = [s.id for s in existing_slots]
        protected_slot_ids = set()
        if slot_ids:
            res = await db.execute(select(Reservation.slot_id).where(
                Reservation.slot_id.in_(slot_ids),
                Reservation.status.in_(["scheduled", "active"])
            ))
            protected_slot_ids = {row[0] for row in res.all()}

        await db.execute(delete(FloorPlanElement).where(FloorPlanElement.parking_id == parking_id))
        # Borrar solo cajones huérfanos (sin reservas activas) cuyo código ya no viene
        incoming_codes = {s.code for s in sync_in.slots}
        for slot in existing_slots:
            if slot.id not in protected_slot_ids and slot.code not in incoming_codes:
                await db.execute(delete(Slot).where(Slot.id == slot.id))
        # Upsert por código: actualizar existentes (incluidos los protegidos, solo geometría), crear nuevos
        existing_by_code = {s.code: s for s in existing_slots}
        for s in sync_in.slots:
            existing = existing_by_code.get(s.code)
            if existing:
                existing.floor_level = s.floor_level
                existing.slot_type = s.slot_type
                existing.pos_x = s.pos_x
                existing.pos_y = s.pos_y
                existing.width = s.width
                existing.height = s.height
                existing.rotation = s.rotation
                # NO pisar estado si tiene reserva activa (protected)
                if existing.id not in protected_slot_ids:
                    existing.status = s.status or "free"
            else:
                db.add(Slot(
                    parking_id=parking_id, code=s.code, floor_level=s.floor_level,
                    slot_type=s.slot_type, status=s.status or "free",
                    pos_x=s.pos_x, pos_y=s.pos_y, width=s.width, height=s.height, rotation=s.rotation
                ))

        new_elems = [
            FloorPlanElement(
                parking_id=parking_id, element_type=e.element_type, pos_x=e.pos_x, pos_y=e.pos_y,
                width=e.width, height=e.height, rotation=e.rotation, z_index=e.z_index, properties_json=e.properties_json
            )
            for e in sync_in.elements
        ]
        db.add_all(new_elems)
        # commit ocurre en db.begin() context manager
    
    await invalidate_parkings_cache()
    await realtime.broadcast("parkings:updated", {"parking_id": parking_id})
    # Contar total actual y sincronizar contadores Redis
    final_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    all_slots = final_res.scalars().all()
    total = len(all_slots)
    free_c = sum(1 for s in all_slots if s.status == "free")
    occ_c = sum(1 for s in all_slots if s.status == "occupied")
    try:
        from app.core.cache import occ_set
        await occ_set(parking_id, free_c, occ_c, total)
    except Exception:
        pass
    return {
        "status": "success",
        "message": f"Plano CAD del estacionamiento {parking_id} sincronizado exitosamente",
        "slots_count": total,
        "elements_count": len(new_elems)
    }