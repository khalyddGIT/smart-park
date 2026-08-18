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
  Calendar
} from 'lucide-react';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const qrRef = useRef(null);

  // Generación y fijación estable del Token y Payload (NO cambia en cada segundo del reloj)
  const passData = useMemo(() => {
    if (!reservation) return null;
    
    const id = reservation.code || 'RSV-8912';
    const token = reservation.token || `SPK-${id.replace('RSV-', '')}-7B2F9A`;
    const parkingName = reservation.parking || 'Smart Park Plaza Mayor Ayacucho';
    const slotCode = reservation.slot || 'A-01';
    const plate = reservation.plate || 'ABC-123';
    const hours = reservation.hours || 2;
    const cost = reservation.cost || 10.0;
    
    const startTime = reservation.startTime ? new Date(reservation.startTime) : new Date();
    const expiresAt = reservation.expiresAt ? new Date(reservation.expiresAt) : new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    // Payload estructurado estable para el código QR
    const qrPayload = `https://smartpark.pe/pass?id=${id}&token=${token}&slot=${slotCode}&plate=${plate}`;

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

  // Temporizador de cuenta regresiva en vivo
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

  const handleDownloadPass = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-slate-200 bg-slate-50 shadow-2xl">
        {/* Encabezado del Pase */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase block mb-1">
                Pase Digital de Acceso
              </span>
              <h2 className="text-xl font-black text-white">{passData.parkingName}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" /> Ayacucho - Huamanga
              </p>
            </div>
            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
              ACTIVO
            </div>
          </div>
        </div>

        {/* Cuerpo del Ticket con Código QR Único */}
        <div className="p-6 space-y-5">
          {/* Contenedor del Código QR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center relative">
            <div ref={qrRef} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
              <QRCodeSVG
                value={passData.qrPayload}
                size={180}
                level="Q"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-[11px] font-mono font-bold text-slate-500 mt-3">
              Token Único: <span className="text-slate-900 font-extrabold">{passData.token}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Escanea en el lector de garita o en el acceso ANPR
            </p>
          </div>

          {/* Ficha de Detalles de la Reserva */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Cajón Reservado</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                  {passData.slotCode}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">{passData.slotCode}</p>
                  <p className="text-[10px] text-slate-500">Nivel 1</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehículo / Placa</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-900">{passData.plate}</p>
                  <p className="text-[10px] text-slate-500">Autorizado</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Código Reserva</span>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">{passData.id}</p>
              <p className="text-[10px] text-slate-500">Identificador</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tiempo Restante</span>
              <p className="text-xs font-mono font-bold text-emerald-600 mt-1">{timeLeft || '--:--:--'}</p>
              <p className="text-[10px] text-slate-500">{passData.hours} horas</p>
            </div>
          </div>

          {/* Desglose de Costo */}
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl text-xs">
            <span className="font-bold text-emerald-900">Total Liquidado:</span>
            <span className="text-base font-black text-emerald-700 font-mono">
              S/ {passData.cost.toFixed(2)}
            </span>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-bold gap-1.5 border-slate-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
            </Button>

            <Button
              onClick={handleDownloadPass}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-bold gap-1.5 border-slate-300"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Guardar / Imprimir</span>
            </Button>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-md"
          >
            Listo, Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
