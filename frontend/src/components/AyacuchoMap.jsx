import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Layers, 
  Car, 
  LocateFixed,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { FALLBACK_PARKING_IMAGE } from './LocalEstablishmentManager';

// Coordenadas base de referencia en Ayacucho (Huamanga)
const DEFAULT_COORDS = {
  'EST-01': [-13.1604, -74.2259], // Plaza Mayor Planta Baja
  'EST-02': [-13.1612, -74.2252], // Plaza Mayor Sótano 1
  'EST-03': [-13.1565, -74.2215], // Mercado Mariscal Cáceres
  'EST-04': [-13.1718, -74.2210], // Terminal Terrestre
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || atob('cGsuZXlKMUlqb2lhMmhoYkhsa1pDSXNJbUVpT2lKamJYUm5kMkk0Y21Zd01EbHNNbmh4TlhKcmJ6Qm9PREkzSW4wLjI5dUl0MGZJR2lnYmN6WlpPWmlGMFE=');

export const AyacuchoMap = ({ parkings = [], onSelectParking, selectedParkingId }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Auto-detección de horario nocturno (18:00 a 06:00) para Feature 4
  const [mapLayer, setMapLayer] = useState(() => {
    const h = new Date().getHours();
    return (h >= 18 || h < 6) ? 'dark' : 'streets';
  }); // 'streets' | 'dark' | 'satellite'

  // Estado para Feature 5: Vista 3D inclinada en perspectiva
  const [is3D, setIs3D] = useState(false);

  // Feature 5: Filtros Rápidos en Mapa por Tipo de Vehículo y Precio Máximo
  const [filterType, setFilterType] = useState('all'); // 'all' | 'auto' | 'moto' | 'suv'
  const [filterPrice, setFilterPrice] = useState('all'); // 'all' | '5' | '8'

  // Feature 2: Ruta en vivo con Mapbox Directions API
  const routeLayerRef = useRef(null);
  const [activeRoute, setActiveRoute] = useState(null);

  const clearRoute = () => {
    if (routeLayerRef.current && mapInstanceRef.current) {
      try { mapInstanceRef.current.removeLayer(routeLayerRef.current); } catch (e) {}
      routeLayerRef.current = null;
    }
    setActiveRoute(null);
  };

  const calculateRouteTo = async (destCoords, destName) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Obtener origen (GPS del usuario o centro de Huamanga Plaza Mayor)
    let origin = [-13.1606, -74.2257];
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        origin = [pos.coords.latitude, pos.coords.longitude];
      } catch (e) {}
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[1]},${origin[0]};${destCoords[1]},${destCoords[0]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const routeData = data.routes[0];
        clearRoute();

        const routeGeoJSON = L.geoJSON(routeData.geometry, {
          style: {
            color: '#06b6d4',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }
        }).addTo(map);

        routeLayerRef.current = routeGeoJSON;
        map.fitBounds(routeGeoJSON.getBounds(), { padding: [50, 50] });

        const distKm = (routeData.distance / 1000).toFixed(1);
        const durMin = Math.max(1, Math.round(routeData.duration / 60));
        setActiveRoute({
          destinationName: destName,
          distanceKm: distKm,
          durationMin: durMin
        });
      }
    } catch (err) {
      console.warn('Mapbox directions error', err);
    }
  };

  const filteredParkings = React.useMemo(() => {
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

  const [tileLayerInstance, setTileLayerInstance] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Inicializar Leaflet con capa Mapbox Streets / Dark / Satélite HD
  useEffect(() => {
    if (!window.L || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;

    // Crear mapa centrado en el Centro Histórico de Huamanga
    const map = L.map(mapContainerRef.current, {
      center: [-13.1606, -74.2257],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const h = new Date().getHours();
    const isNight = h >= 18 || h < 6;
    const initialStyle = isNight ? 'mapbox/dark-v11' : 'mapbox/streets-v12';

    // Capa HD Mapbox
    const baseLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/${initialStyle}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      maxNativeZoom: 20,
      attribution: '&copy; Mapbox &copy; OpenStreetMap'
    }).addTo(map);

    setTileLayerInstance(baseLayer);

    // Controles de zoom minimalistas abajo a la derecha
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

  // Alternar entre capas Mapbox (Calles / Noche / Satélite)
  const toggleMapLayer = (layerType) => {
    if (!window.L || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (tileLayerInstance) {
      map.removeLayer(tileLayerInstance);
    }

    let stylePath = 'mapbox/streets-v12';
    if (layerType === 'satellite') stylePath = 'mapbox/satellite-streets-v12';
    else if (layerType === 'dark') stylePath = 'mapbox/dark-v11';

    const newLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/${stylePath}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      maxNativeZoom: 20,
      attribution: '&copy; Mapbox'
    });

    newLayer.addTo(map);
    setTileLayerInstance(newLayer);
    setMapLayer(layerType);
  };

  // Actualizar marcadores minimalistas de alta precisión (Estilo Airbnb / Apple Maps)
  useEffect(() => {
    if (!window.L || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Limpiar marcadores anteriores
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    filteredParkings.forEach((p, idx) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      const isAyacuchoCoords = !isNaN(lat) && !isNaN(lng) && lat <= -13.0 && lat >= -13.35 && lng <= -74.0 && lng >= -74.4;

      let coords = isAyacuchoCoords 
        ? [lat, lng] 
        : (DEFAULT_COORDS[p.id] || null);

      if (!coords) {
        const angle = (idx * (2 * Math.PI)) / Math.max(1, filteredParkings.length);
        const radius = 0.003 + (idx % 3) * 0.002;
        coords = [-13.1606 + Math.sin(angle) * radius, -74.2257 + Math.cos(angle) * radius];
      }

      const elements = p.elements || [];
      const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
      const isSelected = String(selectedParkingId) === String(p.id);
      const rateFormatted = `S/ ${Number(p.rate || 4).toFixed(2)}`;

      // Pin minimalista estilo Airbnb / Linear con precio y disponibilidad tipográfica
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="cursor-pointer transition-all duration-200 hover:scale-105 ${isSelected ? 'scale-110 z-30' : 'z-10'}">
            <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg shadow-md border ${
              isSelected
                ? 'bg-[#111111] text-white border-[#111111] ring-2 ring-black/20'
                : 'bg-white text-[#111111] border-[#EAEAEA] hover:border-[#CCCCCC]'
            }">
              <span class="text-xs font-mono font-bold tracking-tight">${rateFormatted}</span>
              <span class="text-[10px] font-mono text-[#787774] border-l border-[#EAEAEA] pl-1.5">${freeSlots} lib</span>
            </div>
            <div class="w-1.5 h-1.5 rotate-45 mx-auto -mt-0.5 ${isSelected ? 'bg-[#111111]' : 'bg-white border-r border-b border-[#EAEAEA]'}"></div>
          </div>
        `,
        iconSize: [95, 34],
        iconAnchor: [47, 34]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      // Popup Minimalista Editorial
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 250px; max-width: 280px; padding: 4px;">
          ${(p.image || FALLBACK_PARKING_IMAGE) ? `
            <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; position: relative; background: #F7F6F3;">
              <img 
                src="${p.image || FALLBACK_PARKING_IMAGE}" 
                alt="${p.name}" 
                referrerpolicy="no-referrer"
                crossorigin="anonymous"
                onerror="this.onerror=null;this.src='${FALLBACK_PARKING_IMAGE}'"
                style="width: 100%; height: 100%; object-fit: cover;" 
              />
              <div style="position: absolute; top: 6px; right: 6px; background: rgba(17,17,17,0.9); color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; font-weight: bold;">
                ${rateFormatted}/h
              </div>
            </div>
          ` : ''}
          
          <div style="font-size: 13px; font-weight: 700; color: #111111; margin-bottom: 2px; line-height: 1.2;">
            ${p.name}
          </div>
          <div style="font-size: 11px; color: #787774; margin-bottom: 8px;">
            ${p.address}${p.reference ? ` (${p.reference})` : ''}
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; background: #FBFBFA; padding: 6px 10px; border-radius: 6px; border: 1px solid #EAEAEA; margin-bottom: 10px; font-family: monospace; font-size: 11px;">
            <span style="color: #787774;">Disponibilidad:</span>
            <strong style="color: #346538; font-weight: bold;">${freeSlots} de ${totalSlots} libres</strong>
          </div>

          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="flex: 1; text-decoration: none; background: #FBFBFA; color: #111111; border: 1px solid #EAEAEA; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; text-align: center; box-sizing: border-box;"
            >
              Google Maps
            </a>
            <button 
              id="btn-route-${p.id}"
              style="flex: 1; background: #0284c7; color: #ffffff; border: none; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              🛣️ Ver Ruta
            </button>
          </div>

          <button 
            id="btn-select-${p.id}"
            style="width: 100%; background: #111111; color: #ffffff; border: none; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
          >
            <span>Ver Plano & Reservar</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        offset: [0, -28],
        autoPan: true,
        autoPanPadding: [30, 30]
      });

      marker.on('popupopen', () => {
        const btnSelect = document.getElementById(`btn-select-${p.id}`);
        if (btnSelect) {
          btnSelect.onclick = () => {
            if (onSelectParking) onSelectParking(p);
          };
        }
        const btnRoute = document.getElementById(`btn-route-${p.id}`);
        if (btnRoute) {
          btnRoute.onclick = () => {
            calculateRouteTo(coords, p.name);
          };
        }
      });

      marker.on('click', () => {
        centerOnMarker(coords, 16);
      });

      markersRef.current[p.id] = marker;
    });
  }, [filteredParkings, selectedParkingId, onSelectParking]);

  // Centrado matemático perfecto de pin y popup en el visor
  const centerOnMarker = (coords, zoom = 16) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const targetZoom = zoom || map.getZoom();

    // Proyectar coordenadas a píxeles y desplazar 115px arriba para centrar la tarjeta de popup completa en el contenedor
    const point = map.project(coords, targetZoom);
    const targetPoint = L.point(point.x, point.y - 115);
    const targetLatLng = map.unproject(targetPoint, targetZoom);

    map.flyTo(targetLatLng, targetZoom, {
      animate: true,
      duration: 0.6,
      easeLinearity: 0.25
    });
  };

  // Centrar y abrir popup si cambia selectedParkingId externamente (desde listado o buscador)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedParkingId || !window.L) return;
    const marker = markersRef.current[selectedParkingId];
    if (marker) {
      const latLng = marker.getLatLng();
      centerOnMarker([latLng.lat, latLng.lng], 16);
      setTimeout(() => {
        marker.openPopup();
      }, 250);
    }
  }, [selectedParkingId]);

  // Re-centrar en el Centro Histórico
  const handleRecenterAyacucho = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([-13.1606, -74.2257], 15, { animate: true });
  };

  // Obtener geolocalización GPS del usuario
  const handleGetLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    const L = window.L;
    setLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userCoords = [pos.coords.latitude, pos.coords.longitude];

        const map = mapInstanceRef.current;
        map.setView(userCoords, 16, { animate: true });

        const userIcon = L.divIcon({
          className: 'user-pin',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-black opacity-30"></span>
              <div class="w-4 h-4 shrink-0 bg-[#111111] border-2 border-white rounded-full shadow-md"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker(userCoords, { icon: userIcon })
          .addTo(map)
          .bindPopup('<strong style="font-size: 11px; font-family: monospace;">Tu ubicación</strong>')
          .openPopup();
      },
      () => {
        setLocatingUser(false);
        handleRecenterAyacucho();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="relative isolate z-0 w-full h-[460px] sm:h-[520px] bg-[#1c253b] overflow-hidden rounded-xl">
      
      {/* Contenedor del Mapa Leaflet Scoped con transformación 3D opcional */}
      <div 
        ref={mapContainerRef} 
        style={{
          transform: is3D ? 'perspective(1000px) rotateX(32deg) scale(1.35)' : 'none',
          transformOrigin: 'center 50%',
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-0" 
      />

      {/* Controles Flotantes Superiores con z-10 */}
      <div className="absolute top-4 right-4 z-10 flex items-center justify-end pointer-events-none">
        
        {/* Menú Flotante Expandible Auto-Colapsable (Expandable Floating Action Pill) */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-lg transition-all duration-300">
          
          {!showLayerMenu ? (
            /* Botón compacto colapsado con icono Layers */
            <button
              type="button"
              onClick={() => setShowLayerMenu(true)}
              className="flex items-center space-x-2 px-2.5 py-1 text-xs font-bold text-slate-800 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="capitalize">{mapLayer === 'dark' ? '🌙 Noche' : (mapLayer === 'satellite' ? 'Satélite' : 'Calles')}</span>
              {is3D && <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-black">3D</span>}
            </button>
          ) : (
            /* Menú desplegado con animación suave fade & slide-in */
            <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-4 duration-200">
              <button
                type="button"
                onClick={() => { toggleMapLayer('streets'); setShowLayerMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  mapLayer === 'streets'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                type="button"
                onClick={() => { toggleMapLayer('dark'); setShowLayerMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                  mapLayer === 'dark'
                    ? 'bg-slate-900 text-indigo-300 border border-indigo-700/60 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>🌙 Noche</span>
              </button>
              <button
                type="button"
                onClick={() => { toggleMapLayer('satellite'); setShowLayerMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  mapLayer === 'satellite'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>

              <div className="w-[1px] h-4 bg-slate-200" />

              {/* Toggle Vista 3D */}
              <button
                type="button"
                onClick={() => { setIs3D(!is3D); setShowLayerMenu(false); }}
                title="Conmutar perspectiva 3D"
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  is3D 
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-105' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                3D
              </button>
            </div>
          )}

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Centrar Plaza Mayor */}
          <button
            type="button"
            onClick={handleRecenterAyacucho}
            title="Centrar en Plaza Mayor"
            className="p-1 text-slate-500 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Mi GPS */}
          <button
            type="button"
            onClick={handleGetLocation}
            title="Mi Ubicación GPS"
            className="p-1 text-slate-500 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
          >
            <LocateFixed className={`w-4 h-4 ${locatingUser ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>

      {/* Filtros Rápidos Flotantes (Feature 5): Tipo de Vehículo y Tarifa Máxima */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none max-w-[calc(100%-200px)]">
        <div className="pointer-events-auto flex items-center space-x-1 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/90 shadow-lg text-xs font-bold">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider px-1">Vehículo:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'auto', label: 'Auto 🚗' },
            { id: 'moto', label: 'Moto 🏍️' },
            { id: 'suv', label: 'SUV 🚙' }
          ].map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFilterType(type.id)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === type.id
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center space-x-1 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/90 shadow-lg text-xs font-bold">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider px-1">Precio:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: '5', label: '≤ S/ 5/h' },
            { id: '8', label: '≤ S/ 8/h' }
          ].map(price => (
            <button
              key={price.id}
              type="button"
              onClick={() => setFilterPrice(price.id)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                filterPrice === price.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {price.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjeta Flotante de Ruta en Vivo (Feature 2): Mapbox Directions API */}
      {activeRoute && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[92vw]">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="font-bold text-slate-200">
              Ruta en vivo a <strong className="text-white">{activeRoute.destinationName}</strong>:
            </span>
            <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">{activeRoute.distanceKm} km</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">~{activeRoute.durationMin} min en auto</span>
          </div>
          <button
            type="button"
            onClick={clearRoute}
            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] transition cursor-pointer border border-slate-700 hover:border-rose-700 shrink-0"
          >
            ✕ Limpiar
          </button>
        </div>
      )}

    </div>
  );
};
