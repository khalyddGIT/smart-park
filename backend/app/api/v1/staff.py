from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Staff
from app.schemas.schemas import StaffCreate, StaffUpdate, StaffResponse
from app.core.security import require_role, hash_pin

router = APIRouter(prefix="/staff", tags=["Personal & Turnos de Operación"])

# Gestión de personal: exclusiva del Admin Local y Super Admin
staff_required = require_role("local", "platform")

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
    return [StaffResponse.model_validate(s) for s in staff_members]

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
    return StaffResponse.model_validate(member)

from app.models.models import Staff, User
from app.core.security import get_password_hash

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(staff_in: StaffCreate, db: AsyncSession = Depends(get_db)):
    db_staff = Staff(
        parking_id=staff_in.parking_id,
        full_name=staff_in.full_name,
        dni=staff_in.dni,
        position=staff_in.position,
        shift=staff_in.shift or "Mañana",
        status=staff_in.status or "active",
        email=staff_in.email,
        security_pin=staff_in.security_pin or "1234"
    )
    db.add(db_staff)
    await db.commit()
    await db.refresh(db_staff)

    # Si se proporcionó un email, registrar también la cuenta de usuario para que el personal pueda ingresar
    if staff_in.email:
        res = await db.execute(select(User).where(User.email == staff_in.email))
        if not res.scalars().first():
            user_account = User(
                full_name=staff_in.full_name,
                email=staff_in.email,
                phone=staff_in.dni,
                hashed_password=get_password_hash(staff_in.password or "Garita2026!"),
                security_pin=staff_in.security_pin or "1234",
                role="user",
                is_active=True
            )
            db.add(user_account)
            await db.commit()

    return StaffResponse.model_validate(db_staff)

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: int, staff_in: StaffUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    update_data = staff_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(member, key, value)
    
    await db.commit()
    await db.refresh(member)
    return StaffResponse.model_validate(member)

@router.delete("/{staff_id}", status_code=status.HTTP_200_OK)
async def delete_staff(staff_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    await db.delete(member)
    await db.commit()
    return {"status": "success", "message": f"Colaborador {staff_id} eliminado del directorio"}
