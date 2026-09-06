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
  DollarSign
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
        const now = new Date();
        const res = await createReservation({
          parkingId: currentEst.id,
          slotCode: entrySlot,
          plate,
          hours: entryHours,
          startTime: now.toISOString(),
          expiresAt: new Date(now.getTime() + entryHours * 3600000).toISOString()
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

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Encabezado */}
      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-black text-slate-900 tracking-tight leading-none">Control de Estadías</h1>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                Registro manual de estadías • Entrada, salida y cobro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer max-w-[200px] truncate">
                {establishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => setShowZoneEditor(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-10 px-4 rounded-2xl gap-1.5 shadow"
            >
              <Pencil className="w-4 h-4 text-emerald-400" /> Calibrar Plazas CAD
            </Button>
          </div>
        </div>

        {/* HUD Estadísticas rápidas */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ocupación</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{occupancyPct}% <span className="text-xs font-bold text-slate-500">{occupiedSlotsCount}/{totalSlotsCount}</span></p>
            </div>
            <Gauge className="w-5 h-5 text-slate-700" />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plazas Libres</p>
              <p className="text-lg font-black text-emerald-600 leading-none mt-1">{freeSlotsCount}</p>
            </div>
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">En Cochera</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{vehiclesInside.length}</p>
            </div>
            <Car className="w-5 h-5 text-slate-700" />
          </div>
        </div>
      </div>

      {/* Tabs: Entrada / Salida / En Cochera */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={()=>setGaritaTab('entry')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${garitaTab==='entry' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-white'}`}><ArrowUpRight className="w-3.5 h-3.5"/> Entrada</button>
        <button onClick={()=>setGaritaTab('exit')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${garitaTab==='exit' ? 'bg-amber-500 text-slate-900 shadow' : 'text-slate-600 hover:bg-white'}`}><ArrowDownLeft className="w-3.5 h-3.5"/> Salida</button>
        <button onClick={()=>setGaritaTab('inside')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${garitaTab==='inside' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Car className="w-3.5 h-3.5"/> En cochera ({vehiclesInside.length})</button>
      </div>

      {formResult && (
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 ${formResult.matched ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {formResult.matched ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <AlertTriangle className="w-4 h-4 text-amber-500"/>} {formResult.message}
        </div>
      )}

      {/* Formulario de entrada */}
      {garitaTab === 'entry' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Placa del vehículo</label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={entryPlate}
                onChange={e => setEntryPlate(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleEntrySubmit(); }}
                className="font-mono font-black text-center uppercase h-11 rounded-xl"
              />
              <p className="text-[10px] text-slate-400 mt-1">Si tiene reserva programada, se hace check-in automáticamente.</p>
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Conductor (opcional)</label>
              <Input
                type="text"
                placeholder="Nombre del conductor"
                value={entryName}
                onChange={e => setEntryName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-2">Cajón libre ({freeSlotList.length} disponibles)</label>
            {freeSlotList.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">No hay cajones libres en esta sede.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {freeSlotList.map(s => (
                  <button key={s.code} onClick={() => setEntrySlot(s.code)} className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black border transition ${entrySlot === s.code ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-400'}`}>{s.code}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Horas de estadía</label>
              <select value={entryHours} onChange={e => setEntryHours(Number(e.target.value))} className="h-11 w-full px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm h-11 rounded-2xl gap-1.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Registrar ingreso'}
            </Button>
          </div>
        </div>
      )}

      {/* Formulario de salida */}
      {garitaTab === 'exit' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Placa del vehículo</label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={exitPlate}
                onChange={e => setExitPlate(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleExitSearch(); }}
                className="font-mono font-black text-center uppercase h-11 rounded-xl"
              />
            </div>
            <Button
              type="button"
              onClick={handleExitSearch}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-sm h-11 px-6 rounded-2xl"
            >
              Buscar estadía
            </Button>
          </div>

          {exitDetail ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <p><span className="text-slate-500 font-bold">Placa:</span> <span className="font-mono font-black">{exitDetail.item.plate}</span></p>
                <p><span className="text-slate-500 font-bold">Cajón:</span> <span className="font-mono font-black">{exitDetail.item.slot}</span></p>
                <p><span className="text-slate-500 font-bold">Conductor:</span> <span className="font-bold">{exitDetail.item.driverName || exitDetail.item.customerName || '—'}</span></p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <p><span className="text-slate-500 font-bold">Tiempo:</span> <span className="font-bold">{Math.floor(exitDetail.minutesParked / 60)}h {exitDetail.minutesParked % 60}m</span></p>
                <p><span className="text-slate-500 font-bold">Total estimado:</span> <span className="font-black text-emerald-700">S/ {exitDetail.totalCost.toFixed(2)}</span></p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => { const r = reservations.find(x => String(x.id) === String(exitDetail.item.id)); if (r) setPayTarget(r); }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm h-11 rounded-2xl gap-1.5"
                >
                  <DollarSign className="w-4 h-4"/> Cobrar
                </Button>
                <Button
                  type="button"
                  onClick={handleExitSubmit}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm h-11 rounded-2xl"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Registrar salida y liberar cajón'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Busca por placa para ver el detalle de la estadía, cobrar y registrar la salida.</p>
          )}
        </div>
      )}

      {garitaTab === 'inside' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-2"><Car className="w-4 h-4 text-emerald-600"/> Vehículos en cochera • {vehiclesInside.length}</span>
            <span className="text-[10px] font-mono text-slate-500">{currentEst?.name}</span>
          </div>
          {vehiclesInside.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No hay vehículos con check-in activo en esta sede.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr><th className="px-3 py-2 text-left">Placa</th><th className="px-3 py-2 text-left">Cajón</th><th className="px-3 py-2 text-left">Conductor</th><th className="px-3 py-2 text-left">Entrada</th><th className="px-3 py-2 text-left">Tiempo</th><th className="px-3 py-2 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehiclesInside.map(v => { const entry = new Date(v.entryTime); const mins = Math.max(0, Math.round((Date.now() - entry.getTime()) / 60000)); const h = Math.floor(mins / 60); const m = mins % 60; const isPaid = paidIds.has(Number(v.id)); return (
                    <tr key={v.code + v.plate} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-black text-slate-900">{v.plate}</td>
                      <td className="px-3 py-2 font-mono font-bold">{v.slot}</td>
                      <td className="px-3 py-2 truncate max-w-[140px]">{v.driverName}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{entry.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 font-mono">{h}h {m}m</td>
                      <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                        {isPaid ? <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">PAGADO</span> : <button onClick={() => { const r = reservations.find(x => String(x.id) === String(v.id)); if (r) setPayTarget(r); }} className="text-[10px] font-black bg-amber-500 text-slate-900 px-2 py-1 rounded-lg">Cobrar</button>}
                        <button onClick={() => handleInsideExit(v)} className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg">Salida</button>
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
