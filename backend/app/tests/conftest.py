"""Fixtures globales de la suite de pruebas.

Garantiza que la BD (SQLite archivo o PostgreSQL) tenga TODAS las tablas y las
columnas añadidas por evoluciones recientes del modelo, sin depender del orden
alfabético de ejecución ni de que el servidor FastAPI haya corrido su startup.
"""
import asyncio
import pytest


@pytest.fixture(scope="session", autouse=True)
def _ensure_schema():
    async def _run():
        from sqlalchemy import text
        from app.db.session import engine, Base
        from app.models import models  # noqa: F401 — registra tablas en Base.metadata

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            lite_adds = [
                ("estacionamientos", "description", "TEXT"),
                ("estacionamientos", "phone", "VARCHAR(30)"),
                ("estacionamientos", "email", "VARCHAR(150)"),
                ("estacionamientos", "reference", "VARCHAR(255)"),
                ("estacionamientos", "level", "VARCHAR(100)"),
                ("estacionamientos", "camera_url", "TEXT"),
                ("estacionamientos", "camera_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "camera_calibration", "TEXT"),
            ]
            if str(engine.url).startswith("sqlite"):
                for tbl, col, decl in lite_adds:
                    rows = (await conn.execute(text(f"PRAGMA table_info({tbl})"))).all()
                    if col not in {r[1] for r in rows}:
                        await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {decl}"))
            else:
                for tbl, col, decl in lite_adds:
                    try:
                        await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} {decl}"))
                    except Exception:
                        pass

        # Seed parkings y usuarios iniciales para pruebas
        from app.db.session import AsyncSessionLocal
        from app.models.models import User, Parking
        from app.core.security import get_password_hash, hash_pin
        from sqlalchemy.future import select

        async with AsyncSessionLocal() as session:
            res_p = await session.execute(select(Parking))
            if not res_p.scalars().first():
                p1 = Parking(
                    id=1,
                    name="Smart Park Plaza Mayor",
                    address="Portal Unión 42",
                    city="Ayacucho",
                    latitude=-13.1604,
                    longitude=-74.2259,
                    hourly_rate=5.00,
                    tolerance_minutes=15,
                    total_capacity=20
                )
                session.add(p1)
                await session.commit()

            res_admin = await session.execute(select(User).where(User.email == "superadmin@smartpark.com"))
            if not res_admin.scalars().first():
                super_admin = User(
                    full_name="Super Administrador",
                    email="superadmin@smartpark.com",
                    phone="+51 999999999",
                    hashed_password=get_password_hash("SmartParkSuperAdmin2026!"),
                    security_pin=hash_pin("7391"),
                    role="platform",
                    is_active=True
                )
                session.add(super_admin)
                await session.commit()

    return asyncio.run(_run())