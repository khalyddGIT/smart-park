import React, { useState, useEffect, useRef } from 'react';
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
  Navigation
} from 'lucide-react';
import { InteractiveFloorPlanDrawingStudio } from './InteractiveFloorPlanDrawingStudio';
import { useEstablishments } from '../context/EstablishmentContext';

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
  const [mapLayer, setMapLayer] = useState('streets'); // 'streets' | 'satellite'
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    const lat = Number(latitude) || -13.1604;
    const lng = Number(longitude) || -74.2259;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });

      const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });

      streetLayer.addTo(map);
      layerGroupRef.current = { streetLayer, satLayer };

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div style="position: relative; width: 34px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: grab; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));">
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

      const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(map);

      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        onChangeCoords(Number(newPos.lat.toFixed(6)), Number(newPos.lng.toFixed(6)));
      });

      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        onChangeCoords(Number(clickLat.toFixed(6)), Number(clickLng.toFixed(6)));
      });

      mapRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [latitude, longitude, onChangeCoords]);

  // Cambiar capa Calles / Satélite
  const handleToggleLayer = (layerType) => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const { streetLayer, satLayer } = layerGroupRef.current;
    if (layerType === 'satellite') {
      mapRef.current.removeLayer(streetLayer);
      satLayer.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(satLayer);
      streetLayer.addTo(mapRef.current);
    }
    setMapLayer(layerType);
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
      onChangeCoords(foundPreset.lat, foundPreset.lng);
      if (onSelectAddress) onSelectAddress(foundPreset.address);
      return;
    }

    // Geocodificación OSM Nominatim para Ayacucho
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery + ', Huamanga, Ayacucho, Peru')}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([lat, lng], 17, { animate: true });
            markerRef.current.setLatLng([lat, lng]);
          }
          onChangeCoords(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
          if (onSelectAddress && data[0].display_name) {
            const shortAddr = data[0].display_name.split(',').slice(0, 2).join(',');
            onSelectAddress(shortAddr);
          }
        }
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-2.5">
      {/* Barra de Búsqueda sobre el Mapa y Controles de Capa */}
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

        <div className="flex items-center gap-1.5 shrink-0">
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
        className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-xs z-0"
      />

      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Haz clic en cualquier calle o arrastra el marcador para fijar la cochera.</span>
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-700">
          {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </span>
      </div>
    </div>
  );
};

export const LocalEstablishmentManager = ({ masterElements, onMasterSavePlan }) => {
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
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [currentPlanElements, setCurrentPlanElements] = useState([]);
  const [cameraDetecting, setCameraDetecting] = useState(false);
  
  // Tab activa dentro de la vista de edición completa (Solo las 4 pedidas)
  const [activeTabSection, setActiveTabSection] = useState('general'); // 'general' | 'image' | 'location' | 'social'
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    reference: '',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
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
        showToast(`📍 Ubicación GPS detectada con éxito`);
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

  // Abrir vista para crear
  const handleOpenAdd = () => {
    setIsEditingNew(true);
    setSelectedEstablishment(null);
    setFormData({
      name: '',
      address: 'Jr. 28 de Julio 320, Huamanga',
      reference: 'A media cuadra de la Plaza Mayor',
      city: 'Ayacucho - Huamanga',
      level: 'Nivel 1 - Superficie',
      rate: 5.00,
      status: 'Operativo',
      owner: 'Administración Cochera Huamanga',
      ruc: '20' + Math.floor(100000000 + Math.random() * 900000000),
      phone: '+51 966 123 456',
      whatsapp: '51966123456',
      email: 'contacto@cocherahuamanga.pe',
      schedule: 'Lunes a Domingo: 24 Horas (Abierto 24/7)',
      description: 'Estacionamiento seguro con cámaras ANPR en zona céntrica de Huamanga.',
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
    setActiveTabSection('general');
    setActiveViewMode('edit_form');
  };

  // Abrir vista para editar
  const handleOpenEdit = (est) => {
    setIsEditingNew(false);
    setSelectedEstablishment(est);
    setFormData({
      name: est.name || '',
      address: est.address || '',
      reference: est.reference || '',
      city: est.city || 'Ayacucho - Huamanga',
      level: est.level || 'Nivel 1 - Superficie',
      rate: est.rate || 5.00,
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
    setActiveTabSection('general');
    setActiveViewMode('edit_form');
  };

  // Guardar formulario
  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor ingresa el nombre de la sede.');
      return;
    }

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
        rate: Number(formData.rate) || 5.00,
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

      addEstablishment(newEst);
      showToast(`✓ Sede "${newEst.name}" registrada exitosamente.`);
    } else {
      if (!selectedEstablishment) return;

      const updated = {
        name: formData.name,
        address: formData.address,
        reference: formData.reference,
        city: formData.city,
        level: formData.level,
        rate: Number(formData.rate) || 5.00,
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

      updateEstablishment(selectedEstablishment.id, updated);
      showToast(`✓ Datos y coordenadas de "${formData.name}" actualizados.`);
    }

    setActiveViewMode('list');
  };

  // Eliminar establecimiento
  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro de "${name}"?`)) return;
    deleteEstablishment(id);
    showToast(`Sede "${name}" eliminada.`);
  };

  // Cuando el plano hidrata desde el servidor (elements pasa de null a array), reflejarlo en la vista abierta
  useEffect(() => {
    if (!selectedEstablishment || activeViewMode === 'list') return;
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
      showToast(`✓ Detección completada: ${res.data.updated} cajones actualizados de ${res.data.total}.`);
      // Refrescar plano desde el servidor
      ensureFloorPlan(String(numId));
      // Forzar recarga del plano tras 800ms
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

  // Guardar plano CAD
  const handleSaveCADPlan = (updatedElements) => {
    if (!selectedEstablishment) return;

    updateEstablishmentPlan(selectedEstablishment.id, updatedElements);

    if (onMasterSavePlan && selectedEstablishment.id === 'EST-01') {
      onMasterSavePlan(updatedElements);
    }

    setCurrentPlanElements(updatedElements);
    showToast(`Plano de "${selectedEstablishment.name}" guardado exitosamente.`);
    setActiveViewMode('list');
  };

  const filteredEstablishments = establishments.filter(est => 
    est.name.toLowerCase().includes(search.toLowerCase()) ||
    est.address.toLowerCase().includes(search.toLowerCase()) ||
    est.level.toLowerCase().includes(search.toLowerCase()) ||
    (est.city && est.city.toLowerCase().includes(search.toLowerCase()))
  );

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
          VISTA 1: LISTADO PRINCIPAL CRUD (PADRÓN DE SEDES)
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
                <span className="truncate">Gestión de Sedes & Establecimientos</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
                Edita imágenes, coordenadas GPS en el mapa, tarifas, redes sociales y planos.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Registrar Nueva Sede / Nivel</span>
            </Button>
          </div>

          {/* Barra de Búsqueda & Métricas */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none z-10 shrink-0" strokeWidth={2.2} />
              <Input
                type="text"
                placeholder="Buscar por nombre de cochera, dirección o ciudad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200 bg-white rounded-xl text-xs focus-visible:ring-emerald-500 w-full"
              />
            </div>
            <div className="bg-white px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 shrink-0">
              <span>Total Sedes:</span>
              <span className="font-mono font-bold text-slate-900">{establishments.length}</span>
            </div>
          </div>

          {/* Grid de Establecimientos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEstablishments.map((est) => {
              const elements = est.elements || [];
              const totalSlots = elements.filter(e => e.type === 'slot').length || est.totalSlots || 0;
              const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;

              return (
                <div key={est.id} className="border border-slate-200/90 shadow-2xs hover:shadow-md transition overflow-hidden rounded-2xl bg-white flex flex-col justify-between group">
                  <div>
                    {/* Imagen Limpia del Local (Sin Badges Flotantes) */}
                    <div className="h-44 relative bg-slate-100 overflow-hidden">
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
                    </div>

                    {/* Datos Principales */}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{est.name}</h3>
                          <span className="font-mono font-bold text-emerald-700 text-xs shrink-0">
                            S/ {Number(est.rate).toFixed(2)}/h
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span className="truncate">{est.address} {est.reference ? `(${est.reference})` : ''}</span>
                        </p>
                      </div>

                      {/* Capacidad y Estado */}
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-medium">
                          {freeSlots} libres de {totalSlots} plazas
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          {est.status || 'Operativo'}
                        </span>
                      </div>

                      {/* Coordenadas & Enlace de Mapa */}
                      <div className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50 font-mono">
                        <span className="flex items-center gap-1.5 truncate text-slate-600">
                          <Navigation className="w-3.5 h-3.5 shrink-0 text-slate-400" />
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
                    </div>
                  </div>

                  {/* Acciones en Una Sola Fila Limpia y Equilibrada */}
                  <div className="p-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
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
                      onClick={() => handleOpenPlan(est, 'viewer_2d')}
                      variant="outline"
                      className="h-8.5 px-2.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold gap-1 rounded-xl cursor-pointer"
                      title="Ver Plano"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Ver</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleOpenEdit(est)}
                      variant="outline"
                      className="h-8.5 px-2.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold gap-1 rounded-xl cursor-pointer"
                      title="Editar información de la sede"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Editar</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleDelete(est.id, est.name)}
                      variant="ghost"
                      className="h-8.5 w-8.5 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl shrink-0 flex items-center justify-center cursor-pointer transition-colors"
                      title="Eliminar Sede"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
              Detección por Cámara (YOLO)
            </div>
            <input type="file" accept="image/*" id="camera-upload" className="hidden" onChange={handleCameraDetect} />
            <Button
              type="button"
              onClick={() => document.getElementById('camera-upload')?.click()}
              disabled={cameraDetecting}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {cameraDetecting ? 'Detectando...' : 'Subir foto del playón y detectar ocupación'}
            </Button>
            <span className="text-[11px] text-slate-500">IA detecta autos por cajón y actualiza el plano (requiere tesseract en servidor para placas, no para ocupación)</span>
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
          
          {/* Header Superior Limpio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5 rounded-xl h-8.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver</span>
              </Button>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  {isEditingNew ? 'Registrar Nueva Sede' : `Editar Sede: ${formData.name || 'Establecimiento'}`}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Actualiza información general, fotografía, mapa y datos de contacto.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveViewMode('list')}
                className="text-xs font-semibold rounded-xl h-8.5 px-3 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveForm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8.5 px-4 gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>{isEditingNew ? 'Registrar Sede' : 'Guardar Cambios'}</span>
              </Button>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTabSection('general')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'general'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>1. Datos Generales & Tarifas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('location')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'location'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>2. Ubicación & Mapa Interactivo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('image')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'image'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>3. Fotografía de la Sede</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('social')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'social'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>4. Contacto & Redes</span>
            </button>
          </div>

          {/* Formulario + Preview en Vivo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Columna Izquierda: Formulario */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* SECCIÓN 1: DATOS DEL LOCAL & TARIFAS */}
              {activeTabSection === 'general' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Datos Generales & Tarifas</h3>
                      <p className="text-xs text-slate-500 font-medium">Información comercial, estructura de costos y estado del local.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Bloque 1: Identidad Comercial */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Identidad de la Sede
                      </span>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Comercial de la Sede *</label>
                        <Input
                          required
                          placeholder="Ej. Smart Park Jr. Bellido - Planta Baja"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="text-xs h-9.5 bg-white border-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Nivel / Estructura</label>
                          <select
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 h-9.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                          >
                            <option>Nivel 1 - Superficie</option>
                            <option>Sótano -1</option>
                            <option>Sótano -2</option>
                            <option>Nivel 2 - Elevado</option>
                            <option>Playa Abierta</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Tarifa por Hora (S/) *</label>
                          <Input
                            type="number"
                            step="0.50"
                            min="1.00"
                            value={formData.rate}
                            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                            className="text-xs font-mono font-bold h-9.5 bg-white border-slate-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Estado de Operación</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 h-9.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                          >
                            <option value="Operativo">● Operativo (Abierto)</option>
                            <option value="Mantenimiento">● En Mantenimiento</option>
                            <option value="Cerrado">● Cerrado Temporalmente</option>
                          </select>
                        </div>
                      </div>

                      {/* Presets Rápidos de Tarifas */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-slate-400 font-medium">Sugerencias:</span>
                        {[3.00, 5.00, 8.00, 10.00].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormData({ ...formData, rate: val })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                              Number(formData.rate) === val 
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            S/ {val.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bloque 2: Ubicación Física & Horario */}
                    <div className="border-t border-slate-100 pt-3.5 space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Dirección & Horario
                      </span>

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

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">Horario de Atención</label>
                          <div className="flex items-center gap-1">
                            {['24/7 (24 Horas)', '06:00 AM - 10:00 PM', 'Lun a Sáb: 07:00 - 21:00'].map(h => (
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
                    </div>

                    {/* Bloque 3: Datos de Titular & Accesos */}
                    <div className="border-t border-slate-100 pt-3.5 space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Titular & Indicaciones
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

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Indicaciones de Acceso para Conductores</label>
                        <textarea
                          rows={2}
                          placeholder="Describe accesos viales, garitas, altura máxima o referencias para los clientes..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: MAPA & UBICACIÓN INTELIGENTE */}
              {activeTabSection === 'location' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-bold text-slate-900">Ubicación & Coordenadas en el Mapa</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Ubica con precisión la cochera usando el buscador de calles, el mapa interactivo o pegando un enlace de Google Maps.
                    </p>
                  </div>

                  {/* Herramienta 1: Pegar enlace de Google Maps o Detectar GPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pegar enlace de Google Maps (Extrae coordenadas):</span>
                      </label>
                      <Input
                        placeholder="https://maps.app.goo.gl/... o https://maps.google.com/?q=-13.1604,-74.2259"
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

                  {/* Herramienta 2: Puntos Rápidos de Referencia en Huamanga */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Zonas rápidas de Ayacucho:</label>
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
                            showToast(`📍 Fijado en ${loc.name}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Herramienta 3: Mini-mapa Interactivo */}
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

                  {/* Campos Numéricos de Coordenadas */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Latitud GPS</label>
                      <Input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
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
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                        className="text-xs font-mono font-semibold h-9 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: FOTOGRAFÍA DE LA SEDE */}
              {activeTabSection === 'image' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-bold text-slate-900">Fotografía del Establecimiento</h3>
                    <p className="text-xs text-slate-500 font-medium">Foto visible para los conductores en el mapa interactivo y en la búsqueda.</p>
                  </div>

                  {/* Previsualización Limpia */}
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

                  {/* Carga de archivo desde dispositivo */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Subir foto desde tu equipo</p>
                        <p className="text-[11px] text-slate-500">Formatos JPG, PNG o WebP (Recomendado 1200x800, máx. 6MB)</p>
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
                    <label className="text-xs font-semibold text-slate-700 block mb-1">O ingresa un enlace / URL de imagen:</label>
                    <Input
                      placeholder="https://ejemplo.com/foto-cochera.jpg"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="text-xs h-9 bg-white border-slate-200"
                    />
                  </div>

                  {/* Galería sugerida */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Galería de fotos sugeridas para cocheras:</label>
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
                </div>
              )}

              {/* SECCIÓN 4: REDES SOCIALES & CONTACTO */}
              {activeTabSection === 'social' && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-bold text-slate-900">Contacto & Canales Oficiales</h3>
                    <p className="text-xs text-slate-500 font-medium">Canales directos para que los clientes se comuniquen con la administración.</p>
                  </div>

                  {/* Canales Directos */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Comunicación Directa
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp de Atención al Cliente</label>
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
                              className="absolute right-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                            >
                              Probar
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono Garita / Central</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
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
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
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
                  <div className="border-t border-slate-100 pt-3.5 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Redes Sociales & Enlaces
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

              {/* Botones de Acción al Pie del Formulario */}
              <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveViewMode('list')} 
                  className="text-xs rounded-xl h-8.5 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveForm} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-5 h-8.5 shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>{isEditingNew ? 'Registrar Sede' : 'Guardar Sede'}</span>
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Previsualización en Vivo de la Tarjeta */}
            <div className="space-y-3.5">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between">
                <span>VISTA PREVIA EN VIVO</span>
                <span className="text-emerald-400 text-[11px] font-sans font-semibold flex items-center gap-1">
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
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">
                          {formData.name || 'Nombre de la Sede'}
                        </h3>
                        <span className="font-mono font-bold text-emerald-700 text-xs shrink-0">
                          S/ {Number(formData.rate || 5).toFixed(2)}/h
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> 
                        <span className="truncate">{formData.address || 'Dirección en Huamanga'} {formData.reference ? `(${formData.reference})` : ''}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-medium">{formData.level}</span>
                      <span className="text-emerald-700 font-semibold">{formData.status}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50 font-mono">
                      <span className="flex items-center gap-1.5 truncate text-slate-600">
                        <Navigation className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}</span>
                      </span>
                      <span className="text-emerald-700 font-semibold text-[11px] bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        Maps
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 pt-3">
                  <div className="w-full py-2 text-center font-bold text-xs bg-slate-900 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                    <span>Plano</span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Información sobre el Marcador */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-bold text-slate-700 block">
                  📍 Marcador GPS para Conductores
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Esta ubicación aparecerá exactamente en las coordenadas <strong className="font-mono text-slate-800">{Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)}</strong> en el mapa satelital de Ayacucho.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};