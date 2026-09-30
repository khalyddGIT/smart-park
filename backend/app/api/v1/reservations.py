from datetime import datetime, timezone, timedelta
import uuid
import math
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot, Parking, Payment, User, Staff, Vehicle
from app.schemas.schemas import (
    ReservationCreate,
    ReservationUpdate,
    ReservationStayUpdate,
    ReservationCheckIn,
    ReservationResponse,
    ReservationCheckOut,
    ReservationOvertimePayment,
    PaginatedReservationResponse,
)
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


def compatible_slot_types(kind: Optional[str]) -> tuple[str, ...]:
    """Valores legacy que pertenecen a la misma familia de plaza."""
    family = vehicle_slot_family(kind)
    return {
        "camioneta": ("suv", "camioneta", "truck", "pickup"),
        "moto": ("moto", "motorcycle", "scooter", "bike"),
        "mototaxi": ("mototaxi", "torito", "trimovil"),
        "auto": ("auto", "car", "sedan"),
    }[family]

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
    resp.estimated_hours = getattr(r, "estimated_hours", None)
    resp.billing_unit = getattr(r, "billing_unit", "hour") or "hour"
    resp.estimated_minutes = getattr(r, "estimated_minutes", None)
    resp.is_night_shift = bool(getattr(r, "is_night_shift", False))
    resp.prepaid = bool(getattr(r, "prepaid", False))
    resp.is_open_stay = bool(getattr(r, "is_open_stay", False))
    resp.reservation_type = getattr(r, "reservation_type", "standard") or "standard"
    resp.subscription_months = getattr(r, "subscription_months", 1) or 1
    resp.is_subscription = bool(getattr(r, "is_subscription", False))
    resp.subscription_days = getattr(r, "subscription_days", None)
    resp.subscription_type = getattr(r, "subscription_type", None)

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
                parking = None
                try:
                    parking = getattr(r, "parking", None)
                except Exception:
                    parking = None
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

async def _get_allowed_parking_ids(current_user: User, db: AsyncSession) -> Optional[set]:
    """
    Retorna el conjunto de IDs de sedes a las que tiene acceso el usuario local/operador.
    Retorna None si tiene acceso irrestricto (Superadmin / platform / adminlocal).
    """
    if current_user.role == "platform" or current_user.email == "adminlocal@smartpark.com":
        return None

    curr_email = (current_user.email or "").strip().lower()
    curr_name = (current_user.full_name or "").strip().lower()
    allowed_ids = set()

    # 1. Sedes donde es dueño directo por email o por nombre de propietario
    conds = []
    if curr_email:
        conds.append(func.lower(Parking.email) == curr_email)
    if curr_name:
        conds.append(func.lower(Parking.owner) == curr_name)
    if conds:
        p_res = await db.execute(select(Parking).where(or_(*conds)))
        owned_parkings = p_res.scalars().all()
        for p in owned_parkings:
            allowed_ids.add(p.id)
            # Multi-sucursal: si es dueño de "Smart Park - Miraflores", permitir sedes hermanas
            p_name = p.name or ""
            prefix = p_name.split(" - ")[0].strip().lower() if " - " in p_name else p_name.strip().lower()
            if prefix and len(prefix) >= 3:
                b_res = await db.execute(select(Parking.id).where(func.lower(Parking.name).like(f"{prefix}%")))
                allowed_ids.update(b_res.scalars().all())

    # 2. Staff activo por email, DNI/teléfono o nombre (con estados flexibles y case-insensitive)
    staff_conds = []
    if curr_email:
        staff_conds.append(func.lower(Staff.email) == curr_email)
    if current_user.phone:
        staff_conds.append(Staff.dni == current_user.phone.strip())
    if curr_name:
        staff_conds.append(func.lower(Staff.full_name) == curr_name)

    if staff_conds:
        s_res = await db.execute(select(Staff.parking_id).where(
            or_(*staff_conds),
            func.lower(Staff.status).in_(["active", "activo", "habilitado"])
        ))
        for pid in s_res.scalars().all():
            if pid:
                allowed_ids.add(pid)

    # 3. parking_id enlazado en la instancia de usuario si existe
    user_pid = getattr(current_user, "parking_id", None)
    if user_pid:
        try:
            allowed_ids.add(int(user_pid))
        except (ValueError, TypeError):
            pass

    return allowed_ids

async def _check_reservation_access(reservation: Reservation, current_user: User, db: AsyncSession, action_label: str = "esta reserva"):
    if reservation.user_id == current_user.id:
        return
    if current_user.role == "platform" or current_user.email == "adminlocal@smartpark.com":
        return
    if current_user.role == "local":
        allowed_pids = await _get_allowed_parking_ids(current_user, db)
        if allowed_pids is None or reservation.parking_id in allowed_pids:
            return
        # Si la sede no tiene email configurado, permitir acceso al admin local
        p_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
        parking = p_res.scalars().first()
        if parking and (not parking.email or not parking.email.strip()):
            return
        raise HTTPException(status_code=403, detail=f"No autorizado para {action_label} en otra sede")
    raise HTTPException(status_code=403, detail=f"No autorizado para {action_label}")

@router.get("", response_model=Union[PaginatedReservationResponse, List[ReservationResponse]])
async def list_reservations(
    parking_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1, description="Número de página"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Cantidad de elementos por página"),
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
        base_filters = []
        if current_user.role == "local" and current_user.email != "adminlocal@smartpark.com":
            allowed_pids = await _get_allowed_parking_ids(current_user, db)
            if allowed_pids is not None:
                if parking_id:
                    if allowed_pids and parking_id not in allowed_pids:
                        raise HTTPException(status_code=403, detail="No tienes permiso para ver reservas de esta sede")
                    base_filters.append(Reservation.parking_id == parking_id)
                else:
                    base_filters.append(Reservation.parking_id.in_(allowed_pids) if allowed_pids else False)
            elif parking_id:
                base_filters.append(Reservation.parking_id == parking_id)
        elif parking_id:
            base_filters.append(Reservation.parking_id == parking_id)

        if status_filter:
            base_filters.append(Reservation.status == status_filter)

        stmt = select(Reservation).options(*options_load)
        count_stmt = select(func.count(Reservation.id))
        if base_filters:
            stmt = stmt.where(*base_filters)
            count_stmt = count_stmt.where(*base_filters)

        stmt = stmt.order_by(Reservation.id.desc())

        if page is None:
            result = await db.execute(stmt)
            return [_format_reservation_response(r) for r in result.scalars().all()]

        eff_page_size = page_size or 20
        total_res = await db.execute(count_stmt)
        total_count = total_res.scalar() or 0

        paged_stmt = stmt.offset((page - 1) * eff_page_size).limit(eff_page_size)
        result = await db.execute(paged_stmt)
        items = [_format_reservation_response(r) for r in result.scalars().all()]
        total_pages = math.ceil(total_count / eff_page_size) if total_count > 0 else 1

        return PaginatedReservationResponse(
            items=items,
            total=total_count,
            page=page,
            page_size=eff_page_size,
            total_pages=total_pages
        )

    # Fallback conductor: solo suyas
    base_filters = [Reservation.user_id == current_user.id]
    if parking_id:
        base_filters.append(Reservation.parking_id == parking_id)
    if status_filter:
        base_filters.append(Reservation.status == status_filter)

    stmt = select(Reservation).options(*options_load).where(*base_filters).order_by(Reservation.id.desc())
    count_stmt = select(func.count(Reservation.id)).where(*base_filters)

    if page is None:
        result = await db.execute(stmt)
        return [_format_reservation_response(r) for r in result.scalars().all()]

    eff_page_size = page_size or 20
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    paged_stmt = stmt.offset((page - 1) * eff_page_size).limit(eff_page_size)
    result = await db.execute(paged_stmt)
    items = [_format_reservation_response(r) for r in result.scalars().all()]
    total_pages = math.ceil(total_count / eff_page_size) if total_count > 0 else 1

    return PaginatedReservationResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=eff_page_size,
        total_pages=total_pages
    )

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
        "estimated_hours": getattr(reservation, "estimated_hours", None),
        "estimated_minutes": getattr(reservation, "estimated_minutes", None),
        "payment_method": getattr(reservation, "payment_method", "efectivo") or "efectivo",
        "amount_paid": float(getattr(reservation, "amount_paid", 0.0) or 0.0),
        "reservation_type": getattr(reservation, "reservation_type", "standard") or "standard",
        "subscription_months": getattr(reservation, "subscription_months", 1) or 1,
        "is_subscription": bool(getattr(reservation, "is_subscription", False)),
        "is_open_stay": bool(getattr(reservation, "is_open_stay", False)),
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
    if res_type in ("immediate", "inmediata"):
        res_type = "standard"
    is_sub = bool(getattr(res_in, "is_subscription", False) or res_type == "subscription")
    if is_sub:
        res_type = "subscription"
    sub_months = max(1, min(12, int(getattr(res_in, "subscription_months", 1) or 1)))
    sub_days = int(getattr(res_in, "subscription_days", 0) or (30 * sub_months))
    if sub_days < 1:
        sub_days = 30 * sub_months
    sub_type = getattr(res_in, "subscription_type", None) or ("monthly" if sub_days == 30 else ("3_weeks" if sub_days == 21 else "fractional"))

    requested_start = _naive_utc(res_in.start_time) if res_in.start_time else datetime.utcnow()
    # Una reserva inmediata empieza a consumir su ventana de llegada al crearse.
    # Una programada conserva la llegada elegida. Ninguna fija la salida del cliente.
    _start = requested_start if res_type == "advance" or is_sub else datetime.utcnow()
    _end = _naive_utc(res_in.end_time) if res_in.end_time else None

    # En abonos mensuales y flexibles, la fecha de fin se auto-calcula para cubrir la cantidad de días del abono
    if is_sub:
        _end = _start + timedelta(days=sub_days)
    else:
        # La estadía real se abre en check-in y se cierra en check-out. Los datos
        # de duración enviados por clientes antiguos se ignoran deliberadamente.
        _end = None

    plate_clean = res_in.license_plate.strip().upper()

    # =========================================================================
    # REGLAS DE NEGOCIO ANTI-SABOTAJE Y PROTECCIÓN DE INVENTARIO
    # =========================================================================
    if current_user.role not in ("local", "platform"):
        # Regla S-01: Política Multi-Vehículo Real (1 reserva activa por vehículo del usuario)
        if res_type == "standard":
            # 1. Consultar vehículos registrados del usuario en su garaje
            user_vehicles_res = await db.execute(
                select(Vehicle).where(Vehicle.user_id == current_user.id)
            )
            user_vehicles = user_vehicles_res.scalars().all()
            user_registered_plates = {
                v.license_plate.strip().upper() for v in user_vehicles if v.license_plate
            }

            # 2. Consultar las reservas activas actuales del usuario
            active_user_res_stmt = await db.execute(
                select(Reservation).where(
                    Reservation.user_id == current_user.id,
                    Reservation.status.in_(["scheduled", "active"]),
                    Reservation.reservation_type == "standard"
                )
            )
            active_user_reservations = active_user_res_stmt.scalars().all()
            active_plates_of_user = {
                r.license_plate.strip().upper() for r in active_user_reservations if r.license_plate
            }

            # 3. Validar si la placa específica que intenta reservar ya tiene una reserva activa
            if plate_clean in active_plates_of_user:
                raise HTTPException(
                    status_code=400,
                    detail=f"El vehículo con placa {plate_clean} ya cuenta con una reserva activa en curso. Puedes reservar con otro de tus vehículos disponibles."
                )

            # 4. Capacidad multi-vehículo:
            # Un usuario puede tener 1 reserva activa por cada vehículo registrado en su garaje (máx. 5 como cota de seguridad anti-sabotaje).
            max_allowed = max(1, min(len(user_registered_plates), 5))

            if len(active_user_reservations) >= max_allowed:
                if len(user_registered_plates) <= 1:
                    raise HTTPException(
                        status_code=400,
                        detail="Ya cuentas con una reserva activa en curso. Para reservar para múltiples autos simultáneamente, registra tus vehículos adicionales en tu Garaje Digital."
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Has alcanzado el límite de {max_allowed} reservas activas simultáneas (una por cada vehículo registrado en tu garaje). Completa o cancela alguna antes de solicitar otra."
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
        slot_stmt = (
            select(Slot)
            .where(
                Slot.parking_id == res_in.parking_id,
                Slot.status == "free",
                func.lower(Slot.slot_type).in_(compatible_slot_types(vtype)),
            )
            .order_by(Slot.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        compatible_res = await db.execute(slot_stmt)
        slot = compatible_res.scalars().first()

        # Garita puede recibir vehículos legacy sin clasificación fiable. En ese
        # flujo operativo se permite tomar otra plaza libre y se registra el tipo
        # real de la plaza. Los conductores nunca usan este fallback.
        if not slot and current_user.role in ("local", "platform"):
            fallback_res = await db.execute(
                select(Slot)
                .where(Slot.parking_id == res_in.parking_id, Slot.status == "free")
                .order_by(Slot.id)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            slot = fallback_res.scalars().first()

        if not slot:
            raise HTTPException(
                status_code=409,
                detail=f"No hay plazas libres disponibles compatibles con el tipo de vehículo {vtype}.",
            )

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

    # Validar si el establecimiento permite abonos / suscripciones
    if is_sub and getattr(parking, "subscription_enabled", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Este establecimiento tiene desactivada la modalidad de abonos y suscripciones."
        )

    # Verificar política de prepago obligatorio
    if getattr(parking, "require_reservation_prepay", False) and not getattr(res_in, "pay_now", False):
        raise HTTPException(
            status_code=400,
            detail="Este establecimiento exige el pago anticipado para confirmar la reserva de plaza."
        )

    # La unidad y las tarifas siempre provienen del establecimiento. El conductor
    # no decide la duración ni puede alterar las reglas configuradas por el admin.
    billing_unit = (getattr(parking, "billing_unit", "hour") or "hour").strip().lower()

    vtype = (getattr(res_in, "vehicle_type", None) or "auto").strip().lower()
    slot_kind = getattr(slot, "slot_type", None) or "auto"

    # La adaptación pertenece exclusivamente al flujo operativo de garita. Para
    # conductores, "auto" es un tipo real y no significa "inferir desde el cajón".
    if slot and slot.slot_type:
        if current_user.role in ("local", "platform"):
            vtype = slot_kind

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
        if start_is_night:
            is_night = True
            night_surcharge = float(parking.night_shift_surcharge or 0.0)

    reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0)

    if is_sub:
        monthly_rate = get_parking_monthly_rate(parking, vtype)
        daily_rate = monthly_rate / 30.0
        total_cost = round(daily_rate * sub_days, 2)
        billing_unit = "month" if sub_days == 30 else "subscription"
        estimated_hours = 24 * sub_days
        estimated_minutes = estimated_hours * 60
    else:
        # Antes del ingreso solo existe, si fue configurada, la tarifa de reserva.
        # El costo de estacionamiento se conoce al registrar la salida real.
        total_cost = round(reservation_fee, 2)
        estimated_hours = None
        estimated_minutes = None

    reservation_code = f"RSV-{uuid.uuid4().hex[:6].upper()}"
    tol_min = int(parking.tolerance_minutes if parking and parking.tolerance_minutes else 15)
    requires_prepay = bool(getattr(parking, "require_reservation_prepay", False) or is_sub)
    if requires_prepay and not is_sub and total_cost <= 0:
        # Si el admin exige prepago pero no configuró tarifa de reserva, se usa
        # una unidad mínima como garantía; se descuenta del total al salir.
        total_cost = round(
            get_parking_minute_rate(parking, vtype)
            if billing_unit == "minute"
            else get_parking_vehicle_rate(parking, vtype),
            2,
        )
    payment_status = "pending" if requires_prepay else "not_required"
    payment_deadline = datetime.utcnow() + timedelta(minutes=10) if requires_prepay else None

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
        prepaid=False,
        is_open_stay=not is_sub,
        payment_method=None,
        amount_paid=0.0,
        payment_status=payment_status,
        payment_deadline=payment_deadline,
        reservation_type=res_type,
        subscription_months=sub_months if is_sub else 1,
        is_subscription=is_sub,
        subscription_days=sub_days if is_sub else None,
        subscription_type=sub_type if is_sub else None
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
            "is_subscription": db_res.is_subscription,
            "subscription_days": getattr(db_res, "subscription_days", None),
            "subscription_type": getattr(db_res, "subscription_type", None)
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
        await realtime.broadcast("spaces:update", broadcast_payload)
    except Exception:
        pass
    await db.refresh(db_res)

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
    if reservation.status == "completed":
        raise HTTPException(status_code=400, detail="La estadía ya fue completada y no puede cancelarse")
    if reservation.status == "active":
        raise HTTPException(status_code=400, detail="No es posible cancelar una estadía en curso con el vehículo dentro de la cochera. La salida debe ser gestionada por el personal de garita registrando el check-out.")

    # Si es una reserva programada estándar y el tiempo de tolerancia de llegada ya expiró
    tol_min = int(getattr(reservation, "tolerance_minutes", 15) or 15)
    start_naive = reservation.start_time.replace(tzinfo=None) if reservation.start_time and reservation.start_time.tzinfo else reservation.start_time
    if start_naive:
        from datetime import timedelta
        deadline = start_naive + timedelta(minutes=tol_min)
        now_utc = datetime.utcnow()
        if now_utc > deadline and current_user.role not in ("local", "platform"):
            raise HTTPException(
                status_code=400,
                detail="El tiempo de tolerancia para presentarse en garita ha expirado. La reserva ha vencido por inasistencia (No-Show) y no puede ser cancelada por el conductor."
            )

    reservation.status = "cancelled"
    if getattr(reservation, "payment_status", "not_required") == "pending":
        reservation.payment_status = "cancelled"
    reservation.payment_deadline = None

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

    if not bool(getattr(reservation, "is_subscription", False)):
        raise HTTPException(
            status_code=409,
            detail="La estadía no tiene una duración prefijada. El personal registra el ingreso y la salida reales.",
        )

    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    rate = parking.hourly_rate if parking else 8.50

    from datetime import timedelta
    if reservation.end_time is None:
        raise HTTPException(status_code=409, detail="El abono no tiene una fecha de finalización válida")
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
    checkin_in: Optional[ReservationCheckIn] = None,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(gate_operator_required)
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

    if getattr(reservation, "payment_status", "not_required") == "pending":
        raise HTTPException(
            status_code=402,
            detail="El pago anticipado de esta reserva aún no ha sido confirmado."
        )

    now = datetime.utcnow()
    reservation.status = "active"
    reservation.actual_entry = now

    parking_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = parking_res.scalars().first()
    billing_unit = (getattr(reservation, "billing_unit", None) or (parking.billing_unit if parking else "hour") or "hour").strip().lower()
    requested_minutes = None
    if checkin_in:
        if getattr(checkin_in, "is_open_stay", None) is True:
            requested_minutes = None
        elif checkin_in.minutes_stay is not None:
            requested_minutes = int(checkin_in.minutes_stay)
        elif checkin_in.hours_stay is not None:
            requested_minutes = max(1, int(round(float(checkin_in.hours_stay) * 60)))

    if requested_minutes is not None:
        min_minutes = int(getattr(parking, "min_stay_minutes", 15) or 15) if billing_unit == "minute" else int(float(getattr(parking, "min_stay_hours", 1) or 1) * 60)
        max_minutes = int(getattr(parking, "max_stay_minutes", 1440) or 1440) if billing_unit == "minute" else int(float(getattr(parking, "max_stay_hours", 24) or 24) * 60)
        if requested_minutes < min_minutes or requested_minutes > max_minutes:
            raise HTTPException(
                status_code=422,
                detail=f"La permanencia registrada por garita debe estar entre {min_minutes} y {max_minutes} minutos según la configuración del establecimiento.",
            )
        reservation.end_time = now + timedelta(minutes=requested_minutes)
        reservation.estimated_minutes = requested_minutes
        reservation.estimated_hours = round(requested_minutes / 60.0, 2)
        reservation.is_open_stay = False

        reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0) if parking else 0.0
        night_surcharge = float(getattr(parking, "night_shift_surcharge", 0.0) or 0.0) if parking and reservation.is_night_shift else 0.0
        if billing_unit == "minute":
            rate = get_parking_minute_rate(parking, reservation.vehicle_type) if parking else 0.10
            reservation.total_cost = round(requested_minutes * (rate + (night_surcharge / 60.0)) + reservation_fee, 2)
        else:
            billed_hours = max(1, math.ceil(requested_minutes / 60.0))
            rate = get_parking_vehicle_rate(parking, reservation.vehicle_type) if parking else 5.0
            reservation.total_cost = round(billed_hours * (rate + night_surcharge) + reservation_fee, 2)
    else:
        if parking and getattr(parking, "allow_open_stay", True) is False:
            raise HTTPException(
                status_code=422,
                detail="El administrador desactivó la estadía libre. Garita debe registrar el tiempo de permanencia al ingreso.",
            )
        # La estadía libre solo se admite si el administrador la habilitó.
        reservation.end_time = None
        reservation.estimated_hours = None
        reservation.estimated_minutes = None
        reservation.is_open_stay = True

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
            "end_time": reservation.end_time.isoformat() if reservation.end_time else None,
            "is_open_stay": bool(reservation.is_open_stay)
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
    current_user: User = Depends(gate_operator_required)
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    await _check_reservation_access(reservation, current_user, db, action_label="editar la estadía de esta reserva")

    planned_minutes = int(getattr(reservation, "estimated_minutes", 0) or 0)
    if stay_in.hours_stay is not None:
        planned_minutes = max(1, int(round(float(stay_in.hours_stay) * 60)))
        parking = await db.get(Parking, reservation.parking_id)
        billing_unit = (getattr(reservation, "billing_unit", None) or (parking.billing_unit if parking else "hour") or "hour").strip().lower()
        min_minutes = int(getattr(parking, "min_stay_minutes", 15) or 15) if billing_unit == "minute" else int(float(getattr(parking, "min_stay_hours", 1) or 1) * 60)
        max_minutes = int(getattr(parking, "max_stay_minutes", 1440) or 1440) if billing_unit == "minute" else int(float(getattr(parking, "max_stay_hours", 24) or 24) * 60)
        if planned_minutes < min_minutes or planned_minutes > max_minutes:
            raise HTTPException(status_code=422, detail=f"La permanencia debe estar entre {min_minutes} y {max_minutes} minutos")
        reservation.estimated_minutes = planned_minutes
        reservation.estimated_hours = round(planned_minutes / 60.0, 2)
        reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0) if parking else 0.0
        night_surcharge = float(getattr(parking, "night_shift_surcharge", 0.0) or 0.0) if parking and reservation.is_night_shift else 0.0
        if billing_unit == "minute":
            rate = get_parking_minute_rate(parking, reservation.vehicle_type) if parking else 0.10
            reservation.total_cost = round(planned_minutes * (rate + (night_surcharge / 60.0)) + reservation_fee, 2)
        else:
            billed_hours = max(1, math.ceil(planned_minutes / 60.0))
            rate = get_parking_vehicle_rate(parking, reservation.vehicle_type) if parking else 5.0
            reservation.total_cost = round(billed_hours * (rate + night_surcharge) + reservation_fee, 2)

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

    # 3. Si garita registró una permanencia, conservarla al corregir la entrada.
    # En estadía libre no se inventa una salida.
    if planned_minutes > 0 and reservation.actual_entry:
        reservation.end_time = reservation.actual_entry + timedelta(minutes=planned_minutes)
        reservation.is_open_stay = False
    else:
        reservation.end_time = None
        reservation.estimated_hours = None
        reservation.estimated_minutes = None
        reservation.is_open_stay = True

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
    current_user: User = Depends(gate_operator_required)
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
    reservation.end_time = now

    # Calcular siempre el total a partir del tiempo real; el monto que envía la
    # garita confirma un cobro, nunca define el precio de la estadía.
    p_res = await db.execute(select(Parking).where(Parking.id == reservation.parking_id))
    parking = p_res.scalars().first()
    vtype = getattr(reservation, "vehicle_type", "auto")
    billing_unit = (getattr(reservation, "billing_unit", None) or (parking.billing_unit if parking else "hour") or "hour").strip().lower()
    night_surcharge = 0.0
    if parking and getattr(parking, "night_shift_enabled", False):
        if getattr(reservation, "is_night_shift", False) or _is_time_in_night_shift(now, parking.night_shift_start or "20:00", parking.night_shift_end or "06:00"):
            night_surcharge = float(parking.night_shift_surcharge or 0.0)

    entry_time = reservation.actual_entry or now
    diff_seconds = max(0.0, (now - entry_time).total_seconds())
    planned_minutes = int(getattr(reservation, "estimated_minutes", 0) or 0)
    if planned_minutes > 0:
        # La permanencia registrada por garita es el mínimo facturable; si el
        # vehículo se excede, prevalece el tiempo real.
        diff_seconds = max(diff_seconds, planned_minutes * 60.0)
    reservation_fee = float(getattr(parking, "reservation_fee", 0.0) or 0.0) if parking else 0.0
    if billing_unit == "minute":
        diff_minutes = max(1, math.ceil(diff_seconds / 60.0))
        minute_rate = get_parking_minute_rate(parking, vtype) if parking else 0.10
        calculated_cost = round(
            (diff_minutes * (minute_rate + (night_surcharge / 60.0 if night_surcharge else 0.0)))
            + reservation_fee,
            2,
        )
    else:
        billed_hours = max(1, math.ceil(diff_seconds / 3600.0))
        vehicle_rate = get_parking_vehicle_rate(parking, vtype) if parking else 5.0
        calculated_cost = round((billed_hours * (vehicle_rate + night_surcharge)) + reservation_fee, 2)

    reservation.total_cost = calculated_cost
    already_paid = round(float(reservation.amount_paid or 0.0), 2)
    outstanding = max(0.0, round(calculated_cost - already_paid, 2))

    if checkout_in and checkout_in.amount_paid is not None:
        confirmed_total = round(float(checkout_in.amount_paid), 2)
        if abs(confirmed_total - calculated_cost) > 0.02:
            raise HTTPException(
                status_code=422,
                detail=f"El pago confirmado debe coincidir con el total calculado: S/ {calculated_cost:.2f}",
            )
        method = (checkout_in.payment_method or "efectivo").strip().lower()
        collected_now = max(0.0, round(confirmed_total - already_paid, 2))
        if collected_now > 0:
            db.add(Payment(
                reservation_id=reservation.id,
                user_id=reservation.user_id,
                amount_cents=int(round(collected_now * 100)),
                currency="PEN",
                status="succeeded",
                method=method,
                description=f"Cobro en salida de la reserva {reservation.code}",
            ))
        reservation.amount_paid = confirmed_total
        reservation.payment_method = method
        reservation.payment_status = "paid"
        reservation.prepaid = already_paid > 0
    elif outstanding > 0:
        # La salida puede registrarse para liberar físicamente la plaza, pero no
        # se inventa un pago que el trabajador todavía no confirmó.
        reservation.payment_status = "pending"
        reservation.payment_method = None

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

@router.post("/{reservation_id}/pay-overtime", response_model=ReservationResponse)
async def pay_overtime(
    reservation_id: int,
    body: ReservationOvertimePayment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite al conductor liquidar de forma inmediata el recargo acumulado por tiempo excedido (sobreestadía)."""
    stmt = (
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.parking),
            selectinload(Reservation.slot)
        )
        .where(Reservation.id == reservation_id)
    )
    result = await db.execute(stmt)
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    await _check_reservation_access(reservation, current_user, db, action_label="pagar sobreestadía en esta reserva")

    if reservation.status not in ("active", "completed"):
        raise HTTPException(status_code=400, detail="Solo es posible liquidar sobreestadía de una estadía activa o en liquidación final.")

    amount_to_pay = round(float(body.amount), 2)
    if amount_to_pay <= 0:
        raise HTTPException(status_code=400, detail="El monto de sobreestadía debe ser mayor a 0.")

    method = (body.payment_method or "card").strip().lower()
    if method in ("efectivo", "cash"): method = "cash"
    elif method in ("yape",): method = "yape"
    elif method in ("plin",): method = "plin"
    elif method in ("paypal",): method = "paypal"
    else: method = "card"

    payment = Payment(
        reservation_id=reservation.id,
        user_id=current_user.id,
        amount_cents=int(round(amount_to_pay * 100)),
        currency="PEN",
        status="succeeded",
        method=method,
        description=f"Pago sobreestadía reserva {reservation.code}" + (f": {body.notes}" if body.notes else "")
    )
    db.add(payment)

    reservation.amount_paid = round((reservation.amount_paid or 0.0) + amount_to_pay, 2)
    if reservation.amount_paid > (reservation.total_cost or 0.0):
        reservation.total_cost = reservation.amount_paid
    reservation.payment_method = method
    reservation.prepaid = True

    await db.commit()
    refetched = await db.execute(stmt)
    reservation = refetched.scalars().first()

    try:
        broadcast_payload = {
            "parking_id": reservation.parking_id,
            "slot_id": reservation.slot_id,
            "reservation_id": reservation.id,
            "code": reservation.code,
            "amount_paid": reservation.amount_paid,
            "total_cost": reservation.total_cost,
            "status": reservation.status,
            "payment_method": method,
            "is_overtime": getattr(reservation, "is_overtime", False),
            "message": f"Sobreestadía de S/ {amount_to_pay:.2f} liquidada para {reservation.license_plate}."
        }
        await realtime.broadcast("reservations:updated", broadcast_payload)
    except Exception:
        pass

    return _format_reservation_response(reservation)

@router.delete("/{reservation_id}", status_code=status.HTTP_200_OK)
async def delete_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")

    if reservation.status == "active":
        raise HTTPException(status_code=400, detail="No es posible eliminar una reserva activa con el vehículo dentro del estacionamiento.")

    # Verificar si tiene pagos asociados
    pay_res = await db.execute(select(Payment.id).where(Payment.reservation_id == reservation.id, Payment.status == "succeeded"))
    if pay_res.scalars().first() is not None:
        raise HTTPException(status_code=400, detail="No es posible eliminar una reserva que cuenta con transacciones de pago registradas por motivos contables y de auditoría.")

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
