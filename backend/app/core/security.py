from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.db.session import get_db

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback para hashes bcrypt antiguos con password largo truncado
        try:
            if len(plain_password.encode('utf-8')) > 72:
                plain_password = plain_password[:72]
            return pwd_context.verify(plain_password, hashed_password)
        except:
            return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def hash_pin(pin: str) -> str:
    """Hashea un PIN de seguridad para almacenamiento."""
    return pwd_context.hash(pin)

def verify_pin_hash(plain_pin: str, stored_pin: str) -> bool:
    """
    Verifica un PIN contra su valor almacenado.
    Soporta filas legacy con PIN en texto plano (comparación timing-safe)
    para permitir migración perezosa a hashes.
    """
    if not stored_pin:
        return False
    if stored_pin.startswith(("pbkdf2_sha256$", "bcrypt$", "$2")):
        try:
            return pwd_context.verify(plain_pin, stored_pin)
        except Exception:
            return False
    # Legacy en texto plano
    import hmac
    return hmac.compare_digest(stored_pin.encode("utf-8"), plain_pin.encode("utf-8"))

def is_pin_hashed(stored_pin: str) -> bool:
    return bool(stored_pin) and stored_pin.startswith(("pbkdf2_sha256$", "bcrypt$", "$2"))

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    import uuid
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # jti: identificador único del token, permite revocarlo (blacklist en Redis) al hacer logout
    to_encode = {"exp": expire, "sub": str(subject), "jti": str(uuid.uuid4())}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")

    # Logout real: si el jti del token fue revocado, rechazar (fail-open sin Redis)
    jti = payload.get("jti")
    if jti:
        from app.core.cache import is_blacklisted
        if await is_blacklisted(jti):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revocado: la sesión fue cerrada")

    # Import here to avoid circular
    from app.models.models import User
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta desactivada")
    return user

def require_role(*allowed_roles: str):
    """
    Fábrica de dependencia: exige usuario autenticado con uno de los roles indicados.
    Uso:  current_user: User = Depends(require_role("local", "platform"))
    """
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )
        return current_user
    return role_checker
