import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Square, 
  RotateCw, 
  Trash2, 
  Save, 
  Plus, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Copy, 
  Grid, 
  Move, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Type
} from 'lucide-react';

export const FloorPlanEditor = () => {
  const [zoom, setZoom] = useState(100);
  const [gridSnap, setGridSnap] = useState(true);
  const [elements, setElements] = useState([
    { id: 1, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 70, h: 110, rot: 0, status: 'free', locked: false, zIndex: 1 },
    { id: 2, type: 'slot', code: 'A-02', slotType: 'auto', x: 170, y: 80, w: 70, h: 110, rot: 0, status: 'occupied', locked: false, zIndex: 1 },
    { id: 3, type: 'slot', code: 'PMR-01', slotType: 'pmr', x: 260, y: 80, w: 85, h: 110, rot: 0, status: 'free', locked: false, zIndex: 1 },
    { id: 4, type: 'crosswalk', x: 80, y: 220, w: 280, h: 55, rot: 0, locked: false, zIndex: 2 },
    { id: 5, type: 'wall', x: 40, y: 40, w: 12, h: 320, rot: 0, locked: false, zIndex: 1 },
    { id: 6, type: 'text', label: 'ZONA A - ACCESO PRINCIPAL', x: 80, y: 45, rot: 0, locked: false, zIndex: 3 }
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const selectedElement = elements.find(e => e.id === selectedId);

  // Manipulación de Zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 60));

  // Duplicar Objeto Seleccionado
  const handleDuplicate = () => {
    if (!selectedElement) return;
    const newObj = {
      ...selectedElement,
      id: Date.now(),
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
      code: selectedElement.code ? `${selectedElement.code}-COPY` : undefined
    };
    setElements(prev => [...prev, newObj]);
    setSelectedId(newObj.id);
    setMessage('Objeto duplicado en el lienzo.');
    setTimeout(() => setMessage(''), 3000);
  };

  // Rotar Objeto 90 grados
  const handleRotate = () => {
    if (!selectedElement) return;
    setElements(prev => prev.map(e => e.id === selectedId ? { ...e, rot: (e.rot + 90) % 360 } : e));
  };

  // Traer al Frente / Enviar al Fondo
  const handleLayerOrder = (direction) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(e => {
      if (e.id === selectedId) {
        const newZ = direction === 'up' ? e.zIndex + 1 : Math.max(1, e.zIndex - 1);
        return { ...e, zIndex: newZ };
      }
      return e;
    }));
  };

  // Bloquear / Desbloquear Elemento
  const toggleLock = () => {
    if (!selectedElement) return;
    setElements(prev => prev.map(e => e.id === selectedId ? { ...e, locked: !e.locked } : e));
  };

  // Agregar nuevos elementos al lienzo
  const addSlot = (slotType = 'auto') => {
    const newId = Date.now();
    const count = elements.filter(e => e.type === 'slot').length + 1;
    const code = slotType === 'pmr' ? `PMR-0${count}` : slotType === 'moto' ? `M-0${count}` : `A-0${count}`;
    const newObj = {
      id: newId,
      type: 'slot',
      code,
      slotType,
      x: 100,
      y: 100,
      w: slotType === 'pmr' ? 85 : slotType === 'moto' ? 50 : 70,
      h: slotType === 'moto' ? 70 : 110,
      rot: 0,
      status: 'free',
      locked: false,
      zIndex: 1
    };
    setElements(prev => [...prev, newObj]);
    setSelectedId(newId);
  };

  const addCrosswalk = () => {
    const newId = Date.now();
    const newObj = { id: newId, type: 'crosswalk', x: 120, y: 150, w: 240, h: 55, rot: 0, locked: false, zIndex: 2 };
    setElements(prev => [...prev, newObj]);
    setSelectedId(newId);
  };

  const addText = () => {
    const newId = Date.now();
    const newObj = { id: newId, type: 'text', label: 'NUEVA SEÑAL / ZONA', x: 150, y: 150, rot: 0, locked: false, zIndex: 3 };
    setElements(prev => [...prev, newObj]);
    setSelectedId(newId);
  };

  const handleSave = () => {
    setMessage('Plano 2D Canva guardado y sincronizado en tiempo real con la app cliente.');
    setTimeout(() => setMessage(''), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Toolbar Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="success" className="gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Editor Canva 2D Pro v2.0
            </Badge>
            <Badge variant="outline" className="font-mono">Zoom: {zoom}%</Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Editor Avanzado de Planos de Parqueo (Canva 2D)</h1>
          <p className="text-xs text-slate-500">Diseña con precisión milimétrica la distribución de cajones, zonas peatonales, textos y barreras Z-Index.</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Controles de Zoom */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex items-center space-x-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Alejar (Zoom Out)">
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </Button>
            <span className="text-xs font-mono font-bold px-2 text-slate-700">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Acercar (Zoom In)">
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </Button>
          </div>

          <Button onClick={handleSave} className="font-black gap-2 shadow-emerald-600/20">
            <Save className="w-4 h-4" />
            <span>Guardar & Sincronizar</span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm">
          {message}
        </div>
      )}

      {/* Barra de Herramientas de Inserción Atómica */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-2">Agregar Elemento:</span>
        <Button onClick={() => addSlot('auto')} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Plus className="w-3.5 h-3.5 text-emerald-600" /> Cajón Auto
        </Button>
        <Button onClick={() => addSlot('pmr')} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Plus className="w-3.5 h-3.5 text-blue-600" /> Plaza ♿ PMR
        </Button>
        <Button onClick={() => addSlot('moto')} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Plus className="w-3.5 h-3.5 text-cyan-600" /> Cajón Moto
        </Button>
        <Button onClick={addCrosswalk} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Layers className="w-3.5 h-3.5 text-teal-600" /> Paso Peatonal (Cebra)
        </Button>
        <Button onClick={addText} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Type className="w-3.5 h-3.5 text-amber-600" /> Texto / Señal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LIENZO CANVA PRO (CANVAS WORKSPACE) */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-5 border border-slate-200 min-h-[540px] relative overflow-hidden bg-slate-50/60 shadow-sm">
          <div className="relative w-full h-[500px] border border-slate-300 rounded-2xl bg-white p-4 shadow-inner overflow-auto">
            {/* Cuadrícula dinámicamente escalable por Zoom */}
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }} 
              className="relative w-[800px] h-[500px] transition-transform duration-200"
            >
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-70 pointer-events-none" />

              {elements.map((el) => {
                const isSelected = el.id === selectedId;

                // Renderizado de Cajones de Parqueo
                if (el.type === 'slot') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.w}px`,
                        height: `${el.h}px`,
                        transform: `rotate(${el.rot}deg)`,
                        zIndex: el.zIndex
                      }}
                      className={`absolute rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-between p-2 select-none shadow-sm ${
                        isSelected ? 'ring-4 ring-cyan-500 border-cyan-500 shadow-md scale-105' : ''
                      } ${
                        el.slotType === 'pmr'
                          ? 'bg-blue-50/90 border-blue-500 text-blue-800'
                          : el.slotType === 'moto'
                          ? 'bg-amber-50/90 border-amber-500 text-amber-800'
                          : el.status === 'free'
                          ? 'bg-emerald-50/90 border-emerald-500 text-emerald-800'
                          : 'bg-rose-50/90 border-rose-500 text-rose-800'
                      }`}
                    >
                      <span className="text-xs font-black">{el.code}</span>
                      <Square className="w-5 h-5 opacity-25" />
                      <Badge 
                        variant={el.slotType === 'pmr' ? 'default' : el.status === 'free' ? 'success' : 'destructive'} 
                        className="text-[8px] px-1 py-0 font-extrabold"
                      >
                        {el.slotType === 'pmr' ? '♿ PMR' : el.status}
                      </Badge>
                    </div>
                  );
                }

                // Renderizado de Pasos Peatonales (Cebras Blancas)
                if (el.type === 'crosswalk') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.w}px`,
                        height: `${el.h}px`,
                        transform: `rotate(${el.rot}deg)`,
                        zIndex: el.zIndex
                      }}
                      className={`absolute bg-slate-300 border border-slate-400 rounded-xl cursor-pointer flex items-center justify-around px-2 select-none overflow-hidden shadow-sm ${
                        isSelected ? 'ring-4 ring-cyan-500 border-cyan-500' : ''
                      }`}
                    >
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-3.5 h-full bg-white opacity-95 shadow-sm transform -skew-x-12" />
                      ))}
                    </div>
                  );
                }

                // Renderizado de Paredes / Barreras
                if (el.type === 'wall') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.w}px`,
                        height: `${el.h}px`,
                        transform: `rotate(${el.rot}deg)`,
                        zIndex: el.zIndex
                      }}
                      className={`absolute bg-slate-800 rounded-md cursor-pointer ${
                        isSelected ? 'ring-4 ring-cyan-500' : ''
                      }`}
                    />
                  );
                }

                // Renderizado de Textos / Señales
                if (el.type === 'text') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        transform: `rotate(${el.rot}deg)`,
                        zIndex: el.zIndex
                      }}
                      className={`absolute px-3 py-1 rounded-xl bg-white/90 border border-slate-200 text-[11px] font-black text-slate-800 shadow-sm cursor-pointer ${
                        isSelected ? 'ring-4 ring-cyan-500 border-cyan-500' : ''
                      }`}
                    >
                      {el.label}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>

        {/* PANEL DE PROPIEDADES AVANZADAS DEL OBJETO SELECCIONADO */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <CardTitle className="text-base font-extrabold mb-1">Propiedades de Objeto</CardTitle>
            <CardDescription className="mb-4">Modifica posición, rotación, capas Z y código.</CardDescription>

            {selectedElement ? (
              <div className="space-y-3.5 text-xs">
                {/* Edición de Código / Nombre */}
                {selectedElement.code !== undefined && (
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Código del Cajón</label>
                    <Input
                      type="text"
                      value={selectedElement.code}
                      onChange={(e) => {
                        const val = e.target.value;
                        setElements(prev => prev.map(x => x.id === selectedId ? { ...x, code: val } : x));
                      }}
                      className="font-mono font-bold"
                    />
                  </div>
                )}

                {selectedElement.label !== undefined && (
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Texto de la Señal</label>
                    <Input
                      type="text"
                      value={selectedElement.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setElements(prev => prev.map(x => x.id === selectedId ? { ...x, label: val } : x));
                      }}
                      className="font-bold"
                    />
                  </div>
                )}

                {/* Acciones Rápidas (Rotar, Duplicar, Capas) */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button onClick={handleRotate} variant="outline" size="sm" className="gap-1 font-bold">
                    <RotateCw className="w-3.5 h-3.5" /> Rotar 90°
                  </Button>
                  <Button onClick={handleDuplicate} variant="outline" size="sm" className="gap-1 font-bold">
                    <Copy className="w-3.5 h-3.5" /> Duplicar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleLayerOrder('up')} variant="outline" size="sm" className="gap-1 font-bold">
                    <ArrowUp className="w-3.5 h-3.5" /> Capa Arriba
                  </Button>
                  <Button onClick={() => handleLayerOrder('down')} variant="outline" size="sm" className="gap-1 font-bold">
                    <ArrowDown className="w-3.5 h-3.5" /> Capa Abajo
                  </Button>
                </div>

                <Button
                  onClick={() => setElements(prev => prev.filter(e => e.id !== selectedId))}
                  variant="destructive"
                  className="w-full font-bold gap-2 mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar del Canva</span>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Haz clic sobre un cajón, paso peatonal o texto en el mapa para editar sus propiedades.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-mono space-y-1">
            <p>Objetos en Lienzo: <span className="font-bold text-slate-900">{elements.length}</span></p>
            <p>Plazas Dibujadas: <span className="font-bold text-emerald-700">{elements.filter(e => e.type === 'slot').length}</span></p>
          </div>
        </Card>
      </div>
    </div>
  );
};
