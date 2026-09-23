import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.models import User
from app.db.session import AsyncSessionLocal
from sqlalchemy.future import select

def test_create_and_login_worker():
    async def _run():
        transport = ASGITransport(app=app)
        
        # 1. Asegurar un usuario admin local para realizar las peticiones
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.email == "adminlocal@smartpark.com"))
            admin_local = res.scalars().first()
            if not admin_local:
                from app.core.security import get_password_hash
                admin_local = User(
                    full_name="Admin Local Test",
                    email="adminlocal@smartpark.com",
                    hashed_password=get_password_hash("AdminPass123!"),
                    role="local",
                    is_active=True
                )
                db.add(admin_local)
                await db.commit()
                await db.refresh(admin_local)
            
            token = create_access_token(subject=admin_local.id)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        import uuid
        uid = uuid.uuid4().hex[:6]
        worker_email = f"operador.garita.{uid}@smartpark.pe"
        worker_dni = f"77{uuid.uuid4().int % 1000000:06d}"
        worker_password = "OperadorSeguro123!"
        
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 2. Registrar nuevo colaborador con credenciales
            staff_payload = {
                "parking_id": 1,
                "full_name": "Juan Pérez Garita",
                "dni": worker_dni,
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

            # 7. Iniciar sesión Express con PIN (usando el DNI)
            pin_dni_res = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": worker_dni,
                "pin": "5678"
            })
            assert pin_dni_res.status_code == 200
            pin_data = pin_dni_res.json()
            assert "access_token" in pin_data
            assert pin_data["user"]["email"] == worker_email

            # 8. Iniciar sesión Express con PIN (usando el Email)
            pin_email_res = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": worker_email,
                "pin": "5678"
            })
            assert pin_email_res.status_code == 200
            assert "access_token" in pin_email_res.json()

            # 9. PIN incorrecto debe ser rechazado
            bad_pin_res = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": worker_dni,
                "pin": "0000"
            })
            assert bad_pin_res.status_code == 401

            # 10. Iniciar sesión usando DNI y contraseña en /auth/login
            dni_pass_res = await ac.post("/api/v1/auth/login", json={
                "email": worker_dni,
                "password": new_password
            })
            assert dni_pass_res.status_code == 200
            assert "access_token" in dni_pass_res.json()

            # 11. Modificar correo y PIN del colaborador
            new_worker_email = f"nuevo.{worker_email}"
            new_pin = "9988"
            update_creds_res = await ac.put(f"/api/v1/staff/{staff_id}", json={
                "email": new_worker_email,
                "security_pin": new_pin
            }, headers=headers)
            assert update_creds_res.status_code == 200
            updated_staff_data = update_creds_res.json()
            assert updated_staff_data["email"] == new_worker_email

            # 12. Iniciar sesión con nuevo correo
            new_email_login_res = await ac.post("/api/v1/auth/login", json={
                "email": new_worker_email,
                "password": new_password
            })
            assert new_email_login_res.status_code == 200

            # 13. Iniciar sesión con correo antiguo debe fallar
            old_email_login_res = await ac.post("/api/v1/auth/login", json={
                "email": worker_email,
                "password": new_password
            })
            assert old_email_login_res.status_code == 401

            # 14. Iniciar sesión con nuevo PIN
            new_pin_res = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": worker_dni,
                "pin": new_pin
            })
            assert new_pin_res.status_code == 200

            # 15. Crear colaborador con DNI y PIN solamente (sin password previo) y validar login PIN
            bare_dni = f"78{uuid.uuid4().int % 1000000:06d}"
            bare_staff_res = await ac.post("/api/v1/staff", json={
                "parking_id": 1,
                "full_name": "Operador Solo DNI",
                "dni": bare_dni,
                "position": "Operador de Garita",
                "shift": "Tarde (15:00 - 23:00)",
                "status": "Activo",
                "security_pin": "4321"
            }, headers=headers)
            assert bare_staff_res.status_code == 201

            bare_pin_login = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": bare_dni,
                "pin": "4321"
            })
            assert bare_pin_login.status_code == 200
            assert "access_token" in bare_pin_login.json()
    
    asyncio.run(_run())
