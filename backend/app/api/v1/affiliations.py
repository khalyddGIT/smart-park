"""Solicitudes de afiliación de cocheras — flujo real con persistencia en BD."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import secrets
from app.core.security import get_current_user, require_role, get_password_hash, hash_pin
from app.db.session import get_db
from app.models.models import AffiliationRequest, Parking, User, Staff

router = APIRouter(prefix="/affiliation-requests", tags=["Afiliaciones"])
platform_required = require_role("platform")


class AffiliationApproveBody(BaseModel):
    adminEmail: Optional[str] = Field(None, alias="adminEmail")
    adminPassword: Optional[str] = Field(None, alias="adminPassword")
    adminName: Optional[str] = Field(None, alias="adminName")
    adminPhone: Optional[str] = Field(None, alias="adminPhone")

    class Config:
        populate_by_name = True


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
async def approve_request(
    req_id: int, 
    body: Optional[AffiliationApproveBody] = None, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(platform_required)
):
    res = await db.execute(select(AffiliationRequest).where(AffiliationRequest.id == req_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Solicitud ya está {req.status}")

    # Determinar credenciales y datos del administrador local
    admin_email = (body.adminEmail if body and body.adminEmail else req.email).strip().lower()
    admin_name = (body.adminName if body and body.adminName else req.owner_name).strip()
    admin_phone = (body.adminPhone if body and body.adminPhone else req.phone or "").strip() or None
    
    if body and body.adminPassword and len(body.adminPassword) >= 8:
        raw_password = body.adminPassword
    else:
        # Generar contraseña segura y legible por defecto
        raw_password = f"SmartPark_{secrets.token_hex(3).upper()}!"

    # 1. Crear la cochera en el mapa
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
        owner=admin_name,
        email=admin_email,
        phone=admin_phone,
        whatsapp=admin_phone.replace("+", "").replace(" ", "") if admin_phone else None,
        schedule="Lunes a Domingo: 24 Horas"
    )
    db.add(parking)
    req.status = "approved"
    await db.commit()
    await db.refresh(parking)

    # 2. Crear o actualizar cuenta de usuario con rol 'local'
    user_res = await db.execute(select(User).where(User.email == admin_email))
    user = user_res.scalars().first()
    if not user:
        user = User(
            full_name=admin_name,
            email=admin_email,
            phone=admin_phone,
            hashed_password=get_password_hash(raw_password),
            role="local",
            is_active=True,
            security_pin=hash_pin(f"{secrets.randbelow(10000):04d}")
        )
        db.add(user)
    else:
        user.full_name = admin_name
        user.phone = admin_phone or user.phone
        user.role = "local"
        user.hashed_password = get_password_hash(raw_password)
        user.is_active = True
    await db.commit()
    await db.refresh(user)

    # 3. Crear o actualizar Staff vinculando la sede al administrador
    staff_res = await db.execute(select(Staff).where(Staff.email == admin_email))
    staff_member = staff_res.scalars().first()
    if not staff_member:
        staff_member = Staff(
            parking_id=parking.id,
            full_name=admin_name,
            dni=f"DNI{secrets.randbelow(90000000) + 10000000}",
            position="Administrador de Sede",
            shift="Completo",
            status="active",
            email=admin_email,
            security_pin=hash_pin("1234")
        )
        db.add(staff_member)
    else:
        staff_member.parking_id = parking.id
        staff_member.position = "Administrador de Sede"
        staff_member.status = "active"
    await db.commit()

    from app.core.audit_service import record_audit_event
    await record_audit_event(
        db=db,
        action="Aprobación de Sede y Aprovisionamiento de Credenciales",
        target=f"Sede #{parking.id} '{parking.name}' -> Usuario local: {admin_email}",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Info",
        parking_id=parking.id,
        parking_name=parking.name,
        details={
            "solicitud_id": req.id, 
            "dueño": admin_name, 
            "email": admin_email, 
            "capacidad": req.capacity, 
            "tarifa": req.rate,
            "credenciales_creadas": True
        }
    )
    return {
        "status": "approved",
        "parking_id": parking.id,
        "parking_name": parking.name,
        "admin_email": admin_email,
        "admin_password": raw_password,
        "admin_name": admin_name,
        "admin_phone": admin_phone,
        "message": f"Sede '{parking.name}' aprobada y credenciales de acceso creadas para {admin_email}"
    }


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
