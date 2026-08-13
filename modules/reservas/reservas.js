/* RESERVAS — RF39–RF49 */
let rsvSelectedSpace = null; let rsvTimerInterval = null;
function initReservas() {
  const role = window.currentRole; const d = window.mockData;
  if (role === 'user') {
    document.getElementById('rsv-user-view').style.display = '';
    document.getElementById('rsv-admin-view').style.display = 'none';
    document.getElementById('rsv-title').textContent = 'Mis Reservas';
    // Populate spaces for reservation
    const localId = window.currentLocalIdView || 1; const spaces = d.spaces.filter(s => s.localId === localId);
  
    // Create interactive map where unavailable/unreservable spots are disabled
    document.getElementById('rsv-space-grid').innerHTML = SP_Components.renderInteractiveMap(spaces, localId, {
      onClickAttr: 'onclick="selectRsvSpace(\'${s.id}\')"',
      disabledCheck: (s) => s.status !== 'available' || !s.reservable
    });
    
    // Populate plate dropdown
    const plates = d.vehicles.filter(v => v.userId === d.currentUser.id);
    document.getElementById('rsv-plate').innerHTML = plates.map(v => `<option value="${v.plate}">${v.plate} — ${v.brand} ${v.model}</option>`).join('') || '<option>DEF-456</option>';
    renderMyReservations();
  } else {
    document.getElementById('rsv-user-view').style.display = 'none';
    document.getElementById('rsv-admin-view').style.display = '';
    document.getElementById('rsv-title').textContent = 'Reservas del Local';
    renderAdminReservations();
  }
}
function selectRsvSpace(id) {
  rsvSelectedSpace = id;
  document.querySelectorAll('#rsv-space-grid .space-cell').forEach(c => c.classList.toggle('selected', c.querySelector('.space-id')?.textContent === id));
  
  // Auto-advance to the next step after a short visual feedback delay
  setTimeout(() => {
    rsvUpdateSummary();
    rsvNextStep(2);
  }, 400);
}

function rsvEstCost() {
  const d = window.mockData;
  const localId = window.currentLocalIdView || 1;
  const local = d.locales.find(l => l.id === localId);
  const vtype = document.getElementById('rsv-vtype')?.value || 'Automóvil';
  const tarifa = (local?.tarifas || []).find(t => t.vehiculo === vtype) || { reserva: 2.0 };
  return tarifa.reserva || 2.0;
}

function rsvUpdateSummary() {
  const d = window.mockData;
  const spaceEl = document.getElementById('rsv-sum-space');
  const costEl = document.getElementById('rsv-sum-cost');
  const vtypeEl = document.getElementById('rsv-sum-vtype');
  if (spaceEl) spaceEl.textContent = rsvSelectedSpace || '—';
  if (costEl) costEl.textContent = SP_Components.formatCurrency(rsvEstCost());
  if (vtypeEl) vtypeEl.textContent = document.getElementById('rsv-vtype')?.value || 'Automóvil';
  const local = d.locales.find(l => l.id === (window.currentLocalIdView || 1));
  if (local && local.payRequired) {
    const extra = SP_Components.formatCurrency(local.payAmount);
    const extraEl = document.getElementById('rsv-sum-extra');
    if (extraEl) extraEl.textContent = ` + ${extra} confirmación`;
  }
}
function rsvNextStep(step) {
  document.querySelectorAll('[id^="rsv-step-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.wizard-step').forEach((ws, i) => { ws.classList.remove('active','completed'); if (i < step - 1) ws.classList.add('completed'); if (i === step - 1) ws.classList.add('active'); });
  document.querySelectorAll('.wizard-connector').forEach((wc, i) => wc.classList.toggle('completed', i < step - 1));
  document.getElementById(`rsv-step-${step}`).style.display = '';
  if (step === 2 && !rsvSelectedSpace) { SP_Components.showToast('warning','Espacio','Selecciona un espacio primero'); rsvNextStep(1); return; }
  if (step === 2) rsvUpdateSummary();
  if (step === 3) confirmReservation();
}
// RF41: Confirm
function confirmReservation() {
  const d = window.mockData; const code = SP_Components.generateCode();
  const plate = document.getElementById('rsv-plate').value || 'DEF-456';
  const space = rsvSelectedSpace || 'A-01';
  const arrivalVal = document.getElementById('rsv-arrival').value || 30;
  const localId = window.currentLocalIdView || 1;
  
  const rsv = { id: 'RSV-' + Date.now(), userId: d.currentUser.id, localId, spaceId: space, plate, vehicleType: document.getElementById('rsv-vtype').value, status: 'active', code, created: new Date().toISOString(), arrival: new Date(Date.now() + arrivalVal*60000).toISOString(), toleranceMin: d.getLocalConfig()?.tolerance || 30 };
  d.reservations.unshift(rsv);
  // RF42: Update space status
  const sp = d.spaces.find(s => s.id === space); if (sp) sp.status = 'reserved';
  const local = d.locales.find(l => l.id === localId);
  const cost = rsvEstCost();
  document.getElementById('rsv-confirm-details').innerHTML = `
    <div class="rsv-confirm-row"><span>Local</span><strong>${d.getLocalName(localId)}</strong></div>
    <div class="rsv-confirm-row"><span>Espacio</span><strong>${space}</strong></div>
    <div class="rsv-confirm-row"><span>Placa</span><strong>${plate}</strong></div>
    <div class="rsv-confirm-row"><span>Vehículo</span><strong>${rsv.vehicleType}</strong></div>
    <div class="rsv-confirm-row"><span>Costo reserva</span><strong>${SP_Components.formatCurrency(cost)}</strong></div>
    <div class="rsv-confirm-row"><span>Llegada</span><strong>${arrivalVal} min</strong></div>
    <div class="rsv-confirm-row rsv-confirm-code"><span>Código</span><strong>${code}</strong></div>`;

  // Render QR mockup (CSS grid derived from code)
  renderRsvQr(code);

  // Show Geolocation Map Mockup
  const geoMap = document.getElementById('rsv-geo-map');
  const etaText = document.getElementById('rsv-eta-text');
  if (geoMap && etaText) {
    geoMap.style.display = 'block';
    const km = (Math.random() * 5 + 1).toFixed(1); // random distance 1-6 km
    etaText.textContent = `Llegada en ${arrivalVal} min (${km} km)`;
  }
  
  // RF43: Tolerance timer
  startToleranceTimer(parseInt(arrivalVal) * 60 + 30 * 60); // Time to arrival + tolerance
  SP_Components.showToast('success','Reserva creada',`Tu código es ${code}`);
}

function renderRsvQr(seed) {
  const el = document.getElementById('rsv-qr');
  if (!el) return;
  const size = 12;
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = (i) => {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    return (n >>> 16) % 100 < 42;
  };
  let cells = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const finder = (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);
      const on = finder ? !((r === 0 || r === 3 || c === 0 || c === 3) && !((r === 1 || r === 2) && (c === 1 || c === 2))) : rand();
      cells += `<span style="${on ? 'background:#1a1c17' : 'background:#fff'}"></span>`;
    }
  }
  el.innerHTML = cells;
}
// RF43-RF44: Timer
function startToleranceTimer(seconds) {
  if (rsvTimerInterval) clearInterval(rsvTimerInterval);
  const el = document.getElementById('rsv-timer'); let remaining = seconds;
  const paint = () => {
    if (remaining <= 0) { el.textContent = '00:00'; el.style.color = 'var(--color-danger)'; return; }
    const m = Math.floor(remaining / 60); const s = remaining % 60;
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.style.color = remaining < 300 ? 'var(--color-danger)' : 'var(--c4)';
  };
  paint();
  rsvTimerInterval = setInterval(() => {
    remaining--; if (remaining <= 0) { clearInterval(rsvTimerInterval); paint(); SP_Components.showToast('danger','Expirada','La reserva ha sido liberada automáticamente'); return; }
    paint();
  }, 1000);
}
function renderMyReservations() {
  const d = window.mockData; const userId = d.currentUser.id;
  const tbody = document.getElementById('rsv-my-tbody');
  const res = d.reservations.filter(r => r.userId === userId);
  if (res.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px;"><img src="img/empty_parking.webp" alt="No hay reservas" style="width:160px; opacity:0.8; margin-bottom:16px;"><br><div class="text-muted">No tienes reservas activas.</div></td></tr>`;
  } else {
    tbody.innerHTML = res.map(r => `<tr>
      <td data-label="Código"><strong>${r.code}</strong></td><td data-label="Local">${d.getLocalName(r.localId)}</td><td data-label="Espacio">${r.spaceId}</td><td data-label="Placa">${r.plate}</td>
      <td data-label="Estado">${SP_Components.renderBadge(r.status)}</td>
      <td data-label="Acciones">${['active','occupied'].includes(r.status) ? `<button class="btn btn-sm btn-ghost" onclick="cancelReservation('${r.id}')" title="Cancelar"><span class="material-symbols-outlined">cancel</span></button><button class="btn btn-sm btn-ghost" onclick="extendReservation('${r.id}')" title="Ampliar tiempo"><span class="material-symbols-outlined">more_time</span></button>` : '—'}</td>
    </tr>`).join('');
  }
}
function renderAdminReservations() {
  const d = window.mockData; const localId = d.currentUser.localId || 1;
  const tbody = document.getElementById('rsv-admin-tbody');
  const res = d.reservations.filter(r => r.localId === localId);
  if (res.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px;"><img src="img/empty_parking.webp" alt="No hay reservas" style="width:160px; opacity:0.8; margin-bottom:16px;"><br><div class="text-muted">No hay reservas en este local.</div></td></tr>`;
  } else {
    tbody.innerHTML = res.map(r => {
      const user = d.users.find(u => u.id === r.userId);
      return `<tr><td data-label="Código"><strong>${r.code}</strong></td><td data-label="Usuario">${user?.name||'—'}</td><td data-label="Placa">${r.plate}</td><td data-label="Espacio">${r.spaceId}</td><td data-label="Estado">${SP_Components.renderBadge(r.status)}</td><td data-label="Creación">${SP_Components.formatDateTime(r.created)}</td><td data-label="Vencimiento">${r.expiresAt ? SP_Components.formatDateTime(r.expiresAt) : '—'}</td></tr>`;
    }).join('');
  }
}
// RF46
function cancelReservation(id) {
  SP_Components.confirm('Cancelar Reserva','¿Estás seguro de cancelar esta reserva?', () => {
    const r = window.mockData.reservations.find(rv => rv.id === id); if (r) { r.status = 'cancelled'; r.cancelledAt = new Date().toISOString(); }
    const sp = window.mockData.spaces.find(s => s.id === r?.spaceId); if (sp && sp.status === 'reserved') sp.status = 'available';
    renderMyReservations(); SP_Components.showToast('info','Cancelada','La reserva fue cancelada');
  });
}

// RF47: Ampliación de tiempo (extra 30 min + cobro extra)
function extendReservation(id) {
  const r = window.mockData.reservations.find(rv => rv.id === id);
  if (!r) return;
  const d = window.mockData;
  const local = d.locales.find(l => l.id === r.localId);
  const tarifa = (local?.tarifas || []).find(t => t.vehiculo === r.vehicleType) || { hora: 2.5 };
  const cost = Math.round((tarifa.hora / 2) * 100) / 100; // media hora

  SP_Components.confirm('Ampliar reserva', `Ampliarás 30 minutos adicionales con un costo de ${SP_Components.formatCurrency(cost)}. ¿Continuar?`, () => {
    r.extended = true;
    r.extendedMin = (r.extendedMin || 0) + 30;
    r.extendCost = (r.extendCost || 0) + cost;
    r.expiresAt = new Date(new Date().getTime() + 30 * 60000).toISOString();
    d.transactions.push({
      id: 'TXN-' + Date.now(), reservationId: r.id, userId: r.userId, localId: r.localId,
      type: 'extension', amount: cost, method: 'Yape', status: 'completed',
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      receipt: 'REC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-3)
    });
    renderMyReservations();
    SP_Components.showToast('success', 'Reserva ampliada', `Se añadieron 30 min (${SP_Components.formatCurrency(cost)}).`);
  });
}
