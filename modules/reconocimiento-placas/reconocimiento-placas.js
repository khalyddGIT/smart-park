/* RECONOCIMIENTO DE PLACAS — RF57–RF63 */
let rpInterval = null;
let rpIndex = 0;

function initReconocimientoPlacas() {
  const local = window.mockData.getLocalConfig();
  const localId = local ? local.id : 1;

  rpIndex = 0;
  renderReconocimiento(localId);

  // ── Eventos en vivo vía WebSocket (ANPR real: placas detectadas) ──
  let lastPlate = null;
  const onAnpr = (payload) => {
    if (!payload || !payload.plate) return;
    if (payload.plate === lastPlate) return;   // evitar duplicados del mismo frame
    lastPlate = payload.plate;
    renderLiveDetection(payload, localId);
  };
  window.SP_WS.subscribe('anpr:detection', onAnpr);

  // ── Fallback: rotación local si NO hay servidor WS ──
  if (rpInterval) clearInterval(rpInterval);
  rpInterval = setInterval(() => {
    if (!document.getElementById('rp-plate')) { clearInterval(rpInterval); return; }
    if (window.SP_WS && window.SP_WS.isConnected()) return; // ya hay datos en vivo
    rpIndex++;
    renderReconocimiento(localId);
  }, 4000);
}

// Renderiza una detección recibida por WebSocket en el panel.
function renderLiveDetection(p, localId) {
  const plateEl = document.getElementById('rp-plate');
  const confEl = document.getElementById('rp-confidence');
  const compareEl = document.getElementById('rp-compare-detail');
  const tbody = document.getElementById('rp-tbody');

  if (plateEl) plateEl.textContent = p.plate;
  if (confEl) confEl.innerHTML = SP_Components.renderConfidence(p.confidence);

  const isAuthorized = p.status === 'authorized';
  if (compareEl) {
    compareEl.innerHTML = `
      <div style="padding:12px;background:${isAuthorized ? 'var(--color-success-bg)' : 'var(--color-warning-bg)'};border-radius:var(--radius);margin-bottom:12px">
        <div class="d-flex align-center gap-sm mb-sm">
          <span class="material-symbols-outlined" style="color:${isAuthorized ? 'var(--color-success)' : 'var(--color-warning)'}">${isAuthorized ? 'verified' : 'warning'}</span>
          <strong>${isAuthorized ? 'Placa verificada' : 'Sin reserva asociada'}</strong>
        </div>
        <p class="text-sm">Reserva: <strong>${p.matchReservation ? SP_Components.escapeHtml(p.matchReservation) : 'N/A'}</strong></p>
        <p class="text-sm">Tipo: ${SP_Components.escapeHtml(p.type)} · Color: ${SP_Components.escapeHtml(p.color)}</p>
        <p class="text-sm">Espacio: ${SP_Components.escapeHtml(p.spaceId)} · Nivel de confianza ${p.confidence}%</p>
      </div>`;
  }

  if (tbody) {
    const dt = p.ts || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const hhmm = (dt.length >= 16) ? dt.slice(11, 16) : dt;
    const row = {
      time: hhmm,
      plate: p.plate,
      confidence: p.confidence,
      matchReservation: p.matchReservation,
      status: p.status
    };
    // Actualiza la tabla: agrega fila en vivo al inicio (dedupe por placa).
    const existing = Array.from(tbody.querySelectorAll('tr')).find(tr => tr.textContent.includes(row.plate));
    if (existing) tbody.replaceChild(renderRpRow(row), existing); else tbody.insertBefore(renderRpRow(row), tbody.firstChild);
    while (tbody.children.length > 8) tbody.removeChild(tbody.lastChild);
  }
}

function renderRpRow(x) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td data-label="Hora">${SP_Components.escapeHtml(x.time)}</td>
    <td data-label="Placa"><span class="plate-display" style="font-size:.72rem;padding:2px 6px">${SP_Components.escapeHtml(x.plate)}</span></td>
    <td data-label="Confianza">${SP_Components.renderConfidence(x.confidence)}</td>
    <td data-label="Reserva">${x.matchReservation ? SP_Components.escapeHtml(x.matchReservation) : '—'}</td>
    <td data-label="Resultado">${SP_Components.renderBadge(x.status)}</td>`;
  return tr;
}

function renderReconocimiento(localId) {
  const d = window.mockData;
  const dets = (d.detections || []).filter(dt => dt.localId === localId);
  const det = dets[rpIndex % dets.length];
  if (!det) return;

  const confEl = document.getElementById('rp-confidence');
  const plateEl = document.getElementById('rp-plate');
  const compareEl = document.getElementById('rp-compare-detail');
  const tbody = document.getElementById('rp-tbody');

  if (plateEl) plateEl.textContent = det.plate;
  if (confEl) confEl.innerHTML = SP_Components.renderConfidence(det.confidence);

  const isAuthorized = det.status === 'authorized';
  if (compareEl) {
    compareEl.innerHTML = `
      <div style="padding:12px;background:${isAuthorized ? 'var(--color-success-bg)' : 'var(--color-warning-bg)'};border-radius:var(--radius);margin-bottom:12px">
        <div class="d-flex align-center gap-sm mb-sm">
          <span class="material-symbols-outlined" style="color:${isAuthorized ? 'var(--color-success)' : 'var(--color-warning)'}">${isAuthorized ? 'verified' : 'warning'}</span>
          <strong>${isAuthorized ? 'Placa verificada' : 'Sin reserva asociada'}</strong>
        </div>
        <p class="text-sm">Reserva: <strong>${det.matchReservation ? SP_Components.escapeHtml(det.matchReservation) : 'N/A'}</strong></p>
        <p class="text-sm">Tipo: ${SP_Components.escapeHtml(det.type)} · Color: ${SP_Components.escapeHtml(det.color)}</p>
        <p class="text-sm">Ingreso: ${SP_Components.formatTime(det.entryTime)}</p>
      </div>
      <button class="btn btn-primary" onclick="autorizarPlaca(${det.id})"><span class="material-symbols-outlined">check</span> ${isAuthorized ? 'Reconfirmar' : 'Autorizar'}</button>
    `;
  }

  if (tbody) {
    tbody.innerHTML = dets.map(x => `
      <tr>
        <td data-label="Hora">${SP_Components.formatTime(x.entryTime)}</td>
        <td data-label="Placa"><span class="plate-display" style="font-size:.75rem;padding:2px 6px">${SP_Components.escapeHtml(x.plate)}</span></td>
        <td data-label="Confianza">${SP_Components.renderConfidence(x.confidence)}</td>
        <td data-label="Reserva">${x.matchReservation ? SP_Components.escapeHtml(x.matchReservation) : '—'}</td>
        <td data-label="Resultado">${SP_Components.renderBadge(x.status)}</td>
      </tr>
    `).join('');
  }
}

function autorizarPlaca(id) {
  const det = window.mockData.detections.find(x => String(x.id) === String(id));
  if (!det) return;
  det.status = 'authorized';
  det.authorizedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const local = window.mockData.getLocalConfig();
  renderReconocimiento(local ? local.id : 1);
  SP_Components.showToast('success', 'Autorizado', `Acceso autorizado para la placa ${det.plate}.`);
}