"""Endpoints API para Gestión de Respaldos de Producción (Solo Superadmin).

Permite consultar el estado del almacenamiento persistente (/data/backups),
generar snapshots inmediatos de PostgreSQL, descargar archivos de respaldo históricos
y comprobar su integridad mediante verificación de checksum SHA-256.
"""

import os
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import User
from app.core.security import require_role
from app.services.backup_service import (
    generate_database_backup,
    get_backup_status,
    list_backups,
    get_backup_filepath,
    verify_backup_file,
    BACKUPS_DIR
)

router = APIRouter(prefix="/backups", tags=["Respaldos & Recuperación"])
platform_required = require_role("platform")


class VerifyRequest(BaseModel):
    filename: Optional[str] = None


@router.get("/status", response_model=Dict[str, Any])
async def get_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    """Retorna el diagnóstico completo de los respaldos: volumen persistente, motor de BD,

    último snapshot y archivos disponibles.
    """
    return get_backup_status()


@router.post("/generate", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_backup_on_demand(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required)
):
    """Genera un nuevo respaldo completo de todas las tablas en el volumen persistente."""
    try:
        result = await generate_database_backup(db, reason=f"manual_by_{current_user.email}")
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo al generar respaldo: {str(e)}"
        )


@router.get("/download/latest")
async def download_latest_backup(
    current_user: User = Depends(platform_required)
):
    """Descarga directamente el archivo JSON del último respaldo generado."""
    backups = list_backups()
    if not backups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron respaldos disponibles en el servidor."
        )

    latest_filename = backups[0]["filename"]
    filepath = get_backup_filepath(latest_filename)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo de respaldo no existe en el disco."
        )

    return FileResponse(
        path=filepath,
        filename=latest_filename,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{latest_filename}"'}
    )


@router.get("/download/{filename}")
async def download_backup_by_filename(
    filename: str,
    current_user: User = Depends(platform_required)
):
    """Descarga un archivo de respaldo específico por su nombre."""
    filepath = get_backup_filepath(filename)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo de respaldo solicitado no existe o el nombre es inválido."
        )

    return FileResponse(
        path=filepath,
        filename=os.path.basename(filepath),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{os.path.basename(filepath)}"'}
    )


@router.post("/verify", response_model=Dict[str, Any])
async def verify_backup(
    req: VerifyRequest,
    current_user: User = Depends(platform_required)
):
    """Valida la integridad de un archivo de respaldo comprobando su checksum SHA-256."""
    if req.filename:
        filepath = get_backup_filepath(req.filename)
        if not filepath:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Archivo no encontrado o nombre inválido."
            )
        return verify_backup_file(filepath)

    # Si no se pasó filename, verificar el último
    backups = list_backups()
    if not backups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay respaldos para verificar."
        )
    filepath = get_backup_filepath(backups[0]["filename"])
    return verify_backup_file(filepath)
