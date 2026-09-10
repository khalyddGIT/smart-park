import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.security import create_access_token, get_password_hash
from app.models.models import User, Staff, Parking
from app.db.session import AsyncSessionLocal


def test_pin_garita_login_full_lifecycle():
    async def _run():
        transport = ASGITransport(app=app)
        
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.role == 'local'))
            admin_local = res.scalars().first()
            if not admin_local:
                admin_local = User(
                    full_name='Admin Local Garita Test',
                    email=f'admin_local_{uuid.uuid4().hex[:6]}@smartpark.pe',
                    hashed_password=get_password_hash('AdminPass123!'),
                    role='local',
                    is_active=True
                )
                db.add(admin_local)
                await db.commit()
                await db.refresh(admin_local)
            
            admin_token = create_access_token(subject=admin_local.id)

        admin_headers = {'Authorization': f'Bearer {admin_token}'}
        uid = uuid.uuid4().hex[:6]
        worker_dni = f'75{uuid.uuid4().int % 1000000:06d}'
        worker_email = f'garita.op.{uid}@smartpark.pe'
        worker_name = f'Operador Garita {uid}'
        worker_pin = '4321'

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            staff_res = await ac.post('/api/v1/staff', json={
                'parking_id': 1,
                'full_name': worker_name,
                'dni': worker_dni,
                'position': 'Operador de Garita',
                'shift': 'Tarde (15:00 - 23:00)',
                'status': 'Activo',
                'email': worker_email,
                'password': 'PasswordGarita2026!#',
                'security_pin': worker_pin,
                'system_role': 'local'
            }, headers=admin_headers)
            assert staff_res.status_code == 201

            # Login PIN usando DNI
            res_dni = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_dni,
                'pin': worker_pin
            })
            assert res_dni.status_code == 200
            data_dni = res_dni.json()
            assert 'access_token' in data_dni
            assert data_dni['user']['email'] == worker_email
            assert data_dni['user']['role'] == 'local'

            # Login PIN usando Email
            res_email = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_email,
                'pin': worker_pin
            })
            assert res_email.status_code == 200
            assert 'access_token' in res_email.json()

            # Login PIN usando Nombre Completo
            res_name = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_name,
                'pin': worker_pin
            })
            assert res_name.status_code == 200
            assert 'access_token' in res_name.json()

            # Rechazo de PIN incorrecto -> 401
            res_bad_pin = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_dni,
                'pin': '9999'
            })
            assert res_bad_pin.status_code == 401
            assert 'incorrecto' in res_bad_pin.json()['detail'].lower()

            # Rechazo de PIN no numérico -> 422
            res_non_digit = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_dni,
                'pin': 'abcd'
            })
            assert res_non_digit.status_code == 422

            # Rechazo de PIN menor a 4 dígitos -> 422
            res_short_pin = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_dni,
                'pin': '123'
            })
            assert res_short_pin.status_code == 422

            # Rechazo de PIN mayor a 6 dígitos -> 422
            res_long_pin = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': worker_dni,
                'pin': '1234567'
            })
            assert res_long_pin.status_code == 422

            # Rechazo de identificador vacío -> 422
            res_empty_id = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': '   ',
                'pin': '1234'
            })
            assert res_empty_id.status_code == 422

            # Usuario inexistente -> 401
            res_unknown = await ac.post('/api/v1/auth/login-pin', json={
                'identifier': 'inexistente_99999999',
                'pin': '1234'
            })
            assert res_unknown.status_code == 401

    asyncio.run(_run())


def test_garita_affiliation_submission_and_flow():
    async def _run():
        transport = ASGITransport(app=app)
        uid = uuid.uuid4().hex[:6]

        async with AsyncClient(transport=transport, base_url='http://test') as ac:
            aff_payload = {
                'parkingName': f'Cochera Garita Central {uid}',
                'ownerName': f'Don Garitero {uid}',
                'email': f'garita.{uid}@gmail.com',
                'phone': '+51 988 777 666',
                'address': 'Jr. Grau 250',
                'city': 'Ayacucho - Huamanga',
                'capacity': 40,
                'rate': 5.50,
                'notes': 'Cochera con garita techada y control de accesos'
            }
            res = await ac.post('/api/v1/affiliation-requests', json=aff_payload)
            assert res.status_code == 201
            data = res.json()
            assert data['parkingName'] == aff_payload['parkingName']
            assert data['ownerName'] == aff_payload['ownerName']
            assert data['status'] == 'pending'

            invalid_payload = aff_payload.copy()
            invalid_payload['email'] = 'not-an-email'
            res_inv = await ac.post('/api/v1/affiliation-requests', json=invalid_payload)
            assert res_inv.status_code == 422

    asyncio.run(_run())
