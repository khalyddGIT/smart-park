import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MAPBOX_TOKEN, 
  AYACUCHO_CENTER, 
  DEFAULT_PARKING_COORDS, 
  MAPBOX_STYLES
} from './mapConfig';
import { MapRoutesManager } from './MapRoutes';
import { 
  Navigation, 
  X, 
  Map,
  Layers,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react';
import { FALLBACK_PARKING_IMAGE } from './mapConfig';
import { useAuth } from '../../context/AuthContext';

export const MapContainer3D = ({ 
  parkings = [], 
  onSelectParking, 
  selectedParkingId,
  forceShowAdminPanel = false
}) => {
  const { role, user } = useAuth();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const routesManagerRef = useRef(null);

  // Modo de mapa normal (calles por defecto)
  const [mapLayer, setMapLayer] = useState('streets');
  const [activeRoute, setActiveRoute] = useState(null);
  const [targetDest, setTargetDest] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Filtros Rápidos
  const [filterType, setFilterType] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');

  // Inicializar Mapbox GL JS 3D Engine Nativo (Vista 2D por defecto)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    try {
      // Desactivar telemetría para prevenir peticiones a events.mapbox.com bloqueadas por adblockers
      if (typeof mapboxgl.setTelemetryEnabled === 'function') {
        mapboxgl.setTelemetryEnabled(false);
      }
    } catch (e) {}

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLES[mapLayer] || MAPBOX_STYLES.streets,
      center: [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat],
      zoom: 15.8,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    // Capturar errores no críticos de eventos bloqueados
    map.on('error', (e) => {
      // Ignorar bloqueos de red por extensiones de privacidad/adblock
      if (!e || e?.error?.message?.includes('events.mapbox.com') || e?.status === 0) {
        return;
      }
    });

    mapRef.current = map;

    // Inicializar mapa estándar
    map.on('style.load', () => {
      routesManagerRef.current = new MapRoutesManager(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cambiar Estilo de Mapa (Calles / Satélite)
  const handleChangeLayer = (layerKey) => {
    if (!mapRef.current) return;
    setMapLayer(layerKey);
    const styleUrl = MAPBOX_STYLES[layerKey] || MAPBOX_STYLES.streets;
    mapRef.current.setStyle(styleUrl);
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 300 });
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat],
        zoom: 15.8,
        pitch: 0,
        bearing: 0,
        duration: 600
      });
    }
  };

  // Trazar Ruta en Tiempo Real con GPS y Turn-by-Turn
  const handleCalculateRoute = async (destCoords, destName, profile = 'driving') => {
    if (!routesManagerRef.current) return;
    setTargetDest({ coords: destCoords, name: destName });

    let origin = [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat];

    // 1. Obtener la ubicación GPS real del navegador
    if (navigator.geolocation) {
      try {
        const userPos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 3000 }
          );
        });
        if (userPos) origin = userPos;
      } catch (e) {}
    }

    // 2. Calcular ruta real con Mapbox Directions API desde la ubicación exacta del usuario
    const routeInfo = await routesManagerRef.current.drawRoute(origin, destCoords, destName, profile);
    if (routeInfo) {
      setActiveRoute(routeInfo);
    }

    // 3. Iniciar rastreo continuo en tiempo real conforme el usuario avance (watchPosition)
    routesManagerRef.current.startRealtimeTracking(destCoords, destName, (liveRouteData) => {
      setActiveRoute(liveRouteData);
    });
  };

  const handleClearRoute = () => {
    if (routesManagerRef.current) {
      routesManagerRef.current.clearRoute();
    }
    setActiveRoute(null);
    setTargetDest(null);
  };

  // Filtrado reactivo de cocheras (Feature 5)
  const filteredParkings = useMemo(() => {
    return parkings.filter(p => {
      const rate = Number(p.rate || 4);
      if (filterPrice === '5' && rate > 5.0) return false;
      if (filterPrice === '8' && rate > 8.0) return false;

      if (filterType !== 'all') {
        const elements = p.elements || [];
        const slots = elements.filter(e => e.type === 'slot');
        if (slots.length > 0) {
          const hasType = slots.some(s => s.slot_type === filterType || (filterType === 'auto' && s.slot_type === 'auto'));
          if (!hasType) return false;
        }
      }
      return true;
    });
  }, [parkings, filterType, filterPrice]);

  // Actualizar marcadores 3D interactivos en el mapa
  useEffect(() => {
    if (!mapRef.current || !window.mapboxgl) return;
    const mapboxgl = window.mapboxgl;
    const map = mapRef.current;

    // Limpiar marcadores anteriores
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    filteredParkings.forEach((p, idx) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      const isAyacuchoCoords = !isNaN(lat) && !isNaN(lng) && lat <= -13.0 && lat >= -13.35 && lng <= -74.0 && lng >= -74.4;

      let coords = isAyacuchoCoords 
        ? [lng, lat] 
        : (DEFAULT_PARKING_COORDS[p.id] || [-74.2257, -13.1606]);

      const elements = p.elements || [];
      const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      const rateFormatted = `S/ ${Number(p.rate || 4).toFixed(2)}`;
      const isSelected = String(selectedParkingId) === String(p.id);

      const el = document.createElement('div');
      el.className = `marker-3d-pin cursor-pointer transition-all duration-200 ${isSelected ? 'scale-110 z-30' : 'z-10'}`;
      el.innerHTML = `
        <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl shadow-2xl border ${
          isSelected
            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-400'
            : 'bg-white/95 text-slate-900 border-slate-200 hover:border-slate-400'
        }">
          <span class="text-xs font-mono font-black">${rateFormatted}</span>
          <span class="text-[10px] font-mono text-slate-500 border-l border-slate-200 pl-1.5 font-bold">${freeSlots} lib</span>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      // Card Popup 3D con SVG vectoriales en lugar de emoticons
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 240px; padding: 4px;">
          ${(p.image || FALLBACK_PARKING_IMAGE) ? `
            <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; position: relative;">
              <img src="${p.image || FALLBACK_PARKING_IMAGE}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${p.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${p.address}</div>
          
          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            <button id="btn-route-${p.id}" style="flex: 1; background: #0284c7; color: white; border: none; padding: 7px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              <span>Cómo llegar</span>
            </button>
            <button id="btn-select-${p.id}" style="flex: 1; background: #0f172a; color: white; border: none; padding: 7px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>Ver Plano</span>
            </button>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setDOMContent(popupContent);
      marker.setPopup(popup);

      el.addEventListener('click', () => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: coords,
            zoom: 16.8,
            pitch: 0,
            bearing: 0,
            duration: 600
          });
        }
      });

      marker.getPopup().on('open', () => {
        const btnSelect = document.getElementById(`btn-select-${p.id}`);
        if (btnSelect) {
          btnSelect.onclick = () => { if (onSelectParking) onSelectParking(p); };
        }
        const btnRoute = document.getElementById(`btn-route-${p.id}`);
        if (btnRoute) {
          btnRoute.onclick = () => { handleCalculateRoute(coords, p.name); };
        }
      });

      markersRef.current[p.id] = marker;
    });
  }, [filteredParkings, selectedParkingId, onSelectParking]);

  return (
    <div className="relative isolate z-0 w-full h-[460px] sm:h-[520px] bg-slate-100 overflow-hidden rounded-xl">
      
      {/* Lienzo Normal Mapbox */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Controles de Mapa Normal (Capas, Recentrar, Zoom) */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center space-x-2">
        {/* Selector de Capas Normal (Calles / Satélite) */}
        <div className="flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-white text-xs shadow-2xl">
          <button
            type="button"
            onClick={() => handleChangeLayer('streets')}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              mapLayer === 'streets'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Calles</span>
          </button>

          <button
            type="button"
            onClick={() => handleChangeLayer('satellite')}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              mapLayer === 'satellite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satélite</span>
          </button>
        </div>

        {/* Botones de Navegación Zoom y Recentrar */}
        <div className="flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-white shadow-2xl">
          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Centrar en Plaza Mayor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800" />
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Acercar"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Alejar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tarjeta Turn-by-Turn Flotante Superior (Giro a Giro en Tiempo Real) */}
      {activeRoute && activeRoute.currentStep && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-cyan-500/40 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92vw]">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/40">
            <Navigation className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Navegación GPS en Vivo
            </span>
            <span className="font-extrabold text-slate-100 text-sm">{activeRoute.currentStep.instruction}</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0 border-l border-slate-800 pl-3">
            {activeRoute.currentStep.distance > 0 && (
              <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-950/90 px-2 py-1 rounded-lg border border-emerald-800">
                {activeRoute.currentStep.distance} m
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (routesManagerRef.current) {
                  const muted = routesManagerRef.current.toggleMute();
                  setIsMuted(muted);
                }
              }}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMuted 
                  ? 'bg-rose-950/80 border-rose-800 text-rose-400' 
                  : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
              }`}
              title={isMuted ? 'Activar voz GPS' : 'Silenciar voz GPS'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Tarjeta de Ruta en Vivo */}
      {activeRoute && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[95vw]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-slate-200">
              Ruta hacia <strong className="text-white">{activeRoute.destinationName}</strong>:
            </span>
            <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">{activeRoute.distanceKm}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">{activeRoute.durationMin}</span>
          </div>

          <button
            type="button"
            onClick={handleClearRoute}
            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] transition cursor-pointer border border-slate-700 flex items-center gap-1 shrink-0 ml-2"
          >
            <X className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        </div>
      )}

    </div>
  );
};
