import pytest
from app.core.broker import MessageBroker, message_broker
from app.core.rabbitmq import rabbitmq_client
from app.core.config import settings

@pytest.mark.asyncio
async def test_broker_publish_fallback():
    """Valida que el broker publique eventos exitosamente usando fallback si RabbitMQ no está conectado."""
    broker = MessageBroker()
    evt_id = await broker.publish_event_async("reservation.created", {"code": "TEST-RABBIT-01", "amount": 15.0})
    assert evt_id is not None
    assert evt_id.startswith("EVT-") or evt_id.startswith("RAB-")

@pytest.mark.asyncio
async def test_rabbitmq_healthcheck_structure():
    """Valida que el healthcheck de RabbitMQ retorne un diccionario con el formato estándar de diagnóstico."""
    health = await rabbitmq_client.check_health()
    assert isinstance(health, dict)
    assert "ok" in health
    assert "status" in health
    assert "detail" in health
    assert isinstance(health["ok"], bool)

def test_broker_sync_publish():
    """Valida compatibilidad sincrónica de publicación de eventos."""
    broker = MessageBroker()
    evt_id = broker.publish_event("anpr.plate_scanned", {"plate": "ABC-123"})
    assert evt_id is not None
    assert evt_id.startswith("EVT-")
