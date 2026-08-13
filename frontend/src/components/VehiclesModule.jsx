import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Plus, Car, Trash2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export const VehiclesModule = () => {
  const [vehicles, setVehicles] = useState([
    { id: 1, plate: 'ABC-123', type: 'SUV / Camioneta', brand: 'Toyota', model: 'RAV4', color: 'Gris Metálico' },
    { id: 2, plate: 'XYZ-987', type: 'Sedán', brand: 'Honda', model: 'Civic', color: 'Negro' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', type: 'Auto', brand: '', model: '', color: '' });

  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newVehicle.plate) return;
    setVehicles([...vehicles, { id: Date.now(), ...newVehicle }]);
    setShowModal(false);
    setNewVehicle({ plate: '', type: 'Auto', brand: '', model: '', color: '' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis Vehículos Registrados</h1>
          <p className="text-xs text-slate-500">Asocia las matrículas de tus vehículos para la lectura automática ANPR en barreras.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 font-bold shadow-md">
          <Plus className="w-4 h-4" />
          <span>Agregar Vehículo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((v) => (
          <Card key={v.id} className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg shadow-inner">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{v.brand} {v.model} — <span className="font-mono text-emerald-700">{v.plate}</span></h3>
                <p className="text-xs text-slate-500">{v.type} | Color: {v.color}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="success" className="font-bold">ANPR OK</Badge>
              <Button variant="ghost" size="sm" onClick={() => setVehicles(vehicles.filter(x => x.id !== v.id))} className="text-rose-500 hover:bg-rose-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Agregar Vehículo */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Registrar Nuevo Vehículo</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa la placa exactamente como figura en tu tarjeta de propiedad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddVehicle} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Placa de Matrícula</label>
              <Input
                type="text"
                placeholder="ej. ABC-123"
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                className="font-mono uppercase font-bold text-center tracking-widest text-base"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
                <Input
                  type="text"
                  placeholder="Toyota"
                  value={newVehicle.brand}
                  onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                <Input
                  type="text"
                  placeholder="Corolla"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
              <Input
                type="text"
                placeholder="Gris / Negro"
                value={newVehicle.color}
                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2">
              Guardar Vehículo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
