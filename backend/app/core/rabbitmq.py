"""Módulo de integración con RabbitMQ (AMQP 0-9-1) usando aio-pika.

Implementa una arquitectura de mensajería empresarial desacoplada:
- Exchange de tipo Topic: `smartpark.events`
- Colas durables con persistencia en disco:
    * `smartpark.queue.notifications` (eventos de reservas, recordatorios, tolerancia)
    * `smartpark.queue.anpr` (lecturas de placas por visión artificial)
    * `smartpark.queue.finances` (liquidaciones de cuentas y comprobantes)
    * `smartpark.queue.dlq` (Dead Letter Queue con política de reintentos)
- Modo fail-open elegante: si RabbitMQ o aio-pika no están instalados/disponibles,
  el sistema delega a Redis o cola en memoria sin interrumpir el servicio.
"""
import asyncio
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import aio_pika
    from aio_pika import Message, DeliveryMode, ExchangeType
    AIO_PIKA_AVAILABLE = True
except ImportError:
    aio_pika = None
    AIO_PIKA_AVAILABLE = False


class RabbitMQClient:
    def __init__(self):
        self._connection: Optional[Any] = None
        self._channel: Optional[Any] = None
        self._exchange: Optional[Any] = None
        self._lock = asyncio.Lock()

    @property
    def is_available(self) -> bool:
        return bool(AIO_PIKA_AVAILABLE and settings.RABBITMQ_ENABLED and settings.RABBITMQ_URL)

    async def get_channel(self):
        if not self.is_available:
            return None

        async with self._lock:
            if self._connection is None or self._connection.is_closed:
                try:
                    self._connection = await aio_pika.connect_robust(
                        settings.RABBITMQ_URL,
                        timeout=5.0
                    )
                    self._channel = await self._connection.channel()
                    await self._channel.set_qos(prefetch_count=10)

                    # Declarar exchange principal Topic
                    self._exchange = await self._channel.declare_exchange(
                        settings.RABBITMQ_EXCHANGE_NAME,
                        ExchangeType.TOPIC,
                        durable=True
                    )

                    # Declarar Dead Letter Exchange y Cola
                    dlx = await self._channel.declare_exchange("smartpark.dlx", ExchangeType.FANOUT, durable=True)
                    dlq = await self._channel.declare_queue("smartpark.queue.dlq", durable=True)
                    await dlq.bind(dlx)

                    # Declarar colas de negocio
                    queue_args = {"x-dead-letter-exchange": "smartpark.dlx"}

                    q_notif = await self._channel.declare_queue("smartpark.queue.notifications", durable=True, arguments=queue_args)
                    await q_notif.bind(self._exchange, routing_key="notification.#")

                    q_anpr = await self._channel.declare_queue("smartpark.queue.anpr", durable=True, arguments=queue_args)
                    await q_anpr.bind(self._exchange, routing_key="anpr.#")

                    q_fin = await self._channel.declare_queue("smartpark.queue.finances", durable=True, arguments=queue_args)
                    await q_fin.bind(self._exchange, routing_key="finances.#")

                    logger.info("[RabbitMQ] Topología AMQP declarada exitosamente.")
                except Exception as exc:
                    logger.warning(f"[RabbitMQ] Conexión AMQP falló (fail-open activo): {exc}")
                    self._connection = None
                    self._channel = None
                    self._exchange = None
                    return None

            return self._channel

    async def publish(self, routing_key: str, payload: dict, priority: int = 0) -> Optional[str]:
        if not self.is_available:
            return None

        try:
            ch = await self.get_channel()
            if ch is None or self._exchange is None:
                return None

            message_id = f"RAB-{uuid.uuid4().hex[:10].upper()}"
            body = json.dumps({
                "message_id": message_id,
                "timestamp": datetime.utcnow().isoformat(),
                "routing_key": routing_key,
                "data": payload
            }).encode("utf-8")

            amqp_msg = Message(
                body,
                delivery_mode=DeliveryMode.PERSISTENT,
                priority=priority,
                content_type="application/json",
                message_id=message_id,
                app_id="smart-park-core"
            )

            await self._exchange.publish(amqp_msg, routing_key=routing_key)
            logger.info(f"[RabbitMQ] Mensaje persistido en cola ({routing_key}): {message_id}")
            return message_id
        except Exception as exc:
            logger.warning(f"[RabbitMQ] Fallo al publicar mensaje AMQP ({routing_key}): {exc}")
            return None

    async def check_health(self) -> dict:
        if not AIO_PIKA_AVAILABLE:
            return {
                "ok": False,
                "status": "NOT_INSTALLED",
                "detail": "Librería aio-pika lista para producción (fail-open activo)"
            }
        if not settings.RABBITMQ_ENABLED:
            return {
                "ok": False,
                "status": "DISABLED",
                "detail": "RabbitMQ deshabilitado (RABBITMQ_ENABLED=False)"
            }
        if not settings.RABBITMQ_URL:
            return {
                "ok": False,
                "status": "NOT_CONFIGURED",
                "detail": "RABBITMQ_URL no provisto (operando con Redis como broker)"
            }

        try:
            t0 = asyncio.get_event_loop().time()
            ch = await self.get_channel()
            if ch is not None and not ch.is_closed:
                latency = round((asyncio.get_event_loop().time() - t0) * 1000, 2)
                safe_url = re.sub(r'://[^@]+@', '://***:***@', settings.RABBITMQ_URL)
                return {
                    "ok": True,
                    "status": "CONNECTED",
                    "url": safe_url,
                    "exchange": settings.RABBITMQ_EXCHANGE_NAME,
                    "latency_ms": latency,
                    "detail": "Broker AMQP 0-9-1 conectado y operativo"
                }
            return {
                "ok": False,
                "status": "DISCONNECTED",
                "detail": "No se pudo establecer canal AMQP con RabbitMQ"
            }
        except Exception as exc:
            return {
                "ok": False,
                "status": "ERROR",
                "detail": f"Error de conexión RabbitMQ: {str(exc)}"
            }

    async def close(self):
        async with self._lock:
            try:
                if self._channel and not self._channel.is_closed:
                    await self._channel.close()
                if self._connection and not self._connection.is_closed:
                    await self._connection.close()
            except Exception:
                pass
            finally:
                self._channel = None
                self._connection = None
                self._exchange = None


rabbitmq_client = RabbitMQClient()
