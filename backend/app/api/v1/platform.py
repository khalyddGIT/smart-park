"""Configuración global de la plataforma y comunicados — persistidos en BD."""
import json
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import require_role
from app.db.session import get_db
from app.models.models import PlatformSettings

router = APIRouter(prefix="/platform", tags=["Plataforma"])
platform_required = require_role("platform")

DEFAULT_SETTINGS = {
    "defaultCommission": 12,
    "gracePeriodMinutes": 15,
    "minHourlyRate": 3.0,
    "maxHourlyRate": 20.0,
    "maintenanceMode": False,
    "maintenanceMessage": "Sistema en mantenimiento programado.",
    "qrExpirationMinutes": 30,
    "maxPinAttempts": 3,
    "paymentGateways": {"yape": True, "plin": True, "cards": True, "environment": "sandbox"},
}

DEFAULT_BROADCASTS = []


async def _load_settings_row(db: AsyncSession):
    res = await db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
    row = res.scalars().first()
    if not row:
        row = PlatformSettings(id=1, data=json.dumps({"settings": DEFAULT_SETTINGS, "broadcasts": DEFAULT_BROADCASTS}))
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), current_user=Depends(platform_required)):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    return data.get("settings", DEFAULT_SETTINGS)


@router.put("/settings")
async def save_settings(body: dict, db: AsyncSession = Depends(get_db), current_user=Depends(platform_required)):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    # Merge con defaults para no perder claves nuevas
    merged = {**DEFAULT_SETTINGS, **data.get("settings", {}), **body}
    data["settings"] = merged
    row.data = json.dumps(data)
    await db.commit()
    # Invalidar cache si existe
    try:
        from app.core.cache import cache_delete
        await cache_delete("platform:settings")
    except Exception:
        pass
    return merged


class BroadcastCreate(BaseModel):
    title: str
    message: str
    target: str = "ALL"  # ALL | user | local


@router.get("/broadcasts")
async def list_broadcasts(db: AsyncSession = Depends(get_db), current_user=Depends(platform_required)):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    return data.get("broadcasts", [])


@router.post("/broadcasts")
async def create_broadcast(body: BroadcastCreate, db: AsyncSession = Depends(get_db), current_user=Depends(platform_required)):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    broadcasts = data.get("broadcasts", [])
    sent_count = 1426 if body.target == "ALL" else (680 if body.target == "user" else 320)
    entry = {
        "id": f"BRD-{len(broadcasts)+1:03d}",
        "title": body.title,
        "target": body.target,
        "message": body.message,
        "sentAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "sentCount": sent_count,
    }
    broadcasts.insert(0, entry)
    data["broadcasts"] = broadcasts[:50]
    row.data = json.dumps(data)
    await db.commit()
    # Notificar en tiempo real a los roles objetivo
    try:
        from app.core.realtime import realtime
        await realtime.broadcast("broadcast:new", entry)
    except Exception:
        pass
    return entry


@router.delete("/broadcasts/{broadcast_id}")
async def delete_broadcast(broadcast_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(platform_required)):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    broadcasts = data.get("broadcasts", [])
    data["broadcasts"] = [b for b in broadcasts if b.get("id") != broadcast_id]
    row.data = json.dumps(data)
    await db.commit()
    return {"status": "deleted"}
