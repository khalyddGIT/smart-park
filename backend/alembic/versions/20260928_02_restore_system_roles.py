"""Restaura los roles canónicos de las cuentas internas.

Revision ID: 20260928_02
Revises: 20260928_01
Create Date: 2026-09-28
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20260928_02"
down_revision: Union[str, None] = "20260928_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No altera contraseñas, PINs ni datos personales. Sólo repara RBAC y
    # reactiva las identidades administrativas que ya existen.
    op.execute(
        """
        UPDATE usuarios
        SET role = CASE lower(email)
            WHEN 'superadmin@smartpark.com' THEN 'platform'
            WHEN 'adminlocal@smartpark.com' THEN 'local'
            WHEN 'operador.garita@smartpark.pe' THEN 'local'
            WHEN 'usuario@smartpark.com' THEN 'user'
            ELSE role
        END,
        is_active = CASE
            WHEN lower(email) IN (
                'superadmin@smartpark.com',
                'adminlocal@smartpark.com'
            ) THEN TRUE
            ELSE is_active
        END
        WHERE lower(email) IN (
            'superadmin@smartpark.com',
            'adminlocal@smartpark.com',
            'operador.garita@smartpark.pe',
            'usuario@smartpark.com'
        )
        """
    )


def downgrade() -> None:
    # Migración de reparación: no es posible inferir de forma segura el rol
    # corrupto anterior y por eso el downgrade no modifica datos.
    pass
