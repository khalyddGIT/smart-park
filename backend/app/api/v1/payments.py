"""Pagos Culqi y PayPal - proxy seguro a APIs oficiales (Culqi v2 y PayPal REST v2).

Los secretos (CULQI_SECRET_KEY, PAYPAL_CLIENT_SECRET) viven exclusivamente en el servidor.
El frontend solo utiliza la llave publica de Culqi y el Client ID de PayPal.
"""
import base64
import os
import requests
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, Payment

router = APIRouter(prefix="/payments", tags=["Pagos Culqi & PayPal"])

CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"


# --- Schemas ---

class ChargeRequest(BaseModel):
    amount_cents: int = Field(..., gt=0, description="Monto en centimos, ej 1000 = S/ 10.00")
    currency: str = Field(default="PEN", description="Codigo de moneda")
    token_id: str = Field(..., min_length=1, description="Token tkn_test_... obtenido con Culqi.js")
    description: str = Field(default="Reserva Smart Park", max_length=200)
    reservation_id: Optional[int] = None
    email: Optional[str] = None


class PayPalCreateOrderRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Monto en Soles PEN (ej. 10.00)")
    currency: str = Field(default="PEN", description="Moneda de origen")
    reservation_id: Optional[int] = None
    description: Optional[str] = Field(default="Reserva de Estacionamiento Smart-Park", max_length=200)


class PayPalCaptureOrderRequest(BaseModel):
    order_id: str = Field(..., min_length=1, description="ID de orden aprobado por PayPal")
    reservation_id: Optional[int] = None
    amount_pen: Optional[float] = None
    description: Optional[str] = None


class StatusResponse(BaseModel):
    configured: bool
    culqi_configured: bool
    paypal_configured: bool
    paypal_client_id: str
    paypal_mode: str
    exchange_rate: float
    environment: str
    message: str


# --- PayPal Helpers ---

def get_paypal_access_token() -> str:
    """Obtiene un token OAuth2 Bearer de PayPal usando Basic Auth con Client ID y Secret."""
    client_id = (settings.PAYPAL_CLIENT_ID or "").strip()
    client_secret = (settings.PAYPAL_CLIENT_SECRET or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail="PayPal no está configurado en el servidor (PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET ausente)."
        )

    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    url = f"{settings.PAYPAL_API_BASE_URL}/v1/oauth2/token"

    try:
        resp = requests.post(
            url,
            data={"grant_type": "client_credentials"},
            headers={
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=10
        )
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error de conexión con PayPal OAuth: {exc}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Fallo en autenticación con PayPal ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="PayPal no devolvió un access_token válido.")
    return token


# --- Endpoints ---

@router.get("/status", response_model=StatusResponse)
async def payments_status():
    """Estado honesto de las pasarelas (Culqi y PayPal): no expone secretos."""
    culqi_ok = bool(settings.CULQI_SECRET_KEY and settings.CULQI_SECRET_KEY.strip())
    paypal_ok = bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)
    env = settings.PAYPAL_MODE if paypal_ok else ("production" if culqi_ok else "sandbox")
    
    if culqi_ok and paypal_ok:
        msg = f"Pasarelas Culqi y PayPal ({settings.PAYPAL_MODE.upper()}) habilitadas en el servidor."
    elif paypal_ok:
        msg = f"PayPal ({settings.PAYPAL_MODE.upper()}) habilitado en el servidor con Client ID verificado."
    elif culqi_ok:
        msg = "Cobro Culqi habilitado en el servidor."
    else:
        msg = "Configuración de pagos gestionada en el servidor - credenciales no detectadas."

    return StatusResponse(
        configured=culqi_ok or paypal_ok,
        culqi_configured=culqi_ok,
        paypal_configured=paypal_ok,
        paypal_client_id=settings.PAYPAL_CLIENT_ID or "",
        paypal_mode=settings.PAYPAL_MODE,
        exchange_rate=settings.PAYPAL_EXCHANGE_RATE_PEN_TO_USD,
        environment=env,
        message=msg
    )


# --- Culqi Charge Endpoint ---

@router.post("/charge")
async def create_charge(
    body: ChargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cobra un token Culqi contra la API real de Culqi y persiste el pago."""
    if body.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if not body.token_id or not body.token_id.strip():
        raise HTTPException(status_code=400, detail="token_id es obligatorio")

    secret = settings.CULQI_SECRET_KEY.strip() if settings.CULQI_SECRET_KEY else ""
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="El cobro Culqi no está configurado en el servidor (CULQI_SECRET_KEY no definido).",
        )

    currency_code = body.currency.upper() if body.currency else "PEN"
    if currency_code not in ("PEN", "USD"):
        currency_code = "PEN"

    email = (body.email or current_user.email or "conductor@smartpark.com").strip()

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
        resp = requests.post(CULQI_CHARGES_URL, json=culqi_payload, headers=headers, timeout=15)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error de conexion con Culqi: {exc}")

    try:
        data = resp.json()
    except Exception:
        data = {"object": "error", "user_message": resp.text[:500]}

    if resp.status_code in (200, 201):
        outcome = data.get("outcome", {}) if isinstance(data, dict) else {}
        if outcome.get("type") == "venta_exitosa" or (data.get("outcome") is None and resp.status_code == 201):
            payment = Payment(
                reservation_id=body.reservation_id,
                user_id=current_user.id,
                amount_cents=body.amount_cents,
                currency=currency_code,
                status="succeeded",
                method="card",
                culqi_charge_id=str(data.get("id", ""))[:100] if isinstance(data, dict) else None,
                description=body.description[:200],
            )
            db.add(payment)
            await db.commit()
            await db.refresh(payment)
            if isinstance(data, dict):
                data["payment_id"] = payment.id
                data["reservation_paid"] = bool(body.reservation_id)
            return data
        if outcome.get("type") != "venta_exitosa" and outcome:
            raise HTTPException(
                status_code=402,
                detail=data.get("user_message") or outcome.get("user_message") or data.get("merchant_message") or "Pago rechazado por Culqi",
            )
        return data

    detail = (
        data.get("user_message")
        or data.get("merchant_message")
        or data.get("message")
        or f"Error Culqi ({resp.status_code}): {str(data)[:400]}"
    )
    if resp.status_code == 401:
        raise HTTPException(status_code=502, detail=f"Culqi autenticación fallida: {detail}")
    if resp.status_code in (400, 402):
        raise HTTPException(status_code=402, detail=detail)
    raise HTTPException(status_code=resp.status_code if 400 <= resp.status_code < 600 else 502, detail=detail)


# --- PayPal Endpoints ---

@router.post("/paypal/create-order")
async def create_paypal_order(
    body: PayPalCreateOrderRequest,
    current_user: User = Depends(get_current_user),
):
    """Crea una orden de pago en PayPal REST API (v2) con conversión transparente PEN -> USD."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    token = get_paypal_access_token()

    # Conversión PEN -> USD para la orden de PayPal
    rate = settings.PAYPAL_EXCHANGE_RATE_PEN_TO_USD
    amount_usd = max(0.50, round(body.amount * rate, 2))
    ref_id = f"SPK-RSV-{body.reservation_id or int(datetime.utcnow().timestamp())}"

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": ref_id,
                "description": (body.description or "Reserva Smart-Park")[:127],
                "amount": {
                    "currency_code": "USD",
                    "value": f"{amount_usd:.2f}",
                    "breakdown": {
                        "item_total": {
                            "currency_code": "USD",
                            "value": f"{amount_usd:.2f}"
                        }
                    }
                },
                "items": [
                    {
                        "name": (body.description or "Reserva Estacionamiento")[:127],
                        "description": f"S/ {body.amount:.2f} PEN convertido a USD",
                        "unit_amount": {
                            "currency_code": "USD",
                            "value": f"{amount_usd:.2f}"
                        },
                        "quantity": "1",
                        "category": "DIGITAL_GOODS"
                    }
                ]
            }
        ],
        "application_context": {
            "brand_name": "Smart-Park Ayacucho",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "return_url": "https://smart-park-web-production.up.railway.app/payment-success",
            "cancel_url": "https://smart-park-web-production.up.railway.app/payment-cancel"
        }
    }

    url = f"{settings.PAYPAL_API_BASE_URL}/v2/checkout/orders"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(url, json=order_payload, headers=headers, timeout=15)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error de conexión con PayPal Orders API: {exc}")

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"PayPal no pudo crear la orden ({resp.status_code}): {resp.text[:300]}"
        )

    data = resp.json()
    order_id = data.get("id")
    if not order_id:
        raise HTTPException(status_code=502, detail="PayPal no devolvió un ID de orden válido.")

    return {
        "order_id": order_id,
        "status": data.get("status", "CREATED"),
        "amount_pen": body.amount,
        "amount_usd": amount_usd,
        "exchange_rate": rate,
        "currency": "USD",
        "links": data.get("links", [])
    }


@router.post("/paypal/capture-order")
async def capture_paypal_order(
    body: PayPalCaptureOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Captura el pago de una orden de PayPal autorizada, valida la liquidación y persiste el registro."""
    if not body.order_id or not body.order_id.strip():
        raise HTTPException(status_code=400, detail="order_id es obligatorio")

    token = get_paypal_access_token()
    url = f"{settings.PAYPAL_API_BASE_URL}/v2/checkout/orders/{body.order_id.strip()}/capture"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(url, json={}, headers=headers, timeout=15)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error de conexión al capturar pago en PayPal: {exc}")

    try:
        data = resp.json()
    except Exception:
        data = {"status": "ERROR", "message": resp.text[:500]}

    if resp.status_code not in (200, 201) or data.get("status") != "COMPLETED":
        err_msg = data.get("message") or data.get("details", [{}])[0].get("description") if isinstance(data.get("details"), list) and data.get("details") else None
        detail = err_msg or f"Error al capturar orden PayPal ({resp.status_code}): {str(data)[:300]}"
        raise HTTPException(status_code=402, detail=detail)

    # Extraer información de captura
    purchase_units = data.get("purchase_units", [])
    capture_info = {}
    if purchase_units and isinstance(purchase_units, list):
        payments = purchase_units[0].get("payments", {})
        captures = payments.get("captures", [])
        if captures and isinstance(captures, list):
            capture_info = captures[0]

    capture_id = capture_info.get("id") or data.get("id") or body.order_id
    amount_captured_usd = float(capture_info.get("amount", {}).get("value", 0.0) or 0.0)

    # Calcular monto en PEN y centavos para la base de datos
    if body.amount_pen and body.amount_pen > 0:
        amount_pen = round(body.amount_pen, 2)
    elif amount_captured_usd > 0 and settings.PAYPAL_EXCHANGE_RATE_PEN_TO_USD > 0:
        amount_pen = round(amount_captured_usd / settings.PAYPAL_EXCHANGE_RATE_PEN_TO_USD, 2)
    else:
        amount_pen = 10.00

    amount_cents = int(round(amount_pen * 100))

    # Payer Info
    payer = data.get("payer", {})
    payer_name_obj = payer.get("name", {})
    given_name = payer_name_obj.get("given_name", "")
    surname = payer_name_obj.get("surname", "")
    payer_name = f"{given_name} {surname}".strip() or current_user.full_name or "Usuario PayPal"
    payer_email = payer.get("email_address") or current_user.email or "conductor@smartpark.com"

    # Persistir en la base de datos
    payment = Payment(
        reservation_id=body.reservation_id,
        user_id=current_user.id,
        amount_cents=amount_cents,
        currency="PEN",
        status="succeeded",
        method="paypal",
        culqi_charge_id=f"PAYPAL-{capture_id}"[:100],
        description=(body.description or f"Pago PayPal Orden {body.order_id}")[:200],
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    formatted_invoice = f"B001-{payment.id:06d}"
    formatted_auth = f"PP-{str(capture_id)[-8:].upper()}"

    return {
        "status": "COMPLETED",
        "order_id": body.order_id,
        "capture_id": capture_id,
        "chargeId": f"PAYPAL-{capture_id}",
        "payment_id": payment.id,
        "amount": amount_pen,
        "amount_usd": amount_captured_usd or round(amount_pen * settings.PAYPAL_EXCHANGE_RATE_PEN_TO_USD, 2),
        "currency": "PEN",
        "currencySymbol": "S/",
        "method": "PayPal (Express Checkout)",
        "payer_name": payer_name,
        "payer_email": payer_email,
        "gateway": f"PAYPAL REST API ({settings.PAYPAL_MODE.upper()})",
        "date": datetime.now().strftime("%d/%m/%Y, %H:%M:%S"),
        "authorizationCode": formatted_auth,
        "invoiceNumber": formatted_invoice,
        "reservation_paid": bool(body.reservation_id),
        "raw": data
    }


# --- History Endpoint ---

@router.get("/my")
async def list_my_payments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historial de pagos del usuario autenticado (Culqi y PayPal)."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == current_user.id)
        .order_by(Payment.id.desc())
    )
    payments = result.scalars().all()
    return [
        {
            "id": p.id,
            "reservation_id": p.reservation_id,
            "amount": round(p.amount_cents / 100, 2),
            "amount_cents": p.amount_cents,
            "currency": p.currency,
            "status": p.status,
            "method": p.method,
            "culqi_charge_id": p.culqi_charge_id,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]
