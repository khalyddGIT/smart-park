from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Staff, User
from app.schemas.schemas import StaffCreate, StaffUpdate, StaffResponse
from app.core.security import require_role, hash_pin, get_password_hash

router = APIRouter(prefix="/staff", tags=["Personal & Turnos de Operación"])

# Gestión de personal: exclusiva del Admin Local y Super Admin
staff_required = require_role("local", "platform")

async def _build_staff_response(member: Staff, db: AsyncSession) -> StaffResponse:
    has_account = False
    system_role = "local"
    if member.email:
        res = await db.execute(select(User).where(User.email == member.email))
        user = res.scalars().first()
        if user:
            has_account = True
            system_role = user.role or "local"
    
    resp_data = {
        "id": member.id,
        "parking_id": member.parking_id,
        "full_name": member.full_name,
        "dni": member.dni,
        "position": member.position,
        "shift": member.shift,
        "status": member.status,
        "email": member.email,
        "created_at": member.created_at,
        "has_account": has_account,
        "system_role": system_role
    }
    return StaffResponse.model_validate(resp_data)

@router.get("", response_model=List[StaffResponse])
async def list_staff(
    parking_id: Optional[int] = None,
    shift: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    stmt = select(Staff)
    if parking_id:
        stmt = stmt.where(Staff.parking_id == parking_id)
    if shift:
        stmt = stmt.where(Staff.shift.ilike(f"%{shift}%"))
    
    result = await db.execute(stmt)
    staff_members = result.scalars().all()
    
    responses = []
    for s in staff_members:
        responses.append(await _build_staff_response(s, db))
    return responses

@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    return await _build_staff_response(member, db)

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_in: StaffCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    if staff_in.password and len(staff_in.password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña de acceso debe tener al menos 8 caracteres")

    # El PIN se almacena siempre hasheado (mínimo 4 dígitos)
    pin = staff_in.security_pin if staff_in.security_pin and len(staff_in.security_pin) >= 4 else f"{secrets.randbelow(10000):04d}"
    
    db_staff = Staff(
        parking_id=staff_in.parking_id,
        full_name=staff_in.full_name,
        dni=staff_in.dni,
        position=staff_in.position,
        shift=staff_in.shift or "Mañana",
        status=staff_in.status or "active",
        email=staff_in.email.strip() if staff_in.email else None,
        security_pin=hash_pin(pin)
    )
    db.add(db_staff)
    await db.commit()
    await db.refresh(db_staff)

    # Si se proporcionó un email, registrar o actualizar la cuenta de usuario para que el personal pueda ingresar
    target_role = staff_in.system_role or "local"
    is_active_account = (db_staff.status or "active").lower() in ("activo", "active")
    
    if db_staff.email:
        res = await db.execute(select(User).where(User.email == db_staff.email))
        user_account = res.scalars().first()
        
        pwd = staff_in.password if staff_in.password and len(staff_in.password) >= 8 else secrets.token_urlsafe(16)
        
        if not user_account:
            user_account = User(
                full_name=db_staff.full_name,
                email=db_staff.email,
                phone=db_staff.dni,
                hashed_password=get_password_hash(pwd),
                security_pin=hash_pin(pin),
                role=target_role,
                is_active=is_active_account
            )
            db.add(user_account)
        else:
            user_account.full_name = db_staff.full_name
            user_account.phone = db_staff.dni
            user_account.role = target_role
            user_account.is_active = is_active_account
            if staff_in.password and len(staff_in.password) >= 8:
                user_account.hashed_password = get_password_hash(staff_in.password)
            if staff_in.security_pin:
                user_account.security_pin = hash_pin(pin)
                
        await db.commit()

    return await _build_staff_response(db_staff, db)

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    staff_in: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    if staff_in.password and len(staff_in.password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña de acceso debe tener al menos 8 caracteres")

    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    old_email = member.email
    update_data = staff_in.model_dump(exclude_unset=True)
    
    # Extraer campos de usuario antes de actualizar el modelo Staff
    new_password = update_data.pop("password", None)
    new_system_role = update_data.pop("system_role", None)
    
    if "security_pin" in update_data and update_data["security_pin"]:
        update_data["security_pin"] = hash_pin(update_data["security_pin"])
    if "email" in update_data and update_data["email"]:
        update_data["email"] = update_data["email"].strip()
        
    for key, value in update_data.items():
        setattr(member, key, value)
    
    await db.commit()
    await db.refresh(member)
    
    # Sincronizar cuenta de usuario vinculada
    current_email = member.email or old_email
    if current_email:
        # Buscar por email actual o anterior
        res = await db.execute(select(User).where((User.email == current_email) | (User.email == old_email)))
        user_account = res.scalars().first()
        
        is_active_account = (member.status or "active").lower() in ("activo", "active")
        target_role = new_system_role or (user_account.role if user_account else "local") or "local"
        
        if user_account:
            user_account.full_name = member.full_name
            user_account.phone = member.dni
            if member.email:
                user_account.email = member.email
            user_account.is_active = is_active_account
            if new_system_role:
                user_account.role = target_role
            if new_password and len(new_password) >= 8:
                user_account.hashed_password = get_password_hash(new_password)
            if "security_pin" in update_data and update_data["security_pin"]:
                user_account.security_pin = update_data["security_pin"]
        elif member.email and (new_password or member.status):
            pwd = new_password if new_password and len(new_password) >= 8 else secrets.token_urlsafe(16)
            user_account = User(
                full_name=member.full_name,
                email=member.email,
                phone=member.dni,
                hashed_password=get_password_hash(pwd),
                security_pin=member.security_pin,
                role=target_role,
                is_active=is_active_account
            )
            db.add(user_account)
            
        await db.commit()

    return await _build_staff_response(member, db)

@router.delete("/{staff_id}", status_code=status.HTTP_200_OK)
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    # Si tenía cuenta de usuario vinculada, desactivar la cuenta para revocar accesos
    if member.email:
        res = await db.execute(select(User).where(User.email == member.email))
        user_account = res.scalars().first()
        if user_account:
            user_account.is_active = False
    
    await db.delete(member)
    await db.commit()
    return {"status": "success", "message": f"Colaborador {staff_id} eliminado del directorio"}
