import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Plus, Car, Trash2, Edit3, Search, ShieldCheck, Check, Sparkles, Image as ImageIcon, ExternalLink } from 'lucide-react';
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
    imageUrl: 'http://www.regcheck.org.uk/image.aspx/@VG95b3RhIFJBVjQgMjAyMg=='
  },
  { 
    id: 2, 
    license_plate: 'XYZ-987', 
    vehicle_type: 'auto', 
    brand: 'Honda', 
    model: 'Civic', 
    year: '2021',
    color: 'Negro',
    imageUrl: 'http://www.regcheck.org.uk/image.aspx/@SG9uZGEgQ2l2aWMgMjAyMQ=='
  },
  { 
    id: 3, 
    license_plate: 'AYC-501', 
    vehicle_type: 'auto', 
    brand: 'Toyota', 
    model: 'Corolla', 
    year: '2022',
    color: 'Blanco Perlado',
    imageUrl: 'http://www.regcheck.org.uk/image.aspx/@VG95b3RhIENvcm9sbGEgMjAyMg=='
  },
];

export const VehiclesModule = () => {
  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem(VEHICLES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({ 
    license_plate: '', 
    vehicle_type: 'auto', 
    brand: '', 
    model: '', 
    year: '2022', 
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
    setFormData({ license_plate: '', vehicle_type: 'auto', brand: '', model: '', year: '2022', color: '', imageUrl: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (v) => {
    setSelectedVehicle(v);
    setFormData({
      license_plate: v.license_plate,
      vehicle_type: v.vehicle_type || 'auto',
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || '2022',
      color: v.color || '',
      imageUrl: v.imageUrl || ''
    });
    setShowEditModal(true);
  };

  // Buscar foto en Car Imagery API cuando el usuario ingresa Marca + Modelo
  const handleFetchCarPhoto = async () => {
    if (!formData.brand || !formData.model) {
      showToast('Ingresa la Marca y Modelo del vehículo primero.');
      return;
    }
    setLoadingImage(true);
    const photo = await fetchCarPhoto(formData.brand, formData.model, formData.year || '2022');
    setLoadingImage(false);

    if (photo) {
      setFormData(prev => ({ ...prev, imageUrl: photo }));
      showToast('Fotografía oficial del vehículo cargada desde Car Imagery API.');
    } else {
      // Fallback base64 url
      const fallbackUrl = `http://www.regcheck.org.uk/image.aspx/@${btoa(`${formData.brand} ${formData.model} ${formData.year || '2022'}`)}`;
      setFormData(prev => ({ ...prev, imageUrl: fallbackUrl }));
      showToast('Foto referencial generada.');
    }
  };

  const handleSaveCreate = (e) => {
    e.preventDefault();
    if (!formData.license_plate) return;

    let img = formData.imageUrl;
    if (!img && formData.brand && formData.model) {
      img = `http://www.regcheck.org.uk/image.aspx/@${btoa(`${formData.brand} ${formData.model} ${formData.year || '2022'}`)}`;
    }

    const newObj = {
      id: Date.now(),
      license_plate: formData.license_plate.toUpperCase().trim(),
      vehicle_type: formData.vehicle_type,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year || '2022',
      color: formData.color.trim() || 'Blanco',
      imageUrl: img,
      user_id: 1
    };

    const updated = [newObj, ...vehicles];
    setVehicles(updated);
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setShowAddModal(false);
    showToast(`Vehículo ${newObj.license_plate} registrado con éxito.`);
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
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setShowEditModal(false);
    showToast(`Vehículo ${formData.license_plate} actualizado.`);
  };

  const handleDelete = (id, plate) => {
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    showToast(`Vehículo ${plate} eliminado del sistema.`);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.license_plate.toLowerCase().includes(search.toLowerCase()) ||
    (v.brand && v.brand.toLowerCase().includes(search.toLowerCase())) ||
    (v.model && v.model.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Car className="w-7 h-7 text-emerald-600" />
            <span>Gestión de Mis Vehículos</span>
          </h1>
          <p className="text-xs text-slate-500">
            Registro con reconocimiento de modelo y fotografía oficial mediante Car Imagery API.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por placa o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs w-64 rounded-2xl"
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            <span>Nuevo Vehículo</span>
          </Button>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((v) => (
          <Card key={v.id} className="overflow-hidden border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition group bg-white">
            <div>
              {/* Fotografía Real del Vehículo vía Car Imagery API */}
              <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {v.imageUrl ? (
                  <img 
                    src={v.imageUrl} 
                    alt={`${v.brand} ${v.model}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Car className="w-12 h-12 mb-1 opacity-40" />
                    <span className="text-[10px] font-mono">Sin foto del modelo</span>
                  </div>
                )}
                
                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-emerald-400 border border-slate-700">
                  ANPR ACTIVO
                </div>
              </div>

              <div className="p-5">
                <div className="bg-slate-900 text-white font-mono p-3 rounded-2xl text-center mb-3 shadow-inner border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-widest">Placa Registrada</span>
                  <span className="text-xl font-black text-amber-400 tracking-widest">{v.license_plate}</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-4">
                  <p className="flex justify-between">
                    <span className="text-slate-400 font-bold">Vehículo:</span>
                    <span className="font-extrabold text-slate-900">{v.brand || '—'} {v.model || ''} {v.year ? `(${v.year})` : ''}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400 font-bold">Tipo:</span>
                    <span className="font-medium text-slate-700 capitalize">{v.vehicle_type || 'Auto'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400 font-bold">Color:</span>
                    <span className="font-medium text-slate-700">{v.color || 'No especificado'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-0 flex items-center space-x-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(v)}
                className="flex-1 font-bold text-xs gap-1.5 text-slate-700 hover:bg-slate-100"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(v.id, v.license_plate)}
                className="font-bold text-xs gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Crear Vehículo con API Car Imagery */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Registrar Nuevo Vehículo</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa los datos y consulta la foto oficial del modelo.
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
                className="font-mono tracking-widest font-black text-center text-sm uppercase"
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
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Año de Fabricación</label>
                <Input
                  type="text"
                  placeholder="2022"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                <Input
                  type="text"
                  placeholder="Gris Plata"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            {/* Botón para consultar Car Imagery API */}
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
                  className="text-xs h-7 gap-1 text-emerald-700 border-emerald-300"
                >
                  <Search className="w-3 h-3" />
                  <span>{loadingImage ? 'Consultando API...' : 'Obtener Foto API'}</span>
                </Button>
              </div>

              {formData.imageUrl && (
                <div className="h-28 rounded-xl overflow-hidden border border-slate-300 relative">
                  <img src={formData.imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[9px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-md">
                    CarImagery API
                  </span>
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
                <option value="pmr">Vehículo Inclusivo (PMR)</option>
              </select>
            </div>

            <Button type="submit" className="w-full font-bold py-5 bg-emerald-600 hover:bg-emerald-700 text-white">
              Guardar Vehículo
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Editar Vehículo</DialogTitle>
              <DialogDescription className="text-xs">
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
                  className="font-mono tracking-widest font-black text-center text-sm uppercase"
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
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                  <Input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full font-bold py-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                Actualizar Vehículo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
