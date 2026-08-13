/* ============================================================
   MI LOCAL MODULE LOGIC
   ============================================================ */

window.MiLocalModule = {
  init: function() {
    console.log("Mi Local Module initialized.");
    const d = window.mockData;
    const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
    const local = d.locales.find(l => l.id === localId);
    
    if (local) {
      document.getElementById('mi-local-name').value = local.name;
      document.getElementById('mi-local-address').value = local.address;
      document.getElementById('mi-local-description').value = local.details || `Estacionamiento seguro de ${local.name}.`;
      if (local.floorPlan && !String(local.floorPlan).includes('floor_plan')) {
        document.getElementById('local-map-img').src = local.floorPlan;
        document.getElementById('local-map-img').style.display = '';
        this._toggleMapEmpty(false);
      } else {
        this._toggleMapEmpty(true);
      }
      if (local.image) {
        document.getElementById('local-cover-img').style.backgroundImage = `url('${local.image}')`;
      }
    }
  },

  handleCoverUpload: function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('local-cover-img').style.backgroundImage = `url('${e.target.result}')`;
        const localId = window.currentRole === 'local' ? (window.mockData.currentUser.localId || 1) : 1;
        const local = window.mockData.locales.find(l => l.id === localId);
        if (local) local.image = e.target.result;
        SP_Components.showToast('success', 'Portada', 'Portada actualizada correctamente');
      };
      reader.readAsDataURL(file);
    }
  },

  handleEditMap: function() {
    const d = window.mockData;
    const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
    const local = d.locales.find(l => l.id === localId);
    if (!local) return;
    const spaces = d.spaces.filter(s => s.localId === localId).map(s => ({
      id: s.id, type: s.type, reservable: !!s.reservable, details: s.details || '',
      x: s.x || 50, y: s.y || 50, width: s.width, height: s.height,
      rotation: s.rotation || 0, scale: s.scale || 1
    }));
    const designElements = d.designElements ? d.designElements.filter(e => e.localId === localId) : [];
    const hasCustomPlan = local.floorPlan && !String(local.floorPlan).includes('floor_plan');
    window.FloorEditor.open({
      prefix: 'A',
      spaces: spaces,
      designElements: designElements,
      floorPlan: hasCustomPlan ? local.floorPlan : null,
      title: 'Editar Plano — ' + (local.name || 'Mi Local'),
      onApply: (r) => {
        window.FloorEditor.applyToLocal(localId, r);
        const updated = d.locales.find(l => l.id === localId);
        this._toggleMapEmpty(!(updated && updated.floorPlan && !String(updated.floorPlan).includes('floor_plan')));
        if (!this._mapEmpty) {
          const img = document.getElementById('local-map-img');
          if (img) img.src = updated.floorPlan;
        }
        SP_Components.showToast('success', 'Plano guardado', 'El plano del local se actualizó correctamente.');
      }
    });
  },

  _toggleMapEmpty: function(empty) {
    this._mapEmpty = !!empty;
    const img = document.getElementById('local-map-img');
    const msg = document.getElementById('local-map-empty');
    if (img) img.style.display = empty ? 'none' : '';
    if (msg) msg.style.display = empty ? '' : 'none';
  },
  
  saveProfile: function() {
    const d = window.mockData;
    const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
    const local = d.locales.find(l => l.id === localId);
    
    if (local) {
      local.name = document.getElementById('mi-local-name').value;
      local.address = document.getElementById('mi-local-address').value;
      local.details = document.getElementById('mi-local-description').value;
      SP_Components.showToast('success','Guardado','Perfil de local actualizado');
    }
  },

  saveTariffs: function() {
    const base = document.getElementById('mi-local-base-rate').value;
    const rateClose = document.getElementById('mi-local-rate-close').value;
    const rateMid = document.getElementById('mi-local-rate-mid').value;
    const rateFar = document.getElementById('mi-local-rate-far').value;

    console.log("Guardando tarifas...", {
      baseRate: base,
      reservationClose: rateClose,
      reservationMid: rateMid,
      reservationFar: rateFar
    });

    SP_Components.showToast('success', 'Tarifas Actualizadas', 'Se han guardado las tarifas de reserva por distancia.');
  }
};

// app.js llama a initMiLocal() tras inyectar el HTML del módulo
window.initMiLocal = function() {
  window.MiLocalModule.init();
};
