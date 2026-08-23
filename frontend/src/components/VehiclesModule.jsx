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
  VideoOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { listVehicles, createVehicle as apiCreateVehicle, deleteVehicleApi, getAccessToken } from '../services/api';

// Función para consultar la API de Car Imagery y obtener foto real del modelo
export const fetchCarPhoto = async (brand, model, year = '2022') => {
  if (!brand || !model) return null;
  try {
    const searchTerm = encodeURIComponent(`${brand} ${model} ${year}`.trim());
    const res = await fetch(`https://www.carimagery.com/api.asmx/GetImageUrl?searchTerm=${searchTerm}`);
    if (res.ok) {
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const url = xmlDoc.getElementsByTagName("string")[0]?.textContent;
      if (url && url.startsWith("http") && !url.includes("error")) {
        return url;
      }
    }
  } catch {
    // Retornar fallback si hay error de red/CORS
  }
  return null;
};

const VEHICLES_STORAGE_KEY_BASE = 'smart_park_vehicles_v2';
const getVehiclesKey = () => {
  try {
    const saved = localStorage.getItem('smart_park_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      return `${VEHICLES_STORAGE_KEY_BASE}_${u?.id || u?.email || 'guest'}`;
    }
  } catch {}
  return `${VEHICLES_STORAGE_KEY_BASE}_guest`;
};

const COLOR_PALETTE = ['Negro', 'Blanco', 'Gris Plata', 'Rojo', 'Azul', 'Verde', 'Beige'];

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

  // Sincronización Supabase: si hay token, traer del backend
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
            notes: v.notes || '',
            isDefault: false, 
            imageUrl: v.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800' 
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
      if (!key.endsWith('_guest')) {
        localStorage.setItem(key, JSON.stringify(vehicles));
      }
    } catch (e) {}
  }, [vehicles]);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({ 
    license_plate: '', 
    vehicle_type: 'suv', 
    brand: '', 
    model: '', 
    year: '2023', 
    color: 'Gris', 
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
    notes: ''
  });
  const [notification, setNotification] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({ 
      license_plate: '', 
      vehicle_type: 'suv', 
      brand: '', 
      model: '', 
      year: '2023', 
      color: 'Gris', 
      imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (v) => {
    setSelectedVehicle(v);
    setFormData({
      license_plate: v.license_plate,
      vehicle_type: v.vehicle_type || 'suv',
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || '2023',
      color: v.color || 'Gris',
      imageUrl: v.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
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
    const photo = await fetchCarPhoto(formData.brand, formData.model, formData.year || '2023');
    setLoadingImage(false);

    if (photo) {
      setFormData(prev => ({ ...prev, imageUrl: photo }));
      showToast('✓ Fotografía oficial obtenida.');
    } else {
      const fallbackUrl = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
      setFormData(prev => ({ ...prev, imageUrl: fallbackUrl }));
      showToast('Foto referencial asignada.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleTakeSnapshot = () => {
    if (webcamRef.current) {
      try {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          setFormData(prev => ({ ...prev, imageUrl: screenshot }));
          setShowCameraModal(false);
          showToast('✓ Fotografía capturada con éxito desde la cámara.');
          return;
        }
      } catch (err) {
        console.warn('Webcam capture error', err);
      }
    }
    const samplePhoto = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800';
    setFormData(prev => ({ ...prev, imageUrl: samplePhoto }));
    setShowCameraModal(false);
    showToast('✓ Fotografía asignada.');
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    if (!formData.license_plate) return;
    let img = formData.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
    const plate = formData.license_plate.toUpperCase().trim();
    
    const token = getAccessToken();
    if (token) {
      try {
        const created = await apiCreateVehicle({ 
          license_plate: plate, 
          vehicle_type: formData.vehicle_type, 
          brand: formData.brand.trim(), 
          model: formData.model.trim(), 
          color: formData.color.trim() || 'Gris' 
        });
        const newObj = { 
          id: created.id, 
          license_plate: created.license_plate, 
          vehicle_type: created.vehicle_type, 
          brand: created.brand, 
          model: created.model, 
          color: created.color, 
          year: formData.year || '2023',
          notes: formData.notes,
          isDefault: vehicles.length === 0, 
          imageUrl: img 
        };
        setVehicles(prev => [newObj, ...prev]);
        setShowAddModal(false);
        showToast(`✓ Vehículo ${newObj.license_plate} registrado con éxito.`);
        return;
      } catch (err) {
        const msg = err?.response?.data?.detail || err.message;
        if (msg?.includes('ya se encuentra')) { showToast('Placa ya registrada en sistema'); return; }
        console.warn('Fallback localStorage', msg);
      }
    }
    const newObj = { 
      id: Date.now(), 
      license_plate: plate, 
      vehicle_type: formData.vehicle_type, 
      brand: formData.brand.trim(), 
      model: formData.model.trim(), 
      year: formData.year || '2023', 
      color: formData.color.trim() || 'Gris', 
      notes: formData.notes,
      isDefault: vehicles.length === 0, 
      imageUrl: img, 
      user_id: 1 
    };
    const updated = [newObj, ...vehicles];
    setVehicles(updated);
    setShowAddModal(false);
    showToast(`✓ Vehículo ${newObj.license_plate} registrado.`);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const updated = vehicles.map(v => v.id === selectedVehicle.id ? {
      ...v,
      license_plate: formData.license_plate.toUpperCase().trim(),
      vehicle_type: formData.vehicle_type,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year,
      color: formData.color.trim(),
      notes: formData.notes,
      imageUrl: formData.imageUrl || selectedVehicle.imageUrl
    } : v);

    setVehicles(updated);
    setShowEditModal(false);
    showToast(`✓ Vehículo ${formData.license_plate} actualizado.`);
  };

  const handleDelete = async (id, plate) => {
    if (!window.confirm(`¿Deseas eliminar el vehículo ${plate}?`)) return;
    const token = getAccessToken();
    if (token && typeof id === 'number' && id < 1000000000000) {
      try { await deleteVehicleApi(id); } catch (e) { console.warn('Delete backend fail', e.response?.data); }
    }
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
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

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Placa Vehicular *</label>
        <Input
          type="text"
          placeholder="ABC-123"
          value={formData.license_plate}
          onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
          className="font-mono tracking-widest font-black text-center text-sm uppercase h-10 bg-white border-slate-200"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
          <Input
            type="text"
            placeholder="Toyota"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="text-xs h-10 bg-white border-slate-200"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
          <Input
            type="text"
            placeholder="RAV4"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="text-xs h-10 bg-white border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
          <select
            value={formData.vehicle_type}
            onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 h-10 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
          >
            <option value="suv">Camioneta SUV</option>
            <option value="auto">Automóvil / Sedán</option>
            <option value="moto">Motocicleta</option>
            <option value="truck">Camión / Furgón</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Año</label>
          <Input
            type="text"
            placeholder="2023"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            className="text-xs h-10 font-mono text-center bg-white border-slate-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Color del Vehículo</label>
        <Input
          type="text"
          placeholder="Gris"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="text-xs h-10 bg-white border-slate-200 mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PALETTE.map(c => (
            <button
              type="button"
              key={c}
              onClick={() => setFormData({ ...formData, color: c })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                formData.color === c 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
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
            className="text-xs font-bold gap-1.5 h-9 bg-white border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Subir</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            className="text-xs font-bold gap-1.5 h-9 bg-white border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Tomar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchCarPhoto}
            disabled={loadingImage || !formData.brand || !formData.model}
            className="text-xs font-bold gap-1.5 h-9 bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
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
            className="text-xs h-8 bg-white border-slate-200 font-mono text-slate-600"
          />
        </div>

        {formData.imageUrl && (
          <div className="h-28 rounded-xl overflow-hidden border border-slate-200 relative group bg-slate-950">
            <img src={formData.imageUrl} alt="Vista previa del vehículo" className="w-full h-full object-cover" />
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

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Observaciones</label>
        <textarea
          rows={2}
          placeholder="Ej. Vehículo de uso personal, color perlado..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 transition-colors resize-none"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full font-extrabold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer transition-colors"
      >
        {isEdit ? 'Actualizar Vehículo' : 'Guardar Vehículo'}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-bottom-5">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Gestión de Mis Vehículos
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black uppercase">
                  ANPR Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Placas vehiculares registradas para ingreso automatizado por lectura óptica en todas las sedes y garitas inteligentes.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleOpenAdd} 
            className="gap-2 font-black text-xs rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 h-11 px-5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Registrar Nuevo Vehículo</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Vehículos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Habilitados
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Listos para reserva y acceso</p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reconocimiento LPR</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-lg font-black text-emerald-700 font-mono">100% OPERATIVO</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Garitas
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Apertura automática sin ticket físico</p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículo Principal</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 font-mono tracking-wider">
              {vehicles.find(v => v.isDefault)?.license_plate || 'Ninguno'}
            </span>
            <span className="text-xs text-amber-700 font-extrabold">Predeterminado</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Prioridad en reservas automáticas</p>
        </div>

      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 bg-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-2xl bg-slate-50/80 border-slate-200/90 text-xs font-semibold placeholder:text-slate-400 focus:bg-white"
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Categoría */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todos', count: vehicles.length },
            { id: 'suv', label: 'SUV', count: vehicles.filter(v => (v.vehicle_type || '').toLowerCase() === 'suv').length },
            { id: 'auto', label: 'Sedán', count: vehicles.filter(v => (v.vehicle_type || '').toLowerCase() === 'auto').length },
            { id: 'moto', label: 'Moto', count: vehicles.filter(v => (v.vehicle_type || '').toLowerCase() === 'moto').length }
          ].map(t => {
            const isSelected = typeFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-900 text-white font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Vehículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Car className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">No se encontraron vehículos</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'No hay vehículos que coincidan con los términos de búsqueda.' : 'Aún no has registrado ningún vehículo en tu cuenta.'}
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primer Vehículo</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <div 
              key={v.id} 
              className={`overflow-hidden border transition-all duration-300 rounded-3xl bg-white flex flex-col justify-between group hover:shadow-xl hover:-translate-y-0.5 ${
                v.isDefault ? 'border-amber-400/80 shadow-md ring-2 ring-amber-400/20' : 'border-slate-200/90 shadow-xs'
              }`}
            >
              <div>
                {/* Foto del Vehículo con Overlay */}
                <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src={v.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'} 
                    alt={`${v.brand} ${v.model}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                    }}
                  />
                  
                  {/* Gradiente en la parte inferior de la imagen */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />

                  {/* ANPR Status Tag */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>LPR ACTIVO</span>
                  </div>

                  {/* Tag Predeterminado */}
                  {v.isDefault && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                      <span>PRINCIPAL</span>
                    </div>
                  )}

                  {/* Nombre y Modelo superpuesto sobre la foto */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-tech">
                      {v.vehicle_type === 'suv' ? 'Camioneta SUV' : v.vehicle_type === 'moto' ? 'Motocicleta' : v.vehicle_type === 'truck' ? 'Camión' : 'Automóvil'}
                    </span>
                    <h3 className="text-base font-black text-white tracking-tight truncate drop-shadow-sm">
                      {v.brand || 'Vehículo'} {v.model || ''} {v.year ? `(${v.year})` : ''}
                    </h3>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Placa Estilo Matrícula Oficial Peruana con Relieve */}
                  <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-800 p-3 shadow-inner text-white">
                    {/* Tornillos de fijación decorativos */}
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500/80 shadow-xs" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500/80 shadow-xs" />
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500/80 shadow-xs" />
                    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500/80 shadow-xs" />

                    <div className="flex items-center justify-between px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs">🇵🇪</span>
                        <span className="text-[10px] font-extrabold text-slate-300 font-sans tracking-widest">PERÚ</span>
                      </div>
                      
                      <div className="font-mono text-xl font-black tracking-[0.22em] text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {v.license_plate}
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-mono font-bold text-emerald-400">SYNC</span>
                      </div>
                    </div>
                  </div>

                  {/* Ficha Técnica Compacta */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Color</span>
                      <span className="font-extrabold text-slate-800 truncate block mt-0.5">
                        {v.color || 'Gris'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Año Modelo</span>
                      <span className="font-extrabold text-slate-800 font-mono block mt-0.5">
                        {v.year || '2023'}
                      </span>
                    </div>
                    {v.notes && (
                      <div className="col-span-2 pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Observaciones</span>
                        <p className="text-[11px] text-slate-600 italic mt-0.5 line-clamp-2">
                          "{v.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex items-center space-x-2 border-t border-slate-100 pt-3.5">
                {!v.isDefault ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(v.id)}
                    className="h-10 px-3 font-bold text-xs text-slate-600 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50 rounded-xl transition-colors cursor-pointer"
                    title="Marcar como vehículo principal"
                  >
                    <Star className="w-4 h-4 shrink-0" />
                  </Button>
                ) : (
                  <div className="h-10 px-3 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700" title="Vehículo principal">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(v)}
                  className="flex-1 h-10 font-extrabold text-xs gap-1.5 text-slate-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/50 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Editar Ficha</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(v.id, v.license_plate)}
                  className="h-10 px-3.5 font-bold text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300 border-rose-100 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar vehículo"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Registrar Nuevo Vehículo */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Registrar Nuevo Vehículo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos para habilitar el reconocimiento automático en garitas.
            </DialogDescription>
          </DialogHeader>
          {renderVehicleForm(false)}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Vehículo */}
      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200 max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900">Editar Vehículo</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Modifica y actualiza la información completa de tu vehículo.
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
                <span>Capturar Fotografía del Vehículo</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Apunta la cámara a tu vehículo o placa y presiona capturar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 h-64 flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center p-4 space-y-2">
                    <VideoOff className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">No se pudo acceder a la cámara</p>
                    <p className="text-[11px] text-slate-500">Verifica los permisos de cámara en tu navegador o sube una foto desde tu dispositivo.</p>
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
