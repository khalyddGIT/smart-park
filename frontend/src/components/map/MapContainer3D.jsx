import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MAPBOX_TOKEN, 
  AYACUCHO_CENTER, 
  DEFAULT_PARKING_COORDS, 
  MAPBOX_STYLES 
} from './mapConfig';
import { MapTerrainManager } from './MapTerrain';
import { MapBuildingsManager } from './MapBuildings';
import { MapCameraManager } from './MapCamera';
import { MapRoutesManager } from './MapRoutes';
import { MapControlPanel } from './MapControlPanel';
import { 
  Compass, 
  Car, 
  Bike, 
  Truck, 
  Navigation, 
  Building2, 
  X, 
  MapPin,
  Footprints 
} from 'lucide-react';
import { FALLBACK_PARKING_IMAGE } from '../LocalEstablishmentManager';

export const MapContainer3D = ({ 
  parkings = [], 
  onSelectParking, 
  selectedParkingId 
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  // Instancias de administradores modulares 3D
  const terrainManagerRef = useRef(null);
  const buildingsManagerRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const routesManagerRef = useRef(null);

  // Estados 3D (Carga inicial por defecto en vista 2D normal)
  const [is3D, setIs3D] = useState(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [isBuildingsEnabled, setIsBuildingsEnabled] = useState(true);
  const [isAtmosphereEnabled, setIsAtmosphereEnabled] = useState(true);
  const [mapLayer, setMapLayer] = useState(() => {
    const h = new Date().getHours();
    return (h >= 18 || h < 6) ? 'dark' : 'streets';
  });
  const [exaggeration, setExaggeration] = useState(1.5);
  const [pitch, setPitch] = useState(0);
  const [activeRoute, setActiveRoute] = useState(null);
  const [targetDest, setTargetDest] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Filtros Rápidos (Feature 5)
  const [filterType, setFilterType] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');

  // Inicializar Mapbox GL JS 3D Engine Nativo (Vista 2D por defecto)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

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

    // Inicializar módulos 3D cuando el mapa cargue
    map.on('style.load', () => {
      // 1. Módulo Terreno 3D
      terrainManagerRef.current = new MapTerrainManager(map);
      terrainManagerRef.current.setupTerrain();

      // 2. Módulo Edificios 3D Extruidos
      buildingsManagerRef.current = new MapBuildingsManager(map, (bldg) => {
        setSelectedBuilding(bldg);
      });
      buildingsManagerRef.current.setupBuildings();

      // 3. Módulo Cámara 3D
      cameraManagerRef.current = new MapCameraManager(map);

      // 4. Módulo Rutas 3D
      routesManagerRef.current = new MapRoutesManager(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cambiar Estilo de Mapa preservando Terreno y Edificios 3D
  const handleChangeLayer = (layerKey) => {
    if (!mapRef.current) return;
    setMapLayer(layerKey);
    const styleUrl = MAPBOX_STYLES[layerKey] || MAPBOX_STYLES.streets;
    mapRef.current.setStyle(styleUrl);
  };

  // Conmutar Terreno 3D
  const handleToggleTerrain = () => {
    if (!terrainManagerRef.current) return;
    if (isTerrainEnabled) {
      terrainManagerRef.current.disableTerrain();
      setIsTerrainEnabled(false);
    } else {
      terrainManagerRef.current.enableTerrain(exaggeration);
      setIsTerrainEnabled(true);
    }
  };

  // Conmutar Edificios 3D
  const handleToggleBuildings = () => {
    if (!buildingsManagerRef.current) return;
    const next = !isBuildingsEnabled;
    buildingsManagerRef.current.toggleBuildings(next);
    setIsBuildingsEnabled(next);
  };

  // Conmutar 3D / 2D
  const handleToggle3D = () => {
    if (!cameraManagerRef.current) return;
    if (is3D) {
      cameraManagerRef.current.enable2DView();
      if (terrainManagerRef.current) terrainManagerRef.current.disableTerrain();
      setIsTerrainEnabled(false);
      setPitch(0);
      setIs3D(false);
    } else {
      cameraManagerRef.current.enable3DView();
      if (terrainManagerRef.current) terrainManagerRef.current.enableTerrain(exaggeration);
      setIsTerrainEnabled(true);
      setPitch(65);
      setIs3D(true);
    }
  };

  // Cambiar Exageración
  const handleChangeExaggeration = (val) => {
    setExaggeration(val);
    if (terrainManagerRef.current) {
      terrainManagerRef.current.setExaggeration(val);
    }
  };

  // Cambiar Pitch
  const handleChangePitch = (val) => {
    setPitch(val);
    if (mapRef.current) {
      mapRef.current.easeTo({ pitch: val, duration: 300 });
    }
  };

  // Trazar Ruta 3D en Tiempo Real con GPS y Turn-by-Turn
  const handleCalculateRoute = async (destCoords, destName, profile = 'driving') => {
    if (!routesManagerRef.current) return;
    
    // Trazado inicial estático si GPS tarda
    const origin = [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat];
    const routeInfo = await routesManagerRef.current.drawRoute(origin, destCoords, destName, profile);
    if (routeInfo) {
      setActiveRoute(routeInfo);
      setTargetDest({ coords: destCoords, name: destName });
    }

    // Iniciar rastreo GPS en vivo en segundo plano
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
            <button id="btn-3d-route-${p.id}" style="flex: 1; background: #0284c7; color: white; border: none; padding: 7px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              <span>Ruta 3D</span>
            </button>
            <button id="btn-3d-select-${p.id}" style="flex: 1; background: #0f172a; color: white; border: none; padding: 7px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>Ver Plano</span>
            </button>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setDOMContent(popupContent);
      marker.setPopup(popup);

      el.addEventListener('click', () => {
        if (cameraManagerRef.current) {
          cameraManagerRef.current.flyToLocation(coords, 17.5, 65);
        }
      });

      marker.getPopup().on('open', () => {
        const btnSelect = document.getElementById(`btn-3d-select-${p.id}`);
        if (btnSelect) {
          btnSelect.onclick = () => { if (onSelectParking) onSelectParking(p); };
        }
        const btnRoute = document.getElementById(`btn-3d-route-${p.id}`);
        if (btnRoute) {
          btnRoute.onclick = () => { handleCalculateRoute(coords, p.name); };
        }
      });

      markersRef.current[p.id] = marker;
    });
  }, [filteredParkings, selectedParkingId, onSelectParking]);

  return (
    <div className="relative isolate z-0 w-full h-[460px] sm:h-[520px] bg-slate-950 overflow-hidden rounded-xl">
      
      {/* Lienzo WebGL 3D Mapbox */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Panel de Control Mapbox 3D */}
      <MapControlPanel
        is3D={is3D}
        onToggle3D={handleToggle3D}
        isTerrainEnabled={isTerrainEnabled}
        onToggleTerrain={handleToggleTerrain}
        isBuildingsEnabled={isBuildingsEnabled}
        onToggleBuildings={handleToggleBuildings}
        isAtmosphereEnabled={isAtmosphereEnabled}
        onToggleAtmosphere={() => {}}
        mapLayer={mapLayer}
        onChangeLayer={handleChangeLayer}
        exaggeration={exaggeration}
        onChangeExaggeration={handleChangeExaggeration}
        pitch={pitch}
        onChangePitch={handleChangePitch}
        onStartOrbit={() => cameraManagerRef.current && cameraManagerRef.current.orbitAroundLocation()}
        onStartCinematic={() => cameraManagerRef.current && cameraManagerRef.current.startCinematicTour(parkings)}
        onResetCamera={() => cameraManagerRef.current && cameraManagerRef.current.resetCamera()}
      />

      {/* Filtros Rápidos (Feature 5) con Iconos SVG */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none max-w-[calc(100%-340px)]">
        <div className="pointer-events-auto flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-white text-xs font-bold shadow-2xl">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider px-1">Vehículo:</span>
          {[
            { id: 'all', label: 'Todos', icon: null },
            { id: 'auto', label: 'Auto', icon: Car },
            { id: 'moto', label: 'Moto', icon: Bike },
            { id: 'suv', label: 'SUV', icon: Truck }
          ].map(type => {
            const IconComp = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setFilterType(type.id)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === type.id
                    ? 'bg-emerald-600 text-white font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {IconComp && <IconComp className="w-3.5 h-3.5" />}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspección de Edificio 3D Seleccionado */}
      {selectedBuilding && (
        <div className="absolute top-16 left-4 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-800 shadow-2xl w-64 text-xs space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <strong className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Edificación 3D
            </strong>
            <button onClick={() => setSelectedBuilding(null)} className="text-slate-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div><strong className="text-slate-300">Nombre:</strong> {selectedBuilding.name}</div>
          <div><strong className="text-slate-300">Altura Real:</strong> {selectedBuilding.height}</div>
          <div><strong className="text-slate-300">Pisos / Niveles:</strong> ~{selectedBuilding.levels} niveles</div>
          <div><strong className="text-slate-300">Ubicación:</strong> {selectedBuilding.address}</div>
        </div>
      )}

      {/* Tarjeta Turn-by-Turn Flotante Superior (Giro a Giro en Tiempo Real) */}
      {activeRoute && activeRoute.currentStep && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-cyan-500/40 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92vw]">
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
          {activeRoute.currentStep.distance > 0 && (
            <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-950/90 px-2 py-1 rounded-lg border border-emerald-800 shrink-0">
              {activeRoute.currentStep.distance} m
            </span>
          )}
        </div>
      )}

      {/* Tarjeta de Ruta 3D en Vivo (Feature 2 & Modos de Transporte) */}
      {activeRoute && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[95vw]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-slate-200">
              Ruta 3D a <strong className="text-white">{activeRoute.destinationName}</strong>:
            </span>
            <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">{activeRoute.distanceKm} km</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">~{activeRoute.durationMin} min</span>
          </div>

          {/* Selector de Modo de Transporte en Vivo */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'driving', label: 'Auto', icon: Car },
              { id: 'cycling', label: 'Moto', icon: Bike },
              { id: 'walking', label: 'A pie', icon: Footprints }
            ].map((m) => {
              const IconComp = m.icon;
              const isSel = (activeRoute.profile || 'driving') === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (targetDest) handleCalculateRoute(targetDest.coords, targetDest.name, m.id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    isSel ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearRoute}
            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] transition cursor-pointer border border-slate-700 flex items-center gap-1 shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        </div>
      )}

    </div>
  );
};
