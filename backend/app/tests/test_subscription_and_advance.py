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

@pytest.mark.asyncio
async def test_subscription_enabled_toggle_and_blocking():
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear cochera con abono desactivado
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Sin Abono {uuid.uuid4().hex[:6]}",
            "address": "Jr. Asamblea 120",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "subscription_enabled": False,
            "total_capacity": 5
        })
        assert create_resp.status_code == 201
        parking = create_resp.json()
        pid = parking["id"]
        assert parking["subscription_enabled"] is False

        await ac.post(f"/api/v1/parkings/{pid}/floor-plan/sync", headers=admin_headers, json={
            "slots": [{"code": "NO-SUB-1", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80, "rotation": 0}],
            "elements": []
        })

        plate = f"N{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": plate, "brand": "Toyota", "model": "Corolla", "color": "Gris", "vehicle_type": "auto"
        })

        # 2. Intento de crear abono mensual -> debe ser rechazado con 400
        fail_sub = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "slot_code": "NO-SUB-1",
            "license_plate": plate,
            "vehicle_type": "auto",
            "is_subscription": True,
            "subscription_months": 1
        })
        assert fail_sub.status_code == 400
        assert "desactivada" in fail_sub.json()["detail"].lower()

        # 3. Admin activa el abono
        update_resp = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json={
            "subscription_enabled": True
        })
        assert update_resp.status_code == 200
        assert update_resp.json()["subscription_enabled"] is True

        # 4. Intento tras activación -> debe ser aceptado
        ok_sub = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "slot_code": "NO-SUB-1",
            "license_plate": plate,
            "vehicle_type": "auto",
            "is_subscription": True,
            "subscription_months": 1
        })
        assert ok_sub.status_code == 201
        assert ok_sub.json()["is_subscription"] is True

@pytest.mark.asyncio
async def test_subscription_3_weeks_and_fractional_pricing():
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Abonos Flex {uuid.uuid4().hex[:6]}",
            "address": "Jr. 9 de Diciembre 400",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_monthly_auto": 180.0,
            "subscription_enabled": True,
            "total_capacity": 5
        })
        assert create_resp.status_code == 201
        pid = create_resp.json()["id"]

        await ac.post(f"/api/v1/parkings/{pid}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "FLX-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80, "rotation": 0},
                {"code": "FLX-02", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 70, "pos_y": 10, "width": 50, "height": 80, "rotation": 0},
            ],
            "elements": []
        })

        # 1. Abono de 3 Semanas (21 días): Tarifa = (180.0 / 30) * 21 = 126.00
        plate1 = f"F{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        res_3w = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "slot_code": "FLX-01",
            "license_plate": plate1,
            "vehicle_type": "auto",
            "is_subscription": True,
            "subscription_days": 21,
            "subscription_type": "3_weeks"
        })
        assert res_3w.status_code == 201, res_3w.text
        data_3w = res_3w.json()
        assert data_3w["is_subscription"] is True
        assert data_3w["subscription_days"] == 21
        assert data_3w["subscription_type"] == "3_weeks"
        assert data_3w["total_cost"] == 126.00

        # 2. Abono fraccionado de 10 días: Tarifa = (180.0 / 30) * 10 = 60.00
        driver2_token, _, _ = await _register_and_get_token(role="user")
        driver2_headers = {"Authorization": f"Bearer {driver2_token}"}
        plate2 = f"F{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        res_frac = await ac.post("/api/v1/reservations", headers=driver2_headers, json={
            "parking_id": pid,
            "slot_code": "FLX-02",
            "license_plate": plate2,
            "vehicle_type": "auto",
            "is_subscription": True,
            "subscription_days": 10,
            "subscription_type": "fractional"
        })
        assert res_frac.status_code == 201, res_frac.text
        data_frac = res_frac.json()
        assert data_frac["is_subscription"] is True
        assert data_frac["subscription_days"] == 10
        assert data_frac["total_cost"] == 60.00

@pytest.mark.asyncio
async def test_custom_rates_crud_persistence():
    admin_token, _, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        rates_payload = [
            {"id": "rate-auto", "name": "Auto / Sedán", "vehicle_type": "auto", "rate_hourly": 5.0, "rate_minute": 0.08, "rate_monthly": 180.0, "is_active": True},
            {"id": "rate-bici", "name": "Bicicleta / Scooter", "vehicle_type": "moto", "rate_hourly": 1.5, "rate_minute": 0.03, "rate_monthly": 45.0, "is_active": True},
            {"id": "rate-camion", "name": "Camión de Carga", "vehicle_type": "suv", "rate_hourly": 12.0, "rate_minute": 0.20, "rate_monthly": 350.0, "is_active": True}
        ]
        import json
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Custom Rates {uuid.uuid4().hex[:6]}",
            "address": "Av. Mariscal Caceres 800",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "custom_rates": json.dumps(rates_payload),
            "total_capacity": 10
        })
        assert create_resp.status_code == 201
        p_data = create_resp.json()
        pid = p_data["id"]
        assert p_data["custom_rates"] is not None
        saved_rates = json.loads(p_data["custom_rates"])
        assert len(saved_rates) == 3
        assert saved_rates[1]["name"] == "Bicicleta / Scooter"

        # Actualizar: eliminar Camión y dejar 2
        updated_rates = [rates_payload[0], rates_payload[1]]
        put_resp = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json={
            "custom_rates": json.dumps(updated_rates)
        })
        assert put_resp.status_code == 200
        put_data = put_resp.json()
        saved_updated = json.loads(put_data["custom_rates"])
        assert len(saved_updated) == 2

