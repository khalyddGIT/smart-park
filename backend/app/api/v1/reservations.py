from datetime import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot, Parking
from app.schemas.schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from app.core.security import get_current_user, require_role
from app.models.models import User

# Operador de garita autorizado para registrar entradas/salidas físicas
gate_operator_required = require_role("local", "platform")

router = APIRouter(prefix="/reservations", tags=["Reservas & Pases QR"])

@router.get("", response_model=List[ReservationResponse])
async def list_reservations(
    parking_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Solo reservas del usuario autenticado - aislamiento por usuario
    stmt = select(Reservation).where(Reservation.user_id == current_user.id).order_by(Reservation.id.desc())
    if parking_id:
        stmt = stmt.where(Reservation.parking_id == parking_id)
    if status_filter:
        stmt = stmt.where(Reservation.status == status_filter)
    
    result = await db.execute(stmt)
    reservations = result.scalars().all()
    return [ReservationResponse.model_validate(r) for r in reservations]

@router.get("/my-reservations", response_model=List[ReservationResponse])
async def get_my_reservations(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.user_id == current_user.id).order_by(Reservation.id.desc()))
    reservations = result.scalars().all()
    return [ReservationResponse.model_validate(r) for r in reservations]

@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    # IDOR: solo el dueño de la reserva o un administrador puede consultarla
    if reservation.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")
    return ReservationResponse.model_validate(reservation)

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    res_in: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verificar cajón
    slot_res = await db.execute(select(Slot).where(Slot.id == res_in.slot_id))
    slot = slot_res.scalars().first()
    if not slot or slot.status != "free":
        raise HTTPException(status_code=400, detail="El cajón seleccionado no se encuentra libre")

    # Verificar local y calcular costo
    parking_res = await db.execute(select(Parking).where(Parking.id == res_in.parking_id))
    parking = parking_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    # Duración en horas
    duration = max(1.0, (res_in.end_time - res_in.start_time).total_seconds() / 3600.0)
    total_cost = round(duration * parking.hourly_rate, 2)
    reservation_code = f"RSV-{uuid.uuid4().hex[:6].upper()}"

    db_res = Reservation(
        code=reservation_code,
        user_id=current_user.id,
        parking_id=res_in.parking_id,
        slot_id=res_in.slot_id,
        license_plate=res_in.license_plate.strip().upper(),
        start_time=res_in.start_time,
        end_time=res_in.end_time,
        total_cost=total_cost,
        status="scheduled",
        qr_code=f"SMARTPARK-{reservation_code}-{res_in.license_plate.strip().upper()}"
    )

    slot.status = "reserved"

    db.add(db_res)
    await db.commit()
    await db.refresh(db_res)

    return ReservationResponse.model_validate(db_res)

@router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
async def cancel_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")
    
    if reservation.status == "cancelled":
        raise HTTPException(status_code=400, detail="La reserva ya ha sido cancelada")

    reservation.status = "cancelled"

    # Liberar cajón asociado si sigue reservado
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot and slot.status == "reserved":
        slot.status = "free"

    await db.commit()
    await db.refresh(reservation)
    return ReservationResponse.model_validate(reservation)

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
    await db.refresh(reservation)
    return ReservationResponse.model_validate(reservation)

@router.put("/{reservation_id}/check-in", response_model=ReservationResponse)
async def check_in_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(gate_operator_required)):
    # Check-in de garita: registra el ingreso físico del vehículo (solo operadores)
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Transición válida: solo una reserva programada puede pasar a activa
    if reservation.status != "scheduled":
        raise HTTPException(status_code=400, detail=f"Solo se puede hacer check-in de reservas programadas (estado actual: {reservation.status})")

    reservation.status = "active"
    reservation.actual_entry = datetime.utcnow()

    # El cajón pasa a ocupado mientras dure la estancia
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot:
        slot.status = "occupied"

    await db.commit()
    await db.refresh(reservation)
    return ReservationResponse.model_validate(reservation)

@router.put("/{reservation_id}/check-out", response_model=ReservationResponse)
async def check_out_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(gate_operator_required)):
    # Check-out de garita: registra la salida física y cierra la estancia
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

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
    await db.refresh(reservation)
    return ReservationResponse.model_validate(reservation)

@router.delete("/{reservation_id}", status_code=status.HTTP_200_OK)
async def delete_reservation(reservation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para esta reserva")

    # Si estaba activa o programada, liberar el cajón
    slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
    slot = slot_res.scalars().first()
    if slot and slot.status in ["reserved", "occupied"]:
        slot.status = "free"

    await db.delete(reservation)
    await db.commit()
    return {"status": "success", "message": f"Reserva {reservation_id} eliminada exitosamente"}
