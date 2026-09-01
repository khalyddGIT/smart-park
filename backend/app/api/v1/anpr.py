from datetime import datetime
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Slot
from app.schemas.schemas import ANPRScanRequest
from app.core.security import require_role
from app.core.realtime import realtime

router = APIRouter(prefix="/anpr", tags=["Control de Garita"])

# La barrera solo puede ser operada por personal autorizado de garita
gate_required = require_role("local", "platform")

def normalize_peruvian_plate(plate: str) -> str:
    """Normaliza placas vehiculares peruanas (ABC-123, 1234-AB)."""
    if not plate:
        return ""
    clean = re.sub(r'[^A-Z0-9]', '', plate.strip().upper())
    if len(clean) == 6:
        # 3 letras + 3 dígitos (ej. ABC-123)
        if clean[:3].isalpha() and clean[3:].isalnum():
            return f"{clean[:3]}-{clean[3:]}"
        # 4 dígitos + 2 letras (motos)
        if clean[:4].isdigit() and clean[4:].isalpha():
            return f"{clean[:4]}-{clean[4:]}"
    return clean

@router.post("/simulate-scan")
async def simulate_anpr_scan(
    scan: ANPRScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(gate_required)
):
    raw_plate = scan.license_plate.strip().upper()
    norm_plate = normalize_peruvian_plate(raw_plate)
    clean_plate = re.sub(r'[^A-Z0-9]', '', raw_plate)

    # Buscar reserva para esa placa en este parqueo (coincidencia flexible Perú)
    stmt = select(Reservation).where(
        Reservation.parking_id == scan.parking_id,
        (
            Reservation.license_plate.ilike(raw_plate) |
            Reservation.license_plate.ilike(norm_plate) |
            Reservation.license_plate.ilike(clean_plate)
        )
    ).order_by(Reservation.id.desc())

    res_result = await db.execute(stmt)
    reservation = res_result.scalars().first()

    if reservation:
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

            # Telemetría WebSocket en tiempo real
            slot_code = slot.code if slot else "Plaza General"
            await realtime.broadcast("anpr:detection", {
                "parking_id": scan.parking_id,
                "license_plate": norm_plate or raw_plate,
                "gate_type": "entry",
                "gate_action": "OPEN_BARRIER",
                "slot_code": slot_code,
                "reservation_code": reservation.code,
                "timestamp": datetime.utcnow().isoformat()
            })
            await realtime.broadcast("spaces:update", {
                "parking_id": scan.parking_id,
                "slot_code": slot_code,
                "status": "occupied"
            })
            await realtime.broadcast("parkings:updated", {"parking_id": scan.parking_id})

            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": norm_plate or raw_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {norm_plate or raw_plate} validado. Abriendo barrera de entrada al cajón {slot_code}."
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

            # Telemetría WebSocket en tiempo real
            slot_code = slot.code if slot else "Plaza General"
            await realtime.broadcast("anpr:detection", {
                "parking_id": scan.parking_id,
                "license_plate": norm_plate or raw_plate,
                "gate_type": "exit",
                "gate_action": "OPEN_BARRIER",
                "slot_code": slot_code,
                "reservation_code": reservation.code,
                "timestamp": datetime.utcnow().isoformat()
            })
            await realtime.broadcast("spaces:update", {
                "parking_id": scan.parking_id,
                "slot_code": slot_code,
                "status": "free"
            })
            await realtime.broadcast("parkings:updated", {"parking_id": scan.parking_id})

            return {
                "matched": True,
                "reservation_code": reservation.code,
                "license_plate": norm_plate or raw_plate,
                "gate_action": "OPEN_BARRIER",
                "message": f"Vehículo {norm_plate or raw_plate} ha completado la estancia. Abriendo barrera de salida."
            }

    # Registro de evento no reconocido
    await realtime.broadcast("anpr:detection", {
        "parking_id": scan.parking_id,
        "license_plate": norm_plate or raw_plate,
        "gate_type": scan.gate_type,
        "gate_action": "MANUAL_TICKET_REQUIRED",
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "matched": False,
        "license_plate": norm_plate or raw_plate,
        "gate_action": "MANUAL_TICKET_REQUIRED",
        "message": f"Placa {norm_plate or raw_plate} no cuenta con reserva programada. Emitiendo ticket manual en garita."
    }
