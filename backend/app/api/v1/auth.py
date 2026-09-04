import os
from dotenv import load_dotenv
load_dotenv()
import secrets
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, PinVerify
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user, verify_pin_hash, is_pin_hashed, hash_pin
from app.core.cache import rate_limit_hit, blacklist_token

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Rate limit anti fuerza bruta en login: 5 intentos por minuto por IP (fail-open sin Redis)
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 60
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
async def register_user(user_in: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
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
async def login_user(user_in: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
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
            details={"email_intentado": user_in.email, "intentos": attempts},
        )
        raise HTTPException(status_code=429, detail="Demasiados intentos de inicio de sesión. Espera un minuto e inténtalo de nuevo.")

    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    from app.core.audit_service import record_audit_event

    if not user or not verify_password(user_in.password, user.hashed_password):
        await record_audit_event(
            db=db,
            action="Intento Fallido de Inicio de Sesión",
            target=f"Email: {user_in.email}",
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
    
    access_token = create_access_token(subject=user.id)
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


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(_bearer_auto)):
    """Logout real: revoca el token actual (blacklist en Redis hasta su expiración natural)."""
    token = credentials.credentials if credentials else ""
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
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna el usuario autenticado según JWT (fuente de verdad para rol)."""
    return UserResponse.model_validate(current_user)

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
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
