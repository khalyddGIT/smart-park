import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket

from app.core.cache import publish_event

logger = logging.getLogger(__name__)


class RealtimeManager:
    """Gestor de conexiones WebSocket de alta velocidad con enrutamiento por tópicos,
    canales por sede (parking:{id}), usuario (user:{id}) y fan-out vía Redis Pub/Sub.

    Permite actualizar la interfaz en 0 ms sin peticiones HTTP redundantes.
    """

    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self.client_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        ws: WebSocket,
        user_id: Optional[int] = None,
        parking_id: Optional[int] = None,
        role: Optional[str] = None
    ):
        """Acepta la conexión WebSocket e inicializa sus canales y metadatos."""
        await ws.accept()
        channels = {"global"}
        parking_ids = set()

        if user_id is not None:
            channels.add(f"user:{user_id}")
        if role:
            channels.add(f"role:{role.lower()}")
        if parking_id is not None:
            try:
                pid_int = int(parking_id)
                channels.add(f"parking:{pid_int}")
                parking_ids.add(pid_int)
            except (ValueError, TypeError):
                pass

        async with self._lock:
            self.connections.add(ws)
            self.client_metadata[ws] = {
                "user_id": user_id,
                "role": (role or "user").lower(),
                "parking_ids": parking_ids,
                "channels": channels,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }

        logger.info(
            f"[realtime] Cliente conectado (uid={user_id}, role={role}, pid={parking_id}, total={len(self.connections)})"
        )

    async def subscribe(self, ws: WebSocket, channel: str):
        """Suscribe un cliente dinámicamente a un canal específico (ej. parking:34)."""
        if not channel:
            return
        norm_ch = channel.strip().lower()
        async with self._lock:
            meta = self.client_metadata.get(ws)
            if meta:
                meta["channels"].add(norm_ch)
                if norm_ch.startswith("parking:"):
                    try:
                        pid = int(norm_ch.split(":", 1)[1])
                        meta["parking_ids"].add(pid)
                    except (ValueError, IndexError):
                        pass

    async def unsubscribe(self, ws: WebSocket, channel: str):
        """Desuscribe un cliente de un canal específico."""
        if not channel:
            return
        norm_ch = channel.strip().lower()
        async with self._lock:
            meta = self.client_metadata.get(ws)
            if meta:
                meta["channels"].discard(norm_ch)
                if norm_ch.startswith("parking:"):
                    try:
                        pid = int(norm_ch.split(":", 1)[1])
                        meta["parking_ids"].discard(pid)
                    except (ValueError, IndexError):
                        pass

    async def disconnect(self, ws: WebSocket):
        """Limpia los recursos de una conexión WebSocket desconectada."""
        async with self._lock:
            self.connections.discard(ws)
            self.client_metadata.pop(ws, None)
        logger.info(f"[realtime] Cliente desconectado ({len(self.connections)} activos)")

    async def broadcast(
        self,
        event: str,
        payload: dict = None,
        channel: Optional[str] = None,
        target_parking_id: Optional[int] = None,
        target_user_id: Optional[int] = None,
        target_role: Optional[str] = None
    ):
        """Emite un evento enriquecido con enrutamiento inteligente por canal/sede.

        Si no se especifica canal, se infiere automáticamente por target_parking_id,
        target_user_id o target_role para evitar saturar clientes no relacionados.
        """
        payload = payload or {}
        inferred_parking_id = target_parking_id
        if inferred_parking_id is None and "parking_id" in payload:
            try:
                inferred_parking_id = int(payload["parking_id"])
            except (ValueError, TypeError):
                pass

        inferred_user_id = target_user_id
        if inferred_user_id is None and "user_id" in payload:
            try:
                inferred_user_id = int(payload["user_id"])
            except (ValueError, TypeError):
                pass

        if not channel:
            if inferred_parking_id is not None and not event.startswith("parkings:created"):
                channel = f"parking:{inferred_parking_id}"
            elif inferred_user_id is not None and event.startswith("user:"):
                channel = f"user:{inferred_user_id}"
            elif target_role:
                channel = f"role:{target_role.lower()}"
            else:
                channel = "global"

        message = json.dumps({
            "event": event,
            "payload": payload,
            "channel": channel,
            "parking_id": inferred_parking_id,
            "user_id": inferred_user_id,
            "ts": datetime.now(timezone.utc).isoformat()
        })

        # Fan-out a través de Redis si está disponible (multi-réplica)
        if await publish_event(message):
            return

        # Entrega local directa si Redis no está activo o es réplica única
        await self.deliver_local(message)

    async def deliver_local(self, message: str):
        """Entrega el mensaje concurrentemente a los clientes locales autorizados según el canal."""
        if not self.connections:
            return

        try:
            data = json.loads(message)
            channel = data.get("channel", "global").strip().lower()
            msg_parking_id = data.get("parking_id")
            msg_user_id = data.get("user_id")
        except Exception:
            channel = "global"
            msg_parking_id = None
            msg_user_id = None

        recipients = []
        async with self._lock:
            for ws in self.connections:
                meta = self.client_metadata.get(ws, {})
                user_role = meta.get("role", "user")

                # 1. SuperAdmin / Plataforma siempre recibe todos los eventos de la red
                if user_role in ("platform", "superadmin"):
                    recipients.append(ws)
                    continue

                # 2. Si el canal es global, todo cliente lo recibe
                if channel == "global":
                    recipients.append(ws)
                    continue

                # 3. Coincidencia por canal suscrito explícito
                client_channels = meta.get("channels", set())
                if channel in client_channels:
                    recipients.append(ws)
                    continue

                # 4. Coincidencia por parking_id (sede del administrador o visualizada)
                if msg_parking_id is not None:
                    try:
                        p_int = int(msg_parking_id)
                        if p_int in meta.get("parking_ids", set()):
                            recipients.append(ws)
                            continue
                    except (ValueError, TypeError):
                        pass

                # 5. Coincidencia por usuario destinatario
                if msg_user_id is not None and meta.get("user_id") == msg_user_id:
                    recipients.append(ws)
                    continue

        if not recipients:
            return

        # Envío concurrente a todos los destinatarios para latencia mínima
        async def _safe_send(ws: WebSocket):
            try:
                await ws.send_text(message)
                return True
            except Exception:
                return ws

        results = await asyncio.gather(*[_safe_send(ws) for ws in recipients], return_exceptions=True)

        dead = [r for r in results if isinstance(r, WebSocket)]
        for ws in dead:
            await self.disconnect(ws)

        if dead:
            logger.warning(f"[realtime] {len(dead)} conexiones muertas cerradas y depuradas")


realtime = RealtimeManager()
