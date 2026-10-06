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
    if current_user.role == "platform":
        return
    curr_email = (current_user.email or "").strip().lower()
    curr_name = (current_user.full_name or "").strip().lower()

    # Cuentas maestras / default de administración
    if curr_email in ("adminlocal@smartpark.com", "adminlocal@smartpark.pe", "admin@smartpark.com", "admin@smartpark.pe", "camadmin@smartpark.pe"):
        return

    # Si es la sede demo 1 y es cuenta de demostración
    if parking_id == 1 and (curr_email.startswith("adminlocal") or curr_email.startswith("camadmin")):
        return

    p_res = await db.execute(select(Parking).where(Parking.id == parking_id))
    parking = p_res.scalars().first()
    if not parking:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    # Si la sede no tiene correo registrado, permitir acceso al admin local
    if not parking.email or not parking.email.strip():
        return

    # Coincidencia directa por correo comercial o personal
    if parking.email.strip().lower() == curr_email:
        return

    # Coincidencia directa por teléfono
    if current_user.phone and parking.phone and current_user.phone.strip() == parking.phone.strip():
        return

    # Coincidencia por propietario / owner
    if parking.owner and curr_name and (
        parking.owner.strip().lower() == curr_name
        or curr_name in parking.owner.strip().lower()
        or parking.owner.strip().lower() in curr_name
    ):
        return

    # Coincidencia por grupo empresarial multi-sucursal ("Empresa - Sede X")
    p_name = parking.name or ""
    company_prefix = (p_name.split(" - ")[0] if " - " in p_name else p_name).strip().lower()
    if company_prefix and len(company_prefix) >= 3:
        owner_res = await db.execute(
            select(Parking.id).where(
                (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name),
                func.lower(Parking.name).like(f"{company_prefix}%")
            )
        )
        if owner_res.scalars().first():
            return

    # Coincidencia en personal activo de la sede o sedes hermanas de la misma empresa
    s_res = await db.execute(
        select(Staff).where(
            (func.lower(Staff.email) == curr_email) | (Staff.dni == current_user.phone),
            func.lower(Staff.status).in_(["active", "activo", "habilitado"])
        )
    )
    user_staffs = s_res.scalars().all()
    for s in user_staffs:
        if s.parking_id == parking_id:
            return
        if company_prefix and s.parking_id:
            s_park = await db.execute(select(Parking).where(Parking.id == s.parking_id))
            sp = s_park.scalars().first()
            if sp and company_prefix in (sp.name or "").lower():
                return

    # Si es rol local y no tiene sedes asignadas previamente (ni como dueño ni como staff):
    user_owned = await db.execute(select(Parking.id).where(
        (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name)
    ))
    has_any_parking = user_owned.scalars().first() is not None or len(user_staffs) > 0
    if not has_any_parking and current_user.role == "local":
        new_admin_staff = Staff(
            parking_id=parking.id,
            full_name=current_user.full_name or "Administrador de Sede",
            dni=current_user.phone if (current_user.phone and current_user.phone.isdigit()) else f"DNI{current_user.id:08d}",
            position="Administrador de Sede",
            shift="Completo",
            status="active",
            email=curr_email,
            security_pin=current_user.security_pin or hash_pin("1234")
        )
        db.add(new_admin_staff)
        await db.commit()
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
    if not user and member.dni:
        res_dni_email = await db.execute(select(User).where(func.lower(User.email) == f"operador.{member.dni.strip()}@smartpark.pe"))
        user = res_dni_email.scalars().first()

    if user:
        has_account = True
        system_role = user.role or "local"
    
    has_pin = bool(member.security_pin or (user and user.security_pin))
    display_email = member.email or (user.email if user else None)
    
    resp_data = {
        "id": member.id,
        "parking_id": member.parking_id,
        "full_name": member.full_name,
        "dni": member.dni,
        "position": member.position,
        "shift": member.shift,
        "status": member.status,
        "email": display_email,
        "created_at": member.created_at,
        "has_account": has_account,
        "system_role": system_role,
        "has_pin": has_pin
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
    # Multi-tenant: solo platform/superadmin tiene visibilidad irrestricta de todas las sedes
    curr_email = (current_user.email or "").strip().lower()
    curr_name = (current_user.full_name or "").strip().lower()
    is_platform_admin = current_user.role in ("platform", "superadmin")

    if not is_platform_admin:
        p_res = await db.execute(select(Parking).where(
            (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name)
        ))
        owned_parkings = p_res.scalars().all()
        owned_ids = set(p.id for p in owned_parkings)

        # Si es la cuenta default de adminlocal y aún no tiene sedes por correo/owner, asociar sede 1 o 5 si existe
        if not owned_ids and curr_email in ("adminlocal@smartpark.com", "adminlocal@smartpark.pe", "admin@smartpark.com", "admin@smartpark.pe"):
            p_default = await db.execute(select(Parking.id).where(Parking.id.in_([1, 5])))
            owned_ids.update(p_default.scalars().all())

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

        # Si aún no tiene sedes asignadas y es rol 'local', permitir ver la sede si solicitó parking_id
        if not allowed_pids and current_user.role == "local" and parking_id:
            allowed_pids = {parking_id}

        if parking_id:
            if allowed_pids and parking_id not in allowed_pids:
                raise HTTPException(status_code=403, detail="No autorizado para ver personal de otra sede")
            stmt = stmt.where(Staff.parking_id == parking_id)
        else:
            if allowed_pids:
                stmt = stmt.where(Staff.parking_id.in_(allowed_pids))
            else:
                stmt = stmt.where(Staff.parking_id == -1)
    
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
    curr_email = (current_user.email or "").strip().lower()
    curr_name = (current_user.full_name or "").strip().lower()

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
    parking_obj = parking_check.scalars().first()
    if not parking_obj:
        user_p = await db.execute(select(Parking).where(
            (func.lower(Parking.email) == curr_email) | (func.lower(Parking.owner) == curr_name)
        ))
        fallback_p = user_p.scalars().first()
        if fallback_p:
            staff_in.parking_id = fallback_p.id
        else:
            raise HTTPException(status_code=400, detail=f"Estacionamiento ID {staff_in.parking_id} no existe.")

    await _verify_staff_parking_access(staff_in.parking_id, current_user, db)

    # El PIN se almacena siempre hasheado (mínimo 4 dígitos)
    raw_pin = (staff_in.security_pin or "").strip()
    if raw_pin and (len(raw_pin) != 4 or not raw_pin.isdigit()):
        raise HTTPException(status_code=422, detail="El PIN debe tener exactamente 4 dígitos numéricos")
    pin = raw_pin if raw_pin else f"{secrets.randbelow(10000):04d}"
    
    effective_email = clean_email or (f"operador.{clean_dni}@smartpark.pe" if clean_dni else None)

    db_staff = Staff(
        parking_id=staff_in.parking_id,
        full_name=staff_in.full_name.strip(),
        dni=clean_dni,
        position=staff_in.position.strip() if staff_in.position else "Operador de Garita",
        shift=staff_in.shift or "Mañana",
        status=staff_in.status or "active",
        email=effective_email,
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

    # Registrar o actualizar la cuenta de usuario vinculada para que el personal pueda ingresar de inmediato
    target_role = staff_in.system_role or "local"
    is_active_account = (db_staff.status or "active").lower() in ("activo", "active", "habilitado")
    
    if effective_email:
        from sqlalchemy import or_
        user_conds = [func.lower(User.email) == effective_email]
        if clean_dni:
            user_conds.append(User.phone == clean_dni)
            user_conds.append(func.lower(User.email) == f"operador.{clean_dni}@smartpark.pe")
        
        res = await db.execute(select(User).where(or_(*user_conds)))
        user_account = res.scalars().first()
        
        pwd = staff_in.password.strip() if staff_in.password and len(staff_in.password.strip()) >= 8 else (f"Garita{clean_dni[-4:]}!" if clean_dni and len(clean_dni)>=4 else "SmartPark2026!")
        
        system_emails = {"superadmin@smartpark.com", "adminlocal@smartpark.com", "usuario@smartpark.com"}
        if user_account and user_account.email.lower() in system_emails:
            effective_email = f"operador.{clean_dni}@smartpark.pe" if clean_dni else f"operador.{secrets.token_hex(4)}@smartpark.pe"
            user_account = None

        if not user_account:
            user_account = User(
                full_name=db_staff.full_name,
                email=effective_email,
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
            user_account.email = effective_email
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
                raise HTTPException(status_code=400, detail=f"El correo '{effective_email}' ya pertenece a otro usuario")
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

    # Validar acceso a la nueva sede si se traslada al colaborador
    if "parking_id" in update_data and update_data["parking_id"]:
        new_pid = update_data["parking_id"]
        await _verify_staff_parking_access(new_pid, current_user, db)

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
    target_email = member.email or old_email or (f"operador.{member.dni}@smartpark.pe" if member.dni else None)
    is_active_account = (member.status or "active").lower() in ("activo", "active", "habilitado")
    target_role = new_system_role or "local"

    if target_email:
        clean_target = target_email.strip().lower()
        member.email = clean_target
        from sqlalchemy import or_
        user_conds = [func.lower(User.email) == clean_target]
        if old_email and old_email != clean_target:
            user_conds.append(func.lower(User.email) == old_email)
        if member.dni:
            user_conds.append(User.phone == member.dni.strip())
            user_conds.append(func.lower(User.email) == f"operador.{member.dni.strip()}@smartpark.pe")

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
    clean_email = (member.email or "").strip().lower() if member.email else None
    user_conds = []
    if clean_email:
        user_conds.append(func.lower(User.email) == clean_email)
    if member.dni:
        user_conds.append(User.phone == member.dni.strip())
        user_conds.append(func.lower(User.email) == f"operador.{member.dni.strip()}@smartpark.pe")
    
    if user_conds:
        from sqlalchemy import or_
        res = await db.execute(select(User).where(or_(*user_conds)))
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
