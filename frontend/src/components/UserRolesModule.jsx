import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Shield, UserCheck, KeyRound, Plus, Edit3, Trash2, Search, Check, Lock } from 'lucide-react';

export const UserRolesModule = () => {
  const [users, setUsers] = useState([
    { id: 1, full_name: 'Carlos Mendoza', email: 'carlos@smartpark.com', phone: '+51 987654321', role: 'user', security_pin: '1234', lastAccess: 'Hoy 14:20 (Credenciales)' },
    { id: 2, full_name: 'Operador San Isidro', email: 'garita.sanisidro@smartpark.com', phone: '+51 912345678', role: 'local', security_pin: '4321', lastAccess: 'Hoy 12:00 (PIN Virtual)' },
    { id: 3, full_name: 'Administrador General', email: 'admin@smartpark.com', phone: '+51 999888777', role: 'platform', security_pin: '8888', lastAccess: 'Hace 1 hora (PIN)' },
  ]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', role: 'user', password: '' });
  const [pinValue, setPinValue] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(d => ({
            id: d.id,
            full_name: d.full_name,
            email: d.email,
            phone: d.phone || '+51 987654321',
            role: d.role,
            security_pin: '••••',
            lastAccess: 'Registrado en BD'
          }));
          setUsers(mapped);
        }
      })
      .catch(() => {});
  }, []);

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
    setFormData({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleOpenPin = (u) => {
    setSelectedUser(u);
    setPinValue('');
    setShowPinModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) return;

    const newObj = {
      id: Date.now(),
      ...formData,
      security_pin: '1234',
      lastAccess: 'Recién Creado'
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password || 'password123'
        })
      });
      if (res.ok) {
        const saved = await res.json();
        newObj.id = saved.id;
      }
    } catch {}

    setUsers([newObj, ...users]);
    setShowAddModal(false);
    notify(`Usuario "${newObj.full_name}" registrado correctamente.`);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updated = {
      ...selectedUser,
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role
    };

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role
        })
      });
    } catch {}

    setUsers(users.map(u => u.id === selectedUser.id ? updated : u));
    setShowEditModal(false);
    notify(`Usuario "${updated.full_name}" actualizado.`);
  };

  const changeRole = async (id, newRole) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
    } catch {}

    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    notify(`Rol de usuario actualizado a "${newRole}".`);
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!pinValue || pinValue.length < 4) {
      alert('El PIN debe contener al menos 4 dígitos numéricos.');
      return;
    }

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/users/${selectedUser.id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      });
    } catch {}

    setShowPinModal(false);
    notify(`Nuevo PIN configurado para "${selectedUser.full_name}".`);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al usuario "${name}"?`)) return;

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/users/${id}`, { method: 'DELETE' });
    } catch {}

    setUsers(users.filter(u => u.id !== id));
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

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            <span>Directorio Global de Usuarios & Roles (CRUD)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra perfiles de acceso, asignación de permisos y claves PIN de seguridad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="all">Todos los Roles</option>
            <option value="user">Conductor (`user`)</option>
            <option value="local">Admin Local (`local`)</option>
            <option value="platform">Plataforma (`platform`)</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs w-60 rounded-2xl"
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filtered.map((u) => (
          <Card key={u.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center space-x-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-inner ${
                u.role === 'platform' ? 'bg-purple-100 text-purple-700' : u.role === 'local' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {u.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{u.full_name}</h3>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">
                    ({u.role})
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {u.email} • Tel: {u.phone} • <span className="text-slate-400">{u.lastAccess}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Rol */}
              <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 px-1">Rol:</span>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 focus:outline-none"
                >
                  <option value="user">Usuario Conductor</option>
                  <option value="local">Admin Local</option>
                  <option value="platform">Admin Plataforma</option>
                </select>
              </div>

              {/* Botón Reset PIN */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenPin(u)}
                className="font-bold text-xs gap-1 text-amber-700 hover:bg-amber-50 border-amber-200"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>PIN</span>
              </Button>

              {/* Botón Editar */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(u)}
                className="font-bold text-xs gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Button>

              {/* Botón Eliminar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(u.id, u.full_name)}
                className="text-rose-600 hover:bg-rose-50 px-2.5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No se encontraron usuarios</h3>
            <p className="text-xs text-slate-400 mt-1">Modifica tu búsqueda o registra un nuevo usuario.</p>
          </div>
        )}
      </div>

      {/* Modal Nuevo Usuario */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Registrar Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-xs">
              Crea una cuenta con credenciales y perfil de acceso personalizado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <Input
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                placeholder="juan@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                <Input
                  type="text"
                  placeholder="+51 987654321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol Asignado</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="user">Usuario Conductor</option>
                  <option value="local">Admin Local</option>
                  <option value="platform">Admin Plataforma</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña Inicial</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2 bg-emerald-600 hover:bg-emerald-700">
              Registrar Usuario
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuario */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Editar Perfil de Usuario</DialogTitle>
            <DialogDescription className="text-xs">
              Actualiza los datos personales y el rol de seguridad del usuario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                <Input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol Asignado</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="user">Usuario Conductor</option>
                  <option value="local">Admin Local</option>
                  <option value="platform">Admin Plataforma</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2 bg-emerald-600 hover:bg-emerald-700">
              Guardar Cambios
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Reset PIN */}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black">Actualizar PIN de Seguridad</DialogTitle>
            <DialogDescription className="text-xs">
              Asigna un nuevo PIN de 4 a 6 dígitos para {selectedUser?.full_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 my-2">
            <div>
              <Input
                type="password"
                maxLength={6}
                placeholder="1234"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono font-black text-2xl tracking-[0.5em] py-3 rounded-2xl"
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full font-black py-5 bg-amber-600 hover:bg-amber-700">
              Confirmar Nuevo PIN
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
