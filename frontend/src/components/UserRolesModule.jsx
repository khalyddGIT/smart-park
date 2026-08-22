import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Shield, UserCheck, KeyRound, Plus, Edit3, Trash2, Search, Check, Lock } from 'lucide-react';

const USERS_STORAGE_KEY = 'smart_park_users_v2';

const INITIAL_USERS = [
  { id: 1, full_name: 'Carlos Mendoza', email: 'carlos@smartpark.com', phone: '+51 987654321', role: 'user', security_pin: '1234', lastAccess: 'Hoy 14:20 (Credenciales)' },
  { id: 2, full_name: 'Operador San Isidro', email: 'garita.sanisidro@smartpark.com', phone: '+51 912345678', role: 'local', security_pin: '4321', lastAccess: 'Hoy 12:00 (PIN Virtual)' },
  { id: 3, full_name: 'Administrador General', email: 'admin@smartpark.com', phone: '+51 999888777', role: 'platform', security_pin: '8888', lastAccess: 'Hace 1 hora (PIN)' },
];

export const UserRolesModule = () => {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return INITIAL_USERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

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

  const handleOpenAdd = () => {
    setFormData({ full_name: '', email: '', phone: '', role: 'user', password: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormData({ full_name: u.full_name, email: u.email, phone: u.phone, role: u.role, password: '' });
    setShowEditModal(true);
  };

  const handleOpenPin = (u) => {
    setSelectedUser(u);
    setPinValue(u.security_pin || '');
    setShowPinModal(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) return;

    const newObj = {
      id: Date.now(),
      ...formData,
      security_pin: '1234',
      lastAccess: 'Recién Creado'
    };

    const updated = [newObj, ...users];
    setUsers(updated);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setShowAddModal(false);
    notify(`Usuario "${newObj.full_name}" registrado correctamente.`);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updated = users.map(u => u.id === selectedUser.id ? {
      ...u,
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role
    } : u);

    setUsers(updated);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setShowEditModal(false);
    notify(`Usuario "${formData.full_name}" actualizado.`);
  };

  const changeRole = (id, newRole) => {
    const updated = users.map(u => u.id === id ? { ...u, role: newRole } : u);
    setUsers(updated);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    notify(`Rol de usuario actualizado a "${newRole}".`);
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!pinValue || pinValue.length < 4) {
      alert('El PIN debe contener al menos 4 dígitos numéricos.');
      return;
    }

    const updated = users.map(u => u.id === selectedUser.id ? { ...u, security_pin: pinValue } : u);
    setUsers(updated);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    setShowPinModal(false);
    notify(`Nuevo PIN configurado para "${selectedUser.full_name}".`);
  };

  const handleDelete = (id, name) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    notify(`Usuario "${name}" eliminado del directorio.`);
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            <span>Usuarios & Control de Accesos (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administración centralizada de cuentas de usuario, roles de plataforma, accesos a garita y PINs de seguridad.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Conductores (Clientes)</span>
            <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'user').length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Operadores de Garita</span>
            <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'local').length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Shield className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Super Admins Plataforma</span>
            <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'platform').length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <KeyRound className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white text-xs"
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
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r === 'all' ? 'Todos los Roles' : r === 'user' ? 'Conductores' : r === 'local' ? 'Operadores' : 'Super Admins'}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Seguridad / PIN</th>
                <th className="py-3 px-4">Último Acceso</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase text-xs">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <strong className="text-slate-900 block font-bold">{u.full_name}</strong>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">{u.phone || '+51 987654321'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                        u.role === 'platform'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role === 'local'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <option value="user">Conductor (user)</option>
                      <option value="local">Operador Garita (local)</option>
                      <option value="platform">Super Admin (platform)</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-slate-500 font-bold">••••</span>
                      <button
                        onClick={() => handleOpenPin(u)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 transition cursor-pointer"
                        title="Cambiar PIN"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{u.lastAccess || 'Hoy'}</td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.full_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Agregar Usuario */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-black text-slate-900">Registrar Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Crea credenciales con asignación de rol en el sistema.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
              <Input
                type="text"
                placeholder="Ej. Juan Pérez"
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
                placeholder="juan.perez@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Móvil</label>
              <Input
                type="tel"
                placeholder="+51 987654321"
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
                <option value="user">Conductor (Acceso a Mapa, Reservas y Pagos)</option>
                <option value="local">Admin Local Cochera (Gestión de Sede, Garita & Personal)</option>
                <option value="platform">Super Admin (Control Global, Finanzas & Licencias)</option>
              </select>
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
              <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs"
              />
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
            <DialogDescription className="text-xs text-slate-500">Para {selectedUser?.full_name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 pt-4">
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                type="password"
                maxLength={6}
                placeholder="4 o 6 dígitos"
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
