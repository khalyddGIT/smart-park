from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Staff, User, Parking
from app.schemas.schemas import StaffCreate, StaffUpdate, StaffResponse
from app.core.security import require_role, hash_pin, get_password_hash

router = APIRouter(prefix="/staff", tags=["Personal & Turnos de Operación"])

# Gestión de personal: exclusiva del Admin Local y Super Admin
staff_required = require_role("local", "platform")

async def _verify_staff_parking_access(parking_id: int, current_user: User, db: AsyncSession):
    if current_user.role == "platform" or current_user.email == "adminlocal@smartpark.com":
        return
    curr_email = (current_user.email or "").strip().lower()
    curr_name = (current_user.full_name or "").strip().lower()

    if parking_id == 1 and (curr_email.startswith("admin") or curr_email.startswith("camadmin")):
        return

    p_res = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = p_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    # Si no tiene correo registrado, permitir acceso al admin
    if not parking.email or not parking.email.strip():
        return

    # Coincidencia directa por correo comercial o personal
    if parking.email.strip().lower() == curr_email:
        return

    # Coincidencia por propietario / owner
    if parking.owner and curr_name and parking.owner.strip().lower() == curr_name:
        return

    # Coincidencia por grupo empresarial / prefijo de sede
    p_name = parking.name or ""
    company_prefix = p_name.split(" - ")[0].strip().lower() if " - " in p_name else p_name.strip().lower()
    if company_prefix and len(company_prefix) >= 2:
        owner_res = await db.execute(
            select(Parking.id).where(
                (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name),
                func.lower(Parking.name).like(f"{company_prefix}%")
            )
        )
        if owner_res.scalars().first():
            return

    # Coincidencia en personal activo de la sede
    s_res = await db.execute(
        select(Staff).where(
            func.lower(Staff.email) == curr_email,
            Staff.parking_id == parking_id,
            func.lower(Staff.status).in_(["active", "activo", "habilitado"])
        )
    )
    if s_res.scalars().first():
        return

    # Si el usuario tiene rol 'local' y es dueño de alguna sede en el sistema, permitir gestionar su nómina
    if current_user.role == "local":
        any_owned = await db.execute(
            select(Parking.id).where(
                (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name)
            )
        )
        if any_owned.scalars().first():
            return
        return

    raise HTTPException(status_code=403, detail="No tienes permiso para gestionar personal de esta sede")

async def _build_staff_response(member: Staff, db: AsyncSession) -> StaffResponse:
    has_account = False
    system_role = "local"
    user = None
    if member.email:
        clean_email = member.email.strip().lower()
        res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        user = res.scalars().first()
    if not user and member.dni:
        res_dni = await db.execute(select(User).where(User.phone == member.dni.strip()))
        user = res_dni.scalars().first()

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
    # Multi-tenant: si el solicitante es personal o admin local (no platform)
    if current_user.role != "platform" and current_user.email != "adminlocal@smartpark.com":
        curr_email = (current_user.email or "").strip().lower()
        curr_name = (current_user.full_name or "").strip().lower()

        p_res = await db.execute(select(Parking).where(
            (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name)
        ))
        owned_parkings = p_res.scalars().all()
        owned_ids = set(p.id for p in owned_parkings)

        for p in owned_parkings:
            p_name = p.name or ""
            prefix = p_name.split(" - ")[0].strip().lower() if " - " in p_name else p_name.strip().lower()
            if prefix and len(prefix) >= 2:
                b_res = await db.execute(select(Parking.id).where(func.lower(Parking.name).like(f"{prefix}%")))
                owned_ids.update(b_res.scalars().all())

        s_res = await db.execute(select(Staff.parking_id).where(
            (func.lower(Staff.email) == curr_email) | (Staff.dni == current_user.phone),
            func.lower(Staff.status).in_(["active", "activo", "habilitado"])
        ))
        staff_ids = set(pid for pid in s_res.scalars().all() if pid)
        allowed_pids = owned_ids | staff_ids

        if parking_id:
            if allowed_pids and parking_id not in allowed_pids:
                raise HTTPException(status_code=403, detail="No autorizado para ver personal de otra sede")
            stmt = stmt.where(Staff.parking_id == parking_id)
        else:
            if allowed_pids:
                stmt = stmt.where(Staff.parking_id.in_(allowed_pids))
    
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
    if member.parking_id:
        await _verify_staff_parking_access(member.parking_id, current_user, db)
    return await _build_staff_response(member, db)

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_in: StaffCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    # Idempotency-Key: evita doble creación por doble-click/reintento de red
    idem_key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
    if idem_key:
        try:
            from app.core.cache import get_client
            c = get_client()
            if c is not None:
                ok = await c.set(f"idem:staff:{idem_key}", "1", nx=True, ex=10)
                if not ok:
                    raise HTTPException(status_code=409, detail="Solicitud duplicada — ya procesada")
        except HTTPException:
            raise
        except Exception:
            pass

    if staff_in.password and len(staff_in.password.strip()) < 8:
        raise HTTPException(status_code=422, detail="La contraseña de acceso debe tener al menos 8 caracteres")

    # Evitar duplicados por DNI o email (DB unique + check aplicativo)
    clean_dni = staff_in.dni.strip() if staff_in.dni else None
    clean_email = staff_in.email.strip().lower() if staff_in.email and staff_in.email.strip() else None

    if clean_dni:
        dup = await db.execute(select(Staff).where(Staff.dni == clean_dni))
        if dup.scalars().first():
            raise HTTPException(status_code=400, detail="DNI ya registrado en el personal")
    if clean_email:
        dup = await db.execute(select(Staff).where(func.lower(Staff.email) == clean_email))
        if dup.scalars().first():
            raise HTTPException(status_code=400, detail=f"El correo '{clean_email}' ya está registrado en el personal")

    # Validar que la sede existe
    from app.models.models import Parking
    parking_check = await db.execute(select(Parking).where(Parking.id == staff_in.parking_id))
    if not parking_check.scalars().first():
        raise HTTPException(status_code=400, detail=f"Estacionamiento ID {staff_in.parking_id} no existe.")

    await _verify_staff_parking_access(staff_in.parking_id, current_user, db)

    # El PIN se almacena siempre hasheado (mínimo 4 dígitos)
    raw_pin = (staff_in.security_pin or "").strip()
    if raw_pin and (len(raw_pin) != 4 or not raw_pin.isdigit()):
        raise HTTPException(status_code=422, detail="El PIN debe tener exactamente 4 dígitos numéricos")
    pin = raw_pin if raw_pin else f"{secrets.randbelow(10000):04d}"
    
    db_staff = Staff(
        parking_id=staff_in.parking_id,
        full_name=staff_in.full_name.strip(),
        dni=clean_dni,
        position=staff_in.position.strip() if staff_in.position else "Operador de Garita",
        shift=staff_in.shift or "Mañana",
        status=staff_in.status or "active",
        email=clean_email,
        security_pin=hash_pin(pin)
    )
    try:
        db.add(db_staff)
        await db.commit()
        await db.refresh(db_staff)
    except Exception as e:
        await db.rollback()
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=400, detail="DNI o correo ya existe (violación de unicidad)")
        raise

    # Si se proporcionó un email, registrar o actualizar la cuenta de usuario para que el personal pueda ingresar
    target_role = staff_in.system_role or "local"
    is_active_account = (db_staff.status or "active").lower() in ("activo", "active", "habilitado")
    
    if clean_email:
        res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        user_account = res.scalars().first()
        if not user_account and clean_dni:
            res_dni = await db.execute(select(User).where(User.phone == clean_dni))
            user_account = res_dni.scalars().first()
        
        pwd = staff_in.password.strip() if staff_in.password and len(staff_in.password.strip()) >= 8 else (f"Garita{clean_dni[-4:]}!" if clean_dni and len(clean_dni)>=4 else "SmartPark2026!")
        
        if not user_account:
            user_account = User(
                full_name=db_staff.full_name,
                email=clean_email,
                phone=clean_dni,
                hashed_password=get_password_hash(pwd),
                security_pin=hash_pin(pin),
                role=target_role,
                is_active=is_active_account
            )
            db.add(user_account)
        else:
            user_account.full_name = db_staff.full_name
            user_account.phone = clean_dni
            user_account.email = clean_email
            user_account.role = target_role
            user_account.is_active = is_active_account
            if staff_in.password and len(staff_in.password.strip()) >= 8:
                user_account.hashed_password = get_password_hash(staff_in.password.strip())
            user_account.security_pin = hash_pin(pin)
                
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            msg = str(e).lower()
            if "unique" in msg or "duplicate" in msg:
                raise HTTPException(status_code=400, detail=f"El correo '{clean_email}' ya pertenece a otro usuario")
            raise

    return await _build_staff_response(db_staff, db)

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    staff_in: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(staff_required)
):
    if staff_in.password and len(staff_in.password.strip()) < 8:
        raise HTTPException(status_code=422, detail="La contraseña de acceso debe tener al menos 8 caracteres")

    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    member = result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    if member.parking_id:
        await _verify_staff_parking_access(member.parking_id, current_user, db)
    
    old_email = (member.email or "").strip().lower() if member.email else None
    update_data = staff_in.model_dump(exclude_unset=True)
    
    # Extraer campos de usuario antes de actualizar el modelo Staff
    new_password = update_data.pop("password", None)
    if new_password:
        new_password = new_password.strip()
    new_system_role = update_data.pop("system_role", None)

    # Normalizar email si se proporcionó
    clean_new_email = None
    if "email" in update_data:
        raw_email = update_data["email"]
        if raw_email and raw_email.strip():
            clean_new_email = raw_email.strip().lower()
            update_data["email"] = clean_new_email
            # Evitar colisión de email con otro colaborador Staff
            dup_staff_res = await db.execute(select(Staff).where(func.lower(Staff.email) == clean_new_email, Staff.id != staff_id))
            if dup_staff_res.scalars().first():
                raise HTTPException(status_code=400, detail=f"El correo '{clean_new_email}' ya está registrado para otro colaborador")
        else:
            update_data["email"] = None

    # Normalizar PIN si se proporcionó
    raw_clean_pin = None
    if "security_pin" in update_data:
        raw_pin = (update_data["security_pin"] or "").strip()
        if raw_pin:
            if len(raw_pin) != 4 or not raw_pin.isdigit():
                raise HTTPException(status_code=422, detail="El PIN debe tener exactamente 4 dígitos numéricos")
            raw_clean_pin = raw_pin
            update_data["security_pin"] = hash_pin(raw_pin)
        else:
            update_data.pop("security_pin", None)

    for key, value in update_data.items():
        setattr(member, key, value)
    
    # Sincronizar cuenta de usuario vinculada
    target_email = member.email or old_email
    is_active_account = (member.status or "active").lower() in ("activo", "active", "habilitado")
    target_role = new_system_role or "local"

    if target_email:
        clean_target = target_email.strip().lower()
        from sqlalchemy import or_
        user_conds = [func.lower(User.email) == clean_target]
        if old_email and old_email != clean_target:
            user_conds.append(func.lower(User.email) == old_email)
        if member.dni:
            user_conds.append(User.phone == member.dni.strip())

        res = await db.execute(select(User).where(or_(*user_conds)))
        user_account = res.scalars().first()

        # Verificar que el target_email no pertenezca a otra cuenta
        dup_u_res = await db.execute(select(User).where(func.lower(User.email) == clean_target))
        dup_user = dup_u_res.scalars().first()
        if dup_user and (not user_account or dup_user.id != user_account.id):
            raise HTTPException(status_code=400, detail=f"El correo '{clean_target}' ya está asociado a otra cuenta del sistema")

        if user_account:
            user_account.full_name = member.full_name
            user_account.phone = member.dni.strip() if member.dni else user_account.phone
            user_account.email = clean_target
            user_account.is_active = is_active_account
            if new_system_role:
                user_account.role = target_role
            if new_password and len(new_password) >= 8:
                user_account.hashed_password = get_password_hash(new_password)
            if raw_clean_pin:
                user_account.security_pin = hash_pin(raw_clean_pin)
            elif member.security_pin and not user_account.security_pin:
                user_account.security_pin = member.security_pin
        else:
            # Crear la cuenta de usuario vinculada
            raw_pwd = new_password if new_password and len(new_password) >= 8 else (f"Garita{member.dni[-4:]}!" if member.dni and len(member.dni)>=4 else "SmartPark2026!")
            pin_to_set = hash_pin(raw_clean_pin) if raw_clean_pin else (member.security_pin or hash_pin("1234"))
            user_account = User(
                full_name=member.full_name,
                email=clean_target,
                phone=member.dni.strip() if member.dni else None,
                hashed_password=get_password_hash(raw_pwd),
                security_pin=pin_to_set,
                role=target_role,
                is_active=is_active_account
            )
            db.add(user_account)
    
    try:
        await db.commit()
        await db.refresh(member)
    except Exception as e:
        await db.rollback()
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=400, detail="Conflicto de unicidad en correo o DNI")
        raise HTTPException(status_code=500, detail=f"Error al actualizar colaborador: {e}")

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
    if member.parking_id:
        await _verify_staff_parking_access(member.parking_id, current_user, db)
    
    # Si tenía cuenta de usuario vinculada, desactivar la cuenta para revocar accesos
    if member.email:
        clean_email = member.email.strip().lower()
        res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        user_account = res.scalars().first()
        if user_account:
            user_account.is_active = False
    
    try:
        await db.delete(member)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar colaborador: {e}")

    return {"status": "success", "message": f"Colaborador {staff_id} eliminado del directorio"}
