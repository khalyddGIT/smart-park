"""Servicio unificado de Auditoría y Registro de Seguridad."""
from datetime import datetime
from typing import Optional, Any
import json
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog


def get_client_ip(request: Optional[Request]) -> str:
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def record_audit_event(
    db: AsyncSession,
    action: str,
    target: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    role: Optional[str] = None,
    severity: str = "Info",  # Info | Advertencia | Crítico
    ip_address: Optional[str] = None,
    request: Optional[Request] = None,
    parking_id: Optional[int] = None,
    parking_name: Optional[str] = None,
    details: Optional[Any] = None,
) -> Optional[AuditLog]:
    """Registra un evento de seguridad o administración en la tabla `audit_logs`.
    
    Fail-safe: nunca eleva una excepción que interrumpa la operación principal si la auditoría falla.
    """
    try:
        ip = ip_address or get_client_ip(request)
        details_str = None
        if details is not None:
            if isinstance(details, (dict, list)):
                details_str = json.dumps(details, ensure_ascii=False, default=str)
            else:
                details_str = str(details)

        log = AuditLog(
            user_id=user_id,
            user_email=user_email,
            role=role,
            action=action,
            target=target,
            severity=severity,
            ip_address=ip,
            parking_id=parking_id,
            parking_name=parking_name,
            details=details_str,
            created_at=datetime.utcnow(),
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
        return None
