import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Building2, 
  TrendingUp, 
  Percent, 
  Users, 
  Car, 
  CalendarCheck, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Send, 
  Download, 
  Plus, 
  ChevronRight, 
  Sparkles,
  MapPin,
  Layers,
  Radio,
  BarChart3,
  CreditCard,
  Wallet
} from 'lucide-react';
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
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { useEstablishments } from '../context/EstablishmentContext';

// Datos de recaudación histórica para gráficos
const REVENUE_TIMELINE = [
  { day: 'Lun', total: 4200, comision: 504, reservas: 180 },
  { day: 'Mar', total: 5100, comision: 612, reservas: 210 },
  { day: 'Mie', total: 4800, comision: 576, reservas: 195 },
  { day: 'Jue', total: 6300, comision: 756, reservas: 260 },
  { day: 'Vie', total: 8900, comision: 1068, reservas: 380 },
  { day: 'Sab', total: 11200, comision: 1344, reservas: 490 },
  { day: 'Dom', total: 9800, comision: 1176, reservas: 420 },
];

const PAYMENT_METHODS_DATA = [
  { name: 'Yape / Plin QR', value: 52, color: '#10B981' },
  { name: 'Tarjetas Visa/MC', value: 34, color: '#0F172A' },
  { name: 'Smart Wallet', value: 14, color: '#06B6D4' }
];

export const PlatformGlobalDashboard = ({ onNavigateTab }) => {
  const { establishments, reservations, affiliationRequests = [] } = useEstablishments();
  const [timeRange, setTimeRange] = useState('semana'); // 'hoy' | 'semana' | 'mes'

  // Cálculos dinámicos
  const totalBranches = establishments.length;
  const pendingRequests = affiliationRequests.filter(r => r.status === 'PENDING').length;

  let totalSlotsCount = 0;
  let freeSlotsCount = 0;
  establishments.forEach(e => {
    const slots = (e.elements || []).filter(el => el.type === 'slot');
    totalSlotsCount += slots.length || e.totalSlots || 0;
    freeSlotsCount += slots.filter(el => el.status === 'free').length;
  });

  const occupiedSlotsCount = Math.max(0, totalSlotsCount - freeSlotsCount);
  const occupancyPercentage = totalSlotsCount > 0 
    ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) 
    : 68;

  // Ganancias estimadas
  const grossRevenueToday = 14250.00;
  const netCommissionToday = grossRevenueToday * 0.12; // 12% comisión
  const activeBookingsCount = reservations.filter(r => r.status === 'ACTIVE' || r.status === 'SCHEDULED').length || 42;

  // Ranking de sedes por recaudación y aforo
  const branchPerformance = establishments.map((e, idx) => {
    const slots = (e.elements || []).filter(el => el.type === 'slot');
    const free = slots.filter(el => el.status === 'free').length;
    const total = slots.length || e.totalSlots || 20;
    const occ = total > 0 ? Math.round(((total - free) / total) * 100) : 75;
    const revenue = 2100 + (idx * 650);

    return {
      id: e.id,
      name: e.name.replace('Smart Park ', ''),
      address: e.address,
      occupancy: occ,
      totalSlots: total,
      freeSlots: free,
      revenueToday: revenue,
      lprStatus: 'ONLINE'
    };
  });

  // Feed en vivo de eventos de la red
  const liveEvents = [
    { id: 1, type: 'LPR_ENTRY', title: 'Ingreso LPR Reconocido', desc: 'Vehículo XYZ-789 ingresó a Plaza Mayor PB', time: 'Hace 2 min', badge: 'ANPR Gate', color: 'emerald' },
    { id: 2, type: 'PAYMENT', title: 'Reserva Pagada con Yape', desc: 'S/ 12.00 cobrado • Comisión Smart-Park S/ 1.44', time: 'Hace 5 min', badge: 'Finanzas', color: 'blue' },
    { id: 3, type: 'OCCUPANCY', title: 'Alerta de Alta Ocupación', desc: 'Sede Sótano 1 alcanzó el 88% de capacidad', time: 'Hace 12 min', badge: 'Operaciones', color: 'amber' },
    { id: 4, type: 'AFFILIATION', title: 'Nueva Solicitud de Cochera', desc: 'Cochera Las Nazarenas solicitó afiliación', time: 'Hace 25 min', badge: 'Afiliación', color: 'indigo' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Banner Ejecutivo de Bienvenida & Controles */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Red Multi-Tenant Ayacucho • Uptime 99.98%</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Panel Ejecutivo del Propietario
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Supervisión integral de recaudación bruta, comisiones de la plataforma, ocupación en tiempo real y red de cocheras afiliadas.
          </p>
        </div>

        {/* Acciones Rápidas del Propietario */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Button
            onClick={() => onNavigateTab && onNavigateTab('finances')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-md gap-1.5 py-5"
          >
            <Wallet className="w-4 h-4" />
            <span>Liquidar Fondos</span>
          </Button>

          <Button
            onClick={() => onNavigateTab && onNavigateTab('affiliates')}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs rounded-2xl gap-1.5 py-5"
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Ver Sedes ({totalBranches})</span>
          </Button>

          <Button
            onClick={() => onNavigateTab && onNavigateTab('settings')}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs rounded-2xl gap-1.5 py-5"
          >
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Emitir Comunicado</span>
          </Button>
        </div>
      </div>

      {/* Alerta de Solicitudes de Afiliación Pendientes */}
      {pendingRequests > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center space-x-3 text-amber-900 text-xs">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-sm font-black block">¡Tienes {pendingRequests} solicitud(es) de afiliación de cocheras pendientes!</strong>
              <span>Revisa los documentos y aprueba el alta de nuevos locales en la red de Huamanga.</span>
            </div>
          </div>
          <Button
            onClick={() => onNavigateTab && onNavigateTab('affiliates')}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
          >
            <span>Revisar y Aprobar Ahora →</span>
          </Button>
        </div>
      )}

      {/* Grid de 6 KPIs Financieros & Operativos en Vivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Recaudación Bruta Hoy */}
        <Card className="p-4 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Recaudación Hoy</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 font-mono">
              S/ {grossRevenueToday.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" /> +14.2% vs ayer
            </span>
          </div>
        </Card>

        {/* Comisión Smart-Park */}
        <Card className="p-4 border-emerald-200 rounded-3xl bg-emerald-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Comisión Neta (12%)</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-emerald-700 font-mono">
              S/ {netCommissionToday.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-medium text-emerald-800/80 mt-0.5 block">Ganancia de plataforma</span>
          </div>
        </Card>

        {/* Cocheras Activas */}
        <Card className="p-4 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Locales Afiliados</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 font-mono">
              {totalBranches} Sedes
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">● 100% Operativas</span>
          </div>
        </Card>

        {/* Ocupación Media */}
        <Card className="p-4 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Ocupación Red</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-amber-600 font-mono">
              {occupancyPercentage}%
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${occupancyPercentage}%` }} />
            </div>
          </div>
        </Card>

        {/* Reservas Activas */}
        <Card className="p-4 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Estancias en Curso</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Car className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 font-mono">
              {activeBookingsCount} Autos
            </h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">{freeSlotsCount} plazas libres</span>
          </div>
        </Card>

        {/* Satisfacción de Clientes */}
        <Card className="p-4 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Calificación Red</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 font-mono">
              4.8 ★
            </h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">480+ reseñas verificadas</span>
          </div>
        </Card>

      </div>

      {/* Gráficos de Inteligencia de Negocios (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Evolución de Ingresos y Comisiones de la Red */}
        <Card className="lg:col-span-2 p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>Volumen de Recaudación & Comisiones Semanales</span>
              </h2>
              <p className="text-xs text-slate-500">Curva diaria de dinero bruto procesado vs. comisión líquida retenida por Smart-Park.</p>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-bold bg-slate-100 p-1 rounded-xl">
              <span className="px-2.5 py-0.5 bg-white rounded-lg shadow-2xs text-slate-900">Esta Semana</span>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TIMELINE} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorComision" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `S/ ${v}`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `S/ ${Number(value).toFixed(2)}`,
                    name === 'total' ? 'Recaudación Bruta Red' : 'Comisión Smart-Park (12%)'
                  ]}
                  contentStyle={{ borderRadius: '16px', background: '#0F172A', color: '#FFF', border: 'none', fontSize: '12px' }}
                />
                <Legend 
                  formatter={(value) => value === 'total' ? 'Recaudación Bruta Red' : 'Comisión Líquida Smart-Park'}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#0F172A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="comision" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorComision)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico 2: Desglose por Medio de Pago */}
        <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Medios de Pago</span>
            </h2>
            <p className="text-xs text-slate-500">Distribución de cobros en Ayacucho.</p>
          </div>

          <div className="h-[200px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PAYMENT_METHODS_DATA}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PAYMENT_METHODS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}% del total`, 'Participación']}
                  contentStyle={{ borderRadius: '14px', background: '#0F172A', color: '#FFF', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 font-mono">100%</span>
              <span className="text-[10px] text-slate-400 block font-bold">Digital</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {PAYMENT_METHODS_DATA.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-slate-700 font-medium">{p.name}</span>
                </div>
                <strong className="text-slate-900 font-mono">{p.value}%</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sección Inferior: Monitor de Sedes & Live Feed de Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monitor en Vivo de Cocheras Afiliadas */}
        <Card className="lg:col-span-2 p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Monitor de Cocheras de la Red ({establishments.length})</span>
              </h2>
              <p className="text-xs text-slate-500">Estado operativo, aforo y recaudación de cada establecimiento.</p>
            </div>
            <Button
              onClick={() => onNavigateTab && onNavigateTab('affiliates')}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-slate-700 rounded-xl"
            >
              <span>Gestionar Sedes →</span>
            </Button>
          </div>

          <div className="space-y-3">
            {branchPerformance.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900 text-sm">{b.name}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-md flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LPR Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{b.address}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-auto">
                  {/* Barra de Aforo */}
                  <div className="text-right w-28">
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-500">Aforo:</span>
                      <strong className="text-slate-800">{b.occupancy}%</strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${b.occupancy > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${b.occupancy}%` }} 
                      />
                    </div>
                  </div>

                  {/* Recaudación Hoy */}
                  <div className="text-right font-mono border-l border-slate-200 pl-3">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Recaudado</span>
                    <span className="text-xs font-black text-slate-900">S/ {b.revenueToday.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Stream de Eventos en Tiempo Real */}
        <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Live Feed de la Red</span>
              </h2>
              <p className="text-xs text-slate-500">Transacciones e ingresos en vivo.</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-3">
            {liveEvents.map((ev) => (
              <div key={ev.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 hover:bg-slate-100/80 transition">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-md ${
                    ev.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                    ev.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    ev.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {ev.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{ev.time}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                <p className="text-[11px] text-slate-600">{ev.desc}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>

    </div>
  );
};
