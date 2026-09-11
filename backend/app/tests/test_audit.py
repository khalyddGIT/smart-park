import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal
from app.models.models import User, AuditLog
from app.core.audit_service import record_audit_event
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_audit_logs_unification_and_severity_filter():
    transport = ASGITransport(app=app)
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == "admin_audit_test@smartpark.com"))
        user = res.scalars().first()
        if not user:
            user = User(
                full_name="Superadmin Audit Test",
                email="admin_audit_test@smartpark.com",
                hashed_password="hashedpassword123",
                role="platform",
                phone="+51 999 888 777",
                security_pin="hashedpin123",
                is_active=True
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        await record_audit_event(
            db=session,
            action="Modificacion de Ajustes Maestros Test",
            target="Comision: 10% a 15%",
            user_id=user.id,
            user_email=user.email,
            role="platform",
            severity="Crítico",
            details={"parametro": "comision", "nuevo": 15}
        )
        await record_audit_event(
            db=session,
            action="Consulta Informativa Test",
            target="Visualizacion de metricas",
            user_id=user.id,
            user_email=user.email,
            role="platform",
            severity="Info",
            details={"modulo": "dashboard"}
        )

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_all = await ac.get("/api/v1/audit/logs", headers=headers)
        assert res_all.status_code == 200
        logs_all = res_all.json()
        assert isinstance(logs_all, list)
        assert len(logs_all) > 0
        
        found_crit = any(l["action"] == "Modificacion de Ajustes Maestros Test" for l in logs_all)
        assert found_crit, "El evento de auditoría persistido debe aparecer en /audit/logs"

        res_crit = await ac.get("/api/v1/audit/logs?severity=Crítico", headers=headers)
        assert res_crit.status_code == 200
        logs_crit = res_crit.json()
        assert all(l["severity"] == "Crítico" for l in logs_crit)
        assert any(l["action"] == "Modificacion de Ajustes Maestros Test" for l in logs_crit)

        res_info = await ac.get("/api/v1/audit/logs?severity=Info", headers=headers)
        assert res_info.status_code == 200
        logs_info = res_info.json()
        assert all(l["severity"] == "Info" for l in logs_info)


@pytest.mark.asyncio
async def test_local_admin_audit_logs_strict_isolation():
    import uuid
    from app.models.models import Slot
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Admin 1
        a1_email = f"admin1_{uuid.uuid4().hex[:8]}@smartpark.com"
        r1 = await ac.post("/api/v1/auth/register", json={
            "full_name": "Admin Local Uno",
            "email": a1_email,
            "phone": "+51 988 111 001",
            "password": "Password123!",
            "role": "local"
        })
        assert r1.status_code == 201
        token1 = r1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Register Admin 2
        a2_email = f"admin2_{uuid.uuid4().hex[:8]}@smartpark.com"
        r2 = await ac.post("/api/v1/auth/register", json={
            "full_name": "Admin Local Dos",
            "email": a2_email,
            "phone": "+51 988 111 002",
            "password": "Password123!",
            "role": "local"
        })
        assert r2.status_code == 201
        token2 = r2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Register User / Conductor
        u_email = f"user_{uuid.uuid4().hex[:8]}@smartpark.com"
        ru = await ac.post("/api/v1/auth/register", json={
            "full_name": "Conductor Test",
            "email": u_email,
            "phone": "+51 988 111 003",
            "password": "Password123!",
            "role": "user"
        })
        assert ru.status_code == 201
        user_token = ru.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Admin 1 creates Parking 1
        p1 = await ac.post("/api/v1/parkings", headers=headers1, json={
            "name": "Cochera Admin 1 Sede Centro",
            "address": "Jr. Lima 100",
            "city": "Ayacucho",
            "hourly_rate": 5.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p1.status_code == 201
        p1_id = p1.json()["id"]

        # Admin 2 creates Parking 2
        p2 = await ac.post("/api/v1/parkings", headers=headers2, json={
            "name": "Cochera Admin 2 Sede Norte",
            "address": "Jr. Cuzco 200",
            "city": "Ayacucho",
            "hourly_rate": 4.0,
            "total_capacity": 10,
            "tolerance_minutes": 15
        })
        assert p2.status_code == 201
        p2_id = p2.json()["id"]

        # Create slots for Parking 1 and Parking 2
        async with AsyncSessionLocal() as session:
            s1 = Slot(parking_id=p1_id, code="A-01", status="free")
            s2 = Slot(parking_id=p2_id, code="B-01", status="free")
            session.add_all([s1, s2])
            await session.commit()
            await session.refresh(s1)
            await session.refresh(s2)
            s1_id = s1.id
            s2_id = s2.id

            # Also record an audit event for Parking 1
            await record_audit_event(
                db=session,
                action="Apertura Garita Turno Mañana P1",
                target="Garita Central P1",
                user_email=a1_email,
                role="local",
                parking_id=p1_id,
                parking_name="Cochera Admin 1 Sede Centro"
            )
            # Record an audit event for Parking 2
            await record_audit_event(
                db=session,
                action="Apertura Garita Turno Mañana P2",
                target="Garita Central P2",
                user_email=a2_email,
                role="local",
                parking_id=p2_id,
                parking_name="Cochera Admin 2 Sede Norte"
            )
            # Record a Global Platform audit event (no parking)
            await record_audit_event(
                db=session,
                action="Ajuste Global SuperAdmin Plataforma",
                target="Parametros Globales",
                role="platform",
                severity="Crítico"
            )

        from datetime import datetime, timedelta
        now = datetime.utcnow()
        t1_start = (now + timedelta(hours=2)).isoformat()
        t1_end = (now + timedelta(hours=4)).isoformat()
        t2_start = (now + timedelta(hours=5)).isoformat()
        t2_end = (now + timedelta(hours=7)).isoformat()

        # Register Vehicle for User 1
        plate1 = f"A{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        v1_res = await ac.post("/api/v1/vehicles", headers=user_headers, json={
            "license_plate": plate1,
            "vehicle_type": "auto"
        })
        assert v1_res.status_code == 201

        # User 1 books slot in Parking 1
        res1 = await ac.post("/api/v1/reservations", headers=user_headers, json={
            "parking_id": p1_id,
            "slot_id": s1_id,
            "license_plate": plate1,
            "start_time": t1_start,
            "end_time": t1_end,
            "tolerance_minutes": 15,
            "pay_now": False
        })
        assert res1.status_code == 201, res1.text

        # Register User 2 / Conductor 2 (respecting Rule S-01: max 1 active reservation per user)
        u2_email = f"user2_{uuid.uuid4().hex[:8]}@smartpark.com"
        ru2 = await ac.post("/api/v1/auth/register", json={
            "full_name": "Conductor Dos Test",
            "email": u2_email,
            "phone": "+51 988 111 004",
            "password": "Password123!",
            "role": "user"
        })
        assert ru2.status_code == 201
        user2_token = ru2.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Register Vehicle for User 2
        plate2 = f"B{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
        v2_res = await ac.post("/api/v1/vehicles", headers=user2_headers, json={
            "license_plate": plate2,
            "vehicle_type": "auto"
        })
        assert v2_res.status_code == 201

        # User 2 books slot in Parking 2
        res2 = await ac.post("/api/v1/reservations", headers=user2_headers, json={
            "parking_id": p2_id,
            "slot_id": s2_id,
            "license_plate": plate2,
            "start_time": t2_start,
            "end_time": t2_end,
            "tolerance_minutes": 15,
            "pay_now": False
        })
        assert res2.status_code == 201, res2.text

        # Now test Admin 1 audit logs query:
        a1_logs_resp = await ac.get("/api/v1/audit/logs", headers=headers1)
        assert a1_logs_resp.status_code == 200
        a1_logs = a1_logs_resp.json()

        # Admin 1 MUST see Parking 1 events
        has_p1_action = any("P1" in l["action"] or plate1 in l["target"] or l.get("parking_id") == p1_id for l in a1_logs)
        assert has_p1_action, "Admin 1 debe ver las interacciones ocurridas en su local"

        # Admin 1 MUST NOT see ANY Parking 2 events
        has_p2_action = any("P2" in l["action"] or plate2 in l["target"] or l.get("parking_id") == p2_id for l in a1_logs)
        assert not has_p2_action, "Admin 1 NO debe ver interacciones de la cochera de Admin 2"

        # Admin 1 MUST NOT see global platform events
        has_platform = any(l["action"] == "Ajuste Global SuperAdmin Plataforma" for l in a1_logs)
        assert not has_platform, "Admin 1 NO debe ver eventos globales de plataforma"

        # Admin 1 querying Parking 2 explicitly must be REJECTED with 403 Forbidden
        bad_p2_resp = await ac.get(f"/api/v1/audit/logs?parking_id={p2_id}", headers=headers1)
        assert bad_p2_resp.status_code == 403, "Intentar acceder a la auditoría de otra cochera debe ser rechazado con 403"

