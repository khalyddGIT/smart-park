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
  Navigation, 
  Camera,
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';

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
    const toleranceMinutes = Number(reservation.arrivalWindow || reservation.tolerance || 15);
    
    const startTime = reservation.startTime ? new Date(reservation.startTime) : new Date();
    
    // Tolerancia de llegada (Fase 1: fecha límite para presentarse en cochera)
    const arrivalDeadline = new Date(startTime.getTime() + toleranceMinutes * 60 * 1000);
    
    // Estadía real (Fase 2: arranca al momento de la entrada real)
    const entryTime = localActualEntry ? new Date(localActualEntry) : startTime;
    const stayExpiresAt = new Date(entryTime.getTime() + hours * 60 * 60 * 1000);

    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(id)}`;
    const qrPayload = verifyUrl;

    return {
      dbId,
      id,
      token,
      parkingName,
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
      qrPayload
    };
  }, [reservation, localActualEntry]);

  const [secondsRemaining, setSecondsRemaining] = useState(null);

  // Temporizador dinámico según la fase (Fase 1: Llegada / Fase 2: Estadía)
  useEffect(() => {
    if (!passData) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const isScheduled = localStatus === 'scheduled';
      const targetDeadline = isScheduled ? passData.arrivalDeadline.getTime() : passData.stayExpiresAt.getTime();
      const difference = targetDeadline - now;

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        setSecondsRemaining(0);
        return;
      }

      const sec = Math.floor(difference / 1000);
      setSecondsRemaining(sec);

      const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((difference % (1000 * 60)) / (1000 * 60));
      const s = Math.floor((difference % (1000 * 60)) / 1000);

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
    const query = encodeURIComponent(`${passData.parkingName} Ayacucho Peru`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const openWaze = () => {
    const query = encodeURIComponent(`${passData.parkingName} Ayacucho Peru`);
    window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank');
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
      <DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 overflow-y-auto max-h-[90vh] border-slate-200 bg-white shadow-2xl">
        
        {/* Encabezado */}
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white">{passData.parkingName}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
              <span>Portal Unión 42, Centro Histórico</span>
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300">
            {isActive ? 'En estancia' : isScheduled ? 'En ruta' : isCancelled ? 'Cancelado' : 'Finalizado'}
          </span>
        </div>

        <div className="p-4 space-y-3.5">

          {/* Código QR */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center flex flex-col items-center justify-center">
            <div ref={qrRef} className="p-2 bg-white rounded-lg border border-slate-200 inline-block shadow-xs">
              <QRCodeSVG
                value={passData.qrPayload}
                size={135}
                level="Q"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-xs font-mono font-bold text-slate-800 mt-2">
              Token: {passData.token}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Escanea en el tótem o muestra al operador de garita
            </p>
          </div>

          {/* Banner de Advertencia Preventiva 10 a 5 minutos antes */}
          {isScheduled && secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 600 && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              secondsRemaining <= 300 
                ? 'bg-rose-50 border-rose-300 text-rose-900' 
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${secondsRemaining <= 300 ? 'text-rose-600' : 'text-amber-600'}`} />
              <div>
                <p className="font-bold">
                  {secondsRemaining <= 300 
                    ? `¡Atención urgente! Faltan menos de ${Math.max(1, Math.ceil(secondsRemaining / 60))} min` 
                    : `Llegada requerida: ${Math.ceil(secondsRemaining / 60)} min restantes`}
                </p>
                <p className={`text-[11px] mt-0.5 leading-snug ${secondsRemaining <= 300 ? 'text-rose-800' : 'text-amber-800'}`}>
                  Si no te presentas en garita a tiempo, tu reserva se cancelará automáticamente y tu cajón será liberado.
                </p>
              </div>
            </div>
          )}

          {/* Datos de la Reserva y Cronómetro Inteligente */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Cajón Asignado</span>
              <p className="text-base font-mono font-bold text-slate-900 mt-0.5">{passData.slotCode}</p>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Placa Registrada</span>
              <p className="text-base font-mono font-bold text-slate-900 mt-0.5">{passData.plate}</p>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Código Reserva</span>
              <p className="font-mono font-semibold text-slate-800 mt-0.5 truncate">{passData.id}</p>
            </div>

            {/* Tiempo Restante */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-slate-500 block text-[10px]">
                {isActive ? 'Estadía' : isScheduled ? 'Tiempo para llegar' : 'Estado'}
              </span>
              <p className="font-mono font-bold text-sm mt-0.5 text-slate-800">
                {isCompleted ? 'Finalizada' : timeLeft || '--:--:--'}
              </p>
              <span className="text-[10px] text-slate-400 block">
                {isActive 
                  ? `${passData.hours}h contratadas` 
                  : isScheduled 
                  ? `Tolerancia: ${passData.toleranceMinutes} min` 
                  : ''}
              </span>
            </div>
          </div>

          {/* Botones de Acción Operativos */}
          {isScheduled && (
            <div className="space-y-1.5">
              <Button
                type="button"
                onClick={handleCheckIn}
                disabled={isUpdating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Marcar Ingreso / Abrir Barrera</span>
              </Button>

              <button
                type="button"
                onClick={handleCancelReservation}
                disabled={isUpdating}
                className="w-full text-center text-xs text-slate-500 hover:text-rose-600 py-1 font-medium transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Cancelar reserva</span>
              </button>
            </div>
          )}

          {isActive && (
            <Button
              type="button"
              onClick={handleCheckOut}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-slate-300 text-slate-800 hover:bg-slate-100 font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Registrar Salida / Check-out</span>
            </Button>
          )}

          {/* Navegación GPS Directa */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-500 font-semibold block">Navegación:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Compass className="w-4 h-4 text-slate-600" />
                <span>Google Maps</span>
              </button>
              <button
                type="button"
                onClick={openWaze}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-slate-600" />
                <span>Waze</span>
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white text-xs">
            <span className="text-slate-300">Total a pagar en garita:</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              S/ {passData.cost.toFixed(2)}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleCopyCode}
                variant="outline"
                className="w-full text-xs font-semibold gap-1.5 rounded-xl h-9"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
              </Button>

              <Button
                type="button"
                onClick={handlePrintPass}
                variant="outline"
                className="w-full text-xs font-semibold gap-1.5 rounded-xl h-9"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimir</span>
              </Button>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl text-xs"
            >
              Cerrar
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
