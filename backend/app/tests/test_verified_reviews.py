import uuid
from datetime import datetime, timedelta
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
            "phone": "+51 988 333 444",
            "password": password,
            "role": role
        })
        assert r.status_code == 201, r.text
        data = r.json()
        token = data["access_token"]
        user_id = data["user"]["id"]
        return token, email, user_id

@pytest.mark.asyncio
async def test_verified_stay_reviews_lifecycle():
    driver_token, _, driver_id = await _register_and_get_token(role="user")
    other_driver_token, _, _ = await _register_and_get_token(role="user")
    admin_token, _, _ = await _register_and_get_token(role="local")

    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": f"Bearer {driver_token}"}
    other_driver_headers = {"Authorization": f"Bearer {other_driver_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear cochera
        p_res = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Verificada Huamanga",
            "address": "Jr. Bellido 456",
            "city": "Ayacucho",
            "hourly_rate": 6.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p_res.status_code == 201
        parking_id = p_res.json()["id"]

        # Sincronizar plano con plazas
        sync_res = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "V-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 100, "width": 60, "height": 100, "rotation": 0}
            ],
            "elements": []
        })
        assert sync_res.status_code == 200

        slots = (await ac.get(f"/api/v1/parkings/{parking_id}/slots")).json()
        slot_id = slots[0]["id"]

        # 2. Registrar vehículo del conductor
        plate = f"A{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        v_res = await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": plate,
            "brand": "Toyota",
            "model": "Yaris",
            "color": "Plata",
            "vehicle_type": "auto"
        })
        assert v_res.status_code == 201

        # 3. Crear reserva
        res_create = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate,
            "vehicle_type": "auto",
            "estimated_hours": 2
        })
        assert res_create.status_code == 201
        res_data = res_create.json()
        res_id = res_data["id"]
        res_code = res_data["code"]
        assert res_data["status"] == "scheduled"
        assert res_data.get("has_review") is False

        # 4. Intentar calificar estancia aún NO completada (scheduled) -> debe fallar 400
        fail_sched = await ac.post("/api/v1/reviews", headers=driver_headers, json={
            "parking_id": parking_id,
            "reservation_id": res_id,
            "rating": 5,
            "comment": "Quiero calificar antes de tiempo",
            "tags": ["Seguridad"]
        })
        assert fail_sched.status_code == 400
        assert "Solo puedes calificar una estancia cuando haya finalizado" in fail_sched.json()["detail"]

        # 5. Intentar calificar con otro conductor la reserva ajena -> debe fallar 403
        fail_other = await ac.post("/api/v1/reviews", headers=other_driver_headers, json={
            "parking_id": parking_id,
            "reservation_id": res_id,
            "rating": 5,
            "comment": "Calificando reserva ajena"
        })
        assert fail_other.status_code == 403

        # 6. Simular flujo de estancia completa: Ingreso (active) -> Salida (completed)
        in_res = await ac.put(f"/api/v1/reservations/{res_id}/check-in", headers=admin_headers)
        assert in_res.status_code == 200

        # Intentar calificar estando activo -> debe fallar 400
        fail_active = await ac.post("/api/v1/reviews", headers=driver_headers, json={
            "parking_id": parking_id,
            "reservation_id": res_id,
            "rating": 5,
            "comment": "Aún sigo dentro"
        })
        assert fail_active.status_code == 400

        # Check-out (completa la estancia)
        out_res = await ac.put(f"/api/v1/reservations/{res_id}/check-out", headers=admin_headers, json={
            "payment_method": "efectivo",
            "amount_paid": 5.0
        })
        assert out_res.status_code == 200, out_res.text
        assert out_res.json()["status"] == "completed"

        # 7. Ahora calificar la estancia completada exitosamente con tags y rating
        rev_success = await ac.post("/api/v1/reviews", headers=driver_headers, json={
            "parking_id": parking_id,
            "reservation_id": res_id,
            "rating": 5,
            "comment": "Excelente experiencia, cochera muy limpia y segura.",
            "tags": ["Seguridad 24/7", "Espacios limpios", "Buen trato"]
        })
        assert rev_success.status_code == 201
        rev_body = rev_success.json()
        assert rev_body["reservation_id"] == res_id
        assert rev_body["is_verified"] is True
        assert "Seguridad 24/7" in rev_body["tags"]
        assert rev_body["rating"] == 5

        # 8. Anti-spam: Intentar calificar OTRA VEZ la misma reserva -> debe fallar 400
        rev_dup = await ac.post("/api/v1/reviews", headers=driver_headers, json={
            "parking_id": parking_id,
            "reservation_id": res_id,
            "rating": 4,
            "comment": "Intentando duplicar mi reseña"
        })
        assert rev_dup.status_code == 400
        assert "ya cuenta con una reseña registrada" in rev_dup.json()["detail"]

        # 9. Consultar mis reservas: la reserva ahora debe reflejar has_review = True y review_rating = 5
        my_res_check = await ac.get("/api/v1/reservations", headers=driver_headers)
        assert my_res_check.status_code == 200
        my_list = my_res_check.json()
        target_res = next((r for r in my_list if r["id"] == res_id), None)
        assert target_res is not None
        assert target_res["has_review"] is True
        assert target_res["review_rating"] == 5

        # 10. Consultar muro de reseñas: debe incluir is_verified = True y tags
        wall_res = await ac.get(f"/api/v1/reviews?parking_id={parking_id}")
        assert wall_res.status_code == 200
        wall_list = wall_res.json()
        found_rev = next((r for r in wall_list if r["reservation_id"] == res_id), None)
        assert found_rev is not None
        assert found_rev["is_verified"] is True
        assert "Espacios limpios" in found_rev["tags"]
