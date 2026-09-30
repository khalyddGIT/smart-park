import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Check,
  Copy,
  Grid,
  RotateCw,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Button } from './ui/button';

const SLOT_TYPES = [
  { id: 'standard', label: 'Estándar', color: '#10b981' },
  { id: 'moto', label: 'Motocicleta', color: '#f59e0b' },
  { id: 'covered', label: 'Techado', color: '#06b6d4' }
];

export const CarParkZoneEditor = ({
  backgroundImage,
  initialSlots = [],
  onSave,
  onClose,
  parkingName = 'Estacionamiento'
}) => {
  // Dimensiones dinámicas del lienzo para ajustarse exactamente al mapa / foto
  const [canvasDimensions, setCanvasDimensions] = useState({ w: 1200, h: 750 });
  const [bgImageObj, setBgImageObj] = useState(null);

  // Inicializar plazas garantizando un margen seguro para que ninguna quede cortada arriba
  const [slots, setSlots] = useState(() => {
    return initialSlots.map((s, idx) => ({
      id: s.id || `slot_${Date.now()}_${idx}`,
      code: s.code || `P-${idx + 1}`,
      x: typeof s.x === 'number' ? Math.max(20, Math.min(1120, s.x)) : 60 + (idx % 8) * 110,
      y: typeof s.y === 'number' ? Math.max(28, Math.min(680, s.y)) : 60 + Math.floor(idx / 8) * 120,
      w: s.w || 95,
      h: s.h || 48,
      rot: s.rot || 0,
      slotType: s.slotType || 'standard',
      status: s.status || 'free',
      type: 'slot'
    }));
  });

  const [rectWidth, setRectWidth] = useState(95);
  const [rectHeight, setRectHeight] = useState(48);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [selectedType, setSelectedType] = useState('standard');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(15);
  const [history, setHistory] = useState([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoverPos, setHoverPos] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Zoom y auto-escala para ver el mapa 100% completo en cualquier monitor
  const [zoom, setZoom] = useState(1);
  const [autoScale, setAutoScale] = useState(1);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);

  // Carga y adaptación de la imagen de fondo
  useEffect(() => {
    if (!backgroundImage) {
      setCanvasDimensions({ w: 1200, h: 750 });
      setBgImageObj(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || 1200;
      const nh = img.naturalHeight || 750;
      const aspect = nw / nh;
      const targetW = 1200;
      const targetH = Math.round(targetW / aspect);
      // Rango de altura cómodo para trabajar
      setCanvasDimensions({ w: targetW, h: Math.max(620, Math.min(950, targetH)) });
      setBgImageObj(img);
    };
    img.onerror = () => {
      setCanvasDimensions({ w: 1200, h: 750 });
      setBgImageObj(null);
    };
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Cálculo del factor de escala para que TODO el mapa quepa sin scrollbar
  const updateFitScale = useCallback(() => {
    if (!viewportRef.current) return;
    const vpW = viewportRef.current.clientWidth - 48;
    const vpH = viewportRef.current.clientHeight - 48;
    if (vpW <= 0 || vpH <= 0) return;
    const scaleX = vpW / canvasDimensions.w;
    const scaleY = vpH / canvasDimensions.h;
    const fit = Math.min(scaleX, scaleY, 1.25);
    setAutoScale(Math.max(0.25, fit));
  }, [canvasDimensions]);

  useEffect(() => {
    updateFitScale();
    const handleResize = () => updateFitScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateFitScale]);

  const showToast = useCallback((text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    const timer = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timer);
  }, []);

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev, JSON.parse(JSON.stringify(slots))];
      if (next.length > 35) next.shift();
      return next;
    });
  }, [slots]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) {
      showToast('Nada que deshacer', 'warn');
      return;
    }
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setSlots(previous);
    setSelectedSlotIndex(null);
    showToast('Deshecho último cambio', 'info');
  }, [history, showToast]);

  const handleClear = () => {
    if (slots.length === 0) return;
    if (window.confirm('¿Deseas limpiar todas las plazas del plano?')) {
      pushHistory();
      setSlots([]);
      setSelectedSlotIndex(null);
      showToast('Plano de plazas limpiado', 'warn');
    }
  };

  const snapVal = (val) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  // Duplicar plaza seleccionada
  const handleDuplicateSelected = () => {
    if (selectedSlotIndex === null || !slots[selectedSlotIndex]) {
      showToast('Selecciona una plaza primero para duplicarla', 'warn');
      return;
    }
    pushHistory();
    const source = slots[selectedSlotIndex];
    const newSlot = {
      ...JSON.parse(JSON.stringify(source)),
      id: `slot_${Date.now()}`,
      code: `P-${slots.length + 1}`,
      x: snapVal(Math.min(canvasDimensions.w - source.w - 15, source.x + source.w + 12)),
      y: snapVal(Math.min(canvasDimensions.h - source.h - 15, source.y))
    };
    setSlots((prev) => [...prev, newSlot]);
    setSelectedSlotIndex(slots.length);
    showToast(`Plaza ${newSlot.code} duplicada`, 'success');
  };

  // Generar fila automática de N plazas
  const handleGenerateRow = () => {
    const count = parseInt(prompt('¿Cuántas plazas deseas agregar en esta fila?', '4'), 10);
    if (!count || isNaN(count) || count < 1) return;
    pushHistory();

    const startX = 60;
    const startY = 80 + (slots.length % 5) * 110;
    const newSlots = [];

    for (let i = 0; i < count; i++) {
      newSlots.push({
        id: `slot_${Date.now()}_${i}`,
        code: `P-${slots.length + i + 1}`,
        x: snapVal(Math.min(canvasDimensions.w - rectWidth - 20, startX + i * (rectWidth + 12))),
        y: snapVal(Math.min(canvasDimensions.h - rectHeight - 20, startY)),
        w: rectWidth,
        h: rectHeight,
        rot: currentRotation,
        slotType: selectedType,
        status: 'free',
        type: 'slot'
      });
    }

    setSlots((prev) => [...prev, ...newSlots]);
    showToast(`Fila de ${count} plazas creada`, 'success');
  };

  // Rotar plaza seleccionada o rotación global (0°, 45°, 90°, etc)
  const handleRotate = (angleDelta = 45) => {
    pushHistory();
    if (selectedSlotIndex !== null && slots[selectedSlotIndex]) {
      setSlots((prev) =>
        prev.map((s, i) =>
          i === selectedSlotIndex ? { ...s, rot: (s.rot + angleDelta) % 360 } : s
        )
      );
      const newRot = (slots[selectedSlotIndex].rot + angleDelta) % 360;
      showToast(`Plaza ${slots[selectedSlotIndex].code} rotada a ${newRot}°`, 'info');
    } else {
      const nextRot = (currentRotation + angleDelta) % 360;
      setCurrentRotation(nextRot);
      showToast(`Ángulo por defecto: ${nextRot}°`, 'info');
    }
  };

  // Ajustar tamaño (+ TAM / - TAM)
  const handleResize = (deltaW, deltaH) => {
    pushHistory();
    const newW = Math.max(30, rectWidth + deltaW);
    const newH = Math.max(20, rectHeight + deltaH);
    setRectWidth(newW);
    setRectHeight(newH);

    if (selectedSlotIndex !== null) {
      setSlots((prev) =>
        prev.map((s, i) => (i === selectedSlotIndex ? { ...s, w: newW, h: newH } : s))
      );
      showToast(`Tamaño ajustado: ${newW}x${newH}px`, 'info');
    } else {
      setSlots((prev) => prev.map((s) => ({ ...s, w: newW, h: newH })));
      showToast(`Plazas redimensionadas: ${newW}x${newH}px`, 'info');
    }
  };

  // Cambiar tipo de plaza seleccionada
  const handleChangeType = (typeId) => {
    setSelectedType(typeId);
    if (selectedSlotIndex !== null) {
      pushHistory();
      setSlots((prev) =>
        prev.map((s, i) => (i === selectedSlotIndex ? { ...s, slotType: typeId } : s))
      );
      showToast(`Tipo cambiado a ${SLOT_TYPES.find((t) => t.id === typeId)?.label}`, 'info');
    }
  };

  // Atajos de Teclado (Ctrl+C, Ctrl+V, Delete, Ctrl+Z, R)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedSlotIndex !== null && slots[selectedSlotIndex]) {
          setClipboard(JSON.parse(JSON.stringify(slots[selectedSlotIndex])));
          showToast('Plaza copiada', 'info');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard) {
          pushHistory();
          const newSlot = {
            ...JSON.parse(JSON.stringify(clipboard)),
            id: `slot_${Date.now()}`,
            code: `P-${slots.length + 1}`,
            x: snapVal(Math.max(20, Math.min(canvasDimensions.w - clipboard.w - 15, clipboard.x + 20))),
            y: snapVal(Math.max(25, Math.min(canvasDimensions.h - clipboard.h - 15, clipboard.y + 20)))
          };
          setSlots((prev) => [...prev, newSlot]);
          setSelectedSlotIndex(slots.length);
          showToast('Plaza pegada', 'success');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSlotIndex !== null) {
          pushHistory();
          setSlots((prev) => prev.filter((_, i) => i !== selectedSlotIndex));
          setSelectedSlotIndex(null);
          showToast('Plaza eliminada', 'warn');
        }
      } else if (e.key.toLowerCase() === 'r') {
        handleRotate(45);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, selectedSlotIndex, slots, clipboard, pushHistory, showToast, canvasDimensions]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDimensions.w / rect.width;
    const scaleY = canvasDimensions.h / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  const hitTest = (x, y) => {
    for (let i = slots.length - 1; i >= 0; i--) {
      const s = slots[i];
      const w = s.w || rectWidth;
      const h = s.h || rectHeight;
      if (x >= s.x && x <= s.x + w && y >= s.y && y <= s.y + h) {
        return i;
      }
    }
    return -1;
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);
    const hitIdx = hitTest(x, y);

    if (hitIdx >= 0) {
      pushHistory();
      setSelectedSlotIndex(hitIdx);
      setIsDragging(true);
      setDragOffset({
        x: x - slots[hitIdx].x,
        y: y - slots[hitIdx].y
      });
    } else {
      pushHistory();
      const newX = snapVal(Math.max(20, Math.min(canvasDimensions.w - rectWidth - 20, x - Math.floor(rectWidth / 2))));
      const newY = snapVal(Math.max(25, Math.min(canvasDimensions.h - rectHeight - 20, y - Math.floor(rectHeight / 2))));

      const newSlot = {
        id: `slot_${Date.now()}`,
        code: `P-${slots.length + 1}`,
        x: newX,
        y: newY,
        w: rectWidth,
        h: rectHeight,
        rot: currentRotation,
        slotType: selectedType,
        status: 'free',
        type: 'slot'
      };
      setSlots((prev) => [...prev, newSlot]);
      setSelectedSlotIndex(slots.length);
      setIsDragging(true);
      setDragOffset({ x: Math.floor(rectWidth / 2), y: Math.floor(rectHeight / 2) });
      showToast(`Plaza P-${slots.length + 1} colocada`, 'success');
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoords(e);
    setHoverPos({ x, y });

    if (isDragging && selectedSlotIndex !== null) {
      const targetW = slots[selectedSlotIndex]?.w || rectWidth;
      const targetH = slots[selectedSlotIndex]?.h || rectHeight;
      const newX = snapVal(Math.max(15, Math.min(canvasDimensions.w - targetW - 15, x - dragOffset.x)));
      const newY = snapVal(Math.max(20, Math.min(canvasDimensions.h - targetH - 20, y - dragOffset.y)));

      setSlots((prev) =>
        prev.map((s, i) => (i === selectedSlotIndex ? { ...s, x: newX, y: newY } : s))
      );
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const hitIdx = hitTest(x, y);
    if (hitIdx >= 0) {
      pushHistory();
      const removedCode = slots[hitIdx].code;
      setSlots((prev) => prev.filter((_, i) => i !== hitIdx));
      setSelectedSlotIndex(null);
      showToast(`Plaza ${removedCode} eliminada`, 'warn');
    }
  };

  // Renderizado optimizado sobre Canvas HTML5
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasDimensions.w, canvasDimensions.h);

    // 1. Fondo fotográfico o arquitectónico
    if (bgImageObj) {
      ctx.drawImage(bgImageObj, 0, 0, canvasDimensions.w, canvasDimensions.h);
      // Sutil oscurecimiento para maximizar el contraste de las plazas sin ocultar el suelo
      ctx.fillStyle = 'rgba(10, 15, 29, 0.22)';
      ctx.fillRect(0, 0, canvasDimensions.w, canvasDimensions.h);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasDimensions.w, canvasDimensions.h);
    }

    // 2. Rejilla magnética discreta
    if (snapToGrid) {
      ctx.strokeStyle = bgImageObj ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasDimensions.w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasDimensions.h);
        ctx.stroke();
      }
      for (let y = 0; y < canvasDimensions.h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasDimensions.w, y);
        ctx.stroke();
      }
    }

    // 3. Dibujo de cada plaza de estacionamiento (Limpio, elegante, sin parches toscos)
    slots.forEach((s, idx) => {
      const isSelected = idx === selectedSlotIndex;
      const w = s.w || rectWidth;
      const h = s.h || rectHeight;
      const rot = s.rot || 0;
      const typeObj = SLOT_TYPES.find((t) => t.id === s.slotType) || SLOT_TYPES[0];

      ctx.save();
      ctx.translate(s.x + w / 2, s.y + h / 2);
      if (rot) ctx.rotate((rot * Math.PI) / 180);

      const baseColor = s.status === 'occupied' ? '#f43f5e' : typeObj.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? '#38bdf8' : baseColor;

      // Relleno suave y translúcido
      ctx.fillStyle = isSelected
        ? 'rgba(56, 189, 248, 0.22)'
        : s.status === 'occupied'
        ? 'rgba(244, 63, 94, 0.22)'
        : `${baseColor}22`;

      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.stroke();

      // Indicadores de selección refinados
      if (isSelected) {
        const hw = w / 2;
        const hh = h / 2;
        ctx.fillStyle = '#38bdf8';
        [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Etiqueta del código de plaza (Limpia y legible)
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const codeText = String(s.code || '');
      const textMetrics = ctx.measureText(codeText);
      const textW = textMetrics.width + 10;
      const textH = 18;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-textW / 2, -textH / 2, textW, textH, 4);
      ctx.fill();

      ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
      ctx.fillText(codeText, 0, 0);

      ctx.restore();
    });

    // 4. Vista previa fantasma al mover el mouse
    if (hoverPos && !isDragging) {
      const hitIdx = hitTest(hoverPos.x, hoverPos.y);
      if (hitIdx === -1) {
        ctx.save();
        const hx = snapVal(hoverPos.x);
        const hy = snapVal(hoverPos.y);
        ctx.translate(hx, hy);
        if (currentRotation) ctx.rotate((currentRotation * Math.PI) / 180);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [slots, selectedSlotIndex, hoverPos, isDragging, rectWidth, rectHeight, currentRotation, snapToGrid, gridSize, canvasDimensions, bgImageObj]);

  const handleSaveAll = () => {
    if (onSave) {
      onSave(slots);
    }
    showToast(`¡Se guardaron ${slots.length} plazas correctamente!`, 'success');
    if (onClose) setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[1500px] h-[96vh] flex flex-col overflow-hidden">
        
        {/* Cabecera Limpia y Despejada */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                Distribución de Plazas • {parkingName}
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate">
                Organiza y acomoda las plazas de estacionamiento sobre el plano o foto de la sede.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800">
              {slots.length} plazas
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              title="Cerrar organizador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zona Principal del Canvas (Ajustada para ver el mapa 100% completo) */}
        <div
          ref={viewportRef}
          className="relative flex-1 bg-[#070b14] flex items-center justify-center p-3 sm:p-5 overflow-auto select-none"
        >
          <div
            style={{
              width: `${canvasDimensions.w}px`,
              height: `${canvasDimensions.h}px`,
              transform: `scale(${autoScale * zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.12s ease-out'
            }}
            className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shrink-0"
          >
            <canvas
              ref={canvasRef}
              width={canvasDimensions.w}
              height={canvasDimensions.h}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              className="w-full h-full cursor-crosshair touch-none block"
            />

            {/* Notificación flotante sutil */}
            {message && (
              <div
                className={`absolute top-3 right-3 z-20 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide shadow-lg border backdrop-blur-md animate-in fade-in zoom-in-95 ${
                  messageType === 'success'
                    ? 'bg-emerald-500/90 text-slate-950 border-emerald-400'
                    : messageType === 'warn'
                    ? 'bg-rose-500/90 text-white border-rose-400'
                    : 'bg-blue-600/90 text-white border-blue-400'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Herramientas Inferior Limpia y Ejecutiva */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* Izquierda: Selector de Categoría Segmentado */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {SLOT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleChangeType(type.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedType === type.id
                    ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {/* Centro: Herramientas de Edición */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateRow}
              className="bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
              title="Crea una fila de plazas contiguas"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fila Rápida</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDuplicateSelected}
              disabled={selectedSlotIndex === null}
              className="bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold h-9 px-3 rounded-xl gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Duplica la plaza seleccionada (Ctrl+C / Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duplicar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate(45)}
              className="bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
              title="Gira la orientación 45 grados (Tecla R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Girar 45°</span>
            </Button>

            {/* Stepper de Tamaño */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 h-9 gap-1.5 text-slate-400">
              <span className="text-[11px] font-medium mr-0.5">Tamaño:</span>
              <button
                type="button"
                onClick={() => handleResize(-5, -2)}
                className="w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Reducir dimensiones de la plaza"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleResize(5, 2)}
                className="w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Aumentar dimensiones de la plaza"
              >
                +
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 font-bold h-9 px-3 rounded-xl gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Deshacer cambio (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Deshacer ({history.length})</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={slots.length === 0}
              className="bg-slate-900 hover:bg-rose-950/40 border-slate-800 text-rose-400 font-bold h-9 px-3 rounded-xl gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Eliminar todas las plazas del croquis"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </Button>
          </div>

          {/* Derecha: Zoom, Rejilla y Guardar */}
          <div className="flex items-center gap-2">
            {/* Controles de Vista / Zoom */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-1.5 h-9 gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
                className="w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Alejar mapa"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 py-0.5 text-[11px] font-mono font-bold hover:bg-slate-800 rounded text-cyan-400 cursor-pointer"
                title="Ajustar mapa completo a la pantalla"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.15))}
                className="w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Acercar mapa"
              >
                +
              </button>
            </div>

            {/* Toggle Rejilla */}
            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-3 h-9 rounded-xl font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                snapToGrid
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Alinear automáticamente a la cuadrícula"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Rejilla</span>
            </button>

            {/* Guardar */}
            <Button
              type="button"
              onClick={handleSaveAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Plano</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarParkZoneEditor;
