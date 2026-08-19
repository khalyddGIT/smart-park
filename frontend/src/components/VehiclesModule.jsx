import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

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

const VEHICLES_STORAGE_KEY = 'smart_park_vehicles_v2';

const INITIAL_VEHICLES = [
  { 
    id: 1, 
    license_plate: 'ABC-123', 
    vehicle_type: 'suv', 
    brand: 'Toyota', 
    model: 'RAV4', 
    year: '2022',
    color: 'Gris Metálico',
    isDefault: true,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'
  },
  { 
    id: 2, 
    license_plate: 'XYZ-987', 
    vehicle_type: 'auto', 
    brand: 'Honda', 
    model: 'Civic', 
    year: '2021',
    color: 'Negro Profundo',
    isDefault: false,
    imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800'
  },
  { 
    id: 3, 
    license_plate: 'AYC-501', 
    vehicle_type: 'auto', 
    brand: 'Toyota', 
    model: 'Corolla', 
    year: '2023',
    color: 'Blanco Perlado',
    isDefault: false,
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'
  },
];

export const VehiclesModule = () => {
  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem(VEHICLES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_VEHICLES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
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
    brand: '', 
    model: '', 
    year: '2023', 
    color: '', 
    imageUrl: '' 
  });
  const [notification, setNotification] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({ license_plate: '', vehicle_type: 'auto', brand: '', model: '', year: '2023', color: '', imageUrl: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (v) => {
    setSelectedVehicle(v);
    setFormData({
      license_plate: v.license_plate,
      vehicle_type: v.vehicle_type || 'auto',
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || '2023',
      color: v.color || '',
      imageUrl: v.imageUrl || ''
    });
    setShowEditModal(true);
  };

  const handleSetDefault = (id) => {
    const updated = vehicles.map(v => ({
      ...v,
      isDefault: v.id === id
    }));
    setVehicles(updated);
    showToast('Vehículo predeterminado actualizado para el reconocimiento automático.');
  };

  // Buscar foto en Car Imagery API
  const handleFetchCarPhoto = async () => {
    if (!formData.brand || !formData.model) {
      showToast('Ingresa la Marca y Modelo del vehículo primero.');
      return;
    }
    setLoadingImage(true);
    const photo = await fetchCarPhoto(formData.brand, formData.model, formData.year || '2023');
    setLoadingImage(false);

    if (photo) {
      setFormData(prev => ({ ...prev, imageUrl: photo }));
      showToast('✓ Fotografía oficial del modelo obtenida con éxito.');
    } else {
      const fallbackUrl = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
      setFormData(prev => ({ ...prev, imageUrl: fallbackUrl }));
      showToast('Foto referencial asignada.');
    }
  };

  const handleSaveCreate = (e) => {
    e.preventDefault();
    if (!formData.license_plate) return;

    let img = formData.imageUrl;
    if (!img) {
      img = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
    }

    const newObj = {
      id: Date.now(),
      license_plate: formData.license_plate.toUpperCase().trim(),
      vehicle_type: formData.vehicle_type,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year || '2023',
      color: formData.color.trim() || 'Blanco',
      isDefault: vehicles.length === 0,
      imageUrl: img,
      user_id: 1
    };

    const updated = [newObj, ...vehicles];
    setVehicles(updated);
    setShowAddModal(false);
    showToast(`✓ Vehículo ${newObj.license_plate} registrado y habilitado en ANPR.`);
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
      imageUrl: formData.imageUrl || selectedVehicle.imageUrl
    } : v);

    setVehicles(updated);
    setShowEditModal(false);
    showToast(`✓ Vehículo ${formData.license_plate} actualizado correctamente.`);
  };

  const handleDelete = (id, plate) => {
    if (!window.confirm(`¿Deseas eliminar el vehículo ${plate}?`)) return;
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

    const matchType = typeFilter === 'ALL' || v.vehicle_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shadow-xs">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Gestión de Mis Vehículos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra tus placas autorizadas para el acceso automático por reconocimiento ANPR en garitas.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleOpenAdd} 
          className="gap-2 font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Vehículo</span>
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículos Registrados</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              Activos para Reserva
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reconocimiento LPR / ANPR</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-emerald-700 font-mono">100% HABILITADO</span>
            <span className="text-xs text-slate-400">Apertura automática</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículo Predeterminado</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-slate-900 font-mono">
              {vehicles.find(v => v.isDefault)?.license_plate || 'Ninguno'}
            </span>
            <span className="text-xs text-amber-700 font-bold">Principal</span>
          </div>
        </Card>
      </div>

      {/* Buscador y Filtros */}
      <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col md:flex-row items-center justify-between gap-3">
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
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✕</button>
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
      </Card>

      {/* Grid de Vehículos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((v) => (
          <Card key={v.id} className="overflow-hidden border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition rounded-3xl bg-white group">
            <div>
              {/* Foto del Vehículo */}
              <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={v.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'} 
                  alt={`${v.brand} ${v.model}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
                  }}
                />
                
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-emerald-400 border border-slate-700">
                  ANPR ACTIVO
                </div>

                {v.isDefault && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>PREDETERMINADO</span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                {/* Placa Estilo Matrícula Oficial */}
                <div className="bg-slate-950 text-white font-mono p-3 rounded-2xl text-center shadow-inner border border-slate-800 flex items-center justify-between px-4">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-widest">🇵🇪 PERÚ</span>
                  <span className="text-xl font-black text-amber-400 tracking-widest">{v.license_plate}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
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
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="px-5 pb-5 pt-0 flex items-center space-x-2 border-t border-slate-100 pt-3">
              {!v.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetDefault(v.id)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl h-9"
                  title="Marcar como vehículo predeterminado"
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(v)}
                className="flex-1 font-bold text-xs gap-1.5 text-slate-700 hover:bg-slate-100 rounded-xl h-9"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Editar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(v.id, v.license_plate)}
                className="font-bold text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl h-9 px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Crear Vehículo */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Registrar Nuevo Vehículo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos para habilitar el reconocimiento automático en garitas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCreate} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Placa Vehicular *</label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                className="font-mono tracking-widest font-black text-center text-sm uppercase h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Marca *</label>
                <Input
                  type="text"
                  placeholder="Toyota"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="text-xs h-10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Modelo *</label>
                <Input
                  type="text"
                  placeholder="Corolla"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="text-xs h-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Año</label>
                <Input
                  type="text"
                  placeholder="2023"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="text-xs h-10 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                <Input
                  type="text"
                  placeholder="Gris Plata"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="text-xs h-10"
                />
              </div>
            </div>

            {/* Consulta de Foto */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Foto Oficial del Modelo
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchCarPhoto}
                  disabled={loadingImage || !formData.brand || !formData.model}
                  className="text-xs h-7 gap-1 text-emerald-700 border-emerald-300 rounded-lg"
                >
                  <Search className="w-3 h-3" />
                  <span>{loadingImage ? 'Consultando...' : 'Obtener Foto'}</span>
                </Button>
              </div>

              {formData.imageUrl && (
                <div className="h-28 rounded-xl overflow-hidden border border-slate-300 relative">
                  <img src={formData.imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Vehículo</label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="auto">Automóvil / Sedán</option>
                <option value="suv">Camioneta / SUV</option>
                <option value="moto">Motocicleta</option>
                <option value="truck">Camión / Furgón</option>
              </select>
            </div>

            <Button type="submit" className="w-full font-bold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
              Guardar Vehículo
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Editar Vehículo</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Modifica los datos del vehículo registrado.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 my-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Placa Vehicular *</label>
                <Input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  className="font-mono tracking-widest font-black text-center text-sm uppercase h-10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
                  <Input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="text-xs h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                  <Input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Año</label>
                  <Input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="text-xs h-10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="text-xs h-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full font-bold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                Actualizar Vehículo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
