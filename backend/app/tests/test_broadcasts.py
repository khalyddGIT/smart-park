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
async def test_broadcast_lifecycle_and_promotions():
    platform_token, _, _ = await _register_and_get_token(role="platform")
    user_token, _, _ = await _register_and_get_token(role="user")
    local_token, _, _ = await _register_and_get_token(role="local")

    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {platform_token}"}
    driver_headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. SuperAdmin crea un comunicado informativo
        res_info = await ac.post("/api/v1/platform/broadcasts", headers=admin_headers, json={
            "title": "Mantenimiento Preventivo de Servidores",
            "message": "Este domingo se realizarán mejoras en la infraestructura de 2:00 a 3:00 AM.",
            "target": "ALL",
            "category": "maintenance"
        })
        assert res_info.status_code == 200, f"Error al crear comunicado: {res_info.text}"
        info_data = res_info.json()
        assert info_data["id"].startswith("BRD-")
        assert info_data["category"] == "maintenance"

        # 2. SuperAdmin crea una Promoción Comercial con código y descuento
        res_promo = await ac.post("/api/v1/platform/broadcasts", headers=admin_headers, json={
            "title": "¡20% de Descuento en todas las cocheras de Huamanga!",
            "message": "Usa el código promocional en tu próxima reserva antes del fin de semana.",
            "target": "CONDUCTORES",
            "category": "promo",
            "promo_code": "SEMANASANTA20",
            "discount_percent": 20,
            "image_url": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80",
            "action_label": "Reservar con Descuento",
            "action_url": "/reservations"
        })
        assert res_promo.status_code == 200
        promo_data = res_promo.json()
        assert promo_data["category"] == "promo"
        assert promo_data["promo_code"] == "SEMANASANTA20"
        assert promo_data["discount_percent"] == 20
        assert promo_data["image_url"] is not None

        # 3. Blindaje RBAC: Un conductor NO puede crear ni eliminar comunicados
        fail_create = await ac.post("/api/v1/platform/broadcasts", headers=driver_headers, json={
            "title": "Intento de hack",
            "message": "Texto no autorizado",
            "target": "ALL"
        })
        assert fail_create.status_code == 403, "Un conductor no debe poder emitir comunicados"

        fail_delete = await ac.delete(f"/api/v1/platform/broadcasts/{promo_data['id']}", headers=driver_headers)
        assert fail_delete.status_code == 403, "Un conductor no debe poder eliminar comunicados"

        # 4. Conductor consulta comunicados activos para su rol
        res_active = await ac.get("/api/v1/platform/active-broadcasts?target_role=user")
        assert res_active.status_code == 200
        active_list = res_active.json()
        assert any(b["id"] == promo_data["id"] for b in active_list), "El conductor debe recibir la promoción"
        assert any(b["id"] == info_data["id"] for b in active_list), "El conductor debe recibir el comunicado ALL"

        # 5. SuperAdmin elimina el comunicado de mantenimiento
        del_res = await ac.delete(f"/api/v1/platform/broadcasts/{info_data['id']}", headers=admin_headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 6. Comprobar que ya no aparece en activos
        res_active_after = await ac.get("/api/v1/platform/active-broadcasts?target_role=user")
        active_ids = [b["id"] for b in res_active_after.json()]
        assert info_data["id"] not in active_ids
        assert promo_data["id"] in active_ids
