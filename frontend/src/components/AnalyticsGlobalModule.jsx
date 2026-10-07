import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  Calendar,
  Building2,
} from 'lucide-react';
import api, { getAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEstablishments, isMyEstablishment, getEstablishmentHierarchy } from '../context/EstablishmentContext';

// Colores para distribución de reseñas (5→1 estrella)
const RATING_COLORS = {
  5: '#10b981',
  4: '#0d9488',
  3: '#f59e0b',
  2: '#f97316',
  1: '#ef4444',
};

const is401 = (err) => err?.response?.status === 401;

// Obtiene fecha local formateada en YYYY-MM-DD para inputs nativos
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Filtra reservas dentro del rango seleccionado
const isWithinRange = (iso, range, customStart, customEnd) => {
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
  if (range === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d <= now;
  }
  if (range === 'all') {
    return true;
  }
  if (range === 'custom') {
    let sStr = customStart;
    let eStr = customEnd;
    if (sStr && eStr && sStr > eStr) {
      [sStr, eStr] = [eStr, sStr];
    }
    if (sStr) {
      const [y, m, day] = sStr.split('-').map(Number);
      const start = new Date(y, m - 1, day, 0, 0, 0, 0);
      if (d < start) return false;
    }
    if (eStr) {
      const [y, m, day] = eStr.split('-').map(Number);
      const end = new Date(y, m - 1, day, 23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  }
  return true;
};

export const AnalyticsGlobalModule = () => {
  const { role, user } = useAuth();
  const { myEstablishments } = useEstablishments();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  // Rango de fechas personalizado (por defecto últimos 7 días)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => getLocalDateString(new Date()));

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [revenueScopeNote, setRevenueScopeNote] = useState('');
  const [financesSummary, setFinancesSummary] = useState(null);
  const [floorOccupancy, setFloorOccupancy] = useState({}); // parking_id -> { total, free, occupied }

  const hasLoadedOnce = useRef(false);
  const myEstablishmentsRef = useRef(myEstablishments);
  myEstablishmentsRef.current = myEstablishments;

  // Clave estable basada en IDs para no disparar re-fetches cada vez que el contexto recrea la referencia del array
  const establishmentIdsKey = useMemo(() => {
    return (myEstablishments || []).map((e) => String(e.id)).sort().join(',');
  }, [myEstablishments]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();

    const fetchAll = async () => {
      // Solo mostrar spinner a pantalla completa en la primera carga inicial
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      // Finanzas reales para platform (corrige limitación my-reservations)
      if (role === 'platform') {
        try {
          const f = await api.get('/finances/summary');
          if (!cancelled && f.data) {
            setFinancesSummary(f.data);
            setRevenueScopeNote('Datos consolidados de liquidación (excluye canceladas).');
          }
        } catch {}
      } else {
        setFinancesSummary(null);
      }
      const results = await Promise.allSettled([
        api.get('/parkings'),
        api.get('/reviews'),
        // Reservas: solo si hay token
        (async () => {
          if (!token) return { data: [] };
          if (role === 'platform' || role === 'local') {
            try {
              const r = await api.get('/reservations');
              if (!cancelled) setRevenueScopeNote('Reservas operativas.');
              return r;
            } catch (e) {
              if (is401(e)) {
                if (!cancelled) setRevenueScopeNote('Sin sesión válida para reservas.');
                return { data: [] };
              }
              try {
                const r2 = await api.get('/reservations/my-reservations');
                if (!cancelled) setRevenueScopeNote('Reservas registradas.');
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
            if (!cancelled) setRevenueScopeNote('Reservas del usuario.');
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

      // Parkings: Filtrado estricto multitenant para Admin Local (solo ve su empresa)
      if (results[0].status === 'fulfilled') {
        const rawParkings = Array.isArray(results[0].value.data) ? results[0].value.data : [];
        const currentMyEsts = myEstablishmentsRef.current;
        const scoped = role === 'local'
          ? (currentMyEsts && currentMyEsts.length > 0
              ? currentMyEsts
              : rawParkings.filter((p) => isMyEstablishment(p, user, role, rawParkings)))
          : rawParkings;

        setParkings(scoped);

        // Fetch floor-plan únicamente para las sedes de esta empresa
        try {
          const fpResults = await Promise.allSettled(
            scoped.map((p) => api.get(`/parkings/${p.id}/floor-plan`))
          );
          const occ = {};
          fpResults.forEach((r, idx) => {
            const pid = scoped[idx]?.id;
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

      // Reviews (filtradas por sede de la empresa si es admin local)
      if (results[1].status === 'fulfilled') {
        const data = Array.isArray(results[1].value.data) ? results[1].value.data : [];
        setReviews(data);
      } else if (!is401(results[1].reason)) {
        notify('No se pudieron cargar reseñas.');
      }

      // Reservations (filtradas por sede de la empresa si es admin local)
      if (results[2].status === 'fulfilled') {
        const data = Array.isArray(results[2].value.data) ? results[2].value.data : [];
        setReservations(data);
      } else if (!is401(results[2].reason)) {
        notify('No se pudieron cargar reservas para analítica.');
        if (!cancelled && !revenueScopeNote) setRevenueScopeNote('No se pudieron cargar reservas.');
      }

      if (!cancelled) {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [role, user?.id, user?.email, establishmentIdsKey]);

  // ---- Derivados honestos y aislados por empresa ----

  // Sedes de la empresa para el selector de sucursales
  const companyBranches = useMemo(() => {
    if (role !== 'local') return parkings;
    return parkings;
  }, [role, parkings]);

  // Información de la empresa identificada
  const companyInfo = useMemo(() => {
    if (role !== 'local') return null;
    const first = companyBranches[0] || myEstablishments?.[0];
    const hierarchy = first ? getEstablishmentHierarchy(first) : null;
    const name = hierarchy?.companyName || user?.companyName || first?.name || 'Mi Empresa';
    return {
      name,
      branchesCount: companyBranches.length,
      isMulti: companyBranches.length > 1,
    };
  }, [role, companyBranches, myEstablishments, user]);

  // Parkings filtrados según el selector de sucursal
  const scopedParkings = useMemo(() => {
    if (selectedBranchFilter === 'all') return parkings;
    return parkings.filter((p) => String(p.id) === String(selectedBranchFilter));
  }, [parkings, selectedBranchFilter]);

  const scopedParkingIds = useMemo(() => {
    return new Set(scopedParkings.map((p) => Number(p.id)));
  }, [scopedParkings]);

  // Reservas pertenecientes estrictamente a las sedes de la empresa (y a la sucursal seleccionada si aplica)
  const companyReservations = useMemo(() => {
    if (role !== 'local') {
      if (selectedBranchFilter !== 'all') {
        return reservations.filter((r) => String(r.parking_id) === String(selectedBranchFilter));
      }
      return reservations;
    }
    // Para Admin Local: sólo reservas de sus sedes autorizadas
    return reservations.filter((r) => scopedParkingIds.has(Number(r.parking_id)));
  }, [role, reservations, scopedParkingIds, selectedBranchFilter]);

  // Reseñas filtradas por las sedes de la empresa (y sucursal si aplica)
  const scopedReviews = useMemo(() => {
    if (role !== 'local') {
      if (selectedBranchFilter !== 'all') {
        return reviews.filter((rev) => String(rev.parking_id) === String(selectedBranchFilter));
      }
      return reviews;
    }
    return reviews.filter((rev) => scopedParkingIds.has(Number(rev.parking_id)));
  }, [role, reviews, scopedParkingIds, selectedBranchFilter]);

  // Helpers de etiqueta legible para el periodo seleccionado
  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'today':
        return 'hoy';
      case '7d':
        return 'los últimos 7 días';
      case '30d':
        return 'los últimos 30 días';
      case 'this_month':
        return 'este mes';
      case 'all':
        return 'todo el historial';
      case 'custom':
        return `rango del ${formatDisplayDate(customStartDate)} al ${formatDisplayDate(customEndDate)}`;
      default:
        return timeRange;
    }
  }, [timeRange, customStartDate, customEndDate]);

  const filteredReservations = useMemo(() => {
    if (timeRange === 'all') return companyReservations;
    return companyReservations.filter((r) =>
      isWithinRange(r.start_time || r.created_at || r.actual_entry, timeRange, customStartDate, customEndDate)
    );
  }, [companyReservations, timeRange, customStartDate, customEndDate]);

  // Recaudación en rango: calcula a partir de las reservas filtradas en el periodo elegido
  const revenueStats = useMemo(() => {
    const valid = filteredReservations.filter((r) => r.status !== 'cancelled');
    const total = valid.reduce((acc, r) => acc + (Number(r.total_cost) || 0), 0);
    const count = valid.length;
    const cancelled = filteredReservations.length - valid.length;

    // Si hay reservas registradas o un rango seleccionado, respetar siempre las reservas del periodo
    if (companyReservations.length > 0 || !financesSummary?.totales) {
      return { total, count, cancelled, netCommission: total * 0.12 };
    }

    // Fallback a finanzas consolidadas solo si no se pudo descargar el listado de reservas
    const t = financesSummary.totales;
    return {
      total: Number(t.recaudacion_bruta_global || 0),
      count: Number(t.total_reservas_global || 0),
      cancelled: 0,
      netCommission: Number(t.comision_liquida_global || 0),
    };
  }, [filteredReservations, companyReservations, financesSummary]);

  // Desglose financiero por método de cobro (Efectivo vs Yape/Plin vs Tarjeta POS)
  const paymentMethodBreakdown = useMemo(() => {
    const valid = filteredReservations.filter((r) => r.status !== 'cancelled');
    const buckets = {
      cash: { label: 'Efectivo en Garita', total: 0, count: 0, color: '#10b981', type: 'Efectivo' },
      digital: { label: 'Yape / Plin (Billeteras QR)', total: 0, count: 0, color: '#06b6d4', type: 'Billetera Digital' },
      card: { label: 'Tarjeta POS / Culqi Digital', total: 0, count: 0, color: '#8b5cf6', type: 'Tarjeta / Pasarela' }
    };

    valid.forEach((r) => {
      const method = (r.payment_method || r.paymentMethod || '').toLowerCase();
      const cost = Number(r.total_cost || r.amount_paid || 0);

      if (method.includes('yape') || method.includes('plin') || method.includes('billetera')) {
        buckets.digital.total += cost;
        buckets.digital.count += 1;
      } else if (method.includes('tarjeta') || method.includes('culqi') || method.includes('pos') || method.includes('card') || method.includes('paypal')) {
        buckets.card.total += cost;
        buckets.card.count += 1;
      } else {
        buckets.cash.total += cost;
        buckets.cash.count += 1;
      }
    });

    const sumTotal = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);
    const divisor = sumTotal > 0 ? sumTotal : 1;
    return Object.entries(buckets).map(([key, data]) => ({
      key,
      label: data.label,
      type: data.type,
      total: data.total,
      count: data.count,
      color: data.color,
      percent: sumTotal > 0 ? Math.round((data.total / divisor) * 100) : 0
    }));
  }, [filteredReservations]);

  // Ocupación por sede: prioriza floor-plan (conteo real de slots), fallback a available_slots/total_capacity
  const ocupacionPorSede = useMemo(() => {
    return scopedParkings.map((p) => {
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
  }, [scopedParkings, floorOccupancy]);

  // Recaudación por sede (barras): prioriza reservas filtradas para que el gráfico responda al rango de fechas
  const recaudacionPorSede = useMemo(() => {
    if (companyReservations.length > 0 || !financesSummary?.por_sede?.length) {
      const map = new Map();
      scopedParkings.forEach((p) => map.set(p.id, { sede: p.name, recaudacion: 0, estancias: 0, parking_id: p.id }));
      filteredReservations.forEach((r) => {
        if (r.status === 'cancelled') return;
        const entry = map.get(r.parking_id);
        if (entry) {
          entry.recaudacion += Number(r.total_cost) || 0;
          entry.estancias += 1;
        } else if (scopedParkingIds.has(Number(r.parking_id))) {
          map.set(r.parking_id, { sede: `Sede #${r.parking_id}`, recaudacion: Number(r.total_cost) || 0, estancias: 1, parking_id: r.parking_id });
        }
      });
      return Array.from(map.values());
    }

    // Fallback a finanzas consolidadas solo si no cargaron reservas operativas
    return financesSummary.por_sede
      .filter((s) => scopedParkingIds.has(Number(s.parking_id)))
      .map((s) => ({
        sede: s.parking_name || `Sede #${s.parking_id}`,
        recaudacion: Number(s.recaudacion_bruta || 0),
        estancias: Number(s.total_reservas || 0),
        parking_id: s.parking_id,
      }));
  }, [scopedParkings, scopedParkingIds, filteredReservations, companyReservations, financesSummary]);

  // Reseñas: promedio y distribución por estrellas
  const reviewStats = useMemo(() => {
    if (!scopedReviews.length) return { avg: null, count: 0, distribution: [], percentages: [] };
    const count = scopedReviews.length;
    const sum = scopedReviews.reduce((a, r) => a + (Number(r.rating) || 0), 0);
    const avg = sum / count;
    const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    scopedReviews.forEach((r) => {
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
  }, [scopedReviews]);

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
      if (h < 16) return '16:00';
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
  const hasAnyParking = scopedParkings.length > 0;
  const hasAnyReview = scopedReviews.length > 0;
  const hasHourly = hourlyData.some((d) => d.vehiculos > 0);
  const maxOcupacion = ocupacionPorSede.length ? Math.max(...ocupacionPorSede.map((o) => o.ocupacionPct)) : 0;
  const picoSede = ocupacionPorSede.find((o) => o.ocupacionPct === maxOcupacion)?.sede || '—';
  const totalCap = ocupacionPorSede.reduce((a, o) => a + o.total, 0);
  const rotacion = totalCap ? (revenueStats.count / totalCap).toFixed(1) : '—';

  const exportReport = () => {
    const lines = [];
    const reportRangeStr = timeRange === 'custom'
      ? `del ${customStartDate} al ${customEndDate}`
      : timeRangeLabel;
    
    if (role === 'local') {
      lines.push(`# Cierre de Caja y Reporte Operativo — ${companyInfo?.name || 'Mi Empresa'}`);
      if (selectedBranchFilter !== 'all') {
        const branchName = scopedParkings[0]?.name || `Sede #${selectedBranchFilter}`;
        lines.push(`# Sucursal: ${branchName}`);
      } else {
        lines.push(`# Sedes de la Empresa: ${scopedParkings.length} establecimiento(s)`);
      }
      lines.push(`# Administrador Local: ${user?.full_name || user?.name || user?.email || 'Admin Local'}`);
    } else {
      lines.push(`# Reporte Global Smart Park`);
    }
    lines.push(`# Periodo evaluado: ${reportRangeStr} — Generado: ${new Date().toLocaleString('es-PE')}`);
    lines.push(`# Auditoría: Excluye canceladas — Recaudación neta de transacciones`);
    lines.push('');
    lines.push('## Resumen General de Cierre');
    lines.push(`Total_Recaudado_PEN,${revenueStats.total.toFixed(2)}`);
    lines.push(`Estancias_Registradas,${revenueStats.count}`);
    lines.push(`Reservas_Canceladas,${revenueStats.cancelled}`);
    lines.push('');
    lines.push('## Cuadre y Desglose por Medio de Pago (Cierre de Caja)');
    lines.push('Medio_de_Pago,Total_PEN,Transacciones,Porcentaje');
    paymentMethodBreakdown.forEach((m) => {
      lines.push(`"${m.label}",${m.total.toFixed(2)},${m.count},${m.percent}%`);
    });
    lines.push('');
    lines.push('## Recaudacion por sede');
    lines.push('Sede,ParkingId,Recaudacion_PEN,Estancias');
    recaudacionPorSede.forEach((r) => {
      const sedeSafe = r.sede.replace(/"/g, '""').replace(/,/g, ' ');
      lines.push(`"${sedeSafe}",${r.parking_id},${r.recaudacion.toFixed(2)},${r.estancias}`);
    });
    lines.push('');
    lines.push('## Ocupacion por sede');
    lines.push('Sede,ParkingId,Total,Libres,Ocupados_Reservados,Ocupacion_Pct');
    ocupacionPorSede.forEach((o) => {
      const sedeSafe = o.sede.replace(/"/g, '""').replace(/,/g, ' ');
      lines.push(`"${sedeSafe}",${o.parking_id},${o.total},${o.libres},${o.ocupados},${o.ocupacionPct}%`);
    });
    lines.push('');
    lines.push('## Afluencia por franja horaria');
    lines.push('Franja,Vehiculos_Reservas,Ocupacion_Relativa_Pct');
    if (hourlyData.length) {
      hourlyData.forEach((d) => lines.push(`${d.hora},${d.vehiculos},${d.ocupacion}%`));
    } else {
      lines.push('Sin datos,0,0%');
    }
    lines.push('');
    lines.push('## Reseñas — distribución por estrellas');
    lines.push(`Promedio,${reviewStats.avg != null ? reviewStats.avg.toFixed(1) : '—'},Total,${reviewStats.count}`);
    lines.push('Estrellas,Cantidad,Porcentaje');
    reviewStats.distribution.forEach((d) => lines.push(`${d.star},${d.value},${d.percent}%`));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadSuffix = timeRange === 'custom'
      ? `${customStartDate}_al_${customEndDate}`
      : timeRange;
    const prefix = role === 'local'
      ? `cierre_caja_${(companyInfo?.name || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : 'reporte_analitica_smartpark';
    a.download = `${prefix}_${downloadSuffix}.csv`;
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-heading text-2xl text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {role === 'local' ? 'Reportes & Cierres de Caja' : 'Analítica & Tendencias de Ocupación'}
            </h1>
            {role === 'local' && companyInfo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{companyInfo.name}</span>
                {companyInfo.branchesCount > 1 && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-200/60 dark:bg-emerald-900/80 px-1.5 py-0.5 rounded-full ml-0.5">
                    {companyInfo.branchesCount} sedes
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {role === 'local'
              ? `Métricas operativas de aforo, demanda horaria y arqueo de caja exclusivo para ${companyInfo?.name || 'tu empresa'}.`
              : 'Métricas de aforo en tiempo real, demanda horaria y recaudación de la red.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Sucursal si la empresa tiene más de 1 sede */}
          {role === 'local' && companyBranches.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 h-10 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                title="Filtrar por sucursal"
              >
                <option value="all" className="dark:bg-slate-900">Todas las sedes ({companyBranches.length})</option>
                {companyBranches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl h-10 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-colors cursor-pointer"
          >
            <option value="today" className="dark:bg-slate-900">Hoy</option>
            <option value="7d" className="dark:bg-slate-900">Últimos 7 Días</option>
            <option value="30d" className="dark:bg-slate-900">Últimos 30 Días</option>
            <option value="this_month" className="dark:bg-slate-900">Este Mes</option>
            <option value="custom" className="dark:bg-slate-900">Rango Personalizado</option>
            <option value="all" className="dark:bg-slate-900">Todo el Historial</option>
          </select>

          {/* Selector de Rango Personalizado de Fechas */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Desde</span>
                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <span className="text-slate-300 dark:text-slate-700 font-bold">—</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          <Button onClick={exportReport} variant="secondary" size="sm" className="h-10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700">
            <Download className="w-4 h-4 shrink-0" />
            {role === 'local' ? 'Exportar Cierre CSV' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {/* KPI Cards — valores reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Recaudación en rango</span>
            <DollarSign className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900 dark:text-white">
              S/ {revenueStats.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {hasAnyRevenue ? `${revenueStats.count} estancias registradas` : 'Sin movimientos en el periodo'}
            </span>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Estancias en rango</span>
            <Car className="w-5 h-5 shrink-0 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900 dark:text-white">{revenueStats.count}</p>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
            <p className="text-heading text-2xl text-slate-900 dark:text-white">{hasAnyParking ? `${maxOcupacion}%` : '—'}</p>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-bold truncate" title={picoSede}>
              {hasAnyParking ? picoSede : 'Aún no hay datos para graficar'}
            </span>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-slate-400">Rotación por plaza</span>
            <Clock className="w-5 h-5 shrink-0 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-2xl text-slate-900 dark:text-white">{rotacion === '—' ? '—' : `${rotacion} veh/plaza`}</p>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estancias / capacidad total en rango</span>
          </div>
        </Card>
      </div>

      {/* Desglose Financiero por Método de Cobro (Efectivo vs Yape/Plin vs Tarjeta POS) */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-subheading text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Desglose Financiero por Medio de Cobro
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribución de ingresos según medio utilizado por los conductores en {timeRangeLabel}.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl w-fit">
            Total Auditado: S/ {revenueStats.total.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {paymentMethodBreakdown.map((item) => (
            <div 
              key={item.key} 
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                </div>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  {item.percent}%
                </span>
              </div>

              <div>
                <p className="text-xl font-mono font-black text-slate-900 dark:text-white">
                  S/ {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.count} {item.count === 1 ? 'transacción registrada' : 'transacciones registradas'}
                </p>
              </div>

              {/* Barra de progreso porcentual */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gráficos Recharts — datos reales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Afluencia por hora — histograma honesto de reservas */}
        <div className="lg:col-span-8">
          <Card className="p-6 h-full flex flex-col gap-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-subheading text-slate-900 dark:text-white">Afluencia por franja horaria</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribución de reservas por hora en {timeRangeLabel}</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {!hasHourly ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
                  <Clock className="w-5 h-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sin datos para graficar</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">No hay reservas activas o completadas en este rango.</span>
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

        {/* Distribución de calificaciones */}
        <div className="lg:col-span-4">
          <Card className="p-6 h-full flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-subheading text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 shrink-0 text-amber-500 fill-amber-400" /> Distribución de calificaciones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Promedio {reviewStats.avg != null ? `${reviewStats.avg.toFixed(1)} / 5.0` : '—'} · {reviewStats.count} reseñas</p>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
                {!hasAnyReview ? (
                  <div className="text-center flex flex-col items-center gap-2">
                    <Star className="w-5 h-5 shrink-0 text-slate-200 dark:text-slate-700" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sin datos de reseñas</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Aún no se han registrado valoraciones.</p>
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

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {hasAnyReview ? (
                reviewStats.distribution.map((v) => (
                  <div key={v.star} className="flex justify-between items-center gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      <span className="text-slate-600 dark:text-slate-300 font-bold">{v.star} estrellas</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{v.value} · {v.percent}%</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sin datos de reseñas.</span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recaudación por sede */}
      <Card className="p-6 h-full flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-subheading text-slate-900 dark:text-white">Recaudación por sede</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos brutos generados por establecimiento en {timeRangeLabel}.</p>
        </div>

        <div className="h-64 w-full">
          {!hasAnyParking ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
              <BarChart3 className="w-5 h-5 shrink-0 text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sin datos para graficar</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Sin cocheras registradas.</span>
            </div>
          ) : recaudacionPorSede.every((r) => r.recaudacion === 0) ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
              <DollarSign className="w-5 h-5 shrink-0 text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sin datos para graficar</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Sin recaudación registrada en este rango.</span>
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

      {/* Ocupación por sede */}
      <Card className="p-6 h-full flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-subheading text-slate-900 dark:text-white">Ocupación en tiempo real por sede</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Porcentaje de aforo y plazas ocupadas según planos operativos.</p>
        </div>
        <div className="h-64 w-full">
          {!hasAnyParking ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
              <Users className="w-5 h-5 shrink-0 text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Aún no hay datos para graficar</span>
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
