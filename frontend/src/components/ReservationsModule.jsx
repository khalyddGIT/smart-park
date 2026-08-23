import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
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
import { Badge } from './ui/badge';
import { DigitalAccessPassModal } from './DigitalAccessPassModal';

export const ReservationsModule = ({ onNavigateToBooking }) => {
  const { role } = useAuth();
  const { 
    establishments, 
    reservations, 
    createReservation, 
    updateReservationStatus, 
    cancelReservation, 
    completeReservation 
  } = useEstablishments();

  // Vista activa: 'list' | 'analytics'
  const [activeSubView, setActiveSubView] = useState('list');

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

  // Manejar creación de reserva manual
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!plate.trim()) {
      alert('Por favor ingresa la placa del vehículo.');
      return;
    }
    if (!selectedSlotCode) {
      alert('Por favor selecciona un cajón disponible.');
      return;
    }

    const rate = Number(activeEstablishment?.rate || 5.0);
    const totalCost = rate * Number(hours);
    const now = new Date();

    const newRes = createReservation({
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

    setShowCreateModal(false);
    setPlate('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedSlotCode('');
    
    // Abrir de inmediato el pase digital QR
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

  // Calcular tiempo restante legible
  const getRemainingTimeText = (expiresAt, status) => {
    if (status === 'COMPLETED') return 'Estancia finalizada';
    if (status === 'CANCELLED') return 'Cancelada';

    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = end - now;

    if (diffMs <= 0) return 'Tiempo vencido';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m restantes`;
    }
    return `${mins} min restantes`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Encabezado Principal Limpio y Profesional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
            <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {role === 'user' ? 'Mis Reservas & Pases Digitales' : 'Centro de Reservas & Garita'}
              </h1>
              <span className="text-xs font-mono font-bold text-slate-500">
                ({filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'})
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl h-9 px-4 shadow-xs cursor-pointer transition-colors"
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
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 rounded-xl h-9 px-4 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>Emitir Ticket</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.2]" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TARJETAS KPI EJECUTIVAS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Reservas */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Reservas</span>
            <CalendarCheck className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-slate-900">{totalReservations}</span>
            <span className="text-[11px] text-slate-500 font-medium">Histórico general</span>
          </div>
        </div>

        {/* En Curso / Activas */}
        <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>En Estancia</span>
            </span>
            <Car className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-emerald-700">{activeCount}</span>
            <span className="text-[11px] text-emerald-700 font-semibold">Ocupando plaza</span>
          </div>
        </div>

        {/* Programadas */}
        <div className="p-4 rounded-2xl border border-cyan-200/80 bg-cyan-50/40 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Programadas</span>
            <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-cyan-800">{scheduledCount}</span>
            <span className="text-[11px] text-cyan-700 font-medium">Por ingresar</span>
          </div>
        </div>

        {/* Recaudación o Gasto Total */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {role === 'user' ? 'Gasto Estimado' : 'Recaudación'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              PEN
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-emerald-700">S/ {totalRevenue.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 font-medium font-mono">
              {role === 'user' ? `Activas: S/ ${todayRevenue.toFixed(2)}` : `Hoy: S/ ${todayRevenue.toFixed(2)}`}
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          BARRA DE BÚSQUEDA Y FILTROS INTEGRADOS
          ========================================================================= */}
      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Buscador */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por placa, código RSV, cajón o cochera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 h-9 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
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
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">Todas las Sedes ({establishments.length})</option>
              {establishments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">Cualquier Fecha</option>
              <option value="TODAY">Solo Hoy</option>
            </select>
          </div>
        </div>

        {/* Pestañas de Estado (Segment Control Elegante) */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto scrollbar-none">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[11px] font-mono ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          LISTADO PRINCIPAL DE RESERVAS & TICKETS
          ========================================================================= */}
      <div className="space-y-3">
        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
            <h3 className="font-bold text-slate-800 text-sm">No se encontraron reservas con los filtros actuales</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Intenta buscar por otro término o restablece los filtros para ver tus registros.
            </p>
          </div>
        ) : (
          filteredReservations.map((res) => {
            const isScheduled = res.status === 'SCHEDULED';
            const isActive = res.status === 'ACTIVE';
            const isCompleted = res.status === 'COMPLETED';
            const isCancelled = res.status === 'CANCELLED';

            const progress = calculateTimeProgress(res.startTime, res.expiresAt);
            const remainingText = getRemainingTimeText(res.expiresAt, res.status);

            return (
              <div 
                key={res.code} 
                className={`p-4 sm:p-5 rounded-2xl border bg-white transition-all shadow-2xs hover:shadow-xs ${
                  isActive 
                    ? 'border-emerald-300 ring-1 ring-emerald-400/30' 
                    : isScheduled 
                    ? 'border-cyan-300' 
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Bloque Izquierdo: Datos de la Reserva */}
                  <div className="flex items-start gap-4">
                    
                    {/* Caja de Plaza / Cajón */}
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-black shrink-0 border ${
                      isActive 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : isScheduled
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                        : isCompleted
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-80 leading-none">Plaza</span>
                      <span className="text-lg leading-tight mt-0.5">{res.slot}</span>
                    </div>

                    {/* Contenido Central */}
                    <div className="space-y-1">
                      {/* Fila 1: Código, Estado y Placa */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-xs text-slate-400">{res.code}</span>
                        
                        {/* Estado en Texto Directo */}
                        {isActive && (
                          <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>En Estancia</span>
                          </span>
                        )}

                        {isScheduled && (
                          <span className="text-xs font-extrabold text-cyan-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                            <span>Programada</span>
                          </span>
                        )}

                        {isCompleted && (
                          <span className="text-xs font-bold text-slate-500">
                            Finalizada
                          </span>
                        )}

                        {isCancelled && (
                          <span className="text-xs font-bold text-rose-600">
                            Cancelada
                          </span>
                        )}

                        {/* Placa en Monospace */}
                        <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          PE {res.plate}
                        </span>
                      </div>

                      {/* Fila 2: Nombre del Establecimiento (Sin Viñetas ni Puntos) */}
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.2]" />
                        <span>{res.parking}</span>
                      </h3>

                      {/* Fila 3: Conductor, Teléfono y Horario */}
                      <div className="flex flex-wrap items-center text-xs text-slate-600 gap-x-4 gap-y-1 pt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{res.customerName}</span>
                        </span>

                        {res.customerPhone && (
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{res.customerPhone}</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({res.hours}h)</span>
                        </span>
                      </div>

                      {/* Barra de Tiempo Transcurrido */}
                      {(isActive || isScheduled) && (
                        <div className="pt-2 max-w-sm">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1 font-semibold">
                            <span>Tiempo transcurrido</span>
                            <span className={isActive ? 'text-emerald-700 font-bold' : 'text-cyan-700'}>
                              {remainingText}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                isActive ? 'bg-emerald-500' : 'bg-cyan-500'
                              }`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque Derecho: Importe y Acciones */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0">
                    
                    {/* Importe */}
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                        Importe Total
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                        S/ {Number(res.cost).toFixed(2)}
                      </span>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-2">
                      
                      {/* Ver Pase Digital QR */}
                      <Button
                        onClick={() => handleOpenPass(res)}
                        size="sm"
                        className="rounded-xl text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-2xs h-8 px-3 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Pase QR</span>
                      </Button>

                      {/* Imprimir Ticket */}
                      <Button
                        onClick={() => handlePrintReceipt(res)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-8 px-2.5 cursor-pointer"
                        title="Imprimir Comprobante"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0 text-slate-500" />
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
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
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
                    placeholder="Ej. Juan Quispe"
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
                  value={`🚗 SMART-PARK AYACUCHO - TICKET
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

    </div>
  );
};
