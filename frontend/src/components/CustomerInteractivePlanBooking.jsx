import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Umbrella, 
  Bike, 
  Truck, 
  Navigation, 
  CreditCard, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Lock, 
  Timer, 
  Lightbulb, 
  Wallet, 
  Building2, 
  Receipt, 
  Award, 
  ArrowRight,
  ShieldAlert,
  Percent,
  Compass
} from 'lucide-react';
import { Button } from './ui/button';

// ============================================================
// COMPONENTES DE VEHÍCULOS VECTORIALES FOTORREALISTAS (TOP-DOWN)
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
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none py-1 filter drop-shadow-[2px_3px_4px_rgba(0,0,0,0.55)]">
      <div className="absolute left-[2px] top-[26%] w-1.5 h-2.5 rounded-l-full border border-black/20" style={{ backgroundColor: finalColor }} />
      <div className="absolute right-[2px] top-[26%] w-1.5 h-2.5 rounded-r-full border border-black/20" style={{ backgroundColor: finalColor }} />
      <div className="relative w-[86%] h-[95%] rounded-[14px] flex flex-col justify-between p-1 overflow-hidden border border-black/15 shadow-sm" style={{ backgroundColor: finalColor }}>
        <div className="w-full flex items-center justify-between px-0.5 pt-0.5">
          <div className="w-2 h-1.5 rounded-tl-lg bg-[#fde047] shadow-[0_0_4px_#fde047]" />
          {isYellowTaxi && <div className="text-[4px] font-black bg-black text-yellow-400 px-0.5 rounded">TAXI</div>}
          <div className="w-2 h-1.5 rounded-tr-lg bg-[#fde047] shadow-[0_0_4px_#fde047]" />
        </div>
        <div className="relative w-[90%] mx-auto my-auto bg-[#1e293b] rounded-[8px] p-0.5 border border-black/20 flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="w-full h-3 bg-[#0f172a] rounded-t-[6px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_35%,rgba(255,255,255,0.45)_50%,transparent_65%)]" />
          </div>
          <div className="w-full flex items-center justify-between my-0.5 px-0.5">
            <div className="w-0.5 h-2.5 bg-[#0f172a]" />
            <div className="flex-1 h-2.5 mx-0.5 rounded flex items-center justify-center border border-black/10" style={{ backgroundColor: finalColor }} />
            <div className="w-0.5 h-2.5 bg-[#0f172a]" />
          </div>
          <div className="w-full h-2.5 bg-[#0f172a] rounded-b-[6px]" />
        </div>
        <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
          <div className="w-full flex items-center justify-between px-0.5">
            <div className="w-2 h-1 rounded-bl-lg bg-[#ef4444]" />
            <div className="w-2 h-1 rounded-br-lg bg-[#ef4444]" />
          </div>
          <div className="bg-white text-slate-950 px-1 py-0.2 rounded border border-slate-400 shadow-xs font-mono text-[6px] font-black tracking-tighter">
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
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none py-1 filter drop-shadow-[3px_4px_5px_rgba(0,0,0,0.6)]">
      <div className="absolute left-[1px] top-[24%] w-1.5 h-3 rounded-l-full border border-black/25" style={{ backgroundColor: finalColor }} />
      <div className="absolute right-[1px] top-[24%] w-1.5 h-3 rounded-r-full border border-black/25" style={{ backgroundColor: finalColor }} />
      <div className="relative w-[90%] h-[96%] rounded-[16px] flex flex-col justify-between p-1 overflow-hidden border border-black/20 shadow-md" style={{ backgroundColor: finalColor }}>
        <div className="w-full flex items-center justify-between px-0.5">
          <div className="w-2.5 h-1.5 rounded-tl-lg bg-[#fde047]" />
          <span className="text-[5px] font-black text-slate-950 bg-white/60 px-0.5 rounded">4x4</span>
          <div className="w-2.5 h-1.5 rounded-tr-lg bg-[#fde047]" />
        </div>
        <div className="relative w-[92%] mx-auto my-auto bg-[#1e293b] rounded-[10px] p-0.5 border border-black/25 flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="w-full h-3.5 bg-[#0f172a] rounded-t-[7px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)]" />
          </div>
          <div className="w-full flex items-center justify-between my-0.5 px-0.5">
            <div className="w-1 h-4 bg-slate-400 rounded-full" />
            <div className="flex-1 h-4 mx-0.5 rounded flex items-center justify-center" style={{ backgroundColor: finalColor }}>
              <span className="text-[4px] font-mono font-black text-slate-900">SUV</span>
            </div>
            <div className="w-1 h-4 bg-slate-400 rounded-full" />
          </div>
          <div className="w-full h-2.5 bg-[#0f172a] rounded-b-[7px]" />
        </div>
        <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
          <div className="w-full flex items-center justify-between px-0.5">
            <div className="w-2.5 h-1 rounded-bl-lg bg-[#ef4444]" />
            <div className="w-2.5 h-1 rounded-br-lg bg-[#ef4444]" />
          </div>
          <div className="bg-white text-slate-950 px-1 py-0.2 rounded border border-slate-400 shadow-xs font-mono text-[6px] font-black tracking-tighter">
            {plate || 'W1P-404'}
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleMototaxi2D = ({ plate, color = '#facc15' }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none py-1 filter drop-shadow-[2px_3px_4px_rgba(0,0,0,0.55)]">
    <div className="relative w-[88%] h-[94%] rounded-[14px] border border-black/20 flex flex-col justify-between p-1 overflow-hidden shadow-sm" style={{ backgroundColor: color }}>
      <div className="w-full flex flex-col items-center">
        <div className="w-2 h-1.5 bg-slate-950 rounded-xs" />
        <div className="w-3 h-1 bg-yellow-300 rounded-full shadow-[0_0_6px_#fde047]" />
      </div>
      <div className="w-[88%] h-2.5 mx-auto bg-[#0f172a] rounded-t-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)]" />
      </div>
      <div className="w-[90%] h-5 mx-auto bg-amber-400 rounded border border-amber-500 shadow-sm flex flex-col items-center justify-center p-0.5">
        <span className="text-[5px] font-mono font-black text-slate-950 tracking-wider">TORITO</span>
      </div>
      <div className="w-full flex flex-col items-center gap-0.5 pb-0.5">
        <div className="w-full flex items-center justify-between px-0.5">
          <div className="w-2 h-1 bg-slate-950 rounded-xs -ml-0.5" />
          <div className="w-1.5 h-1 bg-[#ef4444] rounded-xs" />
          <div className="w-2 h-1 bg-slate-950 rounded-xs -mr-0.5" />
        </div>
        <div className="bg-white text-slate-950 px-1 py-0.2 rounded font-mono text-[6px] font-black tracking-tighter">
          {plate || '5612-4B'}
        </div>
      </div>
    </div>
  </div>
);

const VehicleMoto2D = ({ plate, color = '#ea580c' }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none py-1 filter drop-shadow-[2px_3px_4px_rgba(0,0,0,0.6)]">
    <div className="relative w-6 h-2 flex items-center justify-between z-20">
      <div className="w-1 h-1 rounded-full bg-slate-400 border border-slate-700" />
      <div className="w-3 h-1 bg-amber-300 rounded-full shadow-[0_0_4px_#fde047]" />
      <div className="w-1 h-1 rounded-full bg-slate-400 border border-slate-700" />
    </div>
    <div className="relative w-4.5 h-9 rounded-full border border-black/20 flex flex-col items-center justify-between p-0.5 shadow-sm -mt-0.5 overflow-hidden" style={{ backgroundColor: color }}>
      <div className="w-1 h-1.5 bg-slate-900 rounded-full" />
      <div className="w-3 h-2 rounded bg-white/20 border border-white/30" />
      <div className="w-3 h-2.5 bg-slate-900 rounded-sm" />
      <div className="w-2 h-0.5 bg-red-600 rounded-full" />
    </div>
    <div className="bg-white text-slate-950 px-0.5 py-0.1 rounded font-mono text-[5px] font-black tracking-tighter mt-0.5 z-20">
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
  { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA ANPR' },
  { id: 8, type: 'slot', x: 60, y: 60, w: 56, h: 96, rot: 0, code: 'A-01', status: 'free', slotType: 'auto', shaded: true },
  { id: 9, type: 'slot', x: 140, y: 60, w: 68, h: 112, rot: 0, code: 'C-01', status: 'free', slotType: 'camioneta', shaded: true },
  { id: 10, type: 'slot', x: 230, y: 60, w: 56, h: 96, rot: 0, code: 'A-02', status: 'occupied', slotType: 'auto', plate: 'ABC-123', shaded: true },
  { id: 11, type: 'slot', x: 310, y: 60, w: 48, h: 80, rot: 0, code: 'T-01', status: 'occupied', slotType: 'mototaxi', plate: '5612-4B', shaded: true },
  { id: 12, type: 'slot', x: 380, y: 60, w: 48, h: 80, rot: 0, code: 'T-02', status: 'free', slotType: 'mototaxi', shaded: true },
  { id: 13, type: 'slot', x: 450, y: 60, w: 38, h: 65, rot: 0, code: 'M-01', status: 'free', slotType: 'moto', shaded: true },
  { id: 14, type: 'slot', x: 510, y: 60, w: 38, h: 65, rot: 0, code: 'M-02', status: 'occupied', slotType: 'moto', plate: '5421-3A', shaded: true },
  { id: 15, type: 'slot', x: 620, y: 60, w: 56, h: 96, rot: 0, code: 'A-03', status: 'free', slotType: 'auto', shaded: false },
  { id: 16, type: 'slot', x: 700, y: 60, w: 68, h: 112, rot: 0, code: 'C-02', status: 'occupied', slotType: 'camioneta', plate: 'W1P-404', shaded: false },
  { id: 17, type: 'slot', x: 790, y: 60, w: 56, h: 96, rot: 0, code: 'A-04', status: 'free', slotType: 'auto', shaded: false },
  
  { id: 18, type: 'slot', x: 60, y: 480, w: 56, h: 96, rot: 0, code: 'B-01', status: 'free', slotType: 'auto', shaded: false },
  { id: 19, type: 'slot', x: 140, y: 480, w: 56, h: 96, rot: 0, code: 'B-02', status: 'free', slotType: 'auto', shaded: false },
  { id: 20, type: 'slot', x: 220, y: 480, w: 68, h: 112, rot: 0, code: 'C-03', status: 'occupied', slotType: 'camioneta', plate: 'AYC-888', shaded: false },
  { id: 21, type: 'slot', x: 310, y: 480, w: 56, h: 96, rot: 0, code: 'B-03', status: 'free', slotType: 'auto', shaded: false },
  { id: 22, type: 'slot', x: 390, y: 480, w: 56, h: 96, rot: 0, code: 'B-04', status: 'free', slotType: 'auto', shaded: false },
  { id: 23, type: 'slot', x: 470, y: 480, w: 48, h: 80, rot: 0, code: 'T-03', status: 'free', slotType: 'mototaxi', shaded: false },
  { id: 24, type: 'slot', x: 540, y: 480, w: 38, h: 65, rot: 0, code: 'M-03', status: 'free', slotType: 'moto', shaded: false },
  { id: 25, type: 'slot', x: 620, y: 480, w: 56, h: 96, rot: 0, code: 'B-05', status: 'free', slotType: 'auto', shaded: false },
  { id: 26, type: 'slot', x: 700, y: 480, w: 56, h: 96, rot: 0, code: 'B-06', status: 'free', slotType: 'auto', shaded: false },
  { id: 27, type: 'slot', x: 780, y: 480, w: 56, h: 96, rot: 0, code: 'B-07', status: 'free', slotType: 'auto', shaded: false }
];

const mapServerSlot = (s) => ({
  id: s.id,
  type: 'slot',
  code: s.code,
  status: s.status || 'free',
  slotType: s.slot_type || 'auto',
  shaded: false,
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

  const [bookingModel, setBookingModel] = useState('postpaid');
  const [vehicleCategory, setVehicleCategory] = useState('auto');
  
  const [receiptType, setReceiptType] = useState('boleta');
  const [rucNumber, setRucNumber] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [driverTrustScore] = useState(98);
  const [walletBalance] = useState(35.00);

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
    <div className="space-y-6 animate-in fade-in">
      
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-4 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Conductor Nivel Platino</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {driverTrustScore} pts
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tolerancia extendida (+20m de gracia) • Reembolso 100% en cancelaciones anticipadas • Prioridad LPR.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block leading-tight">Smart Wallet</span>
              <span className="text-sm font-black text-emerald-400">S/ {walletBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {planStatus === 'unregistered' && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Esta sede está en modo catálogo y no admite reservas inmediatas en el servidor.</span>
        </div>
      )}
      {planStatus === 'loading' && (
        <div className="p-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <Loader2 className="w-5 h-5 text-slate-500 shrink-0 animate-spin" />
          <span>Cargando plano en tiempo real de la sede...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{parking?.name || 'Smart Park Central'}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Abierto 24/7
            </span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" /> 
            <span>{parking?.address || 'Portal Unión 42, Centro Histórico'}, {parking?.city || 'Ayacucho - Huamanga'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Tarifa Base</span>
            <span className="text-xl font-black text-emerald-600 font-mono">S/ {baseHourlyRate.toFixed(2)}/h</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{freeSlots.length} Libres de {totalSlots}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-[#090d16] rounded-3xl p-3 sm:p-5 border-4 border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden h-[480px] sm:h-[560px] lg:h-[660px]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, #121927 0%, #070a10 100%),
              radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 24px 24px'
          }}
        >
          <div 
            style={{ 
              width: `${BASE_WIDTH}px`, 
              height: `${BASE_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              backgroundColor: '#111723',
              boxShadow: '0 30px 70px -15px rgba(0,0,0,0.98), 0 0 0 1px rgba(255,255,255,0.08)'
            }}
            className="relative rounded-3xl border-4 border-slate-700/80 overflow-hidden select-none shrink-0 transition-transform duration-150 ease-out"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,#243044_0%,#17202f_45%,#0e141f_100%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(rgba(255,255,255,0.4)_0.6px,transparent_0.6px),radial-gradient(rgba(0,0,0,0.7)_0.8px,transparent_0.8px)] bg-[size:5px_5px,9px_9px]" />
            <div className="absolute inset-0 pointer-events-none opacity-35 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.55)_1px,transparent_1px)] bg-[size:120px_120px]" />

            {elements.map((el) => {
              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id || selectedSlot?.code === el.code;
                const slotType = el.slotType || 'auto';
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
                    className={`absolute rounded-xl border-2 transition-all duration-200 flex flex-col justify-between p-1.5 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'ring-4 ring-cyan-400 border-cyan-400 bg-cyan-950/80 shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-105 z-30'
                        : isFree
                        ? 'border-white/80 bg-slate-900/40 text-slate-100 hover:border-white hover:scale-105 z-10'
                        : 'border-slate-500/40 bg-slate-950/30 cursor-not-allowed z-5'
                    }`}
                  >
                    {isShaded && (
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.18),rgba(245,158,11,0.18)_6px,transparent_6px,transparent_12px)] pointer-events-none rounded-xl" />
                    )}

                    <div className="absolute top-1 right-1 flex items-center z-20 pointer-events-none">
                      <div className={`w-2 h-2 rounded-full ${
                        isFree ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                      }`} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono font-black z-10 leading-none pr-3">
                      <span className="text-white drop-shadow-sm">{el.code}</span>
                      {isShaded && <span className="text-[6px] text-amber-300 font-bold bg-amber-950/80 px-1 rounded">TECHADO</span>}
                    </div>

                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10 w-full h-full">
                      {isFree ? (
                        <div className="w-6 h-8 rounded border border-dashed border-white/30 flex items-center justify-center">
                          {slotType === 'moto' ? (
                            <Bike className="w-3.5 h-3.5 text-orange-400/50" />
                          ) : slotType === 'camioneta' ? (
                            <Truck className="w-4 h-4 text-cyan-400/50" />
                          ) : slotType === 'mototaxi' ? (
                            <Navigation className="w-3.5 h-3.5 text-yellow-400/50 rotate-45" />
                          ) : (
                            <Car className="w-4 h-4 text-emerald-400/50" />
                          )}
                        </div>
                      ) : (
                        <CustomerVehicle2D slotType={slotType} plate={el.plate} />
                      )}
                    </div>

                    <div className="w-full h-1.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300/60 shadow-xs flex items-center justify-around px-0.5 z-10 my-0.5 overflow-hidden">
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                      <div className="w-1 h-full bg-black transform -skew-x-12" />
                    </div>

                    <div className="text-center text-[8px] font-mono font-bold leading-none z-10">
                      {isSelected ? (
                        <span className="text-cyan-300 font-black animate-pulse">✓ ELEGIDO</span>
                      ) : isFree ? (
                        <span className="text-emerald-400 font-extrabold">LIBRE</span>
                      ) : (
                        <span className="text-rose-400 font-bold">OCUPADO</span>
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
                    className="absolute bg-slate-600 border border-slate-500 rounded-xs shadow-md z-5"
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
                    className="absolute bg-[#121824] border border-slate-700/60 rounded-xl flex items-center justify-center z-1 pointer-events-none"
                  >
                    <span className="text-[11px] font-mono font-black text-slate-500/70 tracking-widest uppercase">{el.label || 'CARRIL DE TRÁNSITO'}</span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 text-white">
          <div className="space-y-4">
            
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
                Tipo de Vehículo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'auto', label: 'Auto', icon: Car },
                  { id: 'camioneta', label: '4x4', icon: Truck },
                  { id: 'mototaxi', label: 'Torito', icon: Navigation },
                  { id: 'moto', label: 'Moto', icon: Bike }
                ].map((v) => {
                  const Icon = v.icon;
                  const isCur = vehicleCategory === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleCategory(v.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isCur 
                          ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300' 
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 block">
                  Placa de Vehículo
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
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer underline"
                  >
                    {useCustomPlate ? '← Mi vehículo' : '+ Otra placa'}
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
                  placeholder="Ej. ABC-123 o P1A-999"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                Modalidad Comercial
              </label>
              
              <div className="grid grid-cols-1 gap-2">
                
                <button
                  type="button"
                  onClick={() => setBookingModel('postpaid')}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                    bookingModel === 'postpaid'
                      ? 'bg-slate-800/90 border-emerald-400 ring-2 ring-emerald-400/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-xl ${bookingModel === 'postpaid' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Reserva Libre (Paga al Salir)</span>
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">S/ 0.00 HOY</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Paga en garita con Yape, efectivo o POS al retirar tu vehículo.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingModel('prepaid_discount')}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                    bookingModel === 'prepaid_discount'
                      ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-xl ${bookingModel === 'prepaid_discount' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Prepago Digital (-10% OFF)</span>
                        <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">AHORRA 10%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Plaza 100% blindada sin vencimiento anticipado + Check-in LPR.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingModel('wallet')}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                    bookingModel === 'wallet'
                      ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-xl ${bookingModel === 'wallet' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Smart-Park Wallet</span>
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">+5% BONUS</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Débito instantáneo de tu saldo (Saldo actual: S/ {walletBalance.toFixed(2)}).
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingModel('corporate_b2b')}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-start justify-between cursor-pointer ${
                    bookingModel === 'corporate_b2b'
                      ? 'bg-slate-800/90 border-purple-400 ring-2 ring-purple-400/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-xl ${bookingModel === 'corporate_b2b' ? 'bg-purple-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Flota Corporativa / B2B</span>
                        <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">CRÉDITO RUC</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Cargo a la cuenta corporativa de tu empresa con factura consolidada.
                      </p>
                    </div>
                  </div>
                </button>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Horas de Estadía
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
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Llegada (ETA)
                </label>
                <select
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-2 text-xs font-mono font-bold text-white outline-none cursor-pointer"
                >
                  <option value={0}>Ahora mismo</option>
                  <option value={15}>En 15 min</option>
                  <option value={30}>En 30 min</option>
                  <option value={60}>En 1 hora</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" /> Comprobante SUNAT:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReceiptType('boleta')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${receiptType === 'boleta' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Boleta
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptType('factura')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${receiptType === 'factura' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
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
                    placeholder="Razón Social de la Empresa"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa Base:</span>
                <span className="text-slate-200">S/ {baseHourlyRate.toFixed(2)} × {Number(hours) || 1}h</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-cyan-400 font-bold">
                  <span>Descuento Prepago (-10%):</span>
                  <span>- S/ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Base Imponible / IGV (18%):</span>
                <span>S/ {subtotalBase.toFixed(2)} + S/ {igvAmount.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between font-bold text-white items-center">
                <span>Total Estimado:</span>
                <span className="text-emerald-400 font-mono text-base font-black">
                  S/ {finalTotalCost.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-2 text-[10px] text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Garantía Smart-Park:</strong> Cancelación 100% gratuita hasta 15 min antes con reintegro automático a tu billetera.
              </p>
            </div>

          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="default"
              onClick={handleExecuteBooking}
              disabled={!canReserve}
              className="w-full py-3.5 text-xs font-bold gap-2 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {bookingModel === 'postpaid' ? (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Emitir Reserva Gratuita (Pagar al salir)</span>
                </>
              ) : bookingModel === 'prepaid_discount' ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Prepagar con Descuento (S/ {finalTotalCost.toFixed(2)})</span>
                </>
              ) : bookingModel === 'wallet' ? (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Pagar con Smart Wallet (S/ {finalTotalCost.toFixed(2)})</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Cargar a Flota Corporativa</span>
                </>
              )}
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
