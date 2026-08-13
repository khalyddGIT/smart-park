/* ESTACIONAMIENTOS AFILIADOS — RF130–RF134 */
function initEstacionamientosAfiliados() {
  const d = window.mockData;
  document.getElementById('ea-total').textContent = d.locales.length;
  document.getElementById('ea-spaces').textContent = d.spaces.length;
  
  document.getElementById('ea-tbody').innerHTML = d.locales.map(l => `
    <tr>
      <td data-label="ID"><strong>${l.id}</strong></td>
      <td data-label="Nombre">${l.name}</td>
      <td data-label="Distrito">${l.address.split(',')[0]}</td>
      <td data-label="Estado">${SP_Components.renderBadge(l.status)}</td>
      <td data-label="Acciones">
        <button class="btn btn-sm btn-ghost" onclick="window.openEditLocalAdmin(${l.id})" title="Editar Local"><span class="material-symbols-outlined">edit</span></button>
        <button class="btn btn-sm btn-ghost" onclick="SP_Components.showToast('info','Auditoría','Abriendo panel de auditoría del local...')" title="Métricas"><span class="material-symbols-outlined">monitoring</span></button>
        <button class="btn btn-sm btn-ghost" style="color: ${l.status==='Activo'?'var(--c1)':'var(--color-text-muted)'}" onclick="window.toggleLocalState(${l.id})" title="${l.status==='Activo'?'Desactivar':'Activar'}">
          <span class="material-symbols-outlined" style="font-size: 1.8rem; vertical-align: middle;">${l.status==='Activo'?'toggle_on':'toggle_off'}</span>
        </button>
      </td>
    </tr>
  `).join('');

  const btn = document.getElementById('btn-draw-plan-local');
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const count = Math.max(1, parseInt(document.getElementById('new-local-spaces').value) || 20);
      const prefix = 'A';
      const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
      const rows = Math.ceil(count / cols);
      const spaces = Array.from({ length: count }, (_, i) => ({
        id: prefix + '-' + String(i + 1).padStart(2, '0'),
        type: 'Automóvil', reservable: true,
        x: +(6 + (i % cols) * (88 / cols)).toFixed(1),
        y: +(6 + Math.floor(i / cols) * (88 / rows)).toFixed(1),
        width: 7, height: 11, rotation: 0, scale: 1
      }));
      window.FloorEditor.open({
        prefix, spaces, designElements: [], floorPlan: null,
        title: 'Dibujar Plano — Nuevo Local',
        onApply: (r) => {
          window.draftLocalPlan = r;
          const hint = document.getElementById('new-local-map-hint');
          if (hint) hint.textContent = `Plano dibujado con ${r.spaces.length} espacios y ${(r.designElements || []).length} elementos.`;
        }
      });
    });
  }

  const btnEdit = document.getElementById('btn-edit-plan-local');
  if (btnEdit && !btnEdit.dataset.wired) {
    btnEdit.dataset.wired = '1';
    btnEdit.addEventListener('click', window.openEditLocalPlan);
  }
}

function prefixForSpaces(arr) {
  const m = (arr || []).map(s => String(s.id || '').match(/^([A-Z]+)-\d+$/)).filter(Boolean)[0];
  return m ? m[1] : 'A';
}

function refreshEditLocalPlan(local) {
  const hint = document.getElementById('edit-local-plan-hint');
  if (!local || !hint) return;
  const d = window.mockData;
  const scount = (d.spaces || []).filter(s => s.localId === local.id).length;
  const ecount = (d.designElements || []).filter(e => e.localId === local.id).length;
  hint.textContent = scount
    ? `Plano dibujado con ${scount} espacio(s) y ${ecount} elemento(s).`
    : 'Sin plano dibujado.';
}

window.openEditLocalPlan = function() {
  const id = parseInt(document.getElementById('edit-local-id').value);
  const d = window.mockData;
  const local = d.locales.find(l => l.id === id);
  if (!local) return;
  const spaces = (d.spaces || []).filter(s => s.localId === id).map(s => Object.assign({}, s));
  const designElements = (d.designElements || []).filter(e => e.localId === id).map(e => Object.assign({}, e));
  const prefix = prefixForSpaces(spaces);
  window.FloorEditor.open({
    prefix, spaces, designElements, floorPlan: local.floorPlan || null,
    title: 'Dibujar Plano — ' + local.name,
    onApply: (r) => {
      window.FloorEditor.applyToLocal(id, r);
      const updated = d.locales.find(l => l.id === id);
      refreshEditLocalPlan(updated);
      SP_Components.showToast('success', 'Plano Actualizado', `Plano guardado con ${r.spaces.length} espacios y ${(r.designElements || []).length} elementos.`);
    }
  });
};

function addNewLocal() {
  const name = document.getElementById('new-local-name').value.trim();
  const address = document.getElementById('new-local-address').value.trim();
  const adminEmail = document.getElementById('new-local-admin-email').value.trim();
  const adminPass = document.getElementById('new-local-admin-pass').value.trim();
  const spacesCount = parseInt(document.getElementById('new-local-spaces').value) || 20;

  if (!name || !address || !adminEmail || !adminPass) {
    SP_Components.showToast('warning', 'Campos requeridos', 'Por favor ingresa nombre, dirección y las credenciales básicas del admin.');
    return;
  }

  const newId = window.mockData.locales.length > 0 ? Math.max(...window.mockData.locales.map(l => l.id)) + 1 : 1;

  const draft = window.draftLocalPlan || null;
  let floorPlanUrl = draft && draft.floorPlan ? draft.floorPlan : null;

  window.mockData.locales.push({
    id: newId,
    name: name,
    address: address,
    admin: adminEmail,
    status: 'Activo',
    totalSpaces: (draft && draft.spaces && draft.spaces.length) ? draft.spaces.length : spacesCount,
    rating: 0,
    floorPlan: floorPlanUrl
  });

  if (draft && draft.spaces && draft.spaces.length) {
    // Espacios dibujados en el editor
    draft.spaces.forEach(s => window.mockData.spaces.push(Object.assign({}, s, { status: 'available', localId: newId })));
    if (draft.designElements && draft.designElements.length) {
      if (!window.mockData.designElements) window.mockData.designElements = [];
      draft.designElements.forEach(e => window.mockData.designElements.push(Object.assign({}, e, {
        id: (e.type || 'el') + '-' + newId + '-' + Date.now() + '-' + Math.round(Math.random() * 9999),
        localId: newId
      })));
    }
  } else {
    // Generate generic spaces for this local
    for(let i=1; i<=spacesCount; i++) {
      window.mockData.spaces.push({
        id: `NEW-${i.toString().padStart(2, '0')}`,
        localId: newId,
        type: 'Automóvil',
        status: 'available',
        reservable: true,
        x: 10 + (i * 5) % 80,
        y: 10 + (i * 5) % 80,
        rotation: 0,
        scale: 1
      });
    }
  }

  // Generate Admin user for this local
  const newAdminId = window.mockData.users.length > 0 ? Math.max(...window.mockData.users.map(u => u.id)) + 1 : 1;
  window.mockData.users.push({
    id: newAdminId,
    name: adminEmail.split('@')[0], // Generate a name from the email
    email: adminEmail,
    role: 'local',
    avatar: adminEmail.substring(0, 2).toUpperCase(),
    phone: '',
    registered: new Date().toISOString().split('T')[0],
    localId: newId
  });

  SP_Components.closeModal('modal-add-local');
  initEstacionamientosAfiliados();
  SP_Components.showToast('success', 'Local Afiliado', `Se ha creado el local ${name} y su administrador (${adminEmail}).`);
}

window.toggleLocalState = function(id) {
  const local = window.mockData.locales.find(l => l.id === id);
  if (local) {
    local.status = local.status === 'Activo' ? 'Inactivo' : 'Activo';
    initEstacionamientosAfiliados();
    SP_Components.showToast('success', 'Estado', 'Cambio de estado guardado');
  }
};

window.openEditLocalAdmin = function(id) {
  const local = window.mockData.locales.find(l => l.id === id);
  if (!local) return;
  document.getElementById('edit-local-id').value = id;
  document.getElementById('edit-local-name').value = local.name;
  document.getElementById('edit-local-address').value = local.address;
  // Limpiar/Setear otros campos si existen en mockData, sino un default
  document.getElementById('edit-local-desc').value = local.details || `Estacionamiento de ${local.name}, excelente ubicación.`;
  
  if (local.image) {
    document.querySelector('#modal-edit-local-admin .local-cover').style.backgroundImage = `url('${local.image}')`;
  }

  refreshEditLocalPlan(local);
  
  SP_Components.openModal('modal-edit-local-admin');
};

window.handleAdminCoverUpload = function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.querySelector('#modal-edit-local-admin .local-cover').style.backgroundImage = `url('${e.target.result}')`;
      const id = parseInt(document.getElementById('edit-local-id').value);
      const local = window.mockData.locales.find(l => l.id === id);
      if (local) local.image = e.target.result;
      SP_Components.showToast('success', 'Portada', 'Portada actualizada correctamente');
    };
    reader.readAsDataURL(file);
  }
};

window.saveEditLocalAdmin = function() {
  const id = parseInt(document.getElementById('edit-local-id').value);
  const local = window.mockData.locales.find(l => l.id === id);
  if (local) {
    local.name = document.getElementById('edit-local-name').value.trim() || local.name;
    local.address = document.getElementById('edit-local-address').value.trim() || local.address;
    local.details = document.getElementById('edit-local-desc').value.trim() || local.details;
    
    initEstacionamientosAfiliados();
    SP_Components.showToast('success', 'Actualizado', 'Los datos del local han sido modificados exitosamente');
    SP_Components.closeModal('modal-edit-local-admin');
  }
};
