"""Fixtures globales de la suite de pruebas.

La app solo usa PostgreSQL en local/producción. Los tests son la única
excepción y usan un SQLite AISLADO y temporal (no los .db del proyecto),
activado con TESTING=1 antes de importar la app.
"""
import asyncio
import os
import tempfile

# Debe ir antes de cualquier import de app.* (config lee env al importarse)
os.environ["TESTING"] = "1"
os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{tempfile.gettempdir()}/smartpark_test.db",
)
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
                ("estacionamientos", "owner", "VARCHAR(150)"),
                ("estacionamientos", "ruc", "VARCHAR(20)"),
                ("estacionamientos", "whatsapp", "VARCHAR(30)"),
                ("estacionamientos", "schedule", "VARCHAR(120)"),
                ("estacionamientos", "socials", "TEXT"),
                ("estacionamientos", "maps_url", "TEXT"),
                ("estacionamientos", "description", "TEXT"),
                ("estacionamientos", "phone", "VARCHAR(30)"),
                ("estacionamientos", "email", "VARCHAR(150)"),
                ("estacionamientos", "reference", "VARCHAR(255)"),
                ("estacionamientos", "level", "VARCHAR(100)"),
                ("estacionamientos", "camera_url", "TEXT"),
                ("estacionamientos", "camera_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "camera_calibration", "TEXT"),
                ("estacionamientos", "rate_auto", "FLOAT DEFAULT 5.0"),
                ("estacionamientos", "rate_suv", "FLOAT DEFAULT 7.0"),
                ("estacionamientos", "rate_mototaxi", "FLOAT DEFAULT 3.5"),
                ("estacionamientos", "rate_moto", "FLOAT DEFAULT 2.5"),
                ("estacionamientos", "billing_unit", "VARCHAR(20) DEFAULT 'hour'"),
                ("estacionamientos", "rate_minute_auto", "FLOAT DEFAULT 0.08"),
                ("estacionamientos", "rate_minute_suv", "FLOAT DEFAULT 0.12"),
                ("estacionamientos", "rate_minute_mototaxi", "FLOAT DEFAULT 0.06"),
                ("estacionamientos", "rate_minute_moto", "FLOAT DEFAULT 0.04"),
                ("estacionamientos", "night_shift_enabled", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "night_shift_start", "VARCHAR(10) DEFAULT '20:00'"),
                ("estacionamientos", "night_shift_end", "VARCHAR(10) DEFAULT '06:00'"),
                ("estacionamientos", "night_shift_surcharge", "FLOAT DEFAULT 0.0"),
                ("estacionamientos", "require_reservation_prepay", "BOOLEAN DEFAULT FALSE"),
                ("estacionamientos", "reservation_fee", "FLOAT DEFAULT 0.0"),
                ("estacionamientos", "min_stay_hours", "INTEGER DEFAULT 1"),
                ("estacionamientos", "max_stay_hours", "INTEGER DEFAULT 24"),
                ("estacionamientos", "min_stay_minutes", "INTEGER DEFAULT 15"),
                ("estacionamientos", "max_stay_minutes", "INTEGER DEFAULT 1440"),
                ("estacionamientos", "allow_open_stay", "BOOLEAN DEFAULT TRUE"),
                ("reservas", "tolerance_minutes", "INTEGER DEFAULT 15"),
                ("reservas", "vehicle_type", "VARCHAR(20) DEFAULT 'auto'"),
                ("reservas", "estimated_hours", "INTEGER DEFAULT 1"),
                ("reservas", "estimated_minutes", "INTEGER DEFAULT 60"),
                ("reservas", "billing_unit", "VARCHAR(20) DEFAULT 'hour'"),
                ("reservas", "is_night_shift", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "prepaid", "BOOLEAN DEFAULT FALSE"),
                ("reservas", "is_open_stay", "BOOLEAN DEFAULT FALSE"),
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