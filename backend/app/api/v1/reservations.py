from datetime import datetime, timezone
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot, Parking, Payment
from app.schemas.schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from app.core.security import get_current_user, require_role
from app.core.realtime import realtime
from app.core.cache import cache_delete
from app.models.models import User

PARKINGS_CACHE_KEY = "parkings:all"
FINANCES_CACHE_KEY = "finances:summary"

async def invalidate_parkings_cache():
    await cache_delete(PARKINGS_CACHE_KEY)

async def invalidate_finances_cache():
    await cache_delete(FINANCES_CACHE_KEY)

# Normaliza datetimes a UTC naive para compatibilidad con columnas DateTime sin zona horaria
def _naive_utc(dt: datetime) -> datetime:
    if dt is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt

# Operador de garita autorizado para registrar entradas/salidas físicas
gate_operator_required = require_role("local", "platform")

router = APIRouter(prefix="/reservations", tags=["Reservas & Pases QR"])

from sqlalchemy.orm import selectinload

def _format_reservation_response(r: Reservation) -> ReservationResponse:
    resp = ReservationResponse.model_validate(r)
    try:
        user = getattr(r, "user", None)
        if user:
            resp.customer_name = user.full_name
            resp.customer_phone = user.phone
            resp.customer_email = user.email
    except Exception:
        pass

    try:
        parking = getattr(r, "parking", None)
        if parking:
            resp.parking_name = parking.name
            if resp.tolerance_minutes is None and parking.tolerance_minutes is not None:
                resp.tolerance_minutes = parking.tolerance_minutes
    except Exception:
        pass

    try:
        slot = getattr(r, "slot", None)
        if slot:
            resp.slot_code = slot.code
    except Exception:
        pass

    if resp.tolerance_minutes is None:
        resp.tolerance_minutes = 15

    return resp

@router.get("", response_model=List[ReservationResponse])
async def list_reservations(
    parking_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Local/platform ven todas de su sede (para garita y admin), conductor solo las suyas
    options_load = (
        selectinload(Reservation.user),
        selectinload(Reservation.parking),
        selectinload(Reservation.slot)
    )

    if current_user.role in ("local", "platform"):
        stmt = select(Reservation).options(*options_load).order_by(Reservation.id.desc())
        if parking_id:
            stmt = stmt.where(Reservation.parking_id == parking_id)
        elif current_user.role == "local":
            from app.models.models import Staff
            me = await db.execute(select(Staff).where(Staff.email == current_user.email))
            my_staff = me.scalars().first()
            if my_staff and my_staff.parking_id:
                # Personal operativo asignado a garita específica
                stmt = stmt.where(Reservation.parking_id == my_staff.parking_id)
            # Si es adminlocal (dueño/administrador general), ve todas las reservas de los establecimientos

        if status_filter:
            stmt = stmt.where(Reservation.status == status_filter)
        result = await db.execute(stmt)
        return [_format_reservation_response(r) for r in result.scalars().all()]

    # Fallback conductor: solo suyas
    stmt = select(Reservation).options(*options_load).where(Reservation.user_id == current_user.id).order_by(Reservation.id.desc())
    if parking_id:
        stmt = stmt.where(Reservation.parking_id == parking_id)
    if status_filter:
        stmt = stmt.where(Reservation.status == status_filter)
    
    result = await db.execute(stmt)
    return [_format_reservation_response(r) for r in result.scalars().all()]

@router.get("/my-reservations", response_model=List[ReservationResponse])
async def get_my_reservations(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.parking),
            selectinload(Reservation.slot)
        )
        .where(Reservation.user_id == current_user.id)
        .order_by(Reservation.id.desc())
    )
    return [_format_reservation_response(r) for r in result.scalars().all()]

@router.get("/verify/{code}", tags=["Reservas & Pases QR"])
async def verify_reservation(code: str, db: AsyncSession = Depends(get_db)):
    """Verificación pública del QR: escanea el código y valida el estado sin requerir login."""
    result = await db.execute(select(Reservation).where(Reservation.code == code))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada o código inválido")
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    return {
        "id": reservation.id,
        "code": reservation.code,
        "qr_code": reservation.qr_code,
        "license_plate": reservation.license_plate,
        "parking_id": reservation.parking_id,
        "parking_name": parking.name if parking else f"Sede #{reservation.parking_id}",
        "slot_code": slot.code if slot else f"#{reservation.slot_id}",
        "status": reservation.status,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "total_cost": reservation.total_cost,
    }

@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.parking),
            selectinload(Reservation.slot)
        )
        .where(Reservation.id == reservation_id)
    )
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    # IDOR: solo el dueño de la reserva o un administrador puede consultarla
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")
    return _format_reservation_response(reservation)

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    res_in: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validación de fechas
    _start = _naive_utc(res_in.start_time)
    _end = _naive_utc(res_in.end_time)
    if _end <= _start:
        raise HTTPException(status_code=422, detail="La hora de fin debe ser posterior al inicio")
    if (_end - _start).total_seconds() < 1800:
        raise HTTPException(status_code=422, detail="Duración mínima 30 minutos")

    plate_clean = res_in.license_plate.strip().upper()

    # =========================================================================
    # REGLAS DE NEGOCIO ANTI-SABOTAJE Y PROTECCIÓN DE INVENTARIO
    # =========================================================================
    if current_user.role not in ("local", "platform"):
        # Regla S-01: Límite de 1 reserva activa por usuario
        active_user_res = await db.execute(
            select(Reservation).where(
                Reservation.user_id == current_user.id,
                Reservation.status.in_(["scheduled", "active"])
            )
        )
        if active_user_res.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Ya cuentas con una reserva activa en curso. Completa o cancela tu reserva previa antes de solicitar otra."
            )

        # Regla S-02: Límite de cancelaciones diarias (Cooldown 24h a partir de 2 cancelaciones)
        from datetime import timedelta
        since_24h = datetime.utcnow() - timedelta(hours=24)
        cancelled_stmt = await db.execute(
            select(Reservation).where(
                Reservation.user_id == current_user.id,
                Reservation.status == "cancelled",
                Reservation.start_time >= since_24h
            )
        )
        cancelled_list = cancelled_stmt.scalars().all()
        if len(cancelled_list) >= 2:
            raise HTTPException(
                status_code=429,
                detail="Límite diario de cancelaciones alcanzado (máx. 2 al día). Por seguridad del sistema, tu cuenta tiene un tiempo de espera de 24 horas."
            )

    # Regla S-05: Unicidad de placa activa (no puede tener 2 reservas concurrentes)
    active_plate_res = await db.execute(
        select(Reservation).where(
            Reservation.license_plate == plate_clean,
            Reservation.status.in_(["scheduled", "active"])
        )
    )
    if active_plate_res.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"El vehículo con placa {plate_clean} ya cuenta con una reserva activa en el sistema."
        )

    # Verificar cajón con bloqueo FOR UPDATE para evitar doble-booking
    slot_res = await db.execute(select(Slot).where(Slot.id == res_in.slot_id).with_for_update())
    slot = slot_res.scalars().first()
    if not slot or slot.status != "free":
        raise HTTPException(status_code=409, detail="El cajón seleccionado no se encuentra libre (conflicto concurrente)")
    if slot.parking_id != res_in.parking_id:
        raise HTTPException(status_code=400, detail="El cajón no pertenece al estacionamiento indicado")

    # Verificar local y calcular costo
    parking_res = await db.execute(select(Parking).where(Parking.id == res_in.parking_id))
    parking = parking_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    # Duración en horas
    duration = max(1.0, (_end - _start).total_seconds() / 3600.0)
    total_cost = round(duration * parking.hourly_rate, 2)
    reservation_code = f"RSV-{uuid.uuid4().hex[:6].upper()}"
    tol_min = int(res_in.tolerance_minutes or (parking.tolerance_minutes if parking and parking.tolerance_minutes else 15))

    db_res = Reservation(
        code=reservation_code,
        user_id=current_user.id,
        parking_id=res_in.parking_id,
        slot_id=res_in.slot_id,
        license_plate=plate_clean,
        start_time=_start,
        end_time=_end,
        total_cost=total_cost,
        status="scheduled",
        qr_code=f"SMARTPARK-{reservation_code}-{plate_clean}",
        tolerance_minutes=tol_min
    )

    slot.status = "reserved"

    db.add(db_res)
    await db.commit()
    try:
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    await db.refresh(db_res)

    # Pago inmediato opcional si se especificó método
    if getattr(res_in, 'pay_now', False) and getattr(res_in, 'payment_method', None):
        try:
            method = str(res_in.payment_method).strip().lower()[:30] or "efectivo"
            if method in ("efectivo", "cash"): method = "cash"
            elif method in ("yape",): method = "yape"
            elif method in ("plin",): method = "plin"
            elif method in ("tarjeta", "card", "culqi"): method = "card"
            payment = Payment(
                reservation_id=db_res.id,
                user_id=current_user.id,
                amount_cents=int(round(total_cost * 100)),
                currency="PEN",
                status="succeeded",
                method=method,
                culqi_charge_id=None,
                description=f"Pago {method} reserva {reservation_code}",
            )
            db.add(payment)
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    resp = _format_reservation_response(db_res)
    resp.customer_name = current_user.full_name
    resp.customer_phone = current_user.phone
    resp.customer_email = current_user.email
    resp.parking_name = parking.name
    resp.slot_code = slot.code
    resp.tolerance_minutes = tol_min
    return resp

@router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
async def cancel_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")
    
    if reservation.status == "cancelled":
        raise HTTPException(status_code=400, detail="La reserva ya ha sido cancelada")

    reservation.status = "cancelled"

    # Liberar cajón asociado si sigue reservado u ocupado
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot and slot.status in ("reserved", "occupied"):
        slot.status = "free"

    await db.commit()
    try:
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.put("/{reservation_id}/extend", response_model=ReservationResponse)
async def extend_reservation(reservation_id: int, hours: float = 1.0, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")

    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    rate = parking.hourly_rate if parking else 8.50

    from datetime import timedelta
    reservation.end_time = reservation.end_time + timedelta(hours=hours)
    reservation.total_cost = round(reservation.total_cost + (hours * rate), 2)

    await db.commit()
    try:
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.put("/{reservation_id}/check-in", response_model=ReservationResponse)
async def check_in_reservation(
    reservation_id: int, 
    hours_stay: Optional[float] = None,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Check-in: marca el ingreso real del vehículo a la cochera
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para hacer check-in en esta reserva")

    # Transición válida: solo una reserva programada puede pasar a activa
    if reservation.status != "scheduled":
        raise HTTPException(status_code=400, detail=f"Solo se puede hacer check-in de reservas programadas (estado actual: {reservation.status})")

    now = datetime.utcnow()
    from datetime import timedelta

    # Determinar duración de la estadía: asignada por personal o duración calculada
    if hours_stay is not None and hours_stay > 0:
        stay_hours = max(0.5, float(hours_stay))
    elif reservation.end_time and reservation.start_time:
        stay_hours = max(0.5, (reservation.end_time - reservation.start_time).total_seconds() / 3600.0)
    else:
        stay_hours = 1.0

    # Recalcular costo estimado con la tarifa de la sede
    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    hourly_rate = parking.hourly_rate if parking else 5.0

    reservation.status = "active"
    reservation.actual_entry = now
    # FASE 2: La estadía corre desde el momento exacto del ingreso real
    reservation.end_time = now + timedelta(hours=stay_hours)
    reservation.total_cost = round(hourly_rate * stay_hours, 2)

    # El cajón pasa a ocupado mientras dure la estancia
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot:
        slot.status = "occupied"

    await db.commit()
    try:
        from app.core.cache import occ_incr
        await occ_incr(reservation.parking_id, free_delta=-1, occupied_delta=1)
    except Exception:
        pass
    try:
        await invalidate_parkings_cache()
        await invalidate_finances_cache()
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.put("/{reservation_id}/check-out", response_model=ReservationResponse)
async def check_out_reservation(
    reservation_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Check-out: registra la salida física y cierra la estancia
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para hacer check-out en esta reserva")

    # Transición válida: solo una reserva activa puede completarse
    if reservation.status != "active":
        raise HTTPException(status_code=400, detail=f"Solo se puede hacer check-out de reservas activas (estado actual: {reservation.status})")

    reservation.status = "completed"
    reservation.actual_exit = datetime.utcnow()

    # Liberar el cajón al terminar la estancia
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot and slot.status == "occupied":
        slot.status = "free"

    await db.commit()
    try:
        from app.core.cache import occ_incr
        await occ_incr(reservation.parking_id, free_delta=1, occupied_delta=-1)
    except Exception:
        pass
    try:
        await invalidate_parkings_cache()
        await invalidate_finances_cache()
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.delete("/{reservation_id}", status_code=status.HTTP_200_OK)
async def delete_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")

    # Si estaba activa o programada, liberar el cajón
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot and slot.status in ["reserved", "occupied"]:
        slot.status = "free"

    await db.delete(reservation)
    await db.commit()
    try:
        await realtime.broadcast("reservations:updated")
    except Exception:
        pass
    return {"status": "success", "message": f"Reserva {reservation_id} eliminada exitosamente"}
