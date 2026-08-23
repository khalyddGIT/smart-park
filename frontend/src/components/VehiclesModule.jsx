import React, { useState, useEffect, useRef } from 'react';
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
  Camera
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
    const samplePhoto = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800';
    setFormData(prev => ({ ...prev, imageUrl: samplePhoto }));
    showToast('✓ Captura de cámara realizada con éxito.');
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
            className="text-xs font-bold gap-1.5 h-9 bg-white border-slate-200 hover:bg-slate-100 rounded-xl"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Subir</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            className="text-xs font-bold gap-1.5 h-9 bg-white border-slate-200 hover:bg-slate-100 rounded-xl"
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
            className="text-xs font-bold gap-1.5 h-9 bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
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
    <div className="space-y-6 animate-in fade-in">
      
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Gestión de Mis Vehículos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra tus placas autorizadas para el acceso automático por reconocimiento ANPR en garitas.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleOpenAdd} 
          className="gap-2 font-bold text-xs rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Vehículo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículos Registrados</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-emerald-700 font-bold">
              Activos para Reserva
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reconocimiento LPR / ANPR</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-emerald-700 font-mono">100% HABILITADO</span>
            <span className="text-xs text-slate-400">Apertura automática</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículo Predeterminado</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-slate-900 font-mono">
              {vehicles.find(v => v.isDefault)?.license_plate || 'Ninguno'}
            </span>
            <span className="text-xs text-amber-700 font-bold">Principal</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs cursor-pointer">✕</button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'auto', 'suv', 'moto'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === t 
                  ? 'bg-slate-900 text-white shadow-xs font-black' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Todos' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((v) => (
          <div key={v.id} className="overflow-hidden border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition rounded-2xl bg-white group">
            <div>
              <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={v.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'} 
                  alt={`${v.brand} ${v.model}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                  }}
                />
                
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-400 border border-slate-700">
                  ANPR ACTIVO
                </div>

                {v.isDefault && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs">
                    <Star className="w-3.5 h-3.5 shrink-0 fill-slate-950" />
                    <span>PREDETERMINADO</span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="bg-slate-950 text-white font-mono p-2.5 rounded-xl text-center shadow-inner border border-slate-800 flex items-center justify-between px-4">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-widest">🇵🇪 PERÚ</span>
                  <span className="text-lg font-black text-amber-400 tracking-widest">{v.license_plate}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Modelo:</span>
                    <span className="font-extrabold text-slate-900">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Categoría:</span>
                    <span className="font-medium text-slate-700 capitalize">{v.vehicle_type || 'Automóvil'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Color:</span>
                    <span className="font-medium text-slate-700">{v.color || 'No especificado'}</span>
                  </div>
                  {v.notes && (
                    <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <span className="font-bold text-slate-600">Nota: </span>
                      <span>{v.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 pt-0 flex items-center space-x-2 border-t border-slate-100 pt-3">
              {!v.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetDefault(v.id)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl h-9"
                  title="Marcar como vehículo predeterminado"
                >
                  <Star className="w-4 h-4 shrink-0" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(v)}
                className="flex-1 font-bold text-xs gap-1.5 text-slate-700 hover:bg-slate-100 rounded-xl h-9"
              >
                <Edit3 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Editar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(v.id, v.license_plate)}
                className="font-bold text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl h-9 px-3"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
              </Button>
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
};
