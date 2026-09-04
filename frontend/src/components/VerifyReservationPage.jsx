import React, { useEffect, useState, useMemo } from 'react';
import api, { getAccessToken } from '../services/api';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Car, 
  Calendar, 
  Hash, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft,
  RefreshCw,
  User,
  Phone,
  LogIn,
  LogOut,
  Timer
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

// Helper para parsear datetimes ISO con zona horaria UTC explícita
const parseUtcDate = (isoStr) => {
  if (!isoStr) return null;
  const s = String(isoStr).trim();
  if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
};

const formatDateLocal = (d) => {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const formatTimeOnly = (d) => {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const VerifyReservationPage = () => {
  const codeFromPath = typeof window !== 'undefined' 
    ? decodeURIComponent(window.location.pathname.replace(/^\/verify\//, '').split('?')[0].split('#')[0]) 
    : '';
  const code = codeFromPath || '';
  
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Reloj en vivo cada 1 segundo para la cuenta regresiva en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadVerification = () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    api.get(`/reservations/verify/${encodeURIComponent(code)}`)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(err => {
        setError(err?.response?.data?.detail || 'No se pudo verificar la reserva.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadVerification();
  }, [code]);

  // Cálculos de tiempo real con UTC
  const timeMetrics = useMemo(() => {
    if (!data) return null;

    const startTime = parseUtcDate(data.start_time);
    const endTime = parseUtcDate(data.end_time);
    const actualEntry = parseUtcDate(data.actual_entry);
    const actualExit = parseUtcDate(data.actual_exit);
    const toleranceMinutes = Number(data.tolerance_minutes) || 15;
    
    // Tolerancia calculada desde la hora de reserva
    const arrivalDeadline = startTime ? new Date(startTime.getTime() + toleranceMinutes * 60 * 1000) : null;
    
    const statusRaw = (data.status || '').toLowerCase();
    const isScheduled = statusRaw === 'scheduled';
    const isActive = statusRaw === 'active';
    const isCompleted = statusRaw === 'completed';
    const isCancelled = statusRaw === 'cancelled';

    // Segundos restantes para presentarse en garita
    let toleranceSecLeft = 0;
    let isToleranceExpired = false;

    if (isScheduled && arrivalDeadline) {
      const diffMs = arrivalDeadline.getTime() - now;
      toleranceSecLeft = Math.max(0, Math.floor(diffMs / 1000));
      isToleranceExpired = diffMs <= 0;
    }

    // Minutos transcurridos si el vehículo ya ingresó
    let elapsedMinutes = 0;
    if (isActive && (actualEntry || startTime)) {
      const refTime = (actualEntry || startTime).getTime();
      elapsedMinutes = Math.max(0, Math.floor((now - refTime) / 60000));
    }

    return {
      startTime,
      endTime,
      actualEntry,
      actualExit,
      toleranceMinutes,
      arrivalDeadline,
      isScheduled,
      isActive,
      isCompleted,
      isCancelled,
      toleranceSecLeft,
      isToleranceExpired,
      elapsedMinutes
    };
  }, [data, now]);

  // Acciones operativas para garita (Check-in / Check-out)
  const token = getAccessToken();

  const handleCheckIn = async () => {
    if (!data?.id) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await api.put(`/reservations/${data.id}/check-in`);
      setData(prev => ({ 
        ...prev, 
        status: 'active', 
        actual_entry: new Date().toISOString() 
      }));
      setActionFeedback({ type: 'success', text: '✓ Ingreso registrado. Barrera habilitada.' });
    } catch (err) {
      setActionFeedback({ type: 'error', text: err?.response?.data?.detail || 'Error al registrar ingreso en garita.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!data?.id) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await api.put(`/reservations/${data.id}/check-out`);
      setData(prev => ({ 
        ...prev, 
        status: 'completed', 
        actual_exit: new Date().toISOString() 
      }));
      setActionFeedback({ type: 'success', text: '✓ Salida registrada. Cajón liberado.' });
    } catch (err) {
      setActionFeedback({ type: 'error', text: err?.response?.data?.detail || 'Error al registrar salida.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-sm font-bold text-slate-400">Consultando reserva <span className="font-mono text-white">{code}</span> en el servidor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-slate-900 border-rose-800/60 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center mx-auto text-rose-400">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white">Reserva No Encontrada</h1>
          <p className="text-xs text-slate-300 leading-relaxed">{error || 'El código escaneado no coincide con ninguna reserva en el sistema.'}</p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <p className="text-[11px] text-slate-400">Código consultado:</p>
            <p className="font-mono font-bold text-rose-400 text-sm break-all">{code || '—'}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadVerification} variant="outline" className="flex-1 rounded-xl text-xs font-bold gap-2 border-slate-700 text-white hover:bg-slate-800">
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </Button>
            <a href="/" className="flex-1">
              <Button className="w-full rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                <ArrowLeft className="w-3.5 h-3.5" /> Inicio
              </Button>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const {
    startTime,
    endTime,
    actualEntry,
    actualExit,
    toleranceMinutes,
    arrivalDeadline,
    isScheduled,
    isActive,
    isCompleted,
    isCancelled,
    toleranceSecLeft,
    isToleranceExpired,
    elapsedMinutes
  } = timeMetrics;

  // Estado visual
  let statusBadgeColor = 'bg-emerald-500 text-white';
  let statusBadgeText = 'VÁLIDO';
  let statusHeaderTitle = 'Programada — Esperando ingreso';
  let StatusIcon = Clock;
  let cardBorderColor = 'border-emerald-500/40';

  if (isScheduled) {
    if (isToleranceExpired) {
      statusBadgeColor = 'bg-rose-600 text-white';
      statusBadgeText = 'TOLERANCIA VENCIDA';
      statusHeaderTitle = 'Expirada — No ingresó a tiempo';
      StatusIcon = AlertTriangle;
      cardBorderColor = 'border-rose-500/50';
    } else {
      statusBadgeColor = 'bg-emerald-500 text-slate-950 font-black';
      statusBadgeText = 'VÁLIDO';
      statusHeaderTitle = 'Programada — Esperando ingreso';
      StatusIcon = Clock;
      cardBorderColor = 'border-emerald-500/50';
    }
  } else if (isActive) {
    statusBadgeColor = 'bg-blue-500 text-white';
    statusBadgeText = 'EN COCHERA';
    statusHeaderTitle = 'Activa — Vehículo dentro';
    StatusIcon = CheckCircle2;
    cardBorderColor = 'border-blue-500/50';
  } else if (isCompleted) {
    statusBadgeColor = 'bg-slate-600 text-white';
    statusBadgeText = 'FINALIZADO';
    statusHeaderTitle = 'Estadía completada';
    StatusIcon = CheckCircle2;
    cardBorderColor = 'border-slate-700';
  } else if (isCancelled) {
    statusBadgeColor = 'bg-rose-700 text-white';
    statusBadgeText = 'CANCELADO';
    statusHeaderTitle = 'Reserva cancelada';
    StatusIcon = XCircle;
    cardBorderColor = 'border-rose-800/60';
  }

  // Cuenta regresiva formateada
  const countdownMinutes = Math.floor(toleranceSecLeft / 60);
  const countdownSeconds = toleranceSecLeft % 60;

  // Placa formateada con guión para visualización
  const cleanPlate = (data.license_plate || '').trim().toUpperCase();
  const displayPlate = cleanPlate.includes('-') 
    ? cleanPlate 
    : cleanPlate.replace(/^([A-Z0-9]{3})([A-Z0-9]{3})$/, '$1-$2');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-lg space-y-4">
        
        {/* Barra superior con navegación y botón de actualización */}
        <div className="flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Smart Park
          </a>
          <button 
            onClick={loadVerification} 
            title="Actualizar datos"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tarjeta Principal de Inspección */}
        <Card className={`p-5 sm:p-6 space-y-5 bg-slate-900/95 border-2 ${cardBorderColor} rounded-3xl shadow-2xl backdrop-blur-xl`}>
          
          {/* Encabezado de Estado */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Estado de la Reserva
                </p>
                <h1 className="text-base font-black text-white leading-tight">
                  {statusHeaderTitle}
                </h1>
              </div>
            </div>
            <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider shrink-0 shadow-sm ${statusBadgeColor}`}>
              {statusBadgeText}
            </span>
          </div>

          {/* Banner Dinámico de Tiempo Real */}
          {isScheduled && !isToleranceExpired && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Tiempo restante de llegada:
                </span>
                <span className="text-emerald-400 font-black text-sm">
                  {countdownMinutes}m {countdownSeconds < 10 ? '0' : ''}{countdownSeconds}s
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Tolerancia asignada: <strong className="text-white font-mono">{toleranceMinutes} min</strong> · Límite máximo de ingreso: <strong className="text-white font-mono">{formatTimeOnly(arrivalDeadline)}</strong>
              </p>
            </div>
          )}

          {isScheduled && isToleranceExpired && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-700/60 rounded-2xl space-y-1 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Tolerancia de ingreso vencida</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Se excedió la ventana de {toleranceMinutes} minutos permitida (límite fue a las {formatTimeOnly(arrivalDeadline)}). Consulta con el personal de garita.
              </p>
            </div>
          )}

          {isActive && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-2xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-blue-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" /> Vehículo en estancia
                </span>
                <span className="text-blue-400 font-black">
                  {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m transcurridos
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ingreso registrado: <strong className="text-white font-mono">{formatTimeOnly(actualEntry || startTime)}</strong> · Salida programada: <strong className="text-white font-mono">{formatTimeOnly(endTime)}</strong>
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Servicio Completado
              </span>
              <p className="text-[11px] text-slate-400">
                Ingreso: <span className="text-white font-mono">{formatDateLocal(actualEntry || startTime)}</span> · Salida: <span className="text-white font-mono">{formatDateLocal(actualExit || endTime)}</span>
              </p>
            </div>
          )}

          {/* Grid de Datos Reales */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            
            {/* Código */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Código de Reserva
              </p>
              <p className="font-mono font-black text-white text-sm">{data.code}</p>
              <p className="font-mono text-[10px] text-slate-500 truncate" title={data.qr_code}>
                {data.qr_code || '—'}
              </p>
            </div>

            {/* Placa Vehicular Destacada */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Placa Vehicular
              </p>
              <div className="my-1 text-center">
                <span className="inline-block bg-amber-400 text-slate-950 font-mono font-black text-base px-3 py-0.5 rounded-md border-2 border-black/20 shadow-inner tracking-wider">
                  {displayPlate || '—'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-medium capitalize">
                {data.slot_type || 'Vehículo'}
              </p>
            </div>

            {/* Sede y Cajón */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 col-span-2 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Sede y Cajón Asignado
              </p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-sm">
                  {data.parking_name}
                </p>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-400 font-mono font-bold text-xs">
                  Cajón {data.slot_code} ({data.floor_level || 'Piso 1'})
                </span>
              </div>
              {data.parking_address && (
                <p className="text-[11px] text-slate-400">{data.parking_address}</p>
              )}
            </div>

            {/* Titular de la reserva */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 col-span-2 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Titular de la Reserva
              </p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-xs">
                  {data.customer_name || 'Conductor Registrado'}
                </p>
                {data.customer_phone && (
                  <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {data.customer_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Fecha / Hora de Ingreso Real */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Llegada / Inicio
              </p>
              <p className="font-bold text-white text-xs">
                {formatDateLocal(startTime)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {formatTimeOnly(startTime)}
              </p>
            </div>

            {/* Fecha / Hora de Fin */}
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Fin de Estadía
              </p>
              <p className="font-bold text-white text-xs">
                {formatDateLocal(endTime)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {formatTimeOnly(endTime)}
              </p>
            </div>

          </div>

          {/* Tarifa y Total */}
          <div className="flex justify-between items-center bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-400 block">Total de Estadía</span>
              <span className="text-[11px] text-slate-500">Tarifa Sede: S/ {Number(data.hourly_rate || 8.50).toFixed(2)}/h</span>
            </div>
            <span className="text-xl font-black font-mono text-emerald-400">
              S/ {Number(data.total_cost || 0).toFixed(2)}
            </span>
          </div>

          {/* Acciones de Garita (si el operador cuenta con sesión) */}
          {token && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Operaciones en Garita:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {isScheduled && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="col-span-2 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Registrar Ingreso (Check-In)
                  </Button>
                )}

                {isActive && (
                  <Button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="col-span-2 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white gap-2 cursor-pointer shadow-lg shadow-blue-950/50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Registrar Salida (Check-Out)
                  </Button>
                )}
              </div>

              {actionFeedback && (
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 ${actionFeedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'}`}>
                  {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{actionFeedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer de Verificación */}
          <div className="pt-2 text-center space-y-0.5 border-t border-slate-800/50">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Verificación segura contra el servidor en vivo
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Escaneado el {formatDateLocal(new Date(now))}
            </p>
          </div>

        </Card>

      </div>
    </div>
  );
};
