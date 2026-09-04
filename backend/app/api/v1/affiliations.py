"""Solicitudes de afiliación de cocheras — flujo real con persistencia en BD."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.models import AffiliationRequest, Parking, User

router = APIRouter(prefix="/affiliation-requests", tags=["Afiliaciones"])
platform_required = require_role("platform")


class AffiliationCreate(BaseModel):
    parkingName: str = Field(..., alias="parkingName", min_length=2)
    ownerName: str = Field(..., alias="ownerName", min_length=2)
    email: str = Field(..., min_length=5)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    capacity: Optional[int] = None
    rate: Optional[float] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class AffiliationResponse(BaseModel):
    id: int
    parkingName: str
    ownerName: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    capacity: Optional[int] = None
    rate: Optional[float] = None
    notes: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_aff(cls, obj):
        return cls(
            id=obj.id,
            parkingName=obj.parking_name,
            ownerName=obj.owner_name,
            email=obj.email,
            phone=obj.phone,
            address=obj.address,
            city=obj.city,
            capacity=obj.capacity,
            rate=obj.rate,
            notes=obj.notes,
            status=obj.status,
            created_at=obj.created_at,
        )


@router.post("", response_model=AffiliationResponse, status_code=201)
async def create_request(body: AffiliationCreate, db: AsyncSession = Depends(get_db)):
    req = AffiliationRequest(
        parking_name=body.parkingName.strip(),
        owner_name=body.ownerName.strip(),
        email=body.email.strip().lower(),
        phone=(body.phone or "").strip() or None,
        address=(body.address or "").strip() or None,
        city=(body.city or "Ayacucho - Huamanga").strip(),
        capacity=body.capacity,
        rate=body.rate,
        notes=(body.notes or "").strip() or None,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return AffiliationResponse.from_orm_aff(req)


@router.get("", response_model=List[AffiliationResponse])
async def list_requests(db: AsyncSession = Depends(get_db), current_user: User = Depends(platform_required)):
    res = await db.execute(select(AffiliationRequest).order_by(AffiliationRequest.id.desc()))
    rows = res.scalars().all()
    return [AffiliationResponse.from_orm_aff(r) for r in rows]


@router.put("/{req_id}/approve", response_model=dict)
async def approve_request(req_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(platform_required)):
    res = await db.execute(select(AffiliationRequest).where(AffiliationRequest.id == req_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Solicitud ya está {req.status}")

    # Crear la cochera en el mapa (coordenadas por defecto centro Huamanga si no hay)
    parking = Parking(
        name=req.parking_name,
        address=req.address or "Centro Histórico",
        city=req.city or "Ayacucho - Huamanga",
        latitude=-13.1631,
        longitude=-74.2236,
        hourly_rate=float(req.rate) if req.rate else 5.0,
        total_capacity=int(req.capacity) if req.capacity else 25,
        status="active",
        image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
    )
    db.add(parking)
    req.status = "approved"
    await db.commit()
    await db.refresh(parking)

    from app.core.audit_service import record_audit_event
    await record_audit_event(
        db=db,
        action="Aprobación de Sede Afiliada",
        target=f"Sede #{parking.id} '{parking.name}' (Solicitud #{req.id})",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Info",
        parking_id=parking.id,
        parking_name=parking.name,
        details={"solicitud_id": req.id, "dueño": req.owner_name, "email": req.email, "capacidad": req.capacity, "tarifa": req.rate}
    )
    return {"status": "approved", "parking_id": parking.id, "parking_name": parking.name}


@router.put("/{req_id}/reject", response_model=dict)
async def reject_request(req_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(platform_required)):
    res = await db.execute(select(AffiliationRequest).where(AffiliationRequest.id == req_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Solicitud ya está {req.status}")
    req.status = "rejected"
    await db.commit()

    from app.core.audit_service import record_audit_event
    await record_audit_event(
        db=db,
        action="Rechazo de Solicitud de Sede",
        target=f"Solicitud #{req.id} '{req.parking_name}' ({req.email})",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Advertencia",
        details={"solicitud_id": req.id, "dueño": req.owner_name, "email": req.email}
    )
    return {"status": "rejected"}
