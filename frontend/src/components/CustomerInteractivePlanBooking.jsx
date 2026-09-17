import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Move,
  ShieldCheck,
  Moon,
  Lock,
  XCircle,
  Calendar,
  Crown,
  Zap,
  Sparkles
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

const VEHICLE_SLOT_FAMILY = {
  auto: 'auto',
  car: 'auto',
  standard: 'auto',
  pmr: 'auto',
  ev: 'auto',
  camioneta: 'camioneta',
  suv: 'camioneta',
  truck: 'camioneta',
  pickup: 'camioneta',
  moto: 'moto',
  motorcycle: 'moto',
  bike: 'moto',
  scooter: 'moto',
  mototaxi: 'mototaxi',
  torito: 'mototaxi',
  trimovil: 'mototaxi',
};

const slotFamily = (slotType) => VEHICLE_SLOT_FAMILY[String(slotType || 'auto').toLowerCase()] || 'auto';
const slotMatchesVehicle = (slotType, vehicleCategory) => slotFamily(slotType) === slotFamily(vehicleCategory);

const SLOT_TYPE_LABEL = {
  auto: 'Auto',
  camioneta: 'Camioneta',
  moto: 'Moto',
  mototaxi: 'Mototaxi',
};

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

export const CustomerInteractivePlanBooking = ({ parking, planElements = [], onReserveSlot, onNavigateToVehicles, onOpenMoreBookingOptions }) => {
  const { reservations, bookingError } = useEstablishments();
  
  const [baseScale, setBaseScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasMovedRef = useRef(false);
  const touchDistanceRef = useRef(null);
  const containerRef = useRef(null);
  
  const [remotePlan, setRemotePlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('idle');
  const [planErrorDetail, setPlanErrorDetail] = useState('');
  const [collisionAlert, setCollisionAlert] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hours, setHours] = useState(2);
  const [stayMinutes, setStayMinutes] = useState(60);
  const [isOpenStay, setIsOpenStay] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(15);

  useEffect(() => {
    const defaultTol = Number(parking?.tolerance ?? parking?.tolerance_minutes ?? 15);
    if (!isNaN(defaultTol) && defaultTol > 0) {
      setEtaMinutes(defaultTol);
    }
  }, [parking?.tolerance, parking?.tolerance_minutes]);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedPlate, setSelectedPlate] = useState('');
  const [useCustomPlate, setUseCustomPlate] = useState(false);
  const [customPlateInput, setCustomPlateInput] = useState('');

  // Modalidad comercial
  const [bookingModel, setBookingModel] = useState('postpaid');
  const [vehicleCategory, setVehicleCategory] = useState('auto');
  
  // Modalidad de Reserva para el plano CAD (inmediata)
  const reservationType = 'immediate';

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

  const loadVehicles = useCallback(() => {
    setVehiclesLoading(true);
    let initialList = [];
    try {
      const savedUser = localStorage.getItem('smart_park_user_session');
      const u = savedUser ? JSON.parse(savedUser) : null;
      const key = `smart_park_vehicles_v2_${u?.id || u?.email || 'guest'}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialList = parsed;
          setVehicles(parsed);
          setSelectedPlate((curr) => {
            const exists = parsed.some(v => v.license_plate === curr);
            return exists ? curr : parsed[0].license_plate;
          });
          setUseCustomPlate(false);
          setVehiclesLoading(false);
        }
      }
    } catch {}

    api.get('/vehicles')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          setVehicles(list);
          setSelectedPlate((curr) => {
            const exists = list.some(v => v.license_plate === curr);
            return exists ? curr : list[0].license_plate;
          });
          setUseCustomPlate(false);
          try {
            const savedUser = localStorage.getItem('smart_park_user_session');
            const u = savedUser ? JSON.parse(savedUser) : null;
            const key = `smart_park_vehicles_v2_${u?.id || u?.email || 'guest'}`;
            localStorage.setItem(key, JSON.stringify(list));
          } catch {}
        } else if (initialList.length === 0) {
          setVehicles([]);
          setUseCustomPlate(true);
        }
      })
      .catch(() => {
        if (initialList.length === 0) {
          setVehicles([]);
          setUseCustomPlate(true);
        }
      })
      .finally(() => {
        setVehiclesLoading(false);
      });
  }, []);

  useEffect(() => {
    loadVehicles();

    const handleVehiclesUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        const list = e.detail;
        setVehicles(list);
        if (list.length > 0) {
          setSelectedPlate((curr) => {
            const exists = list.some(v => v.license_plate === curr);
            return exists ? curr : list[0].license_plate;
          });
          setUseCustomPlate(false);
        } else {
          setUseCustomPlate(true);
        }
      } else {
        loadVehicles();
      }
    };

    window.addEventListener('smart_park_vehicles_updated', handleVehiclesUpdated);
    window.addEventListener('storage', loadVehicles);
    return () => {
      window.removeEventListener('smart_park_vehicles_updated', handleVehiclesUpdated);
      window.removeEventListener('storage', loadVehicles);
    };
  }, [loadVehicles]);

  // Sincronizar automáticamente categoría según el vehículo seleccionado
  useEffect(() => {
    if (vehicles.length > 0 && selectedPlate) {
      const match = vehicles.find(v => v.license_plate === selectedPlate);
      if (match?.vehicle_type) {
        const vt = match.vehicle_type.toLowerCase();
        if (vt === 'suv' || vt === 'camioneta') setVehicleCategory('camioneta');
        else if (vt === 'moto' || vt === 'motorcycle' || vt === 'bike') setVehicleCategory('moto');
        else if (vt === 'mototaxi') setVehicleCategory('mototaxi');
        else setVehicleCategory('auto');
      }
    }
  }, [selectedPlate, vehicles]);

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
    setPanOffset({ x: 0, y: 0 });
    setUserZoom(1);
    if (!parking || isNaN(numericParkingId)) {
      setPlanStatus('unregistered');
      return;
    }
    let cancelled = false;
    setPlanStatus('loading');
    const fetchPlan = () => {
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
    };

    fetchPlan();

    // Sincronización en vivo cada 4 segundos mientras el modal esté activo
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPlan();
      }
    }, 4000);

    // Escucha eventos globales de floorplan actualizado
    const handleGlobalUpdate = (e) => {
      const pid = e?.detail?.parkingId;
      if (pid && String(pid) === String(numericParkingId)) {
        fetchPlan();
      }
    };
    window.addEventListener('smart_park_floorplan_updated', handleGlobalUpdate);

    // Sincronización instantánea de espacios vía WebSocket (smart_park_spaces_live)
    const handleSpacesLive = (e) => {
      const detail = e?.detail;
      if (!detail) return;
      const pid = detail.parking_id || detail.parkingId;
      if (pid && String(pid) === String(numericParkingId)) {
        const slotCode = detail.slot_code || detail.slotCode;
        const newStatus = detail.status; // 'free', 'occupied', 'reserved'

        // Anti-colisión: si el usuario tenía seleccionado este cajón y fue ocupado o reservado
        setSelectedSlot((currentSelected) => {
          if (currentSelected && slotCode && (currentSelected.code === slotCode || String(currentSelected.id) === String(detail.slot_id))) {
            if (newStatus !== 'free') {
              setCollisionAlert(`El cajón ${slotCode} acaba de ser reservado u ocupado por otro vehículo. Por favor selecciona otro.`);
              setTimeout(() => setCollisionAlert(null), 6000);
              return null;
            }
          }
          return currentSelected;
        });

        // Actualización instantánea en el modelo de dibujo 2D del canvas
        setRemotePlan((prev) => {
          if (!prev || !prev.slots) return prev;
          const updatedSlots = prev.slots.map((s) => {
            if ((slotCode && s.code === slotCode) || (detail.slot_id && String(s.id) === String(detail.slot_id))) {
              return { ...s, status: newStatus };
            }
            return s;
          });
          return { ...prev, slots: updatedSlots };
        });
      }
    };
    window.addEventListener('smart_park_spaces_live', handleSpacesLive);

    return () => { 
      cancelled = true; 
      clearInterval(iv);
      window.removeEventListener('smart_park_floorplan_updated', handleGlobalUpdate);
      window.removeEventListener('smart_park_spaces_live', handleSpacesLive);
    };
  }, [parking?.id, numericParkingId]);

  const elements = useMemo(() => {
    if (planStatus === 'ready' && remotePlan) {
      return [...(remotePlan.elements || []), ...(remotePlan.slots || [])];
    }
    return planElements && planElements.length > 0 ? planElements : DEFAULT_FALLBACK_ELEMENTS;
  }, [planStatus, remotePlan, planElements]);

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

    const paddingX = 20;
    const paddingY = 20;
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
          const scaleX = (clientWidth * 0.98) / layoutBounds.width;
          const scaleY = (clientHeight * 0.98) / layoutBounds.height;
          const fitScale = Math.min(scaleX, scaleY);
          setBaseScale(Math.max(0.25, fitScale));
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

  const slots = useMemo(() => elements.filter(e => e && e.type === 'slot'), [elements]);
  const freeSlots = useMemo(() => slots.filter(s => s.status === 'free'), [slots]);
  const compatibleFreeSlots = useMemo(
    () => freeSlots.filter((s) => slotMatchesVehicle(s.slotType, vehicleCategory)),
    [freeSlots, vehicleCategory]
  );
  const totalSlots = slots.length;

  useEffect(() => {
    const stillCompatible = selectedSlot && compatibleFreeSlots.some(
      (s) => s.id === selectedSlot.id || s.code === selectedSlot.code
    );
    if (stillCompatible) return;
    setSelectedSlot(compatibleFreeSlots[0] || null);
  }, [vehicleCategory, compatibleFreeSlots, selectedSlot]);

  // Recentrar y resetear zoom y desplazamiento
  const handleResetView = useCallback(() => {
    setUserZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Manejo de inicio de arrastre (Mouse)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y
    };
  }, [panOffset]);

  // Listener global de movimiento y liberación para que el arrastre no se corte al salir del contenedor
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 3) {
        hasMovedRef.current = true;
      }
      setPanOffset({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy)
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  // Soporte táctil en dispositivos móviles (drag de 1 dedo, pinch-to-zoom de 2 dedos)
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      hasMovedRef.current = false;
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: panOffset.x,
        panY: panOffset.y
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchDistanceRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }
  }, [panOffset]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 3) {
        hasMovedRef.current = true;
      }
      setPanOffset({
        x: Math.round(dragStartRef.current.panX + dx),
        y: Math.round(dragStartRef.current.panY + dy)
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const diff = dist - touchDistanceRef.current;
      if (Math.abs(diff) > 6) {
        hasMovedRef.current = true;
        setUserZoom((prev) => {
          const factor = diff > 0 ? 0.06 : -0.06;
          return Math.min(3.0, Math.max(0.4, +(prev + factor).toFixed(2)));
        });
        touchDistanceRef.current = dist;
      }
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  }, []);

  // Zoom suave con rueda del ratón
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNative = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setUserZoom((prev) => Math.min(3.0, Math.max(0.4, +(prev + delta).toFixed(2))));
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  const handleSlotClick = (slot) => {
    if (hasMovedRef.current) return;
    if (slot.status !== 'free') return;
    if (!slotMatchesVehicle(slot.slotType, vehicleCategory)) return;
    setSelectedSlot(slot);
  };

  const baseHourlyRate = Number(parking?.hourly_rate ?? parking?.rate ?? 5.0);
  const hasRegisteredVehicles = Array.isArray(vehicles) && vehicles.length > 0;
  const effectivePlate = ((hasRegisteredVehicles && !useCustomPlate)
    ? (selectedPlate || (vehicles[0]?.license_plate || '')) 
    : customPlateInput
  ).toUpperCase().trim().replace(/\s/g, '');
  const PLATE_REGEX = /^[A-Z0-9]{2,4}[- ]?[A-Z0-9]{2,4}$/i;
  const isPlateValid = PLATE_REGEX.test(effectivePlate);

  const isMinuteBilling = parking?.billing_unit === 'minute';

  // Tarifas diferenciadas por tipo de vehículo (por hora)
  const categoryHourlyRate = useMemo(() => {
    let r = parking?.rate || 5.0;
    if (vehicleCategory === 'auto') r = parking?.rate_auto ?? r;
    else if (vehicleCategory === 'camioneta' || vehicleCategory === 'suv') r = parking?.rate_suv ?? 7.0;
    else if (vehicleCategory === 'mototaxi') r = parking?.rate_mototaxi ?? 3.5;
    else if (vehicleCategory === 'moto') r = parking?.rate_moto ?? 2.5;
    return Number(r);
  }, [parking, vehicleCategory]);

  // Tarifas diferenciadas por tipo de vehículo (por minuto)
  const categoryMinuteRate = useMemo(() => {
    let r = 0.08;
    if (vehicleCategory === 'auto') r = parking?.rate_minute_auto ?? ((parking?.rate_auto ?? parking?.rate ?? 5.0) / 60);
    else if (vehicleCategory === 'camioneta' || vehicleCategory === 'suv') r = parking?.rate_minute_suv ?? ((parking?.rate_suv ?? 7.0) / 60);
    else if (vehicleCategory === 'mototaxi') r = parking?.rate_minute_mototaxi ?? ((parking?.rate_mototaxi ?? 3.5) / 60);
    else if (vehicleCategory === 'moto') r = parking?.rate_minute_moto ?? ((parking?.rate_moto ?? 2.5) / 60);
    return Number(Number(r).toFixed(2));
  }, [parking, vehicleCategory]);

  // Turno noche dinámico según la hora actual
  const isNightShiftActive = useMemo(() => {
    if (!parking?.night_shift_enabled) return false;
    const startStr = parking.night_shift_start || '20:00';
    const endStr = parking.night_shift_end || '06:00';
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }, [parking]);

  const nightSurcharge = isNightShiftActive ? Number(parking?.night_shift_surcharge || 0) : 0;
  const nightMinuteSurcharge = nightSurcharge / 60.0;
  const reservationFee = Number(parking?.reservation_fee || 0);

  const effectiveHourlyRate = categoryHourlyRate + nightSurcharge;
  const effectiveMinuteRate = categoryMinuteRate + nightMinuteSurcharge;

  const minStayMin = Number(parking?.min_stay_minutes || 15);
  const maxStayMin = Number(parking?.max_stay_minutes || 1440);

  const minStay = Number(parking?.min_stay_hours || 1);
  const maxStay = Number(parking?.max_stay_hours || 24);

  const actualStayMinutes = isMinuteBilling 
    ? Math.max(minStayMin, Math.min(maxStayMin, Number(stayMinutes) || 60))
    : Math.max(minStay, Math.min(maxStay, Number(hours) || 2)) * 60;

  const stayHours = isMinuteBilling
    ? Number((actualStayMinutes / 60).toFixed(2))
    : Math.max(minStay, Math.min(maxStay, Number(hours) || 2));

  const rawCost = isMinuteBilling
    ? (effectiveMinuteRate * actualStayMinutes) + reservationFee
    : (effectiveHourlyRate * stayHours) + reservationFee;

  const discountRate = bookingModel === 'prepaid_discount' ? 0.10 : 0.0;
  const discountAmount = rawCost * discountRate;
  const finalTotalCost = Math.max(0, rawCost - discountAmount);
  
  const subtotalBase = finalTotalCost / 1.18;
  const igvAmount = finalTotalCost - subtotalBase;

  const isMaintenance = (parking?.status || '').toLowerCase() === 'mantenimiento' || (parking?.status || '').toLowerCase() === 'maintenance';
  const isClosed = (parking?.status || '').toLowerCase() === 'cerrado' || (parking?.status || '').toLowerCase() === 'closed';
  const isUnavailable = isMaintenance || isClosed;

  const officialTolerance = Number(parking?.tolerance ?? parking?.tolerance_minutes ?? 15);
  const isOpenStayMode = parking?.allow_open_stay !== false;

  const canReserve = !isUnavailable && planStatus !== 'unregistered' && planStatus !== 'loading' && !!selectedSlot && selectedSlot.status === 'free' && slotMatchesVehicle(selectedSlot.slotType, vehicleCategory) && isPlateValid;

  const handleExecuteBooking = () => {
    if (!canReserve) return;
    const now = new Date();
    const chosenTolerance = officialTolerance;
    
    const start = now;
    const end = new Date(start.getTime() + Math.max(120, chosenTolerance + 60) * 60 * 1000);
    const calculatedCost = parking?.require_reservation_prepay ? (reservationFee > 0 ? reservationFee : categoryHourlyRate) : categoryHourlyRate;
    const paymentMethodVal = parking?.require_reservation_prepay ? 'Abono digital inmediato' : 'Pago en garita al salir';

    const bookingPayload = {
      slotId: selectedSlot.id,
      slotCode: selectedSlot.code,
      slotType: selectedSlot.slotType || vehicleCategory,
      vehicleCategory,
      vehicleType: vehicleCategory,
      parkingId: numericParkingId,
      parkingName: parking?.name || 'Smart Park Central',
      hours: isOpenStayMode ? 1 : hours,
      estimatedHours: isOpenStayMode ? 1 : hours,
      isOpenStay: isOpenStayMode,
      is_open_stay: isOpenStayMode,
      billingUnit: isMinuteBilling ? 'minute' : 'hour',
      estimatedMinutes: isMinuteBilling ? actualStayMinutes : 60,
      isNightShift: isNightShiftActive,
      nightSurcharge: isMinuteBilling ? nightMinuteSurcharge : nightSurcharge,
      reservationFee,
      prepaid: !!parking?.require_reservation_prepay,
      etaMinutes: chosenTolerance,
      arrivalWindow: chosenTolerance,
      toleranceMinutes: chosenTolerance,
      plate: effectivePlate.split(' ')[0],
      rawCost: calculatedCost,
      discountAmount: 0,
      totalCost: calculatedCost,
      bookingModel,
      receiptType: 'boleta',
      code: `RSV-${Date.now().toString().slice(-6)}`,
      token: `SPK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      startTime: start,
      expiresAt: end,
      payNow: !!parking?.require_reservation_prepay,
      paymentMethod: paymentMethodVal,
      reservationType: 'immediate',
      isSubscription: false,
      subscriptionMonths: 0
    };

    if (onReserveSlot) {
      onReserveSlot(bookingPayload);
    }
  };

  return (
    <div className="space-y-4">
      
      {planStatus === 'unregistered' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">Modo demo • Sin reservas reales</span>
        </div>
      )}
      {planStatus === 'loading' && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-slate-500 shrink-0 animate-spin" />
          <span>Cargando plano de la sede...</span>
        </div>
      )}

      {collisionAlert && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center gap-2 shadow-sm animate-bounce">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold">{collisionAlert}</span>
        </div>
      )}

      {/* Cabecera Limpia de la Sede */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">{parking?.name || 'Smart Park Central'}</h2>
            {isMaintenance ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> En Mantenimiento
              </span>
            ) : isClosed ? (
              <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" /> Cerrado
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full">
                Operativo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
            <span>{parking?.address || 'Portal Unión 42'}, {parking?.city || 'Ayacucho'}</span>
          </p>
          {parking?.schedule && (
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Horario: {parking.schedule}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">{isMinuteBilling ? 'Tarifa Minuto' : 'Tarifa Hora'}</span>
            <span className="font-bold text-slate-900 text-sm">
              {isMinuteBilling 
                ? `S/ ${Number(parking?.rate_minute_auto ?? (baseHourlyRate / 60)).toFixed(2)}/min` 
                : `S/ ${baseHourlyRate.toFixed(2)}/h`}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px]">Cajones {SLOT_TYPE_LABEL[slotFamily(vehicleCategory)] || 'Auto'}</span>
            <span className="font-bold text-emerald-700">{compatibleFreeSlots.length} de {slots.filter(s => slotMatchesVehicle(s.slotType, vehicleCategory)).length} libres</span>
          </div>
        </div>
      </div>

      {isMaintenance && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-extrabold text-sm block">Sede en Mantenimiento Técnico</span>
            <p className="text-xs text-amber-800 mt-0.5">
              Este local se encuentra actualmente en labores de calibración o mantenimiento de cajones. Puedes ver la distribución del plano pero las reservas están pausadas en este momento.
            </p>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-extrabold text-sm block">Sede Cerrada Temporalmente</span>
            <p className="text-xs text-rose-800 mt-0.5">
              Este establecimiento no se encuentra abierto al público en este momento.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna Izquierda: Visor del Plano CAD con Controles y Leyenda Exteriores */}
        <div className="lg:col-span-2 flex flex-col gap-2.5">
          {/* Barra Superior Exterior: Indicador de Navegación y Controles de Zoom */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Move className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline text-[11px]">Arrastra para mover el plano &bull; Rueda para zoom</span>
              <span className="sm:hidden text-[11px]">Arrastra &bull; Pellizca para zoom</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() => setUserZoom(prev => Math.max(0.4, +(prev - 0.2).toFixed(2)))}
                title="Alejar plano (-)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-300 px-1.5 select-none min-w-[38px] text-center">
                {Math.round(effectiveScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setUserZoom(prev => Math.min(3.0, +(prev + 0.2).toFixed(2)))}
                title="Acercar plano (+)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleResetView}
                title="Centrar y reencuadrar plano"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-mono">Centrar</span>
              </button>
            </div>
          </div>

          {/* Contenedor del Plano Asfáltico Cenital con Pan/Drag */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`w-full bg-[#080d16] rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden h-[460px] sm:h-[520px] lg:h-[600px] shadow-2xl select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            {/* Lienzo Arquitectónico Asfáltico Cenital con Pan 2D */}
            <div 
              style={{ 
                width: `${layoutBounds.width}px`, 
                height: `${layoutBounds.height}px`,
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${effectiveScale})`,
                transformOrigin: 'center center',
                backgroundColor: '#0c121e',
                transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="relative rounded-xl border border-slate-700/60 overflow-hidden select-none shrink-0 shadow-xl will-change-transform"
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
                const isCompatible = slotMatchesVehicle(slotType, vehicleCategory);
                const isBlockedByType = isFree && !isCompatible;
                const typeLabel = SLOT_TYPE_LABEL[slotFamily(slotType)] || 'Auto';

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
                    className={`absolute rounded-xl border-2 transition-all flex flex-col justify-between p-1.5 overflow-hidden ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/90 ring-4 ring-cyan-400/40 z-30 shadow-[0_0_20px_rgba(34,211,238,0.35)] scale-[1.02] cursor-pointer'
                        : isBlockedByType
                        ? 'border-amber-700/50 bg-[#0a0c10]/85 cursor-not-allowed z-5 opacity-55 grayscale-[0.4]'
                        : isPmr && isFree
                        ? 'border-blue-500/80 bg-blue-950/40 text-blue-200 hover:border-blue-400 z-10 cursor-pointer'
                        : isFree
                        ? 'border-slate-400/70 bg-[#111827]/80 text-slate-100 hover:border-emerald-400 hover:bg-[#152338] z-10 cursor-pointer'
                        : 'border-slate-700/60 bg-[#0a0f18]/80 cursor-not-allowed z-5 opacity-90'
                    }`}
                  >
                    {/* Cabecera del Cajón: Código + Tipo + Indicador LED */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold z-10 leading-none">
                      <span className="text-white tracking-wider font-extrabold">{el.code}</span>
                      <div className="flex items-center gap-1">
                        {isPmr && <span className="text-[8px] bg-blue-600 text-white px-1 rounded-xs font-bold">PMR</span>}
                        <div className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                            : isBlockedByType ? 'bg-amber-500'
                            : isFree ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            : 'bg-rose-500'
                        }`} />
                      </div>
                    </div>

                    {/* Silueta Central del Vehículo o Área de Estacionamiento */}
                    <div className="flex items-center justify-center my-auto py-0.5 pointer-events-none z-10 w-full h-full">
                      {isBlockedByType ? (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Lock className="w-4 h-4 text-amber-500/90" />
                          <span className="text-[7px] font-mono font-bold text-amber-400/90 uppercase tracking-tight">{typeLabel}</span>
                        </div>
                      ) : isFree ? (
                        <div className={`w-7 h-9 rounded-lg border border-dashed flex items-center justify-center ${isPmr ? 'border-blue-400/40 bg-blue-900/20' : 'border-slate-500/30'}`}>
                          {slotType === 'moto' ? (
                            <Bike className="w-4 h-4 text-slate-400" />
                          ) : slotType === 'camioneta' || slotType === 'suv' ? (
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
                      ) : isBlockedByType ? (
                        <span className="text-amber-400 font-mono font-bold text-[8px] tracking-tight uppercase">
                          Bloqueado
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

        {/* Barra Inferior Exterior: Leyenda de Estados y Plazas Disponibles */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-0.5 text-xs">
          {/* Leyenda de Estados */}
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="font-bold text-cyan-300">Tu Plaza</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Otro tipo</span>
            </div>
          </div>

          {/* Resumen de Plazas Disponibles */}
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <span>Disponibles:</span>
            <span className="text-emerald-400 font-bold text-xs">{compatibleFreeSlots.length}</span>
            <span className="text-slate-500">de {slots.length} plazas</span>
          </div>
        </div>
      </div>

        {/* Panel Lateral de Reserva y Opciones Comerciales */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 text-white">
          <div className="space-y-3.5">

            {/* Categoría de Vehículo */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Tipo de Vehículo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { 
                    id: 'auto', 
                    label: 'Auto', 
                    icon: Car, 
                    rate: Number(parking?.rate_auto ?? parking?.rate ?? 5.0),
                    minuteRate: Number(parking?.rate_minute_auto ?? ((parking?.rate_auto ?? parking?.rate ?? 5.0) / 60))
                  },
                  { 
                    id: 'camioneta', 
                    label: 'Camioneta', 
                    icon: Truck, 
                    rate: Number(parking?.rate_suv ?? 7.0),
                    minuteRate: Number(parking?.rate_minute_suv ?? ((parking?.rate_suv ?? 7.0) / 60))
                  },
                  { 
                    id: 'mototaxi', 
                    label: 'Mototaxi', 
                    icon: Navigation, 
                    rate: Number(parking?.rate_mototaxi ?? 3.5),
                    minuteRate: Number(parking?.rate_minute_mototaxi ?? ((parking?.rate_mototaxi ?? 3.5) / 60))
                  },
                  { 
                    id: 'moto', 
                    label: 'Moto', 
                    icon: Bike, 
                    rate: Number(parking?.rate_moto ?? 2.5),
                    minuteRate: Number(parking?.rate_minute_moto ?? ((parking?.rate_moto ?? 2.5) / 60))
                  }
                ].map((v) => {
                  const Icon = v.icon;
                  const isCur = vehicleCategory === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleCategory(v.id)}
                      className={`p-2 rounded-xl text-xs font-semibold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isCur 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{v.label}</span>
                      <span className="text-[9px] font-mono opacity-80">
                        {isMinuteBilling 
                          ? `S/${v.minuteRate.toFixed(2)}/min` 
                          : `S/${v.rate.toFixed(1)}/h`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {compatibleFreeSlots.length === 0 && (
                <p className="mt-1.5 text-[11px] text-amber-400 font-medium">
                  Sin plazas para {SLOT_TYPE_LABEL[slotFamily(vehicleCategory)] || 'este tipo'} en este local.
                </p>
              )}

              {isNightShiftActive && (
                <div className="mt-2 bg-indigo-950/80 border border-indigo-700/60 rounded-xl p-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <Moon className="w-3.5 h-3.5" /> Noche ({parking?.night_shift_start || '20:00'}–{parking?.night_shift_end || '06:00'})
                  </span>
                  <span className="text-amber-200 font-mono text-[10px] font-bold bg-amber-400/20 px-1.5 py-0.5 rounded">
                    {isMinuteBilling ? `+S/ ${nightMinuteSurcharge.toFixed(3)}/min` : `+S/ ${nightSurcharge.toFixed(2)}/h`}
                  </span>
                </div>
              )}
            </div>

            {/* Placa */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                Placa Vehicular
              </label>

              {vehiclesLoading ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando vehículos...
                </div>
              ) : vehicles.length > 0 && !useCustomPlate ? (
                <div className="space-y-1.5">
                  <select 
                    value={selectedPlate} 
                    onChange={(e) => setSelectedPlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.license_plate}>
                        {v.license_plate} - {v.brand || 'Vehículo'} {v.model || ''} ({v.vehicle_type ? v.vehicle_type.toUpperCase() : 'AUTO'})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setUseCustomPlate(true)}
                      className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      + Ingresar otra placa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToVehicles) onNavigateToVehicles();
                        else window.dispatchEvent(new CustomEvent('smart_park_navigate_tab', { detail: 'vehicles' }));
                      }}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Gestionar autos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={customPlateInput}
                    onChange={(e) => {
                      let clean = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      if (!clean.includes('-') && clean.length > 3) {
                        clean = clean.slice(0, 3) + '-' + clean.slice(3);
                      }
                      setCustomPlateInput(clean.slice(0, 9));
                    }}
                    placeholder="ABC-123 o 1234-5A"
                    maxLength={9}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none"
                  />
                  {customPlateInput.length > 0 && !isPlateValid && (
                    <p className="text-xs text-amber-400 font-mono">
                      {!customPlateInput.includes('-')
                        ? 'Incluye un guión (ej: ABC-123)'
                        : 'Formato inválido (ej: ABC-123 o 1234-5A)'}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                    {vehicles.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setUseCustomPlate(false)}
                        className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        ← Seleccionar de mis autos
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Formato: ABC-123</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToVehicles) onNavigateToVehicles();
                        else window.dispatchEvent(new CustomEvent('smart_park_navigate_tab', { detail: 'vehicles' }));
                      }}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Mis autos
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controles Específicos según la Modalidad de Reserva */}
            {reservationType === 'immediate' && (
              <>
                {/* Tiempo de Llegada y Tolerancia Oficial de la Sede */}
                <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Tolerancia de llegada
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                      ~{officialTolerance} min
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Tiempo oficial establecido por la sede para presentarte en garita tras reservar.
                  </p>
                </div>

                {/* Modalidad de Estadía según Reglas del Local */}
                {parking?.allow_open_stay !== false ? (
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Modalidad de Estadía
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-800/60 px-2 py-0.5 rounded">
                        Hora Libre
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Ingreso flexible sin hora de salida fija. Pagas al salir por el tiempo real consumido ({isMinuteBilling ? `S/ ${categoryMinuteRate.toFixed(2)}/min` : `S/ ${categoryHourlyRate.toFixed(2)}/h`}).
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        Tiempo de Estadía Requerido
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {hours} {hours === 1 ? 'hora' : 'horas'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[1, 2, 3, 4, 6, 8, 12, 24].filter(h => h >= minStay && h <= maxStay).map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHours(h)}
                          className={`flex-1 min-w-[32px] py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                            hours === h
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Límites de esta sede: mín. {minStay}h, máx. {maxStay}h.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Resumen Ejecutivo de Reserva y Tarifa */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Tarifa ({vehicleCategory.toUpperCase()}):</span>
                <span className="font-mono font-bold text-white">
                  {isMinuteBilling 
                    ? `S/ ${categoryMinuteRate.toFixed(2)} /min` 
                    : `S/ ${categoryHourlyRate.toFixed(2)} /h`}
                </span>
              </div>
              {isNightShiftActive && (
                <div className="flex items-center justify-between text-amber-300 text-[11px]">
                  <span>Recargo noche:</span>
                  <span className="font-mono font-semibold">
                    +{isMinuteBilling ? `S/ ${nightMinuteSurcharge.toFixed(3)}/min` : `S/ ${nightSurcharge.toFixed(2)}/h`}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Tolerancia para llegar:</span>
                <span className="text-emerald-400 font-mono font-semibold">~{officialTolerance} min</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Régimen:</span>
                <span className="text-slate-200 font-medium">
                  {parking?.allow_open_stay !== false ? 'Hora Libre (Pagas al salir)' : `${hours}h pactadas`}
                </span>
              </div>
              <div className="h-px bg-slate-800/80 my-1" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cobro:</span>
                <span className="text-slate-200 font-medium">En garita al salir</span>
              </div>
              {parking?.require_reservation_prepay ? (
                <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-800/80 font-mono">
                  <span>Prepago requerido:</span>
                  <span className="font-bold">S/ {(reservationFee > 0 ? reservationFee : categoryHourlyRate).toFixed(2)}</span>
                </div>
              ) : reservationFee > 0 ? (
                <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-800/80 font-mono">
                  <span>Tasa de reserva:</span>
                  <span className="font-bold">S/ {reservationFee.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Reserva:</span>
                  <span className="text-emerald-400 font-medium">Gratis (Pagas al salir)</span>
                </div>
              )}
            </div>

            {/* Aviso si ya cuenta con reserva activa */}
            {activeUserReservation && (
              <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                <span className="font-semibold text-white">Reserva en curso:</span>
                <span className="font-mono font-bold text-amber-300">{activeUserReservation.code || activeUserReservation.id} ({activeUserReservation.plate || activeUserReservation.license_plate})</span>
              </div>
            )}

            {/* Aviso si hubo colisión en vivo */}
            {collisionAlert && (
              <div className="p-2.5 bg-amber-950/80 border border-amber-600/70 rounded-xl text-xs text-amber-200 flex items-start gap-2 animate-bounce">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{collisionAlert}</span>
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
              className={`w-full py-3 text-xs font-bold gap-2 rounded-xl cursor-pointer transition-all ${
                isMaintenance 
                  ? 'bg-amber-950 border border-amber-600/70 text-amber-300 hover:bg-amber-900 cursor-not-allowed opacity-80'
                  : isClosed
                  ? 'bg-rose-950 border border-rose-600/70 text-rose-300 hover:bg-rose-900 cursor-not-allowed opacity-80'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
              }`}
            >
              {isMaintenance ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Sede en Mantenimiento (Reservas Pausadas)</span>
                </>
              ) : isClosed ? (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Sede Cerrada (No disponible)</span>
                </>
              ) : activeUserReservation ? (
                <span>Tienes una reserva activa en curso</span>
              ) : (
                <>
                  <span>{parking?.require_reservation_prepay ? 'Continuar al Pago Digital' : 'Confirmar Reserva'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {onOpenMoreBookingOptions && (
              <button
                type="button"
                onClick={onOpenMoreBookingOptions}
                className="w-full mt-2.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 border border-dashed border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>¿Buscas abono mensual o fecha adelantada? <span className="underline text-slate-300 hover:text-white">Más opciones</span></span>
              </button>
            )}

            {isMaintenance && (
              <p className="text-[11px] text-amber-400 text-center mt-1">Esta sede no acepta reservas por mantenimiento técnico.</p>
            )}
            {isClosed && (
              <p className="text-[11px] text-rose-400 text-center mt-1">Esta sede se encuentra cerrada al público temporalmente.</p>
            )}
            {!isUnavailable && !canReserve && !effectivePlate && (
              <p className="text-[11px] text-amber-400 text-center mt-1">Ingresa o selecciona una placa para continuar.</p>
            )}
            {!isUnavailable && !canReserve && effectivePlate && !isPlateValid && (
              <p className="text-[11px] text-rose-400 text-center mt-1 font-mono">La placa debe incluir un guión (ej: ABC-123).</p>
            )}
            {!isUnavailable && !canReserve && isPlateValid && compatibleFreeSlots.length === 0 && (
              <p className="text-[11px] text-amber-400 text-center mt-1">No hay cajones libres del tipo elegido. Cambia de vehículo o de sede.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
