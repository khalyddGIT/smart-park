"""Auditoría de solo lectura previa a migraciones de integridad.

Uso: python -m app.db.audit_integrity
"""
from __future__ import annotations

import asyncio
import json

from sqlalchemy import text

from app.db.session import engine


async def collect_integrity_report() -> dict:
    async with engine.connect() as conn:
        duplicate_slots = (await conn.execute(text(
            """
            SELECT parking_id, code, count(*) AS copies
            FROM plazas
            GROUP BY parking_id, code
            HAVING count(*) > 1
            ORDER BY copies DESC, parking_id, code
            """
        ))).mappings().all()
        invalid_slot_statuses = (await conn.execute(text(
            """
            SELECT status, count(*) AS total
            FROM plazas
            WHERE lower(trim(status)) NOT IN (
                'free','occupied','reserved','disabled',
                'libre','disponible','ocupado','ocupada',
                'reservado','reservada','deshabilitado','inhabilitado'
            )
            GROUP BY status
            ORDER BY status
            """
        ))).mappings().all()
        capacity_mismatches = (await conn.execute(text(
            """
            SELECT e.id, e.name, e.total_capacity AS declared_capacity,
                   count(p.id)::integer AS actual_slots
            FROM estacionamientos e
            LEFT JOIN plazas p ON p.parking_id = e.id
            GROUP BY e.id, e.name, e.total_capacity
            HAVING e.total_capacity IS DISTINCT FROM count(p.id)::integer
            ORDER BY e.id
            """
        ))).mappings().all()

    return {
        "ok": not duplicate_slots and not invalid_slot_statuses,
        "duplicate_slots": [dict(row) for row in duplicate_slots],
        "invalid_slot_statuses": [dict(row) for row in invalid_slot_statuses],
        "capacity_mismatches": [dict(row) for row in capacity_mismatches],
    }


async def main() -> int:
    report = await collect_integrity_report()
    print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
    await engine.dispose()
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
