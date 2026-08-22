from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserUpdate, UserRoleUpdate, UserPinUpdate, UserResponse
from app.core.security import get_password_hash, hash_pin, require_role

router = APIRouter(prefix="/users", tags=["Directorio Global de Usuarios & Roles"])

# Router exclusivo del Super Admin (plataforma): gestión de roles, PINs y cuentas
platform_required = require_role("platform")

@router.get("", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    query: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if query:
        stmt = stmt.where(User.full_name.ilike(f"%{query}%") | User.email.ilike(f"%{query}%"))
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserResponse.model_validate(user)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado")

    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=get_password_hash(user_in.password),
        # El rol nunca se acepta del cliente: se asigna después vía PUT /{id}/role
        role="user",
        security_pin=hash_pin(f"{secrets.randbelow(10000):04d}"),
        is_active=True
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return UserResponse.model_validate(db_user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = user_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)

@router.put("/{user_id}/pin", status_code=status.HTTP_200_OK)
async def update_user_pin(
    user_id: int,
    pin_in: UserPinUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if len(pin_in.pin) < 4 or not pin_in.pin.isdigit():
        raise HTTPException(status_code=400, detail="El PIN debe tener al menos 4 dígitos numéricos")
    
    user.security_pin = hash_pin(pin_in.pin)
    await db.commit()
    return {"status": "success", "message": f"PIN de seguridad actualizado para el usuario {user_id}"}

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": f"Usuario {user_id} eliminado exitosamente"}
