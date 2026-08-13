/* DETALLE ESTACIONAMIENTO — RF27–RF31 */
let detalleLocal = null;

function initDetalleEstacionamiento() {
  const d = window.mockData;
  const localId = window.currentLocalIdView || null;
  detalleLocal = localId
    ? d.locales.find(l => l.id === localId)
    : (d.locales.find(l => l.status === 'Activo') || d.locales[0]);

  if (!detalleLocal) return;
  window.currentLocalIdView = detalleLocal.id;

  const counts = d.countSpaces(detalleLocal.id);
  const reviews = d.reviews.filter(r => r.localId === detalleLocal.id).slice(0, 3);
  const container = document.getElementById('detalle-content');
  if (!container) return;

  container.innerHTML = `
    <div class="detalle-hero">
      <img src="${SP_Components.escapeHtml(detalleLocal.image || 'img/park_smart.webp')}" alt="${SP_Components.escapeHtml(detalleLocal.name)}" loading="lazy">
      <div class="detalle-hero-overlay">
        <h2>${SP_Components.escapeHtml(detalleLocal.name)}</h2>
        <p style="font-size:.85rem;opacity:.9">${SP_Components.escapeHtml(detalleLocal.address)}</p>
        <div class="detalle-hero-meta">
          <span class="detalle-hero-chip"><span class="material-symbols-outlined">near_me</span> ${detalleLocal.distance || '—'} km</span>
          <span class="detalle-hero-chip"><span class="material-symbols-outlined">schedule</span> ${SP_Components.escapeHtml(detalleLocal.schedule || '06:00 - 23:00')}</span>
          <span class="detalle-hero-chip"><span class="material-symbols-outlined">local_parking</span> ${counts.available} disponibles ahora</span>
        </div>
        ${SP_Components.renderStars(Math.round(detalleLocal.rating))} <span class="text-sm">${detalleLocal.rating}</span>
      </div>
    </div>
    <!-- RF27: Contadores en tiempo real -->
    <div class="stats-grid">
      <div class="stat-card"><div class="sc-top"><div class="sc-icon" style="background:rgba(var(--c3-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">local_parking</span></div></div><div class="sc-value">${counts.total}</div><div class="sc-label">Total Espacios</div></div>
      <div class="stat-card"><div class="sc-top"><div class="sc-icon" style="background:var(--color-success-bg);color:var(--color-success)"><span class="material-symbols-outlined">check_circle</span></div></div><div class="sc-value">${counts.available}</div><div class="sc-label">Disponibles</div></div>
      <div class="stat-card"><div class="sc-top"><div class="sc-icon" style="background:var(--st-occupied-bg);color:var(--st-occupied)"><span class="material-symbols-outlined">block</span></div></div><div class="sc-value">${counts.occupied}</div><div class="sc-label">Ocupados</div></div>
      <div class="stat-card"><div class="sc-top"><div class="sc-icon" style="background:var(--st-reserved-bg);color:var(--st-reserved)"><span class="material-symbols-outlined">pending</span></div></div><div class="sc-value">${counts.reserved}</div><div class="sc-label">Reservados</div></div>
    </div>
    <!-- Mapa del estacionamiento (plano dibujado) -->
    <div class="card mt-lg">
      <div class="card-header"><h3><span class="material-symbols-outlined">map</span> Mapa del Estacionamiento</h3>
        <button class="btn btn-sm btn-primary" onclick="reservarEsteLocal()"><span class="material-symbols-outlined">event</span> Reservar espacio</button>
      </div>
      <div class="card-body">
        ${SP_Components.renderInteractiveMap(
          d.spaces.filter(s => s.localId === detalleLocal.id),
          detalleLocal.id,
          { onClickAttr: 'onclick="detalleShowSpace(\'${s.id}\')"', designElements: d.designElements ? d.designElements.filter(e => e.localId === detalleLocal.id) : [] }
        )}
        <div class="space-legend mt-sm">
          <span class="space-legend-item"><span class="legend-dot available"></span> Disponible</span>
          <span class="space-legend-item"><span class="legend-dot reserved"></span> Reservado</span>
          <span class="space-legend-item"><span class="legend-dot occupied"></span> Ocupado</span>
        </div>
      </div>
    </div>
    <div class="grid-2 mt-lg">
      <!-- RF28: Tabla de tarifas -->
      <div class="card">
        <div class="card-header"><h3>Tarifas</h3></div>
        <div class="card-body">
          <table class="sp-table"><thead><tr><th>Tipo Vehículo</th><th>Por Hora</th><th>Por Minuto</th><th>Reserva</th></tr></thead>
          <tbody>${(detalleLocal.tarifas || [
            { vehiculo: 'Automóvil', hora: 3.50, minuto: 0.05, reserva: 2.00 },
            { vehiculo: 'Motocicleta', hora: 1.50, minuto: 0.02, reserva: 1.00 }
          ]).map(t => `<tr><td>${SP_Components.escapeHtml(t.vehiculo)}</td><td>${SP_Components.formatCurrency(t.hora)}</td><td>${SP_Components.formatCurrency(t.minuto)}</td><td>${SP_Components.formatCurrency(t.reserva)}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <!-- RF29: Horario, condiciones y servicios -->
      <div class="card">
        <div class="card-header"><h3>Información y Servicios</h3></div>
        <div class="card-body">
          <div class="detalle-info-grid">
            <div class="detalle-info-card"><span class="material-symbols-outlined">schedule</span><div class="text-sm fw-600">${SP_Components.escapeHtml(detalleLocal.schedule || '06:00 - 23:00')}</div><div class="text-xs text-muted">Horario</div></div>
            <div class="detalle-info-card"><span class="material-symbols-outlined">timer</span><div class="text-sm fw-600">${detalleLocal.tolerance || 15} min</div><div class="text-xs text-muted">Tolerancia</div></div>
            <div class="detalle-info-card"><span class="material-symbols-outlined">${detalleLocal.camera ? 'videocam' : 'videocam_off'}</span><div class="text-sm fw-600">${detalleLocal.camera ? 'Sí' : 'No'}</div><div class="text-xs text-muted">Cámaras</div></div>
            <div class="detalle-info-card"><span class="material-symbols-outlined">${detalleLocal.ia ? 'smart_toy' : 'smart_toy'}</span><div class="text-sm fw-600">${detalleLocal.ia ? 'Activa' : 'No'}</div><div class="text-xs text-muted">Visión IA</div></div>
            <div class="detalle-info-card"><span class="material-symbols-outlined">${detalleLocal.techRoof ? 'roofing' : 'no_meeting_room'}</span><div class="text-sm fw-600">${detalleLocal.techRoof ? 'Sí' : 'No'}</div><div class="text-xs text-muted">Techado</div></div>
            <div class="detalle-info-card"><span class="material-symbols-outlined">${detalleLocal.techNet ? 'wifi' : 'wifi_off'}</span><div class="text-sm fw-600">${detalleLocal.techNet ? 'Sí' : 'No'}</div><div class="text-xs text-muted">Cobertura Red</div></div>
          </div>
          ${detalleLocal.payRequired ? `<div class="badge badge-warning mt-sm">Requiere pago de confirmación: ${SP_Components.formatCurrency(detalleLocal.payAmount)}</div>` : ''}
        </div>
      </div>
    </div>
    <!-- RF30: Calificación y reseñas -->
    <div class="card mt-lg">
      <div class="card-header"><h3>Calificación y Reseñas</h3><span class="text-sm fw-700" style="color:var(--color-warning)">${detalleLocal.rating} ⭐</span></div>
      <div class="card-body">
        ${reviews.length ? reviews.map(r => `
          <div style="padding:12px 0;border-bottom:1px solid var(--color-border-light)">
            <div class="d-flex align-center gap-sm mb-sm">
              <div class="avatar avatar-sm" style="background:var(--c3);color:#fff">${SP_Components.escapeHtml((r.userName || '?').split(' ').map(n => n[0]).join(''))}</div>
              <div><div class="text-sm fw-600">${SP_Components.escapeHtml(r.userName)}</div><div class="text-xs text-muted">${SP_Components.formatDate(r.date)}</div></div>
              <div style="margin-left:auto">${SP_Components.renderStars(r.rating)}</div>
            </div>
            <p class="text-sm">${SP_Components.escapeHtml(r.comment)}</p>
            ${r.response ? `<div style="margin-top:8px;padding:8px 12px;background:var(--color-bg);border-radius:var(--radius);border-left:3px solid var(--c3)"><div class="text-xs fw-600" style="color:var(--c3)">Respuesta del local:</div><p class="text-sm">${SP_Components.escapeHtml(r.response)}</p></div>` : ''}
          </div>
        `).join('') : '<p class="text-sm text-muted">Este local aún no tiene reseñas.</p>'}
      </div>
    </div>`;
}

function reservarEsteLocal() {
  if (!detalleLocal) return;
  window.currentLocalIdView = detalleLocal.id;
  SmartParkApp.loadModule('reservas');
}

function detalleShowSpace(id) {
  const s = window.mockData.spaces.find(x => x.id === id);
  if (!s) return;
  document.querySelectorAll('.space-cell').forEach(c => c.classList.remove('selected'));
  document.getElementById(`space-cell-${id}`)?.classList.add('selected');
  const label = s.status === 'available' ? 'Disponible' : s.status;
  const ok = s.status === 'available' && s.reservable;
  SP_Components.showToast(ok ? 'success' : 'info', `Espacio ${s.id}`,
    `${s.type} · ${label}${s.shade ? ' · Con sombra' : ''}${ok ? ' · Clic en Reservar para apartarlo' : ''}`);
}