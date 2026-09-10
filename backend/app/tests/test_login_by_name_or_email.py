import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.models import User
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal

import uuid
from sqlalchemy import select, delete

@pytest.mark.asyncio
async def test_login_with_email_or_name():
    unique_id = uuid.uuid4().hex[:6]
    test_email = f'pedro_{unique_id}@smartpark.com'
    test_name = f'Pedro Sanchez Flores {unique_id}'
    test_password = 'passwordDual123'

    async with AsyncSessionLocal() as db:
        db_user = User(
            full_name=test_name,
            email=test_email,
            phone='987654321',
            hashed_password=get_password_hash(test_password),
            role='user',
            is_active=True
        )
        db.add(db_user)
        await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        try:
            # 1. Login exitoso con correo exacto
            res_email = await ac.post('/api/v1/auth/login', json={
                'email': test_email,
                'password': test_password
            })
            assert res_email.status_code == 200, f'Error con email: {res_email.text}'
            data_email = res_email.json()
            assert 'access_token' in data_email
            assert data_email['user']['email'] == test_email
            assert data_email['user']['full_name'] == test_name

            # 2. Login exitoso con nombre completo exacto
            res_name = await ac.post('/api/v1/auth/login', json={
                'email': test_name,
                'password': test_password
            })
            assert res_name.status_code == 200, f'Error con nombre: {res_name.text}'
            data_name = res_name.json()
            assert 'access_token' in data_name
            assert data_name['user']['email'] == test_email

            # 3. Login exitoso con nombre en minusculas (case-insensitive)
            res_lower = await ac.post('/api/v1/auth/login', json={
                'email': test_name.lower(),
                'password': test_password
            })
            assert res_lower.status_code == 200, f'Error con nombre en minusculas: {res_lower.text}'

            # 4. Login exitoso con username field
            res_user_field = await ac.post('/api/v1/auth/login', json={
                'username': test_name,
                'password': test_password
            })
            assert res_user_field.status_code == 200, f'Error con campo username: {res_user_field.text}'

            # 5. Login con contrasena incorrecta -> 401
            res_bad_pass = await ac.post('/api/v1/auth/login', json={
                'email': test_name,
                'password': 'wrongPassword!!!'
            })
            assert res_bad_pass.status_code == 401
            assert 'credenciales incorrectas' in res_bad_pass.json()['detail'].lower()

            # 6. Login con usuario inexistente -> 401
            res_not_found = await ac.post('/api/v1/auth/login', json={
                'email': 'Usuario Totalmente Inexistente',
                'password': 'cualquierPassword'
            })
            assert res_not_found.status_code == 401
        finally:
            async with AsyncSessionLocal() as db:
                await db.execute(delete(User).where(User.email == test_email))
                await db.commit()
