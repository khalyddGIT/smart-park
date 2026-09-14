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
        return data["access_token"], email, data["user"]["id"]

@pytest.mark.asyncio
async def test_monthly_subscription_creation_and_rates():
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create parking with custom monthly rates
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Subscripciones Huamanga",
            "address": "Jr. San Martin 220",
            "city": "Ayacucho",
            "latitude": -13.1604,
            "longitude": -74.2259,
            "hourly_rate": 5.0,
            "rate_monthly_auto": 160.0,
            "rate_monthly_suv": 210.0,
            "rate_monthly_moto": 80.0,
            "rate_monthly_mototaxi": 110.0,
            "total_capacity": 10
        })
        assert create_resp.status_code == 201, create_resp.text
        p_data = create_resp.json()
        parking_id = p_data["id"]
        assert p_data["rate_monthly_auto"] == 160.0
        assert p_data["rate_monthly_suv"] == 210.0

        # Sync slots to ensure free slot
        slot_sync = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "SUB-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80, "rotation": 0},
                {"code": "ADV-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 70, "pos_y": 10, "width": 50, "height": 80, "rotation": 0},
            ],
            "elements": []
        })
        assert slot_sync.status_code == 200

        # Register vehicle
        plate = f"S{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        v_resp = await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": plate,
            "brand": "Toyota",
            "model": "Yaris",
            "color": "Blanco",
            "vehicle_type": "auto"
        })
        assert v_resp.status_code == 201

        # 2. Create monthly subscription reservation
        sub_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_code": "SUB-01",
            "license_plate": plate,
            "vehicle_type": "auto",
            "reservation_type": "subscription",
            "is_subscription": True,
            "subscription_months": 1
        })
        assert sub_resp.status_code == 201, sub_resp.text
        sub_data = sub_resp.json()
        assert sub_data["reservation_type"] == "subscription"
        assert sub_data["is_subscription"] is True
        assert sub_data["subscription_months"] == 1
        assert sub_data["total_cost"] == 160.0
        assert sub_data["code"] is not None

        # Check QR verification returns subscription metadata
        token = sub_data["code"]
        verify_resp = await ac.get(f"/api/v1/reservations/verify/{token}")
        assert verify_resp.status_code == 200, verify_resp.text
        v_data = verify_resp.json()
        assert v_data["is_subscription"] is True
        assert v_data["reservation_type"] == "subscription"

@pytest.mark.asyncio
async def test_advance_reservation_creation():
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Adelantadas Huamanga",
            "address": "Jr. Manco Capac 100",
            "city": "Ayacucho",
            "latitude": -13.1604,
            "longitude": -74.2259,
            "hourly_rate": 5.0,
            "total_capacity": 10
        })
        assert create_resp.status_code == 201
        parking_id = create_resp.json()["id"]

        slot_sync = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "ADV-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 70, "pos_y": 10, "width": 50, "height": 80, "rotation": 0},
            ],
            "elements": []
        })
        assert slot_sync.status_code == 200

        plate = f"A{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        v_resp = await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": plate,
            "brand": "Honda",
            "model": "Civic",
            "color": "Negro",
            "vehicle_type": "auto"
        })
        assert v_resp.status_code == 201

        # Advance booking for 5 days in the future
        future_start = (datetime.utcnow() + timedelta(days=5)).isoformat()
        future_end = (datetime.utcnow() + timedelta(days=5, hours=3)).isoformat()

        adv_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_code": "ADV-01",
            "license_plate": plate,
            "vehicle_type": "auto",
            "reservation_type": "advance",
            "start_time": future_start,
            "end_time": future_end,
            "estimated_hours": 3
        })
        assert adv_resp.status_code == 201, adv_resp.text
        adv_data = adv_resp.json()
        assert adv_data["reservation_type"] == "advance"
        assert adv_data["is_subscription"] is False
        assert adv_data["status"] == "scheduled"
