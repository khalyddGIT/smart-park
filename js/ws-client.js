/* ============================================================
   SMART-PARK — js/ws-client.js
   Cliente WebSocket del prototipo.

   Expone window.SP_WS con:
   - connect() / disconnect()
   - isConnected(): boolean
   - subscribe(channel, handler) / unsubscribe(channel, handler)
   - onStatus(cb)  -> recibe { online, connectedClients }

   Comportamiento:
   - Conecta a ws://localhost:8080 (override con WS_URL).
   - Reintenta automáticamente cada 3s si el servidor no responde.
   - Si el servidor está apagado, la app sigue funcionando con su
     simulación local (fallback silencioso).
   - Añade un badge de estado en vivo junto al contador de
     notificaciones del topbar.
   ============================================================ */
'use strict';

(function () {
  const WS_URL = window.WS_URL || 'ws://localhost:8080';
  const RECONNECT_MS = 3000;

  let socket = null;
  let connected = false;
  let retryTimer = null;
  let manualClose = false;

  const handlers = new Map();     // channel -> Set<fn>
  const statusHandlers = new Set();

  function emit(channel, payload) {
    const set = handlers.get(channel);
    if (set) set.forEach(fn => { try { fn(payload); } catch (e) { console.error('[WS] handler error:', e); } });
  }

  function emitStatus(status) {
    statusHandlers.forEach(fn => { try { fn(status); } catch (e) { console.error('[WS] status handler error:', e); } });
  }

  function updateBadge(state) {
    const el = document.getElementById('ws-status-badge');
    if (!el) return;
    el.dataset.state = state;   // online | offline
    el.title = state === 'online'
      ? 'En vivo: conectado al servidor WebSocket'
      : 'Modo simulación: servidor WebSocket no disponible';
  }

  function connect() {
    if (manualClose) return;
    if (socket && (socket.readyState === 0 || socket.readyState === 1)) return;

    try {
      socket = new WebSocket(WS_URL);
    } catch (e) {
      scheduleRetry();
      return;
    }

    socket.onopen = () => {
      connected = true;
      emitStatus({ online: true, connectedClients: null });
      updateBadge('online');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.channel) return;
        if (msg.channel === 'system:status') {
          emitStatus({ online: true, connectedClients: msg.connectedClients });
        }
        emit(msg.channel, msg);
      } catch (e) { /* ignorar frames malformados */ }
    };

    socket.onclose = () => {
      connected = false;
      socket = null;
      updateBadge('offline');
      emitStatus({ online: false, connectedClients: 0 });
      scheduleRetry();
    };

    socket.onerror = () => {
      try { socket.close(); } catch (e) { /* noop */ }
    };
  }

  function scheduleRetry() {
    if (retryTimer || manualClose) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, RECONNECT_MS);
  }

  function disconnect() {
    manualClose = true;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (socket) {
      try { socket.onclose = null; socket.close(); } catch (e) { /* noop */ }
      socket = null;
    }
    connected = false;
    updateBadge('offline');
    emitStatus({ online: false, connectedClients: 0 });
  }

  window.SP_WS = {
    connect,
    disconnect,
    isConnected: () => connected,
    subscribe(channel, fn) {
      if (!handlers.has(channel)) handlers.set(channel, new Set());
      handlers.get(channel).add(fn);
    },
    unsubscribe(channel, fn) {
      const set = handlers.get(channel);
      if (set) set.delete(fn);
    },
    onStatus(cb) {
      statusHandlers.add(cb);
    }
  };

  // Conecta automáticamente al cargar la página.
  connect();
})();
