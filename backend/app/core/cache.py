"""Redis async con degradación elegante (fail-open).

Si REDIS_URL no está configurada (o Redis no responde), todas las funciones
son no-op: el sistema funciona exactamente igual que sin Redis.

Usos:
  - Cache de lecturas calientes (GET /parkings, GET /finances/summary)
  - Pub/Sub para fan-out de eventos WebSocket entre múltiples réplicas
"""
import asyncio
import json
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")
EVENTS_CHANNEL = "smartpark:events"

_client = None
_client_failed = False
_pubsub_task: asyncio.Task = None


def get_client():
    """Cliente Redis perezoso. Devuelve None si Redis no está disponible (fail-open)."""
    global _client, _client_failed
    if _client is not None:
        return _client
    if _client_failed:
        return None
    if not REDIS_URL.strip():
        _client_failed = True
        logger.info("[cache] REDIS_URL no configurada: cache y Pub/Sub desactivados (modo degradado)")
        return None
    try:
        import redis.asyncio as aioredis
        _client = aioredis.from_url(
            REDIS_URL.strip(),
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
            health_check_interval=30,
        )
        logger.info("[cache] cliente Redis inicializado")
        return _client
    except Exception as exc:
        _client_failed = True
        logger.warning(f"[cache] no se pudo inicializar Redis (fail-open): {exc}")
        return None


# ------------------------------------------------------------------
# Cache de lecturas calientes
# ------------------------------------------------------------------

async def cache_get_json(key: str):
    """Valor deserializado, o None si no existe / Redis caído / sin configurar."""
    client = get_client()
    if not client:
        return None
    try:
        raw = await client.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception as exc:
        logger.warning(f"[cache] GET {key} falló (fail-open): {exc}")
        return None


async def cache_set_json(key: str, value, ttl: int = 5) -> None:
    client = get_client()
    if not client:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as exc:
        logger.warning(f"[cache] SET {key} falló (fail-open): {exc}")


async def cache_delete(*keys: str) -> None:
    """Invalidación explícita tras escrituras."""
    client = get_client()
    if not client:
        return
    try:
        await client.delete(*keys)
    except Exception as exc:
        logger.warning(f"[cache] DELETE {keys} falló (fail-open): {exc}")


# ------------------------------------------------------------------
# Pub/Sub para fan-out de eventos entre réplicas
# ------------------------------------------------------------------

async def publish_event(message: str) -> bool:
    """Publica en el canal de eventos. True si se publicó (el listener la entrega localmente)."""
    client = get_client()
    if not client:
        return False
    try:
        await client.publish(EVENTS_CHANNEL, message)
        _ensure_listener()
        return True
    except Exception as exc:
        logger.warning(f"[pubsub] PUBLISH falló (fail-open): {exc}")
        return False


def _ensure_listener():
    """Arranca una sola vez el listener que reenvía eventos de Redis a los WS locales."""
    global _pubsub_task
    if _pubsub_task is not None and not _pubsub_task.done():
        return
    try:
        loop = asyncio.get_running_loop()
        _pubsub_task = loop.create_task(_pubsub_listener())
    except RuntimeError:
        pass


async def _pubsub_listener():
    """Suscripto al canal: entrega cada evento a las conexiones WebSocket locales."""
    from app.core.realtime import realtime
    while True:
        client = get_client()
        if not client:
            await asyncio.sleep(5)
            continue
        try:
            pubsub = client.pubsub()
            await pubsub.subscribe(EVENTS_CHANNEL)
            logger.info("[pubsub] suscripto a canal de eventos")
            async for msg in pubsub.listen():
                if msg.get("type") != "message":
                    continue
                try:
                    await realtime.deliver_local(msg["data"])
                except Exception as exc:
                    logger.warning(f"[pubsub] entrega local falló: {exc}")
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(f"[pubsub] listener cayó, reintentando en 3s (fail-open): {exc}")
            await asyncio.sleep(3)
