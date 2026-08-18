import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  Sparkles, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  Zap, 
  ChevronRight,
  Info,
  Maximize2,
  Umbrella,
  Accessibility,
  Bike,
  Crown
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const DEFAULT_FALLBACK_ELEMENTS = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
  { id: 6, type: 'crosswalk', x: 500, y: 300, w: 80, h: 100, rot: 0 },
  { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA ANPR' },
  
  // Fila Norte
  { id: 10, type: 'slot', code: 'A-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
  { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'ABC-123', color: '#ef4444' },
  { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 435, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 15, type: 'slot', code: 'A-06', slotType: 'auto', x: 600, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'XYZ-789', color: '#3b82f6' },
  { id: 16, type: 'slot', code: 'A-07', slotType: 'auto', x: 685, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 17, type: 'slot', code: 'A-08', slotType: 'moto', x: 770, y: 70, w: 50, h: 140, rot: 0, status: 'free' },
  { id: 18, type: 'slot', code: 'A-09', slotType: 'moto', x: 830, y: 70, w: 50, h: 140, rot: 0, status: 'free' },

  // Fila Sur
  { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 490, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
  { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', x: 165, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 250, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 23, type: 'slot', code: 'B-04', slotType: 'auto', x: 335, y: 490, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
  { id: 24, type: 'slot', code: 'B-05', slotType: 'auto', x: 600, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 25, type: 'slot', code: 'B-06', slotType: 'auto', x: 685, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
  { id: 26, type: 'slot', code: 'B-07', slotType: 'auto', x: 770, y: 490, w: 75, h: 140, rot: 0, status: 'free' }
];

export const CustomerInteractivePlanBooking = ({ 
  parking = {}, 
  planElements, 
  masterElements, 
  onReserveSlot 
}) => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hours, setHours] = useState(2);
  const [selectedPlate, setSelectedPlate] = useState('ABC-123 (Toyota Corolla Blanco)');

  // Resolver elementos del plano de forma 100% segura
  const rawElements = (planElements && Array.isArray(planElements) && planElements.length > 0)
    ? planElements
    : (masterElements && Array.isArray(masterElements) && masterElements.length > 0)
    ? masterElements
    : (parking?.elements && Array.isArray(parking.elements) && parking.elements.length > 0)
    ? parking.elements
    : DEFAULT_FALLBACK_ELEMENTS;

  const elements = Array.isArray(rawElements) ? rawElements : DEFAULT_FALLBACK_ELEMENTS;

  // Dimensiones base del lienzo virtual diseñado
  const BASE_WIDTH = 1100;
  const BASE_HEIGHT = 700;

  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.75);

  // Auto-ajuste de escala para que el plano SIEMPRE se vea 100% completo en cualquier pantalla
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 32; // padding
        const calculatedScale = Math.min(1, Math.max(0.4, availableWidth / BASE_WIDTH));
        setScale(calculatedScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slots = elements.filter(e => e && e.type === 'slot');
  const freeSlots = slots.filter(s => s.status === 'free');
  const totalSlots = slots.length;

  const handleSlotClick = (slot) => {
    if (slot.status === 'free') {
      setSelectedSlot(slot);
    }
  };

  const handleConfirmReservation = () => {
    if (!selectedSlot) return;
    const now = new Date();
    const reservationData = {
      slotCode: selectedSlot.code,
      slotType: selectedSlot.slotType,
      parkingName: parking?.name || 'Smart Park Central',
      hours,
      plate: selectedPlate.split(' ')[0],
      totalCost: (parking?.rate || 5.0) * hours,
      code: `RSV-${Date.now().toString().slice(-6)}`,
      token: `SPK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      startTime: now,
      expiresAt: new Date(now.getTime() + hours * 60 * 60 * 1000)
    };
    if (onReserveSlot) {
      onReserveSlot(reservationData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen del Estacionamiento Seleccionado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono font-bold">
              {freeSlots.length} de {totalSlots} Plazas Libres
            </Badge>
            <Badge variant="success" className="text-[10px] font-bold">
              Abierto 24/7
            </Badge>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{parking?.name || 'Smart Park Central'}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {parking?.address || 'Portal Unión 42, Centro Histórico'}, {parking?.city || 'Ayacucho - Huamanga'}
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarifa por Hora</span>
            <span className="text-xl font-black text-emerald-600">S/ {(parking?.rate || 5.0).toFixed(2)}</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Actualizado en Vivo</span>
          </div>
        </div>
      </div>

      {/* Leyenda de Selección y Selector de Vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-mono">
        <div className="flex items-center space-x-4 flex-wrap gap-y-1">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Leyenda:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500" />
            <span className="text-slate-400">Ocupado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-500" />
            <span>PMR</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-600" />
            <span>Techado</span>
          </div>
        </div>

        {/* Indicador de Selección de Cajón */}
        <div className="flex items-center space-x-2">
          {selectedSlot ? (
            <Badge className="bg-emerald-500 text-slate-950 font-black text-xs">
              Cajón Seleccionado: {selectedSlot.code}
            </Badge>
          ) : (
            <span className="text-slate-400 text-xs italic">Haz clic en un cajón verde para reservar</span>
          )}
        </div>
      </div>

      {/* PLANO TOPOGRÁFICO INTERACTIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-[#12161f] rounded-3xl p-4 sm:p-6 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden"
          style={{ minHeight: `${BASE_HEIGHT * scale + 48}px` }}
        >
          {/* Contenedor Escalado Automáticamente para verse 100% completo */}
          <div 
            style={{ 
              width: `${BASE_WIDTH}px`, 
              height: `${BASE_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: `-${BASE_HEIGHT * (1 - scale)}px`
            }}
            className="relative bg-[#181e29] rounded-2xl border-2 border-slate-700 shadow-inner overflow-hidden select-none"
          >
            {/* Cuadrícula Asfáltica */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#242b38_1px,transparent_1px),linear-gradient(to_bottom,#242b38_1px,transparent_1px)] bg-[size:20px_20px] opacity-30 pointer-events-none" />

            {/* Renderizado de los Elementos del Plano Real */}
            {elements.map((el) => {
              // 1. Cajones de Estacionamiento
              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id;
                const isPMR = el.slotType === 'pmr';
                const isMoto = el.slotType === 'moto';
                const isShaded = !!el.shaded;

                return (
                  <div
                    key={el.id}
                    onClick={() => handleSlotClick(el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-xl border-2 transition-all duration-200 flex flex-col justify-between p-2 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'ring-4 ring-cyan-400 border-cyan-400 bg-cyan-950/90 shadow-[0_0_25px_rgba(6,182,212,0.8)] scale-105 z-30'
                        : isFree
                        ? isShaded 
                          ? 'border-amber-400/90 bg-amber-950/40 text-amber-200 hover:bg-amber-800/60 hover:scale-105 z-10'
                          : 'border-emerald-400/80 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-800/60 hover:scale-105 hover:border-emerald-300 z-10'
                        : 'border-rose-500/60 bg-rose-950/40 text-rose-300 cursor-not-allowed opacity-75 z-5'
                    }`}
                  >
                    {/* Textura de Techado con Sombra */}
                    {isShaded && (
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.18),rgba(245,158,11,0.18)_6px,transparent_6px,transparent_12px)] pointer-events-none rounded-xl" />
                    )}

                    {/* Sensor LED Cenital */}
                    <div className="absolute top-1 right-1 flex items-center z-20 pointer-events-none">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isFree ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse' : 'bg-rose-500'
                      }`} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono font-black z-10 leading-none pr-2">
                      <span className="text-white drop-shadow-sm">{el.code}</span>
                      {isPMR && <span className="text-blue-400 font-bold text-[7px] bg-blue-950 px-1 rounded border border-blue-800">♿ PMR</span>}
                      {isShaded && <span className="text-amber-300 text-[7px] font-bold bg-amber-950 px-1 rounded border border-amber-800">⛱️ TECH</span>}
                      {isMoto && <span className="text-orange-300 font-bold text-[7px] bg-orange-950 px-1 rounded border border-orange-800">🏍️ MOTO</span>}
                    </div>

                    {/* Stencil Icono */}
                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10">
                      {isPMR ? (
                        <Accessibility className="w-4 h-4 text-blue-400/40" />
                      ) : isMoto ? (
                        <Bike className="w-3.5 h-3.5 text-orange-400/40" />
                      ) : (
                        <Car className="w-3.5 h-3.5 text-emerald-400/30" />
                      )}
                    </div>

                    {/* Tope de Llanta 3D */}
                    <div className="w-full h-1.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300/60 shadow-xs flex items-center justify-around px-0.5 z-10 my-0.5 overflow-hidden">
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                    </div>

                    <div className="text-center text-[9px] font-mono font-bold leading-none z-10">
                      {isSelected ? (
                        <span className="text-cyan-300 font-extrabold animate-pulse">LISTO</span>
                      ) : isFree ? (
                        <span className="text-emerald-400 font-bold">RESERVAR</span>
                      ) : (
                        <span className="text-rose-400">{el.plate || 'OCUPADO'}</span>
                      )}
                    </div>
                  </div>
                );
              }

              // 2. Muros
              if (el.type === 'wall') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border border-slate-500/80 rounded-xs shadow-md pointer-events-none z-15"
                  />
                );
              }

              // 3. Carriles Viales
              if (el.type === 'road') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-[#151c28] border-y-2 border-dashed border-amber-400/60 flex items-center justify-around px-4 pointer-events-none z-2 overflow-hidden shadow-inner"
                  >
                    <span className="text-[10px] font-mono font-black text-amber-400/60 tracking-widest flex items-center space-x-2">
                      <span>━►</span>
                      <span>{el.label || 'CARRIL DE CIRCULACIÓN'}</span>
                      <span>━►</span>
                    </span>
                  </div>
                );
              }

              // 4. Paso Cebra
              if (el.type === 'crosswalk') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-[#1a2230] border-x-2 border-amber-400/80 flex flex-col justify-around py-1 px-1 pointer-events-none z-8"
                  >
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-full h-2 bg-slate-100 rounded-xs shadow-sm" />
                    ))}
                  </div>
                );
              }

              // 5. Garitas / Accesos (Entrada & Salida)
              if (el.type === 'gate') {
                const isEntry = el.gateType === 'entry' || (el.label && el.label.toUpperCase().includes('ENTRADA'));
                const isExit = el.gateType === 'exit' || (el.label && el.label.toUpperCase().includes('SALIDA'));

                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-xl p-1.5 flex flex-col items-center justify-between text-[8px] font-mono font-black shadow-2xl pointer-events-none z-20 border-2 select-none ${
                      isEntry
                        ? 'bg-slate-950 border-emerald-400 text-emerald-300 shadow-emerald-500/20'
                        : isExit
                        ? 'bg-slate-950 border-rose-400 text-rose-300 shadow-rose-500/20'
                        : 'bg-slate-900 border-cyan-400 text-cyan-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isEntry ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'}`} />
                      <span className="text-[8px] tracking-wider text-white">
                        {isEntry ? 'ENTRADA' : isExit ? 'SALIDA' : 'ACCESO'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600 shadow-inner">
                      <div className={`h-full w-full bg-[repeating-linear-gradient(45deg,#ffffff,#ffffff_4px,${isEntry ? '#10b981' : '#f43f5e'}_4px,${isEntry ? '#10b981' : '#f43f5e'}_8px)]`} />
                    </div>
                    <span className="text-[7px] text-slate-300 uppercase truncate max-w-full font-bold">{el.label || (isEntry ? '📷 LPR' : '💳 POS')}</span>
                  </div>
                );
              }

              // 6. Columna
              if (el.type === 'column') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-gradient-to-br from-slate-400 to-slate-700 border-2 border-slate-300 rounded-lg shadow-xl flex items-center justify-center text-[8px] font-mono font-black text-black z-25 pointer-events-none"
                  >
                    <div className="w-4 h-4 bg-amber-400 rounded-xs flex items-center justify-center">
                      P
                    </div>
                  </div>
                );
              }

              // 7. Edificio Colindante / Área Privada
              if (el.type === 'building') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-[#0e1218] border-2 border-slate-700 rounded-xl p-3 flex flex-col justify-between z-12 pointer-events-none"
                  >
                    <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-black uppercase">
                      <span>{el.label || 'EDIFICIO COLINDANTE'}</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 text-center">ÁREA PRIVADA</span>
                  </div>
                );
              }

              // 8. Jardín / Área Verde
              if (el.type === 'garden') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-emerald-950/80 border-2 border-emerald-600/70 rounded-xl p-3 flex flex-col justify-between z-10 pointer-events-none"
                  >
                    <span className="text-emerald-400 text-[10px] font-black uppercase">{el.label || 'ÁREA VERDE'}</span>
                    <span className="text-[8px] font-mono text-emerald-300/60 text-center">RETIRO ECOLÓGICO</span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* PANEL LATERAL DE RESERVA Y CHECKOUT */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Confirmar Reserva de Plaza</h3>
            <p className="text-xs text-slate-500 mb-4">El pase QR generado te permitirá entrar automáticamente en la garita con escaneo ANPR.</p>

            {selectedSlot ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Cajón Seleccionado</span>
                    <span className="text-2xl font-mono font-black text-emerald-950">{selectedSlot.code}</span>
                  </div>
                  <Badge variant="success" className="text-xs font-bold font-mono">
                    {selectedSlot.slotType === 'pmr' ? 'PMR Inclusivo' : selectedSlot.shaded ? 'Con Cubierta Tensada' : 'Estándar'}
                  </Badge>
                </div>

                {/* Selección de Vehículo */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehículo a Ingresar</label>
                  <select 
                    value={selectedPlate} 
                    onChange={(e) => setSelectedPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option>ABC-123 (Toyota Corolla Blanco)</option>
                    <option>XYZ-789 (Hyundai Tucson Gris)</option>
                    <option>AYC-501 (Honda Civic Negro)</option>
                  </select>
                </div>

                {/* Selector de Duración */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tiempo de Permanencia Estimado</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(h => (
                      <button
                        key={h}
                        onClick={() => setHours(h)}
                        className={`py-2 rounded-xl text-xs font-bold transition ${
                          hours === h 
                            ? 'bg-emerald-600 text-white font-black shadow-md' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {h} {h === 1 ? 'Hora' : 'Horas'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desglose de Pago */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Tarifa Base:</span>
                    <span>S/ {(parking?.rate || 5.0).toFixed(2)} × {hours} hrs</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tolerancia de Gracia:</span>
                    <span className="text-emerald-700 font-bold">15 min gratis</span>
                  </div>
                  <div className="h-px bg-slate-200 my-1" />
                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Total a Pagar:</span>
                    <span className="text-emerald-600">S/ {((parking?.rate || 5.0) * hours).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Car className="w-10 h-10 mx-auto text-slate-400" />
                <p className="font-bold text-xs text-slate-700">Ningún cajón seleccionado</p>
                <p className="text-[11px] text-slate-400">Haz clic sobre cualquier cajón verde del plano para seleccionarlo e iniciar tu reserva.</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirmReservation}
            disabled={!selectedSlot}
            className="w-full py-4 text-sm font-black gap-2 shadow-lg shadow-emerald-600/30"
          >
            <span>Confirmar Reserva & Generar Pase QR</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
