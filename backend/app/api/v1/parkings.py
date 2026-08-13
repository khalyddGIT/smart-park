from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Parking, Slot, FloorPlanElement
from app.schemas.schemas import ParkingResponse, SlotResponse, FloorPlanElementResponse

router = APIRouter(prefix="/parkings", tags=["Estacionamientos & Planos"])

@router.get("", response_model=List[ParkingResponse])
async def list_parkings(
    query: Optional[str] = None,
    city: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Parking)
    if query:
        stmt = stmt.where(Parking.name.ilike(f"%{query}%") | Parking.address.ilike(f"%{query}%"))
    if city:
        stmt = stmt.where(Parking.city.ilike(f"%{city}%"))
    
    result = await db.execute(stmt)
    parkings = result.scalars().all()

    response = []
    for p in parkings:
        # Calcular plazas libres
        slots_stmt = select(Slot).where(Slot.parking_id == p.id, Slot.status == "free")
        free_slots_res = await db.execute(slots_stmt)
        free_count = len(free_slots_res.scalars().all())
        
        p_dict = ParkingResponse.model_validate(p)
        p_dict.available_slots = free_count
        response.append(p_dict)

    return response

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
        "slots": [SlotResponse.model_validate(s) for s in slots],
        "elements": [FloorPlanElementResponse.model_validate(e) for e in elements]
    }
