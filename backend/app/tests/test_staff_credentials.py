import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.models import User
from app.db.session import AsyncSessionLocal
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_create_and_login_worker():
    transport = ASGITransport(app=app)
    
    # 1. Asegurar un usuario admin local para realizar las peticiones
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.role == "local"))
        admin_local = res.scalars().first()
        if not admin_local:
            from app.core.security import get_password_hash
            admin_local = User(
                full_name="Admin Local Test",
                email="adminlocal_test@smartpark.pe",
                hashed_password=get_password_hash("AdminPass123!"),
                role="local",
                is_active=True
            )
            db.add(admin_local)
            await db.commit()
            await db.refresh(admin_local)
        
        token = create_access_token(subject=admin_local.id)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    worker_email = "operador.garita.test@smartpark.pe"
    worker_password = "OperadorSeguro123!"
    
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 2. Registrar nuevo colaborador con credenciales
        staff_payload = {
            "parking_id": 1,
            "full_name": "Juan Pérez Garita",
            "dni": "77889911",
            "position": "Operador de Garita",
            "shift": "Mañana (07:00 - 15:00)",
            "status": "Activo",
            "email": worker_email,
            "password": worker_password,
            "security_pin": "5678",
            "system_role": "local"
        }
        create_res = await ac.post("/api/v1/staff", json=staff_payload, headers=headers)
        assert create_res.status_code == 201
        staff_data = create_res.json()
        assert staff_data["full_name"] == "Juan Pérez Garita"
        assert staff_data["has_account"] is True
        assert staff_data["system_role"] == "local"
        staff_id = staff_data["id"]
        
        # 3. Iniciar sesión con las credenciales del trabajador recién creado
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": worker_email,
            "password": worker_password,
            "full_name": "Juan Pérez Garita"
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data
        assert login_data["user"]["email"] == worker_email
        assert login_data["user"]["role"] == "local"
        
        # 4. Actualizar contraseña del trabajador desde el admin
        new_password = "NuevaClaveGarita2026!"
        update_res = await ac.put(f"/api/v1/staff/{staff_id}", json={
            "password": new_password,
            "position": "Supervisor de Turno"
        }, headers=headers)
        assert update_res.status_code == 200
        
        # 5. Iniciar sesión con la nueva contraseña
        new_login_res = await ac.post("/api/v1/auth/login", json={
            "email": worker_email,
            "password": new_password,
            "full_name": "Juan Pérez Garita"
        })
        assert new_login_res.status_code == 200
        assert "access_token" in new_login_res.json()
        
        # 6. Intentar iniciar sesión con la clave antigua debe fallar
        old_login_res = await ac.post("/api/v1/auth/login", json={
            "email": worker_email,
            "password": worker_password,
            "full_name": "Juan Pérez Garita"
        })
        assert old_login_res.status_code == 401
