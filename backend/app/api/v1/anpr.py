from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot
from app.schemas.schemas import ANPRScanRequest
from app.core.security import require_role

router = APIRouter(prefix="/anpr", tags=["Simulación ANPR & Control de Garita"])

# La barrera física solo puede ser operada por personal autorizado de garita
gate_required = require_role("local", "platform")

@router.post("/simulate-scan")
async def simulate_anpr_scan(
    scan: ANPRScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(gate_required)
):
    # Buscar reserva activa para esa placa en este parqueo
    stmt = select(Reservation).where(
        Reservation.parking_id == scan.parking_id,
        Reservation.license_plate.ilike(scan.license_plate)
    ).order_by(Reservation.id.desc())

    res_result = await db.execute(stmt)
    reservation = res_result.scalars().first()

    if reservation:
        # Cotejo exitoso
        slot_res = await db.execute(select(Slot).where(Slot.id == reservation.slot_id))
        slot = slot_res.scalars().first()

        if scan.gate_type == "entry":
            reservation.status = "active"
            reservation.actual_entry = datetime.utcnow()
            if slot:
                slot.status = "occupied"
            await db.commit()
            try:
                from app.core.cache import occ_incr, cache_delete
                await occ_incr(scan.parking_id, free_delta=-1, occupied_delta=1)
                await cache_delete("parkings:all", "finances:summary")
            except Exception:
                pass
            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": scan.license_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {scan.license_plate} validado. Abriendo barrera de entrada al cajón {slot.code if slot else ''}."
            }
        else:
            reservation.status = "completed"
            reservation.actual_exit = datetime.utcnow()
            if slot:
                slot.status = "free"
            await db.commit()
            try:
                from app.core.cache import occ_incr, cache_delete
                await occ_incr(scan.parking_id, free_delta=1, occupied_delta=-1)
                await cache_delete("parkings:all", "finances:summary")
            except Exception:
                pass
            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": scan.license_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {scan.license_plate} ha completado la estancia. Abriendo barrera de salida."
            }

    # Si no tiene reserva previa
    return {
        "matched": False,
        "license_plate": scan.license_plate,
        "gate_action": "MANUAL_TICKET_REQUIRED",
        "message": f"Placa {scan.license_plate} no cuenta con reserva programada. Emitiendo ticket manual en garita."
    }
