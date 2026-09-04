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
