import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def _register_and_get_token(role: str = "user") -> tuple[str, str, int]:
    email = f"{role}_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/v1/auth/register", json={
            "full_name": f"Tester {role.capitalize()}",
            "email": email,
            "phone": "+51 988 111 222",
            "password": password,
            "role": role
        })
        assert r.status_code == 201, r.text
        data = r.json()
        token = data["access_token"]
        user_id = data["user"]["id"]
        return token, email, user_id

@pytest.mark.asyncio
async def test_incidents_lifecycle_and_rbac():
    user_token, user_email, user_id = await _register_and_get_token(role="user")
    admin_token, admin_email, admin_id = await _register_and_get_token(role="local")
    other_user_token, _, other_user_id = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    other_user_headers = {"Authorization": f"Bearer {other_user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Incidencias Huamanga",
            "address": "Jr. 28 de Julio 123",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 15,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        parking_id = p_resp.json()["id"]

        inc_resp = await ac.post("/api/v1/incidents", headers=user_headers, json={
            "parking_id": parking_id,
            "category": "cajon_bloqueado",
            "description": "Vehiculo placa ABC-123 obstruye la plaza A-02 sin ticket activo.",
            "photo_url": "data:image/jpeg;base64,/9j/fakephotoevidence"
        })
        assert inc_resp.status_code == 201, inc_resp.text
        incident = inc_resp.json()
        incident_id = incident["id"]
        assert incident["status"] == "reported"
        assert incident["category"] == "cajon_bloqueado"
        assert incident["parking_id"] == parking_id
        assert incident["user_id"] == user_id

        my_incs = await ac.get("/api/v1/incidents", headers=user_headers)
        assert my_incs.status_code == 200
        user_inc_ids = [i["id"] for i in my_incs.json()]
        assert incident_id in user_inc_ids

        other_incs = await ac.get("/api/v1/incidents", headers=other_user_headers)
        assert other_incs.status_code == 200
        other_inc_ids = [i["id"] for i in other_incs.json()]
        assert incident_id not in other_inc_ids

        admin_incs = await ac.get(f"/api/v1/incidents?parking_id={parking_id}", headers=admin_headers)
        assert admin_incs.status_code == 200
        admin_inc_ids = [i["id"] for i in admin_incs.json()]
        assert incident_id in admin_inc_ids

        user_resolve = await ac.put(f"/api/v1/incidents/{incident_id}/resolve", headers=user_headers, json={
            "resolution_note": "Intento no autorizado de resolucion"
        })
        assert user_resolve.status_code == 403

        resolve_resp = await ac.put(f"/api/v1/incidents/{incident_id}/resolve", headers=admin_headers, json={
            "resolution_note": "Personal de garita movilizo el vehiculo e inspecciono el carril. Cajon A-02 liberado."
        })
        assert resolve_resp.status_code == 200, resolve_resp.text
        resolved_data = resolve_resp.json()
        assert resolved_data["status"] == "resolved"
        assert "Personal de garita movilizo" in resolved_data["resolution_note"]
        assert resolved_data["resolved_at"] is not None

        dup_resolve = await ac.put(f"/api/v1/incidents/{incident_id}/resolve", headers=admin_headers, json={
            "resolution_note": "Resolucion duplicada"
        })
        assert dup_resolve.status_code == 400
