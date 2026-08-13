import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { MapPin, Layers, Grid, Plus, Save, Trash2, Maximize2, Compass, Camera, CheckCircle2, ShieldAlert } from 'lucide-react';

export const ProfessionalTerrainEditor = () => {
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' o 'satellite'
  const [elements, setElements] = useState([
    { id: 1, type: 'slot', code: 'A-01', slotType: 'auto', x: 60, y: 60, w: 65, h: 105, rot: 0, status: 'free' },
    { id: 2, type: 'slot', code: 'A-02', slotType: 'auto', x: 140, y: 60, w: 65, h: 105, rot: 0, status: 'occupied' },
    { id: 3, type: 'slot', code: 'PMR-01', slotType: 'pmr', x: 220, y: 60, w: 80, h: 105, rot: 0, status: 'free' },
    { id: 4, type: 'crosswalk', x: 60, y: 190, w: 280, h: 50, rot: 0 },
    { id: 5, type: 'gate', x: 20, y: 20, w: 30, h: 40, label: 'Tótem ANPR Entrada #1' }
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedParking, setSelectedParking] = useState('Smart Park Plaza Mayor Ayacucho');
  const [message, setMessage] = useState('');

  // Generador de bloque masivo de cajones
  const generateBlockSlots = () => {
    const startX = 60;
    const startY = 260;
    const newSlots = [];
    for (let i = 1; i <= 5; i++) {
      newSlots.push({
        id: Date.now() + i,
        type: 'slot',
        code: `B-0${i}`,
        slotType: 'auto',
        x: startX + (i - 1) * 75,
        y: startY,
        w: 65,
        h: 105,
        rot: 0,
        status: 'free'
      });
    }
    setElements(prev => [...prev, ...newSlots]);
    setMessage('Fila de 5 cajones generada automáticamente en el terreno.');
    setTimeout(() => setMessage(''), 3500);
  };

  const addCrosswalk = () => {
    setElements(prev => [...prev, {
      id: Date.now(),
      type: 'crosswalk',
      x: 100,
      y: 120,
      w: 220,
      h: 50,
      rot: 0
    }]);
  };

  const handleSave = () => {
    setMessage('Terreno y plano georreferenciado guardado en PostgreSQL.');
    setTimeout(() => setMessage(''), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Selector de Local */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="success" className="gap-1 font-mono">
              <Compass className="w-3 h-3 text-emerald-600" /> GIS Coordenadas: -13.1606, -74.2257
            </Badge>
            <Badge variant="outline">Huamanga, Ayacucho</Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Geodiseño Profesional de Terreno & Layout 2D</h1>
          <p className="text-xs text-slate-500">Delimita el perímetro real del terreno, instala tótems ANPR y maqueta cajones y cebras peatonales.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex shadow-sm">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'canvas' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Lienzo CAD 2D
            </button>
            <button
              onClick={() => setViewMode('satellite')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Mapa Satelital GPS
            </button>
          </div>

          <Button onClick={handleSave} className="font-black gap-2 shadow-emerald-600/20">
            <Save className="w-4 h-4" />
            <span>Guardar Geodiseño</span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm animate-fade-in">
          {message}
        </div>
      )}

      {/* Selector de Herramientas Rápidas */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-2">Herramientas de Terreno:</span>
        <Button onClick={generateBlockSlots} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Grid className="w-4 h-4 text-emerald-600" />
          <span>+ Generar Fila Masiva (5 Cajones)</span>
        </Button>
        <Button onClick={addCrosswalk} variant="outline" size="sm" className="gap-1.5 font-bold">
          <Layers className="w-4 h-4 text-teal-600" />
          <span>+ Paso Peatonal (Cebra)</span>
        </Button>
        <Button onClick={() => setElements(prev => [...prev, { id: Date.now(), type: 'slot', code: `PMR-0${elements.length}`, slotType: 'pmr', x: 150, y: 150, w: 80, h: 105, rot: 0, status: 'free' }])} variant="outline" size="sm" className="gap-1.5 font-bold">
          <CheckCircle2 className="w-4 h-4 text-cyan-600" />
          <span>+ Plaza PMR Inclusiva</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ÁREA DEL EDITOR / MAPA */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-5 border border-slate-200 min-h-[520px] relative overflow-hidden bg-slate-50/50 shadow-sm">
          {viewMode === 'canvas' ? (
            <div className="relative w-full h-[480px] border border-slate-300 rounded-2xl bg-white p-4 shadow-inner overflow-auto">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">Escala: 1px = 0.05m | Área Terreno: 1,450m²</div>

              {elements.map((el) => {
                const isSelected = el.id === selectedId;

                if (el.type === 'slot') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{ left: `${el.x}px`, top: `${el.y}px`, width: `${el.w}px`, height: `${el.h}px` }}
                      className={`absolute rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-between p-2 select-none shadow-sm ${
                        isSelected ? 'ring-4 ring-cyan-500 border-cyan-500 z-30' : ''
                      } ${
                        el.slotType === 'pmr'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : el.status === 'free'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-rose-50 border-rose-500 text-rose-700'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{el.code}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider">{el.slotType === 'pmr' ? '♿ PMR' : el.status}</span>
                    </div>
                  );
                }

                if (el.type === 'crosswalk') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{ left: `${el.x}px`, top: `${el.y}px`, width: `${el.w}px`, height: `${el.h}px` }}
                      className={`absolute bg-slate-300 border border-slate-400 rounded-lg cursor-pointer flex items-center justify-around px-2 select-none overflow-hidden ${
                        isSelected ? 'ring-4 ring-cyan-500 border-cyan-500 z-30' : ''
                      }`}
                    >
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="w-3.5 h-full bg-white opacity-95 shadow-sm transform -skew-x-12" />
                      ))}
                    </div>
                  );
                }

                if (el.type === 'gate') {
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      style={{ left: `${el.x}px`, top: `${el.y}px` }}
                      className={`absolute bg-slate-900 text-white p-2 rounded-xl text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer border-2 border-emerald-400 shadow-md ${
                        isSelected ? 'ring-4 ring-cyan-500 z-30' : ''
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>{el.label}</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            /* Vista Satelital GPS de Terreno en Ayacucho */
            <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
              <iframe
                title="Satelital Terreno Ayacucho"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src="https://maps.google.com/maps?q=-13.1606,-74.2257&hl=es&z=18&t=k&output=embed"
              />
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 shadow-md">
                Polígono de Terreno Registrado • 1,450 m²
              </div>
            </div>
          )}
        </div>

        {/* Panel de Atributos del Objeto Seleccionado */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Atributos de Objeto</h3>
            {selectedId ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">ID Objeto</label>
                  <Input type="text" value={selectedId} disabled className="bg-slate-100 font-mono text-slate-700" />
                </div>
                <Button
                  onClick={() => setElements(prev => prev.filter(e => e.id !== selectedId))}
                  variant="destructive"
                  className="w-full font-bold gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar del Terreno</span>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Haz clic sobre un cajón, paso peatonal o tótem ANPR del mapa para modificarlo.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-mono space-y-1">
            <p>Total Cajones: <span className="font-bold text-slate-900">{elements.filter(e => e.type === 'slot').length}</span></p>
            <p>Pasa Peatonal: <span className="font-bold text-teal-700">{elements.filter(e => e.type === 'crosswalk').length}</span></p>
            <p>Tótems ANPR: <span className="font-bold text-emerald-700">1 Online</span></p>
          </div>
        </Card>
      </div>
    </div>
  );
};
