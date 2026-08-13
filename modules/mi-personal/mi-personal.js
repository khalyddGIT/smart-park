/* MI PERSONAL — Gestión de Trabajadores del Local */

function initMiPersonal() {
  renderMiPersonal();
}

function getStaff() {
  const d = window.mockData;
  const localId = d.currentUser.localId || 1;
  return (d.staff || []).filter(s => s.localId === localId);
}

function renderMiPersonal() {
  const tbody = document.getElementById('mp-tbody');
  if (!tbody) return;
  const d = window.mockData;
  const localId = d.currentUser.localId || 1;
  const list = getStaff();

  const query = (document.getElementById('mp-search')?.value || '').trim().toLowerCase();
  const shift = document.getElementById('mp-shift')?.value || '';
  const status = document.getElementById('mp-status')?.value || '';

  let filtered = list.filter(s =>
    (query === '' || (s.name + ' ' + s.dni + ' ' + s.role).toLowerCase().includes(query)) &&
    (shift === '' || s.shift === shift) &&
    (status === '' || s.status === status)
  );

  document.getElementById('mp-total').textContent = list.length;
  document.getElementById('mp-activos').textContent = list.filter(s => s.status === 'activo').length;
  document.getElementById('mp-inactivos').textContent = list.filter(s => s.status !== 'activo').length;
  document.getElementById('mp-guardias').textContent = list.filter(s => s.role === 'Guardia de Seguridad').length;

  tbody.innerHTML = filtered.length ? filtered.map(s => `
    <tr>
      <td data-label="Trabajador"><div class="d-flex" style="align-items:center;gap:10px"><div style="width:34px;height:34px;border-radius:50%;background:rgba(var(--c3-rgb),.15);color:var(--c3);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem">${SP_Components.escapeHtml(s.avatar || (s.name||'??').substring(0,2).toUpperCase())}</div><div><strong>${SP_Components.escapeHtml(s.name)}</strong><div class="text-xs text-muted">${SP_Components.escapeHtml(s.email || '—')}</div></div></div></td>
      <td data-label="Rol">${SP_Components.escapeHtml(s.role)}</td>
      <td data-label="DNI">${SP_Components.escapeHtml(s.dni || '—')}</td>
      <td data-label="Turno">${SP_Components.escapeHtml(s.shift || '—')}</td>
      <td data-label="Contacto">${SP_Components.escapeHtml(s.phone || '—')}</td>
      <td data-label="Estado">${SP_Components.renderBadge(s.status === 'activo' ? 'Activo' : 'Inactivo')}</td>
      <td data-label="Acciones">
        <button class="btn btn-sm btn-ghost" onclick='openEditStaff(${JSON.stringify(s)})' title="Editar"><span class="material-symbols-outlined">edit</span></button>
        <button class="btn btn-sm btn-ghost" onclick="toggleStaffStatus('${s.id}')" title="Cambiar estado"><span class="material-symbols-outlined" style="color:${s.status === 'activo' ? 'var(--color-warning)' : 'var(--color-success)'}">${s.status === 'activo' ? 'person_off' : 'person'}</span></button>
        <button class="btn btn-sm btn-ghost text-danger" onclick="deleteStaff('${s.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="text-center text-muted">No hay trabajadores que coincidan con la búsqueda.</td></tr>';
}

function openEditStaff(s) {
  document.getElementById('mp-modal-title').textContent = 'Editar Trabajador';
  document.getElementById('mp-edit-id').value = s.id;
  document.getElementById('mp-name').value = s.name || '';
  document.getElementById('mp-role').value = s.role || '';
  document.getElementById('mp-dni').value = s.dni || '';
  document.getElementById('mp-phone').value = s.phone || '';
  document.getElementById('mp-email').value = s.email || '';
  document.getElementById('mp-shift-ed').value = s.shift || '';
  document.getElementById('mp-status-ed').value = s.status || 'activo';
  SP_Components.openModal('modal-add-staff');
}

function resetStaffForm() {
  document.getElementById('mp-modal-title').textContent = 'Agregar Trabajador';
  document.getElementById('mp-edit-id').value = '';
  ['mp-name','mp-role','mp-dni','mp-phone','mp-email','mp-shift-ed','mp-status-ed'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = id === 'mp-shift-ed' ? 'Mañana' : id === 'mp-status-ed' ? 'activo' : (id === 'mp-role' ? 'Guardia de Seguridad' : '');
  });
}

function openAddStaff() {
  resetStaffForm();
  SP_Components.openModal('modal-add-staff');
}

function saveStaff() {
  const d = window.mockData;
  const id = document.getElementById('mp-edit-id').value;
  const name = document.getElementById('mp-name').value.trim();
  const role = document.getElementById('mp-role').value;
  const dni = document.getElementById('mp-dni').value.trim();
  const phone = document.getElementById('mp-phone').value.trim();
  const email = document.getElementById('mp-email').value.trim();
  const shift = document.getElementById('mp-shift-ed').value;
  const status = document.getElementById('mp-status-ed').value;

  if (!name) { SP_Components.showToast('warning','Requerido','Ingresa el nombre del trabajador'); return; }
  if (dni && !/^\d{8}$/.test(dni)) { SP_Components.showToast('warning','DNI inválido','El DNI debe tener 8 dígitos'); return; }

  if (id) {
    const s = d.staff.find(x => String(x.id) === String(id));
    if (s) Object.assign(s, { name, role, dni, phone, email, shift, status });
    SP_Components.showToast('success','Guardado','Trabajador actualizado');
  } else {
    const newId = Math.max(0, ...d.staff.map(s => s.id)) + 1;
    d.staff.push({
      id: newId,
      localId: d.currentUser.localId || 1,
      name, role, dni, phone, email, shift, status,
      hired: new Date().toISOString().split('T')[0],
      avatar: name.substring(0,2).toUpperCase()
    });
    SP_Components.showToast('success','Agregado','Trabajador registrado');
  }
  SP_Components.closeModal('modal-add-staff');
  renderMiPersonal();
}

function toggleStaffStatus(id) {
  const s = window.mockData.staff.find(x => String(x.id) === String(id));
  if (!s) return;
  s.status = s.status === 'activo' ? 'inactivo' : 'activo';
  SP_Components.showToast('info','Estado actualizado', `${s.name} ahora está ${s.status === 'activo' ? 'activo' : 'inactivo'}`);
  renderMiPersonal();
}

function deleteStaff(id) {
  SP_Components.confirm('Eliminar Trabajador', '¿Seguro que deseas eliminar a este trabajador? Esta acción no se puede deshacer.', () => {
    window.mockData.staff = (window.mockData.staff || []).filter(s => String(s.id) !== String(id));
    SP_Components.showToast('success','Eliminado','Trabajador eliminado');
    renderMiPersonal();
  });
}