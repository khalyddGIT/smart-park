import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export const AnalyticsGlobalModule = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Analytics & Reportes Consolidados de la Red</h1>
        <p className="text-xs text-slate-500">Métricas analíticas globales de ingresos, volumen de reservas y comportamiento de ocupación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Ingresos Totales (Mes)</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-600">S/ 348,200</p>
          <span className="text-[10px] font-bold text-emerald-700 mt-2 block">+14.2% respecto al mes anterior</span>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Reservas Completadas</span>
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-3xl font-black text-teal-600">42,850</p>
          <span className="text-[10px] font-bold text-teal-700 mt-2 block">99.2% de tasa de efectividad</span>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Conductores Activos</span>
            <Users className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-3xl font-black text-cyan-600">18,400</p>
          <span className="text-[10px] font-bold text-cyan-700 mt-2 block">+1,200 nuevos usuarios este mes</span>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Aperturas ANPR</span>
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-600">38,120</p>
          <span className="text-[10px] font-bold text-amber-700 mt-2 block">99.4% precisión en lectura</span>
        </Card>
      </div>
    </div>
  );
};
