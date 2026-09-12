"""Servicio de respaldos (backups) automáticos y bajo demanda para Smart-Park.

Gestiona la extracción estructurada de todas las tablas de la base de datos PostgreSQL,
cálculo de checksum de integridad SHA-256, escritura atómica en el volumen
persistente (/data/backups) y rotación de snapshots.
"""

import os
import json
import glob
import hashlib
import logging
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import (
    User, Vehicle, Parking, CameraDevice, Slot, FloorPlanElement,
    Reservation, Staff, Review, Incident, Payment, AffiliationRequest,
    PlatformSettings, AuditLog
)
from app.db.session import engine

logger = logging.getLogger("smartpark.backups")

# Directorio de persistencia: en Railway se usa el volumen montado en /data
DEFAULT_BACKUP_DIR = (
    "/data/backups" if os.path.exists("/data")
    else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backups")
)
BACKUPS_DIR = os.getenv("BACKUPS_DIR", DEFAULT_BACKUP_DIR)
MAX_BACKUP_RETENTION = int(os.getenv("MAX_BACKUP_RETENTION", "14"))

os.makedirs(BACKUPS_DIR, exist_ok=True)


def _serialize_value(val: Any) -> Any:
    """Convierte tipos no nativos de JSON (datetime, date, UUID, Enum) a formatos serializables."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if hasattr(val, "value"):  # Enums
        return val.value
    return val


def _row_to_dict(model_instance: Any, exclude_fields: Optional[set] = None) -> Dict[str, Any]:
    """Convierte un registro de SQLAlchemy en un diccionario plano con valores serializados."""
    exclude = exclude_fields or set()
    result = {}
    for col in model_instance.__table__.columns:
        if col.name not in exclude:
            val = getattr(model_instance, col.name)
            result[col.name] = _serialize_value(val)
    return result


async def _dump_table(session: AsyncSession, model_cls: Any, exclude: Optional[set] = None) -> List[Dict[str, Any]]:
    """Obtiene todos los registros de un modelo y los devuelve serializados."""
    stmt = select(model_cls)
    res = await session.execute(stmt)
    records = res.scalars().all()
    return [_row_to_dict(r, exclude_fields=exclude) for r in records]


def compute_sha256(data_str: str) -> str:
    """Calcula el hash SHA-256 de una cadena de texto."""
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()


async def generate_database_backup(session: AsyncSession, reason: str = "manual") -> Dict[str, Any]:
    """Extrae todas las tablas de la base de datos, construye el payload con metadatos,
    lo guarda en disco de forma atómica y rota las copias obsoletas.
    """
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    engine_str = "PostgreSQL"

    # 1. Extracción exhaustiva de datos
    data_tables: Dict[str, List[Dict[str, Any]]] = {
        "usuarios": await _dump_table(session, User),
        "vehiculos": await _dump_table(session, Vehicle),
        "estacionamientos": await _dump_table(session, Parking),
        "cameras_dispositivos": await _dump_table(session, CameraDevice),
        "plazas": await _dump_table(session, Slot),
        "elementos_plano": await _dump_table(session, FloorPlanElement),
        "reservas": await _dump_table(session, Reservation),
        "personal": await _dump_table(session, Staff),
        "resenas": await _dump_table(session, Review),
        "incidencias": await _dump_table(session, Incident),
        "pagos": await _dump_table(session, Payment),
        "solicitudes_afiliacion": await _dump_table(session, AffiliationRequest),
        "configuracion_plataforma": await _dump_table(session, PlatformSettings),
        "audit_logs": await _dump_table(session, AuditLog),
    }

    counts = {tbl: len(rows) for tbl, rows in data_tables.items()}
    total_records = sum(counts.values())

    data_json = json.dumps(data_tables, ensure_ascii=False, sort_keys=True)
    checksum = compute_sha256(data_json)

    now_iso = datetime.utcnow().isoformat() + "Z"
    filename = f"smartpark_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(BACKUPS_DIR, filename)
    tmp_filepath = filepath + ".tmp"

    payload = {
        "metadata": {
            "app": "Smart-Park",
            "version": "2.0",
            "environment": os.getenv("ENVIRONMENT", "production"),
            "database_engine": engine_str,
            "generated_at": now_iso,
            "reason": reason,
            "counts": counts,
            "total_records": total_records,
            "checksum_sha256": checksum,
            "retention_policy": f"last_{MAX_BACKUP_RETENTION}_days"
        },
        "data": data_tables
    }

    # 2. Escritura atómica
    with open(tmp_filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_filepath, filepath)

    file_size_bytes = os.path.getsize(filepath)

    # 3. Rotación de respaldos antiguos
    deleted_count = rotate_old_backups(max_keep=MAX_BACKUP_RETENTION)

    logger.info(
        f"[smart-park] Respaldo generado: {filename} ({file_size_bytes} bytes, "
        f"{total_records} registros, motivo: {reason}, rotados: {deleted_count})"
    )

    return {
        "success": True,
        "filename": filename,
        "filepath": filepath,
        "size_bytes": file_size_bytes,
        "size_kb": round(file_size_bytes / 1024, 2),
        "total_records": total_records,
        "counts": counts,
        "checksum_sha256": checksum,
        "generated_at": now_iso,
        "reason": reason,
        "database_engine": engine_str
    }


def rotate_old_backups(max_keep: int = MAX_BACKUP_RETENTION) -> int:
    """Elimina respaldos antiguos que superen el límite de retención."""
    pattern = os.path.join(BACKUPS_DIR, "smartpark_backup_*.json")
    files = glob.glob(pattern)
    files.sort(key=lambda x: os.path.getmtime(x))  # De más antiguo a más nuevo

    deleted = 0
    if len(files) > max_keep:
        to_delete = files[:len(files) - max_keep]
        for f in to_delete:
            try:
                os.remove(f)
                deleted += 1
            except Exception as e:
                logger.warning(f"No se pudo eliminar respaldo antiguo {f}: {e}")
    return deleted


def list_backups() -> List[Dict[str, Any]]:
    """Lista los archivos de respaldo disponibles en el directorio de persistencia."""
    pattern = os.path.join(BACKUPS_DIR, "smartpark_backup_*.json")
    files = glob.glob(pattern)
    files.sort(key=lambda x: os.path.getmtime(x), reverse=True)

    result = []
    for fp in files:
        try:
            stat = os.stat(fp)
            fn = os.path.basename(fp)
            created_dt = datetime.utcfromtimestamp(stat.st_mtime).isoformat() + "Z"
            result.append({
                "filename": fn,
                "size_bytes": stat.st_size,
                "size_kb": round(stat.st_size / 1024, 2),
                "created_at": created_dt,
            })
        except Exception:
            pass
    return result


def get_backup_filepath(filename: str) -> Optional[str]:
    """Retorna la ruta absoluta de un respaldo específico, protegiendo contra Path Traversal."""
    clean_name = os.path.basename(filename)
    if not clean_name.startswith("smartpark_backup_") or not clean_name.endswith(".json"):
        return None
    full_path = os.path.join(BACKUPS_DIR, clean_name)
    if os.path.isfile(full_path):
        return full_path
    return None


def get_backup_status() -> Dict[str, Any]:
    """Devuelve el estado general del subsistema de respaldos."""
    backups = list_backups()
    engine_str = "PostgreSQL"
    is_persistent = os.path.exists("/data") or "/data" in BACKUPS_DIR

    latest = None
    if backups:
        first = backups[0]
        # Intentar leer metadatos del más reciente
        meta = {}
        try:
            full_path = os.path.join(BACKUPS_DIR, first["filename"])
            with open(full_path, "r", encoding="utf-8") as f:
                content = json.load(f)
                meta = content.get("metadata", {})
        except Exception:
            pass
        latest = {
            **first,
            "metadata": meta
        }

    return {
        "enabled": True,
        "destination_dir": BACKUPS_DIR,
        "is_persistent_volume": is_persistent,
        "database_engine": engine_str,
        "retention_count": MAX_BACKUP_RETENTION,
        "schedule": "Diario automático cada 24 horas",
        "total_backups_stored": len(backups),
        "latest_backup": latest,
        "available_backups": backups[:10]
    }


def verify_backup_file(filepath_or_data: Any) -> Dict[str, Any]:
    """Verifica el checksum y la estructura de un archivo o payload de respaldo."""
    try:
        if isinstance(filepath_or_data, str) and os.path.isfile(filepath_or_data):
            with open(filepath_or_data, "r", encoding="utf-8") as f:
                payload = json.load(f)
        elif isinstance(filepath_or_data, dict):
            payload = filepath_or_data
        else:
            return {"valid": False, "error": "Entrada de respaldo inválida"}

        meta = payload.get("metadata")
        data = payload.get("data")

        if not meta or not isinstance(data, dict):
            return {"valid": False, "error": "Estructura inválida: faltan metadatos o datos"}

        expected_checksum = meta.get("checksum_sha256")
        data_json = json.dumps(data, ensure_ascii=False, sort_keys=True)
        computed_checksum = compute_sha256(data_json)

        if expected_checksum and expected_checksum != computed_checksum:
            return {
                "valid": False,
                "error": "Checksum no coincide; el archivo puede estar dañado",
                "expected_checksum": expected_checksum,
                "computed_checksum": computed_checksum
            }

        return {
            "valid": True,
            "app": meta.get("app"),
            "version": meta.get("version"),
            "generated_at": meta.get("generated_at"),
            "database_engine": meta.get("database_engine"),
            "total_records": meta.get("total_records"),
            "counts": meta.get("counts", {}),
            "checksum_verified": True
        }
    except Exception as e:
        return {"valid": False, "error": f"Error al verificar respaldo: {str(e)}"}
