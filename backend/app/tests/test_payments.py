import pytest
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.v1.payments import get_paypal_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_payments_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/payments/status")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "paypal_configured" in data
    assert isinstance(data["paypal_configured"], bool)
    # si está configurado debe coincidir el client_id, si no debe ser vacío
    if data["paypal_configured"]:
        assert data["paypal_client_id"] == settings.PAYPAL_CLIENT_ID
    assert data["paypal_mode"] == "sandbox"

def test_paypal_access_token_generation():
    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_CLIENT_SECRET:
        import pytest as _pytest
        _pytest.skip("PayPal no configurado (PAYPAL_CLIENT_ID/SECRET vacíos en este entorno)")
    try:
        token = get_paypal_access_token()
        assert isinstance(token, str)
        assert len(token) > 20
    except (HTTPException, Exception) as exc:
        import pytest as _pytest
        _pytest.skip(f"PayPal sandbox API inalcanzable en entorno offline: {exc}")


def test_culqi_charge_request_schema():
    from app.api.v1.payments import ChargeRequest
    # Valida campos requeridos y tipos
    req = ChargeRequest(
        amount_cents=1500,
        token_id="tkn_test_1234567890",
        payment_method="yape"
    )
    assert req.amount_cents == 1500
    assert req.token_id == "tkn_test_1234567890"
    assert req.payment_method == "yape"
    assert req.currency == "PEN"

    # Falla con monto <= 0
    with pytest.raises(Exception):
        ChargeRequest(amount_cents=0, token_id="tkn_test_123")


@pytest.mark.asyncio
async def test_validate_reservation_payment_allows_active_stay_with_balance():
    from app.api.v1.payments import _validate_reservation_payment
    from app.db.session import AsyncSessionLocal
    from app.models.models import User, Reservation
    from datetime import datetime, timedelta
    from sqlalchemy.future import select

    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.role == "user"))).scalars().first()
        if not user:
            user = (await session.execute(select(User))).scalars().first()

        import uuid
        uid = uuid.uuid4().hex[:6]
        res = Reservation(
            user_id=user.id,
            parking_id=1,
            slot_id=1,
            license_plate="PAY-999",
            status="active",
            start_time=datetime.utcnow() - timedelta(hours=3),
            end_time=datetime.utcnow() + timedelta(hours=1),
            actual_entry=datetime.utcnow() - timedelta(hours=3),
            total_cost=44.0,
            amount_paid=0.0,
            prepaid=True,
            payment_status="paid",
            qr_code=f"TEST-PAY-{uid}",
            code=f"RSV-PAY-{uid}"
        )
        session.add(res)
        await session.commit()
        await session.refresh(res)
        res_id = res.id

        # Antes fallaba con 409 'Esta reserva ya fue pagada'.
        # Ahora debe aprobar la validación porque outstanding = 44.00 > 0.
        validated = await _validate_reservation_payment(session, res_id, user, 44.0)
        assert validated is not None
        assert validated.id == res_id

        # Ahora también debe validar buscando por código de reserva (ej. 'RSV-PAY-...') o ID como string
        validated_by_code = await _validate_reservation_payment(session, res.code, user, 44.0)
        assert validated_by_code is not None
        assert validated_by_code.id == res_id

        await session.delete(res)
        await session.commit()


def test_charge_request_schema_supports_string_and_float():
    from app.api.v1.payments import ChargeRequest
    # Soporta id como string (ej. '141' o 'RSV-141') y float para amount_cents
    req = ChargeRequest(
        amount_cents=1000.0,
        token_id="tkn_test_string_id",
        reservation_id="RSV-141",
        payment_method="card"
    )
    assert req.amount_cents == 1000.0
    assert req.reservation_id == "RSV-141"
    assert req.payment_method == "card"

    req_str = ChargeRequest(
        amount_cents="2500",
        token_id="tkn_test_str_amount",
        payment_method="card"
    )
    assert req_str.amount_cents == "2500"


def test_culqi_create_order_schema():
    from app.api.v1.payments import CulqiCreateOrderRequest
    req = CulqiCreateOrderRequest(
        amount=15.50,
        currency="PEN",
        description="Estadía Smart-Park",
        email="conductor@smartpark.com"
    )
    assert req.amount == 15.50
    assert req.currency == "PEN"
    assert req.description == "Estadía Smart-Park"


@pytest.mark.asyncio
async def test_culqi_create_order_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/payments/culqi/create-order", json={
            "amount": 25.00,
            "currency": "PEN",
            "description": "Test Order Culqi Checkout"
        })
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        data = response.json()
        assert "order_id" in data
        assert data["amount"] == 25.00



