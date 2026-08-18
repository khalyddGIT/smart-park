import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Calendar, 
  Download, 
  Layers, 
  Car,
  Clock
} from 'lucide-react';

export const AnalyticsGlobalModule = () => {
  const [timeRange, setTimeRange] = useState('7d');

  // Datos para Recharts: Curva de Afluencia Horaria
  const hourlyData = [
    { hora: '06:00', vehiculos: 18, ocupacion: 20 },
    { hora: '08:00', vehiculos: 85, ocupacion: 78 },
    { hora: '10:00', vehiculos: 110, ocupacion: 90 },
    { hora: '12:00', vehiculos: 140, ocupacion: 98 },
    { hora: '14:00', vehiculos: 105, ocupacion: 85 },
    { hora: '16:00', vehiculos: 125, ocupacion: 92 },
    { hora: '18:00', vehiculos: 155, ocupacion: 100 },
    { hora: '20:00', vehiculos: 98, ocupacion: 75 },
    { hora: '22:00', vehiculos: 38, ocupacion: 32 }
  ];

  // Datos para Recharts: Recaudación por Sede
  const parkingRevenueData = [
    { sede: 'Plaza Mayor', recaudacion: 14850, estancias: 1420 },
    { sede: 'Jr. 28 de Julio', recaudacion: 9620, estancias: 890 },
    { sede: 'Av. Independencia', recaudacion: 18400, estancias: 1750 }
  ];

  // Datos para Recharts: Distribución por Tipo de Vehículo
  const vehicleTypeData = [
    { name: 'Sedán / Auto', value: 62, color: '#10b981' },
    { name: 'SUV / Camioneta', value: 24, color: '#0d9488' },
    { name: 'Motocicletas', value: 10, color: '#f59e0b' },
    { name: 'PMR Inclusivo', value: 4, color: '#3b82f6' }
  ];

  const exportReport = () => {
    const headers = "Hora,Vehiculos,Ocupacion_Porcentaje\n";
    const rows = hourlyData.map(d => `${d.hora},${d.vehiculos},${d.ocupacion}%`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_analitica_smartpark_${timeRange}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            <span>Analítica & Tendencias de Ocupación</span>
          </h1>
          <p className="text-xs text-slate-500">
            Métricas de afluencia horaria, predicción de demanda y recaudación en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="today">Hoy (Tiempo Real)</option>
            <option value="7d">Últimos 7 Días</option>
            <option value="30d">Últimos 30 Días</option>
          </select>
          <Button onClick={exportReport} variant="outline" className="gap-2 font-bold text-xs">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Recaudación Total</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">S/ 42,870.00</p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +14.2% vs periodo anterior
          </span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Estancias Registradas</span>
            <Car className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">4,060</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Vehículos atendidos</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Ocupación Pico</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">98.4%</p>
          <span className="text-[10px] text-amber-700 font-bold mt-1 block">Horario Punta: 18:00 - 19:30</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Rotación por Plaza</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">4.8 veh/día</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Índice de eficiencia de cajones</span>
        </Card>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Afluencia Horaria (AreaChart) */}
        <div className="lg:col-span-8">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Afluencia Vehicular por Hora</h3>
                <p className="text-xs text-slate-500">Curva de ocupación y volumen de ingreso en tiempo real</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVehiculos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hora" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="vehiculos" name="Vehículos" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVehiculos)" />
                  <Area type="monotone" dataKey="ocupacion" name="% Ocupación" stroke="#0d9488" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorOcupacion)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Gráfico Circular: Distribución por Tipo de Vehículo (PieChart) */}
        <div className="lg:col-span-4">
          <Card className="p-6 border-slate-200 shadow-sm bg-white flex flex-col justify-between h-full">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Tipo de Vehículo</h3>
              <p className="text-xs text-slate-500 mb-4">Distribución porcentual de la flota</p>
              
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {vehicleTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => `${val}%`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {vehicleTypeData.map((v) => (
                <div key={v.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="text-slate-600 font-bold">{v.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{v.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Recaudación por Sede (BarChart) */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white">
        <h3 className="font-extrabold text-slate-900 text-base mb-1">Recaudación por Sede de Estacionamiento</h3>
        <p className="text-xs text-slate-500 mb-4">Ingresos generados en Soles (PEN) por establecimiento</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parkingRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="sede" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `S/ ${val}`} />
              <Tooltip 
                formatter={(val) => `S/ ${Number(val).toLocaleString()}`}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="recaudacion" name="Recaudación (S/)" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
