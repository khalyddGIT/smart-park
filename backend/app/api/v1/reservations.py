from datetime import datetime, timezone
import uuid
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot, Parking, Payment, User, Staff
from app.schemas.schemas import ReservationCreate, ReservationUpdate, ReservationStayUpdate, ReservationResponse, ReservationCheckOut
from app.core.security import get_current_user, require_role
from app.core.realtime import realtime
from app.core.cache import cache_delete

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

def _is_time_in_night_shift(t: datetime, start_str: str, end_str: str) -> bool:
    """Verifica si una hora cae dentro del rango de turno noche (ej. 20:00 a 06:00)."""
    try:
        t_time = t.time()
        start_time = datetime.strptime((start_str or "20:00").strip(), "%H:%M").time()
        end_time = datetime.strptime((end_str or "06:00").strip(), "%H:%M").time()

        if start_time < end_time:
            return start_time <= t_time <= end_time
        else:
            # Cruza la medianoche (ej. 20:00 de hoy a 06:00 de mañana)
            return t_time >= start_time or t_time <= end_time
    except Exception:
        return False

def get_parking_vehicle_rate(parking: Parking, vehicle_type: Optional[str]) -> float:
    """Obtiene la tarifa horaria según el tipo de vehículo configurada por el admin local."""
    vtype = (vehicle_type or "auto").strip().lower()
    if vtype in ("suv", "camioneta", "truck", "pickup"):
        return float(parking.rate_suv if parking.rate_suv is not None else parking.hourly_rate or 7.0)
    elif vtype in ("mototaxi", "torito", "trimovil"):
        return float(parking.rate_mototaxi if parking.rate_mototaxi is not None else parking.hourly_rate or 3.5)
    elif vtype in ("moto", "motorcycle", "scooter", "bike"):
        return float(parking.rate_moto if parking.rate_moto is not None else parking.hourly_rate or 2.5)
    else:
        return float(parking.rate_auto if parking.rate_auto is not None else parking.hourly_rate or 5.0)

def get_parking_minute_rate(parking: Parking, vehicle_type: Optional[str]) -> float:
    """Obtiene la tarifa por minuto según el tipo de vehículo configurada por el admin local."""
    vtype = (vehicle_type or "auto").strip().lower()
    if vtype in ("suv", "camioneta", "truck", "pickup"):
        if parking.rate_minute_suv is not None:
            return float(parking.rate_minute_suv)
        base = float(parking.rate_suv if parking.rate_suv is not None else parking.hourly_rate or 7.0)
        return round(base / 60.0, 4)
    elif vtype in ("mototaxi", "torito", "trimovil"):
        if parking.rate_minute_mototaxi is not None:
            return float(parking.rate_minute_mototaxi)
        base = float(parking.rate_mototaxi if parking.rate_mototaxi is not None else parking.hourly_rate or 3.5)
        return round(base / 60.0, 4)
    elif vtype in ("moto", "motorcycle", "scooter", "bike"):
        if parking.rate_minute_moto is not None:
            return float(parking.rate_minute_moto)
        base = float(parking.rate_moto if parking.rate_moto is not None else parking.hourly_rate or 2.5)
        return round(base / 60.0, 4)
    else:
        if parking.rate_minute_auto is not None:
            return float(parking.rate_minute_auto)
        base = float(parking.rate_auto if parking.rate_auto is not None else parking.hourly_rate or 5.0)
        return round(base / 60.0, 4)

def get_parking_monthly_rate(parking: Parking, vehicle_type: Optional[str]) -> float:
    """Obtiene la tarifa mensual de abonado según el tipo de vehículo configurada por el admin local."""
    vtype = (vehicle_type or "auto").strip().lower()
    if vtype in ("suv", "camioneta", "truck", "pickup"):
        if getattr(parking, "rate_monthly_suv", None) is not None:
            return float(parking.rate_monthly_suv)
        return float(getattr(parking, "rate_monthly", 240.0) or 240.0)
    elif vtype in ("mototaxi", "torito", "trimovil"):
        if getattr(parking, "rate_monthly_mototaxi", None) is not None:
            return float(parking.rate_monthly_mototaxi)
        return float(getattr(parking, "rate_monthly", 120.0) or 120.0)
    elif vtype in ("moto", "motorcycle", "scooter", "bike"):
        if getattr(parking, "rate_monthly_moto", None) is not None:
            return float(parking.rate_monthly_moto)
        return float(getattr(parking, "rate_monthly", 90.0) or 90.0)
    else:
        if getattr(parking, "rate_monthly_auto", None) is not None:
            return float(parking.rate_monthly_auto)
        return float(getattr(parking, "rate_monthly", 180.0) or 180.0)

def vehicle_slot_family(kind: Optional[str]) -> str:
    """Normaliza tipo de vehículo / cajón a una familia comparable."""
    v = (kind or "auto").strip().lower()
    if v in ("suv", "camioneta", "truck", "pickup"):
        return "camioneta"
    if v in ("moto", "motorcycle", "scooter", "bike"):
        return "moto"
    if v in ("mototaxi", "torito", "trimovil"):
        return "mototaxi"
    return "auto"

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

    resp.vehicle_type = getattr(r, "vehicle_type", "auto") or "auto"
    resp.estimated_hours = getattr(r, "estimated_hours", 1) or 1
    resp.billing_unit = getattr(r, "billing_unit", "hour") or "hour"
    resp.estimated_minutes = getattr(r, "estimated_minutes", 60) or 60
    resp.is_night_shift = bool(getattr(r, "is_night_shift", False))
    resp.prepaid = bool(getattr(r, "prepaid", False))
    resp.is_open_stay = bool(getattr(r, "is_open_stay", False))
    resp.reservation_type = getattr(r, "reservation_type", "standard") or "standard"
    resp.subscription_months = getattr(r, "subscription_months", 1) or 1
    resp.is_subscription = bool(getattr(r, "is_subscription", False))

    # Cálculo en vivo de exceso de estadía y monto acumulado incremental (sin tiempo de gracia)
    # Los abonos mensuales pagan tarifa plana por mes, no exceso por hora
    if not resp.is_subscription and r.status == "active" and r.end_time:
        now = datetime.utcnow()
        end_naive = r.end_time.replace(tzinfo=None) if r.end_time.tzinfo else r.end_time
        if now > end_naive:
            resp.is_overtime = True
            resp.overtime_minutes = max(1, int((now - end_naive).total_seconds() / 60.0))
            entry_time = r.actual_entry or r.start_time
            if entry_time:
                entry_naive = entry_time.replace(tzinfo=None) if entry_time.tzinfo else entry_time
                elapsed_sec = max(0.0, (now - entry_naive).total_seconds())
                parking = getattr(r, "parking", None)
                vtype = getattr(r, "vehicle_type", "auto")
                billing_unit = getattr(r, "billing_unit", "hour") or "hour"
                night_surcharge = float(parking.night_shift_surcharge or 0.0) if parking and getattr(r, "is_night_shift", False) else 0.0
                if billing_unit == "minute":
                    diff_min = max(1, math.ceil(elapsed_sec / 60.0))
                    minute_rate = get_parking_minute_rate(parking, vtype) if parking else 0.10
                    calculated_cost = round(diff_min * (minute_rate + (night_surcharge / 60.0 if night_surcharge else 0.0)), 2)
                else:
                    billed_hours = max(1, math.ceil(elapsed_sec / 3600.0))
                    vehicle_rate = get_parking_vehicle_rate(parking, vtype) if parking else 5.0
                    calculated_cost = round(billed_hours * (vehicle_rate + night_surcharge), 2)
                if calculated_cost > resp.total_cost:
                    resp.total_cost = calculated_cost

    return resp

async def _check_reservation_access(reservation: Reservation, current_user: User, db: AsyncSession, action_label: str = "esta reserva"):
    if reservation.user_id == current_user.id:
        return
    if current_user.role == "platform" or current_user.email == "adminlocal@smartpark.com":
        return
    if current_user.role == "local":
        curr_email = (current_user.email or "").strip().lower()
        p_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
        parking = p_res.scalars().first()
        if parking and parking.email and parking.email.strip():
            is_owner = bool(parking.email.strip().lower() == curr_email)
        else:
            is_owner = True
        s_res = await db.execute(select(Staff.id).where(func.lower(Staff.email) == curr_email, Staff.parking_id == reservation.parking_id, Staff.status == "active"))
        is_staff = s_res.scalars().first() is not None
        if not is_owner and not is_staff:
            raise HTTPException(status_code=403, detail=f"No autorizado para {action_label} en otra sede")
        return
    raise HTTPException(status_code=403, detail=f"No autorizado para {action_label}")

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
        if current_user.role == "local" and current_user.email != "adminlocal@smartpark.com":
            curr_email = (current_user.email or "").strip().lower()
            p_res = await db.execute(select(Parking.id).where(func.lower(Parking.email) == curr_email))
            owned_ids = set(p_res.scalars().all())
            s_res = await db.execute(select(Staff.parking_id).where(func.lower(Staff.email) == curr_email, Staff.status == "active"))
            staff_ids = set(pid for pid in s_res.scalars().all() if pid)
            allowed_pids = owned_ids | staff_ids

            if parking_id:
                if parking_id not in allowed_pids:
                    raise HTTPException(status_code=403, detail="No tienes permiso para ver reservas de esta sede")
                stmt = stmt.where(Reservation.parking_id == parking_id)
            else:
                stmt = stmt.where(Reservation.parking_id.in_(allowed_pids) if allowed_pids else False)
        elif parking_id:
            stmt = stmt.where(Reservation.parking_id == parking_id)

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
    from sqlalchemy import or_
    stmt = (
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.parking),
            selectinload(Reservation.slot)
        )
        .where(
            or_(
                Reservation.code == code,
                Reservation.qr_code == code,
                Reservation.code.ilike(code),
                Reservation.qr_code.ilike(code)
            )
        )
    )
    result = await db.execute(stmt)
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada o código inválido")

    slot = reservation.slot
    parking = reservation.parking
    user = reservation.user

    tol_min = reservation.tolerance_minutes or (parking.tolerance_minutes if parking else 15) or 15

    def _iso_utc(dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    return {
        "id": reservation.id,
        "code": reservation.code,
        "qr_code": reservation.qr_code,
        "license_plate": reservation.license_plate,
        "parking_id": reservation.parking_id,
        "parking_name": parking.name if parking else f"Sede #{reservation.parking_id}",
        "parking_address": parking.address if parking else "",
        "hourly_rate": float(parking.hourly_rate) if parking and parking.hourly_rate else 8.50,
        "slot_id": reservation.slot_id,
        "slot_code": slot.code if slot else f"#{reservation.slot_id}",
        "floor_level": slot.floor_level if slot and slot.floor_level else "Piso 1",
        "slot_type": slot.slot_type if slot and slot.slot_type else "auto",
        "status": reservation.status,
        "tolerance_minutes": tol_min,
        "start_time": _iso_utc(reservation.start_time),
        "end_time": _iso_utc(reservation.end_time),
        "actual_entry": _iso_utc(reservation.actual_entry),
        "actual_exit": _iso_utc(reservation.actual_exit),
        "total_cost": float(reservation.total_cost or 0),
        "customer_name": user.full_name if user else "Conductor Registrado",
        "customer_phone": user.phone if user else None,
        "customer_email": user.email if user else None,
        "billing_unit": getattr(reservation, "billing_unit", "hour") or "hour",
        "estimated_minutes": getattr(reservation, "estimated_minutes", 60) or 60,
        "payment_method": getattr(reservation, "payment_method", "efectivo") or "efectivo",
        "amount_paid": float(getattr(reservation, "amount_paid", 0.0) or 0.0),
        "reservation_type": getattr(reservation, "reservation_type", "standard") or "standard",
        "subscription_months": getattr(reservation, "subscription_months", 1) or 1,
        "is_subscription": bool(getattr(reservation, "is_subscription", False)),
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
    await _check_reservation_access(reservation, current_user, db, action_label="ver esta reserva")
    return _format_reservation_response(reservation)

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    res_in: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validación de fechas y modalidad
    from datetime import timedelta
    res_type = (getattr(res_in, "reservation_type", None) or "standard").strip().lower()
    is_sub = bool(getattr(res_in, "is_subscription", False) or res_type == "subscription")
    if is_sub:
        res_type = "subscription"
    sub_months = max(1, min(12, int(getattr(res_in, "subscription_months", 1) or 1)))

    _start = _naive_utc(res_in.start_time) if res_in.start_time else datetime.utcnow()
    _end = _naive_utc(res_in.end_time) if res_in.end_time else None

    # En abonos mensuales, la fecha de fin se auto-calcula para cubrir 30 días por mes
    if is_sub:
        _end = _start + timedelta(days=30 * sub_months)
    elif _end is None:
        _end = _start + timedelta(hours=res_in.estimated_hours or 1)
    elif _end <= _start:
        raise HTTPException(status_code=422, detail="La hora de fin debe ser posterior al inicio")

    plate_clean = res_in.license_plate.strip().upper()

    # =========================================================================
    # REGLAS DE NEGOCIO ANTI-SABOTAJE Y PROTECCIÓN DE INVENTARIO
    # =========================================================================
    if current_user.role not in ("local", "platform"):
        # Regla S-01: Límite de 1 reserva activa estándar por usuario
        if res_type == "standard":
            active_user_res = await db.execute(
                select(Reservation).where(
                    Reservation.user_id == current_user.id,
                    Reservation.status.in_(["scheduled", "active"]),
                    Reservation.reservation_type == "standard"
                )
            )
            if active_user_res.scalars().first():
                raise HTTPException(
                    status_code=400,
                    detail="Ya cuentas con una reserva activa en curso. Completa o cancela tu reserva previa antes de solicitar otra."
                )
        elif is_sub:
            active_sub_res = await db.execute(
                select(Reservation).where(
                    Reservation.user_id == current_user.id,
                    Reservation.status.in_(["scheduled", "active"]),
                    Reservation.parking_id == res_in.parking_id,
                    Reservation.license_plate == plate_clean,
                    Reservation.is_subscription == True
                )
            )
            if active_sub_res.scalars().first():
                raise HTTPException(
                    status_code=400,
                    detail=f"Ya cuentas con un abono mensual activo en esta sede para el vehículo con placa {plate_clean}."
                )

        # Regla S-02: Límite de cancelaciones diarias (Cooldown 24h a partir de 3 cancelaciones)
        since_24h = datetime.utcnow() - timedelta(hours=24)
        cancelled_stmt = await db.execute(
            select(Reservation).where(
                Reservation.user_id == current_user.id,
                Reservation.status == "cancelled",
                Reservation.start_time >= since_24h
            )
        )
        cancelled_list = cancelled_stmt.scalars().all()
        if len(cancelled_list) >= 3:
            raise HTTPException(
                status_code=429,
                detail="Límite diario de cancelaciones alcanzado (máx. 3 al día). Por seguridad del sistema, tu cuenta tiene un tiempo de espera de 24 horas."
            )

    # Regla S-05: Unicidad de placa activa (no puede tener 2 reservas concurrentes inmediatas)
    if res_type == "standard":
        active_plate_res = await db.execute(
            select(Reservation).where(
                Reservation.license_plate == plate_clean,
                Reservation.status.in_(["scheduled", "active"]),
                Reservation.reservation_type == "standard"
            )
        )
        if active_plate_res.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo con placa {plate_clean} ya cuenta con una reserva activa en el sistema."
            )

    # Verificar o auto-asignar cajón con bloqueo FOR UPDATE para evitar doble-booking (Reserva Rápida / Expresa)
    vtype = (getattr(res_in, "vehicle_type", None) or "auto").strip().lower()
    slot = None
    is_auto = bool(getattr(res_in, "auto_assign", False) or not res_in.slot_id or res_in.slot_id <= 0)

    # Si se solicitó un slot específico, intentar reservarlo primero
    if res_in.slot_id and res_in.slot_id > 0:
        slot_res = await db.execute(select(Slot).where(Slot.id == res_in.slot_id).with_for_update())
        cand = slot_res.scalars().first()
        if cand and cand.status == "free" and cand.parking_id == res_in.parking_id:
            slot = cand
        elif not is_auto:
            # En reserva manual en plano 2D, si el cajón exacto no está libre se devuelve 409
            if not cand or cand.status != "free":
                raise HTTPException(status_code=409, detail="El cajón seleccionado no se encuentra libre (conflicto concurrente)")
            if cand.parking_id != res_in.parking_id:
                raise HTTPException(status_code=400, detail="El cajón no pertenece al estacionamiento indicado")

    # Si no tiene slot asignado (reserva rápida o fallback automático si el cajón preview fue tomado)
    if not slot:
        # Auto-asignación inteligente: seleccionar la mejor plaza libre compatible
        target_family = vehicle_slot_family(vtype)
        free_slots_res = await db.execute(
            select(Slot).where(
                Slot.parking_id == res_in.parking_id,
                Slot.status == "free"
            ).with_for_update()
        )
        free_slots = free_slots_res.scalars().all()
        if not free_slots:
            raise HTTPException(
                status_code=409,
                detail="No hay plazas libres disponibles en este establecimiento en este momento."
            )
        
        # Filtramos por familia compatible; si no hay específica, usamos cualquiera disponible
        matching_slots = [s for s in free_slots if vehicle_slot_family(s.slot_type) == target_family]
        candidate_slots = matching_slots if matching_slots else free_slots
        candidate_slots.sort(key=lambda s: s.id)
        slot = candidate_slots[0]

    # Verificar local y calcular costo
    parking_res = await db.execute(select(Parking).where(Parking.id == res_in.parking_id))
    parking = parking_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    p_status = (parking.status or "active").strip().lower()
    if p_status in ("maintenance", "mantenimiento"):
        raise HTTPException(
            status_code=400,
            detail="El establecimiento se encuentra en mantenimiento y no acepta reservas en este momento."
        )
    if p_status in ("closed", "cerrado"):
        raise HTTPException(
            status_code=400,
            detail="El establecimiento se encuentra cerrado temporalmente y no acepta reservas en este momento."
        )
    if p_status not in ("active", "operativo"):
        raise HTTPException(
            status_code=400,
            detail="El establecimiento no se encuentra operativo para reservas en este momento."
        )

    # Verificar política de prepago obligatorio
    if getattr(parking, "require_reservation_prepay", False) and not getattr(res_in, "pay_now", False):
        raise HTTPException(
            status_code=400,
            detail="Este establecimiento exige el pago anticipado para confirmar la reserva de plaza."
        )

    billing_unit = (res_in.billing_unit or getattr(parking, "billing_unit", "hour") or "hour").strip().lower()
    total_seconds = (_end - _start).total_seconds()
    duration_minutes = max(1, int(round(total_seconds / 60.0)))

    if billing_unit == "minute":
        min_stay_min = int(getattr(parking, "min_stay_minutes", 15) or 15)
        if duration_minutes < min_stay_min:
            raise HTTPException(status_code=422, detail=f"Duración mínima permitida para este local: {min_stay_min} minutos")
    else:
        if total_seconds < 1800:
            raise HTTPException(status_code=422, detail="Duración mínima 30 minutos")

    vtype = (getattr(res_in, "vehicle_type", None) or "auto").strip().lower()
    slot_kind = getattr(slot, "slot_type", None) or "auto"
    if res_in.slot_id and res_in.slot_id > 0 and vehicle_slot_family(slot_kind) != vehicle_slot_family(vtype):
        raise HTTPException(
            status_code=400,
            detail=f"El cajón {slot.code} es para {slot_kind}, no para {vtype}. Elige un cajón de tu tipo de vehículo."
        )

    # Comprobar si aplica Turno Noche
    is_night = False
    night_surcharge = 0.0
    if getattr(parking, "night_shift_enabled", False):
        start_is_night = _is_time_in_night_shift(_start, parking.night_shift_start or "20:00", parking.night_shift_end or "06:00")
        end_is_night = _is_time_in_night_shift(_end, parking.night_shift_start or "20:00", parking.night_shift_end or "06:00")
        if start_is_night or end_is_night:
            is_night = True
            night_surcharge = float(parking.night_shift_surcharge or 0.0)

    reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0)

    if is_sub:
        monthly_rate = get_parking_monthly_rate(parking, vtype)
        total_cost = round(monthly_rate * sub_months, 2)
        billing_unit = "month"
        estimated_hours = 24 * 30 * sub_months
        estimated_minutes = estimated_hours * 60
    elif billing_unit == "minute":
        min_stay_min = int(getattr(parking, "min_stay_minutes", 15) or 15)
        if duration_minutes < min_stay_min:
            raise HTTPException(status_code=422, detail=f"Duración mínima permitida para este local: {min_stay_min} minutos")
        base_minute_rate = get_parking_minute_rate(parking, vtype)
        night_minute_surcharge = (night_surcharge / 60.0) if night_surcharge else 0.0
        effective_rate = base_minute_rate + night_minute_surcharge
        total_cost = round((duration_minutes * effective_rate) + reservation_fee, 2)
        estimated_hours = max(1, int(round(total_seconds / 3600.0)))
        estimated_minutes = int(res_in.estimated_minutes or duration_minutes)
    else:
        if total_seconds < 1800:
            raise HTTPException(status_code=422, detail="Duración mínima 30 minutos")
        base_vehicle_rate = get_parking_vehicle_rate(parking, vtype)
        effective_rate = base_vehicle_rate + night_surcharge
        duration_for_calc = max(1.0, total_seconds / 3600.0)
        total_cost = round((duration_for_calc * effective_rate) + reservation_fee, 2)
        estimated_hours = max(1, int(round(total_seconds / 3600.0)))
        estimated_minutes = int(res_in.estimated_minutes or duration_minutes)

    reservation_code = f"RSV-{uuid.uuid4().hex[:6].upper()}"
    tol_min = int(res_in.tolerance_minutes or (parking.tolerance_minutes if parking and parking.tolerance_minutes else 15))
    is_prepaid = bool(getattr(res_in, 'pay_now', False) and getattr(res_in, 'payment_method', None))

    db_res = Reservation(
        code=reservation_code,
        user_id=current_user.id,
        parking_id=res_in.parking_id,
        slot_id=slot.id,
        license_plate=plate_clean,
        start_time=_start,
        end_time=_end,
        total_cost=total_cost,
        status="scheduled",
        qr_code=f"SMARTPARK-{reservation_code}-{plate_clean}",
        tolerance_minutes=tol_min,
        vehicle_type=vtype,
        estimated_hours=estimated_hours,
        billing_unit=billing_unit,
        estimated_minutes=estimated_minutes,
        is_night_shift=is_night,
        prepaid=is_prepaid,
        is_open_stay=bool(getattr(res_in, "is_open_stay", False)),
        reservation_type=res_type,
        subscription_months=sub_months if is_sub else 1,
        is_subscription=is_sub
    )

    slot.status = "reserved"

    db.add(db_res)
    await db.commit()
    try:
        broadcast_payload = {
            "parking_id": db_res.parking_id,
            "slot_id": db_res.slot_id,
            "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", ""),
            "status": "reserved",
            "reservation_id": db_res.id,
            "code": db_res.code,
            "reservation_status": db_res.status,
            "license_plate": db_res.license_plate,
            "start_time": db_res.start_time.isoformat() if db_res.start_time else None,
            "end_time": db_res.end_time.isoformat() if db_res.end_time else None,
            "total_cost": db_res.total_cost,
            "tolerance_minutes": getattr(db_res, "tolerance_minutes", 15),
            "reservation_type": db_res.reservation_type,
            "subscription_months": db_res.subscription_months,
            "is_subscription": db_res.is_subscription
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
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
    await _check_reservation_access(reservation, current_user, db, action_label="cancelar esta reserva")
    
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
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", "") if slot else "",
            "status": "free",
            "reservation_id": reservation.id,
            "code": reservation.code,
            "reservation_status": "cancelled"
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
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
    await _check_reservation_access(reservation, current_user, db, action_label="hacer check-in en esta reserva")

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

    # Recalcular costo estimado con la tarifa diferenciada de la sede
    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()

    reservation.status = "active"
    reservation.actual_entry = now
    # FASE 2: La estadía corre desde el momento exacto del ingreso real
    reservation.end_time = now + timedelta(hours=stay_hours)
    
    # Si el operador especificó una duración diferente a la reserva original, recalcular con tarifa diferenciada
    if hours_stay is not None and hours_stay > 0 and parking:
        vtype = getattr(reservation, "vehicle_type", "auto")
        vehicle_rate = get_parking_vehicle_rate(parking, vtype)
        night_surcharge = float(parking.night_shift_surcharge or 0.0) if getattr(reservation, "is_night_shift", False) else 0.0
        reservation.total_cost = round((vehicle_rate + night_surcharge) * stay_hours, 2)
    elif not reservation.total_cost and parking:
        vtype = getattr(reservation, "vehicle_type", "auto")
        vehicle_rate = get_parking_vehicle_rate(parking, vtype)
        reservation.total_cost = round(vehicle_rate * stay_hours, 2)

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
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", "") if slot else "",
            "status": "occupied",
            "reservation_id": reservation.id,
            "code": reservation.code,
            "reservation_status": "active",
            "license_plate": reservation.license_plate,
            "actual_entry": reservation.actual_entry.isoformat() if reservation.actual_entry else None,
            "start_time": reservation.start_time.isoformat() if reservation.start_time else None,
            "end_time": reservation.end_time.isoformat() if reservation.end_time else None
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
    except Exception:
        pass
    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.put("/{reservation_id}/stay", response_model=ReservationResponse)
async def update_reservation_stay(
    reservation_id: int,
    stay_in: ReservationStayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    await _check_reservation_access(reservation, current_user, db, action_label="editar la estadía de esta reserva")

    from datetime import timedelta

    # 1. Modificar hora de entrada real si fue provista
    if stay_in.actual_entry is not None:
        clean_entry = _naive_utc(stay_in.actual_entry)
        reservation.actual_entry = clean_entry
        reservation.start_time = clean_entry

    # 2. Modificar cajón asignado si fue provisto
    if stay_in.slot_code:
        code_clean = stay_in.slot_code.strip()
        slot_res = await db.execute(
            select(Slot).where(
                Slot.parking_id == reservation.parking_id,
                func.lower(Slot.code) == code_clean.lower()
            )
        )
        new_slot = slot_res.scalars().first()
        if new_slot and new_slot.id != reservation.slot_id:
            # Liberar el cajón anterior si estaba ocupado
            old_slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
            old_slot = old_slot_res.scalars().first()
            if old_slot and old_slot.status == "occupied":
                old_slot.status = "free"
            # Asignar nuevo cajón
            new_slot.status = "occupied" if reservation.status == "active" else "reserved"
            reservation.slot_id = new_slot.id

    # 3. Modificar horas o régimen de estadía
    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    vtype = getattr(reservation, "vehicle_type", "auto")
    vehicle_rate = get_parking_vehicle_rate(parking, vtype) if parking else 5.0

    entry_ref = reservation.actual_entry or reservation.start_time or datetime.utcnow()

    if stay_in.is_open_stay is not None:
        reservation.is_open_stay = stay_in.is_open_stay

    if stay_in.hours_stay is not None and stay_in.hours_stay > 0:
        stay_hours = float(stay_in.hours_stay)
        reservation.end_time = entry_ref + timedelta(hours=stay_hours)
        reservation.estimated_hours = stay_hours
        night_surcharge = float(parking.night_shift_surcharge or 0.0) if getattr(reservation, "is_night_shift", False) else 0.0
        reservation.total_cost = round((vehicle_rate + night_surcharge) * stay_hours, 2)
    elif getattr(reservation, "is_open_stay", False):
        # En estadía abierta, el end_time proyectado se extiende 24h desde la entrada
        reservation.end_time = entry_ref + timedelta(hours=24)

    await db.commit()
    try:
        await invalidate_parkings_cache()
        await invalidate_finances_cache()
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "status": "occupied" if reservation.status == "active" else reservation.status,
            "reservation_id": reservation.id,
            "code": reservation.code,
            "actual_entry": reservation.actual_entry.isoformat() if reservation.actual_entry else None,
            "start_time": reservation.start_time.isoformat() if reservation.start_time else None,
            "end_time": reservation.end_time.isoformat() if reservation.end_time else None,
            "total_cost": reservation.total_cost
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
    except Exception:
        pass

    await db.refresh(reservation)
    return _format_reservation_response(reservation)

@router.put("/{reservation_id}/check-out", response_model=ReservationResponse)
async def check_out_reservation(
    reservation_id: int, 
    checkout_in: Optional[ReservationCheckOut] = None,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Check-out: registra la salida física y cierra la estancia
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    await _check_reservation_access(reservation, current_user, db, action_label="hacer check-out en esta reserva")

    # Transición válida: solo una reserva activa puede completarse
    if reservation.status != "active":
        raise HTTPException(status_code=400, detail=f"Solo se puede hacer check-out de reservas activas (estado actual: {reservation.status})")

    now = datetime.utcnow()
    reservation.status = "completed"
    reservation.actual_exit = now

    # Reconciliación de costo de estadía si no se especificó monto fijo
    if checkout_in and checkout_in.amount_paid is not None:
        reservation.total_cost = float(checkout_in.amount_paid)
        reservation.amount_paid = float(checkout_in.amount_paid)
    else:
        # Calcular según tiempo real y tarifa del parking SIN tiempo de gracia
        p_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
        parking = p_res.scalars().first()
        vtype = getattr(reservation, "vehicle_type", "auto")
        billing_unit = (getattr(reservation, "billing_unit", None) or (parking.billing_unit if parking else "hour") or "hour").strip().lower()

        # Comprobar si aplica recargo nocturno
        night_surcharge = 0.0
        if parking and getattr(parking, "night_shift_enabled", False):
            if getattr(reservation, "is_night_shift", False) or _is_time_in_night_shift(now, parking.night_shift_start or "20:00", parking.night_shift_end or "06:00"):
                night_surcharge = float(parking.night_shift_surcharge or 0.0)

        entry_time = reservation.actual_entry or reservation.start_time or now
        diff_seconds = max(0.0, (now - entry_time).total_seconds())

        if billing_unit == "minute":
            diff_minutes = max(1, math.ceil(diff_seconds / 60.0))
            minute_rate = get_parking_minute_rate(parking, vtype) if parking else 0.10
            effective_minute_rate = minute_rate + (night_surcharge / 60.0 if night_surcharge else 0.0)
            reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0) if parking else 0.0
            calculated_cost = round((diff_minutes * effective_minute_rate) + reservation_fee, 2)
        else:
            billed_hours = max(1, math.ceil(diff_seconds / 3600.0))
            vehicle_rate = get_parking_vehicle_rate(parking, vtype) if parking else 5.0
            effective_rate = vehicle_rate + night_surcharge
            reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0) if parking else 0.0
            calculated_cost = round((billed_hours * effective_rate) + reservation_fee, 2)

        if getattr(reservation, "is_open_stay", False) or calculated_cost > (reservation.total_cost or 0):
            reservation.total_cost = calculated_cost
        if not getattr(reservation, "amount_paid", None):
            reservation.amount_paid = reservation.total_cost

    if checkout_in and checkout_in.payment_method:
        reservation.payment_method = checkout_in.payment_method

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
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", "") if slot else "",
            "status": "free",
            "reservation_id": reservation.id,
            "code": reservation.code,
            "reservation_status": "completed",
            "actual_entry": reservation.actual_entry.isoformat() if reservation.actual_entry else None,
            "actual_exit": reservation.actual_exit.isoformat() if reservation.actual_exit else None,
            "amount_paid": getattr(reservation, "amount_paid", 0.0),
            "payment_method": getattr(reservation, "payment_method", "efectivo")
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
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
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "slot_code": getattr(slot, "code", "") or getattr(slot, "spot_number", "") if slot else "",
            "status": "free"
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
    except Exception:
        pass
    return {"status": "success", "message": f"Reserva {reservation_id} eliminada exitosamente"}
