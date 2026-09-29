"""Permite reservas sin una duración de estadía anticipada.

Revision ID: 20260929_02
Revises: 20260929_01
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260929_02"
down_revision: Union[str, None] = "20260929_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    end_time = next(
        (column for column in sa.inspect(bind).get_columns("reservas") if column["name"] == "end_time"),
        None,
    )
    if end_time and not end_time.get("nullable", True):
        op.alter_column(
            "reservas",
            "end_time",
            existing_type=sa.DateTime(),
            nullable=True,
        )
    columns = {column["name"]: column for column in sa.inspect(bind).get_columns("reservas")}
    for name in ("estimated_hours", "estimated_minutes"):
        if name in columns:
            op.alter_column(
                "reservas",
                name,
                existing_type=sa.Integer(),
                nullable=True,
                server_default=None,
            )


def downgrade() -> None:
    # Las filas abiertas no se pueden volver NOT NULL sin inventar una salida.
    op.execute("UPDATE reservas SET end_time = COALESCE(actual_exit, actual_entry, start_time) WHERE end_time IS NULL")
    op.alter_column(
        "reservas",
        "end_time",
        existing_type=sa.DateTime(),
        nullable=False,
    )
