import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func
from sqlalchemy.future import select

from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.models import User


@pytest.mark.asyncio
async def test_superadmin_login_repairs_role_and_protects_primary_account():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(func.lower(User.email) == "superadmin@smartpark.com")
        )
        superadmin = result.scalars().one()
        superadmin.role = "user"
        superadmin.is_active = True
        await session.commit()
        superadmin_id = superadmin.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "superadmin@smartpark.com",
                "password": "SmartParkSuperAdmin2026!",
            },
        )
        assert login.status_code == 200, login.text
        assert login.json()["user"]["role"] == "platform"
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        demote = await client.put(
            f"/api/v1/users/{superadmin_id}/role",
            json={"role": "user"},
            headers=headers,
        )
        assert demote.status_code == 400

        generic_role_bypass = await client.put(
            f"/api/v1/users/{superadmin_id}",
            json={"role": "user"},
            headers=headers,
        )
        assert generic_role_bypass.status_code == 200
        assert generic_role_bypass.json()["role"] == "platform"

        disable = await client.put(
            f"/api/v1/users/{superadmin_id}",
            json={"is_active": False},
            headers=headers,
        )
        assert disable.status_code == 400

        delete = await client.delete(f"/api/v1/users/{superadmin_id}", headers=headers)
        assert delete.status_code == 400


@pytest.mark.asyncio
async def test_public_registration_cannot_choose_privileged_role(monkeypatch):
    import app.api.v1.auth as auth_module

    monkeypatch.setattr(auth_module, "is_testing", False)
    email = f"role-escalation-{uuid.uuid4().hex[:8]}@smartpark.pe"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Intento Escalada",
                "email": email,
                "phone": "987654321",
                "password": "SecurePassword2026!",
                "role": "platform",
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["user"]["role"] == "user"

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        created = result.scalars().first()
        if created:
            await session.delete(created)
            await session.commit()
