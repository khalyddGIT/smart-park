from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserUpdate, UserRoleUpdate, UserPinUpdate, UserResponse
from app.core.security import get_password_hash, hash_pin, require_role
from app.core.audit_service import record_audit_event

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
    request: Request,
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

    await record_audit_event(
        db=db,
        action="Creación Manual de Usuario",
        target=f"Usuario #{db_user.id} ({db_user.email})",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Info",
        request=request,
        details={"nuevo_usuario_id": db_user.id, "email": db_user.email, "nombre": db_user.full_name}
    )

    return UserResponse.model_validate(db_user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    prev_active = user.is_active
    update_data = user_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)

    # Registrar si se modificó el estado de bloqueo/activación
    if "is_active" in update_data and prev_active != user.is_active:
        action = "Desbloqueo de Usuario" if user.is_active else "Bloqueo/Desactivación de Usuario"
        severity = "Advertencia" if user.is_active else "Crítico"
        await record_audit_event(
            db=db,
            action=action,
            target=f"Usuario #{user.id} ({user.email})",
            user_id=current_user.id,
            user_email=current_user.email,
            role=current_user.role,
            severity=severity,
            request=request,
            details={"estado_anterior": prev_active, "nuevo_estado": user.is_active}
        )

    return UserResponse.model_validate(user)

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    prev_role = user.role
    user.role = role_in.role
    await db.commit()
    await db.refresh(user)

    await record_audit_event(
        db=db,
        action="Cambio de Rol RBAC",
        target=f"Usuario #{user.id} ({user.email}): {prev_role} → {role_in.role}",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Advertencia",
        request=request,
        details={"usuario_afectado_id": user.id, "email": user.email, "rol_anterior": prev_role, "nuevo_rol": role_in.role}
    )

    return UserResponse.model_validate(user)

@router.put("/{user_id}/pin", status_code=status.HTTP_200_OK)
async def update_user_pin(
    user_id: int,
    pin_in: UserPinUpdate,
    request: Request,
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

    await record_audit_event(
        db=db,
        action="Modificación de PIN de Seguridad",
        target=f"Usuario #{user.id} ({user.email})",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Advertencia",
        request=request,
        details={"usuario_afectado_id": user.id, "email": user.email}
    )

    return {"status": "success", "message": f"PIN de seguridad actualizado para el usuario {user_id}"}

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    deleted_info = {
        "usuario_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }
    
    await db.delete(user)
    await db.commit()

    await record_audit_event(
        db=db,
        action="Eliminación Definitiva de Usuario",
        target=f"Usuario #{deleted_info['usuario_id']} ({deleted_info['email']}, rol: {deleted_info['role']})",
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        severity="Crítico",
        request=request,
        details=deleted_info
    )

    return {"status": "success", "message": f"Usuario {user_id} eliminado exitosamente"}
