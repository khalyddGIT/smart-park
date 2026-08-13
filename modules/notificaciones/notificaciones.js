/* NOTIFICACIONES — RF120–RF128 */

const NOTIF_META = {
  'reservation-expiring':   { icon: 'timer',           color: 'var(--color-warning)' },
  'payment-confirmed':      { icon: 'payments',        color: 'var(--color-success)' },
  'vehicle-location':       { icon: 'directions_car',  color: 'var(--color-info)' },
  'plate-discrepancy':      { icon: 'report',          color: 'var(--color-danger)' },
  'no-reservation-entry':   { icon: 'front_door',      color: 'var(--color-warning)' },
  'auto-release':           { icon: 'autorenew',       color: 'var(--color-text-muted)' },
  'review-response':        { icon: 'forum',           color: 'var(--color-success)' }
};

const PREF_LABELS = {
  reservationExpiring: ['timer', 'Reservas por vencer'],
  paymentConfirmed:    ['payments', 'Pagos confirmados'],
  vehicleLocation:     ['directions_car', 'Ubicación del vehículo'],
  autoRelease:         ['autorenew', 'Liberación automática'],
  reviewResponse:      ['forum', 'Respuestas a reseñas'],
  promotions:          ['local_offer', 'Promociones y ofertas']
};

function initNotificaciones() {
  renderNotifications();
  renderPreferences();

  // ── Notificaciones en vivo vía WebSocket ──
  const onPush = (payload) => {
    if (!payload || !payload.title) return;
    const d = window.mockData;
    const nextId = Math.max(0, ...d.notifications.map(n => n.id)) + 1;
    d.notifications.push({
      id: nextId,
      userId: d.currentUser.id,
      type: 'live',
      title: payload.title,
      message: payload.message,
      date: payload.ts || new Date().toISOString().slice(0, 19).replace('T', ' '),
      read: false
    });
    if (document.getElementById('notif-list')) renderNotifications();
    SmartParkApp.updateNotifCount();
    SP_Components.showToast('info', 'Notificación en vivo', payload.message);
  };
  window.SP_WS.subscribe('notification:push', onPush);
  window.SP_NotificationsHandler = onPush;
}

function getMyNotifications() {
  const d = window.mockData;
  const current = d.currentUser;
  let list = d.notifications.filter(n => n.userId === current.id);
  if (!list.length && current.role === 'platform') list = d.notifications;
  return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderNotifications() {
  const list = getMyNotifications();
  const el = document.getElementById('notif-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined" style="font-size:3rem;color:var(--color-text-muted)">notifications_off</span><h3 style="margin-top:8px">Sin notificaciones</h3><p class="text-sm text-muted">Por ahora no tienes notificaciones.</p></div>';
    return;
  }

  el.innerHTML = list.map(n => {
    const meta = NOTIF_META[n.type] || { icon: 'info', color: 'var(--color-info)' };
    const action = n.actionModule
      ? `<button class="btn btn-sm btn-ghost" onclick="SmartParkApp.loadModule('${n.actionModule}')"><span class="material-symbols-outlined" style="font-size:1rem">open_in_new</span> Ir</button>`
      : '';
    return `
    <div class="list-row" style="padding:16px;background:${n.read ? 'transparent' : 'rgba(var(--c3-rgb),.05)'}">
      <span class="material-symbols-outlined" style="color:${meta.color}">${meta.icon}</span>
      <div class="list-main">
        <div class="list-title ${n.read ? 'text-muted' : ''}">${SP_Components.escapeHtml(n.title)}</div>
        <div class="list-sub ${n.read ? '' : 'fw-600'}">${SP_Components.escapeHtml(n.message)}</div>
        <div class="list-sub">${SP_Components.formatDateTime(n.date)}${n.read ? ' · <span class="text-muted">Leída</span>' : ''}</div>
      </div>
      <div class="list-meta">
        ${action}
        ${n.read ? '' : `<button class="btn btn-sm btn-ghost" onclick="markNotificationRead(${n.id})">Marcar leída</button>`}
      </div>
    </div>`;
  }).join('');
}

function markNotificationRead(id) {
  const n = window.mockData.notifications.find(x => x.id === id);
  if (n) { n.read = true; SmartParkApp.updateNotifCount(); }
  renderNotifications();
  SP_Components.showToast('info', 'Notificación', 'Marcada como leída.');
}

function markAllNotificationsRead() {
  const current = window.mockData.currentUser;
  window.mockData.notifications
    .filter(x => x.userId === current.id && !x.read)
    .forEach(x => { x.read = true; });
  SmartParkApp.updateNotifCount();
  renderNotifications();
  SP_Components.showToast('success', 'Listo', 'Todas las notificaciones fueron marcadas como leídas.');
}

function renderPreferences() {
  const el = document.getElementById('notif-preferences');
  if (!el) return;
  const prefs = window.mockData.notifPreferences;

  const typeHtml = Object.keys(PREF_LABELS).map(key => {
    const [icon, label] = PREF_LABELS[key];
    return `
      <label class="form-switch mb-md"><input type="checkbox" ${prefs[key] ? 'checked' : ''} onchange="toggleNotifPref('${key}', this.checked)"><div class="switch-track"></div><span class="text-sm"><span class="material-symbols-outlined" style="vertical-align:middle;font-size:1.1rem;color:var(--c3)">${icon}</span> ${label}</span></label>`;
  }).join('');

  const channelHtml = [
    ['emailNotif', 'mail', 'Notificaciones por Email'],
    ['pushNotif', 'notifications_active', 'Notificaciones Push'],
    ['smsNotif', 'sms', 'Notificaciones por SMS']
  ].map(([key, icon, label]) => `
    <label class="form-switch"><input type="checkbox" ${prefs[key] ? 'checked' : ''} onchange="toggleNotifPref('${key}', this.checked)"><div class="switch-track"></div><span class="text-sm"><span class="material-symbols-outlined" style="vertical-align:middle;font-size:1.1rem;color:var(--c3)">${icon}</span> ${label}</span></label>
  `).join('');

  el.innerHTML = `
    ${typeHtml}
    <hr style="border:0;border-top:1px solid var(--color-border-light);margin:16px 0">
    <div class="card-header" style="padding:0 0 var(--sp-sm)"><h3 style="font-size:.85rem">Canales de Entrega</h3></div>
    ${channelHtml}
  `;
}

function toggleNotifPref(key, value) {
  window.mockData.notifPreferences[key] = value;
  SP_Components.showToast('info', 'Preferencias', 'Preferencia de notificación actualizada.');
}