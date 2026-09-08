import os
import json
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.models import User, RoleEnum
from app.core.security import create_access_token, get_password_hash
from app.services.backup_service import (
    generate_database_backup,
    get_backup_status,
    list_backups,
    verify_backup_file,
    BACKUPS_DIR
)


@pytest.mark.asyncio
async def test_generate_database_backup_service():
    """Prueba que el servicio extraiga datos, calcule SHA-256 y persista en disco."""
    async with AsyncSessionLocal() as db_session:
        result = await generate_database_backup(db_session, reason="unit_test")
    
    assert result["success"] is True
    assert "filename" in result
    assert "filepath" in result
    assert os.path.exists(result["filepath"])
    assert result["total_records"] >= 0
    assert result["checksum_sha256"] is not None

    # Verificar lectura e integridad
    with open(result["filepath"], "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "metadata" in data
    assert "data" in data
    assert "usuarios" in data["data"]
    assert "estacionamientos" in data["data"]

    # Verificar verificación de integridad
    verification = verify_backup_file(result["filepath"])
    assert verification["valid"] is True
    assert verification["checksum_verified"] is True


@pytest.mark.asyncio
async def test_backup_api_security_enforcement():
    """Verifica que usuarios sin rol 'platform' no puedan acceder a endpoints de backup."""
    async with AsyncSessionLocal() as db_session:
        res = await db_session.execute(select(User).where(User.email == "conductor.test@smartpark.com"))
        user = res.scalars().first()
        if not user:
            user = User(
                full_name="Conductor Test",
                email="conductor.test@smartpark.com",
                hashed_password=get_password_hash("pass123"),
                role="user",
                is_active=True
            )
            db_session.add(user)
            await db_session.commit()
            await db_session.refresh(user)
        user_id = user.id

    token = create_access_token(subject=user_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        # Estado protegido
        res = await client.get("/api/v1/backups/status", headers=headers)
        assert res.status_code == 403

        # Generación protegida
        res = await client.post("/api/v1/backups/generate", headers=headers)
        assert res.status_code == 403

        # Descarga protegida
        res = await client.get("/api/v1/backups/download/latest", headers=headers)
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_superadmin_can_generate_and_download_backup():
    """Verifica que el Superadmin pueda consultar estado, generar snapshot y descargarlo."""
    async with AsyncSessionLocal() as db_session:
        res = await db_session.execute(select(User).where(User.email == "superadmin@smartpark.com"))
        admin = res.scalars().first()
        if not admin:
            admin = User(
                full_name="Super Admin",
                email="superadmin@smartpark.com",
                hashed_password=get_password_hash("pass123"),
                role="platform",
                is_active=True
            )
            db_session.add(admin)
            await db_session.commit()
            await db_session.refresh(admin)
        admin_id = admin.id

    token = create_access_token(subject=admin_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Generar backup bajo demanda
        gen_res = await client.post("/api/v1/backups/generate", headers=headers)
        assert gen_res.status_code == 201
        gen_data = gen_res.json()
        assert gen_data["success"] is True
        filename = gen_data["filename"]

        # 2. Consultar estado general
        status_res = await client.get("/api/v1/backups/status", headers=headers)
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["enabled"] is True
        assert status_data["total_backups_stored"] >= 1
        assert status_data["latest_backup"] is not None

        # 3. Descargar el último backup
        dl_res = await client.get("/api/v1/backups/download/latest", headers=headers)
        assert dl_res.status_code == 200
        assert "application/json" in dl_res.headers.get("content-type", "")
        payload = dl_res.json()
        assert payload["metadata"]["checksum_sha256"] == gen_data["checksum_sha256"]

        # 4. Descargar por nombre específico
        dl_specific = await client.get(f"/api/v1/backups/download/{filename}", headers=headers)
        assert dl_specific.status_code == 200

        # 5. Verificar archivo vía API
        ver_res = await client.post("/api/v1/backups/verify", json={"filename": filename}, headers=headers)
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        assert ver_data["valid"] is True
        assert ver_data["checksum_verified"] is True
