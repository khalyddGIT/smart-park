import React, { useState, useEffect, useMemo } from 'react';
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
} from 'recharts';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Download,
  Car,
  Clock,
  Loader2,
  Star,
  Check,
} from 'lucide-react';
import api, { getAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Colores para distribución de reseñas (5→1 estrella)
const RATING_COLORS = {
  5: '#10b981',
  4: '#0d9488',
  3: '#f59e0b',
  2: '#f97316',
  1: '#ef4444',
};

const is401 = (err) => err?.response?.status === 401;

// Filtra reservas dentro del rango seleccionado
const isWithinRange = (iso, range) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (range === '7d') {
    return now - d <= 7 * 24 * 60 * 60 * 1000 && d <= now;
  }
  if (range === '30d') {
    return now - d <= 30 * 24 * 60 * 60 * 1000 && d <= now;
  }
  return true;
};

export const AnalyticsGlobalModule = () => {
  const { role } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [revenueScopeNote, setRevenueScopeNote] = useState('');
  const [financesSummary, setFinancesSummary] = useState(null);
  const [floorOccupancy, setFloorOccupancy] = useState({}); // parking_id -> { total, free, occupied }

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();

    const fetchAll = async () => {
      setLoading(true);
      // Finanzas reales para platform (corrige limitación my-reservations)
      if (role === 'platform') {
        try {
          const f = await api.get('/finances/summary');
          if (!cancelled && f.data) {
            setFinancesSummary(f.data);
            setRevenueScopeNote('Datos reales desde GET /finances/summary (global, excluye canceladas, 12% comisión).');
          }
        } catch {}
      } else {
        setFinancesSummary(null);
      }
      const results = await Promise.allSettled([
        api.get('/parkings'),
        api.get('/reviews'),
        // Reservas: solo si hay token; intenta /reservations para platform/local y cae a my-reservations
        (async () => {
          if (!token) return { data: [] };
          // Si es platform/local intenta endpoint sin filtro (si existe) para visión más amplia
          if (role === 'platform' || role === 'local') {
            try {
              const r = await api.get('/reservations');
              if (!cancelled) setRevenueScopeNote('Visión: reservas visibles para tu usuario vía GET /reservations (alcance de tu rol). Si el backend aísla por usuario, verás solo las tuyas — se requiere endpoint agregado cross-usuarios para analytics globales reales.');
              return r;
            } catch (e) {
              if (is401(e)) {
                if (!cancelled) setRevenueScopeNote('Sin sesión válida para reservas.');
                return { data: [] };
              }
              // Fallback honesto a my-reservations
              try {
                const r2 = await api.get('/reservations/my-reservations');
                if (!cancelled) setRevenueScopeNote('Limitación: solo reservas propias visibles vía GET /reservations/my-reservations. No hay endpoint agregado global; el total es parcial. Roles platform/local ven su propio alcance.');
                return r2;
              } catch (e2) {
                if (!is401(e2)) throw e2;
                if (!cancelled) setRevenueScopeNote('Sin sesión válida para reservas.');
                return { data: [] };
              }
            }
          }
          try {
            const r = await api.get('/reservations/my-reservations');
            if (!cancelled) setRevenueScopeNote('Limitación: solo tus reservas (GET /reservations/my-reservations). Total parcial — no hay endpoint global cross-usuarios.');
            return r;
          } catch (e) {
            if (is401(e)) {
              if (!cancelled) setRevenueScopeNote('Inicia sesión para ver tu recaudación.');
              return { data: [] };
            }
            throw e;
          }
        })(),
      ]);

      if (cancelled) return;

      // Parkings
      if (results[0].status === 'fulfilled') {
        const data = Array.isArray(results[0].value.data) ? results[0].value.data : [];
        setParkings(data);
        // Fetch floor-plan para cada parking de forma tolerante (enriquece ocupación por estado real de slots)
        try {
          const fpResults = await Promise.allSettled(
            data.map((p) => api.get(`/parkings/${p.id}/floor-plan`))
          );
          const occ = {};
          fpResults.forEach((r, idx) => {
            const pid = data[idx]?.id;
            if (r.status === 'fulfilled' && r.value?.data?.slots) {
              const slots = r.value.data.slots;
              const total = slots.length;
              const free = slots.filter((s) => s.status === 'free').length;
              const occupied = slots.filter((s) => s.status === 'occupied').length;
              const reserved = slots.filter((s) => s.status === 'reserved').length;
              occ[pid] = { total, free, occupied, reserved };
            }
          });
          if (!cancelled && Object.keys(occ).length) setFloorOccupancy(occ);
        } catch {
          // silencioso: parkings ya aporta available_slots/total_capacity
        }
      } else if (!is401(results[0].reason)) {
        notify('No se pudieron cargar cocheras.');
      }

      // Reviews (público)
      if (results[1].status === 'fulfilled') {
        const data = Array.isArray(results[1].value.data) ? results[1].value.data : [];
        setReviews(data);
      } else if (!is401(results[1].reason)) {
        notify('No se pudieron cargar reseñas.');
      }

      // Reservations
      if (results[2].status === 'fulfilled') {
        const data = Array.isArray(results[2].value.data) ? results[2].value.data : [];
        setReservations(data);
      } else if (!is401(results[2].reason)) {
        notify('No se pudieron cargar reservas para analítica.');
        if (!cancelled && !revenueScopeNote) setRevenueScopeNote('No se pudieron cargar reservas.');
      }

      // Toast solo para fallos no-401 reales
      results.forEach((r) => {
        if (r.status === 'rejected' && !is401(r.reason)) {
          // ya notificado arriba por categoría
        }
      });

      setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
    // Recarga si cambia role (cambia alcance de reservas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ---- Derivados honestos ----

  const filteredReservations = useMemo(() => {
    if (timeRange === '7d' || timeRange === '30d' || timeRange === 'today') {
      return reservations.filter((r) => isWithinRange(r.start_time || r.created_at, timeRange));
    }
    return reservations;
  }, [reservations, timeRange]);

  // Recaudación: para platform usa /finances/summary (global real), sino suma my-reservations
  const revenueStats = useMemo(() => {
    if (role === 'platform' && financesSummary?.totales) {
      const t = financesSummary.totales;
      return { total: Number(t.recaudacion_bruta_global || 0), count: Number(t.total_reservas_global || 0), cancelled: 0, netCommission: Number(t.comision_liquida_global || 0) };
    }
    const valid = filteredReservations.filter((r) => r.status !== 'cancelled');
    const total = valid.reduce((acc, r) => acc + (Number(r.total_cost) || 0), 0);
    return { total, count: valid.length, cancelled: filteredReservations.length - valid.length };
  }, [filteredReservations, financesSummary, role]);

  // Ocupación por sede: prioriza floor-plan (conteo real de slots), fallback a available_slots/total_capacity
  const ocupacionPorSede = useMemo(() => {
    return parkings.map((p) => {
      const fp = floorOccupancy[p.id];
      let total, libres, ocupados, reservados;
      if (fp && typeof fp.total === 'number') {
        total = fp.total;
        libres = fp.free;
        ocupados = fp.occupied;
        reservados = fp.reserved;
      } else {
        total = Number(p.total_capacity) || 0;
        libres = Number(p.available_slots ?? 0);
        ocupados = Math.max(0, total - libres);
        reservados = 0;
      }
      const ocupacionPct = total ? Math.round(((ocupados + reservados) / total) * 100) : 0;
      return {
        sede: p.name,
        parking_id: p.id,
        total,
        libres,
        ocupados: ocupados + reservados,
        soloOcupados: ocupados,
        reservados,
        ocupacionPct,
        libresPct: total ? Math.round((libres / total) * 100) : 0,
      };
    });
  }, [parkings, floorOccupancy]);

  // Recaudación por sede (barras): platform usa /finances/summary real, resto agrupa my-reservations
  const recaudacionPorSede = useMemo(() => {
    if (role === 'platform' && financesSummary?.por_sede?.length) {
      return financesSummary.por_sede.map(s => ({
        sede: s.parking_name || `Sede #${s.parking_id}`,
        recaudacion: Number(s.recaudacion_bruta || 0),
        estancias: Number(s.total_reservas || 0),
        parking_id: s.parking_id,
      }));
    }
    const map = new Map();
    parkings.forEach((p) => map.set(p.id, { sede: p.name, recaudacion: 0, estancias: 0, parking_id: p.id }));
    filteredReservations.forEach((r) => {
      if (r.status === 'cancelled') return;
      const entry = map.get(r.parking_id);
      if (entry) {
        entry.recaudacion += Number(r.total_cost) || 0;
        entry.estancias += 1;
      } else {
        map.set(r.parking_id, { sede: `Cochera #${r.parking_id}`, recaudacion: Number(r.total_cost) || 0, estancias: 1, parking_id: r.parking_id });
      }
    });
    return Array.from(map.values());
  }, [parkings, filteredReservations, financesSummary, role]);

  // Reseñas: promedio y distribución por estrellas
  const reviewStats = useMemo(() => {
    if (!reviews.length) return { avg: null, count: 0, distribution: [], percentages: [] };
    const count = reviews.length;
    const sum = reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0);
    const avg = sum / count;
    const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Number(r.rating);
      if (k >= 1 && k <= 5) buckets[k] += 1;
    });
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      name: `${star}★`,
      star,
      value: buckets[star],
      percent: count ? Math.round((buckets[star] / count) * 100) : 0,
      color: RATING_COLORS[star],
    }));
    return { avg, count, distribution };
  }, [reviews]);

  // Afluencia por hora: histograma honesto de start_time de reservas filtradas (vehiculos = reservas iniciadas en esa franja)
  const hourlyData = useMemo(() => {
    if (!filteredReservations.length) return [];
    const buckets = {};
    const labels = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const bucketForHour = (h) => {
      if (h < 7) return '06:00';
      if (h < 9) return '08:00';
      if (h < 11) return '10:00';
      if (h < 13) return '12:00';
      if (h < 15) return '14:00';
      if (h < 17) return '16:00';
      if (h < 19) return '18:00';
      if (h < 21) return '20:00';
      return '22:00';
    };
    labels.forEach((l) => { buckets[l] = 0; });
    filteredReservations.forEach((r) => {
      if (r.status === 'cancelled') return;
      const iso = r.start_time || r.created_at;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const b = bucketForHour(d.getHours());
      buckets[b] += 1;
    });
    const max = Math.max(...Object.values(buckets), 1);
    return labels.map((hora) => ({
      hora,
      vehiculos: buckets[hora],
      ocupacion: Math.round((buckets[hora] / max) * 100),
    }));
  }, [filteredReservations]);

  const hasAnyRevenue = revenueStats.total > 0 || revenueStats.count > 0;
  const hasAnyParking = parkings.length > 0;
  const hasAnyReview = reviews.length > 0;
  const hasHourly = hourlyData.some((d) => d.vehiculos > 0);
  const maxOcupacion = ocupacionPorSede.length ? Math.max(...ocupacionPorSede.map((o) => o.ocupacionPct)) : 0;
  const picoSede = ocupacionPorSede.find((o) => o.ocupacionPct === maxOcupacion)?.sede || '—';
  const totalCap = ocupacionPorSede.reduce((a, o) => a + o.total, 0);
  const rotacion = totalCap ? (revenueStats.count / totalCap).toFixed(1) : '—';

  const exportReport = () => {
    const lines = [];
    lines.push(`# Reporte Smart Park — ${timeRange} — ${new Date().toLocaleString('es-PE')}`);
    lines.push(`# Nota recaudación: ${revenueScopeNote || '—'}`);
    lines.push('');
    lines.push('## Recaudacion por sede (derivado de reservas filtradas, excluye canceladas)');
    lines.push('Sede,ParkingId,Recaudacion_PEN,Estancias');
    recaudacionPorSede.forEach((r) => {
      const sedeSafe = r.sede.replace(/"/g, '""').replace(/,/g, ' ');
      lines.push(`"${sedeSafe}",${r.parking_id},${r.recaudacion.toFixed(2)},${r.estancias}`);
    });
    lines.push('');
    lines.push('## Ocupacion por sede (floor-plan si disponible, fallback available_slots/total_capacity)');
    lines.push('Sede,ParkingId,Total,Libres,Ocupados_Reservados,Ocupacion_Pct');
    ocupacionPorSede.forEach((o) => {
      const sedeSafe = o.sede.replace(/"/g, '""').replace(/,/g, ' ');
      lines.push(`"${sedeSafe}",${o.parking_id},${o.total},${o.libres},${o.ocupados},${o.ocupacionPct}%`);
    });
    lines.push('');
    lines.push('## Afluencia por franja horaria (reservas no canceladas, por start_time)');
    lines.push('Franja,Vehiculos_Reservas,Ocupacion_Relativa_Pct');
    if (hourlyData.length) {
      hourlyData.forEach((d) => lines.push(`${d.hora},${d.vehiculos},${d.ocupacion}%`));
    } else {
      lines.push('Sin datos,0,0%');
    }
    lines.push('');
    lines.push('## Reseñas — distribución por estrellas (GET /reviews)');
    lines.push(`Promedio,${reviewStats.avg != null ? reviewStats.avg.toFixed(1) : '—'},Total,${reviewStats.count}`);
    lines.push('Estrellas,Cantidad,Porcentaje');
    reviewStats.distribution.forEach((d) => lines.push(`${d.star},${d.value},${d.percent}%`));
    lines.push('');
    lines.push(`## Totales filtrados (${timeRange})`);
    lines.push(`Recaudacion_total_PEN,${revenueStats.total.toFixed(2)}`);
    lines.push(`Estancias_no_canceladas,${revenueStats.count}`);
    lines.push(`Reservas_canceladas_en_rango,${revenueStats.cancelled}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_analitica_smartpark_${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-emerald-600" />
        <span className="text-xs font-bold">Cargando analítica real…</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-800">
          <Check className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading text-2xl text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 shrink-0 text-emerald-600" />
            Analítica &amp; Tendencias de Ocupación
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Métricas derivadas de datos reales: reservas, ocupación por plano y reseñas. {revenueScopeNote}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl h-10 px-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 Días</option>
            <option value="30d">Últimos 30 Días</option>
          </select>
          <Button onClick={exportReport} variant="secondary" size="sm">
            <Download className="w-4 h-4 shrink-0" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards — valores reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Recaudación en rango</span>
            <DollarSign className="w-5 h-5 shrink-0 text-emerald-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900">
              S/ {revenueStats.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 font-medium">
              {hasAnyRevenue ? `${revenueStats.count} estancias no canceladas · ${revenueScopeNote ? 'parcial si solo my-reservations' : ''}` : 'Aún no hay datos para graficar'}
            </span>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Estancias en rango</span>
            <Car className="w-5 h-5 shrink-0 text-teal-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900">{revenueStats.count}</p>
            <span className="text-xs text-slate-500 font-medium">
              {revenueStats.cancelled ? `${revenueStats.cancelled} canceladas excluidas` : 'Excluye canceladas'}
            </span>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Ocupación pico (sede)</span>
            <Activity className="w-5 h-5 shrink-0 text-amber-500" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900">{hasAnyParking ? `${maxOcupacion}%` : '—'}</p>
            <span className="text-xs text-amber-700 font-bold truncate" title={picoSede}>
              {hasAnyParking ? picoSede : 'Aún no hay datos para graficar'}
            </span>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Rotación por plaza</span>
            <Clock className="w-5 h-5 shrink-0 text-blue-500" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900">{rotacion === '—' ? '—' : `${rotacion} veh/plaza`}</p>
            <span className="text-xs text-slate-500 font-medium">Estancias / capacidad total en rango</span>
          </div>
        </Card>
      </div>

      {/* Gráficos Recharts — datos reales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Afluencia por hora — histograma honesto de reservas */}
        <div className="lg:col-span-8">
          <Card className="p-6 h-full flex flex-col gap-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-subheading text-slate-900">Afluencia por franja horaria</h3>
                <p className="text-xs text-slate-500">Histograma real de reservas por hora de inicio (no canceladas) — {timeRange}</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {!hasHourly ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
                  <Clock className="w-5 h-5 shrink-0 text-slate-300" />
                  <span className="text-xs font-bold">Aún no hay datos para graficar</span>
                  <span className="text-xs">No hay reservas no canceladas en este rango.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVehiculos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="vehiculos" name="Reservas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVehiculos)" />
                    <Area type="monotone" dataKey="ocupacion" name="% relativo al pico" stroke="#0d9488" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorOcupacion)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Distribución de calificaciones — Pie honesto desde GET /reviews */}
        <div className="lg:col-span-4">
          <Card className="p-6 h-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-subheading text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 shrink-0 text-amber-500 fill-amber-400" /> Distribución de calificaciones
              </h3>
              <p className="text-xs text-slate-500">Desde GET /reviews · promedio {reviewStats.avg != null ? `${reviewStats.avg.toFixed(1)} / 5.0` : '—'} · {reviewStats.count} reseñas</p>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
                {!hasAnyReview ? (
                  <div className="text-center flex flex-col items-center gap-2">
                    <Star className="w-5 h-5 shrink-0 text-slate-200" />
                    <p className="text-xs font-bold text-slate-500">Aún no hay datos para graficar</p>
                    <p className="text-xs text-slate-400">Sin reseñas publicadas.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reviewStats.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {reviewStats.distribution.map((entry) => (
                          <Cell key={`cell-${entry.star}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name, props) => [`${val} (${props.payload.percent}%)`, `${props.payload.star}★`]}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              {hasAnyReview ? (
                reviewStats.distribution.map((v) => (
                  <div key={v.star} className="flex justify-between items-center gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      <span className="text-slate-600 font-bold">{v.star} estrellas</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{v.value} · {v.percent}%</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-medium">Sin datos de reseñas.</span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recaudación por sede — barras honestas desde reservas agrupadas */}
      <Card className="p-6 h-full flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-subheading text-slate-900">Recaudación por sede en rango</h3>
          <p className="text-xs text-slate-500">Suma de total_cost (no canceladas) agrupada por parking · fuente: {revenueScopeNote || 'reservas filtradas'}</p>
        </div>

        <div className="h-64 w-full">
          {!hasAnyParking ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
              <BarChart3 className="w-5 h-5 shrink-0 text-slate-300" />
              <span className="text-xs font-bold">Aún no hay datos para graficar</span>
              <span className="text-xs">Sin cocheras registradas.</span>
            </div>
          ) : recaudacionPorSede.every((r) => r.recaudacion === 0) ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
              <DollarSign className="w-5 h-5 shrink-0 text-slate-300" />
              <span className="text-xs font-bold">Aún no hay datos para graficar</span>
              <span className="text-xs">Sin recaudación en este rango (o solo my-reservations vacío).</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recaudacionPorSede} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="sede" stroke="#94a3b8" fontSize={11} interval={0} angle={-10} textAnchor="end" height={50} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `S/ ${val}`} />
                <Tooltip
                  formatter={(val, name, props) => [`S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2 })} · ${props.payload.estancias} estancias`, 'Recaudación']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="recaudacion" name="Recaudación (S/)" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Ocupación por sede — barras honestas desde parkings */}
      <Card className="p-6 h-full flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-subheading text-slate-900">Ocupación por sede (tiempo real del plano)</h3>
          <p className="text-xs text-slate-500">Derivado de GET /parkings (available_slots/total_capacity) enriquecido con GET /parkings/&#123;id&#125;/floor-plan cuando está disponible.</p>
        </div>
        <div className="h-64 w-full">
          {!hasAnyParking ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
              <Users className="w-5 h-5 shrink-0 text-slate-300" />
              <span className="text-xs font-bold">Aún no hay datos para graficar</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocupacionPorSede} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="sede" stroke="#94a3b8" fontSize={11} interval={0} angle={-10} textAnchor="end" height={50} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(val, name, props) => {
                    if (name === 'ocupacionPct') return [`${val}% (${props.payload.ocupados}/${props.payload.total})`, 'Ocupación'];
                    return [val, name];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="ocupacionPct" name="ocupacionPct" fill="#0d9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
