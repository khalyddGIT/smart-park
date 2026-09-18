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
import threading
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")
EVENTS_CHANNEL = "smartpark:events"

_client = None
_client_failed = False
_pubsub_task: asyncio.Task = None

# Fallback en memoria thread-safe cuando Redis no está disponible o falla
_memory_ratelimit = defaultdict(list)
_memory_ratelimit_lock = threading.Lock()

_memory_blacklist = {}
_memory_blacklist_lock = threading.Lock()

_memory_idempotency = {}
_memory_idempotency_lock = threading.Lock()



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
# Rate limiting (anti fuerza bruta) — Redis con fallback en memoria (NUNCA fail-open)
# ------------------------------------------------------------------

async def rate_limit_hit(key: str, limit: int, window: int = 60):
    """Incrementa un contador con ventana deslizante.
    Usa Redis si está disponible. Si Redis no está disponible o falla,
    utiliza un mecanismo en memoria (in-memory sliding window) garantizando
    que el rate limiting SIEMPRE esté activo y nunca falle abierto."""
    client = get_client()
    if client:
        try:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, window)
            return count <= limit, count
        except Exception as exc:
            logger.warning(f"[ratelimit] Redis {key} falló, usando fallback en memoria: {exc}")

    # Fallback en memoria thread-safe
    now = time.time()
    with _memory_ratelimit_lock:
        timestamps = [ts for ts in _memory_ratelimit[key] if now - ts < window]
        timestamps.append(now)
        _memory_ratelimit[key] = timestamps
        count = len(timestamps)

        # Mantenimiento periódico de memoria si hay demasiadas llaves
        if len(_memory_ratelimit) > 5000:
            stale = [k for k, v in _memory_ratelimit.items() if not v or (now - v[-1] > window)]
            for k in stale:
                del _memory_ratelimit[k]

        return count <= limit, count


# ------------------------------------------------------------------
# Blacklist de JWT (logout real) — Redis + memoria local
# ------------------------------------------------------------------

async def blacklist_token(jti: str, ttl_seconds: int) -> bool:
    """Revoca un token guardando su jti hasta su expiración natural.
    Persiste en memoria local y en Redis si está disponible."""
    if not jti:
        return False
    now = time.time()
    with _memory_blacklist_lock:
        _memory_blacklist[jti] = now + max(1, int(ttl_seconds))
        if len(_memory_blacklist) > 5000:
            stale = [k for k, exp in _memory_blacklist.items() if exp <= now]
            for k in stale:
                del _memory_blacklist[k]

    client = get_client()
    if client:
        try:
            await client.set(f"bl:{jti}", "1", ex=max(1, int(ttl_seconds)))
            return True
        except Exception as exc:
            logger.warning(f"[blacklist] SET {jti} falló en Redis (usando memoria): {exc}")
    return True


async def is_blacklisted(jti: str) -> bool:
    """True si el jti fue revocado (en Redis o memoria local)."""
    if not jti:
        return False
    client = get_client()
    if client:
        try:
            if await client.exists(f"bl:{jti}") == 1:
                return True
        except Exception as exc:
            logger.warning(f"[blacklist] EXISTS {jti} falló en Redis (consultando memoria): {exc}")

    now = time.time()
    with _memory_blacklist_lock:
        exp = _memory_blacklist.get(jti)
        if exp:
            if exp > now:
                return True
            else:
                del _memory_blacklist[jti]
    return False


# ------------------------------------------------------------------
# Idempotencia de transacciones (Pagos, Órdenes) — Redis + memoria local
# ------------------------------------------------------------------

async def get_idempotency_record(key: str):
    """Retorna {status_code, body} si existe para la clave, o None."""
    if not key:
        return None
    full_key = f"idemp:{key}"
    client = get_client()
    if client:
        try:
            raw = await client.get(full_key)
            if raw:
                return json.loads(raw)
        except Exception as exc:
            logger.warning(f"[idempotency] Redis GET {key} falló: {exc}")

    now = time.time()
    with _memory_idempotency_lock:
        rec = _memory_idempotency.get(key)
        if rec:
            if rec.get("expires_at", 0) > now:
                return rec.get("data")
            else:
                del _memory_idempotency[key]
    return None


async def save_idempotency_record(key: str, status_code: int, response_body: dict, ttl_seconds: int = 86400) -> None:
    """Guarda respuesta de operación idempotente para evitar ejecuciones duplicadas."""
    if not key:
        return
    full_key = f"idemp:{key}"
    payload = {"status_code": status_code, "body": response_body}
    client = get_client()
    if client:
        try:
            await client.set(full_key, json.dumps(payload, default=str), ex=max(60, int(ttl_seconds)))
        except Exception as exc:
            logger.warning(f"[idempotency] Redis SET {key} falló: {exc}")

    now = time.time()
    with _memory_idempotency_lock:
        _memory_idempotency[key] = {
            "data": payload,
            "expires_at": now + max(60, int(ttl_seconds))
        }
        if len(_memory_idempotency) > 5000:
            stale = [k for k, v in _memory_idempotency.items() if v.get("expires_at", 0) <= now]
            for k in stale:
                del _memory_idempotency[k]


# ------------------------------------------------------------------
# Contadores de ocupación en vivo (INCR/DECR) — fail-open
# ------------------------------------------------------------------

def _occ_key(parking_id: int, field: str) -> str:
    return f"occ:{int(parking_id)}:{field}"


async def occ_set(parking_id: int, free: int, occupied: int, total: int, ttl: int = 300):
    """Inicializa/sincroniza contadores desde la BD (usado tras lecturas completas)."""
    client = get_client()
    if not client:
        return
    try:
        pipe = client.pipeline()
        pipe.set(_occ_key(parking_id, "free"), int(free), ex=ttl)
        pipe.set(_occ_key(parking_id, "occupied"), int(occupied), ex=ttl)
        pipe.set(_occ_key(parking_id, "total"), int(total), ex=ttl)
        await pipe.execute()
    except Exception as exc:
        logger.warning(f"[occ] SET {parking_id} falló (fail-open): {exc}")


async def occ_incr(parking_id: int, free_delta: int = 0, occupied_delta: int = 0):
    """Actualización atómica de contadores en check-in/out (INCRBY)."""
    if free_delta == 0 and occupied_delta == 0:
        return
    client = get_client()
    if not client:
        return
    try:
        pipe = client.pipeline()
        if free_delta != 0:
            pipe.incrby(_occ_key(parking_id, "free"), free_delta)
        if occupied_delta != 0:
            pipe.incrby(_occ_key(parking_id, "occupied"), occupied_delta)
        await pipe.execute()
    except Exception as exc:
        logger.warning(f"[occ] INCR {parking_id} falló (fail-open): {exc}")


async def occ_get(parking_id: int):
    """Lee contadores si existen en Redis, o None si no hay cache."""
    client = get_client()
    if not client:
        return None
    try:
        vals = await client.mget(_occ_key(parking_id, "free"), _occ_key(parking_id, "occupied"), _occ_key(parking_id, "total"))
        if vals[0] is None and vals[1] is None:
            return None
        return {
            "free": int(vals[0]) if vals[0] is not None else None,
            "occupied": int(vals[1]) if vals[1] is not None else None,
            "total": int(vals[2]) if vals[2] is not None else None,
            "source": "redis",
        }
    except Exception as exc:
        logger.warning(f"[occ] GET {parking_id} falló (fail-open): {exc}")
        return None


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
