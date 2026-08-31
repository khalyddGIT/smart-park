import React, { useState } from 'react';
import { 
  Layers, 
  Sun, 
  Moon, 
  Video, 
  RotateCw, 
  Compass, 
  Sliders, 
  Building2,
  Mountain,
  Map,
  X
} from 'lucide-react';

export const MapControlPanel = ({
  is3D,
  onToggle3D,
  isTerrainEnabled,
  onToggleTerrain,
  isBuildingsEnabled,
  onToggleBuildings,
  isAtmosphereEnabled,
  onToggleAtmosphere,
  mapLayer,
  onChangeLayer,
  exaggeration,
  onChangeExaggeration,
  pitch,
  onChangePitch,
  onStartOrbit,
  onStartCinematic,
  onResetCamera
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
      {/* Botón Principal para Desplegar el Panel 3D */}
      <div className="pointer-events-auto flex items-center space-x-2 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl text-white">
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            isOpen ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>PANEL MAPBOX 3D</span>
        </button>

        <button
          type="button"
          onClick={onToggle3D}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            is3D 
              ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/50 scale-105' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {is3D ? <Mountain className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
          <span>{is3D ? 'VISTA 3D' : 'VISTA 2D'}</span>
        </button>
      </div>

      {/* Panel Flotante Expandible de Ajustes 3D */}
      {isOpen && (
        <div className="pointer-events-auto mt-2 w-80 bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-2xl border border-slate-800 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Control Geoespacial 3D
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conmutadores de Capas 3D */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={onToggleTerrain}
              className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                isTerrainEnabled 
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <Mountain className="w-4 h-4" /> Terreno 3D
            </button>

            <button
              onClick={onToggleBuildings}
              className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                isBuildingsEnabled 
                  ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <Building2 className="w-4 h-4" /> Edificios 3D
            </button>
          </div>

          {/* Selector de Estilo de Mapa */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Estilo Visual de Mapa:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'streets', name: 'Calles', icon: Map },
                { id: 'dark', name: 'Noche', icon: Moon },
                { id: 'satellite', name: 'Satélite', icon: Layers },
                { id: 'outdoors', name: 'Outdoors', icon: Mountain },
                { id: 'light', name: 'Claro', icon: Sun }
              ].map((st) => {
                const IconComponent = st.icon;
                return (
                  <button
                    key={st.id}
                    onClick={() => onChangeLayer(st.id)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                      mapLayer === st.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{st.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider Exageración del Terreno */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Elevación Terreno:</span>
              <span className="font-mono text-emerald-400">{exaggeration.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={exaggeration}
              onChange={(e) => onChangeExaggeration(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Slider Inclinación de Cámara (Pitch) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Inclinación Cámara (Pitch):</span>
              <span className="font-mono text-cyan-400">{Math.round(pitch)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="1"
              value={pitch}
              onChange={(e) => onChangePitch(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Botones de Animaciones Cinemáticas y Cámara */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={onStartOrbit}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <RotateCw className="w-3.5 h-3.5" /> Orbitar 360°
            </button>

            <button
              onClick={onStartCinematic}
              className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-900/80 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <Video className="w-3.5 h-3.5" /> Tour 3D
            </button>
          </div>

          <button
            onClick={onResetCamera}
            className="w-full p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Compass className="w-3.5 h-3.5 text-slate-400" /> Restablecer Cámara Plaza Mayor
          </button>

        </div>
      )}
    </div>
  );
};
