import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments, parseIsoToDate, isMyEstablishment, isDemoEstablishment } from '../context/EstablishmentContext';
import api, { getAccessToken } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { CulqiPaymentModal } from './CulqiPaymentModal';
import { AutoFitFloorPlan } from './AutoFitFloorPlan';
import { 
  CalendarCheck, 
  Search, 
  Plus, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Car, 
  Phone, 
  User, 
  X, 
  AlertCircle, 
  XCircle, 
  Filter, 
  Sparkles, 
  ArrowRight,
  Printer,
  ChevronRight,
  ChevronLeft,
  LogOut,
  LogIn,
  RotateCcw,
  DollarSign,
  MapPin,
  Calendar,
  CreditCard,
  Check,
  TrendingUp,
  SlidersHorizontal,
  FileText,
  HelpCircle,
  MessageSquare,
  Building2,
  Eye,
  ShieldCheck,
  Activity,
  Compass,
  Scan,
  Timer,
  ChevronDown,
  Hash,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { DigitalAccessPassModal } from './DigitalAccessPassModal';

// Helper de cálculo dinámico del costo acumulado en tiempo real (sobreestadía sin periodo de gracia)
export const calculateLiveEffectiveCost = (res, now = Date.now()) => {
  if (!res) return 0;
  const baseCost = Number(res.cost || res.totalCost || res.total_cost || 0);
  const status = String(res.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return Number(res.total_cost || res.amount_paid || res.cost || baseCost);
  }
  if (status === 'SCHEDULED') {
    return baseCost;
  }
  if (status === 'ACTIVE') {
    // Si la reserva ya fue enriquecida por el backend en /api/v1/reservations con isOvertime y un total_cost mayor
    if (res.isOvertime && Number(res.cost) > baseCost) {
      return Number(res.cost);
    }
    const endMs = res.expiresAt 
      ? parseIsoToDate(res.expiresAt).getTime()
      : (parseIsoToDate(res.startTime).getTime() + (Number(res.hours) || 1) * 3600000);
    const diffMs = endMs - now;
    if (diffMs < 0) {
      const overtimeSec = Math.abs(Math.floor(diffMs / 1000));
      const baseHours = Math.max(1, Number(res.hours) || 1);
      const hourlyRate = Number(res.ratePerHour) || Number(res.rate) || (baseCost / baseHours) || 5.0;
      const extraHours = Math.max(1, Math.ceil(overtimeSec / 3600));
      return Number((baseCost + (extraHours * hourlyRate)).toFixed(2));
    }
    return baseCost;
  }
  return baseCost;
};

export const ReservationsModule = ({ onNavigateToBooking, onOpenMoreReservations }) => {
  const { user, role } = useAuth();
  const { 
    establishments, 
    reservations, 
    createReservation, 
    bookingError,
    updateReservationStatus, 
    cancelReservation, 
    completeReservation,
    checkInReservation,
    checkOutReservation,
    ensureFloorPlan,
    fetchParkings,
    refreshMyReservations
  } = useEstablishments();

  // Vista activa: 'list' | 'analytics'
  const [activeSubView, setActiveSubView] = useState('list');

  // Pagos: reservas ya pagadas (según servidor) y reserva en proceso de pago
  const [paidIds, setPaidIds] = useState(new Set());
  const [payTarget, setPayTarget] = useState(null);
  const [overtimePayModal, setOvertimePayModal] = useState(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    api.get('/payments/my').then(r => {
      const ids = new Set((Array.isArray(r.data) ? r.data : [])
        .filter(p => p.status === 'succeeded' && p.reservation_id)
        .map(p => Number(p.reservation_id)));
      setPaidIds(ids);
    }).catch(() => {});
  }, [reservations.length]);

  // Reloj en tiempo real para sincronizar estados de sobreestadía y tarifas cada 5 segundos
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Estados de búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  const [parkingFilter, setParkingFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK'
  
  // Modal de Nueva Reserva Manual / Express
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState(establishments[0]?.id || 'EST-01');
  const [selectedSlotCode, setSelectedSlotCode] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Pago al salir: el cobro real ocurre en el check-out, no al reservar
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [showCheckoutPayment, setShowCheckoutPayment] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [hours, setHours] = useState(2);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Modal de Check-in para Garita (Personal define horas de estadía)
  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInHours, setCheckInHours] = useState(2);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  // Modal de Pase QR
  const [selectedReservationForPass, setSelectedReservationForPass] = useState(null);
  const [showPassModal, setShowPassModal] = useState(false);

  // Modal de Ticket / Comprobante
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Sedes asociadas al usuario actual (aisladas estrictamente por empresa para admin local)
  const myEstablishments = useMemo(() => {
    return (establishments || []).filter(e => isMyEstablishment(e, user, role, establishments));
  }, [establishments, user, role]);

  const displayEstablishments = useMemo(() => {
    if (role === 'platform') return (establishments || []).filter(e => !isDemoEstablishment(e));
    if (Array.isArray(myEstablishments) && myEstablishments.length > 0) return myEstablishments;
    return (establishments || []).filter(e => isMyEstablishment(e, user, role, establishments));
  }, [establishments, myEstablishments, user, role]);

  // Establecimiento seleccionado para nueva reserva (restringido a sedes autorizadas)
  const activeEstablishment = displayEstablishments.find(e => String(e.id) === String(selectedParkingId)) || displayEstablishments[0] || establishments[0];
  const availableSlots = (activeEstablishment?.elements || []).filter(el => el.type === 'slot' && el.status === 'free');

  const [currentParkingId, setCurrentParkingId] = useState(() => {
    return myEstablishments[0]?.id || displayEstablishments[0]?.id || establishments[0]?.id || '';
  });

  useEffect(() => {
    if (!currentParkingId && myEstablishments[0]?.id) {
      setCurrentParkingId(myEstablishments[0].id);
    }
  }, [myEstablishments, currentParkingId]);

  const activeLocalEst = useMemo(() => {
    return myEstablishments.find(e => String(e.id) === String(currentParkingId)) ||
           establishments.find(e => String(e.id) === String(currentParkingId)) ||
           myEstablishments[0] ||
           establishments[0];
  }, [myEstablishments, establishments, currentParkingId]);

  // Hidratar plano CAD automáticamente cuando no se hayan cargado los elements y refrescar periódicamente
  useEffect(() => {
    if (activeLocalEst && activeLocalEst.id && ensureFloorPlan) {
      ensureFloorPlan(activeLocalEst.id, true);
    }
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible' && activeLocalEst?.id && ensureFloorPlan) {
        ensureFloorPlan(activeLocalEst.id, true);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [activeLocalEst?.id, ensureFloorPlan]);

  // Modos de vista para Admin Local y Personal: 'stay' | 'floorplan' | 'list'
  const [operatorViewMode, setOperatorViewMode] = useState('stay');
  const [inspectedSlotCode, setInspectedSlotCode] = useState(null);
  const [entrySearchQuery, setEntrySearchQuery] = useState('');
  const [entryStayHours, setEntryStayHours] = useState(2);

  // Elementos y cajones del plano de la sede activa
  const localElements = Array.isArray(activeLocalEst?.elements) ? activeLocalEst.elements : [];
  const localSlots = useMemo(() => localElements.filter(e => e.type === 'slot'), [localElements]);
  const freeLocalSlots = useMemo(() => localSlots.filter(s => s.status === 'free'), [localSlots]);
  const occupiedLocalSlots = useMemo(() => localSlots.filter(s => s.status !== 'free' && s.status !== 'reserved' && s.status !== 'out_of_service' && s.status !== 'disabled'), [localSlots]);
  const reservedLocalSlots = useMemo(() => localSlots.filter(s => s.status === 'reserved'), [localSlots]);

  // Vehículos actualmente dentro en esta sede
  const activeVehiclesInEst = useMemo(() => {
    return reservations.filter(r => {
      const pid = String(r.parkingId || r.parking_id || '');
      const matchesPid = !activeLocalEst?.id || pid === String(activeLocalEst.id);
      return matchesPid && r.status === 'ACTIVE';
    });
  }, [reservations, activeLocalEst]);

  // Próximas reservas programadas en esta sede
  const scheduledInEst = useMemo(() => {
    return reservations.filter(r => {
      const pid = String(r.parkingId || r.parking_id || '');
      const matchesPid = !activeLocalEst?.id || pid === String(activeLocalEst.id);
      return matchesPid && r.status === 'SCHEDULED';
    });
  }, [reservations, activeLocalEst]);

  // Coincidencia en vivo en el buscador de Entrada Express
  const cleanEntryQuery = entrySearchQuery.trim().toUpperCase();
  const entryMatch = useMemo(() => {
    if (!cleanEntryQuery) return null;
    const cleanPlateQ = cleanEntryQuery.replace(/[^A-Z0-9]/g, '');
    
    // Buscar en reservas
    const candidate = reservations.find(r => {
      const isThisParking = !activeLocalEst?.id || String(r.parkingId || r.parking_id) === String(activeLocalEst.id);
      const codeMatch = (r.code || '').toUpperCase() === cleanEntryQuery || (r.code || '').toUpperCase().includes(cleanEntryQuery);
      const tokenMatch = (r.token || r.access_token || '').toUpperCase().includes(cleanEntryQuery);
      const plateClean = (r.plate || r.license_plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const plateMatch = plateClean && cleanPlateQ && (plateClean === cleanPlateQ || plateClean.includes(cleanPlateQ));
      return isThisParking && (codeMatch || tokenMatch || plateMatch);
    }) || reservations.find(r => {
      const codeMatch = (r.code || '').toUpperCase() === cleanEntryQuery || (r.code || '').toUpperCase().includes(cleanEntryQuery);
      const tokenMatch = (r.token || r.access_token || '').toUpperCase().includes(cleanEntryQuery);
      const plateClean = (r.plate || r.license_plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const plateMatch = plateClean && cleanPlateQ && (plateClean === cleanPlateQ || plateClean.includes(cleanPlateQ));
      return codeMatch || tokenMatch || plateMatch;
    });

    return candidate || null;
  }, [reservations, cleanEntryQuery, activeLocalEst]);

  // Acción rápida de Check-in (Ingreso)
  const handleQuickCheckIn = async (resTarget, customHours = null) => {
    if (!resTarget) return;
    setIsProcessingCheckIn(true);
    const hrs = customHours || resTarget.hours || 2;
    const resp = await checkInReservation(resTarget.code, hrs);
    setIsProcessingCheckIn(false);
    if (resp?.ok) {
      setFeedbackMessage(`✓ ¡Ingreso registrado! Vehículo ${resTarget.plate} en plaza ${resTarget.slot}.`);
      setEntrySearchQuery('');
      if (activeLocalEst?.id && ensureFloorPlan) ensureFloorPlan(activeLocalEst.id, true);
    } else {
      setFeedbackMessage(resp?.message || 'Error al registrar ingreso.');
    }
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Acción rápida de Check-out (Salida)
  const handleQuickCheckOut = async (code, plateVal = '') => {
    const resp = await checkOutReservation(code);
    if (resp?.ok) {
      setFeedbackMessage(resp.message || `✓ Salida registrada para ${plateVal || code}. Cajón liberado.`);
      if (activeLocalEst?.id && ensureFloorPlan) ensureFloorPlan(activeLocalEst.id, true);
    } else {
      setFeedbackMessage(resp?.message || 'Error al registrar salida.');
    }
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Acción rápida de Ingreso Directo Presencial (Walk-in)
  const handleQuickWalkIn = async (customPlate = '', targetSlot = '') => {
    const slotCode = targetSlot || inspectedSlotCode || freeLocalSlots[0]?.code;
    const plateToUse = (customPlate || entrySearchQuery).trim().toUpperCase();
    if (!plateToUse) {
      setFeedbackMessage('✕ Ingresa la placa para registrar el ingreso.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    if (!slotCode) {
      setFeedbackMessage('✕ No hay cajones disponibles en este momento en esta sede.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    const rate = Number(activeLocalEst?.rate || 5.0);
    const now = new Date();
    const newRes = await createReservation({
      parkingId: activeLocalEst.id,
      parkingName: activeLocalEst.name,
      slotCode: slotCode,
      customerName: 'Conductor en Garita',
      customerPhone: '+51 966 000 000',
      plate: plateToUse,
      hours: entryStayHours,
      rate: rate,
      totalCost: rate * entryStayHours,
      startTime: now.toISOString(),
      expiresAt: new Date(now.getTime() + entryStayHours * 3600000).toISOString()
    });
    if (!newRes || newRes.error || !newRes.code) {
      setFeedbackMessage(`✕ No se pudo emitir el ingreso: ${newRes?.error || bookingError || 'Error de servidor'}`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      return;
    }
    await checkInReservation(newRes.code, entryStayHours);
    setFeedbackMessage(`✓ ¡Ingreso directo registrado! Plaza ${slotCode} ocupada por ${plateToUse}.`);
    setEntrySearchQuery('');
    setInspectedSlotCode(null);
    if (activeLocalEst?.id && ensureFloorPlan) ensureFloorPlan(activeLocalEst.id, true);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Filtrado de reservas
  const filteredReservations = reservations.filter(r => {
    const matchesSearch = 
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.customerPhone && r.customerPhone.includes(searchTerm)) ||
      (r.parking && r.parking.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.slot && r.slot.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesParking = parkingFilter === 'ALL' || String(r.parkingId) === String(parkingFilter);

    let matchesDate = true;
    if (dateFilter === 'TODAY') {
      const today = new Date().toDateString();
      matchesDate = new Date(r.startTime).toDateString() === today || new Date(r.createdAt || r.startTime).toDateString() === today;
    }

    return matchesSearch && matchesStatus && matchesParking && matchesDate;
  });

  // Paginación estándar fluida (Pilar 3)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, parkingFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const paginatedReservations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReservations.slice(start, start + pageSize);
  }, [filteredReservations, currentPage, pageSize]);

  // Métricas y conteos en tiempo real
  const totalReservations = reservations.length;
  const activeCount = reservations.filter(r => r.status === 'ACTIVE').length;
  const scheduledCount = reservations.filter(r => r.status === 'SCHEDULED').length;
  const completedCount = reservations.filter(r => r.status === 'COMPLETED').length;
  const cancelledCount = reservations.filter(r => r.status === 'CANCELLED').length;
  
  const totalRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((acc, r) => acc + calculateLiveEffectiveCost(r, currentTime), 0);

  const todayRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .filter(r => new Date(r.startTime).toDateString() === new Date().toDateString())
    .reduce((acc, r) => acc + calculateLiveEffectiveCost(r, currentTime), 0);

  // Reserva activa para el conductor en curso
  const activeUserReservation = reservations.find(r => r.status === 'ACTIVE' || r.status === 'SCHEDULED');

  // Manejar creación de reserva manual — 100% servidor, sin optimismo
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!plate.trim()) {
      alert('Por favor ingresa la placa del vehículo.');
      return;
    }
    if (!selectedSlotCode) {
      alert('Por favor selecciona un cajón disponible.');
      return;
    }
    if (String(activeEstablishment?.id || '').startsWith('EST-')) {
      setFeedbackMessage('✕ No se puede emitir ticket: esta sede aún es demo y no está registrada en el servidor. Crea la sede primero.');
      setTimeout(() => setFeedbackMessage(''), 5000);
      return;
    }

    const rate = Number(activeEstablishment?.rate || 5.0);
    const totalCost = rate * Number(hours);
    const now = new Date();

    const newRes = await createReservation({
      parkingId: activeEstablishment.id,
      parkingName: activeEstablishment.name,
      slotCode: selectedSlotCode,
      customerName: customerName.trim() || 'Conductor en Ventanilla',
      customerPhone: customerPhone.trim() || '+51 966 000 000',
      plate: plate.trim().toUpperCase(),
      hours: Number(hours),
      rate: rate,
      totalCost: totalCost,
      startTime: now.toISOString(),
      expiresAt: new Date(now.getTime() + Number(hours) * 60 * 60 * 1000).toISOString()
    });

    if (!newRes) {
      // El error detallado ya está en bookingError (cajón ocupado, validación, etc.)
      setFeedbackMessage(`✕ No se pudo emitir el ticket. ${bookingError || 'Verifica que el cajón esté libre y la sede sea real.'}`);
      setTimeout(() => setFeedbackMessage(''), 5000);
      return;
    }

    setShowCreateModal(false);
    setPlate('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedSlotCode('');

    // Pase real con code/qr_code/total_cost del servidor
    setSelectedReservationForPass(newRes);
    setShowPassModal(true);

    setFeedbackMessage(`✓ ¡Reserva ${newRes.code} emitida! Cajón ${newRes.slot} asignado para ${newRes.plate}.`);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const handleOpenPass = (res) => {
    setSelectedReservationForPass(res);
    setShowPassModal(true);
  };

  const handlePrintReceipt = (res) => {
    setSelectedReceipt(res);
  };

  // Formateadores seguros de fecha y hora local peruana (12 horas AM/PM)
  const formatTime12h = (dateVal) => {
    const dt = parseIsoToDate(dateVal);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateShort = (dateVal) => {
    const dt = parseIsoToDate(dateVal);
    if (isNaN(dt.getTime())) return '—';
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) return 'Hoy';
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (dt.toDateString() === yest.toDateString()) return 'Ayer';
    return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  };

  // Calcular progreso de tiempo transcurrido
  const calculateTimeProgress = (startTime, expiresAt) => {
    const start = parseIsoToDate(startTime).getTime();
    const end = parseIsoToDate(expiresAt).getTime();
    const now = Date.now();

    if (now <= start) return 0;
    if (now >= end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  // Calcular tiempo restante legible por fases (Llegada vs Estancia)
  const getRemainingTimeText = (startTime, expiresAt, status, tolMinutes = 15, now = Date.now()) => {
    if (status === 'COMPLETED') return 'Estancia finalizada';
    if (status === 'CANCELLED') return 'Cancelada';
    if (status === 'SCHEDULED') {
      const start = parseIsoToDate(startTime).getTime();
      const tolMs = (Number(tolMinutes) || 15) * 60 * 1000;
      const arrivalDeadline = start + tolMs;
      const diffMs = arrivalDeadline - now;
      if (diffMs <= 0) return 'Tolerancia de llegada vencida';
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return `Llegada: ${mins} min para presentarse`;
    }

    const end = parseIsoToDate(expiresAt).getTime();
    const diffMs = end - now;

    if (diffMs <= 0) {
      const overMins = Math.floor(Math.abs(diffMs) / 60000);
      return `Excedida (+${overMins}m · sin gracia)`;
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

    if (diffMins <= 15) {
      return `Por vencer: ${diffMins} min`;
    }

    if (h > 0) {
      return `Estancia: ${h}h ${m}m restantes`;
    }
    return `Estancia: ${m} min restantes`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Encabezado Principal Limpio y Profesional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0 border border-transparent dark:border-slate-700">
            <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {role === 'user' ? 'Mis Reservas & Pases Digitales' : 'Centro de Reservas & Garita'}
              </h1>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                ({filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {role === 'user' 
                ? 'Monitorea tus estancias en tiempo real, descarga tus pases QR y gestiona tus horarios.' 
                : 'Control operativo de entradas, salidas y emisión de tickets en tiempo real.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {role === 'user' && onOpenMoreReservations && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenMoreReservations()}
              className="border-amber-300 dark:border-amber-700/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs gap-1.5 rounded-xl h-9 px-3.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Abonos y Programadas</span>
            </Button>
          )}

          {role === 'user' && onNavigateToBooking && (
            <Button
              onClick={onNavigateToBooking}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl h-9 px-4 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Reserva en Mapa</span>
            </Button>
          )}

          {role !== 'user' && (
            <Button
              onClick={() => {
                if (availableSlots.length > 0) {
                  setSelectedSlotCode(availableSlots[0].code);
                }
                setShowCreateModal(true);
              }}
              className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl h-9 px-4 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400 dark:text-white stroke-[2.5]" />
              <span>Emitir Ticket</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage('')} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Reserva en Curso para Conductor */}
      {role === 'user' && activeUserReservation && (
        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-900 text-white border border-slate-800 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{activeUserReservation.parking}</span>
                <span className="text-xs font-mono text-slate-400">
                  {activeUserReservation.status === 'ACTIVE' ? 'En estancia' : 'En ruta'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plaza <span className="font-mono text-white">{activeUserReservation.slot}</span> · Placa <span className="font-mono text-white">{activeUserReservation.plate}</span> · Pase <span className="font-mono text-white">{activeUserReservation.code}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              type="button"
              onClick={() => handleOpenPass(activeUserReservation)}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver Pase QR</span>
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Control de Sede & Pestañas de Modo para Admin Local y Plataforma */}
      {role !== 'user' && (
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Selector de Sede y Métricas en Vivo */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {myEstablishments.length > 1 ? (
                <select
                  value={currentParkingId}
                  onChange={e => setCurrentParkingId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                >
                  {myEstablishments.map(est => (
                    <option key={est.id} value={est.id} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                      {est.name} (S/ {Number(est.rate || 5).toFixed(2)}/h)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {activeLocalEst?.name || 'Mi Cochera'}
                </span>
              )}
            </div>

            {/* Chips de estado en vivo de la sede */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {freeLocalSlots.length} libres
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {occupiedLocalSlots.length} ocupados
            </span>
            {reservedLocalSlots.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                {reservedLocalSlots.length} reservados
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Tarifa: S/ {Number(activeLocalEst?.rate || 5).toFixed(2)}/h
            </span>
          </div>

          {/* Selector Segmentado de Modos de Vista */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 gap-1 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setOperatorViewMode('stay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                operatorViewMode === 'stay'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-emerald-500" />
              <span>Control de Estadía & Entrada</span>
              {activeVehiclesInEst.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500 text-white font-mono">
                  {activeVehiclesInEst.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOperatorViewMode('floorplan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                operatorViewMode === 'floorplan'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              <span>Plano del Local</span>
            </button>

            <button
              type="button"
              onClick={() => setOperatorViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                operatorViewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Historial</span>
            </button>
          </div>
        </div>
      )}

      {/* VISTA 1: CONTROL DE ESTADÍA & ENTRADA EXPRESS (ADMIN LOCAL / PLATAFORMA) */}
      {role !== 'user' && operatorViewMode === 'stay' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HERO: ENTRADA EXPRESS Y VALIDACIÓN DE RESERVAS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Control de Garita</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Valida reservas o registra ingresos directos.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
                Presiona <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">Enter</kbd> para validar
              </span>
            </div>

            {/* Input de Búsqueda / Escáner */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar código, placa o token..."
                value={entrySearchQuery}
                onChange={(e) => setEntrySearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (entryMatch && entryMatch.status === 'SCHEDULED') {
                      handleQuickCheckIn(entryMatch, entryStayHours);
                    } else if (!entryMatch && cleanEntryQuery.length >= 4) {
                      handleQuickWalkIn(cleanEntryQuery);
                    }
                  }
                }}
                className="w-full h-12 pl-12 pr-28 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
              {entrySearchQuery && (
                <button
                  type="button"
                  onClick={() => setEntrySearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {/* TARJETA DE RESULTADO: COINCIDENCIA DE RESERVA ENCONTRADA */}
            {entryMatch && (
              <div className={`p-4 rounded-xl border animate-in fade-in transition-all ${
                entryMatch.status === 'SCHEDULED'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : entryMatch.status === 'ACTIVE'
                  ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Información del vehículo y reserva */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black shrink-0 ${
                      entryMatch.status === 'SCHEDULED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : entryMatch.status === 'ACTIVE'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      <span className="text-[8px] uppercase tracking-tighter opacity-80">Plaza</span>
                      <span className="text-base font-black leading-tight">{entryMatch.slot}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {entryMatch.code}
                        </span>
                        {entryMatch.status === 'SCHEDULED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <Check className="w-3 h-3" />
                            Listo para Ingresar
                          </span>
                        )}
                        {entryMatch.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700">
                            <Car className="w-3 h-3" />
                            Actualmente en Estancia
                          </span>
                        )}
                        {entryMatch.status === 'COMPLETED' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Finalizada
                          </span>
                        )}
                        {entryMatch.status === 'CANCELLED' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                            Cancelada
                          </span>
                        )}

                        {/* Badge de prepagado */}
                        {(paidIds.has(Number(entryMatch.id)) || entryMatch.prepaid) ? (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Prepagado en línea</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            Cobro al salir
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {entryMatch.plate}
                        </span>
                        {entryMatch.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{entryMatch.customerName}</span>
                          </span>
                        )}
                        {entryMatch.customerPhone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{entryMatch.customerPhone}</span>
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span>Sede: <strong>{entryMatch.parking}</strong></span>
                        <span>· Horas acordadas: <strong>{entryMatch.hours || 2}h</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del resultado */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                    {entryMatch.status === 'SCHEDULED' && (
                      <>
                        <div className="flex items-center gap-1 mr-1">
                          <span className="text-xs text-slate-500 font-semibold">Estadía:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 4, 8].map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setEntryStayHours(h)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                                  entryStayHours === h
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button
                          type="button"
                          disabled={isProcessingCheckIn}
                          onClick={() => handleQuickCheckIn(entryMatch, entryStayHours)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-10 px-4 rounded-xl gap-2 shadow-sm cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Registrar Ingreso ({entryStayHours}h)</span>
                        </Button>
                      </>
                    )}

                    {entryMatch.status === 'ACTIVE' && (
                      <Button
                        type="button"
                        onClick={() => handleQuickCheckOut(entryMatch.code, entryMatch.plate)}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-xs cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Registrar Salida / Liberar Plaza</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenPass(entryMatch)}
                      className="h-10 text-xs rounded-xl gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Pase QR</span>
                    </Button>
                  </div>

                </div>
              </div>
            )}

            {/* CASO: NO HAY COINCIDENCIA PREVIA PERO EL OPERADOR INGRESÓ UNA PLACA (WALK-IN) */}
            {!entryMatch && cleanEntryQuery.length >= 4 && (
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Sin reserva previa para &quot;{cleanEntryQuery}&quot;
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Puedes registrar su entrada directa (Walk-in) en el cajón disponible más cercano.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    type="button"
                    disabled={freeLocalSlots.length === 0}
                    onClick={() => handleQuickWalkIn(cleanEntryQuery, freeLocalSlots[0]?.code)}
                    className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-black text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400 dark:text-white" />
                    <span>Registrar en Plaza {freeLocalSlots[0]?.code || 'Sin cajón'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* GRID OPERATIVO: VEHÍCULOS DENTRO & PRÓXIMAS LLEGADAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* PANEL 1: VEHÍCULOS EN ESTANCIA (7 COLS) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Vehículos en Estancia Actual
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {activeVehiclesInEst.length} dentro
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {activeLocalEst?.name}
                </span>
              </div>

              {activeVehiclesInEst.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Car className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay vehículos estacionados actualmente</p>
                  <p className="text-[11px] text-slate-400">Los vehículos registrados como activos aparecerán en este panel en tiempo real.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {activeVehiclesInEst.map(v => {
                    const startDt = parseIsoToDate(v.startTime);
                    const mins = Math.max(0, Math.round((Date.now() - startDt.getTime()) / 60000));
                    const hoursElapsed = Math.floor(mins / 60);
                    const minsRemainder = mins % 60;
                    const bookedHours = Number(v.hours) || 2;
                    const isOverdue = mins > (bookedHours * 60);

                    return (
                      <div
                        key={v.code}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isOverdue 
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-mono font-black flex flex-col items-center justify-center shrink-0 border border-slate-700">
                            <span className="text-[8px] uppercase opacity-70">Plaza</span>
                            <span className="text-sm">{v.slot}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                {v.plate}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3" /> Exceso de tiempo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Ingresó: {formatTime12h(v.startTime)}</span>
                              <span>·</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {hoursElapsed > 0 ? `${hoursElapsed}h ${minsRemainder}m` : `${mins} min`} dentro
                              </span>
                              <span>·</span>
                              <span>Contratado: {bookedHours}h</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleQuickCheckOut(v.code, v.plate)}
                            className="h-8 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white gap-1 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Salida</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintReceipt(v)}
                            className="h-8 px-2 rounded-lg text-xs"
                            title="Imprimir ticket"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL 2: PRÓXIMAS LLEGADAS DE HOY (5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Próximas Llegadas Programadas
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                  {scheduledInEst.length}
                </span>
              </div>

              {scheduledInEst.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay reservas programadas pendientes</p>
                  <p className="text-[11px] text-slate-400">Las reservas realizadas por conductores para hoy se listarán aquí para darles ingreso rápido.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {scheduledInEst.map(s => {
                    const tolMin = Number(s.toleranceMinutes || 15);
                    const remainingText = getRemainingTimeText(s.startTime, s.expiresAt, 'SCHEDULED', tolMin);
                    return (
                      <div
                        key={s.code}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-cyan-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {s.slot}
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                              {s.plate}
                            </span>
                            {(s.isSubscription || s.is_subscription) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                <span>Abonado</span>
                              </span>
                            )}
                            {(!s.isSubscription && !s.is_subscription && (s.reservationType === 'advance' || s.reservation_type === 'advance')) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Calendar className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                <span>Programada</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                            {formatTime12h(s.startTime)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300">
                            {s.customerName || 'Conductor'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {remainingText}
                          </span>
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleQuickCheckIn(s)}
                            className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1 px-2.5"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Ingreso</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPass(s)}
                            className="h-7 text-xs rounded-lg px-2"
                          >
                            <QrCode className="w-3 h-3 text-slate-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* VISTA 2: PLANO CAD EN VIVO & INSPECCIÓN DE PLAZAS */}
      {role !== 'user' && operatorViewMode === 'floorplan' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Cabecera del Plano con Resumen Semántico */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Plano CAD Interactivo en Tiempo Real — {activeLocalEst?.name}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toca cualquier cajón para inspeccionar el vehículo estacionado, ver reservas asociadas o registrar entradas y salidas.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {freeLocalSlots.length} Libres
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> {occupiedLocalSlots.length} Ocupados
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {reservedLocalSlots.length} Reservados
              </span>
            </div>
          </div>

          {/* Grid: Plano CAD (8 cols) + Ficha de Inspección (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Plano interactivo */}
            <div className="lg:col-span-8 bg-[#1c253b] rounded-2xl border-2 border-slate-700 p-2 sm:p-3 shadow-xl space-y-2">
              <AutoFitFloorPlan
                elements={localElements}
                name={activeLocalEst?.name}
                selectable={true}
                allowInspectAll={true}
                selectedSlot={inspectedSlotCode}
                onSelectSlot={(slotCode) => setInspectedSlotCode(slotCode)}
                containerHeightClass="h-[480px] sm:h-[540px] lg:h-[600px]"
              />
              <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-slate-300 py-1 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Verde = Libre</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Rojo = Ocupado</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Ámbar = Reservado</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /> Azul = Seleccionado</span>
              </div>
            </div>

            {/* Ficha Dinámica de Inspección */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              {inspectedSlotCode ? (() => {
                const inspectedEl = localSlots.find(s => s.code === inspectedSlotCode);
                const status = inspectedEl?.status || 'free';
                const isFree = status === 'free';
                const isReserved = status === 'reserved';
                const isOccupied = !isFree && !isReserved && status !== 'out_of_service' && status !== 'disabled';

                // Buscar si hay reserva asociada activa o programada
                const slotRes = reservations.find(r => 
                  String(r.parkingId || r.parking_id) === String(activeLocalEst?.id) &&
                  (r.slot === inspectedSlotCode || r.slot_code === inspectedSlotCode) &&
                  (r.status === 'ACTIVE' || r.status === 'SCHEDULED')
                );

                return (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black ${
                          isFree ? 'bg-emerald-600 text-white' : isReserved ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          <span className="text-[8px] uppercase opacity-80">Plaza</span>
                          <span className="text-base">{inspectedSlotCode}</span>
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">Ficha de Plaza {inspectedSlotCode}</h3>
                          <p className="text-[11px] text-slate-400">{activeLocalEst?.name}</p>
                        </div>
                      </div>
                      <button onClick={() => setInspectedSlotCode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Estado de la plaza */}
                    <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Estado actual:</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold inline-flex items-center gap-1.5 ${
                        isFree 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : isReserved 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-emerald-500' : isReserved ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <span>{isFree ? 'LIBRE' : isReserved ? 'RESERVADA' : 'OCUPADA'}</span>
                      </span>
                    </div>

                    {/* Detalle si está OCUPADO */}
                    {isOccupied && (
                      <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Vehículo / Placa:</span>
                          <strong className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {slotRes?.plate || 'Vehículo presente'}
                          </strong>
                        </div>
                        {slotRes?.customerName && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Conductor:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">{slotRes.customerName}</span>
                          </div>
                        )}
                        {slotRes?.startTime && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Hora de ingreso:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{formatTime12h(slotRes.startTime)}</span>
                          </div>
                        )}
                        {slotRes?.expiresAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Salida estimada:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{formatTime12h(slotRes.expiresAt)}</span>
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={() => handleQuickCheckOut(slotRes?.code || inspectedSlotCode, slotRes?.plate || '')}
                          className="w-full mt-2 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold text-xs h-10 rounded-xl gap-2 cursor-pointer shadow-xs"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Registrar Salida / Liberar Plaza</span>
                        </Button>
                      </div>
                    )}

                    {/* Detalle si está RESERVADO */}
                    {isReserved && (
                      <div className="space-y-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-amber-800 dark:text-amber-300">Código de Reserva:</span>
                          <strong className="font-mono font-black text-amber-950 dark:text-amber-200">{slotRes?.code || 'RSV-PENDIENTE'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-800 dark:text-amber-300">Vehículo esperado:</span>
                          <strong className="font-mono font-black text-amber-950 dark:text-amber-200">{slotRes?.plate || '—'}</strong>
                        </div>
                        {slotRes?.customerName && (
                          <div className="flex justify-between">
                            <span className="text-amber-800 dark:text-amber-300">Conductor:</span>
                            <span className="font-bold text-amber-950 dark:text-amber-200">{slotRes.customerName}</span>
                          </div>
                        )}
                        {slotRes?.startTime && (
                          <div className="flex justify-between">
                            <span className="text-amber-800 dark:text-amber-300">Hora esperada:</span>
                            <span className="font-mono font-bold text-amber-950 dark:text-amber-200">{formatTime12h(slotRes.startTime)}</span>
                          </div>
                        )}

                        {slotRes && (
                          <Button
                            type="button"
                            onClick={() => handleQuickCheckIn(slotRes)}
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl gap-2 cursor-pointer shadow-xs"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Registrar Ingreso / Abrir Barrera</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Detalle si está LIBRE */}
                    {isFree && (
                      <div className="space-y-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                          Esta plaza está completamente libre y disponible. Puedes asignar un vehículo en ventanilla en 1 clic:
                        </p>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Placa del vehículo:
                          </label>
                          <Input
                            type="text"
                            placeholder="ABC-123"
                            value={entrySearchQuery}
                            onChange={e => setEntrySearchQuery(e.target.value.toUpperCase())}
                            className="h-10 font-mono font-black uppercase text-sm"
                          />
                        </div>

                        <Button
                          type="button"
                          disabled={!entrySearchQuery.trim()}
                          onClick={() => handleQuickWalkIn(entrySearchQuery, inspectedSlotCode)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl gap-2 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Registrar Ingreso en Plaza {inspectedSlotCode}</span>
                        </Button>
                      </div>
                    )}

                  </div>
                );
              })() : (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3 text-slate-400">
                  <Compass className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ninguna plaza seleccionada</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Haz clic en cualquier cajón del plano CAD (libre, ocupado o reservado) para ver su ficha en vivo y gestionar su estado.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* VISTA 3 (LISTA): TABLERO DE FILTROS & HISTORIAL COMPLETO */}
      {(role === 'user' || operatorViewMode === 'list') && (
        <div className="space-y-6 animate-in fade-in">
      {/* =========================================================================
          MÉTRICAS KPI COMPACTAS Y LIMPIAS
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Reservas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-400/10 dark:bg-slate-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Reservas
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <CalendarCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white block">
              {totalReservations}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 block">
              Historial completo
            </span>
          </div>
        </div>

        {/* Card 2: En Estancia */}
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/15 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              En Estancia
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Car className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 block">
              {activeCount}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En tiempo real
            </span>
          </div>
        </div>

        {/* Card 3: Programadas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/15 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Programadas
            </span>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Clock className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400 block">
              {scheduledCount}
            </span>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium mt-0.5 block">
              Por ingresar
            </span>
          </div>
        </div>

        {/* Card 4: Gasto Total / Recaudación */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {role === 'user' ? 'Gasto Total' : 'Recaudación'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 font-black text-xs font-mono flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              S/
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 block">
              S/ {totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-medium mt-0.5 block">
              Total acumulado
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          BARRA DE BÚSQUEDA Y FILTROS INTEGRADOS
          ========================================================================= */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Buscador */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por placa, código RSV, cajón o cochera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selectores de Sede y Fecha */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <select
                value={parkingFilter}
                onChange={(e) => setParkingFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">{role === 'local' ? `Todas mis sedes (${displayEstablishments.length})` : `Todas las Sedes (${displayEstablishments.length})`}</option>
                {displayEstablishments.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">Cualquier Fecha</option>
              <option value="TODAY">Solo Hoy</option>
            </select>
          </div>
        </div>

        {/* Pestañas de Estado */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'Todas', count: totalReservations },
            { id: 'ACTIVE', label: 'En Curso', count: activeCount },
            { id: 'SCHEDULED', label: 'Programadas', count: scheduledCount },
            { id: 'COMPLETED', label: 'Finalizadas', count: completedCount },
            { id: 'CANCELLED', label: 'Canceladas', count: cancelledCount }
          ].map(tab => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[11px] font-mono ${isSelected ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-400'}`}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          LISTADO PRINCIPAL DE RESERVAS (DISEÑO ULTRA-LIMPIO)
          ========================================================================= */}
      <div className="space-y-3">
        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No se encontraron reservas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Intenta buscar por otro término o restablece los filtros.
            </p>
          </div>
        ) : (
          paginatedReservations.map((res) => {
            const isScheduled = res.status === 'SCHEDULED';
            const isActive = res.status === 'ACTIVE';
            const isCompleted = res.status === 'COMPLETED';
            const isCancelled = res.status === 'CANCELLED';
            const isPaid = paidIds.has(Number(res.id));

            const tolMin = Number(res.toleranceMinutes || res.tolerance || res.arrivalWindow || 15);
            const startDt = parseIsoToDate(res.startTime);
            const arrivalDeadline = new Date(startDt.getTime() + tolMin * 60 * 1000);
            const isToleranceExpired = isScheduled && (currentTime > arrivalDeadline);
            const progress = calculateTimeProgress(res.startTime, res.expiresAt);
            const remainingText = getRemainingTimeText(res.startTime, res.expiresAt, res.status, tolMin, currentTime);

            const liveCost = calculateLiveEffectiveCost(res, currentTime);
            const baseCost = Number(res.cost || 0);
            const isOvertimeActive = isActive && liveCost > baseCost;
            const overtimeSurcharge = Math.max(0, Number((liveCost - baseCost).toFixed(2)));
            const paidAmount = Number(res.amountPaid ?? res.amount_paid ?? (res.prepaid ? baseCost : 0));
            const pendingOvertimeBalance = Math.max(0, Number((liveCost - paidAmount).toFixed(2)));

            return (
              <div 
                key={res.code} 
                className={`p-4 rounded-xl border bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all ${
                  isActive 
                    ? 'border-emerald-300 dark:border-emerald-800/80' 
                    : isScheduled 
                    ? 'border-cyan-200 dark:border-cyan-800/80' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Bloque Izquierdo: Identificador y Datos */}
                  <div className="flex items-start gap-3.5">
                    
                    {/* Caja de Plaza / Cajón */}
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-mono font-black shrink-0 border ${
                      isActive 
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                        : isScheduled
                        ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-800 dark:border-slate-700'
                        : isCompleted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
                    }`}>
                      <span className="text-[8px] uppercase font-bold tracking-tighter opacity-80 leading-none">Plaza</span>
                      <span className="text-base leading-tight font-black">{res.slot}</span>
                    </div>

                    {/* Contenido Central */}
                    <div className="space-y-1.5">
                      {/* Fila 1: Código, Badge de Estado y Placa Vehicular Estilizada */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-400 dark:text-slate-400">{res.code}</span>
                        
                        {/* Estado en Pill/Badge */}
                        {isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            En Estancia
                          </span>
                        )}

                        {isOvertimeActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Sobreestadía (+S/ {overtimeSurcharge.toFixed(2)})</span>
                          </span>
                        )}

                        {isScheduled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            Programada
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                            Finalizada
                          </span>
                        )}

                        {isCancelled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Cancelada
                          </span>
                        )}

                        {(res.isSubscription || res.is_subscription) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Abonado 30d</span>
                          </span>
                        )}

                        {(!res.isSubscription && !res.is_subscription && (res.reservationType === 'advance' || res.reservation_type === 'advance')) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Programada</span>
                          </span>
                        )}

                        {/* Placa Vehicular como Tag/Placa Real */}
                        {res.plate && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-black tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                            <Car className="w-3 h-3 text-slate-400 dark:text-slate-400 shrink-0" />
                            <span>{res.plate}</span>
                          </span>
                        )}
                      </div>

                      {/* Fila 2: Nombre del Establecimiento */}
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{res.parking}</span>
                      </h3>

                      {/* Fila 3: Conductor (si existe) y Horario Real */}
                      <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 gap-x-3 gap-y-1">
                        {res.customerName && (
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{res.customerName}</span>
                          </span>
                        )}

                        {/* Horario y Fecha Descriptiva */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDateShort(res.startTime)}</span>
                          </span>

                          <span className="text-slate-300 dark:text-slate-600">·</span>

                          {isScheduled && (
                            <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium font-mono">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Llegada máx: {formatTime12h(new Date(parseIsoToDate(res.startTime).getTime() + tolMin * 60 * 1000))}</span>
                              <span className="text-[11px] text-slate-400 font-sans font-normal">
                                ({tolMin} min tol · Estancia: {res.hours || 2}h)
                              </span>
                            </span>
                          )}

                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Ingresó: {res.actualEntry ? formatTime12h(res.actualEntry) : formatTime12h(res.startTime)}</span>
                              <span className="text-slate-400 font-sans font-normal">
                                · Salida prevista: {formatTime12h(res.expiresAt)} ({res.hours || 2}h)
                              </span>
                            </span>
                          )}

                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 text-rose-500 dark:text-rose-400 font-medium font-mono">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Programada: {formatTime12h(res.startTime)} ({res.hours || 2}h)</span>
                              <span className="text-[11px] text-rose-500/80 font-sans font-normal">
                                · Cancelada: tolerancia de {tolMin} min venció a las {formatTime12h(new Date(parseIsoToDate(res.startTime).getTime() + tolMin * 60 * 1000))}
                              </span>
                            </span>
                          )}

                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium font-mono">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>{res.actualEntry ? formatTime12h(res.actualEntry) : formatTime12h(res.startTime)} a {res.actualExit ? formatTime12h(res.actualExit) : formatTime12h(res.expiresAt)} ({res.hours || 2}h)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Barra de Tiempo Transcurrido */}
                      {(isActive || isScheduled) && (
                        <div className="pt-1 max-w-xs">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-400 mb-0.5 font-medium">
                            <span>{isActive ? 'Estancia en curso' : 'Ventana de llegada'}</span>
                            <span className={isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-cyan-600 dark:text-cyan-400 font-semibold'}>
                              {remainingText}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                isActive ? 'bg-emerald-600' : 'bg-cyan-600'
                              }`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>Vehículo en cochera · Salida se valida con Pase QR en garita</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque Derecho: Importe y Acciones */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                    
                    {/* Importe */}
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-mono">
                        {isScheduled ? 'Tarifa' : isOvertimeActive ? 'Total Acumulado' : 'Importe'}
                      </span>
                      <span className={`text-base font-bold font-mono ${isOvertimeActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {isScheduled 
                          ? `S/ ${Number(res.ratePerHour || 5.0).toFixed(2)} /h`
                          : `S/ ${liveCost.toFixed(2)}`}
                      </span>
                      {isOvertimeActive && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold block">
                          (+S/ {overtimeSurcharge.toFixed(2)} sobreestadía)
                        </span>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-1.5">
                      
                      {/* Marcar Check-in / Ingreso (Personal de Garita) */}
                      {role !== 'user' && isScheduled && (
                        <Button
                          onClick={() => {
                            setCheckInTarget(res);
                            setCheckInHours(Number(res.hours) || 2);
                          }}
                          size="sm"
                          className="rounded-lg text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-2.5 cursor-pointer shadow-xs"
                          title="Registrar Ingreso (Check-in)"
                        >
                          <LogIn className="w-3.5 h-3.5 shrink-0" />
                          <span>Ingreso</span>
                        </Button>
                      )}

                      {/* Marcar Check-out / Salida (Personal de Garita) */}
                      {role !== 'user' && isActive && (
                        <Button
                          onClick={async () => {
                            const resp = await updateReservationStatus(res.code, 'COMPLETED');
                            if (resp?.ok) setFeedbackMessage(resp.message || `Salida registrada para ${res.plate}. Cajón liberado.`);
                            else setFeedbackMessage(resp?.message || 'Error al registrar salida.');
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs font-semibold gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 h-8 px-2.5 cursor-pointer"
                          title="Registrar Salida (Check-out)"
                        >
                          <LogOut className="w-3.5 h-3.5 shrink-0" />
                          <span>Salida</span>
                        </Button>
                      )}

                      {/* Ver Pase Digital QR */}
                      {!isCancelled ? (
                        <Button
                          onClick={() => handleOpenPass(res)}
                          size="sm"
                          className="rounded-lg text-xs font-bold gap-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-transparent dark:border-slate-700/80 shadow-xs h-8 px-3 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Pase QR</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenPass(res)}
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs font-semibold gap-1.5 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 h-8 px-2.5 cursor-pointer"
                          title="Ver Detalle de Pase Anulado"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Pase Anulado</span>
                        </Button>
                      )}

                      {/* Pagar Sobreestadía Pendiente (Conductor en App) */}
                      {role === 'user' && isActive && isOvertimeActive && pendingOvertimeBalance > 0 && (
                        <Button
                          onClick={() => setOvertimePayModal({ res, pendingBalance: pendingOvertimeBalance })}
                          size="sm"
                          className="rounded-lg text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-500 text-white h-8 px-2.5 cursor-pointer shadow-xs"
                          title="Liquidar sobreestadía acumulada"
                        >
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span>Pagar S/ {pendingOvertimeBalance.toFixed(2)}</span>
                        </Button>
                      )}

                      {/* Imprimir Ticket */}
                      <Button
                        onClick={() => handlePrintReceipt(res)}
                        variant="outline"
                        size="sm"
                        className={`rounded-lg text-xs font-semibold gap-1.5 border h-8 px-2.5 cursor-pointer ${
                          isCancelled 
                            ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                        title={isCancelled ? "Ver Comprobante de Anulación" : "Imprimir Comprobante"}
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="hidden sm:inline">{isCancelled ? 'Ticket Anulado' : 'Ticket'}</span>
                      </Button>

                      {/* Cancelar Reserva: ÚNICAMENTE permitido antes de ingresar y dentro de la tolerancia */}
                      {isScheduled && !isActive && (
                        isToleranceExpired ? (
                          <span 
                            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-1 rounded-md cursor-default"
                            title="El tiempo de tolerancia expiró. La reserva venció por inasistencia (No-Show) y no puede ser cancelada."
                          >
                            Tolerancia Vencida
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Deseas cancelar la reserva ${res.code} y liberar la plaza ${res.slot}?`)) {
                                const resp = await cancelReservation(res.code);
                                if (resp?.ok) {
                                  setFeedbackMessage(resp.message || `Reserva ${res.code} cancelada. Plaza ${res.slot} disponible.`);
                                } else {
                                  setFeedbackMessage(`✕ ${resp?.message || 'No se pudo cancelar la reserva.'}`);
                                }
                              }
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Barra de Paginación Estándar (Pilar 3) */}
        {filteredReservations.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-3 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-xs text-slate-500 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="font-medium">por página</span>
              <span className="text-slate-400 font-mono">({filteredReservations.length} total)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </Button>
              <div className="px-3 py-1 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    )}

      {/* =========================================================================
          MODAL: NUEVA RESERVA EN GARITA (VENTANILLA)
          ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Emitir Ticket en Garita</h3>
                  <p className="text-[11px] text-slate-400">Emisión manual y asignación instantánea de plaza</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="gap-4">
              {/* Selector de Sede */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sede de Estacionamiento</label>
                <select
                  value={selectedParkingId}
                  onChange={(e) => {
                    setSelectedParkingId(e.target.value);
                    setSelectedSlotCode('');
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  {displayEstablishments.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.name} (S/ {Number(est.rate).toFixed(2)}/h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Cajón Libre */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Seleccionar Cajón Disponible</label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                    {availableSlots.length} libres
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold text-center">
                    No hay cajones libres en esta sede actualmente.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    {availableSlots.map(s => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => setSelectedSlotCode(s.code)}
                        className={`p-2 rounded-xl text-xs font-mono font-black border transition ${
                          selectedSlotCode === s.code
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Placa y Horas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Placa del Vehículo *</label>
                  <Input
                    type="text"
                    required
                    placeholder="ABC-123"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="font-mono font-black text-xs uppercase h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tiempo de Permanencia</label>
                  <select
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value={1}>1 Hora</option>
                    <option value={2}>2 Horas</option>
                    <option value={3}>3 Horas</option>
                    <option value={4}>4 Horas</option>
                    <option value={8}>8 Horas (Turno)</option>
                    <option value={12}>12 Horas</option>
                    <option value={24}>24 Horas (Día completo)</option>
                  </select>
                </div>
              </div>

              {/* Nombre y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Conductor</label>
                  <Input
                    type="text"
                    placeholder="Nombres y Apellidos"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono (Opcional)</label>
                  <Input
                    type="tel"
                    placeholder="+51 966..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-xs font-mono h-10"
                  />
                </div>
              </div>

              {/* Total a Cobrar */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>Total a Cobrar:</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  S/ {(Number(activeEstablishment?.rate || 5) * hours).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)} 
                  className="rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedSlotCode || !plate.trim()}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-5"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>Emitir Ticket</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TICKET / COMPROBANTE DE PAGO IMPRIMIBLE
          ========================================================================= */}
      {selectedReceipt && (() => {
        const isCancelled = selectedReceipt.status === 'CANCELLED';
        const isCompleted = selectedReceipt.status === 'COMPLETED';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 gap-4">
              
              {/* Header del Ticket */}
              <div className={`text-center border-b border-dashed pb-4 space-y-1 ${
                isCancelled ? 'border-rose-300' : 'border-slate-300'
              }`}>
                <span className="font-mono text-[10px] text-slate-400 font-bold block">SMART-PARK AYACUCHO</span>
                <h3 className="font-black text-slate-900 text-base">{selectedReceipt.parking}</h3>
                <p className={`text-[11px] font-mono font-bold ${
                  isCancelled ? 'text-rose-600' : 'text-slate-500'
                }`}>
                  {isCancelled ? 'RESERVA ANULADA' : 'TICKET DE ESTACIONAMIENTO'}
                </p>
                <p className={`text-xs font-mono font-black mt-1 ${
                  isCancelled ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {selectedReceipt.code}
                </p>
              </div>

              {/* Banner de cancelación si aplica */}
              {isCancelled && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-xs font-black text-rose-700 block uppercase">
                    Reserva Cancelada / Anulada
                  </span>
                  <span className="text-[10px] text-rose-600 block mt-0.5">
                    La plaza {selectedReceipt.slot} fue liberada y no se generó cobro de estancia.
                  </span>
                </div>
              )}

              {/* Datos del Ticket */}
              <div className="mt-3 space-y-2 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plaza Asignada:</span>
                  <strong className="text-slate-900 text-sm">{selectedReceipt.slot}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Placa Vehicular:</span>
                  <strong className="text-slate-900">{selectedReceipt.plate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conductor:</span>
                  <span className="text-slate-800 truncate max-w-[150px]">{selectedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span className="text-slate-800 font-bold">{formatDateShort(selectedReceipt.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ingreso:</span>
                  <span className="text-slate-800">{formatTime12h(selectedReceipt.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Salida estimada:</span>
                  <span className="text-slate-800">{formatTime12h(selectedReceipt.expiresAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Horas:</span>
                  <span className="text-slate-800">{selectedReceipt.hours} hora(s)</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-sm font-black text-slate-900">
                  <span>{isCancelled ? 'Total a Cobrar:' : 'Total Cobrado:'}</span>
                  <span className={isCancelled ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                    {isCancelled ? 'S/ 0.00 (Anulado)' : `S/ ${Number(selectedReceipt.cost).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Código QR Escaneable o Marca de Anulación */}
              <div className="mt-3 bg-white p-3 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                {isCancelled ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl w-full text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <strong className="text-xs text-rose-700 block font-mono">TICKET ANULADO</strong>
                    <p className="text-[10px] text-slate-500">Este comprobante carece de validez de ingreso o estancia.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-1.5 bg-white rounded-xl border border-slate-100 shadow-xs inline-block">
                      <QRCodeSVG
                        value={`SMART-PARK AYACUCHO - TICKET
Sede: ${selectedReceipt.parking}
Plaza: ${selectedReceipt.slot}
Placa: ${selectedReceipt.plate}
Reserva: ${selectedReceipt.code}
Token: ${selectedReceipt.token || 'SPK-TOKEN-VALID'}
Total: S/ ${Number(selectedReceipt.cost).toFixed(2)}
ESTADO: ${isCompleted ? 'COMPLETADO' : 'AUTORIZADO'}`}
                        size={120}
                        level="Q"
                        includeMargin={false}
                        fgColor="#0f172a"
                        bgColor="#ffffff"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-2">
                      Token: <strong className="text-slate-900">{selectedReceipt.token || 'SPK-TOKEN-VALID'}</strong>
                    </p>
                  </>
                )}
              </div>

              {/* Botones */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="flex-1 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>Imprimir</span>
                </Button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Pase Digital QR */}
      <DigitalAccessPassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        reservation={selectedReservationForPass}
      />

      {/* Cobro real al salir: pasarela Culqi con costo calculado por tiempo real */}
      {checkoutTarget && (() => {
        const rate = Number(establishments.find(e => String(e.id) === String(checkoutTarget.parkingId) || String(e.id) === String(checkoutTarget.parking))?.rate || establishments.find(e => e.id === checkoutTarget.parkingId)?.rate || 5.0);
        const start = checkoutTarget.startTime ? new Date(checkoutTarget.startTime) : new Date();
        const hoursReal = Math.max(1, Math.ceil((Date.now() - start.getTime()) / 3600000));
        const amount = Number((rate * hoursReal).toFixed(2));
        return (
          <CulqiPaymentModal
            isOpen={showCheckoutPayment}
            onClose={() => { setShowCheckoutPayment(false); setCheckoutTarget(null); }}
            amount={amount}
            concept={`Salida ${checkoutTarget.plate} — ${hoursReal}h en ${checkoutTarget.parking || 'Smart Park'}`}
            parkingName={String(checkoutTarget.parking || 'Smart Park')}
            slotCode={String(checkoutTarget.slot || '')}
            customerEmail={String(checkoutTarget.email || 'conductor@smartpark.com')}
            onPaymentSuccess={() => {
              completeReservation(checkoutTarget.code);
              setFeedbackMessage(`✓ Pago de S/ ${amount.toFixed(2)} confirmado. Salida registrada para ${checkoutTarget.plate}. Cajón ${checkoutTarget.slot} liberado.`);
              setShowCheckoutPayment(false);
              setCheckoutTarget(null);
            }}
          />
        );
      })()}

      {/* Pago de reserva programada desde la vista del conductor */}
      <CulqiPaymentModal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        amount={Number(payTarget?.cost ?? 0)}
        concept={`Reserva ${payTarget?.code || ''} — Plaza ${payTarget?.slot || ''} en ${payTarget?.parking || 'Smart Park'}`}
        parkingName={String(payTarget?.parking || 'Smart Park')}
        slotCode={String(payTarget?.slot || '')}
        customerEmail="conductor@smartpark.com"
        reservationId={payTarget?.id ? Number(payTarget.id) : null}
        onPaymentSuccess={() => {
          if (payTarget?.id) {
            setPaidIds(prev => new Set([...prev, Number(payTarget.id)]));
          }
          setFeedbackMessage(`✓ Pago de S/ ${Number(payTarget?.cost ?? 0).toFixed(2)} confirmado para la reserva ${payTarget?.code}.`);
          setTimeout(() => setFeedbackMessage(''), 5000);
          setPayTarget(null);
        }}
      />

      {/* Diálogo de Registro de Ingreso en Garita (Horas de Estadía) */}
      <Dialog open={!!checkInTarget} onOpenChange={(open) => !open && setCheckInTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Confirmar Ingreso</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Registra el ingreso del vehículo y define las horas de estadía.
            </DialogDescription>
          </DialogHeader>

          {checkInTarget && (
            <div className="space-y-4 my-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Vehículo / Placa</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{checkInTarget.plate}</p>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Cajón Asignado</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{checkInTarget.slot}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Horas de estadía:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[1, 2, 3, 4].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setCheckInHours(h)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        checkInHours === h
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {h} {h === 1 ? 'hora' : 'horas'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Personalizado:</span>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 h-9">
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={checkInHours}
                      onChange={(e) => setCheckInHours(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-white outline-none text-center"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">horas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckInTarget(null)}
                  disabled={isProcessingCheckIn}
                  className="text-xs rounded-xl dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isProcessingCheckIn}
                  onClick={async () => {
                    setIsProcessingCheckIn(true);
                    const resp = await updateReservationStatus(checkInTarget.code, 'ACTIVE', checkInHours);
                    setIsProcessingCheckIn(false);
                    setCheckInTarget(null);
                    if (resp?.ok) setFeedbackMessage(resp.message || `Ingreso registrado para ${checkInTarget.plate} por ${checkInHours}h.`);
                    else setFeedbackMessage(resp?.message || 'Error al registrar ingreso.');
                  }}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Ingreso ({checkInHours}h)</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Pago de Sobreestadía con Pasarela Culqi / PayPal */}
      {overtimePayModal && (
        <CulqiPaymentModal
          isOpen={!!overtimePayModal}
          onClose={() => setOvertimePayModal(null)}
          amount={overtimePayModal.pendingBalance}
          concept={`Sobreestadía Reserva ${overtimePayModal.res.code} - ${overtimePayModal.res.plate}`}
          parkingName={overtimePayModal.res.parking || 'Smart Park'}
          slotCode={overtimePayModal.res.slot || 'Plaza'}
          customerEmail={user?.email || 'conductor@smartpark.com'}
          reservationId={overtimePayModal.res.id}
          onPaymentSuccess={() => {
            setFeedbackMessage(`✓ Sobreestadía de S/ ${overtimePayModal.pendingBalance.toFixed(2)} liquidada con éxito.`);
            setOvertimePayModal(null);
            if (refreshMyReservations) refreshMyReservations();
          }}
        />
      )}

    </div>
  );
};
