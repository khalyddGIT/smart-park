import os
from pydantic import BaseModel
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserResponse, Token, PinVerify
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

class GoogleLoginRequest(BaseModel):
    token: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
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
        security_pin="1234" # PIN por defecto para prueba
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    access_token = create_access_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=Token)
async def login_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email
    name = payload.name
    
    # Si se envía un token de Google real y GOOGLE_CLIENT_ID está configurado, verificarlo
    if payload.token and GOOGLE_CLIENT_ID:
        try:
            idinfo = id_token.verify_oauth2_token(
                payload.token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            email = idinfo.get("email", email)
            name = idinfo.get("name", name)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Token de Google inválido: {str(e)}")

    if not email:
        raise HTTPException(status_code=400, detail="Correo electrónico no proporcionado por Google")

    # Buscar usuario o registrarlo automáticamente
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        user = User(
            full_name=name or email.split("@")[0],
            email=email,
            phone="+51 900 000 000",
            hashed_password=get_password_hash("GOOGLE_OAUTH_ACCOUNT"),
            role="user",
            security_pin="1234"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/verify-pin")
async def verify_pin(
    pin_in: PinVerify,
    current_user: User = Depends(get_current_user)
):
    if current_user.security_pin == pin_in.pin:
        return {"valid": True, "message": "PIN verificado correctamente"}
    raise HTTPException(status_code=400, detail="PIN de seguridad inválido")
