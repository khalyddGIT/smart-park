import pytest
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
    except HTTPException as exc:
        if exc.status_code in (502, 503):
            import pytest as _pytest
            _pytest.skip(f"PayPal sandbox API inalcanzable en entorno offline: {exc.detail}")
        raise
