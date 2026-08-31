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
  { id: 8, type: 'slot', x: 60, y: 60, w: 85, h: 160, rot: 0, code: 'A-01', status: 'free', slotType: 'standard', shaded: true },
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
  { id: 18, type: 'slot', x: 60, y: 470, w: 85, h: 160, rot: 0, code: 'B-01', status: 'free', slotType: 'standard', shaded: false },
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
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedPlate, setSelectedPlate] = useState('');

  // Cargar solo vehículos del usuario autenticado
  useEffect(() => {
    let cancelled = false;
    setVehiclesLoading(true);
    api.get('/vehicles')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setVehicles(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedPlate(`${first.license_plate}${first.brand ? ` (${first.brand} ${first.model || ''} ${first.color || ''})`.trim() : ''}`);
        } else {
          setSelectedPlate('');
        }
      })
      .catch(() => {
        if (!cancelled) { setVehicles([]); setSelectedPlate(''); }
      })
      .finally(() => { if (!cancelled) setVehiclesLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

  // Auto-ajuste responsivo y perfecto del plano CAD 1100x700px
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          const scaleX = (clientWidth * 0.96) / BASE_WIDTH;
          const scaleY = (clientHeight * 0.96) / BASE_HEIGHT;
          const fitScale = Math.min(scaleX, scaleY);
          setScale(Math.max(0.2, fitScale));
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
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

  // Ventana de llegada configurable por sede (tolerance_minutes del backend)
  const arrivalWindow = Math.max(5, Math.min(60, Number(parking?.tolerance ?? parking?.tolerance_minutes ?? 15) || 15));

  // Datos base compartidos por ambas vías de reserva - ETA corrige la falla lógica: reservas porque estás lejos
  const buildReservationData = (paymentMeta) => {
    const now = new Date();
    const start = new Date(now.getTime() + Number(etaMinutes || 0) * 60 * 1000);
    const end = new Date(start.getTime() + Number(hours || 1) * 60 * 60 * 1000);
    return {
      slotId: selectedSlot.id,
      slotCode: selectedSlot.code,
      slotType: selectedSlot.slotType || 'standard',
      parkingId: numericParkingId,
      parkingName: parking?.name || 'Smart Park Central',
      hours: Number(hours) || 1,
      etaMinutes: Number(etaMinutes) || 0,
      arrivalWindow,
      plate: selectedPlate.split(' ')[0],
      totalCost: (parking?.rate || 5.0) * (Number(hours) || 1),
      code: `RSV-${Date.now().toString().slice(-6)}`,
      token: `SPK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      startTime: start,
      expiresAt: end,
      ...paymentMeta
    };
  };

  const canReserve = planStatus !== 'unregistered' && planStatus !== 'loading' && !!selectedSlot && selectedSlot.status === 'free' && vehicles.length > 0 && !!selectedPlate;

  const handleReserveHold = () => {
    if (!canReserve) return;
    if (onReserveSlot) {
      onReserveSlot(buildReservationData({ paymentMethod: 'Pago en garita al salir', payNow: false }));
    }
  };

  const handleReservePayNow = () => {
    if (!canReserve) return;
    if (onReserveSlot) {
      onReserveSlot(buildReservationData({ paymentMethod: 'Prepago asegurado', payNow: true }));
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
            <MapPin className="w-4 h-4 shrink-0 text-emerald-600 shrink-0" /> 
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
            <span className="w-4 h-4 shrink-0 rounded-md bg-emerald-500 shadow-sm" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 shrink-0 rounded-md bg-rose-500" />
            <span className="text-slate-400">Ocupado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 shrink-0 rounded-md bg-blue-500" />
            <span>Preferencial</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 shrink-0 rounded-md bg-amber-600" />
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
          className="lg:col-span-2 bg-[#1c253b] rounded-3xl p-3 sm:p-5 border-4 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden h-[480px] sm:h-[560px] lg:h-[620px]"
        >
          {/* Contenedor Escalado Automáticamente */}
          <div 
            style={{ 
              width: `${BASE_WIDTH}px`, 
              height: `${BASE_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
            className="relative bg-[#2a3752] rounded-2xl border-2 border-slate-600 shadow-inner overflow-hidden select-none shrink-0 transition-transform duration-150 ease-out"
          >
            {/* Cuadrícula Asfáltica */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b4d6e_1px,transparent_1px),linear-gradient(to_bottom,#3b4d6e_1px,transparent_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none" />

            {/* Renderizado de los Elementos del Plano */}
            {elements.map((el) => {
              // 1. Cajones de Estacionamiento
              if (el.type === 'slot') {
                // Solo "free" (según el servidor) es reservable; reserved/occupied no
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id || selectedSlot?.code === el.code;
                const isPMR = false;
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
                    </div>

                    {/* Stencil Icono */}
                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10">
                      {isMoto ? (
                        <Bike className="w-4 h-4 shrink-0 text-orange-400/40" />
                      ) : (
                        <Car className="w-4 h-4 shrink-0 text-emerald-400/30" />
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

        {/* PANEL LATERAL DE RESERVA Y CHECKOUT */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 text-white">
          <div className="space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Confirmar Reserva</h3>
            </div>

            {/* Selector de Cajones Libres */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Cajones disponibles ({freeSlots.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {freeSlots.length === 0 && (
                  <span className="text-xs text-slate-400 font-medium p-1">
                    No hay cajones libres en este momento.
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
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' 
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-emerald-500/60 hover:text-white'
                      }`}
                    >
                      <span>{s.code}</span>
                      <span>{s.shaded ? '⛱️' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Cajón Seleccionado */}
            {selectedSlot && (
              <div className="bg-slate-950 border border-emerald-500/60 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 block font-mono">Cajón</span>
                  <span className="text-2xl font-mono font-bold text-white tracking-tight">{selectedSlot.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    {selectedSlot.shaded ? 'Techado' : 'Estándar'}
                  </span>
                </div>
              </div>
            )}

            {/* Selección de Vehículo — solo del usuario autenticado */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Vehículo <span className="text-slate-500 font-normal">({vehicles.length} registrado{vehicles.length!==1 ? 's' : ''})</span></label>
              {vehiclesLoading ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando tus vehículos...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="w-full bg-amber-950/40 border border-amber-800 rounded-xl px-3 py-3 text-xs">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Sin vehículos registrados</p>
                  <p className="text-amber-200/80 mt-1 leading-snug">Registra un vehículo en <b>Mis Vehículos</b> antes de reservar. No se muestran placas de otros usuarios.</p>
                </div>
              ) : (
                <select 
                  value={selectedPlate} 
                  onChange={(e) => setSelectedPlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  {vehicles.map((v) => {
                    const label = `${v.license_plate}${v.brand ? ` (${v.brand} ${v.model || ''} ${v.color || ''})`.replace(/\s+/g,' ').trim() : ''}`;
                    return <option key={v.id} value={label}>{label}</option>;
                  })}
                </select>
              )}
            </div>

            {/* Tiempo de llegada (ETA) - corrige lógica: reservas porque estás lejos */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                ¿En cuánto llegas? <span className="text-slate-500 font-normal">(ventana de llegada {arrivalWindow} min)</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 10, 15, 30, 45, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEtaMinutes(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono ${
                      Number(etaMinutes) === m
                        ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {m === 0 ? 'Ahora' : `En ${m} min`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                {etaMinutes === 0
                  ? `Llegada inmediata. Tienes ${arrivalWindow} min de gracia antes de liberar el cajón.`
                  : `Tu cajón se guarda hasta ${arrivalWindow} min después de las ${new Date(Date.now() + etaMinutes*60000).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}. Si no haces check-in, se libera automáticamente (persistente en servidor).`}
              </p>
            </div>

            {/* Selector de Duración */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Duración de estancia
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden h-9 px-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHours(prev => Math.max(1, (Number(prev) || 1) - 1))}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded text-sm font-bold transition cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={hours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) setHours(val);
                      else if (e.target.value === '') setHours('');
                    }}
                    className="w-10 text-center bg-transparent text-xs font-mono font-bold text-white outline-none"
                    placeholder="1"
                  />
                  <button
                    type="button"
                    onClick={() => setHours(prev => Math.min(168, (Number(prev) || 1) + 1))}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded text-sm font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
                  {[1, 2, 4, 8].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono shrink-0 ${
                        Number(hours) === h 
                          ? 'bg-slate-800 text-white font-bold border border-slate-700' 
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desglose de Pago - persistente */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa:</span>
                <span className="text-slate-200">S/ {(parking?.rate || 5.0).toFixed(2)} × {Number(hours) || 1}h</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Llegada:</span>
                <span className="text-emerald-400 font-semibold">{etaMinutes === 0 ? 'Ahora' : `En ${etaMinutes} min`} + {arrivalWindow} min gracia</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reserva:</span>
                <span className="text-slate-300">{new Date(Date.now() + etaMinutes*60000).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})} → {new Date(Date.now() + etaMinutes*60000 + (Number(hours)||1)*3600000).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between font-bold text-white">
                <span>Total estimado:</span>
                <span className="text-emerald-400 font-mono text-sm font-bold">
                  S/ {((parking?.rate || 5.0) * (Number(hours) || 1)).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">Persistente en servidor (PostgreSQL). Cajón pasa a <b className="text-slate-300">reserved</b> y se libera solo si no hay check-in antes del límite.</p>
            </div>
          </div>

          {/* DOS VÍAS: Hold vs Prepago */}
          <div className="pt-1 space-y-2">
            <Button
              type="button"
              variant="default"
              onClick={handleReservePayNow}
              disabled={!canReserve}
              className="w-full py-3 text-xs font-bold gap-1.5 shadow-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pagar ahora y asegurar</span>
              <span className="bg-slate-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-mono">S/ {((parking?.rate || 5.0) * (Number(hours)||1)).toFixed(2)}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReserveHold}
              disabled={!canReserve}
              className="w-full py-2.5 text-xs font-bold gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border-slate-700 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="w-4 h-4" />
              <span>Reservar y pagar al llegar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            {!canReserve && vehicles.length === 0 && (
              <p className="text-[11px] text-amber-400 text-center">Registra un vehículo para habilitar la reserva.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
