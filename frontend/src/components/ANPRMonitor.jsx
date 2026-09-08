import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Car,
  Gauge,
  Layers,
  RefreshCw,
  ShieldCheck,
  Building2,
  Pencil,
  DollarSign,
  Clock,
  LogIn,
  LogOut,
  Timer,
  CreditCard,
  Search
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  normalizarPlaca,
  formatearPlacaConGuion
} from '../utils/plateOcr';
import { useEstablishments } from '../context/EstablishmentContext';
import { CarParkZoneEditor } from './CarParkZoneEditor';
import { CulqiPaymentModal } from './CulqiPaymentModal';

const GARITA_LOGS_STORAGE_KEY = 'smart_park_garita_audit_logs_v2';
const GARITA_ACTIVE_TICKETS_KEY = 'smart_park_garita_walkin_tickets_v2';

const TICK = 30000;

export const ANPRMonitor = () => {
  const {
    establishments,
    reservations,
    occupySlot,
    freeSlot,
    checkInReservation,
    checkOutReservation,
    createReservation,
    updateEstablishment,
    updateEstablishmentPlan
  } = useEstablishments();

  const [selectedEstId, setSelectedEstId] = useState(() => {
    const saved = localStorage.getItem('smart_park_active_garita_est');
    if (saved && establishments.some(e => String(e.id) === String(saved))) return saved;
    return establishments[0]?.id || 'EST-01';
  });

  const currentEst = useMemo(
    () => establishments.find(e => String(e.id) === String(selectedEstId)) || establishments[0],
    [establishments, selectedEstId]
  );

  // Formulario de estadía: entry | exit | inside
  const [garitaTab, setGaritaTab] = useState('entry');
  const [loading, setLoading] = useState(false);
  const [formResult, setFormResult] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Entrada manual
  const [entryPlate, setEntryPlate] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entrySlot, setEntrySlot] = useState('');
  const [entryHours, setEntryHours] = useState(2);

  // Salida manual
  const [exitPlate, setExitPlate] = useState('');
  const [exitDetail, setExitDetail] = useState(null);

  const [walkInTickets, setWalkInTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_ACTIVE_TICKETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [paidIds, setPaidIds] = useState(new Set());
  const [payTarget, setPayTarget] = useState(null);
  const [showZoneEditor, setShowZoneEditor] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smart_park_access_token');
    if (!token) return;
    api.get('/payments/my').then(r => {
      const ids = new Set((Array.isArray(r.data) ? r.data : []).filter(p => p.status === 'succeeded' && p.reservation_id).map(p => Number(p.reservation_id)));
      setPaidIds(ids);
    }).catch(()=>{});
  }, [reservations.length]);

  useEffect(() => {
    if (selectedEstId) localStorage.setItem('smart_park_active_garita_est', selectedEstId);
  }, [selectedEstId]);

  useEffect(() => {
    try { localStorage.setItem(GARITA_ACTIVE_TICKETS_KEY, JSON.stringify(walkInTickets)); } catch {}
  }, [walkInTickets]);

  useEffect(() => {
    try { localStorage.setItem(GARITA_LOGS_STORAGE_KEY, JSON.stringify(auditLogs)); } catch {}
  }, [auditLogs]);

  // Reloj interno: mantiene el tiempo transcurrido de cada estadía al día
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK);
    return () => clearInterval(id);
  }, []);

  const addAuditLog = (entry) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateFormatted: new Date().toLocaleDateString('es-PE'),
      estName: currentEst?.name || 'Sede Garita',
      estId: selectedEstId,
      ...entry
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const { totalSlotsCount, occupiedSlotsCount, freeSlotsCount, slotList } = useMemo(() => {
    const elements = currentEst?.elements || [];
    const slots = elements.filter(el => el.type === 'slot');
    const occupied = slots.filter(s => s.status === 'occupied').length;
    return { totalSlotsCount: slots.length, occupiedSlotsCount: occupied, freeSlotsCount: Math.max(0, slots.length - occupied), slotList: slots };
  }, [currentEst]);

  const freeSlotList = useMemo(() => slotList.filter(s => s.status === 'free'), [slotList]);

  const vehiclesInside = useMemo(() => {
    const activeRes = reservations.filter(r => String(r.parkingId) === String(selectedEstId) && (r.status === 'ACTIVE' || r.status === 'active')).map(r => ({ source: 'RESERVATION', id: r.id, code: r.code, plate: r.plate, slot: r.slot, driverName: r.customerName || 'Usuario Registrado', phone: r.customerPhone || 'N/A', entryTime: r.startTime || r.createdAt || new Date().toISOString(), rate: r.ratePerHour || currentEst?.rate || 5.0, token: r.token }));
    const activeWalkIns = walkInTickets.filter(t => String(t.estId) === String(selectedEstId) && t.status === 'ACTIVE').map(t => ({ source: 'WALK_IN', id: t.id, code: t.ticketNumber, plate: t.plate, slot: t.slot, driverName: t.driverName || 'Cliente en garita', phone: t.phone || 'Registro manual', entryTime: t.entryTime, rate: t.rate || currentEst?.rate || 5.0, token: t.ticketNumber }));
    return [...activeRes, ...activeWalkIns];
  }, [reservations, walkInTickets, selectedEstId, currentEst]);

  const occupancyPct = totalSlotsCount ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;

  // Ingreso estimado acumulado de las estadías activas (hora en curso incluida)
  const runningRevenue = useMemo(() => {
    return vehiclesInside.reduce((acc, v) => {
      const entry = new Date(v.entryTime).getTime();
      const mins = Math.max(15, Math.round((now - entry) / 60000));
      const hours = Math.ceil(mins / 60);
      return acc + hours * (v.rate || 5.0);
    }, 0);
  }, [vehiclesInside, now]);

  const elapsedLabel = (iso) => {
    const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
  };

  const handleEntrySubmit = async () => {
    const plate = formatearPlacaConGuion(entryPlate);
    if (!plate || plate.trim().length < 3 || !entrySlot) {
      setFormResult({ matched: false, message: 'Ingresa la placa y elige un cajón libre.' });
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizarPlaca(plate);
      const matched = reservations.find(r => String(r.parkingId) === String(selectedEstId) && normalizarPlaca(r.plate) === normalized && (r.status === 'SCHEDULED' || r.status === 'ACTIVE' || !r.status));
      if (matched) {
        const targetSlot = matched.slot || entrySlot;
        await checkInReservation(matched.code);
        occupySlot(selectedEstId, targetSlot, plate);
        setFormResult({ matched: true, message: `Ingreso registrado. Reserva ${matched.code} en cajón ${targetSlot}.` });
        addAuditLog({ type: 'GARITA', action: 'INGRESO_RESERVA', plate, slot: targetSlot, status: 'ACTIVO', detail: `Reserva ${matched.code} con check-in manual.` });
      } else {
        const nowDate = new Date();
        const res = await createReservation({
          parkingId: currentEst.id,
          slotCode: entrySlot,
          plate,
          hours: entryHours,
          startTime: nowDate.toISOString(),
          expiresAt: new Date(nowDate.getTime() + entryHours * 3600000).toISOString()
        });
        if (res) {
          await checkInReservation(res.code);
          setFormResult({ matched: true, message: `Ingreso registrado. Ticket ${res.code} en cajón ${entrySlot} por ${entryHours}h.` });
          addAuditLog({ type: 'GARITA', action: 'INGRESO_MANUAL', plate, slot: entrySlot, status: 'ACTIVO', detail: `Ticket ${res.code} creado en garita.` });
        } else {
          setFormResult({ matched: false, message: 'No se pudo registrar el ingreso. El cajón puede estar ocupado.' });
        }
      }
      setEntryPlate('');
      setEntrySlot('');
      setEntryName('');
    } finally {
      setLoading(false);
    }
  };

  const handleExitSearch = () => {
    const normalized = normalizarPlaca(exitPlate);
    if (!normalized || normalized.length < 3) {
      setExitDetail(null);
      setFormResult({ matched: false, message: 'Ingresa la placa para buscar la estadía activa.' });
      return;
    }
    const matchedRes = reservations.find(r => String(r.parkingId) === String(selectedEstId) && normalizarPlaca(r.plate) === normalized && (r.status === 'ACTIVE' || r.status === 'active'));
    const matchedWalkIn = walkInTickets.find(t => String(t.estId) === String(selectedEstId) && normalizarPlaca(t.plate) === normalized && t.status === 'ACTIVE');
    const item = matchedRes || matchedWalkIn;
    if (!item) {
      setExitDetail(null);
      setFormResult({ matched: false, message: `No hay estadía activa para ${formatearPlacaConGuion(exitPlate)} en esta sede.` });
      return;
    }
    const entryDate = new Date(item.startTime || item.entryTime || Date.now() - 3600000);
    const minutesParked = Math.max(15, Math.round((Date.now() - entryDate.getTime()) / 60000));
    const hoursParked = Math.ceil(minutesParked / 60);
    const totalCost = Number((hoursParked * (item.rate || item.ratePerHour || currentEst?.rate || 5.0)).toFixed(2));
    setExitDetail({ item, minutesParked, hoursParked, totalCost });
    setFormResult(null);
  };

  const handleExitSubmit = async () => {
    if (!exitDetail?.item) return;
    setLoading(true);
    try {
      const item = exitDetail.item;
      if (item.source === 'WALK_IN' || item.ticketNumber) {
        setWalkInTickets(prev => prev.map(t => t.id === item.id ? { ...t, status: 'COMPLETED', exitTime: new Date().toISOString() } : t));
        freeSlot(selectedEstId, item.slot);
      } else {
        await checkOutReservation(item.code);
        freeSlot(selectedEstId, item.slot);
      }
      setFormResult({ matched: true, message: `Salida registrada. ${item.plate} liberó el cajón ${item.slot}. Total S/ ${exitDetail.totalCost.toFixed(2)}.` });
      addAuditLog({ type: 'GARITA', action: 'SALIDA_MANUAL', plate: item.plate, slot: item.slot, status: 'COMPLETADO', detail: `Estancia de ${exitDetail.hoursParked}h por S/ ${exitDetail.totalCost.toFixed(2)}.` });
      setExitDetail(null);
      setExitPlate('');
    } finally {
      setLoading(false);
    }
  };

  const handleInsideExit = async (vehicle) => {
    setLoading(true);
    try {
      const matchedRes = reservations.find(x => String(x.id) === String(vehicle.id));
      if (matchedRes) {
        await checkOutReservation(matchedRes.code);
        freeSlot(selectedEstId, vehicle.slot);
      } else {
        setWalkInTickets(prev => prev.map(t => t.id === vehicle.id ? { ...t, status: 'COMPLETED', exitTime: new Date().toISOString() } : t));
        freeSlot(selectedEstId, vehicle.slot);
      }
      setFormResult({ matched: true, message: `Salida registrada para ${vehicle.plate} (cajón ${vehicle.slot}).` });
      addAuditLog({ type: 'GARITA', action: 'SALIDA_MANUAL', plate: vehicle.plate, slot: vehicle.slot, status: 'COMPLETADO', detail: 'Salida desde lista de vehículos en cochera.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZones = (updatedSlots) => {
    const otherElements = (currentEst?.elements || []).filter((el) => el.type !== 'slot');
    const newElements = [...otherElements, ...updatedSlots];
    if (updateEstablishmentPlan) {
      updateEstablishmentPlan(selectedEstId, newElements);
    }
    updateEstablishment(selectedEstId, { elements: newElements });
  };

  const tabs = [
    { id: 'entry', label: 'Entrada', icon: ArrowUpRight, activeCls: 'bg-emerald-600 text-white shadow-emerald-600/30' },
    { id: 'exit', label: 'Salida', icon: ArrowDownLeft, activeCls: 'bg-amber-500 text-slate-950 shadow-amber-500/30' },
    { id: 'inside', label: `En cochera (${vehiclesInside.length})`, icon: Car, activeCls: 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-slate-900/30' }
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* ── Encabezado operativo ── */}
      <div className="bg-white dark:bg-[#151D2F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5.5 h-5.5 text-emerald-400 dark:text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">Control de Estadías</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 truncate">
                Registro manual de entradas, salidas y cobro en garita
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 transition-colors">
              <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <select value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer max-w-[200px] truncate">
                {establishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => setShowZoneEditor(true)}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black text-xs h-10 px-4 rounded-2xl gap-1.5 shadow transition-colors"
            >
              <Pencil className="w-4 h-4 text-emerald-400 dark:text-white" /> Calibrar Plazas CAD
            </Button>
          </div>
        </div>

        {/* HUD: 4 métricas + barra de ocupación */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F19]/60 transition-colors">
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b lg:border-b-0 border-r border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Ocupación</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none mt-1">{occupancyPct}% <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{occupiedSlotsCount}/{totalSlotsCount}</span></p>
            </div>
            <Gauge className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b lg:border-b-0 border-r border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Plazas Libres</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{freeSlotsCount}</p>
            </div>
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-r border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">En Cochera</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none mt-1">{vehiclesInside.length}</p>
            </div>
            <Car className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Acumulado vivo</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none mt-1">S/ {runningRevenue.toFixed(0)}</p>
            </div>
            <CreditCard className="w-5 h-5 text-emerald-700 dark:text-emerald-500" />
          </div>
        </div>

        {/* Barra de ocupación */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden transition-colors">
          <div
            className={`h-full transition-all duration-500 ${occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
      </div>

      {/* Tabs: Entrada / Salida / En cochera */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 p-1 rounded-2xl w-fit transition-colors">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setGaritaTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow ${garitaTab === t.id ? t.activeCls : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'}`}
          >
            <t.icon className="w-3.5 h-3.5"/> {t.label}
          </button>
        ))}
      </div>

      {formResult && (
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${formResult.matched ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300' : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'}`}>
          {formResult.matched ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"/> : <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0"/>} {formResult.message}
        </div>
      )}

      {/* ── Formulario de entrada ── */}
      {garitaTab === 'entry' && (
        <div className="bg-white dark:bg-[#151D2F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-1">
            <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Registrar entrada</h2>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">Si existe reserva programada, se hace check-in automático</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Placa del vehículo</label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={entryPlate}
                onChange={e => setEntryPlate(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleEntrySubmit(); }}
                className="font-mono font-black text-center uppercase h-11 rounded-xl dark:bg-[#0B0F19] dark:border-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Conductor (opcional)</label>
              <Input
                type="text"
                placeholder="Nombre del conductor"
                value={entryName}
                onChange={e => setEntryName(e.target.value)}
                className="h-11 rounded-xl dark:bg-[#0B0F19] dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-2">Cajón libre <span className="text-emerald-600 dark:text-emerald-400">({freeSlotList.length} disponibles)</span></label>
            {freeSlotList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl p-3 transition-colors">No hay cajones libres en esta sede.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {freeSlotList.map(s => (
                  <button key={s.code} onClick={() => setEntrySlot(s.code)} className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black border transition ${entrySlot === s.code ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-slate-100 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500'}`}>{s.code}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Horas de estadía</label>
              <select value={entryHours} onChange={e => setEntryHours(Number(e.target.value))} className="h-11 w-full px-3 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100">
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
                <option value={8}>8 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
            <Button
              type="button"
              onClick={handleEntrySubmit}
              disabled={loading || !entryPlate || !entrySlot}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm h-11 rounded-2xl gap-1.5 transition-colors"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <ArrowUpRight className="w-4 h-4"/>} Registrar ingreso
            </Button>
          </div>
        </div>
      )}

      {/* ── Formulario de salida ── */}
      {garitaTab === 'exit' && (
        <div className="bg-white dark:bg-[#151D2F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-1">
            <LogOut className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Registrar salida</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Placa del vehículo</label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={exitPlate}
                onChange={e => setExitPlate(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleExitSearch(); }}
                className="font-mono font-black text-center uppercase h-11 rounded-xl dark:bg-[#0B0F19] dark:border-slate-700 dark:text-slate-100"
              />
            </div>
            <Button
              type="button"
              onClick={handleExitSearch}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black text-sm h-11 px-6 rounded-2xl gap-1.5 transition-colors"
            >
              <Search className="w-4 h-4"/> Buscar estadía
            </Button>
          </div>

          {exitDetail ? (
            <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 transition-colors">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-mono font-black text-xs tracking-widest">{exitDetail.item.plate}</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Cajón <span className="font-mono font-black text-slate-900 dark:text-slate-100">{exitDetail.item.slot}</span></span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{exitDetail.item.driverName || exitDetail.item.customerName || '—'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Tiempo</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 font-mono">{Math.floor(exitDetail.minutesParked / 60)}h {String(exitDetail.minutesParked % 60).padStart(2, '0')}m</p>
                </div>
                <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1"><Timer className="w-3 h-3"/> Tarifa</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 font-mono">S/ {(exitDetail.item.rate || exitDetail.item.ratePerHour || currentEst?.rate || 5.0).toFixed(2)}/h</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Total</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono">S/ {exitDetail.totalCost.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => { const r = reservations.find(x => String(x.id) === String(exitDetail.item.id)); if (r) setPayTarget(r); }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm h-11 rounded-2xl gap-1.5 transition-colors"
                >
                  <DollarSign className="w-4 h-4"/> Cobrar
                </Button>
                <Button
                  type="button"
                  onClick={handleExitSubmit}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm h-11 rounded-2xl gap-1.5 transition-colors"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4"/>} Registrar salida y liberar cajón
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Busca por placa para ver el detalle de la estadía, cobrar y registrar la salida.</p>
          )}
        </div>
      )}

      {/* ── En cochera ── */}
      {garitaTab === 'inside' && (
        <div className="bg-white dark:bg-[#151D2F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2"><Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/> Vehículos en cochera • {vehiclesInside.length}</span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{currentEst?.name}</span>
          </div>
          {vehiclesInside.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">No hay vehículos con check-in activo en esta sede.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-[#0B0F19] text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <tr><th className="px-3 py-2 text-left">Placa</th><th className="px-3 py-2 text-left">Cajón</th><th className="px-3 py-2 text-left">Conductor</th><th className="px-3 py-2 text-left">Entrada</th><th className="px-3 py-2 text-left">Tiempo</th><th className="px-3 py-2 text-left hidden sm:table-cell">Estado</th><th className="px-3 py-2 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vehiclesInside.map(v => { const entry = new Date(v.entryTime); const isPaid = paidIds.has(Number(v.id)); return (
                    <tr key={v.code + v.plate} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2"><span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 dark:bg-slate-800 text-white font-mono font-black tracking-widest text-[11px]">{v.plate}</span></td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">{v.slot}</td>
                      <td className="px-3 py-2 truncate max-w-[140px] text-slate-700 dark:text-slate-300">
                        {v.driverName}
                        <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded ${v.source === 'RESERVATION' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          {v.source === 'RESERVATION' ? 'RESERVA' : 'GARITA'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{entry.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 font-mono font-black text-slate-900 dark:text-slate-100">{elapsedLabel(v.entryTime)}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        {isPaid
                          ? <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded-lg">PAGADO</span>
                          : <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded-lg">POR COBRAR</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1">
                          {!isPaid && <button onClick={() => { const r = reservations.find(x => String(x.id) === String(v.id)); if (r) setPayTarget(r); }} className="text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg transition-colors">Cobrar</button>}
                          <button onClick={() => handleInsideExit(v)} disabled={loading} className="text-[10px] font-bold bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40">Salida</button>
                        </span>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal de Zonas CAD */}
      {showZoneEditor && (
        <CarParkZoneEditor
          backgroundImage={currentEst?.image}
          initialSlots={slotList}
          parkingName={currentEst?.name}
          onSave={handleSaveZones}
          onClose={() => setShowZoneEditor(false)}
        />
      )}

      {/* Modal Cobro Garita */}
      {payTarget && (
        <CulqiPaymentModal
          isOpen={!!payTarget}
          onClose={() => setPayTarget(null)}
          amount={Number(payTarget.cost || 10)}
          concept={`Garita ${payTarget.plate} — ${payTarget.slot} en ${payTarget.parking || currentEst?.name}`}
          parkingName={String(payTarget.parking || currentEst?.name)}
          slotCode={String(payTarget.slot || '')}
          reservationId={Number(payTarget.id)}
          onPaymentSuccess={() => { setPaidIds(prev => new Set([...prev, Number(payTarget.id)])); setPayTarget(null); }}
        />
      )}
    </div>
  );
};

export default ANPRMonitor;
