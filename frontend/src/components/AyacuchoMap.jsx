import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Layers, 
  Maximize2, 
  CheckCircle2, 
  Car, 
  Sparkles,
  LocateFixed,
  DollarSign
} from 'lucide-react';

// Coordenadas base de referencia en Ayacucho (Huamanga)
const DEFAULT_COORDS = {
  'EST-01': [-13.1604, -74.2259], // Plaza Mayor Planta Baja
  'EST-02': [-13.1612, -74.2252], // Plaza Mayor Sótano 1
  'EST-03': [-13.1565, -74.2215], // Mercado Mariscal Cáceres
  'EST-04': [-13.1718, -74.2210], // Terminal Terrestre
};

export const AyacuchoMap = ({ parkings = [], onSelectParking, selectedParkingId }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [mapLayer, setMapLayer] = useState('streets'); // 'streets' | 'satellite'
  const [tileLayerInstance, setTileLayerInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Inicializar Leaflet
  useEffect(() => {
    if (!window.L || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;

    // Crear mapa centrado en Huamanga, Ayacucho
    const map = L.map(mapContainerRef.current, {
      center: [-13.1606, -74.2257],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Capa base CartoDB Voyager
    const streetsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    setTileLayerInstance(streetsLayer);

    // Controles de zoom abajo a la derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambiar entre capa de calles y satelital
  const toggleMapLayer = (layerType) => {
    if (!window.L || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (tileLayerInstance) {
      map.removeLayer(tileLayerInstance);
    }

    let newLayer;
    if (layerType === 'satellite') {
      newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
    } else {
      newLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });
    }

    newLayer.addTo(map);
    setTileLayerInstance(newLayer);
    setMapLayer(layerType);
  };

  // Actualizar marcadores interactivos
  useEffect(() => {
    if (!window.L || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Limpiar marcadores anteriores
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    parkings.forEach((p, idx) => {
      let coords = p.latitude && p.longitude 
        ? [p.latitude, p.longitude] 
        : DEFAULT_COORDS[p.id];

      if (!coords) {
        const angle = (idx * (2 * Math.PI)) / Math.max(1, parkings.length);
        const radius = 0.003 + (idx % 3) * 0.002;
        coords = [-13.1606 + Math.sin(angle) * radius, -74.2257 + Math.cos(angle) * radius];
      }

      const elements = p.elements || [];
      const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
      const isSelected = selectedParkingId === p.id;

      // Icono HTML interactivo con badge
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="relative group cursor-pointer transition-transform duration-200 hover:scale-110 ${isSelected ? 'scale-110 z-50' : 'z-10'}">
            <div class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl shadow-xl border ${
              isSelected
                ? 'bg-slate-950 text-white border-emerald-400 ring-4 ring-emerald-400/30 font-black'
                : 'bg-white text-slate-900 border-slate-200 shadow-md font-bold'
            }">
              <div class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isSelected ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-slate-900 text-emerald-400'
              }">
                P
              </div>
              <span class="text-xs whitespace-nowrap">${freeSlots} lib</span>
              <span class="w-2 h-2 rounded-full ${freeSlots > 0 ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse"></span>
            </div>
            <div class="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 ${isSelected ? 'bg-emerald-400' : 'bg-slate-800'}"></div>
          </div>
        `,
        iconSize: [80, 36],
        iconAnchor: [40, 36]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; padding: 2px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${p.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">📍 ${p.address}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 10px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 10px;">
            <span style="font-size: 11px; color: #475569; font-weight: 600;">Plazas libres:</span>
            <span style="font-size: 12px; font-weight: 800; color: ${freeSlots > 0 ? '#059669' : '#e11d48'};">${freeSlots} de ${totalSlots}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;">
            <span style="color: #64748b;">Tarifa por hora:</span>
            <strong style="color: #047857; font-size: 12px;">S/ ${Number(p.rate || 5).toFixed(2)}</strong>
          </div>
          <button 
            id="btn-select-${p.id}"
            style="width: 100%; background: #0f172a; color: #ffffff; border: none; padding: 8px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
          >
            <span>🚗 Ver Plano y Reservar</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        offset: [0, -28]
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${p.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectParking) onSelectParking(p);
          };
        }
      });

      marker.on('click', () => {
        map.setView(coords, 16, { animate: true });
      });

      markersRef.current[p.id] = marker;
    });
  }, [parkings, selectedParkingId, onSelectParking]);

  // Centrar en un establecimiento seleccionado
  const handleSelectAndCenter = (p) => {
    if (onSelectParking) onSelectParking(p);

    const marker = markersRef.current[p.id];
    if (marker && mapInstanceRef.current) {
      const latlng = marker.getLatLng();
      mapInstanceRef.current.setView(latlng, 16, { animate: true });
      marker.openPopup();
    }
  };

  // Re-centrar en el centro histórico de Ayacucho
  const handleRecenterAyacucho = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([-13.1606, -74.2257], 15, { animate: true });
  };

  // Obtener geolocalización del usuario
  const handleGetLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    const L = window.L;
    setLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userCoords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(userCoords);

        const map = mapInstanceRef.current;
        map.setView(userCoords, 16, { animate: true });

        const userIcon = L.divIcon({
          className: 'user-pin',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-60"></span>
              <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker(userCoords, { icon: userIcon })
          .addTo(map)
          .bindPopup('<strong style="font-size: 11px;">📍 Tu ubicación actual</strong>')
          .openPopup();
      },
      () => {
        setLocatingUser(false);
        handleRecenterAyacucho();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Duplicar elementos para efecto infinito continuo (Marquee Ticker)
  const marqueeList = parkings.length > 0 
    ? [...parkings, ...parkings, ...parkings] 
    : [];

  return (
    <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
      
      {/* Cabecera Interactiva del Mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Mapa Interactivo de Estacionamientos
          </h3>
        </div>

        {/* Controles de Capas y Geolocalización */}
        <div className="flex items-center space-x-2 self-start sm:self-auto text-xs font-bold">
          {/* Toggle Calles / Satélite */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => toggleMapLayer('streets')}
              className={`px-2.5 py-1 rounded-lg transition ${
                mapLayer === 'streets'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Calles
            </button>
            <button
              onClick={() => toggleMapLayer('satellite')}
              className={`px-2.5 py-1 rounded-lg transition ${
                mapLayer === 'satellite'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Satélite
            </button>
          </div>

          {/* Centrar Mapa */}
          <button
            onClick={handleRecenterAyacucho}
            title="Centrar en Ayacucho"
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1 shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline text-[11px]">Centro</span>
          </button>

          {/* Mi Ubicación */}
          <button
            onClick={handleGetLocation}
            title="Mi Ubicación GPS"
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1 shadow-2xs"
          >
            <LocateFixed className={`w-3.5 h-3.5 text-blue-600 ${locatingUser ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline text-[11px]">Mi GPS</span>
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa 100% Interactivo y Limpio */}
      <div className="relative w-full h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner bg-slate-100 z-0">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing" 
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* =========================================================================
          CINTA MARQUEE CON MOVIMIENTO CONTINUO INFINITO
          ========================================================================= */}
      {parkings && parkings.length > 0 && (
        <div className="pt-1 space-y-2">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Sedes geolocalizadas ({parkings.length}):</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Pasa el cursor para pausar • Toca para enfocar
            </span>
          </div>

          {/* Contenedor con degradados laterales de desvanecimiento suave */}
          <div className="relative w-full overflow-hidden py-1 rounded-2xl">
            
            {/* Gradientes laterales suaves para efecto de entrada/salida infinita */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {/* Pista de Movimiento Continuo (Infinite Marquee Track) */}
            <div className="animate-marquee-infinite flex gap-2.5 items-center">
              {marqueeList.map((p, idx) => {
                const elements = p.elements || [];
                const freeCount = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
                const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
                const isSelected = selectedParkingId === p.id;
                const isAvailable = freeCount > 0;

                return (
                  <button
                    key={`${p.id}-${idx}`}
                    onClick={() => handleSelectAndCenter(p)}
                    className={`group flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all duration-200 ease-out cursor-pointer flex-shrink-0 select-none ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400 ring-offset-2 ring-offset-white scale-[1.02]' 
                        : 'bg-white text-slate-700 border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95'
                    }`}
                  >
                    <span className="truncate max-w-[150px] tracking-tight">
                      {p.name.replace('Smart Park ', '')}
                    </span>

                    {/* Badge animado de plazas libres con radar en vivo */}
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xl font-mono text-[10px] font-bold transition-colors ${
                      isSelected 
                        ? 'bg-emerald-400 text-slate-950 shadow-inner' 
                        : isAvailable 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 group-hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    }`}>
                      {/* Radar beacon parpadeante */}
                      <span className="relative flex h-1.5 w-1.5">
                        {isAvailable && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isSelected ? 'bg-slate-950' : 'bg-emerald-500'
                          }`} />
                        )}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          isSelected ? 'bg-slate-950' : isAvailable ? 'bg-emerald-600' : 'bg-rose-500'
                        }`} />
                      </span>
                      <span>{freeCount}/{totalSlots} libres</span>
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
