import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  MapPin, 
  DollarSign, 
  Percent, 
  Check, 
  AlertTriangle, 
  Layers,
  Inbox,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Car
} from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';

export const AffiliatedParkingsModule = () => {
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    deleteEstablishment,
    affiliationRequests = [],
    approveAffiliationRequest,
    rejectAffiliationRequest
  } = useEstablishments();

  // 'establishments' | 'requests'
  const [activeSubTab, setActiveSubTab] = useState('establishments');

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

  const pendingRequestsCount = affiliationRequests.filter(r => r.status === 'PENDING').length;

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

  // Handler para Aprobar Solicitud de Cochera
  const handleApproveRequest = (req) => {
    const res = approveAffiliationRequest(req.id);
    if (res) {
      notify(`✓ Solicitud aprobada: "${req.parkingName}" activada y cuenta creada para ${req.email}`);
    }
  };

  // Handler para Rechazar Solicitud de Cochera
  const handleRejectRequest = (req) => {
    if (!window.confirm(`¿Rechazar la solicitud de "${req.parkingName}"?`)) return;
    rejectAffiliationRequest(req.id, 'No cumple con los requisitos del local');
    notify(`Solicitud de "${req.parkingName}" rechazada.`);
  };

  const filteredEstablishments = establishments.filter(p => {
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-600" />
            <span>Red de Estacionamientos & Afiliaciones</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra las sedes activas y aprueba las solicitudes de registro de nuevas cocheras.
          </p>
        </div>

        {/* Pestañas Sub-Navegación */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('establishments')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeSubTab === 'establishments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Sedes Activas ({establishments.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 relative ${
              activeSubTab === 'requests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4 shrink-0" />
            <span>Solicitudes de Afiliación</span>
            {pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: SEDES ACTIVAS
          ========================================================================= */}
      {activeSubTab === 'establishments' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controles de filtro y botón crear */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="operativo">Solo Operativos</option>
                <option value="mantenimiento">En Mantenimiento</option>
              </select>
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 shrink-0 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar sede o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <Button onClick={handleOpenAdd} className="w-full sm:w-auto gap-2 font-bold shadow-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9">
              <Plus className="w-4 h-4" />
              <span>Nueva Sede Manual</span>
            </Button>
          </div>

          {/* Grid de Sedes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEstablishments.map((p) => {
              const elements = p.elements || [];
              const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

              return (
                <Card key={p.id} className="p-5 border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition group rounded-3xl bg-white">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        ● {p.status}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base mb-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-400 shrink-0" />
                      <span className="truncate">{p.city || 'Ayacucho'} • {p.address}</span>
                    </p>

                    <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                      <p className="flex justify-between text-slate-600">
                        <span>Capacidad Total:</span>
                        <span className="font-bold text-slate-900">{totalSlots} Plazas</span>
                      </p>
                      <p className="flex justify-between text-slate-600">
                        <span>Tarifa / Hora:</span>
                        <span className="font-bold text-emerald-700">S/ {Number(p.rate).toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between text-slate-600">
                        <span>Titular / Operador:</span>
                        <span className="text-slate-800 font-semibold truncate max-w-[140px]">{p.owner || 'Comercial'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button 
                      onClick={() => toggleStatus(p.id)} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs font-bold rounded-xl h-8"
                    >
                      {p.status === 'Operativo' ? 'Pausar' : 'Reanudar'}
                    </Button>
                    <Button 
                      onClick={() => handleOpenEdit(p)} 
                      variant="ghost" 
                      size="sm" 
                      className="p-2 text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => handleDelete(p.id, p.name)} 
                      variant="ghost" 
                      size="sm" 
                      className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: SOLICITUDES DE AFILIACIÓN DE COCHERAS (BANDEJA DE APROBACIÓN)
          ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4 animate-fade-in">
          
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
            <Inbox className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Bandeja de Solicitudes de Nuevas Cocheras</p>
              <p className="text-amber-800 leading-relaxed">
                Cuando un propietario solicita afiliar su estacionamiento desde la pantalla de bienvenida, sus datos aparecen aquí. Al presionar <strong>"Aprobar y Habilitar Cuenta"</strong>, el sistema crea la cochera automáticamente y habilita el acceso para que el dueño inicie sesión con su correo.
              </p>
            </div>
          </div>

          {affiliationRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No hay solicitudes pendientes</h3>
              <p className="text-xs text-slate-400">Las nuevas solicitudes que envíen los propietarios aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {affiliationRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';

                return (
                  <Card key={req.id} className="p-5 border-slate-200 rounded-3xl bg-white shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      
                      {/* Estado y Fecha */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isPending && <Clock className="w-4 h-4 shrink-0" />}
                          {isApproved && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {!isPending && !isApproved && <XCircle className="w-4 h-4 shrink-0" />}
                          <span>{req.status === 'PENDING' ? 'Pendiente de Aprobación' : req.status === 'APPROVED' ? 'Aprobada & Activa' : 'Rechazada'}</span>
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {req.id}
                        </span>
                      </div>

                      {/* Nombre y Contacto */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{req.parkingName}</h3>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Titular: <strong className="text-slate-800">{req.ownerName}</strong>
                        </p>
                      </div>

                      {/* Grid de Datos */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">CORREO ACCESO:</span>
                          <span className="font-bold text-slate-800 truncate block">{req.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">TELÉFONO:</span>
                          <span className="font-bold text-slate-800">{req.phone || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">DIRECCIÓN:</span>
                          <span className="text-slate-700 truncate block">{req.address}, {req.city}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">CAPACIDAD / TARIFA:</span>
                          <span className="font-bold text-emerald-700">{req.capacity} plazas • S/ {Number(req.rate).toFixed(2)}/h</span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{req.notes}"
                        </p>
                      )}

                    </div>

                    {/* Botones de Acción para el Administrador del Sistema */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <Button
                          onClick={() => handleRejectRequest(req)}
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl h-9 px-3"
                        >
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleApproveRequest(req)}
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 shadow-xs"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          <span>Aprobar y Habilitar Cuenta</span>
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cuenta habilitada para login ({req.email})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Sede Activa</span>
                      </div>
                    )}

                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Modal Crear Afiliado Manual */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Afiliar Nueva Sede Manualmente</span>
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
                placeholder="Ej. Jr. Cusco 320"
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa por Hora (S/)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                Guardar Sede
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Afiliado */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Editar Sede</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifica los datos operativos de esta sede afiliada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa (S/)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Titular</label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
