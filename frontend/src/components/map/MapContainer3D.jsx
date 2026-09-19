import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  CheckCircle2,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft
} from 'lucide-react';
import { FALLBACK_PARKING_IMAGE } from './mapConfig';
import { useAuth } from '../../context/AuthContext';

// Helper para obtener el ícono direccional según la maniobra Turn-by-Turn
const getManeuverIcon = (step) => {
  const mod = (step?.modifier || '').toLowerCase();
  const type = (step?.type || '').toLowerCase();
  if (type === 'arrive') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (mod.includes('right')) return <CornerUpRight className="w-5 h-5 text-blue-400" />;
  if (mod.includes('left')) return <CornerUpLeft className="w-5 h-5 text-blue-400" />;
  if (mod.includes('uturn')) return <RotateCcw className="w-5 h-5 text-amber-400" />;
  return <ArrowUp className="w-5 h-5 text-blue-400" />;
};

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
  const mapEngineRef = useRef('mapbox'); // 'mapbox' | 'leaflet'
  const [mapEngine, setMapEngine] = useState('mapbox'); // 'mapbox' | 'leaflet'

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

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

  // Fallback instantáneo a Leaflet 2D (OpenStreetMap / ArcGIS)
  const fallbackToLeaflet = () => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch (e) {}
      mapRef.current = null;
    }
    try {
      mapContainerRef.current.innerHTML = '';
      const map = L.map(mapContainerRef.current, {
        center: [AYACUCHO_CENTER.lat, AYACUCHO_CENTER.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      const tileUrl = mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapRef.current = map;
      mapEngineRef.current = 'leaflet';
      setMapEngine('leaflet');
      setMapReady(true);
    } catch (e) {
      console.error('[MapContainer3D] Error al iniciar Leaflet:', e);
      setMapError('Error al inicializar el mapa.');
    }
  };

  // Cambio manual a Mapbox 3D
  const switchToMapbox = () => {
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch (e) {}
      mapRef.current = null;
    }
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_STYLES[mapLayer] || MAPBOX_STYLES.streets,
        center: [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat],
        zoom: 15.8,
        pitch: 0,
        bearing: 0,
        antialias: true
      });
      mapRef.current = map;
      mapEngineRef.current = 'mapbox';
      setMapEngine('mapbox');
      map.on('style.load', () => {
        try {
          routesManagerRef.current = new MapRoutesManager(map);
        } catch (err) {}
        setMapReady(true);
      });
    } catch (e) {
      console.error('Error Mapbox:', e);
      fallbackToLeaflet();
    }
  };

  // Inicializar Motor de Mapa con detección activa de teselas
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let isCancelled = false;

    const initMap = () => {
      const isMapboxSupported = typeof mapboxgl.supported === 'function' ? mapboxgl.supported() : true;

      if (isMapboxSupported) {
        try {
          mapboxgl.accessToken = MAPBOX_TOKEN;
          try {
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

          let tilesEverLoaded = false;

          map.on('sourcedata', (e) => {
            if (e.isSourceLoaded) {
              tilesEverLoaded = true;
            }
          });

          // Detectar si las teselas de Mapbox son bloqueadas por adblockers o red
          map.on('error', (e) => {
            const msg = (e?.error?.message || e?.message || '').toLowerCase();
            if (msg.includes('events.mapbox.com')) return;
            if (!tilesEverLoaded && (e?.sourceId === 'composite' || msg.includes('tile') || msg.includes('source') || e?.status === 0 || e?.error?.status === 401 || e?.error?.status === 403)) {
              console.warn('[MapContainer3D] Teselas Mapbox bloqueadas o inaccesibles. Activando Leaflet 2D con OpenStreetMap.');
              if (!isCancelled) fallbackToLeaflet();
            }
          });

          mapRef.current = map;
          mapEngineRef.current = 'mapbox';
          setMapEngine('mapbox');

          map.once('load', () => {
            if (!isCancelled) setMapReady(true);
          });

          map.on('style.load', () => {
            try {
              routesManagerRef.current = new MapRoutesManager(map);
            } catch (err) {}
            if (!isCancelled) setMapReady(true);
          });

          // Guardia de contingencia: si en 2.2s las teselas no cargaron (canvas beige), activar Leaflet
          setTimeout(() => {
            if (!isCancelled && !tilesEverLoaded && mapEngineRef.current === 'mapbox') {
              try {
                if (typeof map.areTilesLoaded === 'function' && !map.areTilesLoaded()) {
                  console.warn('[MapContainer3D] Timeout de teselas Mapbox. Fallback a Leaflet 2D.');
                  fallbackToLeaflet();
                  return;
                }
              } catch (err) {}
            }
            if (!isCancelled) setMapReady(true);
          }, 2200);

          return;
        } catch (err) {
          console.warn('[MapContainer3D] Excepción Mapbox GL, usando Leaflet 2D:', err);
        }
      }

      fallbackToLeaflet();
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, []);

  // Cambiar Estilo de Mapa (Calles / Satélite)
  const handleChangeLayer = (layerKey) => {
    setMapLayer(layerKey);
    if (!mapRef.current) return;
    if (mapEngine === 'mapbox') {
      const styleUrl = MAPBOX_STYLES[layerKey] || MAPBOX_STYLES.streets;
      mapRef.current.setStyle(styleUrl);
    } else if (mapEngine === 'leaflet') {
      mapRef.current.eachLayer((layer) => {
        if (layer._url) mapRef.current.removeLayer(layer);
      });
      const tileUrl = layerKey === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(mapRef.current);
    }
  };

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    if (mapEngine === 'mapbox') mapRef.current.zoomIn({ duration: 300 });
    else if (mapEngine === 'leaflet') mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    if (mapEngine === 'mapbox') mapRef.current.zoomOut({ duration: 300 });
    else if (mapEngine === 'leaflet') mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (mapEngine === 'mapbox') {
      mapRef.current.flyTo({
        center: [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat],
        zoom: 15.8,
        pitch: 0,
        bearing: 0,
        duration: 600
      });
    } else if (mapEngine === 'leaflet') {
      mapRef.current.flyTo([AYACUCHO_CENTER.lat, AYACUCHO_CENTER.lng], 16, { duration: 0.6 });
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

  // Actualizar marcadores interactivos en el mapa (Compatible con Mapbox 3D y Leaflet 2D)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Limpiar marcadores anteriores
    Object.values(markersRef.current).forEach(m => {
      if (m && typeof m.remove === 'function') m.remove();
    });
    markersRef.current = {};

    filteredParkings.forEach((p) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      const isAyacuchoCoords = !isNaN(lat) && !isNaN(lng) && lat <= -13.0 && lat >= -13.35 && lng <= -74.0 && lng >= -74.4;

      let coords = isAyacuchoCoords 
        ? [lng, lat] 
        : (DEFAULT_PARKING_COORDS[p.id] || [-74.2257, -13.1606]);

      // Modo Enfoque de Ruta (Route Focus Mode):
      if (activeRoute) {
        const isThisDest = activeRoute.destinationName && p.name && (
          p.name.trim().toLowerCase() === activeRoute.destinationName.trim().toLowerCase() ||
          (targetDest?.coords && Math.abs(coords[0] - targetDest.coords[0]) < 0.0002 && Math.abs(coords[1] - targetDest.coords[1]) < 0.0002)
        );

        if (!isThisDest) {
          const dotEl = document.createElement('div');
          dotEl.className = 'w-2.5 h-2.5 rounded-full bg-slate-400/50 hover:bg-slate-700 border border-white shadow-xs cursor-pointer transition-all hover:scale-125';
          dotEl.title = p.name;
          dotEl.addEventListener('click', () => {
            if (onSelectParking) onSelectParking(p);
          });

          if (mapEngineRef.current === 'mapbox') {
            const dotMarker = new mapboxgl.Marker({ element: dotEl })
              .setLngLat(coords)
              .addTo(map);
            markersRef.current[p.id] = dotMarker;
          } else if (mapEngineRef.current === 'leaflet') {
            const dotIcon = L.divIcon({
              html: dotEl.outerHTML,
              className: '',
              iconSize: [10, 10],
              iconAnchor: [5, 5]
            });
            const dotMarker = L.marker([coords[1], coords[0]], { icon: dotIcon }).addTo(map);
            dotMarker.on('click', () => {
              if (onSelectParking) onSelectParking(p);
            });
            markersRef.current[p.id] = dotMarker;
          }
          return;
        }
        return;
      }

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
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md border transition-all ${
          isSelected
            ? 'bg-slate-900 text-white border-emerald-400 ring-4 ring-emerald-400/30 scale-105'
            : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-lg'
        }">
          <span class="w-2 h-2 rounded-full ${isMaint ? 'bg-amber-500' : isClosed ? 'bg-rose-500' : (freeSlots > 0 ? 'bg-emerald-500' : 'bg-slate-400')} shrink-0"></span>
          <span class="text-xs font-bold font-mono">${rateFormatted}</span>
          <span class="text-[10px] font-semibold ${isMaint ? 'text-amber-600' : isClosed ? 'text-rose-600' : 'text-slate-500'} border-l border-slate-200 pl-1.5">${isMaint ? 'manten' : isClosed ? 'cerrado' : `${freeSlots} lib`}</span>
        </div>
      `;

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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
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

      const wirePopupEvents = (closeFn) => {
        const btnClose = document.getElementById(`btn-close-${p.id}`);
        if (btnClose) {
          btnClose.onclick = () => { closeFn(); };
        }
        const btnQuick = document.getElementById(`btn-quick-${p.id}`);
        if (btnQuick && !isUnavailable) {
          btnQuick.onclick = () => {
            closeFn();
            if (onQuickReservation) onQuickReservation(p);
          };
        }
        const btnSelect = document.getElementById(`btn-select-${p.id}`);
        if (btnSelect) {
          btnSelect.onclick = () => {
            closeFn();
            if (onSelectParking) onSelectParking(p);
          };
        }
        const btnRoute = document.getElementById(`btn-route-${p.id}`);
        if (btnRoute) {
          btnRoute.onclick = () => {
            closeFn();
            handleCalculateRoute(coords, p.name);
          };
        }
      };

      if (mapEngineRef.current === 'mapbox') {
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);

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
          wirePopupEvents(() => popup.remove());
        });

        markersRef.current[p.id] = marker;
      } else if (mapEngineRef.current === 'leaflet') {
        const customIcon = L.divIcon({
          html: el.outerHTML,
          className: 'leaflet-smartpark-marker',
          iconSize: [110, 32],
          iconAnchor: [55, 16]
        });

        const marker = L.marker([coords[1], coords[0]], { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent.innerHTML, { maxWidth: 290, className: 'leaflet-smartpark-popup' });

        marker.on('click', () => {
          if (mapRef.current) {
            mapRef.current.flyTo([coords[1], coords[0]], 17, { duration: 0.6 });
          }
        });

        marker.on('popupopen', () => {
          wirePopupEvents(() => marker.closePopup());
        });

        markersRef.current[p.id] = marker;
      }
    });
  }, [filteredParkings, selectedParkingId, onSelectParking, activeRoute, targetDest, mapEngine]);

  const targetCoords = activeRoute?.destCoords || targetDest?.coords;
  const targetParking = parkings.find(p => {
    if (activeRoute?.destinationName && p.name && p.name.trim().toLowerCase() === activeRoute.destinationName.trim().toLowerCase()) {
      return true;
    }
    if (targetCoords && p.latitude && p.longitude) {
      return Math.abs(Number(p.latitude) - targetCoords[1]) < 0.0002 && Math.abs(Number(p.longitude) - targetCoords[0]) < 0.0002;
    }
    return false;
  });

  return (
    <div className="w-full space-y-3">
      {/* Contenedor del Mapa (100% Despejado, sin modales bloqueando la vista en móvil) */}
      <div className="relative isolate z-0 w-full h-[380px] sm:h-[460px] md:h-[540px] lg:h-[600px] bg-slate-100 dark:bg-slate-950 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        
        {/* Lienzo Normal Mapbox / Leaflet */}
        <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Overlay de Carga Elegante */}
        {!mapReady && !mapError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-950/85 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin shrink-0" />
              <div className="text-left">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Cargando mapa interactivo...</p>
                <p className="text-[10px] text-slate-500 font-medium">Sincronizando cocheras de Ayacucho</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Error con botón de recarga */}
        {mapError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 text-center text-white">
            <p className="text-sm font-bold text-rose-400 mb-1">Aviso del mapa</p>
            <p className="text-xs text-slate-300 mb-4">{mapError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              Reintentar carga
            </button>
          </div>
        )}

        {/* Controles de Mapa Flotantes Minimalistas (Cápsula Unificada) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-auto flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 text-xs">
          {/* Selector de Capas (Calles / Satélite / Motor) */}
          <div className="flex items-center p-0.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl">
            <button
              type="button"
              onClick={() => handleChangeLayer('streets')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                mapLayer === 'streets'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Calles</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeLayer('satellite')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                mapLayer === 'satellite'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Satélite</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (mapEngine === 'mapbox') {
                  fallbackToLeaflet();
                } else {
                  switchToMapbox();
                }
              }}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              title={mapEngine === 'mapbox' ? 'Cambiar a mapa 2D (OpenStreetMap)' : 'Cambiar a mapa 3D (Mapbox)'}
            >
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>{mapEngine === 'mapbox' ? '3D' : '2D'}</span>
            </button>
          </div>

          {/* Separador sutil */}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1.5" />

          {/* Botones de Navegación Zoom y Recentrar */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleRecenter}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
              title="Centrar en Plaza Mayor"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
              title="Acercar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
              title="Alejar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chip Minimalista Discreto sobre el Mapa (Informa que hay ruta activa sin tapar calles) */}
        {activeRoute && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="text-slate-300 font-medium text-[11px] hidden sm:inline">Ruta hacia</span>
            <strong className="text-white font-extrabold truncate max-w-[130px] sm:max-w-[200px]">{activeRoute.destinationName}</strong>
            <button
              type="button"
              onClick={handleClearRoute}
              className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer ml-0.5"
              title="Cerrar recorrido"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Notificación sutil de GPS (discreta en la esquina inferior izquierda) */}
        {gpsStatus === 'locating' && (
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md text-cyan-300 px-3 py-1.5 rounded-xl border border-cyan-500/50 text-[11px] font-medium flex items-center gap-2 shadow-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
            <span>Detectando ubicación GPS...</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          CONSOLA DE NAVEGACIÓN Y RECORRIDO (FUERA DEL MAPA - 100% RESPONSIVE)
          ========================================================================= */}
      {activeRoute && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
          
          {/* Fila 1: Cabecera de Viaje, Métricas y Acciones Principales */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
                <Navigation className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Rumbo al Destino
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {activeRoute.destinationName}
                </h3>
              </div>
            </div>

            {/* Métricas y Controles de Voz / Finalizar */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">
                <span className="text-slate-900 dark:text-white font-mono">{activeRoute.distanceKm}</span>
                <span className="text-slate-400">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">{activeRoute.durationMin}</span>
              </div>

              {/* Botón de Voz GPS */}
              <button
                type="button"
                onClick={() => {
                  if (routesManagerRef.current) {
                    const muted = routesManagerRef.current.toggleMute();
                    setIsMuted(muted);
                  }
                }}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isMuted 
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600' 
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                }`}
                title={isMuted ? 'Activar voz GPS' : 'Silenciar voz GPS'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Botón Finalizar Recorrido */}
              <button
                type="button"
                onClick={handleClearRoute}
                className="px-3 py-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                title="Finalizar navegación"
              >
                <X className="w-3.5 h-3.5" />
                <span>Finalizar</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Indicación de Maniobra Actual (Turn-by-Turn Real) */}
          {activeRoute.currentStep && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                {getManeuverIcon(activeRoute.currentStep)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {activeRoute.currentStep.instruction}
                </p>
              </div>
              {activeRoute.currentStep.distance > 0 && (
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    en {activeRoute.currentStep.distance} m
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Fila 3: Opciones y Accesos Directos (Auto vs A pie, Waze, Google Maps, Ficha) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Selector de Modo: En Auto vs A pie */}
            {targetDest && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleCalculateRoute(targetDest.coords, targetDest.name, 'driving')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeProfile === 'driving' 
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>En Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCalculateRoute(targetDest.coords, targetDest.name, 'walking')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeProfile === 'walking' 
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>A pie</span>
                </button>
              </div>
            )}

            {/* Accesos a Navegadores Nativos: Waze y Google Maps */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {targetCoords && (
                <>
                  {/* Waze */}
                  <a
                    href={`https://waze.com/ul?ll=${targetCoords[1]},${targetCoords[0]}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-cyan-200 dark:border-cyan-800 shadow-2xs cursor-pointer"
                    title="Abrir en Waze para navegación guiada con alertas de tráfico"
                  >
                    <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Waze</span>
                  </a>

                  {/* Google Maps */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${targetCoords[1]},${targetCoords[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 shadow-2xs cursor-pointer"
                    title="Abrir en Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Google Maps</span>
                  </a>
                </>
              )}

              {/* Botón Ver Sede / Ficha */}
              {targetParking && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectParking) onSelectParking(targetParking);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ver detalles y plano de la sede"
                >
                  <span>Ver Sede & Plaza</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
