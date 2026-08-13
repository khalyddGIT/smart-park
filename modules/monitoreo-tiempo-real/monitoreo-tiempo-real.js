/* MONITOREO TIEMPO REAL — RF80–RF85 */
let mtrInterval = null;
let mtrLogCount = 0;

function initMonitoreoTiempoReal() {
  const timeEl = document.getElementById('mtr-time');
  const logEl = document.getElementById('mtr-log');
  const gridEl = document.getElementById('mtr-space-grid');

  if (gridEl) renderLiveSpaces(gridEl);

  if (logEl) {
    const now = new Date();
    const ts = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logEl.innerHTML = `
      <div class="log-info">[${ts}] SYS_INIT: Sistema de monitoreo iniciado. OK.</div>
      <div class="log-info">[${ts}] CAM_01: Conexión establecida (1080p 30fps).</div>
      <div class="log-info">[${ts}] CAM_02: Conexión establecida (720p 15fps).</div>
      <div class="log-info">[${ts}] CAM_03: Conexión establecida (1080p 30fps).</div>`;
  }

  // ── Modo en vivo vía WebSocket (si hay servidor) ───────────
  const onMonitoringEvent = (payload) => {
    const el = document.getElementById('mtr-log');
    if (!el || !payload) return;
    const kindMap = { info: 'log-info', alert: 'log-alert', warn: 'log-warn', debug: 'log-debug' };
    const t = payload.ts ? String(payload.ts).slice(11, 19) : '--:--:--';
    appendLogLine(el, kindMap[payload.kind] || 'log-info', `[${t}] ${payload.message}`);
  };
  window.SP_WS.subscribe('monitoring:event', onMonitoringEvent);

  // Control local: solo simula si NO hay servidor en vivo.
  const startLocal = () => {
    if (mtrInterval) clearInterval(mtrInterval);
    mtrInterval = setInterval(() => {
      if (!document.getElementById('mtr-time')) { clearInterval(mtrInterval); return; }
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (!window.SP_WS || !window.SP_WS.isConnected()) simulateEvent(logEl);
    }, 2000);
  };

  if (mtrInterval) clearInterval(mtrInterval);
  if (window.SP_WS && window.SP_WS.isConnected()) {
    // Ya está en vivo; no simulamos nada.
  } else {
    startLocal();
  }
}

function renderLiveSpaces(gridEl) {
  const d = window.mockData;
  const local = d.getLocalConfig();
  const localId = local ? local.id : 1;
  const spaces = d.spaces.filter(s => s.localId === localId);
  setLiveSpaceGrid(gridEl, spaces, localId);
  const refresh = () => {
    if (!document.getElementById('mtr-space-grid')) { clearInterval(refresh); return; }
    setLiveSpaceGrid(document.getElementById('mtr-space-grid'), d.spaces.filter(s => s.localId === localId), localId);
  };
  setInterval(refresh, 4000);
}

function setLiveSpaceGrid(gridEl, spaces, localId) {
  const statuses = {};
  spaces.forEach(s => {
    statuses[s.status] = (statuses[s.status] || 0) + 1;
  });
  gridEl.innerHTML = `
    <div>${SP_Components.renderInteractiveMap(spaces, localId, { onClickAttr: 'onclick=""' })}</div>
    <div class="text-xs text-muted mt-md">Resumen: ${statuses.available || 0} disponibles · ${statuses.occupied || 0} ocupados · ${statuses.reserved || 0} reservados · ${statuses.blocked || 0} bloqueados.</div>`;
}

function appendLogLine(logEl, cls, html) {
  if (!logEl) return;
  logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${html}</div>`);
  logEl.scrollTop = logEl.scrollHeight;
  mtrLogCount++;
  if (mtrLogCount > 200) {
    while (logEl.firstChild && mtrLogCount > 120) {
      logEl.removeChild(logEl.firstChild); mtrLogCount--;
    }
  }
}

function simulateEvent(logEl) {
  if (!logEl) return;
  const d = window.mockData;
  const actives = (d.detections || []).filter(x => !x.exitTime);

  let cls = 'log-info';
  let msg = '';
  const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (actives.length && Math.random() < 0.6) {
    const v = actives[Math.floor(Math.random() * actives.length)];
    const roll = Math.random();
    if (roll < 0.4) {
      cls = 'log-info';
      msg = `ANPR_SYS: Lectura exitosa de placa ${v.plate} en ${v.spaceId}. Confianza ${v.confidence}%.`;
    } else if (roll < 0.7) {
      cls = 'log-alert';
      msg = `SYS_ALERT: Vehículo ${v.plate} (${v.status === 'no-reservation' ? 'SIN reserva' : 'autorizado'}) en ${v.spaceId}.`;
    } else {
      cls = 'log-warn';
      msg = `CAM_01: Movimiento detectado en zona ${v.spaceId}.`;
    }
  } else {
    const pick = Math.random();
    if (pick < 0.5) {
      cls = 'log-warn';
      msg = 'CAM_02: Variación de iluminación compensada (Auto-iris).';
    } else {
      cls = 'log-debug';
      msg = 'SYSTEM: Heartbeat periódico (2s) recibido correctamente.';
    }
  }

  logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">[${now}] ${msg}</div>`);
  logEl.scrollTop = logEl.scrollHeight;
  mtrLogCount++;
  if (mtrLogCount > 200) {
    while (logEl.firstChild && mtrLogCount > 120) {
      logEl.removeChild(logEl.firstChild); mtrLogCount--;
    }
  }
}

function getLiveLogData() {
  const logEl = document.getElementById('mtr-log');
  if (!logEl) return [];
  return Array.from(logEl.querySelectorAll('div')).map(d => ({ evento: d.textContent }));
}