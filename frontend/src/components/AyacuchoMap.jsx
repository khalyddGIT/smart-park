import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation, Compass, ChevronRight, Car } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const AyacuchoMap = ({ parkings = [], onSelectParking, selectedParkingId }) => {
  const mapRef = useRef(null);

  // Coordenadas fijas de Ayacucho - Huamanga (Plaza Mayor de Ayacucho)
  const AYACUCHO_CENTER = { lat: -13.1606, lng: -74.2257 };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Mapa Satelital de Sedes — Ayacucho (Huamanga)</h3>
        </div>
        <Badge variant="success" className="gap-1 font-mono text-[10px]">
          <Navigation className="w-3 h-3 text-emerald-600" /> Huamanga Centro: Lat -13.1606, Lng -74.2257
        </Badge>
      </div>

      <div className="relative w-full h-[320px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        {/* Google Maps Embed iframe nativo centrado exclusivamente en Ayacucho Huamanga */}
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
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200/80 shadow-md text-xs font-bold text-slate-800 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Red Huamanga: Cobertura y Geolocalización en Tiempo Real</span>
        </div>

        {/* Chips flotantes inferiores de Sedes en el Mapa */}
        {parkings && parkings.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-mono font-black text-emerald-400 pl-2 whitespace-nowrap">
              Sedes Rápidas:
            </span>
            {parkings.map((p) => {
              const freeCount = (p.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
              const isSelected = selectedParkingId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelectParking && onSelectParking(p)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isSelected 
                      ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{p.name.split('-')[0].trim()}</span>
                  <span className="text-[10px] font-mono opacity-80">({freeCount} libres)</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
