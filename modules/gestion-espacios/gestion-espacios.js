/* GESTIÓN DE ESPACIOS — RF32–RF38 */
let geAutoUpdate = null;
function initGestionEspacios() {
  const d = window.mockData; const role = window.currentRole;
  if (role === 'user') isEditMapMode = false;
  const localId = role === 'local' ? (d.currentUser.localId || 1) : 1;
  const local = d.locales.find(l => l.id === localId);
  const spaces = d.spaces.filter(s => s.localId === localId);
  document.getElementById('ge-local-name').textContent = local ? `Mapa — ${local.name}` : 'Mapa de Espacios';
  document.getElementById('ge-title').textContent = role === 'user' ? 'Mi Espacio' : 'Gestión de Espacios';
  // RF38: user read-only, RF32: admin CRUD
  const actions = document.getElementById('ge-actions');
  actions.innerHTML = role !== 'user' ? `
    <button class="btn btn-outline btn-sm" id="btn-draw-plan" style="display: ${isEditMapMode ? 'inline-flex' : 'none'}; align-items: center; gap: 4px; border: 1px dashed var(--c3);" onclick="window.toggleDrawMode()">
      <span class="material-symbols-outlined">draw</span> Nuevo Mapa a Mano
    </button>
    <button class="btn btn-outline btn-sm" onclick="window.openFullEditor()" style="display: inline-flex; align-items: center; gap: 4px;" title="Abrir Editor Canva con todas las opciones">
      <span class="material-symbols-outlined">design_services</span> Editor Canva Completo
    </button>
    <button class="btn btn-secondary btn-sm" id="btn-edit-map" onclick="toggleEditMap()">
      <span class="material-symbols-outlined">${isEditMapMode ? 'save' : 'edit_location'}</span> ${isEditMapMode ? 'Guardar Mapa' : 'Editar Mapa'}
    </button>
    <button class="btn btn-primary btn-sm" onclick="SP_Components.openModal('modal-add-space')">
      <span class="material-symbols-outlined">add</span> Agregar Espacio
    </button>
  ` : '';
  
  const toolbox = document.getElementById('ge-toolbox');
  if (toolbox) toolbox.style.display = isEditMapMode ? 'flex' : 'none';
  
  renderSpaceGrid(spaces, role);
  renderSpaceTable(spaces, role);
  // RF37: auto-update
  if (geAutoUpdate) clearInterval(geAutoUpdate);
  if (!isEditMapMode) {
    geAutoUpdate = setInterval(() => { renderSpaceGrid(d.spaces.filter(s => s.localId === localId), role); }, 10000);
  }
}
let isEditMapMode = false;

function toggleEditMap() {
  if (window.currentRole === 'user') return;
  isEditMapMode = !isEditMapMode;
  const btn = document.getElementById('btn-edit-map');
  const drawPlanBtn = document.getElementById('btn-draw-plan');
  const toolbox = document.getElementById('ge-toolbox');
  if (isEditMapMode) {
    btn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Mapa';
    btn.classList.replace('btn-secondary', 'btn-primary');
    if (drawPlanBtn) drawPlanBtn.style.display = 'inline-flex';
    if (toolbox) toolbox.style.display = 'flex';
    SP_Components.showToast('info', 'Modo Edición (Estilo Canva)', 'Dibuja paredes, textos y reubica los espacios directamente.');
  } else {
    btn.innerHTML = '<span class="material-symbols-outlined">edit_location</span> Editar Mapa';
    btn.classList.replace('btn-primary', 'btn-secondary');
    if (drawPlanBtn) drawPlanBtn.style.display = 'none';
    if (toolbox) toolbox.style.display = 'none';
    document.getElementById('map-editor-panel')?.classList.remove('active');
    if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
    SP_Components.showToast('success', 'Mapa Guardado', 'Las nuevas ubicaciones se han guardado correctamente.');
  }
  initGestionEspacios();
}

window.openFullEditor = function() {
  const d = window.mockData;
  const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
  const local = d.locales.find(l => l.id === localId);
  const spaces = d.spaces.filter(s => s.localId === localId);
  const designElements = d.designElements ? d.designElements.filter(e => e.localId === localId) : [];
  
  if (!window.FloorEditor) {
    SP_Components.showToast('danger', 'Error', 'El Editor Canva no está disponible');
    return;
  }
  
  window.FloorEditor.open({
    prefix: 'A',
    spaces: spaces,
    designElements: designElements,
    floorPlan: local ? local.floorPlan : null,
    title: local ? `Editor Canva — ${local.name}` : 'Editor Canva de Plano',
    onApply: (result) => {
      window.FloorEditor.applyToLocal(localId, result);
      if (d.saveToStorage) d.saveToStorage();
      initGestionEspacios();
      SP_Components.showToast('success', 'Plano Guardado', 'El plano del estacionamiento ha sido actualizado exitosamente.');
    }
  });
};

window.handleFloorPlanUpload = function(event) {}

window.addDesignElement = function(type) {
  const d = window.mockData;
  const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
  
  if (!d.designElements) d.designElements = [];
  
  const id = `${type}-${Date.now()}`;
  let el = { id, localId, type, x: 50, y: 50, rotation: 0, scale: 1 };
  
  if (type === 'wall') {
    el.width = 20;
    el.height = 2;
    el.color = '#333333';
  } else if (type === 'line') {
    el.width = 20;
    el.height = 0.5;
    el.color = '#666666';
  } else if (type === 'arrow') {
    el.color = '#333333';
  } else if (type === 'text') {
    el.text = 'TEXTO';
    el.fontSize = 18;
    el.color = '#000000';
  } else if (type === 'tree') {
    el.width = 10;
    el.height = 10;
    el.color = '#4caf50'; // Green
  } else if (type === 'entry') {
    el.text = 'ENTRADA';
    el.width = 15;
    el.height = 4;
    el.color = '#1976d2'; // Blue
    el.fontSize = 12;
  } else if (type === 'crosswalk') {
    el.width = 15;
    el.height = 20;
    el.color = 'rgba(255,255,255,0.5)'; // Transparent white for dashed lines over pavement
  }
  
  d.designElements.push(el);
  if (d.saveToStorage) d.saveToStorage();
  initGestionEspacios();
  showSpaceDetail(id);
};

/* ── FREEHAND DRAWING (CANVAS) ────────────────────────────── */
let isFreehandMode = false;
let drawCanvas = null;
let drawCtx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let startX = 0;
let startY = 0;
let currentDrawTool = 'brush';
let undoStack = [];
let previewCanvas = null;
let previewCtx = null;
window.saveDrawState = function() {
  if (!drawCanvas || !drawCtx) return;
  undoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
  if (undoStack.length > 20) undoStack.shift(); // Max 20 undos
};

window.undoDraw = function() {
  if (!drawCanvas || !drawCtx || undoStack.length === 0) return;
  const state = undoStack.pop();
  drawCtx.putImageData(state, 0, 0);
};

window.setDrawTool = function(tool) {
  currentDrawTool = tool;
  document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active', 'btn-primary'));
  const btn = document.getElementById(`btn-tool-${tool}`);
  if (btn) btn.classList.add('active', 'btn-primary');
};

window.toggleDrawMode = function() {
  isFreehandMode = !isFreehandMode;
  const btn = document.getElementById('btn-draw-plan');
  
  if (isFreehandMode) {
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-outline');
    
    const container = document.getElementById('floor-plan-container');
    if (!container) return;
    
    // Inject paint toolbar into the right panel (ge-detail)
    let paintToolbar = document.getElementById('paint-toolbar');
    const detailPanel = document.getElementById('ge-detail');
    
    if (!paintToolbar && detailPanel) {
      paintToolbar = document.createElement('div');
      paintToolbar.id = 'paint-toolbar';
      paintToolbar.style.cssText = `
        display: flex; flex-direction: column; gap: 16px;
      `;
      paintToolbar.innerHTML = `
        <div class="text-sm fw-600 mb-2">Herramientas de Dibujo</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button id="btn-tool-brush" class="btn btn-sm btn-tool active btn-primary" onclick="window.setDrawTool('brush')" title="Pincel"><span class="material-symbols-outlined">brush</span> Pincel</button>
          <button id="btn-tool-eraser" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('eraser')" title="Borrador"><span class="material-symbols-outlined">ink_eraser</span> Borrador</button>
          <button id="btn-tool-line" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('line')" title="Línea"><span class="material-symbols-outlined">horizontal_rule</span> Línea</button>
          <button id="btn-tool-rect" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('rect')" title="Rectángulo"><span class="material-symbols-outlined">crop_square</span> Rectángulo</button>
          <button id="btn-tool-circle" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('circle')" title="Círculo"><span class="material-symbols-outlined">radio_button_unchecked</span> Círculo</button>
          <button id="btn-tool-triangle" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('triangle')" title="Triángulo"><span class="material-symbols-outlined">change_history</span> Triángulo</button>
          <button id="btn-tool-text" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('text')" title="Texto"><span class="material-symbols-outlined">title</span> Texto</button>
          <button id="btn-tool-fill" class="btn btn-sm btn-tool btn-outline" onclick="window.setDrawTool('fill')" title="Relleno"><span class="material-symbols-outlined">format_color_fill</span> Relleno</button>
        </div>
        
        <div class="text-sm fw-600 mt-2">Estilo</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
            Color:
            <input type="color" id="draw-color" value="#333333" title="Color del trazo" style="width:36px;height:36px;padding:0;border-radius:4px;cursor:pointer;border:none;">
          </label>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-size:14px;">Grosor del trazo:</label>
          <input type="range" id="draw-width" min="1" max="40" value="4" style="width:100%;" title="Grosor">
        </div>
        
        <div class="text-sm fw-600 mt-2">Acciones</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="btn btn-sm btn-ghost" style="border: 1px solid var(--color-border);" onclick="window.undoDraw()" title="Deshacer"><span class="material-symbols-outlined">undo</span> Deshacer</button>
          <button class="btn btn-sm btn-ghost text-danger" style="border: 1px solid var(--color-border);" onclick="window.clearCanvas()" title="Borrar Todo"><span class="material-symbols-outlined">delete</span> Borrar Todo</button>
        </div>
        
        <button class="btn btn-primary mt-2" onclick="window.saveCanvasAsBackground()" style="width: 100%; justify-content: center;"><span class="material-symbols-outlined">save</span> Aplicar y Guardar Dibujo</button>
      `;
    }
    
    if (detailPanel && paintToolbar) {
      // Save original detail content to restore later
      if (!window.originalDetailContent) {
        window.originalDetailContent = detailPanel.innerHTML;
      }
      detailPanel.innerHTML = '';
      detailPanel.appendChild(paintToolbar);
      paintToolbar.style.display = 'flex';
    }
    
    // Create Draw Canvas
    drawCanvas = document.createElement('canvas');
    drawCanvas.id = 'freehand-canvas';
    drawCanvas.width = container.clientWidth;
    drawCanvas.height = container.clientHeight;
    drawCanvas.style.position = 'absolute';
    drawCanvas.style.top = '0'; drawCanvas.style.left = '0';
    drawCanvas.style.width = '100%'; drawCanvas.style.height = '100%';
    drawCanvas.style.zIndex = '10'; // Behind spaces
    drawCanvas.style.cursor = 'crosshair';
    
    // Create Preview Canvas for shapes
    previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'preview-canvas';
    previewCanvas.width = container.clientWidth;
    previewCanvas.height = container.clientHeight;
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0'; previewCanvas.style.left = '0';
    previewCanvas.style.width = '100%'; previewCanvas.style.height = '100%';
    previewCanvas.style.zIndex = '11'; 
    previewCanvas.style.cursor = 'crosshair';
    previewCanvas.style.pointerEvents = 'auto'; // Will receive events
    
    drawCtx = drawCanvas.getContext('2d', { willReadFrequently: true });
    previewCtx = previewCanvas.getContext('2d');
    
    // Cargar fondo existente o pintar de blanco
    const localId = window.currentRole === 'local' ? (window.mockData.currentUser.localId || 1) : 1;
    const local = window.mockData.locales.find(l => l.id === localId);
    
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (local && local.floorPlan && !local.floorPlan.includes('floor_plan.png')) {
      const img = new Image();
      img.onload = () => {
        drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
      };
      img.src = local.floorPlan;
    }
    
    const overlay = container.querySelector('.floor-plan-overlay');
    if (overlay) {
      container.insertBefore(drawCanvas, overlay);
      container.insertBefore(previewCanvas, overlay);
    } else {
      container.appendChild(drawCanvas);
      container.appendChild(previewCanvas);
    }
    
    undoStack = [];
    currentDrawTool = 'brush';
    window.setDrawTool('brush');    
    const getPos = (e) => {
      const rect = previewCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (previewCanvas.width / rect.width),
        y: (clientY - rect.top) * (previewCanvas.height / rect.height)
      };
    };

    // Helper for flood fill
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
    };

    const floodFill = (ctx, startX, startY, fillColorHex) => {
      startX = Math.floor(startX);
      startY = Math.floor(startY);
      const canvas = ctx.canvas;
      const w = canvas.width, h = canvas.height;
      if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const fillRgb = hexToRgb(fillColorHex);
      
      const startPos = (startY * w + startX) * 4;
      const startR = data[startPos], startG = data[startPos+1], startB = data[startPos+2], startA = data[startPos+3];
      
      if (startR === fillRgb[0] && startG === fillRgb[1] && startB === fillRgb[2] && startA === 255) return;
      
      const matchStartColor = (pos) => data[pos] === startR && data[pos+1] === startG && data[pos+2] === startB && data[pos+3] === startA;
      const colorPixel = (pos) => { data[pos] = fillRgb[0]; data[pos+1] = fillRgb[1]; data[pos+2] = fillRgb[2]; data[pos+3] = 255; };
      
      const pixelStack = [[startX, startY]];
      
      while(pixelStack.length > 0) {
        const newPos = pixelStack.pop();
        let x = newPos[0], y = newPos[1];
        let pixelPos = (y * w + x) * 4;
        while (y >= 0 && matchStartColor(pixelPos)) { y--; pixelPos -= w * 4; }
        pixelPos += w * 4;
        y++;
        let reachLeft = false, reachRight = false;
        while (y < h && matchStartColor(pixelPos)) {
          colorPixel(pixelPos);
          if (x > 0) {
            if (matchStartColor(pixelPos - 4)) {
              if (!reachLeft) { pixelStack.push([x - 1, y]); reachLeft = true; }
            } else if (reachLeft) { reachLeft = false; }
          }
          if (x < w - 1) {
            if (matchStartColor(pixelPos + 4)) {
              if (!reachRight) { pixelStack.push([x + 1, y]); reachRight = true; }
            } else if (reachRight) { reachRight = false; }
          }
          y++; pixelPos += w * 4;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };

    const startDraw = (e) => {
      e.preventDefault();
      window.saveDrawState();
      
      const pos = getPos(e);
      startX = pos.x; startY = pos.y;
      lastX = pos.x; lastY = pos.y;
      
      drawCtx.strokeStyle = document.getElementById('draw-color').value || '#333';
      drawCtx.fillStyle = document.getElementById('draw-color').value || '#333';
      drawCtx.lineWidth = document.getElementById('draw-width').value || 4;
      drawCtx.lineCap = 'round';
      
      previewCtx.strokeStyle = drawCtx.strokeStyle;
      previewCtx.fillStyle = drawCtx.fillStyle;
      previewCtx.lineWidth = drawCtx.lineWidth;
      previewCtx.lineCap = 'round';
      
      if (currentDrawTool === 'eraser') {
        drawCtx.globalCompositeOperation = 'destination-out';
        drawCtx.lineWidth = (document.getElementById('draw-width').value || 4) * 2;
      } else {
        drawCtx.globalCompositeOperation = 'source-over';
      }
      
      if (currentDrawTool === 'text') {
        const text = prompt("Ingresa el texto:");
        if (text) {
          drawCtx.font = `bold ${Math.max(14, drawCtx.lineWidth * 4)}px Arial`;
          drawCtx.fillText(text, pos.x, pos.y);
        }
        return;
      }
      
      if (currentDrawTool === 'fill') {
        floodFill(drawCtx, pos.x, pos.y, drawCtx.fillStyle);
        return;
      }
      
      isDrawing = true;
    };

    const doDraw = (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const pos = getPos(e);
      
      if (currentDrawTool === 'brush' || currentDrawTool === 'eraser') {
        drawCtx.beginPath();
        drawCtx.moveTo(lastX, lastY);
        drawCtx.lineTo(pos.x, pos.y);
        drawCtx.stroke();
        lastX = pos.x; lastY = pos.y;
      } else {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.beginPath();
        if (currentDrawTool === 'line') {
          previewCtx.moveTo(startX, startY);
          previewCtx.lineTo(pos.x, pos.y);
          previewCtx.stroke();
        } else if (currentDrawTool === 'rect') {
          previewCtx.rect(startX, startY, pos.x - startX, pos.y - startY);
          previewCtx.stroke();
        } else if (currentDrawTool === 'circle') {
          const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
          previewCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
          previewCtx.stroke();
        } else if (currentDrawTool === 'triangle') {
          previewCtx.moveTo(startX, pos.y);
          previewCtx.lineTo(startX + (pos.x - startX)/2, startY);
          previewCtx.lineTo(pos.x, pos.y);
          previewCtx.closePath();
          previewCtx.stroke();
        }
      }
    };

    const endDraw = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      
      if (currentDrawTool !== 'brush' && currentDrawTool !== 'eraser') {
        const pos = getPos(e);
        drawCtx.beginPath();
        if (currentDrawTool === 'line') {
          drawCtx.moveTo(startX, startY);
          drawCtx.lineTo(pos.x, pos.y);
          drawCtx.stroke();
        } else if (currentDrawTool === 'rect') {
          drawCtx.rect(startX, startY, pos.x - startX, pos.y - startY);
          drawCtx.stroke();
        } else if (currentDrawTool === 'circle') {
          const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
          drawCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
          drawCtx.stroke();
        } else if (currentDrawTool === 'triangle') {
          drawCtx.moveTo(startX, pos.y);
          drawCtx.lineTo(startX + (pos.x - startX)/2, startY);
          drawCtx.lineTo(pos.x, pos.y);
          drawCtx.closePath();
          drawCtx.stroke();
        }
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    };

    previewCanvas.addEventListener('mousedown', startDraw);
    previewCanvas.addEventListener('mousemove', doDraw);
    previewCanvas.addEventListener('mouseup', endDraw);
    previewCanvas.addEventListener('mouseout', (e) => { if (isDrawing) endDraw(e); });
    
    previewCanvas.addEventListener('touchstart', startDraw, {passive: false});
    previewCanvas.addEventListener('touchmove', doDraw, {passive: false});
    previewCanvas.addEventListener('touchend', endDraw);

    // Disable pointer events on spaces to allow drawing over them smoothly
    document.querySelectorAll('.space-cell, .design-cell').forEach(c => c.style.pointerEvents = 'none');

  } else {
    btn.classList.remove('active', 'btn-primary');
    btn.classList.add('btn-outline');
    
    const paintToolbar = document.getElementById('paint-toolbar');
    if (paintToolbar) {
      paintToolbar.style.display = 'none';
      paintToolbar.remove();
      
      const detailPanel = document.getElementById('ge-detail');
      if (detailPanel && window.originalDetailContent) {
        detailPanel.innerHTML = window.originalDetailContent;
      }
    }
    
    if (drawCanvas) {
      drawCanvas.remove();
      drawCanvas = null;
    }
    if (previewCanvas) {
      previewCanvas.remove();
      previewCanvas = null;
    }
    
    // Restore pointer events
    document.querySelectorAll('.space-cell, .design-cell').forEach(c => c.style.pointerEvents = 'auto');
  }
};

window.clearCanvas = function() {
  if (drawCtx && drawCanvas) {
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
};

window.saveCanvasAsBackground = function() {
  if (drawCanvas) {
    const dataUrl = drawCanvas.toDataURL('image/png');
    const d = window.mockData;
    const localId = window.currentRole === 'local' ? (d.currentUser.localId || 1) : 1;
    const local = d.locales.find(l => l.id === localId);
    if (local) {
      local.floorPlan = dataUrl;
      if (d.saveToStorage) d.saveToStorage();
      // Quitamos modo dibujo
      window.toggleDrawMode();
      renderSpaceGrid(d.spaces.filter(s => s.localId === localId), window.currentRole);
      SP_Components.showToast('success', 'Dibujo Aplicado', 'Tu dibujo se ha guardado como el nuevo plano de fondo.');
    }
  }
};

function renderSpaceGrid(spaces, role) {
  const grid = document.getElementById('ge-space-grid');
  
  // RF38: user only sees their reserved/occupied space
  const userSpaces = role === 'user' ? spaces.filter(s => {
    const res = window.mockData.reservations.find(r => r.spaceId === s.id && r.userId === window.mockData.currentUser.id && ['active','occupied'].includes(r.status));
    return !!res;
  }) : spaces;
  const displaySpaces = role === 'user' && userSpaces.length === 0 ? spaces : (role === 'user' ? userSpaces : spaces);

  const localId = role === 'local' ? (window.mockData.currentUser.localId || 1) : 1;
  const designElements = window.mockData.designElements ? window.mockData.designElements.filter(e => e.localId === localId) : [];

  grid.innerHTML = SP_Components.renderInteractiveMap(displaySpaces, localId, {
    isEditMapMode: isEditMapMode,
    onClickAttr: 'onclick="showSpaceDetail(\'${s.id}\')"',
    designElements: designElements
  });
}

// Transform and Drag logic
let activeTransformElement = null;
let draggedSpaceId = null;
let transformAction = null; // 'drag', 'rotate', 'resize-nw', etc.
let transformStartX = 0;
let transformStartY = 0;
let initialLeft = 0;
let initialTop = 0;
let initialWidth = 0;
let initialHeight = 0;
let initialRot = 0;
let initialCenterX = 0;
let initialCenterY = 0;

function clearTransformBox() {
  document.querySelectorAll('.transform-box').forEach(el => el.remove());
  if (activeTransformElement) {
    activeTransformElement.classList.remove('is-transforming');
  }
  activeTransformElement = null;
}
window.clearTransformBox = clearTransformBox;

function addTransformBox(el) {
  if (el.querySelector('.transform-box')) return; // Already has it
  
  const tBox = document.createElement('div');
  tBox.className = 'transform-box';
  tBox.innerHTML = `
    <div class="transform-handle resize-handle resize-nw" data-action="resize-nw"></div>
    <div class="transform-handle resize-handle resize-ne" data-action="resize-ne"></div>
    <div class="transform-handle resize-handle resize-sw" data-action="resize-sw"></div>
    <div class="transform-handle resize-handle resize-se" data-action="resize-se"></div>
    <div class="transform-handle resize-handle resize-n" data-action="resize-n"></div>
    <div class="transform-handle resize-handle resize-s" data-action="resize-s"></div>
    <div class="transform-handle resize-handle resize-e" data-action="resize-e"></div>
    <div class="transform-handle resize-handle resize-w" data-action="resize-w"></div>
    <div class="rotate-line"></div>
    <div class="transform-handle rotate-handle" data-action="rotate"></div>
  `;
  el.appendChild(tBox);
}

function startDragSpace(e, spaceId) {
  if (!isEditMapMode) return;
  
  const handle = e.target.closest('.transform-handle');
  if (!handle) {
    clearTransformBox();
  }

  draggedSpaceId = spaceId;
  showSpaceDetail(spaceId);
  
  const el = document.getElementById(`space-cell-${spaceId}`) || document.getElementById(`design-cell-${spaceId}`);
  if (!el) return;
  
  activeTransformElement = el;
  el.classList.add('is-transforming');
  addTransformBox(el);
  
  const container = document.getElementById('floor-plan-container');
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  
  if (handle) {
    transformAction = handle.getAttribute('data-action');
    e.stopPropagation();
    e.preventDefault();
  } else {
    transformAction = 'drag';
  }
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  transformStartX = clientX;
  transformStartY = clientY;
  
  const elRect = el.getBoundingClientRect();
  initialCenterX = elRect.left + elRect.width / 2;
  initialCenterY = elRect.top + elRect.height / 2;
  
  initialLeft = parseFloat(el.style.left) || 50;
  initialTop = parseFloat(el.style.top) || 50;
  
  let wVal = parseFloat(el.style.width);
  if (isNaN(wVal) || !el.style.width.includes('%')) {
    wVal = (el.offsetWidth / containerRect.width) * 100;
  }
  initialWidth = wVal;
  
  let hVal = parseFloat(el.style.height);
  if (isNaN(hVal) || !el.style.height.includes('%')) {
    hVal = (el.offsetHeight / containerRect.height) * 100;
  }
  initialHeight = hVal;
  
  const rotStr = el.style.getPropertyValue('--rot') || '0deg';
  initialRot = parseFloat(rotStr.replace('deg', '')) || 0;
  
  if (e.type === 'touchstart') {
    document.addEventListener('touchmove', onTransformSpace, {passive: false});
    document.addEventListener('touchend', stopTransformSpace);
  } else {
    document.addEventListener('mousemove', onTransformSpace);
    document.addEventListener('mouseup', stopTransformSpace);
  }
}

function onTransformSpace(e) {
  if (!draggedSpaceId || !activeTransformElement) return;
  e.preventDefault();
  
  const currentX = e.touches ? e.touches[0].clientX : e.clientX;
  const currentY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const container = document.getElementById('floor-plan-container');
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  
  const dx = currentX - transformStartX;
  const dy = currentY - transformStartY;
  const dxPercent = (dx / containerRect.width) * 100;
  const dyPercent = (dy / containerRect.height) * 100;
  
  if (transformAction === 'drag') {
    let newLeft = initialLeft + dxPercent;
    let newTop = initialTop + dyPercent;
    newLeft = Math.max(0, Math.min(100, newLeft));
    newTop = Math.max(0, Math.min(100, newTop));
    activeTransformElement.style.left = `${newLeft}%`;
    activeTransformElement.style.top = `${newTop}%`;
  } else if (transformAction === 'rotate') {
    const angleRad = Math.atan2(currentY - initialCenterY, currentX - initialCenterX);
    let angleDeg = Math.round((angleRad * 180 / Math.PI) + 90);
    if (angleDeg < 0) angleDeg += 360;
    angleDeg = angleDeg % 360;
    
    activeTransformElement.style.setProperty('--rot', `${angleDeg}deg`);
    
    const rotInput = document.getElementById('input-rot');
    const rotVal = document.getElementById('val-rot');
    if (rotInput) rotInput.value = angleDeg;
    if (rotVal) rotVal.textContent = angleDeg + '°';
  } else if (transformAction.startsWith('resize-')) {
    const isW = transformAction.includes('w');
    const isE = transformAction.includes('e');
    const isN = transformAction.includes('n');
    const isS = transformAction.includes('s');
    
    const rotRad = initialRot * Math.PI / 180;
    const px = currentX - initialCenterX;
    const py = currentY - initialCenterY;
    const localX = px * Math.cos(-rotRad) - py * Math.sin(-rotRad);
    const localY = px * Math.sin(-rotRad) + py * Math.cos(-rotRad);
    
    let newWidth = initialWidth;
    let newHeight = initialHeight;
    
    if (isE || isW) {
      newWidth = (Math.abs(localX) * 2 / containerRect.width) * 100;
    }
    if (isN || isS) {
      newHeight = (Math.abs(localY) * 2 / containerRect.height) * 100;
    }
    
    newWidth = Math.max(2, Math.min(100, newWidth));
    newHeight = Math.max(1, Math.min(100, newHeight));
    
    activeTransformElement.style.width = `${newWidth}%`;
    activeTransformElement.style.height = `${newHeight}%`;
  }
}

function stopTransformSpace(e) {
  if (!draggedSpaceId) return;
  
  if (e.type === 'touchend') {
    document.removeEventListener('touchmove', onTransformSpace);
    document.removeEventListener('touchend', stopTransformSpace);
  } else {
    document.removeEventListener('mousemove', onTransformSpace);
    document.removeEventListener('mouseup', stopTransformSpace);
  }
  
  if (activeTransformElement) {
    activeTransformElement.classList.remove('is-transforming');
    
    const newLeft = parseFloat(activeTransformElement.style.left);
    const newTop = parseFloat(activeTransformElement.style.top);
    const newWidth = parseFloat(activeTransformElement.style.width);
    const newHeight = parseFloat(activeTransformElement.style.height);
    const rotStr = activeTransformElement.style.getPropertyValue('--rot');
    const newRot = parseFloat(rotStr.replace('deg', '')) || 0;
    
    let space = window.mockData.spaces.find(s => s.id === draggedSpaceId);
    let designEl = window.mockData.designElements ? window.mockData.designElements.find(d => d.id === draggedSpaceId) : null;
    
    if (space) {
      if (!isNaN(newLeft)) space.x = Math.round(newLeft * 100) / 100;
      if (!isNaN(newTop)) space.y = Math.round(newTop * 100) / 100;
      if (!isNaN(newWidth)) space.width = Math.round(newWidth * 100) / 100;
      if (!isNaN(newHeight)) space.height = Math.round(newHeight * 100) / 100;
      space.rotation = newRot;
    } else if (designEl) {
      if (!isNaN(newLeft)) designEl.x = Math.round(newLeft * 100) / 100;
      if (!isNaN(newTop)) designEl.y = Math.round(newTop * 100) / 100;
      if (!isNaN(newWidth)) designEl.width = Math.round(newWidth * 100) / 100;
      if (!isNaN(newHeight)) designEl.height = Math.round(newHeight * 100) / 100;
      designEl.rotation = newRot;
    }
    if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
  }
  
  draggedSpaceId = null;
}
function renderSpaceTable(spaces, role) {
  const tbody = document.getElementById('ge-table-body');
  tbody.innerHTML = spaces.map(s => `<tr>
    <td data-label="ID"><strong>${s.id}</strong></td>
    <td data-label="Tipo">${s.type}</td>
    <td data-label="Estado">${SP_Components.renderBadge(s.status)}</td>
    <td data-label="Reservable">${s.reservable ? '✓' : '✗'}</td>
    <td data-label="Placa">${s.plate || '—'}</td>
    <td data-label="Acciones">${role !== 'user' ? `<button class="btn btn-sm btn-ghost" onclick="toggleBlock('${s.id}')"><span class="material-symbols-outlined">block</span></button>` : '—'}</td>
  </tr>`).join('');
}
function showSpaceDetail(id) {
  if (isEditMapMode && window.currentRole !== 'user') {
    openEditorPanel(id);
    return;
  }
  
  const s = window.mockData.spaces.find(x => x.id === id);
  if (!s) return; // Ignorar si es un elemento de diseño en modo lectura
  document.querySelectorAll('.space-cell').forEach(c => c.classList.remove('selected'));
  document.getElementById(`space-cell-${id}`)?.classList.add('selected');
  const res = window.mockData.reservations.find(r => r.spaceId === id && ['active','occupied'].includes(r.status));
  document.getElementById('ge-detail').innerHTML = `
    <div class="mb-md"><span class="text-sm fw-600">Espacio:</span> <strong>${s.id}</strong></div>
    <div class="mb-md"><span class="text-sm fw-600">Tipo:</span> ${s.type}</div>
    <div class="mb-md"><span class="text-sm fw-600">Estado:</span> ${SP_Components.renderBadge(s.status)}</div>
    <div class="mb-md"><span class="text-sm fw-600">Reservable:</span> ${s.reservable ? 'Sí' : 'No'}</div>
    ${s.details ? `<div class="mb-md"><span class="text-sm fw-600">Detalles:</span> <p class="text-sm" style="margin-top:4px;">${s.details}</p></div>` : ''}
    ${res ? `<div class="mb-sm"><span class="text-sm fw-600">Reserva:</span> ${res.code}</div>` : ''}
    ${s.blockReason ? `<div class="mb-sm"><span class="text-sm fw-600">Motivo bloqueo:</span> ${s.blockReason}</div>` : ''}
  `;
}
// RF36
function toggleBlock(id) {
  const s = window.mockData.spaces.find(sp => sp.id === id);
  if (!s) return;
  if (s.status === 'blocked') { s.status = 'available'; s.blockReason = ''; SP_Components.showToast('success','Desbloqueado',`Espacio ${id} desbloqueado`); }
  else if (s.status === 'available') { s.status = 'blocked'; s.blockReason = 'Mantenimiento'; SP_Components.showToast('warning','Bloqueado',`Espacio ${id} bloqueado por mantenimiento`); }
  else { SP_Components.showToast('warning','No disponible','Solo se pueden bloquear espacios disponibles'); return; }
  if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
  initGestionEspacios();
}
function addNewSpace() {
  const id = document.getElementById('new-space-id').value;
  const type = document.getElementById('new-space-type').value;
  const details = document.getElementById('new-space-details').value;
  const reservable = document.getElementById('new-space-reservable').checked;
  if (!id) { SP_Components.showToast('warning','Requerido','Ingresa un ID'); return; }
  const localId = window.mockData.currentUser.localId || 1;
  window.mockData.spaces.push({ id, localId, type, details, status: 'available', reservable, x: 50, y: 50, rotation: 0, scale: 1 });
  if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
  SP_Components.closeModal('modal-add-space');
  initGestionEspacios();
  SP_Components.showToast('success','Espacio agregado',`${id} fue creado exitosamente`);
}

/* ── MAP EDITOR CONTROLS ──────────────────────────────────── */
let editingSpaceId = null;

function openEditorPanel(id) {
  if (window.currentRole === 'user') return;
  editingSpaceId = id;
  let s = window.mockData.spaces.find(x => x.id === id);
  let isDesign = false;
  
  if (!s && window.mockData.designElements) {
    s = window.mockData.designElements.find(x => x.id === id);
    isDesign = !!s;
  }
  
  if (!s) return;
  
  document.querySelectorAll('.space-cell, .design-cell').forEach(c => c.classList.remove('selected'));
  document.getElementById(`space-cell-${id}`)?.classList.add('selected');
  document.getElementById(`design-cell-${id}`)?.classList.add('selected');
  
  const rot = s.rotation || 0;
  const scl = s.scale || 1.0;
  
  const defaultColors = {
    'available': '#22c55e',
    'occupied': '#ef4444',
    'reserved': '#f59e0b',
    'blocked': '#94a3b8'
  };
  const currentColor = s.customColor || defaultColors[s.status] || '#22c55e';
  
  if (isDesign) {
    document.getElementById('ge-detail').innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; margin-bottom: 16px;">
        <h4 style="margin:0; border:none; padding:0; font-size:1.1rem;">Editar <span style="color:var(--c3)">${s.type === 'text' ? 'Texto' : 'Pared'}</span></h4>
        <button class="btn btn-icon text-danger" onclick="deleteEditingSpace()" title="Eliminar" style="padding:4px;"><span class="material-symbols-outlined">delete</span></button>
      </div>
      ${s.type === 'text' ? `
        <div class="form-group mb-sm">
          <label style="font-size:0.85rem; margin-bottom:4px;">Contenido del Texto</label>
          <input type="text" id="input-edit-text" class="form-control" value="${s.text}" oninput="updateSpaceTransform()">
        </div>
      ` : ''}
      <div class="form-group mb-sm">
        <label style="font-size:0.85rem; margin-bottom:4px;">Color</label>
        <input type="color" id="input-edit-design-color" value="${s.color || '#000000'}" style="width: 100%; height: 35px; padding: 0; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer;" oninput="updateSpaceTransform()">
      </div>
      <h5 style="margin-top:16px; margin-bottom:12px; font-size:0.9rem; border-bottom:1px solid var(--color-border); padding-bottom:4px;">Ajuste en el Mapa</h5>
      <div class="form-group mb-sm">
        <label style="display:flex; justify-content:space-between; font-size:0.85rem;">Rotación <span id="val-rot" class="text-primary">${rot}°</span></label>
        <input type="range" id="input-rot" min="0" max="360" value="${rot}" oninput="updateSpaceTransform()" style="width:100%; accent-color:var(--c3);">
      </div>
      <div class="form-group mb-lg">
        <label style="display:flex; justify-content:space-between; font-size:0.85rem;">Escala <span id="val-scl" class="text-primary">${parseFloat(scl).toFixed(1)}x</span></label>
        <input type="range" id="input-scl" min="0.5" max="5.0" step="0.1" value="${scl}" oninput="updateSpaceTransform()" style="width:100%; accent-color:var(--c3);">
      </div>
    `;
    return;
  }
  
  document.getElementById('ge-detail').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; margin-bottom: 16px;">
      <h4 style="margin:0; border:none; padding:0; font-size:1.1rem;">Editar <span style="color:var(--c3)">${id}</span></h4>
      <button class="btn btn-icon text-danger" onclick="deleteEditingSpace()" title="Eliminar Espacio" style="padding:4px;"><span class="material-symbols-outlined">delete</span></button>
    </div>
    
    <div class="form-group mb-sm">
      <label style="font-size:0.85rem; margin-bottom:4px;">ID del Espacio</label>
      <input type="text" id="input-edit-id" class="form-control" value="${s.id}">
    </div>
    
    <div class="form-group mb-sm">
      <label style="font-size:0.85rem; margin-bottom:4px;">Tipo de Vehículo</label>
      <select id="input-edit-type" class="form-control">
        <option value="Automóvil" ${s.type === 'Automóvil' ? 'selected' : ''}>Automóvil</option>
        <option value="Motocicleta" ${s.type === 'Motocicleta' ? 'selected' : ''}>Motocicleta</option>
        <option value="Camioneta" ${s.type === 'Camioneta' ? 'selected' : ''}>Camioneta</option>
        <option value="Bicicleta" ${s.type === 'Bicicleta' ? 'selected' : ''}>Bicicleta</option>
      </select>
    </div>
    
    <div class="form-group mb-sm">
      <label style="font-size:0.85rem; margin-bottom:4px;">Estado</label>
      <select id="input-edit-status" class="form-control" onchange="window.handleStatusChange(this.value)">
        <option value="available" ${s.status === 'available' ? 'selected' : ''}>Disponible</option>
        <option value="occupied" ${s.status === 'occupied' ? 'selected' : ''}>Ocupado</option>
        <option value="reserved" ${s.status === 'reserved' ? 'selected' : ''}>Reservado</option>
        <option value="blocked" ${s.status === 'blocked' ? 'selected' : ''}>Mantenimiento / Bloqueado</option>
      </select>
    </div>
    
    <div class="form-group mb-sm">
      <label style="font-size:0.85rem; margin-bottom:4px;">Color Personalizado</label>
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="color" id="input-edit-color" value="${currentColor}" style="width: 50px; height: 35px; padding: 0; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer;">
        <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="document.getElementById('input-edit-color').value = window.getDefaultColor(document.getElementById('input-edit-status').value)">Usar Default</button>
      </div>
    </div>
    
    <div class="form-group mb-sm">
      <label style="font-size:0.85rem; margin-bottom:4px;">Detalles / Descripción</label>
      <textarea id="input-edit-details" class="form-control" rows="2">${s.details || ''}</textarea>
    </div>
    
    <div class="form-group mb-md" style="display:flex; align-items:center; gap:8px;">
      <input type="checkbox" id="input-edit-reservable" ${s.reservable !== false ? 'checked' : ''}> 
      <label style="margin:0; font-size:0.85rem; font-weight:600;">¿Es Reservable?</label>
    </div>
    
    <div class="form-group mb-md" style="display:flex; align-items:center; gap:8px; background: rgba(25,118,210,0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(25,118,210,0.2);">
      <input type="checkbox" id="input-edit-shade" ${s.shade ? 'checked' : ''} onchange="updateSpaceTransform()"> 
      <label style="margin:0; font-size:0.85rem; font-weight:600; color: #1976d2; display:flex; align-items:center; gap:4px;">
        <span class="material-symbols-outlined" style="font-size:1.1rem;">roofing</span> ¿Tiene Techo / Sombra?
      </label>
    </div>
    
    <h5 style="margin-top:16px; margin-bottom:12px; font-size:0.9rem; border-bottom:1px solid var(--color-border); padding-bottom:4px;">Ajuste en el Mapa</h5>
    <div class="form-group mb-sm">
      <label style="display:flex; justify-content:space-between; font-size:0.85rem;">Rotación <span id="val-rot" class="text-primary">${rot}°</span></label>
      <input type="range" id="input-rot" min="0" max="360" value="${rot}" oninput="updateSpaceTransform()" style="width:100%; accent-color:var(--c3);">
    </div>
    <div class="form-group mb-lg">
      <label style="display:flex; justify-content:space-between; font-size:0.85rem;">Tamaño <span id="val-scl" class="text-primary">${parseFloat(scl).toFixed(1)}x</span></label>
      <input type="range" id="input-scl" min="0.5" max="2.0" step="0.1" value="${scl}" oninput="updateSpaceTransform()" style="width:100%; accent-color:var(--c3);">
    </div>
    
    <div style="text-align:right; margin-top: 24px;">
      <button class="btn btn-primary" onclick="saveEditingSpace()" style="width:100%;">Guardar Cambios</button>
    </div>
  `;
}

window.getDefaultColor = function(status) {
  const dc = { 'available': '#22c55e', 'occupied': '#ef4444', 'reserved': '#f59e0b', 'blocked': '#94a3b8' };
  return dc[status] || '#22c55e';
};

window.handleStatusChange = function(newStatus) {
  if(newStatus==='available') document.getElementById('input-edit-reservable').checked=true; 
  else if(newStatus==='blocked') document.getElementById('input-edit-reservable').checked=false;
  
  // Opcional: auto-actualizar el color al cambiar estado
  document.getElementById('input-edit-color').value = window.getDefaultColor(newStatus);
};

function updateSpaceTransform() {
  if (!editingSpaceId) return;
  let s = window.mockData.spaces.find(x => x.id === editingSpaceId);
  let isDesign = false;
  if (!s && window.mockData.designElements) {
    s = window.mockData.designElements.find(x => x.id === editingSpaceId);
    isDesign = !!s;
  }
  if (!s) return;
  
  const rot = document.getElementById('input-rot').value;
  const scl = document.getElementById('input-scl').value;
  
  document.getElementById('val-rot').textContent = rot + '°';
  document.getElementById('val-scl').textContent = parseFloat(scl).toFixed(1) + 'x';
  
  s.rotation = rot;
  s.scale = scl;
  
  if (isDesign) {
    const c = document.getElementById('input-edit-design-color')?.value;
    if (c) s.color = c;
    if (s.type === 'text') {
      const txt = document.getElementById('input-edit-text')?.value;
      if (txt) s.text = txt;
    }
    const cell = document.getElementById(`design-cell-${editingSpaceId}`);
    if (cell) {
      cell.style.setProperty('--rot', rot + 'deg');
      cell.style.setProperty('--scl', scl);
      if (s.type === 'text') {
        cell.style.color = s.color;
        cell.textContent = s.text;
      } else {
        cell.style.backgroundColor = s.color;
      }
    }
    return;
  }

  const shadeChecked = document.getElementById('input-edit-shade')?.checked || false;
  s.shade = shadeChecked;
  
  const cell = document.getElementById(`space-cell-${editingSpaceId}`);
  if (cell) {
    cell.style.setProperty('--rot', rot + 'deg');
    cell.style.setProperty('--scl', scl);
    cell.classList.toggle('shaded', shadeChecked);
  }
  if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
}

function saveEditingSpace() {
  if (!editingSpaceId) return;
  // If it's a design element, it auto-saves via updateSpaceTransform, but we can just clear panel.
  if (window.mockData.designElements?.find(x => x.id === editingSpaceId)) {
    document.getElementById('ge-detail').innerHTML = '<p class="text-sm text-muted">Selecciona un elemento para ver su detalle.</p>';
    if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
    SP_Components.showToast('success', 'Guardado', 'Elemento actualizado');
    initGestionEspacios();
    return;
  }
  
  const s = window.mockData.spaces.find(x => x.id === editingSpaceId);
  if (!s) return;
  
  const newId = document.getElementById('input-edit-id').value.trim();
  const newType = document.getElementById('input-edit-type').value;
  const newStatus = document.getElementById('input-edit-status').value;
  const newReservable = document.getElementById('input-edit-reservable').checked;
  const newShade = document.getElementById('input-edit-shade')?.checked || false;
  const newColor = document.getElementById('input-edit-color').value;
  
  const newDetails = document.getElementById('input-edit-details').value.trim();
  
  if (!newId) {
    SP_Components.showToast('warning', 'Error', 'El ID del espacio no puede estar vacío');
    return;
  }
  
  // Check if ID changed and already exists
  if (newId !== editingSpaceId && window.mockData.spaces.find(x => x.id === newId)) {
    SP_Components.showToast('warning', 'Error', 'Ya existe un espacio con ese ID');
    return;
  }
  
  s.id = newId;
  s.type = newType;
  s.status = newStatus;
  s.reservable = newReservable;
  s.shade = newShade;
  s.details = newDetails;
  
  if (newColor && newColor.toLowerCase() !== window.getDefaultColor(newStatus).toLowerCase()) {
    s.customColor = newColor;
  } else {
    delete s.customColor;
  }
  
  if (newStatus === 'blocked') s.blockReason = 'Mantenimiento';
  else if (s.blockReason) s.blockReason = '';
  
  clearTransformBox();
  editingSpaceId = null;
  document.getElementById('ge-detail').innerHTML = '<p class="text-sm text-muted">Selecciona un espacio para ver su detalle.</p>';
  if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
  SP_Components.showToast('success', 'Guardado', 'Detalles del espacio actualizados');
  initGestionEspacios();
}

function deleteEditingSpace() {
  if (!editingSpaceId) return;
  if (!confirm(`¿Estás seguro de eliminar este elemento?`)) return;
  
  let sIdx = window.mockData.spaces.findIndex(x => x.id === editingSpaceId);
  if (sIdx > -1) {
    window.mockData.spaces.splice(sIdx, 1);
  } else if (window.mockData.designElements) {
    let dIdx = window.mockData.designElements.findIndex(x => x.id === editingSpaceId);
    if (dIdx > -1) window.mockData.designElements.splice(dIdx, 1);
  }
  
  clearTransformBox();
  editingSpaceId = null;
  document.getElementById('ge-detail').innerHTML = '<p class="text-sm text-muted">Selecciona un elemento para ver su detalle.</p>';
  if (window.mockData?.saveToStorage) window.mockData.saveToStorage();
  SP_Components.showToast('success', 'Eliminado', 'El elemento fue eliminado exitosamente');
  initGestionEspacios();
}

