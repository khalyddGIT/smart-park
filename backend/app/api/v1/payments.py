"""Pagos Culqi - proxy seguro al API de Culqi (v2).

El secreto CULQI_SECRET_KEY vive solo en el servidor (variable de entorno).
El frontend tokeniza con la llave publica pk_* y envia el token al backend,
que hace el charge real contra https://api.culqi.com/v2/charges.
"""
import os
import requests
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.security import get_current_user
from app.models.models import User

router = APIRouter(prefix="/payments", tags=["Pagos Culqi"])

CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"


class ChargeRequest(BaseModel):
    amount_cents: int = Field(..., gt=0, description="Monto en centimos, ej 1000 = S/ 10.00")
    currency: str = Field(default="PEN", description="Codigo de moneda")
    token_id: str = Field(..., min_length=1, description="Token tkn_test_... obtenido con Culqi.js")
    description: str = Field(default="Reserva Smart Park", max_length=200)
    reservation_id: Optional[int] = None
    email: Optional[str] = None


class StatusResponse(BaseModel):
    configured: bool
    environment: str
    message: str


@router.get("/status", response_model=StatusResponse)
async def payments_status():
    """Estado honesto de Culqi: no expone el secreto, solo si esta configurado."""
    configured = bool(settings.CULQI_SECRET_KEY and settings.CULQI_SECRET_KEY.strip())
    env = "production" if configured else "sandbox"
    # Si no hay secreto, el cobro real no esta disponible
    msg = (
        "Cobro Culqi habilitado en el servidor."
        if configured
        else "Configuracion de Culqi gestionada en el servidor - contacta al administrador. CULQI_SECRET_KEY no configurado: los cobros no se procesaran."
    )
    return StatusResponse(configured=configured, environment=env, message=msg)


@router.post("/charge")
async def create_charge(
    body: ChargeRequest,
    current_user: User = Depends(get_current_user),
):
    """Cobra un token Culqi contra la API real de Culqi."""
    # Validaciones basicas
    if body.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if not body.token_id or not body.token_id.strip():
        raise HTTPException(status_code=400, detail="token_id es obligatorio")

    secret = settings.CULQI_SECRET_KEY.strip() if settings.CULQI_SECRET_KEY else ""
    if not secret:
        # 503 honesto: no inventar exito
        raise HTTPException(
            status_code=503,
            detail="El cobro no esta configurado en el servidor (CULQI_SECRET_KEY no definido). La reserva queda pendiente y no se realizo ningun cargo. Contacta al administrador para habilitar Culqi en Railway.",
        )

    # Normalizar moneda
    currency_code = body.currency.upper() if body.currency else "PEN"
    if currency_code not in ("PEN", "USD"):
        currency_code = "PEN"

    email = (body.email or current_user.email or "conductor@smartpark.com").strip()

    # Payload para Culqi charges
    culqi_payload = {
        "amount": body.amount_cents,
        "currency_code": currency_code,
        "email": email,
        "source_id": body.token_id.strip(),
        "description": body.description[:80],
        "antifraud_details": {
            "address": "Av. Javier Prado 123",
            "address_city": "Lima",
            "country_code": "PE",
            "first_name": (current_user.full_name or "Smart Park")[:50],
            "last_name": "Cliente",
            "phone_number": getattr(current_user, "phone", "") or "999999999",
        },
    }

    headers = {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }

    try:
        # Llamada sincrona a Culqi (requests ya esta en requirements)
        resp = requests.post(CULQI_CHARGES_URL, json=culqi_payload, headers=headers, timeout=15)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error de conexion con Culqi: {exc}")

    # Intentar parsear JSON siempre
    try:
        data = resp.json()
    except Exception:
        data = {"object": "error", "user_message": resp.text[:500]}

    # Culqi exito: 201 y outcome.type == venta_exitosa
    if resp.status_code in (200, 201):
        outcome = data.get("outcome", {}) if isinstance(data, dict) else {}
        # Algunos charges vienen con outcome.type == venta_exitosa
        if outcome.get("type") == "venta_exitosa" or data.get("outcome") is None and resp.status_code == 201:
            return data
        # Si vino 200/201 pero outcome no es exito, tratarlo como declinado y propagar mensaje
        if outcome.get("type") != "venta_exitosa" and outcome:
            raise HTTPException(
                status_code=402,
                detail=data.get("user_message") or outcome.get("user_message") or data.get("merchant_message") or "Pago rechazado por Culqi",
            )
        return data

    # Errores de Culqi: mapear status y mensaje
    # 400/401/402 etc. Culqi devuelve user_message / merchant_message
    detail = (
        data.get("user_message")
        or data.get("merchant_message")
        or data.get("message")
        or f"Error Culqi ({resp.status_code}): {str(data)[:400]}"
    )
    # Mapear a status HTTP apropiado
    if resp.status_code == 401:
        raise HTTPException(status_code=502, detail=f"Culqi autentificacion fallida (revisa CULQI_SECRET_KEY): {detail}")
    if resp.status_code in (400, 402):
        raise HTTPException(status_code=402, detail=detail)
    raise HTTPException(status_code=resp.status_code if 400 <= resp.status_code < 600 else 502, detail=detail)
