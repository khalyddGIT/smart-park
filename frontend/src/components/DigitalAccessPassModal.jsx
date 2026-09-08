import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { 
  Car, 
  MapPin, 
  Clock, 
  Copy, 
  Check, 
  Printer, 
  Compass, 
  ExternalLink,
  Camera,
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  FileText,
  QrCode,
  Sparkles
} from 'lucide-react';

import { parseIsoToDate } from '../context/EstablishmentContext';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation, onReservationUpdated }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);
  const [localActualEntry, setLocalActualEntry] = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    if (reservation) {
      setLocalStatus(reservation.status?.toLowerCase() || 'scheduled');
      setLocalActualEntry(reservation.actual_entry || reservation.actualEntry || null);
    }
  }, [reservation]);

  const passData = useMemo(() => {
    if (!reservation) return null;
    
    const dbId = reservation.id;
    const id = reservation.code || (dbId ? `RSV-${dbId}` : 'RSV-8912');
    const token = reservation.token || reservation.qr_code || `SPK-${String(id).replace('RSV-', '')}-7B2F9A`;
    const parkingName = reservation.parking || reservation.parkingName || 'Smart Park Central';
    const slotCode = reservation.slot || reservation.slotCode || 'A-01';
    const plate = reservation.plate || reservation.license_plate || 'ABC-123';
    const hours = Number(reservation.hours || 2);
    const cost = Number(reservation.cost || reservation.totalCost || reservation.total_cost || 10.0);
    const vehicleCategory = reservation.vehicleCategory || reservation.slotType || 'Auto';
    const toleranceMinutes = Number(reservation.arrivalWindow || reservation.tolerance || reservation.toleranceMinutes || reservation.tolerance_minutes || 15);
    const parkingAddress = reservation.parkingAddress || reservation.address || reservation.parking_address || 'Ayacucho - Huamanga';
    const mapsUrl = reservation.mapsUrl || reservation.maps_url || null;
    const latitude = reservation.latitude || reservation.lat || null;
    const longitude = reservation.longitude || reservation.lng || null;
    
    const startTime = parseIsoToDate(reservation.startTime || reservation.start_time);
    
    // Tolerancia de llegada (Fase 1: fecha límite para presentarse en cochera)
    const arrivalDeadline = new Date(startTime.getTime() + toleranceMinutes * 60 * 1000);
    
    // Estadía real (Fase 2: arranca al momento de la entrada real)
    const entryTime = localActualEntry ? parseIsoToDate(localActualEntry) : startTime;
    const stayExpiresAt = new Date(entryTime.getTime() + hours * 60 * 60 * 1000);

    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(id)}`;
    const qrPayload = verifyUrl;

    const isPrepaid = !!(
      reservation.prepaid || 
      reservation.payNow || 
      (typeof reservation.paymentMethod === 'string' && (
        reservation.paymentMethod.toLowerCase().includes('pagado') ||
        reservation.paymentMethod.toLowerCase().includes('culqi') ||
        reservation.paymentMethod.toLowerCase().includes('paypal') ||
        reservation.paymentMethod.toLowerCase().includes('tarjeta')
      ))
    );

    return {
      dbId,
      id,
      token,
      parkingName,
      parkingAddress,
      mapsUrl,
      latitude,
      longitude,
      slotCode,
      plate,
      hours,
      cost,
      vehicleCategory,
      toleranceMinutes,
      startTime,
      arrivalDeadline,
      entryTime,
      stayExpiresAt,
      qrPayload,
      isPrepaid
    };
  }, [reservation, localActualEntry]);

  const [secondsRemaining, setSecondsRemaining] = useState(null);

  // Temporizador dinámico según la fase (Fase 1: Llegada / Fase 2: Estadía)
  useEffect(() => {
    if (!passData) return;

    // Si la reserva está cancelada o completada, NO debe correr ningún temporizador
    if (localStatus === 'cancelled' || localStatus === 'completed') {
      setTimeLeft(localStatus === 'cancelled' ? 'Cancelada' : 'Finalizada');
      setSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const isScheduled = localStatus === 'scheduled';
      const targetDeadline = isScheduled ? passData.arrivalDeadline.getTime() : passData.stayExpiresAt.getTime();
      const difference = targetDeadline - now;

      if (difference <= 0) {
        setTimeLeft(isScheduled ? 'Tolerancia vencida' : '00:00:00');
        setSecondsRemaining(0);
        return;
      }

      const totalSec = Math.max(0, Math.floor(difference / 1000));
      setSecondsRemaining(totalSec);

      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [passData, localStatus]);

  if (!passData) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(passData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintPass = () => {
    window.print();
  };

  const openGoogleMaps = () => {
    if (passData.mapsUrl) {
      window.open(passData.mapsUrl, '_blank');
      return;
    }
    const query = (passData.latitude && passData.longitude)
      ? `${passData.latitude},${passData.longitude}`
      : encodeURIComponent(`${passData.parkingName} ${passData.parkingAddress || ''} Ayacucho Peru`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // Cancelar Reserva Justa (Libera el cajón sin penalidad dentro de la tolerancia)
  const handleCancelReservation = async () => {
    if (!passData.dbId) {
      setLocalStatus('cancelled');
      onClose();
      return;
    }
    if (!window.confirm('¿Deseas cancelar esta reserva? La plaza se liberará inmediatamente para otros conductores.')) return;
    setIsUpdating(true);
    try {
      const res = await api.put(`/reservations/${passData.dbId}/cancel`);
      setLocalStatus('cancelled');
      if (onReservationUpdated) onReservationUpdated(res.data);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      alert(err?.response?.data?.detail || 'No se pudo cancelar la reserva.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Check-in (Registrar Ingreso y arrancar tiempo real de estadía)
  const handleCheckIn = async () => {
    if (!passData.dbId) {
      const now = new Date().toISOString();
      setLocalStatus('active');
      setLocalActualEntry(now);
      return;
    }
    setIsUpdating(true);
    try {
      const res = await api.put(`/reservations/${passData.dbId}/check-in`);
      setLocalStatus('active');
      setLocalActualEntry(res.data.actual_entry || new Date().toISOString());
      if (onReservationUpdated) onReservationUpdated(res.data);
    } catch (err) {
      const now = new Date().toISOString();
      setLocalStatus('active');
      setLocalActualEntry(now);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check-out (Registrar Salida)
  const handleCheckOut = async () => {
    if (!passData.dbId) {
      setLocalStatus('completed');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await api.put(`/reservations/${passData.dbId}/check-out`);
      setLocalStatus('completed');
      if (onReservationUpdated) onReservationUpdated(res.data);
    } catch (err) {
      setLocalStatus('completed');
    } finally {
      setIsUpdating(false);
    }
  };

  const isScheduled = localStatus === 'scheduled';
  const isActive = localStatus === 'active';
  const isCompleted = localStatus === 'completed';
  const isCancelled = localStatus === 'cancelled';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md w-[95vw] rounded-2xl sm:rounded-3xl p-0 overflow-y-auto max-h-[92vh] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        
        {/* Estilos para impresión limpia del pase */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            #digital-access-pass-card, #digital-access-pass-card * { visibility: visible !important; }
            #digital-access-pass-card { position: fixed !important; left: 0; top: 0; width: 100% !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
          }
        `}} />

        {/* Encabezado Ejecutivo del Pase */}
        <div className={`px-5 py-3.5 flex justify-between items-center border-b ${
          isCancelled 
            ? 'bg-rose-950 text-white border-rose-900/60' 
            : isCompleted
            ? 'bg-slate-900 text-white border-slate-800'
            : isActive
            ? 'bg-emerald-950 text-white border-emerald-900/60'
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">{passData.parkingName}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> 
              <span className="truncate max-w-[190px] sm:max-w-xs">{passData.parkingAddress || 'Ayacucho - Huamanga'}</span>
            </p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 ${
            isCancelled 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
              : isCompleted 
              ? 'bg-slate-800 text-slate-300 border border-slate-700' 
              : isActive 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-emerald-400 animate-pulse' : isScheduled ? 'bg-cyan-400 animate-pulse' : isCancelled ? 'bg-rose-400' : 'bg-slate-400'
            }`}></span>
            <span>{isActive ? 'En estancia' : isScheduled ? 'En ruta' : isCancelled ? 'Cancelada' : 'Finalizada'}</span>
          </span>
        </div>

        <div className="p-4 space-y-3">

          {/* Tarjeta Pase Digital Tipo Boarding Pass */}
          <div 
            id="digital-access-pass-card"
            className="relative bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 shadow-sm"
          >
            {/* Header del Ticket */}
            <div className="flex items-center justify-between pb-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">
                  SP
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] tracking-tight">
                  PASE DIGITAL DE ACCESO
                </span>
              </div>
              <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs">
                {passData.id}
              </span>
            </div>

            {/* Código QR Hero */}
            <div className="pt-3 pb-2 text-center flex flex-col items-center justify-center">
              {isCancelled ? (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800/80 inline-block shadow-xs">
                  <div className="relative">
                    <div className="opacity-20 filter grayscale">
                      <QRCodeSVG
                        value="RESERVA_CANCELADA_SIN_VALIDEZ"
                        size={125}
                        level="Q"
                        fgColor="#991b1b"
                        bgColor="#ffffff"
                      />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                        <XCircle className="w-6 h-6 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : isCompleted ? (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 inline-block shadow-xs opacity-60">
                  <QRCodeSVG
                    value={passData.qrPayload}
                    size={120}
                    level="Q"
                    fgColor="#475569"
                    bgColor="#ffffff"
                  />
                </div>
              ) : (
                <div ref={qrRef} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 inline-block shadow-xs transition hover:shadow-sm">
                  <QRCodeSVG
                    value={passData.qrPayload}
                    size={130}
                    level="Q"
                    includeMargin={false}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                </div>
              )}

              {/* Token con Botón de Copiado Directo */}
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={isCancelled}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-mono font-bold shadow-2xs transition cursor-pointer group"
                  title="Clic para copiar token"
                >
                  <span>Token: {passData.token}</span>
                  {copied ? (
                    <span className="inline-flex items-center text-emerald-600 text-[10px] gap-0.5">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isCancelled 
                  ? 'Pase inhabilitado · Reserva anulada' 
                  : isCompleted 
                  ? 'Estancia completada · Vehículo retirado' 
                  : 'Escanea en el tótem o presenta al operador de garita'}
              </p>
            </div>

            {/* Aviso Preventivo Compacto de Tolerancia (solo reservas en ruta) */}
            {isScheduled && secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 600 && (
              <div className={`my-2 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                secondsRemaining <= 300 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-300' 
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-300'
              }`}>
                <AlertCircle className={`w-4 h-4 shrink-0 ${secondsRemaining <= 300 ? 'text-rose-600' : 'text-amber-600'}`} />
                <div className="leading-snug">
                  <span className="font-bold">
                    {secondsRemaining <= 300 ? '¡Tiempo crítico de llegada!' : 'Llegada requerida en curso:'}
                  </span>{' '}
                  <span>
                    Faltan {Math.ceil(secondsRemaining / 60)} min antes de que el cajón sea liberado.
                  </span>
                </div>
              </div>
            )}

            {/* Separador Perforado */}
            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-2.5"></div>

            {/* Grid 2x2 de Datos Esenciales */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Cajón Asignado</span>
                <p className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {passData.slotCode}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Placa Registrada</span>
                <p className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {passData.plate}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                  {isActive ? 'Tiempo en Estadía' : isScheduled ? 'Tiempo para llegar' : 'Estado'}
                </span>
                <p className={`font-mono font-bold text-sm mt-0.5 ${
                  isCancelled ? 'text-rose-600' : isCompleted ? 'text-slate-600' : 'text-slate-900 dark:text-white'
                }`}>
                  {isCancelled ? 'Cancelada' : isCompleted ? 'Finalizada' : timeLeft || '--:--:--'}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                  {isScheduled ? `Tol: ${passData.toleranceMinutes} min (Hasta ${passData.arrivalDeadline ? passData.arrivalDeadline.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'})` : `${passData.hours}h contratadas`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Total de Reserva</span>
                <p className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {isCancelled ? 'S/ 0.00' : `S/ ${passData.cost.toFixed(2)}`}
                </p>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                  {isCancelled ? 'Anulada' : passData.isPrepaid ? '✓ Prepagado' : 'Pago en garita'}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción Operativa */}
          {isScheduled && (
            <Button
              type="button"
              onClick={handleCheckIn}
              disabled={isUpdating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition active:scale-[0.99]"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>Marcar Ingreso / Abrir Barrera</span>
            </Button>
          )}

          {isActive && (
            <Button
              type="button"
              onClick={handleCheckOut}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Registrar Salida / Check-out</span>
            </Button>
          )}

          {/* Navegación Google Maps Exclusiva (Waze eliminado) */}
          {!isCancelled && !isCompleted && (
            <button
              type="button"
              onClick={openGoogleMaps}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cómo llegar con Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          {/* Acciones Secundarias */}
          <div className="flex gap-2 pt-0.5">
            <Button
              type="button"
              onClick={handlePrintPass}
              variant="outline"
              className="flex-1 text-xs font-semibold gap-1.5 rounded-xl h-9.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir Pase</span>
            </Button>

            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold h-9.5 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Cerrar
            </Button>
          </div>

          {/* Enlace discreto de Cancelar Reserva (solo si está programada) */}
          {isScheduled && (
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={handleCancelReservation}
                disabled={isUpdating}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition cursor-pointer font-medium"
              >
                Cancelar reserva sin penalidad
              </button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
