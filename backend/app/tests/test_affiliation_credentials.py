import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.security import create_access_token, get_password_hash
from app.models.models import User, Parking
from app.db.session import AsyncSessionLocal


def test_approve_affiliation_provisions_local_admin_user_and_can_login():
    async def _run():
        transport = ASGITransport(app=app)
        
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'platform'))
            superadmin = res.scalars().first()
            if not superadmin:
                superadmin = User(
                    full_name='Super Admin Plataforma',
                    email='superadmin_test@smartpark.pe',
                    hashed_password=get_password_hash('SuperAdminPass123!'),
                    role='platform',
                    is_active=True
                )
                db.add(superadmin)
                await db.commit()
                await db.refresh(superadmin)
            
            token = create_access_token(subject=superadmin.id)
        
        headers = {'Authorization': f'Bearer {token}'}
        uid = uuid.uuid4().hex[:6]
        owner_email = f'dueno.cochera.{uid}@gmail.com'
        owner_name = f'Don Pepito {uid}'
        parking_name = f'Cochera Los Sauces {uid}'
        chosen_password = 'ClaveLocal2026!#'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            create_req_payload = {
                'parkingName': parking_name,
                'ownerName': owner_name,
                'email': owner_email,
                'phone': '+51 966 123 456',
                'address': 'Jr. Bellido 450',
                'city': 'Ayacucho - Huamanga',
                'capacity': 35,
                'rate': 6.00,
                'notes': 'Cochera techada centrica'
            }
            req_res = await ac.post('/api/v1/affiliation-requests', json=create_req_payload)
            assert req_res.status_code == 201
            req_data = req_res.json()
            req_id = req_data['id']

            approve_payload = {
                'adminEmail': owner_email,
                'adminPassword': chosen_password,
                'adminName': owner_name,
                'adminPhone': '966123456'
            }
            approve_res = await ac.put(f'/api/v1/affiliation-requests/{req_id}/approve', json=approve_payload, headers=headers)
            assert approve_res.status_code == 200
            approve_data = approve_res.json()
            assert approve_data['status'] == 'approved'
            assert approve_data['admin_email'] == owner_email
            assert approve_data['admin_password'] == chosen_password
            parking_id = approve_data['parking_id']
            assert parking_id > 0

            login_payload = {
                'email': owner_email,
                'password': chosen_password
            }
            login_res = await ac.post('/api/v1/auth/login', json=login_payload)
            assert login_res.status_code == 200
            login_data = login_res.json()
            assert 'access_token' in login_data
            assert login_data['user']['email'] == owner_email
            assert login_data['user']['role'] == 'local'

    asyncio.run(_run())


def test_set_parking_admin_credentials_and_login():
    async def _run():
        transport = ASGITransport(app=app)
        
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'platform'))
            superadmin = res.scalars().first()
            if not superadmin:
                superadmin = User(
                    full_name='Super Admin Plataforma',
                    email='superadmin_test@smartpark.pe',
                    hashed_password=get_password_hash('SuperAdminPass123!'),
                    role='platform',
                    is_active=True
                )
                db.add(superadmin)
                await db.commit()
                await db.refresh(superadmin)
            
            token = create_access_token(subject=superadmin.id)
        
        headers = {'Authorization': f'Bearer {token}'}
        uid = uuid.uuid4().hex[:6]
        admin_email = f'nuevo.admin.sede.{uid}@smartpark.pe'
        new_password = 'PasswordSede999!#'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            set_res = await ac.post(
                '/api/v1/parkings/1/admin-credentials',
                json={
                    'email': admin_email,
                    'password': new_password,
                    'fullName': 'Administrador Jr 28 de Julio',
                    'phone': '966987654'
                },
                headers=headers
            )
            assert set_res.status_code == 200
            set_data = set_res.json()
            assert set_data['has_account'] is True
            assert set_data['admin_email'] == admin_email
            assert set_data['temp_password'] == new_password

            get_res = await ac.get('/api/v1/parkings/1/admin-credentials', headers=headers)
            assert get_res.status_code == 200
            get_data = get_res.json()
            assert get_data['admin_email'] == admin_email
            assert get_data['has_account'] is True
            assert get_data['role'] == 'local'

            login_res = await ac.post('/api/v1/auth/login', json={'email': admin_email, 'password': new_password})
            assert login_res.status_code == 200
            assert login_res.json()['user']['role'] == 'local'

    asyncio.run(_run())


def test_approve_affiliation_with_snake_case_payload():
    async def _run():
        transport = ASGITransport(app=app)
        
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'platform'))
            superadmin = res.scalars().first()
            if not superadmin:
                superadmin = User(
                    full_name='Super Admin Plataforma',
                    email='superadmin_test@smartpark.pe',
                    hashed_password=get_password_hash('SuperAdminPass123!'),
                    role='platform',
                    is_active=True
                )
                db.add(superadmin)
                await db.commit()
                await db.refresh(superadmin)
            
            token = create_access_token(subject=superadmin.id)
        
        headers = {'Authorization': f'Bearer {token}'}
        uid = uuid.uuid4().hex[:6]
        owner_email = f'afiliado.snake.{uid}@gmail.com'
        owner_name = f'Don Snake {uid}'
        parking_name = f'Cochera Snake {uid}'
        chosen_password = 'SnakePassword2026!#'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            req_res = await ac.post('/api/v1/affiliation-requests', json={
                'parkingName': parking_name,
                'ownerName': owner_name,
                'email': owner_email,
                'capacity': 20,
                'rate': 4.50
            })
            assert req_res.status_code == 201
            req_id = req_res.json()['id']

            # Enviar formato snake_case como hace el frontend
            approve_res = await ac.put(f'/api/v1/affiliation-requests/{req_id}/approve', json={
                'admin_email': owner_email,
                'admin_password': chosen_password,
                'admin_name': owner_name,
                'admin_phone': '987654321'
            }, headers=headers)
            assert approve_res.status_code == 200
            approve_data = approve_res.json()
            assert approve_data['admin_password'] == chosen_password
            assert approve_data['admin_email'] == owner_email

            # Comprobar que puede hacer login con las credenciales actualizadas
            login_res = await ac.post('/api/v1/auth/login', json={
                'email': owner_email.upper(),  # Prueba también case insensitivity
                'password': chosen_password
            })
            assert login_res.status_code == 200
            assert login_res.json()['user']['role'] == 'local'

    asyncio.run(_run())


def test_update_credentials_email_only_preserves_password():
    """Al cambiar solo el email y dejar la contraseña vacía, la contraseña actual se debe conservar intacta."""
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'platform'))
            superadmin = res.scalars().first()
            if not superadmin:
                superadmin = User(
                    full_name='Super Admin Plataforma',
                    email='superadmin_test@smartpark.pe',
                    hashed_password=get_password_hash('SuperAdminPass123!'),
                    role='platform',
                    is_active=True
                )
                db.add(superadmin)
                await db.commit()
                await db.refresh(superadmin)
            token = create_access_token(subject=superadmin.id)

        headers = {'Authorization': f'Bearer {token}'}
        uid = uuid.uuid4().hex[:6]
        original_email = f'admin.orig.{uid}@smartpark.pe'
        new_email = f'admin.nuevo.{uid}@smartpark.pe'
        existing_password = 'PasswordOriginal2026!'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            # 1. Crear credenciales iniciales
            r1 = await ac.post(
                '/api/v1/parkings/1/admin-credentials',
                json={'email': original_email, 'password': existing_password, 'fullName': 'Admin Inicial'},
                headers=headers
            )
            assert r1.status_code == 200

            # 2. Login con credenciales iniciales funciona
            l1 = await ac.post('/api/v1/auth/login', json={'email': original_email, 'password': existing_password})
            assert l1.status_code == 200

            # 3. SuperAdmin cambia SOLO el email (password=None, previous_email provisto)
            r2 = await ac.post(
                '/api/v1/parkings/1/admin-credentials',
                json={'email': new_email, 'previous_email': original_email, 'fullName': 'Admin Inicial'},
                headers=headers
            )
            assert r2.status_code == 200
            assert r2.json()['admin_email'] == new_email

            # 4. Login con nuevo email y la MISMA contraseña existente funciona
            l2 = await ac.post('/api/v1/auth/login', json={'email': new_email, 'password': existing_password})
            assert l2.status_code == 200
            assert l2.json()['user']['email'] == new_email
            assert l2.json()['user']['role'] == 'local'

    asyncio.run(_run())


def test_update_credentials_password_only_and_6_char_password():
    """Actualizar la contraseña a una clave de 6 caracteres funciona y permite iniciar sesión."""
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'platform'))
            superadmin = res.scalars().first()
            token = create_access_token(subject=superadmin.id)

        headers = {'Authorization': f'Bearer {token}'}
        uid = uuid.uuid4().hex[:6]
        email = f'admin.passonly.{uid}@smartpark.pe'
        initial_pass = 'InitialPass123#'
        new_short_pass = '123456'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            # 1. Crear
            r1 = await ac.post(
                '/api/v1/parkings/1/admin-credentials',
                json={'email': email, 'password': initial_pass},
                headers=headers
            )
            assert r1.status_code == 200

            # 2. Actualizar solo password con 6 caracteres
            r2 = await ac.post(
                '/api/v1/parkings/1/admin-credentials',
                json={'email': email, 'password': new_short_pass},
                headers=headers
            )
            assert r2.status_code == 200
            assert r2.json()['temp_password'] == new_short_pass

            # 3. Login con la nueva contraseña de 6 caracteres funciona
            l = await ac.post('/api/v1/auth/login', json={'email': email, 'password': new_short_pass})
            assert l.status_code == 200
            assert l.json()['user']['role'] == 'local'

    asyncio.run(_run())

