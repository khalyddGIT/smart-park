import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Building2, Plus, CheckCircle2, AlertTriangle, Shield, Edit, Settings } from 'lucide-react';

export const AffiliatedParkingsModule = () => {
  const [parkings, setParkings] = useState([
    { id: 1, name: 'Smart Park Central San Isidro', city: 'San Isidro', capacity: 30, commission: '12%', status: 'Activo', owner: 'Inmobiliaria Prado' },
    { id: 2, name: 'Smart Park Miraflores Kennedy', city: 'Miraflores', capacity: 25, commission: '15%', status: 'Activo', owner: 'Inversiones Shell S.A.' },
    { id: 3, name: 'Smart Park Jockey Plaza', city: 'Surco', capacity: 80, commission: '10%', status: 'En Mantenimiento', owner: 'Parqueos Jockey' },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParking, setNewParking] = useState({ name: '', city: '', capacity: '', commission: '12%' });

  const toggleStatus = (id) => {
    setParkings(parkings.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'Activo' ? 'En Mantenimiento' : 'Activo';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newParking.name) return;
    setParkings([...parkings, { id: Date.now(), ...newParking, status: 'Activo', owner: 'Nuevo Afiliado' }]);
    setShowAddModal(false);
    setNewParking({ name: '', city: '', capacity: '', commission: '12%' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Estacionamientos Afiliados a la Red</h1>
          <p className="text-xs text-slate-500">Administra los locales comerciales, comisiones SaaS y estados operativos.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 font-bold shadow-md">
          <Plus className="w-4 h-4" />
          <span>Afiliar Nuevo Local</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {parkings.map((p) => (
          <Card key={p.id} className="p-6 border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black shadow-inner">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge variant={p.status === 'Activo' ? 'success' : 'warning'} className="font-bold">
                  {p.status}
                </Badge>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">{p.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{p.city} • <span className="font-mono">{p.owner}</span></p>

              <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                <p className="flex justify-between text-slate-600">
                  <span>Capacidad:</span> <span className="font-bold text-slate-900">{p.capacity} Cajones</span>
                </p>
                <p className="flex justify-between text-slate-600">
                  <span>Comisión SaaS:</span> <span className="font-bold text-emerald-700">{p.commission}</span>
                </p>
              </div>
            </div>

            <Button
              variant={p.status === 'Activo' ? 'outline' : 'default'}
              size="sm"
              onClick={() => toggleStatus(p.id)}
              className="w-full font-bold"
            >
              {p.status === 'Activo' ? 'Poner en Mantenimiento' : 'Activar Local'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Modal Afiliar Local */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Afiliar Nuevo Estacionamiento</DialogTitle>
            <DialogDescription className="text-xs">
              Registra los datos comerciales del nuevo socio de la red Smart Park.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial</label>
              <Input
                type="text"
                placeholder="ej. Smart Park Real Plaza"
                value={newParking.name}
                onChange={(e) => setNewParking({ ...newParking, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad / Distrito</label>
                <Input
                  type="text"
                  placeholder="San Isidro"
                  value={newParking.city}
                  onChange={(e) => setNewParking({ ...newParking, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Capacidad Cajones</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newParking.capacity}
                  onChange={(e) => setNewParking({ ...newParking, capacity: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2">
              Registrar Afiliado
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
