"""Separa la confirmación de pago del alta de una reserva.

Revision ID: 20260929_01
Revises: 20260928_02
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260929_01"
down_revision: Union[str, None] = "20260928_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("reservas")}
    if "payment_status" not in columns:
        op.add_column(
            "reservas",
            sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="not_required"),
        )
    if "payment_deadline" not in columns:
        op.add_column("reservas", sa.Column("payment_deadline", sa.DateTime(), nullable=True))
    op.execute(
        "UPDATE reservas SET payment_status = 'paid' "
        "WHERE prepaid IS TRUE OR COALESCE(amount_paid, 0) > 0"
    )
    checks = {check.get("name") for check in sa.inspect(bind).get_check_constraints("reservas")}
    if "ck_reservas_payment_status" not in checks:
        op.create_check_constraint(
            "ck_reservas_payment_status",
            "reservas",
            "payment_status IN ('not_required', 'pending', 'paid', 'failed', 'cancelled', 'refunded')",
        )
    indexes = {index.get("name") for index in sa.inspect(bind).get_indexes("reservas")}
    if "ix_reservations_payment_deadline" not in indexes:
        op.create_index(
            "ix_reservations_payment_deadline",
            "reservas",
            ["payment_status", "payment_deadline"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_reservations_payment_deadline", table_name="reservas")
    op.drop_constraint("ck_reservas_payment_status", "reservas", type_="check")
    op.drop_column("reservas", "payment_deadline")
    op.drop_column("reservas", "payment_status")
