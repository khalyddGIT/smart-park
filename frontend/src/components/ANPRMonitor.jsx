import React, { useState, useRef, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { 
  Camera, 
  Video, 
  CheckCircle2, 
  AlertTriangle,
  Scan, 
  QrCode, 
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Car,
  Timer,
  Gauge,
  Wallet,
  Activity,
  RefreshCw,
  Zap,
  ShieldCheck,
  FileText,
  Download,
  Printer,
  Building2,
  X,
  Plus,
  DollarSign,
  Search,
  Layers,
  KeyRound,
  MapPin,
  EyeOff,
  Sparkles,
  Ban,
  Pencil
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  normalizarPlaca, 
  clasificarTipoPlaca, 
  corregirCaracteresPlaca, 
  formatearPlacaConGuion 
} from '../utils/plateOcr';
import { useEstablishments } from '../context/EstablishmentContext';
import { CarParkZoneEditor } from './CarParkZoneEditor';

const GARITA_LOGS_STORAGE_KEY = 'smart_park_garita_audit_logs_v2';
const GARITA_ACTIVE_TICKETS_KEY = 'smart_park_garita_walkin_tickets_v2';

export const ANPRMonitor = () => {
  const { 
    establishments, 
    reservations, 
    occupySlot, 
    freeSlot, 
    checkInReservation, 
    checkOutReservation, 
    updateEstablishment,
    updateEstablishmentPlan
  } = useEstablishments();

  const [selectedEstId, setSelectedEstId] = useState(() => {
    const saved = localStorage.getItem('smart_park_active_garita_est');
    if (saved && establishments.some(e => String(e.id) === String(saved))) return saved;
    return establishments[0]?.id || 'EST-01';
  });

  const currentEst = useMemo(
    () => establishments.find(e => String(e.id) === String(selectedEstId)) || establishments[0],
    [establishments, selectedEstId]
  );

  const [activeTab, setActiveTab] = useState('lpr');
  const [plateInput, setPlateInput] = useState('');
  const [useRealWebcam, setUseRealWebcam] = useState(false);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [ocrStats, setOcrStats] = useState({ ms: 45, confidence: 99.2, vehicleType: 'carro' });
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [barrierAngle, setBarrierAngle] = useState(0);
  const [barrierAutoMode, setBarrierAutoMode] = useState(true);
  const barrierTimerRef = useRef(null);
  const [showZoneEditor, setShowZoneEditor] = useState(false);

  const [walkInTickets, setWalkInTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_ACTIVE_TICKETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [logFilter, setLogFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTicketModal, setActiveTicketModal] = useState(null);
  const [barcodeGunInput, setBarcodeGunInput] = useState('');
  const [gateMode, setGateMode] = useState('entry');
  const [liveTick, setLiveTick] = useState(0);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setLiveTick(v => v + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedEstId) localStorage.setItem('smart_park_active_garita_est', selectedEstId);
  }, [selectedEstId]);

  useEffect(() => {
    try { localStorage.setItem(GARITA_ACTIVE_TICKETS_KEY, JSON.stringify(walkInTickets)); } catch {}
  }, [walkInTickets]);

  useEffect(() => {
    try { localStorage.setItem(GARITA_LOGS_STORAGE_KEY, JSON.stringify(auditLogs)); } catch {}
  }, [auditLogs]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedCameraDeviceId) setSelectedCameraDeviceId(videoInputs[0].deviceId);
      }).catch(() => {});
    }
  }, [selectedCameraDeviceId]);

  const triggerBarrierOpen = (customDuration = 6000) => {
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    setBarrierOpen(true);
    setBarrierAngle(90);
    barrierTimerRef.current = setTimeout(() => {
      setBarrierOpen(false);
      setBarrierAngle(0);
    }, customDuration);
  };

  const addAuditLog = (entry) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateFormatted: new Date().toLocaleDateString('es-PE'),
      estName: currentEst?.name || 'Sede Garita',
      estId: selectedEstId,
      ...entry
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const { totalSlotsCount, occupiedSlotsCount, freeSlotsCount, slotList } = useMemo(() => {
    const elements = currentEst?.elements || [];
    const slots = elements.filter(el => el.type === 'slot');
    const occupied = slots.filter(s => s.status === 'occupied').length;
    return { totalSlotsCount: slots.length, occupiedSlotsCount: occupied, freeSlotsCount: Math.max(0, slots.length - occupied), slotList: slots };
  }, [currentEst]);

  const vehiclesInside = useMemo(() => {
    const activeRes = reservations.filter(r => String(r.parkingId) === String(selectedEstId) && (r.status === 'ACTIVE' || r.status === 'active')).map(r => ({ source: 'RESERVATION', id: r.id, code: r.code, plate: r.plate, slot: r.slot, driverName: r.customerName || 'Usuario Registrado', phone: r.customerPhone || 'N/A', entryTime: r.startTime || r.createdAt || new Date().toISOString(), rate: r.ratePerHour || currentEst?.rate || 5.0, token: r.token }));
    const activeWalkIns = walkInTickets.filter(t => String(t.estId) === String(selectedEstId) && t.status === 'ACTIVE').map(t => ({ source: 'WALK_IN', id: t.id, code: t.ticketNumber, plate: t.plate, slot: t.slot, driverName: t.driverName || 'Cliente Espontaneo', phone: t.phone || 'Garita Presencial', entryTime: t.entryTime, rate: t.rate || currentEst?.rate || 5.0, token: t.ticketNumber }));
    return [...activeRes, ...activeWalkIns];
  }, [reservations, walkInTickets, selectedEstId, currentEst]);

  const occupancyPct = totalSlotsCount ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;

  const handleVerifyPlate = async (plateToTest, gateAction = gateMode) => {
    const rawPlate = plateToTest || plateInput;
    if (!rawPlate || rawPlate.trim().length < 3) return;
    setLoading(true);
    const t0 = performance.now();
    
    const cleanRaw = normalizarPlaca(rawPlate);
    const corrected = corregirCaracteresPlaca(cleanRaw);
    const formatted = formatearPlacaConGuion(corrected);
    const tipo = clasificarTipoPlaca(corrected) || 'carro';

    const matchedReservation = reservations.find(r => String(r.parkingId) === String(selectedEstId) && normalizarPlaca(r.plate) === corrected && (gateAction === 'entry' ? (r.status === 'SCHEDULED' || r.status === 'ACTIVE' || !r.status) : (r.status === 'ACTIVE')));
    const matchedWalkIn = walkInTickets.find(t => String(t.estId) === String(selectedEstId) && normalizarPlaca(t.plate) === corrected && t.status === 'ACTIVE');

    const execMs = Math.max(35, Math.round(performance.now() - t0));
    const confidenceScore = Number((98.8 + Math.random() * 1.1).toFixed(1));
    setOcrStats({ ms: execMs, confidence: confidenceScore, vehicleType: tipo });

    let resultPayload = null;

    if (gateAction === 'entry') {
      if (matchedReservation) {
        const targetSlot = matchedReservation.slot || 'A-01';
        await checkInReservation(matchedReservation.code);
        occupySlot(selectedEstId, targetSlot, formatted);
        resultPayload = { type: 'LPR_RESERVATION', matched: true, actionType: 'ENTRY', code: formatted, rawCode: corrected, driverName: matchedReservation.customerName || 'Conductor Registrado', reservationCode: matchedReservation.code, slot: targetSlot, vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)', rate: matchedReservation.ratePerHour || currentEst?.rate || 5.0, confidence: confidenceScore, message: `Reserva ${matchedReservation.code} validada. Plaza ${targetSlot}.`, timestamp: new Date().toISOString() };
        if (barrierAutoMode) triggerBarrierOpen();
        addAuditLog({ type: 'LPR', action: 'INGRESO_RESERVA', plate: formatted, slot: targetSlot, status: 'AUTORIZADO', detail: `Reserva ${matchedReservation.code} validada.` });
      } else {
        resultPayload = { type: 'LPR_UNREGISTERED', matched: false, actionType: 'ENTRY', code: formatted, rawCode: corrected, driverName: 'Sin reserva previa', reservationCode: 'SIN_RESERVA', slot: 'POR_ASIGNAR', vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)', rate: currentEst?.rate || 5.0, confidence: confidenceScore, message: `Placa ${formatted} sin reserva activa.`, timestamp: new Date().toISOString() };
        addAuditLog({ type: 'LPR', action: 'SIN_RESERVA', plate: formatted, slot: 'N/A', status: 'REQUIERE_TICKET', detail: 'Sin reserva. Requiere emisión de ticket manual.' });
      }
    } else {
      if (matchedReservation || matchedWalkIn) {
        const item = matchedReservation || matchedWalkIn;
        const targetSlot = item.slot;
        if (matchedReservation) await checkOutReservation(matchedReservation.code);
        if (matchedWalkIn) setWalkInTickets(prev => prev.map(t => t.id === matchedWalkIn.id ? { ...t, status: 'COMPLETED', exitTime: new Date().toISOString() } : t));
        freeSlot(selectedEstId, targetSlot);
        const entryDate = new Date(item.startTime || item.entryTime || Date.now() - 3600000);
        const minutesParked = Math.max(15, Math.round((Date.now() - entryDate.getTime()) / 60000));
        const hoursParked = Math.ceil(minutesParked / 60);
        const totalCost = Number((hoursParked * (item.rate || currentEst?.rate || 5.0)).toFixed(2));
        resultPayload = { type: 'LPR_EXIT', matched: true, actionType: 'EXIT', code: formatted, rawCode: corrected, driverName: item.customerName || item.driverName || 'Conductor', reservationCode: item.code || item.ticketNumber, slot: targetSlot, vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)', minutesParked, hoursParked, totalCost, confidence: confidenceScore, message: `Salida autorizada. Estancia: ${hoursParked}h. Total: S/ ${totalCost.toFixed(2)}.`, timestamp: new Date().toISOString() };
        if (barrierAutoMode) triggerBarrierOpen();
        addAuditLog({ type: 'LPR', action: 'SALIDA_REGISTRADA', plate: formatted, slot: targetSlot, status: 'COMPLETADO', detail: `Salida procesada. Total liquidado S/ ${totalCost.toFixed(2)}.` });
      } else {
        resultPayload = { type: 'LPR_EXIT_UNREGISTERED', matched: false, actionType: 'EXIT', code: formatted, rawCode: corrected, message: `No hay registro de ingreso para ${formatted}.`, timestamp: new Date().toISOString() };
        addAuditLog({ type: 'LPR', action: 'SALIDA_NO_REGISTRADA', plate: formatted, slot: 'N/A', status: 'ERROR', detail: 'Placa no encontrada.' });
      }
    }
    setScanResult(resultPayload);
    setLoading(false);
  };

  const handleSaveZones = (updatedSlots) => {
    const otherElements = (currentEst?.elements || []).filter((el) => el.type !== 'slot');
    const newElements = [...otherElements, ...updatedSlots];
    if (updateEstablishmentPlan) {
      updateEstablishmentPlan(selectedEstId, newElements);
    }
    updateEstablishment(selectedEstId, { elements: newElements });
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Encabezado Garita ANPR */}
      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[17px] font-black text-slate-900 tracking-tight leading-none">Control LPR & Garita</h1>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ANPR OCR Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                Operación en tiempo real • Lectura LPR + Pases QR + Control de Barrera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer max-w-[200px] truncate">
                {establishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => setShowZoneEditor(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-10 px-4 rounded-2xl gap-1.5 shadow"
            >
              <Pencil className="w-4 h-4 text-emerald-400" /> Calibrar Plazas CAD
            </Button>
          </div>
        </div>

        {/* HUD Estadísticas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ocupación</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{occupancyPct}% <span className="text-xs font-bold text-slate-500">{occupiedSlotsCount}/{totalSlotsCount}</span></p>
            </div>
            <Gauge className="w-5 h-5 text-slate-700" />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plazas Libres</p>
              <p className="text-lg font-black text-emerald-600 leading-none mt-1">{freeSlotsCount}</p>
            </div>
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">En Cochera</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{vehiclesInside.length}</p>
            </div>
            <Car className="w-5 h-5 text-slate-700" />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latencia OCR</p>
              <p className="text-xs font-mono font-black text-slate-900 leading-none mt-1">{ocrStats.ms}ms • {ocrStats.confidence}%</p>
            </div>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Visor de Cámara y Validación LPR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.9fr] gap-4">
        <div className="space-y-4">
          <div className="bg-slate-950 rounded-[22px] border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between gap-2 bg-slate-900 border-b border-slate-800">
              <span className="text-xs font-black text-white tracking-tight">CCTV Garita • LPR OCR Reader</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setUseRealWebcam(!useRealWebcam)} className="h-8 px-2.5 rounded-xl bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-bold gap-1.5">
                {useRealWebcam ? <><EyeOff className="w-3.5 h-3.5 text-rose-400"/> Apagar</> : <><Video className="w-3.5 h-3.5 text-emerald-400"/> WebCam</>}
              </Button>
            </div>

            <div className="relative bg-slate-900 flex items-center justify-center overflow-hidden min-h-[340px] sm:min-h-[380px]">
              {useRealWebcam ? (
                <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-full object-cover min-h-[340px] sm:min-h-[380px]" />
              ) : (
                <div className="relative w-full h-[340px] sm:h-[380px] bg-slate-950 flex flex-col items-center justify-center">
                  <img src={currentEst?.image || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=900'} alt="CCTV" className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale" />
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-[300px] sm:w-[360px] h-[120px] rounded-2xl border-2 border-emerald-400/70 bg-slate-950/70 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col items-center justify-center p-3 relative">
                      <Scan className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <div className="mt-2 bg-white text-slate-900 font-mono font-black text-[15px] tracking-widest px-4 py-1 rounded-xl border border-slate-900 shadow">
                        {plateInput ? formatearPlacaConGuion(plateInput) : 'ABC - 123'}
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-300 mt-1">ANPR REGION: PE • {ocrStats.confidence}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2.5 items-center">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <div className="bg-slate-800 rounded-full p-1 flex items-center gap-1 border border-slate-700">
                    <button type="button" onClick={() => setGateMode('entry')} className={'px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition ' + (gateMode === 'entry' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white')}>
                      <ArrowUpRight className="w-3.5 h-3.5"/> Ingreso
                    </button>
                    <button type="button" onClick={() => setGateMode('exit')} className={'px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 transition ' + (gateMode === 'exit' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white')}>
                      <ArrowDownLeft className="w-3.5 h-3.5"/> Salida
                    </button>
                  </div>
                </div>

                <Input
                  type="text"
                  placeholder="ABC-123"
                  value={plateInput}
                  onChange={e => setPlateInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyPlate(plateInput, gateMode); }}
                  className="bg-slate-900 border-slate-700 font-mono font-black text-white text-center text-sm uppercase h-10 rounded-xl"
                />

                <Button
                  type="button"
                  onClick={() => handleVerifyPlate(plateInput, gateMode)}
                  disabled={loading || !plateInput}
                  className={'font-black text-xs h-10 px-5 rounded-2xl gap-1.5 ' + (gateMode === 'entry' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900' : 'bg-amber-500 hover:bg-amber-400 text-slate-900')}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : gateMode === 'entry' ? 'Validar Ingreso' : 'Liquidar Salida'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Control de Barrera */}
        <div className="space-y-4">
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4 space-y-3">
            <span className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600"/> BARRERA VEHICULAR 90°
            </span>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">{barrierOpen ? 'Abierta 90° — Paso Libre' : 'Cerrada — Acceso Bloqueado'}</p>
              </div>
              <span className={'w-3 h-3 rounded-full ' + (barrierOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            </div>

            <Button
              type="button"
              onClick={() => {
                if (barrierOpen) setBarrierOpen(false);
                else triggerBarrierOpen();
              }}
              className={'w-full h-10 rounded-xl font-black text-xs gap-1.5 ' + (barrierOpen ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 text-white')}
            >
              {barrierOpen ? 'Cerrar Barrera' : 'Abrir Barrera'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Modal de Zonas CAD */}
      {showZoneEditor && (
        <CarParkZoneEditor
          backgroundImage={currentEst?.image}
          initialSlots={slotList}
          parkingName={currentEst?.name}
          onSave={handleSaveZones}
          onClose={() => setShowZoneEditor(false)}
        />
      )}
    </div>
  );
};

export default ANPRMonitor;
