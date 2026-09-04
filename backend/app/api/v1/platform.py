"""Configuración global de la plataforma y comunicados — persistidos en BD."""
import json
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import require_role
from app.db.session import get_db
from app.models.models import PlatformSettings
from app.core.audit_service import record_audit_event

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
async def save_settings(
    body: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(platform_required)
):
    row = await _load_settings_row(db)
    data = json.loads(row.data) if row.data else {}
    prev_settings = data.get("settings", DEFAULT_SETTINGS)
    # Merge con defaults para no perder claves nuevas
    merged = {**DEFAULT_SETTINGS, **prev_settings, **body}
    data["settings"] = merged
    row.data = json.dumps(data)
    await db.commit()

    # Auditoría de cambios críticos
    changes = []
    if prev_settings.get("defaultCommission") != merged.get("defaultCommission"):
        changes.append(f"Comisión: {prev_settings.get('defaultCommission')}% → {merged.get('defaultCommission')}%")
    if prev_settings.get("gracePeriodMinutes") != merged.get("gracePeriodMinutes"):
        changes.append(f"Tiempo de Gracia: {prev_settings.get('gracePeriodMinutes')}m → {merged.get('gracePeriodMinutes')}m")
    if prev_settings.get("minHourlyRate") != merged.get("minHourlyRate") or prev_settings.get("maxHourlyRate") != merged.get("maxHourlyRate"):
        changes.append(f"Tarifas: S/{prev_settings.get('minHourlyRate')}-S/{prev_settings.get('maxHourlyRate')} → S/{merged.get('minHourlyRate')}-S/{merged.get('maxHourlyRate')}")
    
    if changes:
        await record_audit_event(
            db=db,
            action="Modificación de Ajustes Maestros",
            target=" | ".join(changes),
            user_id=current_user.id,
            user_email=current_user.email,
            role=current_user.role,
            severity="Crítico",
            request=request,
            details={"cambios": changes, "nuevos_ajustes": merged}
        )

    if prev_settings.get("maintenanceMode") != merged.get("maintenanceMode"):
        m_active = merged.get("maintenanceMode")
        await record_audit_event(
            db=db,
            action="Activación de Modo Mantenimiento" if m_active else "Desactivación de Modo Mantenimiento",
            target=f"Modo Mantenimiento: {'ACTIVADO' if m_active else 'DESACTIVADO'}",
            user_id=current_user.id,
            user_email=current_user.email,
            role=current_user.role,
            severity="Crítico",
            request=request,
            details={"mensaje_mantenimiento": merged.get("maintenanceMessage")}
        )

    # Si no hubo cambios críticos pero se guardó la configuración
    if not changes and prev_settings.get("maintenanceMode") == merged.get("maintenanceMode"):
        await record_audit_event(
            db=db,
            action="Actualización de Ajustes Generales",
            target="Configuración de Plataforma",
            user_id=current_user.id,
            user_email=current_user.email,
            role=current_user.role,
            severity="Info",
            request=request,
            details={"nuevos_ajustes": merged}
        )

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
async def create_broadcast(
    body: BroadcastCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(platform_required)
):
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

    # Registrar en auditoría
    await record_audit_event(
        db=db,
        action="Emisión de Comunicado Masivo",
        target=f"Destinatarios: {body.target} — '{body.title}'",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Info",
        request=request,
        details={"comunicado_id": entry["id"], "titulo": body.title, "destinatarios": body.target, "alcance_estimado": sent_count}
    )

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
