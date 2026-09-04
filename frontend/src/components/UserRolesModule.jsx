import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Shield, UserCheck, KeyRound, Plus, Edit3, Search, Check, Lock, Power, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Formatea la fecha ISO del backend a texto corto
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return '—'; }
};

export const UserRolesModule = () => {
  const { role } = useAuth();
  const isPlatform = role === 'platform';

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ user: 0, local: 0, platform: 0 });
  const [loading, setLoading] = useState(isPlatform);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', role: 'user', password: '' });
  const [pinValue, setPinValue] = useState('');
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const describeError = (err, action) => {
    const status = err?.response?.status;
    if (status === 401) notify('Tu sesión expiró o no has iniciado sesión. Vuelve a autenticarte.');
    else if (status === 403) notify(`No tienes permisos de Super Admin para ${action}.`);
    else notify('Ocurrió un error de conexión con el servidor. Intenta de nuevo.');
  };

  // GET /users con búsqueda (query) + filtro por rol (role), según los controles de la UI.
  // Se pide además la lista sin filtros para mantener las tarjetas de estadísticas globales.
  const loadUsers = async () => {
    try {
      const params = {};
      if (search.trim()) params.query = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;

      const [listRes, allRes] = await Promise.all([
        api.get('/users', Object.keys(params).length ? { params } : undefined),
        api.get('/users'),
      ]);
      const list = Array.isArray(listRes.data) ? listRes.data : [];
      const all = Array.isArray(allRes.data) ? allRes.data : [];
      setUsers(list);
      setStats({
        user: all.filter(u => u.role === 'user').length,
        local: all.filter(u => u.role === 'local').length,
        platform: all.filter(u => u.role === 'platform').length,
      });
    } catch (err) {
      describeError(err, 'ver el directorio de usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Refetch con debounce al cambiar búsqueda o filtro de rol
  useEffect(() => {
    if (!isPlatform) { setLoading(false); return; }
    const t = setTimeout(() => { loadUsers(); }, 300);
    return () => clearTimeout(t);
  }, [isPlatform, search, roleFilter]);

  const handleOpenAdd = () => {
    setFormData({ full_name: '', email: '', phone: '', role: 'user', password: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormData({ full_name: u.full_name, email: u.email, phone: u.phone || '', role: u.role, password: '' });
    setShowEditModal(true);
  };

  // Nunca se precarga el PIN actual (el backend nunca lo devuelve en claro)
  const handleOpenPin = (u) => {
    setSelectedUser(u);
    setPinValue('');
    setShowPinModal(true);
  };

  // POST /users — crea SIEMPRE role="user"; requiere password de 8+ caracteres
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name || !formData.password) return;
    if (formData.password.length < 8) {
      notify('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await api.post('/users', {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setShowAddModal(false);
      notify(`Usuario "${formData.full_name.trim()}" creado con rol Conductor (user).`);
      await loadUsers(); // refresh post-mutación
    } catch (err) {
      describeError(err, 'crear el usuario');
    }
  };

  // PUT /users/{id} — solo full_name y phone (el email no es editable vía API).
  // Si el rol cambió en el formulario, se aplica además PUT /users/{id}/role.
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.put(`/users/${selectedUser.id}`, {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
      });
      if (formData.role !== selectedUser.role) {
        await api.put(`/users/${selectedUser.id}/role`, { role: formData.role });
      }
      setShowEditModal(false);
      notify(`Usuario "${formData.full_name}" actualizado.`);
      await loadUsers();
    } catch (err) {
      describeError(err, 'actualizar al usuario');
    }
  };

  // PUT /users/{id}/role — cambio de rol desde el selector de la tabla
  const changeRole = async (id, newRole) => {
    try {
      await api.put(`/users/${id}/role`, { role: newRole });
      notify(`Rol de usuario actualizado a "${newRole}".`);
      await loadUsers();
    } catch (err) {
      describeError(err, 'cambiar el rol');
      await loadUsers(); // restaura el valor real del select
    }
  };

  // PUT /users/{id}/pin — validación client-side: 4+ dígitos numéricos
  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!/^\d{4,6}$/.test(pinValue)) {
      notify('El PIN debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}/pin`, { pin: pinValue });
      setShowPinModal(false);
      notify(`Nuevo PIN configurado para "${selectedUser.full_name}".`);
      setPinValue('');
    } catch (err) {
      describeError(err, 'actualizar el PIN');
    }
  };

  // PUT /users/{id} {is_active} — activar/desactivar cuenta
  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      notify(`Usuario "${u.full_name}" ${!u.is_active ? 'activado' : 'desactivado'}.`);
      await loadUsers();
    } catch (err) {
      describeError(err, 'cambiar el estado de la cuenta');
    }
  };

  // Panel honesto: SOLO rol platform accede a este módulo
  if (!isPlatform) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-12 border-dashed border-slate-300 text-center space-y-3">
          <Lock className="w-10 h-10 mx-auto text-slate-400" />
          <h2 className="text-lg font-black text-slate-900">Acceso restringido</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Este módulo requiere el rol <strong>Super Admin (platform)</strong>. La administración de roles,
            accesos y PINs de toda la plataforma no está disponible para tu cuenta.
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Usuarios & Control de Accesos (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administración centralizada de cuentas de usuario, roles de plataforma, accesos a garita y PINs de seguridad.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#151D2F] shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Conductores (Clientes)</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.user}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
            <UserCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#151D2F] shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Operadores de Garita</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.local}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#151D2F] shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Super Admins Plataforma</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.platform}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <KeyRound className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#151D2F] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
            {['all', 'user', 'local', 'platform'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                  roleFilter === r
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {r === 'all' ? 'Todos los Roles' : r === 'user' ? 'Conductores' : r === 'local' ? 'Operadores' : 'Super Admins'}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-3 text-sm font-bold">Cargando directorio de usuarios...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center space-y-1">
            <Shield className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No hay usuarios que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Seguridad / PIN</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase text-xs ${u.is_active === false ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                          {(u.full_name || '?').charAt(0)}
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-white block font-bold">{u.full_name}</strong>
                          <span className="text-[11px] text-slate-400 dark:text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">{u.phone || 'Sin teléfono'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                          u.role === 'platform'
                            ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                            : u.role === 'local'
                            ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        <option value="user">Conductor (user)</option>
                        <option value="local">Operador Garita (local)</option>
                        <option value="platform">Super Admin (platform)</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">••••</span>
                        <button
                          onClick={() => handleOpenPin(u)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition cursor-pointer"
                          title="Cambiar PIN"
                        >
                          <KeyRound className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold ${u.is_active === false ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ● {u.is_active === false ? 'Inactivo' : 'Activo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-400 text-[11px]">{formatDate(u.created_at)}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Editar datos"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          u.is_active === false
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20'
                            : 'text-slate-400 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/20'
                        }`}
                        title={u.is_active === false ? 'Activar cuenta' : 'Desactivar cuenta'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Agregar Usuario */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-black text-slate-900">Registrar Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Crea credenciales de acceso al sistema.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
              <Input
                type="text"
                placeholder="Nombres y Apellidos"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                placeholder="usuario@correo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña * (mínimo 8 caracteres)</label>
              <Input
                type="password"
                placeholder="********"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
                required
                className="text-xs"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400 shrink-0" />
              <span>
                Los nuevos usuarios se crean siempre con rol <strong>Conductor (user)</strong>.
                Usa el selector de la tabla para promoverlos a Operador o Super Admin después del registro.
              </span>
            </div>

            <Button type="submit" className="w-full font-bold text-xs py-3 bg-emerald-600 hover:bg-emerald-700 mt-2">
              Crear Usuario
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuario */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-black text-slate-900">Editar Usuario</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Actualiza los datos y nivel de acceso.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="text-xs bg-slate-100 text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400">El correo no puede modificarse desde la plataforma.</span>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Móvil</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rol de Acceso *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="user">Conductor</option>
                <option value="local">Operador de Garita</option>
                <option value="platform">Super Admin</option>
              </select>
            </div>

            <Button type="submit" className="w-full font-bold text-xs py-3 bg-emerald-600 hover:bg-emerald-700 mt-2">
              Guardar Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cambiar PIN */}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="max-w-xs rounded-3xl p-6 bg-white border-slate-200 text-center">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-black text-slate-900">PIN de Garita / Acceso</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Define un nuevo PIN para {selectedUser?.full_name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 pt-4">
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                type="password"
                maxLength={6}
                placeholder="4 a 6 dígitos"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                className="pl-9 font-mono text-center text-lg tracking-widest font-black"
                required
              />
            </div>

            <Button type="submit" className="w-full font-bold text-xs py-3 bg-slate-900 hover:bg-slate-800">
              Actualizar PIN
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
