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
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  QrCode,
  Sparkles,
  Download,
  Crown,
  Calendar,
  Zap
} from 'lucide-react';

import { parseIsoToDate } from '../context/EstablishmentContext';
import { BrandIcon } from './BrandLogo';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation, onReservationUpdated }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);
  const [localActualEntry, setLocalActualEntry] = useState(null);
  const [liveBanner, setLiveBanner] = useState(null);
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeSecs, setOvertimeSecs] = useState(0);
  const [dynamicCost, setDynamicCost] = useState(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    if (reservation) {
      setLocalStatus(reservation.status?.toLowerCase() || 'scheduled');
      setLocalActualEntry(reservation.actual_entry || reservation.actualEntry || null);
      setIsOvertime(Boolean(reservation.is_overtime));
      if (reservation.total_cost || reservation.totalCost || reservation.cost) {
        setDynamicCost(Number(reservation.total_cost || reservation.totalCost || reservation.cost));
      }
    }
  }, [reservation]);

  // Sincronización instantánea vía WebSocket (smart_park_reservation_live)
  useEffect(() => {
    if (!isOpen) return;

    const playSuccessChime = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch {}
    };

    const handleLiveEvent = (ev) => {
      const detail = ev.detail;
      if (!detail || !reservation) return;

      const currentDbId = reservation.id;
      const currentCode = reservation.code;

      const matches = (
        (detail.reservation_id && currentDbId && String(detail.reservation_id) === String(currentDbId)) ||
        (detail.code && currentCode && String(detail.code).trim().toLowerCase() === String(currentCode).trim().toLowerCase())
      );

      if (!matches) return;

      if (detail.reservation_status === 'active') {
        setLocalStatus('active');
        const entryTime = detail.actual_entry || new Date().toISOString();
        setLocalActualEntry(entryTime);

        if (detail.is_overtime) {
          setIsOvertime(true);
          if (detail.new_total_cost) {
            setDynamicCost(Number(detail.new_total_cost));
          }
          setLiveBanner(`Estadía vencida (+${detail.overtime_minutes || 0}m). Monto actual: S/ ${Number(detail.new_total_cost || 0).toFixed(2)}.`);
        } else if (detail.minutes_remaining !== undefined && detail.minutes_remaining <= 15) {
          setIsExpiringSoon(true);
          setLiveBanner(`Atención: Tu estadía finaliza en ${detail.minutes_remaining} min. Sin periodo de gracia.`);
        } else {
          playSuccessChime();
          try {
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 150]);
          } catch {}
          setLiveBanner('Ingreso registrado • En estadía');
          setTimeout(() => setLiveBanner(null), 6000);
        }

        onReservationUpdated?.({
          ...reservation,
          status: 'active',
          actual_entry: entryTime,
          is_overtime: detail.is_overtime,
          total_cost: detail.new_total_cost || reservation.total_cost
        });
      } else if (detail.reservation_status === 'completed') {
        setLocalStatus('completed');
        setIsOvertime(false);
        setIsExpiringSoon(false);
        playSuccessChime();
        try {
          if ('vibrate' in navigator) navigator.vibrate(200);
        } catch {}
        setLiveBanner('Salida confirmada • ¡Buen viaje!');
        setTimeout(() => setLiveBanner(null), 6000);
        onReservationUpdated?.({
          ...reservation,
          status: 'completed',
          actual_exit: detail.actual_exit || new Date().toISOString(),
          amount_paid: detail.amount_paid
        });
      } else if (detail.reservation_status === 'cancelled') {
        setLocalStatus('cancelled');
        setIsOvertime(false);
        setIsExpiringSoon(false);
        setLiveBanner('Reserva anulada');
        setTimeout(() => setLiveBanner(null), 5000);
        onReservationUpdated?.({
          ...reservation,
          status: 'cancelled'
        });
      }
    };

    window.addEventListener('smart_park_reservation_live', handleLiveEvent);
    return () => window.removeEventListener('smart_park_reservation_live', handleLiveEvent);
  }, [isOpen, reservation, onReservationUpdated]);

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

    const reservationType = String(reservation.reservation_type || reservation.reservationType || 'immediate').toLowerCase();
    const isSubscription = Boolean(reservation.is_subscription || reservation.isSubscription || reservationType === 'subscription');
    const subscriptionMonths = Number(reservation.subscription_months || reservation.subscriptionMonths || 1);
    const isAdvance = reservationType === 'advance';
    const expiresAt = parseIsoToDate(reservation.expiresAt || reservation.end_time || reservation.expires_at);

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
      expiresAt,
      qrPayload,
      isPrepaid,
      reservationType,
      isSubscription,
      subscriptionMonths,
      isAdvance
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

      // Modalidad 1: Abonado Mensual (30 días de cobertura continua)
      if (passData.isSubscription) {
        const diffSub = (passData.expiresAt ? passData.expiresAt.getTime() : (passData.startTime.getTime() + 30*24*60*60*1000)) - now;
        if (diffSub <= 0) {
          setTimeLeft('Membresía vencida');
          setSecondsRemaining(0);
        } else {
          const days = Math.floor(diffSub / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffSub % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          setTimeLeft(`${days}d ${hours}h`);
          setSecondsRemaining(Math.floor(diffSub / 1000));
        }
        return;
      }

      // Modalidad 2: Fecha Adelantada antes de la hora pactada
      if (passData.isAdvance && localStatus === 'scheduled') {
        const diffToStart = passData.startTime.getTime() - now;
        if (diffToStart > 0) {
          const days = Math.floor(diffToStart / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diffToStart % (1000 * 60 * 60)) / (1000 * 60));
          if (days > 0) {
            setTimeLeft(`En ${days}d ${hours}h`);
          } else {
            setTimeLeft(`En ${hours}h ${mins}m`);
          }
          setSecondsRemaining(Math.floor(diffToStart / 1000));
          return;
        }
      }

      const isScheduled = localStatus === 'scheduled';
      const targetDeadline = isScheduled ? passData.arrivalDeadline.getTime() : passData.stayExpiresAt.getTime();
      const difference = targetDeadline - now;

      if (difference <= 0) {
        if (isScheduled) {
          setTimeLeft('Tolerancia vencida');
          setSecondsRemaining(0);
          setIsOvertime(false);
          setIsExpiringSoon(false);
          return;
        } else {
          // Fase 2 (Estadía activa): Excedido el tiempo contratado sin periodo de gracia
          const overtimeSec = Math.abs(Math.floor(difference / 1000));
          setIsOvertime(true);
          setIsExpiringSoon(false);
          setOvertimeSecs(overtimeSec);
          setSecondsRemaining(0);
          const oH = Math.floor(overtimeSec / 3600);
          const oM = Math.floor((overtimeSec % 3600) / 60);
          const oS = overtimeSec % 60;
          setTimeLeft(`+${String(oH).padStart(2, '0')}:${String(oM).padStart(2, '0')}:${String(oS).padStart(2, '0')}`);

          // Cálculo incremental dinámico en vivo (por hora o fracción)
          const baseHours = Math.max(1, passData.hours || 1);
          const hourlyRate = (passData.cost || 5) / baseHours;
          const extraHours = Math.max(1, Math.ceil(overtimeSec / 3600));
          const calculatedTotal = passData.cost + (extraHours * hourlyRate);
          setDynamicCost(prev => Math.max(prev || passData.cost, calculatedTotal));
          return;
        }
      }

      setIsOvertime(false);
      const totalSec = Math.max(0, Math.floor(difference / 1000));
      setSecondsRemaining(totalSec);

      // Si es estadía activa y quedan 15 minutos o menos
      if (!isScheduled && totalSec <= 15 * 60) {
        setIsExpiringSoon(true);
      } else {
        setIsExpiringSoon(false);
      }

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

  // Descarga del Pase QR offline en PNG para mostrarlo sin conexión en garita
  const handleDownloadOfflinePass = () => {
    if (!qrRef.current) return;
    const svgEl = qrRef.current.querySelector('svg');
    if (!svgEl) return;

    let svgData = new XMLSerializer().serializeToString(svgEl);
    if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"') && !svgData.includes("xmlns='http://www.w3.org/2000/svg'")) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgData.includes('width=')) {
      svgData = svgData.replace('<svg', '<svg width="200" height="200"');
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 400;
    canvas.height = 560;

    img.onload = () => {
      // Fondo oscuro elegante
      ctx.fillStyle = '#0f172a';
      if (ctx.roundRect) ctx.roundRect(0, 0, 400, 560, 24);
      else ctx.rect(0, 0, 400, 560);
      ctx.fill();

      // Header
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('SMART PARK · PASE DIGITAL OFFLINE', 28, 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      const pName = passData.parkingName.length > 24 ? passData.parkingName.slice(0, 24) + '...' : passData.parkingName;
      ctx.fillText(pName, 28, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      const pAddr = (passData.parkingAddress || 'Ayacucho - Huamanga').slice(0, 36);
      ctx.fillText(pAddr, 28, 90);

      // Línea divisoria punteada
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(380, 110);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marco contenedor del QR
      ctx.fillStyle = '#ffffff';
      if (ctx.roundRect) ctx.roundRect(85, 125, 230, 230, 16);
      else ctx.rect(85, 125, 230, 230);
      ctx.fill();

      // QR Code
      ctx.drawImage(img, 100, 140, 200, 200);

      // Token
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TOKEN: ${passData.token}`, 200, 380);

      // Card de datos
      ctx.fillStyle = '#1e293b';
      if (ctx.roundRect) ctx.roundRect(28, 400, 344, 95, 12);
      else ctx.rect(28, 400, 344, 95);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('PLACA', 45, 425);
      ctx.fillText('CAJÓN', 140, 425);
      ctx.fillText('CÓDIGO', 225, 425);
      ctx.fillText(passData.isSubscription ? 'MODALIDAD' : 'TOLERANCIA', 305, 425);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(passData.plate, 45, 447);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(passData.slotCode, 140, 447);
      ctx.fillText(passData.id, 225, 447);

      ctx.fillStyle = passData.isSubscription ? '#f59e0b' : '#10b981';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(passData.isSubscription ? 'Abonado 30d' : `${passData.toleranceMinutes} min`, 305, 447);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(`Emitido: ${new Date().toLocaleDateString('es-PE')} · Válido para escanear en garita`, 45, 478);

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('Pase digital guardado · Funciona 100% offline en caseta', 200, 532);

      const a = document.createElement('a');
      a.download = `smartpark_pase_${passData.plate}_${passData.id}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
  };

  // Cancelar Reserva Justa (Libera el cajón sin penalidad dentro de la tolerancia)
  const handleCancelReservation = async () => {
    if (!passData.dbId) {
      setLocalStatus('cancelled');
      onClose();
      return;
    }
    if (!window.confirm('¿Cancelar reserva? Se liberará la plaza para otros conductores.')) return;
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
            : passData.isSubscription
            ? 'bg-amber-950 text-white border-amber-900/60'
            : passData.isAdvance
            ? 'bg-sky-950 text-white border-sky-900/60'
            : isActive
            ? 'bg-emerald-950 text-white border-emerald-900/60'
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <BrandIcon className="w-8 h-8 shrink-0" />
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">{passData.parkingName}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> 
                <span className="truncate max-w-[180px] sm:max-w-xs">{passData.parkingAddress || 'Ayacucho - Huamanga'}</span>
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 ${
            isCancelled 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
              : isCompleted 
              ? 'bg-slate-800 text-slate-300 border border-slate-700' 
              : passData.isSubscription
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : passData.isAdvance
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : isActive 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          }`}>
            {passData.isSubscription ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Abonado 30d</span>
              </>
            ) : passData.isAdvance ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Programada</span>
              </>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-emerald-400 animate-pulse' : isScheduled ? 'bg-cyan-400 animate-pulse' : isCancelled ? 'bg-rose-400' : 'bg-slate-400'
                }`}></span>
                <span>{isActive ? 'En estancia' : isScheduled ? 'En ruta' : isCancelled ? 'Cancelada' : 'Finalizada'}</span>
              </>
            )}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {liveBanner && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              isOvertime 
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300' 
                : isExpiringSoon 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300' 
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            }`}>
              {isOvertime ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              ) : isExpiringSoon ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              )}
              <span className="font-semibold">{liveBanner}</span>
            </div>
          )}

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
                  Pase de Acceso
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
              ) : (
                <div 
                  ref={qrRef}
                  className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 inline-block shadow-md hover:scale-[1.02] transition-transform duration-300"
                >
                  <QRCodeSVG
                    value={passData.qrPayload}
                    size={135}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><circle cx='12' cy='12' r='12'/></svg>",
                      height: 18,
                      width: 18,
                      excavate: true,
                    }}
                  />
                </div>
              )}

              {/* Botón Token Copiable */}
              <div className="mt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition cursor-pointer group"
                >
                  <span>{passData.token}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isCancelled 
                  ? 'Reserva anulada' 
                  : isCompleted 
                  ? 'Estancia finalizada' 
                  : 'Muestra este código en garita'}
              </p>
            </div>

            {/* Tolerancia / Abono / Reserva Programada */}
            {passData.isSubscription ? (
              <div className="my-2 p-3 rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Abonado Mensual Activo</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-[11px]">
                    {timeLeft || '30 días'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight">
                  Cajón exclusivo 24/7. Exento de tolerancia y límites de estadía por hora.
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Vencimiento del pase:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {passData.expiresAt ? passData.expiresAt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '30 días'}
                  </span>
                </div>
              </div>
            ) : passData.isAdvance && passData.startTime && new Date() < passData.startTime ? (
              <div className="my-2 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Llegada Programada</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-[11px]">
                    {timeLeft || 'Programada'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300/90 leading-tight">
                  Fecha pactada: <strong className="font-semibold">{passData.startTime.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}</strong> a las <strong className="font-semibold">{passData.startTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>La tolerancia de 15 min iniciará en la fecha pactada.</span>
                </div>
              </div>
            ) : isScheduled && secondsRemaining !== null && (() => {
              const toleranceTotalSec = (passData.toleranceMinutes || 15) * 60;
              const toleranceProgressPct = Math.max(0, Math.min(100, Math.round((secondsRemaining / toleranceTotalSec) * 100)));
              const isToleranceCritical = toleranceProgressPct <= 20;
              const isToleranceWarning = toleranceProgressPct <= 50 && toleranceProgressPct > 20;
              const toleranceBarColor = isToleranceCritical 
                ? 'bg-rose-500 animate-pulse' 
                : isToleranceWarning 
                ? 'bg-amber-500' 
                : 'bg-emerald-500';

              return (
                <div className={`my-2 p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                  isToleranceCritical 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-300' 
                    : isToleranceWarning 
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-300'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-300'
                }`}>
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${
                        isToleranceCritical ? 'text-rose-600' : isToleranceWarning ? 'text-amber-600' : 'text-emerald-600'
                      }`} />
                      <span>Tolerancia de llegada:</span>
                    </div>
                    <span className="font-mono font-bold">
                      {timeLeft || '--:--'}
                    </span>
                  </div>

                  {/* Barra de Progreso Dinámica */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${toleranceBarColor}`}
                      style={{ width: `${toleranceProgressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] opacity-90">
                    <span>
                      {isToleranceCritical 
                        ? 'Tiempo límite por vencer'
                        : isToleranceWarning 
                        ? 'Acércate a la cochera'
                        : 'En tiempo de llegada'}
                    </span>
                    <span className="font-mono font-bold">{toleranceProgressPct}%</span>
                  </div>
                </div>
              );
            })()}

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

              <div className={`p-2.5 rounded-xl border transition-colors ${
                isOvertime 
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' 
                  : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700'
              }`}>
                <span className={`text-[10px] block font-medium ${
                  isOvertime ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {isOvertime ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 inline shrink-0" />
                      <span>Tiempo Excedido</span>
                    </span>
                  ) : passData.isSubscription ? (
                    'Vigencia Restante'
                  ) : isActive ? (
                    'Tiempo en Estadía'
                  ) : isScheduled ? (
                    passData.isAdvance && passData.startTime && new Date() < passData.startTime ? 'Llegada Pactada' : 'Tiempo para llegar'
                  ) : 'Estado'}
                </span>
                <p className={`font-mono font-black text-sm mt-0.5 ${
                  isOvertime ? 'text-amber-600 dark:text-amber-400 animate-pulse' : isCancelled ? 'text-rose-600' : isCompleted ? 'text-slate-600' : 'text-slate-900 dark:text-white'
                }`}>
                  {isCancelled ? 'Cancelada' : isCompleted ? 'Finalizada' : timeLeft || '--:--:--'}
                </p>
                <span className={`text-[10px] block truncate ${
                  isOvertime ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {passData.isSubscription
                    ? `Expira: ${passData.expiresAt ? passData.expiresAt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '30 días'}`
                    : isOvertime
                    ? 'Sin periodo de gracia'
                    : isScheduled
                    ? passData.isAdvance && passData.startTime && new Date() < passData.startTime
                      ? `${passData.startTime.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} ${passData.startTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : `Llegada hasta ${passData.arrivalDeadline ? passData.arrivalDeadline.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}`
                    : `Estadía: ${passData.hours}h`}
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border transition-colors ${
                isOvertime 
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' 
                  : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700'
              }`}>
                <span className={`text-[10px] block font-medium ${
                  isOvertime ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {passData.isSubscription ? 'Abono Mensual' : isOvertime ? 'Total Acumulado' : 'Total de Reserva'}
                </span>
                <p className={`font-mono font-black text-sm mt-0.5 ${
                  isOvertime ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {isCancelled ? 'S/ 0.00' : `S/ ${(isOvertime && dynamicCost ? dynamicCost : passData.cost).toFixed(2)}`}
                </p>
                <span className={`text-[10px] font-semibold block ${
                  isOvertime ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isCancelled ? 'Anulada' : passData.isSubscription ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600 inline shrink-0" />
                      <span>{passData.subscriptionMonths || 1} Mes(es) Activo</span>
                    </span>
                  ) : isOvertime ? 'En aumento dinámico' : passData.isPrepaid ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600 inline shrink-0" />
                      <span>Prepagado</span>
                    </span>
                  ) : 'Pago en garita'}
                </span>
              </div>
            </div>

            {/* Aviso Dinámico de Estadía por Vencer (<= 15 min) */}
            {isExpiringSoon && !isOvertime && isActive && (
              <div className="my-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <div className="text-[11px] font-medium leading-tight">
                  <strong className="font-bold text-amber-900 dark:text-amber-300 block">Tu tiempo contratado está por vencer</strong>
                  No existe periodo de gracia. Al cumplirse el tiempo, el monto se incrementará automáticamente.
                </div>
              </div>
            )}

            {/* Aviso Dinámico de Estadía Excedida (Overtime Activo) */}
            {isOvertime && isActive && (
              <div className="my-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Estadía Excedida — Cobro en Curso</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-300/90 font-medium">
                  Has superado el tiempo contratado. Sin periodo de gracia: el monto acumulado continuará aumentando en tiempo real según la tarifa oficial de la cochera hasta que registres tu salida.
                </p>
              </div>
            )}
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
              <span>Marcar Ingreso</span>
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
              <span>Registrar Salida</span>
            </Button>
          )}

          {/* Navegación GPS Directa con 1 Toque: Google Maps */}
          {!isCancelled && !isCompleted && (
            <button
              type="button"
              onClick={openGoogleMaps}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs group"
            >
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Abrir navegación en Google Maps</span>
            </button>
          )}

          {/* Acciones Secundarias con Descarga Offline PNG */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <Button
              type="button"
              onClick={handleDownloadOfflinePass}
              variant="outline"
              className="text-[11px] font-bold gap-1 rounded-xl h-9 px-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
              title="Descargar imagen PNG para mostrar sin internet en garita"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Guardar PNG</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrintPass}
              variant="outline"
              className="text-[11px] font-semibold gap-1 rounded-xl h-9 px-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              title="Imprimir pase en papel o PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Imprimir</span>
            </Button>

            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold h-9 rounded-xl text-xs cursor-pointer shadow-sm"
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
                Cancelar reserva
              </button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
