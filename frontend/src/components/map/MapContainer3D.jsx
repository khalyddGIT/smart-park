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
  RotateCcw,
  Car,
  Footprints,
  ExternalLink,
  Loader2,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { FALLBACK_PARKING_IMAGE } from './mapConfig';
import { useAuth } from '../../context/AuthContext';

export const MapContainer3D = ({ 
  parkings = [], 
  onSelectParking, 
  onQuickReservation,
  selectedParkingId,
  forceShowAdminPanel = false,
  routeTarget,
  onClearRoute
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
  const [gpsStatus, setGpsStatus] = useState(''); // 'locating' | 'located' | 'fallback' | ''
  const [activeProfile, setActiveProfile] = useState('driving');

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

  // Escuchar petición externa para trazar ruta (ej: botón Cómo Llegar de la ficha)
  useEffect(() => {
    if (!routeTarget) return;
    const p = routeTarget.parking || routeTarget;
    if (!p) return;

    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    const isAyacuchoCoords = !isNaN(lat) && !isNaN(lng) && lat <= -13.0 && lat >= -13.35 && lng <= -74.0 && lng >= -74.4;
    const coords = isAyacuchoCoords ? [lng, lat] : (DEFAULT_PARKING_COORDS[p.id] || [-74.2257, -13.1606]);

    const execRoute = () => {
      if (routesManagerRef.current && mapRef.current) {
        handleCalculateRoute(coords, p.name || 'Estacionamiento', activeProfile || 'driving');
      } else {
        setTimeout(execRoute, 300);
      }
    };

    execRoute();
  }, [routeTarget]);

  // Trazar Ruta en Tiempo Real con GPS y Turn-by-Turn
  const handleCalculateRoute = async (destCoords, destName, profile = 'driving') => {
    if (!routesManagerRef.current) return;
    setTargetDest({ coords: destCoords, name: destName });
    setActiveProfile(profile);
    setGpsStatus('locating');

    let origin = [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat];
    let isRealGps = false;

    // 1. Obtener la ubicación GPS real del navegador
    if (navigator.geolocation) {
      try {
        const userPos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
            (err) => {
              console.warn('Geolocation error / permiso denegado:', err);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 4000 }
          );
        });
        if (userPos) {
          origin = userPos;
          isRealGps = true;
          setGpsStatus('located');
        } else {
          setGpsStatus('fallback');
        }
      } catch (e) {
        setGpsStatus('fallback');
      }
    } else {
      setGpsStatus('fallback');
    }

    setTimeout(() => {
      setGpsStatus('');
    }, 4500);

    // 2. Calcular ruta real con Mapbox Directions API desde la ubicación exacta del usuario
    const routeInfo = await routesManagerRef.current.drawRoute(origin, destCoords, destName, profile);
    if (routeInfo) {
      setActiveRoute({
        ...routeInfo,
        isRealGps,
        destCoords,
        destinationName: destName,
        profile
      });
    }

    // 3. Iniciar rastreo continuo en tiempo real conforme el usuario avance (watchPosition)
    routesManagerRef.current.startRealtimeTracking(destCoords, destName, (liveRouteData) => {
      setActiveRoute((prev) => ({
        ...(prev || {}),
        ...liveRouteData,
        isRealGps: true,
        destCoords,
        destinationName: destName,
        profile
      }));
    });
  };

  const handleClearRoute = () => {
    if (routesManagerRef.current) {
      routesManagerRef.current.clearRoute();
      routesManagerRef.current.stopRealtimeTracking();
    }
    setActiveRoute(null);
    setTargetDest(null);
    setGpsStatus('');
    if (onClearRoute) onClearRoute();
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

      const pStatus = String(p.status || '').toLowerCase();
      const isMaint = pStatus === 'mantenimiento' || pStatus === 'maintenance';
      const isClosed = pStatus === 'cerrado' || pStatus === 'closed';
      const isUnavailable = isMaint || isClosed;

      const elements = p.elements || [];
      const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      const rateFormatted = `S/ ${Number(p.rate || 4).toFixed(2)}`;
      const isSelected = String(selectedParkingId) === String(p.id);

      const el = document.createElement('div');
      el.className = `marker-3d-pin cursor-pointer transition-transform duration-200 hover:scale-105 ${isSelected ? 'scale-110 z-30' : 'z-10'}`;
      el.innerHTML = `
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border transition-all ${
          isSelected
            ? 'bg-slate-900 text-white border-emerald-400 ring-4 ring-emerald-400/30'
            : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-400 hover:shadow-xl'
        }">
          <span class="w-2 h-2 rounded-full ${isMaint ? 'bg-amber-500' : isClosed ? 'bg-rose-500' : (freeSlots > 0 ? 'bg-emerald-500' : 'bg-slate-400')} shrink-0"></span>
          <span class="text-xs font-mono font-black">${rateFormatted}</span>
          <span class="text-[10px] font-mono ${isMaint ? 'text-amber-600' : isClosed ? 'text-rose-600' : 'text-slate-500'} border-l border-slate-200 pl-1 font-bold">${isMaint ? 'manten' : isClosed ? 'cerrado' : `${freeSlots} lib`}</span>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      // Card Popup con diseño editorial, elegante y sin choque visual
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="font-family: inherit; width: 275px; overflow: hidden;">
          <!-- Cabecera Fotográfica con Badges Flotantes -->
          <div style="position: relative; width: 100%; height: 125px; overflow: hidden; background: #0f172a;">
            <img 
              src="${p.image || FALLBACK_PARKING_IMAGE}" 
              style="width: 100%; height: 100%; object-fit: cover;" 
              alt="${p.name}" 
              loading="lazy"
            />
            <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, transparent 45%, rgba(15,23,42,0.7) 100%);"></div>
            
            <!-- Badge Superior de Estado o Cupos Libres -->
            ${isMaint ? `
            <div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 5px; background: rgba(217, 119, 6, 0.95); backdrop-filter: blur(6px); color: white; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              <span>En Mantenimiento</span>
            </div>
            ` : isClosed ? `
            <div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 5px; background: rgba(225, 29, 72, 0.95); backdrop-filter: blur(6px); color: white; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
              <span>Cerrado</span>
            </div>
            ` : `
            <div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 5px; background: rgba(5, 150, 105, 0.95); backdrop-filter: blur(6px); color: white; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; font-family: monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: #6ee7b7; display: inline-block;"></span>
              <span>${freeSlots} libres</span>
            </div>
            `}

            <!-- Botón Cerrar Discreto -->
            <button id="btn-close-${p.id}" type="button" style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 9999px; background: rgba(15, 23, 42, 0.7); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); transition: background 0.15s;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <!-- Tarifa por Hora -->
            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(6px); color: #0f172a; padding: 3px 9px; border-radius: 10px; font-size: 12px; font-weight: 900; font-family: monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.18);">
              ${rateFormatted}/h
            </div>
          </div>

          <!-- Cuerpo de Datos y Navegación -->
          <div style="padding: 12px 14px 14px 14px; background: #ffffff;">
            <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; line-height: 1.25; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">
              ${p.name}
            </div>
            <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="overflow: hidden; text-overflow: ellipsis;">${p.address || 'Ayacucho - Huamanga'}</span>
            </div>

            <!-- Acciones -->
            <div style="display: flex; gap: 6px;">
              <button id="btn-route-${p.id}" type="button" style="flex: 1; height: 35px; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease;" title="Trazar ruta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                <span>Ruta</span>
              </button>
              ${isUnavailable ? `
              <button id="btn-quick-${p.id}" type="button" disabled style="flex: 1.1; height: 35px; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 10.5px; font-weight: 700; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 3px;" title="${isMaint ? 'En mantenimiento' : 'Cerrado'}">
                <span>${isMaint ? 'Mantenimiento' : 'Cerrado'}</span>
              </button>
              ` : `
              <button id="btn-quick-${p.id}" type="button" style="flex: 1.1; height: 35px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff; border: none; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease; box-shadow: 0 2px 6px rgba(5,150,105,0.25);" title="Reserva rápida express">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Rápida</span>
              </button>
              `}
              <button id="btn-select-${p.id}" type="button" style="flex: 1; height: 35px; background: #0f172a; color: #ffffff; border: none; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease;" title="Ver Plano 2D">
                <span>Plano</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: {
          'top': [0, 12],
          'top-left': [0, 12],
          'top-right': [0, 12],
          'bottom': [0, -20],
          'bottom-left': [0, -20],
          'bottom-right': [0, -20],
          'left': [16, 0],
          'right': [-16, 0]
        },
        closeButton: false,
        closeOnClick: true,
        maxWidth: '290px'
      }).setDOMContent(popupContent);
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
        const btnClose = document.getElementById(`btn-close-${p.id}`);
        if (btnClose) {
          btnClose.onclick = () => { popup.remove(); };
        }
        const btnQuick = document.getElementById(`btn-quick-${p.id}`);
        if (btnQuick && !isUnavailable) {
          btnQuick.onclick = () => {
            popup.remove();
            if (onQuickReservation) onQuickReservation(p);
          };
        }
        const btnSelect = document.getElementById(`btn-select-${p.id}`);
        if (btnSelect) {
          btnSelect.onclick = () => {
            popup.remove();
            if (onSelectParking) onSelectParking(p);
          };
        }
        const btnRoute = document.getElementById(`btn-route-${p.id}`);
        if (btnRoute) {
          btnRoute.onclick = () => {
            popup.remove();
            handleCalculateRoute(coords, p.name);
          };
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

      {/* Alerta de Estado del GPS */}
      {gpsStatus === 'locating' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 text-cyan-300 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          <span>Obteniendo tu ubicación GPS en tiempo real...</span>
        </div>
      )}
      {gpsStatus === 'located' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-emerald-950/95 backdrop-blur-md border border-emerald-500/60 text-emerald-300 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>¡Ubicación GPS detectada! Ruta trazada desde tu posición.</span>
        </div>
      )}
      {gpsStatus === 'fallback' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-amber-950/95 backdrop-blur-md border border-amber-500/60 text-amber-300 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          <span>GPS no activo o denegado: Trazando desde el centro de Huamanga.</span>
        </div>
      )}

      {/* Tarjeta de Ruta en Vivo con Controles de Perfil y Enlace a Google Maps */}
      {activeRoute && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[96vw] sm:max-w-max">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-slate-200 truncate max-w-[130px] sm:max-w-[200px]" title={activeRoute.destinationName}>
              Hacia <strong className="text-white">{activeRoute.destinationName}</strong>:
            </span>
            <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 shrink-0">
              {activeRoute.distanceKm}
            </span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
              {activeRoute.durationMin}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Selector de Modo: Auto vs A pie */}
            {targetDest && (
              <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleCalculateRoute(targetDest.coords, targetDest.name, 'driving')}
                  className={`p-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeProfile === 'driving' 
                      ? 'bg-cyan-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ruta en Auto"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCalculateRoute(targetDest.coords, targetDest.name, 'walking')}
                  className={`p-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeProfile === 'walking' 
                      ? 'bg-cyan-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ruta a Pie"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">A pie</span>
                </button>
              </div>
            )}

            {/* Abrir en Google Maps si se desea app nativa */}
            {activeRoute.destCoords && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeRoute.destCoords[1]},${activeRoute.destCoords[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-xs cursor-pointer"
                title="Abrir en Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Maps</span>
              </a>
            )}

            {/* Limpiar ruta */}
            <button
              type="button"
              onClick={handleClearRoute}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] transition cursor-pointer border border-slate-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
