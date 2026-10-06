"""Agrega reservation_id, is_hidden y tags a resenas; e is_hidden a incidencias.

Revision ID: 20261006_01
Revises: 20260929_03
Create Date: 2026-10-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "20261006_01"
down_revision: Union[str, None] = "20260929_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. resenas: reservation_id, is_hidden, tags
    resenas_cols = {col["name"] for col in inspector.get_columns("resenas")}

    if "reservation_id" not in resenas_cols:
        op.add_column(
            "resenas",
            sa.Column("reservation_id", sa.Integer(), sa.ForeignKey("reservas.id"), nullable=True, unique=True),
        )
        op.create_index(
            "ix_resenas_reservation_id",
            "resenas",
            ["reservation_id"],
            unique=True,
        )

    if "is_hidden" not in resenas_cols:
        op.add_column(
            "resenas",
            sa.Column("is_hidden", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        )

    if "tags" not in resenas_cols:
        op.add_column(
            "resenas",
            sa.Column("tags", sa.String(length=255), nullable=True),
        )

    # 2. incidencias: is_hidden
    incidencias_cols = {col["name"] for col in inspector.get_columns("incidencias")}
    if "is_hidden" not in incidencias_cols:
        op.add_column(
            "incidencias",
            sa.Column("is_hidden", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        )

    # 3. personal: asegurar security_pin VARCHAR(255)
    personal_cols = {col["name"]: col for col in inspector.get_columns("personal")}
    if "security_pin" in personal_cols:
        col_type = str(personal_cols["security_pin"].get("type", ""))
        if "255" not in col_type:
            try:
                op.alter_column(
                    "personal",
                    "security_pin",
                    existing_type=sa.String(length=20),
                    type_=sa.String(length=255),
                    existing_nullable=True,
                )
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    resenas_cols = {col["name"] for col in inspector.get_columns("resenas")}
    if "reservation_id" in resenas_cols:
        op.drop_index("ix_resenas_reservation_id", table_name="resenas")
        op.drop_column("resenas", "reservation_id")
    if "is_hidden" in resenas_cols:
        op.drop_column("resenas", "is_hidden")
    if "tags" in resenas_cols:
        op.drop_column("resenas", "tags")

    incidencias_cols = {col["name"] for col in inspector.get_columns("incidencias")}
    if "is_hidden" in incidencias_cols:
        op.drop_column("incidencias", "is_hidden")
