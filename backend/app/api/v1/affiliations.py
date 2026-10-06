"""Solicitudes de afiliación de cocheras — flujo real con persistencia en BD."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_

import re
import secrets
from app.core.security import get_current_user, require_role, get_password_hash, hash_pin
from app.core.system_accounts import required_role_for_email
from app.db.session import get_db
from app.models.models import AffiliationRequest, Parking, User, Staff
from app.schemas.schemas import validate_phone_format, validate_parking_phone_format

router = APIRouter(prefix="/affiliation-requests", tags=["Afiliaciones"])
platform_required = require_role("platform")


class AffiliationApproveBody(BaseModel):
    adminEmail: Optional[str] = None
    admin_email: Optional[str] = None
    adminPassword: Optional[str] = None
    admin_password: Optional[str] = None
    adminName: Optional[str] = None
    admin_name: Optional[str] = None
    adminPhone: Optional[str] = None
    admin_phone: Optional[str] = None

    class Config:
        populate_by_name = True

    @property
    def resolved_email(self) -> Optional[str]:
        return self.adminEmail or self.admin_email

    @property
    def resolved_password(self) -> Optional[str]:
        return self.adminPassword or self.admin_password

    @property
    def resolved_name(self) -> Optional[str]:
        return self.adminName or self.admin_name

    @property
    def resolved_phone(self) -> Optional[str]:
        return self.adminPhone or self.admin_phone


class AffiliationCreate(BaseModel):
    parkingName: str = Field(..., alias="parkingName", min_length=2)
    ownerName: str = Field(..., alias="ownerName", min_length=2)
    email: str = Field(..., min_length=5)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    capacity: Optional[int] = Field(default=25, ge=1, le=5000)
    rate: Optional[float] = Field(default=5.0, ge=0.5, le=100.0)
    notes: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        clean = str(v).strip().lower() if v else ''
        if not clean or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', clean):
            raise ValueError('Correo electrónico inválido (ej: contacto@ejemplo.com)')
        return clean

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not v or not str(v).strip():
            return None
        return validate_parking_phone_format(v)

    @field_validator('capacity')
    @classmethod
    def validate_capacity(cls, v):
        if v is None:
            return 25
        if not isinstance(v, int) or v < 1 or v > 5000:
            raise ValueError('Las plazas estimadas deben estar entre 1 y 5,000 plazas.')
        return v

    @field_validator('rate')
    @classmethod
    def validate_rate(cls, v):
        if v is None:
            return 5.0
        val = float(v)
        if val < 0.5 or val > 100.0:
            raise ValueError('La tarifa sugerida por hora debe ser entre S/ 0.50 y S/ 100.00.')
        return round(val, 2)

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
    req_id: str, 
    body: Optional[AffiliationApproveBody] = None, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(platform_required)
):
    # Resolver ID numérico si viene como "REQ-101", "101" o "1"
    parsed_id = None
    digits = re.findall(r'\d+', str(req_id))
    if digits:
        try:
            parsed_id = int(digits[0])
        except ValueError:
            pass

    req = None
    if parsed_id:
        res = await db.execute(select(AffiliationRequest).where(AffiliationRequest.id == parsed_id))
        req = res.scalars().first()

    # Búsqueda alternativa por email si fue una solicitud registrada sin id numérico o demo
    admin_email_hint = (body.resolved_email if body and body.resolved_email else "").strip().lower()
    if not req and admin_email_hint:
        res = await db.execute(select(AffiliationRequest).where(func.lower(AffiliationRequest.email) == admin_email_hint))
        req = res.scalars().first()

    if not req:
        # Si la solicitud no existe en BD (ej: demo REQ-101, REQ-102 o frontend offline),
        # la inicializamos en BD para aprovisionar la sede y las credenciales sin error
        owner_name_hint = (body.resolved_name if body and body.resolved_name else "Administrador").strip()
        phone_hint = (body.resolved_phone if body and body.resolved_phone else "").strip() or None
        target_email = admin_email_hint or f"admin.sede.{parsed_id or secrets.token_hex(2)}@smartpark.pe"
        req = AffiliationRequest(
            parking_name=f"Cochera {owner_name_hint}",
            owner_name=owner_name_hint,
            email=target_email,
            phone=phone_hint,
            address="Centro Histórico",
            city="Ayacucho - Huamanga",
            capacity=25,
            rate=5.0,
            status="pending"
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

    current_status = (req.status or "").lower()
    if current_status != "pending":
        raise HTTPException(status_code=400, detail=f"Solicitud ya está {req.status}")

    # Determinar credenciales y datos del administrador local
    admin_email = (body.resolved_email if body and body.resolved_email else req.email).strip().lower()
    admin_name = (body.resolved_name if body and body.resolved_name else req.owner_name).strip()
    admin_phone = (body.resolved_phone if body and body.resolved_phone else req.phone or "").strip() or None
    
    cand_password = body.resolved_password if body else None
    if cand_password and len(cand_password) >= 4:
        raw_password = cand_password
    else:
        # Generar contraseña segura y legible por defecto
        raw_password = f"SmartPark_{secrets.token_hex(3).upper()}!"

    # 1. Crear la cochera en el mapa si aún no existe
    parking_res = await db.execute(
        select(Parking).where(
            or_(
                func.lower(Parking.name) == req.parking_name.strip().lower(),
                func.lower(Parking.email) == admin_email
            )
        )
    )
    parking = parking_res.scalars().first()

    if not parking:
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
    else:
        parking.status = "active"
        parking.owner = admin_name
        parking.email = admin_email
        if admin_phone:
            parking.phone = admin_phone

    req.status = "approved"
    await db.commit()
    await db.refresh(parking)

    # 2. Crear o actualizar cuenta de usuario con rol 'local' (sin degradar cuentas del sistema)
    user_res = await db.execute(select(User).where(func.lower(User.email) == admin_email))
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
        if admin_phone:
            user.phone = admin_phone
        # Proteger superadmin y cuentas del sistema
        if user.role not in ("platform", "superadmin") and not required_role_for_email(user.email):
            user.role = "local"
        user.hashed_password = get_password_hash(raw_password)
        user.is_active = True
    await db.commit()
    await db.refresh(user)

    # 3. Crear o actualizar Staff vinculando la sede al administrador
    staff_res = await db.execute(select(Staff).where(func.lower(Staff.email) == admin_email))
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
        "admin_credentials": {
            "email": admin_email,
            "temporary_password": raw_password,
            "full_name": admin_name,
            "phone": admin_phone
        },
        "message": f"Sede '{parking.name}' aprobada y credenciales de acceso creadas para {admin_email}"
    }


@router.put("/{req_id}/reject", response_model=dict)
async def reject_request(req_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(platform_required)):
    parsed_id = None
    digits = re.findall(r'\d+', str(req_id))
    if digits:
        try:
            parsed_id = int(digits[0])
        except ValueError:
            pass

    req = None
    if parsed_id:
        res = await db.execute(select(AffiliationRequest).where(AffiliationRequest.id == parsed_id))
        req = res.scalars().first()

    if req:
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
