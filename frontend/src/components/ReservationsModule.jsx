import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import api, { getAccessToken } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { CulqiPaymentModal } from './CulqiPaymentModal';
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
  Filter, 
  Sparkles, 
  ArrowRight,
  Printer,
  ChevronRight,
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
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { DigitalAccessPassModal } from './DigitalAccessPassModal';

export const ReservationsModule = ({ onNavigateToBooking }) => {
  const { role } = useAuth();
  const { 
    establishments, 
    reservations, 
    createReservation, 
    bookingError,
    updateReservationStatus, 
    cancelReservation, 
    completeReservation 
  } = useEstablishments();

  // Vista activa: 'list' | 'analytics'
  const [activeSubView, setActiveSubView] = useState('list');

  // Pagos: reservas ya pagadas (según servidor) y reserva en proceso de pago
  const [paidIds, setPaidIds] = useState(new Set());
  const [payTarget, setPayTarget] = useState(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    api.get('/payments/my').then(r => {
      const ids = new Set((Array.isArray(r.data) ? r.data : [])
        .filter(p => p.status === 'succeeded' && p.reservation_id)
        .map(p => Number(p.reservation_id)));
      setPaidIds(ids);
    }).catch(() => {});
  }, [reservations.length]);

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

  // Establecimiento seleccionado para nueva reserva
  const activeEstablishment = establishments.find(e => e.id === selectedParkingId) || establishments[0];
  const availableSlots = (activeEstablishment?.elements || []).filter(el => el.type === 'slot' && el.status === 'free');

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
    const matchesParking = parkingFilter === 'ALL' || r.parkingId === parkingFilter;

    let matchesDate = true;
    if (dateFilter === 'TODAY') {
      const today = new Date().toDateString();
      matchesDate = new Date(r.startTime).toDateString() === today || new Date(r.createdAt || r.startTime).toDateString() === today;
    }

    return matchesSearch && matchesStatus && matchesParking && matchesDate;
  });

  // Métricas y conteos en tiempo real
  const totalReservations = reservations.length;
  const activeCount = reservations.filter(r => r.status === 'ACTIVE').length;
  const scheduledCount = reservations.filter(r => r.status === 'SCHEDULED').length;
  const completedCount = reservations.filter(r => r.status === 'COMPLETED').length;
  const cancelledCount = reservations.filter(r => r.status === 'CANCELLED').length;
  
  const totalRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

  const todayRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .filter(r => new Date(r.startTime).toDateString() === new Date().toDateString())
    .reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

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

  // Calcular progreso de tiempo transcurrido
  const calculateTimeProgress = (startTime, expiresAt) => {
    const start = new Date(startTime).getTime();
    const end = new Date(expiresAt).getTime();
    const now = Date.now();

    if (now <= start) return 0;
    if (now >= end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  // Calcular tiempo restante legible por fases (Llegada vs Estancia)
  const getRemainingTimeText = (startTime, expiresAt, status) => {
    if (status === 'COMPLETED') return 'Estancia finalizada';
    if (status === 'CANCELLED') return 'Cancelada';

    const now = Date.now();
    if (status === 'SCHEDULED') {
      const start = new Date(startTime).getTime();
      const tolMs = 15 * 60 * 1000; // 15 min tolerancia
      const arrivalDeadline = start + tolMs;
      const diffMs = arrivalDeadline - now;
      if (diffMs <= 0) return 'Tolerancia de llegada vencida';
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return `Llegada: ${mins} min para presentarse`;
    }

    const end = new Date(expiresAt).getTime();
    const diffMs = end - now;

    if (diffMs <= 0) return 'Estadía vencida (en exceso)';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs cursor-pointer"
              >
                ✕
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
              <option value="ALL">Todas las Sedes ({establishments.length})</option>
              {establishments.map(e => (
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
          filteredReservations.map((res) => {
            const isScheduled = res.status === 'SCHEDULED';
            const isActive = res.status === 'ACTIVE';
            const isCompleted = res.status === 'COMPLETED';
            const isCancelled = res.status === 'CANCELLED';
            const isPaid = paidIds.has(Number(res.id));

            const progress = calculateTimeProgress(res.startTime, res.expiresAt);
            const remainingText = getRemainingTimeText(res.startTime, res.expiresAt, res.status);

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

                      {/* Fila 3: Conductor (si existe) y Horario */}
                      <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 gap-x-3 gap-y-1">
                        {res.customerName && (
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{res.customerName}</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {isScheduled ? (
                            <span>Llegada estimada: {new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          ) : (
                            <span>{new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({res.hours}h)</span>
                          )}
                        </span>
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
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque Derecho: Importe y Acciones */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                    
                    {/* Importe */}
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-mono">
                        {isScheduled ? 'Tarifa' : 'Importe'}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {isScheduled 
                          ? `S/ ${Number(res.ratePerHour || 5.0).toFixed(2)} /h`
                          : `S/ ${Number(res.cost).toFixed(2)}`}
                      </span>
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
                      <Button
                        onClick={() => handleOpenPass(res)}
                        size="sm"
                        className="rounded-lg text-xs font-bold gap-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-transparent dark:border-slate-700/80 shadow-xs h-8 px-3 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Pase QR</span>
                      </Button>

                      {/* Imprimir Ticket */}
                      <Button
                        onClick={() => handlePrintReceipt(res)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 h-8 px-2.5 cursor-pointer"
                        title="Imprimir Comprobante"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="hidden sm:inline">Ticket</span>
                      </Button>

                      {/* Cancelar Reserva */}
                      {(isScheduled || isActive) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Deseas cancelar la reserva ${res.code} y liberar la plaza ${res.slot}?`)) {
                              cancelReservation(res.code);
                              setFeedbackMessage(`Reserva ${res.code} cancelada. Plaza ${res.slot} disponible.`);
                            }
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                  {establishments.map(est => (
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
                  <span>Emitir Ticket & Generar Pase</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TICKET / COMPROBANTE DE PAGO IMPRIMIBLE
          ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 gap-4">
            
            {/* Header del Ticket */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 font-bold block">SMART-PARK AYACUCHO</span>
              <h3 className="font-black text-slate-900 text-base">{selectedReceipt.parking}</h3>
              <p className="text-[11px] text-slate-500 font-mono">TICKET DE ESTACIONAMIENTO</p>
              <p className="text-xs font-mono font-black text-emerald-700 mt-1">{selectedReceipt.code}</p>
            </div>

            {/* Datos del Ticket */}
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
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
                <span className="text-slate-500">Ingreso:</span>
                <span className="text-slate-800">{new Date(selectedReceipt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salida estimada:</span>
                <span className="text-slate-800">{new Date(selectedReceipt.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horas:</span>
                <span className="text-slate-800">{selectedReceipt.hours} hora(s)</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>Total Cobrado:</span>
                <span className="text-emerald-700">S/ {Number(selectedReceipt.cost).toFixed(2)}</span>
              </div>
            </div>

            {/* Código QR Escaneable para Celulares y Garita */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="p-1.5 bg-white rounded-xl border border-slate-100 shadow-xs inline-block">
                <QRCodeSVG
                  value={`SMART-PARK AYACUCHO - TICKET
Sede: ${selectedReceipt.parking}
Plaza: ${selectedReceipt.slot}
Placa: ${selectedReceipt.plate}
Reserva: ${selectedReceipt.code}
Token: ${selectedReceipt.token || 'SPK-TOKEN-VALID'}
Total: S/ ${Number(selectedReceipt.cost).toFixed(2)}
ESTADO: AUTORIZADO`}
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
      )}

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
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>Registrar Ingreso en Garita</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra el ingreso real del vehículo y define el tiempo de estadía acordado.
            </DialogDescription>
          </DialogHeader>

          {checkInTarget && (
            <div className="space-y-4 my-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Vehículo / Placa</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{checkInTarget.plate}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cajón Asignado</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{checkInTarget.slot}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  ¿Cuánto tiempo va a permanecer estacionado?
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
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {h} {h === 1 ? 'hora' : 'horas'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Personalizado:</span>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 h-9">
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={checkInHours}
                      onChange={(e) => setCheckInHours(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 bg-transparent text-xs font-mono font-bold text-slate-800 outline-none text-center"
                    />
                    <span className="text-xs text-slate-500">horas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckInTarget(null)}
                  disabled={isProcessingCheckIn}
                  className="text-xs rounded-xl"
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
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Confirmar Ingreso ({checkInHours}h)</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};
