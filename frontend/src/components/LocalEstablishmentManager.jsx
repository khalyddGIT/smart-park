import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../services/api';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Grid, 
  MapPin, 
  Clock, 
  Car, 
  Camera,
  Check, 
  Search, 
  ArrowLeft,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  Share2,
  ExternalLink,
  LocateFixed,
  Save,
  ChevronRight,
  Navigation,
  Moon,
  Sun,
  DollarSign,
  ShieldCheck,
  Bike,
  Truck,
  Store,
  Layers,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Timer,
  CreditCard,
  BellRing,
  Sliders
} from 'lucide-react';
import { InteractiveFloorPlanDrawingStudio } from './InteractiveFloorPlanDrawingStudio';
import { useEstablishments, isMyEstablishment, getEstablishmentHierarchy } from '../context/EstablishmentContext';
import { useAuth } from '../context/AuthContext';

// Imagen de respaldo SVG ultra confiable para cuando la red no tenga acceso a Unsplash
export const FALLBACK_PARKING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' width='800' height='500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='210' r='85' fill='%2310b981' fill-opacity='0.15'/%3E%3Cpath d='M345 250 L455 250 L430 175 L370 175 Z' fill='%2310b981' fill-opacity='0.6'/%3E%3Crect x='330' y='250' width='140' height='40' rx='10' fill='%2310b981'/%3E%3Ccircle cx='365' cy='290' r='14' fill='%230f172a'/%3E%3Ccircle cx='435' cy='290' r='14' fill='%230f172a'/%3E%3Ctext x='400' y='370' font-family='system-ui, sans-serif' font-size='22' font-weight='bold' fill='%23f8fafc' text-anchor='middle'%3ESmart Park Huamanga%3C/text%3E%3Ctext x='400' y='402' font-family='system-ui, sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle'%3EEstacionamiento Seguro y Conectado%3C/text%3E%3C/svg%3E";

// Fotos predeterminadas para cocheras
const PRESET_IMAGES = [
  { label: 'Cochera Moderna Centro', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80' },
  { label: 'Estacionamiento Subterráneo', url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80' },
  { label: 'Playa Abierta Asfaltada', url: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80' },
  { label: 'Terminal / Zona Amplia', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80' },
  { label: 'Garita & Barrera Automatizada', url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Edificio de Estacionamiento', url: 'https://images.unsplash.com/photo-1520105072000-f44fc083e508?auto=format&fit=crop&w=800&q=80' }
];

// Puntos de referencia y coordenadas de Huamanga / Ayacucho
const AYACUCHO_PRESET_LOCATIONS = [
  { name: 'Plaza Mayor de Huamanga', lat: -13.1604, lng: -74.2259, address: 'Portal Unión 42' },
  { name: 'Jr. 28 de Julio (Centro)', lat: -13.1618, lng: -74.2245, address: 'Jr. 28 de Julio 320' },
  { name: 'Mercado Mariscal Cáceres', lat: -13.1565, lng: -74.2215, address: 'Av. Mariscal Cáceres 450' },
  { name: 'Terminal Terrestre Libertadores', lat: -13.1718, lng: -74.2210, address: 'Av. Pérez de Cuéllar s/n' },
  { name: 'Jr. Bellido / San Blas', lat: -13.1630, lng: -74.2270, address: 'Jr. Bellido 240' },
  { name: 'San Juan Bautista (Av. Cusco)', lat: -13.1675, lng: -74.2180, address: 'Av. Cusco 180' }
];

// Mini-mapa interactivo y selector de coordenadas en Ayacucho
const LocationPickerMap = ({ latitude, longitude, onChangeCoords, onSelectAddress }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const layerGroupRef = useRef(null);
  const isInternalUpdateRef = useRef(false);
  const isDraggingMarkerRef = useRef(false);

  // Mantener callbacks en refs para evitar regeneración y stale closures en eventos de Leaflet
  const onChangeCoordsRef = useRef(onChangeCoords);
  onChangeCoordsRef.current = onChangeCoords;
  const onSelectAddressRef = useRef(onSelectAddress);
  onSelectAddressRef.current = onSelectAddress;

  const [mapLayer, setMapLayer] = useState('streets'); // 'streets' | 'satellite'
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [liveCoords, setLiveCoords] = useState({
    lat: Number(latitude) || -13.1604,
    lng: Number(longitude) || -74.2259
  });

  // 1. Efecto de montaje inicial ÚNICO: crea el mapa Leaflet una sola vez
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    const initialLat = Number(latitude) || -13.1604;
    const initialLng = Number(longitude) || -74.2259;

    // Crear mapa Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false // Evita conflictos entre doble clic y clic para ubicar marcador
    });

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || atob('cGsuZXlKMUlqb2lhMmhoYkhsa1pDSXNJbUVpT2lKamJYUm5kMkk0Y21Zd01EbHNNbmh4TlhKcmJ6Qm9PREkzSW4wLjI5dUl0MGZJR2lnYmN6WlpPWmlGMFE=');
    
    // Capa Calles (Mapbox Streets v12)
    const streetLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      maxNativeZoom: 20,
      attribution: '&copy; Mapbox &copy; OpenStreetMap'
    });

    // Capa Satélite (Mapbox Satellite Streets)
    const satLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      maxNativeZoom: 20,
      attribution: '&copy; Mapbox'
    });

    streetLayer.addTo(map);
    layerGroupRef.current = { streetLayer, satLayer };

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="position: relative; width: 34px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: grab; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35)); user-select: none;">
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.2 14.5 40.5 16.1 41.9C16.6 42.3 17.4 42.3 17.9 41.9C19.5 40.5 34 27.2 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0F172A"/>
            <circle cx="17" cy="17" r="13" fill="#10B981" fill-opacity="0.25"/>
            <circle cx="17" cy="17" r="9" fill="#10B981"/>
            <circle cx="17" cy="17" r="4" fill="#FFFFFF"/>
          </svg>
          <div style="width: 14px; height: 4px; background: rgba(15,23,42,0.3); border-radius: 50%; filter: blur(1.5px); margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [34, 44],
      iconAnchor: [17, 42]
    });

    const marker = L.marker([initialLat, initialLng], { 
      icon: customIcon, 
      draggable: true,
      autoPan: true 
    }).addTo(map);

    // Eventos del marcador
    marker.on('dragstart', () => {
      isDraggingMarkerRef.current = true;
    });

    marker.on('drag', (e) => {
      const pos = e.target.getLatLng();
      setLiveCoords({ lat: pos.lat, lng: pos.lng });
    });

    marker.on('dragend', (e) => {
      const newPos = e.target.getLatLng();
      const fixedLat = Number(newPos.lat.toFixed(6));
      const fixedLng = Number(newPos.lng.toFixed(6));
      setLiveCoords({ lat: fixedLat, lng: fixedLng });
      
      // Notificar al componente padre marcando que fue actualización interna
      isInternalUpdateRef.current = true;
      onChangeCoordsRef.current?.(fixedLat, fixedLng);

      setTimeout(() => {
        isDraggingMarkerRef.current = false;
      }, 100);
    });

    // Clic en cualquier punto del mapa para mover el marcador
    map.on('click', (e) => {
      if (isDraggingMarkerRef.current) return;
      const { lat: clickLat, lng: clickLng } = e.latlng;
      const fixedLat = Number(clickLat.toFixed(6));
      const fixedLng = Number(clickLng.toFixed(6));

      marker.setLatLng([fixedLat, fixedLng]);
      setLiveCoords({ lat: fixedLat, lng: fixedLng });

      isInternalUpdateRef.current = true;
      onChangeCoordsRef.current?.(fixedLat, fixedLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Observador para re-calcular tamaño si el contenedor o tab cambia
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 450);

    // Limpieza únicamente cuando el componente realmente se desmonta
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []); // Montaje único: NUNCA destruir el mapa por cambios de coordenadas

  // 2. Efecto para sincronizar cambios externos (presets, GPS actual, URL pegada o inputs numéricos)
  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    setLiveCoords({ lat, lng });

    // Si el cambio vino del propio mapa (arrastre o clic), no forzar movimiento de cámara
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    if (mapRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.6 });
    }
  }, [latitude, longitude]);

  // Cambiar capa Calles / Satélite
  const handleToggleLayer = (layerType) => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const { streetLayer, satLayer } = layerGroupRef.current;
    if (layerType === 'satellite') {
      if (mapRef.current.hasLayer(streetLayer)) mapRef.current.removeLayer(streetLayer);
      if (!mapRef.current.hasLayer(satLayer)) satLayer.addTo(mapRef.current);
    } else {
      if (mapRef.current.hasLayer(satLayer)) mapRef.current.removeLayer(satLayer);
      if (!mapRef.current.hasLayer(streetLayer)) streetLayer.addTo(mapRef.current);
    }
    setMapLayer(layerType);
  };

  // Recentrar vista en el marcador
  const handleRecenterMarker = () => {
    if (!mapRef.current || !markerRef.current) return;
    const pos = markerRef.current.getLatLng();
    mapRef.current.setView([pos.lat, pos.lng], 17, { animate: true });
  };

  // Centrar en Plaza Mayor de Huamanga
  const handleCenterHuamanga = () => {
    if (!mapRef.current) return;
    mapRef.current.setView([-13.1604, -74.2259], 16, { animate: true });
  };

  // Buscar ubicación en Ayacucho
  const handleSearchLocation = (e) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    // Buscar en presets locales primero
    const foundPreset = AYACUCHO_PRESET_LOCATIONS.find(loc => 
      loc.name.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(mapSearchQuery.toLowerCase())
    );

    if (foundPreset) {
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([foundPreset.lat, foundPreset.lng], 17, { animate: true });
        markerRef.current.setLatLng([foundPreset.lat, foundPreset.lng]);
      }
      setLiveCoords({ lat: foundPreset.lat, lng: foundPreset.lng });
      isInternalUpdateRef.current = true;
      onChangeCoordsRef.current?.(foundPreset.lat, foundPreset.lng);
      if (onSelectAddressRef.current) onSelectAddressRef.current(foundPreset.address);
      return;
    }

    // Geocodificación OSM Nominatim para Ayacucho
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery + ', Huamanga, Ayacucho, Peru')}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const fixedLat = Number(lat.toFixed(6));
          const fixedLng = Number(lng.toFixed(6));
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([fixedLat, fixedLng], 17, { animate: true });
            markerRef.current.setLatLng([fixedLat, fixedLng]);
          }
          setLiveCoords({ lat: fixedLat, lng: fixedLng });
          isInternalUpdateRef.current = true;
          onChangeCoordsRef.current?.(fixedLat, fixedLng);
          if (onSelectAddressRef.current && data[0].display_name) {
            const shortAddr = data[0].display_name.split(',').slice(0, 2).join(',');
            onSelectAddressRef.current(shortAddr);
          }
        }
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-2.5">
      {/* Barra de Búsqueda sobre el Mapa y Controles de Navegación */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <form onSubmit={handleSearchLocation} className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar calle, jirón o lugar en Ayacucho (ej. Jr. Bellido, Mariscal Cáceres)..."
            value={mapSearchQuery}
            onChange={(e) => setMapSearchQuery(e.target.value)}
            className="pl-9 pr-20 h-9 text-xs bg-white border-slate-200 rounded-xl w-full"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Botón Recentrar en Marcador */}
          <button
            type="button"
            onClick={handleRecenterMarker}
            title="Recentrar vista en el marcador actual"
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition shadow-2xs"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">Ver Marcador</span>
          </button>

          {/* Botón Centro Huamanga */}
          <button
            type="button"
            onClick={handleCenterHuamanga}
            title="Ir al Centro Histórico de Huamanga"
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden md:inline">Centro Huamanga</span>
          </button>

          {/* Selector de Capas Calles / Satélite */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => handleToggleLayer('streets')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                mapLayer === 'streets' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Calles
            </button>
            <button
              type="button"
              onClick={() => handleToggleLayer('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                mapLayer === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Satélite
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-xs z-0 relative"
      />

      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Haz clic en cualquier calle o arrastra el marcador para fijar la cochera.</span>
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 shrink-0">
          {Number(liveCoords.lat).toFixed(5)}, {Number(liveCoords.lng).toFixed(5)}
        </span>
      </div>
    </div>
  );
};

export const LocalEstablishmentManager = ({ masterElements, onMasterSavePlan }) => {
  const { role, user } = useAuth();
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    updateEstablishmentPlan, 
    ensureFloorPlan,
    deleteEstablishment 
  } = useEstablishments();

  const [search, setSearch] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('list'); // 'list' | 'viewer_2d' | 'editor_cad' | 'edit_form'
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [currentPlanElements, setCurrentPlanElements] = useState([]);
  const [cameraDetecting, setCameraDetecting] = useState(false);
  
  // Tab activa dentro de la vista de edición completa (5 secciones organizadas)
  const [activeTabSection, setActiveTabSection] = useState('identity'); // 'identity' | 'pricing' | 'policies' | 'location' | 'media_contact'
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    reference: '',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    rate_auto: 5.00,
    rate_suv: 7.00,
    rate_mototaxi: 3.50,
    rate_moto: 2.50,
    billing_unit: 'hour',
    rate_minute_auto: 0.08,
    rate_minute_suv: 0.12,
    rate_minute_mototaxi: 0.06,
    rate_minute_moto: 0.04,
    min_stay_minutes: 15,
    max_stay_minutes: 1440,
    night_shift_enabled: false,
    night_shift_start: '20:00',
    night_shift_end: '06:00',
    night_shift_surcharge: 2.00,
    require_reservation_prepay: false,
    reservation_fee: 0.00,
    min_stay_hours: 1,
    max_stay_hours: 24,
    allow_open_stay: true,
    tolerance: 15,
    status: 'Operativo',
    owner: '',
    ruc: '',
    phone: '',
    whatsapp: '',
    email: '',
    schedule: 'Lunes a Domingo: 24 Horas',
    description: '',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    latitude: -13.1604,
    longitude: -74.2259,
    mapsUrl: '',
    socials: {
      facebook: '',
      instagram: '',
      tiktok: '',
      website: ''
    }
  });

  const [notification, setNotification] = useState(null);
  const [gpsLocating, setGpsLocating] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Parsear URLs de Google Maps o coordenadas
  const handleParseMapsUrl = (inputVal) => {
    setFormData(prev => ({ ...prev, mapsUrl: inputVal }));
    if (!inputVal) return;

    const atMatch = inputVal.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qMatch = inputVal.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const directMatch = inputVal.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);

    let foundLat = null;
    let foundLng = null;

    if (atMatch) {
      foundLat = parseFloat(atMatch[1]);
      foundLng = parseFloat(atMatch[2]);
    } else if (qMatch) {
      foundLat = parseFloat(qMatch[1]);
      foundLng = parseFloat(qMatch[2]);
    } else if (directMatch) {
      foundLat = parseFloat(directMatch[1]);
      foundLng = parseFloat(directMatch[2]);
    }

    if (foundLat && foundLng) {
      setFormData(prev => ({
        ...prev,
        latitude: foundLat,
        longitude: foundLng
      }));
      showToast(`Coordenadas extraídas: ${foundLat.toFixed(5)}, ${foundLng.toFixed(5)}`);
    }
  };

  // Obtener ubicación GPS actual
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`
        }));
        showToast('Ubicación GPS detectada con éxito');
      },
      () => {
        setGpsLocating(false);
        alert('No se pudo obtener la ubicación GPS.');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  // Carga y compresión optimizada de archivo de imagen (Canvas WebP/JPEG)
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar los 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result;
      if (!rawData) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG optimizado (calidad 85% - tamaño súper ligero ~100KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, image: compressedBase64 }));
        showToast('✓ Fotografía cargada y optimizada con éxito.');
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Permitir volver a seleccionar el mismo archivo
  };

  // Abrir vista para crear nueva sede / sucursal
  const handleOpenAdd = (localGroup = null) => {
    setIsEditingNew(true);
    setSelectedEstablishment(null);

    const companyName = localGroup ? (localGroup.companyName || localGroup.name) : (user?.establishmentName || '');
    const defaultOwner = localGroup?.owner || companyName || user?.name || 'Administración Local';
    const nextBranchNum = localGroup?.branches ? localGroup.branches.length + 1 : 1;
    const defaultName = localGroup 
      ? `${companyName} - Sucursal ${nextBranchNum}` 
      : (user?.establishmentName ? `${user.establishmentName} - Sede Central` : '');
    const defaultPhone = localGroup?.phone || user?.phone || '+51 966 123 456';
    const defaultEmail = user?.email || localGroup?.email || 'contacto@smartpark.pe';
    const defaultRuc = localGroup?.ruc || ('20' + Math.floor(100000000 + Math.random() * 900000000));
    const defaultAddress = localGroup?.address || 'Jr. 28 de Julio 320, Huamanga';
    const defaultCity = localGroup?.city || 'Ayacucho - Huamanga';

    setFormData({
      name: defaultName,
      company_name: companyName,
      companyName: companyName,
      admin_email: user?.email || '',
      address: defaultAddress,
      reference: 'Ingreso vehicular principal',
      city: defaultCity,
      level: 'Nivel 1 - Superficie',
      rate: 5.00,
      rate_auto: 5.00,
      rate_suv: 7.00,
      rate_mototaxi: 3.50,
      rate_moto: 2.50,
      billing_unit: 'hour',
      rate_minute_auto: 0.08,
      rate_minute_suv: 0.12,
      rate_minute_mototaxi: 0.06,
      rate_minute_moto: 0.04,
      min_stay_minutes: 15,
      max_stay_minutes: 1440,
      night_shift_enabled: false,
      night_shift_start: '20:00',
      night_shift_end: '06:00',
      night_shift_surcharge: 2.00,
      require_reservation_prepay: false,
      reservation_fee: 0.00,
      min_stay_hours: 1,
      max_stay_hours: 24,
      allow_open_stay: true,
      tolerance: 15,
      status: 'Operativo',
      owner: defaultOwner,
      ruc: defaultRuc,
      phone: defaultPhone,
      whatsapp: defaultPhone.replace(/\D/g, ''),
      email: defaultEmail,
      schedule: 'Lunes a Domingo: 24 Horas (Abierto 24/7)',
      description: `Sucursal y punto de atención de ${defaultOwner} con garita ANPR digital.`,
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
      latitude: -13.1604,
      longitude: -74.2259,
      mapsUrl: 'https://maps.google.com/?q=-13.1604,-74.2259',
      socials: {
        facebook: '',
        instagram: '',
        tiktok: '',
        website: ''
      }
    });
    setActiveTabSection('identity');
    setActiveViewMode('edit_form');
  };

  // Abrir vista para editar (permite acceder directamente a una pestaña, ej: 'policies' o 'pricing')
  const handleOpenEdit = (est, initialTab = 'identity') => {
    setIsEditingNew(false);
    setSelectedEstablishment(est);
    const initialRate = Number(est.rate_auto ?? est.rate ?? est.hourly_rate ?? 5.00);
    setFormData({
      name: est.name || '',
      address: est.address || '',
      reference: est.reference || '',
      city: est.city || 'Ayacucho - Huamanga',
      level: est.level || 'Nivel 1 - Superficie',
      rate: initialRate,
      rate_auto: initialRate,
      rate_suv: Number(est.rate_suv ?? 7.00),
      rate_mototaxi: Number(est.rate_mototaxi ?? 3.50),
      rate_moto: Number(est.rate_moto ?? 2.50),
      billing_unit: est.billing_unit || 'hour',
      rate_minute_auto: Number(est.rate_minute_auto ?? (initialRate / 60).toFixed(2)),
      rate_minute_suv: Number(est.rate_minute_suv ?? ((est.rate_suv ?? 7.00) / 60).toFixed(2)),
      rate_minute_mototaxi: Number(est.rate_minute_mototaxi ?? ((est.rate_mototaxi ?? 3.50) / 60).toFixed(2)),
      rate_minute_moto: Number(est.rate_minute_moto ?? ((est.rate_moto ?? 2.50) / 60).toFixed(2)),
      min_stay_minutes: Number(est.min_stay_minutes || 15),
      max_stay_minutes: Number(est.max_stay_minutes || 1440),
      night_shift_enabled: !!est.night_shift_enabled,
      night_shift_start: est.night_shift_start || '20:00',
      night_shift_end: est.night_shift_end || '06:00',
      night_shift_surcharge: Number(est.night_shift_surcharge || 0.0),
      require_reservation_prepay: !!est.require_reservation_prepay,
      reservation_fee: Number(est.reservation_fee || 0.0),
      min_stay_hours: Number(est.min_stay_hours || 1),
      max_stay_hours: Number(est.max_stay_hours || 24),
      allow_open_stay: est.allow_open_stay !== undefined ? !!est.allow_open_stay : true,
      tolerance: est.tolerance ?? est.tolerance_minutes ?? 15,
      status: est.status || 'Operativo',
      owner: est.owner || '',
      ruc: est.ruc || '',
      phone: est.phone || '',
      whatsapp: est.whatsapp || '',
      email: est.email || '',
      schedule: est.schedule || 'Lunes a Domingo: 24 Horas',
      description: est.description || '',
      image: est.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
      latitude: Number(est.latitude) || -13.1604,
      longitude: Number(est.longitude) || -74.2259,
      mapsUrl: est.mapsUrl || `https://maps.google.com/?q=${est.latitude || -13.1604},${est.longitude || -74.2259}`,
      socials: est.socials || { facebook: '', instagram: '', tiktok: '', website: '' }
    });
    setActiveTabSection(initialTab);
    setActiveViewMode('edit_form');
  };

  // Guardar formulario
  const handleSaveForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor ingresa el nombre de la sede.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditingNew) {
        const defaultNewElements = [
          { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
          { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
          { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
          { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
          { id: 5, type: 'road', x: 60, y: 280, w: 980, h: 120, rot: 0, label: 'CARRIL VIAL PRINCIPAL' },
          { id: 6, type: 'crosswalk', x: 520, y: 280, w: 80, h: 120, rot: 0 },
          { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'GARITA ANPR' },
          { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
          { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
          { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
          { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
          { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
          { id: 21, type: 'slot', code: 'B-02', slotType: 'moto', x: 165, y: 470, w: 50, h: 140, rot: 0, status: 'free' }
        ];

        const newEst = {
          id: `EST-${Math.floor(10 + Math.random() * 90)}`,
          name: formData.name,
          address: formData.address,
          reference: formData.reference,
          city: formData.city || 'Ayacucho - Huamanga',
          level: formData.level,
          rate: Number(formData.rate_auto || formData.rate || 5.00),
          rate_auto: Number(formData.rate_auto || formData.rate || 5.00),
          rate_suv: Number(formData.rate_suv) || 7.00,
          rate_mototaxi: Number(formData.rate_mototaxi) || 3.50,
          rate_moto: Number(formData.rate_moto) || 2.50,
          billing_unit: formData.billing_unit || 'hour',
          rate_minute_auto: Number(formData.rate_minute_auto) || Number(((formData.rate_auto || formData.rate || 5.00) / 60).toFixed(2)),
          rate_minute_suv: Number(formData.rate_minute_suv) || 0.12,
          rate_minute_mototaxi: Number(formData.rate_minute_mototaxi) || 0.06,
          rate_minute_moto: Number(formData.rate_minute_moto) || 0.04,
          min_stay_minutes: Number(formData.min_stay_minutes) || 15,
          max_stay_minutes: Number(formData.max_stay_minutes) || 1440,
          night_shift_enabled: !!formData.night_shift_enabled,
          night_shift_start: formData.night_shift_start || '20:00',
          night_shift_end: formData.night_shift_end || '06:00',
          night_shift_surcharge: Number(formData.night_shift_surcharge) || 0.0,
          require_reservation_prepay: !!formData.require_reservation_prepay,
          reservation_fee: Number(formData.reservation_fee) || 0.0,
          min_stay_hours: Number(formData.min_stay_hours) || 1,
          max_stay_hours: Number(formData.max_stay_hours) || 24,
          allow_open_stay: formData.allow_open_stay !== undefined ? !!formData.allow_open_stay : true,
          tolerance: Math.max(5, Math.min(60, Number(formData.tolerance) || 15)),
          totalSlots: 6,
          status: formData.status,
          owner: formData.owner || 'Administración Local',
          ruc: formData.ruc,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          schedule: formData.schedule,
          description: formData.description,
          image: formData.image,
          latitude: Number(formData.latitude) || -13.1604,
          longitude: Number(formData.longitude) || -74.2259,
          mapsUrl: formData.mapsUrl || `https://maps.google.com/?q=${formData.latitude},${formData.longitude}`,
          socials: formData.socials,
          commission: '12%',
          elements: defaultNewElements
        };

        await addEstablishment(newEst);
        showToast(`✓ Sede "${newEst.name}" registrada y sincronizada exitosamente.`);
      } else {
        if (!selectedEstablishment) return;

        const effectiveRate = Number(formData.rate_auto || formData.rate || 5.00);
        const updated = {
          name: formData.name,
          address: formData.address,
          reference: formData.reference,
          city: formData.city,
          level: formData.level,
          rate: effectiveRate,
          rate_auto: effectiveRate,
          rate_suv: Number(formData.rate_suv) || 7.00,
          rate_mototaxi: Number(formData.rate_mototaxi) || 3.50,
          rate_moto: Number(formData.rate_moto) || 2.50,
          billing_unit: formData.billing_unit || 'hour',
          rate_minute_auto: Number(formData.rate_minute_auto) || Number((effectiveRate / 60).toFixed(2)),
          rate_minute_suv: Number(formData.rate_minute_suv) || 0.12,
          rate_minute_mototaxi: Number(formData.rate_minute_mototaxi) || 0.06,
          rate_minute_moto: Number(formData.rate_minute_moto) || 0.04,
          min_stay_minutes: Number(formData.min_stay_minutes) || 15,
          max_stay_minutes: Number(formData.max_stay_minutes) || 1440,
          night_shift_enabled: !!formData.night_shift_enabled,
          night_shift_start: formData.night_shift_start || '20:00',
          night_shift_end: formData.night_shift_end || '06:00',
          night_shift_surcharge: Number(formData.night_shift_surcharge) || 0.0,
          require_reservation_prepay: !!formData.require_reservation_prepay,
          reservation_fee: Number(formData.reservation_fee) || 0.0,
          min_stay_hours: Number(formData.min_stay_hours) || 1,
          max_stay_hours: Number(formData.max_stay_hours) || 24,
          allow_open_stay: formData.allow_open_stay !== undefined ? !!formData.allow_open_stay : true,
          tolerance: Math.max(5, Math.min(60, Number(formData.tolerance) || 15)),
          status: formData.status,
          owner: formData.owner,
          ruc: formData.ruc,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          schedule: formData.schedule,
          description: formData.description,
          image: formData.image,
          latitude: Number(formData.latitude) || -13.1604,
          longitude: Number(formData.longitude) || -74.2259,
          mapsUrl: formData.mapsUrl,
          socials: formData.socials
        };

        await updateEstablishment(selectedEstablishment.id, updated);
        setSelectedEstablishment(prev => ({ ...prev, ...updated }));
        showToast(`✓ Datos de "${formData.name}" guardados y sincronizados correctamente.`);
      }

      setActiveViewMode('list');
    } catch (err) {
      console.error('Error al guardar sede:', err);
      showToast(err?.message || 'Ocurrió un error al guardar la sede en el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar establecimiento
  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro de "${name}"?`)) return;
    deleteEstablishment(id);
    showToast(`Sede "${name}" eliminada.`);
  };

  // Cuando el plano hidrata desde el servidor (elements pasa de null a array), reflejarlo en visualizador y editor
  useEffect(() => {
    if (!selectedEstablishment || (activeViewMode !== 'viewer_2d' && activeViewMode !== 'editor_cad')) return;
    const fresh = establishments.find(e => String(e.id) === String(selectedEstablishment.id));
    if (fresh && Array.isArray(fresh.elements)) {
      setCurrentPlanElements(fresh.elements);
    }
  }, [establishments, selectedEstablishment, activeViewMode]);

  // Abrir plano
  const handleOpenPlan = (est, mode) => {
    setSelectedEstablishment(est);
    setCurrentPlanElements(est.elements || []);
    // Red de seguridad: si el plano aún no llegó del servidor, hidratarlo ahora
    if (est.elements === null) ensureFloorPlan(est.id);
    setActiveViewMode(mode);
  };

  // Detección de ocupación por cámara (YOLO + OpenCV) — actualiza cajones en el servidor
  const handleCameraDetect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEstablishment) return;
    const numId = Number(selectedEstablishment.id);
    if (isNaN(numId)) {
      showToast('La detección por cámara solo funciona en sedes reales (no demo EST-*).');
      return;
    }
    setCameraDetecting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/parkings/${numId}/camera/detect`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(`✓ Detección por cajón: ${res.data.updated} cajones actualizados de ${res.data.total}.`);
      ensureFloorPlan(String(numId));
      setTimeout(() => {
        const fresh = establishments.find(x => String(x.id) === String(numId));
        if (fresh?.elements) setCurrentPlanElements(fresh.elements);
      }, 900);
    } catch (err) {
      const detail = err?.response?.data?.detail || 'No se pudo procesar la imagen.';
      showToast(`✕ ${detail}`);
    } finally {
      setCameraDetecting(false);
      e.target.value = '';
    }
  };

  const handleCountCars = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEstablishment) return;
    const numId = Number(selectedEstablishment.id);
    if (isNaN(numId)) {
      showToast('Solo sedes reales.');
      return;
    }
    setCameraDetecting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/parkings/${numId}/camera/count`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(`✓ Autos detectados en playón: ${res.data.count} vehículos.`);
    } catch (err) {
      showToast(`✕ ${err?.response?.data?.detail || 'No se pudo contar autos.'}`);
    } finally {
      setCameraDetecting(false);
      e.target.value = '';
    }
  };

  // Guardar plano CAD
  const handleSaveCADPlan = async (updatedElements) => {
    if (!selectedEstablishment) return;

    try {
      await updateEstablishmentPlan(selectedEstablishment.id, updatedElements);

      if (onMasterSavePlan && selectedEstablishment.id === 'EST-01') {
        onMasterSavePlan(updatedElements);
      }

      setCurrentPlanElements(updatedElements);
      showToast(`✓ Plano de "${selectedEstablishment.name}" guardado exitosamente.`);
      setActiveViewMode('list');
    } catch (err) {
      showToast(`✕ Error al guardar el plano: ${err?.message || 'Reintente'}`);
    }
  };

  // 1. Filtrar los establecimientos que le pertenecen exclusivamente al admin local autenticado
  const myFilteredEstablishments = useMemo(() => {
    return establishments.filter(est => isMyEstablishment(est, user, role));
  }, [establishments, user, role]);

  // 2. Aplicar filtro de búsqueda sobre las sedes autorizadas
  const filteredEstablishments = useMemo(() => {
    if (!search.trim()) return myFilteredEstablishments;
    const q = search.toLowerCase();
    return myFilteredEstablishments.filter(est => 
      est.name.toLowerCase().includes(q) ||
      est.address.toLowerCase().includes(q) ||
      (est.level && est.level.toLowerCase().includes(q)) ||
      (est.owner && est.owner.toLowerCase().includes(q)) ||
      (est.city && est.city.toLowerCase().includes(q))
    );
  }, [myFilteredEstablishments, search]);

  // 3. Agrupación por Establecimiento / Local Principal -> Sucursales
  const establishmentGroups = useMemo(() => {
    const groups = new Map();

    filteredEstablishments.forEach((est) => {
      const hierarchy = getEstablishmentHierarchy(est);
      const companyName = hierarchy.companyName;
      const branchName = hierarchy.branchName;
      const groupKey = companyName.toLowerCase().trim();

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: companyName,
          companyName: companyName,
          owner: est.owner || companyName,
          ruc: est.ruc || '',
          phone: est.phone || '',
          whatsapp: est.whatsapp || '',
          email: est.email || '',
          city: est.city || 'Ayacucho - Huamanga',
          address: est.address || '',
          branches: [],
          totalSlots: 0,
          freeSlots: 0
        });
      }

      const g = groups.get(groupKey);
      g.branches.push({ ...est, branchDisplayName: branchName });

      const elements = est.elements || [];
      const total = elements.filter(e => e.type === 'slot').length || est.totalSlots || 0;
      const free = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      g.totalSlots += total;
      g.freeSlots += free;
      if (!g.phone && est.phone) g.phone = est.phone;
      if (!g.ruc && est.ruc) g.ruc = est.ruc;
      if (!g.email && est.email) g.email = est.email;
      if (!g.address && est.address) g.address = est.address;
    });

    return Array.from(groups.values());
  }, [filteredEstablishments]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          VISTA 1: LISTADO PRINCIPAL CRUD (LOCALES Y SUCURSALES)
          ========================================================================= */}
      {activeViewMode === 'list' && (
        <div className="space-y-6">
          {/* Header - mejorado responsive y jerarquía */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5 leading-tight">
                <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                  <Building2 className="w-5 h-5 shrink-0" />
                </span>
                <span className="truncate">Gestión de Sedes</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
                {role === 'local'
                  ? 'Sedes, planos y tarifas en tiempo real.'
                  : 'Supervisión de empresas y sedes conectadas.'}
              </p>
            </div>
            <Button
              onClick={() => handleOpenAdd(null)}
              className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nueva Sede</span>
            </Button>
          </div>

          {/* Barra de Búsqueda & Métricas */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none z-10 shrink-0" strokeWidth={2.2} />
              <Input
                type="text"
                placeholder="Buscar sede, dirección o ciudad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200 bg-white rounded-xl text-xs focus-visible:ring-emerald-500 w-full"
              />
            </div>
            <div className="bg-white px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 shadow-2xs flex items-center justify-center gap-2 shrink-0">
              <span className="text-slate-400">Locales:</span>
              <span className="font-mono font-bold text-slate-900">{establishmentGroups.length}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Sucursales:</span>
              <span className="font-mono font-bold text-emerald-700">{filteredEstablishments.length}</span>
            </div>
          </div>

          {/* ESTADO VACÍO */}
          {establishmentGroups.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  {search ? 'No se encontraron sucursales' : 'No tienes sedes ni sucursales registradas'}
                </h3>
                <p className="text-xs text-slate-500">
                  {search
                    ? `No hay coincidencias para "${search}". Intenta con otro término.`
                    : 'Registra tu primer establecimiento y sucursal para activar el plano interactivo CAD, garita ANPR y reservas.'}
                </p>
              </div>
              {!search && (
                <Button
                  onClick={() => handleOpenAdd(null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 rounded-xl h-10 px-6 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Mi Primer Establecimiento</span>
                </Button>
              )}
            </div>
          )}

          {/* LISTADO AGRUPADO: LOCAL / ESTABLECIMIENTO -> SUS SUCURSALES */}
          {establishmentGroups.map((group) => (
            <div key={group.key} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5 sm:p-6 transition">
              {/* CABECERA DEL ESTABLECIMIENTO / LOCAL */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-slate-900 text-emerald-400 shrink-0 shadow-sm">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Local Principal
                      </span>
                      {group.ruc && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          RUC: {group.ruc}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                      {group.name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {group.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{group.address}</span>
                        </span>
                      )}
                      {group.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{group.phone}</span>
                        </span>
                      )}
                      {group.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{group.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Métricas consolidadas del Local + Botón para agregar sucursal a este local */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-xs">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sucursales</div>
                      <div className="font-black text-slate-900 font-mono text-sm leading-none">{group.branches.length}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacidad Total</div>
                      <div className="font-bold text-emerald-700 font-mono text-xs leading-none">
                        {group.freeSlots} libres / {group.totalSlots}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleOpenAdd(group)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-md shadow-emerald-600/20 rounded-xl h-10 px-4 shrink-0 cursor-pointer"
                    title={`Nueva sucursal para ${group.name}`}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Nueva Sucursal</span>
                  </Button>
                </div>
              </div>

              {/* SECCIÓN SUCURSALES DE ESTE LOCAL */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Sucursales ({group.branches.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Plano CAD y garita independiente
                  </span>
                </div>

                {/* Grid de Sucursales de este Local */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(group.branches || []).map((est) => {
                    const elements = est.elements || [];
                    const totalSlots = elements.filter(e => e.type === 'slot').length || est.totalSlots || 0;
                    const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;

                    return (
                      <div key={est.id} className="border border-slate-200/90 shadow-2xs hover:shadow-md transition overflow-hidden rounded-2xl bg-white flex flex-col justify-between group">
                        <div>
                          {/* Imagen de la Sucursal */}
                          <div className="h-40 relative bg-slate-100 overflow-hidden">
                            <img 
                              src={est.image || FALLBACK_PARKING_IMAGE} 
                              alt={est.name} 
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                              }}
                            />
                            <div className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-md text-emerald-400 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border border-emerald-500/30">
                              S/ {Number(est.rate).toFixed(2)}/h
                            </div>
                            {est.level && (
                              <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md text-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-200">
                                {est.level}
                              </div>
                            )}
                          </div>

                          {/* Datos Principales */}
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                  {est.branchDisplayName || est.name}
                                </h4>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${est.status === 'Operativo' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                  {est.status || 'Operativo'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span className="truncate">{est.address} {est.reference ? `(${est.reference})` : ''}</span>
                              </p>
                            </div>

                            {/* Capacidad */}
                            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="font-medium">Ocupación:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {freeSlots} libres / {totalSlots} plazas
                              </span>
                            </div>

                            {/* Coordenadas & Enlace de Mapa */}
                            <div className="flex items-center justify-between gap-2 text-xs p-2 rounded-xl border border-slate-100 bg-slate-50 font-mono">
                              <span className="flex items-center gap-1.5 truncate text-slate-600 text-[11px]">
                                <Navigation className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{est.latitude ? `${Number(est.latitude).toFixed(4)}, ${Number(est.longitude).toFixed(4)}` : 'Sin GPS'}</span>
                              </span>
                              {est.latitude && (
                                <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${est.latitude},${est.longitude}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-200 transition text-[11px]"
                                >
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              )}
                            </div>
                            {/* Resumen Táctico de Reglas en Vigor */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-medium text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 text-slate-700 font-bold">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Tol: {est.tolerance || est.tolerance_minutes || 15}m</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 ${
                                est.require_reservation_prepay 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {est.require_reservation_prepay ? (
                                  <>
                                    <CreditCard className="w-3 h-3 shrink-0 text-blue-600" />
                                    <span>Prepago</span>
                                  </>
                                ) : (
                                  <>
                                    <Building2 className="w-3 h-3 shrink-0 text-emerald-600" />
                                    <span>Pospago</span>
                                  </>
                                )}
                              </span>
                              {est.night_shift_enabled && (
                                <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-0.5 font-bold">
                                  <Moon className="w-2.5 h-2.5" /> +S/{Number(est.night_shift_surcharge || 0).toFixed(2)}
                                </span>
                              )}
                              {est.allow_open_stay !== false && (
                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 font-bold">
                                  Hora Libre
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Acciones de la Sucursal */}
                        <div className="p-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 bg-slate-50/40">
                          <Button
                            type="button"
                            onClick={() => handleOpenPlan(est, 'editor_cad')}
                            className="flex-1 h-8.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs cursor-pointer"
                          >
                            <Grid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Plano</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleOpenEdit(est, 'policies')}
                            variant="outline"
                            className="h-8.5 px-2.5 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 border-emerald-200 text-xs font-bold gap-1 rounded-xl cursor-pointer"
                            title="Configurar Reglas y Políticas de Estadía"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Reglas</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleOpenEdit(est, 'identity')}
                            variant="outline"
                            className="h-8.5 px-2.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold gap-1 rounded-xl cursor-pointer"
                            title="Editar información general de la sucursal"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Editar</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleDelete(est.id, est.name)}
                            variant="ghost"
                            className="h-8.5 w-8.5 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl shrink-0 flex items-center justify-center cursor-pointer transition-colors"
                            title="Eliminar Sucursal"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 2: VER PLANO 2D */}
      {activeViewMode === 'viewer_2d' && selectedEstablishment && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver al Padrón</span>
              </Button>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedEstablishment.name}</h2>
                <p className="text-xs text-slate-500">{selectedEstablishment.address} • {selectedEstablishment.level}</p>
              </div>
            </div>

            <Button
              onClick={() => setActiveViewMode('editor_cad')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs gap-1.5 shadow-sm rounded-xl"
            >
              <Grid className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Editar Plano</span>
            </Button>
          </div>

          <InteractiveFloorPlanDrawingStudio
            readOnly={true}
            initialElements={currentPlanElements}
            parkingName={selectedEstablishment.name}
          />
        </div>
      )}

      {/* VISTA 3: EDITAR PLANO CAD */}
      {activeViewMode === 'editor_cad' && selectedEstablishment && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver al Padrón</span>
              </Button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Editor de Plano — {selectedEstablishment.name}</h2>
                <p className="text-xs text-slate-500 font-medium">Diseña y distribuye espacios de esta sede.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Camera className="w-4 h-4 text-emerald-600" />
              Detección por Cámara
            </div>
            <input type="file" accept="image/*" id="camera-upload" className="hidden" onChange={handleCameraDetect} />
            <Button
              type="button"
              onClick={() => document.getElementById('camera-upload')?.click()}
              disabled={cameraDetecting}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {cameraDetecting ? 'Detectando...' : 'Subir foto del playón'}
            </Button>
            <span className="text-[11px] text-slate-500">Detección IA de vehículos para actualizar ocupación en el plano</span>
          </div>

          <InteractiveFloorPlanDrawingStudio
            readOnly={false}
            initialElements={currentPlanElements}
            parkingName={selectedEstablishment.name}
            onSavePlan={handleSaveCADPlan}
          />
        </div>
      )}

      {/* =========================================================================
          VISTA 4: FORMULARIO DE EDICIÓN COMPLETA (NO MODAL)
          ========================================================================= */}
      {activeViewMode === 'edit_form' && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Header Superior Sticky con Identificador y Estado */}
          <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                disabled={isSaving}
                className="font-bold text-xs gap-1.5 rounded-xl h-9 text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver</span>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-slate-900 truncate">
                    {isEditingNew ? 'Registrar Nueva Sede' : (formData.name || 'Editar Establecimiento')}
                  </h1>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    formData.status === 'Operativo'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : formData.status === 'Mantenimiento'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      formData.status === 'Operativo' ? 'bg-emerald-500' : formData.status === 'Mantenimiento' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    {formData.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Configura tarifas, políticas, geolocalización satelital y medios de contacto.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveViewMode('list')}
                disabled={isSaving}
                className="text-xs font-semibold rounded-xl h-9 px-3.5 border-slate-200 text-slate-700 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveForm}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 shrink-0" />
                    <span>{isEditingNew ? 'Registrar Sede' : 'Guardar Cambios'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Navegación por 5 Pestañas Especializadas */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTabSection('identity')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'identity'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>General & Identidad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('pricing')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'pricing'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Tarifas & Turno Noche</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('policies')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'policies'
                  ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-300 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Reglas de Estadía & Reserva</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md">
                Operación
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('location')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'location'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Ubicación & GPS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('media_contact')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'media_contact'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Fotografía & Contacto</span>
            </button>
          </div>

          {/* Formulario + Preview en Vivo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Columna Izquierda: Formulario Organizado */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* TAB 1: IDENTIDAD & GENERAL */}
              {activeTabSection === 'identity' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Identidad & Operación Comercial</h3>
                    <p className="text-xs text-slate-500 font-medium">Define el nombre de la sede, nivel arquitectónico, estado operativo y datos fiscales.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Nombre y Nivel */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Comercial de la Sede *</label>
                        <Input
                          required
                          placeholder="Ej. Smart Park Jr. Bellido - Planta Baja"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="text-xs h-9.5 bg-white border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Nivel / Estructura</label>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 h-9.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option>Nivel 1 - Superficie</option>
                          <option>Sótano -1</option>
                          <option>Sótano -2</option>
                          <option>Nivel 2 - Elevado</option>
                          <option>Playa Abierta</option>
                        </select>
                      </div>
                    </div>

                    {/* Estado de Operación: Tarjetas Visuales Semánticas */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">Estado Operativo de la Sede</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'Operativo' })}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                            formData.status === 'Operativo'
                              ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full shrink-0 ${formData.status === 'Operativo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">Operativo</p>
                            <p className="text-[10px] text-slate-500">Abierto al público y reservas activas</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'Mantenimiento' })}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                            formData.status === 'Mantenimiento'
                              ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full shrink-0 ${formData.status === 'Mantenimiento' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">Mantenimiento</p>
                            <p className="text-[10px] text-slate-500">Cajones en calibración o reparación</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'Cerrado' })}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                            formData.status === 'Cerrado'
                              ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full shrink-0 ${formData.status === 'Cerrado' ? 'bg-rose-500' : 'bg-slate-300'}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">Cerrado</p>
                            <p className="text-[10px] text-slate-500">Fuera de servicio temporal</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Titular y RUC */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Datos Fiscales y Titularidad
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Titular / Razón Social</label>
                          <Input
                            placeholder="Ej. Inversiones Huamanga S.A.C."
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                            className="text-xs h-9.5 bg-white border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">RUC o DNI del Titular</label>
                          <Input
                            placeholder="Ej. 20601234567"
                            value={formData.ruc}
                            onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                            className="text-xs font-mono h-9.5 bg-white border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Horario de Atención con Chips Rápidos */}
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-xs font-semibold text-slate-700">Horario de Atención</label>
                        <div className="flex items-center gap-1">
                          {['24/7 (24 Horas)', '06:00 AM - 10:00 PM', 'Lun a Sáb: 07:00 - 21:00'].map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setFormData({ ...formData, schedule: h })}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition cursor-pointer"
                            >
                              {h.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        placeholder="Ej. Lunes a Domingo: 24 Horas (Abierto 24/7)"
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                        className="text-xs h-9.5 bg-white border-slate-200"
                      />
                    </div>

                    {/* Indicaciones de Acceso */}
                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Indicaciones de Acceso para Conductores</label>
                      <textarea
                        rows={3}
                        placeholder="Describe accesos viales, garita ANPR, altura máxima permitida o puntos de entrada vehicular..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TARIFAS & TURNO NOCHE */}
              {activeTabSection === 'pricing' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Tarifas por Categoría & Turno Noche</h3>
                      <p className="text-xs text-slate-500 font-medium">Estructura de precios por hora y fracción por minuto con recargos nocturnos.</p>
                    </div>

                    {/* Selector de Modalidad */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billing_unit: 'hour' })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          formData.billing_unit !== 'minute' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por hora
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billing_unit: 'minute' })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          formData.billing_unit === 'minute' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por minuto
                      </button>
                    </div>
                  </div>

                  {/* Tarifa Base General y Presets */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800">
                        Tarifa Base Referencial por Hora (S/) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
                        {[3.00, 5.00, 8.00, 10.00].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                rate: val,
                                rate_auto: val,
                                rate_minute_auto: Number((val / 60).toFixed(2))
                              }));
                            }}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                              Number(formData.rate) === val 
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            S/ {val.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="max-w-xs">
                      <Input
                        type="number"
                        step="0.50"
                        min="1.00"
                        value={formData.rate}
                        onChange={(e) => {
                          const r = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            rate: r,
                            rate_auto: r,
                            rate_minute_auto: Number((r / 60).toFixed(2))
                          }));
                        }}
                        className="text-xs font-mono font-bold h-9 bg-white border-slate-200"
                      />
                    </div>
                  </div>

                  {/* 4 Tarjetas de Vehículos */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Tarifas por Categoría de Vehículo
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      
                      {/* Auto / Sedán */}
                      <div className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-2.5 ${formData.billing_unit === 'minute' ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                          <Car className="w-4 h-4 text-emerald-600" />
                          <span>Auto / Sedán</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por hora (S/)</span>
                            <Input
                              type="number"
                              step="0.50"
                              min="0.50"
                              value={formData.rate_auto}
                              onChange={(e) => {
                                const h = parseFloat(e.target.value) || 0;
                                setFormData(prev => ({
                                  ...prev,
                                  rate: h,
                                  rate_auto: h,
                                  rate_minute_auto: Number((h / 60).toFixed(2))
                                }));
                              }}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por minuto (S/)</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={formData.rate_minute_auto}
                              onChange={(e) => setFormData({ ...formData, rate_minute_auto: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Camioneta / SUV */}
                      <div className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-2.5 ${formData.billing_unit === 'minute' ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          <span>Camioneta / SUV</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por hora (S/)</span>
                            <Input
                              type="number"
                              step="0.50"
                              min="0.50"
                              value={formData.rate_suv}
                              onChange={(e) => {
                                const h = parseFloat(e.target.value) || 0;
                                setFormData({
                                  ...formData,
                                  rate_suv: h,
                                  rate_minute_suv: Number((h / 60).toFixed(2))
                                });
                              }}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por minuto (S/)</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={formData.rate_minute_suv}
                              onChange={(e) => setFormData({ ...formData, rate_minute_suv: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mototaxi / Torito */}
                      <div className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-2.5 ${formData.billing_unit === 'minute' ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                          <Car className="w-4 h-4 text-emerald-600" />
                          <span>Mototaxi / Torito</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por hora (S/)</span>
                            <Input
                              type="number"
                              step="0.50"
                              min="0.50"
                              value={formData.rate_mototaxi}
                              onChange={(e) => {
                                const h = parseFloat(e.target.value) || 0;
                                setFormData({
                                  ...formData,
                                  rate_mototaxi: h,
                                  rate_minute_mototaxi: Number((h / 60).toFixed(2))
                                });
                              }}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por minuto (S/)</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={formData.rate_minute_mototaxi}
                              onChange={(e) => setFormData({ ...formData, rate_minute_mototaxi: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Moto Lineal */}
                      <div className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-2.5 ${formData.billing_unit === 'minute' ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                          <Bike className="w-4 h-4 text-emerald-600" />
                          <span>Moto Lineal</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por hora (S/)</span>
                            <Input
                              type="number"
                              step="0.50"
                              min="0.50"
                              value={formData.rate_moto}
                              onChange={(e) => {
                                const h = parseFloat(e.target.value) || 0;
                                setFormData({
                                  ...formData,
                                  rate_moto: h,
                                  rate_minute_moto: Number((h / 60).toFixed(2))
                                });
                              }}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Por minuto (S/)</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={formData.rate_minute_moto}
                              onChange={(e) => setFormData({ ...formData, rate_minute_moto: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Configuración de Turno Noche */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Turno Noche Diferenciado</h4>
                          <p className="text-[11px] text-slate-500">Aplica un recargo por hora en horarios nocturnos de alta seguridad.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!formData.night_shift_enabled}
                          onChange={(e) => setFormData({ ...formData, night_shift_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-bold text-slate-700">
                          {formData.night_shift_enabled ? 'Habilitado' : 'Desactivado'}
                        </span>
                      </label>
                    </div>

                    {formData.night_shift_enabled ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Hora Inicio Nocturno</label>
                          <Input
                            type="time"
                            value={formData.night_shift_start || '20:00'}
                            onChange={(e) => setFormData({ ...formData, night_shift_start: e.target.value })}
                            className="h-8.5 text-xs font-mono font-bold bg-white border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Hora Fin Nocturno</label>
                          <Input
                            type="time"
                            value={formData.night_shift_end || '06:00'}
                            onChange={(e) => setFormData({ ...formData, night_shift_end: e.target.value })}
                            className="h-8.5 text-xs font-mono font-bold bg-white border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Recargo Nocturno (S/ por hora)</label>
                          <Input
                            type="number"
                            step="0.50"
                            min="0.00"
                            value={formData.night_shift_surcharge}
                            onChange={(e) => setFormData({ ...formData, night_shift_surcharge: parseFloat(e.target.value) || 0 })}
                            className="h-8.5 text-xs font-mono font-bold bg-white border-slate-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">Tarifa diurna regular aplicada uniformemente las 24 horas del día.</p>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 3: REGLAS DE ESTADÍA & RESERVA (FLUJO CRONOLÓGICO DE 4 FASES) */}
              {activeTabSection === 'policies' && (
                <div className="space-y-5">
                  {/* Banner Explicativo del Ciclo Operativo */}
                  <div className="p-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl shadow-xs border border-slate-700/60 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <ShieldCheck className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white tracking-tight">Flujo de Reglas de Estadía & Cobro Continuo</h3>
                          <p className="text-[11px] text-slate-300 font-normal">Ciclo cronológico de 4 etapas: desde la reserva inicial hasta el check-out en garita.</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-400/30">
                        Automatizado en Garita
                      </span>
                    </div>

                    {/* Timeline de 4 Fases Visual */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-medium bg-white/5 px-2 py-1 rounded-lg">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/30 border border-emerald-400 text-white font-mono text-[9px] flex items-center justify-center font-bold">1</span>
                        <span className="truncate">Llegada & Tolerancia</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium bg-white/5 px-2 py-1 rounded-lg">
                        <span className="w-4 h-4 rounded-full bg-white/20 border border-white/30 text-white font-mono text-[9px] flex items-center justify-center font-bold">2</span>
                        <span className="truncate">Modalidad Cobro</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-indigo-300 font-medium bg-white/5 px-2 py-1 rounded-lg">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400 text-white font-mono text-[9px] flex items-center justify-center font-bold">3</span>
                        <span className="truncate">Hora Libre / Rango</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-300 font-medium bg-white/5 px-2 py-1 rounded-lg">
                        <span className="w-4 h-4 rounded-full bg-rose-500/30 border border-rose-400 text-rose-200 font-mono text-[9px] flex items-center justify-center font-bold">4</span>
                        <span className="truncate">Overtime Sin Gracia</span>
                      </div>
                    </div>
                  </div>

                  {/* FASE 1: LLEGADA & TOLERANCIA ANTI-ABANDONO */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">
                          1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Fase 1: Llegada & Tolerancia Anti-Abandono</h4>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                              Ventana de Espera
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Tiempo que la plaza permanece bloqueada esperando que el conductor llegue a la garita.</p>
                        </div>
                      </div>
                      <Timer className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-4 items-center">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Minutos de Tolerancia</label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="5"
                            max="60"
                            step="5"
                            value={formData.tolerance}
                            onChange={(e) => {
                              const v = Math.max(5, Math.min(60, Number(e.target.value) || 15));
                              setFormData({ ...formData, tolerance: v });
                            }}
                            className="text-xs font-mono font-bold h-9.5 bg-white border-amber-300 pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">min</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-600 font-semibold block">Presets rápidos:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[10, 15, 20, 30].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setFormData({ ...formData, tolerance: v })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                                Number(formData.tolerance) === v 
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs ring-2 ring-amber-200' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                              }`}
                            >
                              <span>{v} min</span>
                              {v === 15 && <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-90 px-1 py-0.2 bg-white/20 rounded">Default</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Regla de Sabotaje & No-Show:</span>
                      </div>
                      <p className="leading-relaxed text-amber-800">
                        Si el conductor no se presenta dentro de los <strong className="font-mono">{formData.tolerance} minutos</strong> posteriores a la hora programada, el sistema <strong>cancela automáticamente la reserva</strong>, libera la plaza en el plano CAD y te devuelve la disponibilidad para nuevos clientes.
                      </p>
                    </div>
                  </div>

                  {/* FASE 2: MODALIDAD DE PAGO & COBRO DE RESERVA */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                          2
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Fase 2: Modalidad de Cobro & Fianza</h4>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                              Transacción
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Elige cómo y cuándo abona el conductor: físicamente en tu garita o de forma anticipada.</p>
                        </div>
                      </div>
                      <CreditCard className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, require_reservation_prepay: false })}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                          !formData.require_reservation_prepay
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span>Pospago en Garita</span>
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Recomendado</span>
                          </span>
                          {!formData.require_reservation_prepay && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          El conductor aparta su plaza y <strong>paga al salir en garita</strong> en efectivo, Yape, Plin o POS según su consumo exacto.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, require_reservation_prepay: true })}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                          formData.require_reservation_prepay
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span>Prepago Digital Obligatorio</span>
                          </span>
                          {formData.require_reservation_prepay && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          El conductor debe <strong>abonar el 100% estimado</strong> con tarjeta o billetera digital antes de emitir su Pase QR.
                        </p>
                      </button>
                    </div>

                    {/* Fianza de Reserva / Tasa de Apartado */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block">Fianza de Reserva / Tasa de Apartado (S/)</label>
                          <p className="text-[11px] text-slate-500">Monto deducible que el conductor deja al apartar plaza.</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {Number(formData.reservation_fee) > 0 ? `S/ ${Number(formData.reservation_fee).toFixed(2)} activo` : 'Desactivado (S/ 0.00)'}
                        </span>
                      </div>
                      <div className="max-w-xs flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">S/</span>
                          <Input
                            type="number"
                            step="0.50"
                            min="0.00"
                            value={formData.reservation_fee}
                            onChange={(e) => setFormData({ ...formData, reservation_fee: parseFloat(e.target.value) || 0 })}
                            className="h-9 text-xs font-mono font-bold bg-white border-slate-300 pl-8"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, reservation_fee: 0 })}
                          className="px-2.5 py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                        >
                          Cero
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FASE 3: FLEXIBILIDAD & RANGO DE ESTADÍA */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                          3
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Fase 3: Flexibilidad & Rango de Estadía</h4>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                              Tiempo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Controla si permites estadías abiertas sin hora de salida o exiges rangos fijos mín/máx.</p>
                        </div>
                      </div>
                      <Sliders className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    </div>

                    {/* Toggle Hora Libre */}
                    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900">Modalidad "Hora Libre" (Estadía Abierta)</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            formData.allow_open_stay !== false
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}>
                            {formData.allow_open_stay !== false ? 'Permitido' : 'Desactivado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          El conductor no necesita indicar hora de salida al reservar; el cobro se acumula en tiempo real hasta su retiro por garita.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.allow_open_stay !== false}
                          onChange={(e) => setFormData({ ...formData, allow_open_stay: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Límites de Tiempo */}
                    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-900">Límites Mínimo y Máximo de Estadía Programada</h5>
                        <span className="text-[10px] font-mono text-slate-500">
                          Unidad: {formData.billing_unit === 'minute' ? 'Minutos' : 'Horas'}
                        </span>
                      </div>

                      {formData.billing_unit === 'minute' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tiempo Mínimo (minutos)</label>
                            <Input
                              type="number"
                              min="5"
                              max="360"
                              step="5"
                              value={formData.min_stay_minutes}
                              onChange={(e) => setFormData({ ...formData, min_stay_minutes: parseInt(e.target.value) || 15 })}
                              className="h-9 text-xs font-mono font-bold bg-white border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Mínimo sugerido: 15 min</span>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tiempo Máximo (minutos)</label>
                            <Input
                              type="number"
                              min="15"
                              max="4320"
                              step="15"
                              value={formData.max_stay_minutes}
                              onChange={(e) => setFormData({ ...formData, max_stay_minutes: parseInt(e.target.value) || 1440 })}
                              className="h-9 text-xs font-mono font-bold bg-white border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Equivalente a {Math.round((formData.max_stay_minutes || 1440) / 60)} horas</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tiempo Mínimo (horas)</label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              value={formData.min_stay_hours}
                              onChange={(e) => setFormData({ ...formData, min_stay_hours: parseInt(e.target.value) || 1 })}
                              className="h-9 text-xs font-mono font-bold bg-white border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Estándar: 1 hora</span>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tiempo Máximo (horas)</label>
                            <Input
                              type="number"
                              min="1"
                              max="72"
                              value={formData.max_stay_hours}
                              onChange={(e) => setFormData({ ...formData, max_stay_hours: parseInt(e.target.value) || 24 })}
                              className="h-9 text-xs font-mono font-bold bg-white border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Máximo por estadía continua</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FASE 4: EXPIRACIÓN DE TIEMPO & COBRO CONTINUO (OVERTIME SIN GRACIA) */}
                  <div className="p-5 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 rounded-2xl border border-rose-200/80 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-rose-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 font-bold text-xs shrink-0">
                          4
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-rose-950 tracking-tight uppercase">Fase 4: Expiración & Cobro Continuo (Overtime)</h4>
                            <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                              0 Min de Gracia
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-800/80 mt-0.5">Política oficial Smart Park: aviso preventivo y recargo automático continuo al vencerse el tiempo.</p>
                        </div>
                      </div>
                      <BellRing className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Alerta Preventiva (T-15m)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          El sistema notifica al conductor <strong>15 minutos antes</strong> de que finalice su estadía para recordarle dirigirse a garita o solicitar ampliación.
                        </p>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                          <span>Cero Gracia (T+0m)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Apenas expira el horario reservado, <strong>no existe tiempo de gracia gratuito</strong>. El estado de la reserva pasa inmediatamente a <strong>Excedido</strong>.
                        </p>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span>Cobro Continuo Dinámico</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Cada minuto o fracción consumido en exceso se suma automáticamente a la tarifa final y <strong>se cobra en garita al momento del check-out</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-rose-200/60 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Protección garantizada contra pérdidas de ingresos por permanencia extendida.</span>
                      </span>
                      <span className="font-mono font-bold text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Tarifa base: S/ {Number(formData.rate || 5).toFixed(2)}/h + Overtime
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: UBICACIÓN & GPS */}
              {activeTabSection === 'location' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Ubicación Satelital & Coordenadas GPS</h3>
                    <p className="text-xs text-slate-500 font-medium">Ubica la sede con precisión para que los conductores la encuentren en Waze y Google Maps.</p>
                  </div>

                  {/* Dirección Exacta y Referencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Dirección Exacta *</label>
                      <Input
                        required
                        placeholder="Ej. Jr. Bellido 240, Huamanga"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="text-xs h-9.5 bg-white border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Referencia Urbana</label>
                      <Input
                        placeholder="Ej. Frente a la Iglesia San Blas"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        className="text-xs h-9.5 bg-white border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Extractor de Coordenadas Google Maps y GPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pegar enlace de Google Maps (Extrae latitud/longitud):</span>
                      </label>
                      <Input
                        placeholder="https://maps.google.com/?q=-13.1604,-74.2259"
                        value={formData.mapsUrl}
                        onChange={(e) => handleParseMapsUrl(e.target.value)}
                        className="text-xs bg-white h-9 border-slate-200"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        onClick={handleGetDeviceLocation}
                        disabled={gpsLocating}
                        variant="outline"
                        className="w-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl h-9 gap-1.5 border-slate-200 cursor-pointer"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 text-emerald-600 ${gpsLocating ? 'animate-spin' : ''}`} />
                        <span>{gpsLocating ? 'Detectando...' : 'Mi GPS Actual'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Zonas Rápidas de Ayacucho */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Puntos de referencia frecuentes en Ayacucho:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {AYACUCHO_PRESET_LOCATIONS.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              latitude: loc.lat,
                              longitude: loc.lng,
                              address: prev.address || loc.address,
                              mapsUrl: `https://maps.google.com/?q=${loc.lat},${loc.lng}`
                            }));
                            showToast(`Ubicación fijada en ${loc.name}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mini-mapa interactivo */}
                  <LocationPickerMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onSelectAddress={(addr) => {
                      if (!formData.address) setFormData(prev => ({ ...prev, address: addr }));
                    }}
                    onChangeCoords={(newLat, newLng) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: newLat,
                        longitude: newLng,
                        mapsUrl: `https://maps.google.com/?q=${newLat},${newLng}`
                      }));
                    }}
                  />

                  {/* Coordenadas Numéricas */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Latitud GPS</label>
                      <Input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            latitude: val === '' ? '' : (parseFloat(val) || val),
                            mapsUrl: `https://maps.google.com/?q=${val},${prev.longitude}`
                          }));
                        }}
                        className="text-xs font-mono font-semibold h-9 bg-white border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Longitud GPS</label>
                      <Input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            longitude: val === '' ? '' : (parseFloat(val) || val),
                            mapsUrl: `https://maps.google.com/?q=${prev.latitude},${val}`
                          }));
                        }}
                        className="text-xs font-mono font-semibold h-9 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FOTOGRAFÍA & CONTACTO */}
              {activeTabSection === 'media_contact' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Fotografía Oficial & Canales de Contacto</h3>
                    <p className="text-xs text-slate-500 font-medium">Imagen visible en la app del conductor y medios de comunicación directa.</p>
                  </div>

                  {/* Previsualización de Foto */}
                  <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                    <img 
                      src={formData.image || FALLBACK_PARKING_IMAGE} 
                      alt="Vista previa de la cochera" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                      }}
                    />
                  </div>

                  {/* Subir archivo local */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Subir foto desde tu dispositivo</p>
                        <p className="text-[11px] text-slate-500">Compresión automática ligera (JPG/PNG/WebP hasta 10MB)</p>
                      </div>
                    </div>
                    <div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl h-8.5 px-3.5 border-slate-200 cursor-pointer"
                      >
                        Examinar Foto...
                      </Button>
                    </div>
                  </div>

                  {/* URL Externa */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">O escribe la URL de la imagen:</label>
                    <Input
                      placeholder="https://ejemplo.com/foto-cochera.jpg"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="text-xs h-9 bg-white border-slate-200"
                    />
                  </div>

                  {/* Galería Sugerida */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Galería de fotos recomendadas para cocheras:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {PRESET_IMAGES.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, image: img.url });
                            showToast(`Foto "${img.label}" seleccionada.`);
                          }}
                          className={`group relative h-18 rounded-xl overflow-hidden border-2 transition cursor-pointer flex flex-col justify-end p-1.5 ${
                            formData.image === img.url ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200 hover:border-slate-300'
                          }`}
                          title={img.label}
                        >
                          <img 
                            src={img.url} 
                            alt={img.label} 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                          <span className="relative z-10 text-[9px] font-bold text-white truncate leading-tight">
                            {img.label}
                          </span>
                          {formData.image === img.url && (
                            <div className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medios de Contacto */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Canales de Comunicación
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp de Atención</label>
                        <div className="relative flex items-center">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 absolute left-3 pointer-events-none" />
                          <Input
                            placeholder="51966123456"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            className="pl-9 pr-14 text-xs font-mono h-9 bg-white border-slate-200"
                          />
                          {formData.whatsapp && (
                            <a
                              href={`https://wa.me/${formData.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute right-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer"
                            >
                              Probar
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono Garita / Central</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                          <Input
                            placeholder="+51 966 123 456"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="pl-9 text-xs font-mono h-9 bg-white border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico de Consultas</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="contacto@cocherahuamanga.pe"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-9 text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Redes Sociales */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Redes Sociales & Sitio Web
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600">Facebook</label>
                          {formData.socials?.facebook && (
                            <a href={formData.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                              <span>Abrir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <Input
                          placeholder="https://facebook.com/Cochera"
                          value={formData.socials?.facebook || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, facebook: e.target.value }
                          })}
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600">Instagram</label>
                          {formData.socials?.instagram && (
                            <a href={formData.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-[10px] text-pink-600 hover:underline flex items-center gap-0.5">
                              <span>Abrir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <Input
                          placeholder="https://instagram.com/cochera"
                          value={formData.socials?.instagram || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, instagram: e.target.value }
                          })}
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600">TikTok</label>
                          {formData.socials?.tiktok && (
                            <a href={formData.socials.tiktok} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-700 hover:underline flex items-center gap-0.5">
                              <span>Abrir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <Input
                          placeholder="https://tiktok.com/@cochera"
                          value={formData.socials?.tiktok || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, tiktok: e.target.value }
                          })}
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600">Sitio Web Oficial</label>
                          {formData.socials?.website && (
                            <a href={formData.socials.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5">
                              <span>Abrir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <Input
                          placeholder="https://smartpark.pe"
                          value={formData.socials?.website || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, website: e.target.value }
                          })}
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Barra Inferior de Acción */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveViewMode('list')}
                  disabled={isSaving}
                  className="text-xs rounded-xl h-9 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveForm}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5 h-9 shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 shrink-0" />
                      <span>{isEditingNew ? 'Registrar Sede' : 'Guardar Sede'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Vista Previa en Vivo Sincronizada */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-sm">
                <span>VISTA PREVIA EN VIVO</span>
                <span className="text-emerald-400 text-[11px] font-sans font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sincronizado
                </span>
              </div>

              {/* Tarjeta idéntica a la vista padrón */}
              <div className="border border-slate-200/90 shadow-2xs rounded-2xl bg-white flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="h-44 relative bg-slate-100 overflow-hidden">
                    <img 
                      src={formData.image || FALLBACK_PARKING_IMAGE} 
                      alt={formData.name || 'Preview'} 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                      }}
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs border ${
                        formData.status === 'Operativo'
                          ? 'bg-emerald-500/90 text-white border-emerald-400'
                          : formData.status === 'Mantenimiento'
                          ? 'bg-amber-500/90 text-white border-amber-400'
                          : 'bg-rose-500/90 text-white border-rose-400'
                      }`}>
                        {formData.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                          {formData.name || 'Nombre de la Sede'}
                        </h3>
                        <span className="font-mono font-bold text-emerald-700 text-xs shrink-0 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          S/ {Number(formData.rate || 5).toFixed(2)}/h
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> 
                        <span>{formData.address || 'Dirección en Huamanga'} {formData.reference ? `(${formData.reference})` : ''}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-medium">{formData.level}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {formData.billing_unit === 'minute' ? 'Cobro fraccionado min' : 'Cobro por hora'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50 font-mono">
                      <span className="flex items-center gap-1.5 truncate text-slate-600">
                        <Navigation className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}</span>
                      </span>
                      <span className="text-emerald-700 font-semibold text-[11px] bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        GPS OK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 pt-3">
                  <div className="w-full py-2 text-center font-bold text-xs bg-slate-900 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                    <span>Plano & Garita</span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Informativa de Reglas Activas (4 Fases) */}
              <div className="bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-800 space-y-3.5 text-xs shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Resumen de Reglas (4 Fases)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    En Vivo
                  </span>
                </div>

                <div className="space-y-2.5 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="font-bold text-amber-400">1.</span> Llegada:
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-right">
                      {formData.tolerance} min espera
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="font-bold text-emerald-400">2.</span> Cobro:
                    </span>
                    <span className="font-semibold text-slate-200 text-right">
                      {formData.require_reservation_prepay ? 'Prepago digital' : 'Pospago en garita'}
                      {Number(formData.reservation_fee) > 0 ? ` (Fianza S/ ${Number(formData.reservation_fee).toFixed(2)})` : ''}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="font-bold text-indigo-400">3.</span> Flexibilidad:
                    </span>
                    <span className="font-semibold text-slate-200 text-right">
                      {formData.allow_open_stay !== false ? 'Hora Libre permitida' : 'Solo fija'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="font-bold text-rose-400">4.</span> Overtime:
                    </span>
                    <span className="font-bold text-rose-300 text-right">
                      0m gracia · Cobro dinámico
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Turno Noche:</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {formData.night_shift_enabled ? `S/ +${Number(formData.night_shift_surcharge || 0).toFixed(2)}/h` : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};