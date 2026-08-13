/* ============================================================
   SMART-PARK — server/ws-server.js
   Servidor WebSocket de demo para el prototipo frontend-only.

   Emite eventos simulados en tiempo real que el front consume:
   - ping/pong            (heartbeat de conexión)
   - system:status        (estado del canal en vivo)
   - monitoring:event     (logs del monitoreo de cámaras)
   - anpr:detection       (lecturas de placas)
   - anpr:authorized      (resultado de validación de placa)
   - spaces:update        (cambio de estado de un espacio)
   - notification:push    (notificación en vivo)

   Uso:  npm run ws   (puerto 8080 por defecto, override con WS_PORT)
   ============================================================ */
'use strict';

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = Number(process.env.WS_PORT) || 8080;

// ── Datos simulados de ejemplo ─────────────────────────────
const PLATES = ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012', 'MNO-345', 'PQR-678'];
const SPACES = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'C-01'];
const CAMS = ['CAM_01', 'CAM_02', 'CAM_03'];
const USERS = ['Juan D.', 'María L.', 'Carlos R.', 'Lucía P.', 'Pedro G.'];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n, w) { return String(n).padStart(w, '0'); }
function ts() {
  const d = new Date();
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
}
function iso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── Servidor HTTP trivial (opcional): pista de salud ────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ service: 'smart-park-ws', status: 'ok', port: PORT }));
});

const wss = new WebSocketServer({ server, path: '/' });

function broadcast(payload) {
  const frame = JSON.stringify({ ...payload, ts: iso() });
  let n = 0;
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) { client.send(frame); n++; }
  }
  return n;
}

let logIndex = 0;

function emitMonitoringEvent() {
  logIndex++;
  const kind = rnd(['info', 'alert', 'warn', 'debug']);
  const cam = rnd(CAMS);
  let message;
  if (kind === 'info') {
    message = rnd([
      `ANPR_SYS: Lectura exitosa de placa ${rnd(PLATES)} en ${rnd(SPACES)}. Confianza ${85 + Math.floor(Math.random() * 14)}%.`,
      `SYS_INIT: Ciclo de monitoreo ${logIndex} completado. OK.`
    ]);
  } else if (kind === 'alert') {
    message = `SYS_ALERT: Vehículo ${rnd(PLATES)} SIN reserva en ${rnd(SPACES)}.`;
  } else if (kind === 'warn') {
    message = rnd([`${cam}: Movimiento detectado en zona ${rnd(SPACES)}.`, `${cam}: Variación de iluminación compensada (Auto-iris).`]);
  } else {
    message = `SYSTEM: Heartbeat periódico recibido correctamente.`;
  }
  broadcast({ channel: 'monitoring:event', kind, cam, message, seq: logIndex });
}

function emitAnprDetection() {
  const plate = rnd(PLATES);
  const authorized = Math.random() > 0.3;
  const confidence = 90 + Math.floor(Math.random() * 10);
  broadcast({
    channel: 'anpr:detection',
    plate,
    confidence,
    status: authorized ? 'authorized' : 'no-reservation',
    spaceId: rnd(SPACES),
    type: rnd(['Automóvil', 'Camioneta', 'Motocicleta']),
    color: rnd(['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo']),
    matchReservation: authorized ? 'RSV-' + pad(100 + Math.floor(Math.random() * 900), 3) : null
  });
}

function emitSpaceUpdate() {
  broadcast({
    channel: 'spaces:update',
    spaceId: rnd(SPACES),
    status: rnd(['available', 'occupied', 'reserved']),
    plate: Math.random() > 0.4 ? rnd(PLATES) : null
  });
}

function emitNotification() {
  const title = rnd(['Nueva reserva confirmada', 'Pago recibido', 'Espacio disponible', 'Vehículo detectado', 'Reseña recibida']);
  const message = rnd([
    `El usuario ${rnd(USERS)} acaba de confirmar su reserva.`,
    'Tu pago fue procesado con éxito. Gracias por usar Smart-Park.',
    `Quedó disponible el espacio ${rnd(SPACES)}.`,
    'Se detectó un vehículo en el ingreso principal.',
    'Un cliente calificó tu estacionamiento con 5 estrellas.'
  ]);
  broadcast({ channel: 'notification:push', type: 'live', title, message });
}

// ── Temporizadores de eventos ──────────────────────────────
const timers = [
  setInterval(emitMonitoringEvent, 2000),
  setInterval(emitAnprDetection, 5000),
  setInterval(emitSpaceUpdate, 7000),
  setInterval(emitNotification, 9000)
];

// ── Manejo de conexiones ────────────────────────────────────
wss.on('connection', (socket) => {
  broadcast({ channel: 'system:status', online: true, connectedClients: wss.clients.size });

  socket.send(JSON.stringify({
    channel: 'system:status',
    online: true,
    connectedClients: wss.clients.size,
    message: 'Conexión establecida con el servidor en vivo.',
    ts: iso()
  }));

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg && msg.channel) {
        // Eco de confirmación para pings del cliente
        socket.send(JSON.stringify({ channel: msg.channel, ack: true, ts: iso() }));
      }
    } catch (e) { /* ignorar frames no JSON */ }
  });

  socket.on('close', () => {
    broadcast({ channel: 'system:status', online: true, connectedClients: wss.clients.size });
  });
});

server.listen(PORT, () => {
  console.log(`[smart-park-ws] WebSocket listo en ws://localhost:${PORT}`);
  console.log(`[smart-park-ws] Emitiendo monitoring:event, anpr:detection, spaces:update, notification:push`);
});

process.on('SIGINT', () => {
  timers.forEach(clearInterval);
  wss.close();
  server.close(() => process.exit(0));
});
