"""Baseline e integridad PostgreSQL para Railway.

Revision ID: 20260928_01
Revises:
Create Date: 2026-09-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.db.session import Base
from app.models import models  # noqa: F401

revision: str = "20260928_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _constraint_names(bind, table: str) -> set[str]:
    inspector = sa.inspect(bind)
    names = {c.get("name") for c in inspector.get_unique_constraints(table)}
    names.update(c.get("name") for c in inspector.get_check_constraints(table))
    return {name for name in names if name}


def upgrade() -> None:
    bind = op.get_bind()

    # Permite instalar desde cero y también adoptar la base existente de Railway.
    Base.metadata.create_all(bind=bind)

    op.execute("UPDATE plazas SET status = 'free' WHERE lower(trim(status)) IN ('libre', 'disponible')")
    op.execute("UPDATE plazas SET status = 'occupied' WHERE lower(trim(status)) IN ('ocupado', 'ocupada')")
    op.execute("UPDATE plazas SET status = 'reserved' WHERE lower(trim(status)) IN ('reservado', 'reservada')")
    op.execute("UPDATE plazas SET status = 'disabled' WHERE lower(trim(status)) IN ('deshabilitado', 'inhabilitado')")

    duplicate = bind.execute(sa.text(
        """
        SELECT parking_id, code, count(*)
        FROM plazas
        GROUP BY parking_id, code
        HAVING count(*) > 1
        LIMIT 1
        """
    )).first()
    if duplicate:
        raise RuntimeError(
            "Migración detenida: existen códigos de plaza duplicados dentro de una sede "
            f"(parking_id={duplicate[0]}, code={duplicate[1]}). Ejecuta la auditoría antes del despliegue."
        )

    invalid_status = bind.execute(sa.text(
        "SELECT id, status FROM plazas WHERE status NOT IN ('free','occupied','reserved','disabled') LIMIT 1"
    )).first()
    if invalid_status:
        raise RuntimeError(f"Estado de plaza inválido: id={invalid_status[0]} status={invalid_status[1]}")

    constraints = _constraint_names(bind, "plazas")
    if "uq_slots_parking_code" not in constraints:
        op.create_unique_constraint("uq_slots_parking_code", "plazas", ["parking_id", "code"])
    if "ck_slots_status" not in constraints:
        op.create_check_constraint(
            "ck_slots_status",
            "plazas",
            "status IN ('free','occupied','reserved','disabled')",
        )

    indexes = {
        "ix_floor_elements_parking": ("elementos_plano", ["parking_id"]),
        "ix_reservations_slot_status": ("reservas", ["slot_id", "status"]),
        "ix_staff_parking_status": ("personal", ["parking_id", "status"]),
        "ix_reviews_parking_created": ("resenas", ["parking_id", "created_at"]),
        "ix_incidents_parking_status": ("incidencias", ["parking_id", "status"]),
    }
    inspector = sa.inspect(bind)
    for index_name, (table, columns) in indexes.items():
        existing = {idx["name"] for idx in inspector.get_indexes(table)}
        if index_name not in existing:
            op.create_index(index_name, table, columns, unique=False)

    # Una sola fuente de verdad: si existen plazas, la capacidad es su conteo real.
    op.execute(
        """
        UPDATE estacionamientos AS e
        SET total_capacity = counts.total
        FROM (
            SELECT parking_id, count(*)::integer AS total
            FROM plazas
            GROUP BY parking_id
        ) AS counts
        WHERE e.id = counts.parking_id
          AND e.total_capacity IS DISTINCT FROM counts.total
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for index_name, table in (
        ("ix_floor_elements_parking", "elementos_plano"),
        ("ix_reservations_slot_status", "reservas"),
        ("ix_staff_parking_status", "personal"),
        ("ix_reviews_parking_created", "resenas"),
        ("ix_incidents_parking_status", "incidencias"),
    ):
        if index_name in {idx["name"] for idx in inspector.get_indexes(table)}:
            op.drop_index(index_name, table_name=table)

    constraints = _constraint_names(bind, "plazas")
    if "ck_slots_status" in constraints:
        op.drop_constraint("ck_slots_status", "plazas", type_="check")
    if "uq_slots_parking_code" in constraints:
        op.drop_constraint("uq_slots_parking_code", "plazas", type_="unique")
