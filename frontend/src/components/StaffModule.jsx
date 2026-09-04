import React, { useState, useEffect } from 'react';
import { useEstablishments } from '../context/EstablishmentContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Download, 
  Clock, 
  ShieldCheck, 
  Check, 
  UserCheck, 
  ShieldAlert, 
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  UserX,
  Radio,
  BadgeCheck,
  Building2,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Función auxiliar para generar contraseñas seguras aleatorias
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const StaffModule = () => {
  const { role } = useAuth();
  const canManage = role === 'local' || role === 'platform';

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(canManage);

  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Visibilidad de contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showQuickPassword, setShowQuickPassword] = useState(false);

  const { establishments } = useEstablishments();
  const validEstablishments = establishments.filter(e => !String(e.id).startsWith('EST-') && !isNaN(Number(e.id)));
  const defaultParkingId = validEstablishments.length ? Number(validEstablishments[0].id) : null;

  // Estados de formularios
  const [formData, setFormData] = useState({
    full_name: '',
    dni: '',
    position: 'Operador de Garita',
    shift: 'Mañana (07:00 - 15:00)',
    status: 'Activo',
    parking_id: defaultParkingId || '',
    email: '',
    password: '',
    security_pin: '',
    system_role: 'local',
    enable_access: true
  });

  const [credsData, setCredsData] = useState({
    email: '',
    password: '',
    security_pin: '',
    system_role: 'local'
  });

  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (validEstablishments.length && !validEstablishments.some(e => String(e.id) === String(formData.parking_id))) {
      setFormData(prev => ({ ...prev, parking_id: Number(validEstablishments[0].id) }));
    }
  }, [establishments]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const describeError = (err, action) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    if (status === 401) notify('Tu sesión expiró o no has iniciado sesión. Vuelve a autenticarte.');
    else if (status === 403) notify(`No tienes permisos para ${action}.`);
    else if (status === 422) notify(typeof detail === 'string' ? detail : 'Datos inválidos. Verifica los campos requeridos y la longitud de la contraseña.');
    else if (detail) notify(typeof detail === 'string' ? detail : 'Error en la solicitud.');
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

  const resetForm = () => {
    setFormData({
      full_name: '',
      dni: '',
      position: 'Operador de Garita',
      shift: 'Mañana (07:00 - 15:00)',
      status: 'Activo',
      parking_id: 1,
      email: '',
      password: '',
      security_pin: '',
      system_role: 'local',
      enable_access: true
    });
    setShowPassword(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (m) => {
    setSelectedMember(m);
    setFormData({
      full_name: m.full_name || '',
      dni: m.dni || '',
      position: m.position || 'Operador de Garita',
      shift: m.shift || 'Mañana (07:00 - 15:00)',
      status: m.status || 'Activo',
      parking_id: m.parking_id || 1,
      email: m.email || '',
      password: '',
      security_pin: '',
      system_role: m.system_role || 'local',
      enable_access: !!m.email
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleOpenCreds = (m) => {
    setSelectedMember(m);
    setCredsData({
      email: m.email || '',
      password: '',
      security_pin: '',
      system_role: m.system_role || 'local'
    });
    setShowQuickPassword(false);
    setShowCredsModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.full_name || !formData.dni) {
      notify('Por favor completa el nombre y DNI del colaborador.');
      return;
    }
    if (validEstablishments.length === 0) {
      notify('No hay sedes registradas en el servidor. Crea una sede en Espacios & Plano antes de registrar personal.');
      return;
    }
    if (!formData.parking_id || isNaN(Number(formData.parking_id))) {
      notify('Selecciona una sede válida.');
      return;
    }
    setIsSubmitting(true);

    const payload = {
      parking_id: Number(formData.parking_id),
      full_name: formData.full_name.trim(),
      dni: formData.dni.trim(),
      position: formData.position,
      shift: formData.shift,
      status: formData.status,
      system_role: formData.system_role || 'local'
    };

    if (formData.email && formData.email.trim()) {
      payload.email = formData.email.trim();
    }

    if (formData.password && formData.password.trim()) {
      if (formData.password.trim().length < 8) {
        notify('La contraseña de acceso debe tener al menos 8 caracteres.');
        return;
      }
      payload.password = formData.password.trim();
    }

    const pin = (formData.security_pin || '').trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        notify('El PIN de garita debe tener exactamente 4 dígitos numéricos.');
        return;
      }
      payload.security_pin = pin;
    }

    try {
      const idem = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      await api.post('/staff', payload, { headers: { 'Idempotency-Key': idem } });
      setShowAddModal(false);
      notify(`Colaborador "${payload.full_name}" registrado exitosamente ${payload.email ? 'con credenciales de acceso activas.' : '.'}`);
      await loadStaff();
    } catch (err) {
      if (err?.response?.status === 409) {
        notify('Solicitud duplicada — el colaborador ya fue registrado (idempotencia).');
      } else {
        describeError(err, 'registrar al colaborador');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    const payload = {
      full_name: formData.full_name.trim(),
      dni: formData.dni.trim(),
      position: formData.position,
      shift: formData.shift,
      status: formData.status,
      system_role: formData.system_role || 'local'
    };

    if (formData.email !== undefined) {
      payload.email = formData.email.trim();
    }

    if (formData.password && formData.password.trim()) {
      if (formData.password.trim().length < 8) {
        notify('La contraseña de acceso debe tener al menos 8 caracteres.');
        return;
      }
      payload.password = formData.password.trim();
    }

    const pin = (formData.security_pin || '').trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        notify('El PIN de garita debe tener exactamente 4 dígitos numéricos.');
        return;
      }
      payload.security_pin = pin;
    }

    try {
      await api.put(`/staff/${selectedMember.id}`, payload);
      setShowEditModal(false);
      notify(`Colaborador "${formData.full_name}" y sus credenciales fueron actualizados.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'actualizar al colaborador');
    }
  };

  const handleSaveCreds = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (!credsData.email.trim()) {
      notify('El correo de acceso es requerido para habilitar el inicio de sesión.');
      return;
    }

    const payload = {
      email: credsData.email.trim(),
      system_role: credsData.system_role || 'local'
    };

    if (credsData.password && credsData.password.trim()) {
      if (credsData.password.trim().length < 8) {
        notify('La nueva contraseña debe tener al menos 8 caracteres.');
        return;
      }
      payload.password = credsData.password.trim();
    }

    const pin = (credsData.security_pin || '').trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        notify('El PIN de garita debe tener exactamente 4 dígitos numéricos.');
        return;
      }
      payload.security_pin = pin;
    }

    try {
      await api.put(`/staff/${selectedMember.id}`, payload);
      setShowCredsModal(false);
      notify(`Credenciales actualizadas para "${selectedMember.full_name}". Ya puede iniciar sesión con sus nuevas claves.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'actualizar credenciales');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar a "${name}" de la nómina y revocar su acceso al sistema? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/staff/${id}`);
      notify(`Colaborador "${name}" eliminado y acceso al sistema revocado.`);
      await loadStaff();
    } catch (err) {
      describeError(err, 'eliminar al colaborador');
    }
  };

  const exportCSV = () => {
    const headers = 'ID,Nombre Completo,DNI,Cargo,Turno,Estado,Correo Acceso,Acceso Habilitado\n';
    const rows = staff.map(s => `${s.id},"${s.full_name}","${s.dni}","${s.position}","${s.shift}","${s.status}","${s.email || ''}","${s.has_account ? 'SI' : 'NO'}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal_smartpark_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Nómina de personal y accesos exportada en formato CSV.');
  };

  const filtered = staff.filter(s => {
    const matchesSearch = 
      (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.dni || '').includes(search) || 
      (s.position || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesShift = shiftFilter === 'all' || (s.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (s.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesShift && matchesStatus;
  });

  const totalWithAccount = staff.filter(s => s.has_account).length;

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="h-full flex flex-col gap-4 p-8 border-dashed border-slate-300 text-center rounded-3xl bg-white shadow-sm">
          <ShieldAlert className="w-8 h-8 shrink-0 mx-auto text-amber-500" />
          <h2 className="text-xl font-black text-slate-900">Acceso restringido al personal</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            La gestión de colaboradores, turnos de garita y credenciales de acceso está disponible únicamente para Administradores de Cochera (local) o Super Admins (platform).
          </p>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tu rol actual: {role || 'sin sesión'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-slate-800 animate-slide-up">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#151D2F] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Gestión de Personal & Credenciales de Trabajadores
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Crea operadores de garita, asigna turnos y configura sus credenciales de usuario (correo y contraseña) para que inicien sesión.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={exportCSV} className="gap-2 text-xs font-bold h-10 rounded-xl cursor-pointer">
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Exportar CSV</span>
          </Button>

          <Button 
            onClick={handleOpenAdd} 
            className="gap-2 text-xs font-black h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-[#151D2F] border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-400 block">Total en Nómina</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{staff.length}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Operadores y personal</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#151D2F] border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 block">Acceso Sistema Habilitado</span>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{totalWithAccount}</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Con usuario y clave activa</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#151D2F] border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-400 block">Turno Activo Actual</span>
            <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">Mañana & Tarde</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Control en garita 24/7</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-[#151D2F] border-slate-200/90 dark:border-slate-800/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por nombre, DNI o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Shift Filter */}
          <select 
            value={shiftFilter} 
            onChange={(e) => setShiftFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los Turnos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
            <option value="Rotativo">Rotativo</option>
          </select>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
          </select>
        </div>
      </Card>

      {/* Staff Grid Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Cargando nómina de colaboradores y accesos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 border-dashed border-slate-300 dark:border-slate-800 text-center rounded-3xl bg-white dark:bg-[#151D2F] space-y-3">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No se encontraron colaboradores</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {search || shiftFilter !== 'all' || statusFilter !== 'all'
              ? 'Prueba ajustando los filtros de búsqueda.'
              : 'Haz clic en "Nuevo Colaborador" para registrar a tu primer trabajador y configurar su acceso.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const isActive = (s.status || '').toLowerCase() === 'activo' || (s.status || '').toLowerCase() === 'active';
            const hasCredentials = !!s.email;

            return (
              <Card 
                key={s.id} 
                className="bg-white dark:bg-[#151D2F] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Top: Avatar, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 ${
                        isActive 
                          ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {(s.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug">{s.full_name}</h3>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">{s.position}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                      isActive 
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                        : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                    }`}>
                      ● {s.status || 'Activo'}
                    </span>
                  </div>

                  {/* Labor Data Info */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold block uppercase">DNI / Doc</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{s.dni}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold block uppercase">Turno</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate block text-[11px]">{s.shift}</span>
                    </div>
                  </div>

                  {/* System Access Credentials Box */}
                  <div className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                    hasCredentials 
                      ? 'bg-slate-900 dark:bg-slate-950/80 text-white border-slate-800 dark:border-slate-800/80' 
                      : 'bg-amber-50/60 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-200/70 dark:border-amber-500/25'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1.5">
                        <KeyRound className={`w-3.5 h-3.5 ${hasCredentials ? 'text-emerald-400' : 'text-amber-500'}`} />
                        <span>Acceso al Sistema</span>
                      </span>
                      {hasCredentials ? (
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          HABILITADO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                          SIN ACCESO
                        </span>
                      )}
                    </div>

                    {hasCredentials ? (
                      <div className="space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-white truncate">{s.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>Rol: <strong className="text-emerald-400 uppercase">{s.system_role || 'local'}</strong></span>
                          <span>PIN: <strong className="text-slate-200 font-mono">••••</strong></span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        Este trabajador no tiene credenciales configuradas para iniciar sesión en la garita.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleOpenCreds(s)}
                    className="gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white h-9 rounded-xl flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700 cursor-pointer"
                    title="Configurar usuario, contraseña y PIN"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Credenciales</span>
                  </Button>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleOpenEdit(s)}
                    className="p-2.5 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700 cursor-pointer"
                    title="Editar datos laborales"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(s.id, s.full_name)}
                    className="p-2.5 h-9 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border-none cursor-pointer"
                    title="Eliminar colaborador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: REGISTRAR NUEVO COLABORADOR & CREDENCIALES
          ========================================================================= */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <UserCheck className="w-5 h-5" />
              <DialogTitle className="text-lg font-black text-slate-900">Registrar Nuevo Colaborador</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos personales y define sus credenciales para que ingrese al sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {/* Sección 1: Datos Laborales */}
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                1. Datos del Colaborador
              </span>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                <Input 
                  type="text" 
                  placeholder="Ej. Juan Carlos Pérez Gómez" 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                  required 
                  className="text-xs h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">DNI / Documento *</label>
                  <Input 
                    type="text" 
                    maxLength={8} 
                    placeholder="44556677" 
                    value={formData.dni} 
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })} 
                    required 
                    className="text-xs h-10 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo</label>
                  <select 
                    value={formData.position} 
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  >
                    <option value="Operador de Garita">Operador de Garita</option>
                    <option value="Supervisor de Turno">Supervisor de Turno</option>
                    <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                    <option value="Administrador Local">Administrador Local</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Turno Asignado</label>
                  <select 
                    value={formData.shift} 
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })} 
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  >
                    <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                    <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                    <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                    <option value="Rotativo 24/7">Rotativo 24/7</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estado</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sede / Cochera Asignada *</label>
                {validEstablishments.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
                    No hay sedes registradas en el servidor. Crea una sede en Espacios & Plano antes de registrar personal.
                  </div>
                ) : (
                  <select
                    value={formData.parking_id}
                    onChange={(e) => setFormData({ ...formData, parking_id: Number(e.target.value) })}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  >
                    {validEstablishments.map(est => (
                      <option key={est.id} value={est.id}>
                        {est.name} — {est.address?.slice(0, 40) || 'Sede'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Sección 2: Credenciales de Acceso al Sistema */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2. Credenciales de Ingreso al Sistema</span>
                </span>
                <span className="text-[10px] text-slate-400">Permite login en Garita</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Correo Electrónico / Usuario de Acceso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input 
                    type="email" 
                    placeholder="operador.garita@smartpark.pe" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    className="pl-9 text-xs h-10 rounded-xl bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Contraseña de Acceso * (mínimo 8 caracteres)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateSecurePassword() })}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar Clave Segura</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    className="pl-9 pr-10 text-xs h-10 rounded-xl bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">PIN Garita / ANPR (4 dígitos)</label>
                <Input 
                  type="password" 
                  maxLength={4} 
                  placeholder="1234" 
                  value={formData.security_pin} 
                  onChange={(e) => setFormData({ ...formData, security_pin: e.target.value.replace(/\D/g, '') })} 
                  className="font-mono font-bold tracking-widest text-xs h-10 rounded-xl bg-slate-800/90 border-slate-700 text-white"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed pt-1 flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>El trabajador podrá acceder al sistema ingresando su correo y contraseña en la pantalla de <strong>Iniciar Sesión</strong>.</span>
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Colaborador y Habilitar Acceso'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: EDITAR COLABORADOR & CREDENCIALES
          ========================================================================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              <DialogTitle className="text-lg font-black text-slate-900">Editar Colaborador</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Modifica datos laborales, turno, correo o restablece la contraseña de acceso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
              <Input 
                type="text" 
                value={formData.full_name} 
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                required 
                className="text-xs h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">DNI *</label>
                <Input 
                  type="text" 
                  value={formData.dni} 
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })} 
                  required 
                  className="text-xs h-10 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cargo</label>
                <select 
                  value={formData.position} 
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                  className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800"
                >
                  <option value="Operador de Garita">Operador de Garita</option>
                  <option value="Supervisor de Turno">Supervisor de Turno</option>
                  <option value="Seguridad & ANPR">Seguridad & ANPR</option>
                  <option value="Administrador Local">Administrador Local</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Turno Asignado</label>
                <select 
                  value={formData.shift} 
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })} 
                  className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800"
                >
                  <option value="Mañana (07:00 - 15:00)">Mañana (07:00 - 15:00)</option>
                  <option value="Tarde (15:00 - 23:00)">Tarde (15:00 - 23:00)</option>
                  <option value="Noche (23:00 - 07:00)">Noche (23:00 - 07:00)</option>
                  <option value="Rotativo 24/7">Rotativo 24/7</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Estado</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                  className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo (Suspender Acceso)</option>
                </select>
              </div>
            </div>

            {/* Credenciales en Edición */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Credenciales de Acceso</span>
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Correo Electrónico / Usuario</label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="usuario@smartpark.pe"
                  className="text-xs h-10 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Nueva Contraseña (dejar en blanco para no cambiarla)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateSecurePassword() })}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar</span>
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Dejar en blanco para mantener clave actual" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    className="pr-10 text-xs h-10 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Nuevo PIN (4 dígitos)</label>
                <Input 
                  type="password" 
                  maxLength={4} 
                  placeholder="••••" 
                  value={formData.security_pin} 
                  onChange={(e) => setFormData({ ...formData, security_pin: e.target.value.replace(/\D/g, '') })} 
                  className="font-mono font-bold text-xs h-10 rounded-xl bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Guardar Todos los Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: GESTIÓN RÁPIDA DE CREDENCIALES & CAMBIO DE CONTRASEÑA
          ========================================================================= */}
      <Dialog open={showCredsModal} onOpenChange={setShowCredsModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <KeyRound className="w-5 h-5" />
              <DialogTitle className="text-base font-black text-slate-900">
                Credenciales de Acceso
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Configura o restablece el acceso de <strong>{selectedMember?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCreds} className="space-y-4 pt-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Correo Electrónico / Usuario de Acceso *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="email" 
                  required
                  placeholder="operador@smartpark.pe" 
                  value={credsData.email} 
                  onChange={(e) => setCredsData({ ...credsData, email: e.target.value })} 
                  className="pl-9 text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Nueva Contraseña (mínimo 8 caracteres)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateSecurePassword();
                    setCredsData({ ...credsData, password: pass });
                    setShowQuickPassword(true);
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar Contraseña</span>
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type={showQuickPassword ? "text" : "password"} 
                  placeholder={selectedMember?.has_account ? "Dejar en blanco para mantener la actual" : "Ingresa una contraseña segura"} 
                  value={credsData.password} 
                  onChange={(e) => setCredsData({ ...credsData, password: e.target.value })} 
                  className="pl-9 pr-10 text-xs h-10 rounded-xl font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowQuickPassword(!showQuickPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {credsData.password && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                  ✓ Clave asignada: <code className="font-mono bg-emerald-50 px-1 py-0.5 rounded">{credsData.password}</code> (cópiala y entrégala al trabajador)
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">PIN Garita (4 dígitos)</label>
              <Input 
                type="password" 
                maxLength={4} 
                placeholder="••••" 
                value={credsData.security_pin} 
                onChange={(e) => setCredsData({ ...credsData, security_pin: e.target.value.replace(/\D/g, '') })} 
                className="font-mono font-bold text-xs h-10 rounded-xl"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Guardar y Activar Credenciales
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
