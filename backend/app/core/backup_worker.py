"""Worker en segundo plano para respaldos automáticos diarios.

Ejecuta verificaciones periódicas cada hora. Si no existen respaldos o el último
respaldo tiene más de 24 horas de antigüedad, genera un nuevo snapshot completo
en el volumen persistente (/data/backups) y rota los archivos antiguos.
"""

import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("smartpark.backup_worker")

_task = None
BACKUP_CHECK_INTERVAL_SECONDS = 3600  # Verificar cada hora
BACKUP_CYCLE_HOURS = 24  # Ciclo de respaldo diario


async def _acquire_lock(lock_name: str, ttl: int = 120) -> bool:
    """Adquiere un lock distribuido en Redis para evitar que múltiples réplicas

    generen el respaldo simultáneamente.
    """
    try:
        from app.core.cache import get_client
        client = get_client()
        if client is None:
            return True
        acquired = await client.set(f"lock:{lock_name}", "1", nx=True, ex=ttl)
        return bool(acquired)
    except Exception:
        return True


async def check_and_run_scheduled_backup():
    """Comprueba si es necesario ejecutar un respaldo y lo realiza."""
    from app.services.backup_service import list_backups, generate_database_backup
    from app.db.session import AsyncSessionLocal

    backups = list_backups()
    needs_backup = False

    if not backups:
        needs_backup = True
        logger.info("[smart-park] No se detectaron respaldos previos. Iniciando respaldo inicial...")
    else:
        # Extraer fecha del más reciente
        latest = backups[0]
        try:
            # created_at viene como ISO string terminado en Z
            created_str = latest["created_at"].rstrip("Z")
            created_dt = datetime.fromisoformat(created_str)
            if datetime.utcnow() - created_dt >= timedelta(hours=BACKUP_CYCLE_HOURS):
                needs_backup = True
                logger.info(f"[smart-park] Último respaldo ({created_str}) tiene más de 24h. Iniciando respaldo diario...")
        except Exception as e:
            logger.warning(f"[smart-park] Error al calcular antigüedad del respaldo: {e}")
            needs_backup = True

    if not needs_backup:
        return

    # Adquirir lock para evitar duplicados
    locked = await _acquire_lock("daily_backup", ttl=300)
    if not locked:
        logger.info("[smart-park] Lock de respaldo diario ocupado por otra instancia. Omitiendo.")
        return

    try:
        async with AsyncSessionLocal() as session:
            result = await generate_database_backup(session, reason="scheduled_daily")
            logger.info(
                f"[smart-park] Respaldo automático completado exitosamente: "
                f"{result['filename']} ({result['total_records']} registros, {result['size_kb']} KB)"
            )
    except Exception as e:
        logger.error(f"[smart-park] Error en ejecución de respaldo automático: {e}")


async def _worker_loop():
    logger.info("[smart-park] Backup worker iniciado (chequeo cada 1 hora, ciclo de 24h).")
    # Espera inicial breve de 30 segundos tras arranque para no competir con migraciones/seed
    await asyncio.sleep(30)
    while True:
        try:
            await check_and_run_scheduled_backup()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[smart-park] Error en el bucle del backup worker: {e}")

        try:
            await asyncio.sleep(BACKUP_CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


def start_backup_worker():
    """Inicia la tarea en segundo plano del worker de respaldos."""
    global _task
    if _task is not None and not _task.done():
        return
    try:
        loop = asyncio.get_event_loop()
        _task = loop.create_task(_worker_loop())
    except Exception as e:
        logger.warning(f"[smart-park] No se pudo iniciar el worker de respaldos: {e}")


def stop_backup_worker():
    """Cancela la tarea en segundo plano del worker de respaldos."""
    global _task
    if _task is not None and not _task.done():
        _task.cancel()
        _task = None
