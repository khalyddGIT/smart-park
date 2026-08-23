import React, { useState, useEffect } from 'react';
import { InteractiveFloorPlanDrawingStudio } from './InteractiveFloorPlanDrawingStudio';
import { TerrainMetricCADView } from './TerrainMetricCADView';
import { Button } from './ui/button';
import { 
  Building2, 
  Sparkles, 
  Save, 
  Layers, 
  MapPin, 
  Edit3,
  Compass,
  CheckCircle2
} from 'lucide-react';

export const FloorPlanEditor = ({ masterElements, onMasterSavePlan }) => {
  // 'draw' (Dibujador CAD 2D) | 'metric_cad' (Satelital Topográfico)
  const [activeMode, setActiveMode] = useState('draw');
  const [elements, setElements] = useState(masterElements || []);

  useEffect(() => {
    if (masterElements) {
      setElements(masterElements);
    }
  }, [masterElements]);

  const [notification, setNotification] = useState('');

  const currentSlots = elements.filter(e => e.type === 'slot');

  const handleSavePlan = (updatedElements) => {
    setElements(updatedElements);
    if (onMasterSavePlan) {
      onMasterSavePlan(updatedElements);
    }
    setNotification('Plano arquitectónico guardado y sincronizado con la Base de Datos.');
    setTimeout(() => setNotification(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER PRINCIPAL CON SELECTOR DE MODOS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Editor Topográfico & Distribución de Planos</h1>
          <p className="text-xs text-slate-500">Diseño 2D de muros, carriles viales, pasos peatonales y cajones de parqueo.</p>
        </div>

        {/* SELECTOR DE MODOS: DIBUJAR 2D | SATELITAL */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveMode('draw')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
              activeMode === 'draw'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Estudio CAD 2D</span>
          </button>

          <button
            onClick={() => setActiveMode('metric_cad')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
              activeMode === 'metric_cad'
                ? 'bg-slate-950 text-emerald-400 shadow-md border border-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Topografía Satelital 1:1</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* VISTA ACTIVA SEGÚN MODO SELECCIONADO */}
      {activeMode === 'draw' && (
        <InteractiveFloorPlanDrawingStudio
          initialElements={elements}
          onSavePlan={handleSavePlan}
        />
      )}

      {activeMode === 'metric_cad' && (
        <TerrainMetricCADView
          slots={currentSlots}
          onSlotsChange={(newSlots) => {
            const nonSlotElements = elements.filter(e => e.type !== 'slot');
            const updated = [...nonSlotElements, ...newSlots];
            handleSavePlan(updated);
          }}
          parkingLocation="Ayacucho - Centro Histórico"
        />
      )}
    </div>
  );
};
