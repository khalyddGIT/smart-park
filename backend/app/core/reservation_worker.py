"""Worker de auto-cancelación por tolerancia.

Cada RESERVATION_TOLERANCE_CHECK_INTERVAL segundos revisa reservas
en estado 'scheduled' cuyo inicio + tolerancia de la sede ya venció
sin check-in. Las cancela, libera el cajón, persiste y notifica
via WebSocket + invalidación de caché.

Lock distribuido vía Redis SETNX para evitar múltiples réplicas cancelando simultáneamente.
"""
import asyncio
import logging
import random
from datetime import datetime, timedelta

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

async def _cancel_expired_once() -> int:
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Reservation, Slot, Parking
    from app.core.realtime import realtime
    from app.core.cache import cache_delete

    cancelled = 0
    now = datetime.utcnow()
    async with AsyncSessionLocal() as db:
        # Traer programadas con su parking para tolerancia
        res = await db.execute(select(Reservation).where(Reservation.status == "scheduled"))
        scheduled = res.scalars().all()
        for r in scheduled:
            # tolerancia por sede (fallback 15)
            parking = await db.get(Parking, r.parking_id)
            tol = int(parking.tolerance_minutes) if parking and parking.tolerance_minutes is not None else 15
            tol = max(1, min(tol, 120))
            deadline = r.start_time + timedelta(minutes=tol)
            # naive utc compare (columnas son naive)
            if deadline.tzinfo is not None:
                deadline = deadline.replace(tzinfo=None)
            if now >= deadline:
                r.status = "cancelled"
                # liberar cajón si sigue reservado
                slot = await db.get(Slot, r.slot_id)
                if slot and slot.status == "reserved":
                    slot.status = "free"
                cancelled += 1
                # notificar en tiempo real (el frontend lo convierte en notificación)
                try:
                    await realtime.broadcast("reservations:cancelled", {
                        "reservation_id": r.id,
                        "code": r.code,
                        "user_id": r.user_id,
                        "parking_id": r.parking_id,
                        "slot_id": r.slot_id,
                        "reason": "tolerancia_vencida",
                        "tolerance_minutes": tol,
                        "deadline": deadline.isoformat(),
                    })
                except Exception:
                    pass
            else:
                diff_sec = (deadline - now).total_seconds()
                # Notificación preventiva entre 10 y 5 minutos antes de vencer
                if 0 < diff_sec <= 600:
                    mins_left = max(1, int(diff_sec / 60))
                    try:
                        await realtime.broadcast("reservations:expiring_soon", {
                            "reservation_id": r.id,
                            "code": r.code,
                            "user_id": r.user_id,
                            "parking_id": r.parking_id,
                            "minutes_left": mins_left,
                            "deadline": deadline.isoformat(),
                        })
                    except Exception:
                        pass
        if cancelled:
            await db.commit()
            try:
                await cache_delete("parkings:all")
            except Exception:
                pass
            try:
                await realtime.broadcast("reservations:updated")
            except Exception:
                pass
            logger.info(f"[reservation-worker] {cancelled} reserva(s) cancelada(s) por tolerancia")
    return cancelled

async def check_expired_reservations() -> int:
    """Entrada pública para tests y triggers manuales."""
    return await _cancel_expired_once()

async def _loop():
    from app.core.config import settings
    interval = max(20, int(getattr(settings, "RESERVATION_TOLERANCE_CHECK_INTERVAL", 60)))
    logger.info(f"[reservation-worker] iniciado cada {interval}s")
    while True:
        try:
            # Jitter para evitar thundering herd
            await asyncio.sleep(random.uniform(0, 2))
            # Lock distribuido
            lock_ttl = interval + 5
            if await _acquire_lock("reservation_tolerance", lock_ttl):
                n = await _cancel_expired_once()
                if n:
                    logger.info(f"[reservation-worker] ciclo OK: {n} cancelada(s)")
            else:
                logger.debug("[reservation-worker] saltado (otra réplica tiene el lock)")
        except Exception as exc:
            logger.warning(f"[reservation-worker] ciclo con error: {exc}")
        await asyncio.sleep(interval)

def start_reservation_worker():
    global _task
    from app.core.config import settings
    if not getattr(settings, "RESERVATION_WORKER_ENABLED", True):
        logger.info("[reservation-worker] deshabilitado por configuración")
        return None
    if _task is not None and not _task.done():
        return _task
    _task = asyncio.create_task(_loop())
    return _task
