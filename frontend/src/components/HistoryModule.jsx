import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Download, FileText, Calendar, Clock, MapPin } from 'lucide-react';

export const HistoryModule = () => {
  const history = [
    { id: 'ST-9901', date: '2026-08-12', time: '14:30 - 16:45', parking: 'Smart Park Central San Isidro', plate: 'ABC-123', cost: 'S/ 17.00', status: 'Completado' },
    { id: 'ST-8820', date: '2026-08-10', time: '10:00 - 11:30', parking: 'Smart Park Miraflores Kennedy', plate: 'ABC-123', cost: 'S/ 15.00', status: 'Completado' },
    { id: 'ST-7742', date: '2026-08-05', time: '18:15 - 20:00', parking: 'Smart Park Central San Isidro', plate: 'XYZ-987', cost: 'S/ 14.80', status: 'Completado' },
  ];

  const exportCSV = () => {
    const headers = "ID,Fecha,Horario,Estacionamiento,Placa,Costo,Estado\n";
    const rows = history.map(h => `${h.id},${h.date},${h.time},"${h.parking}",${h.plate},${h.cost},${h.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Historial_Estancias_SmartPark.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Historial de Estancias & Movimientos</h1>
          <p className="text-xs text-slate-500">Bitácora completa de parqueos finalizados con sello de tiempo y comprobante.</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 font-bold shadow-sm">
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Exportar Historial (CSV)</span>
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((h) => (
          <Card key={h.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-black text-xs border border-slate-200">
                {h.id}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{h.parking}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {h.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-teal-600" /> {h.time}</span>
                  <span className="font-mono text-slate-700 font-bold">Placa: {h.plate}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 justify-between md:justify-end">
              <span className="text-lg font-black text-emerald-700">{h.cost}</span>
              <Badge variant="success" className="font-bold">{h.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
