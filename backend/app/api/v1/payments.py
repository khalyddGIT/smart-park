"""Pagos Culqi y PayPal - proxy seguro a APIs oficiales (Culqi v2 y PayPal REST v2).

Los secretos (CULQI_SECRET_KEY, PAYPAL_CLIENT_SECRET) viven exclusivamente en el servidor.
El frontend solo utiliza la llave publica de Culqi y el Client ID de PayPal.
"""
import base64
import os
import requests
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, Payment, Reservation
from app.core.cache import rate_limit_hit, get_idempotency_record, save_idempotency_record
from app.core.realtime import realtime

router = APIRouter(prefix="/payments", tags=["Pagos Culqi & PayPal"])

CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"
_is_testing = (os.getenv("TESTING") == "1")
PAYMENT_RATE_LIMIT = 200 if _is_testing else 10
PAYMENT_RATE_WINDOW = 60



# --- Schemas ---

class ChargeRequest(BaseModel):
    amount_cents: int = Field(..., gt=0, description="Monto en centimos, ej 1000 = S/ 10.00")
    currency: str = Field(default="PEN", description="Codigo de moneda")
    token_id: str = Field(..., min_length=1, description="Token tkn_test_... obtenido con Culqi.js")
    description: str = Field(default="Reserva Smart Park", max_length=200)
    reservation_id: Optional[int] = None
    email: Optional[str] = None
    payment_method: Optional[str] = Field(default="card", description="Medio de pago: 'card' o 'yape'")



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
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cobra un token Culqi contra la API real de Culqi y persiste el pago con soporte de idempotencia."""
    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        cache_key = f"pay:{current_user.id}:{idempotency_key.strip()}"
        cached = await get_idempotency_record(cache_key)
        if cached:
            return JSONResponse(
                status_code=cached.get("status_code", 200),
                content=cached.get("body"),
                headers={"X-Cache-Lookup": "HIT", "Idempotency-Key": idempotency_key.strip()}
            )

    allowed, _ = await rate_limit_hit(f"ratelimit:pay:{current_user.id}", PAYMENT_RATE_LIMIT, PAYMENT_RATE_WINDOW)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas transacciones de pago seguidas. Por favor espera un momento.",
        )

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

    desc = (body.description or "Reserva Smart Park").strip()
    if len(desc) < 5:
        desc = "Reserva Smart Park"
    desc = desc[:80]

    raw_phone = getattr(current_user, "phone", "") or "999999999"
    clean_phone = "".join(filter(str.isdigit, str(raw_phone)))
    if len(clean_phone) < 6:
        clean_phone = "999999999"
    elif len(clean_phone) > 15:
        clean_phone = clean_phone[-9:]

    user_name_parts = (current_user.full_name or "Conductor").strip().split()
    first_name = user_name_parts[0][:50] if user_name_parts else "Conductor"
    last_name = " ".join(user_name_parts[1:])[:50] if len(user_name_parts) > 1 else "Cliente"

    culqi_payload = {
        "amount": body.amount_cents,
        "currency_code": currency_code,
        "email": email,
        "source_id": body.token_id.strip(),
        "description": desc,
        "antifraud_details": {
            "address": "Av. Javier Prado 123",
            "address_city": "Lima",
            "country_code": "PE",
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": clean_phone,
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
        if outcome.get("type") == "venta_exitosa" or (data.get("outcome") is None and resp.status_code in (200, 201)):
            src_info = data.get("source", {}) if isinstance(data, dict) and isinstance(data.get("source"), dict) else {}
            detected_method = (
                "yape" if (body.payment_method == "yape" or src_info.get("type") == "yape" or "yape" in str(data.get("description", "")).lower())
                else "card"
            )
            payment = Payment(
                reservation_id=body.reservation_id,
                user_id=current_user.id,
                amount_cents=body.amount_cents,
                currency=currency_code,
                status="succeeded",
                method=detected_method,
                culqi_charge_id=str(data.get("id", ""))[:100] if isinstance(data, dict) else None,
                description=desc,
            )
            db.add(payment)

            # Sincronizar pago en la reserva asociada
            if body.reservation_id:
                try:
                    res_query = await db.execute(select(Reservation).where(Reservation.id == body.reservation_id))
                    res_target = res_query.scalars().first()
                    if res_target:
                        paid_pen = round(body.amount_cents / 100.0, 2)
                        res_target.amount_paid = round((res_target.amount_paid or 0.0) + paid_pen, 2)
                        if res_target.amount_paid > (res_target.total_cost or 0.0):
                            res_target.total_cost = res_target.amount_paid
                        res_target.payment_method = detected_method
                        res_target.prepaid = True
                        try:
                            await realtime.broadcast("reservations:updated", {
                                "reservation_id": res_target.id,
                                "code": res_target.code,
                                "amount_paid": res_target.amount_paid,
                                "total_cost": res_target.total_cost,
                                "payment_method": detected_method,
                                "status": res_target.status,
                                "is_overtime": getattr(res_target, "is_overtime", False)
                            })
                        except Exception:
                            pass
                except Exception:
                    pass

            await db.commit()
            await db.refresh(payment)
            if isinstance(data, dict):
                data["payment_id"] = payment.id
                data["payment_method"] = detected_method
                data["reservation_paid"] = bool(body.reservation_id)
            if idempotency_key:
                cache_key = f"pay:{current_user.id}:{idempotency_key.strip()}"
                await save_idempotency_record(cache_key, 200, data if isinstance(data, dict) else {"payment_id": payment.id})
            return data
        if outcome.get("type") != "venta_exitosa" and outcome:
            user_msg = outcome.get("user_message") or data.get("user_message") or ""
            merchant_msg = outcome.get("merchant_message") or data.get("merchant_message") or ""
            if merchant_msg and merchant_msg != user_msg:
                detail_msg = f"{user_msg} — {merchant_msg}".strip(" —")
            else:
                detail_msg = user_msg or merchant_msg or "Pago no autorizado por la pasarela"
            raise HTTPException(
                status_code=402,
                detail=detail_msg,
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
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Crea una orden de pago en PayPal REST API (v2) con conversión transparente PEN -> USD e idempotencia."""
    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        cache_key = f"pp_ord:{current_user.id}:{idempotency_key.strip()}"
        cached = await get_idempotency_record(cache_key)
        if cached:
            return JSONResponse(
                status_code=cached.get("status_code", 200),
                content=cached.get("body"),
                headers={"X-Cache-Lookup": "HIT", "Idempotency-Key": idempotency_key.strip()}
            )

    allowed, _ = await rate_limit_hit(f"ratelimit:pay:{current_user.id}", PAYMENT_RATE_LIMIT, PAYMENT_RATE_WINDOW)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas transacciones de pago seguidas. Por favor espera un momento.",
        )

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

    result_payload = {
        "order_id": order_id,
        "status": data.get("status", "CREATED"),
        "amount_pen": body.amount,
        "amount_usd": amount_usd,
        "exchange_rate": rate,
        "currency": "USD",
        "links": data.get("links", [])
    }
    if idempotency_key:
        cache_key = f"pp_ord:{current_user.id}:{idempotency_key.strip()}"
        await save_idempotency_record(cache_key, 200, result_payload)
    return result_payload


@router.post("/paypal/capture-order")
async def capture_paypal_order(
    body: PayPalCaptureOrderRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Captura el pago de una orden de PayPal autorizada, valida la liquidación y persiste el registro con idempotencia."""
    if not body.order_id or not body.order_id.strip():
        raise HTTPException(status_code=400, detail="order_id es obligatorio")

    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key") or f"paypal:{body.order_id.strip()}"
    if idempotency_key:
        cache_key = f"pp_cap:{current_user.id}:{idempotency_key.strip()}"
        cached = await get_idempotency_record(cache_key)
        if cached:
            return JSONResponse(
                status_code=cached.get("status_code", 200),
                content=cached.get("body"),
                headers={"X-Cache-Lookup": "HIT", "Idempotency-Key": idempotency_key.strip()}
            )

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

    # Sincronizar pago en la reserva asociada
    if body.reservation_id:
        try:
            res_query = await db.execute(select(Reservation).where(Reservation.id == body.reservation_id))
            res_target = res_query.scalars().first()
            if res_target:
                res_target.amount_paid = round((res_target.amount_paid or 0.0) + amount_pen, 2)
                if res_target.amount_paid > (res_target.total_cost or 0.0):
                    res_target.total_cost = res_target.amount_paid
                res_target.payment_method = "paypal"
                res_target.prepaid = True
                try:
                    await realtime.broadcast("reservations:updated", {
                        "reservation_id": res_target.id,
                        "code": res_target.code,
                        "amount_paid": res_target.amount_paid,
                        "total_cost": res_target.total_cost,
                        "payment_method": "paypal",
                        "status": res_target.status,
                        "is_overtime": getattr(res_target, "is_overtime", False)
                    })
                except Exception:
                    pass
        except Exception:
            pass

    await db.commit()
    await db.refresh(payment)

    formatted_invoice = f"B001-{payment.id:06d}"
    formatted_auth = f"PP-{str(capture_id)[-8:].upper()}"

    ret_data = {
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
    if idempotency_key:
        cache_key = f"pp_cap:{current_user.id}:{idempotency_key.strip()}"
        await save_idempotency_record(cache_key, 200, ret_data)
    return ret_data


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


# --- Culqi Webhook Endpoint ---

@router.post("/culqi-webhook")
async def culqi_webhook_handler(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook receptor de eventos asíncronos de Culqi (ej. charge.creation.succeeded, order.status.changed).
    
    URL a registrar en el Panel de Culqi (Desarrollo / Producción):
    https://smart-park-web-production.up.railway.app/api/v1/payments/culqi-webhook
    Verifica firma HMAC X-Culqi-Signature y el cargo contra API Culqi antes de persistir.
    """
    import hmac, hashlib, json
    raw_body = await request.body()
    try:
        payload = json.loads(raw_body.decode() or "{}")
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    # Verificar firma HMAC si hay secreto configurado
    secret = (settings.CULQI_SECRET_KEY or "").strip()
    if secret:
        sig_header = request.headers.get("x-culqi-signature") or request.headers.get("X-Culqi-Signature") or ""
        if not sig_header:
            raise HTTPException(status_code=401, detail="Firma Culqi ausente")
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        # Culqi puede enviar hex o base64; comparar ambos formatos
        if not (hmac.compare_digest(expected, sig_header) or hmac.compare_digest(expected, sig_header.lower())):
            # también probar base64
            import base64 as _b64
            b64_expected = _b64.b64encode(bytes.fromhex(expected)).decode() if len(expected)==64 else ""
            if not hmac.compare_digest(b64_expected, sig_header):
                raise HTTPException(status_code=401, detail="Firma Culqi inválida")
    event_type = str(payload.get("type") or payload.get("object") or "")
    event_data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    
    # Manejar eventos de cargo exitoso
    if event_type in ("charge.creation.succeeded", "charge") or payload.get("object") == "charge":
        charge_id = event_data.get("id") or payload.get("id")
        amount_cents = int(event_data.get("amount") or payload.get("amount") or 0)
        currency = str(event_data.get("currency_code") or payload.get("currency_code") or "PEN").upper()
        email = event_data.get("email") or payload.get("email")
        
        if charge_id:
            # Verificar cargo contra API Culqi si hay secreto (evita amount spoofing)
            if secret:
                try:
                    import requests as _req
                    vr = _req.get(f"https://api.culqi.com/v2/charges/{charge_id}", headers={"Authorization": f"Bearer {secret}"}, timeout=6)
                    if vr.status_code == 200:
                        j = vr.json()
                        # Culqi puede envolver en {data: ...}
                        cj = j.get("data") if isinstance(j.get("data"), dict) else j
                        if str(cj.get("id")) == str(charge_id):
                            amount_cents = int(cj.get("amount") or amount_cents)
                            currency = str(cj.get("currency_code") or currency).upper()
                except Exception:
                    pass
            res = await db.execute(select(Payment).where(Payment.culqi_charge_id == str(charge_id)))
            existing_payment = res.scalars().first()
            if not existing_payment:
                # Requiere email válido de usuario existente (no fallback a admin id=1)
                if not email:
                    return {"received": True, "event": event_type, "ignored": "email ausente"}
                u_res = await db.execute(select(User).where(User.email == email))
                user = u_res.scalars().first()
                if not user:
                    return {"received": True, "event": event_type, "ignored": "usuario no encontrado"}
                user_id = user.id
                
                new_payment = Payment(
                    user_id=user_id,
                    amount_cents=amount_cents,
                    currency=currency,
                    status="succeeded",
                    method="card",
                    culqi_charge_id=str(charge_id),
                    description="Pago confirmado vía Webhook Culqi"
                )
                db.add(new_payment)
                await db.commit()
                
    return {"received": True, "event": event_type, "timestamp": datetime.utcnow().isoformat()}
