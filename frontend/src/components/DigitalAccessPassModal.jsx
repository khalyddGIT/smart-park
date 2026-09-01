import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Car, 
  MapPin, 
  Clock, 
  Download, 
  Copy, 
  Check,
  CheckCircle2,
  Calendar,
  X,
  Printer,
  Compass,
  Navigation,
  ShieldCheck,
  Zap,
  Percent,
  Wallet,
  Building2,
  Camera
} from 'lucide-react';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const qrRef = useRef(null);

  // Generación y fijación estable del Token y Payload
  const passData = useMemo(() => {
    if (!reservation) return null;
    
    const id = reservation.code || 'RSV-8912';
    const token = reservation.token || reservation.qr_code || `SPK-${id.replace('RSV-', '')}-7B2F9A`;
    const parkingName = reservation.parking || reservation.parkingName || 'Smart Park Plaza Mayor';
    const slotCode = reservation.slot || reservation.slotCode || 'A-01';
    const plate = reservation.plate || reservation.license_plate || 'ABC-123';
    const hours = reservation.hours || 2;
    const cost = Number(reservation.cost || reservation.totalCost || reservation.total_cost || 10.0);
    const bookingModel = reservation.bookingModel || (reservation.payNow ? 'prepaid_discount' : 'postpaid');
    const vehicleCategory = reservation.vehicleCategory || reservation.slotType || 'auto';
    
    const startTime = reservation.startTime ? new Date(reservation.startTime) : new Date();
    const expiresAt = reservation.expiresAt ? new Date(reservation.expiresAt) : new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(id)}`;
    const qrPayload = verifyUrl;

    return {
      id,
      token,
      parkingName,
      slotCode,
      plate,
      hours,
      cost,
      bookingModel,
      vehicleCategory,
      startTime,
      expiresAt,
      qrPayload
    };
  }, [reservation]);

  // Temporizador de cuenta regresiva
  useEffect(() => {
    if (!passData?.expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = passData.expiresAt.getTime() - now;

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [passData?.expiresAt]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md rounded-3xl p-0 overflow-y-auto max-h-[92vh] border-slate-200 bg-slate-50 shadow-2xl">
        
        {/* Encabezado del Pase */}
        <div className="bg-slate-950 text-white px-5 py-4 relative">
          <div className="flex justify-between items-start">
            <div className="pr-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase block">
                  PASE DIGITAL DE ACCESO
                </span>
                {passData.bookingModel === 'prepaid_discount' && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-black border border-cyan-500/30">
                    PREPAGO (-10%)
                  </span>
                )}
                {passData.bookingModel === 'wallet' && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-black border border-amber-500/30">
                    SMART WALLET
                  </span>
                )}
                {passData.bookingModel === 'corporate_b2b' && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-black border border-purple-500/30">
                    FLOTA B2B
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-1">{passData.parkingName}</h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                <span className="truncate">Ayacucho - Huamanga</span>
              </p>
            </div>
            
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
              AUTORIZADO
            </span>
          </div>
        </div>

        {/* Cuerpo del Ticket con Código QR */}
        <div className="p-4 sm:p-5 space-y-3.5">
          
          {/* Contenedor del Código QR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center flex flex-col items-center justify-center">
            <div ref={qrRef} className="p-2 bg-white rounded-xl border border-slate-100 shadow-xs inline-block">
              <QRCodeSVG
                value={passData.qrPayload}
                size={140}
                level="Q"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-[11px] font-mono font-bold text-slate-600 mt-2.5">
              Token Único: <span className="text-slate-900 font-black tracking-wider">{passData.token}</span>
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full mt-1 border border-emerald-200">
              <Camera className="w-3 h-3 text-emerald-600" />
              <span>Apertura ANPR automática por placa {passData.plate}</span>
            </div>
          </div>

          {/* Ficha de Detalles de la Reserva */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Cajón Reservado */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Cajón Reservado</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-mono font-black text-xs shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-black text-slate-900 leading-tight truncate">{passData.slotCode}</p>
                  <p className="text-[10px] text-slate-500">Nivel 1</p>
                </div>
              </div>
            </div>

            {/* Vehículo / Placa */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Vehículo / Placa</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-black text-slate-900 leading-tight truncate">{passData.plate}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{passData.vehicleCategory}</p>
                </div>
              </div>
            </div>

            {/* Código Reserva */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Código Reserva</span>
              <p className="text-xs font-mono font-black text-slate-800 mt-1">{passData.id}</p>
              <p className="text-[10px] text-slate-500">Identificador</p>
            </div>

            {/* Tiempo Restante */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Tiempo Restante</span>
              <p className="text-xs font-mono font-black text-emerald-600 mt-1">{timeLeft || '--:--:--'}</p>
              <p className="text-[10px] text-slate-500">{passData.hours} horas</p>
            </div>
          </div>

          {/* Botones de Navegación GPS (Waze / Google Maps) */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Navegación GPS en Ruta:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Google Maps</span>
              </button>
              <button
                type="button"
                onClick={openWaze}
                className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-cyan-200"
              >
                <Navigation className="w-4 h-4 text-cyan-600" />
                <span>Waze</span>
              </button>
            </div>
          </div>

          {/* Desglose de Costo Ejecutivo */}
          <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-2xl text-xs shadow-xs">
            <span className="font-bold text-slate-300">Total:</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              S/ {passData.cost.toFixed(2)}
            </span>
          </div>

          {/* Acciones de Pase Limpias y Alineadas */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleCopyCode}
                variant="outline"
                className="w-full text-xs font-bold gap-1.5 border-slate-200 bg-white hover:bg-slate-100 text-slate-800 rounded-xl h-10 cursor-pointer shadow-2xs justify-center"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Token'}</span>
              </Button>

              <Button
                type="button"
                onClick={handlePrintPass}
                variant="outline"
                className="w-full text-xs font-bold gap-1.5 border-slate-200 bg-white hover:bg-slate-100 text-slate-800 rounded-xl h-10 cursor-pointer shadow-2xs justify-center"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimir Pase</span>
              </Button>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold h-11 rounded-xl shadow-md cursor-pointer text-xs justify-center"
            >
              Entendido / Cerrar
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
