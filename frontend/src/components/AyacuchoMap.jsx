import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Badge } from './ui/badge';

export const AyacuchoMap = ({ parkings = [], onSelectParking, selectedParkingId }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Mapa de Cobertura</h3>
        </div>
        <Badge variant="success" className="font-mono text-[10px] gap-1 py-0.5">
          <Navigation className="w-2.5 h-2.5 text-emerald-600" /> Ayacucho Centro
        </Badge>
      </div>

      <div className="relative w-full h-[260px] sm:h-[320px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <iframe
          title="Mapa de Ayacucho Huamanga - Smart Park"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src="https://maps.google.com/maps?q=-13.1606,-74.2257&hl=es&z=15&output=embed"
          className="w-full h-full rounded-3xl"
        />

        {/* Overlay flotante informativo superior */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-200/80 shadow-md text-[11px] font-bold text-slate-800 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Tiempo Real</span>
        </div>

        {/* Chips flotantes inferiores de Sedes en el Mapa */}
        {parkings && parkings.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 scrollbar-none">
            <span className="text-[9px] uppercase font-mono font-bold text-emerald-400 pl-2 whitespace-nowrap">
              Sedes:
            </span>
            {parkings.map((p) => {
              const freeCount = (p.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
              const isSelected = selectedParkingId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelectParking && onSelectParking(p)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                    isSelected 
                      ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{p.name.replace('Smart Park ', '').replace('Estacionamiento ', '')}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {freeCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
