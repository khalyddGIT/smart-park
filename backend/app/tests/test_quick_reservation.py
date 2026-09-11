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
async def test_quick_reservation_auto_assignment_and_vehicle_matching():
    admin_token, _, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear estacionamiento
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Auto Asignación Express",
            "address": "Av. Independencia 450",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "rate_suv": 7.0,
            "rate_moto": 2.5,
            "total_capacity": 3,
            "tolerance_minutes": 20
        })
        assert p_resp.status_code == 201, p_resp.text
        parking_id = p_resp.json()["id"]

        # 2. Sincronizar plano con 3 tipos de slots (Moto, Camioneta, Auto)
        sync_res = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json={
            "slots": [
                {"code": "MOT-01", "floor_level": "Piso 1", "slot_type": "moto", "status": "free", "pos_x": 20, "pos_y": 20, "width": 30, "height": 50, "rotation": 0},
                {"code": "SUV-01", "floor_level": "Piso 1", "slot_type": "camioneta", "status": "free", "pos_x": 80, "pos_y": 20, "width": 50, "height": 90, "rotation": 0},
                {"code": "AUT-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 160, "pos_y": 20, "width": 40, "height": 80, "rotation": 0}
            ],
            "elements": []
        })
        assert sync_res.status_code == 200

        # 3. Conductor 1: Reserva Rápida para Moto (slot_id=None)
        driver1_token, _, _ = await _register_and_get_token(role="user")
        d1_headers = {"Authorization": f"Bearer {driver1_token}"}
        plate_moto = f"M{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"

        now = datetime.utcnow()
        start_iso = (now + timedelta(minutes=5)).isoformat()
        end_iso = (now + timedelta(hours=2)).isoformat()

        res1 = await ac.post("/api/v1/reservations", headers=d1_headers, json={
            "parking_id": parking_id,
            "slot_id": None,  # Auto-asignación express
            "license_plate": plate_moto,
            "vehicle_type": "moto",
            "start_time": start_iso,
            "end_time": end_iso,
            "is_open_stay": True
        })
        assert res1.status_code == 201, res1.text
        data1 = res1.json()
        assert data1["slot_code"] == "MOT-01"
        assert data1["vehicle_type"] == "moto"
        assert data1["status"] == "scheduled"
        assert data1["code"].startswith("RSV-")

        # 4. Conductor 2: Reserva Rápida para SUV / Camioneta (slot_id=None)
        driver2_token, _, _ = await _register_and_get_token(role="user")
        d2_headers = {"Authorization": f"Bearer {driver2_token}"}
        plate_suv = f"S{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"

        res2 = await ac.post("/api/v1/reservations", headers=d2_headers, json={
            "parking_id": parking_id,
            "slot_id": None,  # Auto-asignación express
            "license_plate": plate_suv,
            "vehicle_type": "suv",
            "start_time": start_iso,
            "end_time": end_iso,
            "is_open_stay": True
        })
        assert res2.status_code == 201, res2.text
        data2 = res2.json()
        assert data2["slot_code"] == "SUV-01"
        assert data2["vehicle_type"] == "suv"

        # 5. Conductor 3: Reserva Rápida para Auto (slot_id=None)
        driver3_token, _, _ = await _register_and_get_token(role="user")
        d3_headers = {"Authorization": f"Bearer {driver3_token}"}
        plate_auto = f"A{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"

        res3 = await ac.post("/api/v1/reservations", headers=d3_headers, json={
            "parking_id": parking_id,
            "slot_id": None,  # Auto-asignación express
            "license_plate": plate_auto,
            "vehicle_type": "auto",
            "start_time": start_iso,
            "end_time": end_iso,
            "is_open_stay": True
        })
        assert res3.status_code == 201, res3.text
        data3 = res3.json()
        assert data3["slot_code"] == "AUT-01"

        # 6. Conductor 4: Cochera llena -> rechazo 409
        driver4_token, _, _ = await _register_and_get_token(role="user")
        d4_headers = {"Authorization": f"Bearer {driver4_token}"}
        plate_extra = f"X{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"

        res4 = await ac.post("/api/v1/reservations", headers=d4_headers, json={
            "parking_id": parking_id,
            "slot_id": None,
            "license_plate": plate_extra,
            "vehicle_type": "auto",
            "start_time": start_iso,
            "end_time": end_iso
        })
        assert res4.status_code == 409, res4.text
        assert "No hay plazas libres disponibles" in res4.json()["detail"]

        # 7. Verificación del pase QR de la reserva rápida
        verify_res = await ac.get(f"/api/v1/reservations/verify/{data1['code']}")
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["slot_code"] == "MOT-01"
        assert v_data["license_plate"] == plate_moto

@pytest.mark.asyncio
async def test_reservation_rejected_when_parking_in_maintenance_or_closed():
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Crear cochera
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Mantenimiento Test",
            "address": "Jr. Manco Capac 120",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "total_capacity": 5,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        pid = p_resp.json()["id"]

        # Crear cajón
        await ac.post(f"/api/v1/parkings/{pid}/floor-plan/sync", headers=admin_headers, json={
            "slots": [{"code": "M-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80, "rotation": 0}],
            "elements": []
        })

        # 1. Poner cochera en mantenimiento
        up_resp = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json={"status": "maintenance"})
        assert up_resp.status_code == 200
        assert up_resp.json()["status"] == "maintenance"

        # Conductor intenta reservar -> debe ser rechazado con 400
        now = datetime.now()
        r1 = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "license_plate": f"M{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}",
            "vehicle_type": "auto",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "is_open_stay": True
        })
        assert r1.status_code == 400
        assert "mantenimiento" in r1.json()["detail"].lower()

        # 2. Poner cochera en cerrado
        up_resp2 = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json={"status": "closed"})
        assert up_resp2.status_code == 200

        # Conductor intenta reservar -> debe ser rechazado con 400
        r2 = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "license_plate": f"C{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}",
            "vehicle_type": "auto",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "is_open_stay": True
        })
        assert r2.status_code == 400
        assert "cerrad" in r2.json()["detail"].lower()

