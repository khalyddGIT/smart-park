import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
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
import { Skeleton, SkeletonCard, SkeletonRow } from './ui/skeleton';
import api from '../services/api';

export const PlatformGlobalDashboard = ({ onNavigateTab }) => {
  const { establishments, reservations, affiliationRequests = [] } = useEstablishments();
  const [timeRange, setTimeRange] = useState('semana');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [liveEventsReal, setLiveEventsReal] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0 });

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [finRes, auditRes, revRes] = await Promise.allSettled([
        api.get('/finances/summary'),
        api.get('/audit/logs', { params: { limit: 8 } }),
        api.get('/reviews'),
      ]);
      if (finRes.status === 'fulfilled' && finRes.value?.data) setSummary(finRes.value.data);
      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value?.data)) {
        const logs = auditRes.value.data.slice(0, 4).map((l, idx) => ({
          id: l.id || idx,
          title: l.action?.slice(0, 40) || 'Evento',
          desc: l.target?.slice(0, 60) || l.operator || '',
          time: l.timestamp?.slice(11, 16) || '',
          badge: l.action?.includes('ANPR') ? 'ANPR Gate' : l.action?.includes('Liquidación') ? 'Finanzas' : l.action?.includes('Incidencia') ? 'Operaciones' : 'Sistema',
          color: l.severity === 'Crítico' ? 'amber' : l.action?.includes('ANPR') ? 'emerald' : 'blue',
        }));
        if (logs.length) setLiveEventsReal(logs);
      }
      if (revRes.status === 'fulfilled' && Array.isArray(revRes.value?.data)) {
        const revs = revRes.value.data;
        const avg = revs.length ? (revs.reduce((a, r) => a + Number(r.rating || 0), 0) / revs.length) : 0;
        setReviewStats({ avg: Number(avg.toFixed(1)), count: revs.length });
      }
    } catch {}
    finally { setTimeout(() => setIsRefreshing(false), 300); }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    fetchDashboardData();
  };

  // Cálculos dinámicos reales
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
    : 0;

  // Datos reales desde finanzas
  const grossRevenueToday = summary?.totales?.recaudacion_bruta_global ?? 0;
  const netCommissionToday = summary?.totales?.comision_liquida_global ?? 0;
  const activeBookingsCount = summary?.totales?.total_reservas_global ?? reservations.filter(r => r.status === 'ACTIVE' || r.status === 'SCHEDULED').length;

  // Ranking real por recaudación desde summary.por_sede
  const branchPerformance = useMemo(() => {
    if (summary?.por_sede?.length) {
      return summary.por_sede.slice(0, 6).map(s => {
        const est = establishments.find(e => String(e.id) === String(s.parking_id));
        const slots = (est?.elements || []).filter(el => el.type === 'slot');
        const free = slots.filter(el => el.status === 'free').length;
        const total = slots.length || est?.totalSlots || s.total_reservas || 20;
        const occ = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
        return {
          id: s.parking_id,
          name: s.parking_name?.replace('Smart Park ', '') || `Sede #${s.parking_id}`,
          address: est?.address || '',
          occupancy: occ,
          totalSlots: total,
          freeSlots: free,
          revenueToday: Number(s.recaudacion_bruta || 0),
          lprStatus: 'ONLINE'
        };
      });
    }
    return establishments.slice(0, 6).map((e) => {
      const slots = (e.elements || []).filter(el => el.type === 'slot');
      const free = slots.filter(el => el.status === 'free').length;
      const total = slots.length || e.totalSlots || 20;
      const occ = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
      return { id: e.id, name: e.name.replace('Smart Park ', ''), address: e.address, occupancy: occ, totalSlots: total, freeSlots: free, revenueToday: 0, lprStatus: 'ONLINE' };
    });
  }, [summary, establishments]);

  // Timeline real derivado de por_sede (si no hay histórico diario, mostrar por sede como barra)
  const revenueTimeline = useMemo(() => {
    if (summary?.por_sede?.length) {
      return summary.por_sede.slice(0, 7).map(s => ({
        day: s.parking_name?.split(' ').slice(-2).join(' ') || `Sede ${s.parking_id}`,
        total: Number(s.recaudacion_bruta || 0),
        comision: Number(s.comision_12 || 0),
        reservas: s.total_reservas || 0,
      }));
    }
    return [];
  }, [summary]);

  const paymentMethodsReal = useMemo(() => {
    if (!summary) return [];
    // Sin desglose por método en summary, mostrar distribución estimada desde totales (placeholder honesto)
    return [];
  }, [summary]);

  const liveEvents = liveEventsReal.length ? liveEventsReal : [
    { id: 1, type: 'LPR_ENTRY', title: 'Sin eventos recientes', desc: 'La bitácora se llenará con la actividad real', time: '—', badge: 'Sistema', color: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Banner Ejecutivo de Bienvenida & Controles */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Red Multi-Tenant Ayacucho • Datos en vivo desde /finances/summary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Panel Ejecutivo del Propietario
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Supervisión integral de recaudación bruta, comisiones de la plataforma, ocupación en tiempo real y red de cocheras afiliadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Button
            onClick={() => onNavigateTab && onNavigateTab('finances')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-md gap-1.5 py-5"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Liquidar Fondos</span>
          </Button>

          <Button
            onClick={() => onNavigateTab && onNavigateTab('affiliates')}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs rounded-2xl gap-1.5 py-5"
          >
            <Building2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Ver Sedes ({totalBranches})</span>
          </Button>

          <Button
            onClick={() => onNavigateTab && onNavigateTab('settings')}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs rounded-2xl gap-1.5 py-5"
          >
            <Send className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Emitir Comunicado</span>
          </Button>
        </div>
      </div>

      {pendingRequests > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/25 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <strong className="text-sm font-black block text-amber-950 dark:text-amber-200">
                ¡Tienes {pendingRequests} solicitud(es) de afiliación pendientes!
              </strong>
              <span className="text-amber-800/80 dark:text-amber-300/80">
                Revisa los documentos y aprueba el alta de nuevos locales en la red de Huamanga.
              </span>
            </div>
          </div>
          <Button
            onClick={() => onNavigateTab && onNavigateTab('affiliates')}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            <span>Revisar y Aprobar Ahora →</span>
          </Button>
        </div>
      )}

      {isRefreshing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Recaudación Total</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                S/ {Number(grossRevenueToday).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{summary ? 'Acumulado real (excluye canceladas)' : 'Sin datos aún'}</span>
            </div>
          </Card>

          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Comisión Neta (12%)</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center">
                <Percent className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                S/ {Number(netCommissionToday).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">Ganancia de plataforma</span>
            </div>
          </Card>

          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Locales Afiliados</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Building2 className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {totalBranches} Sedes
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">● Reales en BD</span>
            </div>
          </Card>

          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Ocupación Red</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Activity className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {occupancyPercentage}%
              </h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${occupancyPercentage}%` }} />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Estancias Totales</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Car className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {Number(activeBookingsCount)} Reservas
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">{freeSlotsCount} plazas libres</span>
            </div>
          </Card>

          <Card className="p-4 border-slate-200/90 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-[#151D2F] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider">Calificación Red</span>
              <div className="w-7 h-7 shrink-0 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 shrink-0 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {reviewStats.count ? `${reviewStats.avg} ★` : '—'}
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">{reviewStats.count ? `${reviewStats.count} reseñas reales` : 'Sin reseñas aún'}</span>
            </div>
          </Card>

        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="lg:col-span-2 p-6 rounded-3xl border-slate-200/90 dark:border-slate-800/80 shadow-xs bg-white dark:bg-[#151D2F] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>Recaudación por Sede (Real)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ranking derivado de <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded">GET /finances/summary</code> — excluye canceladas.</p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            {revenueTimeline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                <BarChart3 className="w-8 h-8" />
                <span className="text-xs font-bold">Sin recaudación aún — crea reservas para ver el ranking</span>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `S/ ${v}`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `S/ ${Number(value).toFixed(2)}`,
                    name === 'total' ? 'Recaudación Bruta' : 'Comisión 12%'
                  ]}
                  contentStyle={{ borderRadius: '16px', background: '#0F172A', color: '#FFF', border: '1px solid #1E293B', fontSize: '12px' }}
                />
                <Legend 
                  formatter={(value) => value === 'total' ? 'Recaudación Bruta' : 'Comisión'}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar dataKey="total" fill="#38BDF8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="comision" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-slate-200/90 dark:border-slate-800/80 shadow-xs bg-white dark:bg-[#151D2F] space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>Resumen Financiero</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Totales reales del sistema.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Recaudación Bruta</span>
              <strong className="font-mono text-slate-900 dark:text-white">S/ {Number(grossRevenueToday).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between p-3 bg-emerald-50/70 dark:bg-emerald-500/10 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
              <span className="text-emerald-800 dark:text-emerald-300 font-bold">Comisión Plataforma</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">S/ {Number(netCommissionToday).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Reservas Totales</span>
              <strong className="font-mono text-slate-900 dark:text-white">{activeBookingsCount}</strong>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Sedes Activas</span>
              <strong className="font-mono text-slate-900 dark:text-white">{totalBranches}</strong>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">Fuente: <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded">GET /finances/summary</code> + <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded">GET /reviews</code></p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="lg:col-span-2 p-6 rounded-3xl border-slate-200/90 dark:border-slate-800/80 shadow-xs bg-white dark:bg-[#151D2F] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>Monitor de Cocheras de la Red ({establishments.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Estado operativo, aforo y recaudación real por sede.</p>
            </div>
            <Button
              onClick={() => onNavigateTab && onNavigateTab('affiliates')}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <span>Gestionar Sedes →</span>
            </Button>
          </div>

          <div className="space-y-3">
            {branchPerformance.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{b.name}</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-md flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LPR Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span>{b.address}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="text-right w-28">
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Aforo:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{b.occupancy}%</strong>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${b.occupancy > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${b.occupancy}%` }} 
                      />
                    </div>
                  </div>

                  <div className="text-right font-mono border-l border-slate-200 dark:border-slate-700 pl-3">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase">Recaudado</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">S/ {Number(b.revenueToday).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-slate-200/90 dark:border-slate-800/80 shadow-xs bg-white dark:bg-[#151D2F] space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
                <span>Live Feed de la Red</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Eventos reales de <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 rounded">GET /audit/logs</code>.</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-3">
            {liveEvents.map((ev) => (
              <div key={ev.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-md ${
                    ev.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                    ev.color === 'blue' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                    ev.color === 'amber' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                    'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {ev.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{ev.time}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{ev.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{ev.desc}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>

    </div>
  );
};
