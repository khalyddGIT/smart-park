import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Building2, Plus, Edit3, Trash2, Search, MapPin, DollarSign, Percent, Check, AlertTriangle, Layers } from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';

export const AffiliatedParkingsModule = () => {
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    deleteEstablishment 
  } = useEstablishments();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParking, setSelectedParking] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    commission: '12%',
    owner: ''
  });
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({ 
      name: '', 
      address: '', 
      city: 'Ayacucho - Huamanga', 
      level: 'Nivel 1 - Superficie',
      rate: 5.00, 
      commission: '12%', 
      owner: 'Inversiones Ayacucho S.A.C.' 
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedParking(p);
    setFormData({
      name: p.name,
      address: p.address || '',
      city: p.city || 'Ayacucho - Huamanga',
      level: p.level || 'Nivel 1 - Superficie',
      rate: p.rate || 5.00,
      commission: p.commission || '12%',
      owner: p.owner || 'Socio Comercial'
    });
    setShowEditModal(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!formData.name) return;

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
      { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'moto', x: 165, y: 470, w: 50, h: 140, rot: 0, status: 'free' }
    ];

    const newObj = {
      id: `EST-${Math.floor(10 + Math.random() * 90)}`,
      name: formData.name,
      address: formData.address || 'Jr. 28 de Julio 100',
      city: formData.city || 'Ayacucho - Huamanga',
      level: formData.level || 'Nivel 1 - Superficie',
      rate: Number(formData.rate) || 5.00,
      commission: formData.commission || '12%',
      owner: formData.owner || 'Socio Comercial',
      status: 'Operativo',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
      elements: defaultNewElements
    };

    addEstablishment(newObj);
    setShowAddModal(false);
    notify(`Establecimiento "${newObj.name}" afiliado a la red.`);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!selectedParking) return;

    const updated = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      level: formData.level,
      rate: Number(formData.rate),
      commission: formData.commission,
      owner: formData.owner
    };

    updateEstablishment(selectedParking.id, updated);
    setShowEditModal(false);
    notify(`Establecimiento "${formData.name}" actualizado.`);
  };

  const toggleStatus = (id) => {
    const target = establishments.find(p => p.id === id);
    if (!target) return;
    const nextStatus = target.status === 'Operativo' ? 'Mantenimiento' : 'Operativo';

    updateEstablishment(id, { status: nextStatus });
    notify(`Estado de "${target.name}" cambiado a ${nextStatus}.`);
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Seguro que deseas dar de baja el establecimiento "${name}"?`)) return;
    deleteEstablishment(id);
    notify(`Establecimiento "${name}" eliminado de la red.`);
  };

  const filtered = establishments.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-teal-600" />
            <span>Red de Estacionamientos Afiliados (SaaS Global)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra los locales comerciales afiliados a la plataforma Smart Park en Ayacucho y a nivel nacional.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="operativo">Solo Operativos</option>
            <option value="mantenimiento">En Mantenimiento</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar local o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs w-60 rounded-2xl"
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-md bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4" />
            <span>Afiliar Local</span>
          </Button>
        </div>
      </div>

      {/* Parkings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((p) => {
          const elements = p.elements || [];
          const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
          const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;

          return (
            <Card key={p.id} className="p-6 border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black shadow-inner">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold ${p.status === 'Operativo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ● {p.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-teal-600" />
                  <span>{p.city || 'Huamanga'} • <span className="font-mono text-slate-700">{p.address}</span></span>
                </p>

                <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                  <p className="flex justify-between text-slate-600">
                    <span>Capacidad Total:</span>
                    <span className="font-bold text-slate-900">{totalSlots} Plazas</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Tarifa / Hora:</span>
                    <span className="font-bold text-teal-700">S/ {Number(p.rate).toFixed(2)}</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Comisión Plataforma:</span>
                    <span className="font-bold text-emerald-600">{p.commission || '12%'}</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Titular / Operador:</span>
                    <span className="text-slate-800 truncate max-w-[140px]">{p.owner || 'Comercial'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <Button 
                  onClick={() => toggleStatus(p.id)} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs font-bold"
                >
                  {p.status === 'Operativo' ? 'Pausar' : 'Reanudar'}
                </Button>
                <Button 
                  onClick={() => handleOpenEdit(p)} 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 text-slate-600 hover:text-slate-900"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => handleDelete(p.id, p.name)} 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Crear Afiliado */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>Afiliar Nuevo Establecimiento</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra un nuevo local comercial en la red consolidada de Smart Park.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial del Local *</label>
              <Input
                required
                placeholder="Ej. Smart Park Jr. Cusco"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección Exacta *</label>
              <Input
                required
                placeholder="Ej. Jr. Cusco 310, Huamanga"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad / Distrito</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nivel / Tipo</label>
                <Input
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa Horaria (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Comisión Plataforma</label>
                <Input
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Titular / Empresa Propietaria</label>
              <Input
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                Afiliar Establecimiento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Afiliado */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-teal-600" />
              <span>Modificar Ficha del Afiliado</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección *</label>
              <Input
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa Horaria (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Comisión (%)</label>
                <Input
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Titular / Operador</label>
              <Input
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
