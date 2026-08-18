import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MousePointer, 
  Grid, 
  Square, 
  Plus, 
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
  Upload, 
  Download,
  Undo, 
  Redo, 
  Type, 
  Navigation, 
  Sparkles,
  Move,
  CheckCircle2,
  Sliders,
  Compass,
  Building,
  Shapes,
  Trees as TreeIcon,
  Umbrella,
  Accessibility,
  Bike,
  DoorClosed,
  Crown,
  AlignLeft,
  AlignRight,
  AlignCenter,
  Footprints,
  Check,
  RefreshCw,
  Palette
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  { id: 5, type: 'road', x: 60, y: 280, w: 980, h: 120, rot: 0, label: 'CARRIL VIAL CENTRAL (6.00 m)' },
  { id: 6, type: 'crosswalk', x: 520, y: 280, w: 80, h: 120, rot: 0 },
  { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'ACCESO GARITA ANPR' },
  
  // Fila Norte
  { id: 10, type: 'slot', code: 'A-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
  { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'ABC-123', color: '#ef4444' },
  { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 435, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'A-06', slotType: 'auto', x: 610, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'XYZ-789', color: '#3b82f6' },
  { id: 16, type: 'slot', code: 'A-07', slotType: 'vip', x: 695, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
  { id: 17, type: 'slot', code: 'A-08', slotType: 'moto', x: 785, y: 70, w: 50, h: 140, rot: 0, status: 'free' },
  { id: 18, type: 'slot', code: 'A-09', slotType: 'moto', x: 845, y: 70, w: 50, h: 140, rot: 0, status: 'free' },

  // Fila Sur
  { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
  { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', shaded: true, x: 165, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 250, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 23, type: 'slot', code: 'B-04', slotType: 'auto', x: 335, y: 470, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
  { id: 24, type: 'slot', code: 'B-05', slotType: 'auto', x: 420, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 25, type: 'slot', code: 'B-06', slotType: 'auto', x: 610, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 26, type: 'slot', code: 'B-07', slotType: 'auto', x: 695, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 27, type: 'slot', code: 'B-08', slotType: 'auto', x: 780, y: 470, w: 75, h: 140, rot: 0, status: 'free' }
];

// 2. Terreno en 'L'
const L_SHAPE_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 520, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 548, y: 340, w: 12, h: 320, rot: 0 },
  { id: 5, type: 'wall', x: 548, y: 340, w: 512, h: 12, rot: 0 },
  { id: 6, type: 'wall', x: 1048, y: 40, w: 12, h: 312, rot: 0 },
  { id: 7, type: 'building', x: 560, y: 352, w: 488, h: 296, rot: 0, label: 'EDIFICIO COLINDANTE (ÁREA PRIVADA)' },
  { id: 8, type: 'road', x: 60, y: 220, w: 980, h: 90, rot: 0, label: 'CARRIL NORTE' },
  { id: 9, type: 'road', x: 230, y: 230, w: 90, h: 410, rot: 0, label: 'CARRIL OESTE' },
  { id: 10, type: 'gate', x: 40, y: 220, w: 30, h: 90, rot: 0, label: 'GARITA' },

  { id: 11, type: 'slot', code: 'N-01', slotType: 'pmr', x: 80, y: 65, w: 85, h: 135, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'N-02', slotType: 'auto', shaded: true, x: 170, y: 65, w: 75, h: 135, rot: 0, status: 'free' },
  { id: 13, type: 'slot', code: 'N-03', slotType: 'auto', shaded: true, x: 250, y: 65, w: 75, h: 135, rot: 0, status: 'occupied', plate: 'ABC-123' },
  { id: 14, type: 'slot', code: 'N-04', slotType: 'auto', x: 330, y: 65, w: 75, h: 135, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'N-05', slotType: 'auto', x: 415, y: 65, w: 75, h: 135, rot: 0, status: 'free' },
  { id: 16, type: 'slot', code: 'N-06', slotType: 'auto', x: 580, y: 65, w: 75, h: 135, rot: 0, status: 'free' },
  { id: 17, type: 'slot', code: 'N-07', slotType: 'moto', x: 660, y: 65, w: 50, h: 135, rot: 0, status: 'free' },

  { id: 20, type: 'slot', code: 'O-01', slotType: 'auto', shaded: true, x: 75, y: 350, w: 135, h: 70, rot: 0, status: 'free' },
  { id: 21, type: 'slot', code: 'O-02', slotType: 'auto', shaded: true, x: 75, y: 425, w: 135, h: 70, rot: 0, status: 'occupied', plate: 'XYZ-789' },
  { id: 22, type: 'slot', code: 'O-03', slotType: 'auto', x: 75, y: 500, w: 135, h: 70, rot: 0, status: 'free' },
  { id: 23, type: 'slot', code: 'O-04', slotType: 'auto', x: 75, y: 570, w: 135, h: 70, rot: 0, status: 'free' },
  { id: 24, type: 'slot', code: 'O-05', slotType: 'auto', x: 340, y: 350, w: 135, h: 70, rot: 0, status: 'free' },
  { id: 25, type: 'slot', code: 'O-06', slotType: 'auto', x: 340, y: 425, w: 135, h: 70, rot: 0, status: 'free' },
  { id: 26, type: 'slot', code: 'O-07', slotType: 'auto', x: 340, y: 500, w: 135, h: 70, rot: 0, status: 'free' }
];

// 3. Terreno Diagonal / Espina de Pez
const DIAGONAL_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 800, y: 150, w: 340, h: 12, rot: 45 },
  { id: 5, type: 'garden', x: 880, y: 370, w: 165, h: 270, rot: 0, label: 'ÁREA VERDE / RETIRO' },
  { id: 6, type: 'road', x: 60, y: 280, w: 820, h: 110, rot: 0, label: 'CARRIL DIAGONAL' },
  { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 110, rot: 0, label: 'GARITA' },

  { id: 10, type: 'slot', code: 'D-01', slotType: 'pmr', x: 90, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
  { id: 11, type: 'slot', code: 'D-02', slotType: 'auto', shaded: true, x: 180, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
  { id: 12, type: 'slot', code: 'D-03', slotType: 'auto', shaded: true, x: 270, y: 90, w: 75, h: 135, rot: 30, status: 'occupied', plate: 'AYC-101' },
  { id: 13, type: 'slot', code: 'D-04', slotType: 'auto', x: 360, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
  { id: 14, type: 'slot', code: 'D-05', slotType: 'auto', x: 450, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
  { id: 15, type: 'slot', code: 'D-06', slotType: 'auto', x: 540, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
  { id: 16, type: 'slot', code: 'D-07', slotType: 'auto', x: 630, y: 90, w: 75, h: 135, rot: 30, status: 'free' },

  { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 90, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
  { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', shaded: true, x: 180, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
  { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 270, y: 460, w: 75, h: 135, rot: -30, status: 'occupied', plate: 'ABC-777' },
  { id: 23, type: 'slot', code: 'B-04', slotType: 'auto', x: 360, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
  { id: 24, type: 'slot', code: 'B-05', slotType: 'auto', x: 450, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
  { id: 25, type: 'slot', code: 'B-06', slotType: 'moto', x: 540, y: 460, w: 50, h: 135, rot: -30, status: 'free' }
];

// 4. Terreno en 'U'
const U_SHAPE_PRESET = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'building', x: 360, y: 200, w: 380, h: 300, rot: 0, label: 'PATIO / LOCAL COMERCIAL CENTRAL' },
  { id: 6, type: 'road', x: 60, y: 220, w: 280, h: 80, rot: 0, label: 'ACCESO' },
  { id: 7, type: 'road', x: 60, y: 420, w: 280, h: 80, rot: 0, label: 'SALIDA' },
  { id: 8, type: 'gate', x: 40, y: 220, w: 30, h: 80, rot: 0, label: 'ENTRADA' },
  { id: 9, type: 'gate', x: 40, y: 420, w: 30, h: 80, rot: 0, label: 'SALIDA' },

  { id: 10, type: 'slot', code: 'U-01', slotType: 'pmr', x: 80, y: 60, w: 85, h: 130, rot: 0, status: 'free' },
  { id: 11, type: 'slot', code: 'U-02', slotType: 'auto', shaded: true, x: 170, y: 60, w: 75, h: 130, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'U-03', slotType: 'auto', shaded: true, x: 250, y: 60, w: 75, h: 130, rot: 0, status: 'occupied', plate: 'P3X-998' },
  { id: 13, type: 'slot', code: 'U-04', slotType: 'auto', x: 330, y: 60, w: 75, h: 130, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'U-05', slotType: 'auto', x: 410, y: 60, w: 75, h: 130, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'U-06', slotType: 'auto', x: 495, y: 60, w: 75, h: 130, rot: 0, status: 'free' }
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
  const [zoom, setZoom] = useState(75);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  const containerRef = useRef(null);

  // Auto-ajuste de escala para visualización 100% completa
  const handleFitToScreen = () => {
    if (containerRef.current) {
      const availableWidth = containerRef.current.clientWidth - 48;
      const fitZoom = Math.min(100, Math.max(40, Math.round((availableWidth / canvasWidth) * 100)));
      setZoom(fitZoom);
    }
  };

  useEffect(() => {
    handleFitToScreen();
  }, [canvasWidth]);

  // Elementos en el plano
  const [elements, setElements] = useState(initialElements || RECTANGULAR_PRESET);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([elements]);
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
  const jsonInputRef = useRef(null);

  const selectedElement = elements.find(e => e.id === selectedId);

  // Contadores
  const totalSlots = elements.filter(e => e.type === 'slot').length;
  const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
  const occupiedSlots = elements.filter(e => e.type === 'slot' && e.status === 'occupied').length;
  const pmrSlots = elements.filter(e => e.type === 'slot' && e.slotType === 'pmr').length;
  const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;

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

  // Cargar plantilla de forma de lote
  const handleApplyLotPreset = (shapeKey) => {
    setLotShape(shapeKey);
    let newElems = [];
    if (shapeKey === 'rectangular') newElems = RECTANGULAR_PRESET;
    else if (shapeKey === 'l_shape') newElems = L_SHAPE_PRESET;
    else if (shapeKey === 'diagonal') newElems = DIAGONAL_PRESET;
    else if (shapeKey === 'u_shape') newElems = U_SHAPE_PRESET;
    else if (shapeKey === 'blank') newElems = [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 }
    ];

    setElements(newElems);
    pushHistory(newElems);
    setSelectedId(null);
    setMessage(`Plantilla de terreno "${shapeKey.toUpperCase()}" aplicada.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Auto-Numeración Inteligente de Plazas
  const handleAutoRenumber = () => {
    const slots = elements.filter(e => e.type === 'slot');
    const others = elements.filter(e => e.type !== 'slot');

    if (slots.length === 0) {
      setMessage('No hay plazas para renumerar.');
      return;
    }

    // Ordenar de arriba hacia abajo y de izquierda a derecha
    const sortedSlots = [...slots].sort((a, b) => {
      const rowA = Math.floor(a.y / 100);
      const rowB = Math.floor(b.y / 100);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    let autoCount = 0;
    let pmrCount = 0;
    let motoCount = 0;
    let vipCount = 0;

    const renumberedSlots = sortedSlots.map(slot => {
      let code = '';
      if (slot.slotType === 'pmr') {
        pmrCount++;
        code = `PMR-${String(pmrCount).padStart(2, '0')}`;
      } else if (slot.slotType === 'moto') {
        motoCount++;
        code = `M-${String(motoCount).padStart(2, '0')}`;
      } else if (slot.slotType === 'vip') {
        vipCount++;
        code = `VIP-${String(vipCount).padStart(2, '0')}`;
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
    setMessage(`¡${slots.length} plazas auto-renumeradas ordenadamente!`);
    setTimeout(() => setMessage(''), 3500);
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

  // Rotar 90° rápido
  const handleRotate90 = () => {
    if (!selectedElement) return;
    const nextRot = ((selectedElement.rot || 0) + 90) % 360;
    const updated = elements.map(el => el.id === selectedId ? { ...el, rot: nextRot } : el);
    setElements(updated);
    pushHistory(updated);
  };

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

  // Inicio de Redimensionamiento por Agarre
  const handleResizeStart = (e, handle) => {
    e.stopPropagation();
    if (!selectedElement || readOnly) return;
    const coords = getCanvasCoords(e);
    setDragState({
      mode: 'resize',
      handle,
      startX: coords.x,
      startY: coords.y,
      origX: selectedElement.x,
      origY: selectedElement.y,
      origW: selectedElement.w,
      origH: selectedElement.h
    });
  };

  // Inicio de Rotación por Agarre
  const handleRotateStart = (e) => {
    e.stopPropagation();
    if (!selectedElement || readOnly) return;
    const coords = getCanvasCoords(e);
    setDragState({
      mode: 'rotate',
      startX: coords.x,
      startY: coords.y,
      origX: selectedElement.x,
      origY: selectedElement.y,
      origW: selectedElement.w,
      origH: selectedElement.h,
      origRot: selectedElement.rot || 0
    });
  };

  const handleGlobalMouseMove = useCallback((e) => {
    const coords = getCanvasCoords(e);

    // Mover / Redimensionar / Rotar
    if (dragState && selectedElement) {
      if (dragState.mode === 'move') {
        const dx = coords.x - dragState.startX;
        const dy = coords.y - dragState.startY;
        const updated = elements.map(el => el.id === selectedId ? {
          ...el,
          x: Math.max(0, Math.min(canvasWidth - el.w, dragState.origX + dx)),
          y: Math.max(0, Math.min(canvasHeight - el.h, dragState.origY + dy))
        } : el);
        setElements(updated);
      } else if (dragState.mode === 'resize') {
        const dx = coords.x - dragState.startX;
        const dy = coords.y - dragState.startY;
        let newW = dragState.origW;
        let newH = dragState.origH;
        let newX = dragState.origX;
        let newY = dragState.origY;

        if (dragState.handle.includes('e')) newW = Math.max(20, dragState.origW + dx);
        if (dragState.handle.includes('s')) newH = Math.max(20, dragState.origH + dy);
        if (dragState.handle.includes('w')) {
          const possibleW = dragState.origW - dx;
          if (possibleW >= 20) {
            newW = possibleW;
            newX = dragState.origX + dx;
          }
        }
        if (dragState.handle.includes('n')) {
          const possibleH = dragState.origH - dy;
          if (possibleH >= 20) {
            newH = possibleH;
            newY = dragState.origY + dy;
          }
        }

        const updated = elements.map(el => el.id === selectedId ? {
          ...el,
          x: newX,
          y: newY,
          w: newW,
          h: newH
        } : el);
        setElements(updated);
      } else if (dragState.mode === 'rotate') {
        const centerX = dragState.origX + dragState.origW / 2;
        const centerY = dragState.origY + dragState.origH / 2;
        const rad = Math.atan2(coords.y - centerY, coords.x - centerX);
        let deg = Math.round(rad * (180 / Math.PI)) + 90;
        if (deg < 0) deg += 360;
        if (snapToGrid) deg = Math.round(deg / 15) * 15;

        const updated = elements.map(el => el.id === selectedId ? {
          ...el,
          rot: deg % 360
        } : el);
        setElements(updated);
      }
      return;
    }

    // Dibujo activo
    if (isDrawing && drawStart) {
      const w = coords.x - drawStart.x;
      const h = coords.y - drawStart.y;
      setCurrentDraw({
        x: w >= 0 ? drawStart.x : coords.x,
        y: h >= 0 ? drawStart.y : coords.y,
        w: Math.abs(w),
        h: Math.abs(h)
      });
    }
  }, [dragState, isDrawing, drawStart, selectedElement, selectedId, zoom, snapToGrid, gridSize, canvasWidth, canvasHeight, elements]);

  const handleGlobalMouseUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      pushHistory(elements);
    }

    if (isDrawing && currentDraw) {
      setIsDrawing(false);
      const newId = Date.now();
      let newElements = [...elements];

      // Fila de cajones arrastrada
      if (activeTool === 'draw_row') {
        const slotWidth = 75;
        const slotHeight = Math.max(120, currentDraw.h);
        const count = Math.max(2, Math.floor(currentDraw.w / slotWidth));
        const existingCount = elements.filter(e => e.type === 'slot').length;
        const prefix = String.fromCharCode(65 + (Math.floor(existingCount / 10) % 26));

        for (let i = 0; i < count; i++) {
          newElements.push({
            id: newId + i,
            type: 'slot',
            code: `${prefix}-0${(existingCount % 10) + i + 1}`,
            slotType: i === 0 ? 'pmr' : 'auto',
            shaded: i === 1,
            x: currentDraw.x + i * slotWidth,
            y: currentDraw.y,
            w: slotWidth,
            h: slotHeight,
            rot: 0,
            status: 'free'
          });
        }
        setMessage(`Fila de ${count} cajones trazada.`);
      }
      // Cajón individual
      else if (activeTool.startsWith('slot_')) {
        const rawType = activeTool.replace('slot_', '');
        const isShaded = rawType === 'shaded';
        const isVIP = rawType === 'vip';
        const isPMR = rawType === 'pmr';
        const isMoto = rawType === 'moto';
        const slotType = isShaded ? 'auto' : rawType;
        
        const count = elements.filter(e => e.type === 'slot').length + 1;
        const code = isShaded ? `S-0${count}` : isVIP ? `VIP-0${count}` : isPMR ? `PMR-0${count}` : isMoto ? `M-0${count}` : `A-0${count}`;
        const defaultW = isMoto ? 50 : isPMR || isVIP ? 85 : 75;
        const defaultH = isMoto ? 80 : 140;

        newElements.push({
          id: newId,
          type: 'slot',
          code,
          slotType,
          shaded: isShaded,
          x: currentDraw.x,
          y: currentDraw.y,
          w: currentDraw.w > 40 ? currentDraw.w : defaultW,
          h: currentDraw.h > 40 ? currentDraw.h : defaultH,
          rot: 0,
          status: 'free'
        });
        setMessage(`Cajón ${code} colocado.`);
      }
      // Muro
      else if (activeTool === 'draw_wall' || activeTool === 'add_wall') {
        newElements.push({
          id: newId,
          type: 'wall',
          x: currentDraw.x,
          y: currentDraw.y,
          w: Math.max(12, currentDraw.w),
          h: Math.max(12, currentDraw.h),
          rot: 0
        });
        setMessage(`Muro estructural colocado.`);
      }
      // Calle / Carril
      else if (activeTool === 'draw_road' || activeTool === 'add_road') {
        newElements.push({
          id: newId,
          type: 'road',
          x: currentDraw.x,
          y: currentDraw.y,
          w: Math.max(60, currentDraw.w),
          h: Math.max(60, currentDraw.h),
          rot: 0,
          label: 'CARRIL DE CIRCULACIÓN'
        });
        setMessage(`Vía de circulación colocada.`);
      }
      // Cruce peatonal
      else if (activeTool === 'add_crosswalk') {
        newElements.push({
          id: newId,
          type: 'crosswalk',
          x: currentDraw.x,
          y: currentDraw.y,
          w: Math.max(60, currentDraw.w > 30 ? currentDraw.w : 80),
          h: Math.max(60, currentDraw.h > 30 ? currentDraw.h : 80),
          rot: 0
        });
        setMessage(`Cruce peatonal añadido.`);
      }
      // Garita
      else if (activeTool === 'add_gate') {
        newElements.push({
          id: newId,
          type: 'gate',
          x: currentDraw.x,
          y: currentDraw.y,
          w: 35,
          h: 90,
          rot: 0,
          label: 'GARITA LPR'
        });
        setMessage(`Garita de control ANPR colocada.`);
      }
      // Área verde / Jardín
      else if (activeTool === 'add_garden') {
        newElements.push({
          id: newId,
          type: 'garden',
          x: currentDraw.x,
          y: currentDraw.y,
          w: Math.max(60, currentDraw.w),
          h: Math.max(60, currentDraw.h),
          rot: 0,
          label: 'ÁREA VERDE'
        });
        setMessage(`Jardinería y retiro añadido.`);
      }

      setElements(newElements);
      pushHistory(newElements);
      setCurrentDraw(null);
      setTimeout(() => setMessage(''), 2500);
    }
  }, [dragState, isDrawing, currentDraw, activeTool, elements]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Atajos de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        const updated = elements.filter(el => el.id !== selectedId);
        setElements(updated);
        pushHistory(updated);
        setSelectedId(null);
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.ctrlKey && e.key === 'd' && selectedId) {
        e.preventDefault();
        handleDuplicateSelected();
      }
      if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedId(null);
      }
      // Nudge con flechas
      if (selectedId) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, y: Math.max(0, el.y - step) } : el));
          setHasUnsavedChanges(true);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, y: Math.min(canvasHeight - el.h, el.y + step) } : el));
          setHasUnsavedChanges(true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, x: Math.max(0, el.x - step) } : el));
          setHasUnsavedChanges(true);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, x: Math.min(canvasWidth - el.w, el.x + step) } : el));
          setHasUnsavedChanges(true);
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          handleRotate90();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, historyIndex, history, elements]);

  const handleDuplicateSelected = () => {
    if (!selectedElement) return;
    const count = elements.filter(e => e.type === 'slot').length + 1;
    const newObj = {
      ...selectedElement,
      id: Date.now(),
      x: selectedElement.x + 30,
      y: selectedElement.y + 30,
      code: selectedElement.code ? `${selectedElement.code.split('-')[0]}-0${count}` : undefined
    };
    const updated = [...elements, newObj];
    setElements(updated);
    pushHistory(updated);
    setSelectedId(newObj.id);
  };

  const handleSetAngle = (angleDeg) => {
    if (!selectedElement) return;
    const updated = elements.map(el => el.id === selectedId ? { ...el, rot: angleDeg } : el);
    setElements(updated);
    pushHistory(updated);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `plano_${parkingName.toLowerCase().replace(/\s+/g, '_')}.json`);
    dl.click();
    setMessage(`Plano exportado exitosamente.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          setElements(imported);
          pushHistory(imported);
          setMessage(`Plano cargado correctamente (${imported.length} elementos).`);
          setTimeout(() => setMessage(''), 3000);
        }
      } catch {
        setMessage(`Error al leer el archivo JSON.`);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (onSavePlan) onSavePlan(elements);
    setHasUnsavedChanges(false);
    setMessage(`¡Plano y distribución topográfica guardados exitosamente!`);
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR SEGÚN MODO */}
      {readOnly ? (
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <Badge className="bg-emerald-500 text-slate-950 font-black text-xs">
              VISTA EN VIVO (SOLO LECTURA)
            </Badge>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-slate-300">Total: <strong className="text-white">{totalSlots} plazas</strong></span>
              <span className="text-emerald-400">Libres: <strong>{freeSlots}</strong></span>
              <span className="text-rose-400">Ocupados: <strong>{occupiedSlots}</strong></span>
              <span className="text-blue-400">PMR: <strong>{pmrSlots}</strong></span>
              <span className="text-amber-400">Techados: <strong>{shadedSlots}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 space-x-1">
              <button onClick={() => setZoom(prev => Math.max(prev - 10, 40))} className="p-1 hover:text-white text-slate-400">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-emerald-400">{zoom}%</span>
              <button onClick={() => setZoom(prev => Math.min(prev + 10, 150))} className="p-1 hover:text-white text-slate-400">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleFitToScreen} 
                className="p-1 text-cyan-400 hover:text-cyan-200 border-l border-slate-700 pl-1.5 flex items-center gap-1 text-[10px] font-bold"
                title="Ajustar al 100% visible"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ajustar</span>
              </button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportJSON}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs gap-1"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </Button>
          </div>
        </div>
      ) : (
        /* BARRA SUPERIOR: FORMAS DE TERRENO Y CONTROL DE LIENZO CAD */
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          {/* Selector de Forma de Terreno Real */}
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-black text-amber-400">
              <Shapes className="w-4 h-4" />
              <span>FORMA DE TERRENO:</span>
            </div>

            <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-slate-700 space-x-1 flex-wrap gap-y-1">
              <button
                onClick={() => handleApplyLotPreset('rectangular')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lotShape === 'rectangular' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Rectangular
              </button>
              <button
                onClick={() => handleApplyLotPreset('l_shape')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lotShape === 'l_shape' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Lote en 'L'
              </button>
              <button
                onClick={() => handleApplyLotPreset('diagonal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lotShape === 'diagonal' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Diagonal 45°
              </button>
              <button
                onClick={() => handleApplyLotPreset('u_shape')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lotShape === 'u_shape' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Lote en 'U'
              </button>
              <button
                onClick={() => handleApplyLotPreset('blank')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lotShape === 'blank' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Lienzo Libre
              </button>
            </div>

            {/* Auto-Numeración */}
            <Button
              onClick={handleAutoRenumber}
              size="sm"
              variant="outline"
              className="bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200 text-xs font-black gap-1.5 shadow-sm"
              title="Re-ordena y re-numera todas las plazas correlativamente (A-01, A-02, B-01...)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Numerar</span>
            </Button>
          </div>

          {/* Dimensiones, Deshacer/Rehacer, Zoom y Guardar */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Deshacer / Rehacer */}
            <div className="flex items-center bg-slate-800 rounded-xl px-1 py-1 border border-slate-700 space-x-1">
              <button 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className="p-1.5 hover:text-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 hover:text-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rehacer (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 space-x-1">
              <button onClick={() => setZoom(prev => Math.max(prev - 10, 40))} className="p-1 hover:text-white text-slate-400">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-emerald-400">{zoom}%</span>
              <button onClick={() => setZoom(prev => Math.min(prev + 10, 150))} className="p-1 hover:text-white text-slate-400">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleFitToScreen} 
                className="p-1 text-cyan-400 hover:text-cyan-200 border-l border-slate-700 pl-1.5 flex items-center gap-1 text-[10px] font-bold"
                title="Ajustar al 100% visible"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ajustar</span>
              </button>
            </div>

            {/* Estado de guardado */}
            {hasUnsavedChanges ? (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2 py-1 rounded-xl border border-amber-800">
                ● Cambios sin guardar
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-xl border border-emerald-800">
                ✓ Sincronizado
              </span>
            )}

            <Button 
              onClick={handleSave} 
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </Button>
          </div>
        </div>
      )}

      {/* PALETA DE HERRAMIENTAS DE DIBUJO RÁPIDO (SOLO EN MODO EDICIÓN) */}
      {!readOnly && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 px-2">Herramienta:</span>

          {/* 1. Selección / Mover */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'select' ? 'bg-slate-950 text-white shadow-sm ring-2 ring-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Seleccionar / Mover</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* 2. Trazar Batería de Cajones (Arrastrar) */}
          <button
            onClick={() => setActiveTool('draw_row')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
              activeTool === 'draw_row' ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Trazar Fila de Cajones</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* 3. Cajones individuales */}
          <button
            onClick={() => setActiveTool('slot_auto')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'slot_auto' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Auto</span>
          </button>

          <button
            onClick={() => setActiveTool('slot_shaded')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'slot_shaded' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Colocar plaza con cubierta tensada"
          >
            <Umbrella className="w-3.5 h-3.5" />
            <span>+ Techado</span>
          </button>

          <button
            onClick={() => setActiveTool('slot_pmr')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'slot_pmr' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Accessibility className="w-3.5 h-3.5 text-blue-500" />
            <span>+ PMR</span>
          </button>

          <button
            onClick={() => setActiveTool('slot_vip')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'slot_vip' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>+ VIP</span>
          </button>

          <button
            onClick={() => setActiveTool('slot_moto')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'slot_moto' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-amber-500" />
            <span>+ Moto</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* 4. Elementos Arquitectónicos */}
          <button
            onClick={() => setActiveTool('add_wall')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'add_wall' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            <span>+ Muro</span>
          </button>

          <button
            onClick={() => setActiveTool('add_road')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'add_road' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Carril Vial</span>
          </button>

          <button
            onClick={() => setActiveTool('add_crosswalk')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'add_crosswalk' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Footprints className="w-3.5 h-3.5 text-slate-400" />
            <span>+ Cruce Peatonal</span>
          </button>

          <button
            onClick={() => setActiveTool('add_garden')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'add_garden' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TreeIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>+ Jardín</span>
          </button>

          <button
            onClick={() => setActiveTool('add_gate')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'add_gate' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
            <span>+ Garita</span>
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTool === 'eraser' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrador</span>
          </button>
        </div>
      )}

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm animate-in fade-in flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-900 font-black">×</button>
        </div>
      )}

      {/* LIENZO DE DIBUJO Y PANEL DE CONTROL */}
      <div className={`grid grid-cols-1 ${readOnly ? 'w-full' : 'lg:grid-cols-4'} gap-4`}>

        {/* LIENZO DE TRABAJO */}
        <div 
          ref={containerRef}
          className={`${readOnly ? 'w-full' : 'lg:col-span-3'} bg-slate-900 rounded-3xl p-4 sm:p-6 border-2 border-slate-800 shadow-2xl min-h-[600px] flex flex-col items-center justify-start overflow-auto relative`}
        >
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              marginBottom: `-${canvasHeight * (1 - zoom / 100)}px`,
              cursor: activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'not-allowed' : 'crosshair'
            }}
            className="relative bg-[#161b24] rounded-2xl border-4 border-slate-700 shadow-inner overflow-hidden flex-shrink-0"
          >
            {/* Cuadrícula de Ajuste */}
            <div 
              style={{ backgroundSize: `${gridSize}px ${gridSize}px` }}
              className="absolute inset-0 bg-[linear-gradient(to_right,#242b38_1px,transparent_1px),linear-gradient(to_bottom,#242b38_1px,transparent_1px)] opacity-40 pointer-events-none"
            />

            {/* FLOATING MINI-TOOLBAR SOBRE EL ELEMENTO SELECCIONADO */}
            {selectedElement && !readOnly && activeTool === 'select' && (
              <div
                style={{
                  left: `${Math.max(10, Math.min(canvasWidth - 280, selectedElement.x))}px`,
                  top: `${Math.max(10, selectedElement.y - 48)}px`
                }}
                className="absolute z-50 bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-cyan-400 shadow-2xl flex items-center space-x-2 animate-in fade-in zoom-in-95 pointer-events-auto"
              >
                <span className="text-[11px] font-mono font-black text-cyan-300 pr-1.5 border-r border-slate-700">
                  {selectedElement.code || selectedElement.type.toUpperCase()}
                </span>
                <button 
                  onClick={handleRotate90} 
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white" 
                  title="Rotar 90° (Tecla R)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleDuplicateSelected} 
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white" 
                  title="Duplicar (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    const updated = elements.filter(el => el.id !== selectedId);
                    setElements(updated);
                    pushHistory(updated);
                    setSelectedId(null);
                  }} 
                  className="p-1 hover:bg-rose-950/60 rounded text-rose-400 hover:text-rose-200" 
                  title="Eliminar (Supr)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* RENDERIZADO DE ELEMENTOS DEL PLANO */}
            {elements.map((el) => {
              const isSelected = el.id === selectedId;

              // 1. Cajón de Estacionamiento
              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isPMR = el.slotType === 'pmr';
                const isVIP = el.slotType === 'vip';
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
                    className={`absolute rounded-xl border-2 cursor-pointer transition-shadow flex flex-col justify-between p-2 select-none overflow-hidden ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 z-30 shadow-[0_0_20px_rgba(6,182,212,0.6)]' : 'z-10'
                    } ${
                      isPMR 
                        ? 'border-blue-500 bg-blue-950/75 text-blue-200' 
                        : isVIP
                        ? 'border-amber-400 bg-amber-950/75 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : isShaded
                        ? 'border-amber-400/90 bg-amber-950/35 text-amber-100'
                        : isMoto
                        ? 'border-amber-500 bg-amber-950/70 text-amber-200'
                        : isFree
                        ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/50'
                        : 'border-rose-500/80 bg-rose-950/60 text-rose-200'
                    }`}
                  >
                    {/* Textura de Techado / Sombra si está techado */}
                    {isShaded && (
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.12),rgba(245,158,11,0.12)_6px,transparent_6px,transparent_12px)] pointer-events-none rounded-xl" />
                    )}

                    <div className="flex items-center justify-between text-[11px] font-mono font-black z-10">
                      <span>{el.code}</span>
                      {isPMR && <span className="text-blue-400 font-bold text-[10px]">PMR</span>}
                      {isVIP && <span className="text-amber-300 font-bold text-[10px] flex items-center gap-0.5">⭐ VIP</span>}
                      {isShaded && <span className="text-amber-300 text-[10px] font-bold" title="Plaza con Cubierta">CUBIERTA</span>}
                      {isMoto && <span className="text-amber-300 font-bold text-[10px]">MOTO</span>}
                    </div>

                    {/* Tope de llanta */}
                    <div className="w-full h-2.5 bg-amber-400/90 border border-black rounded-xs flex items-center justify-around px-1">
                      <div className="w-2 h-full bg-black" />
                      <div className="w-2 h-full bg-black" />
                      <div className="w-2 h-full bg-black" />
                    </div>

                    <div className="text-center text-[10px] font-mono font-black">
                      {el.plate ? (
                        <span 
                          style={{ backgroundColor: el.color ? `${el.color}30` : 'rgba(0,0,0,0.8)' }}
                          className="px-1.5 py-0.5 rounded-xs border border-white/20 text-white"
                        >
                          {el.plate}
                        </span>
                      ) : (
                        <span className={isFree ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          {isFree ? 'LIBRE' : 'OCUPADO'}
                        </span>
                      )}
                    </div>

                    {/* Dial de Rotación y Agarres Figma/Canva */}
                    {isSelected && !readOnly && activeTool === 'select' && (
                      <>
                        <div 
                          onMouseDown={handleRotateStart}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-full cursor-grab shadow-lg flex items-center justify-center hover:scale-125 transition"
                          title="Arrastra para rotar el elemento"
                        >
                          <div className="w-1 h-1 bg-black rounded-full" />
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400 pointer-events-none" />
                        <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                        <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nesw-resize shadow" />
                        <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nesw-resize shadow" />
                        <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                      </>
                    )}
                  </div>
                );
              }

              // 2. Muro
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
                    className={`absolute bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 border border-slate-500 rounded-xs shadow-md z-15 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                  >
                    {isSelected && !readOnly && activeTool === 'select' && (
                      <>
                        <div 
                          onMouseDown={handleRotateStart}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-400 border border-white rounded-full cursor-grab shadow-lg"
                        />
                        <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                      </>
                    )}
                  </div>
                );
              }

              // 3. Calle / Carril
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
                    className={`absolute bg-[#1e2533] border-y-2 border-dashed border-amber-400/40 flex items-center justify-around px-4 z-2 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                  >
                    <span className="text-[10px] font-mono font-black text-white/30 tracking-widest pointer-events-none select-none">
                      ━► {el.label || 'CARRIL DE CIRCULACIÓN'} ━►
                    </span>
                    {isSelected && !readOnly && activeTool === 'select' && (
                      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                    )}
                  </div>
                );
              }

              // 4. Cruce Peatonal
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
                    className={`absolute bg-[repeating-linear-gradient(90deg,#ffffff,#ffffff_12px,#1e2533_12px,#1e2533_24px)] opacity-60 rounded-xs z-3 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                  >
                    {isSelected && !readOnly && activeTool === 'select' && (
                      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                    )}
                  </div>
                );
              }

              // 5. Edificio / Límite Privado
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
                    className={`absolute bg-[#0f131a] border-2 border-slate-600 rounded-xl shadow-2xl p-3 flex flex-col justify-between z-12 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400 border-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-black uppercase">
                      <Building className="w-3.5 h-3.5" />
                      <span>{el.label || 'EDIFICIO'}</span>
                    </div>
                    <div className="w-full h-px bg-slate-700" />
                    <span className="text-[9px] font-mono text-slate-500 text-center">ÁREA PRIVADA NO TRANSITABLE</span>
                    {isSelected && !readOnly && activeTool === 'select' && (
                      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                    )}
                  </div>
                );
              }

              // 6. Jardín / Área Verde
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
                    className={`absolute bg-emerald-950/80 border-2 border-emerald-600/70 rounded-xl shadow-lg p-3 flex flex-col justify-between z-10 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-emerald-400 text-[10px] font-black uppercase">
                      <TreeIcon className="w-3.5 h-3.5" />
                      <span>{el.label || 'ÁREA VERDE'}</span>
                    </div>
                    <span className="text-[8px] font-mono text-emerald-300/60 text-center">RETIRO ECOLÓGICO</span>

                    {isSelected && !readOnly && activeTool === 'select' && (
                      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs cursor-nwse-resize shadow" />
                    )}
                  </div>
                );
              }

              // 7. Garita LPR
              if (el.type === 'gate') {
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
                    className={`absolute bg-slate-900 border-2 border-emerald-400 rounded-lg shadow-2xl p-1 flex flex-col items-center justify-between text-[8px] font-mono font-black text-emerald-300 z-25 cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                  >
                    <span>ANPR</span>
                    <div className="w-full h-2 bg-amber-400 rounded-xs" />
                    <span>GARITA</span>
                  </div>
                );
              }

              return null;
            })}

            {/* PREVISUALIZACIÓN DE DIBUJO */}
            {isDrawing && currentDraw && (
              <div
                style={{
                  left: `${currentDraw.x}px`,
                  top: `${currentDraw.y}px`,
                  width: `${currentDraw.w}px`,
                  height: `${currentDraw.h}px`
                }}
                className="absolute border-2 border-dashed border-emerald-400 bg-emerald-500/20 rounded-lg pointer-events-none z-50 flex items-center justify-center"
              >
                {activeTool === 'draw_row' && (
                  <span className="text-xs font-mono font-black bg-black/80 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-400">
                    Fila: ~{Math.max(1, Math.floor(currentDraw.w / 75))} Cajones
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL LATERAL DE PROPIEDADES (SOLO EN MODO EDICIÓN) */}
        {!readOnly && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Inspector de Propiedades CAD</span>
                </h3>
                {selectedElement && (
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-slate-100">
                    {selectedElement.type}
                  </Badge>
                )}
              </div>

              {selectedElement ? (
                <div className="space-y-4 pt-3">
                  {/* Código */}
                  {selectedElement.type === 'slot' && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Código del Cajón</label>
                      <Input
                        type="text"
                        value={selectedElement.code || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, code: val } : el));
                          setHasUnsavedChanges(true);
                        }}
                        className="font-mono font-black"
                      />
                    </div>
                  )}

                  {/* Tipo de Vehículo y Sombra */}
                  {selectedElement.type === 'slot' && (
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tipo de Plaza</label>
                        <select
                          value={selectedElement.slotType || 'auto'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, slotType: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                        >
                          <option value="auto">🚗 Automóvil / Sedán</option>
                          <option value="pmr">♿ PMR Inclusivo</option>
                          <option value="vip">⭐ Zona VIP / Reservada</option>
                          <option value="moto">🏍️ Motocicleta</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                        <input 
                          type="checkbox" 
                          id="shaded-toggle"
                          checked={!!selectedElement.shaded}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, shaded: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="shaded-toggle" className="text-xs font-bold text-amber-900 cursor-pointer select-none">
                          Plaza con Cubierta Tensada (Sombra)
                        </label>
                      </div>

                      {/* Estado de Simulación */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase text-slate-500">Estado de Ocupación</label>
                          <button
                            onClick={() => {
                              const newStatus = selectedElement.status === 'free' ? 'occupied' : 'free';
                              setElements(prev => prev.map(el => el.id === selectedId ? { 
                                ...el, 
                                status: newStatus,
                                plate: newStatus === 'occupied' ? (el.plate || 'ABC-123') : undefined
                              } : el));
                              setHasUnsavedChanges(true);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                              selectedElement.status === 'free' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {selectedElement.status === 'free' ? 'LIBRE' : 'OCUPADO'}
                          </button>
                        </div>

                        {selectedElement.status === 'occupied' && (
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Placa del Vehículo</label>
                            <Input
                              type="text"
                              value={selectedElement.plate || ''}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setElements(prev => prev.map(el => el.id === selectedId ? { ...el, plate: val } : el));
                                setHasUnsavedChanges(true);
                              }}
                              className="font-mono font-bold text-xs h-7"
                              placeholder="ABC-123"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Etiquetas para otros elementos */}
                  {['road', 'building', 'garden', 'gate'].includes(selectedElement.type) && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Etiqueta del Plano</label>
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

                  {/* Posición y Dimensiones Exactas */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">Posición & Dimensiones (px)</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block">X (Horizontal)</span>
                        <Input
                          type="number"
                          value={selectedElement.x || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, x: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="font-mono h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Y (Vertical)</span>
                        <Input
                          type="number"
                          value={selectedElement.y || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, y: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="font-mono h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Ancho</span>
                        <Input
                          type="number"
                          value={selectedElement.w || 20}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value) || 20);
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, w: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="font-mono h-7 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Alto</span>
                        <Input
                          type="number"
                          value={selectedElement.h || 20}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value) || 20);
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, h: val } : el));
                            setHasUnsavedChanges(true);
                          }}
                          className="font-mono h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alineación Rápida */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">Alinear en el Lote</label>
                    <div className="grid grid-cols-3 gap-1">
                      <Button onClick={() => handleAlignSelected('top')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ⬆️ Arriba
                      </Button>
                      <Button onClick={() => handleAlignSelected('center-v')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ↕️ Centro
                      </Button>
                      <Button onClick={() => handleAlignSelected('bottom')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ⬇️ Abajo
                      </Button>
                      <Button onClick={() => handleAlignSelected('left')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ⬅️ Izq.
                      </Button>
                      <Button onClick={() => handleAlignSelected('center-h')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ↔️ Centro
                      </Button>
                      <Button onClick={() => handleAlignSelected('right')} variant="outline" size="sm" className="text-[10px] h-7 px-1">
                        ➡️ Der.
                      </Button>
                    </div>
                  </div>

                  {/* Ajuste de Ángulo de Inclinación */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                        <Compass className="w-3.5 h-3.5" />
                        Inclinación
                      </span>
                      <span className="font-mono text-emerald-600 font-black">{selectedElement.rot || 0}°</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {[0, 30, 45, 60, 90].map(deg => (
                        <button
                          key={deg}
                          onClick={() => handleSetAngle(deg)}
                          className={`py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                            (selectedElement.rot || 0) === deg ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>

                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={selectedElement.rot || 0} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, rot: val } : el));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  {/* Acciones de Objeto */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Button onClick={handleDuplicateSelected} variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar (Ctrl+D)</span>
                    </Button>
                    <Button 
                      onClick={() => {
                        const updated = elements.filter(el => el.id !== selectedId);
                        setElements(updated);
                        pushHistory(updated);
                        setSelectedId(null);
                      }} 
                      variant="destructive" 
                      size="sm" 
                      className="w-full text-xs font-bold gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar (Supr)</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                  <MousePointer className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-bold text-slate-600">Ningún elemento seleccionado</p>
                  <p className="text-[11px]">Haz clic sobre cualquier cajón, muro o vía para modificar sus propiedades, código o inclinación.</p>
                </div>
              )}
            </div>

            {/* Estadísticas de Aforo */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aforo en el Lote</h4>
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span>Total Plazas:</span>
                  <span className="font-black text-slate-900">{totalSlots}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Libres:</span>
                  <span className="font-bold">{freeSlots}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Ocupadas:</span>
                  <span className="font-bold">{occupiedSlots}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>PMR Inclusivo:</span>
                  <span className="font-bold">{pmrSlots}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Con Cubierta Tensada:</span>
                  <span className="font-bold">{shadedSlots}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
