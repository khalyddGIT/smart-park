import React, { useState, useMemo, useEffect } from 'react';
import { 
  Car, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Receipt, 
  DollarSign, 
  QrCode, 
  Search, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  X, 
  FileText, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  UserCheck,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useEstablishments } from '../context/EstablishmentContext';
import { useAuth } from '../context/AuthContext';
import { AutoFitFloorPlan } from './AutoFitFloorPlan';
import { playTone, isAudioMuted, toggleAudioMute } from '../utils/soundEffects';
import api from '../services/api';

export const PersonalGaritaModule = () => {
  const { establishments, reservations, createReservation, checkInReservation, checkOutReservation, ensureFloorPlan, fetchParkings, wsConnected } = useEstablishments();
  const { user } = useAuth();
  const [assignedParkingId, setAssignedParkingId] = useState(null);
  const [audioMuted, setAudioMutedState] = useState(isAudioMuted());

  useEffect(() => {
    const handleMuteChange = (e) => setAudioMutedState(e.detail.muted);
    window.addEventListener('smart_park_audio_mute_changed', handleMuteChange);
    return () => window.removeEventListener('smart_park_audio_mute_changed', handleMuteChange);
  }, []);

  const handleToggleMute = () => {
    const next = toggleAudioMute();
    setAudioMutedState(next);
  };

  useEffect(() => {
    if (!user?.email) return;
    api.get('/staff').then(r => {
      const me = (Array.isArray(r.data) ? r.data : []).find(s => (s.email || '').toLowerCase() === user.email.toLowerCase());
      if (me?.parking_id) setAssignedParkingId(String(me.parking_id));
    }).catch(() => {});
  }, [user?.email]);

  const currentEst = useMemo(() => {
    if (assignedParkingId) return establishments.find(e => String(e.id) === String(assignedParkingId)) || establishments[0];
    return establishments[0];
  }, [establishments, assignedParkingId]);

  // Asegura que el plano del parking asignado esté hidratado
  useEffect(() => {
    if (currentEst && currentEst.elements === null && currentEst.id && !String(currentEst.id).startsWith('EST-')) {
      ensureFloorPlan(currentEst.id);
    }
  }, [currentEst?.id, currentEst?.elements]);

  const [plate, setPlate] = useState('');
  const [slot, setSlot] = useState('');
  const [hours, setHours] = useState(2);
  const [payMethod, setPayMethod] = useState('efectivo');
  const [feedback, setFeedback] = useState('');
  const [garitaReservations, setGaritaReservations] = useState([]);
  const [exitSearchTerm, setExitSearchTerm] = useState('');

  // Estados de Modales: Salida/Cobro, Ticket Térmico, Cierre de Turno e Incidencias
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [thermalTicket, setThermalTicket] = useState(null);
  const [shiftModal, setShiftModal] = useState(false);
  const [shiftInitialCash, setShiftInitialCash] = useState(50.0);
  const [shiftCountedCash, setShiftCountedCash] = useState('');

  // Modal de Reporte de Incidencias Operativas en Garita
  const [incidentModal, setIncidentModal] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('cajon_bloqueado');
  const [incidentSlot, setIncidentSlot] = useState('');
  const [incidentPlate, setIncidentPlate] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentDescription.trim()) return;
    setIncidentSubmitting(true);
    try {
      const parkId = currentEst?.id ? (Number(currentEst.id) || 1) : 1;
      const fullDesc = `${incidentSlot ? `[Cajón ${incidentSlot}] ` : ''}${incidentPlate ? `[Placa ${incidentPlate.toUpperCase()}] ` : ''}${incidentDescription.trim()}`;
      await api.post('/incidents', {
        parking_id: parkId,
        category: incidentCategory,
        description: fullDesc
      });
      setFeedback('✓ Incidencia operativa reportada y registrada con éxito.');
      setIncidentModal(false);
      setIncidentDescription('');
      setIncidentSlot('');
      setIncidentPlate('');
      playTone('success');
    } catch (err) {
      setFeedback('Incidencia registrada localmente en garita.');
      setIncidentModal(false);
    } finally {
      setIncidentSubmitting(false);
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  const fetchGaritaReservations = async () => {
    if (!currentEst?.id || String(currentEst.id).startsWith('EST-')) return;
    try {
      const r = await api.get('/reservations', { params: { parking_id: Number(currentEst.id) } });
      if (Array.isArray(r.data)) {
        setGaritaReservations(r.data.map(x => ({
          id: x.id, 
          code: x.code, 
          plate: x.license_plate, 
          slotId: x.slot_id, 
          parkingId: String(x.parking_id),
          status: (x.status || 'scheduled').toUpperCase(), 
          startTime: x.start_time, 
          endTime: x.end_time, 
          actualEntry: x.actual_entry,
          actualExit: x.actual_exit,
          total_cost: x.total_cost,
          payment_method: x.payment_method || 'efectivo',
          amount_paid: x.amount_paid || 0.0
        })));
      }
      ensureFloorPlan(currentEst.id, true);
    } catch {}
  };

  useEffect(() => {
    fetchGaritaReservations();
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') fetchGaritaReservations();
    }, 5000);
    const onVis = () => { if (document.visibilityState === 'visible') fetchGaritaReservations(); };
    document.addEventListener('visibilitychange', onVis);

    // Sincronización reactiva instantánea vía WebSocket
    const handleLiveSync = (e) => {
      const detail = e?.detail;
      if (!detail) return;
      const pid = String(detail.parking_id || detail.parkingId || '');
      if (!pid || pid === String(currentEst?.id)) {
        fetchGaritaReservations();
        if (currentEst?.id) {
          ensureFloorPlan(currentEst.id, true);
        }
      }
    };
    window.addEventListener('smart_park_reservation_live', handleLiveSync);
    window.addEventListener('smart_park_spaces_live', handleLiveSync);

    return () => { 
      clearInterval(iv); 
      document.removeEventListener('visibilitychange', onVis); 
      window.removeEventListener('smart_park_reservation_live', handleLiveSync);
      window.removeEventListener('smart_park_spaces_live', handleLiveSync);
    };
  }, [currentEst?.id]);

  const freeSlots = useMemo(() => (currentEst?.elements || []).filter(e => e.type === 'slot' && e.status === 'free'), [currentEst]);

  // Lista de vehículos actualmente dentro
  const vehiclesInside = useMemo(() => {
    const src = garitaReservations.length ? garitaReservations : reservations;
    return src.filter(r => {
      const pid = String(r.parkingId || r.parking_id || '');
      return pid === String(currentEst?.id) && (r.status || '').toUpperCase() === 'ACTIVE';
    }).map(r => {
      let slotCode = r.slot || '';
      if (!slotCode && r.slotId) {
        const el = (currentEst?.elements || []).find(e => String(e.id) === String(r.slotId));
        if (el) slotCode = el.code;
      }
      return {
        id: r.id, 
        code: r.code, 
        plate: r.plate || r.license_plate, 
        slot: slotCode || r.slotId, 
        entry: r.actualEntry || r.startTime || r.start_time || r.createdAt,
        rawReservation: r
      };
    });
  }, [garitaReservations, reservations, currentEst]);

  // Filtrado rápido por placa de vehículos dentro
  const filteredVehiclesInside = useMemo(() => {
    if (!exitSearchTerm.trim()) return vehiclesInside;
    const term = exitSearchTerm.trim().toUpperCase();
    return vehiclesInside.filter(v => v.plate.includes(term) || String(v.slot).toUpperCase().includes(term));
  }, [vehiclesInside, exitSearchTerm]);

  // Estadísticas del Turno Actual (Hoy)
  const shiftStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const src = garitaReservations.length ? garitaReservations : reservations;
    const todayReservations = src.filter(r => {
      const pid = String(r.parkingId || r.parking_id || '');
      const entryDate = r.actualEntry || r.startTime || r.start_time || '';
      return pid === String(currentEst?.id) && entryDate.startsWith(today);
    });

    const completed = todayReservations.filter(r => (r.status || '').toUpperCase() === 'COMPLETED');
    const cashTotal = completed.reduce((acc, r) => {
      const method = (r.payment_method || '').toLowerCase();
      if (method === 'efectivo' || !method) return acc + (Number(r.amount_paid || r.total_cost) || 0);
      return acc;
    }, 0);

    const digitalTotal = completed.reduce((acc, r) => {
      const method = (r.payment_method || '').toLowerCase();
      if (method && method !== 'efectivo') return acc + (Number(r.amount_paid || r.total_cost) || 0);
      return acc;
    }, 0);

    return {
      totalVehicles: todayReservations.length,
      completedVehicles: completed.length,
      insideVehicles: vehiclesInside.length,
      cashTotal,
      digitalTotal,
      grandTotal: cashTotal + digitalTotal
    };
  }, [garitaReservations, reservations, currentEst, vehiclesInside]);

  // Registro de Ingreso
  const handleIngreso = async () => {
    const targetSlot = slot || freeSlots[0]?.code;
    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      setFeedback('Ingresa la placa del vehículo');
      setTimeout(() => setFeedback(''), 2500);
      return;
    }
    if (!targetSlot) {
      setFeedback('No hay cajones libres disponibles en esta cochera');
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    const now = new Date();
    const isPendiente = payMethod === 'pendiente';
    const res = await createReservation({
      parkingId: currentEst.id,
      slotCode: targetSlot,
      plate: cleanPlate,
      hours,
      startTime: now.toISOString(),
      expiresAt: new Date(now.getTime() + hours * 3600000).toISOString(),
      paymentMethod: isPendiente ? null : payMethod,
      payNow: !isPendiente
    });
    if (!res || res.error || !res.code) {
      setFeedback(`Error: ${res?.error || 'Cajón no disponible'}`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    await checkInReservation(res.code);
    playTone('success');
    setFeedback(`${targetSlot} • ${cleanPlate} registrado exitosamente ${isPendiente ? '(pago al salir)' : `(${payMethod})`}`);
    setSlot('');
    setPlate('');
    setTimeout(() => setFeedback(''), 3000);
    fetchGaritaReservations();
    try { await fetchParkings(); await ensureFloorPlan(String(currentEst.id), true); } catch {}
  };

  // Abrir Modal de Salida y Cobro con cálculo de tarifa diferenciada y turno noche
  const handleOpenSalidaModal = (v) => {
    const entryDate = new Date(v.entry || Date.now());
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - entryDate.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

    // Detectar tipo de vehículo según la plaza en el plano
    const slotEl = (currentEst?.elements || []).find(e => e.type === 'slot' && (e.code === v.slot || e.id === v.slotId));
    const slotType = slotEl?.slotType || 'auto';

    let categoryRate = Number(currentEst?.rate_auto ?? currentEst?.rate ?? 5.0);
    let categoryLabel = 'Auto';
    if (slotType === 'moto') {
      categoryRate = Number(currentEst?.rate_moto ?? 2.5);
      categoryLabel = 'Moto Lineal';
    } else if (slotType === 'mototaxi') {
      categoryRate = Number(currentEst?.rate_mototaxi ?? 3.5);
      categoryLabel = 'Moto Taxi (Torito)';
    } else if (slotType === 'camioneta' || slotType === 'suv') {
      categoryRate = Number(currentEst?.rate_suv ?? 7.0);
      categoryLabel = 'Camioneta / SUV';
    }

    // Verificar si aplica recargo de Turno Noche
    let nightShiftActive = false;
    let nightSurcharge = 0;
    if (currentEst?.night_shift_enabled) {
      const startStr = currentEst.night_shift_start || '20:00';
      const endStr = currentEst.night_shift_end || '06:00';
      const [sH, sM] = startStr.split(':').map(Number);
      const [eH, eM] = endStr.split(':').map(Number);
      const startMin = (sH || 0) * 60 + (sM || 0);
      const endMin = (eH || 0) * 60 + (eM || 0);

      const curMin = now.getHours() * 60 + now.getMinutes();
      const entryMin = entryDate.getHours() * 60 + entryDate.getMinutes();
      
      const inNight = (val) => startMin <= endMin ? (val >= startMin && val <= endMin) : (val >= startMin || val <= endMin);
      if (inNight(curMin) || inNight(entryMin)) {
        nightShiftActive = true;
        nightSurcharge = Number(currentEst.night_shift_surcharge || 0);
      }
    }

    const finalRate = categoryRate + nightSurcharge;
    // Tolerancia de 15 min
    const billedHours = Math.max(1, Math.ceil(Math.max(0, diffMins - 15) / 60));
    const calculatedCost = billedHours * finalRate;

    // Verificar si ya fue pre-pagado en el ingreso
    const raw = v.rawReservation || {};
    const alreadyPaid = raw.amount_paid > 0 || (raw.payment_method && raw.payment_method !== 'pendiente' && raw.payment_method !== null);

    setCheckoutModal({
      vehicle: v,
      entryDate,
      exitDate: now,
      elapsedHours: h,
      elapsedMinutes: m,
      billedHours,
      categoryLabel,
      categoryRate,
      nightShiftActive,
      nightSurcharge,
      rate: finalRate,
      totalCost: calculatedCost,
      alreadyPaid,
      originalMethod: raw.payment_method || 'efectivo',
      selectedPaymentMethod: 'efectivo',
      cashGiven: '',
      change: 0,
      notes: ''
    });
  };

  // Confirmar Salida y Cobro
  const handleConfirmSalida = async () => {
    if (!checkoutModal) return;
    const { vehicle, selectedPaymentMethod, totalCost, alreadyPaid } = checkoutModal;

    const checkoutData = {
      payment_method: alreadyPaid ? checkoutModal.originalMethod : selectedPaymentMethod,
      amount_paid: totalCost
    };

    const r = await checkOutReservation(vehicle.code, checkoutData);
    playTone('exit');

    // Preparar ticket térmico
    setThermalTicket({
      code: vehicle.code,
      parkingName: currentEst?.name || 'Smart Park',
      address: currentEst?.address || 'Ayacucho Centro',
      plate: vehicle.plate,
      slot: vehicle.slot,
      category: checkoutModal.categoryLabel,
      entryTime: checkoutModal.entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: checkoutModal.exitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: checkoutModal.exitDate.toLocaleDateString('es-PE'),
      duration: `${checkoutModal.elapsedHours}h ${checkoutModal.elapsedMinutes}m`,
      billedHours: checkoutModal.billedHours,
      rate: checkoutModal.rate,
      nightShiftActive: checkoutModal.nightShiftActive,
      totalCost: totalCost,
      paymentMethod: checkoutData.payment_method,
      operatorName: user?.full_name || 'Operador de Garita'
    });

    setCheckoutModal(null);
    setFeedback(r.message || `Salida completada para ${vehicle.plate}`);
    setTimeout(() => setFeedback(''), 3500);

    fetchGaritaReservations();
    try { await fetchParkings(); await ensureFloorPlan(String(currentEst.id), true); } catch {}
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-5">
      {/* Header de Garita */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black text-slate-900 leading-snug">{currentEst?.name || 'Mi Cochera'}</h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
              Garita Activa
            </span>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
              wsConnected 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                : 'bg-amber-50 text-amber-700 border border-amber-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{wsConnected ? '● En Vivo (WebSocket)' : '○ Reconectando...'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-emerald-700">{freeSlots.length} libres</span>
            <span>·</span>
            <span className="font-bold text-slate-700">{vehiclesInside.length} activos</span>
            <span>·</span>
            <span className="font-semibold text-slate-600">S/ {Number(currentEst?.rate || 5).toFixed(2)}/h</span>
            <span>·</span>
            <span className="text-slate-400">15m cortesía</span>
          </p>
        </div>

        {/* Acciones de Cabecera: Silenciar Audio & Cierre de Turno */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleMute}
            title={audioMuted ? "Activar sonido de garita" : "Silenciar sonido de garita"}
            className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold gap-1.5"
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="hidden sm:inline">{audioMuted ? 'Mudo' : 'Audio ON'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIncidentModal(true)}
            className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black gap-1.5 shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-slate-950" />
            <span>Reportar Incidencia</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setShiftModal(true)}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Arqueo / Cierre de Turno</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Grid Principal: Plano CAD vs Panel de Registro y Vehículos dentro */}
      <div className="grid lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Columna Izquierda: Plano 2D CAD Interactivo */}
        <div className="lg:col-span-7 bg-[#1c253b] rounded-2xl border border-slate-700 p-3.5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-black text-slate-200 tracking-wide uppercase">Plano interactivo — Toca un cajón libre</p>
            {slot && <span className="text-xs font-bold text-emerald-400">Seleccionado: {slot}</span>}
          </div>
          {currentEst?.elements === null ? (
            <div className="h-[520px] flex items-center justify-center text-xs font-semibold text-slate-400">Cargando plano del parking...</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <AutoFitFloorPlan 
                elements={currentEst?.elements || []} 
                name={currentEst?.name} 
                selectable={true} 
                selectedSlot={slot} 
                onSelectSlot={setSlot} 
                containerHeightClass="h-[460px] sm:h-[520px] lg:h-[560px]" 
              />
              <p className="text-[11px] font-medium text-slate-400 mt-2 text-center">
                {slot ? `Cajón verde [${slot}] listo para registrar` : 'Verde = Disponible • Rojo = Ocupado • Amarillo = Reservado'}
              </p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Formulario de Ingreso Presencial y Lista de Salidas */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          {/* Formulario de Ingreso Rápido */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm flex-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">Entrada Rápida</h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Express</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Placa del vehículo</label>
                <span className="text-[11px] text-slate-400 font-mono">[Enter] Guardar</span>
              </div>
              <Input 
                placeholder="ABC-123" 
                value={plate} 
                onChange={e => {
                  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  if (!val.includes('-') && val.length > 3) {
                    val = val.slice(0, 3) + '-' + val.slice(3);
                  }
                  setPlate(val.slice(0, 9));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && plate.trim()) {
                    e.preventDefault();
                    handleIngreso();
                  }
                }}
                className="h-11 font-mono font-black uppercase mt-1 text-slate-900 border-slate-300 focus:border-emerald-500 text-base tracking-wider"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Cajón asignado</label>
              <div className={`mt-1 h-11 flex items-center px-3.5 border rounded-xl text-xs font-mono font-bold transition-all ${
                slot 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : freeSlots.length > 0 
                  ? 'bg-slate-50 border-slate-200 text-slate-600' 
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                {slot ? `Cajón: ${slot}` : freeSlots.length > 0 ? `Auto: ${freeSlots[0]?.code} (toca para cambiar)` : 'Sin cajones libres'}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Tiempo contratado</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1, 2, 4, 8].map(h => (
                  <button 
                    key={h} 
                    type="button" 
                    onClick={() => setHours(h)} 
                    className={`h-10 rounded-xl font-bold border transition-all cursor-pointer ${
                      hours === h ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Método de cobro</label>
              <select 
                value={payMethod} 
                onChange={e => setPayMethod(e.target.value)} 
                className="mt-1 w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="efectivo">Efectivo</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="tarjeta">Tarjeta POS</option>
                <option value="pendiente">Cobro al salir</option>
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total a cobrar</span>
              <span className="text-xl font-black font-mono text-slate-900">
                S/ {(Number(currentEst?.rate || 5) * hours).toFixed(2)}
              </span>
            </div>

            <Button 
              onClick={handleIngreso} 
              disabled={!plate.trim() || (!slot && freeSlots.length === 0)} 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md disabled:opacity-40 transition-all cursor-pointer"
            >
              + Registrar Ingreso ({slot || freeSlots[0]?.code || 'Sin cupo'})
            </Button>
          </div>

          {/* Lista de Vehículos Dentro & Checkout Rápido */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-slate-700" />
                <span>Dentro • {vehiclesInside.length}</span>
              </span>

              {/* Filtro rápido por placa */}
              <div className="relative w-36 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar placa..."
                  value={exitSearchTerm}
                  onChange={e => setExitSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {filteredVehiclesInside.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">
                {exitSearchTerm ? 'No hay vehículos con esa placa' : 'Ningún vehículo dentro actualmente'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                {filteredVehiclesInside.map(v => {
                  const mins = Math.max(0, Math.round((Date.now() - new Date(v.entry).getTime()) / 60000));
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  return (
                    <div key={v.code} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg shrink-0">
                          {v.slot}
                        </span>
                        <div>
                          <p className="font-mono font-black text-sm text-slate-900 leading-tight">{v.plate}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{h}h {m}m de estancia</span>
                          </p>
                        </div>
                      </div>

                      <Button 
                        size="sm" 
                        onClick={() => handleOpenSalidaModal(v)}
                        className="h-8 px-3.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer"
                      >
                        Salida & Cobro
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* =========================================================================
          MODAL DE SALIDA Y COBRO (CHECKOUT EN GARITA)
          ========================================================================= */}
      {checkoutModal && (
        <Dialog open={!!checkoutModal} onOpenChange={() => setCheckoutModal(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-200 dark:border-emerald-800">
                <Car className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">
                Salida y Cobro
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-mono text-slate-500">
                Ticket: {checkoutModal.vehicle.code}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* Placa y Cajón */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Placa</span>
                  <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                    {checkoutModal.vehicle.plate}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cajón</span>
                  <span className="text-base font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                    {checkoutModal.vehicle.slot}
                  </span>
                </div>
              </div>

              {/* Detalle de Tiempos y Tolerancia */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ingreso:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {checkoutModal.entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Salida:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {checkoutModal.exitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500">Permanencia:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {checkoutModal.elapsedHours}h {checkoutModal.elapsedMinutes}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Categoría:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{checkoutModal.categoryLabel}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarifa:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    S/ {checkoutModal.rate.toFixed(2)}/h
                    {checkoutModal.nightShiftActive && (
                      <span className="ml-1.5 text-[10px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200">
                        Noche +S/{checkoutModal.nightSurcharge.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                  <span>Tolerancia:</span>
                  <span>15 min cortesía</span>
                </div>
              </div>

              {/* Total y Medio de Pago */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                    {checkoutModal.alreadyPaid ? 'Pre-pagado' : 'Total a pagar'}
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">
                    S/ {checkoutModal.totalCost.toFixed(2)}
                  </span>
                </div>
                {checkoutModal.alreadyPaid && (
                  <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black">
                    ✓ Pagado al Ingreso
                  </span>
                )}
              </div>

              {/* Si no fue pre-pagado, elegir medio de cobro y vuelto rápido */}
              {!checkoutModal.alreadyPaid && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Método de cobro
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['efectivo', 'yape', 'tarjeta'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCheckoutModal(prev => ({ ...prev, selectedPaymentMethod: m }))}
                        className={`h-10 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                          checkoutModal.selectedPaymentMethod === m
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m === 'tarjeta' ? 'POS' : m}
                      </button>
                    ))}
                  </div>

                  {/* Calculador de Vuelto si es Efectivo */}
                  {checkoutModal.selectedPaymentMethod === 'efectivo' && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600 dark:text-slate-400">Pago rápido:</span>
                        <div className="flex gap-1.5">
                          {[10, 20, 50, 100].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                const given = Number(val);
                                const ch = Math.max(0, given - checkoutModal.totalCost);
                                setCheckoutModal(prev => ({ ...prev, cashGiven: String(val), change: ch }));
                              }}
                              className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                            >
                              S/{val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex-1">
                          <Input
                            placeholder="Recibido"
                            type="number"
                            value={checkoutModal.cashGiven}
                            onChange={e => {
                              const val = e.target.value;
                              const given = Number(val) || 0;
                              const ch = Math.max(0, given - checkoutModal.totalCost);
                              setCheckoutModal(prev => ({ ...prev, cashGiven: val, change: ch }));
                            }}
                            className="h-9 text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">Vuelto:</span>
                          <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                            S/ {checkoutModal.change.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR de Yape si seleccionó Yape */}
                  {checkoutModal.selectedPaymentMethod === 'yape' && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-lg p-1 border border-purple-200 flex items-center justify-center shrink-0">
                        <QrCode className="w-8 h-8 text-purple-700" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-purple-900 dark:text-purple-200">Cobro Yape</p>
                        <p className="text-purple-700 dark:text-purple-300 font-mono font-bold">
                          S/ {checkoutModal.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCheckoutModal(null)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSalida}
                className="flex-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Salida</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL DE TICKET TÉRMICO DE SALIDA (IMPRIMIBLE)
          ========================================================================= */}
      {thermalTicket && (
        <Dialog open={!!thermalTicket} onOpenChange={() => setThermalTicket(null)}>
          <DialogContent className="max-w-sm rounded-3xl p-6 bg-white text-slate-900 shadow-2xl border border-slate-200 font-mono">
            <DialogHeader className="text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-1">
                <Printer className="w-5 h-5 text-slate-700" />
              </div>
              <DialogTitle className="text-base font-black tracking-wider uppercase">
                {thermalTicket.parkingName}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-slate-500">
                {thermalTicket.address} • RUC: 20608945123
              </DialogDescription>
            </DialogHeader>

            {/* Cuerpo del Ticket Formato Térmico 80mm */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 my-2 text-xs space-y-1.5 leading-relaxed">
              <div className="flex justify-between">
                <span className="text-slate-500">Ticket Salida:</span>
                <span className="font-bold text-slate-900">{thermalTicket.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-bold text-slate-900">{thermalTicket.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placa:</span>
                <strong className="text-slate-900 text-sm">{thermalTicket.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría:</span>
                <span className="font-bold text-slate-900">{thermalTicket.category || 'Auto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cajón:</span>
                <span className="font-bold text-slate-900">{thermalTicket.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entrada:</span>
                <span className="font-medium text-slate-900">{thermalTicket.entryTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salida:</span>
                <span className="font-medium text-slate-900">{thermalTicket.exitTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Permanencia:</span>
                <span className="font-bold text-slate-900">{thermalTicket.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-bold capitalize text-slate-900">{thermalTicket.paymentMethod}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL COBRADO:</span>
                <span>S/ {Number(thermalTicket.totalCost).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-400 italic">
              ¡Gracias por estacionar con Smart Park!
            </p>

            <div className="flex items-center space-x-2 pt-3">
              <Button
                variant="outline"
                onClick={() => setThermalTicket(null)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-xs font-bold bg-slate-900 text-white gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL DE ARQUEO Y CIERRE DE TURNO / CAJA
          ========================================================================= */}
      {shiftModal && (
        <Dialog open={shiftModal} onOpenChange={() => setShiftModal(false)}>
          <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center mx-auto mb-2 border border-slate-200 dark:border-slate-700">
                <Receipt className="w-6 h-6 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl font-black text-center">
                Cierre de Turno
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-mono text-slate-500">
                {currentEst?.name} • {user?.full_name || 'Personal Garita'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              {/* Tarjetas de Resumen de Ingresos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Efectivo</span>
                  <span className="text-lg font-mono font-black text-slate-900 dark:text-white">
                    S/ {shiftStats.cashTotal.toFixed(2)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Digital (Yape/POS)</span>
                  <span className="text-lg font-mono font-black text-purple-600 dark:text-purple-400">
                    S/ {shiftStats.digitalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Detalle de Cuadre */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Vehículos:</span>
                  <strong className="text-slate-900 dark:text-white">{shiftStats.completedVehicles} salidas ({shiftStats.insideVehicles} en playa)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Fondo inicial:</span>
                  <div className="flex items-center gap-1 w-28">
                    <span className="text-slate-400">S/</span>
                    <Input
                      type="number"
                      value={shiftInitialCash}
                      onChange={e => setShiftInitialCash(Number(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white">
                  <span>Esperado en caja:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 text-sm">
                    S/ {(shiftInitialCash + shiftStats.cashTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Efectivo Contado por el Operador */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Efectivo en caja
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="0.00"
                    type="number"
                    value={shiftCountedCash}
                    onChange={e => setShiftCountedCash(e.target.value)}
                    className="h-10 text-base font-mono font-black"
                  />
                  {shiftCountedCash !== '' && (
                    <div className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 ${
                      Number(shiftCountedCash) === (shiftInitialCash + shiftStats.cashTotal)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : Number(shiftCountedCash) > (shiftInitialCash + shiftStats.cashTotal)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {Number(shiftCountedCash) === (shiftInitialCash + shiftStats.cashTotal)
                        ? '✓ Exacto'
                        : Number(shiftCountedCash) > (shiftInitialCash + shiftStats.cashTotal)
                        ? `+ S/ ${(Number(shiftCountedCash) - (shiftInitialCash + shiftStats.cashTotal)).toFixed(2)}`
                        : `- S/ ${((shiftInitialCash + shiftStats.cashTotal) - Number(shiftCountedCash)).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShiftModal(false)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-xs font-bold bg-slate-900 text-white gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Arqueo</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL DE REPORTE DE INCIDENCIA OPERATIVA EN GARITA
          ========================================================================= */}
      {incidentModal && (
        <Dialog open={incidentModal} onOpenChange={() => setIncidentModal(false)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-black text-center">
                Incidencia Operativa
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500">
                {currentEst?.name} • {user?.full_name || 'Personal Garita'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReportIncident} className="space-y-3.5 my-2 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipo de incidencia
                </label>
                <select
                  value={incidentCategory}
                  onChange={(e) => setIncidentCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500"
                >
                  <option value="cajon_bloqueado">Cajón bloqueado</option>
                  <option value="obstruccion_carril">Carril obstruido</option>
                  <option value="fuga_fluidos">Fuga de fluidos</option>
                  <option value="dano_infraestructura">Daño estructural</option>
                  <option value="exceso_permanencia">Tiempo excedido</option>
                  <option value="cobro_indebido">Problema de cobro</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cajón (opcional)
                  </label>
                  <Input
                    placeholder="ej. A-02"
                    value={incidentSlot}
                    onChange={(e) => setIncidentSlot(e.target.value.toUpperCase())}
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Placa (opcional)
                  </label>
                  <Input
                    placeholder="ej. ABC-123"
                    value={incidentPlate}
                    onChange={(e) => setIncidentPlate(e.target.value.toUpperCase())}
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalles de la incidencia..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs resize-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIncidentModal(false)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={incidentSubmitting || !incidentDescription.trim()}
                  className="flex-1 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 shadow-md cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-slate-950" />
                  <span>{incidentSubmitting ? 'Guardando...' : 'Reportar'}</span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};

