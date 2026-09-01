import React, { useState, useRef, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useEstablishments } from '../context/EstablishmentContext';
import { 
  Car, 
  MapPin, 
  Clock, 
  QrCode, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Bike, 
  Truck, 
  Navigation, 
  CreditCard, 
  Wallet, 
  Building2, 
  Receipt, 
  ArrowRight
} from 'lucide-react';
import { Button } from './ui/button';

// ============================================================
// COMPONENTES DE VEHÍCULOS VECTORIALES (TOP-DOWN 2D)
// ============================================================

const VEHICLE_PALETTE = ['#38bdf8', '#ef4444', '#facc15', '#93c5fd', '#f97316', '#334155', '#94a3b8', '#f8fafc'];

const getVehicleColorByPlate = (plate = '', defaultColor) => {
  if (defaultColor) return defaultColor;
  let hash = 0;
  for (let i = 0; i < plate.length; i++) {
    hash = plate.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % VEHICLE_PALETTE.length;
  return VEHICLE_PALETTE[index];
};

const VehicleAuto2D = ({ plate, color, isTaxi }) => {
  const finalColor = getVehicleColorByPlate(plate, color || '#38bdf8');
  const isYellowTaxi = isTaxi || finalColor === '#facc15';

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none py-1">
      <div className="absolute left-[2px] top-[26%] w-1.5 h-2.5 rounded-l-full border border-black/20" style={{ backgroundColor: finalColor }} />
      <div className="absolute right-[2px] top-[26%] w-1.5 h-2.5 rounded-r-full border border-black/20" style={{ backgroundColor: finalColor }} />
      <div className="relative w-[86%] h-[95%] rounded-[12px] flex flex-col justify-between p-1 overflow-hidden border border-black/15 shadow-sm" style={{ backgroundColor: finalColor }}>
        <div className="w-full flex items-center justify-between px-0.5 pt-0.5">
          <div className="w-2 h-1 bg-[#fde047] rounded-tl" />
          {isYellowTaxi && <div className="text-[4px] font-mono font-black bg-black text-yellow-400 px-0.5 rounded">TAXI</div>}
          <div className="w-2 h-1 bg-[#fde047] rounded-tr" />
        </div>
        <div className="relative w-[90%] mx-auto my-auto bg-[#1e293b] rounded-[6px] p-0.5 flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="w-full h-3 bg-[#0f172a] rounded-t-[4px]" />
          <div className="w-full flex items-center justify-between my-0.5 px-0.5">
            <div className="w-0.5 h-2.5 bg-[#0f172a]" />
            <div className="flex-1 h-2.5 mx-0.5 rounded" style={{ backgroundColor: finalColor }} />
            <div className="w-0.5 h-2.5 bg-[#0f172a]" />
          </div>
          <div className="w-full h-2.5 bg-[#0f172a] rounded-b-[4px]" />
        </div>
        <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
          <div className="w-full flex items-center justify-between px-0.5">
            <div className="w-2 h-1 bg-[#ef4444] rounded-bl" />
            <div className="w-2 h-1 bg-[#ef4444] rounded-br" />
          </div>
          <div className="bg-white text-slate-950 px-1 py-0.2 rounded font-mono text-[6px] font-black">
            {plate || 'ABC-123'}
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleCamioneta2D = ({ plate, color = '#0284c7' }) => {
  const finalColor = getVehicleColorByPlate(plate, color);
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none py-1">
      <div className="absolute left-[1px] top-[24%] w-1.5 h-3 rounded-l-full border border-black/25" style={{ backgroundColor: finalColor }} />
      <div className="absolute right-[1px] top-[24%] w-1.5 h-3 rounded-r-full border border-black/25" style={{ backgroundColor: finalColor }} />
      <div className="relative w-[90%] h-[96%] rounded-[14px] flex flex-col justify-between p-1 overflow-hidden border border-black/20 shadow-md" style={{ backgroundColor: finalColor }}>
        <div className="w-full flex items-center justify-between px-0.5">
          <div className="w-2.5 h-1.5 bg-[#fde047] rounded-tl" />
          <div className="w-2.5 h-1.5 bg-[#fde047] rounded-tr" />
        </div>
        <div className="relative w-[92%] mx-auto my-auto bg-[#1e293b] rounded-[8px] p-0.5 flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="w-full h-3.5 bg-[#0f172a] rounded-t-[5px]" />
          <div className="w-full flex items-center justify-between my-0.5 px-0.5">
            <div className="w-1 h-4 bg-slate-400 rounded-full" />
            <div className="flex-1 h-4 mx-0.5 rounded flex items-center justify-center" style={{ backgroundColor: finalColor }} />
            <div className="w-1 h-4 bg-slate-400 rounded-full" />
          </div>
          <div className="w-full h-2.5 bg-[#0f172a] rounded-b-[5px]" />
        </div>
        <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
          <div className="w-full flex items-center justify-between px-0.5">
            <div className="w-2.5 h-1 bg-[#ef4444] rounded-bl" />
            <div className="w-2.5 h-1 bg-[#ef4444] rounded-br" />
          </div>
          <div className="bg-white text-slate-950 px-1 py-0.2 rounded font-mono text-[6px] font-black">
            {plate || 'W1P-404'}
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleMototaxi2D = ({ plate, color = '#facc15' }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none py-1">
    <div className="relative w-[88%] h-[94%] rounded-[12px] border border-black/20 flex flex-col justify-between p-1 overflow-hidden shadow-sm" style={{ backgroundColor: color }}>
      <div className="w-full flex flex-col items-center">
        <div className="w-2 h-1.5 bg-slate-950 rounded-xs" />
        <div className="w-3 h-1 bg-yellow-300 rounded-full" />
      </div>
      <div className="w-[88%] h-2.5 mx-auto bg-[#0f172a] rounded-t-lg" />
      <div className="w-[90%] h-5 mx-auto bg-amber-400 rounded flex flex-col items-center justify-center p-0.5">
        <span className="text-[5px] font-mono font-black text-slate-950">TORITO</span>
      </div>
      <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
        <div className="w-full flex items-center justify-between px-0.5">
          <div className="w-2 h-1 bg-slate-950 rounded-xs" />
          <div className="w-1.5 h-1 bg-[#ef4444] rounded-xs" />
          <div className="w-2 h-1 bg-slate-950 rounded-xs" />
        </div>
        <div className="bg-white text-slate-950 px-1 py-0.2 rounded font-mono text-[6px] font-black">
          {plate || '5612-4B'}
        </div>
      </div>
    </div>
  </div>
);

const VehicleMoto2D = ({ plate, color = '#ea580c' }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none py-1">
    <div className="relative w-6 h-2 flex items-center justify-between z-20">
      <div className="w-1 h-1 rounded-full bg-slate-400" />
      <div className="w-3 h-1 bg-amber-300 rounded-full" />
      <div className="w-1 h-1 rounded-full bg-slate-400" />
    </div>
    <div className="relative w-4.5 h-9 rounded-full border border-black/20 flex flex-col items-center justify-between p-0.5 shadow-sm -mt-0.5 overflow-hidden" style={{ backgroundColor: color }}>
      <div className="w-1 h-1.5 bg-slate-900 rounded-full" />
      <div className="w-3 h-2 rounded bg-white/20" />
      <div className="w-3 h-2.5 bg-slate-900 rounded-sm" />
      <div className="w-2 h-0.5 bg-red-600 rounded-full" />
    </div>
    <div className="bg-white text-slate-950 px-0.5 py-0.1 rounded font-mono text-[5px] font-black mt-0.5 z-20">
      {plate || '5421-3A'}
    </div>
  </div>
);

const CustomerVehicle2D = ({ slotType = 'auto', plate, color }) => {
  if (slotType === 'moto') return <VehicleMoto2D plate={plate} color={color} />;
  if (slotType === 'camioneta') return <VehicleCamioneta2D plate={plate} color={color} />;
  if (slotType === 'mototaxi') return <VehicleMototaxi2D plate={plate} color={color} />;
  return <VehicleAuto2D plate={plate} color={color} />;
};

const DEFAULT_FALLBACK_ELEMENTS = [
  { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
  { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
  { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
  { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
  { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
  { id: 6, type: 'crosswalk', x: 500, y: 300, w: 80, h: 100, rot: 0 },
  { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA' },
  { id: 8, type: 'slot', x: 60, y: 60, w: 56, h: 96, rot: 0, code: 'A-01', status: 'free', slotType: 'auto' },
  { id: 9, type: 'slot', x: 140, y: 60, w: 68, h: 112, rot: 0, code: 'C-01', status: 'free', slotType: 'camioneta' },
  { id: 10, type: 'slot', x: 230, y: 60, w: 56, h: 96, rot: 0, code: 'A-02', status: 'occupied', slotType: 'auto', plate: 'ABC-123' },
  { id: 11, type: 'slot', x: 310, y: 60, w: 48, h: 80, rot: 0, code: 'T-01', status: 'occupied', slotType: 'mototaxi', plate: '5612-4B' },
  { id: 12, type: 'slot', x: 380, y: 60, w: 48, h: 80, rot: 0, code: 'T-02', status: 'free', slotType: 'mototaxi' },
  { id: 13, type: 'slot', x: 450, y: 60, w: 38, h: 65, rot: 0, code: 'M-01', status: 'free', slotType: 'moto' },
  { id: 14, type: 'slot', x: 510, y: 60, w: 38, h: 65, rot: 0, code: 'M-02', status: 'occupied', slotType: 'moto', plate: '5421-3A' },
  { id: 15, type: 'slot', x: 620, y: 60, w: 56, h: 96, rot: 0, code: 'A-03', status: 'free', slotType: 'auto' },
  { id: 16, type: 'slot', x: 700, y: 60, w: 68, h: 112, rot: 0, code: 'C-02', status: 'occupied', slotType: 'camioneta', plate: 'W1P-404' },
  { id: 17, type: 'slot', x: 790, y: 60, w: 56, h: 96, rot: 0, code: 'A-04', status: 'free', slotType: 'auto' },
  
  { id: 18, type: 'slot', x: 60, y: 480, w: 56, h: 96, rot: 0, code: 'B-01', status: 'free', slotType: 'auto' },
  { id: 19, type: 'slot', x: 140, y: 480, w: 56, h: 96, rot: 0, code: 'B-02', status: 'free', slotType: 'auto' },
  { id: 20, type: 'slot', x: 220, y: 480, w: 68, h: 112, rot: 0, code: 'C-03', status: 'occupied', slotType: 'camioneta', plate: 'AYC-888' },
  { id: 21, type: 'slot', x: 310, y: 480, w: 56, h: 96, rot: 0, code: 'B-03', status: 'free', slotType: 'auto' },
  { id: 22, type: 'slot', x: 390, y: 480, w: 56, h: 96, rot: 0, code: 'B-04', status: 'free', slotType: 'auto' },
  { id: 23, type: 'slot', x: 470, y: 480, w: 48, h: 80, rot: 0, code: 'T-03', status: 'free', slotType: 'mototaxi' },
  { id: 24, type: 'slot', x: 540, y: 480, w: 38, h: 65, rot: 0, code: 'M-03', status: 'free', slotType: 'moto' },
  { id: 25, type: 'slot', x: 620, y: 480, w: 56, h: 96, rot: 0, code: 'B-05', status: 'free', slotType: 'auto' },
  { id: 26, type: 'slot', x: 700, y: 480, w: 56, h: 96, rot: 0, code: 'B-06', status: 'free', slotType: 'auto' },
  { id: 27, type: 'slot', x: 780, y: 480, w: 56, h: 96, rot: 0, code: 'B-07', status: 'free', slotType: 'auto' }
];

const mapServerSlot = (s) => ({
  id: s.id,
  type: 'slot',
  code: s.code,
  status: s.status || 'free',
  slotType: s.slot_type || 'auto',
  x: s.pos_x || 0,
  y: s.pos_y || 0,
  w: s.width || 56,
  h: s.height || 96,
  rot: s.rotation || 0
});

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
  const { reservations, bookingError } = useEstablishments();
  const BASE_WIDTH = 1100;
  const BASE_HEIGHT = 700;
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  
  const [remotePlan, setRemotePlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('idle');
  const [planErrorDetail, setPlanErrorDetail] = useState('');

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hours, setHours] = useState(2);
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedPlate, setSelectedPlate] = useState('');
  const [useCustomPlate, setUseCustomPlate] = useState(false);
  const [customPlateInput, setCustomPlateInput] = useState('');

  // Modalidad comercial
  const [bookingModel, setBookingModel] = useState('postpaid');
  const [vehicleCategory, setVehicleCategory] = useState('auto');
  
  // Comprobante SUNAT
  const [receiptType, setReceiptType] = useState('boleta');
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');

  const activeUserReservation = useMemo(() => {
    return (reservations || []).find(r => r && (
      r.status === 'SCHEDULED' || r.status === 'ACTIVE' || 
      r.status === 'scheduled' || r.status === 'active'
    ));
  }, [reservations]);

  useEffect(() => {
    let cancelled = false;
    setVehiclesLoading(true);
    api.get('/vehicles')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setVehicles(list);
        if (list.length > 0) {
          setSelectedPlate(list[0].license_plate);
          setUseCustomPlate(false);
        } else {
          setUseCustomPlate(true);
        }
      })
      .catch(() => { if (!cancelled) { setVehicles([]); setUseCustomPlate(true); } })
      .finally(() => { if (!cancelled) setVehiclesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const numericParkingId = useMemo(() => {
    if (!parking) return NaN;
    const direct = Number(parking.id);
    if (!isNaN(direct)) return direct;
    const match = String(parking.id).match(/\d+/);
    return match ? Number(match[0]) : NaN;
  }, [parking]);

  useEffect(() => {
    setSelectedSlot(null);
    setRemotePlan(null);
    setPlanErrorDetail('');
    if (!parking || isNaN(numericParkingId)) {
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
  }, [parking?.id]);

  const elements = planStatus === 'ready' && remotePlan
    ? [...remotePlan.elements, ...remotePlan.slots]
    : (planElements && planElements.length > 0 ? planElements : DEFAULT_FALLBACK_ELEMENTS);

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
  const freeSlots = slots.filter(s => s.status === 'free');
  const totalSlots = slots.length;

  useEffect(() => {
    if (!selectedSlot && freeSlots.length > 0) {
      setSelectedSlot(freeSlots[0]);
    }
  }, [elements]);

  const handleSlotClick = (slot) => {
    if (slot.status === 'free') {
      setSelectedSlot(slot);
    }
  };

  const arrivalWindow = Math.max(5, Math.min(60, Number(parking?.tolerance ?? parking?.tolerance_minutes ?? 15) || 15));
  const effectivePlate = (useCustomPlate ? customPlateInput : selectedPlate).toUpperCase().trim();

  const baseHourlyRate = parking?.rate || 5.0;
  const rawCost = baseHourlyRate * (Number(hours) || 1);
  const discountRate = bookingModel === 'prepaid_discount' ? 0.10 : 0.0;
  const discountAmount = rawCost * discountRate;
  const finalTotalCost = Math.max(0, rawCost - discountAmount);
  
  const subtotalBase = finalTotalCost / 1.18;
  const igvAmount = finalTotalCost - subtotalBase;

  const canReserve = planStatus !== 'unregistered' && planStatus !== 'loading' && !!selectedSlot && selectedSlot.status === 'free' && !!effectivePlate;

  const handleExecuteBooking = () => {
    if (!canReserve) return;
    const now = new Date();
    const start = new Date(now.getTime() + Number(etaMinutes || 0) * 60 * 1000);
    const end = new Date(start.getTime() + Number(hours || 1) * 60 * 60 * 1000);

    const bookingPayload = {
      slotId: selectedSlot.id,
      slotCode: selectedSlot.code,
      slotType: selectedSlot.slotType || vehicleCategory,
      vehicleCategory,
      parkingId: numericParkingId,
      parkingName: parking?.name || 'Smart Park Central',
      hours: Number(hours) || 1,
      etaMinutes: Number(etaMinutes) || 0,
      arrivalWindow,
      plate: effectivePlate.split(' ')[0],
      rawCost,
      discountAmount,
      totalCost: finalTotalCost,
      bookingModel,
      receiptType,
      rucNumber: receiptType === 'factura' ? rucNumber : undefined,
      businessName: receiptType === 'factura' ? businessName : undefined,
      code: `RSV-${Date.now().toString().slice(-6)}`,
      token: `SPK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      startTime: start,
      expiresAt: end,
      payNow: bookingModel !== 'postpaid',
      paymentMethod: bookingModel === 'wallet' ? 'Billetera Digital' : bookingModel === 'corporate_b2b' ? 'Crédito Flota B2B' : bookingModel === 'prepaid_discount' ? 'Prepago Asegurado (-10%)' : 'Pago en garita al salir'
    };

    if (onReserveSlot) {
      onReserveSlot(bookingPayload);
    }
  };

  return (
    <div className="space-y-4">
      
      {planStatus === 'unregistered' && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Sede en modo demostración. No admite reservas reales en el servidor.</span>
        </div>
      )}
      {planStatus === 'loading' && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-slate-500 shrink-0 animate-spin" />
          <span>Cargando plano de la sede...</span>
        </div>
      )}

      {/* Cabecera Limpia de la Sede */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{parking?.name || 'Smart Park Central'}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
            <span>{parking?.address || 'Portal Unión 42'}, {parking?.city || 'Ayacucho'}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Tarifa</span>
            <span className="font-bold text-slate-900 text-sm">S/ {baseHourlyRate.toFixed(2)}/h</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px]">Disponibilidad</span>
            <span className="font-bold text-emerald-700">{freeSlots.length} de {totalSlots} libres</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Contenedor del Plano Asfáltico Cenital */}
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-[#0d121c] rounded-2xl p-4 border border-slate-800 flex items-center justify-center relative overflow-hidden h-[440px] sm:h-[500px] lg:h-[580px]"
        >
          <div 
            style={{ 
              width: `${BASE_WIDTH}px`, 
              height: `${BASE_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              backgroundColor: '#131a26'
            }}
            className="relative rounded-2xl border border-slate-700 overflow-hidden select-none shrink-0"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,#1c2536_0%,#111722_100%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:100px_100px]" />

            {elements.map((el) => {
              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id || selectedSlot?.code === el.code;
                const slotType = el.slotType || 'auto';

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
                    className={`absolute rounded-lg border transition-all flex flex-col justify-between p-1.5 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/80 ring-2 ring-cyan-400/50 z-30'
                        : isFree
                        ? 'border-white/70 bg-slate-900/40 text-slate-100 hover:border-white z-10'
                        : 'border-slate-600/40 bg-slate-950/30 cursor-not-allowed z-5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold z-10 leading-none">
                      <span className="text-white">{el.code}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    </div>

                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10 w-full h-full">
                      {isFree ? (
                        <div className="w-6 h-7 rounded border border-dashed border-white/25 flex items-center justify-center">
                          {slotType === 'moto' ? (
                            <Bike className="w-3 h-3 text-slate-400" />
                          ) : slotType === 'camioneta' ? (
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                          ) : slotType === 'mototaxi' ? (
                            <Navigation className="w-3 h-3 text-slate-400 rotate-45" />
                          ) : (
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      ) : (
                        <CustomerVehicle2D slotType={slotType} plate={el.plate} />
                      )}
                    </div>

                    <div className="w-full h-1 bg-amber-500/80 rounded-xs z-10 my-0.5" />

                    <div className="text-center text-[8px] font-mono font-bold leading-none z-10">
                      {isSelected ? (
                        <span className="text-cyan-300">SELECCIONADO</span>
                      ) : isFree ? (
                        <span className="text-emerald-400">LIBRE</span>
                      ) : (
                        <span className="text-slate-400">OCUPADO</span>
                      )}
                    </div>
                  </div>
                );
              }

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
                    className="absolute bg-slate-600 border border-slate-500 rounded-xs z-5"
                  />
                );
              }

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
                    className="absolute bg-[#111620] border border-slate-700/50 rounded-lg flex items-center justify-center z-1 pointer-events-none"
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">{el.label || 'VÍA INTERNA'}</span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Panel Lateral de Reserva y Opciones Comerciales */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 text-white">
          <div className="space-y-3.5">
            
            {/* Categoría de Vehículo */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Vehículo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'auto', label: 'Auto', icon: Car },
                  { id: 'camioneta', label: 'Camioneta', icon: Truck },
                  { id: 'mototaxi', label: 'Mototaxi', icon: Navigation },
                  { id: 'moto', label: 'Moto', icon: Bike }
                ].map((v) => {
                  const Icon = v.icon;
                  const isCur = vehicleCategory === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleCategory(v.id)}
                      className={`p-2 rounded-xl text-xs font-semibold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isCur 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Placa */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">
                  Placa
                </label>
                {vehicles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !useCustomPlate;
                      setUseCustomPlate(nextMode);
                      if (!nextMode && vehicles.length > 0) {
                        setSelectedPlate(vehicles[0].license_plate);
                      } else {
                        setCustomPlateInput('');
                      }
                    }}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    {useCustomPlate ? 'Mis vehículos' : 'Otra placa'}
                  </button>
                )}
              </div>

              {vehiclesLoading ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
                </div>
              ) : vehicles.length > 0 && !useCustomPlate ? (
                <select 
                  value={selectedPlate} 
                  onChange={(e) => setSelectedPlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.license_plate}>{v.license_plate} - {v.brand || 'Vehículo'}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customPlateInput}
                  onChange={(e) => setCustomPlateInput(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none"
                />
              )}
            </div>

            {/* Modalidades Comerciales */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Forma de Pago
              </label>
              
              <div className="space-y-1.5">
                {[
                  {
                    id: 'postpaid',
                    title: 'Pagar en garita al salir',
                    desc: 'Efectivo, Yape, Plin o POS',
                    costText: `S/ ${rawCost.toFixed(2)}`
                  },
                  {
                    id: 'prepaid_discount',
                    title: 'Prepago online (-10% dto.)',
                    desc: 'Tarjeta o pago digital anticipado',
                    costText: `S/ ${(rawCost * 0.90).toFixed(2)}`
                  },
                  {
                    id: 'wallet',
                    title: 'Smart-Park Wallet',
                    desc: 'Cargo a saldo disponible',
                    costText: `S/ ${rawCost.toFixed(2)}`
                  },
                  {
                    id: 'corporate_b2b',
                    title: 'Cuenta Corporativa B2B',
                    desc: 'Facturación a crédito por RUC',
                    costText: 'Crédito'
                  }
                ].map((mode) => {
                  const isCur = bookingModel === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBookingModel(mode.id)}
                      className={`w-full p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isCur
                          ? 'bg-slate-800 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold block">{mode.title}</span>
                        <span className="text-[10px] text-slate-400 block">{mode.desc}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">{mode.costText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duración y ETA */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Horas
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden h-9 px-1">
                  <button
                    type="button"
                    onClick={() => setHours(prev => Math.max(1, (Number(prev) || 1) - 1))}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded font-bold"
                  >-</button>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={hours}
                    onChange={(e) => setHours(parseInt(e.target.value, 10) || 1)}
                    className="w-10 text-center bg-transparent text-xs font-mono font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHours(prev => Math.min(168, (Number(prev) || 1) + 1))}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded font-bold"
                  >+</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Llegada
                </label>
                <select
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-2 text-xs font-mono font-semibold text-white outline-none cursor-pointer"
                >
                  <option value={0}>Ahora</option>
                  <option value={15}>En 15 min</option>
                  <option value={30}>En 30 min</option>
                  <option value={60}>En 1 hora</option>
                </select>
              </div>
            </div>

            {/* Comprobante SUNAT */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Comprobante SUNAT:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReceiptType('boleta')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${receiptType === 'boleta' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Boleta
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptType('factura')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${receiptType === 'factura' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Factura
                  </button>
                </div>
              </div>

              {receiptType === 'factura' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <input
                    type="text"
                    value={rucNumber}
                    onChange={(e) => setRucNumber(e.target.value)}
                    placeholder="RUC (11 dígitos)"
                    maxLength={11}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Razón Social"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Desglose */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({Number(hours) || 1}h):</span>
                <span className="text-slate-200">S/ {rawCost.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-cyan-400">
                  <span>Descuento prepago:</span>
                  <span>- S/ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>IGV (18% incluido):</span>
                <span>S/ {igvAmount.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between font-bold text-white items-center">
                <span>Total a Pagar:</span>
                <span className="text-emerald-400 text-sm">
                  S/ {finalTotalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Aviso si ya cuenta con reserva activa */}
            {activeUserReservation && (
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-700/60 rounded-xl text-xs text-cyan-200 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Reserva activa en curso</span>
                </div>
                <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                  Ya tienes la reserva <span className="font-mono font-bold text-white">{activeUserReservation.code || activeUserReservation.id}</span> ({activeUserReservation.plate || activeUserReservation.license_plate}). Cancela o finaliza esa reserva para apartar otra plaza.
                </p>
              </div>
            )}

            {/* Mensaje de error si la creación falló */}
            {bookingError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-700/60 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{bookingError}</span>
              </div>
            )}

          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="default"
              onClick={handleExecuteBooking}
              disabled={!canReserve || !!activeUserReservation}
              className="w-full py-3 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>{activeUserReservation ? 'Tienes una reserva activa' : 'Confirmar Reserva'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            {!canReserve && !effectivePlate && (
              <p className="text-[11px] text-amber-400 text-center mt-1">Ingresa o selecciona una placa para continuar.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
