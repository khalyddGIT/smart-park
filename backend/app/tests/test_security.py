"""
Tests de regresión de seguridad para la API de Smart-Park.
Verifican que los routers sensibles exijan autenticación y roles adecuados.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _login_and_get_token(email: str, password: str, full_name: str = "Test") -> str:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password, "full_name": full_name},
        )
    assert r.status_code == 200, f"Login falló para {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------
# Routers administrativos: sin token deben rechazar (401)
# ---------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/users"),
    ("POST", "/api/v1/users"),
    ("GET", "/api/v1/staff"),
    ("POST", "/api/v1/parkings"),
    ("DELETE", "/api/v1/parkings/1"),
    ("PUT", "/api/v1/parkings/1"),
    ("POST", "/api/v1/parkings/1/floor-plan/sync"),
    ("GET", "/api/v1/vehicles/999999"),
    ("GET", "/api/v1/reservations/999999"),
])
async def test_protected_endpoints_reject_anonymous(method, path):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.request(method, path, json={})
    assert r.status_code == 401, f"{method} {path} debería exigir token"


# ---------------------------------------------------------------
# Escalada de privilegios: conductor NO puede usar router /users
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_driver_cannot_access_users_router():
    email = f"driver_{uuid.uuid4().hex[:8]}@smartpark.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r_reg = await ac.post("/api/v1/auth/register", json={
            "full_name": "Conductor Test", "email": email,
            "phone": "+51 900 000 001", "password": "S3gura!2026",
        })
        assert r_reg.status_code == 201
        token = r_reg.json()["access_token"]

        r = await ac.get("/api/v1/users", headers=_auth_header(token))
    assert r.status_code == 403, "Un conductor no debe listar usuarios del directorio global"


# ---------------------------------------------------------------
# Super Admin SÍ puede gestionar el directorio de usuarios
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_platform_admin_can_list_users():
    token = await _login_and_get_token("superadmin@smartpark.com", "SmartParkSuperAdmin2026!")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/v1/users", headers=_auth_header(token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------------------------------------------------------------
# Google OAuth: fail-closed sin client_id configurado
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_google_login_fails_closed_without_client_id(monkeypatch):
    import app.api.v1.auth as auth_module
    monkeypatch.setattr(auth_module, "GOOGLE_CLIENT_ID", "")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Intento de suplantación: enviar solo el email de un superadmin sin token válido
        r = await ac.post("/api/v1/auth/google", json={
            "token": "", "email": "superadmin@smartpark.com", "name": "Atacante",
        })
    assert r.status_code == 503, "Sin GOOGLE_CLIENT_ID el endpoint debe rechazar siempre"


# ---------------------------------------------------------------
# RBAC: Conductores rechazados de endpoints de administración (403)
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_driver_cannot_access_local_admin_or_superadmin_endpoints():
    email = f"driver_rbac_{uuid.uuid4().hex[:8]}@smartpark.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r_reg = await ac.post("/api/v1/auth/register", json={
            "full_name": "Conductor RBAC", "email": email,
            "phone": "+51 911 000 111", "password": "Password123!",
            "role": "user",
        })
        assert r_reg.status_code == 201
        token = r_reg.json()["access_token"]
        headers = _auth_header(token)

        # 1. Parkings admin endpoints
        assert (await ac.post("/api/v1/parkings", json={"name": "Fake"}, headers=headers)).status_code == 403
        assert (await ac.put("/api/v1/parkings/1", json={"name": "Hacked"}, headers=headers)).status_code == 403
        assert (await ac.post("/api/v1/parkings/1/floor-plan/sync", json={"elements": [], "slots": []}, headers=headers)).status_code == 403
        assert (await ac.post("/api/v1/parkings/1/cameras", json={"name": "Cam 1", "url": "rtsp://fake"}, headers=headers)).status_code == 403
        assert (await ac.post("/api/v1/parkings/1/slots", json={"parking_id": 1, "code": "X-01", "slot_type": "auto"}, headers=headers)).status_code == 403

        # 2. Staff endpoints
        assert (await ac.get("/api/v1/staff", headers=headers)).status_code == 403
        assert (await ac.post("/api/v1/staff", json={
            "parking_id": 1, "full_name": "Worker Fake", "dni": "71112222",
            "position": "Operador", "shift": "Mañana"
        }, headers=headers)).status_code == 403

        # 3. Incidents & Reviews moderation
        assert (await ac.put("/api/v1/incidents/1/resolve", json={"resolution_note": "Nota"}, headers=headers)).status_code == 403
        assert (await ac.put("/api/v1/incidents/1/visibility", json={"is_hidden": True}, headers=headers)).status_code == 403
        assert (await ac.put("/api/v1/reviews/1/visibility", json={"is_hidden": True}, headers=headers)).status_code == 403
        assert (await ac.put("/api/v1/reviews/1/reply", json={"response": "Gracias"}, headers=headers)).status_code == 403


# ---------------------------------------------------------------
# Aislamiento Multi-Tenant: Admin Sede A NUNCA puede acceder/modificar Sede B
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_sede_rbac_isolation_local_admin_sede_a_cannot_modify_sede_b():
    from app.db.session import AsyncSessionLocal
    from app.models.models import Parking, User, Slot, Incident, Review, Reservation
    from app.core.security import get_password_hash, create_access_token
    from datetime import datetime, timedelta, timezone

    uid_a = uuid.uuid4().hex[:6]
    uid_b = uuid.uuid4().hex[:6]
    email_a = f"admin.sede.a.{uid_a}@smartpark.pe"
    email_b = f"admin.sede.b.{uid_b}@smartpark.pe"

    async with AsyncSessionLocal() as session:
        # Sede A
        sede_a = Parking(
            name=f"Sede A {uid_a}", address="Av A 123", city="Ayacucho",
            latitude=-13.16, longitude=-74.22, hourly_rate=5.0,
            total_capacity=10, email=email_a, owner="Admin Sede A"
        )
        session.add(sede_a)
        await session.flush()

        user_a = User(
            full_name="Admin Sede A", email=email_a,
            hashed_password=get_password_hash("PasswordA123!"),
            role="local", is_active=True
        )
        session.add(user_a)

        # Sede B
        sede_b = Parking(
            name=f"Sede B {uid_b}", address="Av B 456", city="Ayacucho",
            latitude=-13.17, longitude=-74.23, hourly_rate=6.0,
            total_capacity=10, email=email_b, owner="Admin Sede B"
        )
        session.add(sede_b)
        await session.flush()

        user_b = User(
            full_name="Admin Sede B", email=email_b,
            hashed_password=get_password_hash("PasswordB123!"),
            role="local", is_active=True
        )
        session.add(user_b)
        await session.flush()

        # Elementos restringidos pertenecientes exclusivamente a Sede B
        slot_b = Slot(parking_id=sede_b.id, code=f"B-{uid_b[:2]}", slot_type="auto", status="free")
        session.add(slot_b)
        await session.flush()

        inc_b = Incident(
            parking_id=sede_b.id, user_id=user_b.id, user_name="Admin Sede B",
            category="seguridad", description="Invasión no autorizada en Sede B", status="reported"
        )
        session.add(inc_b)

        rev_b = Review(
            parking_id=sede_b.id, user_id=user_b.id, user_name="Tester",
            rating=3, comment="Reseña de Sede B"
        )
        session.add(rev_b)

        now = datetime.now(timezone.utc)
        res_b = Reservation(
            code=f"RES-{uid_b}",
            qr_code=f"QR-{uid_b}",
            user_id=user_b.id, parking_id=sede_b.id, slot_id=slot_b.id,
            license_plate="SEB-123", start_time=now, end_time=now + timedelta(hours=2),
            total_cost=10.0,
            status="pending"
        )
        session.add(res_b)
        await session.commit()

        token_a = create_access_token(subject=user_a.id)
        token_b = create_access_token(subject=user_b.id)
        p_b_id = sede_b.id
        inc_b_id = inc_b.id
        rev_b_id = rev_b.id
        res_b_id = res_b.id

    headers_a = _auth_header(token_a)
    headers_b = _auth_header(token_b)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Admin A intentando sincronizar plano de Sede B -> 403
        r_sync = await ac.post(f"/api/v1/parkings/{p_b_id}/floor-plan/sync", json={"elements": [], "slots": []}, headers=headers_a)
        assert r_sync.status_code == 403, f"Admin A no debe sincronizar plano de Sede B: {r_sync.text}"

        # Admin A intentando crear cámara en Sede B -> 403
        r_cam = await ac.post(f"/api/v1/parkings/{p_b_id}/cameras", json={"name": "Espía", "url": "rtsp://x"}, headers=headers_a)
        assert r_cam.status_code == 403, f"Admin A no debe crear cámaras en Sede B: {r_cam.text}"

        # Admin A intentando crear cajón en Sede B -> 403
        r_slot = await ac.post(f"/api/v1/parkings/{p_b_id}/slots", json={"parking_id": p_b_id, "code": "X-99", "slot_type": "auto"}, headers=headers_a)
        assert r_slot.status_code == 403, f"Admin A no debe crear slots en Sede B: {r_slot.text}"

        # Admin A intentando registrar personal en Sede B -> 403
        r_staff = await ac.post("/api/v1/staff", json={
            "parking_id": p_b_id, "full_name": "Infiltrado", "dni": f"78{uuid.uuid4().int % 1000000:06d}",
            "position": "Operador", "shift": "Noche"
        }, headers=headers_a)
        assert r_staff.status_code == 403, f"Admin A no debe agregar staff a Sede B: {r_staff.text}"

        # Admin A intentando ver personal de Sede B -> 403
        r_list_staff = await ac.get(f"/api/v1/staff?parking_id={p_b_id}", headers=headers_a)
        assert r_list_staff.status_code == 403, f"Admin A no debe listar personal de Sede B: {r_list_staff.text}"

        # Admin A intentando resolver incidencia de Sede B -> 403
        r_inc_res = await ac.put(f"/api/v1/incidents/{inc_b_id}/resolve", json={"resolution_note": "Intruso"}, headers=headers_a)
        assert r_inc_res.status_code == 403, f"Admin A no debe resolver incidencia de Sede B: {r_inc_res.text}"

        # Admin A intentando ocultar incidencia de Sede B -> 403
        r_inc_vis = await ac.put(f"/api/v1/incidents/{inc_b_id}/visibility", json={"is_hidden": True}, headers=headers_a)
        assert r_inc_vis.status_code == 403, f"Admin A no debe alterar visibilidad de incidencia de Sede B: {r_inc_vis.text}"

        # Admin A intentando moderar reseña de Sede B -> 403
        r_rev_vis = await ac.put(f"/api/v1/reviews/{rev_b_id}/visibility", json={"is_hidden": True}, headers=headers_a)
        assert r_rev_vis.status_code == 403, f"Admin A no debe alterar reseña de Sede B: {r_rev_vis.text}"

        # Admin A intentando responder reseña de Sede B -> 403
        r_rev_rep = await ac.put(f"/api/v1/reviews/{rev_b_id}/reply", json={"response": "Intruso"}, headers=headers_a)
        assert r_rev_rep.status_code == 403, f"Admin A no debe responder reseña de Sede B: {r_rev_rep.text}"

        # Admin A intentando hacer check-in a reserva de Sede B -> 403
        r_checkin = await ac.put(f"/api/v1/reservations/{res_b_id}/check-in", headers=headers_a)
        assert r_checkin.status_code == 403, f"Admin A no debe hacer check-in en Sede B: {r_checkin.text}"

        # En contraste: Admin B SÍ tiene permisos sobre su propia Sede B -> 200
        r_b_ok = await ac.put(f"/api/v1/incidents/{inc_b_id}/resolve", json={"resolution_note": "Resuelto por Admin B"}, headers=headers_b)
        assert r_b_ok.status_code == 200, f"Admin B debe poder gestionar su propia sede: {r_b_ok.text}"


# ---------------------------------------------------------------
# Privacidad: Reseñas e incidencias is_hidden NUNCA visibles a conductores
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_hidden_reviews_and_incidents_never_visible_to_drivers():
    from app.db.session import AsyncSessionLocal
    from app.models.models import Parking, User, Incident, Review
    from app.core.security import get_password_hash, create_access_token

    uid = uuid.uuid4().hex[:6]
    driver_email = f"driver_privacy_{uid}@smartpark.pe"

    async with AsyncSessionLocal() as session:
        parking = Parking(
            name=f"Sede Privacidad {uid}", address="Av Privada 100", city="Ayacucho",
            latitude=-13.16, longitude=-74.22, hourly_rate=5.0, total_capacity=10
        )
        session.add(parking)
        await session.flush()

        driver_user = User(
            full_name="Conductor Privacidad", email=driver_email,
            hashed_password=get_password_hash("Password123!"),
            role="user", is_active=True
        )
        session.add(driver_user)
        await session.flush()

        # Incidencia oculta y visible
        inc_hidden = Incident(
            parking_id=parking.id, user_id=driver_user.id, user_name="Conductor",
            category="seguridad", description="Incidencia secreta oculta",
            status="reported", is_hidden=True
        )
        inc_public = Incident(
            parking_id=parking.id, user_id=driver_user.id, user_name="Conductor",
            category="general", description="Incidencia publica visible",
            status="reported", is_hidden=False
        )
        session.add_all([inc_hidden, inc_public])

        # Reseña oculta y visible
        rev_hidden = Review(
            parking_id=parking.id, user_id=driver_user.id, user_name="Conductor",
            rating=1, comment="Comentario difamatorio ocultado", is_hidden=True
        )
        rev_public = Review(
            parking_id=parking.id, user_id=driver_user.id, user_name="Conductor",
            rating=5, comment="Excelente servicio visible", is_hidden=False
        )
        session.add_all([rev_hidden, rev_public])
        await session.commit()

        driver_token = create_access_token(subject=driver_user.id)
        p_id = parking.id
        h_inc_id = inc_hidden.id
        p_inc_id = inc_public.id
        h_rev_id = rev_hidden.id
        p_rev_id = rev_public.id

    driver_headers = _auth_header(driver_token)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Listado de incidencias para conductor: NO debe incluir inc_hidden
        r_incs = await ac.get("/api/v1/incidents", headers=driver_headers)
        assert r_incs.status_code == 200
        inc_ids = [i["id"] for i in r_incs.json()]
        assert h_inc_id not in inc_ids, "La incidencia oculta no debe aparecer en el listado para conductores"
        assert p_inc_id in inc_ids, "La incidencia pública debe aparecer en el listado"

        # 2. Acceso directo por ID a incidencia oculta para conductor: DEBE devolver 404
        r_h_inc = await ac.get(f"/api/v1/incidents/{h_inc_id}", headers=driver_headers)
        assert r_h_inc.status_code == 404, "Acceso directo a incidencia oculta debe responder 404 Not Found"

        # Acceso directo a incidencia pública: 200 OK
        r_p_inc = await ac.get(f"/api/v1/incidents/{p_inc_id}", headers=driver_headers)
        assert r_p_inc.status_code == 200

        # 3. Listado de reseñas para conductor: NO debe incluir rev_hidden
        r_revs = await ac.get(f"/api/v1/reviews?parking_id={p_id}", headers=driver_headers)
        assert r_revs.status_code == 200
        rev_ids = [r["id"] for r in r_revs.json()]
        assert h_rev_id not in rev_ids, "La reseña oculta no debe aparecer en el listado para conductores"
        assert p_rev_id in rev_ids, "La reseña pública debe aparecer en el listado"

        # 4. Listado anónimo (sin autenticación): NO debe incluir rev_hidden
        r_revs_anon = await ac.get(f"/api/v1/reviews?parking_id={p_id}")
        assert r_revs_anon.status_code == 200
        anon_rev_ids = [r["id"] for r in r_revs_anon.json()]
        assert h_rev_id not in anon_rev_ids, "La reseña oculta no debe aparecer para anónimos"


# ---------------------------------------------------------------
# Casos Extremos: Validación de IDs inválidos, fechas incongruentes y placas malformadas
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_payloads_rejected_with_validation_errors():
    from app.core.security import create_access_token
    from datetime import datetime, timedelta, timezone

    driver_token = create_access_token(subject=1)
    headers = _auth_header(driver_token)
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. ID de parking negativo o cero en reserva -> 422
        r_neg_p = await ac.post("/api/v1/reservations", json={
            "parking_id": -1, "license_plate": "ABC-123",
            "start_time": now.isoformat(), "end_time": (now + timedelta(hours=1)).isoformat()
        }, headers=headers)
        assert r_neg_p.status_code == 422, "parking_id negativo debe ser rechazado con 422"

        r_zero_p = await ac.post("/api/v1/reservations", json={
            "parking_id": 0, "license_plate": "ABC-123",
            "start_time": now.isoformat(), "end_time": (now + timedelta(hours=1)).isoformat()
        }, headers=headers)
        assert r_zero_p.status_code == 422, "parking_id = 0 debe ser rechazado con 422"

        # 2. ID de slot negativo en reserva -> 422
        r_neg_s = await ac.post("/api/v1/reservations", json={
            "parking_id": 1, "slot_id": -5, "license_plate": "ABC-123",
            "start_time": now.isoformat(), "end_time": (now + timedelta(hours=1)).isoformat()
        }, headers=headers)
        assert r_neg_s.status_code == 422, "slot_id negativo debe ser rechazado con 422"

        # 3. Fecha de fin anterior o igual a la de inicio -> 422
        r_backwards_time = await ac.post("/api/v1/reservations", json={
            "parking_id": 1, "license_plate": "ABC-123",
            "start_time": (now + timedelta(hours=2)).isoformat(),
            "end_time": now.isoformat()
        }, headers=headers)
        assert r_backwards_time.status_code == 422, "end_time anterior a start_time debe ser rechazado con 422"

        # 4. Placas vehiculares malformadas -> 422
        malformed_plates = [
            "123",           # Sin guión y muy corta
            "ABC123",        # Sin guión
            "AB!-123",       # Carácter especial inválido
            "A-1",           # Demasiado corta
            "ABCDE-12345",   # Demasiado larga
            "XYZ-999-EXTRA"  # Múltiples guiones / estructura inválida
        ]
        for plate in malformed_plates:
            r_plate = await ac.post("/api/v1/vehicles", json={
                "license_plate": plate,
                "vehicle_type": "auto",
                "brand": "Toyota",
                "model": "Yaris"
            }, headers=headers)
            assert r_plate.status_code == 422, f"Placa malformada '{plate}' debió ser rechazada con 422, obtuvo {r_plate.status_code}"

