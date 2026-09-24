import uuid
from datetime import datetime, timedelta, timezone
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
async def test_local_admin_profile_and_rates_full_persistence():
    admin_token, admin_email, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create parking
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera San Martín",
            "address": "Jr. San Martín 456",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 25,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        parking_id = p_resp.json()["id"]

        # 2. Update every single operational field
        update_payload = {
            "name": "Cochera San Martín - Sede Centro",
            "owner": "Don José Huamán",
            "ruc": "10456789012",
            "whatsapp": "+51966123456",
            "phone": "+51966123456",
            "schedule": "Lunes a Domingo: 06:00 - 23:00",
            "reference": "Frente a la Alameda",
            "level": "Nivel 1 - Superficie",
            "rate_auto": 6.5,
            "rate_suv": 8.5,
            "rate_mototaxi": 4.0,
            "rate_moto": 3.0,
            "billing_unit": "minute",
            "rate_minute_auto": 0.11,
            "rate_minute_suv": 0.14,
            "rate_minute_mototaxi": 0.07,
            "rate_minute_moto": 0.05,
            "night_shift_enabled": True,
            "night_shift_start": "21:00",
            "night_shift_end": "05:00",
            "night_shift_surcharge": 3.0,
            "tolerance_minutes": 20,
            "require_reservation_prepay": True,
            "reservation_fee": 2.5,
            "allow_open_stay": False,
            "status": "active"
        }

        put_resp = await ac.put(f"/api/v1/parkings/{parking_id}", headers=admin_headers, json=update_payload)
        assert put_resp.status_code == 200, put_resp.text
        updated_data = put_resp.json()

        # 3. Verify in direct GET /parkings/{id} (re-fetch from DB)
        get_resp = await ac.get(f"/api/v1/parkings/{parking_id}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()

        assert fetched["name"] == "Cochera San Martín - Sede Centro"
        assert fetched["owner"] == "Don José Huamán"
        assert fetched["ruc"] == "10456789012"
        assert fetched["whatsapp"] == "+51966123456"
        assert fetched["schedule"] == "Lunes a Domingo: 06:00 - 23:00"
        assert fetched["reference"] == "Frente a la Alameda"
        assert fetched["level"] == "Nivel 1 - Superficie"
        assert fetched["rate_auto"] == 6.5
        assert fetched["rate_suv"] == 8.5
        assert fetched["rate_mototaxi"] == 4.0
        assert fetched["rate_moto"] == 3.0
        assert fetched["billing_unit"] == "minute"
        assert fetched["rate_minute_auto"] == 0.11
        assert fetched["rate_minute_suv"] == 0.14
        assert fetched["rate_minute_mototaxi"] == 0.07
        assert fetched["rate_minute_moto"] == 0.05
        assert fetched["night_shift_enabled"] is True
        assert fetched["night_shift_start"] == "21:00"
        assert fetched["night_shift_end"] == "05:00"
        assert fetched["night_shift_surcharge"] == 3.0
        assert fetched["tolerance_minutes"] == 20
        assert fetched["require_reservation_prepay"] is True
        assert fetched["reservation_fee"] == 2.5
        assert fetched["allow_open_stay"] is False
        assert fetched["status"] == "active"

@pytest.mark.asyncio
async def test_local_admin_floor_plan_cad_sync_persistence():
    admin_token, _, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera CAD Testing",
            "address": "Jr. Manco Capac 789",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        parking_id = p_resp.json()["id"]

        sync_payload = {
            "slots": [
                {"code": "A-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 150, "width": 60, "height": 100, "rotation": 0},
                {"code": "S-02", "floor_level": "Piso 1", "slot_type": "suv", "status": "free", "pos_x": 180, "pos_y": 150, "width": 70, "height": 110, "rotation": 90},
                {"code": "M-03", "floor_level": "Piso 1", "slot_type": "moto", "status": "free", "pos_x": 260, "pos_y": 150, "width": 40, "height": 70, "rotation": 0}
            ],
            "elements": [
                {"element_type": "wall", "pos_x": 50, "pos_y": 50, "width": 300, "height": 10, "rotation": 0},
                {"element_type": "entry", "pos_x": 20, "pos_y": 150, "width": 50, "height": 50, "rotation": 0}
            ]
        }

        sync_res = await ac.post(f"/api/v1/parkings/{parking_id}/floor-plan/sync", headers=admin_headers, json=sync_payload)
        assert sync_res.status_code == 200, sync_res.text

        # Verify slots exist in database
        slots_res = await ac.get(f"/api/v1/parkings/{parking_id}/slots")
        assert slots_res.status_code == 200
        slots = slots_res.json()
        assert len(slots) >= 3
        slot_codes = {s["code"] for s in slots}
        assert "A-01" in slot_codes
        assert "S-02" in slot_codes
        assert "M-03" in slot_codes

@pytest.mark.asyncio
async def test_local_admin_moderation_and_rbac_isolation():
    admin1_token, _, admin1_id = await _register_and_get_token(role="local")
    admin2_token, _, admin2_id = await _register_and_get_token(role="local")
    user_token, _, user_id = await _register_and_get_token(role="user")

    transport = ASGITransport(app=app)
    admin1_headers = {"Authorization": f"Bearer {admin1_token}"}
    admin2_headers = {"Authorization": f"Bearer {admin2_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Admin 1 creates Parking 1
        p1_resp = await ac.post("/api/v1/parkings", headers=admin1_headers, json={
            "name": "Cochera Admin Uno",
            "address": "Portal Constitución 12",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p1_resp.status_code == 201
        p1_id = p1_resp.json()["id"]

        # Admin 2 creates Parking 2
        p2_resp = await ac.post("/api/v1/parkings", headers=admin2_headers, json={
            "name": "Cochera Admin Dos",
            "address": "Jr. Bellido 99",
            "city": "Ayacucho",
            "hourly_rate": 4.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p2_resp.status_code == 201
        p2_id = p2_resp.json()["id"]

        # User posts review on Parking 1
        rev_resp = await ac.post("/api/v1/reviews", headers=user_headers, json={
            "parking_id": p1_id,
            "rating": 1,
            "comment": "Comentario critico para moderar"
        })
        assert rev_resp.status_code == 201
        rev_id = rev_resp.json()["id"]

        # User posts incident on Parking 1
        inc_resp = await ac.post("/api/v1/incidents", headers=user_headers, json={
            "parking_id": p1_id,
            "category": "cajon_bloqueado",
            "description": "Auto bloqueando salida"
        })
        assert inc_resp.status_code == 201
        inc_id = inc_resp.json()["id"]

        # Admin 1 can reply to review on Parking 1
        reply_res = await ac.put(f"/api/v1/reviews/{rev_id}/reply", headers=admin1_headers, json={
            "response": "Lamentamos el inconveniente. Tomamos medidas correctivas inmediatas."
        })
        assert reply_res.status_code == 200

        # Admin 1 can hide review on Parking 1
        hide_rev = await ac.put(f"/api/v1/reviews/{rev_id}/visibility", headers=admin1_headers, json={"is_hidden": True})
        assert hide_rev.status_code == 200
        assert hide_rev.json()["is_hidden"] is True

        # Admin 1 can resolve incident on Parking 1
        resolve_inc = await ac.put(f"/api/v1/incidents/{inc_id}/resolve", headers=admin1_headers, json={
            "resolution_note": "Personal libero la plaza en 5 minutos."
        })
        assert resolve_inc.status_code == 200
        assert resolve_inc.json()["status"] == "resolved"

        # Admin 1 can toggle incident visibility
        hide_inc = await ac.put(f"/api/v1/incidents/{inc_id}/visibility", headers=admin1_headers, json={"is_hidden": True})
        assert hide_inc.status_code == 200
        assert hide_inc.json()["is_hidden"] is True

        # RBAC ISOLATION: Admin 2 CANNOT modify review on Parking 1
        bad_reply = await ac.put(f"/api/v1/reviews/{rev_id}/reply", headers=admin2_headers, json={
            "response": "Intruso respondiendo"
        })
        assert bad_reply.status_code == 403

        bad_hide_rev = await ac.put(f"/api/v1/reviews/{rev_id}/visibility", headers=admin2_headers, json={"is_hidden": False})
        assert bad_hide_rev.status_code == 403

        # Admin 2 CANNOT modify parking 1 profile
        bad_p_edit = await ac.put(f"/api/v1/parkings/{p1_id}", headers=admin2_headers, json={"name": "Robo de Cochera"})
        assert bad_p_edit.status_code == 403


@pytest.mark.asyncio
async def test_driver_sees_local_admin_business_rules_and_rates():
    """Verifica que los cambios hechos por el admin local en tarifas, turno noche,

    tolerancia y prepago se reflejen inmediatamente en la vista del conductor y reservas."""
    admin_token, _, _ = await _register_and_get_token(role="local")
    driver_token, _, _ = await _register_and_get_token(role="user")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Admin local crea sede
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": "Cochera Matriz Plaza",
            "address": "Portal Unión 100",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p_resp.status_code == 201
        pid = p_resp.json()["id"]

        # Crear cajón en la sede
        await ac.post(f"/api/v1/parkings/{pid}/floor-plan/sync", headers=admin_headers, json={
            "slots": [{"code": "A-01", "floor_level": "Piso 1", "slot_type": "auto", "status": "free", "pos_x": 100, "pos_y": 100, "width": 60, "height": 100, "rotation": 0}],
            "elements": []
        })

        # 2. Admin local edita las reglas de negocio: tarifas, turno noche, tolerancia, prepago
        rules_update = {
            "rate_auto": 8.0,
            "hourly_rate": 8.0,
            "rate_suv": 11.0,
            "rate_mototaxi": 5.0,
            "rate_moto": 4.0,
            "billing_unit": "hour",
            "night_shift_enabled": True,
            "night_shift_start": "20:00",
            "night_shift_end": "06:00",
            "night_shift_surcharge": 3.0,
            "tolerance_minutes": 25,
            "require_reservation_prepay": True,
            "reservation_fee": 1.50
        }
        put_resp = await ac.put(f"/api/v1/parkings/{pid}", headers=admin_headers, json=rules_update)
        assert put_resp.status_code == 200

        # 3. Conductor consulta el listado de cocheras (GET /parkings)
        list_resp = await ac.get("/api/v1/parkings")
        assert list_resp.status_code == 200
        driver_parkings = list_resp.json()
        target = next((p for p in driver_parkings if p["id"] == pid), None)
        assert target is not None

        # Verificar que el conductor ve exactamente las tarifas y reglas editadas
        assert target["hourly_rate"] == 8.0
        assert target["rate_auto"] == 8.0
        assert target["rate_suv"] == 11.0
        assert target["rate_mototaxi"] == 5.0
        assert target["rate_moto"] == 4.0
        assert target["night_shift_enabled"] is True
        assert target["night_shift_start"] == "20:00"
        assert target["night_shift_end"] == "06:00"
        assert target["night_shift_surcharge"] == 3.0
        assert target["tolerance_minutes"] == 25
        assert target["require_reservation_prepay"] is True
        assert target["reservation_fee"] == 1.50

        # 4. Conductor consulta detalle directo (GET /parkings/{id})
        detail_resp = await ac.get(f"/api/v1/parkings/{pid}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["hourly_rate"] == 8.0
        assert detail["tolerance_minutes"] == 25
        assert detail["night_shift_enabled"] is True

        # 5. Conductor realiza reserva y se verifica que tome la tolerancia y reglas actualizadas
        # Primero registrar vehículo
        test_plate = f"T{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        await ac.post("/api/v1/vehicles", headers=driver_headers, json={
            "license_plate": test_plate,
            "vehicle_type": "auto"
        })

        now = datetime.now(timezone.utc)
        start_time = (now + timedelta(hours=1)).isoformat()
        end_time = (now + timedelta(hours=3)).isoformat()

        res_create = await ac.post("/api/v1/reservations", headers=driver_headers, json={
            "parking_id": pid,
            "license_plate": test_plate,
            "vehicle_type": "auto",
            "start_time": start_time,
            "end_time": end_time,
            "estimated_hours": 2,
            "tolerance_minutes": 25,
            "pay_now": True
        })
        assert res_create.status_code == 201, res_create.text
        res_data = res_create.json()
        assert res_data["tolerance_minutes"] == 25


@pytest.mark.asyncio
async def test_garita_operator_moto_slot_and_access_persistence():
    # 1. Admin local crea sede con tarifa moto diferenciada
    admin_token, admin_email, _ = await _register_and_get_token(role="local")
    transport = ASGITransport(app=app)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p_resp = await ac.post("/api/v1/parkings", headers=admin_headers, json={
            "name": f"Cochera Garita Test {uuid.uuid4().hex[:4]}",
            "address": "Jr. Garita 123",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "rate_auto": 5.0,
            "rate_moto": 2.50,
            "total_capacity": 20
        })
        assert p_resp.status_code == 201
        pid = p_resp.json()["id"]

        # 2. Admin crea colaborador en personal con status 'Activo' (español) y rol 'local'
        operator_dni = f"{uuid.uuid4().int % 90000000 + 10000000}"
        operator_email = f"juanito_{uuid.uuid4().hex[:6]}@smartpark.com"
        staff_resp = await ac.post("/api/v1/staff", headers=admin_headers, json={
            "parking_id": pid,
            "full_name": "Juanito Operador Garita",
            "dni": operator_dni,
            "position": "Operador de Garita",
            "shift": "Mañana",
            "status": "Activo",
            "email": operator_email,
            "password": "Password123!",
            "system_role": "local",
            "security_pin": "1234"
        })
        assert staff_resp.status_code == 201, staff_resp.text

        # 3. Crear plaza de moto M-03 en el plano CAD
        slot_resp = await ac.post(f"/api/v1/parkings/{pid}/slots", headers=admin_headers, json={
            "code": "M-03",
            "floor_level": "Piso 1",
            "slot_type": "moto",
            "pos_x": 100,
            "pos_y": 100,
            "width": 60,
            "height": 100
        })
        assert slot_resp.status_code == 201, slot_resp.text
        slot_id = slot_resp.json()["id"]

        # 4. Operador inicia sesión
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": operator_email,
            "password": "Password123!"
        })
        assert login_resp.status_code == 200, login_resp.text
        op_token = login_resp.json()["access_token"]
        op_headers = {"Authorization": f"Bearer {op_token}"}

        # 5. Operador consulta reservas de su sede -> NO DEBE DAR 403
        list_resp = await ac.get(f"/api/v1/reservations?parking_id={pid}", headers=op_headers)
        assert list_resp.status_code == 200, f"Expected 200, got {list_resp.status_code}: {list_resp.text}"

        # 6. Operador registra ingreso en M-03 (cajón moto) sin mandar tipo o con auto default
        plate_in = f"F{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        now = datetime.now(timezone.utc)
        res_resp = await ac.post("/api/v1/reservations", headers=op_headers, json={
            "parking_id": pid,
            "slot_id": slot_id,
            "license_plate": plate_in,
            "start_time": now.isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "estimated_hours": 2,
            "vehicle_type": "auto" # default de UI que debe ser auto-adaptado a moto
        })
        assert res_resp.status_code == 201, f"Expected 201, got {res_resp.status_code}: {res_resp.text}"
        res_data = res_resp.json()
        assert res_data["vehicle_type"] == "moto"
        # Tarifa moto 2.50 * 2h = 5.00
        assert res_data["total_cost"] == 5.00
        r_id = res_data["id"]

        # 7. Operador realiza check-in del vehículo
        checkin_resp = await ac.put(f"/api/v1/reservations/{r_id}/check-in", headers=op_headers)
        assert checkin_resp.status_code == 200, checkin_resp.text
        assert checkin_resp.json()["status"] == "active"

        # 8. Operador realiza check-out
        checkout_resp = await ac.put(f"/api/v1/reservations/{r_id}/check-out", headers=op_headers, json={
            "payment_method": "efectivo",
            "amount_paid": 5.00
        })
        assert checkout_resp.status_code == 200, checkout_resp.text
        assert checkout_resp.json()["status"] == "completed"



