import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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

  // Carga REAL desde la API (requiere rol local | platform)
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

  // POST /staff — mapeo del formulario al contrato real del backend
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

    // security_pin es OPCIONAL (4 dígitos, se hashea server-side)
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
      await loadStaff(); // refresh post-mutación
    } catch (err) {
      describeError(err, 'registrar al colaborador');
    }
  };

  // PUT /staff/{id} — solo campos editables del formulario
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

  // DELETE /staff/{id}
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

  // Panel honesto: sin rol local/platform NO hay tabla ni acciones
  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-12 border-dashed border-slate-300 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-slate-400" />
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
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            <span>Gestión de Personal & Turnos de Garita (CRUD)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra los operadores, supervisores y roles de turno del estacionamiento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={exportCSV} className="gap-1.5 font-bold text-xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </Button>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs w-56 rounded-2xl"
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            <span>Nuevo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Staff List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-3 text-sm font-bold">Cargando nómina de personal...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 border-dashed border-slate-300 text-center space-y-2">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-500">No hay colaboradores registrados que coincidan con la búsqueda.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Card key={s.id} className="p-6 border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shadow-inner">
                    {(s.full_name || '?').charAt(0)}
                  </div>
                  <span className={`text-xs font-bold ${s.status === 'Activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ● {s.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mb-1">{s.full_name}</h3>
                <p className="text-xs text-emerald-700 font-bold mb-3">{s.position}</p>

                <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                  <p className="flex justify-between text-slate-600">
                    <span>DNI:</span>
                    <span className="font-bold text-slate-900">{s.dni}</span>
                  </p>
                  <p className="flex justify-between text-slate-600">
                    <span>Turno:</span>
                    <span className="font-medium text-slate-700">{s.shift}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(s)}
                  className="flex-1 font-bold text-xs gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(s.id, s.full_name)}
                  className="text-rose-600 hover:bg-rose-50 px-3"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
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

          <form onSubmit={handleCreate} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre y Apellidos *</label>
              <Input
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DNI / Documento *</label>
                <Input
                  type="text"
                  maxLength={8}
                  placeholder="44556677"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="Operador de Garita">Operador de Garita</option>
                  <option value="Supervisor de Turno">Supervisor de Turno</option>
                  <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                  <option value="Administrador Local">Administrador Local</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Turno Asignado</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                <option value="Rotativo 24/7">Rotativo 24/7</option>
              </select>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <span className="font-bold flex items-center gap-1 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cuentas & Permiso de Acceso (Operador Garita)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Correo / Usuario Acceso</label>
                  <Input
                    type="email"
                    placeholder="operador@cochera.pe"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white text-xs py-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">PIN Garita ANPR (opcional, 4 dígitos)</label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={formData.security_pin}
                    onChange={(e) => setFormData({ ...formData, security_pin: e.target.value.replace(/\D/g, '') })}
                    className="bg-white text-xs py-1 text-center font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2 bg-emerald-600 hover:bg-emerald-700">
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

          <form onSubmit={handleEdit} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre y Apellidos *</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DNI *</label>
                <Input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="Operador de Garita">Operador de Garita</option>
                  <option value="Supervisor de Turno">Supervisor de Turno</option>
                  <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                  <option value="Administrador Local">Administrador Local</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Turno Asignado</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                <option value="Rotativo 24/7">Rotativo 24/7</option>
              </select>
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2 bg-emerald-600 hover:bg-emerald-700">
              Guardar Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
