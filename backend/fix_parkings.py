import re

with open(r'D:\Escritorio\smart park\smart-park\backend\app\api\v1\parkings.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact function
idx = content.find('async def sync_floor_plan')
if idx < 0:
    print('NOT FOUND')
    exit(1)

next_func = content.find('async def ', idx + 20)
if next_func == -1:
    next_func = len(content)
old_func = content[idx:next_func]

new_func = '''async def sync_floor_plan(parking_id: int, sync_in: FloorPlanSyncRequest, db: AsyncSession = Depends(get_db), current_user = Depends(write_required)):
    from sqlalchemy import delete
    # Validar parking_id coincide
    if sync_in.parking_id and sync_in.parking_id != parking_id:
        raise HTTPException(status_code=422, detail="parking_id en body no coincide con path")
    # Validar unicidad de códigos en el payload
    incoming_codes = [s.code for s in sync_in.slots]
    if len(incoming_codes) != len(set(incoming_codes)):
        raise HTTPException(status_code=422, detail="Códigos de cajones duplicados en el payload")
    
    async with db.begin():
        from sqlalchemy import delete
        # Cajones con reserva ACTIVA (scheduled/active) NO se pueden borrar ni cambiar estado
        existing_slots_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
        existing_slots = existing_slots_res.scalars().all()
        # Slots con reserva ACTIVA (scheduled/active) = protegidos
        slot_ids = [s.id for s in existing_slots]
        protected_slot_ids = set()
        if slot_ids:
            res = await db.execute(select(Reservation.slot_id).where(
                Reservation.slot_id.in_(slot_ids),
                Reservation.status.in_(["scheduled", "active"])
            ))
            protected_slot_ids = {row[0] for row in res.all()}

        await db.execute(delete(FloorPlanElement).where(FloorPlanElement.parking_id == parking_id))
        # Borrar solo cajones huérfanos (sin reservas activas) cuyo código ya no viene
        incoming_codes = {s.code for s in sync_in.slots}
        for slot in existing_slots:
            if slot.id not in protected_slot_ids and slot.code not in incoming_codes:
                await db.execute(delete(Slot).where(Slot.id == slot.id))
        # Upsert por código: actualizar existentes (incluidos los protegidos, solo geometría), crear nuevos
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
                # NO pisar estado si tiene reserva activa (protected)
                if existing.id not in protected_slot_ids:
                    existing.status = s.status or "free"
            else:
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
        # commit ocurre en db.begin() context manager
    
    await invalidate_parkings_cache()
    await realtime.broadcast("parkings:updated", {"parking_id": parking_id})
    # Contar total actual y sincronizar contadores Redis
    final_res = await db.execute(select(Slot).where(Slot.parking_id == parking_id))
    all_slots = final_res.scalars().all()
    total = len(all_slots)
    free_c = sum(1 for s in all_slots if s.status == "free")
    occ_c = sum(1 for s in all_slots if s.status == "occupied")
    try:
        from app.core.cache import occ_set
        await occ_set(parking_id, free_c, occ_c, total)
    except Exception:
        pass
    return {
        "status": "success",
        "message": f"Plano CAD del estacionamiento {parking_id} sincronizado exitosamente",
        "slots_count": total,
        "elements_count": len(new_elems)
    }'''

# Replace
old_start = content.find('async def sync_floor_plan')
old_end = content.find('async def ', old_start + 20)
if old_end == -1:
    old_end = len(content)

new_content = content[:old_start] + new_func + content[old_start + len(old_func):]

with open(r'D:\Escritorio\smart park\smart-park\backend\app\api\v1\parkings.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done - Replaced function successfully')