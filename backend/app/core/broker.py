import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

BROKER_QUEUE_KEY = "broker:queue"
BROKER_PROCESSED_SET = "broker:processed"


class MessageBroker:
    """Broker de notificaciones con persistencia en Redis (degradación a memoria si Redis no disponible).

    Sin REDIS_URL: comportamiento original en memoria.
    Con REDIS_URL: cola y deduplicación persistentes sobreviven reinicios y múltiples réplicas.
    """

    def __init__(self):
        self.queue = []
        self.processed_event_ids = set()

    def _redis_client(self):
        try:
            from app.core.cache import get_client
            return get_client()
        except Exception:
            return None

    def publish_event(self, event_type: str, data: dict) -> str:
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event_payload = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "ack": False,
        }
        client = self._redis_client()
        if client is not None:
            try:
                # Intento síncrono si event loop no corre; si corre, se encola async vía create_task fallback
                try:
                    loop = asyncio.get_running_loop()
                    # Estamos dentro de contexto async: usar create_task no bloqueante sería ideal,
                    # pero publish_event es sync por compatibilidad. Persistimos en hilo actual con run_until_complete si posible,
                    # sino caemos a memoria.
                    if loop.is_running():
                        # Encolar en Redis de forma no bloqueante programando la corrutina
                        asyncio.ensure_future(client.rpush(BROKER_QUEUE_KEY, json.dumps(event_payload)))
                        logger.info(f"[Broker Redis] Evento encolado: {event_id} ({event_type})")
                        return event_id
                except RuntimeError:
                    pass
                # Sin event loop: cliente fakeredis/sync no aplica; fallback a memoria
                raise RuntimeError("no running loop for sync publish")
            except Exception as exc:
                logger.warning(f"[Broker] Redis publish falló, usando memoria (fail-open): {exc}")

        self.queue.append(event_payload)
        logger.info(f"[RabbitMQ Broker] Evento publicado: {event_id} ({event_type})")
        return event_id

    async def publish_event_async(self, event_type: str, data: dict) -> str:
        """Variante async preferida: enruta a RabbitMQ (AMQP) si está activo; fallback a Redis y memoria."""
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event_payload = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "ack": False,
        }

        # 1. RabbitMQ AMQP Broker (alta durabilidad, DLQ, entrega garantizada)
        try:
            from app.core.rabbitmq import rabbitmq_client
            if rabbitmq_client.is_available:
                routing_key = f"notification.{event_type.replace(':', '.')}"
                amqp_id = await rabbitmq_client.publish(routing_key, event_payload)
                if amqp_id:
                    logger.info(f"[Broker RabbitMQ AMQP] Evento persistido: {amqp_id} ({routing_key})")
                    return amqp_id
        except Exception as exc:
            logger.warning(f"[Broker Dual] Fallo al publicar en RabbitMQ, recurriendo a Redis: {exc}")

        # 2. Redis como broker secundario de alta velocidad
        client = self._redis_client()
        if client is not None:
            try:
                await client.rpush(BROKER_QUEUE_KEY, json.dumps(event_payload))
                logger.info(f"[Broker Redis] Evento encolado (async): {event_id} ({event_type})")
                return event_id
            except Exception as exc:
                logger.warning(f"[Broker] Redis async publish falló (fail-open a memoria): {exc}")

        # 3. Memoria local como último fallback
        self.queue.append(event_payload)
        logger.info(f"[Broker Memoria] Evento encolado localmente: {event_id} ({event_type})")
        return event_id

    def process_notifications_queue(self, simulate_failure: bool = False):
        """Procesa la cola en memoria (compatibilidad). Con Redis, la cola real vive en Redis; este método drena memoria."""
        if simulate_failure:
            logger.warning("[RabbitMQ Broker] Servicio de Notificaciones inaccesible. Mensaje retenido en cola.")
            return {"status": "retained_in_queue", "pending_messages": len(self.queue)}

        processed_count = 0
        for event in list(self.queue):
            if not event["ack"]:
                if event["event_id"] in self.processed_event_ids:
                    logger.info(f"[Idempotencia] Evento {event['event_id']} ya fue procesado. Ignorando duplicado.")
                    event["ack"] = True
                    continue
                logger.info(f"[Servicio Notificaciones] Enviando notificación para evento {event['event_id']} - Reserva: {event['data'].get('code')}")
                self.processed_event_ids.add(event["event_id"])
                event["ack"] = True
                processed_count += 1

        self.queue = [e for e in self.queue if not e["ack"]]
        return {"status": "success", "processed_count": processed_count, "pending_messages": len(self.queue)}

    async def process_notifications_queue_async(self, simulate_failure: bool = False):
        """Drena la cola Redis con idempotencia (set broker:processed). Fail-open a memoria si Redis caído."""
        if simulate_failure:
            return {"status": "retained_in_queue", "pending_messages": -1}
        client = self._redis_client()
        if client is None:
            return self.process_notifications_queue(simulate_failure=False)

        processed_count = 0
        try:
            while True:
                raw = await client.lpop(BROKER_QUEUE_KEY)
                if raw is None:
                    break
                try:
                    event = json.loads(raw)
                except Exception:
                    continue
                event_id = event.get("event_id", "")
                # Idempotencia: SET con NX
                is_new = await client.sadd(BROKER_PROCESSED_SET, event_id)
                if is_new == 0:
                    logger.info(f"[Broker Redis] Evento {event_id} duplicado, ignorado.")
                    continue
                # Expirar el set para no crecer indefinidamente (7 días)
                await client.expire(BROKER_PROCESSED_SET, 7 * 24 * 3600)
                logger.info(f"[Servicio Notificaciones Redis] Evento {event_id} - Reserva: {event.get('data', {}).get('code')}")
                processed_count += 1
            remaining = await client.llen(BROKER_QUEUE_KEY)
            return {"status": "success", "processed_count": processed_count, "pending_messages": int(remaining or 0)}
        except Exception as exc:
            logger.warning(f"[Broker Redis] process async falló (fail-open): {exc}")
            return self.process_notifications_queue(simulate_failure=False)


message_broker = MessageBroker()
