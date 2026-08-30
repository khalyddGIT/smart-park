"""Worker de auto-escaneo de cámaras en segundo plano (server-side 24/7).

Cada CAMERA_AUTOSCAN_INTERVAL segundos recorre las sedes con cámara habilitada
(camera_enabled=True y camera_url configurada), toma un frame de la cámara IP,
ejecuta la detección IA, actualiza el estado de los cajones en BD y emite los
eventos de ingreso/salida por WebSocket — aunque ningún navegador esté abierto.

Lock distribuido vía Redis SETNX para evitar múltiples réplicas escaneando simultáneamente.
"""
import asyncio
import logging
import random

logger = logging.getLogger(__name__)

_task = None


async def _acquire_lock(lock_name: str, ttl: int) -> bool:
    """Intenta adquirir lock distribuido vía Redis SETNX."""
    try:
        from app.core.cache import get_client
        client = get_client()
        if client is None:
            return True  # sin Redis, permite ejecutar (fail-open)
        acquired = await client.set(f"lock:{lock_name}", "1", nx=True, ex=ttl)
        return bool(acquired)
    except Exception:
        return True  # fail-open


async def _scan_one(parking) -> bool:
    """Escanea una sede concreta usando su camera_url. Retorna True si se procesó."""
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Slot
    from app.core.vision import scan_parking_frame, parse_calibration
    from app.core.ipcam import fetch_camera_frame
    from app.core.camera_events import compute_events
    from app.core.cache import occ_set
    from app.core.realtime import realtime

    async with AsyncSessionLocal() as db:
        slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking.id))
        slots = slots_res.scalars().all()
        if not slots:
            return False
        prev = {s.code: s.status for s in slots}
        slot_dicts = [{"code": s.code, "x": s.pos_x, "y": s.pos_y,
                       "w": s.width, "h": s.height, "rot": s.rotation} for s in slots]
        frame = await asyncio.to_thread(fetch_camera_frame, parking.camera_url)
        analysis = await asyncio.to_thread(
            scan_parking_frame, frame, slot_dicts, parse_calibration(parking.camera_calibration)
        )
        occupancy = analysis["occupancy"]
        changed = False
        for s in slots:
            if s.status == "reserved":
                continue
            new_status = "occupied" if occupancy.get(s.code, False) else "free"
            if s.status != new_status:
                s.status = new_status
                changed = True
        if changed:
            await db.commit()

        occupied_c = sum(1 for s in slots if s.status == "occupied")
        free_c = sum(1 for s in slots if s.status == "free")
        try:
            await occ_set(parking.id, free_c, occupied_c, len(slots))
        except Exception:
            pass

    events = compute_events(parking.id, prev, occupancy, source="autoscan")

    try:
        from app.api.v1.parkings import invalidate_parkings_cache
        await invalidate_parkings_cache()
    except Exception:
        pass
    try:
        await realtime.broadcast("parkings:updated", {"parking_id": parking.id, "source": "autoscan"})
    except Exception:
        pass
    if events:
        try:
            await realtime.broadcast("camera:events", {"parking_id": parking.id, "events": events})
        except Exception:
            pass
    return True


async def scan_enabled_cameras() -> int:
    """Un ciclo completo sobre todas las sedes con cámara habilitada."""
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Parking

    processed = 0
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Parking).where(Parking.camera_enabled == True, Parking.camera_url.isnot(None))  # noqa: E712
        )
        parkings = res.scalars().all()
    for p in parkings:
        try:
            if await _scan_one(p):
                processed += 1
        except Exception as exc:
            logger.warning(f"[camera-worker] sede '{p.name}' ({p.id}) falló: {exc}")
    return processed


async def _loop():
    from app.core.config import settings
    interval = max(5, settings.CAMERA_AUTOSCAN_INTERVAL)
    logger.info(f"[camera-worker] iniciando auto-escaneo server-side cada {interval}s")
    while True:
        try:
            # Jitter para evitar thundering herd
            await asyncio.sleep(random.uniform(0, 2))
            # Lock distribuido
            lock_ttl = interval + 5
            if await _acquire_lock("camera_autoscan", lock_ttl):
                n = await scan_enabled_cameras()
                if n:
                    logger.info(f"[camera-worker] ciclo OK: {n} cámara(s) escaneadas")
            else:
                logger.debug("[camera-worker] saltado (otra réplica tiene el lock)")
        except Exception as exc:
            logger.warning(f"[camera-worker] ciclo con error: {exc}")
        await asyncio.sleep(interval)


def start_autoscan():
    """Arranca el worker una sola vez por proceso (idempotente)."""
    global _task
    from app.core.config import settings
    if not settings.CAMERA_AUTOSCAN_ENABLED:
        logger.info("[camera-worker] deshabilitado por configuración")
        return None
    if _task is not None and not _task.done():
        return _task
    _task = asyncio.create_task(_loop())
    return _task