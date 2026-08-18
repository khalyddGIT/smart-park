import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
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
  RotateCcw
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

  // Estados de interfaz
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  const [parkingFilter, setParkingFilter] = useState('ALL');
  
  // Modal de Nueva Reserva Manual / Express
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState(establishments[0]?.id || 'EST-01');
  const [selectedSlotCode, setSelectedSlotCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [hours, setHours] = useState(2);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Modal de Pase QR
  const [selectedReservationForPass, setSelectedReservationForPass] = useState(null);
  const [showPassModal, setShowPassModal] = useState(false);

  // Establecimiento seleccionado para nueva reserva
  const activeEstablishment = establishments.find(e => e.id === selectedParkingId) || establishments[0];
  const availableSlots = (activeEstablishment?.elements || []).filter(el => el.type === 'slot' && el.status === 'free');

  // Filtrado de reservas
  const filteredReservations = reservations.filter(r => {
    const matchesSearch = 
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.parking && r.parking.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesParking = parkingFilter === 'ALL' || r.parkingId === parkingFilter;

    return matchesSearch && matchesStatus && matchesParking;
  });

  // Métricas
  const totalReservations = reservations.length;
  const activeCount = reservations.filter(r => r.status === 'ACTIVE' || r.status === 'SCHEDULED').length;
  const completedCount = reservations.filter(r => r.status === 'COMPLETED').length;
  const totalRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

  // Manejar creación de reserva manual
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!plate.trim()) {
      alert('Por favor, ingresa la placa del vehículo.');
      return;
    }
    if (!selectedSlotCode) {
      alert('Por favor, selecciona un cajón disponible.');
      return;
    }

    const rate = Number(activeEstablishment?.rate || 5.0);
    const totalCost = rate * Number(hours);

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
      startTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString()
    });

    setShowCreateModal(false);
    setPlate('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedSlotCode('');
    
    // Abrir de inmediato el pase digital QR
    setSelectedReservationForPass(newRes);
    setShowPassModal(true);

    setFeedbackMessage(`¡Reserva ${newRes.code} creada con éxito! Cajón ${newRes.slot} asignado.`);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const handleOpenPass = (res) => {
    setSelectedReservationForPass(res);
    setShowPassModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {role === 'user' ? 'Mis Reservas & Pases Digitales' : 'Centro de Reservas & Control de Tickets'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {role === 'user' 
                  ? 'Gestiona tus pases con código QR y consulta el tiempo restante de tu plaza asignada.' 
                  : 'Administra reservas anticipadas, emisión manual en ventanilla y validación de accesos.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {role === 'user' && onNavigateToBooking && (
            <Button
              onClick={onNavigateToBooking}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 rounded-2xl shadow-lg shadow-emerald-500/20 h-10 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Reservar Plaza en Mapa</span>
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
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-2 rounded-2xl shadow-lg shadow-slate-900/20 h-10 px-4"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Nueva Reserva en Garita</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mensaje de feedback */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Tarjetas de Métricas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registradas</CardDescription>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">{totalReservations}</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-emerald-200 shadow-xs bg-emerald-50/40">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Activas / Programadas</CardDescription>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-2xl font-black font-mono text-emerald-700">{activeCount}</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estancias Completadas</CardDescription>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-2xl font-black font-mono text-slate-800">{completedCount}</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recaudación por Reservas</CardDescription>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-2xl font-black font-mono text-emerald-600">S/ {totalRevenue.toFixed(2)}</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs">
              PEN
            </span>
          </div>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="p-3.5 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa, código RSV o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Filtro por Estado */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-[11px] font-bold overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0">
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'ACTIVE', label: 'En Curso' },
              { id: 'SCHEDULED', label: 'Programadas' },
              { id: 'COMPLETED', label: 'Finalizadas' },
              { id: 'CANCELLED', label: 'Canceladas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-xl transition whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtro por Establecimiento */}
          <select
            value={parkingFilter}
            onChange={(e) => setParkingFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none max-w-full"
          >
            <option value="ALL">Todos los Locales</option>
            {establishments.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Lista / Tabla de Reservas */}
      <div className="space-y-3">
        {filteredReservations.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border-slate-200 shadow-xs bg-white space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No se encontraron reservas</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay registros que coincidan con los filtros aplicados o aún no se han realizado reservas en esta sede.
            </p>
          </Card>
        ) : (
          filteredReservations.map((res) => {
            const isScheduled = res.status === 'SCHEDULED';
            const isActive = res.status === 'ACTIVE';
            const isCompleted = res.status === 'COMPLETED';
            const isCancelled = res.status === 'CANCELLED';

            return (
              <Card key={res.code} className="p-4 sm:p-5 rounded-3xl border-slate-200 shadow-xs bg-white hover:border-slate-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                
                {/* Información Principal */}
                <div className="flex items-start space-x-3.5">
                  <div className={`p-3 rounded-2xl flex items-center justify-center font-mono font-black text-sm ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-300' 
                      : isScheduled
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : isCompleted
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}>
                    {res.slot}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs text-slate-400">{res.code}</span>
                      
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En Estacionamiento
                        </span>
                      )}

                      {isScheduled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-100 text-cyan-800">
                          Programada
                        </span>
                      )}

                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          Finalizada
                        </span>
                      )}

                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                          Cancelada
                        </span>
                      )}

                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Placa: <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-black">{res.plate}</strong>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">{res.parking}</h3>
                    
                    <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-4 gap-y-1 font-medium">
                      <span className="flex items-center gap-1 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {res.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Duración: <strong>{res.hours}h</strong> ({new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                      <span className="font-bold text-emerald-600">
                        Importe: S/ {Number(res.cost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones y Operaciones */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  
                  {/* Botón Ver QR / Pase */}
                  <Button
                    onClick={() => handleOpenPass(res)}
                    variant="outline"
                    size="sm"
                    className="rounded-2xl text-xs font-bold gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pase Digital</span>
                  </Button>

                  {/* Validar Entrada (Operador) */}
                  {role !== 'user' && isScheduled && (
                    <Button
                      onClick={() => {
                        updateReservationStatus(res.code, 'ACTIVE');
                        setFeedbackMessage(`Vehículo ${res.plate} ingresó al cajón ${res.slot}.`);
                      }}
                      size="sm"
                      className="rounded-2xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Check-In Entrada</span>
                    </Button>
                  )}

                  {/* Registrar Salida (Operador) */}
                  {role !== 'user' && isActive && (
                    <Button
                      onClick={() => {
                        completeReservation(res.code);
                        setFeedbackMessage(`Salida registrada para ${res.plate}. Cajón ${res.slot} liberado.`);
                      }}
                      size="sm"
                      className="rounded-2xl text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 text-amber-400" />
                      <span>Check-Out Salida</span>
                    </Button>
                  )}

                  {/* Cancelar Reserva */}
                  {(isScheduled || isActive) && (
                    <Button
                      onClick={() => {
                        if (confirm(`¿Deseas cancelar la reserva ${res.code} y liberar la plaza ${res.slot}?`)) {
                          cancelReservation(res.code);
                          setFeedbackMessage(`Reserva ${res.code} cancelada. Plaza ${res.slot} libre.`);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <span>Cancelar</span>
                    </Button>
                  )}
                </div>

              </Card>
            );
          })
        )}
      </div>

      {/* MODAL: Nueva Reserva Manual / Express en Garita */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nueva Reserva en Ventanilla</h3>
                  <p className="text-[11px] text-slate-400">Emisión manual con asignación inmediata de cajón</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Selector de Establecimiento */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Sede de Estacionamiento</label>
                <select
                  value={selectedParkingId}
                  onChange={(e) => {
                    setSelectedParkingId(e.target.value);
                    setSelectedSlotCode('');
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                >
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.name} (S/ {Number(est.rate).toFixed(2)}/h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Cajón Disponible */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Cajón / Plaza Disponible</label>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {availableSlots.length} libres
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold text-center">
                    No hay cajones libres en esta sede actualmente.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
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

              {/* Placa y Conductor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Placa del Vehículo *</label>
                  <Input
                    type="text"
                    required
                    placeholder="ABC-123"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="font-mono font-black text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Horas de Estancia</label>
                  <select
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                  >
                    <option value={1}>1 Hora</option>
                    <option value={2}>2 Horas</option>
                    <option value={3}>3 Horas</option>
                    <option value={4}>4 Horas</option>
                    <option value={8}>8 Horas (Día)</option>
                    <option value={12}>12 Horas</option>
                  </select>
                </div>
              </div>

              {/* Datos Opcionales del Conductor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Conductor</label>
                  <Input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono</label>
                  <Input
                    type="tel"
                    placeholder="+51 966..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Resumen de Tarifa */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Total a Cobrar:</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  S/ {(Number(activeEstablishment?.rate || 5) * hours).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-2xl text-xs font-bold">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedSlotCode || !plate.trim()}
                  className="rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Emitir Reserva & QR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pase Digital QR */}
      <DigitalAccessPassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        reservation={selectedReservationForPass}
      />

    </div>
  );
};
