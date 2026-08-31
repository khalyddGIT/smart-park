"""Settings and Broadcasts API for Platform Super Admin.

Persists global platform configuration (commissions, grace period, maintenance mode, payment gateways)
and broadcast announcements directly into PostgreSQL table `configuracion_plataforma`.
"""
import json
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import PlatformSettings, User
from app.core.security import require_role

router = APIRouter(prefix="/settings", tags=["Ajustes Plataforma"])

platform_required = require_role("platform")

DEFAULT_SETTINGS = {
    "defaultCommission": 12,
    "gracePeriodMinutes": 15,
    "minHourlyRate": 3.00,
    "maxHourlyRate": 15.00,
    "maintenanceMode": False,
    "maintenanceMessage": "Smart-Park está realizando una breve actualización programada de servidores. Volvemos en unos minutos.",
    "paymentGateways": {
        "culqi": True,
        "yape": True,
        "plin": True,
        "cards": True,
        "environment": "sandbox"
    },
    "security": {
        "qrExpirationMinutes": 30,
        "maxPinAttempts": 5,
        "requireLprConfirmation": True
    },
    "broadcasts": [
        {
            "id": "BRD-001",
            "title": "Descuento del 20% en Cocheras del Centro",
            "target": "CONDUCTORES",
            "channel": "Push App & Notificación Instantánea",
            "message": "Aprovecha este fin de semana para aparcar en Plaza Mayor y Jr. 28 de Julio con 20% de descuento usando Smart Wallet.",
            "sentAt": "2026-08-16 09:00",
            "sentCount": 1420
        },
        {
            "id": "BRD-002",
            "title": "Mantenimiento de Servidores LPR & ANPR",
            "target": "COCHERAS",
            "channel": "Panel Garita & Correo",
            "message": "Estimados administradores: este domingo a las 02:00 AM se realizará actualización de firmware en las cámaras de garita.",
            "sentAt": "2026-08-14 18:30",
            "sentCount": 6
        }
    ]
}


async def _get_or_create_platform_data(db: AsyncSession) -> tuple[PlatformSettings, dict]:
    res = await db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
    row = res.scalars().first()
    if not row:
        initial = {"settings": DEFAULT_SETTINGS, "broadcasts": DEFAULT_SETTINGS.get("broadcasts", [])}
        row = PlatformSettings(id=1, data=json.dumps(initial, ensure_ascii=False))
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row, initial

    try:
        data = json.loads(row.data)
        if not isinstance(data, dict):
            data = {"settings": DEFAULT_SETTINGS, "broadcasts": DEFAULT_SETTINGS.get("broadcasts", [])}
    except Exception:
        data = {"settings": DEFAULT_SETTINGS, "broadcasts": DEFAULT_SETTINGS.get("broadcasts", [])}

    return row, data


@router.get("", response_model=Dict[str, Any])
async def get_settings(db: AsyncSession = Depends(get_db)):
    _, data = await _get_or_create_platform_data(db)
    return data.get("settings", DEFAULT_SETTINGS)


@router.put("", response_model=Dict[str, Any])
async def update_settings(
    new_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    row, data = await _get_or_create_platform_data(db)
    data["settings"] = {**DEFAULT_SETTINGS, **data.get("settings", {}), **new_data}
    row.data = json.dumps(data, ensure_ascii=False)
    await db.commit()
    await db.refresh(row)
    return data["settings"]


@router.get("/broadcasts", response_model=List[Dict[str, Any]])
async def get_broadcasts(db: AsyncSession = Depends(get_db)):
    _, data = await _get_or_create_platform_data(db)
    return data.get("broadcasts", [])


@router.post("/broadcasts", response_model=List[Dict[str, Any]], status_code=201)
async def create_broadcast(
    broadcast: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    row, data = await _get_or_create_platform_data(db)
    broadcasts = data.get("broadcasts", [])
    if not isinstance(broadcasts, list):
        broadcasts = []
    
    broadcasts.insert(0, broadcast)
    data["broadcasts"] = broadcasts[:50]
    row.data = json.dumps(data, ensure_ascii=False)
    await db.commit()
    await db.refresh(row)
    return broadcasts
