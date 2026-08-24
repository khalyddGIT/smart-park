import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

// Fotos predeterminadas para cocheras
const PRESET_IMAGES = [
  { label: 'Cochera Moderna Centro', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800' },
  { label: 'Estacionamiento Subterráneo', url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800' },
  { label: 'Playa Abierta Asfaltada', url: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800' },
  { label: 'Terminal / Zona Amplia', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800' },
  { label: 'Garita & Barrera Automatizada', url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800' },
  { label: 'Edificio de Estacionamiento', url: 'https://images.unsplash.com/photo-1520105072000-f44fc083e508?w=800' }
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

// Mini-mapa selector de coordenadas integrado en la vista completa
const LocationPickerMap = ({ latitude, longitude, onChangeCoords }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    const lat = Number(latitude) || -13.1604;
    const lng = Number(longitude) || -74.2259;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const customIcon = L.divIcon({
        className: 'picker-pin',
        html: `
          <div style="transform: translate(-50%, -100%); cursor: grab;">
            <div style="background: #0f172a; color: #34d399; padding: 6px 12px; border-radius: 14px; font-weight: 800; font-size: 11px; box-shadow: 0 10px 20px -3px rgba(0,0,0,0.4); border: 2px solid #34d399; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
              <span>📍 Pin de tu Cochera</span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #0f172a; margin: 0 auto;"></div>
          </div>
        `,
        iconSize: [0, 0]
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 shrink-0 text-emerald-600 animate-pulse" />
          <span>Fijar punto en el mapa de Ayacucho (Haz clic en cualquier calle o arrastra el pin):</span>
        </span>
        <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-bold border border-slate-200">
          Lat: {Number(latitude).toFixed(5)} | Lng: {Number(longitude).toFixed(5)}
        </span>
      </div>
      <div 
        ref={mapContainerRef} 
        className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-300 shadow-inner z-0"
      />
    </div>
  );
};

export const LocalEstablishmentManager = ({ masterElements, onMasterSavePlan }) => {
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    updateEstablishmentPlan, 
    deleteEstablishment 
  } = useEstablishments();

  const [search, setSearch] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('list'); // 'list' | 'viewer_2d' | 'editor_cad' | 'edit_form'
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [currentPlanElements, setCurrentPlanElements] = useState([]);
  
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

  // Carga de archivo de imagen
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      alert('La imagen no debe superar los 6MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url) {
        setFormData(prev => ({ ...prev, image: base64Url }));
        showToast('Foto cargada exitosamente.');
      }
    };
    reader.readAsDataURL(file);
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

  // Abrir plano
  const handleOpenPlan = (est, mode) => {
    setSelectedEstablishment(est);
    setCurrentPlanElements(est.elements || []);
    setActiveViewMode(mode);
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
                        src={est.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                        alt={est.name} 
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                        loading="lazy"
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

                  {/* Acciones */}
                  <div className="p-4 pt-0 space-y-2 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleOpenPlan(est, 'viewer_2d')}
                        variant="outline"
                        className="w-full h-8 font-semibold text-xs gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2 flex items-center justify-center cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">Ver Plano</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleOpenPlan(est, 'editor_cad')}
                        className="w-full h-8 font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 rounded-xl px-2 flex items-center justify-center cursor-pointer"
                      >
                        <Grid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Editar CAD</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => handleOpenEdit(est)}
                        variant="outline"
                        className="flex-1 min-w-0 h-8 text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold gap-1.5 rounded-xl px-2.5 flex items-center justify-center cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Editar Sede</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(est.id, est.name)}
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl shrink-0 flex items-center justify-center cursor-pointer"
                        title="Eliminar Sede"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </Button>
                    </div>
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
              <span>Abrir en Modo Edición CAD</span>
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
        <div className="space-y-6 animate-in fade-in">
          
          {/* Header Superior */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5 rounded-xl h-9 text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver al Padrón</span>
              </Button>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>{isEditingNew ? 'Registrar Nueva Sede' : `Editar Sede: ${formData.name || 'Establecimiento'}`}</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Edita fotografía, coordenadas en mapa, enlaces y redes sociales.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveViewMode('list')}
                className="text-xs font-bold rounded-xl h-9"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveForm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-5 gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{isEditingNew ? 'Guardar Nueva Sede' : 'Guardar Todos los Cambios'}</span>
              </Button>
            </div>
          </div>

          {/* Navegación por Secciones (Solo las 4 pedidas) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTabSection('general')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'general'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>1. Datos del Local & Tarifas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('image')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'image'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>2. Imagen del Local</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('location')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'location'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>3. Ubicación & Coordenadas en Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('social')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTabSection === 'social'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>4. Redes Sociales & Contacto</span>
            </button>
          </div>

          {/* Formulario + Preview en Vivo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Formulario */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* SECCIÓN 1: DATOS DEL LOCAL */}
              {activeTabSection === 'general' && (
                <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">Datos Generales del Establecimiento</h3>
                    <p className="text-xs text-slate-500">Información comercial de la cochera.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial de la Sede / Cochera *</label>
                      <Input
                        required
                        placeholder="Ej. Smart Park Jr. Bellido - Planta Baja"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-xs h-10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Dirección Exacta *</label>
                        <Input
                          required
                          placeholder="Ej. Jr. Bellido 240"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="text-xs h-10"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Referencia</label>
                        <Input
                          placeholder="Ej. Frente a la Iglesia San Blas"
                          value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                          className="text-xs h-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Nivel / Planta</label>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                        >
                          <option>Nivel 1 - Superficie</option>
                          <option>Sótano -1</option>
                          <option>Sótano -2</option>
                          <option>Nivel 2 - Elevado</option>
                          <option>Playa Abierta</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa por Hora (S/) *</label>
                        <Input
                          type="number"
                          step="0.50"
                          min="1.00"
                          value={formData.rate}
                          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                          className="text-xs font-mono font-bold h-10"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Estado Operativo</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                        >
                          <option value="Operativo">Operativo (Abierto)</option>
                          <option value="Mantenimiento">En Mantenimiento</option>
                          <option value="Cerrado">Cerrado Temporalmente</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Titular / Razón Social</label>
                        <Input
                          placeholder="Ej. Inversiones Huamanga S.A.C."
                          value={formData.owner}
                          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                          className="text-xs h-10"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">RUC o DNI del Titular</label>
                        <Input
                          placeholder="Ej. 20601234567"
                          value={formData.ruc}
                          onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                          className="text-xs font-mono h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Horario de Atención</label>
                      <Input
                        placeholder="Ej. Lunes a Domingo: 24 Horas (Abierto 24/7)"
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                        className="text-xs h-10"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Descripción / Indicaciones</label>
                      <textarea
                        rows={3}
                        placeholder="Describe los accesos y características de la cochera..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* SECCIÓN 2: IMAGEN DEL LOCAL */}
              {activeTabSection === 'image' && (
                <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">Imagen de la Cochera</h3>
                    <p className="text-xs text-slate-500">Foto que verán los conductores en el mapa y en el catálogo.</p>
                  </div>

                  {/* Previsualización */}
                  <div className="relative w-full h-56 sm:h-72 rounded-3xl overflow-hidden border-2 border-slate-300 bg-slate-100 shadow-inner group">
                    <img 
                      src={formData.image} 
                      alt="Vista previa de la cochera" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                      <span className="text-white text-xs font-bold drop-shadow-md flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Vista previa de la foto</span>
                      </span>
                    </div>
                  </div>

                  {/* Carga de archivo desde PC */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Upload className="w-6 h-6 shrink-0" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Cargar foto desde tu dispositivo</p>
                        <p className="text-[10px] text-slate-500">Formatos JPG, PNG o WebP (Hasta 6MB)</p>
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
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-10 px-4"
                      >
                        Examinar Archivo...
                      </Button>
                    </div>
                  </div>

                  {/* URL Externa */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">O ingresa un enlace / URL de imagen:</label>
                    <Input
                      placeholder="https://ejemplo.com/foto-estacionamiento.jpg"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="text-xs h-10"
                    />
                  </div>

                  {/* Presets sugeridos */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Fotos sugeridas:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {PRESET_IMAGES.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, image: img.url });
                            showToast(`Foto "${img.label}" seleccionada.`);
                          }}
                          className={`group relative h-20 rounded-2xl overflow-hidden border-2 transition cursor-pointer ${
                            formData.image === img.url ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200 hover:border-slate-400'
                          }`}
                          title={img.label}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition" />
                          {formData.image === img.url && (
                            <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center">
                              <Check className="w-5 h-5 shrink-0 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* SECCIÓN 3: MAPA & COORDENADAS */}
              {activeTabSection === 'location' && (
                <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">Ubicación & Coordenadas en el Mapa</h3>
                    <p className="text-xs text-slate-500">Coordenadas y enlace de Google Maps para visualizar en el mapa de Ayacucho.</p>
                  </div>

                  {/* Pegar enlace de Google Maps */}
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Pegar Enlace de Google Maps (Extrae las coordenadas automáticamente):</span>
                    </label>
                    <Input
                      placeholder="Ej. https://maps.app.goo.gl/... o https://maps.google.com/?q=-13.1604,-74.2259"
                      value={formData.mapsUrl}
                      onChange={(e) => handleParseMapsUrl(e.target.value)}
                      className="text-xs bg-white h-10"
                    />
                  </div>

                  {/* Campos Latitud, Longitud y Botón GPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Latitud GPS</label>
                      <Input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                        className="text-xs font-mono font-bold h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Longitud GPS</label>
                      <Input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                        className="text-xs font-mono font-bold h-10"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        onClick={handleGetDeviceLocation}
                        disabled={gpsLocating}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-10 gap-1.5"
                      >
                        <LocateFixed className={`w-4 h-4 shrink-0 text-emerald-400 ${gpsLocating ? 'animate-spin' : ''}`} />
                        <span>{gpsLocating ? 'Detectando GPS...' : '📍 Detectar GPS Actual'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Presets Rápidos */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Ubicaciones rápidas en Ayacucho:</label>
                    <div className="flex flex-wrap gap-2">
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
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mini-mapa interactivo */}
                  <LocationPickerMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChangeCoords={(newLat, newLng) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: newLat,
                        longitude: newLng,
                        mapsUrl: `https://maps.google.com/?q=${newLat},${newLng}`
                      }));
                    }}
                  />
                </Card>
              )}

              {/* SECCIÓN 4: REDES SOCIALES & CONTACTO */}
              {activeTabSection === 'social' && (
                <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">Contacto & Redes Sociales</h3>
                    <p className="text-xs text-slate-500">Datos de atención y canales oficiales.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Fijo o Celular</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 shrink-0 text-slate-400 absolute left-3.5 top-3" />
                        <Input
                          placeholder="+51 966 123 456"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10 text-xs font-mono h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Número de WhatsApp (Consultas)</label>
                      <div className="relative">
                        <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600 absolute left-3.5 top-3" />
                        <Input
                          placeholder="51966123456"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="pl-10 text-xs font-mono h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico de Contacto</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 shrink-0 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        type="email"
                        placeholder="contacto@cochera.pe"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Redes Sociales & Enlaces</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Página de Facebook</label>
                        <Input
                          placeholder="https://facebook.com/CocheraAyacucho"
                          value={formData.socials?.facebook || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, facebook: e.target.value }
                          })}
                          className="text-xs h-10"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Perfil de Instagram</label>
                        <Input
                          placeholder="https://instagram.com/cochera o @usuario"
                          value={formData.socials?.instagram || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, instagram: e.target.value }
                          })}
                          className="text-xs h-10"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Cuenta de TikTok</label>
                        <Input
                          placeholder="https://tiktok.com/@cochera"
                          value={formData.socials?.tiktok || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, tiktok: e.target.value }
                          })}
                          className="text-xs h-10"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Sitio Web Oficial</label>
                        <Input
                          placeholder="https://smartpark.pe/sede"
                          value={formData.socials?.website || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socials: { ...formData.socials, website: e.target.value }
                          })}
                          className="text-xs h-10"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Barra Inferior de Guardado */}
              <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveViewMode('list')} 
                  className="text-xs rounded-xl h-10 font-bold"
                >
                  Volver sin Guardar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveForm} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-6 h-10 shadow-md shadow-emerald-600/20 gap-2"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isEditingNew ? 'Registrar Sede' : 'Guardar Ficha Completa'}</span>
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Previsualización en Vivo */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-mono font-bold flex items-center justify-between">
                <span>PREVIEW EN VIVO</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sincronizado
                </span>
              </div>

              {/* Tarjeta simulada */}
              <Card className="overflow-hidden border-slate-200 shadow-md rounded-3xl bg-white flex flex-col justify-between">
                <div>
                  <div className="h-44 relative bg-slate-100 overflow-hidden">
                    <img 
                      src={formData.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                      alt={formData.name || 'Preview'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800';
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-800 shadow-sm border border-slate-200 font-mono">
                      S/ {Number(formData.rate || 5).toFixed(2)}/h
                    </div>
                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                      Disponibilidad en Vivo
                    </div>
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                      {formData.level}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {formData.name || 'Nombre del Estacionamiento'}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4 shrink-0 text-emerald-600" /> 
                        <span className="truncate">{formData.address || 'Dirección en Huamanga'} {formData.reference ? `(${formData.reference})` : ''}</span>
                      </p>
                    </div>

                    {/* WhatsApp en Preview */}
                    {formData.whatsapp && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>WhatsApp: {formData.whatsapp}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="w-full py-2.5 text-center font-bold text-xs bg-slate-900 text-white rounded-xl shadow-sm flex items-center justify-center gap-1.5">
                    <span>Ver Plano & Reservar Plaza</span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" />
                  </div>
                </div>
              </Card>

              {/* Pin del Mapa en Preview */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  📍 Estado del Pin en el Mapa
                </span>
                <p className="text-slate-800 font-bold">
                  Latitud: <span className="font-mono text-emerald-700">{Number(formData.latitude).toFixed(5)}</span>
                </p>
                <p className="text-slate-800 font-bold">
                  Longitud: <span className="font-mono text-emerald-700">{Number(formData.longitude).toFixed(5)}</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Al guardar, este marcador aparecerá en el mapa interactivo de Ayacucho para los conductores.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};