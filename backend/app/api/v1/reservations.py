from datetime import datetime
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot, Parking
from app.schemas.schemas import ReservationCreate, ReservationResponse

router = APIRouter(prefix="/reservations", tags=["Reservas & Pases QR"])

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    res_in: ReservationCreate,
    user_id: int = 1, # ID mock o extraído de JWT
    db: AsyncSession = Depends(get_db)
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
        user_id=user_id,
        parking_id=res_in.parking_id,
        slot_id=res_in.slot_id,
        license_plate=res_in.license_plate,
        start_time=res_in.start_time,
        end_time=res_in.end_time,
        total_cost=total_cost,
        status="scheduled",
        qr_code=f"SMARTPARK-{reservation_code}-{res_in.license_plate}"
    )

    # Marcar cajón como reservado
    slot.status = "reserved"

    db.add(db_res)
    await db.commit()
    await db.refresh(db_res)

    # Publicación de evento asíncrono ReservaCreada al Broker RabbitMQ
    from app.core.broker import message_broker
    message_broker.publish_event("ReservaCreada", {
        "code": db_res.code,
        "license_plate": db_res.license_plate,
        "total_cost": db_res.total_cost,
        "qr_code": db_res.qr_code
    })

    return ReservationResponse.model_validate(db_res)

@router.get("/my-reservations", response_model=List[ReservationResponse])
async def get_my_reservations(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation).where(Reservation.user_id == user_id).order_by(Reservation.id.desc()))
    reservations = result.scalars().all()
    return [ReservationResponse.model_validate(r) for r in reservations]
