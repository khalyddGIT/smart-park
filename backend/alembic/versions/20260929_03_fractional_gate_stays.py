"""Permite que garita registre permanencias fraccionarias, por ejemplo 1.5 horas.

Revision ID: 20260929_03
Revises: 20260929_02
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260929_03"
down_revision: Union[str, None] = "20260929_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "reservas",
        "estimated_hours",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "reservas",
        "estimated_hours",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="ROUND(estimated_hours)::integer",
    )
