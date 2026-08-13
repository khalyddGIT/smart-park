/* HISTORIAL — RF91–RF95 */

function initHistorial() {
  const d = window.mockData;
  const role = window.currentRole;

  const th = document.getElementById('th-user-local');
  if (th) th.textContent = role === 'user' ? 'Local' : 'Usuario';

  let rsvs = d.getReservationsByRole(role, true);

  // Filtros
  const search = (document.getElementById('hist-search')?.value || '').trim().toUpperCase();
  const from = document.getElementById('hist-from')?.value;
  const to = document.getElementById('hist-to')?.value;
  const state = document.getElementById('hist-state')?.value || '';

  if (search) rsvs = rsvs.filter(r => r.plate.toUpperCase().includes(search) || r.code.toUpperCase().includes(search));
  if (state) rsvs = rsvs.filter(r => r.status === state);
  if (from) rsvs = rsvs.filter(r => (r.entryTime || r.created || '').slice(0, 10) >= from);
  if (to) rsvs = rsvs.filter(r => (r.entryTime || r.created || '').slice(0, 10) <= to);

  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = rsvs.length ? rsvs.map(r => {
    const context = role === 'user'
      ? d.getLocalName(r.localId)
      : (d.users.find(u => u.id === r.userId)?.name || '—');
    return `<tr>
      <td data-label="Código"><strong>${SP_Components.escapeHtml(r.code)}</strong></td>
      <td data-label="${role === 'user' ? 'Local' : 'Usuario'}">${SP_Components.escapeHtml(context)}</td>
      <td data-label="Placa"><span class="plate-display" style="font-size:.7rem;padding:2px 6px">${SP_Components.escapeHtml(r.plate)}</span></td>
      <td data-label="Estado">${SP_Components.renderBadge(r.status)}</td>
      <td data-label="Ingreso">${SP_Components.formatDateTime(r.entryTime || r.created)}</td>
      <td data-label="Salida">${SP_Components.formatDateTime(r.exitTime)}</td>
      <td data-label="Total Pagado"><strong>${r.totalPaid ? SP_Components.formatCurrency(r.totalPaid) : '—'}</strong></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="text-center text-muted">No se encontraron registros con los filtros aplicados.</td></tr>';
}

function exportarHistorial() {
  const d = window.mockData;
  const role = window.currentRole;
  const rows = d.getReservationsByRole(role, true).map(r => ({
    Codigo: r.code,
    [role === 'user' ? 'Local' : 'Usuario']: role === 'user' ? d.getLocalName(r.localId) : (d.users.find(u => u.id === r.userId)?.name || '—'),
    Placa: r.plate,
    Estado: r.status,
    Ingreso: r.entryTime || r.created || '',
    Salida: r.exitTime || '',
    TotalPagado: r.totalPaid || 0
  }));
  SP_Components.exportCSV(rows, `Historial_Reservas_${role}`);
}