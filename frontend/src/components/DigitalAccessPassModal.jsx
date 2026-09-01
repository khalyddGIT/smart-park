import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Car, 
  MapPin, 
  Clock, 
  Copy, 
  Check, 
  Printer, 
  Compass, 
  Navigation, 
  Camera 
} from 'lucide-react';

export const DigitalAccessPassModal = ({ isOpen, onClose, reservation }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const qrRef = useRef(null);

  const passData = useMemo(() => {
    if (!reservation) return null;
    
    const id = reservation.code || 'RSV-8912';
    const token = reservation.token || reservation.qr_code || `SPK-${id.replace('RSV-', '')}-7B2F9A`;
    const parkingName = reservation.parking || reservation.parkingName || 'Smart Park Central';
    const slotCode = reservation.slot || reservation.slotCode || 'A-01';
    const plate = reservation.plate || reservation.license_plate || 'ABC-123';
    const hours = reservation.hours || 2;
    const cost = Number(reservation.cost || reservation.totalCost || reservation.total_cost || 10.0);
    const vehicleCategory = reservation.vehicleCategory || reservation.slotType || 'Auto';
    
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
      vehicleCategory,
      startTime,
      expiresAt,
      qrPayload
    };
  }, [reservation]);

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
      <DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 overflow-y-auto max-h-[90vh] border-slate-200 bg-white shadow-xl">
        
        {/* Encabezado */}
        <div className="bg-slate-900 text-white px-5 py-4">
          <h2 className="text-base font-bold text-white">{passData.parkingName}</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
            <span>Ayacucho</span>
          </p>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Código QR */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center flex flex-col items-center justify-center">
            <div ref={qrRef} className="p-2 bg-white rounded-lg border border-slate-200 inline-block">
              <QRCodeSVG
                value={passData.qrPayload}
                size={140}
                level="Q"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-xs font-mono font-bold text-slate-700 mt-2.5">
              Token: {passData.token}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Acceso ANPR y lector de barrera
            </p>
          </div>

          {/* Datos de la Reserva */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Cajón Asignado</span>
              <p className="text-base font-mono font-bold text-slate-900 mt-0.5">{passData.slotCode}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Placa</span>
              <p className="text-base font-mono font-bold text-slate-900 mt-0.5">{passData.plate}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Código Reserva</span>
              <p className="font-mono font-semibold text-slate-800 mt-0.5">{passData.id}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px]">Tiempo Restante</span>
              <p className="font-mono font-bold text-emerald-700 mt-0.5">{timeLeft || '--:--:--'}</p>
            </div>
          </div>

          {/* Navegación GPS */}
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
            <span>Total:</span>
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
