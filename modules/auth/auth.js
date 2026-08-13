/* ============================================================
   AUTH MODULE — auth.js — RF01–RF10
   ============================================================ */

function initAuth() {
  const d = window.mockData;
  const user = d.currentUser;
  const role = window.currentRole;

  // Fill profile form
  document.getElementById('auth-name').value = user.name;
  document.getElementById('auth-email').value = user.email;
  document.getElementById('auth-phone').value = user.phone || '';

  // Show/hide admin-only tabs
  document.getElementById('tab-login-admin').style.display = (role !== 'user') ? '' : 'none';
  document.getElementById('tab-roles').style.display = (role === 'platform') ? '' : 'none';
  document.getElementById('auth-access-log').style.display = (role !== 'user') ? '' : 'none';

  // Init tabs
  SP_Components.initTabs('#auth-tabs');
  SP_Components.initTabs('#auth-subtabs');

  // Render vehicles
  renderVehicles();

  // Render reservas table (RF137)
  renderReservasTable();

  // Render pagos table (RF137)
  renderPagosTable();

  // Render access log (RF07)
  if (role !== 'user') renderAccessLog();

  // Render roles table (RF08)
  if (role === 'platform') renderRolesTable();
}

function renderVehicles() {
  const d = window.mockData;
  const userId = d.currentUser.id;
  const vehicles = d.vehicles.filter(v => v.userId === userId);
  const container = document.getElementById('auth-vehicles-list');
  const tableContainer = document.getElementById('auth-vehicles-table');

  container.innerHTML = vehicles.length ? vehicles.map(v => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--color-bg);border-radius:var(--radius);margin-bottom:8px">
      <span class="material-symbols-outlined" style="color:var(--c3);font-size:1.5rem">directions_car</span>
      <div style="flex:1">
        <div class="text-sm fw-600">${v.plate}</div>
        <div class="text-xs text-muted">${v.brand} ${v.model} · ${v.color} · ${v.year}</div>
      </div>
      <span class="badge badge-accent">${v.type}</span>
    </div>
  `).join('') : '<p class="text-sm text-muted">No tienes vehículos registrados.</p>';

  if (tableContainer) {
    tableContainer.innerHTML = `
      <table class="sp-table table-cards">
        <thead><tr><th>Placa</th><th>Tipo</th><th>Marca/Modelo</th><th>Color</th><th>Año</th></tr></thead>
        <tbody>${vehicles.map(v => `
          <tr>
            <td data-label="Placa"><strong>${v.plate}</strong></td>
            <td data-label="Tipo">${v.type}</td>
            <td data-label="Marca/Modelo">${v.brand} ${v.model}</td>
            <td data-label="Color">${v.color}</td>
            <td data-label="Año">${v.year}</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
  }
}

function renderReservasTable() {
  const d = window.mockData;
  const userId = d.currentUser.id;
  const reservas = d.reservations.filter(r => r.userId === userId);
  const container = document.getElementById('auth-reservas-table');
  if (!container) return;

  container.innerHTML = `
    <table class="sp-table table-cards">
      <thead><tr><th>Código</th><th>Local</th><th>Espacio</th><th>Placa</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${reservas.map(r => `
        <tr>
          <td data-label="Código"><strong>${r.code}</strong></td>
          <td data-label="Local">${d.getLocalName(r.localId)}</td>
          <td data-label="Espacio">${r.spaceId}</td>
          <td data-label="Placa">${r.plate}</td>
          <td data-label="Estado">${SP_Components.renderBadge(r.status)}</td>
          <td data-label="Fecha">${SP_Components.formatDateTime(r.created)}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
}

function renderPagosTable() {
  const d = window.mockData;
  const userId = d.currentUser.id;
  const txns = d.transactions.filter(t => t.userId === userId);
  const container = document.getElementById('auth-pagos-table');
  if (!container) return;

  container.innerHTML = `
    <table class="sp-table table-cards">
      <thead><tr><th>ID</th><th>Tipo</th><th>Monto</th><th>Método</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${txns.map(t => `
        <tr>
          <td data-label="ID"><strong>${t.id}</strong></td>
          <td data-label="Tipo">${t.type}</td>
          <td data-label="Monto">${SP_Components.formatCurrency(t.amount)}</td>
          <td data-label="Método">${t.method}</td>
          <td data-label="Estado">${SP_Components.renderBadge(t.status)}</td>
          <td data-label="Fecha">${SP_Components.formatDateTime(t.date)}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
}

// RF07
function renderAccessLog() {
  const d = window.mockData;
  const userId = d.currentUser.id;
  const logs = d.accessLog.filter(l => l.userId === userId);
  const tbody = document.getElementById('auth-access-tbody');
  if (!tbody) return;
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td data-label="Fecha">${l.date}</td>
      <td data-label="Hora">${l.time}</td>
      <td data-label="Método">${l.method}</td>
      <td data-label="Resultado">${l.result === 'Exitoso' ? '<span class="badge badge-success">Exitoso</span>' : '<span class="badge badge-danger">Fallido</span>'}</td>
    </tr>
  `).join('');
}

// RF08
function renderRolesTable() {
  const d = window.mockData;
  const tbody = document.getElementById('auth-roles-tbody');
  if (!tbody) return;
  const roleLabels = { user: 'Usuario Final', local: 'Admin Local', platform: 'Admin Plataforma' };
  tbody.innerHTML = d.users.map(u => `
    <tr>
      <td data-label="Usuario"><div class="d-flex align-center gap-sm"><div class="avatar avatar-sm" style="background:var(--c3);color:#fff">${u.avatar}</div>${u.name}</div></td>
      <td data-label="Email">${u.email}</td>
      <td data-label="Rol">${SP_Components.renderBadge(u.role === 'platform' ? 'active' : u.role === 'local' ? 'reserved' : 'available')}<br><span class="text-xs">${roleLabels[u.role]}</span></td>
      <td data-label="Registrado">${SP_Components.formatDate(u.registered)}</td>
      <td data-label="Acciones"><button class="btn btn-sm btn-ghost" onclick="SP_Components.showToast('info','Roles','Cambio de rol simulado')">Cambiar Rol</button></td>
    </tr>
  `).join('');
}

function saveProfile() {
  const name = document.getElementById('auth-name').value;
  const email = document.getElementById('auth-email').value;
  if (name && email) {
    window.mockData.currentUser.name = name;
    window.mockData.currentUser.email = email;
    SP_Components.showToast('success', 'Perfil actualizado', 'Tus datos se guardaron correctamente.');
  }
}

// RF03: Biometric simulation
function simulateBiometric(type) {
  const scanner = document.getElementById('biometric-scanner');
  const icon = document.getElementById('biometric-icon');
  const scanLine = document.getElementById('biometric-scan-line');
  const status = document.getElementById('biometric-status');

  icon.textContent = type === 'facial' ? 'face' : 'fingerprint';
  scanner.className = 'scanning';
  scanLine.style.display = 'block';
  status.textContent = type === 'facial' ? 'Escaneando rostro...' : 'Leyendo huella dactilar...';

  setTimeout(() => {
    scanLine.style.display = 'none';
    scanner.className = 'success';
    icon.textContent = 'check_circle';
    icon.style.color = 'var(--color-success)';
    status.textContent = `Autenticación ${type === 'facial' ? 'facial' : 'por huella'} exitosa`;
    SP_Components.showToast('success', 'Verificación exitosa', `Identidad confirmada mediante ${type === 'facial' ? 'reconocimiento facial' : 'huella dactilar'}.`);
  }, 2500);
}

// RF10: Add vehicle
function addVehicle() {
  const plate = document.getElementById('new-vehicle-plate').value.toUpperCase();
  const type = document.getElementById('new-vehicle-type').value;
  const brand = document.getElementById('new-vehicle-brand').value;
  const model = document.getElementById('new-vehicle-model').value;
  const color = document.getElementById('new-vehicle-color').value;

  if (!plate) { SP_Components.showToast('warning', 'Campos requeridos', 'Ingresa la placa del vehículo.'); return; }

  window.mockData.vehicles.push({
    id: Date.now(), userId: window.mockData.currentUser.id,
    plate, type, brand: brand || 'N/A', model: model || 'N/A', color: color || 'N/A', year: 2026
  });

  SP_Components.closeModal('modal-add-vehicle');
  renderVehicles();
  SP_Components.showToast('success', 'Vehículo agregado', `${plate} fue registrado correctamente.`);
}

/* ── RF08: AGREGAR NUEVO USUARIO ──────────────────────────── */
window.submitNewUser = function() {
  const nameInput = document.getElementById('add-user-name').value.trim();
  const emailInput = document.getElementById('add-user-email').value.trim();
  const roleInput = document.getElementById('add-user-role').value;

  if (!nameInput || !emailInput) {
    SP_Components.showToast('error', 'Error', 'Por favor, complete todos los campos.');
    return;
  }

  // Find max ID
  const newId = Math.max(...window.mockData.users.map(u => u.id)) + 1;
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  window.mockData.users.push({
    id: newId,
    name: nameInput,
    email: emailInput,
    role: roleInput,
    avatar: nameInput.substring(0, 2).toUpperCase(),
    phone: '',
    registered: today
  });

  SP_Components.closeModal('modal-add-user');
  
  // Re-render roles table if it exists
  const rolesTable = document.getElementById('auth-roles-tbody');
  if (rolesTable) {
    // Re-render by calling the function that populates it.
    // The auth module renders roles in renderAuthUI() via renderRolesTable() (which is inside initAuth, probably).
    // Let's just manually re-trigger render roles logic
    renderRolesTable();
  }

  SP_Components.showToast('success', 'Usuario Creado', `El usuario ${nameInput} ha sido agregado exitosamente.`);
  
  // Clear inputs
  document.getElementById('add-user-name').value = '';
  document.getElementById('add-user-email').value = '';
  document.getElementById('add-user-role').value = 'user';
}
