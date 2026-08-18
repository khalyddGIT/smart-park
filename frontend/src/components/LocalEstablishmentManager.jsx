import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  ShieldCheck, 
  Layers, 
  Check, 
  Search, 
  ArrowLeft,
  Settings2,
  Sparkles,
  Umbrella,
  Accessibility,
  Bike,
  Crown,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { InteractiveFloorPlanDrawingStudio } from './InteractiveFloorPlanDrawingStudio';
import { useEstablishments } from '../context/EstablishmentContext';

export const LocalEstablishmentManager = ({ masterElements, onMasterSavePlan }) => {
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    updateEstablishmentPlan, 
    deleteEstablishment, 
    resetToDefaults 
  } = useEstablishments();

  const [search, setSearch] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('list'); // 'list' | 'viewer_2d' | 'editor_cad'
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [currentPlanElements, setCurrentPlanElements] = useState([]);
  
  // Modales CRUD
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    status: 'Operativo'
  });
  const [notification, setNotification] = useState(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Abrir Modal Crear
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      address: 'Portal Unión 42, Huamanga',
      level: 'Nivel 1 - Superficie',
      rate: 5.00,
      status: 'Operativo'
    });
    setShowAddModal(true);
  };

  // Abrir Modal Editar Ficha
  const handleOpenEdit = (est) => {
    setSelectedEstablishment(est);
    setFormData({
      name: est.name,
      address: est.address,
      level: est.level,
      rate: est.rate,
      status: est.status
    });
    setShowEditModal(true);
  };

  // Guardar Nuevo Establecimiento
  const handleSaveAdd = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Plantilla inicial completa para el nuevo establecimiento
    const defaultNewElements = [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 60, y: 280, w: 980, h: 120, rot: 0, label: 'CARRIL VIAL PRINCIPAL' },
      { id: 6, type: 'crosswalk', x: 520, y: 280, w: 80, h: 120, rot: 0 },
      { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'GARITA ANPR' },
      { id: 10, type: 'slot', code: 'A-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 435, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
      { id: 15, type: 'slot', code: 'A-06', slotType: 'moto', x: 525, y: 70, w: 50, h: 140, rot: 0, status: 'free' },
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', shaded: true, x: 165, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 250, y: 470, w: 75, h: 140, rot: 0, status: 'free' }
    ];

    const newEst = {
      id: `EST-${Math.floor(10 + Math.random() * 90)}`,
      name: formData.name,
      address: formData.address,
      city: 'Ayacucho - Huamanga',
      level: formData.level,
      rate: Number(formData.rate) || 5.00,
      totalSlots: 9,
      pmrSlots: 1,
      status: formData.status,
      owner: 'Administración Local Huamanga',
      commission: '12%',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
      elements: defaultNewElements
    };

    addEstablishment(newEst);
    setShowAddModal(false);
    showToast(`Sede "${newEst.name}" creada y sincronizada para todos los roles.`);
  };

  // Guardar Edición de Ficha
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedEstablishment) return;

    const updated = {
      name: formData.name,
      address: formData.address,
      level: formData.level,
      rate: Number(formData.rate) || 5.00,
      status: formData.status
    };

    updateEstablishment(selectedEstablishment.id, updated);
    setShowEditModal(false);
    showToast(`Datos de "${formData.name}" actualizados exitosamente.`);
  };

  // Eliminar Establecimiento
  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro de "${name}"?`)) return;
    deleteEstablishment(id);
    showToast(`Sede "${name}" eliminada.`);
  };

  // Abrir Visualizador o Editor de Plano
  const handleOpenPlan = (est, mode) => {
    setSelectedEstablishment(est);
    setCurrentPlanElements(est.elements || []);
    setActiveViewMode(mode);
  };

  // Guardar Plano Editado en CAD
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
    est.level.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* VISTA 1: LISTADO PRINCIPAL CRUD */}
      {activeViewMode === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-7 h-7 text-emerald-600" />
                <span>Gestión de Sedes & Planos Topográficos</span>
              </h1>
              <p className="text-xs text-slate-500">
                Padrón oficial de estacionamientos en Ayacucho (Huamanga), asignación de tarifas y diseño de planos topográficos sincronizados.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleOpenAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nueva Sede / Nivel</span>
              </Button>
            </div>
          </div>

          {/* Barra de Búsqueda & Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-3 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre de local, dirección o nivel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-slate-200"
              />
            </div>
            <div className="bg-slate-100 p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 border border-slate-200">
              Total Sedes Activas: <span className="font-mono text-emerald-700 font-extrabold text-sm">{establishments.length}</span>
            </div>
          </div>

          {/* Grid de Establecimientos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEstablishments.map((est) => {
              const elements = est.elements || [];
              const totalSlots = elements.filter(e => e.type === 'slot').length || est.totalSlots || 0;
              const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
              const pmrSlots = elements.filter(e => e.type === 'slot' && e.slotType === 'pmr').length || est.pmrSlots || 0;
              const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;

              return (
                <Card key={est.id} className="border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Cabecera de Tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-black text-slate-400 block">{est.id}</span>
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">{est.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {est.address}
                        </p>
                      </div>
                      <Badge variant={est.status === 'Operativo' ? 'success' : 'outline'} className="text-[10px] font-bold">
                        {est.status}
                      </Badge>
                    </div>

                    {/* Datos de Capacidad & Tarifas */}
                    <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">NIVEL / PLANTA</span>
                        <span className="font-extrabold text-slate-800">{est.level}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">TARIFA POR HORA</span>
                        <span className="font-extrabold text-emerald-700">S/ {Number(est.rate).toFixed(2)}/h</span>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 font-bold block">PLAZAS TOTALES</span>
                        <span className="font-mono font-bold text-slate-900">{totalSlots} plazas</span>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 font-bold block">DISPONIBILIDAD</span>
                        <span className="font-mono font-bold text-teal-700">{freeSlots} libres</span>
                      </div>
                    </div>

                    {/* Desglose de tipos de plazas */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {pmrSlots > 0 && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 font-bold flex items-center gap-1">
                          <Accessibility className="w-3 h-3" /> {pmrSlots} PMR
                        </span>
                      )}
                      {shadedSlots > 0 && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 font-bold flex items-center gap-1">
                          <Umbrella className="w-3 h-3" /> {shadedSlots} Techados
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones CRUD & Planos */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleOpenPlan(est, 'viewer_2d')}
                        variant="outline"
                        size="sm"
                        className="font-bold text-xs gap-1.5 text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>Ver Plano</span>
                      </Button>
                      <Button
                        onClick={() => handleOpenPlan(est, 'editor_cad')}
                        size="sm"
                        className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
                      >
                        <Grid className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Editar Plano</span>
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <Button
                        onClick={() => handleOpenEdit(est)}
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-slate-600 hover:text-slate-900 text-xs font-bold gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Ficha</span>
                      </Button>
                      <Button
                        onClick={() => handleDelete(est.id, est.name)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs font-bold p-2"
                        title="Eliminar Sede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: VER PLANO 2D (SOLO LECTURA) */}
      {activeViewMode === 'viewer_2d' && selectedEstablishment && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Padrón</span>
              </Button>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedEstablishment.name}</h2>
                <p className="text-xs text-slate-500">{selectedEstablishment.address} • {selectedEstablishment.level}</p>
              </div>
            </div>

            <Button
              onClick={() => setActiveViewMode('editor_cad')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs gap-1.5 shadow-sm"
            >
              <Grid className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveViewMode('list')}
                className="font-bold text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Padrón</span>
              </Button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Editor de Plano — {selectedEstablishment.name}</h2>
                <p className="text-xs text-slate-500 font-medium">Diseña, distribuye espacios y define la circulación vial de esta sede.</p>
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

      {/* MODAL CREAR ESTABLECIMIENTO */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Registrar Nueva Sede / Nivel</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos generales de la nueva sede. Se sincronizará inmediatamente con la vista de conductores.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdd} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de la Sede / Zona *</label>
              <Input
                required
                placeholder="Ej. Smart Park Jr. Bellido - Planta 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección / Ubicación *</label>
              <Input
                required
                placeholder="Ej. Jr. Bellido 240, Huamanga"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nivel / Planta</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option>Nivel 1 - Superficie</option>
                  <option>Nivel -1 - Subterráneo</option>
                  <option>Nivel 2 - Elevado</option>
                  <option>Zona Abierta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa por Hora (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  min="1.00"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Estado Operativo</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Operativo">Operativo (Abierto 24/7)</option>
                <option value="Mantenimiento">En Mantenimiento</option>
                <option value="Cerrado">Cerrado Temporalmente</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                Guardar Sede
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR ESTABLECIMIENTO */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              <span>Editar Datos de la Sede</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifica el nombre, tarifa horaria o estado operativo de este local.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de la Sede *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección / Ubicación *</label>
              <Input
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nivel / Planta</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option>Nivel 1 - Superficie</option>
                  <option>Nivel -1 - Subterráneo</option>
                  <option>Nivel 2 - Elevado</option>
                  <option>Zona Abierta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa por Hora (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  min="1.00"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Estado Operativo</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Operativo">Operativo</option>
                <option value="Mantenimiento">En Mantenimiento</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
