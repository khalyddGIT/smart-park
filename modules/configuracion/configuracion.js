/* CONFIGURACIÓN — RF12, RF18 */
/* Carga y guarda la configuración del local actual en mockData. */

function initConfiguracion() {
  const local = window.mockData.getLocalConfig();
  if (!local) {
    SP_Components.showToast('danger', 'Error', 'No se encontró el local asociado a tu cuenta.');
    return;
  }

  document.getElementById('cfg-name').value = local.name || '';
  document.getElementById('cfg-address').value = local.address || '';
  document.getElementById('cfg-schedule').value = local.schedule || '';
  document.getElementById('cfg-tolerance').value = local.tolerance || 0;
  document.getElementById('cfg-payRequired').checked = !!local.payRequired;
  document.getElementById('cfg-payAmount').value = local.payAmount || 0;
  document.getElementById('cfg-cameraIA').checked = !!local.ia;
  document.getElementById('cfg-camera').checked = !!local.techCam;
  document.getElementById('cfg-paymentGateway').checked = !!local.techNet;

  renderTarifas(local.tarifas || []);
}

function renderTarifas(tarifas) {
  const wrap = document.getElementById('cfg-tarifas');
  if (!wrap) return;
  if (!tarifas.length) {
    wrap.innerHTML = '<p class="text-sm text-muted">Sin tarifas configuradas.</p>';
    return;
  }

  const labels = {
    Automóvil: 'directions_car',
    Camioneta: 'local_shipping',
    Motocicleta: 'two_wheeler'
  };

  wrap.innerHTML = tarifas.map((t, i) => `
    <div class="form-group" data-tf="${i}" style="display:flex;align-items:flex-end;gap:var(--sp-md);flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <label class="form-label text-sm d-flex align-center gap-sm">
          <span class="material-symbols-outlined" style="color:var(--c3)">${labels[t.vehiculo] || 'directions_car'}</span>
          ${SP_Components.escapeHtml(t.vehiculo)}
        </label>
      </div>
      <div class="form-group" style="flex:1;min-width:120px;margin-bottom:0">
        <input type="number" class="form-control" data-field="hora" value="${t.hora || 0}" step="0.5" min="0" placeholder="S/ hora">
      </div>
      <div class="form-group" style="flex:1;min-width:120px;margin-bottom:0">
        <input type="number" class="form-control" data-field="minuto" value="${t.minuto || 0}" step="0.01" min="0" placeholder="S/ minuto">
      </div>
      <div class="form-group" style="flex:1;min-width:120px;margin-bottom:0">
        <input type="number" class="form-control" data-field="reserva" value="${t.reserva || 0}" step="0.5" min="0" placeholder="S/ reserva">
      </div>
    </div>
  `).join('');
}

function saveLocalConfig() {
  const local = window.mockData.getLocalConfig();
  if (!local) return;

  local.name = document.getElementById('cfg-name').value.trim() || local.name;
  local.address = document.getElementById('cfg-address').value.trim() || local.address;
  local.schedule = document.getElementById('cfg-schedule').value.trim() || local.schedule;
  local.tolerance = parseInt(document.getElementById('cfg-tolerance').value, 10) || 0;
  local.payRequired = document.getElementById('cfg-payRequired').checked;
  local.payAmount = parseFloat(document.getElementById('cfg-payAmount').value) || 0;
  local.ia = document.getElementById('cfg-cameraIA').checked;
  local.techCam = document.getElementById('cfg-camera').checked;
  local.techNet = document.getElementById('cfg-paymentGateway').checked;

  // Tarifas
  const backends = { hora: 'hora', minuto: 'minuto', reserva: 'reserva' };
  document.querySelectorAll('#cfg-tarifas [data-tf]').forEach(group => {
    const idx = parseInt(group.dataset.tf, 10);
    const t = local.tarifas[idx];
    if (!t) return;
    Object.keys(backends).forEach(field => {
      const input = group.querySelector(`[data-field="${field}"]`);
      if (input) t[backends[field]] = parseFloat(input.value) || 0;
    });
  });

  SP_Components.showToast('success', 'Guardado', 'Configuración del local actualizada correctamente.');
}