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
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck
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
  
  const [baseScale, setBaseScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
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

  // Envolvente dinámica (Bounding Box): se ajusta a la extensión real de las plazas y vías
  const layoutBounds = useMemo(() => {
    if (!elements || elements.length === 0) {
      return { minX: 0, minY: 0, width: 960, height: 600 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      if (typeof el.x === 'number') minX = Math.min(minX, el.x);
      if (typeof el.y === 'number') minY = Math.min(minY, el.y);
      if (typeof el.x === 'number' && typeof el.w === 'number') maxX = Math.max(maxX, el.x + el.w);
      if (typeof el.y === 'number' && typeof el.h === 'number') maxY = Math.max(maxY, el.y + el.h);
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { minX: 0, minY: 0, width: 960, height: 600 };
    }

    const paddingX = 40;
    const paddingY = 35;
    const width = Math.max(480, (maxX - minX) + paddingX * 2);
    const height = Math.max(340, (maxY - minY) + paddingY * 2);

    return {
      minX: minX - paddingX,
      minY: minY - paddingY,
      width: Math.round(width),
      height: Math.round(height)
    };
  }, [elements]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          const scaleX = (clientWidth * 0.94) / layoutBounds.width;
          const scaleY = (clientHeight * 0.94) / layoutBounds.height;
          const fitScale = Math.min(scaleX, scaleY);
          setBaseScale(Math.max(0.2, fitScale));
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
  }, [layoutBounds]);

  const effectiveScale = +(baseScale * userZoom).toFixed(3);

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
      payNow: false,
      paymentMethod: 'Pago en garita al salir'
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
        
        {/* Contenedor del Plano Asfáltico Cenital con Auto-Encuadre Dinámico */}
        <div 
          ref={containerRef}
          className="lg:col-span-2 bg-[#090d16] rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden h-[440px] sm:h-[500px] lg:h-[580px] shadow-2xl select-none"
        >
          {/* Controles Flotantes de Zoom y Recentrado */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
            <button
              type="button"
              onClick={() => setUserZoom(prev => Math.min(2.2, +(prev + 0.15).toFixed(2)))}
              title="Acercar plano (+)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setUserZoom(prev => Math.max(0.6, +(prev - 0.15).toFixed(2)))}
              title="Alejar plano (-)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setUserZoom(1)}
              title="Reajustar y centrar plano"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Leyenda Arquitectónica Limpia en la Base */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2.5 sm:gap-3.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono shadow-md pointer-events-none">
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="font-bold text-cyan-300">Tu Plaza</span>
            </div>
          </div>

          {/* Lienzo Arquitectónico Asfáltico Cenital */}
          <div 
            style={{ 
              width: `${layoutBounds.width}px`, 
              height: `${layoutBounds.height}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'center center',
              backgroundColor: '#0c121e'
            }}
            className="relative rounded-2xl border border-slate-700/80 overflow-hidden select-none shrink-0 shadow-2xl transition-transform duration-150 ease-out"
          >
            {/* Grano Asfáltico y Trazado Vial de Fondo */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,#141d2e_0%,#090d16_100%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:50px_50px]" />

            {elements.map((el) => {
              const relX = el.x - layoutBounds.minX;
              const relY = el.y - layoutBounds.minY;

              if (el.type === 'slot') {
                const isFree = el.status === 'free';
                const isSelected = selectedSlot?.id === el.id || selectedSlot?.code === el.code;
                const slotType = el.slotType || 'auto';
                const isPmr = slotType === 'pmr';

                return (
                  <div
                    key={el.id}
                    onClick={() => handleSlotClick(el)}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className={`absolute rounded-xl border-2 transition-all flex flex-col justify-between p-1.5 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/90 ring-4 ring-cyan-400/40 z-30 shadow-[0_0_20px_rgba(34,211,238,0.35)] scale-[1.02]'
                        : isPmr && isFree
                        ? 'border-blue-500/80 bg-blue-950/40 text-blue-200 hover:border-blue-400 z-10'
                        : isFree
                        ? 'border-slate-400/70 bg-[#111827]/80 text-slate-100 hover:border-emerald-400 hover:bg-[#152338] z-10'
                        : 'border-slate-700/60 bg-[#0a0f18]/80 cursor-not-allowed z-5 opacity-90'
                    }`}
                  >
                    {/* Cabecera del Cajón: Código + Tipo + Indicador LED */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold z-10 leading-none">
                      <span className="text-white tracking-wider font-extrabold">{el.code}</span>
                      <div className="flex items-center gap-1">
                        {isPmr && <span className="text-[8px] bg-blue-600 text-white px-1 rounded-xs font-bold">PMR</span>}
                        <div className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'}`} />
                      </div>
                    </div>

                    {/* Silueta Central del Vehículo o Área de Estacionamiento */}
                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10 w-full h-full">
                      {isFree ? (
                        <div className={`w-7 h-9 rounded-lg border border-dashed flex items-center justify-center ${isPmr ? 'border-blue-400/40 bg-blue-900/20' : 'border-slate-500/30'}`}>
                          {slotType === 'moto' ? (
                            <Bike className="w-4 h-4 text-slate-400" />
                          ) : slotType === 'camioneta' ? (
                            <Truck className="w-4 h-4 text-slate-400" />
                          ) : slotType === 'mototaxi' ? (
                            <Navigation className="w-4 h-4 text-slate-400 rotate-45" />
                          ) : (
                            <Car className={`w-4 h-4 ${isPmr ? 'text-blue-400' : 'text-slate-400'}`} />
                          )}
                        </div>
                      ) : (
                        <CustomerVehicle2D slotType={slotType} plate={el.plate} />
                      )}
                    </div>

                    {/* Tope de Goma para Neumático (Wheel Stop con Franjas de Seguridad) */}
                    <div 
                      className="w-[85%] h-1.5 mx-auto rounded-full overflow-hidden flex shadow-xs my-0.5 pointer-events-none" 
                      style={{ background: 'repeating-linear-gradient(45deg, #eab308 0, #eab308 4px, #0f172a 4px, #0f172a 8px)' }} 
                    />

                    {/* Badge de Estado Inferior — Sin Truncamiento */}
                    <div className="text-center z-10 py-0.5 leading-none">
                      {isSelected ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[9px] tracking-tight uppercase shadow-xs">
                          TU PLAZA
                        </span>
                      ) : isFree ? (
                        <span className="text-emerald-400 font-mono font-bold text-[9px] tracking-wide">
                          LIBRE
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono font-semibold text-[8px] tracking-tight">
                          {el.plate || 'OCUPADO'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              if (el.type === 'road') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-[#0c121d] border-y border-dashed border-amber-400/40 rounded-xl flex items-center justify-center z-1 pointer-events-none"
                  >
                    <div className="w-full flex items-center justify-around px-8 opacity-60 pointer-events-none">
                      <span className="text-[11px] font-mono text-slate-400 tracking-wider">
                        {el.label || 'Vía de Circulación'}
                      </span>
                    </div>
                  </div>
                );
              }

              if (el.type === 'gate') {
                const isExit = el.gateType === 'exit' || (el.label && el.label.toLowerCase().includes('salida'));
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center justify-between p-2 z-10 pointer-events-none"
                  >
                    <div className="w-full flex items-center justify-between px-1 text-[9px] font-mono font-bold">
                      <span className={isExit ? 'text-amber-400' : 'text-emerald-400'}>
                        {isExit ? 'Salida' : 'Ingreso'}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isExit ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    </div>
                    <div 
                      className="w-full h-1.5 rounded-full my-auto"
                      style={{
                        background: 'repeating-linear-gradient(45deg, #ef4444 0, #ef4444 4px, #ffffff 4px, #ffffff 8px)'
                      }}
                    />
                  </div>
                );
              }

              if (el.type === 'crosswalk') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`,
                      background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 12px, transparent 12px, transparent 24px)'
                    }}
                    className="absolute border-y border-amber-400/50 rounded-xs z-3 pointer-events-none"
                  />
                );
              }

              if (el.type === 'wall') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-slate-700 border border-slate-600 rounded-xs z-6 shadow-md pointer-events-none"
                  />
                );
              }

              if (el.type === 'building') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-slate-800/95 border border-cyan-500/40 rounded-xl p-2 z-7 shadow-lg flex flex-col items-center justify-center text-center pointer-events-none"
                  >
                    <Building2 className="w-4 h-4 text-cyan-400 mb-1" />
                    <span className="text-[8px] font-mono font-bold text-cyan-200 uppercase tracking-tighter leading-tight">
                      {el.label || 'ADMINISTRACIÓN'}
                    </span>
                  </div>
                );
              }

              if (el.type === 'garden') {
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${el.w}px`,
                      height: `${el.h}px`,
                      transform: `rotate(${el.rot || 0}deg)`
                    }}
                    className="absolute bg-emerald-950/70 border border-emerald-600/40 rounded-xl z-2 pointer-events-none flex items-center justify-center"
                  >
                    <span className="text-[8px] font-mono text-emerald-400/80 font-bold uppercase tracking-wider">
                      {el.label || 'ÁREA VERDE'}
                    </span>
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

            {/* Tiempo Estimado de Llegada (ETA) */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tiempo Estimado de Llegada (ETA)
              </label>
              <select
                value={etaMinutes}
                onChange={(e) => setEtaMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl h-9 px-3 text-xs font-mono font-semibold text-white outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value={10}>Llego en 10 minutos</option>
                <option value={15}>Llego en 15 minutos</option>
                <option value={20}>Llego en 20 minutos</option>
                <option value={30}>Llego en 30 minutos</option>
                <option value={45}>Llego en 45 minutos</option>
                <option value={60}>Llego en 1 hora (60 min)</option>
              </select>
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

            {/* Desglose de Reserva y Condiciones de Garita */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa de Sede:</span>
                <span className="text-slate-200">S/ {baseHourlyRate.toFixed(2)} /h</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tiempo de llegada (ETA):</span>
                <span className="text-emerald-400 font-bold">{etaMinutes} min</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tolerancia de ingreso:</span>
                <span className="text-slate-300">{arrivalWindow} min</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between font-semibold text-slate-300 items-center text-xs">
                <span>Estadía a pagar:</span>
                <span className="text-emerald-400 font-bold">
                  En garita al ingresar/salir
                </span>
              </div>
            </div>

            {/* Aviso si ya cuenta con reserva activa */}
            {activeUserReservation && (
              <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 space-y-0.5">
                <span className="font-semibold text-white block">Reserva en curso</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cuentas con la reserva <span className="font-mono font-bold text-white">{activeUserReservation.code || activeUserReservation.id}</span> ({activeUserReservation.plate || activeUserReservation.license_plate}).
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
