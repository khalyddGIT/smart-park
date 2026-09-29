"""Identidades internas cuyo rol forma parte de la configuración del sistema.

Estas cuentas no dependen de una selección del cliente. El correo identifica la
cuenta reservada y la contraseña continúa siendo el factor que autoriza el acceso.
"""

SYSTEM_ACCOUNT_ROLES = {
    "superadmin@smartpark.com": "platform",
    "adminlocal@smartpark.com": "local",
    "operador.garita@smartpark.pe": "local",
    "usuario@smartpark.com": "user",
}


def required_role_for_email(email: str | None) -> str | None:
    return SYSTEM_ACCOUNT_ROLES.get((email or "").strip().lower())
