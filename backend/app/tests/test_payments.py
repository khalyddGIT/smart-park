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
    assert data["paypal_configured"] is True
    assert data["paypal_mode"] == "sandbox"
    assert data["paypal_client_id"] == settings.PAYPAL_CLIENT_ID

def test_paypal_access_token_generation():
    token = get_paypal_access_token()
    assert isinstance(token, str)
    assert len(token) > 20
