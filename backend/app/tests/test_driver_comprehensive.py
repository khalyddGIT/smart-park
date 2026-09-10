import uuid
import pytest
from datetime import datetime, timedelta
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
async def test_driver_vehicle_garage_crud_and_isolation():
    driver1_token, _, driver1_id = await _register_and_get_token(role="user")
    driver2_token, _, driver2_id = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    d1_headers = {"Authorization": f"Bearer {driver1_token}"}
    d2_headers = {"Authorization": f"Bearer {driver2_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Reject invalid plate format
        bad_plate = await ac.post("/api/v1/vehicles", headers=d1_headers, json={
            "license_plate": "INVALID123",
            "brand": "Toyota",
            "model": "Corolla",
            "color": "Blanco",
            "vehicle_type": "auto"
        })
        assert bad_plate.status_code in [400, 422]

        # 2. Create valid vehicle
        plate1 = f"A{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        create_resp = await ac.post("/api/v1/vehicles", headers=d1_headers, json={
            "license_plate": plate1,
            "brand": "Toyota",
            "model": "Yaris",
            "color": "Rojo",
            "vehicle_type": "auto",
            "year": "2022",
            "soat_expiry": "2026-12-31",
            "notes": "Vehiculo familiar de uso diario"
        })
        assert create_resp.status_code == 201, create_resp.text
        veh_id = create_resp.json()["id"]

        # 3. Driver 1 can see their vehicle
        list_resp = await ac.get("/api/v1/vehicles", headers=d1_headers)
        assert list_resp.status_code == 200
        plates = [v["license_plate"] for v in list_resp.json()]
        assert plate1 in plates

        # 4. Driver 2 CANNOT see Driver 1's vehicle
        d2_list = await ac.get("/api/v1/vehicles", headers=d2_headers)
        assert d2_list.status_code == 200
        assert plate1 not in [v["license_plate"] for v in d2_list.json()]

        # 5. Driver 2 CANNOT update or delete Driver 1's vehicle
        bad_del = await ac.delete(f"/api/v1/vehicles/{veh_id}", headers=d2_headers)
        assert bad_del.status_code == 403

        # 6. Driver 1 updates vehicle
        upd_resp = await ac.put(f"/api/v1/vehicles/{veh_id}", headers=d1_headers, json={
            "color": "Azul Metálico",
            "notes": "Recién pintado"
        })
        assert upd_resp.status_code == 200
        assert upd_resp.json()["color"] == "Azul Metálico"

        # 7. Driver 1 deletes vehicle
        del_resp = await ac.delete(f"/api/v1/vehicles/{veh_id}", headers=d1_headers)
        assert del_resp.status_code in [200, 204]

        # Confirm vehicle is gone
        list_after = await ac.get("/api/v1/vehicles", headers=d1_headers)
        assert plate1 not in [v["license_plate"] for v in list_after.json()]

@pytest.mark.asyncio
async def test_driver_reservation_lifecycle_and_verification():
    driver_token, _, driver_id = await _register_and_get_token(role="user")
    admin_token, _, _ = await _register_and_get_token(role="local")

    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": f"Bearer {driver_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create parking and slot
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Reservas Conductor",
            "address": "Jr. Grau 200",
            "city": "Ayacucho",
            "hourly_rate": 6.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        parking_id = p_resp.json()["id"]

        sync_res = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "C-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 100, "width": 60, "height": 100, "rotation": 0}
            ],
            "elements": []
        })
        assert sync_res.status_code == 200

        slots = (await ac.get(f"/api/v1/parkings/{parking_id}/slots")).json()
        slot_id = slots[0]["id"]

        # Driver registers vehicle with unique plate
        plate2 = f"B{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        veh_resp = await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": plate2,
            "brand": "Hyundai",
            "model": "Elantra",
            "color": "Negro",
            "vehicle_type": "auto"
        })
        assert veh_resp.status_code == 201
        vehicle_id = veh_resp.json()["id"]

        # Driver creates reservation
        now = datetime.now()
        start_time = (now + timedelta(hours=1)).isoformat()
        end_time = (now + timedelta(hours=3)).isoformat()

        res_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate2,
            "vehicle_type": "auto",
            "start_time": start_time,
            "end_time": end_time,
            "estimated_hours": 2,
            "billing_unit": "hour",
            "tolerance_minutes": 15
        })
        assert res_resp.status_code == 201, res_resp.text
        res_data = res_resp.json()
        reservation_id = res_data["id"]
        res_code = res_data["code"]
        assert res_code is not None
        assert res_data["qr_code"] is not None
        assert res_data["status"] == "scheduled"
        assert res_data["total_cost"] > 0

        # Public / Operator QR verification endpoint
        verify_resp = await ac.get(f"/api/v1/reservations/verify/{res_code}")
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["id"] == reservation_id
        assert verify_data["license_plate"] == plate2

        # Check-in at barrier (operator action)
        checkin_resp = await ac.put(f"/api/v1/reservations/{reservation_id}/check-in", headers=admin_headers)
        assert checkin_resp.status_code == 200
        assert checkin_resp.json()["status"] == "active"

        # Slot is now occupied
        slot_status = (await ac.get(f"/api/v1/parkings/{parking_id}/slots")).json()[0]["status"]
        assert slot_status == "occupied"

        # Check-out at barrier (operator action)
        checkout_resp = await ac.put(f"/api/v1/reservations/{reservation_id}/check-out", headers=admin_headers, json={
            "payment_method": "efectivo",
            "amount_paid": 12.0
        })
        assert checkout_resp.status_code == 200
        assert checkout_resp.json()["status"] == "completed"

        # Slot is now free
        slot_status_after = (await ac.get(f"/api/v1/parkings/{parking_id}/slots")).json()[0]["status"]
        assert slot_status_after == "free"

@pytest.mark.asyncio
async def test_driver_privacy_and_security_boundaries():
    driver_token, _, driver_id = await _register_and_get_token(role="user")
    admin_token, _, _ = await _register_and_get_token(role="local")

    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": f"Bearer {driver_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Privacidad Test",
            "address": "Av. 9 de Diciembre 400",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        parking_id = p_resp.json()["id"]

        # Driver posts review
        rev_res = await ac.post("/api/v1/reviews", headers=driver_headers, json={
            "parking_id": parking_id,
            "rating": 4,
            "comment": "Buena atención y seguridad"
        })
        rev_id = rev_res.json()["id"]

        # Driver reports incident
        inc_res = await ac.post("/api/v1/incidents", headers=driver_headers, json={
            "parking_id": parking_id,
            "category": "iluminacion",
            "description": "Lámpara del fondo parpadea"
        })
        inc_id = inc_res.json()["id"]

        # Driver CANNOT hide their review or incident (403)
        bad_rev = await ac.put(f"/api/v1/reviews/{rev_id}/visibility", headers=driver_headers, json={"is_hidden": True})
        assert bad_rev.status_code == 403

        bad_inc = await ac.put(f"/api/v1/incidents/{inc_id}/visibility", headers=driver_headers, json={"is_hidden": True})
        assert bad_inc.status_code == 403

        # Admin hides both
        await ac.put(f"/api/v1/reviews/{rev_id}/visibility", headers=admin_headers, json={"is_hidden": True})
        await ac.put(f"/api/v1/incidents/{inc_id}/visibility", headers=admin_headers, json={"is_hidden": True})

        # Driver CANNOT see the hidden review or incident anymore
        reviews_for_driver = (await ac.get("/api/v1/reviews", headers=driver_headers)).json()
        assert rev_id not in [r["id"] for r in reviews_for_driver]

        incidents_for_driver = (await ac.get("/api/v1/incidents", headers=driver_headers)).json()
        assert inc_id not in [i["id"] for i in incidents_for_driver]
