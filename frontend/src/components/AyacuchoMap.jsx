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
  const [locatingUser, setLocatingUser] = useState(false);

  // Inicializar Leaflet con capa CartoDB Voyager / Positron de alta definición
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

    // Capa base limpia y elegante de CartoDB Voyager
    const streetsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    setTileLayerInstance(streetsLayer);

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

  // Alternar entre capa vectorial de calles y satélite
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

  // Actualizar marcadores minimalistas de alta precisión (Estilo Airbnb / Apple Maps)
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
          ${p.image ? `
            <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; position: relative; background: #F7F6F3;">
              <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" />
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
              style="flex: 1; text-decoration: none; background: #FBFBFA; color: #111111; border: 1px solid #EAEAEA; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; text-align: center; display: block;"
            >
              Google Maps
            </a>
            <a 
              href="https://waze.com/ul?ll=${coords[0]},${coords[1]}&navigate=yes" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="flex: 1; text-decoration: none; background: #FBFBFA; color: #111111; border: 1px solid #EAEAEA; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; text-align: center; display: block;"
            >
              Waze
            </a>
          </div>

          <button 
            id="btn-select-${p.id}"
            style="width: 100%; background: #111111; color: #ffffff; border: none; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
          >
            <span>Ver Plano 2D & Reservar</span>
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
    <div className="relative isolate z-0 w-full h-[420px] sm:h-[480px] bg-[#FBFBFA] overflow-hidden rounded-xl">
      
      {/* Contenedor del Mapa Leaflet Scoped */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-0" 
      />

      {/* Controles Flotantes Superiores con z-10 dentro del contexto aislado */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        
        {/* Indicador de Cobertura */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] shadow-xs flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#346538] animate-radar" />
          <span className="text-xs font-mono text-[#111111] font-medium">
            Huamanga • {parkings.length} cocheras activas
          </span>
        </div>

        {/* Segmented Layer Toggle & GPS */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-[#E5E5E5] shadow-xs">
          
          <div className="flex items-center">
            <button
              onClick={() => toggleMapLayer('streets')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                mapLayer === 'streets'
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'text-[#787774] hover:text-[#111111]'
              }`}
            >
              Calles
            </button>
            <button
              onClick={() => toggleMapLayer('satellite')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                mapLayer === 'satellite'
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'text-[#787774] hover:text-[#111111]'
              }`}
            >
              Satélite
            </button>
          </div>

          <div className="w-[1px] h-4 bg-[#E5E5E5]" />

          {/* Centrar Plaza Mayor */}
          <button
            onClick={handleRecenterAyacucho}
            title="Centrar en Plaza Mayor"
            className="p-1 text-[#787774] hover:text-[#111111] transition-colors duration-200 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Mi GPS */}
          <button
            onClick={handleGetLocation}
            title="Mi Ubicación GPS"
            className="p-1 text-[#787774] hover:text-[#111111] transition-colors duration-200 cursor-pointer"
          >
            <LocateFixed className={`w-4 h-4 ${locatingUser ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>

    </div>
  );
};
