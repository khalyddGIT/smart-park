/* ============================================================
   SMART-PARK — components.js
   Funciones reutilizables: Modal, Toast, Tabs, Badges, Stars,
   Accordion, Export, Formatters
   ============================================================ */

window.SP_Components = (() => {
  'use strict';

  /* ── MODAL ─────────────────────────────────────────────── */
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  /* ── ESCAPE HTML (XSS-safe) ──────────────────────────────── */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── TOAST ──────────────────────────────────────────────── */
  function showToast(type, title, message, duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'check_circle',
      warning: 'warning',
      danger: 'error',
      info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon">${icons[type] || 'info'}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
      <span class="material-symbols-outlined toast-close" onclick="this.parentElement.remove()">close</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ── TABS ───────────────────────────────────────────────── */
  function initTabs(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    const btns = el.querySelectorAll('.tab-btn');
    const contents = el.querySelectorAll('.tab-content');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        btns.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const content = el.querySelector(`[data-tab-content="${target}"]`);
        if (content) content.classList.add('active');
      });
    });
  }

  function switchTab(container, tabName) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    el.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === tabName));
  }

  /* ── ACCORDION ──────────────────────────────────────────── */
  function initAccordion(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    el.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        const wasOpen = item.classList.contains('open');
        // Close all
        el.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
        // Toggle current
        if (!wasOpen) item.classList.add('open');
      });
    });
  }

  /* ── BADGES ─────────────────────────────────────────────── */
  function renderBadge(status) {
    const map = {
      'available': ['Disponible', 'badge-success'],
      'occupied': ['Ocupado', 'badge-danger'],
      'reserved': ['Reservado', 'badge-warning'],
      'blocked': ['Bloqueado', 'badge-neutral'],
      'active': ['Activo', 'badge-success'],
      'Activo': ['Activo', 'badge-success'],
      'completed': ['Completado', 'badge-success'],
      'expired': ['Expirado', 'badge-neutral'],
      'cancelled': ['Cancelado', 'badge-neutral'],
      'pending': ['Pendiente', 'badge-warning'],
      'En revisión': ['En revisión', 'badge-warning'],
      'Inactivo': ['Inactivo', 'badge-neutral'],
      'authorized': ['Autorizado', 'badge-success'],
      'no-reservation': ['Sin reserva', 'badge-warning'],
      'denied': ['Denegado', 'badge-danger']
    };
    const [label, cls] = map[status] || [status, 'badge-neutral'];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  /* ── STAR RATING ────────────────────────────────────────── */
  function renderStars(rating, interactive = false, containerId = '') {
    let html = `<div class="${interactive ? 'star-rating' : 'star-display'}" ${containerId ? `id="${containerId}"` : ''}>`;
    for (let i = 1; i <= 5; i++) {
      if (interactive) {
        html += `<span class="material-symbols-outlined star ${i <= rating ? 'filled' : ''}" data-value="${i}" onclick="SP_Components.handleStarClick(this)">star</span>`;
      } else {
        html += `<span class="material-symbols-outlined star ${i <= rating ? 'filled' : ''}">star</span>`;
      }
    }
    html += '</div>';
    return html;
  }

  function handleStarClick(el) {
    const value = parseInt(el.dataset.value);
    const container = el.closest('.star-rating');
    container.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('filled', parseInt(s.dataset.value) <= value);
    });
    container.dataset.rating = value;
    // Dispatch custom event
    container.dispatchEvent(new CustomEvent('ratingchange', { detail: { value } }));
  }

  /* ── EXPORT DATA ────────────────────────────────────────── */
  // RF95
  function exportCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('success', 'Exportación exitosa', `Se descargó ${link.download}`);
  }

  function exportJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    showToast('success', 'Exportación exitosa', `Se descargó ${link.download}`);
  }

  /* ── FORMATTERS ─────────────────────────────────────────── */
  function formatCurrency(amount) {
    return `S/ ${parseFloat(amount).toFixed(2)}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
    return `Hace ${Math.floor(diff/86400)} días`;
  }

  /* ── UNIQUE CODE GENERATOR ──────────────────────────────── */
  function generateCode(prefix = 'SP') {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /* ── CONFIRM DIALOG ─────────────────────────────────────── */
  function confirm(title, message, onConfirm) {
    const id = 'confirm-modal-' + Date.now();
    const html = `
      <div class="modal-overlay active" id="${id}">
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <h2>${title}</h2>
            <button class="modal-close" onclick="SP_Components.closeModal('${id}')">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body"><p>${message}</p></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SP_Components.closeModal('${id}')">Cancelar</button>
            <button class="btn btn-primary" id="${id}-ok">Confirmar</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById(`${id}-ok`).addEventListener('click', () => {
      closeModal(id);
      setTimeout(() => document.getElementById(id)?.remove(), 300);
      if (onConfirm) onConfirm();
    });
  }

  /* ── RENDER CONFIDENCE BAR ──────────────────────────────── */
  function renderConfidence(value) {
    const level = value >= 90 ? 'high' : value >= 70 ? 'medium' : 'low';
    return `
      <div class="confidence-bar">
        <div class="bar"><div class="bar-fill ${level}" style="width:${value}%"></div></div>
        <span class="bar-value">${value}%</span>
      </div>`;
  }

  /* ── INTERACTIVE FLOOR PLAN MAP ───────────────────────── */
  function renderInteractiveMap(spaces, localId, options = {}) {
    const local = window.mockData.locales.find(l => l.id === localId);
    const plan = local?.floorPlan || null;
    const hasRealPlan = plan && !String(plan).includes('floor_plan');
    const isEditMapMode = options.isEditMapMode || false;
    const onClickAttr = options.onClickAttr || 'onclick="showSpaceDetail(\'${s.id}\')"';

    const getIcon = (type) => {
      if (type === 'Automóvil') return 'directions_car';
      if (type === 'Camioneta') return 'local_shipping';
      if (type === 'Motocicleta') return 'two_wheeler';
      return 'directions_car';
    };

    return `
      <div class="floor-plan-container${hasRealPlan ? '' : ' no-plan'}" id="floor-plan-container" onmousedown="if(event.target===this||event.target.classList.contains('floor-plan-grid')||event.target.classList.contains('floor-plan-image')){if(window.clearTransformBox)window.clearTransformBox();}">
        ${hasRealPlan ? `<img src="${plan}" class="floor-plan-image" alt="Plano del Estacionamiento" />` : '<div class="floor-plan-grid"></div>'}
        <div class="floor-plan-overlay">
          ${(options.designElements || []).map(d => {
            const x = d.x || 50;
            const y = d.y || 50;
            const rot = d.rotation || 0;
            const scl = d.scale || 1;
            const clickStr = onClickAttr.replace(/\$\{s\.id\}/g, d.id);
            
            if (d.type === 'wall' || d.type === 'line') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; background-color: ${d.color || '#333'}; width: ${d.width || 20}%; height: ${d.height || (d.type === 'line' ? 0.5 : 2)}%; border-radius: 0; border: none !important;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="${d.type === 'line' ? 'Línea' : 'Pared'}"></div>
              `;
            } else if (d.type === 'arrow') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; color: ${d.color || '#333'}; font-size: ${24}px; background: transparent; border: none !important; box-shadow: none !important; width: auto; height: auto; display: flex; align-items: center; justify-content: center;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="Flecha">
                     <span class="material-symbols-outlined" style="font-size:inherit; color:inherit;">arrow_downward</span>
                </div>
              `;
            } else if (d.type === 'text') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; color: ${d.color || '#000'}; font-size: ${d.fontSize || 14}px; font-weight: bold; background: transparent; border: none !important; box-shadow: none !important; width: auto; height: auto; white-space: nowrap;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="Texto">${d.text || ''}</div>
              `;
            } else if (d.type === 'tree') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; color: ${d.color || '#4caf50'}; font-size: ${32}px; background: transparent; border: none !important; box-shadow: none !important; width: ${d.width || 10}%; height: ${d.height || 10}%; display: flex; align-items: center; justify-content: center;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="Árbol / Zona Verde">
                     <span class="material-symbols-outlined" style="font-size:inherit; color:inherit; transform: scale(1.5);">nature</span>
                </div>
              `;
            } else if (d.type === 'entry') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; background-color: ${d.color || '#1976d2'}; color: #fff; width: ${d.width || 15}%; height: ${d.height || 4}%; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: ${d.fontSize || 12}px; font-weight: bold; border: 1px solid rgba(0,0,0,0.2) !important;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="Entrada / Salida">${d.text || 'ENTRADA'}</div>
              `;
            } else if (d.type === 'crosswalk') {
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; width: ${d.width || 15}%; height: ${d.height || 20}%; border-radius: 4px; border: 1.5px solid #475569 !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); background-color: #94a3b8; background-image: repeating-linear-gradient(0deg, transparent, transparent 10px, ${d.color || 'rgba(255,255,255,0.9)'} 10px, ${d.color || 'rgba(255,255,255,0.9)'} 20px);" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="Zona Peatonal"></div>
              `;
            } else {
              const iconMap = {
                ev: { icon: 'ev_station', label: 'Cargador EV', color: '#2e7d32' },
                disabled: { icon: 'accessible', label: 'Discapacitados', color: '#1565c0' },
                moto: { icon: 'two_wheeler', label: 'Zona motos', color: '#6a1b9a' },
                cone: { icon: 'warning', label: 'Cono', color: '#e65100' },
                stop: { icon: 'octagon', label: 'PARE', color: '#c62828' },
                meter: { icon: 'payments', label: 'Parquímetro', color: '#37474f' },
                hydrant: { icon: 'local_fire_department', label: 'Hidrante', color: '#b71c1c' },
                light: { icon: 'light', label: 'Luz', color: '#546e7a' },
                bench: { icon: 'chair', label: 'Banco', color: '#795548' },
                gate: { icon: 'door_sliding', label: 'Reja', color: '#455a64' },
                speed: { icon: 'speed', label: 'Resalto', color: '#827717' },
                bus: { icon: 'directions_bus', label: 'Parada Bus', color: '#0277bd' },
                truck: { icon: 'local_shipping', label: 'Carga', color: '#5d4037' },
                fire: { icon: 'fire_extinguisher', label: 'Extintor', color: '#d32f2f' },
                cc: { icon: 'videocam', label: 'Cámara', color: '#283593' },
                info: { icon: 'info', label: 'Info', color: '#1565c0' }
              };
              const info = iconMap[d.type] || { icon: 'help', label: d.type, color: '#333' };
              return `
                <div class="design-cell absolute-cell ${isEditMapMode ? 'draggable' : ''}" 
                     id="design-cell-${d.id}"
                     style="left: ${x}%; top: ${y}%; --rot: ${rot}deg; --scl: ${scl}; color: ${d.color || info.color}; font-size: 24px; background: transparent; border: none !important; box-shadow: none !important; width: auto; height: auto; display: flex; align-items: center; justify-content: center;" 
                     ${isEditMapMode ? `onmousedown="startDragSpace(event, '${d.id}')" ontouchstart="startDragSpace(event, '${d.id}')"` : clickStr}
                     title="${info.label}">
                     <span class="material-symbols-outlined" style="font-size:inherit; color:inherit;">${info.icon}</span>
                </div>
              `;
            }
          }).join('')}
          ${spaces.map(s => {
            const x = s.x || 50;
            const y = s.y || 50;
            const rot = s.rotation || 0;
            const scl = s.scale || 1;
            const clickStr = onClickAttr.replace(/\$\{s\.id\}/g, s.id);
            const isDisabled = options.disabledCheck ? options.disabledCheck(s) : false;
            const customStyle = s.customColor ? `background-color: ${s.customColor} !important; border-color: ${s.customColor} !important; color: #fff !important;` : '';
            
            return `
              <div class="space-cell absolute-cell ${s.status} ${s.shade ? 'shaded' : ''} ${isEditMapMode ? 'draggable' : ''} ${isDisabled ? 'disabled' : ''}" 
                   id="space-cell-${s.id}"
                   style="left: ${x}%; top: ${y}%; ${s.width ? 'width: '+s.width+'%;' : ''} ${s.height ? 'height: '+s.height+'%;' : ''} --rot: ${rot}deg; --scl: ${scl}; ${isDisabled ? 'opacity:0.5;cursor:not-allowed;' : ''} ${customStyle}" 
                   ${isEditMapMode ? `onmousedown="startDragSpace(event, '${s.id}')" ontouchstart="startDragSpace(event, '${s.id}')"` : (!isDisabled ? clickStr : '')}
                   title="${s.id} - ${s.type}${s.shade ? ' (Con Techo)' : ''}${s.plate ? ' - '+s.plate : ''}">
                <span class="space-id">${s.id}</span>
                ${s.shade ? '<span class="material-symbols-outlined space-shade-icon" title="Techado / Sombra">roofing</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* ── PUBLIC API ─────────────────────────────────────────── */
  return {
    openModal, closeModal, closeAllModals,
    showToast, escapeHtml,
    initTabs, switchTab,
    initAccordion,
    renderBadge, renderStars, handleStarClick,
    exportCSV, exportJSON,
    formatCurrency, formatDate, formatDateTime, formatTime, timeAgo,
    generateCode, confirm, renderConfidence, renderInteractiveMap
  };
})();

window.addVehicleRateField = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const newType = prompt("Ingresa el tipo de vehículo (ej: Furgoneta, Bicicleta):");
  if (!newType) return;
  
  const div = document.createElement('div');
  div.className = 'form-group';
  div.innerHTML = `
    <label class="form-label text-xs" style="display:flex; justify-content:space-between; align-items:center;">
      ${newType} (S/ por Hora) <span class="material-symbols-outlined text-danger" style="font-size:1.1rem; cursor:pointer;" onclick="this.closest('.form-group').remove()" title="Eliminar tarifa">delete</span>
    </label>
    <input type="number" class="form-control" value="0.00" step="0.5">
  `;
  container.appendChild(div);
};
