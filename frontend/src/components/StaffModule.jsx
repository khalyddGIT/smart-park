import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Users, Plus, Edit3, Trash2, Search, Download, Clock, ShieldCheck, Check, UserCheck } from 'lucide-react';

const STAFF_STORAGE_KEY = 'smart_park_staff_v2';

const INITIAL_STAFF = [
  { id: 1, full_name: 'Juan Pérez Mendoza', dni: '44556677', position: 'Operador Garita Principal', shift: 'Mañana (07:00 - 15:00)', status: 'Activo', parking_name: 'Smart Park Central San Isidro' },
  { id: 2, full_name: 'Rosa Gutiérrez Alva', dni: '72334411', position: 'Supervisora de Operaciones', shift: 'Tarde (15:00 - 23:00)', status: 'Activo', parking_name: 'Smart Park Central San Isidro' },
  { id: 3, full_name: 'Marcos Quispe Lara', dni: '48990022', position: 'Seguridad & Monitoreo ANPR', shift: 'Noche (23:00 - 07:00)', status: 'Activo', parking_name: 'Smart Park Central San Isidro' },
];

export const StaffModule = () => {
  const [staff, setStaff] = useState(() => {
    try {
      const saved = localStorage.getItem(STAFF_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_STAFF;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
    } catch (e) {}
  }, [staff]);
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
    parking_id: 1
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/staff')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(d => ({
            id: d.id,
            full_name: d.full_name,
            dni: d.dni,
            position: d.position,
            shift: d.shift || 'Mañana',
            status: d.status === 'active' ? 'Activo' : 'Inactivo',
            parking_name: 'Smart Park Central'
          }));
          setStaff(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({ full_name: '', dni: '', position: 'Operador de Garita', shift: 'Mañana (07:00 - 15:00)', status: 'Activo', parking_id: 1 });
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
      parking_id: 1
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.dni) return;

    const newObj = {
      id: Date.now(),
      ...formData,
      parking_name: 'Smart Park Central'
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parking_id: 1,
          full_name: formData.full_name,
          dni: formData.dni,
          position: formData.position,
          shift: formData.shift,
          status: formData.status === 'Activo' ? 'active' : 'inactive'
        })
      });
      if (res.ok) {
        const saved = await res.json();
        newObj.id = saved.id;
      }
    } catch {}

    setStaff([newObj, ...staff]);
    setShowAddModal(false);
    notify(`Colaborador "${newObj.full_name}" registrado en la nómina.`);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    const updated = {
      ...selectedMember,
      ...formData
    };

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/staff/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          dni: formData.dni,
          position: formData.position,
          shift: formData.shift,
          status: formData.status === 'Activo' ? 'active' : 'inactive'
        })
      });
    } catch {}

    setStaff(staff.map(s => s.id === selectedMember.id ? updated : s));
    setShowEditModal(false);
    notify(`Colaborador "${updated.full_name}" actualizado.`);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas dar de baja a "${name}" de la nómina?`)) return;

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/staff/${id}`, { method: 'DELETE' });
    } catch {}

    setStaff(staff.filter(s => s.id !== id));
    notify(`Colaborador "${name}" eliminado de la nómina.`);
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
    notify('Nómina de personal exportada en formato CSV.');
  };

  const filtered = staff.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.dni.includes(search) || s.position.toLowerCase().includes(search.toLowerCase());
    const matchesShift = shiftFilter === 'all' || s.shift.toLowerCase().includes(shiftFilter.toLowerCase());
    return matchesSearch && matchesShift;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((s) => (
          <Card key={s.id} className="p-6 border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shadow-inner">
                  {s.full_name.charAt(0)}
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

            <Button type="submit" className="w-full font-black py-5 mt-2 bg-emerald-600 hover:bg-emerald-700">
              Registrar Colaborador
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
