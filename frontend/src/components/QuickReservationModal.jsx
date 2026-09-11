import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Car, 
  Bike, 
  Truck, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  ChevronRight, 
  Navigation, 
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';

export const QuickReservationModal = ({ 
  isOpen, 
  onClose, 
  parking, 
  onConfirmBooking, 
  onSwitchToDetailedPlan 
}) => {
  const { user } = useAuth();
  const { findOptimalSlot } = useEstablishments();

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [manualPlate, setManualPlate] = useState('');
  const [manualType, setManualType] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Cargar vehículos del conductor
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      // 1. Intentar desde servidor
      const res = await api.get('/vehicles');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(res.data);
        setSelectedVehicleId(res.data[0].id);
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

  // Vehículo actualmente seleccionado
  const currentVehicle = useMemo(() => {
    if (vehicles.length > 0) {
      return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
    }
    return null;
  }, [vehicles, selectedVehicleId]);

  const effectiveVehicleType = currentVehicle?.vehicle_type || manualType || 'auto';
  const effectivePlate = (currentVehicle?.license_plate || manualPlate || '').toUpperCase().trim();

  // Calcular la plaza óptima asignada
  const assignedSlot = useMemo(() => {
    if (!parking) return null;
    return findOptimalSlot ? findOptimalSlot(parking, effectiveVehicleType) : null;
  }, [parking, effectiveVehicleType, findOptimalSlot]);

  // Manejo de entrada de placa con auto-formato ABC-123
  const handlePlateChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 3) {
      val = val.slice(0, 3) + '-' + val.slice(3, 6);
    }
    setManualPlate(val);
    setErrorMessage(null);
  };

  const isMaintenance = (parking?.status || '').toLowerCase() === 'mantenimiento' || (parking?.status || '').toLowerCase() === 'maintenance';
  const isClosed = (parking?.status || '').toLowerCase() === 'cerrado' || (parking?.status || '').toLowerCase() === 'closed';
  const isUnavailable = isMaintenance || isClosed;

  // Confirmar reserva rápida
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
      setErrorMessage('Formato de placa inválido. Debe ser ej. ABC-123.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const now = new Date();
    const tolerance = Number(parking.tolerance || parking.tolerance_minutes || 15);
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 horas estimadas por defecto

    try {
      await onConfirmBooking({
        parkingId: parking.id,
        parkingName: parking.name,
        slotId: assignedSlot?.id || null,
        slotCode: assignedSlot?.code || null,
        autoAssign: true,
        isQuickReservation: true,
        plate: effectivePlate,
        vehicleType: effectiveVehicleType,
        toleranceMinutes: tolerance,
        startTime: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        hours: 2,
        estimatedHours: 2,
        totalCost: Number(parking.rate || 5.0) * 2,
        isOpenStay: true,
        payNow: false,
        bookingModel: 'postpaid',
        paymentMethod: 'efectivo'
      });
    } catch (err) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'No se pudo completar la reserva rápida.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !parking) return null;

  const toleranceMin = parking.tolerance || parking.tolerance_minutes || 15;
  const hourlyRate = Number(parking.rate || parking.hourly_rate || 5.0).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Táctica */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 border-b border-slate-800 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                Reserva Rápida
              </span>
              <span className="text-xs text-slate-400 font-mono">1-Clic Express</span>
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

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1 font-bold text-emerald-400">
              <span>S/ {hourlyRate}/h</span>
              <span className="text-slate-400 font-normal text-[11px]">• Tarifa base</span>
            </div>
            <div className="text-slate-500">•</div>
            <div className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{toleranceMin} min tolerancia</span>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal Express */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {isMaintenance && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1 font-medium">
                <span className="font-bold block">Sede en Mantenimiento Técnico</span>
                Este estacionamiento se encuentra en calibración o mantenimiento. Las reservas están pausadas.
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
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* 1. Selector de Vehículo */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                Vehículo para la Reserva
              </span>
              {vehicles.length > 1 && (
                <span className="text-[10px] text-slate-500 font-normal">Toca para cambiar</span>
              )}
            </label>

            {loadingVehicles ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Cargando tus vehículos...</span>
              </div>
            ) : vehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vehicles.map((v) => {
                  const isSelected = v.id === currentVehicle?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-black text-sm tracking-wider">
                          {v.license_plate}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {v.brand} {v.model} ({v.vehicle_type || 'auto'})
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Sin vehículos guardados: Entrada rápida de placa */
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={manualPlate}
                      onChange={handlePlateChange}
                      placeholder="Placa ej. ABC-123"
                      maxLength={7}
                      className="w-full px-3 py-2 text-sm font-mono font-black tracking-widest text-center uppercase rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[
                      { id: 'auto', label: 'Auto', icon: Car },
                      { id: 'suv', label: 'SUV', icon: Truck },
                      { id: 'moto', label: 'Moto', icon: Bike }
                    ].map(t => {
                      const Icon = t.icon;
                      const isSel = manualType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setManualType(t.id)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            isSel 
                              ? 'bg-slate-900 text-white dark:bg-emerald-600' 
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Plaza Asignada Inteligente */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-900 dark:text-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-emerald-950 dark:text-emerald-300">
                  {assignedSlot ? `Plaza Asignada: ${assignedSlot.code}` : 'Auto-asignación inteligente'}
                </span>
                {assignedSlot?.shaded && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Techada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {assignedSlot 
                  ? 'Ubicación óptima seleccionada por cercanía al acceso y compatibilidad con tu vehículo.' 
                  : 'El sistema bloqueará automáticamente la mejor plaza libre al confirmar.'}
              </p>
            </div>
          </div>

          {/* 3. Condiciones de Conducción */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tiempo de llegada</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white mt-1">
                {toleranceMin} min de tolerancia
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Modalidad</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white mt-1 truncate">
                Paga en garita al salir
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Acción Principal y Enlace a Plano 2D */}
        <div className="p-5 pt-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUnavailable || isSubmitting || (!effectivePlate && vehicles.length === 0)}
            className={`w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] disabled:opacity-50 ${
              isMaintenance
                ? 'bg-amber-800 dark:bg-amber-900 cursor-not-allowed'
                : isClosed
                ? 'bg-rose-800 dark:bg-rose-900 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Apartando plaza...</span>
              </>
            ) : isMaintenance ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>Sede en Mantenimiento (Reservas Pausadas)</span>
              </>
            ) : isClosed ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span>Sede Cerrada (No Disponible)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Confirmar Reserva Inmediata</span>
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSwitchToDetailedPlan) onSwitchToDetailedPlan(parking);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer transition hover:underline"
            >
              <span>Prefiero elegir manualmente en el plano 2D</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
