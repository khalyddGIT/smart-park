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

    return asyncio.run(_run())