"""
Tests de regresión de seguridad para la API de Smart-Park.
Verifican que los routers sensibles exijan autenticación y roles adecuados.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _login_and_get_token(email: str, password: str, full_name: str = "Test") -> str:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password, "full_name": full_name},
        )
    assert r.status_code == 200, f"Login falló para {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------
# Routers administrativos: sin token deben rechazar (401)
# ---------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/users"),
    ("POST", "/api/v1/users"),
    ("GET", "/api/v1/staff"),
    ("POST", "/api/v1/parkings"),
    ("DELETE", "/api/v1/parkings/1"),
    ("PUT", "/api/v1/parkings/1"),
    ("POST", "/api/v1/parkings/1/floor-plan/sync"),
    ("GET", "/api/v1/vehicles/999999"),
    ("GET", "/api/v1/reservations/999999"),
])
async def test_protected_endpoints_reject_anonymous(method, path):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.request(method, path, json={})
    assert r.status_code == 401, f"{method} {path} debería exigir token"


# ---------------------------------------------------------------
# Escalada de privilegios: conductor NO puede usar router /users
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_driver_cannot_access_users_router():
    email = f"driver_{uuid.uuid4().hex[:8]}@smartpark.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r_reg = await ac.post("/api/v1/auth/register", json={
            "full_name": "Conductor Test", "email": email,
            "phone": "+51 900 000 001", "password": "S3gura!2026",
        })
        assert r_reg.status_code == 201
        token = r_reg.json()["access_token"]

        r = await ac.get("/api/v1/users", headers=_auth_header(token))
    assert r.status_code == 403, "Un conductor no debe listar usuarios del directorio global"


# ---------------------------------------------------------------
# Super Admin SÍ puede gestionar el directorio de usuarios
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_platform_admin_can_list_users():
    token = await _login_and_get_token("superadmin@smartpark.com", "SmartParkSuperAdmin2026!")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/v1/users", headers=_auth_header(token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------------------------------------------------------------
# Google OAuth: fail-closed sin client_id configurado
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_google_login_fails_closed_without_client_id(monkeypatch):
    import app.api.v1.auth as auth_module
    monkeypatch.setattr(auth_module, "GOOGLE_CLIENT_ID", "")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Intento de suplantación: enviar solo el email de un superadmin sin token válido
        r = await ac.post("/api/v1/auth/google", json={
            "token": "", "email": "superadmin@smartpark.com", "name": "Atacante",
        })
    assert r.status_code == 503, "Sin GOOGLE_CLIENT_ID el endpoint debe rechazar siempre"
