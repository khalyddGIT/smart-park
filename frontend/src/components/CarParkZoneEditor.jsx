import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  Trash2,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Check,
  Move,
  Layers,
  Sparkles,
  Camera,
  RotateCw,
  Copy,
  Grid,
  Zap,
  Tag,
  HelpCircle
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
  const CANVAS_WIDTH = 1100;
  const CANVAS_HEIGHT = 700;

  const [slots, setSlots] = useState(() => {
    return initialSlots.map((s, idx) => ({
      id: s.id || `slot_${Date.now()}_${idx}`,
      code: s.code || `P-${idx + 1}`,
      x: typeof s.x === 'number' ? s.x : 50 + (idx % 10) * 85,
      y: typeof s.y === 'number' ? s.y : 50 + Math.floor(idx / 10) * 110,
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

  const canvasRef = useRef(null);

  const showToast = useCallback((text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    const timer = setTimeout(() => setMessage(''), 3500);
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
      x: snapVal(Math.min(CANVAS_WIDTH - source.w, source.x + source.w + 10)),
      y: snapVal(source.y)
    };
    setSlots((prev) => [...prev, newSlot]);
    setSelectedSlotIndex(slots.length);
    showToast(`Plaza ${newSlot.code} duplicada`, 'success');
  };

  // Generar fila automática de N plazas
  const handleGenerateRow = () => {
    const count = parseInt(prompt('¿Cuántas plazas deseas agregar en esta fila?', '5'), 10);
    if (!count || isNaN(count) || count < 1) return;
    pushHistory();

    const startX = 60;
    const startY = 80 + (slots.length % 5) * 110;
    const newSlots = [];

    for (let i = 0; i < count; i++) {
      newSlots.push({
        id: `slot_${Date.now()}_${i}`,
        code: `P-${slots.length + i + 1}`,
        x: snapVal(startX + i * (rectWidth + 12)),
        y: snapVal(startY),
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
    if (selectedSlotIndex !== null) {
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
      showToast(`Ángulo por defecto ajustado a ${nextRot}°`, 'info');
    }
  };

  // Ajustar tamaño (+ TAM / - TAM)
  const handleResize = (deltaW, deltaH) => {
    pushHistory();
    const newW = Math.max(25, rectWidth + deltaW);
    const newH = Math.max(18, rectHeight + deltaH);
    setRectWidth(newW);
    setRectHeight(newH);

    if (selectedSlotIndex !== null) {
      setSlots((prev) =>
        prev.map((s, i) => (i === selectedSlotIndex ? { ...s, w: newW, h: newH } : s))
      );
      showToast(`Tamaño ajustado a ${newW}x${newH}px`, 'info');
    } else {
      setSlots((prev) => prev.map((s) => ({ ...s, w: newW, h: newH })));
      showToast(`Todas las plazas redimensionadas a ${newW}x${newH}px`, 'info');
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
      showToast(`Tipo de plaza cambiado a ${SLOT_TYPES.find((t) => t.id === typeId)?.label}`, 'info');
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
          showToast('Plaza copiada al portapapeles', 'info');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard) {
          pushHistory();
          const newSlot = {
            ...JSON.parse(JSON.stringify(clipboard)),
            id: `slot_${Date.now()}`,
            code: `P-${slots.length + 1}`,
            x: snapVal(Math.min(CANVAS_WIDTH - clipboard.w, clipboard.x + 20)),
            y: snapVal(Math.min(CANVAS_HEIGHT - clipboard.h, clipboard.y + 20))
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
  }, [handleUndo, selectedSlotIndex, slots, clipboard, pushHistory, showToast]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
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
      const newX = snapVal(Math.max(0, Math.min(CANVAS_WIDTH - rectWidth, x - Math.floor(rectWidth / 2))));
      const newY = snapVal(Math.max(0, Math.min(CANVAS_HEIGHT - rectHeight, y - Math.floor(rectHeight / 2))));

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
      const newX = snapVal(Math.max(0, Math.min(CANVAS_WIDTH - targetW, x - dragOffset.x)));
      const newY = snapVal(Math.max(0, Math.min(CANVAS_HEIGHT - targetH, y - dragOffset.y)));

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

  // Renderizar sobre el Canvas HTML5
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dibujar rejilla magnética si está activa
    if (snapToGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    }

    // Dibujar cada plaza de parking
    slots.forEach((s, idx) => {
      const isSelected = idx === selectedSlotIndex;
      const w = s.w || rectWidth;
      const h = s.h || rectHeight;
      const rot = s.rot || 0;
      const typeObj = SLOT_TYPES.find((t) => t.id === s.slotType) || SLOT_TYPES[0];

      ctx.save();
      ctx.translate(s.x + w / 2, s.y + h / 2);
      if (rot) ctx.rotate((rot * Math.PI) / 180);

      // Colores de borde y relleno por estado y tipo
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected
        ? '#facc15'
        : s.status === 'occupied'
        ? '#f43f5e'
        : typeObj.color;
      ctx.fillStyle = isSelected
        ? 'rgba(250, 204, 21, 0.25)'
        : s.status === 'occupied'
        ? 'rgba(244, 63, 94, 0.20)'
        : `${typeObj.color}25`;

      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // Etiqueta del código de plaza
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textMetrics = ctx.measureText(s.code);
      const textW = textMetrics.width + 6;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-textW / 2, -8, textW, 16);

      ctx.fillStyle = isSelected ? '#facc15' : '#ffffff';
      ctx.fillText(s.code, 0, 0);

      ctx.restore();
    });

    // Vista previa fantasma al posicionar el mouse
    if (hoverPos && !isDragging) {
      const hitIdx = hitTest(hoverPos.x, hoverPos.y);
      if (hitIdx === -1) {
        ctx.save();
        const hx = snapVal(hoverPos.x);
        const hy = snapVal(hoverPos.y);
        ctx.translate(hx, hy);
        if (currentRotation) ctx.rotate((currentRotation * Math.PI) / 180);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight);
        ctx.restore();
      }
    }
  }, [slots, selectedSlotIndex, hoverPos, isDragging, rectWidth, rectHeight, currentRotation, snapToGrid, gridSize]);

  const handleSaveAll = () => {
    if (onSave) {
      onSave(slots);
    }
    showToast(`¡Se guardaron ${slots.length} plazas correctamente!`, 'success');
    if (onClose) setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-[24px] shadow-2xl max-w-[1280px] w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Cabecera Avanzada */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Move className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2 truncate">
                Editor Profesional de Plazas CAD 2D • {parkingName}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Clic = Colocar | Arrastrar = Mover | Clic Der = Borrar | Rotación | Tipos de Plaza
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zona Principal del Canvas */}
        <div className="relative bg-slate-950 flex-1 flex items-center justify-center p-3 overflow-hidden min-h-[380px]">
          <div className="relative w-full max-w-[1100px] aspect-[1100/700] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
            {backgroundImage ? (
              <img
                src={backgroundImage}
                alt="Playón"
                className="absolute inset-0 w-full h-full object-contain bg-slate-950"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-12 h-12 text-slate-700 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-400">
                  Calibración de Zonas sobre Canvas 2D
                </p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
            />

            {/* HUD de Mensajes e Info */}
            <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-white text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plazas: <strong className="text-emerald-400">{slots.length}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Ángulo: <strong className="text-cyan-400">{selectedSlotIndex !== null ? slots[selectedSlotIndex]?.rot || 0 : currentRotation}°</strong></span>
              <span className="text-slate-600">|</span>
              <span>Rejilla: <strong className={snapToGrid ? 'text-emerald-400' : 'text-slate-500'}>{snapToGrid ? 'ON' : 'OFF'}</strong></span>
            </div>

            {message && (
              <div
                className={`absolute top-3 right-3 z-20 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide shadow-lg border backdrop-blur-md animate-in fade-in zoom-in-95 ${
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

        {/* Toolbar Inferior Completa */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 space-y-2">
          {/* Fila de Tipos de Plaza y Modos */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">TIPO:</span>
              {SLOT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleChangeType(type.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedType === type.id
                      ? 'bg-slate-800 text-white border border-slate-600'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  snapToGrid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> Rejilla Magnética
              </button>
            </div>
          </div>

          {/* Fila de Acciones Principales */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                onClick={handleSaveAll}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-9 px-4 rounded-xl gap-1.5 shadow"
              >
                <Save className="w-4 h-4" /> GUARDAR
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDuplicateSelected}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400 font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicar
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateRow}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-400 font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Fila
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleRotate(45)}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotar 45°
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Deshacer ({history.length})
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={slots.length === 0}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-rose-400 hover:text-rose-300 font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpiar
              </Button>

              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => handleResize(5, 2)}
                  className="px-2 py-1 text-xs font-black text-cyan-400 hover:bg-slate-700 rounded-lg"
                >
                  + TAM
                </button>
                <button
                  type="button"
                  onClick={() => handleResize(-5, -2)}
                  className="px-2 py-1 text-xs font-black text-cyan-400 hover:bg-slate-700 rounded-lg"
                >
                  - TAM
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white font-bold text-xs h-9 px-4 rounded-xl"
            >
              SALIR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarParkZoneEditor;
