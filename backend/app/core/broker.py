from datetime import datetime
import uuid
import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Simulación de Broker RabbitMQ en memoria para desacoplamiento y tolerancia a fallos
class MessageBroker:
    def __init__(self):
        self.queue = []
        self.processed_event_ids = set()

    def publish_event(self, event_type: str, data: dict) -> str:
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event_payload = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "ack": False
        }
        self.queue.append(event_payload)
        logger.info(f"[RabbitMQ Broker] Evento publicado: {event_id} ({event_type})")
        return event_id

    def process_notifications_queue(self, simulate_failure: bool = False):
        """Simula la entrega asíncrona con manejo de idempotencia y reintentos"""
        if simulate_failure:
            logger.warning("[RabbitMQ Broker] Servicio de Notificaciones inaccesible. Mensaje retenido en cola.")
            return {"status": "retained_in_queue", "pending_messages": len(self.queue)}

        processed_count = 0
        for event in list(self.queue):
            if not event["ack"]:
                # Verificación de Idempotencia por Event ID
                if event["event_id"] in self.processed_event_ids:
                    logger.info(f"[Idempotencia] Evento {event['event_id']} ya fue procesado previamente. Ignorando duplicado.")
                    event["ack"] = True
                    continue

                # Procesamiento de Notificación
                logger.info(f"[Servicio Notificaciones] Enviando notificación para evento {event['event_id']} - Reserva: {event['data'].get('code')}")
                self.processed_event_ids.add(event["event_id"])
                event["ack"] = True
                processed_count += 1

        # Limpiar eventos confirmados (ACK)
        self.queue = [e for e in self.queue if not e["ack"]]
        return {"status": "success", "processed_count": processed_count, "pending_messages": len(self.queue)}

message_broker = MessageBroker()
