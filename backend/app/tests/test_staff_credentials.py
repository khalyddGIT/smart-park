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
            bare_staff_data = bare_staff_res.json()
            assert bare_staff_data["has_account"] is True
            assert bare_staff_data["has_pin"] is True
            assert "operador." in bare_staff_data["email"]
            bare_staff_id = bare_staff_data["id"]

            bare_pin_login = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": bare_dni,
                "pin": "4321"
            })
            assert bare_pin_login.status_code == 200
            assert "access_token" in bare_pin_login.json()

            # 16. Actualizar credenciales del colaborador bare (cambiar PIN a 7799 y asignar correo)
            updated_email = f"operador.promovido.{uid}@smartpark.pe"
            update_bare_res = await ac.put(f"/api/v1/staff/{bare_staff_id}", json={
                "email": updated_email,
                "security_pin": "7799",
                "password": "PasswordActualizado123!"
            }, headers=headers)
            assert update_bare_res.status_code == 200
            updated_bare_data = update_bare_res.json()
            assert updated_bare_data["has_pin"] is True
            assert updated_bare_data["email"] == updated_email

            # Verificar login con el nuevo PIN
            updated_pin_login = await ac.post("/api/v1/auth/login-pin", json={
                "identifier": bare_dni,
                "pin": "7799"
            })
            assert updated_pin_login.status_code == 200

            # Verificar login con correo y contraseña asignados
            updated_email_login = await ac.post("/api/v1/auth/login", json={
                "email": updated_email,
                "password": "PasswordActualizado123!"
            })
            assert updated_email_login.status_code == 200

            # 17. Eliminar colaborador y comprobar que el acceso se revoca
            del_res = await ac.delete(f"/api/v1/staff/{bare_staff_id}", headers=headers)
            assert del_res.status_code == 200

            # Intento de login posterior debe ser rechazado
            revoked_login = await ac.post("/api/v1/auth/login", json={
                "email": updated_email,
                "password": "PasswordActualizado123!"
            })
            assert revoked_login.status_code in (400, 401)
    
    asyncio.run(_run())

def test_worker_reservations_isolation_only_sees_assigned_parking():
    async def _run():
        import uuid
        from datetime import datetime, timedelta
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Admin local crea dos cocheras independientes
            admin_email = f"admin_iso_{uuid.uuid4().hex[:6]}@smartpark.com"
            admin_pwd = "AdminIsoPass123!"
            admin_reg = await ac.post("/api/v1/auth/register", json={
                "full_name": "Admin Sede Central",
                "email": admin_email,
                "phone": "+51 988 333 444",
                "password": admin_pwd,
                "role": "local"
            })
            admin_token = admin_reg.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}

            # Cochera A (donde trabajará el operador)
            park_a = (await ac.post("/api/v1/parkings", headers=admin_headers, json={
                "name": f"Cochera A {uuid.uuid4().hex[:4]}",
                "address": "Jr. Arequipa 123",
                "city": "Ayacucho",
                "hourly_rate": 5.0,
                "total_capacity": 5,
                "tolerance_minutes": 15
            })).json()
            pid_a = park_a["id"]

            slot_a = (await ac.post(f"/api/v1/parkings/{pid_a}/slots", headers=admin_headers, json={
                "code": "A-01", "floor_level": "Piso 1", "slot_type": "auto", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80
            })).json()["id"]

            # Cochera B (de otro dueño o con nombre similar)
            park_b = (await ac.post("/api/v1/parkings", headers=admin_headers, json={
                "name": f"Cochera B {uuid.uuid4().hex[:4]}",
                "address": "Jr. Lima 456",
                "city": "Ayacucho",
                "hourly_rate": 6.0,
                "total_capacity": 5,
                "tolerance_minutes": 15,
                "owner": "pepito trabajador"
            })).json()
            pid_b = park_b["id"]

            slot_b = (await ac.post(f"/api/v1/parkings/{pid_b}/slots", headers=admin_headers, json={
                "code": "B-01", "floor_level": "Piso 1", "slot_type": "auto", "pos_x": 10, "pos_y": 10, "width": 50, "height": 80
            })).json()["id"]

            # 2. Conductores crean reservas en Cochera A y Cochera B
            driver_a_reg = await ac.post("/api/v1/auth/register", json={
                "full_name": "Conductor Cochera A",
                "email": f"driver_a_{uuid.uuid4().hex[:6]}@smartpark.com",
                "phone": "+51 988 555 666",
                "password": "DriverPass123!",
                "role": "user"
            })
            driver_a_token = driver_a_reg.json()["access_token"]
            driver_a_headers = {"Authorization": f"Bearer {driver_a_token}"}

            driver_b_reg = await ac.post("/api/v1/auth/register", json={
                "full_name": "Conductor Cochera B",
                "email": f"driver_b_{uuid.uuid4().hex[:6]}@smartpark.com",
                "phone": "+51 988 777 888",
                "password": "DriverPass123!",
                "role": "user"
            })
            driver_b_token = driver_b_reg.json()["access_token"]
            driver_b_headers = {"Authorization": f"Bearer {driver_b_token}"}

            now = datetime.utcnow()
            plate_a = f"T{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().int % 900 + 100}"
            plate_b = f"K{uuid.uuid4().hex[:2].upper()}-{uuid.uuid4().int % 900 + 100}"

            res_a_resp = await ac.post("/api/v1/reservations", headers=driver_a_headers, json={
                "parking_id": pid_a, "slot_id": slot_a, "license_plate": plate_a, "vehicle_type": "auto",
                "start_time": (now + timedelta(hours=1)).isoformat(), "end_time": (now + timedelta(hours=2)).isoformat()
            })
            assert res_a_resp.status_code == 201, res_a_resp.text
            res_a_id = res_a_resp.json()["id"]

            res_b_resp = await ac.post("/api/v1/reservations", headers=driver_b_headers, json={
                "parking_id": pid_b, "slot_id": slot_b, "license_plate": plate_b, "vehicle_type": "auto",
                "start_time": (now + timedelta(hours=1)).isoformat(), "end_time": (now + timedelta(hours=2)).isoformat()
            })
            assert res_b_resp.status_code == 201, res_b_resp.text
            res_b_id = res_b_resp.json()["id"]

            # 3. Se registra un trabajador de garita en Cochera A con nombre "pepito trabajador"
            worker_dni = f"88{uuid.uuid4().int % 1000000:06d}"
            worker_email = f"pepito.{uuid.uuid4().hex[:6]}@smartpark.pe"
            worker_pwd = "TrabajadorPass123!"
            await ac.post("/api/v1/staff", headers=admin_headers, json={
                "parking_id": pid_a,
                "full_name": "pepito trabajador",
                "dni": worker_dni,
                "position": "Operador de Garita",
                "shift": "Tarde",
                "status": "Activo",
                "email": worker_email,
                "password": worker_pwd,
                "security_pin": "9999",
                "system_role": "local"
            })

            # 4. El trabajador inicia sesión
            login_res = await ac.post("/api/v1/auth/login", json={
                "email": worker_email,
                "password": worker_pwd
            })
            assert login_res.status_code == 200
            worker_token = login_res.json()["access_token"]
            worker_headers = {"Authorization": f"Bearer {worker_token}"}

            # 5. El trabajador consulta las reservas de garita
            list_res = await ac.get("/api/v1/reservations", headers=worker_headers)
            assert list_res.status_code == 200
            worker_reservations = list_res.json()
            worker_pids = [r["parking_id"] for r in worker_reservations]

            # EL TRABAJADOR SOLO DEBE VER RESERVAS DE COCHERA A (pid_a)
            assert pid_a in worker_pids
            assert pid_b not in worker_pids, "Fuga de seguridad: El trabajador está viendo reservas de Cochera B"
            assert all(pid == pid_a for pid in worker_pids), f"Se encontraron reservas ajenas: {worker_pids}"

            # 6. Si intenta realizar check-in o check-out en la reserva de Cochera B -> 403 Forbidden
            unauth_checkin = await ac.put(f"/api/v1/reservations/{res_b_id}/check-in", headers=worker_headers)
            assert unauth_checkin.status_code == 403
            assert "otra sede" in unauth_checkin.json()["detail"].lower()

            # Pero en su propia Cochera A -> 200 OK
            auth_checkin = await ac.put(f"/api/v1/reservations/{res_a_id}/check-in", headers=worker_headers)
            assert auth_checkin.status_code == 200

    asyncio.run(_run())

