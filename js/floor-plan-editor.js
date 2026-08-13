/* ──────────────────────────────────────────────────────────────
   FLOOR PLAN EDITOR — Componente reutilizable (estilo Canva)
   Dibujo de planos de estacionamiento con espacios numerados
   (arrastrables / redimensionables / rotables), elementos
   decorativos (pared, línea, flecha, texto, árbol, entrada,
   zona peatonal) y herramientas de dibujo libre (pincel,
   borrador, línea, rectángulo, círculo, triángulo, texto,
   relleno).

   Es AUTÓNOMO: no depende de window.mockData / currentRole,
   recibe su propio estado y devuelve el resultado por callback.

   Uso:
     window.FloorEditor.open({
       prefix: 'A',
       spaces: [],            // [{id,type,x,y,width,height,rotation,scale}]
       designElements: [],    // [{type,x,y,rotation,scale,...}]
       floorPlan: null,       // dataURL / url de imagen de fondo
       title: 'Dibujar Plano',
       onApply: (result) => {} // {spaces, designElements, floorPlan}
     });
   ───────────────────────────────────────────────────────────── */

window.FloorEditor = (() => {

  const DESIGN_ICONS = {
    ev:        { icon: 'ev_station',       label: 'Cargador EV',       color: '#2e7d32', size: 20 },
    disabled:  { icon: 'accessible',       label: 'Discapacitados',    color: '#1565c0', size: 20 },
    moto:      { icon: 'two_wheeler',      label: 'Zona motos',        color: '#6a1b9a', size: 20 },
    cone:      { icon: 'warning',          label: 'Cono',              color: '#e65100', size: 18 },
    stop:      { icon: 'octagon',          label: 'Señal PARE',        color: '#c62828', size: 20 },
    meter:     { icon: 'payments',         label: 'Parquímetro',       color: '#37474f', size: 18 },
    hydrant:   { icon: 'local_fire_department', label: 'Hidrante',     color: '#b71c1c', size: 18 },
    light:     { icon: 'light',            label: 'Poste de luz',      color: '#546e7a', size: 18 },
    bench:     { icon: 'chair',            label: 'Banco',             color: '#795548', size: 18 },
    gate:      { icon: 'door_sliding',     label: 'Barrera / Reja',    color: '#455a64', size: 20 },
    speed:     { icon: 'speed',            label: 'Resalto',           color: '#827717', size: 18 },
    bus:       { icon: 'directions_bus',   label: 'Parada bus',        color: '#0277bd', size: 20 },
    truck:     { icon: 'local_shipping',   label: 'Zona carga',        color: '#5d4037', size: 20 },
    fire:      { icon: 'fire_extinguisher', label: 'Extintor',         color: '#d32f2f', size: 18 },
    cc:        { icon: 'videocam',         label: 'Cámara',            color: '#283593', size: 18 },
    info:      { icon: 'info',             label: 'Señal informativa', color: '#1565c0', size: 18 },
  };

  function wire(root, sel, fn) {
    const el = root.querySelector(sel);
    if (el) el.addEventListener('click', fn);
  }


  /* ── CSS embebido (autónomo, prefijado sp-fe) ─────────────── */
  const STYLE = `
    .sp-fe-overlay{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;
      background:rgba(10,18,30,.6);padding:20px;}
    .sp-fe-modal{position:relative;width:100%;max-width:1200px;height:92vh;max-height:92vh;
      background:var(--color-surface,#fff);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.4);
      display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--color-border,#e2e8f0);}
    .sp-fe-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
      padding:14px 20px;border-bottom:1px solid var(--color-border);background:var(--color-bg,#f8fafc);}
    .sp-fe-toolbar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;align-items:center;
      border-bottom:1px solid var(--color-border-light);background:var(--color-bg,#f8fafc);}
    .sp-fe-tool-group{display:flex;gap:6px;align-items:center;padding-right:12px;margin-right:12px;
      border-right:1px solid var(--color-border-light);flex-wrap:wrap;}
    .sp-fe-body{flex:1;display:flex;gap:16px;padding:14px;min-height:0;}
    .sp-fe-canvas-wrap{flex:1;position:relative;min-height:0;border-radius:10px;overflow:hidden;
      border:2px solid var(--color-border,#e2e8f0);background:#f8fafc;}
    .sp-fe-plan{position:relative;width:100%;height:100%;overflow:hidden;background:transparent;}
    .sp-fe-gridbg{position:absolute;inset:0;opacity:.55;
      background-image:radial-gradient(circle,#cbd5e1 1px,transparent 1px);background-size:22px 22px;}
    .sp-fe-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9;pointer-events:none;}
    .sp-fe-map-overlay{position:absolute;inset:0;}
    .sp-fe-cell{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(var(--scl,1));
      display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;}
    .sp-fe-space{width:34px;height:54px;border:2px solid var(--color-success,#22c55e);border-radius:4px;
      background:rgba(0,168,89,.35);color:#fff;font-size:.72rem;font-weight:700;
      text-shadow:0 1px 2px rgba(0,0,0,.6);}
    .sp-fe-space.shaded{background:
      repeating-linear-gradient(45deg,rgba(25,118,210,.30),rgba(25,118,210,.30) 5px,rgba(13,71,161,.22) 5px,rgba(13,71,161,.22) 10px),
      rgba(0,168,89,.30);
      border-color:#1976d2;}
    .sp-fe-space .sp-fe-shade-icon{position:absolute;top:2px;right:2px;font-size:10px;color:#fbc02d;line-height:1;
      text-shadow:0 1px 2px rgba(0,0,0,.6);pointer-events:none;}
    .sp-fe-space:hover{outline:2px solid rgba(41,98,255,.5);}
    .sp-fe-cell.selected{outline:2px solid #2962ff !important;outline-offset:2px;
      box-shadow:0 0 14px rgba(41,98,255,.55) !important;}
    .sp-fe-design{color:#333;}
    .sp-fe-dwall{background:#333;border-radius:2px;}
    .sp-fe-dline{background:#666;border-radius:1px;}
    .sp-fe-dtree{border-radius:50%;background:#4caf50;border:1px solid #2e7d32;}
    .sp-fe-dentry{background:#1976d2;color:#fff;border-radius:4px;font-weight:700;font-size:12px;}
    .sp-fe-dtext{font-weight:700;background:transparent;white-space:nowrap;}
    .sp-fe-darrow{background:transparent;}
    .sp-fe-dcross{background-color:#94a3b8;border:1.5px solid #475569;border-radius:4px;
      background-image:repeating-linear-gradient(0deg,transparent,transparent 8px,
      rgba(255,255,255,.9) 8px,rgba(255,255,255,.9) 16px);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);}
    .sp-fe-dicon{border-radius:50%;display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,.3);border:1px solid rgba(0,0,0,.15);}
    .sp-fe-dicon .material-symbols-outlined{line-height:1;}
    .sp-fe-panel{width:270px;border:1px solid var(--color-border,#e2e8f0);border-radius:10px;padding:14px;
      background:var(--color-surface,#fff);overflow:auto;flex-shrink:0;}
    .fpe-tbox{position:absolute;top:0;left:0;right:0;bottom:0;border:1.5px solid #2962ff;pointer-events:none;z-index:120;}
    .frh{position:absolute;background:#fff;border:1.5px solid #2962ff;pointer-events:auto;width:10px;height:10px;border-radius:1px;}
    .frh.rse-nw{top:-5px;left:-5px;cursor:nwse-resize;}
    .frh.rse-ne{top:-5px;right:-5px;cursor:nesw-resize;}
    .frh.rse-sw{bottom:-5px;left:-5px;cursor:nesw-resize;}
    .frh.rse-se{bottom:-5px;right:-5px;cursor:nwse-resize;}
    .frh.rse-n{top:-5px;left:calc(50% - 5px);cursor:ns-resize;}
    .frh.rse-s{bottom:-5px;left:calc(50% - 5px);cursor:ns-resize;}
    .frh.rse-e{top:calc(50% - 5px);right:-5px;cursor:ew-resize;}
    .frh.rse-w{top:calc(50% - 5px);left:-5px;cursor:ew-resize;}
    .frh-rotate{position:absolute;width:14px;height:14px;border-radius:50%;bottom:-26px;left:calc(50% - 7px);
      cursor:grab;background:#2962ff;pointer-events:auto;}
    .sp-fe-panel h4{margin:0 0 12px;font-size:.95rem;}
    .sp-fe-canvas{position:absolute;inset:0;z-index:30;cursor:crosshair;}
    .sp-fe-preview{position:absolute;inset:0;z-index:31;cursor:crosshair;}
    .sp-fe-rect{position:absolute;border:2px dashed #2962ff;background:rgba(41,98,255,.12);border-radius:3px;
      pointer-events:none;z-index:45;}
    .sp-fe-plan.rect-mode .sp-fe-cell, .sp-fe-plan.rect-mode .fpe-tbox{pointer-events:none;}
    .sp-fe-plan.rect-mode .sp-fe-space:hover{outline:none;}
    .sp-fe-footer{padding:10px 20px;border-top:1px solid var(--color-border);background:var(--color-bg,#f8fafc);
      display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:.75rem;}
    .sp-fe-color-dot{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:middle;
      border:1px solid rgba(0,0,0,.2);}
    .sp-fe-empty{padding:14px;text-align:center;color:var(--color-text-muted,#64748b);font-size:.85rem;}
    .sp-fe-btn{display:inline-flex;align-items:center;gap:5px;}
    .sp-fe-btn .material-symbols-outlined{font-size:1.1rem;}
    .sp-fe-divider{width:1px;height:22px;background:var(--color-border-light,#e2e8f0);margin:0 6px;}
    @keyframes sp-fe-pulse{0%{opacity:1}50%{opacity:.55}100%{opacity:1}}
    .sp-fe-cell.mode-edit{animation:sp-fe-pulse 2.4s infinite;}
  `;

  let styleInjected = false;
  function ensureStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* Detectar modo oscuro de la app para el fondo de la ventana */
  function isDark() {
    return (getComputedStyle(document.body).backgroundColor || '')
      .match(/\d+/g).slice(0, 3).map(Number).reduce((a, b) => a + b, 0) < 320;
  }

  function open(opts = {}) {
    ensureStyle();
    if (!document.querySelector('.sp-fe-overlay')) {
      const o = document.createElement('div');
      o.className = 'sp-fe-overlay';
      document.body.appendChild(o);
    }
    const overlay = document.querySelector('.sp-fe-overlay');

    /* ── Estado local (copias: el editor nunca muta las fuentes) ── */
    let prefix = (opts.prefix || 'A').toUpperCase();
    let spaces = (opts.spaces || []).map(s => Object.assign({
      id: '', type: 'Automóvil', x: 50, y: 50, width: 7, height: 11, rotation: 0, scale: 1
    }, s));
    let designElements = (opts.designElements || []).map(e => Object.assign({}, e));
    let floorPlan = opts.floorPlan || null;
    const onApply = opts.onApply || function(){};
    const title = opts.title || 'Editor de Plano';

    /* uid estable para claves DOM (el id visible es editable) */
    let uidSeq = 1;
    const uidOf = new Map();          // key -> uid
    const keyOf = new Map();          // uid -> key ('s:'+idx | 'd:'+idx)
    function uidFor(kind, idx) {
      const key = kind + ':' + idx;
      if (!uidOf.has(key)) { uidOf.set(key, 'f' + (uidSeq++)); keyOf.set(uidOf.get(key), key); }
      return uidOf.get(key);
    }
    function indexOfUid(uid) {
      const key = keyOf.get(uid); if (!key) return null;
      return { kind: key.split(':')[0], idx: +key.split(':')[1] };
    }

    /* transform state */
    let activeUid = null, activeKind = null, action = null;
    let tx0 = 0, ty0 = 0, iL = 0, iT = 0, iW = 0, iH = 0, iR = 0;

    /* selección múltiple / rect / snap */
    const selectedUids = new Set();
    let groupStart = [];
    let rectMode = false, rectPreview = null, rectStart = { x: 0, y: 0 };
    let snapOn = true;

    /* freehand state */
    let drawCanvas = null, drawCtx = null, previewCanvas = null, previewCtx = null;
    let isDrawing = false, lastX = 0, lastY = 0, sX = 0, sY = 0;
    let curTool = 'brush', undoStack = [], drawMode = false, pendingDraw = false;

    const O = () => document.getElementById('fpe-plan');
    const P = () => document.getElementById('fpe-panel');
    const rnd = (v) => (snapOn ? Math.round(v) : Math.round(v * 100) / 100);

    function nextSeqId(prefix, arr) {
      let max = 0;
      const re = new RegExp('^' + prefix + '-(\\d+)$');
      (arr || []).forEach(s => { const m = String(s.id || '').match(re); if (m) max = Math.max(max, +m[1]); });
      return prefix + '-' + String(max + 1).padStart(2, '0');
    }

    function cellByUid(uid, kind) {
      return document.getElementById((kind === 's' ? 'fpe-space-' : 'fpe-design-') + uid);
    }

    function setShadeVisual(cellEl, on) {
      if (!cellEl) return;
      cellEl.classList.toggle('shaded', on);
      let icon = cellEl.querySelector('.sp-fe-shade-icon');
      const label = cellEl.querySelector('span:last-child');
      if (on && !icon) {
        icon = document.createElement('span');
        icon.className = 'sp-fe-shade-icon material-symbols-outlined';
        icon.textContent = 'umbrella';
        if (label) cellEl.insertBefore(icon, label); else cellEl.appendChild(icon);
      } else if (!on && icon) {
        icon.remove();
      }
    }

    /* ── RENDER ─────────────────────────────────────────────── */
    function render() {
      const plan = O();
      if (!plan) return;
      const cells = spaces.map((s, i) => spaceHtml(s, i)).join('')
        + designElements.map((e, i) => designHtml(e, i)).join('');

      plan.innerHTML = `
        ${floorPlan
          ? `<img class="sp-fe-img" src="${esc(floorPlan)}" alt="Plano">`
          : `<div class="sp-fe-gridbg"></div>`}
        <div class="sp-fe-map-overlay">${cells}</div>
      `;
      plan.classList.toggle('rect-mode', rectMode);
      updateSelectionVisual();
      renderPanel();
      if (drawMode) mountDrawCanvas();
    }

    function spaceHtml(s, i) {
      const uid = uidFor('s', i);
      const rot = s.rotation || 0, scl = s.scale || 1;
      const w = s.width ? 'width:' + s.width + '%;' : '';
      const h = s.height ? 'height:' + s.height + '%;' : '';
      return `<div id="fpe-space-${uid}" class="sp-fe-cell sp-fe-space mode-edit${s.shade ? ' shaded' : ''}"
        style="left:${s.x}%;top:${s.y}%;${w}${h}--r:${rot}deg;--scl:${scl};"
        data-kind="s" data-uid="${uid}" title="${esc(s.id)} — ${esc(s.type)}${s.shade ? ' · con sombra' : ''}">
        ${s.shade ? '<span class="sp-fe-shade-icon material-symbols-outlined">umbrella</span>' : ''}
        <span style="pointer-events:none;">${esc(s.id)}</span></div>`;
    }

    function designHtml(e, i) {
      const uid = uidFor('d', i);
      const x = e.x || 50, y = e.y || 50, rot = e.rotation || 0, scl = e.scale || 1;
      let style = `left:${x}%;top:${y}%;--r:${rot}deg;--scl:${scl};`;
      let cls = 'sp-fe-cell sp-fe-design mode-edit ';
      let inner = '';
      if (e.type === 'wall' || e.type === 'line') {
        cls += (e.type === 'wall' ? 'sp-fe-dwall' : 'sp-fe-dline');
        style += `width:${e.width || 20}%;height:${e.height || (e.type === 'line' ? .5 : 2)}%;background:${e.color || '#333'};`;
      } else if (e.type === 'arrow') {
        cls += 'sp-fe-darrow';
        style += `color:${e.color || '#333'};font-size:26px;`;
        inner = `<span class="material-symbols-outlined" style="font-size:inherit;color:inherit;">arrow_downward</span>`;
      } else if (e.type === 'text') {
        cls += 'sp-fe-dtext';
        style += `color:${e.color || '#000'};font-size:${e.fontSize || 14}px;`;
        inner = esc(e.text || 'TEXTO');
      } else if (e.type === 'tree') {
        cls += 'sp-fe-dtree';
        style += `width:${e.width || 8}%;height:${e.height || 8}%;`;
        inner = `<span class="material-symbols-outlined" style="font-size:22px;color:#fff;">nature</span>`;
      } else if (e.type === 'entry') {
        cls += 'sp-fe-dentry';
        style += `width:${e.width || 15}%;height:${e.height || 4}%;font-size:${e.fontSize || 12}px;background:${e.color || '#1976d2'};`;
        inner = esc(e.text || 'ENTRADA');
      } else if (e.type === 'crosswalk') {
        cls += 'sp-fe-dcross';
        style += `width:${e.width || 15}%;height:${e.height || 20}%;`;
      } else if (DESIGN_ICONS[e.type]) {
        cls += 'sp-fe-dicon';
        style += `width:${e.width || 5}%;height:${e.height || 5}%;background:${e.color || DESIGN_ICONS[e.type].color};
          font-size:${e.fontSize || DESIGN_ICONS[e.type].size}px;color:#fff;`;
        inner = `<span class="material-symbols-outlined" style="font-size:inherit;">${DESIGN_ICONS[e.type].icon}</span>`;
      } else {
        return '';
      }
      return `<div id="fpe-design-${uid}" class="${cls}" style="${style}"
        data-kind="d" data-uid="${uid}" title="Elemento">${inner}</div>`;
    }

    /* ── PANEL LATERAL ──────────────────────────────────────── */
    function renderPanel() {
      const p = P(); if (!p) return;
      if (!activeUid) {
        p.innerHTML = `<h4>Propiedades</h4><div class="sp-fe-empty">
          Selecciona un espacio o elemento para editarlo.<br><br>
          <strong>Consejos:</strong>
          <ul style="text-align:left;padding-left:18px;line-height:1.7;margin:8px 0;">
            <li>«Agregar Espacio» numera automáticamente (${esc(prefix)}-01…).</li>
            <li>Edita el número y la sombra de cada espacio aquí.</li>
            <li>Marca «Con sombra» para dejar el espacio bajo techo.</li>
            <li>Ctrl/Cmd+clic o Ctrl+A para seleccionar varios y moverlos en grupo.</li>
            <li>«Dibujo Libre» pinta el fondo del plano.</li>
          </ul></div>`;
        return;
      }
      const idx = indexOfUid(activeUid);
      if (!idx) return;
      if (idx.kind === 's' && selectedUids.size > 1) {
        const picks = selectedSpaceObjects();
        p.innerHTML = `<h4>Edición en lote (${picks.length})</h4>
          <p class="sp-fe-muted">Aplica a los ${picks.length} espacios seleccionados.</p>
          <button class="btn btn-sm sp-fe-btn-shadeAll" style="width:100%;margin-bottom:8px;">
            <span class="material-symbols-outlined">umbrella</span> Marcar todos con sombra</button>
          <button class="btn btn-sm sp-fe-btn-unshadeAll" style="width:100%;margin-bottom:8px;">
            <span class="material-symbols-outlined">wb_sunny</span> Quitar sombra a todos</button>
          <button class="btn btn-sm sp-fe-btn-delSel" style="width:100%;margin-bottom:8px;">
            <span class="material-symbols-outlined">delete</span> Eliminar ${picks.length} espacios</button>
          <button class="btn btn-sm sp-fe-btn-dupeSel" style="width:100%;margin-bottom:8px;">
            <span class="material-symbols-outlined">content_copy</span> Duplicar</button>
          <button class="btn btn-secondary btn-sm" id="sp-fe-clear-sel" style="width:100%;">
            Quitar selección</button>`;
        wire(p, '.sp-fe-btn-shadeAll', () => batchShade(true));
        wire(p, '.sp-fe-btn-unshadeAll', () => batchShade(false));
        wire(p, '.sp-fe-btn-delSel', () => batchDelete());
        wire(p, '.sp-fe-btn-dupeSel', () => duplicateActive());
        wire(p, '#sp-fe-clear-sel', () => clearSelection());
        return;
      }
      if (idx.kind === 's') {
        const s = spaces[idx.idx];
        p.innerHTML = `<h4>Espacio: ${esc(s.id)}</h4>
          <div class="form-group"><label class="form-label">Número / ID</label>
            <input type="text" class="form-control" id="fpe-ed-id" value="${esc(s.id)}"></div>
          <div class="form-group"><label class="form-label">Tipo de vehículo</label>
            <select class="form-control" id="fpe-ed-type">
              ${['Automóvil','Camioneta','Motocicleta','Bicicleta'].map(t =>
                `<option ${s.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Detalles / Descripción</label>
            <textarea class="form-control" id="fpe-ed-details" rows="2" placeholder="Opcional">${esc(s.details || '')}</textarea></div>
          <div class="form-check" style="margin-bottom:10px;">
            <input type="checkbox" id="fpe-ed-shade" ${s.shade ? 'checked' : ''}> <label>Con sombra (bajo techo)</label>
          </div>
          <div class="form-check" style="margin-bottom:14px;">
            <input type="checkbox" id="fpe-ed-res" ${s.reservable ? 'checked' : ''}> <label>Reservable</label>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="fpe-dup"><span class="material-symbols-outlined">content_copy</span> Duplicar</button>
            <button class="btn btn-danger btn-sm" id="fpe-del"><span class="material-symbols-outlined">delete</span> Eliminar</button>
          </div>`;
        document.getElementById('fpe-ed-id').addEventListener('input', e => {
          s.id = e.target.value;
          const cell = document.getElementById('fpe-space-' + activeUid);
          if (cell) { cell.title = s.id + ' — ' + s.type; cell.firstChild.textContent = s.id; }
          document.querySelector('.sp-fe-panel h4').textContent = 'Espacio: ' + (s.id || '—');
        });
        document.getElementById('fpe-ed-type').addEventListener('change', e => {
          s.type = e.target.value;
          const cell = document.getElementById('fpe-space-' + activeUid);
          if (cell) cell.title = s.id + ' — ' + s.type;
        });
        document.getElementById('fpe-ed-details').addEventListener('input', e => { s.details = e.target.value; });
        document.getElementById('fpe-ed-shade').addEventListener('change', e => {
          s.shade = e.target.checked;
          const cell = document.getElementById('fpe-space-' + activeUid);
          setShadeVisual(cell, s.shade);
        });
        document.getElementById('fpe-ed-res').addEventListener('change', e => { s.reservable = e.target.checked; });
        document.getElementById('fpe-dup').addEventListener('click', () => duplicateActive());
        document.getElementById('fpe-del').addEventListener('click', () => {
          spaces.splice(idx.idx, 1); selectedUids.clear();
          activeUid = null; rebuildUids('s'); render();
        });
      } else {
        const e = designElements[idx.idx];
        const labels = Object.assign(
          { wall: 'Pared', line: 'Línea', arrow: 'Flecha', text: 'Texto',
            tree: 'Árbol / Zona Verde', entry: 'Entrada/Salida', crosswalk: 'Zona Peatonal' },
          Object.fromEntries(Object.entries(DESIGN_ICONS).map(([k, v]) => [k, v.label])));
        p.innerHTML = `<h4>${labels[e.type] || 'Elemento'}</h4>
          <div class="form-group"><label class="form-label">Color</label>
            <input type="color" class="form-control" id="fpe-ed-color" value="${esc(e.color || '#333333')}" style="height:38px;padding:2px;width:70px;"></div>
          ${e.type === 'text' || e.type === 'entry'
            ? `<div class="form-group"><label class="form-label">Texto</label>
                 <input type="text" class="form-control" id="fpe-ed-text" value="${esc(e.text || (e.type === 'entry' ? 'ENTRADA' : ''))}"></div>` : ''}
          ${e.type === 'text'
            ? `<div class="form-group"><label class="form-label">Tamaño (px)</label>
                 <input type="number" class="form-control" id="fpe-ed-font" value="${e.fontSize || 14}" min="8" max="80"></div>` : ''}
          ${e.type === 'entry'
            ? `<div class="form-group"><label class="form-label">Tamaño (px)</label>
                 <input type="number" class="form-control" id="fpe-ed-font" value="${e.fontSize || 12}" min="8" max="80"></div>` : ''}
          ${DESIGN_ICONS[e.type]
            ? `<div class="form-group"><label class="form-label">Tamaño (px)</label>
                 <input type="number" class="form-control" id="fpe-ed-font" value="${e.fontSize || DESIGN_ICONS[e.type].size}" min="10" max="60"></div>` : ''}
          <button class="btn btn-danger btn-sm" id="fpe-del"><span class="material-symbols-outlined">delete</span> Eliminar elemento</button>`;
        const colorIn = document.getElementById('fpe-ed-color');
        if (colorIn) colorIn.addEventListener('input', ev => {
          e.color = ev.target.value;
          const cell = document.getElementById('fpe-design-' + activeUid);
          if (cell) {
            if (e.type === 'wall' || e.type === 'line' || e.type === 'entry' || DESIGN_ICONS[e.type]) cell.style.background = e.color;
            else cell.style.color = e.color;
          }
        });
        const textIn = document.getElementById('fpe-ed-text');
        if (textIn) textIn.addEventListener('input', ev => {
          e.text = ev.target.value;
          const cell = document.getElementById('fpe-design-' + activeUid);
          if (cell) cell.textContent = ev.target.value;
        });
        const fontIn = document.getElementById('fpe-ed-font');
        if (fontIn) fontIn.addEventListener('input', ev => {
          e.fontSize = +ev.target.value || 14;
          const cell = document.getElementById('fpe-design-' + activeUid);
          if (cell) cell.style.fontSize = e.fontSize + 'px';
        });
        document.getElementById('fpe-del').addEventListener('click', () => {
          designElements.splice(idx.idx, 1); activeUid = null; rebuildUids('d'); render();
        });
      }
    }

    /* Re-construir uids tras un borrado (los índices cambian) */
    function rebuildUids(kind) {
      uidOf.forEach((uid, key) => { if (key.split(':')[0] === kind) uidOf.delete(key); });
      keyOf.forEach((v, k) => { if (v.split(':')[0] === kind) keyOf.delete(k); });
    }

    /* ── ACCIONES DE BARRA ──────────────────────────────────── */
    function addSpace() {
      const n = spaces.length + 1;
      let id;
      do {
        id = prefix + '-' + String(n).padStart(2, '0');
      } while (spaces.some(s => s.id === id));
      const s = { id, type: 'Automóvil', status: 'available', reservable: true,
        x: 50, y: 50, width: 7, height: 11, rotation: 0, scale: 1 };
      spaces.push(s);
      const idx = spaces.length - 1;
      const uid = uidFor('s', idx);
      render();
      select(uid, 's');
      requestAnimationFrame(() => { const inp = document.getElementById('fpe-ed-id'); if (inp) { inp.focus(); inp.select(); } });
    }

    function addDesignElement(type) {
      const e = { id: type + '-' + Date.now(), type, x: 50, y: 50, rotation: 0, scale: 1 };
      if (type === 'wall') { e.width = 20; e.height = 2; e.color = '#333333'; }
      else if (type === 'line') { e.width = 20; e.height = .5; e.color = '#666666'; }
      else if (type === 'arrow') { e.color = '#333333'; }
      else if (type === 'text') { e.text = 'TEXTO'; e.fontSize = 18; e.color = '#000000'; }
      else if (type === 'tree') { e.width = 8; e.height = 8; e.color = '#4caf50'; }
      else if (type === 'entry') { e.text = 'ENTRADA'; e.width = 15; e.height = 4; e.color = '#1976d2'; e.fontSize = 12; }
      else if (type === 'crosswalk') { e.width = 15; e.height = 20; e.color = '#ffffff'; }
      else if (DESIGN_ICONS[type]) {
        e.width = 5; e.height = 5; e.color = DESIGN_ICONS[type].color;
        e.fontSize = DESIGN_ICONS[type].size;
      }
      designElements.push(e);
      const idx = designElements.length - 1;
      const uid = uidFor('d', idx);
      render();
      select(uid, 'd');
    }

    function removeActive() {
      if (selectedUids.size > 1) { batchDelete(); return; }
      if (!activeUid) return;
      const idx = indexOfUid(activeUid);
      if (!idx) return;
      if (idx.kind === 's') spaces.splice(idx.idx, 1); else designElements.splice(idx.idx, 1);
      selectedUids.clear();
      activeUid = null; rebuildUids(idx.kind); render();
    }

    function select(uid, kind) {
      activeUid = uid; activeKind = kind;
      selectedUids.clear(); selectedUids.add(uid);
      updateSelectionVisual();
      const cell = cellByUid(uid, kind);
      addTransformBox(cell);
      renderPanel();
    }

    function selectedSpaceObjects() {
      const arr = [];
      selectedUids.forEach(u => { const ix = indexOfUid(u); if (ix && ix.kind === 's') arr.push(spaces[ix.idx]); });
      return arr;
    }
    function activeSpaceObject() {
      if (!activeUid) return null;
      const ix = indexOfUid(activeUid);
      return (ix && ix.kind === 's') ? spaces[ix.idx] : null;
    }

    function batchShade(on) {
      const objs = selectedSpaceObjects();
      if (!objs.length) { const s = activeSpaceObject(); if (s) objs.push(s); }
      if (!objs.length) return;
      objs.forEach(s => s.shade = !!on);
      render();
      SP_Components.showToast('success', 'Sombra', `Marcado con sombra: ${objs.length} espacio(s).`);
    }

    function batchDelete() {
      const kinds = new Set();
      selectedUids.forEach(u => {
        const ix = indexOfUid(u); if (!ix) return;
        (ix.kind === 's' ? spaces : designElements).splice(ix.idx, 1);
        kinds.add(ix.kind);
      });
      selectedUids.clear(); activeUid = null;
      kinds.forEach(k => rebuildUids(k));
      render();
    }

    function duplicateActive() {
      const s = selectedSpaceObjects()[0] || activeSpaceObject();
      if (!s) return;
      const copy = Object.assign({}, s, {
        id: nextSeqId(prefix, spaces),
        x: rnd((s.x || 50) + 8), y: rnd((s.y || 50) + 8),
        width: s.width, height: s.height, rotation: s.rotation || 0, scale: 1
      });
      spaces.push(copy);
      const idx = spaces.length - 1;
      const uid = uidFor('s', idx);
      render();
      select(uid, 's');
    }

    function applyShadeToActiveCell() {
      const s = activeSpaceObject();
      if (!s) return;
      const cell = cellByUid(activeUid, 's');
      setShadeVisual(cell, s.shade);
    }

    /* ── TRANSFORM BOX + interacción ────────────────────────── */
    function addTransformBox(cell) {
      document.querySelectorAll('.fpe-tbox').forEach(t => t.remove());
      if (!cell) return;
      const box = document.createElement('div');
      box.className = 'fpe-tbox transform-box';
      box.innerHTML = `
        <div class="frh rse rse-nw" data-a="nw"></div><div class="frh rse rse-n" data-a="n"></div>
        <div class="frh rse rse-ne" data-a="ne"></div><div class="frh rse rse-e" data-a="e"></div>
        <div class="frh rse rse-se" data-a="se"></div><div class="frh rse rse-s" data-a="s"></div>
        <div class="frh rse rse-sw" data-a="sw"></div><div class="frh rse rse-w" data-a="w"></div>
        <div class="frh-rotate" data-a="rotate"></div>
        <div style="position:absolute;width:1px;height:18px;background:#2962ff;bottom:-18px;left:50%;pointer-events:none;"></div>`;
      cell.appendChild(box);
    }

    function onPointerDown(e) {
      if (drawMode) return;
      if (rectMode) { startRect(e); return; }

      const handle = e.target.closest('[data-a]');
      const cellEl = e.target.closest('.sp-fe-cell');
      const mod = e.ctrlKey || e.metaKey || e.shiftKey;

      if (!cellEl) { clearSelection(); return; }

      const uid = cellEl.getAttribute('data-uid');
      const kind = cellEl.getAttribute('data-kind');

      if (mod) {
        if (selectedUids.has(uid)) selectedUids.delete(uid); else selectedUids.add(uid);
        updateSelectionVisual();
        renderPanel();
        e.preventDefault();
        return;
      }

      if (!selectedUids.has(uid)) { clearSelection(); selectedUids.add(uid); }
      activeUid = uid; activeKind = kind;
      updateSelectionVisual();
      const sel = cellByUid(uid, kind);
      if (selectedUids.size === 1) addTransformBox(sel);

      const rect = O().getBoundingClientRect();
      tx0 = (e.touches ? e.touches[0].clientX : e.clientX);
      ty0 = (e.touches ? e.touches[0].clientY : e.clientY);

      /* capturar posiciones iniciales de la selección para mover en grupo */
      groupStart = [];
      selectedUids.forEach(u => {
        const ix = indexOfUid(u); if (!ix) return;
        const obj = ix.kind === 's' ? spaces[ix.idx] : designElements[ix.idx];
        groupStart.push({ uid: u, kind: ix.kind, x: obj.x || 50, y: obj.y || 50 });
      });

      action = handle ? handle.getAttribute('data-a') : 'drag';

      const idx = indexOfUid(uid); if (!idx) return;
      const s = (kind === 's') ? spaces[idx.idx] : designElements[idx.idx];
      iL = s.x || 50; iT = s.y || 50;
      iW = s.width || (kind === 's' ? 7 : (s.type === 'wall' || s.type === 'line' ? 20 : 15));
      iH = s.height || (kind === 's' ? 11 : (s.type === 'wall' || s.type === 'line' ? 2 : 20));
      iR = s.rotation || 0;
      renderPanel();
      e.preventDefault();
    }

    function clearSelection() {
      selectedUids.clear();
      activeUid = null; activeKind = null;
      document.querySelectorAll('.sp-fe-cell').forEach(c => c.classList.remove('selected'));
      document.querySelectorAll('.fpe-tbox').forEach(t => t.remove());
    }

    function updateSelectionVisual() {
      document.querySelectorAll('.sp-fe-cell').forEach(c => c.classList.remove('selected'));
      selectedUids.forEach(u => {
        const el = document.getElementById('fpe-space-' + u) || document.getElementById('fpe-design-' + u);
        if (el) el.classList.add('selected');
      });
    }

    function getPosPct(e) {
      const r = O().getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left) / r.width * 100, y: (cy - r.top) / r.height * 100 };
    }

    function startRect(e) {
      e.preventDefault();
      const p = getPosPct(e);
      rectStart = p;
      if (rectPreview) rectPreview.remove();
      rectPreview = document.createElement('div');
      rectPreview.className = 'sp-fe-rect';
      rectPreview.style.left = p.x + '%'; rectPreview.style.top = p.y + '%';
      O().appendChild(rectPreview);
    }

    function onPointerMove(e) {
      if (rectMode && rectPreview) {
        e.preventDefault();
        const p = getPosPct(e);
        const x = rnd(Math.min(p.x, rectStart.x)), y = rnd(Math.min(p.y, rectStart.y));
        const w = rnd(Math.abs(p.x - rectStart.x)), h = rnd(Math.abs(p.y - rectStart.y));
        rectPreview.style.left = x + '%'; rectPreview.style.top = y + '%';
        rectPreview.style.width = Math.max(1, w) + '%'; rectPreview.style.height = Math.max(1, h) + '%';
        return;
      }
      if (!action) return;
      const rect = O().getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX);
      const cy = (e.touches ? e.touches[0].clientY : e.clientY);
      const dx = cx - tx0, dy = cy - ty0;
      const dxPct = dx / rect.width * 100, dyPct = dy / rect.height * 100;

      if (action === 'drag' && selectedUids.size > 1) {
        groupStart.forEach(g => {
          const ix = indexOfUid(g.uid); if (!ix) return;
          const obj = ix.kind === 's' ? spaces[ix.idx] : designElements[ix.idx];
          obj.x = rnd(g.x + dxPct); obj.y = rnd(g.y + dyPct);
          const el = cellByUid(g.uid, g.kind);
          if (el) { el.style.left = obj.x + '%'; el.style.top = obj.y + '%'; }
        });
        return;
      }

      const sel = cellByUid(activeUid, activeKind);
      if (!sel) return;
      const idx = indexOfUid(activeUid);
      if (!idx) return;
      const s = (activeKind === 's') ? spaces[idx.idx] : designElements[idx.idx];

      if (action === 'drag') {
        s.x = rnd(iL + dxPct); s.y = rnd(iT + dyPct);
        sel.style.left = s.x + '%'; sel.style.top = s.y + '%';
      } else if (action === 'rotate') {
        const c = rect.width / 2, cyy = rect.height / 2;
        const a1 = Math.atan2(ty0 - cyy, tx0 - c);
        const a2 = Math.atan2(cy - cyy, cx - c);
        s.rotation = rnd(iR + (a2 - a1) * 180 / Math.PI);
        sel.style.setProperty('--r', s.rotation + 'deg');
      } else {
        /* resize con ancla en el borde opuesto (centro = left/top) */
        const isW = action.includes('w'), isE = action.includes('e');
        const isN = action.includes('n'), isS2 = action.includes('s');
        let wPct = iW, hPct = iH;
        if (isE) { wPct = iW + dxPct; s.x = rnd(iL + dxPct / 2); }
        if (isW) { wPct = iW - dxPct; s.x = rnd(iL + dxPct / 2); }
        if (isS2) { hPct = iH + dyPct; s.y = rnd(iT + dyPct / 2); }
        if (isN) { hPct = iH - dyPct; s.y = rnd(iT + dyPct / 2); }
        if (wPct < 2) wPct = 2; if (hPct < 1.5) hPct = 1.5;
        s.width = +wPct.toFixed(2); s.height = +hPct.toFixed(2);
        sel.style.left = s.x + '%'; sel.style.top = s.y + '%';
        sel.style.width = s.width + '%'; sel.style.height = s.height + '%';
      }
    }

    function endRect() {
      if (!rectPreview) return;
      const x = parseFloat(rectPreview.style.left) || 0;
      const y = parseFloat(rectPreview.style.top) || 0;
      const w = parseFloat(rectPreview.style.width) || 0;
      const h = parseFloat(rectPreview.style.height) || 0;
      rectPreview.remove(); rectPreview = null;
      if (w >= 2 && h >= 2) {
        const s = {
          id: nextSeqId(prefix, spaces), type: 'Automóvil', status: 'available',
          reservable: true, x: rnd(x + w / 2), y: rnd(y + h / 2),
          width: +w.toFixed(2), height: +h.toFixed(2), rotation: 0, scale: 1, shade: false
        };
        spaces.push(s);
        const idx = spaces.length - 1;
        const uid = uidFor('s', idx);
        render();
        select(uid, 's');
      }
    }

    function onPointerUp() {
      if (rectMode && rectPreview) { endRect(); return; }
      action = null;
    }

    /* ── DIBUJO LIBRE (canvas) ──────────────────────────────── */
    function enterDrawMode() {
      drawMode = true;
      clearSelection();
      activeUid = null;
      renderPanel();
      if (O()) mountDrawCanvas();
    }

    function exitDrawMode() {
      drawMode = false;
      if (drawCanvas) { drawCanvas.remove(); drawCanvas = null; drawCtx = null; }
      if (previewCanvas) { previewCanvas.remove(); previewCanvas = null; previewCtx = null; }
      render();
    }

    function mountDrawCanvas() {
      const plan = O(); if (!plan) return;
      drawCanvas = document.createElement('canvas');
      drawCanvas.className = 'sp-fe-canvas';
      drawCanvas.width = plan.clientWidth || 800;
      drawCanvas.height = plan.clientHeight || 600;
      drawCtx = drawCanvas.getContext('2d', { willReadFrequently: true });
      drawCtx.fillStyle = '#ffffff';
      drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

      if (floorPlan) {
        const img = new Image();
        img.onload = () => drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
        img.src = floorPlan;
      }

      previewCanvas = document.createElement('canvas');
      previewCanvas.className = 'sp-fe-preview';
      previewCanvas.width = drawCanvas.width;
      previewCanvas.height = drawCanvas.height;
      previewCtx = previewCanvas.getContext('2d');

      plan.appendChild(drawCanvas);
      plan.appendChild(previewCanvas);

      undoStack = []; curTool = 'brush'; pendingDraw = false;

      const getPos = (e) => {
        const r = previewCanvas.getBoundingClientRect();
        const cl = e.touches ? e.touches[0].clientX : e.clientX;
        const ct = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cl - r.left) * (previewCanvas.width / r.width), y: (ct - r.top) * (previewCanvas.height / r.height) };
      };
      const saveState = () => {
        if (!drawCtx) return;
        undoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
        if (undoStack.length > 20) undoStack.shift();
        pendingDraw = true;
      };
      const hexToRgb = (h) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
        return m ? [+parseInt(m[1], 16), +parseInt(m[2], 16), +parseInt(m[3], 16)] : [0, 0, 0];
      };
      const floodFill = (ctx, sx, sy, hex) => {
        sx = Math.floor(sx); sy = Math.floor(sy);
        const w = ctx.canvas.width, h = ctx.canvas.height;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
        const img = ctx.getImageData(0, 0, w, h), d = img.data;
        const f = hexToRgb(hex);
        const p = (sy * w + sx) * 4;
        const sr = d[p], sg = d[p + 1], sb = d[p + 2], sa = d[p + 3];
        if (sr === f[0] && sg === f[1] && sb === f[2] && sa === 255) return;
        const match = (i) => d[i] === sr && d[i + 1] === sg && d[i + 2] === sb && d[i + 3] === sa;
        const paint = (i) => { d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255; };
        const stack = [[sx, sy]];
        while (stack.length) {
          const np = stack.pop(); let x = np[0], y = np[1];
          let i = (y * w + x) * 4;
          while (y >= 0 && match(i)) { y--; i -= w * 4; }
          i += w * 4; y++;
          let l = false, r = false;
          while (y < h && match(i)) {
            paint(i);
            if (x > 0) {
              if (match(i - 4)) { if (!l) { stack.push([x - 1, y]); l = true; } }
              else l = false;
            }
            if (x < w - 1) {
              if (match(i + 4)) { if (!r) { stack.push([x + 1, y]); r = true; } }
              else r = false;
            }
            y++; i += w * 4;
          }
        }
        ctx.putImageData(img, 0, 0);
      };

      const start = (e) => {
        e.preventDefault();
        saveState();
        const pos = getPos(e); sX = pos.x; sY = pos.y; lastX = pos.x; lastY = pos.y;
        const color = document.getElementById('fpe-draw-color')?.value || '#333';
        const width = +(document.getElementById('fpe-draw-width')?.value || 4);
        drawCtx.strokeStyle = color; drawCtx.fillStyle = color;
        drawCtx.lineWidth = width; drawCtx.lineCap = 'round';
        previewCtx.strokeStyle = color; previewCtx.fillStyle = color;
        previewCtx.lineWidth = width; previewCtx.lineCap = 'round';
        if (curTool === 'eraser') { drawCtx.globalCompositeOperation = 'destination-out'; drawCtx.lineWidth = width * 2; }
        else drawCtx.globalCompositeOperation = 'source-over';
        if (curTool === 'text') {
          const t = prompt('Ingresa el texto:');
          if (t) { drawCtx.font = 'bold ' + Math.max(14, width * 4) + 'px Arial'; drawCtx.fillText(t, pos.x, pos.y); }
          return;
        }
        if (curTool === 'fill') { floodFill(drawCtx, pos.x, pos.y, color); return; }
        isDrawing = true;
      };
      const move = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getPos(e);
        if (curTool === 'brush' || curTool === 'eraser') {
          drawCtx.beginPath(); drawCtx.moveTo(lastX, lastY); drawCtx.lineTo(pos.x, pos.y); drawCtx.stroke();
          lastX = pos.x; lastY = pos.y;
        } else {
          previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          previewCtx.beginPath();
          if (curTool === 'line') { previewCtx.moveTo(sX, sY); previewCtx.lineTo(pos.x, pos.y); }
          else if (curTool === 'rect') { previewCtx.rect(Math.min(sX, pos.x), Math.min(sY, pos.y), Math.abs(pos.x - sX), Math.abs(pos.y - sY)); }
          else if (curTool === 'circle') { previewCtx.arc(sX, sY, Math.hypot(pos.x - sX, pos.y - sY), 0, Math.PI * 2); }
          else if (curTool === 'triangle') {
            previewCtx.moveTo(sX, sY - Math.hypot(pos.x - sX, pos.y - sY));
            previewCtx.lineTo(sX - Math.hypot(pos.x - sX, pos.y - sY) * .86, sY + Math.hypot(pos.x - sX, pos.y - sY) * .5);
            previewCtx.lineTo(sX + Math.hypot(pos.x - sX, pos.y - sY) * .86, sY + Math.hypot(pos.x - sX, pos.y - sY) * .5);
            previewCtx.closePath();
          }
          previewCtx.stroke();
        }
      };
      const end = (e) => {
        e.preventDefault();
        if (isDrawing && previewCtx) {
          drawCtx.drawImage(previewCanvas, 0, 0);
          previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
        isDrawing = false;
      };
      previewCanvas.addEventListener('mousedown', start);
      previewCanvas.addEventListener('mousemove', move);
      previewCanvas.addEventListener('mouseup', end);
      previewCanvas.addEventListener('mouseleave', end);
      previewCanvas.addEventListener('touchstart', start, { passive: false });
      previewCanvas.addEventListener('touchmove', move, { passive: false });
      previewCanvas.addEventListener('touchend', end);
    }

    function setTool(tool) {
      curTool = tool;
      document.querySelectorAll('.fpe-tool').forEach(b => b.classList.remove('btn-primary'));
      const b = document.getElementById('fpe-tool-' + tool);
      if (b) b.classList.add('btn-primary');
    }

    function undoDraw() {
      if (!drawCtx || !undoStack.length) return;
      const st = undoStack.pop();
      drawCtx.putImageData(st, 0, 0);
    }

    function clearDraw() {
      if (!drawCtx) return;
      drawCtx.fillStyle = '#ffffff'; drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
      pendingDraw = true;
    }

    function applyDraw(cb) {
      if (!drawCanvas || !drawCtx) { if (cb) cb(); return; }
      const out = document.createElement('canvas');
      out.width = drawCanvas.width; out.height = drawCanvas.height;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
      const done = () => { ctx.drawImage(drawCanvas, 0, 0); floorPlan = out.toDataURL('image/png'); if (cb) cb(); };
      if (floorPlan) {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, out.width, out.height); done(); };
        img.onerror = done;
        img.src = floorPlan;
      } else done();
    }

    /* ── SAVE / CANCEL ──────────────────────────────────────── */
    function save() {
      const finish = () => {
        const result = {
          spaces: spaces.map(s => ({ id: s.id, type: s.type, details: s.details || '',
            status: 'available', reservable: !!s.reservable, shade: !!s.shade,
            x: +s.x, y: +s.y,
            width: s.width, height: s.height, rotation: s.rotation || 0, scale: 1 })),
          designElements: designElements.map(e => Object.assign({}, e)),
          floorPlan: floorPlan || null
        };
        close();
        onApply(result);
      };
      if (drawMode) applyDraw(finish); else finish();
    }

    function close() {
      if (action) onPointerUp();
      if (drawCanvas) { drawCanvas.remove(); drawCanvas = null; }
      if (previewCanvas) { previewCanvas.remove(); previewCanvas = null; }
      document.querySelectorAll('.fpe-tbox').forEach(t => t.remove());
      const o = document.querySelector('.sp-fe-overlay');
      if (o) o.remove();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('keydown', onKey);
    }

    /* ── BUILD DOM ──────────────────────────────────────────── */
    overlay.innerHTML = `
      <div class="sp-fe-modal">
        <div class="sp-fe-header">
          <div>
            <h2 style="margin:0;font-size:1.15rem;"><span class="material-symbols-outlined" style="vertical-align:-4px;">map</span> ${esc(title)}</h2>
            <div class="text-sm text-muted" style="font-size:.78rem;">Estilo Canva: arrastra espacios, usa los tiradores para redimensionar/rotar, dibuja el fondo a mano.</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label class="form-label" style="margin:0;font-size:.78rem;">Prefijo:
              <input type="text" id="fpe-prefix" class="form-control" value="${esc(prefix)}" style="width:64px;display:inline-block;padding:4px 8px;text-transform:uppercase;" maxlength="3">
            </label>
            <button class="btn btn-ghost" id="fpe-cancel">Cancelar</button>
            <button class="btn btn-primary" id="fpe-save"><span class="material-symbols-outlined">save</span> Guardar Plano</button>
          </div>
        </div>
        <div class="sp-fe-toolbar">
          <div class="sp-fe-tool-group">
            <button class="btn btn-primary btn-sm sp-fe-btn" id="fpe-add-space"><span class="material-symbols-outlined">add</span> Espacio</button>
          </div>
          <div class="sp-fe-tool-group">
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('wall')"><span class="material-symbols-outlined">square</span> Pared</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('line')"><span class="material-symbols-outlined">horizontal_rule</span> Línea</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('arrow')"><span class="material-symbols-outlined">arrow_downward</span> Flecha</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('text')"><span class="material-symbols-outlined">title</span> Texto</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('tree')"><span class="material-symbols-outlined">nature</span> Árbol</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('entry')"><span class="material-symbols-outlined">door_open</span> Entrada</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('crosswalk')"><span class="material-symbols-outlined">view_comfy_alt</span> Peatonal</button>
          </div>
          <div class="sp-fe-tool-group">
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('ev')"><span class="material-symbols-outlined">ev_station</span> EV</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('disabled')"><span class="material-symbols-outlined">accessible</span> Discap.</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('moto')"><span class="material-symbols-outlined">two_wheeler</span> Motos</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('cone')"><span class="material-symbols-outlined">warning</span> Cono</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('stop')"><span class="material-symbols-outlined">octagon</span> PARE</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('meter')"><span class="material-symbols-outlined">payments</span> Parquím.</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('hydrant')"><span class="material-symbols-outlined">local_fire_department</span> Hidrante</button>
          </div>
          <div class="sp-fe-tool-group">
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('light')"><span class="material-symbols-outlined">light</span> Luz</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('bench')"><span class="material-symbols-outlined">chair</span> Banco</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('gate')"><span class="material-symbols-outlined">door_sliding</span> Reja</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('speed')"><span class="material-symbols-outlined">speed</span> Resalto</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('bus')"><span class="material-symbols-outlined">directions_bus</span> Bus</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('truck')"><span class="material-symbols-outlined">local_shipping</span> Carga</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('fire')"><span class="material-symbols-outlined">fire_extinguisher</span> Extintor</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('cc')"><span class="material-symbols-outlined">videocam</span> Cámara</button>
            <button class="btn btn-outline btn-sm sp-fe-btn" onclick="window.FloorEditor.__add('info')"><span class="material-symbols-outlined">info</span> Info</button>
          </div>
          <div class="sp-fe-tool-group" id="fpe-draw-tools" style="display:none;">
            <button class="btn btn-sm fpe-tool btn-primary" id="fpe-tool-brush" onclick="window.FloorEditor.__tool('brush')"><span class="material-symbols-outlined">brush</span> Pincel</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-eraser" onclick="window.FloorEditor.__tool('eraser')"><span class="material-symbols-outlined">ink_eraser</span> Borrador</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-line" onclick="window.FloorEditor.__tool('line')"><span class="material-symbols-outlined">horizontal_rule</span> Línea</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-rect" onclick="window.FloorEditor.__tool('rect')"><span class="material-symbols-outlined">crop_square</span> Rect</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-circle" onclick="window.FloorEditor.__tool('circle')"><span class="material-symbols-outlined">radio_button_unchecked</span> Círculo</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-triangle" onclick="window.FloorEditor.__tool('triangle')"><span class="material-symbols-outlined">change_history</span> Triángulo</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-text" onclick="window.FloorEditor.__tool('text')"><span class="material-symbols-outlined">title</span> Texto</button>
            <button class="btn btn-sm fpe-tool btn-outline" id="fpe-tool-fill" onclick="window.FloorEditor.__tool('fill')"><span class="material-symbols-outlined">format_color_fill</span> Relleno</button>
            <span class="sp-fe-divider"></span>
            <input type="color" id="fpe-draw-color" value="#333333" title="Color" style="width:30px;height:30px;padding:0;border-radius:4px;cursor:pointer;border:none;">
            <input type="range" id="fpe-draw-width" min="1" max="20" value="4" style="width:70px;" title="Grosor">
            <button class="btn btn-ghost btn-sm" onclick="window.FloorEditor.__undo()" title="Deshacer"><span class="material-symbols-outlined">undo</span></button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="window.FloorEditor.__clear()" title="Borrar todo"><span class="material-symbols-outlined">delete</span></button>
            <button class="btn btn-primary btn-sm" id="fpe-apply-draw"><span class="material-symbols-outlined">check</span> Aplicar dibujo</button>
            <button class="btn btn-secondary btn-sm" id="fpe-exit-draw"><span class="material-symbols-outlined">close</span> Salir</button>
          </div>
          <div style="flex:1;"></div>
          <button class="btn btn-outline btn-sm sp-fe-btn" id="fpe-toggle-draw" style="border:1px dashed var(--c3);"><span class="material-symbols-outlined">draw</span> Dibujo Libre</button>
        </div>
        <div class="sp-fe-body">
          <div class="sp-fe-canvas-wrap"><div class="sp-fe-plan" id="fpe-plan"></div></div>
          <div class="sp-fe-panel" id="fpe-panel"></div>
        </div>
        <div class="sp-fe-footer">
          <span><span class="sp-fe-color-dot" style="background:rgba(0,168,89,.35);border-color:#22c55e;"></span> Espacio disponible</span>
          <span class="text-muted">Arrastra → mover · tiradores → tamaño/rotación · clic en «Espacio» → numera ${esc(prefix)}-01, ${esc(prefix)}-02…</span>
        </div>
      </div>
    `;

    /* expone métodos del contexto activo al onclick global */
    window.FloorEditor.__add = addDesignElement;
    window.FloorEditor.__tool = setTool;
    window.FloorEditor.__undo = undoDraw;
    window.FloorEditor.__clear = clearDraw;

    document.getElementById('fpe-add-space').addEventListener('click', addSpace);
    document.getElementById('fpe-toggle-draw').addEventListener('click', () => {
      const tools = document.getElementById('fpe-draw-tools');
      const isOn = tools.style.display === 'flex';
      tools.style.display = isOn ? 'none' : 'flex';
      if (isOn) exitDrawMode();
      else enterDrawMode();
    });
    document.getElementById('fpe-exit-draw').addEventListener('click', exitDrawMode);
    document.getElementById('fpe-apply-draw').addEventListener('click', () => {
      applyDraw(() => { exitDrawMode(); SP_Components.showToast('success', 'Dibujo Aplicado', 'El dibujo se guardó como fondo del plano.'); });
    });
    document.getElementById('fpe-prefix').addEventListener('input', e => {
      prefix = (e.target.value || 'A').toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    document.getElementById('fpe-cancel').addEventListener('click', close);
    document.getElementById('fpe-save').addEventListener('click', save);

    window.addEventListener('keydown', onKey);

    /* interacción del lienzo (delegado) */
    const plan = document.getElementById('fpe-plan');
    plan.addEventListener('mousedown', onPointerDown);
    plan.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    function onKey(e) {
      if (e.key === 'Escape') { close(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeUid && !e.target.closest('input,textarea,select')) { removeActive(); }
    }

    render();
    return { close, save, getState: () => ({ spaces, designElements, floorPlan }) };
  }

  /* Aplica un resultado del editor sobre un local en mockData (seguro:
     conserva ids, respeta reservas activas, actualiza geometría). */
  function applyToLocal(localId, result) {
    const d = window.mockData;
    if (!d || !d.locales) return;
    const local = d.locales.find(l => l.id === localId);
    if (!local) return;
    if (result.floorPlan) local.floorPlan = result.floorPlan;
    if (!d.designElements) d.designElements = [];
    d.designElements = d.designElements.filter(e => e.localId !== localId);
    (result.designElements || []).forEach(e => d.designElements.push(Object.assign({}, e, {
      id: (e.type || 'el') + '-' + localId + '-' + Date.now() + '-' + Math.round(Math.random() * 9999),
      localId
    })));
    const activeRes = d.reservations || [];
    const inUse = id => activeRes.some(r => r.spaceId === id && ['active', 'occupied'].includes(r.status));
    (result.spaces || []).forEach(rs => {
      const existing = d.spaces.find(s => s.localId === localId && s.id === rs.id);
      if (existing) {
        Object.assign(existing, {
          x: rs.x, y: rs.y, width: rs.width, height: rs.height,
          rotation: rs.rotation || 0, type: rs.type, reservable: !!rs.reservable,
          details: rs.details || '', shade: !!rs.shade
        });
      } else {
        d.spaces.push(Object.assign({}, rs, { localId }));
      }
    });
    const keep = new Set((result.spaces || []).map(s => s.id));
    d.spaces = d.spaces.filter(s => s.localId !== localId || keep.has(s.id) || inUse(s.id));
    if (local.totalSpaces !== undefined) local.totalSpaces = d.spaces.filter(s => s.localId === localId).length;
    if (d.saveToStorage) d.saveToStorage();
  }

  return { open, applyToLocal, __add: null, __tool: null, __undo: null, __clear: null };
})();
