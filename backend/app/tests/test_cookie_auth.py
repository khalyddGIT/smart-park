import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_register_and_login_set_httponly_cookie():
    email = f"cookie_user_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Registro
        reg_resp = await ac.post("/api/v1/auth/register", json={
            "full_name": "Cookie Tester",
            "email": email,
            "phone": "+51 900 111 222",
            "password": password,
            "role": "user"
        })
        assert reg_resp.status_code == 201
        assert "access_token" in reg_resp.cookies
        # Verificar flag HttpOnly en header Set-Cookie
        set_cookie_header = reg_resp.headers.get("set-cookie", "").lower()
        assert "httponly" in set_cookie_header
        assert "samesite=lax" in set_cookie_header

        # 2. Login
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        assert login_resp.status_code == 200
        assert "access_token" in login_resp.cookies
        login_cookie_header = login_resp.headers.get("set-cookie", "").lower()
        assert "httponly" in login_cookie_header

@pytest.mark.asyncio
async def test_auth_me_via_cookie_only():
    email = f"cookie_me_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_resp = await ac.post("/api/v1/auth/register", json={
            "full_name": "Cookie Me Tester",
            "email": email,
            "phone": "+51 900 222 333",
            "password": password,
            "role": "user"
        })
        assert login_resp.status_code == 201
        token = login_resp.json()["access_token"]

    # Nueva sesión HTTP cliente sin Authorization header, enviando únicamente la cookie
    async with AsyncClient(transport=transport, base_url="http://test", cookies={"access_token": token}) as ac:
        me_resp = await ac.get("/api/v1/auth/me")
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == email
        assert data["full_name"] == "Cookie Me Tester"

@pytest.mark.asyncio
async def test_auth_me_via_bearer_header_still_works():
    email = f"bearer_me_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_resp = await ac.post("/api/v1/auth/register", json={
            "full_name": "Bearer Me Tester",
            "email": email,
            "phone": "+51 900 333 444",
            "password": password,
            "role": "user"
        })
        assert login_resp.status_code == 201
        token = login_resp.json()["access_token"]

    # Petición enviando únicamente el encabezado Bearer (sin cookies)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        me_resp = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == email

@pytest.mark.asyncio
async def test_logout_clears_cookie():
    email = f"logout_cookie_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg_resp = await ac.post("/api/v1/auth/register", json={
            "full_name": "Logout Tester",
            "email": email,
            "phone": "+51 900 444 555",
            "password": password,
            "role": "user"
        })
        assert reg_resp.status_code == 201
        token = reg_resp.json()["access_token"]

        # Logout enviando la cookie
        logout_resp = await ac.post("/api/v1/auth/logout", cookies={"access_token": token})
        assert logout_resp.status_code == 200
        set_cookie = logout_resp.headers.get("set-cookie", "")
        # En la respuesta de logout la cookie debe borrarse (max-age=0 o fecha pasada)
        assert "max-age=0" in set_cookie.lower() or 'access_token=""' in set_cookie or "expires=" in set_cookie.lower()
