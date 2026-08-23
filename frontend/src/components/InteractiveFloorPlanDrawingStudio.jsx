import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MousePointer, 
  Square, 
  Trash2, 
  Copy, 
  RotateCw, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Car, 
  ShieldCheck, 
  Undo, 
  Redo, 
  Navigation, 
  Sparkles,
  Move,
  CheckCircle2,
  Sliders,
  Compass,
  Trees as TreeIcon,
  Umbrella,
  Accessibility,
  Bike,
  DoorClosed,
  Footprints,
  Check,
  RefreshCw,
  Magnet,
  ArrowLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Plus,
  Minus,
  Maximize,
  Minimize,
  RefreshCcw,
  Scaling,
  Expand,
  LogIn,
  LogOut
} from 'lucide-react';

import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

// ==========================================
// PLANTILLAS DE TERRENOS REALES (PRESETS)
// ==========================================

// 1. Terreno Rectangular Clásico
const RECTANGULAR_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'road', x: 60, y: 260, w: 980, h: 140, rot: 0, label: 'CARRIL VIAL CENTRAL' },
  { id: 6, type: 'crosswalk', x: 520, y: 260, w: 70, h: 140, rot: 0 },
  { id: 7, type: 'gate', gateType: 'entry', x: 40, y: 260, w: 40, h: 70, rot: 0, label: 'ENTRADA' },
  { id: 8, type: 'gate', gateType: 'exit', x: 40, y: 330, w: 40, h: 70, rot: 0, label: 'SALIDA' },
  
  // Fila Norte (Compacta)
  { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'ABC-123', color: '#ef4444' },
  { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 285, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 350, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'A-06', slotType: 'auto', x: 415, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'XYZ-789', color: '#3b82f6' },
  { id: 16, type: 'slot', code: 'A-07', slotType: 'auto', x: 610, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 17, type: 'slot', code: 'A-08', slotType: 'auto', x: 675, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 18, type: 'slot', code: 'A-09', slotType: 'moto', x: 740, y: 80, w: 38, h: 65, rot: 0, status: 'free' },
  { id: 19, type: 'slot', code: 'A-10', slotType: 'moto', x: 785, y: 80, w: 38, h: 65, rot: 0, status: 'free' },
  { id: 20, type: 'slot', code: 'A-11', slotType: 'moto', x: 830, y: 80, w: 38, h: 65, rot: 0, status: 'free' },

  // Fila Sur (Compacta)
  { id: 30, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 480, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
  { id: 31, type: 'slot', code: 'B-02', slotType: 'auto', shaded: true, x: 145, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 32, type: 'slot', code: 'B-03', slotType: 'auto', x: 210, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 33, type: 'slot', code: 'B-04', slotType: 'auto', x: 275, y: 480, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
  { id: 34, type: 'slot', code: 'B-05', slotType: 'auto', x: 340, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 35, type: 'slot', code: 'B-06', slotType: 'auto', x: 405, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 36, type: 'slot', code: 'B-07', slotType: 'auto', x: 610, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 37, type: 'slot', code: 'B-08', slotType: 'auto', x: 675, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 38, type: 'slot', code: 'B-09', slotType: 'auto', x: 740, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 39, type: 'slot', code: 'B-10', slotType: 'auto', x: 805, y: 480, w: 56, h: 96, rot: 0, status: 'free' }
];

// 2. Terreno en 'L'
const L_SHAPE_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 520, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 548, y: 340, w: 12, h: 320, rot: 0 },
  { id: 5, type: 'wall', x: 548, y: 340, w: 512, h: 12, rot: 0 },
  { id: 6, type: 'wall', x: 1048, y: 40, w: 12, h: 312, rot: 0 },
  { id: 7, type: 'building', x: 560, y: 352, w: 488, h: 296, rot: 0, label: 'ÁREA EXTERNA' },
  { id: 8, type: 'road', x: 60, y: 220, w: 980, h: 90, rot: 0, label: 'CARRIL NORTE' },
  { id: 9, type: 'road', x: 220, y: 230, w: 90, h: 410, rot: 0, label: 'CARRIL OESTE' },
  { id: 10, type: 'gate', gateType: 'entry', x: 40, y: 220, w: 40, h: 45, rot: 0, label: 'ENTRADA' },
  { id: 11, type: 'gate', gateType: 'exit', x: 40, y: 265, w: 40, h: 45, rot: 0, label: 'SALIDA' },

  // Fila Norte
  { id: 12, type: 'slot', code: 'N-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 13, type: 'slot', code: 'N-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'N-03', slotType: 'auto', shaded: true, x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'ABC-123' },
  { id: 15, type: 'slot', code: 'N-04', slotType: 'auto', x: 330, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 16, type: 'slot', code: 'N-05', slotType: 'auto', x: 395, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'XYZ-789' },
  { id: 17, type: 'slot', code: 'N-06', slotType: 'auto', x: 600, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 18, type: 'slot', code: 'N-07', slotType: 'moto', x: 665, y: 80, w: 38, h: 65, rot: 0, status: 'free' },

  // Columna Oeste
  { id: 25, type: 'slot', code: 'O-01', slotType: 'auto', x: 80, y: 340, w: 96, h: 56, rot: 0, status: 'free' },
  { id: 26, type: 'slot', code: 'O-02', slotType: 'auto', shaded: true, x: 80, y: 410, w: 96, h: 56, rot: 0, status: 'free' },
  { id: 27, type: 'slot', code: 'O-03', slotType: 'auto', x: 80, y: 480, w: 96, h: 56, rot: 0, status: 'free' },
  { id: 28, type: 'slot', code: 'O-04', slotType: 'auto', x: 80, y: 550, w: 96, h: 56, rot: 0, status: 'free' }
];

// 3. Terreno Diagonal (Espina de Pescado 45°)
const DIAGONAL_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'road', x: 60, y: 270, w: 980, h: 130, rot: 0, label: 'CARRIL VIAL DIAGONAL 45°' },
  { id: 6, type: 'gate', gateType: 'entry', x: 40, y: 270, w: 40, h: 65, rot: 0, label: 'ENTRADA' },
  { id: 7, type: 'gate', gateType: 'exit', x: 40, y: 335, w: 40, h: 65, rot: 0, label: 'SALIDA' },

  { id: 10, type: 'slot', code: 'D-01', slotType: 'auto', x: 90, y: 90, w: 56, h: 96, rot: 30, status: 'free' },
  { id: 11, type: 'slot', code: 'D-02', slotType: 'auto', shaded: true, x: 165, y: 90, w: 56, h: 96, rot: 30, status: 'free' },
  { id: 12, type: 'slot', code: 'D-03', slotType: 'auto', shaded: true, x: 235, y: 90, w: 56, h: 96, rot: 30, status: 'occupied', plate: 'ABC-123' },
  { id: 13, type: 'slot', code: 'D-04', slotType: 'auto', x: 305, y: 90, w: 56, h: 96, rot: 30, status: 'free' },
  { id: 14, type: 'slot', code: 'D-05', slotType: 'auto', x: 375, y: 90, w: 56, h: 96, rot: 30, status: 'free' },
  { id: 15, type: 'slot', code: 'D-06', slotType: 'auto', x: 445, y: 90, w: 56, h: 96, rot: 30, status: 'free' },
  { id: 16, type: 'slot', code: 'D-07', slotType: 'moto', x: 515, y: 90, w: 38, h: 65, rot: 30, status: 'free' },

  { id: 20, type: 'slot', code: 'D-08', slotType: 'auto', x: 90, y: 470, w: 56, h: 96, rot: -30, status: 'free' },
  { id: 21, type: 'slot', code: 'D-09', slotType: 'auto', shaded: true, x: 165, y: 470, w: 56, h: 96, rot: -30, status: 'free' },
  { id: 22, type: 'slot', code: 'D-10', slotType: 'auto', x: 235, y: 470, w: 56, h: 96, rot: -30, status: 'occupied', plate: 'XYZ-999' },
  { id: 23, type: 'slot', code: 'D-11', slotType: 'auto', x: 305, y: 470, w: 56, h: 96, rot: -30, status: 'free' },
  { id: 24, type: 'slot', code: 'D-12', slotType: 'auto', x: 375, y: 470, w: 56, h: 96, rot: -30, status: 'free' }
];

// 4. Terreno en 'U'
const U_SHAPE_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'building', x: 350, y: 220, w: 400, h: 260, rot: 0, label: 'ISLA CENTRAL / NÚCLEO EDIFICIO' },
  { id: 6, type: 'road', x: 60, y: 210, w: 980, h: 80, rot: 0, label: 'ANILLO DE CIRCULACIÓN NORTE' },
  { id: 7, type: 'road', x: 60, y: 420, w: 980, h: 80, rot: 0, label: 'ANILLO DE CIRCULACIÓN SUR' },
  { id: 8, type: 'gate', gateType: 'entry', x: 40, y: 210, w: 40, h: 80, rot: 0, label: 'ENTRADA' },
  { id: 9, type: 'gate', gateType: 'exit', x: 40, y: 420, w: 40, h: 80, rot: 0, label: 'SALIDA' },

  { id: 10, type: 'slot', code: 'U-01', slotType: 'auto', x: 80, y: 75, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 11, type: 'slot', code: 'U-02', slotType: 'auto', shaded: true, x: 155, y: 75, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'U-03', slotType: 'auto', shaded: true, x: 220, y: 75, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'P3X-998' },
  { id: 13, type: 'slot', code: 'U-04', slotType: 'auto', x: 285, y: 75, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'U-05', slotType: 'auto', x: 350, y: 75, w: 56, h: 96, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'U-06', slotType: 'auto', x: 415, y: 75, w: 56, h: 96, rot: 0, status: 'free' }
];

export const InteractiveFloorPlanDrawingStudio = ({ 
  onSavePlan, 
  initialElements, 
  parkingName = "Smart Park Central", 
  readOnly = false 
}) => {
  // Herramienta activa
  const [activeTool, setActiveTool] = useState('select');

  // Forma y Dimensiones del Lote
  const [lotShape, setLotShape] = useState('rectangular');
  const [canvasWidth, setCanvasWidth] = useState(1100);
  const [canvasHeight, setCanvasHeight] = useState(700);
  const [zoom, setZoom] = useState(100);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  const containerRef = useRef(null);

  // Auto-ajuste de escala para visualización 100% óptima y limpia
  const handleFitToScreen = useCallback(() => {
    if (containerRef.current) {
      const availableWidth = containerRef.current.clientWidth - 48;
      const fitZoom = Math.min(120, Math.max(40, Math.round((availableWidth / canvasWidth) * 100)));
      setZoom(fitZoom);
    }
  }, [canvasWidth]);

  useEffect(() => {
    handleFitToScreen();
  }, [handleFitToScreen]);

  // Soporte de Zoom con Rueda del Ratón (Ctrl + Scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        setZoom(prev => Math.min(200, Math.max(40, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Elementos en el plano
  const [elements, setElements] = useState(initialElements || RECTANGULAR_PRESET);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([initialElements || RECTANGULAR_PRESET]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sincronizar cuando cambia initialElements desde afuera
  useEffect(() => {
    if (initialElements && Array.isArray(initialElements)) {
      setElements(initialElements);
      setHistory([initialElements]);
      setHistoryIndex(0);
      setSelectedId(null);
      setHasUnsavedChanges(false);
    }
  }, [initialElements]);

  // Estados de dibujo y manipulación
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentDraw, setCurrentDraw] = useState(null);
  const [dragState, setDragState] = useState(null);

  const canvasRef = useRef(null);

  const selectedElement = elements.find(e => e.id === selectedId);

  // Contadores
  const totalSlots = elements.filter(e => e.type === 'slot').length;
  const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
  const occupiedSlots = elements.filter(e => e.type === 'slot' && e.status === 'occupied').length;
  const pmrSlots = elements.filter(e => e.type === 'slot' && e.slotType === 'pmr').length;
  const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;
  const motoSlots = elements.filter(e => e.type === 'slot' && e.slotType === 'moto').length;

  const pushHistory = (newElements) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, newElements]);
    setHistoryIndex(nextHistory.length);
    setHasUnsavedChanges(true);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setElements(prev);
      setSelectedId(null);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setElements(next);
      setSelectedId(null);
      setHasUnsavedChanges(true);
    }
  };

  // Guardar plano
  const handleSave = () => {
    if (onSavePlan) {
      onSavePlan(elements);
      setHasUnsavedChanges(false);
      setMessage('¡Plano y distribución guardados con éxito!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Cambio de plantilla de terreno
  const handlePresetChange = (shape) => {
    setLotShape(shape);
    let newElems = [];
    if (shape === 'rectangular') newElems = RECTANGULAR_PRESET;
    else if (shape === 'l_shape') newElems = L_SHAPE_PRESET;
    else if (shape === 'diagonal') newElems = DIAGONAL_PRESET;
    else if (shape === 'u_shape') newElems = U_SHAPE_PRESET;
    else if (shape === 'free') newElems = [];

    setElements(newElems);
    pushHistory(newElems);
    setSelectedId(null);
    setMessage(`Plantilla "${shape.toUpperCase()}" aplicada.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Duplicar elemento seleccionado
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    const newId = Date.now();
    const isSlot = selectedElement.type === 'slot';
    const offset = 80;

    let newCode = selectedElement.code;
    if (isSlot) {
      const parts = (selectedElement.code || 'A-01').split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        const nextNum = parseInt(parts[1]) + 1;
        newCode = `${parts[0]}-${String(nextNum).padStart(2, '0')}`;
      } else {
        newCode = `${selectedElement.code}-COPY`;
      }
    }

    const duplicated = {
      ...selectedElement,
      id: newId,
      code: newCode,
      x: Math.min(canvasWidth - selectedElement.w, selectedElement.x + offset),
      y: selectedElement.y,
      status: 'free',
      plate: undefined
    };

    const updated = [...elements, duplicated];
    setElements(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setMessage(`Elemento ${isSlot ? newCode : ''} duplicado con éxito.`);
    setTimeout(() => setMessage(''), 2000);
  }, [selectedElement, elements, canvasWidth]);

  // Eliminar elemento seleccionado
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updated = elements.filter(el => el.id !== selectedId);
    setElements(updated);
    pushHistory(updated);
    setSelectedId(null);
    setMessage('Elemento eliminado.');
    setTimeout(() => setMessage(''), 2000);
  }, [selectedId, elements]);

  // Rotar rápido
  const handleRotateStep = (degToAdd = 45) => {
    if (!selectedElement) return;
    const nextRot = ((selectedElement.rot || 0) + degToAdd) % 360;
    const updated = elements.map(el => el.id === selectedId ? { ...el, rot: nextRot } : el);
    setElements(updated);
    pushHistory(updated);
  };

  // Agrandar / Redimensionar rápido (+/- px)
  const handleQuickResize = (dw, dh) => {
    if (!selectedElement) return;
    const newW = Math.max(20, (selectedElement.w || 75) + dw);
    const newH = Math.max(20, (selectedElement.h || 140) + dh);
    const updated = elements.map(el => el.id === selectedId ? { ...el, w: newW, h: newH } : el);
    setElements(updated);
    pushHistory(updated);
    setMessage(`Dimensiones: ${newW} × ${newH} px`);
    setTimeout(() => setMessage(''), 1500);
  };

  // Preset de dimensiones
  const handleSetExactSize = (w, h) => {
    if (!selectedElement) return;
    const updated = elements.map(el => el.id === selectedId ? { ...el, w, h } : el);
    setElements(updated);
    pushHistory(updated);
    setMessage(`Ajustado a ${w} × ${h} px`);
    setTimeout(() => setMessage(''), 1500);
  };

  // Auto-Renumerar todos los cajones ordenadamente
  const handleAutoNumber = () => {
    const slots = elements.filter(e => e.type === 'slot');
    const others = elements.filter(e => e.type !== 'slot');

    if (slots.length === 0) {
      setMessage('No hay plazas para numerar.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const sortedSlots = [...slots].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 60) return a.y - b.y;
      return a.x - b.x;
    });

    let autoCount = 0;
    let motoCount = 0;

    const renumberedSlots = sortedSlots.map(slot => {
      let code = '';
      if (slot.slotType === 'moto') {
        motoCount++;
        code = `M-${String(motoCount).padStart(2, '0')}`;
      } else {
        autoCount++;
        const sector = slot.y < 280 ? 'A' : slot.y < 460 ? 'B' : 'C';
        code = `${sector}-${String(autoCount).padStart(2, '0')}`;
      }
      return { ...slot, code };
    });

    const updated = [...others, ...renumberedSlots];
    setElements(updated);
    pushHistory(updated);
    setMessage(`¡${slots.length} plazas ordenadas y renumeradas!`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Alineación Rápida
  const handleAlignSelected = (direction) => {
    if (!selectedElement) return;
    let newX = selectedElement.x;
    let newY = selectedElement.y;

    if (direction === 'top') newY = 70;
    else if (direction === 'bottom') newY = Math.max(0, canvasHeight - selectedElement.h - 70);
    else if (direction === 'left') newX = 80;
    else if (direction === 'right') newX = Math.max(0, canvasWidth - selectedElement.w - 80);
    else if (direction === 'center-h') newX = Math.round((canvasWidth - selectedElement.w) / 2);
    else if (direction === 'center-v') newY = Math.round((canvasHeight - selectedElement.h) / 2);

    const updated = elements.map(el => el.id === selectedId ? { ...el, x: newX, y: newY } : el);
    setElements(updated);
    pushHistory(updated);
  };

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (readOnly) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'r' && selectedId) {
        e.preventDefault();
        handleRotateStep(90);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleQuickResize(10, 10);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleQuickResize(-10, -10);
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedId(null);
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('slot_auto');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('slot_shaded');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTool('slot_moto');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedElement, elements, readOnly, handleDeleteSelected, handleDuplicateSelected]);

  // Conversión de coordenadas con snapping
  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = zoom / 100;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    let x = (clientX - rect.left) / scaleFactor;
    let y = (clientY - rect.top) / scaleFactor;

    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    return { x: Math.max(0, Math.min(canvasWidth, x)), y: Math.max(0, Math.min(canvasHeight, y)) };
  };

  // Crear elemento en clic simple o arrastre
  const handleCanvasMouseDown = (e) => {
    if (readOnly) {
      setSelectedId(null);
      return;
    }
    if (e.target !== canvasRef.current && !e.target.classList.contains('canvas-bg')) return;

    if (activeTool === 'select') {
      setSelectedId(null);
      return;
    }

    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentDraw({ x: coords.x, y: coords.y, w: 10, h: 10 });
  };

  const handleElementMouseDown = (e, element) => {
    e.stopPropagation();

    if (readOnly) {
      setSelectedId(element.id);
      return;
    }

    if (activeTool === 'eraser') {
      const updated = elements.filter(el => el.id !== element.id);
      setElements(updated);
      pushHistory(updated);
      if (selectedId === element.id) setSelectedId(null);
      setMessage(`Elemento eliminado.`);
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (activeTool === 'select') {
      setSelectedId(element.id);
      const coords = getCanvasCoords(e);
      setDragState({
        mode: 'move',
        startX: coords.x,
        startY: coords.y,
        origX: element.x,
        origY: element.y,
        origW: element.w,
        origH: element.h,
        origRot: element.rot || 0
      });
    }
  };

  // Inicio de Redimensionamiento por Agarre en Esquinas / Bordes
  const handleResizeHandleDown = (e, handle) => {
    e.stopPropagation();
    if (!selectedElement || readOnly) return;
    const coords = getCanvasCoords(e);
    setDragState({
      mode: 'resize',
      handle, // 'br', 'bl', 'tr', 'tl', 'r', 'b', 't', 'l'
      startX: coords.x,
      startY: coords.y,
      origX: selectedElement.x,
      origY: selectedElement.y,
      origW: selectedElement.w,
      origH: selectedElement.h
    });
  };

  // Inicio de Rotación por Agarre Circular
  const handleRotateKnobDown = (e) => {
    e.stopPropagation();
    if (!selectedElement || readOnly) return;
    const coords = getCanvasCoords(e);
    const centerX = selectedElement.x + selectedElement.w / 2;
    const centerY = selectedElement.y + selectedElement.h / 2;
    setDragState({
      mode: 'rotate',
      centerX,
      centerY,
      origRot: selectedElement.rot || 0,
      startAngle: Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)
    });
  };

  const handleMouseMove = (e) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e);

    // 1. Mover elemento
    if (dragState && dragState.mode === 'move' && selectedElement) {
      const dx = coords.x - dragState.startX;
      const dy = coords.y - dragState.startY;
      let newX = dragState.origX + dx;
      let newY = dragState.origY + dy;

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      newX = Math.max(0, Math.min(canvasWidth - selectedElement.w, newX));
      newY = Math.max(0, Math.min(canvasHeight - selectedElement.h, newY));

      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, x: newX, y: newY } : el));
      return;
    }

    // 2. Redimensionar / Agrandar elemento por agarres
    if (dragState && dragState.mode === 'resize' && selectedElement) {
      const dx = coords.x - dragState.startX;
      const dy = coords.y - dragState.startY;
      const { origX, origY, origW, origH, handle } = dragState;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;

      if (handle.includes('r')) newW = Math.max(20, origW + dx);
      if (handle.includes('b')) newH = Math.max(20, origH + dy);
      if (handle.includes('l')) {
        const diff = Math.min(dx, origW - 20);
        newX = origX + diff;
        newW = origW - diff;
      }
      if (handle.includes('t')) {
        const diff = Math.min(dy, origH - 20);
        newY = origY + diff;
        newH = origH - diff;
      }

      if (snapToGrid) {
        newW = Math.round(newW / gridSize) * gridSize;
        newH = Math.round(newH / gridSize) * gridSize;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      setElements(prev => prev.map(el => el.id === selectedId ? { 
        ...el, 
        x: newX, 
        y: newY, 
        w: Math.max(15, newW), 
        h: Math.max(15, newH) 
      } : el));
      return;
    }

    // 3. Rotar elemento por agarre
    if (dragState && dragState.mode === 'rotate' && selectedElement) {
      const currentAngle = Math.atan2(coords.y - dragState.centerY, coords.x - dragState.centerX) * (180 / Math.PI);
      const delta = currentAngle - dragState.startAngle;
      let newRot = Math.round((dragState.origRot + delta) % 360);
      if (newRot < 0) newRot += 360;
      if (snapToGrid) {
        newRot = Math.round(newRot / 15) * 15;
      }
      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, rot: newRot } : el));
      return;
    }

    // 4. Dibujar nuevo elemento
    if (isDrawing && drawStart) {
      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const w = Math.abs(coords.x - drawStart.x);
      const h = Math.abs(coords.y - drawStart.y);
      setCurrentDraw({ x, y, w, h });
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    if (dragState) {
      setDragState(null);
      pushHistory(elements);
    }

    if (isDrawing && currentDraw) {
      setIsDrawing(false);
      const newId = Date.now();
      const newElements = [...elements];
      let newlyCreatedId = newId;

      // 1. Trazar fila múltiple (Compacta)
      if (activeTool === 'draw_row') {
        const rowCount = currentDraw.w > 100 ? Math.max(2, Math.floor(currentDraw.w / 58)) : 5;
        const slotWidth = 56;
        const slotHeight = 96;
        const prefix = currentDraw.y < 300 ? 'N' : 'S';
        const existingCount = elements.filter(e => e.type === 'slot').length;

        for (let i = 0; i < rowCount; i++) {
          newElements.push({
            id: newId + i,
            type: 'slot',
            code: `${prefix}-0${(existingCount % 10) + i + 1}`,
            slotType: i === 0 ? 'pmr' : 'auto',
            shaded: i === 1,
            x: currentDraw.x + i * (slotWidth + 8),
            y: currentDraw.y,
            w: slotWidth,
            h: slotHeight,
            rot: 0,
            status: 'free'
          });
        }
        setMessage(`Batería de ${rowCount} plazas compactas colocada.`);
      }
      // 2. Plaza Individual Compacta (Auto, Techado, PMR, Moto)
      else if (activeTool.startsWith('slot_')) {
        const rawType = activeTool.replace('slot_', '');
        const isShaded = rawType === 'shaded';
        const isPMR = rawType === 'pmr';
        const isMoto = rawType === 'moto';
        const slotType = isShaded ? 'auto' : rawType;
        
        const count = elements.filter(e => e.type === 'slot').length + 1;
        const code = isShaded ? `S-0${count}` : isPMR ? `PMR-0${count}` : isMoto ? `M-0${count}` : `A-0${count}`;
        const defaultW = isMoto ? 38 : isPMR ? 66 : 56;
        const defaultH = isMoto ? 65 : 96;

        const finalW = currentDraw.w > 30 ? currentDraw.w : defaultW;
        const finalH = currentDraw.h > 30 ? currentDraw.h : defaultH;

        newElements.push({
          id: newId,
          type: 'slot',
          code,
          slotType,
          shaded: isShaded,
          x: currentDraw.x,
          y: currentDraw.y,
          w: finalW,
          h: finalH,
          rot: 0,
          status: 'free'
        });
        setMessage(`Plaza ${code} colocada.`);
      }
      // 3. Muro Estructural
      else if (activeTool === 'add_wall') {
        newElements.push({
          id: newId,
          type: 'wall',
          x: currentDraw.x,
          y: currentDraw.y,
          w: currentDraw.w > 20 ? currentDraw.w : 200,
          h: currentDraw.h > 20 ? currentDraw.h : 12,
          rot: 0
        });
        setMessage(`Muro estructural colocado.`);
      }
      // 4. Carril Vial
      else if (activeTool === 'add_road') {
        newElements.push({
          id: newId,
          type: 'road',
          x: currentDraw.x,
          y: currentDraw.y,
          w: currentDraw.w > 40 ? currentDraw.w : 400,
          h: currentDraw.h > 40 ? currentDraw.h : 120,
          rot: 0,
          label: 'CARRIL DE CIRCULACIÓN'
        });
        setMessage(`Vía de circulación colocada.`);
      }
      // 5. Cruce Peatonal
      else if (activeTool === 'add_crosswalk') {
        newElements.push({
          id: newId,
          type: 'crosswalk',
          x: currentDraw.x,
          y: currentDraw.y,
          w: currentDraw.w > 30 ? currentDraw.w : 80,
          h: currentDraw.h > 30 ? currentDraw.h : 100,
          rot: 0
        });
        setMessage(`Paso peatonal añadido.`);
      }
      // 6. Garita de Entrada
      else if (activeTool === 'add_entry') {
        newElements.push({
          id: newId,
          type: 'gate',
          gateType: 'entry',
          x: currentDraw.x,
          y: currentDraw.y,
          w: 50,
          h: 90,
          rot: 0,
          label: 'ENTRADA LPR'
        });
        setMessage(`Punto de ENTRADA vehicular colocado.`);
      }
      // 7. Garita de Salida
      else if (activeTool === 'add_exit') {
        newElements.push({
          id: newId,
          type: 'gate',
          gateType: 'exit',
          x: currentDraw.x,
          y: currentDraw.y,
          w: 50,
          h: 90,
          rot: 0,
          label: 'SALIDA CONTROL'
        });
        setMessage(`Punto de SALIDA vehicular colocado.`);
      }
      // 8. Garita estándar
      else if (activeTool === 'add_gate') {
        newElements.push({
          id: newId,
          type: 'gate',
          gateType: 'entry',
          x: currentDraw.x,
          y: currentDraw.y,
          w: 50,
          h: 90,
          rot: 0,
          label: 'GARITA ANPR'
        });
        setMessage(`Garita ANPR colocada.`);
      }
      // 9. Jardín / Área verde
      else if (activeTool === 'add_garden') {
        newElements.push({
          id: newId,
          type: 'garden',
          x: currentDraw.x,
          y: currentDraw.y,
          w: currentDraw.w > 40 ? currentDraw.w : 140,
          h: currentDraw.h > 40 ? currentDraw.h : 140,
          rot: 0,
          label: 'ÁREA VERDE'
        });
        setMessage(`Área verde añadida.`);
      }

      setElements(newElements);
      pushHistory(newElements);
      setSelectedId(newlyCreatedId);
      setCurrentDraw(null);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================================
          BARRA DE CONTROL SUPERIOR — PRESETS, VISTA Y GUARDADO
          ============================================================ */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        
        {/* Presets de Terreno */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700">
            <Layers className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-bold font-tech uppercase text-slate-300">Lote:</span>
          </div>

          <div className="flex flex-wrap items-center bg-slate-950/70 p-1 rounded-2xl border border-slate-800 gap-1">
            {[
              { id: 'rectangular', label: 'Rectangular' },
              { id: 'l_shape', label: "Forma en 'L'" },
              { id: 'diagonal', label: 'Diagonal 45°' },
              { id: 'u_shape', label: "Forma en 'U'" },
              { id: 'free', label: 'Lienzo Libre' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  lotShape === p.id 
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleAutoNumber}
            variant="outline" 
            size="sm"
            className="rounded-2xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-1.5 h-8"
            title="Renumera automáticamente todas las plazas en orden espacial"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Auto-Numerar</span>
          </Button>
        </div>

        {/* Controles de Zoom, Snapping y Guardar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Deshacer / Rehacer */}
          <div className="flex items-center bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 hover:bg-slate-800 rounded-xl disabled:opacity-30 text-slate-300 transition"
              title="Deshacer"
            >
              <Undo className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 hover:bg-slate-800 rounded-xl disabled:opacity-30 text-slate-300 transition"
              title="Rehacer"
            >
              <Redo className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* Toggle de Imantación (Snap to Grid) */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-bold border transition ${
              snapToGrid 
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700 shadow-sm' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Activar o desactivar imantación a cuadrícula (20px)"
          >
            <Magnet className="w-4 h-4 shrink-0" />
            <span>Snap Rejilla</span>
          </button>

          {/* Controles Profesionales de Zoom */}
          <div className="flex items-center bg-slate-950/80 px-2 py-1 rounded-2xl border border-slate-800 text-xs font-tech text-slate-300 gap-2 shadow-inner">
            <button 
              onClick={() => setZoom(Math.max(40, zoom - 10))} 
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition hover:text-white"
              title="Alejar Zoom (Ctrl + Scroll Abajo)"
            >
              <ZoomOut className="w-4 h-4 shrink-0" />
            </button>

            {/* Presets Rápidos de Zoom */}
            <div className="flex items-center gap-2 px-1 font-mono font-bold">
              {[50, 75, 100, 125].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                    zoom === z 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>

            <button 
              onClick={() => setZoom(Math.min(200, zoom + 10))} 
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition hover:text-white"
              title="Acercar Zoom (Ctrl + Scroll Arriba)"
            >
              <ZoomIn className="w-4 h-4 shrink-0" />
            </button>

            <button 
              onClick={handleFitToScreen} 
              className="px-2 py-1 bg-slate-800/90 hover:bg-emerald-950 hover:text-emerald-300 rounded-xl text-emerald-400 font-bold text-[10px] flex items-center gap-2 border border-slate-700 transition ml-1"
              title="Ajustar plano a la pantalla"
            >
              <Maximize2 className="w-4 h-4 shrink-0" />
              <span>Ajustar</span>
            </button>
          </div>

          {/* Estado de sincronización */}
          {hasUnsavedChanges ? (
            <span className="text-[11px] font-tech font-bold text-amber-400 flex items-center gap-1.5 bg-amber-950/50 px-2.5 py-1.5 rounded-2xl border border-amber-800/80">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Pendiente</span>
            </span>
          ) : (
            <span className="text-[11px] font-tech font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-1.5 rounded-2xl border border-emerald-800/80">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Sincronizado</span>
            </span>
          )}

          {/* Guardar Cambios */}
          {!readOnly && (
            <Button 
              onClick={handleSave} 
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 px-4 h-9 rounded-2xl shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>Guardar Cambios</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================
          PALETA DE HERRAMIENTAS DE DIBUJO RÁPIDO (CATEGORIZADA Y FLUIDA)
          ============================================================ */}
      {!readOnly && (
        <div className="bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Modo Selección */}
            <button
              onClick={() => setActiveTool('select')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'select' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black ring-2 ring-cyan-400' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title="Seleccionar y mover elementos"
            >
              <MousePointer className="w-4 h-4 shrink-0" />
              <span>Seleccionar</span>
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1 hidden md:block" />

            {/* Grupo Plazas de Estacionamiento */}
            <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 font-tech hidden lg:inline">Plazas:</span>

              <button
                onClick={() => setActiveTool('slot_auto')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'slot_auto' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black ring-2 ring-emerald-400' 
                    : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/70 border border-emerald-800/60'
                }`}
                title="Añadir plaza estándar de auto"
              >
                <Car className="w-4 h-4 shrink-0" />
                <span>+ Auto</span>
              </button>

              <button
                onClick={() => setActiveTool('slot_shaded')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'slot_shaded' 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400' 
                    : 'bg-amber-950/50 text-amber-300 hover:bg-amber-900/70 border border-amber-800/60'
                }`}
                title="Añadir plaza con cubierta tensada"
              >
                <Umbrella className="w-4 h-4 shrink-0" />
                <span>+ Techado</span>
              </button>

              <button
                onClick={() => setActiveTool('slot_moto')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'slot_moto' 
                    ? 'bg-orange-500 text-slate-950 shadow-md font-black ring-2 ring-orange-400' 
                    : 'bg-orange-950/50 text-orange-300 hover:bg-orange-900/70 border border-orange-800/60'
                }`}
                title="Añadir plaza de moto"
              >
                <Bike className="w-4 h-4 shrink-0" />
                <span>+ Moto</span>
              </button>

              <button
                onClick={() => setActiveTool('draw_row')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'draw_row' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black ring-2 ring-cyan-400' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
                title="Trazar batería de 5 plazas en fila con un clic"
              >
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span>+ Fila Rápida</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-800 mx-1 hidden md:block" />

            {/* Grupo Accesos & Vías */}
            <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 font-tech hidden lg:inline">Accesos & Vías:</span>

              <button
                onClick={() => setActiveTool('add_entry')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_entry' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black ring-2 ring-emerald-400' 
                    : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/50'
                }`}
                title="Añadir punto de ENTRADA con cámara LPR"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>+ Entrada</span>
              </button>

              <button
                onClick={() => setActiveTool('add_exit')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_exit' 
                    ? 'bg-rose-500 text-slate-950 shadow-md font-black ring-2 ring-rose-400' 
                    : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/50'
                }`}
                title="Añadir punto de SALIDA con validación POS"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>+ Salida</span>
              </button>

              <button
                onClick={() => setActiveTool('add_road')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_road' 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
                title="Añadir carril vial de circulación"
              >
                <Navigation className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Carril</span>
              </button>

              <button
                onClick={() => setActiveTool('add_wall')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_wall' 
                    ? 'bg-slate-300 text-slate-950 shadow-md font-black' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
                title="Añadir muro perimétrico de hormigón"
              >
                <Square className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Muro</span>
              </button>

              <button
                onClick={() => setActiveTool('add_crosswalk')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_crosswalk' 
                    ? 'bg-slate-200 text-slate-950 shadow-md font-black' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
                title="Añadir paso de cebra peatonal"
              >
                <Footprints className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Cruce</span>
              </button>

              <button
                onClick={() => setActiveTool('add_garden')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTool === 'add_garden' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                    : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                }`}
                title="Añadir área verde o jardín ornamental"
              >
                <TreeIcon className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Jardín</span>
              </button>
            </div>
          </div>

          {/* Borrador */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'eraser' 
                ? 'bg-rose-500 text-slate-950 shadow-md font-black ring-2 ring-rose-400' 
                : 'bg-rose-950/50 text-rose-300 hover:bg-rose-900/70 border border-rose-800/60'
            }`}
            title="Borrar elementos al hacer clic sobre ellos"
          >
            <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Borrador</span>
          </button>
        </div>
      )}

      {/* Mensaje de Feedback */}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* ============================================================
          ÁREA PRINCIPAL: LIENZO CAD + INSPECTOR DE PROPIEDADES
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        
        {/* COLUMNA DEL LIENZO CAD + BARRA DE ESTADO */}
        <div className="lg:col-span-3 flex flex-col space-y-2.5">
          <div 
            ref={containerRef}
            className="bg-[#0d1117] rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl overflow-auto custom-scrollbar flex min-h-[580px] max-h-[750px]"
          >
            {/* Viewport Contenedor Escalado */}
            <div
              className="m-auto relative flex-shrink-0"
              style={{
                width: `${canvasWidth * (zoom / 100)}px`,
                height: `${canvasHeight * (zoom / 100)}px`,
              }}
            >
            {/* Lienzo Escalado */}
            <div
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              className="canvas-bg relative bg-[#131924] rounded-2xl border-2 border-slate-700 shadow-inner overflow-hidden select-none cursor-crosshair transition-transform duration-75"
            >
            {/* Rejilla métrica */}
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none" 
            />

            {/* Renderizado de todos los elementos con Estilo Arquitectónico Realista */}
            {elements.map((el) => {
              const isSelected = selectedId === el.id;

              // 1. Plazas de Estacionamiento de Alta Definición
              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isPMR = el.slotType === 'pmr';
                const isMoto = el.slotType === 'moto';
                const isShaded = !!el.shaded;

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-xl border-2 cursor-pointer transition-all duration-150 flex flex-col justify-between p-1.5 select-none overflow-hidden shadow-md ${
                      isSelected 
                        ? 'ring-4 ring-cyan-400 border-cyan-300 z-30 shadow-[0_0_30px_rgba(6,182,212,0.9)] scale-[1.02]' 
                        : 'z-10'
                    } ${
                      isPMR 
                        ? 'border-blue-500/90 bg-gradient-to-b from-blue-950/90 via-slate-900/95 to-blue-950/90 text-blue-200 hover:border-blue-400' 
                        : isShaded
                        ? 'border-amber-400/90 bg-gradient-to-b from-amber-950/70 via-slate-900/95 to-amber-950/80 text-amber-100 hover:border-amber-300'
                        : isMoto
                        ? 'border-orange-500/90 bg-gradient-to-b from-orange-950/80 via-slate-900/95 to-orange-950/90 text-orange-200 hover:border-orange-400'
                        : isFree
                        ? 'border-emerald-500/80 bg-gradient-to-b from-emerald-950/60 via-slate-900/95 to-slate-950 text-emerald-100 hover:border-emerald-400'
                        : 'border-rose-500/90 bg-gradient-to-b from-rose-950/80 via-slate-900/95 to-rose-950/90 text-rose-200'
                    }`}
                  >
                    {/* Textura de Techado con Vigas y Sombra */}
                    {isShaded && (
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.18),rgba(245,158,11,0.18)_8px,transparent_8px,transparent_16px)] pointer-events-none rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Sensor LED Cenital Inteligente */}
                    <div className="absolute top-1 right-1.5 flex items-center gap-2 z-20 pointer-events-none">
                      <div className={`w-2 h-2 rounded-full shadow-sm ${
                        isFree 
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' 
                          : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                      }`} />
                    </div>

                    {/* Encabezado: Código y Distintivo */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-black z-10 leading-none pr-3">
                      <span className="text-white drop-shadow-sm tracking-tight">{el.code}</span>
                      {isPMR && <span className="text-blue-400 font-bold text-[8px] bg-blue-950/80 px-1 py-0.5 rounded border border-blue-700">♿ PMR</span>}
                      {isShaded && <span className="text-amber-300 text-[8px] font-bold bg-amber-950/80 px-1 py-0.5 rounded border border-amber-700">⛱️ TECH</span>}
                      {isMoto && <span className="text-orange-300 font-bold text-[8px] bg-orange-950/80 px-1 py-0.5 rounded border border-orange-700">🏍️ MOTO</span>}
                    </div>

                    {/* Silueta / Stencil Central en Asfalto */}
                    <div className="flex flex-col items-center justify-center my-auto py-0.5 z-10 pointer-events-none">
                      {isFree ? (
                        isPMR ? (
                          <Accessibility className="w-5 h-5 shrink-0 text-blue-400/40" />
                        ) : isMoto ? (
                          <Bike className="w-4 h-4 shrink-0 text-orange-400/40" />
                        ) : (
                          <div className="w-6 h-9 rounded-lg border border-dashed border-emerald-400/30 flex flex-col items-center justify-around py-1">
                            <div className="w-4 h-1 bg-emerald-400/30 rounded-xs" />
                            <Car className="w-4 h-4 shrink-0 text-emerald-400/40" />
                            <div className="w-4 h-1 bg-emerald-400/30 rounded-xs" />
                          </div>
                        )
                      ) : (
                        <div className="w-full flex flex-col items-center bg-slate-950/90 p-1 rounded-lg border border-slate-700 shadow-inner">
                          <Car className="w-4 h-4 shrink-0 text-rose-400 mb-0.5 animate-pulse" />
                          <span className="text-[8px] font-mono font-black text-white uppercase tracking-wider bg-slate-800 px-1 rounded">
                            {el.plate || 'OCUPADO'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tope de Llanta 3D con Franjas de Seguridad */}
                    <div className="w-full h-2 rounded bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border border-amber-300/60 shadow-sm flex items-center justify-around px-0.5 z-10 my-0.5 overflow-hidden">
                      <div className="w-1.5 h-full bg-slate-950 transform -skew-x-12" />
                      <div className="w-1.5 h-full bg-slate-950 transform -skew-x-12" />
                      <div className="w-1.5 h-full bg-slate-950 transform -skew-x-12" />
                    </div>

                    {/* Estado inferior */}
                    <div className="text-center text-[8px] font-mono font-bold leading-none z-10">
                      {isFree ? (
                        <span className="text-emerald-400 tracking-wider font-extrabold">LIBRE</span>
                      ) : (
                        <span className="text-rose-400 tracking-wider">OCUPADO</span>
                      )}
                    </div>
                  </div>
                );
              }

              // 2. Muros Perimétricos de Hormigón Armado
              if (el.type === 'wall') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-xs cursor-pointer z-5 shadow-[0_4px_12px_rgba(0,0,0,0.8)] border border-slate-500/80 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 bg-cyan-600 z-30' : ''
                    }`}
                  >
                    <div className="w-full h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_4px,transparent_4px,transparent_8px)]" />
                  </div>
                );
              }

              // 3. Vías y Carriles con Señalética y Tachas Reflectivas
              if (el.type === 'road') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute bg-[#151c28] border-y-2 border-dashed border-amber-400/70 flex flex-col items-center justify-center cursor-pointer z-2 overflow-hidden shadow-inner ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 z-30' : ''
                    }`}
                  >
                    {/* Línea Divisoria Central con Flechas Direccionales */}
                    <div className="w-full flex items-center justify-around px-4 pointer-events-none opacity-80">
                      <span className="text-[10px] font-mono font-black text-amber-400/70 tracking-widest flex items-center gap-2">
                        <span>━►</span>
                        <span>{el.label || 'CARRIL VIAL DE CIRCULACIÓN'}</span>
                        <span>━►</span>
                      </span>
                    </div>

                    {/* Tachas / Cat's Eyes Reflectivos en el Pavimento */}
                    <div className="w-full flex items-center justify-between px-6 pointer-events-none mt-1">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                      ))}
                    </div>
                  </div>
                );
              }

              // 4. Cruces Peatonales (Paso de Cebra de Alto Contraste)
              if (el.type === 'crosswalk') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute bg-[#1a2230] border-x-2 border-amber-400/80 rounded flex flex-col justify-around py-1.5 px-1 cursor-pointer z-4 shadow-lg ${
                      isSelected ? 'ring-4 ring-cyan-400 opacity-95 z-30' : ''
                    }`}
                  >
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-full h-2 bg-slate-100 rounded-xs shadow-sm" />
                    ))}
                  </div>
                );
              }

              // 5. Garitas / Accesos Tecnológicos (Entrada LPR & Salida Control)
              if (el.type === 'gate') {
                const isEntry = el.gateType === 'entry' || (el.label && el.label.toUpperCase().includes('ENTRADA'));
                const isExit = el.gateType === 'exit' || (el.label && el.label.toUpperCase().includes('SALIDA'));

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-2xl flex flex-col items-center justify-between p-2 shadow-2xl cursor-pointer z-20 border-2 select-none backdrop-blur-md ${
                      isSelected ? 'ring-4 ring-cyan-400 z-30 scale-105 shadow-[0_0_25px_rgba(6,182,212,0.9)]' : ''
                    } ${
                      isEntry
                        ? 'bg-gradient-to-b from-slate-950 via-emerald-950/80 to-slate-950 border-emerald-400 text-emerald-300 shadow-emerald-500/30'
                        : isExit
                        ? 'bg-gradient-to-b from-slate-950 via-rose-950/80 to-slate-950 border-rose-400 text-rose-300 shadow-rose-500/30'
                        : 'bg-slate-950 border-cyan-400 text-cyan-300 shadow-cyan-500/30'
                    }`}
                  >
                    {/* Indicador LED y Sensor ANPR */}
                    <div className="flex items-center gap-2 w-full justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full animate-ping ${
                        isEntry ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                      }`} />
                      <span className="text-[9px] font-mono font-black tracking-widest text-white drop-shadow">
                        {isEntry ? 'ENTRADA' : isExit ? 'SALIDA' : 'ACCESO'}
                      </span>
                    </div>

                    {/* Talanquera Motorizada con Rayas Reflectivas */}
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-600 shadow-inner flex items-center my-1">
                      <div className={`h-full w-full bg-[repeating-linear-gradient(45deg,#ffffff,#ffffff_6px,${isEntry ? '#10b981' : '#f43f5e'}_6px,${isEntry ? '#10b981' : '#f43f5e'}_12px)]`} />
                    </div>

                    {/* Sensor / Cámara LPR */}
                    <div className="w-full flex items-center justify-between text-[7px] font-mono font-bold text-slate-300 bg-slate-900/80 px-1 py-0.5 rounded border border-slate-800">
                      <span>{isEntry ? '📷 ANPR' : '💳 POS'}</span>
                      <span className="text-amber-300">AUTO</span>
                    </div>

                    <div className="text-[8px] font-mono font-black uppercase text-center text-white truncate max-w-full tracking-tight">
                      {el.label || (isEntry ? 'GARITA LPR' : 'CONTROL COBRO')}
                    </div>
                  </div>
                );
              }

              // 6. Jardín y Paisajismo
              if (el.type === 'garden') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 border-2 border-emerald-500/80 rounded-3xl flex flex-col items-center justify-center p-2 text-emerald-200 cursor-pointer z-3 shadow-xl overflow-hidden ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 z-30 scale-[1.01]' : ''
                    }`}
                  >
                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.15),transparent_70%)] flex flex-col items-center justify-center">
                      <TreeIcon className="w-7 h-7 shrink-0 text-emerald-400 drop-shadow-md mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 drop-shadow">
                        {el.label || 'ÁREA VERDE'}
                      </span>
                    </div>
                  </div>
                );
              }

              // 7. Área externa o edificio
              if (el.type === 'building') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700 rounded-2xl flex items-center justify-center p-3 text-slate-400 cursor-pointer z-2 shadow-2xl ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 z-30' : ''
                    }`}
                  >
                    <div className="w-full h-full border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02)_6px,transparent_6px,transparent_12px)]">
                      <span className="text-xs font-mono font-black text-center text-slate-300 uppercase tracking-wider">
                        {el.label}
                      </span>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* ============================================================
                TIRADORES DE REDIMENSIONAMIENTO Y ROTACIÓN (INTERACTIVOS)
                ============================================================ */}
            {selectedElement && !readOnly && (
              <div
                style={{
                  left: `${selectedElement.x}px`,
                  top: `${selectedElement.y}px`,
                  width: `${selectedElement.w}px`,
                  height: `${selectedElement.h}px`,
                  transform: `rotate(${selectedElement.rot || 0}deg)`,
                  transformOrigin: 'center center'
                }}
                className="absolute pointer-events-none z-40 border-2 border-dashed border-cyan-400 rounded-xl"
              >
                {/* Micro-Barra Flotante sobre el elemento seleccionado */}
                <div 
                  className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-slate-700 text-white px-2 py-1 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto select-none"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => handleQuickResize(10, 10)} 
                    className="p-1 hover:bg-slate-800 rounded text-emerald-400 text-xs font-bold flex items-center" 
                    title="Agrandar (+10px)"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button 
                    onClick={() => handleQuickResize(-10, -10)} 
                    className="p-1 hover:bg-slate-800 rounded text-amber-400 text-xs font-bold flex items-center" 
                    title="Reducir (-10px)"
                  >
                    <Minus className="w-4 h-4 shrink-0" />
                  </button>
                  <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                  <button 
                    onClick={() => handleRotateStep(90)} 
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 text-xs" 
                    title="Girar 90° (R)"
                  >
                    <RotateCw className="w-4 h-4 shrink-0" />
                  </button>
                  <button 
                    onClick={handleDuplicateSelected} 
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 text-xs" 
                    title="Duplicar (Ctrl+D)"
                  >
                    <Copy className="w-4 h-4 shrink-0" />
                  </button>
                  <button 
                    onClick={handleDeleteSelected} 
                    className="p-1 hover:bg-rose-900/60 text-rose-400 rounded text-xs" 
                    title="Eliminar (Supr)"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>

                {/* Tirador de Rotación Superior */}
                <div 
                  className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing"
                  onMouseDown={handleRotateKnobDown}
                  title="Arrastra para rotar libremente"
                >
                  <div className="w-4 h-4 shrink-0 rounded-full bg-cyan-400 border-2 border-white shadow-lg" />
                  <div className="w-0.5 h-3.5 bg-cyan-400" />
                </div>

                {/* Tiradores de Esquinas (Resize) */}
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'tl')}
                  className="absolute -top-2 -left-2 w-4 h-4 shrink-0 bg-white border-2 border-cyan-500 rounded-sm shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar / Reducir esquina"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'tr')}
                  className="absolute -top-2 -right-2 w-4 h-4 shrink-0 bg-white border-2 border-cyan-500 rounded-sm shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar / Reducir esquina"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'bl')}
                  className="absolute -bottom-2 -left-2 w-4 h-4 shrink-0 bg-white border-2 border-cyan-500 rounded-sm shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar / Reducir esquina"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'br')}
                  className="absolute -bottom-2 -right-2 w-4 h-4 shrink-0 bg-white border-2 border-cyan-500 rounded-sm shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar / Reducir esquina"
                />

                {/* Tiradores Laterales de Bordes */}
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'r')}
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-6 bg-cyan-400 border border-white rounded-xs shadow-md cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar ancho"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'b')}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3.5 bg-cyan-400 border border-white rounded-xs shadow-md cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Agrandar alto"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 'l')}
                  className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-6 bg-cyan-400 border border-white rounded-xs shadow-md cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Ajustar ancho izquierdo"
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleDown(e, 't')}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3.5 bg-cyan-400 border border-white rounded-xs shadow-md cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform" 
                  title="Ajustar alto superior"
                />
              </div>
            )}

            {/* Vista previa de arrastre mientras se dibuja */}
            {isDrawing && currentDraw && (
              <div
                style={{
                  left: `${currentDraw.x}px`,
                  top: `${currentDraw.y}px`,
                  width: `${currentDraw.w}px`,
                  height: `${currentDraw.h}px`
                }}
                className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/20 rounded-xl pointer-events-none z-40"
              />
            )}
          </div>
        </div>
      </div>

      {/* Barra de Estado CAD Inferior */}
      <div className="px-4 py-2 bg-slate-950/90 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">HERRAMIENTA:</span>
            <span className="uppercase text-cyan-400 font-bold">{activeTool.replace('_', ' ')}</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">
            Plano: <strong className="text-white">{canvasWidth}×{canvasHeight}px</strong>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">
            Snap: <strong className={snapToGrid ? "text-emerald-400" : "text-slate-500"}>{snapToGrid ? "Activo (20px)" : "Inactivo"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Zoom: <strong className="text-emerald-400">{zoom}%</strong></span>
        </div>
      </div>
    </div>

    {/* ============================================================
        INSPECTOR DE PROPIEDADES LATERAL (UX PRO)
        ============================================================ */}
    <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 shrink-0 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Propiedades</h3>
            </div>
            {selectedElement && (
              <span className="font-mono text-[10px] uppercase font-bold text-slate-500">
                {selectedElement.type}
              </span>
            )}
          </div>

          {selectedElement ? (
            <div className="space-y-4">
              
              {/* Código y Acciones Rápidas */}
              {selectedElement.type === 'slot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-slate-400 font-tech">Código de Plaza</label>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleDuplicateSelected} 
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs" 
                        title="Duplicar (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4 shrink-0" />
                      </button>
                      <button 
                        onClick={handleDeleteSelected} 
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs" 
                        title="Eliminar (Supr)"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                  <Input
                    type="text"
                    value={selectedElement.code || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, code: val } : el));
                      setHasUnsavedChanges(true);
                    }}
                    className="font-mono font-bold text-sm bg-slate-50 border-slate-300 text-slate-900"
                  />
                </div>
              )}

              {/* Botones Rápidos para Agrandar / Redimensionar */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500 font-tech flex items-center gap-1">
                    <Scaling className="w-4 h-4 shrink-0 text-emerald-600" /> Tamaño del Elemento
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800">
                    {selectedElement.w} × {selectedElement.h} px
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <Button 
                    onClick={() => handleQuickResize(10, 10)} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
                  >
                    <Plus className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Agrandar (+10px)</span>
                  </Button>
                  <Button 
                    onClick={() => handleQuickResize(-10, -10)} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold gap-1 bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                  >
                    <Minus className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Reducir (-10px)</span>
                  </Button>
                </div>

                {/* Presets Rápidos de Dimensiones Compactas */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono font-bold">
                  <button
                    onClick={() => handleSetExactSize(56, 96)}
                    className="py-1.5 px-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-center shadow-xs"
                    title="Tamaño estándar auto (56x96)"
                  >
                    56×96 (Auto)
                  </button>
                  <button
                    onClick={() => handleSetExactSize(38, 65)}
                    className="py-1.5 px-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-center shadow-xs"
                    title="Plaza moto (38x65)"
                  >
                    38×65 (Moto)
                  </button>
                </div>
              </div>

              {/* Selector de Tipo de Plaza con 1 Clic */}
              {selectedElement.type === 'slot' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-tech">Tipo de Plaza</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'auto', label: 'Auto', icon: Car },
                      { id: 'moto', label: 'Moto', icon: Bike }
                    ].map(t => {
                      const Icon = t.icon;
                      const isCurrent = (selectedElement.slotType || 'auto') === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, slotType: t.id } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold border transition ${
                            isCurrent
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-400'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 mb-1 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Switch de Techado */}
                  <label className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={!!selectedElement.shaded}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, shaded: val } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-950">Plaza con Cubierta (Techada)</span>
                  </label>
                </div>
              )}

              {/* Estado de Ocupación y Simulación */}
              {selectedElement.type === 'slot' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-[11px] font-bold uppercase text-slate-500 font-tech block">Estado de la Plaza</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, status: 'free', plate: undefined } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        selectedElement.status === 'free' 
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300' 
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      <span>LIBRE</span>
                    </button>

                    <button
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, status: 'occupied', plate: el.plate || 'ABC-123' } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        selectedElement.status === 'occupied' 
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300' 
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-300" />
                      <span>OCUPADO</span>
                    </button>
                  </div>

                  {selectedElement.status === 'occupied' && (
                    <div className="pt-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Matrícula / Placa</label>
                      <Input
                        type="text"
                        value={selectedElement.plate || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, plate: val } : el));
                          setHasUnsavedChanges(true);
                        }}
                        className="font-mono font-bold text-xs bg-white uppercase"
                        placeholder="ABC-123"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Control específico para Garitas y Accesos (Entrada / Salida) */}
              {selectedElement.type === 'gate' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-[11px] font-bold uppercase text-slate-500 font-tech block">Tipo de Acceso</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, gateType: 'entry', label: 'ENTRADA LPR' } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        (selectedElement.gateType === 'entry' || (selectedElement.label && selectedElement.label.toUpperCase().includes('ENTRADA')))
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <LogIn className="w-4 h-4 shrink-0 text-emerald-300" />
                      <span>ENTRADA</span>
                    </button>

                    <button
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, gateType: 'exit', label: 'SALIDA CONTROL' } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        (selectedElement.gateType === 'exit' || (selectedElement.label && selectedElement.label.toUpperCase().includes('SALIDA')))
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4 shrink-0 text-rose-300" />
                      <span>SALIDA</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Etiqueta para Vías, Garitas o Jardines */}
              {['road', 'building', 'garden', 'gate'].includes(selectedElement.type) && (
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-tech block mb-1">Etiqueta del Plano</label>
                  <Input
                    type="text"
                    value={selectedElement.label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, label: val } : el));
                      setHasUnsavedChanges(true);
                    }}
                    className="font-bold text-xs"
                  />
                </div>
              )}

              {/* Ajuste Rápido de Inclinación */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[11px] font-bold uppercase text-slate-400 font-tech flex items-center gap-1">
                    <Compass className="w-4 h-4 shrink-0" /> Giro / Ángulo
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">{selectedElement.rot || 0}°</span>
                </div>

                <div className="grid grid-cols-5 gap-1 text-[10px] font-mono font-bold">
                  {[0, 30, 45, 90, 180].map(deg => (
                    <button
                      key={deg}
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, rot: deg } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1.5 rounded-lg transition ${
                        (selectedElement.rot || 0) === deg 
                          ? 'bg-slate-900 text-white font-black' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Alineación Rápida */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold uppercase text-slate-400 font-tech block">Alinear en el Lote</label>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                  <Button onClick={() => handleAlignSelected('top')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ⬆️ Arriba
                  </Button>
                  <Button onClick={() => handleAlignSelected('center-v')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ↕️ Centro
                  </Button>
                  <Button onClick={() => handleAlignSelected('bottom')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ⬇️ Abajo
                  </Button>
                  <Button onClick={() => handleAlignSelected('left')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ⬅️ Izq.
                  </Button>
                  <Button onClick={() => handleAlignSelected('center-h')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ↔️ Centro
                  </Button>
                  <Button onClick={() => handleAlignSelected('right')} variant="outline" size="sm" className="h-7 text-[10px]">
                    ➡️ Der.
                  </Button>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <Button 
                  onClick={handleDuplicateSelected} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs font-bold gap-1.5 rounded-xl border-slate-300 hover:bg-slate-100"
                >
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Duplicar Elemento (Ctrl+D)</span>
                </Button>
                <Button 
                  onClick={handleDeleteSelected} 
                  variant="destructive" 
                  size="sm" 
                  className="w-full text-xs font-bold gap-1.5 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Eliminar Elemento (Supr)</span>
                </Button>
              </div>

            </div>
          ) : (
            /* Estado cuando no hay elemento seleccionado: Dashboard Estadístico */
            <div className="space-y-4">
              <div className="text-center py-4 text-slate-400 space-y-1.5 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <MousePointer className="w-6 h-6 shrink-0" />
                </div>
                <p className="text-xs font-bold text-slate-800">Selecciona un elemento para editar</p>
                <p className="text-[11px] text-slate-400">Haz clic sobre cualquier cajón, muro o vía en el plano.</p>
              </div>

              {/* Resumen del Lote en Tiempo Real */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 font-tech block">Métricas del Plano</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Plazas</span>
                    <span className="text-xl font-bold font-mono text-slate-900">{totalSlots}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <span className="text-[10px] text-emerald-700 font-bold block uppercase">Libres</span>
                    <span className="text-xl font-bold font-mono text-emerald-800">{freeSlots}</span>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl">
                    <span className="text-[10px] text-orange-700 font-bold block uppercase">Motos</span>
                    <span className="text-xl font-bold font-mono text-orange-800">{motoSlots}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                    <span className="text-[10px] text-amber-700 font-bold block uppercase">Techadas</span>
                    <span className="text-xl font-bold font-mono text-amber-800">{shadedSlots}</span>
                  </div>
                </div>
              </div>

              {/* Consejos de Edición */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block text-xs">💡 Ayuda de Edición</span>
                <ul className="space-y-1 text-slate-500 list-disc list-inside">
                  <li>Haz clic en cualquier elemento para editarlo o cambiar su tamaño.</li>
                  <li>Arrastra libremente para moverlo por el plano.</li>
                  <li>Usa los controles del panel para girar y alinear.</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};