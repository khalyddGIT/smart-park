import asyncio
import json
import logging
from datetime import datetime
from typing import Set
from fastapi import WebSocket

from app.core.cache import publish_event

logger = logging.getLogger(__name__)


class RealtimeManager:
    """Gestor de conexiones WebSocket con fan-out vía Redis Pub/Sub.

    Con Redis configurado: broadcast() publica al canal y cada réplica entrega
    el evento a sus propias conexiones (permite escalar a N réplicas).
    Sin Redis: entrega local directa (comportamiento original de una réplica).
    """

    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.connections.add(ws)
        logger.info(f"[realtime] cliente conectado ({len(self.connections)} activos)")

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self.connections.discard(ws)
        logger.info(f"[realtime] cliente desconectado ({len(self.connections)} activos)")

    async def broadcast(self, event: str, payload: dict = None):
        message = json.dumps({"event": event, "payload": payload or {}, "ts": datetime.utcnow().isoformat()})
        # Con Redis: publicar al canal (el listener de cada réplica entrega localmente)
        if await publish_event(message):
            return
        # Sin Redis: entrega directa local (una sola réplica)
        await self.deliver_local(message)

    async def deliver_local(self, message: str):
        if not self.connections:
            return
        dead = []
        async with self._lock:
            conns = list(self.connections)
        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)
        if dead:
            logger.warning(f"[realtime] {len(dead)} conexiones muertas limpiadas")


realtime = RealtimeManager()
