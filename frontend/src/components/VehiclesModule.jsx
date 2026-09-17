import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Plus, 
  Car, 
  Trash2, 
  Edit3, 
  Search, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  ExternalLink,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  Upload,
  Camera,
  RefreshCw,
  VideoOff,
  Bike,
  Truck,
  Loader2
} from 'lucide-react';
import { MototaxiIcon } from './icons/MototaxiIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  listVehicles, 
  createVehicle as apiCreateVehicle, 
  updateVehicleApi, 
  deleteVehicleApi, 
  lookupVehicleImageApi,
  uploadVehicleImageApi,
  resolveImageUrl,
  getAccessToken 
} from '../services/api';

// Función para consultar la API y obtener foto real del modelo (vía backend proxy y fallback directo)
export const fetchCarPhoto = async (brand, model, year = '2023', vehicleType = 'auto') => {
  if (!brand || !model) return null;
  // 1. Intentar consulta server-side en backend (evita CORS y bloqueos de navegador)
  try {
    const data = await lookupVehicleImageApi(brand, model, year, vehicleType);
    if (data?.image_url) {
      return data.image_url;
    }
  } catch {
    // Fallback al cliente directo
  }

  // 2. Consulta directa de respaldo con soporte HTTPS forzado
  try {
    const searchTerm = encodeURIComponent(`${brand} ${model} ${year}`.trim());
    const res = await fetch(`https://www.carimagery.com/api.asmx/GetImageUrl?searchTerm=${searchTerm}`);
    if (res.ok) {
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      let url = xmlDoc.getElementsByTagName("string")[0]?.textContent;
      if (url && url.startsWith("http") && !url.toLowerCase().includes("error")) {
        if (url.startsWith("http://")) {
          url = "https://" + url.substring(7);
        }
        return url;
      }
    }
  } catch {
    // Retornar fallback si hay error de red
  }
  return null;
};

const VEHICLES_STORAGE_KEY_BASE = 'smart_park_vehicles_v2';
export const getVehiclesStorageKey = () => {
  try {
    const saved = localStorage.getItem('smart_park_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      return `${VEHICLES_STORAGE_KEY_BASE}_${u?.id || u?.email || 'guest'}`;
    }
  } catch {}
  return `${VEHICLES_STORAGE_KEY_BASE}_guest`;
};
const getVehiclesKey = getVehiclesStorageKey;

export const VEHICLE_CATEGORIES = [
  { id: 'auto', label: 'Auto', desc: 'Sedán / Hatchback', icon: Car },
  { id: 'suv', label: 'Camioneta', desc: 'SUV / 4x4', icon: Truck },
  { id: 'mototaxi', label: 'Mototaxi', desc: 'Torito / Trimóvil', icon: MototaxiIcon },
  { id: 'moto', label: 'Moto', desc: 'Lineal / Scooter', icon: Bike },
  { id: 'truck', label: 'Camión', desc: 'Furgón / Utilitario', icon: Truck },
];

export const VEHICLE_TAXONOMY = {
  mototaxi: {
    label: 'Mototaxi',
    brands: ['Bajaj', 'TVS', 'Zongshen', 'Wanxin', 'Lifan', 'Piaggio'],
    modelsByBrand: {
      Bajaj: ['Torito 4T', 'Torito 2T', 'Torito Maxima Z', 'RE Furgón', 'Torito Compact'],
      TVS: ['King Deluxe', 'King Duramax', 'King Kargo', 'King FI'],
      Zongshen: ['ZS 150 Trimóvil', 'ZS 200 Torito', 'ZS 250 Carga', 'ZS 125 Pasajeros'],
      Wanxin: ['WX 150-A Torito', 'WX 200 Furgón', 'WX 125 Trimóvil', 'WX 250 Carga'],
      Lifan: ['LF 150 Trimóvil', 'LF 200 Torito', 'LF 250 Pasajeros'],
      Piaggio: ['Ape City', 'Ape Auto DX', 'Ape Xtra LDX', 'Ape Calessino']
    }
  },
  moto: {
    label: 'Motocicleta',
    brands: ['Honda', 'Yamaha', 'Bajaj', 'Suzuki', 'KTM', 'Ronco', 'Zongshen', 'Senda'],
    modelsByBrand: {
      Honda: ['Wave 110', 'CB 190R', 'XR 150L', 'CB 125F', 'Navi 110', 'XRE 300', 'Twister CB 250', 'Elite 125', 'Dio 110', 'CRF 250F'],
      Yamaha: ['YBR 125', 'FZ 2.0 (FI)', 'FZ 25', 'MT-03', 'Crypton 115', 'NMAX 155', 'XTZ 125', 'XTZ 150 Crosser', 'YZF R15', 'BWS 125', 'Ray ZR 125'],
      Bajaj: ['Pulsar NS 200', 'Pulsar 150 Neon', 'Pulsar N250', 'Boxer 150', 'Discover 125 ST', 'Dominar 400', 'Dominar 250', 'Platina 100'],
      Suzuki: ['Gixxer 150', 'Gixxer 250 SF', 'AX 100', 'GN 125', 'GSX-R150', 'Hayate 125', 'Burgman Street 125'],
      KTM: ['Duke 200', 'Duke 250', 'Duke 390', 'RC 200', 'Adventure 390'],
      Ronco: ['Pantera 150', 'Demoledor 200', 'Xplorer 250', 'Titan 150', 'Aggressor 200'],
      Zongshen: ['ZS 125', 'ZS 150-50', 'ZS 200GY', 'RX3 Adventure', 'Z-One 150'],
      Senda: ['Echo 110', 'Viper 150', 'Tracker 200', 'Scorpion 150']
    }
  },
  auto: {
    label: 'Automóvil / Sedán',
    brands: ['Toyota', 'Hyundai', 'Nissan', 'Kia', 'Chevrolet', 'Volkswagen', 'Suzuki', 'Honda', 'Mazda'],
    modelsByBrand: {
      Toyota: ['Corolla', 'Yaris', 'Etios', 'Prius', 'Camry', 'Avanza', 'Starlet', 'Crown'],
      Hyundai: ['Elantra', 'Accent', 'Grand i10 Sedán', 'Atos', 'i20', 'Sonata', 'Verna'],
      Nissan: ['Sentra', 'Versa', 'Tiida', 'March', 'V-Drive', 'Almera', 'Sunny'],
      Kia: ['Rio Sedán', 'Cerato', 'Picanto', 'Soluto', 'K5', 'Forte'],
      Chevrolet: ['Sail', 'Onix Sedán', 'Spark GT', 'Cruze', 'Prisma', 'Aveo'],
      Volkswagen: ['Gol Sedán', 'Polo', 'Virtus', 'Jetta', 'Golf', 'Voyage', 'Passat'],
      Suzuki: ['Swift Sedán', 'Dzire', 'Alto 800', 'Baleno', 'Celerio', 'S-Presso', 'Ciaz'],
      Honda: ['Civic', 'City', 'Accord', 'Fit', 'Insight'],
      Mazda: ['Mazda 3 Sedán', 'Mazda 2 Sedán', 'Mazda 6']
    }
  },
  suv: {
    label: 'Camioneta SUV',
    brands: ['Toyota', 'Hyundai', 'Nissan', 'Kia', 'Ford', 'Mazda', 'Honda', 'Renault', 'Chery', 'Jeep'],
    modelsByBrand: {
      Toyota: ['RAV4', 'Fortuner', 'Rush', 'Land Cruiser Prado', 'Corolla Cross', '4Runner', 'Highlander', 'Yaris Cross'],
      Hyundai: ['Tucson', 'Santa Fe', 'Creta', 'Venue', 'Kona', 'Palisade', 'Creta Grand'],
      Nissan: ['Kicks', 'X-Trail', 'Qashqai', 'Pathfinder', 'Patrol', 'Murano'],
      Kia: ['Sportage', 'Seltos', 'Sorento', 'Sonet', 'Stonic', 'Telluride', 'Soul'],
      Ford: ['EcoSport', 'Explorer', 'Escape', 'Everest', 'Territory', 'Expedition', 'Bronco Sport'],
      Mazda: ['CX-5', 'CX-30', 'CX-3', 'CX-9', 'CX-50'],
      Honda: ['CR-V', 'HR-V', 'Pilot', 'WR-V', 'Passport'],
      Renault: ['Duster', 'Kwid', 'Stepway', 'Koleos', 'Captur', 'Kardian'],
      Chery: ['Tiggo 2 Pro', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro'],
      Jeep: ['Grand Cherokee', 'Compass', 'Renegade', 'Wrangler']
    }
  },
  truck: {
    label: 'Camión / Utilitario',
    brands: ['Toyota', 'Hyundai', 'Nissan', 'Fuso', 'Hino', 'Isuzu', 'Chevrolet', 'Volkswagen', 'Kia'],
    modelsByBrand: {
      Toyota: ['Hilux', 'Dyna', 'HiAce Furgón', 'Coaster', 'Land Cruiser Pick-up'],
      Hyundai: ['H-100', 'HD78', 'HD65', 'Mighty', 'H-1 Furgón', 'Staria Cargo'],
      Nissan: ['Frontier', 'Navara', 'Urvan Cargo', 'Cabstar'],
      Fuso: ['Canter 3.6T', 'Canter 5.0T', 'Canter 6.5T', 'Fighter', 'FA/FI'],
      Hino: ['Dutro 300', 'Hino 500', 'Dutro City', 'Dutro Pro'],
      Isuzu: ['NPR 75', 'NQR 90', 'D-Max', 'Forward 1400', 'FTR'],
      Chevrolet: ['N300 Max', 'N400 Cargo', 'Colorado', 'D-Max', 'FTR'],
      Volkswagen: ['Amarok', 'Delivery 9.170', 'Delivery 11.180', 'Constellation'],
      Kia: ['K2700', 'K2500', 'Bongo']
    }
  }
};

export const getBrandsForCategory = (vehicleType = 'auto') => {
  const t = (vehicleType || 'auto').toLowerCase();
  const cat = VEHICLE_TAXONOMY[t] || VEHICLE_TAXONOMY.auto;
  return cat.brands || [];
};

export const POPULAR_BRANDS = getBrandsForCategory('auto');

export const getModelsForBrandAndCategory = (brand = '', vehicleType = 'auto', query = '') => {
  const t = (vehicleType || 'auto').toLowerCase();
  const cat = VEHICLE_TAXONOMY[t] || VEHICLE_TAXONOMY.auto;
  const cleanBrand = (brand || '').trim();
  const cleanQuery = (query || '').trim().toLowerCase();

  // 1. Si el usuario especificó una marca (ej. Toyota, Bajaj, Hyundai)
  if (cleanBrand) {
    // Buscar la marca dentro del catálogo de la categoría actual
    const brandKey = Object.keys(cat.modelsByBrand).find(
      b => b.toLowerCase() === cleanBrand.toLowerCase()
    );

    if (brandKey) {
      const models = cat.modelsByBrand[brandKey] || [];
      if (!cleanQuery) {
        return models.map(m => ({ model: m, brand: brandKey }));
      }
      // Filtrar STRICTAMENTE dentro de los modelos de esa marca
      return models
        .filter(m => m.toLowerCase().includes(cleanQuery))
        .map(m => ({ model: m, brand: brandKey }));
    }

    // Si la marca existe en otra categoría (ej. el usuario puso Honda en auto, o Bajaj en moto)
    for (const [catKey, catData] of Object.entries(VEHICLE_TAXONOMY)) {
      const otherBrandKey = Object.keys(catData.modelsByBrand).find(
        b => b.toLowerCase() === cleanBrand.toLowerCase()
      );
      if (otherBrandKey) {
        const otherModels = catData.modelsByBrand[otherBrandKey] || [];
        if (!cleanQuery) {
          return otherModels.slice(0, 8).map(m => ({ model: m, brand: otherBrandKey }));
        }
        return otherModels
          .filter(m => m.toLowerCase().includes(cleanQuery))
          .map(m => ({ model: m, brand: otherBrandKey }));
      }
    }

    // Si la marca es totalmente desconocida/personalizada, no mezclar con modelos de otras marcas
    return [];
  }

  // 2. Si AÚN NO ha puesto ninguna marca y escribe en el buscador de modelo:
  if (cleanQuery) {
    const results = [];
    for (const [b, models] of Object.entries(cat.modelsByBrand)) {
      for (const m of models) {
        if (m.toLowerCase().includes(cleanQuery)) {
          results.push({ model: m, brand: b });
          if (results.length >= 8) break;
        }
      }
      if (results.length >= 8) break;
    }
    return results;
  }

  // 3. Si no hay marca ni texto: sugerir los modelos emblemáticos de esta categoría
  const topDefaults = [];
  for (const [b, models] of Object.entries(cat.modelsByBrand)) {
    if (models[0]) topDefaults.push({ model: models[0], brand: b });
    if (models[1]) topDefaults.push({ model: models[1], brand: b });
    if (topDefaults.length >= 6) break;
  }
  return topDefaults;
};

export const getMatchingModels = (brand = '', model = '', vehicleType = 'auto') => {
  return getModelsForBrandAndCategory(brand, vehicleType, model);
};

export const COLOR_SWATCHES = [
  { name: 'Negro', hex: '#0f172a', border: false },
  { name: 'Blanco', hex: '#ffffff', border: true },
  { name: 'Gris Plata', hex: '#94a3b8', border: false },
  { name: 'Gris Oscuro', hex: '#475569', border: false },
  { name: 'Rojo', hex: '#ef4444', border: false },
  { name: 'Azul', hex: '#3b82f6', border: false },
  { name: 'Amarillo', hex: '#eab308', border: false },
  { name: 'Verde', hex: '#10b981', border: false },
  { name: 'Beige', hex: '#d4b996', border: false }
];

const getDefaultCarImage = (type = 'auto') => {
  const t = (type || '').toLowerCase();
  if (t === 'suv' || t === 'camioneta') return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80';
  if (t === 'moto' || t === 'motorcycle') return 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80';
  if (t === 'mototaxi' || t === 'torito' || t === 'trimovil') return 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80';
  if (t === 'truck' || t === 'camion') return 'https://images.unsplash.com/photo-1586191582056-a6c382f6e975?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80';
};

const formatCategoryName = (type = '') => {
  const t = (type || '').toLowerCase();
  if (t === 'suv' || t === 'camioneta') return 'Camioneta SUV';
  if (t === 'moto' || t === 'motorcycle') return 'Motocicleta';
  if (t === 'mototaxi' || t === 'torito' || t === 'trimovil') return 'Mototaxi / Torito';
  if (t === 'truck' || t === 'camion') return 'Camión / Utilitario';
  return 'Automóvil / Sedán';
};

export const getPeruvianPlateConfig = (vehicleType = 'auto', isTaxi = false) => {
  const type = (vehicleType || '').toLowerCase();
  
  if (type === 'mototaxi' || type === 'torito' || type === 'trimovil') {
    return {
      typeId: 'mototaxi',
      name: 'Mototaxi',
      categorySubtitle: 'Vehículo Menor de Pasajeros (Cat. L5)',
      headerBg: 'bg-[#ffcc00]', // Franja superior amarilla oficial
      headerTextColor: 'text-slate-950',
      bodyBg: 'bg-[#38bdf8]', // Fondo celeste oficial MTC
      textColor: 'text-slate-950',
      defaultPlate: 'AB-1234',
      badgeLabel: 'Mototaxi (Franja Amarilla · Fondo Celeste)',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    };
  }

  if (type === 'moto' || type === 'motorcycle') {
    return {
      typeId: 'moto',
      name: 'Motocicleta',
      categorySubtitle: 'Vehículo Menor Lineal (Cat. L3)',
      headerBg: 'bg-[#00a8e8]', // Franja superior celeste oficial
      headerTextColor: 'text-slate-950',
      bodyBg: 'bg-[#38bdf8]', // Fondo celeste oficial MTC
      textColor: 'text-slate-950',
      defaultPlate: 'AB-1234',
      badgeLabel: 'Motocicleta (Celeste Oficial)',
      badgeColor: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
    };
  }

  if (type === 'truck' || type === 'camion') {
    return {
      typeId: 'truck',
      name: 'Tractocamión / Carga',
      categorySubtitle: 'Vehículo Pesado / Carga (Cat. N)',
      headerBg: 'bg-[#ffcc00]', // Franja amarilla oficial
      headerTextColor: 'text-slate-950',
      bodyBg: 'bg-[#fde047]', // Fondo amarillo reflectivo oficial
      textColor: 'text-slate-950',
      defaultPlate: 'ABC-123',
      badgeLabel: 'Tractocamión / Carga (Amarilla)',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    };
  }

  if (isTaxi) {
    return {
      typeId: 'taxi',
      name: 'Taxi',
      categorySubtitle: 'Servicio Público de Taxi (Cat. M1)',
      headerBg: 'bg-[#ffcc00]', // Franja amarilla oficial para Taxi
      headerTextColor: 'text-slate-950',
      bodyBg: 'bg-white', // Fondo blanco reflectivo
      textColor: 'text-slate-950',
      defaultPlate: 'ABC-123',
      badgeLabel: 'Taxi (Franja Amarilla · Fondo Blanco)',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    };
  }

  // Auto particular o Camioneta SUV particular (Blanca)
  return {
    typeId: type === 'suv' || type === 'camioneta' ? 'suv' : 'auto',
    name: type === 'suv' || type === 'camioneta' ? 'Camioneta Particular' : 'Auto Particular',
    categorySubtitle: 'Vehículo Particular (Cat. M1)',
    headerBg: 'bg-white', // Franja blanca oficial
    headerTextColor: 'text-slate-950',
    bodyBg: 'bg-white', // Fondo blanco reflectivo
    textColor: 'text-slate-950',
    defaultPlate: 'ABC-123',
    badgeLabel: type === 'suv' || type === 'camioneta' ? 'Camioneta Particular (Blanca)' : 'Auto Particular (Blanca)',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  };
};

export const getSoatStatus = (expiryDate) => {
  if (!expiryDate) return { status: 'none', label: 'SOAT no registrado', color: 'slate', detail: '' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = String(expiryDate).split('-');
  const exp = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  if (isNaN(exp.getTime())) return { status: 'none', label: 'SOAT no registrado', color: 'slate', detail: '' };
  
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Vencido (${Math.abs(diffDays)}d)`,
      detail: `Venció el ${exp.toLocaleDateString('es-PE')}`,
      color: 'rose',
      daysLeft: diffDays
    };
  } else if (diffDays <= 30) {
    return {
      status: 'warning',
      label: `Vence en ${diffDays}d`,
      detail: `Vence el ${exp.toLocaleDateString('es-PE')}`,
      color: 'amber',
      daysLeft: diffDays
    };
  } else {
    return {
      status: 'valid',
      label: `SOAT Vigente`,
      detail: `Hasta el ${exp.toLocaleDateString('es-PE')}`,
      color: 'emerald',
      daysLeft: diffDays
    };
  }
};

export const VehiclesModule = () => {
  const fileInputRef = useRef(null);
  const webcamRef = useRef(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraError, setCameraError] = useState(false);

  const [vehicles, setVehicles] = useState(() => {
    try {
      const key = getVehiclesKey();
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Sincronización con Backend: si hay token, traer del backend
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      listVehicles().then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(v => ({ 
            id: v.id, 
            license_plate: v.license_plate, 
            vehicle_type: v.vehicle_type, 
            brand: v.brand, 
            model: v.model, 
            color: v.color, 
            year: v.year || '2023',
            soat_expiry: v.soat_expiry || v.soatExpiry || '',
            notes: v.notes || '',
            isDefault: false, 
            imageUrl: v.image_url || v.imageUrl || getDefaultCarImage(v.vehicle_type) 
          }));
          setVehicles(mapped);
          try { localStorage.setItem(getVehiclesKey(), JSON.stringify(mapped)); } catch {}
        }
      }).catch(() => {});
    }
  }, []);

  // Recargar vehículos al cambiar de usuario
  useEffect(() => {
    const token = getAccessToken();
    if (token) return;
    const loadForUser = () => {
      try {
        const key = getVehiclesKey();
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setVehicles(parsed);
          else setVehicles([]);
        } else {
          setVehicles([]);
        }
      } catch (e) {}
    };

    const interval = setInterval(() => {
      const currentKey = getVehiclesKey();
      if (currentKey !== window.__lastVehiclesKey) {
        window.__lastVehiclesKey = currentKey;
        loadForUser();
      }
    }, 500);
    window.__lastVehiclesKey = getVehiclesKey();
    window.addEventListener('storage', loadForUser);
    return () => { clearInterval(interval); window.removeEventListener('storage', loadForUser); };
  }, []);

  useEffect(() => {
    try {
      const key = getVehiclesKey();
      localStorage.setItem(key, JSON.stringify(vehicles));
    } catch (e) {}
  }, [vehicles]);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({ 
    license_plate: '', 
    vehicle_type: 'auto', 
    is_taxi: false,
    brand: '', 
    model: '', 
    year: '2023', 
    color: 'Gris', 
    soat_expiry: '',
    imageUrl: getDefaultCarImage('auto'),
    notes: ''
  });
  const [notification, setNotification] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({ 
      license_plate: '', 
      vehicle_type: 'auto', 
      is_taxi: false,
      brand: '', 
      model: '', 
      year: '2023', 
      color: 'Gris', 
      soat_expiry: '',
      imageUrl: getDefaultCarImage('auto'),
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (v) => {
    setSelectedVehicle(v);
    setFormData({
      license_plate: v.license_plate,
      vehicle_type: v.vehicle_type || 'auto',
      is_taxi: Boolean(v.is_taxi || v.notes?.includes('[Taxi]')),
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || '2023',
      color: v.color || 'Gris',
      soat_expiry: v.soat_expiry || v.soatExpiry || '',
      imageUrl: v.imageUrl || getDefaultCarImage(v.vehicle_type || 'auto'),
      notes: v.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSetDefault = (id) => {
    const updated = vehicles.map(v => ({
      ...v,
      isDefault: v.id === id
    }));
    setVehicles(updated);
    showToast('Vehículo predeterminado actualizado.');
  };

  const handleFetchCarPhoto = async () => {
    if (!formData.brand || !formData.model) {
      showToast('Ingresa la Marca y Modelo del vehículo.');
      return;
    }
    setLoadingImage(true);
    const photo = await fetchCarPhoto(formData.brand, formData.model, formData.year || '2023', formData.vehicle_type);
    setLoadingImage(false);

    if (photo) {
      setFormData(prev => ({ ...prev, imageUrl: photo }));
      showToast('✓ Fotografía oficial obtenida.');
    } else {
      const fallbackUrl = getDefaultCarImage(formData.vehicle_type);
      setFormData(prev => ({ ...prev, imageUrl: fallbackUrl }));
      showToast('Foto referencial asignada.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const token = getAccessToken();
      if (token) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const res = await uploadVehicleImageApi(uploadData);
          if (res?.image_url) {
            setFormData(prev => ({ ...prev, imageUrl: res.image_url }));
            showToast('✓ Fotografía subida y guardada en servidor.');
            return;
          }
        } catch {
          // Fallback a base64 local
        }
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target.result }));
        showToast('✓ Fotografía cargada correctamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    setCameraError(false);
    setShowCameraModal(true);
  };

  const handleTakeSnapshot = async () => {
    if (webcamRef.current) {
      try {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          const token = getAccessToken();
          if (token) {
            try {
              const blob = await fetch(screenshot).then(r => r.blob());
              const uploadData = new FormData();
              uploadData.append('file', blob, 'webcam_snap.jpg');
              const res = await uploadVehicleImageApi(uploadData);
              if (res?.image_url) {
                setFormData(prev => ({ ...prev, imageUrl: res.image_url }));
                setShowCameraModal(false);
                showToast('✓ Fotografía capturada y guardada en servidor.');
                return;
              }
            } catch {
              // Fallback a base64
            }
          }
          setFormData(prev => ({ ...prev, imageUrl: screenshot }));
          setShowCameraModal(false);
          showToast('✓ Fotografía capturada con éxito desde la cámara.');
          return;
        }
      } catch (err) {
        console.warn('Webcam capture error', err);
      }
    }
    const samplePhoto = getDefaultCarImage(formData.vehicle_type);
    setFormData(prev => ({ ...prev, imageUrl: samplePhoto }));
    setShowCameraModal(false);
    showToast('✓ Fotografía asignada.');
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    if (!formData.license_plate) return;
    let plateClean = formData.license_plate.toUpperCase().trim().replace(/\s/g,'');
    if (!plateClean.includes('-')) {
      if (plateClean.length === 6) {
        plateClean = plateClean.slice(0, 3) + '-' + plateClean.slice(3);
      } else if (plateClean.length === 7) {
        plateClean = plateClean.slice(0, 4) + '-' + plateClean.slice(4);
      }
    }
    const plateOk = /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/i.test(plateClean);
    if (!plateOk) { showToast('La placa debe incluir un guión obligatorio (ej: ABC-123 o 1234-AB)'); return; }

    setIsSaving(true);
    try {
      const typeClean = (formData.vehicle_type || 'auto').trim().toLowerCase();
      const brandClean = (formData.brand || '').trim() || 'Toyota';
      const modelClean = (formData.model || '').trim() || 'Corolla';
      const colorClean = (formData.color || '').trim() || 'Gris';
      const yearClean = (formData.year || '').trim() || '2023';
      let img = formData.imageUrl || getDefaultCarImage(typeClean);
      const plate = plateClean;
      
      const token = getAccessToken();
      if (token) {
        try {
          const created = await apiCreateVehicle({ 
            license_plate: plate, 
            vehicle_type: typeClean, 
            brand: brandClean, 
            model: modelClean, 
            color: colorClean, 
            year: yearClean, 
            notes: formData.notes || '',
            image_url: img
          });
          const newObj = { 
            id: created.id, 
            license_plate: created.license_plate, 
            vehicle_type: created.vehicle_type || typeClean, 
            brand: created.brand || brandClean, 
            model: created.model || modelClean, 
            color: created.color || colorClean, 
            year: created.year || yearClean,
            soat_expiry: formData.soat_expiry || '',
            notes: created.notes || formData.notes || '',
            isDefault: vehicles.length === 0, 
            imageUrl: created.image_url || img 
          };
          const updatedList = [newObj, ...vehicles];
          setVehicles(updatedList);
          try { localStorage.setItem(getVehiclesKey(), JSON.stringify(updatedList)); } catch {}
          window.dispatchEvent(new CustomEvent('smart_park_vehicles_updated', { detail: updatedList }));
          setShowAddModal(false);
          showToast(`✓ Vehículo ${newObj.license_plate} registrado con éxito.`);
          return;
        } catch (err) {
          const msg = err?.response?.data?.detail;
          const msgText = Array.isArray(msg) ? msg[0]?.msg : (typeof msg === 'string' ? msg : err.message);
          if (msgText?.includes('ya se encuentra')) { showToast('Esta placa ya se encuentra registrada en el sistema'); return; }
          showToast(`✕ Error al registrar vehículo: ${msgText || 'Revisa los datos ingresados'}`);
          return;
        }
      }
      const newObj = { 
        id: Date.now(), 
        license_plate: plate, 
        vehicle_type: typeClean, 
        brand: brandClean, 
        model: modelClean, 
        year: yearClean, 
        color: colorClean, 
        soat_expiry: formData.soat_expiry || '',
        notes: formData.notes || '',
        isDefault: vehicles.length === 0, 
        imageUrl: img, 
        user_id: 1 
      };
      const updated = [newObj, ...vehicles];
      setVehicles(updated);
      try { localStorage.setItem(getVehiclesKey(), JSON.stringify(updated)); } catch {}
      window.dispatchEvent(new CustomEvent('smart_park_vehicles_updated', { detail: updated }));
      setShowAddModal(false);
      showToast(`✓ Vehículo ${newObj.license_plate} registrado.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedVehicle) return;
    let plateClean = formData.license_plate.toUpperCase().trim().replace(/\s/g,'');
    if (!plateClean.includes('-')) {
      if (plateClean.length === 6) {
        plateClean = plateClean.slice(0, 3) + '-' + plateClean.slice(3);
      } else if (plateClean.length === 7) {
        plateClean = plateClean.slice(0, 4) + '-' + plateClean.slice(4);
      }
    }
    const plateOk = /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/i.test(plateClean);
    if (!plateOk) { showToast('La placa debe incluir un guión obligatorio (ej: ABC-123 o 1234-AB)'); return; }

    setIsSaving(true);
    try {
      const typeClean = (formData.vehicle_type || 'auto').trim().toLowerCase();
      const brandClean = (formData.brand || '').trim() || 'Toyota';
      const modelClean = (formData.model || '').trim() || 'Corolla';
      const colorClean = (formData.color || '').trim() || 'Gris';
      const yearClean = (formData.year || '').trim() || '2023';
      const plate = plateClean;
      const token = getAccessToken();

      let updatedObj = null;

      if (token && typeof selectedVehicle.id === 'number' && selectedVehicle.id < 1000000000000) {
        try {
          const updatedServer = await updateVehicleApi(selectedVehicle.id, {
            license_plate: plate,
            vehicle_type: typeClean,
            brand: brandClean,
            model: modelClean,
            color: colorClean,
            year: yearClean,
            notes: formData.notes || '',
            image_url: formData.imageUrl || selectedVehicle.imageUrl
          });
          updatedObj = {
            ...selectedVehicle,
            license_plate: updatedServer.license_plate,
            vehicle_type: updatedServer.vehicle_type,
            brand: updatedServer.brand,
            model: updatedServer.model,
            color: updatedServer.color,
            year: updatedServer.year || yearClean,
            soat_expiry: formData.soat_expiry !== undefined ? formData.soat_expiry : (selectedVehicle.soat_expiry || ''),
            notes: updatedServer.notes || formData.notes,
            imageUrl: updatedServer.image_url || formData.imageUrl || selectedVehicle.imageUrl
          };
        } catch (err) {
          console.warn('Update vehicle API warning:', err);
        }
      }

      if (!updatedObj) {
        updatedObj = {
          ...selectedVehicle,
          license_plate: plate,
          vehicle_type: typeClean,
          brand: brandClean,
          model: modelClean,
          year: yearClean,
          color: colorClean,
          soat_expiry: formData.soat_expiry !== undefined ? formData.soat_expiry : (selectedVehicle.soat_expiry || ''),
          notes: formData.notes,
          imageUrl: formData.imageUrl || selectedVehicle.imageUrl
        };
      }

      const updatedList = vehicles.map(v => v.id === selectedVehicle.id ? updatedObj : v);

      setVehicles(updatedList);
      try {
        localStorage.setItem(getVehiclesKey(), JSON.stringify(updatedList));
      } catch (err) {}
      window.dispatchEvent(new CustomEvent('smart_park_vehicles_updated', { detail: updatedList }));

      setShowEditModal(false);
      setSelectedVehicle(null);
      showToast(`✓ Vehículo ${updatedObj.license_plate} actualizado exitosamente.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, plate) => {
    if (!window.confirm(`¿Deseas eliminar el vehículo ${plate}?`)) return;
    const token = getAccessToken();
    if (token && typeof id === 'number' && id < 1000000000000) {
      try { await deleteVehicleApi(id); } catch (e) { console.warn('Delete backend fail', e.response?.data); }
    }
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    try {
      localStorage.setItem(getVehiclesKey(), JSON.stringify(updated));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('smart_park_vehicles_updated', { detail: updated }));
    showToast(`Vehículo ${plate} eliminado.`);
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch = 
      v.license_plate.toLowerCase().includes(search.toLowerCase()) ||
      (v.brand && v.brand.toLowerCase().includes(search.toLowerCase())) ||
      (v.model && v.model.toLowerCase().includes(search.toLowerCase())) ||
      (v.color && v.color.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'ALL' || (v.vehicle_type && v.vehicle_type.toLowerCase() === typeFilter.toLowerCase());
    return matchSearch && matchType;
  });

  const renderVehicleForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleSaveEdit : handleSaveCreate} className="space-y-4 my-1">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Vista Previa de la Placa Oficial Peruana */}
      {(() => {
        const plateConfig = getPeruvianPlateConfig(formData.vehicle_type, Boolean(formData.is_taxi));
        return (
          <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 transition-all">
            <div className="flex items-center justify-between w-full mb-2.5 px-1">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🇵🇪</span> Placa de Rodaje Oficial (MTC)
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${plateConfig.badgeColor}`}>
                {plateConfig.name}
              </span>
            </div>
            
            {/* Placa Metálica Estilizada Oficial MTC */}
            <div className={`relative w-64 sm:w-72 h-32 rounded-2xl border-[3.5px] border-slate-950 shadow-xl flex flex-col justify-between overflow-hidden select-none ${plateConfig.bodyBg} transition-colors duration-200 ring-1 ring-black/25 ring-inset`}>
              
              {/* Remaches de fijación metálicos en las 4 esquinas */}
              <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-inner flex items-center justify-center z-10">
                <div className="w-1 h-[1px] bg-slate-700 rotate-45" />
              </div>
              <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-inner flex items-center justify-center z-10">
                <div className="w-1 h-[1px] bg-slate-700 -rotate-45" />
              </div>
              <div className="absolute bottom-1.5 left-2 w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-inner flex items-center justify-center z-10">
                <div className="w-1 h-[1px] bg-slate-700 -rotate-45" />
              </div>
              <div className="absolute bottom-1.5 right-2 w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-inner flex items-center justify-center z-10">
                <div className="w-1 h-[1px] bg-slate-700 rotate-45" />
              </div>

              {/* Franja Superior Oficial */}
              <div className={`w-full h-8 ${plateConfig.headerBg} border-b-2 border-slate-950 flex items-center justify-between px-3 relative z-5 transition-colors duration-200`}>
                {/* Bandera del Perú (Rojo / Blanco / Rojo oficial) */}
                <div className="w-6 h-3.5 rounded-[2px] border border-slate-900/60 flex overflow-hidden shadow-xs shrink-0" title="República del Perú">
                  <div className="w-1/3 bg-[#d91023] h-full" />
                  <div className="w-1/3 bg-white h-full" />
                  <div className="w-1/3 bg-[#d91023] h-full" />
                </div>

                {/* Texto PERU centrado */}
                <span className="font-sans font-black tracking-[0.28em] text-xs sm:text-[13px] text-slate-950 uppercase leading-none pl-2 select-none">
                  PERU
                </span>

                {/* Holograma de Seguridad MTC */}
                <div className="w-7 h-3.5 rounded-[2px] bg-gradient-to-tr from-slate-200 via-white to-slate-300 border border-slate-500/80 flex items-center justify-center text-[6px] font-mono font-black text-slate-700 shadow-2xs tracking-tighter" title="Holograma MTC">
                  <span>MTC</span>
                </div>
              </div>

              {/* Número de Placa Central Troquelado */}
              <div className="flex-1 flex items-center justify-center px-4">
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-slate-950 uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] select-all">
                  {formData.license_plate || plateConfig.defaultPlate}
                </span>
              </div>

              {/* Pie de la Placa con número de serie y sello reflectante */}
              <div className="w-full flex items-center justify-between px-3 pb-1 text-[7px] font-mono font-bold text-slate-800">
                <span className="tracking-wider opacity-80">1234567</span>
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-400 to-cyan-400 opacity-80 border border-black/20 shadow-xs" title="Sello de Fabricación MTC" />
              </div>
            </div>

            {/* Modalidad de servicio para Autos: Particular vs Taxi */}
            {formData.vehicle_type === 'auto' && (
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 w-full justify-center">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Modalidad:</span>
                <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_taxi: false })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      !formData.is_taxi
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Particular (Blanca)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_taxi: true })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      formData.is_taxi
                        ? 'bg-[#ffcc00] text-slate-950 shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Taxi (Franja Amarilla)
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center font-medium">
              {plateConfig.categorySubtitle} · Formato según normativa MTC Perú
            </p>
          </div>
        );
      })()}

      {/* Input de Placa */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Placa Vehicular *
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {formData.vehicle_type === 'mototaxi' || formData.vehicle_type === 'moto'
              ? 'Ej: AB-1234 o 1234-5A'
              : 'Ej: ABC-123'}
          </span>
        </div>
        <Input
          type="text"
          placeholder={formData.vehicle_type === 'mototaxi' || formData.vehicle_type === 'moto' ? 'AB-1234 o 1234-5A' : 'ABC-123'}
          maxLength={9}
          value={formData.license_plate}
          onChange={(e) => {
            let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (!val.includes('-')) {
              if (formData.vehicle_type === 'mototaxi' || formData.vehicle_type === 'moto') {
                if (/^[A-Z]{2}[0-9]/.test(val) && val.length > 2) {
                  val = val.slice(0, 2) + '-' + val.slice(2);
                } else if (/^[0-9]{4}/.test(val) && val.length > 4) {
                  val = val.slice(0, 4) + '-' + val.slice(4);
                } else if (val.length > 3) {
                  val = val.slice(0, 3) + '-' + val.slice(3);
                }
              } else {
                if (val.length > 3) {
                  val = val.slice(0, 3) + '-' + val.slice(3);
                }
              }
            }
            setFormData({ ...formData, license_plate: val.slice(0, 9) });
          }}
          className="font-mono tracking-widest font-black text-center text-sm uppercase h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          required
        />
        {formData.license_plate && !/^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/.test(formData.license_plate.trim()) && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 text-center">
            Incluye un guión obligatorio (-) (ej: {formData.vehicle_type === 'mototaxi' || formData.vehicle_type === 'moto' ? 'AB-1234 o 1234-5A' : 'ABC-123'})
          </p>
        )}
      </div>

      {/* Selector Visual de Categorías */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
          Tipo de Vehículo *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VEHICLE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = formData.vehicle_type === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  const newCat = cat.id;
                  const newCatBrands = getBrandsForCategory(newCat);
                  const brandStillValid = newCatBrands.some(b => b.toLowerCase() === (formData.brand || '').toLowerCase());
                  const nextBrand = brandStillValid ? formData.brand : '';
                  const nextModels = brandStillValid ? getModelsForBrandAndCategory(nextBrand, newCat) : [];
                  const modelStillValid = brandStillValid && nextModels.some(m => m.model.toLowerCase() === (formData.model || '').toLowerCase());
                  setFormData(prev => ({
                    ...prev,
                    vehicle_type: newCat,
                    brand: nextBrand,
                    model: modelStillValid ? prev.model : '',
                    is_taxi: newCat === 'auto' ? prev.is_taxi : false,
                    imageUrl: (!prev.imageUrl || prev.imageUrl.includes('unsplash.com')) ? getDefaultCarImage(newCat) : prev.imageUrl
                  }));
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <span className="text-xs font-extrabold">{cat.label}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{cat.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Marca con chips rápidos adaptados por tipo de vehículo */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Marca
          </label>
          <span className="text-[10px] text-slate-400">
            {formData.vehicle_type === 'mototaxi' ? 'Marcas de Mototaxi' : 
             formData.vehicle_type === 'moto' ? 'Marcas de Moto' : 
             formData.vehicle_type === 'suv' ? 'Marcas de Camioneta / SUV' : 
             formData.vehicle_type === 'truck' ? 'Marcas de Camión' : 'Marcas de Auto'}
          </span>
        </div>
        <Input
          type="text"
          placeholder={
            formData.vehicle_type === 'mototaxi' ? 'Bajaj, TVS, Zongshen, Wanxin...' :
            formData.vehicle_type === 'moto' ? 'Honda, Yamaha, Bajaj, Suzuki, KTM...' :
            formData.vehicle_type === 'suv' ? 'Toyota, Hyundai, Ford, Kia, Jeep...' :
            formData.vehicle_type === 'truck' ? 'Toyota, Fuso, Hino, Isuzu, Hyundai...' :
            'Toyota, Hyundai, Nissan, Kia, Chevrolet...'
          }
          value={formData.brand}
          onChange={(e) => {
            const newBrand = e.target.value;
            setFormData(prev => {
              const modelsOfBrand = getModelsForBrandAndCategory(newBrand, prev.vehicle_type);
              const keepModel = !prev.model || modelsOfBrand.some(m => m.model.toLowerCase() === prev.model.toLowerCase());
              return {
                ...prev,
                brand: newBrand,
                model: keepModel ? prev.model : ''
              };
            });
            setShowModelSuggestions(true);
          }}
          className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {getBrandsForCategory(formData.vehicle_type).map(b => (
            <button
              key={b}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  brand: b,
                  model: prev.brand?.toLowerCase() === b.toLowerCase() ? prev.model : ''
                }));
                setShowModelSuggestions(true);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors border cursor-pointer ${
                formData.brand?.toLowerCase() === b.toLowerCase()
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Modelo y Año con Autocompletado Inteligente */}
      {(() => {
        const matchingModels = getModelsForBrandAndCategory(formData.brand, formData.vehicle_type, formData.model);
        return (
          <>
            <div className="grid grid-cols-2 gap-3 relative">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Modelo *
                  </label>
                  {formData.brand ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[130px]" title={`Solo modelos de ${formData.brand}`}>
                      Solo de {formData.brand}
                    </span>
                  ) : formData.model ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Sugerencias activas
                    </span>
                  ) : null}
                </div>
                <Input
                  type="text"
                  placeholder={
                    formData.brand
                      ? `Ej. Modelo de ${formData.brand}...`
                      : formData.vehicle_type === 'mototaxi'
                      ? 'Ej. Torito 4T, King Deluxe...'
                      : formData.vehicle_type === 'moto'
                      ? 'Ej. Pulsar NS 200, YBR 125...'
                      : formData.vehicle_type === 'suv'
                      ? 'Ej. RAV4, Tucson, Sportage...'
                      : 'Ej. Corolla, Elantra, Yaris...'
                  }
                  value={formData.model}
                  onFocus={() => setShowModelSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowModelSuggestions(false), 250)}
                  onChange={(e) => {
                    setFormData({ ...formData, model: e.target.value });
                    setShowModelSuggestions(true);
                  }}
                  className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />

                {/* Menú flotante de autocompletado en tiempo real */}
                {showModelSuggestions && matchingModels.length > 0 && (
                  <div 
                    className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="flex items-center justify-between px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                      <span>{formData.brand ? `Modelos de ${formData.brand}` : 'Modelos sugeridos'}</span>
                      <span>{matchingModels.length} opciones</span>
                    </div>
                    {matchingModels.map(({ model: m, brand: b }) => (
                      <button
                        key={`${b}-${m}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData(prev => ({
                            ...prev,
                            model: m,
                            brand: prev.brand || b
                          }));
                          setShowModelSuggestions(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-500 opacity-70 group-hover:opacity-100 shrink-0" />
                          <span>{m}</span>
                        </span>
                        <span className="text-[10px] font-mono font-normal text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          {b}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Año</label>
                <Input
                  type="text"
                  placeholder="2023"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="text-xs h-10 font-mono text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Chips de Modelos Frecuentes para Selección en 1 Clic */}
            {matchingModels.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {formData.brand ? `Modelos sugeridos de ${formData.brand}:` : 'Modelos populares sugeridos:'}
                  </span>
                  <span className="text-[10px] text-slate-400">1 toque</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingModels.slice(0, 6).map(({ model: m, brand: b }) => {
                    const isSelected = formData.model?.toLowerCase() === m.toLowerCase();
                    return (
                      <button
                        key={`chip-${b}-${m}`}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            model: m,
                            brand: prev.brand || b
                          }));
                          setShowModelSuggestions(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{m}</span>
                        {!formData.brand && (
                          <span className="text-[9px] opacity-70 font-normal">({b})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Color con paleta de swatches */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Color del Vehículo</label>
        <Input
          type="text"
          placeholder="Gris, Rojo, Azul..."
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mb-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_SWATCHES.map(sw => {
            const isSelected = formData.color?.toLowerCase() === sw.name.toLowerCase();
            const isLight = sw.name === 'Blanco' || sw.name === 'Amarillo' || sw.name === 'Gris Plata' || sw.name === 'Beige';
            return (
              <button
                key={sw.name}
                type="button"
                onClick={() => setFormData({ ...formData, color: sw.name })}
                title={sw.name}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  sw.border ? 'border border-slate-300 dark:border-slate-600' : ''
                } ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 opacity-85 hover:opacity-100'}`}
                style={{ backgroundColor: sw.hex }}
              >
                {isSelected && (
                  <Check className={`w-3.5 h-3.5 ${isLight ? 'text-slate-900' : 'text-white'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOAT */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Vencimiento de SOAT (Opcional)
          </span>
          <span className="text-[10px] text-slate-400 font-normal">Alerta preventiva de vigencia</span>
        </label>
        <Input
          type="date"
          value={formData.soat_expiry || ''}
          onChange={(e) => setFormData({ ...formData, soat_expiry: e.target.value })}
          className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        />
        {formData.soat_expiry && (() => {
          const s = getSoatStatus(formData.soat_expiry);
          return (
            <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
              s.status === 'expired' ? 'text-rose-600 dark:text-rose-400' : s.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              <span>{s.label}</span>
              {s.detail && <span className="text-slate-500 dark:text-slate-400 font-normal">· {s.detail}</span>}
            </p>
          );
        })()}
      </div>

      {/* Fotografía del Vehículo */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Fotografía del Vehículo
          </span>
          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            JPG / PNG / WEBP
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold gap-1.5 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Subir</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            className="text-xs font-bold gap-1.5 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tomar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchCarPhoto}
            disabled={loadingImage || !formData.brand || !formData.model}
            className="text-xs font-bold gap-1.5 h-9 bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl cursor-pointer disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loadingImage ? '...' : 'Oficial'}</span>
          </Button>
        </div>

        <div>
          <Input
            type="text"
            placeholder="URL de la imagen del vehículo..."
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            className="text-xs h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300"
          />
        </div>

        {formData.imageUrl && (
          <div className="h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group bg-slate-950">
            <img src={resolveImageUrl(formData.imageUrl)} alt="Vista previa del vehículo" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setFormData({ ...formData, imageUrl: '' })}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
              title="Quitar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Notas / Observaciones */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Notas / Observaciones</label>
        <textarea
          rows={2}
          placeholder="Ej. Vehículo de uso personal, color perlado..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors resize-none"
        />
      </div>

      {/* Botón Guardar / Actualizar con Loading */}
      <Button 
        type="submit" 
        disabled={isSaving}
        className="w-full font-extrabold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando vehículo...</span>
          </>
        ) : (
          <span>{isEdit ? 'Actualizar Vehículo' : 'Guardar Vehículo'}</span>
        )}
      </Button>
    </form>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Compacto y Limpio (Fondo Blanco/Oscuro, Sin Badges) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/80">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Mis Vehículos
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {vehicles.length} {vehicles.length === 1 ? 'vehículo registrado' : 'vehículos registrados'}.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleOpenAdd} 
          className="gap-1.5 font-bold text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo vehículo</span>
        </Button>
      </div>

      {/* Buscador y Filtros Compactos */}
      <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros Limpios sin Círculos ni Badges */}
        <div className="flex items-center space-x-1 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'suv', label: 'SUV' },
            { id: 'auto', label: 'Sedán' },
            { id: 'moto', label: 'Moto' }
          ].map(t => {
            const isSelected = typeFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold shadow-2xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Vehículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No se encontraron vehículos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {search ? 'No hay resultados para la búsqueda ingresada.' : 'No tienes vehículos registrados.'}
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Registrar Vehículo</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => {
            const carImg = v.imageUrl && !v.imageUrl.includes('photo-1549399542-7e3f8b79c341') 
              ? v.imageUrl 
              : getDefaultCarImage(v.vehicle_type);

            return (
              <div 
                key={v.id} 
                className="overflow-hidden border border-slate-200/90 dark:border-slate-800/90 rounded-2xl bg-white dark:bg-[#111827] flex flex-col justify-between shadow-2xs hover:shadow-md dark:shadow-black/50 transition-all duration-200"
              >
                <div>
                  {/* Foto con Encuadre Perfecto */}
                  <div className="h-48 bg-slate-100 dark:bg-slate-800/60 relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={resolveImageUrl(carImg)} 
                      alt={`${v.brand} ${v.model}`} 
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.target.src = getDefaultCarImage(v.vehicle_type);
                      }}
                    />
                  </div>

                  <div className="p-4 space-y-3.5">
                    {/* Marca, Modelo y Categoría */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                          {v.brand || 'Vehículo'} {v.model || ''}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {formatCategoryName(v.vehicle_type)} {v.year ? `• ${v.year}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {v.color || 'Gris'}
                        </span>
                      </div>
                    </div>

                    {/* Placa Estilo Matrícula */}
                    <div className="bg-slate-950 text-white font-mono py-2 px-3 rounded-xl border border-slate-800 flex items-center justify-between shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-sans font-semibold tracking-wider">
                        PERÚ
                      </span>
                      <span className="text-base font-black text-amber-400 tracking-widest font-mono">
                        {v.license_plate}
                      </span>
                      <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase">
                        {v.vehicle_type || 'Auto'}
                      </span>
                    </div>

                    {/* Alerta Preventiva de SOAT */}
                    {(() => {
                      const soat = getSoatStatus(v.soat_expiry);
                      return (
                        <div className={`py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-between border font-medium transition-colors ${
                          soat.status === 'expired'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : soat.status === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : soat.status === 'valid'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}>
                          <span className="font-bold flex items-center gap-1.5 text-[11px]">
                            {soat.status === 'valid' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {soat.label}
                          </span>
                          {soat.detail ? (
                            <span className="text-[10px] font-mono opacity-85">{soat.detail}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin registrar</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Observaciones si existen */}
                    {v.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                        <span className="font-semibold text-slate-600 dark:text-slate-300 not-italic">Nota: </span>
                        {v.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de Acciones */}
                <div className="px-4 pb-4 pt-0 flex items-center space-x-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  {!v.isDefault ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(v.id)}
                      className="h-8 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                      title="Marcar como vehículo predeterminado"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <div className="h-8 px-2.5 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-400" title="Vehículo predeterminado">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(v)}
                    className="flex-1 h-8 font-semibold text-xs gap-1.5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(v.id, v.license_plate)}
                    className="h-8 px-2.5 font-semibold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 rounded-xl cursor-pointer"
                    title="Eliminar vehículo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Nuevo Vehículo */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95vw] sm:max-w-lg rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#111827] shadow-2xl border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Registrar Vehículo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Datos para reconocimiento en garita y reserva de cupos.
            </DialogDescription>
          </DialogHeader>
          {renderVehicleForm(false)}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Vehículo */}
      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) setSelectedVehicle(null); }}>
          <DialogContent className="w-[95vw] sm:max-w-lg rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#111827] shadow-2xl border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Editar Vehículo</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Actualiza los datos del vehículo.
              </DialogDescription>
            </DialogHeader>
            {renderVehicleForm(true)}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Cámara en Vivo */}
      {showCameraModal && (
        <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
          <DialogContent className="max-w-md rounded-3xl p-5 bg-slate-950 text-white shadow-2xl border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Foto del Vehículo</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Enfoca la placa o vehículo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 h-64 flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center p-4 space-y-2">
                    <VideoOff className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">No se pudo acceder a la cámara</p>
                    <p className="text-[11px] text-slate-500">Revisa los permisos de cámara o sube un archivo.</p>
                  </div>
                ) : (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: cameraFacing }}
                      onUserMediaError={() => setCameraError(true)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                        className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md cursor-pointer transition-colors"
                        title="Cambiar Cámara"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCameraModal(false)}
                  className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl h-11 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={handleTakeSnapshot}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl h-11 text-xs gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Foto</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
