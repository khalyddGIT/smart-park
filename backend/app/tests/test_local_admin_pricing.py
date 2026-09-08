import uuid
from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def _register_and_get_token(role: str = "local") -> tuple[str, str]:
    email = f"{role}_{uuid.uuid4().hex[:8]}@smartpark.com"
    password = "SecurePassword123!"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/v1/auth/register", json={
            "full_name": f"Tester {role}",
            "email": email,
            "phone": "+51 988 123 456",
            "password": password,
            "role": role
        })
        assert r.status_code == 201
        token = r.json()["access_token"]
        return token, email

@pytest.mark.asyncio
async def test_local_admin_can_update_vehicle_rates_and_night_shift():
    token, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear estacionamiento con tarifas diferenciadas
        create_resp = await ac.post("/api/v1/parkings", headers=headers, json={
            "name": "Cochera Tarifas Pro Huamanga",
            "address": "Jr. Bellido 500",
            "city": "Ayacucho",
            "latitude": -13.1604,
            "longitude": -74.2259,
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "rate_suv": 8.0,
            "rate_mototaxi": 3.5,
            "rate_moto": 2.5,
            "night_shift_enabled": True,
            "night_shift_start": "20:00",
            "night_shift_end": "06:00",
            "night_shift_surcharge": 2.0,
            "require_reservation_prepay": False,
            "reservation_fee": 1.0,
            "min_stay_hours": 1,
            "max_stay_hours": 12,
            "total_capacity": 10,
            "tolerance_minutes": 20
        })
        assert create_resp.status_code == 201
        parking = create_resp.json()
        parking_id = parking["id"]
        assert parking["rate_auto"] == 5.0
        assert parking["rate_suv"] == 8.0
        assert parking["rate_mototaxi"] == 3.5
        assert parking["rate_moto"] == 2.5
        assert parking["night_shift_enabled"] is True
        assert parking["night_shift_surcharge"] == 2.0

        # 2. Modificar tarifas mediante PUT /parkings/{id}
        put_resp = await ac.put(f"/api/v1/parkings/{parking_id}", headers=headers, json={
            "rate_auto": 6.0,
            "rate_suv": 9.0,
            "rate_moto": 3.0,
            "night_shift_surcharge": 2.5
        })
        assert put_resp.status_code == 200
        updated = put_resp.json()
        assert updated["rate_auto"] == 6.0
        assert updated["rate_suv"] == 9.0
        assert updated["rate_moto"] == 3.0
        assert updated["night_shift_surcharge"] == 2.5

@pytest.mark.asyncio
async def test_reservation_pricing_by_vehicle_and_night_shift():
    admin_token, _ = await _register_and_get_token(role="local")
    driver_token, driver_email = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Crear cochera
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Nocturna {uuid.uuid4().hex[:6]}",
            "address": "Av. Cusco 100",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "rate_suv": 8.0,
            "rate_mototaxi": 3.5,
            "rate_moto": 2.5,
            "night_shift_enabled": True,
            "night_shift_start": "20:00",
            "night_shift_end": "06:00",
            "night_shift_surcharge": 2.0,
            "require_reservation_prepay": False,
            "reservation_fee": 0.0,
            "total_capacity": 5,
            "tolerance_minutes": 15
        })
        parking_id = p_resp.json()["id"]

        # Crear cajones
        s1_resp = await ac.post(f"/api/v1/parkings/{parking_id}/slots", headers=admin_headers, json={
            "code": "M-01",
            "slot_type": "moto"
        })
        slot_moto_id = s1_resp.json()["id"]

        s2_resp = await ac.post(f"/api/v1/parkings/{parking_id}/slots", headers=admin_headers, json={
            "code": "S-01",
            "slot_type": "suv"
        })
        slot_suv_id = s2_resp.json()["id"]

        # 1. Reserva Diurna para MOTO (2 horas a las 10:00 AM)
        # Tarifa moto: S/ 2.50 * 2h = S/ 5.00
        start_day = datetime.utcnow().replace(hour=10, minute=0, second=0, microsecond=0)
        end_day = start_day + timedelta(hours=2)
        plate_moto = f"M{uuid.uuid4().hex[:3].upper()}-101"

        res1 = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_moto_id,
            "license_plate": plate_moto,
            "start_time": start_day.isoformat(),
            "end_time": end_day.isoformat(),
            "vehicle_type": "moto"
        })
        assert res1.status_code == 201, res1.text
        data1 = res1.json()
        assert data1["vehicle_type"] == "moto"
        assert data1["total_cost"] == 5.0
        assert data1["is_night_shift"] is False

        # 2. Reserva Nocturna para SUV (2 horas a las 22:00 PM)
        # Turno noche: 20:00 a 06:00 (+S/ 2.00) -> Tarifa SUV: (8.0 + 2.0) * 2h = S/ 20.00
        driver2_token, _ = await _register_and_get_token(role="user")
        driver2_headers = {"Authorization": f"Bearer {driver2_token}"}
        start_night = datetime.utcnow().replace(hour=22, minute=0, second=0, microsecond=0)
        end_night = start_night + timedelta(hours=2)
        plate_suv = f"S{uuid.uuid4().hex[:3].upper()}-202"

        res2 = await ac.post("/api/v1/reservations", headers=driver2_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_suv_id,
            "license_plate": plate_suv,
            "start_time": start_night.isoformat(),
            "end_time": end_night.isoformat(),
            "vehicle_type": "suv"
        })
        assert res2.status_code == 201, res2.text
        data2 = res2.json()
        assert data2["vehicle_type"] == "suv"
        assert data2["total_cost"] == 20.0
        assert data2["is_night_shift"] is True

@pytest.mark.asyncio
async def test_reservation_rejects_vehicle_type_slot_mismatch():
    admin_token, _ = await _register_and_get_token(role="local")
    driver_token, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Tipos {uuid.uuid4().hex[:6]}",
            "address": "Jr. Lima 50",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 3,
            "tolerance_minutes": 15
        })
        parking_id = p_resp.json()["id"]

        moto_slot = await ac.post(f"/api/v1/parkings/{parking_id}/slots", headers=admin_headers, json={
            "code": "M-99",
            "slot_type": "moto"
        })
        slot_moto_id = moto_slot.json()["id"]

        start = datetime.utcnow() + timedelta(minutes=10)
        end = start + timedelta(hours=1)
        plate = f"C{uuid.uuid4().hex[:3].upper()}-404"

        mismatch = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_moto_id,
            "license_plate": plate,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_type": "camioneta"
        })
        assert mismatch.status_code == 400, mismatch.text
        assert "cajón" in mismatch.json()["detail"].lower() or "tipo" in mismatch.json()["detail"].lower()

@pytest.mark.asyncio
async def test_require_reservation_prepay_policy():
    admin_token, _ = await _register_and_get_token(role="local")
    driver_token, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Cochera con prepago obligatorio
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Prepago {uuid.uuid4().hex[:6]}",
            "address": "Jr. Callao 200",
            "city": "Ayacucho",
            "hourly_rate": 6.0,
            "require_reservation_prepay": True,
            "total_capacity": 5,
            "tolerance_minutes": 15
        })
        parking_id = p_resp.json()["id"]

        slot_resp = await ac.post(f"/api/v1/parkings/{parking_id}/slots", headers=admin_headers, json={
            "code": "P-01",
            "slot_type": "auto"
        })
        slot_id = slot_resp.json()["id"]

        start = datetime.utcnow() + timedelta(minutes=10)
        end = start + timedelta(hours=2)
        plate_try1 = f"P{uuid.uuid4().hex[:3].upper()}-701"

        # Intento de reserva sin pago (pay_now=False) -> Debe ser rechazada
        reject_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate_try1,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": False
        })
        assert reject_resp.status_code == 400, reject_resp.text
        assert "pago anticipado" in reject_resp.json()["detail"].lower(), reject_resp.text

        # Intento con pago inmediato (pay_now=True) -> Debe ser aceptada
        success_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate_try1,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "pay_now": True,
            "payment_method": "yape"
        })
        assert success_resp.status_code == 201, success_resp.text
        assert success_resp.json()["prepaid"] is True

@pytest.mark.asyncio
async def test_reservation_pricing_by_minute_billing_unit():
    admin_token, _ = await _register_and_get_token(role="local")
    driver_token, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear cochera con cobro por minuto
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Minuto {uuid.uuid4().hex[:6]}",
            "address": "Av. Independencia 345",
            "city": "Ayacucho",
            "hourly_rate": 6.0,
            "billing_unit": "minute",
            "rate_minute_auto": 0.10,
            "rate_minute_suv": 0.15,
            "rate_minute_moto": 0.05,
            "min_stay_minutes": 15,
            "max_stay_minutes": 720,
            "total_capacity": 5,
            "tolerance_minutes": 10
        })
        assert p_resp.status_code == 201, p_resp.text
        parking = p_resp.json()
        parking_id = parking["id"]
        assert parking["billing_unit"] == "minute"
        assert parking["rate_minute_auto"] == 0.10

        slot_resp = await ac.post(f"/api/v1/parkings/{parking_id}/slots", headers=admin_headers, json={
            "code": "MIN-01",
            "slot_type": "auto"
        })
        slot_id = slot_resp.json()["id"]

        # 2. Intento menor al tiempo mínimo (10 minutos < 15 minutos) -> 422
        start_time = datetime.utcnow() + timedelta(minutes=10)
        end_too_short = start_time + timedelta(minutes=10)
        plate1 = f"M{uuid.uuid4().hex[:2].upper()}-001"
        res_fail = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate1,
            "start_time": start_time.isoformat(),
            "end_time": end_too_short.isoformat(),
            "vehicle_type": "auto",
            "billing_unit": "minute",
            "estimated_minutes": 10
        })
        assert res_fail.status_code == 422, res_fail.text
        detail = res_fail.json()["detail"]
        detail_str = str(detail).lower()
        assert "mínima" in detail_str, res_fail.text

        # 3. Reserva válida por 30 minutos (30 min * 0.10 = S/ 3.00)
        end_valid = start_time + timedelta(minutes=30)
        plate2 = f"M{uuid.uuid4().hex[:2].upper()}-002"
        res_ok = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": parking_id,
            "slot_id": slot_id,
            "license_plate": plate2,
            "start_time": start_time.isoformat(),
            "end_time": end_valid.isoformat(),
            "vehicle_type": "auto",
            "billing_unit": "minute",
            "estimated_minutes": 30
        })
        assert res_ok.status_code == 201, res_ok.text
        res_data = res_ok.json()
        assert res_data["billing_unit"] == "minute"
        assert res_data["total_cost"] == 3.00
        assert res_data["estimated_minutes"] == 30


@pytest.mark.asyncio
async def test_local_admin_can_update_all_establishment_profile_and_contact_fields():
    """Verifica que el admin local pueda editar y persistir todos los datos de la sede:
    owner, ruc, whatsapp, schedule, socials, maps_url, description, etc."""
    token, _ = await _register_and_get_token(role="local")
    admin_headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:

        # Crear cochera
        p_res = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Test Perfil",
            "address": "Jr. 28 de Julio 123",
            "city": "Ayacucho",
            "latitude": -13.1604,
            "longitude": -74.2259,
            "hourly_rate": 5.0,
            "owner": "Empresa Inicial",
            "ruc": "20123456789",
            "phone": "+51 966 000 111",
            "whatsapp": "51966000111",
            "schedule": "Lunes a Domingo: 24 Horas"
        })
        assert p_res.status_code == 201, p_res.text
        pid = p_res.json()["id"]

        # Actualizar todos los campos como lo hace Editar Sede
        update_payload = {
            "name": "Smart Park Plaza Mayor - Centro Histórico",
            "address": "Portal Unión 42, Huamanga",
            "reference": "A media cuadra de la Catedral",
            "city": "Ayacucho - Huamanga",
            "level": "Nivel 1 - Superficie",
            "owner": "Inversiones Plaza Mayor Huamanga SAC",
            "ruc": "20608945123",
            "phone": "+51 966 123 456",
            "whatsapp": "51966123456",
            "email": "contacto@plazamayorpark.pe",
            "schedule": "Lunes a Domingo: 06:00 - 23:00",
            "description": "Estacionamiento seguro con garita ANPR en el centro de Huamanga.",
            "maps_url": "https://maps.google.com/?q=-13.1604,-74.2259",
            "socials": '{"facebook":"fb.com/smartpark","instagram":"instagr.am/smartpark"}',
            "rate_auto": 6.0,
            "rate_suv": 8.0,
            "rate_mototaxi": 4.0,
            "rate_moto": 3.0,
            "billing_unit": "minute",
            "rate_minute_auto": 0.10,
            "night_shift_enabled": True,
            "night_shift_start": "21:00",
            "night_shift_end": "05:00",
            "night_shift_surcharge": 2.50
        }

        put_res = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json=update_payload)
        assert put_res.status_code == 200, put_res.text
        data = put_res.json()

        assert data["name"] == "Smart Park Plaza Mayor - Centro Histórico"
        assert data["owner"] == "Inversiones Plaza Mayor Huamanga SAC"
        assert data["ruc"] == "20608945123"
        assert data["whatsapp"] == "51966123456"
        assert data["schedule"] == "Lunes a Domingo: 06:00 - 23:00"
        assert data["description"] == "Estacionamiento seguro con garita ANPR en el centro de Huamanga."
        assert data["maps_url"] == "https://maps.google.com/?q=-13.1604,-74.2259"
        assert data["socials"] == '{"facebook":"fb.com/smartpark","instagram":"instagr.am/smartpark"}'
        assert data["rate_auto"] == 6.0

        # Verificar que GET /parkings/{id} y GET /parkings devuelven todos estos datos
        get_res = await ac.get(f"/api/v1/parkings/{pid}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["owner"] == "Inversiones Plaza Mayor Huamanga SAC"
        assert get_data["whatsapp"] == "51966123456"
        assert get_data["schedule"] == "Lunes a Domingo: 06:00 - 23:00"
        assert get_data["maps_url"] == "https://maps.google.com/?q=-13.1604,-74.2259"

@pytest.mark.asyncio
async def test_local_admin_can_toggle_allow_open_stay_and_reserve():
    admin_token, _ = await _register_and_get_token(role="local")
    driver_token, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Crear cochera con allow_open_stay = True
        create_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Hora Libre {uuid.uuid4().hex[:6]}",
            "address": "Jr. 28 de Julio 300",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "allow_open_stay": True
        })
        assert create_resp.status_code == 201
        p_data = create_resp.json()
        pid = p_data["id"]
        assert p_data["allow_open_stay"] is True

        # Crear cajón
        slot_resp = await ac.post(f"/api/v1/parkings/{pid}/slots", headers=admin_headers, json={
            "code": "HL-01",
            "slot_type": "auto",
            "status": "free",
            "pos_x": 100,
            "pos_y": 100,
            "width": 60,
            "height": 100,
            "rotation": 0
        })
        assert slot_resp.status_code == 201
        sid = slot_resp.json()["id"]

        # 2. Conductor crea reserva con is_open_stay = True (Hora Libre)
        from datetime import datetime, timedelta
        start = datetime.utcnow() + timedelta(minutes=10)
        end = start + timedelta(hours=2)
        res_resp = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "slot_id": sid,
            "license_plate": f"HLB-{uuid.uuid4().hex[:3].upper()}",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "is_open_stay": True
        })
        assert res_resp.status_code == 201, res_resp.text
        res_data = res_resp.json()
        assert res_data["is_open_stay"] is True

        # 3. Admin actualiza a allow_open_stay = False
        put_resp = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json={
            "allow_open_stay": False
        })
        assert put_resp.status_code == 200
        assert put_resp.json()["allow_open_stay"] is False



