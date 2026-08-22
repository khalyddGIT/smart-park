from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Incident, Parking, User
from app.schemas.schemas import IncidentCreate, IncidentResolve, IncidentResponse
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/incidents", tags=["Incidencias & Asistencia"])

# Resolver incidencias es función del Admin Local o Super Admin
admin_required = require_role("local", "platform")

@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(
    incident_in: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p_res = await db.execute(select(Parking).where(Parking.id == incident_in.parking_id))
    if not p_res.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    db_incident = Incident(
        parking_id=incident_in.parking_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        category=incident_in.category,
        description=incident_in.description,
        photo_url=incident_in.photo_url,
        status="reported"
    )
    db.add(db_incident)
    await db.commit()
    await db.refresh(db_incident)
    return IncidentResponse.model_validate(db_incident)

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    parking_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Incident).order_by(Incident.id.desc())
    if parking_id:
        stmt = stmt.where(Incident.parking_id == parking_id)
    if status:
        stmt = stmt.where(Incident.status == status)

    # RBAC: los conductores solo ven sus propias incidencias; local/platform ven todas
    if current_user.role == "user":
        stmt = stmt.where(Incident.user_id == current_user.id)

    result = await db.execute(stmt)
    incidents = result.scalars().all()
    return [IncidentResponse.model_validate(i) for i in incidents]

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")

    # Solo el autor o un administrador (local/platform) pueden ver el detalle
    if incident.user_id != current_user.id and current_user.role not in ("local", "platform"):
        raise HTTPException(status_code=403, detail="No autorizado para ver esta incidencia")

    return IncidentResponse.model_validate(incident)

@router.put("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: int,
    resolve_in: IncidentResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    if incident.status == "resolved":
        raise HTTPException(status_code=400, detail="La incidencia ya fue resuelta")

    incident.status = "resolved"
    incident.resolution_note = resolve_in.resolution_note
    incident.resolved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(incident)
    return IncidentResponse.model_validate(incident)
