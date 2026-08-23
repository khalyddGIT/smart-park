import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
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
  Crown,
  CreditCard,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';

const DEFAULT_FALLBACK_ELEMENTS = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
  { id: 6, type: 'crosswalk', x: 500, y: 300, w: 80, h: 100, rot: 0 },
  { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA ANPR' },
  
  // Fila Superior
  { id: 8, type: 'slot', x: 60, y: 60, w: 85, h: 160, rot: 0, code: 'A-01', status: 'free', slotType: 'pmr', shaded: true },
  { id: 9, type: 'slot', x: 155, y: 60, w: 85, h: 160, rot: 0, code: 'A-02', status: 'free', slotType: 'standard', shaded: true },
  { id: 10, type: 'slot', x: 250, y: 60, w: 85, h: 160, rot: 0, code: 'A-03', status: 'occupied', slotType: 'standard', plate: 'XYZ-789', shaded: true },
  { id: 11, type: 'slot', x: 345, y: 60, w: 85, h: 160, rot: 0, code: 'A-04', status: 'free', slotType: 'standard', shaded: true },
  { id: 12, type: 'slot', x: 440, y: 60, w: 85, h: 160, rot: 0, code: 'A-05', status: 'free', slotType: 'standard', shaded: true },
  { id: 13, type: 'slot', x: 535, y: 60, w: 85, h: 160, rot: 0, code: 'A-06', status: 'occupied', slotType: 'standard', plate: 'ABC-555', shaded: true },
  { id: 14, type: 'slot', x: 630, y: 60, w: 85, h: 160, rot: 0, code: 'A-07', status: 'free', slotType: 'standard', shaded: true },
  { id: 15, type: 'slot', x: 725, y: 60, w: 85, h: 160, rot: 0, code: 'A-08', status: 'free', slotType: 'standard', shaded: true },
  { id: 16, type: 'slot', x: 820, y: 60, w: 85, h: 160, rot: 0, code: 'A-09', status: 'free', slotType: 'moto', shaded: true },
  { id: 17, type: 'slot', x: 915, y: 60, w: 85, h: 160, rot: 0, code: 'A-10', status: 'free', slotType: 'moto', shaded: true },

  // Fila Inferior
  { id: 18, type: 'slot', x: 60, y: 470, w: 85, h: 160, rot: 0, code: 'B-01', status: 'free', slotType: 'pmr', shaded: false },
  { id: 19, type: 'slot', x: 155, y: 470, w: 85, h: 160, rot: 0, code: 'B-02', status: 'free', slotType: 'standard', shaded: false },
  { id: 20, type: 'slot', x: 250, y: 470, w: 85, h: 160, rot: 0, code: 'B-03', status: 'occupied', slotType: 'standard', plate: 'W1P-404', shaded: false },
  { id: 21, type: 'slot', x: 345, y: 470, w: 85, h: 160, rot: 0, code: 'B-04', status: 'free', slotType: 'standard', shaded: false },
  { id: 22, type: 'slot', x: 440, y: 470, w: 85, h: 160, rot: 0, code: 'B-05', status: 'free', slotType: 'standard', shaded: false },
  { id: 23, type: 'slot', x: 535, y: 470, w: 85, h: 160, rot: 0, code: 'B-06', status: 'free', slotType: 'standard', shaded: false },
  { id: 24, type: 'slot', x: 630, y: 470, w: 85, h: 160, rot: 0, code: 'B-07', status: 'occupied', slotType: 'standard', plate: 'AYC-888', shaded: false },
  { id: 25, type: 'slot', x: 725, y: 470, w: 85, h: 160, rot: 0, code: 'B-08', status: 'free', slotType: 'standard', shaded: false },
  { id: 26, type: 'slot', x: 820, y: 470, w: 85, h: 160, rot: 0, code: 'B-09', status: 'free', slotType: 'moto', shaded: false },
  { id: 27, type: 'slot', x: 915, y: 470, w: 85, h: 160, rot: 0, code: 'B-10', status: 'free', slotType: 'moto', shaded: false }
];

// Convierte un slot del backend (GET /parkings/{id}/floor-plan) al formato del plano
const mapServerSlot = (s) => ({
  id: s.id,
  type: 'slot',
  code: s.code,
  status: s.status || 'free',
  slotType: s.slot_type || 'auto',
  shaded: false,
  x: s.pos_x || 0,
  y: s.pos_y || 0,
  w: s.width || 60,
  h: s.height || 100,
  rot: s.rotation || 0
});

// Convierte los elementos decorativos del backend (muros, carriles, garita...)
const mapServerElement = (e) => {
  let extra = {};
  try { if (e.properties_json) extra = JSON.parse(e.properties_json) || {}; } catch {}
  return {
    id: `el-${e.id}`,
    type: e.element_type,
    x: e.pos_x || 0,
    y: e.pos_y || 0,
    w: e.width || 100,
    h: e.height || 20,
    rot: e.rotation || 0,
    label: extra.label
  };
};

export const CustomerInteractivePlanBooking = ({ parking, planElements = [], onReserveSlot }) => {
  const BASE_WIDTH = 1100;
  const BASE_HEIGHT = 700;
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  
  // Plano REAL cargado desde el servidor; sin datos falsos si falla
  const [remotePlan, setRemotePlan] = useState(null); // {slots, elements}
  const [planStatus, setPlanStatus] = useState('idle'); // 'loading' | 'ready' | 'error' | 'unregistered'
  const [planErrorDetail, setPlanErrorDetail] = useState('');

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hours, setHours] = useState(2);
  const [selectedPlate, setSelectedPlate] = useState('ABC-123 (Toyota Corolla Blanco)');

  const numericParkingId = Number(parking?.id);

  // Carga del plano real del servidor al abrir/seleccionar una cochera registrada
  useEffect(() => {
    setSelectedSlot(null);
    setRemotePlan(null);
    setPlanErrorDetail('');
    if (!parking || isNaN(numericParkingId)) {
      // Cochera local "EST-*": aún no existe en el servidor, no inventar plano
      setPlanStatus('unregistered');
      return;
    }
    let cancelled = false;
    setPlanStatus('loading');
    api.get(`/parkings/${numericParkingId}/floor-plan`)
      .then((res) => {
        if (cancelled) return;
        setRemotePlan({
          slots: (res.data?.slots || []).map(mapServerSlot),
          elements: (res.data?.elements || []).map(mapServerElement)
        });
        setPlanStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setPlanErrorDetail(err?.response?.data?.detail || '');
        setPlanStatus('error');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parking?.id]);

  // Elementos mostrados: prioridad al plano real del servidor; fallback al plano local
  const elements = planStatus === 'ready' && remotePlan
    ? [...remotePlan.elements, ...remotePlan.slots]
    : (planElements && planElements.length > 0 ? planElements : DEFAULT_FALLBACK_ELEMENTS);

  // Auto-ajuste de escala para que el plano se adapte a cualquier pantalla
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 32;
        const calculatedScale = Math.min(1, Math.max(0.35, availableWidth / BASE_WIDTH));
        setScale(calculatedScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slots = elements.filter(e => e && e.type === 'slot');
  // Solo los cajones con status "free" del servidor son reservables
  const freeSlots = slots.filter(s => s.status === 'free');
  const totalSlots = slots.length;

  // Auto-seleccionar el primer cajón libre si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedSlot && freeSlots.length > 0) {
      setSelectedSlot(freeSlots[0]);
    }
  }, [elements]);

  const handleSlotClick = (slot) => {
    // Solo se pueden elegir cajones libres confirmados por el servidor
    if (slot.status === 'free') {
      setSelectedSlot(slot);
    }
  };

  // Datos base compartidos por ambas vías de reserva
  const buildReservationData = (paymentMeta) => {
    const now = new Date();
    return {
      slotId: selectedSlot.id, // ID REAL del cajón en el servidor
      slotCode: selectedSlot.code,
      slotType: selectedSlot.slotType || 'standard',
      parkingId: numericParkingId, // ID numérico real de la cochera
      parkingName: parking?.name || 'Smart Park Central',
      hours,
      plate: selectedPlate.split(' ')[0],
      totalCost: (parking?.rate || 5.0) * hours,
      code: `RSV-${Date.now().toString().slice(-6)}`,
      token: `SPK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      startTime: now,
      expiresAt: new Date(now.getTime() + hours * 60 * 60 * 1000),
      ...paymentMeta
    };
  };

  const canReserve = planStatus !== 'unregistered' && planStatus !== 'loading' && !!selectedSlot && selectedSlot.status === 'free';

  // Confirmar reserva (sin cobro: el pago se realiza en garita al salir)
  const handleDirectReservation = () => {
    if (!canReserve) return;
    if (onReserveSlot) {
      onReserveSlot(buildReservationData({ paymentMethod: 'Pago en garita al salir' }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Estados honestos del plano: sin datos falsos */}
      {planStatus === 'unregistered' && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Esta cochera aún no está registrada en el servidor, por lo que no se pueden emitir reservas reales para ella.</span>
        </div>
      )}
      {planStatus === 'loading' && (
        <div className="p-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <Loader2 className="w-5 h-5 text-slate-500 shrink-0 animate-spin" />
          <span>Cargando el plano real de la cochera desde el servidor...</span>
        </div>
      )}
      {planStatus === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>No se pudo cargar el plano del servidor{planErrorDetail ? `: ${planErrorDetail}` : '. Intenta nuevamente más tarde.'} Se muestra el plano local informativo, pero no es fuente de disponibilidad real.</span>
        </div>
      )}

      {/* Resumen del Estacionamiento Seleccionado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{parking?.name || 'Smart Park Central'}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 
            <span>{parking?.address || 'Portal Unión 42, Centro Histórico'}, {parking?.city || 'Ayacucho - Huamanga'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarifa por Hora</span>
            <span className="text-xl font-black text-emerald-600 font-mono">S/ {(parking?.rate || 5.0).toFixed(2)}</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{freeSlots.length} Libres de {totalSlots}</span>
          </div>
        </div>
      </div>

      {/* Leyenda de Selección */}
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
            <span>Preferencial</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-600" />
            <span>Techado</span>
          </div>
        </div>

        {/* Indicador de Selección de Cajón */}
        <div className="flex items-center space-x-2">
          {selectedSlot ? (
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cajón Seleccionado: <strong className="text-white font-mono text-sm">{selectedSlot.code}</strong></span>
            </span>
          ) : (
            <span className="text-amber-400 text-xs italic">Haz clic sobre cualquier cajón verde para seleccionarlo</span>
          )}
        </div>
      </div>

      {/* PLANO TOPOGRÁFICO INTERACTIVO + PANEL LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contenedor del Plano */}
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-[#12161f] rounded-3xl p-4 sm:p-6 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden"
          style={{ minHeight: `${BASE_HEIGHT * scale + 48}px` }}
        >
          {/* Contenedor Escalado Automáticamente */}
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

            {/* Renderizado de los Elementos del Plano */}
            {elements.map((el) => {
              // 1. Cajones de Estacionamiento
              if (el.type === 'slot') {
                // Solo "free" (según el servidor) es reservable; reserved/occupied no
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id || selectedSlot?.code === el.code;
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
                    {/* Textura de Techado */}
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

                    {/* Tope de Llanta */}
                    <div className="w-full h-1.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300/60 shadow-xs flex items-center justify-around px-0.5 z-10 my-0.5 overflow-hidden">
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                    </div>

                    <div className="text-center text-[9px] font-mono font-bold leading-none z-10">
                      {isSelected ? (
                        <span className="text-cyan-300 font-black animate-pulse">✓ ELEGIDO</span>
                      ) : isFree ? (
                        <span className="text-emerald-400">LIBRE</span>
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
                      <div key={i} className="h-2 bg-white/80 rounded-xs shadow-xs" />
                    ))}
                  </div>
                );
              }

              // 5. Garita ANPR
              if (el.type === 'gate') {
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
                    className="absolute bg-emerald-950/90 border-2 border-emerald-400 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-lg z-20 pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping mb-1" />
                    <span className="text-[9px] font-mono font-black text-emerald-400 leading-tight uppercase">{el.label || 'GARITA'}</span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* PANEL LATERAL DE RESERVA Y CHECKOUT — ESTÉTICA ULTRA-PREMIUM */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-5 text-white">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-extrabold text-white tracking-tight">Confirmar Reserva de Plaza</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  PASO FINAL
                </span>
              </div>
              <p className="text-xs text-slate-400">Selecciona tu cajón en el plano o en la lista rápida inferior.</p>
            </div>

            {/* Selector Rápido de Cajones Libres */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                Selector Rápido de Cajones Libres ({freeSlots.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {freeSlots.length === 0 && (
                  <span className="text-xs text-slate-400 font-semibold p-2">
                    {planStatus === 'ready' ? 'Actualmente no hay cajones libres en esta cochera según el servidor.' : 'Sin cajones libres para mostrar.'}
                  </span>
                )}
                {freeSlots.map((s) => {
                  const isCurSelected = selectedSlot?.code === s.code;
                  return (
                    <button
                      key={s.id || s.code}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                        isCurSelected 
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 font-extrabold' 
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-emerald-500/60 hover:text-white'
                      }`}
                    >
                      <span>{s.code}</span>
                      <span>{s.slotType === 'pmr' ? '♿' : s.shaded ? '⛱️' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Cajón Seleccionado */}
            {selectedSlot && (
              <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-2 border-emerald-500/80 p-4 rounded-2xl flex items-center justify-between shadow-lg glow-emerald">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block font-mono">CAJÓN SELECCIONADO</span>
                  <span className="text-3xl font-mono font-extrabold text-white tracking-tight">{selectedSlot.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl block font-mono border border-emerald-500/30">
                    {selectedSlot.slotType === 'pmr' ? '♿ Preferencial' : selectedSlot.shaded ? '⛱️ Techado' : '🚗 Estándar'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold mt-1 block flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Listo para reservar
                  </span>
                </div>
              </div>
            )}

            {/* Selección de Vehículo */}
            <div>
              <label className="text-xs font-extrabold text-slate-300 block mb-1.5">Vehículo a Ingresar</label>
              <select 
                value={selectedPlate} 
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option>ABC-123 (Toyota Corolla Blanco)</option>
                <option>XYZ-789 (Hyundai Tucson Gris)</option>
                <option>AYC-501 (Honda Civic Negro)</option>
              </select>
            </div>

            {/* Selector de Duración */}
            <div>
              <label className="text-xs font-extrabold text-slate-300 block mb-1.5">Tiempo de Permanencia Estimado</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono ${
                      hours === h 
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20' 
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {h} {h === 1 ? 'Hora' : 'Horas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Desglose de Pago */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa Base:</span>
                <span className="text-slate-200">S/ {(parking?.rate || 5.0).toFixed(2)} × {hours}h</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tolerancia de Gracia:</span>
                <span className="text-emerald-400 font-bold">15 min gratis</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between text-sm font-extrabold text-white">
                <span>Total a Liquidar:</span>
                <span className="text-emerald-400 font-mono text-base font-extrabold">S/ {((parking?.rate || 5.0) * hours).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* BOTÓN DE ACCIÓN — Reserva sin cobro */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="default"
              onClick={handleDirectReservation}
              disabled={!selectedSlot}
              className="w-full py-4 text-xs font-extrabold gap-2 shadow-lg shadow-emerald-500/25 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Reservar Cajón — Pagarás al salir (S/ {(parking?.rate || 5.0).toFixed(2)}/h)</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </Button>
            <p className="text-[11px] text-slate-400 text-center font-medium">
              Tu pase QR quedará activo. El cobro se calculará al salir según el tiempo real de estancia.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
