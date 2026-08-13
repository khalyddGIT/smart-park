/* COBRO AUTOMÁTICO — RF64–RF68 */
let caActiveDet = null;

function initCobroAutomatico() {
  const local = window.mockData.getLocalConfig();
  const localId = local ? local.id : 1;
  const active = (window.mockData.detections || []).filter(dt => dt.localId === localId && !dt.exitTime);

  const select = document.getElementById('ca-plate');
  select.innerHTML = '<option value="">Seleccionar vehículo...</option>' +
    active.map(dt => `<option value="${dt.id}">${dt.plate} — ${dt.type}</option>`).join('');

  renderCobroTxns();
}

function calcTarifa() {
  const sel = document.getElementById('ca-plate');
  const det = document.getElementById('ca-details');
  const id = sel.value;
  if (!id) { det.style.display = 'none'; caActiveDet = null; return; }

  caActiveDet = window.mockData.detections.find(x => String(x.id) === String(id));
  if (!caActiveDet) return;

  const local = window.mockData.getLocalConfig();
  const tarifa = (local.tarifas || []).find(t => t.vehiculo === caActiveDet.type) || { hora: 2.5, minuto: 0.05 };

  const inTime = new Date(caActiveDet.entryTime.replace(' ', 'T'));
  const now = new Date();
  const minutes = Math.max(1, Math.round((now - inTime) / 60000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const total = Math.max(0, tarifa.hora * (minutes / 60));

  document.getElementById('ca-space').textContent = caActiveDet.spaceId;
  document.getElementById('ca-in').textContent = SP_Components.formatTime(caActiveDet.entryTime);
  document.getElementById('ca-out').textContent = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('ca-time').textContent = `${hours}h ${mins}m (${minutes} min)`;
  document.getElementById('ca-total').textContent = SP_Components.formatCurrency(total);
  det.style.display = 'block';
}

function procesarCobro() {
  if (!caActiveDet) return;
  const d = window.mockData;
  const local = d.getLocalConfig();
  const tarifa = (local.tarifas || []).find(t => t.vehiculo === caActiveDet.type) || { hora: 2.5, minuto: 0.05 };
  const inTime = new Date(caActiveDet.entryTime.replace(' ', 'T'));
  const minutes = Math.max(1, Math.round((new Date() - inTime) / 60000));
  const total = Math.max(0, tarifa.hora * (minutes / 60));

  // Registra transacción
  const txnId = 'TXN-' + String(Date.now()).slice(-6);
  d.transactions.push({
    id: txnId,
    reservationId: caActiveDet.matchReservation || null,
    userId: 1,
    localId: local ? local.id : 1,
    type: 'parking',
    amount: Math.round(total * 100) / 100,
    method: 'Automático',
    status: 'completed',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    receipt: 'REC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-3)
  });

  // Marca salida y libera espacio
  caActiveDet.exitTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  caActiveDet.status = 'completed';
  const space = d.spaces.find(s => s.id === caActiveDet.spaceId);
  if (space) space.status = 'available';

  document.getElementById('ca-plate').value = '';
  calcTarifa();
  renderCobroTxns();
  SP_Components.showToast('success', 'Pago procesado', `Se cobró ${SP_Components.formatCurrency(Math.round(total * 100) / 100)} al usuario.`);
}

function renderCobroTxns() {
  const tbody = document.getElementById('ca-txn-tbody');
  if (!tbody) return;
  const local = window.mockData.getLocalConfig();
  const localId = local ? local.id : 1;
  const txns = window.mockData.transactions
    .filter(t => t.localId === localId && t.type === 'parking')
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  tbody.innerHTML = txns.length ? txns.map(t => `
    <tr>
      <td data-label="Fecha">${SP_Components.formatDateTime(t.date)}</td>
      <td data-label="Placa"><span class="plate-display" style="font-size:.7rem;padding:2px 6px">${SP_Components.escapeHtml(resolvePlate(t))}</span></td>
      <td data-label="Concepto">${t.type === 'extension' ? 'Ampliación' : 'Estacionamiento'}</td>
      <td data-label="Monto">${SP_Components.formatCurrency(t.amount)}</td>
      <td data-label="Estado">${SP_Components.renderBadge(t.status)}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="text-center text-muted">Sin transacciones registradas.</td></tr>';
}

function resolvePlate(txn) {
  if (txn.reservationId) {
    const res = window.mockData.reservations.find(r => r.id === txn.reservationId);
    if (res) return res.plate;
  }
  const det = (window.mockData.detections || []).find(dt => dt.matchReservation === txn.reservationId);
  return det ? det.plate : '—';
}