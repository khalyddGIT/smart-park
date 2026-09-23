import os
from dotenv import load_dotenv
load_dotenv()
import secrets
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import User, Staff, Parking
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, PinVerify, PinLoginRequest
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user, verify_pin_hash, is_pin_hashed, hash_pin
from app.core.cache import rate_limit_hit, blacklist_token

router = APIRouter(prefix="/auth", tags=["Autenticación"])

AUTH_COOKIE_NAME = "access_token"
AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 días

def _set_auth_cookie(response: Response, token: str) -> None:
    """Configura la cookie HttpOnly con SameSite=Lax y flag Secure si es entorno de producción."""
    is_prod = (settings.ENVIRONMENT == "production")
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE,
        expires=AUTH_COOKIE_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_prod
    )

def _clear_auth_cookie(response: Response) -> None:
    """Elimina la cookie HttpOnly de la sesión."""
    is_prod = (settings.ENVIRONMENT == "production")
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_prod
    )

# Rate limit anti fuerza bruta en login y registro por IP
is_testing = (os.getenv("TESTING") == "1")
LOGIN_RATE_LIMIT = 500 if is_testing else 5
LOGIN_RATE_WINDOW = 60

REGISTER_RATE_LIMIT = 500 if is_testing else 10
REGISTER_RATE_WINDOW = 60
_bearer_auto = HTTPBearer(auto_error=False)



def _client_ip(request: Request) -> str:
    # Detrás del proxy de Railway la IP real viene en X-Forwarded-For
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

class GoogleLoginRequest(BaseModel):
    token: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Rate limit anti-spam por IP
    allowed, _ = await rate_limit_hit(f"ratelimit:register:{_client_ip(request)}", REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes de registro desde esta dirección IP. Por favor espera un minuto."
        )

    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado")

    
    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or "user",
        security_pin=hash_pin("1234") # PIN por defecto para prueba (almacenado hasheado)
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    access_token = create_access_token(subject=db_user.id)
    _set_auth_cookie(response, access_token)
    from app.core.audit_service import record_audit_event
    await record_audit_event(
        db=db,
        action="Registro de Nueva Cuenta",
        target=f"Usuario #{db_user.id} ({db_user.email})",
        user_id=db_user.id,
        user_email=db_user.email,
        role=db_user.role,
        severity="Info",
        request=request,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=Token)
async def login_user(user_in: UserLogin, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    identifier = (user_in.email or user_in.username or "").strip()

    # Rate limit anti fuerza bruta por IP (fail-open sin Redis)
    allowed, attempts = await rate_limit_hit(f"ratelimit:login:{_client_ip(request)}", LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW)
    if not allowed:
        from app.core.audit_service import record_audit_event
        await record_audit_event(
            db=db,
            action="Bloqueo Rate-Limit de Acceso",
            target=f"IP bloqueada temporalmente: {_client_ip(request)}",
            severity="Crítico",
            request=request,
            details={"identificador_intentado": identifier, "intentos": attempts},
        )
        raise HTTPException(status_code=429, detail="Demasiados intentos de inicio de sesión. Espera un minuto e inténtalo de nuevo.")

    clean_ident = identifier.lower()

    # 1. Búsqueda exacta por email (único)
    result = await db.execute(select(User).where(func.lower(User.email) == clean_ident))
    user = result.scalars().first()

    # 1b. Búsqueda por teléfono o DNI directo en User
    if not user:
        result = await db.execute(select(User).where(User.phone == identifier))
        user = result.scalars().first()

    # 1c. Búsqueda por DNI a través de Staff vinculado
    if not user:
        staff_res = await db.execute(select(Staff).where(Staff.dni == identifier))
        staff_cand = staff_res.scalars().first()
        if staff_cand and staff_cand.email:
            res_linked = await db.execute(select(User).where(func.lower(User.email) == staff_cand.email.strip().lower()))
            user = res_linked.scalars().first()

    # 2. Si no coincide por email o DNI, buscar por nombre completo
    if not user:
        result = await db.execute(select(User).where(func.lower(User.full_name) == clean_ident))
        candidates = result.scalars().all()
        for cand in candidates:
            if verify_password(user_in.password, cand.hashed_password):
                user = cand
                break
        if not user and candidates:
            user = candidates[0]

    # 3. Si no coincide y no tiene '@', buscar por prefijo de correo (ej: 'pedro' para 'pedro@...')
    if not user and '@' not in clean_ident:
        result = await db.execute(select(User).where(func.lower(User.email).startswith(f"{clean_ident}@")))
        candidates = result.scalars().all()
        for cand in candidates:
            if verify_password(user_in.password, cand.hashed_password):
                user = cand
                break
        if not user and candidates:
            user = candidates[0]

    from app.core.audit_service import record_audit_event

    if not user or not verify_password(user_in.password, user.hashed_password):
        await record_audit_event(
            db=db,
            action="Intento Fallido de Inicio de Sesión",
            target=f"Identificador: {identifier}",
            severity="Advertencia",
            request=request,
            details={"motivo": "Contraseña incorrecta o usuario inexistente"},
        )
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.is_active:
        await record_audit_event(
            db=db,
            action="Acceso Denegado (Cuenta Desactivada)",
            target=f"Usuario #{user.id} ({user.email})",
            user_id=user.id,
            user_email=user.email,
            role=user.role,
            severity="Advertencia",
            request=request,
        )
        raise HTTPException(status_code=401, detail="Cuenta desactivada")
    
    # Enlazar parking_id y datos de staff si el usuario está en nómina de Staff o es dueño de una sede
    st = await db.execute(select(Staff).where(
        (func.lower(Staff.email) == user.email.lower()) | (Staff.dni == user.phone),
        func.lower(Staff.status).in_(["active", "activo", "habilitado"])
    ))
    staff_rec = st.scalars().first()
    if staff_rec:
        setattr(user, "parking_id", staff_rec.parking_id)
        setattr(user, "position", staff_rec.position)
        setattr(user, "shift", staff_rec.shift)
        setattr(user, "is_staff", True)
        pos_lower = (staff_rec.position or "").lower()
        is_op = bool(not pos_lower or "operador" in pos_lower or "garita" in pos_lower or "seguridad" in pos_lower or "supervisor" in pos_lower or "vigilante" in pos_lower or "administrador" not in pos_lower)
        setattr(user, "is_staff_operator", is_op)
    else:
        if not getattr(user, "parking_id", None) and user.email:
            pk = await db.execute(select(Parking.id).where(func.lower(Parking.email) == user.email.lower()))
            p_id = pk.scalars().first()
            if p_id:
                setattr(user, "parking_id", p_id)
        setattr(user, "is_staff", False)
        setattr(user, "is_staff_operator", False)

    access_token = create_access_token(subject=user.id)
    _set_auth_cookie(response, access_token)
    await record_audit_event(
        db=db,
        action="Inicio de Sesión Exitoso",
        target=f"Usuario #{user.id} ({user.role})",
        user_id=user.id,
        user_email=user.email,
        role=user.role,
        severity="Info",
        request=request,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login-pin", response_model=Token)
async def login_pin(
    pin_req: PinLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Inicio de sesión express con PIN de 4 dígitos para garita y pantallas táctiles."""
    clean_ident = (pin_req.identifier or "").strip()
    clean_pin = (pin_req.pin or "").strip()

    if not clean_ident or not clean_pin:
        raise HTTPException(status_code=400, detail="Identificador (Email o DNI) y PIN requeridos")

    # Rate limit anti fuerza bruta en login por PIN (5 intentos por minuto por IP)
    allowed, attempts = await rate_limit_hit(f"ratelimit:login_pin:{_client_ip(request)}", LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW)
    if not allowed:
        from app.core.audit_service import record_audit_event
        await record_audit_event(
            db=db,
            action="Bloqueo Rate-Limit PIN Garita",
            target=f"IP bloqueada temporalmente: {_client_ip(request)}",
            severity="Crítico",
            request=request,
            details={"identificador_intentado": clean_ident, "intentos": attempts},
        )
        raise HTTPException(status_code=429, detail="Demasiados intentos de acceso con PIN. Espera un minuto e inténtalo de nuevo.")

    from app.core.audit_service import record_audit_event

    # 1. Buscar usuario por email, nombre completo o teléfono/DNI
    clean_digits = "".join([c for c in clean_ident if c.isdigit()])
    res_user = await db.execute(
        select(User).where(
            (func.lower(User.email) == clean_ident.lower()) |
            (func.lower(User.full_name) == clean_ident.lower()) |
            (User.phone == clean_ident)
        )
    )
    user = res_user.scalars().first()

    # Si no se encontró por coincidencia exacta de teléfono y hay 8 o 9 dígitos (DNI o celular Perú)
    if not user and clean_digits and len(clean_digits) >= 8:
        res_phone_user = await db.execute(
            select(User).where(
                (User.phone != None) & 
                (
                    (User.phone == clean_digits) |
                    (func.replace(func.replace(func.replace(User.phone, ' ', ''), '+51', ''), '-', '') == clean_digits)
                )
            )
        )
        user = res_phone_user.scalars().first()

    # 2. Buscar en Staff por DNI, email o nombre
    staff_member = None
    staff_res = await db.execute(
        select(Staff).where(
            (Staff.dni == clean_ident) |
            (func.lower(Staff.email) == clean_ident.lower()) |
            (func.lower(Staff.full_name) == clean_ident.lower())
        )
    )
    staff_member = staff_res.scalars().first()

    if not staff_member and clean_digits:
        staff_res2 = await db.execute(select(Staff).where(Staff.dni == clean_digits))
        staff_member = staff_res2.scalars().first()

    # Si encontramos staff_member pero no user directo, enlazar User
    if not user and staff_member:
        if staff_member.email:
            res_linked_user = await db.execute(select(User).where(func.lower(User.email) == staff_member.email.strip().lower()))
            user = res_linked_user.scalars().first()
        if not user and staff_member.dni:
            res_linked_user = await db.execute(select(User).where(User.phone == staff_member.dni.strip()))
            user = res_linked_user.scalars().first()

    # 3. Si no existe User pero existe Staff activo: auto-provisionar si el PIN es correcto
    if not user and staff_member:
        is_active_staff = (staff_member.status or "active").lower() in ("active", "activo", "habilitado")
        if not is_active_staff:
            raise HTTPException(status_code=400, detail="Colaborador inactivo o suspendido en el sistema")

        stored_staff_pin = staff_member.security_pin
        if not stored_staff_pin or not verify_pin_hash(clean_pin, stored_staff_pin):
            await record_audit_event(
                db=db,
                action="Intento Fallido de Login PIN Garita",
                target=f"Colaborador #{staff_member.id} ({staff_member.full_name})",
                severity="Advertencia",
                request=request,
                details={"motivo": "PIN de seguridad incorrecto"},
            )
            raise HTTPException(status_code=401, detail="PIN de seguridad incorrecto")

        auto_email = (staff_member.email or f"operador.{staff_member.dni}@smartpark.pe").strip().lower()
        user = User(
            full_name=staff_member.full_name or f"Operador {staff_member.dni}",
            email=auto_email,
            phone=staff_member.dni.strip() if staff_member.dni else None,
            hashed_password=get_password_hash(f"Garita{staff_member.dni[-4:]}!" if staff_member.dni and len(staff_member.dni)>=4 else "SmartPark2026!"),
            security_pin=staff_member.security_pin if is_pin_hashed(staff_member.security_pin) else hash_pin(clean_pin),
            role="local",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user:
        await record_audit_event(
            db=db,
            action="Intento Fallido de Login PIN Garita",
            target=f"Identificador: {clean_ident}",
            severity="Advertencia",
            request=request,
            details={"motivo": "Usuario o colaborador no encontrado"},
        )
        raise HTTPException(status_code=401, detail="Credenciales de garita inválidas")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo o suspendido")

    # 4. Validar PIN de seguridad (con fallback bidireccional y auto-sincronización)
    pin_valid = False
    if user.security_pin and verify_pin_hash(clean_pin, user.security_pin):
        pin_valid = True
    elif staff_member and staff_member.security_pin and verify_pin_hash(clean_pin, staff_member.security_pin):
        pin_valid = True
        user.security_pin = staff_member.security_pin
        await db.commit()
    elif not staff_member and user.email:
        fallback_staff = await db.execute(select(Staff).where(func.lower(Staff.email) == user.email.lower()))
        s_cand = fallback_staff.scalars().first()
        if s_cand and s_cand.security_pin and verify_pin_hash(clean_pin, s_cand.security_pin):
            pin_valid = True
            user.security_pin = s_cand.security_pin
            await db.commit()

    if not pin_valid:
        await record_audit_event(
            db=db,
            action="Intento Fallido de Login PIN Garita",
            target=f"Usuario #{user.id} ({user.email})",
            severity="Advertencia",
            request=request,
            details={"motivo": "PIN de seguridad incorrecto"},
        )
        raise HTTPException(status_code=401, detail="PIN de seguridad incorrecto")

    # Migrar a hash si estaba en texto plano
    if user.security_pin and not is_pin_hashed(user.security_pin):
        user.security_pin = hash_pin(clean_pin)
        await db.commit()

    # Enlazar parking_id y datos de staff si está disponible
    active_staff = staff_member
    if not active_staff:
        st_res = await db.execute(select(Staff).where(
            (func.lower(Staff.email) == user.email.lower()) | (Staff.dni == user.phone),
            func.lower(Staff.status).in_(["active", "activo", "habilitado"])
        ))
        active_staff = st_res.scalars().first()

    if active_staff:
        setattr(user, "parking_id", active_staff.parking_id)
        setattr(user, "position", active_staff.position)
        setattr(user, "shift", active_staff.shift)
        setattr(user, "is_staff", True)
        pos_lower = (active_staff.position or "").lower()
        is_op = bool(not pos_lower or "operador" in pos_lower or "garita" in pos_lower or "seguridad" in pos_lower or "supervisor" in pos_lower or "vigilante" in pos_lower or "administrador" not in pos_lower)
        setattr(user, "is_staff_operator", is_op)
    else:
        setattr(user, "is_staff", False)
        setattr(user, "is_staff_operator", False)

    access_token = create_access_token(subject=user.id)
    _set_auth_cookie(response, access_token)

    await record_audit_event(
        db=db,
        action="Inicio de Sesión Express PIN",
        target=f"Usuario #{user.id} ({user.role})",
        user_id=user.id,
        user_email=user.email,
        role=user.role,
        severity="Info",
        request=request,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_auto)
):
    """Logout real: revoca el token actual (blacklist en Redis) y borra la cookie HttpOnly."""
    token = credentials.credentials if credentials else ""
    if not token and hasattr(request, "cookies"):
        token = request.cookies.get(AUTH_COOKIE_NAME, "")

    _clear_auth_cookie(response)

    if not token:
        return {"status": "success", "message": "Sesión cerrada"}
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return {"status": "success", "message": "Sesión cerrada"}

    jti = payload.get("jti")
    exp = payload.get("exp")
    if jti and exp:
        ttl = max(1, int(exp - datetime.utcnow().timestamp()))
        revoked = await blacklist_token(jti, ttl)
        return {
            "status": "success",
            "message": "Sesión cerrada y token revocado" if revoked else "Sesión cerrada (revocación no disponible: Redis sin configurar)"
        }
    return {"status": "success", "message": "Sesión cerrada"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Retorna el usuario autenticado según JWT enriquecido con datos de staff y sede."""
    curr_email = (current_user.email or "").strip().lower()
    st_res = await db.execute(select(Staff).where(
        (func.lower(Staff.email) == curr_email) | (Staff.dni == current_user.phone),
        func.lower(Staff.status).in_(["active", "activo", "habilitado"])
    ))
    staff_rec = st_res.scalars().first()
    if staff_rec:
        setattr(current_user, "parking_id", staff_rec.parking_id)
        setattr(current_user, "position", staff_rec.position)
        setattr(current_user, "shift", staff_rec.shift)
        setattr(current_user, "is_staff", True)
        pos_lower = (staff_rec.position or "").lower()
        is_op = bool(not pos_lower or "operador" in pos_lower or "garita" in pos_lower or "seguridad" in pos_lower or "supervisor" in pos_lower or "vigilante" in pos_lower or "administrador" not in pos_lower)
        setattr(current_user, "is_staff_operator", is_op)
    else:
        if curr_email:
            pk = await db.execute(select(Parking.id).where(func.lower(Parking.email) == curr_email))
            p_id = pk.scalars().first()
            if p_id:
                setattr(current_user, "parking_id", p_id)
        setattr(current_user, "is_staff", False)
        setattr(current_user, "is_staff_operator", False)

    return UserResponse.model_validate(current_user)

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleLoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Fail-closed: sin client_id configurado o sin token, NO se confía en el email del body
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Inicio de sesión con Google no está configurado en el servidor")
    if not payload.token:
        raise HTTPException(status_code=400, detail="Token de Google requerido")

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Token de Google inválido")

    email = idinfo.get("email")
    name = idinfo.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="El token de Google no incluye un correo válido")

    # Buscar usuario o registrarlo automáticamente
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    picture = payload.picture or idinfo.get("picture")
    is_new = False

    if not user:
        is_new = True
        user = User(
            full_name=name or email.split("@")[0],
            email=email,
            phone="+51 900 000 000",
            avatar_url=picture,
            # Contraseña aleatoria criptográfica: la cuenta OAuth no debe ser accesible vía /auth/login
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            role="user",
            security_pin=hash_pin("1234"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif picture and not user.avatar_url:
        user.avatar_url = picture
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    _set_auth_cookie(response, access_token)

    from app.core.audit_service import record_audit_event
    await record_audit_event(
        db=db,
        action="Registro con Google" if is_new else "Inicio de Sesión con Google",
        target=f"Usuario #{user.id} ({user.email})",
        user_id=user.id,
        user_email=user.email,
        role=user.role,
        severity="Info",
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_in: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/verify-pin")
async def verify_pin(
    pin_in: PinVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stored = current_user.security_pin
    # Compatibilidad con filas legacy en texto plano: al validar, se re-hashea (migración perezosa)
    if verify_pin_hash(pin_in.pin, stored):
        if stored and not is_pin_hashed(stored):
            current_user.security_pin = hash_pin(pin_in.pin)
            await db.commit()
        return {"valid": True, "message": "PIN verificado correctamente"}
    raise HTTPException(status_code=400, detail="PIN de seguridad inválido")
