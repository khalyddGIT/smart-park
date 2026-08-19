import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import engine, Base, AsyncSessionLocal
from app.models.models import User, Parking, Slot, Vehicle, Staff, Review
from app.core.security import get_password_hash
from sqlalchemy.future import select

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session", autouse=True)
async def setup_test_database(anyio_backend):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Asegurar columna created_at en staff si sqlite dev ya existía
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE staff ADD COLUMN created_at DATETIME"))
        except Exception:
            pass
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE reviews ADD COLUMN created_at DATETIME"))
        except Exception:
            pass
    
    async with AsyncSessionLocal() as session:
        # Verificar o crear datos iniciales
        res = await session.execute(select(Parking))
        p = res.scalars().first()
        if not p:
            p1 = Parking(
                name="Smart Park Test Central",
                address="Av. Prueba 123",
                city="San Isidro",
                latitude=-12.089,
                longitude=-77.032,
                hourly_rate=8.50,
                tolerance_minutes=15,
                total_capacity=10,
                image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a"
            )
            session.add(p1)
            await session.commit()
            await session.refresh(p1)

            s1 = Slot(parking_id=p1.id, code="T-01", slot_type="auto", status="free", pos_x=50, pos_y=50, width=60, height=100)
            s2 = Slot(parking_id=p1.id, code="T-02", slot_type="pmr", status="free", pos_x=120, pos_y=50, width=60, height=100)
            session.add_all([s1, s2])

            u1 = User(
                full_name="Test User",
                email="tester@smartpark.com",
                phone="+51 911222333",
                hashed_password=get_password_hash("password123"),
                security_pin="1234",
                role="admin"
            )
            session.add(u1)
            await session.commit()
            await session.refresh(u1)

            v1 = Vehicle(user_id=u1.id, license_plate="TEST-101", vehicle_type="auto", brand="Nissan", model="Versa", color="Azul")
            session.add(v1)
            await session.commit()

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
