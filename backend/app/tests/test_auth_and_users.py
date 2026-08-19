import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

async def test_auth_registration_and_login(client: AsyncClient):
    import time
    unique_email = f"user_{int(time.time()*1000)}@smartpark.com"
    
    # 1. Registro
    reg_response = await client.post("/api/v1/auth/register", json={
        "full_name": "Juan Perez",
        "email": unique_email,
        "phone": "+51 987654321",
        "password": "securepassword123",
        "role": "user"
    })
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert reg_data["user"]["role"] == "user"

    # 2. Login con credenciales correctas
    login_response = await client.post("/api/v1/auth/login", json={
        "full_name": "Juan Perez",
        "email": unique_email,
        "password": "securepassword123"
    })
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data

    # 3. Login con contraseña incorrecta
    bad_login = await client.post("/api/v1/auth/login", json={
        "full_name": "Juan Perez",
        "email": unique_email,
        "password": "wrongpassword"
    })
    assert bad_login.status_code == 401

async def test_pin_verification(client: AsyncClient):
    # PIN válido
    res_valid = await client.post("/api/v1/auth/verify-pin", json={"pin": "1234"})
    assert res_valid.status_code == 200
    assert res_valid.json()["valid"] is True

    # PIN inválido (menos de 4 caracteres o incorrecto)
    res_invalid = await client.post("/api/v1/auth/verify-pin", json={"pin": "12"})
    assert res_invalid.status_code == 400

async def test_users_list_and_roles(client: AsyncClient):
    res = await client.get("/api/v1/users")
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) > 0
