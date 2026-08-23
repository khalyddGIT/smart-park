import asyncio
import json
import logging
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class RealtimeManager:
    """Gestor simple de conexiones WebSocket para notificar cambios sin recargar."""

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
        if not self.connections:
            return
        message = json.dumps({"event": event, "payload": payload or {}, "ts": __import__("datetime").datetime.utcnow().isoformat()})
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
