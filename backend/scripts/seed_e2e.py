"""Datos mínimos y deterministas para Playwright en CI.

Este script se niega a ejecutarse fuera de TESTING=1 para evitar que las
credenciales de prueba o sedes ficticias lleguen a Railway/producción.
"""
import asyncio
import os

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models.models import Parking, Slot, User


async def seed() -> None:
    if os.getenv("TESTING") != "1":
        raise RuntimeError("seed_e2e.py sólo puede ejecutarse con TESTING=1")

    async with AsyncSessionLocal() as session:
        user = await session.scalar(
            select(User).where(User.email == "usuario@smartpark.com")
        )
        if user is None:
            session.add(
                User(
                    full_name="Usuario E2E",
                    email="usuario@smartpark.com",
                    phone="+51 900000001",
                    hashed_password=get_password_hash("password123"),
                    role="user",
                    is_active=True,
                )
            )

        parking = await session.scalar(
            select(Parking).where(Parking.email == "e2e@smartpark.test")
        )
        if parking is None:
            parking = Parking(
                name="Smart Park E2E",
                address="Jr. Pruebas 100",
                city="Ayacucho",
                latitude=-13.1604,
                longitude=-74.2259,
                hourly_rate=5.0,
                total_capacity=1,
                email="e2e@smartpark.test",
                status="active",
            )
            session.add(parking)
            await session.flush()
            session.add(
                Slot(
                    parking_id=parking.id,
                    code="E2E-01",
                    slot_type="auto",
                    status="free",
                    pos_x=120,
                    pos_y=120,
                )
            )

        await session.commit()


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
