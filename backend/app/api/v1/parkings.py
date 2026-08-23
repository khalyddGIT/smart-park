from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Parking, Slot, FloorPlanElement
from app.schemas.schemas import (
    ParkingCreate, ParkingUpdate, ParkingResponse,
    SlotBase, SlotCreate, SlotUpdate, SlotResponse,
    FloorPlanElementBase, FloorPlanElementCreate, FloorPlanElementResponse, FloorPlanSyncRequest
)
from app.core.security import require_role


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
        
        p_dict = ParkingResponse.model_validate(p)
        p_dict.available_slots = free_count
        response.append(p_dict)

    return response

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
    return ParkingResponse.model_validate(parking)

@router.delete("/{parking_id}", status_code=status.HTTP_200_OK)
async def delete_parking(parking_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    result = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = result.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    
    await db.delete(parking)
    await db.commit()
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
    # Cajones con CUALQUIER reserva histórica no pueden eliminarse (FK); solo se actualizan
    existing_slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    existing_slots = existing_slots_res.scalars().all()
    # IDs de cajones que tienen al menos una reserva (cualquier estado)
    reserved_slot_ids = set()
    if existing_slots:
        slot_ids = [s.id for s in existing_slots]
        res = await db.execute(select(Reservation.slot_id).where(Reservation.slot_id.in_(slot_ids)))
        reserved_slot_ids = {row[0] for row in res.all()}

    await db.execute(delete(FloorPlanElement).where(FloorPlanElement.parking_id == parking_id))
    # Borrar solo cajones huérfanos (sin reservas) cuyo código ya no viene en el nuevo plano
    incoming_codes = {s.code for s in sync_in.slots}
    for slot in existing_slots:
        if slot.id not in reserved_slot_ids and slot.code not in incoming_codes:
            await db.execute(delete(Slot).where(Slot.id == slot.id))
    # Upsert por código: actualizar existentes (incluidos los reservados, solo geometría), crear nuevos
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
            # No pisar estado occupied/reserved (tiene reserva activa)
            if existing.status not in ("occupied", "reserved"):
                existing.status = s.status or "free"
        else:
            # Nuevo cajón: verificar que el código no colisione con uno reservado que fue preservado
            if s.code not in existing_by_code:
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
    await db.commit()
    # Contar total actual
    final_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    total = len(final_res.scalars().all())
    return {
        "status": "success",
        "message": f"Plano CAD del estacionamiento {parking_id} sincronizado exitosamente",
        "slots_count": total,
        "elements_count": len(new_elems)
    }
