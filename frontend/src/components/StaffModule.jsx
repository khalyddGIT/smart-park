import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Users, Plus, Edit3, Trash2, Search, Download, Clock, ShieldCheck, Check, UserCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const StaffModule = () => {
  const { role } = useAuth();
  const canManage = role === 'local' || role === 'platform';

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(canManage);

  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    dni: '',
    position: 'Operador de Garita',
    shift: 'Mañana (07:00 - 15:00)',
    status: 'Activo',
    parking_id: 1,
    email: '',
    security_pin: ''
  });
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const describeError = (err, action) => {
    const status = err?.response?.status;
    if (status === 401) notify('Tu sesión expiró o no has iniciado sesión. Vuelve a autenticarte.');
    else if (status === 403) notify(`No tienes permisos para ${action}.`);
    else notify('Ocurrió un error de conexión con el servidor. Intenta de nuevo.');
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      describeError(err, 'cargar la nómina de personal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) loadStaff();
    else setLoading(false);
  }, [canManage]);

  const resetForm = () => setFormData({
    full_name: '',
    dni: '',
    position: 'Operador de Garita',
    shift: 'Mañana (07:00 - 15:00)',
    status: 'Activo',
    parking_id: 1,
    email: '',
    security_pin: ''
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (m) => {
    setSelectedMember(m);
    setFormData({
      full_name: m.full_name,
      dni: m.dni,
      position: m.position,
      shift: m.shift,
      status: m.status,
      parking_id: m.parking_id || 1,
      email: m.email || '',
      security_pin: ''
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.dni) return;
    const payload = {
      parking_id: Number(formData.parking_id) || 1,
      full_name: formData.full_name.trim(),
      dni: formData.dni.trim(),
      position: formData.position,
      shift: formData.shift,
      status: formData.status
    };
    if (formData.email && formData.email.trim()) payload.email = formData.email.trim();
    const pin = (formData.security_pin || '').trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        notify('El PIN de garita debe tener exactamente 4 dígitos numéricos.');
        return;
      }
      payload.security_pin = pin;
    }
    try {
      await api.post('/staff', payload);
      setShowAddModal(false);
      notify(`Colaborador "${payload.full_name}" registrado en la nómina.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'registrar al colaborador');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      await api.put(`/staff/${selectedMember.id}`, {
        full_name: formData.full_name.trim(),
        dni: formData.dni.trim(),
        position: formData.position,
        shift: formData.shift,
        status: formData.status
      });
      setShowEditModal(false);
      notify(`Colaborador "${formData.full_name}" actualizado.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'actualizar al colaborador');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar a "${name}" de la nómina? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/staff/${id}`);
      notify(`Colaborador "${name}" eliminado de la nómina.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'eliminar al colaborador');
    }
  };

  const exportCSV = () => {
    const headers = 'ID,Nombre Completo,DNI,Cargo,Turno,Estado\n';
    const rows = staff.map(s => `${s.id},"${s.full_name}","${s.dni}","${s.position}","${s.shift}","${s.status}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_smartpark_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Nómina de personal exportada en formato CSV.');
  };

  const filtered = staff.filter(s => {
    const matchesSearch = (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || (s.dni || '').includes(search) || (s.position || '').toLowerCase().includes(search.toLowerCase());
    const matchesShift = shiftFilter === 'all' || (s.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());
    return matchesSearch && matchesShift;
  });

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="h-full flex flex-col gap-4 p-6 border-dashed border-slate-300 text-center">
          <ShieldAlert className="w-5 h-5 shrink-0 mx-auto text-slate-400" />
          <h2 className="text-lg font-black text-slate-900">Acceso restringido</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            La gestión de personal y turnos de garita está disponible únicamente para administradores
            de cochera (local) o super admins de plataforma (platform).
          </p>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tu rol actual: {role || 'sin sesión'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check className="w-5 h-5 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Gestión de Personal & Turnos de Garita (CRUD)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra los operadores, supervisores y roles de turno del estacionamiento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-5 h-5 shrink-0 text-slate-500" />
            <span>Exportar CSV</span>
          </Button>
          <div className="relative">
            <Search className="w-4 h-4 shrink-0 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Button variant="primary" size="md" onClick={handleOpenAdd} className="gap-2">
            <Plus className="w-5 h-5 shrink-0" />
            <span>Nuevo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Staff List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <span className="text-sm font-bold">Cargando nómina de personal...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="h-full flex flex-col gap-4 p-6 border-dashed border-slate-300 text-center">
          <Users className="w-5 h-5 shrink-0 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-500">No hay colaboradores registrados que coincidan con la búsqueda.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {filtered.map((s) => (
              <Card key={s.id} className="h-full flex flex-col gap-4 p-6 border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shadow-inner shrink-0">
                      {(s.full_name || '?').charAt(0)}
                    </div>
                    <span className={`text-xs font-bold flex items-center gap-2 ${s.status === 'Activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      ● {s.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{s.full_name}</h3>
                    <p className="text-xs text-emerald-700 font-bold">{s.position}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="flex justify-between gap-2 text-slate-600">
                      <span>DNI:</span>
                      <span className="font-bold text-slate-900">{s.dni}</span>
                    </p>
                    <p className="flex justify-between gap-2 text-slate-600">
                      <span>Turno:</span>
                      <span className="font-medium text-slate-700">{s.shift}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
                  <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(s)} className="flex-1 gap-2">
                    <Edit3 className="w-5 h-5 shrink-0" />
                    <span>Editar</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id, s.full_name)} className="gap-2 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-5 h-5 shrink-0" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nuevo Colaborador */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Registrar Nuevo Colaborador</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa los datos laborales para el control de accesos de garita.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 my-2">
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700">Nombre y Apellidos *</label>
              <Input type="text" placeholder="Nombres y Apellidos" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-700">DNI / Documento *</label>
                <Input type="text" maxLength={8} placeholder="44556677" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-700">Cargo</label>
                <select value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="h-10 w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20">
                  <option value="Operador de Garita">Operador de Garita</option>
                  <option value="Supervisor de Turno">Supervisor de Turno</option>
                  <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                  <option value="Administrador Local">Administrador Local</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700">Turno Asignado</label>
              <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })} className="h-10 w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20">
                <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                <option value="Rotativo 24/7">Rotativo 24/7</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <span className="font-bold flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" /> Cuentas & Permiso de Acceso (Operador Garita)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="block text-[11px] font-bold text-slate-700">Correo / Usuario Acceso</label>
                  <Input type="email" placeholder="operador@cochera.pe" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-white" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-[11px] font-bold text-slate-700">PIN Garita ANPR (opcional, 4 dígitos)</label>
                  <Input type="password" maxLength={4} placeholder="••••" value={formData.security_pin} onChange={(e) => setFormData({ ...formData, security_pin: e.target.value.replace(/\D/g, '') })} className="bg-white text-center font-mono font-bold" />
                </div>
              </div>
            </div>
            <Button variant="primary" size="md" type="submit" className="w-full gap-2">
              Registrar Colaborador y Crear Acceso
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Colaborador */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Editar Colaborador</DialogTitle>
            <DialogDescription className="text-xs">
              Modifica los turnos o estado laboral del colaborador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4 my-2">
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700">Nombre y Apellidos *</label>
              <Input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-700">DNI *</label>
                <Input type="text" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-700">Cargo</label>
                <select value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="h-10 w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20">
                  <option value="Operador de Garita">Operador de Garita</option>
                  <option value="Supervisor de Turno">Supervisor de Turno</option>
                  <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                  <option value="Administrador Local">Administrador Local</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700">Turno Asignado</label>
              <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })} className="h-10 w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20">
                <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                <option value="Rotativo 24/7">Rotativo 24/7</option>
              </select>
            </div>
            <Button variant="primary" size="md" type="submit" className="w-full gap-2">
              Guardar Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
