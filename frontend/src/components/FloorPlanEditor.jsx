import React, { useState } from 'react';
import { Square, Move, RotateCw, Trash2, Save, Plus, Layers, User, ShieldAlert } from 'lucide-react';

export const FloorPlanEditor = () => {
  const [elements, setElements] = useState([
    { id: 1, type: 'slot', code: 'A-01', x: 50, y: 50, w: 65, h: 105, rot: 0, status: 'free' },
    { id: 2, type: 'slot', code: 'A-02', x: 135, y: 50, w: 65, h: 105, rot: 0, status: 'occupied' },
    { id: 3, type: 'crosswalk', x: 50, y: 185, w: 260, h: 50, rot: 0 },
    { id: 4, type: 'wall', x: 20, y: 20, w: 10, h: 300, rot: 0 }
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const addSlot = () => {
    const newId = Date.now();
    const newCode = `A-0${elements.filter(e => e.type === 'slot').length + 1}`;
    setElements(prev => [...prev, { id: newId, type: 'slot', code: newCode, x: 220, y: 50, w: 65, h: 105, rot: 0, status: 'free' }]);
  };

  const addCrosswalk = () => {
    const newId = Date.now();
    setElements(prev => [...prev, { id: newId, type: 'crosswalk', x: 100, y: 250, w: 200, h: 50, rot: 0 }]);
  };

  const handleSave = () => {
    setMessage('Plano interactivo guardado y sincronizado con éxito');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Editor Gráfico Interactivo de Planos 2D</h1>
          <p className="text-xs text-slate-500">Diseña la distribución física de cajones, paredes y pasos peatonales con franjas blancas en tiempo real.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={addSlot} className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300/80 shadow-sm">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Agregar Cajón</span>
          </button>
          <button onClick={addCrosswalk} className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300/80 shadow-sm">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>Paso Peatonal</span>
          </button>
          <button onClick={handleSave} className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition">
            <Save className="w-4 h-4" />
            <span>Guardar Plano</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold shadow-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas de Diseño */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-5 border border-slate-200 min-h-[500px] relative overflow-hidden bg-slate-50/50 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />
          
          <div className="relative w-full h-[450px] border border-slate-300 rounded-2xl bg-white p-4 shadow-inner">
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
                      el.status === 'free' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-rose-50 border-rose-500 text-rose-700'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{el.code}</span>
                    <Square className="w-6 h-6 opacity-30" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">{el.status}</span>
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
                    {/* Franjas Peatonales Blancas */}
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-3.5 h-full bg-white opacity-95 shadow-sm transform -skew-x-12" />
                    ))}
                  </div>
                );
              }
              if (el.type === 'wall') {
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    style={{ left: `${el.x}px`, top: `${el.y}px`, width: `${el.w}px`, height: `${el.h}px` }}
                    className={`absolute bg-slate-700 rounded cursor-pointer ${
                      isSelected ? 'ring-4 ring-cyan-500 z-30' : ''
                    }`}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Panel de Propiedades */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-200">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">Propiedades del Elemento</h3>
          {selectedId ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">ID Elemento</label>
                <input type="text" value={selectedId} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-700 font-mono" />
              </div>
              <button
                onClick={() => setElements(prev => prev.filter(e => e.id !== selectedId))}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold transition flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Elemento</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Haz clic sobre un objeto del plano para modificar sus propiedades de posición o eliminarlo.</p>
          )}
        </div>
      </div>
    </div>
  );
};
