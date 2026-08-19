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
  Printer
} from 'lucide-react';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const qrRef = useRef(null);

  // Generación y fijación estable del Token y Payload
  const passData = useMemo(() => {
    if (!reservation) return null;
    
    const id = reservation.code || 'RSV-8912';
    const token = reservation.token || `SPK-${id.replace('RSV-', '')}-7B2F9A`;
    const parkingName = reservation.parking || 'Smart Park Plaza Mayor';
    const slotCode = reservation.slot || 'A-01';
    const plate = reservation.plate || 'ABC-123';
    const hours = reservation.hours || 2;
    const cost = reservation.cost || 10.0;
    
    const startTime = reservation.startTime ? new Date(reservation.startTime) : new Date();
    const expiresAt = reservation.expiresAt ? new Date(reservation.expiresAt) : new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    const qrPayload = `🚗 SMART-PARK AYACUCHO - PASE DE ACCESO
📍 Sede: ${parkingName}
🅿️ Plaza: ${slotCode} (Nivel 1)
🚘 Placa: ${plate}
🎫 Reserva: ${id}
🔑 Token: ${token}
⏱️ Duración: ${hours} hora(s)
💰 Total: S/ ${Number(cost).toFixed(2)}
✅ ESTADO: ACCESO AUTORIZADO`;

    return {
      id,
      token,
      parkingName,
      slotCode,
      plate,
      hours,
      cost,
      startTime,
      expiresAt,
      qrPayload
    };
  }, [reservation?.code, reservation?.token, reservation?.slot, reservation?.plate, reservation?.parking, reservation?.cost]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md rounded-3xl p-0 overflow-y-auto max-h-[92vh] border-slate-200 bg-slate-50 shadow-2xl">
        
        {/* Encabezado del Pase */}
        <div className="bg-slate-950 text-white px-5 py-4 relative">
          <div className="flex justify-between items-start">
            <div className="pr-6">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase block">
                PASE DIGITAL DE ACCESO
              </span>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">{passData.parkingName}</h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> 
                <span className="truncate">Ayacucho - Huamanga</span>
              </p>
            </div>
            
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
              ACTIVO
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
                size={145}
                level="Q"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-[11px] font-mono font-bold text-slate-600 mt-2.5">
              Token Único: <span className="text-slate-900 font-black tracking-wider">{passData.token}</span>
            </p>
            <p className="text-[10px] text-slate-400">
              Escanea en el lector de garita o en el acceso ANPR
            </p>
          </div>

          {/* Ficha de Detalles de la Reserva */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Cajón Reservado */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Cajón Reservado</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                  P
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-black text-slate-900 leading-tight truncate">{passData.slotCode}</p>
                  <p className="text-[10px] text-slate-500">Nivel 1</p>
                </div>
              </div>
            </div>

            {/* Vehículo / Placa */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Vehículo / Placa</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-black text-slate-900 leading-tight truncate">{passData.plate}</p>
                  <p className="text-[10px] text-slate-500">Autorizado</p>
                </div>
              </div>
            </div>

            {/* Código Reserva */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Código Reserva</span>
              <p className="text-xs font-mono font-black text-slate-800 mt-1">{passData.id}</p>
              <p className="text-[10px] text-slate-500">Identificador</p>
            </div>

            {/* Tiempo Restante */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Tiempo Restante</span>
              <p className="text-xs font-mono font-black text-emerald-600 mt-1">{timeLeft || '--:--:--'}</p>
              <p className="text-[10px] text-slate-500">{passData.hours} horas</p>
            </div>
          </div>

          {/* Desglose de Costo */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs">
            <span className="font-bold text-emerald-900">Total Liquidado:</span>
            <span className="text-base font-black text-emerald-800 font-mono">
              S/ {passData.cost.toFixed(2)}
            </span>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleCopyCode}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-bold gap-1.5 border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrintPass}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-bold gap-1.5 border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </Button>
          </div>

          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl shadow-md cursor-pointer text-xs"
          >
            Listo, Entendido
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};
