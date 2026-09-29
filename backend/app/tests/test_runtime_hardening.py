import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main_runtime import app


@pytest.mark.asyncio
async def test_runtime_rejects_untrusted_host_and_exposes_real_readiness():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://evil.example") as client:
        rejected = await client.get("/health/live")
        assert rejected.status_code == 400

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        ready = await client.get("/health/ready")
        assert ready.status_code == 200
        assert ready.json()["status"] == "ready"
        assert ready.headers.get("x-request-id")

    async with AsyncClient(
        transport=transport,
        base_url="http://healthcheck.railway.app",
    ) as client:
        railway_probe = await client.get("/health/live")
        assert railway_probe.status_code == 200


@pytest.mark.asyncio
async def test_cookie_authenticated_browser_mutations_require_csrf_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        email = f"csrf_{uuid.uuid4().hex[:10]}@smartpark.com"
        registered = await client.post(
            "/api/v1/auth/register",
            headers={"Origin": "http://localhost:5173"},
            json={
                "full_name": "CSRF Test",
                "email": email,
                "phone": "+51 988 222 333",
                "password": "SecurePassword123!",
                "role": "user",
            },
        )
        assert registered.status_code == 201, registered.text
        csrf_token = client.cookies.get("csrf_token")
        assert csrf_token
        assert client.cookies.get("access_token")

        rejected = await client.put(
            "/api/v1/auth/profile",
            headers={"Origin": "http://localhost:5173"},
            json={"full_name": "Blocked mutation"},
        )
        assert rejected.status_code == 403

        accepted = await client.put(
            "/api/v1/auth/profile",
            headers={
                "Origin": "http://localhost:5173",
                "X-CSRF-Token": csrf_token,
            },
            json={"full_name": "Allowed mutation"},
        )
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["full_name"] == "Allowed mutation"

        fake_image = await client.post(
            "/api/v1/vehicles/upload-image",
            headers={
                "Origin": "http://localhost:5173",
                "X-CSRF-Token": csrf_token,
            },
            files={"file": ("attack.png", b"<script>alert(1)</script>", "image/png")},
        )
        assert fake_image.status_code == 400
        assert "imagen válida" in fake_image.json()["detail"]
