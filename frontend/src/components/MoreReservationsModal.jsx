import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Crown, 
  Calendar, 
  Car, 
  Bike, 
  Truck, 
  Navigation, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  ArrowRight, 
  Sparkles,
  CreditCard,
  Building2,
  CalendarCheck,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';

export const MoreReservationsModal = ({
  isOpen,
  onClose,
  parking,
  onConfirmBooking,
  onOpenDetailedPlan
}) => {
  const { user } = useAuth();
  const { findOptimalSlot } = useEstablishments();

  // Tab activo: 'subscription' (Abonado Mensual) | 'advance' (Reserva Programada)
  const [activeTab, setActiveTab] = useState('subscription');

  // Vehículos del conductor
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [manualPlate, setManualPlate] = useState('');
  const [useCustomPlate, setUseCustomPlate] = useState(false);
  const [vehicleCategory, setVehicleCategory] = useState('auto');

  // Configuración de Abonado Mensual
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [subscriptionMonths, setSubscriptionMonths] = useState(1);

  // Configuración de Reserva Programada (Fecha Adelantada)
  const [advanceDate, setAdvanceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [advanceTime, setAdvanceTime] = useState('09:00');
  const [advanceHours, setAdvanceHours] = useState(2);

  // Estado de envío y error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Cargar vehículos del conductor
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const res = await api.get('/vehicles');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(res.data);
        setSelectedVehicleId(res.data[0].id);
        if (res.data[0].vehicle_type) {
          setVehicleCategory(res.data[0].vehicle_type);
        }
        setLoadingVehicles(false);
        return;
      }
    } catch {
      // Fallback a localStorage
    }

    try {
      const uKey = user?.id || user?.email || 'guest';
      const raw = localStorage.getItem(`smart_park_vehicles_v2_${uKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVehicles(parsed);
          setSelectedVehicleId(parsed[0].id);
          if (parsed[0].vehicle_type) {
            setVehicleCategory(parsed[0].vehicle_type);
          }
          setLoadingVehicles(false);
          return;
        }
      }
    } catch {}

    setVehicles([]);
    setLoadingVehicles(false);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      loadVehicles();
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, loadVehicles]);

  // Selección de vehículo actual
  const currentVehicle = useMemo(() => {
    if (vehicles.length > 0 && !useCustomPlate) {
      return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
    }
    return null;
  }, [vehicles, selectedVehicleId, useCustomPlate]);

  useEffect(() => {
    if (currentVehicle?.vehicle_type) {
      setVehicleCategory(currentVehicle.vehicle_type);
    }
  }, [currentVehicle]);

  const effectivePlate = useMemo(() => {
    if (useCustomPlate) {
      return manualPlate.toUpperCase().trim();
    }
    return (currentVehicle?.license_plate || manualPlate || '').toUpperCase().trim();
  }, [useCustomPlate, currentVehicle, manualPlate]);

  // Auto-formato de placa ABC-123
  const handlePlateChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 3) {
      val = val.slice(0, 3) + '-' + val.slice(3, 6);
    }
    setManualPlate(val);
    setErrorMessage(null);
  };

  // Tarifas configuradas de la sede
  const rates = useMemo(() => {
    const rAuto = Number(parking?.rate_auto ?? parking?.rate ?? 5.0);
    const rSuv = Number(parking?.rate_suv ?? 7.0);
    const rMototaxi = Number(parking?.rate_mototaxi ?? 3.5);
    const rMoto = Number(parking?.rate_moto ?? 2.5);

    const mAuto = Number(parking?.rate_monthly_auto ?? parking?.rate_monthly ?? 180.0);
    const mSuv = Number(parking?.rate_monthly_suv ?? 240.0);
    const mMototaxi = Number(parking?.rate_monthly_mototaxi ?? 120.0);
    const mMoto = Number(parking?.rate_monthly_moto ?? 90.0);

    return {
      auto: { hourly: rAuto, monthly: mAuto },
      camioneta: { hourly: rSuv, monthly: mSuv },
      mototaxi: { hourly: rMototaxi, monthly: mMototaxi },
      moto: { hourly: rMoto, monthly: mMoto }
    };
  }, [parking]);

  const currentMonthlyRate = rates[vehicleCategory]?.monthly || 180.0;
  const currentHourlyRate = rates[vehicleCategory]?.hourly || 5.0;

  // Cálculo de fin de suscripción (30 días por mes)
  const subscriptionEndDate = useMemo(() => {
    const [y, m, d] = (subscriptionStartDate || '').split('-').map(Number);
    if (!y || !m || !d) return new Date();
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (30 * subscriptionMonths));
    return date;
  }, [subscriptionStartDate, subscriptionMonths]);

  // Costos totales
  const totalSubscriptionCost = currentMonthlyRate * subscriptionMonths;
  const totalAdvanceCost = currentHourlyRate * advanceHours;

  // Asignación de plaza compatible
  const assignedSlot = useMemo(() => {
    if (!parking) return null;
    return findOptimalSlot ? findOptimalSlot(parking, vehicleCategory) : null;
  }, [parking, vehicleCategory, findOptimalSlot]);

  // Validaciones de estado de la sede
  const isMaintenance = (parking?.status || '').toLowerCase() === 'mantenimiento' || (parking?.status || '').toLowerCase() === 'maintenance';
  const isClosed = (parking?.status || '').toLowerCase() === 'cerrado' || (parking?.status || '').toLowerCase() === 'closed';
  const isUnavailable = isMaintenance || isClosed;

  // Confirmar reserva
  const handleConfirm = async () => {
    if (!parking) return;

    if (isMaintenance) {
      setErrorMessage('Esta sede se encuentra en mantenimiento técnico. Las reservas están pausadas.');
      return;
    }
    if (isClosed) {
      setErrorMessage('Esta sede se encuentra cerrada al público temporalmente.');
      return;
    }

    if (!effectivePlate || effectivePlate.length < 6) {
      setErrorMessage('Ingresa una placa válida (ej. ABC-123).');
      return;
    }

    const plateRegex = /^[A-Z0-9]{2,3}-[A-Z0-9]{3,4}$/;
    if (!plateRegex.test(effectivePlate)) {
      setErrorMessage('Formato de placa inválido. Debe incluir un guión (ej. ABC-123).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const tolerance = Number(parking.tolerance || parking.tolerance_minutes || 15);

    try {
      if (activeTab === 'subscription') {
        const [sy, sm, sd] = subscriptionStartDate.split('-').map(Number);
        const startDt = new Date(sy, sm - 1, sd, 0, 0, 0);
        const endDt = new Date(startDt);
        endDt.setDate(endDt.getDate() + (30 * subscriptionMonths));

        await onConfirmBooking({
          parkingId: parking.id,
          parkingName: parking.name,
          slotId: assignedSlot?.id || null,
          slotCode: assignedSlot?.code || null,
          autoAssign: true,
          plate: effectivePlate,
          vehicleType: vehicleCategory,
          reservationType: 'subscription',
          isSubscription: true,
          subscriptionMonths: subscriptionMonths,
          startTime: startDt.toISOString(),
          expiresAt: endDt.toISOString(),
          hours: 24 * 30 * subscriptionMonths,
          totalCost: totalSubscriptionCost,
          toleranceMinutes: tolerance,
          payNow: true,
          bookingModel: 'subscription_monthly',
          paymentMethod: 'tarjeta'
        });
      } else {
        // Reserva programada / fecha adelantada
        const [ay, am, ad] = advanceDate.split('-').map(Number);
        const [ah, amnt] = advanceTime.split(':').map(Number);
        const scheduledStart = new Date(ay, am - 1, ad, ah, amnt, 0);
        const scheduledEnd = new Date(scheduledStart.getTime() + (advanceHours * 60 * 60 * 1000));

        await onConfirmBooking({
          parkingId: parking.id,
          parkingName: parking.name,
          slotId: assignedSlot?.id || null,
          slotCode: assignedSlot?.code || null,
          autoAssign: true,
          plate: effectivePlate,
          vehicleType: vehicleCategory,
          reservationType: 'advance',
          isSubscription: false,
          startTime: scheduledStart.toISOString(),
          expiresAt: scheduledEnd.toISOString(),
          hours: advanceHours,
          estimatedHours: advanceHours,
          totalCost: totalAdvanceCost,
          toleranceMinutes: tolerance,
          payNow: !!parking.require_reservation_prepay,
          bookingModel: 'advance_booking',
          paymentMethod: parking.require_reservation_prepay ? 'tarjeta' : 'efectivo'
        });
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'No se pudo completar la reserva.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !parking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Principal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 border-b border-slate-800 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                Opciones de Reserva
              </span>
              <span className="text-xs text-slate-400 font-mono">Modalidades Especiales</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-lg font-black tracking-tight text-white line-clamp-1">
              {parking.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{parking.address || 'Centro de la ciudad'}</span>
            </p>
          </div>

          {/* Pestañas de Navegación de Modalidades */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab('subscription'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'subscription'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Abonado Mensual (30d)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('advance'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'advance'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-300" />
              <span>Fecha Adelantada</span>
            </button>
          </div>
        </div>

        {/* Contenido del Modal */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {isMaintenance && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1 font-medium">
                <span className="font-bold block">Sede en Mantenimiento Técnico</span>
                Este estacionamiento se encuentra en mantenimiento temporal. Las reservas están pausadas.
              </div>
            </div>
          )}

          {isClosed && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">
                <span className="font-bold block">Sede Cerrada Temporalmente</span>
                Este estacionamiento no se encuentra abierto al público en este momento.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Banner Explicativo de la Modalidad Seleccionada */}
          {activeTab === 'subscription' ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                <Crown className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Membresía VIP de Abonado Continuo</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Ingresa y sal cuantas veces desees durante 30 días continuos con tu código QR único. Plaza asegurada sin cancelaciones por tolerancia de llegada.
              </p>
            </div>
          ) : (
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
                <Calendar className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span>Reserva con Fecha y Hora Programada</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Asegura tu cajón con anticipación para viajes o citas médicas. La tolerancia oficial de ~{parking?.tolerance || 15} minutos iniciará puntualmente en tu hora programada.
              </p>
            </div>
          )}

          {/* Selector de Tipo de Vehículo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Tipo de Vehículo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'auto', label: 'Auto', icon: Car, rate: rates.auto.hourly, monthly: rates.auto.monthly },
                { id: 'camioneta', label: 'Camioneta', icon: Truck, rate: rates.camioneta.hourly, monthly: rates.camioneta.monthly },
                { id: 'mototaxi', label: 'Mototaxi', icon: Navigation, rate: rates.mototaxi.hourly, monthly: rates.mototaxi.monthly },
                { id: 'moto', label: 'Moto', icon: Bike, rate: rates.moto.hourly, monthly: rates.moto.monthly },
              ].map((v) => {
                const Icon = v.icon;
                const isCur = vehicleCategory === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleCategory(v.id)}
                    className={`p-2.5 rounded-2xl text-xs font-semibold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                      isCur
                        ? activeTab === 'subscription'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold">{v.label}</span>
                    <span className="text-[10px] font-mono opacity-85">
                      {activeTab === 'subscription' ? `S/${v.monthly.toFixed(0)}/m` : `S/${v.rate.toFixed(1)}/h`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selección de Placa */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Placa Vehicular</span>
              </label>

              {vehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPlate(!useCustomPlate);
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  {useCustomPlate ? 'Elegir de mi garaje' : 'Ingresar otra placa'}
                </button>
              )}
            </div>

            {loadingVehicles ? (
              <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando vehículos...
              </div>
            ) : vehicles.length > 0 && !useCustomPlate ? (
              <select
                value={selectedVehicleId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedVehicleId(id);
                  const found = vehicles.find(v => v.id === id);
                  if (found?.vehicle_type) setVehicleCategory(found.vehicle_type);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} - {v.brand || 'Vehículo'} {v.model || ''} ({v.vehicle_type ? v.vehicle_type.toUpperCase() : 'AUTO'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ABC-123"
                value={manualPlate}
                onChange={handlePlateChange}
                maxLength={8}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            )}
          </div>

          {/* Formulario Específico: Abonado Mensual */}
          {activeTab === 'subscription' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Inicio de membresía
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={subscriptionStartDate}
                    onChange={(e) => setSubscriptionStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Duración
                  </label>
                  <select
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value={1}>1 Mes (30 días)</option>
                    <option value={2}>2 Meses (60 días)</option>
                    <option value={3}>3 Meses (90 días)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-bold">
                  <span>Periodo de Cobertura:</span>
                  <span className="font-mono">
                    {subscriptionStartDate} al {subscriptionEndDate.toISOString().split('T')[0]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total de {30 * subscriptionMonths} días de estacionamiento continuo e irrestricto.
                </p>
              </div>
            </div>
          )}

          {/* Formulario Específico: Reserva Programada */}
          {activeTab === 'advance' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Fecha de llegada
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().split('T')[0]; })()}
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Hora estimada
                  </label>
                  <input
                    type="time"
                    value={advanceTime}
                    onChange={(e) => setAdvanceTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Estadía planificada:</span>
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">{advanceHours} horas</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAdvanceHours(h)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                        advanceHours === h
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resumen Económico */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Sede:</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">{parking.name}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Plaza sugerida:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {assignedSlot ? `Cajón ${assignedSlot.code}` : 'Asignación automática óptima'}
              </span>
            </div>

            {activeTab === 'subscription' ? (
              <>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Tarifa mensual ({vehicleCategory.toUpperCase()}):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    S/ {currentMonthlyRate.toFixed(2)} /mes
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Abonado:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 text-base">
                    S/ {totalSubscriptionCost.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Tarifa hora ({vehicleCategory.toUpperCase()}):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    S/ {currentHourlyRate.toFixed(2)} /h
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Llegada acordada:</span>
                  <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                    {advanceDate} {advanceTime}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Estimado:</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400 text-base">
                    S/ {totalAdvanceCost.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer y Acciones */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <Button
            type="button"
            disabled={isUnavailable || isSubmitting || !effectivePlate}
            onClick={handleConfirm}
            className={`w-full py-3 text-xs font-bold gap-2 rounded-xl transition cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-950/20'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-950/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando solicitud...</span>
              </>
            ) : activeTab === 'subscription' ? (
              <>
                <Crown className="w-4 h-4 text-white" />
                <span>Adquirir Abono Mensual (S/ {totalSubscriptionCost.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 text-white" />
                <span>Confirmar Reserva Programada</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </Button>

          {onOpenDetailedPlan && (
            <button
              type="button"
              onClick={() => onOpenDetailedPlan(parking)}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 py-1 text-center transition cursor-pointer"
            >
              ¿Prefieres elegir tu cajón manualmente en el plano 2D? Ver plano interactivo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
