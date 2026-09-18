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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import {
  normalizarPlaca,
  formatearPlacaConGuion
} from '../utils/plateOcr';
import { useAuth } from '../context/AuthContext';
import { useEstablishments, isDemoEstablishment } from '../context/EstablishmentContext';
import { CarParkZoneEditor } from './CarParkZoneEditor';
import { CulqiPaymentModal } from './CulqiPaymentModal';

const GARITA_LOGS_STORAGE_KEY = 'smart_park_garita_audit_logs_v2';
const GARITA_ACTIVE_TICKETS_KEY = 'smart_park_garita_walkin_tickets_v2';

const TICK = 30000;

const getCurrentTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ANPRMonitor = () => {
  const { role, user } = useAuth();
  const {
    establishments,
    myEstablishments,
    isMyEstablishment,
    reservations,
    occupySlot,
    freeSlot,
    checkInReservation,
    checkOutReservation,
    createReservation,
    updateStayReservation,
    updateEstablishment,
    updateEstablishmentPlan
  } = useEstablishments();

  // Filtrar establecimientos autorizados para este administrador local u operador:
  const availableEstablishments = useMemo(() => {
    if (role === 'platform') return (establishments || []).filter(e => !isDemoEstablishment(e));
    if (Array.isArray(myEstablishments) && myEstablishments.length > 0) return myEstablishments;
    return (establishments || []).filter(e => isMyEstablishment(e, user, role, establishments));
  }, [establishments, myEstablishments, isMyEstablishment, user, role]);

  const [selectedEstId, setSelectedEstId] = useState(() => {
    const saved = localStorage.getItem('smart_park_active_garita_est');
    if (saved && establishments.some(e => String(e.id) === String(saved))) return saved;
    return availableEstablishments[0]?.id || establishments[0]?.id || 'EST-01';
  });

  // Asegurar que selectedEstId siempre pertenezca a availableEstablishments de la empresa
  useEffect(() => {
    if (availableEstablishments.length > 0) {
      const exists = availableEstablishments.some(e => String(e.id) === String(selectedEstId));
      if (!exists) {
        const nextId = String(availableEstablishments[0].id);
        setSelectedEstId(nextId);
        try {
          localStorage.setItem('smart_park_active_garita_est', nextId);
        } catch {}
      }
    }
  }, [availableEstablishments, selectedEstId]);

  const currentEst = useMemo(
    () => availableEstablishments.find(e => String(e.id) === String(selectedEstId)) || availableEstablishments[0] || establishments[0],
    [availableEstablishments, selectedEstId, establishments]
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
  const [entryMode, setEntryMode] = useState('free'); // 'free' | 'hours'
  const [entryPresetHours, setEntryPresetHours] = useState(2);
  const [entryCustomHours, setEntryCustomHours] = useState(3);
  const [entryTime, setEntryTime] = useState(() => getCurrentTimeStr());

  // Modal de edición de estadía en cochera
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editStayMode, setEditStayMode] = useState('free');
  const [editHours, setEditHours] = useState(2);
  const [editSlot, setEditSlot] = useState('');

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

  useEffect(() => {
    if (!entrySlot && freeSlotList.length > 0) {
      setEntrySlot(freeSlotList[0].code);
    }
  }, [freeSlotList, entrySlot]);

  const vehiclesInside = useMemo(() => {
    const activeRes = reservations.filter(r => String(r.parkingId) === String(selectedEstId) && (r.status === 'ACTIVE' || r.status === 'active')).map(r => ({ 
      source: 'RESERVATION', 
      id: r.id, 
      code: r.code, 
      plate: r.plate, 
      slot: r.slot, 
      driverName: r.customerName || 'Usuario Registrado', 
      phone: r.customerPhone || 'N/A', 
      entryTime: r.actual_entry || r.startTime || r.createdAt || new Date().toISOString(), 
      rate: r.ratePerHour || currentEst?.rate || 5.0, 
      token: r.token,
      isOpenStay: !!(r.isOpenStay ?? r.is_open_stay),
      hours: r.hours || r.estimated_hours || (r.is_open_stay ? 0 : 2)
    }));
    const activeWalkIns = walkInTickets.filter(t => String(t.estId) === String(selectedEstId) && t.status === 'ACTIVE').map(t => ({ 
      source: 'WALK_IN', 
      id: t.id, 
      code: t.ticketNumber, 
      plate: t.plate, 
      slot: t.slot, 
      driverName: t.driverName || 'Cliente en garita', 
      phone: t.phone || 'Registro manual', 
      entryTime: t.entryTime, 
      rate: t.rate || currentEst?.rate || 5.0, 
      token: t.ticketNumber,
      isOpenStay: !!t.isOpenStay,
      hours: t.hours || (t.isOpenStay ? 0 : 2)
    }));
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
      // 1. Calcular hora de entrada real según entryTime
      const targetEntryDate = new Date();
      if (entryTime) {
        const [h, m] = entryTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          targetEntryDate.setHours(h, m, 0, 0);
        }
      }

      // 2. Determinar si es Tiempo Libre o cantidad de horas
      const isOpenStay = entryMode === 'free';
      const effectiveHours = isOpenStay
        ? 24 // ventana de reserva abierta para la sede
        : (entryPresetHours === 'custom' ? Math.max(0.5, Number(entryCustomHours) || 1) : Number(entryPresetHours || 2));

      const normalized = normalizarPlaca(plate);
      const matched = reservations.find(r => String(r.parkingId) === String(selectedEstId) && normalizarPlaca(r.plate) === normalized && (r.status === 'SCHEDULED' || r.status === 'ACTIVE' || !r.status));
      
      if (matched) {
        const targetSlot = matched.slot || entrySlot;
        await checkInReservation(matched.code, isOpenStay ? null : effectiveHours);
        if (entryTime) {
          await updateStayReservation(matched.id || matched.code, {
            actual_entry: targetEntryDate.toISOString(),
            hours_stay: isOpenStay ? 0 : effectiveHours,
            is_open_stay: isOpenStay,
            slot_code: targetSlot
          });
        }
        occupySlot(selectedEstId, targetSlot, plate);
        const stayDesc = isOpenStay ? 'Tiempo libre' : `${effectiveHours}h`;
        const timeStr = targetEntryDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        setFormResult({ matched: true, message: `Ingreso registrado. Reserva ${matched.code} en cajón ${targetSlot} (${stayDesc}, Entrada: ${timeStr}).` });
        addAuditLog({ type: 'GARITA', action: 'INGRESO_RESERVA', plate, slot: targetSlot, status: 'ACTIVO', detail: `Reserva ${matched.code} con check-in manual (${stayDesc}).` });
      } else {
        const res = await createReservation({
          parkingId: currentEst.id,
          slotCode: entrySlot,
          plate,
          hours: effectiveHours,
          isOpenStay,
          is_open_stay: isOpenStay,
          startTime: targetEntryDate.toISOString(),
          expiresAt: new Date(targetEntryDate.getTime() + effectiveHours * 3600000).toISOString()
        });
        if (res && !res.error && res.code) {
          await checkInReservation(res.code, isOpenStay ? null : effectiveHours);
          if (entryTime) {
            await updateStayReservation(res.id || res.code, {
              actual_entry: targetEntryDate.toISOString(),
              hours_stay: isOpenStay ? 0 : effectiveHours,
              is_open_stay: isOpenStay
            });
          }
          const stayDesc = isOpenStay ? 'Tiempo libre' : `${effectiveHours}h`;
          const timeStr = targetEntryDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
          setFormResult({ matched: true, message: `Ingreso registrado. Ticket ${res.code} en cajón ${entrySlot} (${stayDesc}, Entrada: ${timeStr}).` });
          addAuditLog({ type: 'GARITA', action: 'INGRESO_MANUAL', plate, slot: entrySlot, status: 'ACTIVO', detail: `Ticket ${res.code} creado en garita (${stayDesc}, Entrada: ${timeStr}).` });
        } else {
          setFormResult({ matched: false, message: `No se pudo registrar el ingreso: ${res?.error || 'Cajón no disponible.'}` });
        }
      }
      setEntryPlate('');
      setEntrySlot('');
      setEntryName('');
      setEntryTime(getCurrentTimeStr());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    const entryD = new Date(vehicle.entryTime);
    setEditTime(`${String(entryD.getHours()).padStart(2, '0')}:${String(entryD.getMinutes()).padStart(2, '0')}`);
    setEditSlot(vehicle.slot);
    if (vehicle.isOpenStay || !vehicle.hours || vehicle.hours === 0) {
      setEditStayMode('free');
      setEditHours(2);
    } else {
      const h = Number(vehicle.hours);
      const isPreset = [1, 2, 3, 4, 6, 8, 12, 24].includes(h);
      setEditStayMode(isPreset ? String(h) : 'custom');
      setEditHours(h);
    }
  };

  const handleSaveEditStay = async () => {
    if (!editingVehicle) return;
    setLoading(true);
    try {
      const currentEntry = new Date(editingVehicle.entryTime);
      const newEntryDate = new Date(currentEntry.getTime());
      if (editTime) {
        const [h, m] = editTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          newEntryDate.setHours(h, m, 0, 0);
        }
      }

      const isOpenStay = editStayMode === 'free';
      const effectiveHours = isOpenStay ? 0 : Number(editHours || 2);

      if (editingVehicle.source === 'RESERVATION') {
        const res = await updateStayReservation(editingVehicle.id, {
          actual_entry: newEntryDate.toISOString(),
          hours_stay: effectiveHours,
          is_open_stay: isOpenStay,
          slot_code: editSlot
        });
        if (!res.ok) {
          setFormResult({ matched: false, message: `Error al actualizar: ${res.message}` });
          return;
        }
      }

      if (editingVehicle.source === 'WALK_IN') {
        setWalkInTickets(prev => prev.map(t => {
          if (t.id === editingVehicle.id || t.ticketNumber === editingVehicle.code) {
            return {
              ...t,
              entryTime: newEntryDate.toISOString(),
              slot: editSlot,
              hours: effectiveHours,
              isOpenStay
            };
          }
          return t;
        }));
      }

      if (editSlot && editSlot !== editingVehicle.slot) {
        freeSlot(selectedEstId, editingVehicle.slot);
        occupySlot(selectedEstId, editSlot, editingVehicle.plate);
      }

      const timeFormatted = newEntryDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const stayDesc = isOpenStay ? 'Tiempo libre' : `${effectiveHours}h`;
      setFormResult({ matched: true, message: `Estadía de ${editingVehicle.plate} actualizada: Entrada ${timeFormatted}, ${stayDesc}, Cajón ${editSlot}.` });
      addAuditLog({
        type: 'GARITA',
        action: 'EDICION_ESTADIA',
        plate: editingVehicle.plate,
        slot: editSlot,
        status: 'ACTIVO',
        detail: `Hora de entrada corregida a ${timeFormatted}, ${stayDesc}.`
      });

      setEditingVehicle(null);
    } catch (err) {
      setFormResult({ matched: false, message: 'Error al actualizar la estadía.' });
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
    const entryDate = new Date(item.actual_entry || item.actualEntry || item.startTime || item.entryTime || Date.now() - 3600000);
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
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
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
              <select 
                value={selectedEstId} 
                onChange={(e) => {
                  setSelectedEstId(e.target.value);
                  try {
                    localStorage.setItem('smart_park_active_garita_est', e.target.value);
                  } catch {}
                }} 
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer max-w-[200px] truncate"
              >
                {availableEstablishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
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
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-5 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Registrar Entrada a Cochera</h2>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
              Check-in automático si existe reserva
            </span>
          </div>

          {/* Fila 1: Placa y Conductor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Placa del vehículo <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="ABC-123"
                value={entryPlate}
                onChange={e => setEntryPlate(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleEntrySubmit(); }}
                className="font-mono font-black text-center text-base tracking-widest uppercase h-11 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                Conductor <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <Input
                type="text"
                placeholder="Nombre o teléfono"
                value={entryName}
                onChange={e => setEntryName(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Fila 2: Cajón Asignado */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Cajón asignado <span className="text-slate-400 font-normal">({freeSlotList.length} disponibles)</span>
              </label>
              {entrySlot && (
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Seleccionado: {entrySlot}
                </span>
              )}
            </div>
            {freeSlotList.length === 0 ? (
              <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3">
                No hay cajones libres disponibles en esta sede.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {freeSlotList.map(s => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setEntrySlot(s.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${entrySlot === s.code ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'}`}
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fila 3: Modalidad de Estadía & Hora de Ingreso */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Modalidad de Estadía */}
            <div className="md:col-span-8 space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Modalidad de estadía
              </label>
              
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#0B0F19] rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm">
                <button
                  type="button"
                  onClick={() => setEntryMode('free')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${entryMode === 'free' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Tiempo Libre
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('hours')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${entryMode === 'hours' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Por Horas
                </button>
              </div>

              {entryMode === 'free' ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Estadía abierta. El importe se calcula al registrar la salida según el tiempo transcurrido.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[1, 2, 3, 4, 6, 8, 12, 24].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setEntryPresetHours(h)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${entryPresetHours === h ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                      >
                        {h}h
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEntryPresetHours('custom')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${entryPresetHours === 'custom' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    >
                      Personalizado
                    </button>
                  </div>

                  {entryPresetHours === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="720"
                        value={entryCustomHours}
                        onChange={e => setEntryCustomHours(e.target.value)}
                        placeholder="Ej. 1.5, 3"
                        className="h-10 w-28 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 dark:text-slate-100 font-bold text-center"
                      />
                      <span className="text-xs text-slate-500 font-medium">horas estimadas</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hora de Ingreso */}
            <div className="md:col-span-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Hora de entrada
                </label>
                <button
                  type="button"
                  onClick={() => setEntryTime(getCurrentTimeStr())}
                  className="text-[10px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
                >
                  Hora actual
                </button>
              </div>
              <Input
                type="time"
                value={entryTime}
                onChange={e => setEntryTime(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 dark:text-slate-100 font-mono font-bold text-center"
              />
            </div>
          </div>

          {/* Botón de Confirmación Principal */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleEntrySubmit}
              disabled={loading || !entryPlate || !entrySlot}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm h-12 rounded-xl gap-2 transition-colors shadow-sm cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <ArrowUpRight className="w-4 h-4"/>}
              Registrar ingreso
            </Button>
          </div>
        </div>
      )}

      {/* ── Formulario de salida ── */}
      {garitaTab === 'exit' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4 transition-colors">
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
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Tiempo</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 font-mono">{Math.floor(exitDetail.minutesParked / 60)}h {String(exitDetail.minutesParked % 60).padStart(2, '0')}m</p>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
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
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
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
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                        <div>{entry.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${v.isOpenStay ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {v.isOpenStay ? 'Libre' : `${v.hours || 1}h est.`}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-black text-slate-900 dark:text-slate-100">{elapsedLabel(v.entryTime)}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        {isPaid
                          ? <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded-lg">PAGADO</span>
                          : <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded-lg">POR COBRAR</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(v)}
                            title="Editar hora o estadía"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Editar Estadía / Hora de Ingreso */}
      <Dialog open={!!editingVehicle} onOpenChange={open => !open && setEditingVehicle(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Pencil className="w-4 h-4 text-emerald-600" />
              Editar Estadía • {editingVehicle?.plate}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Modifica la hora de ingreso real, el cajón o el régimen de tiempo para este vehículo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-200">Hora de ingreso (HH:mm)</label>
                <button
                  type="button"
                  onClick={() => setEditTime(getCurrentTimeStr())}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                >
                  Poner hora actual
                </button>
              </div>
              <Input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="h-10 rounded-xl dark:bg-[#0B0F19] dark:border-slate-700 dark:text-slate-100 font-mono font-bold text-center"
              />
              <p className="text-[10px] text-slate-400 mt-1">Si el auto ingresó antes de registrarlo, ajusta aquí su hora de llegada real.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Régimen</label>
                <select
                  value={editStayMode}
                  onChange={e => setEditStayMode(e.target.value)}
                  className="h-10 w-full px-3 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="free">Tiempo Libre (al salir)</option>
                  <option value="1">1 hora</option>
                  <option value="2">2 horas</option>
                  <option value="3">3 horas</option>
                  <option value="4">4 horas</option>
                  <option value="6">6 horas</option>
                  <option value="8">8 horas</option>
                  <option value="12">12 horas</option>
                  <option value="24">24 horas</option>
                  <option value="custom">Personalizado...</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Cajón</label>
                <select
                  value={editSlot}
                  onChange={e => setEditSlot(e.target.value)}
                  className="h-10 w-full px-3 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value={editingVehicle?.slot}>{editingVehicle?.slot} (Actual)</option>
                  {freeSlotList.map(s => (
                    <option key={s.code} value={s.code}>{s.code} (Libre)</option>
                  ))}
                </select>
              </div>
            </div>

            {editStayMode === 'custom' && (
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">Horas estimadas</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="720"
                  value={editHours}
                  onChange={e => setEditHours(e.target.value)}
                  placeholder="Ej. 1.5, 3"
                  className="h-10 rounded-xl dark:bg-[#0B0F19] dark:border-slate-700 dark:text-slate-100 font-bold text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingVehicle(null)}
              className="text-xs h-9 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditStay}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1"/> : null}
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ANPRMonitor;
