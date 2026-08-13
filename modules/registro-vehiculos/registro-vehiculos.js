/* REGISTRO DE VEHÍCULOS — RF86–RF90 */

let rvLastDetections = [];

function initRegistroVehiculos() {
  renderRegistroVehiculos();
}

function getRegisteredVehicles() {
  const d = window.mockData;
  const localId = d.currentUser.localId || 1;
  return (d.detections || []).filter(dt => dt.localId === localId && !dt.exitTime);
}

function renderRegistroVehiculos() {
  const tbody = document.getElementById('rv-tbody');
  if (!tbody) return;

  const search = (document.getElementById('rv-search')?.value || '').trim().toUpperCase();
  const state = document.getElementById('rv-state')?.value || '';

  let list = getRegisteredVehicles();
  if (search) list = list.filter(dt => dt.plate.toUpperCase().includes(search));
  if (state) list = list.filter(dt => dt.status === state);
  rvLastDetections = list;

  tbody.innerHTML = list.length ? list.map(dt => `
    <tr>
      <td data-label="Placa"><span class="plate-display" style="font-size:.8rem;padding:4px 8px">${SP_Components.escapeHtml(dt.plate)}</span></td>
      <td data-label="Tipo / Color">${SP_Components.escapeHtml(dt.type)} <br><span class="text-xs text-muted">${SP_Components.escapeHtml(dt.color)}</span></td>
      <td data-label="Espacio"><strong>${SP_Components.escapeHtml(dt.spaceId)}</strong></td>
      <td data-label="Hora Ingreso">${SP_Components.formatTime(dt.entryTime)}</td>
      <td data-label="Estado">${SP_Components.renderBadge(dt.status)}</td>
      <td data-label="Reserva Asociada">${dt.matchReservation ? `<strong>${dt.matchReservation}</strong>` : '<span class="text-muted">Ninguna</span>'}</td>
      <td data-label="Acciones">
        <button class="btn btn-sm btn-ghost" onclick="vehDetail('${dt.id}')" title="Ver detalle"><span class="material-symbols-outlined">visibility</span></button>
        <button class="btn btn-sm btn-ghost" onclick="vehRegisterExit('${dt.id}')" title="Registrar salida"><span class="material-symbols-outlined">logout</span></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="text-center text-muted">No hay vehículos que coincidan con la búsqueda.</td></tr>';
}

function vehDetail(id) {
  const dt = window.mockData.detections.find(x => String(x.id) === String(id));
  if (!dt) return;
  const res = window.mockData.reservations.find(r => r.id === dt.matchReservation);
  const html = `
    <div class="list-row"><div class="list-title">Placa</div><div class="list-sub fw-600">${SP_Components.escapeHtml(dt.plate)}</div></div>
    <div class="list-row"><div class="list-title">Tipo / Color</div><div class="list-sub fw-600">${SP_Components.escapeHtml(dt.type)} / ${SP_Components.escapeHtml(dt.color)}</div></div>
    <div class="list-row"><div class="list-title">Espacio</div><div class="list-sub fw-600">${SP_Components.escapeHtml(dt.spaceId)}</div></div>
    <div class="list-row"><div class="list-title">Ingreso</div><div class="list-sub fw-600">${SP_Components.formatDateTime(dt.entryTime)}</div></div>
    <div class="list-row"><div class="list-title">Confianza ANPR</div><div class="list-sub fw-600">${dt.confidence}%</div></div>
    <div class="list-row"><div class="list-title">Reserva</div><div class="list-sub fw-600">${res ? res.code : 'Sin reserva'}</div></div>
  `;
  SP_Components.confirm('Detalle del Vehículo', html);
}

function vehRegisterExit(id) {
  const dt = window.mockData.detections.find(x => String(x.id) === String(id));
  if (!dt) return;
  dt.exitTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  dt.status = 'completed';
  const space = window.mockData.spaces.find(s => s.id === dt.spaceId);
  if (space) space.status = 'available';
  renderRegistroVehiculos();
  SP_Components.showToast('success', 'Salida registrada', `El vehículo ${dt.plate} salió del espacio ${dt.spaceId}.`);
}