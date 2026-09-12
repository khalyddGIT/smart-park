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
    import math
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    from app.models.models import Reservation, Slot, Parking
    from app.core.realtime import realtime
    from app.core.cache import cache_delete
    from app.api.v1.reservations import get_parking_vehicle_rate, get_parking_minute_rate

    cancelled = 0
    updated_active = 0
    now = datetime.utcnow()
    async with AsyncSessionLocal() as db:
        # 1. Traer programadas con su parking para tolerancia de llegada
        res = await db.execute(select(Reservation).where(Reservation.status == "scheduled"))
        scheduled = res.scalars().all()
        for r in scheduled:
            # tolerancia personalizada de la reserva o fallback a sede (default 15)
            tol = getattr(r, 'tolerance_minutes', None)
            if tol is None:
                parking = await db.get(Parking, r.parking_id)
                tol = int(parking.tolerance_minutes) if parking and parking.tolerance_minutes is not None else 15
            tol = max(1, min(int(tol), 120))
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
                    c_payload = {
                        "reservation_id": r.id,
                        "code": r.code,
                        "user_id": r.user_id,
                        "parking_id": r.parking_id,
                        "slot_id": r.slot_id,
                        "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", "") if slot else "",
                        "status": "free",
                        "reason": "tolerancia_vencida",
                        "tolerance_minutes": tol,
                        "deadline": deadline.isoformat(),
                    }
                    await realtime.broadcast("reservations:cancelled", c_payload)
                    await realtime.broadcast("spaces:update", c_payload)
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

        # 2. Traer reservas activas (dentro del estacionamiento) para notificaciones y exceso de estadía
        res_active = await db.execute(select(Reservation).where(Reservation.status == "active"))
        active_reservations = res_active.scalars().all()
        for r in active_reservations:
            if not r.end_time:
                continue
            deadline = r.end_time.replace(tzinfo=None) if r.end_time.tzinfo else r.end_time
            entry_time = r.actual_entry or r.start_time or now
            entry_naive = entry_time.replace(tzinfo=None) if entry_time.tzinfo else entry_time
            diff_sec = (deadline - now).total_seconds()

            # Caso 2A: Estadía por vencer (15 minutos o menos restantes)
            if 0 < diff_sec <= 900:
                mins_left = max(1, int(diff_sec / 60))
                try:
                    await realtime.broadcast("reservations:stay_expiring_soon", {
                        "reservation_id": r.id,
                        "code": r.code,
                        "user_id": r.user_id,
                        "parking_id": r.parking_id,
                        "slot_id": r.slot_id,
                        "license_plate": r.license_plate,
                        "minutes_left": mins_left,
                        "deadline": deadline.isoformat(),
                        "current_cost": r.total_cost,
                        "status": "active"
                    })
                except Exception:
                    pass

            # Caso 2B: Estadía vencida (en exceso) -> el monto se incrementa automáticamente a medida que pasa el tiempo
            elif now >= deadline:
                overtime_sec = (now - deadline).total_seconds()
                overtime_min = max(1, int(overtime_sec / 60))
                elapsed_sec = max(0.0, (now - entry_naive).total_seconds())

                parking = await db.get(Parking, r.parking_id)
                vtype = getattr(r, "vehicle_type", "auto")
                billing_unit = (getattr(r, "billing_unit", None) or (parking.billing_unit if parking else "hour") or "hour").strip().lower()
                night_surcharge = float(parking.night_shift_surcharge or 0.0) if (parking and getattr(r, "is_night_shift", False)) else 0.0

                if billing_unit == "minute":
                    diff_units = max(1, math.ceil(elapsed_sec / 60.0))
                    minute_rate = get_parking_minute_rate(parking, vtype) if parking else 0.10
                    effective_rate = minute_rate + (night_surcharge / 60.0 if night_surcharge else 0.0)
                    new_cost = round(diff_units * effective_rate, 2)
                else:
                    billed_hours = max(1, math.ceil(elapsed_sec / 3600.0))
                    vehicle_rate = get_parking_vehicle_rate(parking, vtype) if parking else 5.0
                    effective_rate = vehicle_rate + night_surcharge
                    new_cost = round(billed_hours * effective_rate, 2)

                if new_cost > (r.total_cost or 0):
                    r.total_cost = new_cost
                    updated_active += 1

                try:
                    await realtime.broadcast("reservations:stay_overtime", {
                        "reservation_id": r.id,
                        "code": r.code,
                        "user_id": r.user_id,
                        "parking_id": r.parking_id,
                        "slot_id": r.slot_id,
                        "license_plate": r.license_plate,
                        "overtime_minutes": overtime_min,
                        "updated_cost": r.total_cost,
                        "is_overtime": True,
                        "status": "active"
                    })
                except Exception:
                    pass

        if cancelled or updated_active:
            await db.commit()
            try:
                await cache_delete("parkings:all")
            except Exception:
                pass
            try:
                await realtime.broadcast("reservations:updated")
            except Exception:
                pass
            if cancelled:
                logger.info(f"[reservation-worker] {cancelled} reserva(s) cancelada(s) por tolerancia")
            if updated_active:
                logger.info(f"[reservation-worker] {updated_active} reserva(s) activa(s) recalculada(s) por exceso de estadía")
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
