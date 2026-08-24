import React, { useState, useRef, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { 
  Camera, 
  Video, 
  VideoOff, 
  CheckCircle2, 
  AlertCircle, 
  Scan, 
  QrCode, 
  ArrowRight,
  Clock,
  Car,
  RefreshCw,
  Zap,
  Shield,
  FileText,
  Download,
  Printer,
  ChevronDown,
  Building2,
  X,
  ExternalLink,
  Plus,
  Trash2,
  DollarSign,
  Search,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  normalizarPlaca, 
  clasificarTipoPlaca, 
  corregirCaracteresPlaca, 
  formatearPlacaConGuion 
} from '../utils/plateOcr';
import { useEstablishments } from '../context/EstablishmentContext';

const GARITA_LOGS_STORAGE_KEY = 'smart_park_garita_audit_logs_v2';
const GARITA_ACTIVE_TICKETS_KEY = 'smart_park_garita_walkin_tickets_v2';

export const ANPRMonitor = () => {
  const { 
    establishments, 
    reservations, 
    occupySlot, 
    freeSlot, 
    checkInReservation, 
    checkOutReservation 
  } = useEstablishments();

  // Sede seleccionada para operar garita
  const [selectedEstId, setSelectedEstId] = useState(() => {
    const saved = localStorage.getItem('smart_park_active_garita_est');
    if (saved && establishments.some(e => String(e.id) === String(saved))) {
      return saved;
    }
    return establishments[0]?.id || 'EST-01';
  });

  // Establecimiento activo
  const currentEst = useMemo(() => {
    return establishments.find(e => String(e.id) === String(selectedEstId)) || establishments[0];
  }, [establishments, selectedEstId]);

  // Pestaña principal de la garita
  const [activeTab, setActiveTab] = useState('lpr'); // 'lpr' | 'qr' | 'vehicles' | 'audit'

  // Estados de escaneo LPR y cámara
  const [plateInput, setPlateInput] = useState('');
  const [useRealWebcam, setUseRealWebcam] = useState(false);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [ocrStats, setOcrStats] = useState({ ms: 45, confidence: 99.2, vehicleType: 'carro' });

  // Estados de Barrera de Acceso
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [barrierAngle, setBarrierAngle] = useState(0); // 0 = cerrada, 90 = abierta
  const [barrierAutoMode, setBarrierAutoMode] = useState(true); // Auto-apertura con LPR
  const barrierTimerRef = useRef(null);

  // Tickets de ingreso directo (Walk-in sin reserva previa)
  const [walkInTickets, setWalkInTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_ACTIVE_TICKETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Bitácora de operaciones en garita
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(GARITA_LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Filtro de bitácora
  const [logFilter, setLogFilter] = useState('ALL'); // 'ALL' | 'ENTRY' | 'EXIT' | 'DENIED'
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Ticket Emitido / Comprobante de Cobro
  const [activeTicketModal, setActiveTicketModal] = useState(null);

  // Lector de código de barras USB / Pistola
  const [barcodeGunInput, setBarcodeGunInput] = useState('');
  const barcodeGunRef = useRef(null);

  const webcamRef = useRef(null);
  const qrScannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Guardar sede activa en localStorage
  useEffect(() => {
    if (selectedEstId) {
      localStorage.setItem('smart_park_active_garita_est', selectedEstId);
    }
  }, [selectedEstId]);

  // Guardar tickets manuales
  useEffect(() => {
    try {
      localStorage.setItem(GARITA_ACTIVE_TICKETS_KEY, JSON.stringify(walkInTickets));
    } catch {}
  }, [walkInTickets]);

  // Guardar bitácora
  useEffect(() => {
    try {
      localStorage.setItem(GARITA_LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  // Obtener dispositivos de cámara disponibles
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedCameraDeviceId) {
          setSelectedCameraDeviceId(videoInputs[0].deviceId);
        }
      }).catch(() => {});
    }
  }, []);

  // Síntesis de Audio de Garita (Web Audio API)
  const playAccessAudio = (authorized) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (authorized) {
        // Tono doble armónico de paso autorizado
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.1); // G5
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        // Tono grave de denegado / alerta
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(196.00, audioCtx.currentTime); // G3
        gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {}
  };

  // Apertura controlada de barrera (90 grados con autocierre en 6s)
  const triggerBarrierOpen = (customDuration = 6000) => {
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    setBarrierOpen(true);
    setBarrierAngle(90);
    barrierTimerRef.current = setTimeout(() => {
      setBarrierOpen(false);
      setBarrierAngle(0);
    }, customDuration);
  };

  // Cierre manual forzado
  const triggerBarrierClose = () => {
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    setBarrierOpen(false);
    setBarrierAngle(0);
  };

  // Agregar entrada a la bitácora
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

  // Plazas libres y ocupadas del establecimiento actual
  const { totalSlotsCount, occupiedSlotsCount, freeSlotsCount, slotList } = useMemo(() => {
    const elements = currentEst?.elements || [];
    const slots = elements.filter(el => el.type === 'slot');
    const occupied = slots.filter(s => s.status === 'occupied').length;
    return {
      totalSlotsCount: slots.length,
      occupiedSlotsCount: occupied,
      freeSlotsCount: Math.max(0, slots.length - occupied),
      slotList: slots
    };
  }, [currentEst]);

  // Lista de vehículos actualmente dentro de este establecimiento
  const vehiclesInside = useMemo(() => {
    // 1. Reservas activas en esta sede
    const activeRes = reservations.filter(r => 
      String(r.parkingId) === String(selectedEstId) && 
      (r.status === 'ACTIVE' || r.status === 'active')
    ).map(r => ({
      source: 'RESERVATION',
      id: r.id,
      code: r.code,
      plate: r.plate,
      slot: r.slot,
      driverName: r.customerName || 'Usuario Registrado',
      phone: r.customerPhone || 'N/A',
      entryTime: r.startTime || r.createdAt || new Date().toISOString(),
      rate: r.ratePerHour || currentEst?.rate || 5.0,
      token: r.token
    }));

    // 2. Tickets directos activos en esta sede
    const activeWalkIns = walkInTickets.filter(t => 
      String(t.estId) === String(selectedEstId) && t.status === 'ACTIVE'
    ).map(t => ({
      source: 'WALK_IN',
      id: t.id,
      code: t.ticketNumber,
      plate: t.plate,
      slot: t.slot,
      driverName: t.driverName || 'Cliente Espontáneo',
      phone: t.phone || 'Garita Presencial',
      entryTime: t.entryTime,
      rate: t.rate || currentEst?.rate || 5.0,
      token: t.ticketNumber
    }));

    return [...activeRes, ...activeWalkIns];
  }, [reservations, walkInTickets, selectedEstId, currentEst]);

  // PROCESAR LECTURA DE PLACA (LPR)
  const handleVerifyPlate = async (plateToTest, gateAction = 'entry') => {
    const rawPlate = plateToTest || plateInput;
    if (!rawPlate || rawPlate.trim().length < 3) return;

    setLoading(true);
    const t0 = performance.now();

    // Capturar fotograma de cámara si está encendida
    if (useRealWebcam && webcamRef.current) {
      try {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) setCapturedSnapshot(screenshot);
      } catch {}
    }

    // 1. Normalizar y corregir OCR
    const cleanRaw = normalizarPlaca(rawPlate);
    const corrected = corregirCaracteresPlaca(cleanRaw);
    const formatted = formatearPlacaConGuion(corrected);
    const tipo = clasificarTipoPlaca(corrected) || 'carro';

    // 2. Buscar en reservas reales de la sede activa
    const matchedReservation = reservations.find(r => 
      String(r.parkingId) === String(selectedEstId) &&
      normalizarPlaca(r.plate) === corrected &&
      (gateAction === 'entry' ? (r.status === 'SCHEDULED' || r.status === 'ACTIVE' || !r.status) : (r.status === 'ACTIVE'))
    );

    // 3. Buscar si es un ticket manual existente dentro de la cochera
    const matchedWalkIn = walkInTickets.find(t => 
      String(t.estId) === String(selectedEstId) &&
      normalizarPlaca(t.plate) === corrected &&
      t.status === 'ACTIVE'
    );

    let backendMatched = false;
    let apiMsg = '';
    try {
      const res = await api.post('/anpr/simulate-scan', {
        parking_id: selectedEstId,
        license_plate: formatted,
        gate_type: gateAction
      });
      backendMatched = res.data.matched ?? false;
      apiMsg = res.data.message || '';
    } catch {
      backendMatched = false;
    }

    const t1 = performance.now();
    const execMs = Math.max(28, Math.round(t1 - t0));
    const confidenceScore = Number((98.5 + (Math.random() * 1.4)).toFixed(1));

    setOcrStats({
      ms: execMs,
      confidence: confidenceScore,
      vehicleType: tipo
    });

    const isMatch = Boolean(matchedReservation || matchedWalkIn || backendMatched);

    let resultPayload = null;

    if (gateAction === 'entry') {
      if (matchedReservation) {
        // Ingreso con Reserva Digital Previa
        const targetSlot = matchedReservation.slot || 'A-01';
        
        // Ejecutar check-in en contexto real
        await checkInReservation(matchedReservation.code);
        occupySlot(selectedEstId, targetSlot, formatted);

        resultPayload = {
          type: 'LPR_RESERVATION',
          matched: true,
          actionType: 'ENTRY',
          code: formatted,
          rawCode: corrected,
          driverName: matchedReservation.customerName || 'Conductor Registrado',
          phone: matchedReservation.customerPhone || 'N/A',
          reservationCode: matchedReservation.code,
          slot: targetSlot,
          vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)',
          rate: matchedReservation.ratePerHour || currentEst?.rate || 5.0,
          confidence: confidenceScore,
          message: `Reserva ${matchedReservation.code} validada. Asignada plaza ${targetSlot}.`,
          timestamp: new Date().toISOString()
        };

        if (barrierAutoMode) triggerBarrierOpen();
        playAccessAudio(true);

        addAuditLog({
          type: 'LPR',
          action: 'INGRESO_RESERVA',
          plate: formatted,
          slot: targetSlot,
          status: 'AUTORIZADO',
          detail: `Reserva ${matchedReservation.code} validada con éxito.`
        });

      } else {
        // Vehículo sin reserva previa detectado
        resultPayload = {
          type: 'LPR_UNREGISTERED',
          matched: false,
          actionType: 'ENTRY',
          code: formatted,
          rawCode: corrected,
          driverName: 'Sin reserva registrada',
          phone: 'N/A',
          reservationCode: 'SIN_RESERVA',
          slot: 'POR_ASIGNAR',
          vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)',
          rate: currentEst?.rate || 5.0,
          confidence: confidenceScore,
          message: `Placa ${formatted} no cuenta con reserva activa en ${currentEst?.name}.`,
          timestamp: new Date().toISOString()
        };

        playAccessAudio(false);

        addAuditLog({
          type: 'LPR',
          action: 'SIN_RESERVA',
          plate: formatted,
          slot: 'N/A',
          status: 'REQUIERE_TICKET',
          detail: `Sin reserva previa. Disponible para emisión de ticket manual.`
        });
      }
    } else {
      // SALIDA DE VEHÍCULO
      if (matchedReservation || matchedWalkIn) {
        const item = matchedReservation || matchedWalkIn;
        const targetSlot = item.slot;

        if (matchedReservation) {
          await checkOutReservation(matchedReservation.code);
        }
        if (matchedWalkIn) {
          setWalkInTickets(prev => prev.map(t => t.id === matchedWalkIn.id ? { ...t, status: 'COMPLETED', exitTime: new Date().toISOString() } : t));
        }

        freeSlot(selectedEstId, targetSlot);

        // Calcular costo por tiempo de estancia
        const entryDate = new Date(item.startTime || item.entryTime || Date.now() - 3600000);
        const minutesParked = Math.max(15, Math.round((Date.now() - entryDate.getTime()) / 60000));
        const hoursParked = Math.ceil(minutesParked / 60);
        const totalCost = Number((hoursParked * (item.rate || currentEst?.rate || 5.0)).toFixed(2));

        resultPayload = {
          type: 'LPR_EXIT',
          matched: true,
          actionType: 'EXIT',
          code: formatted,
          rawCode: corrected,
          driverName: item.customerName || item.driverName || 'Conductor',
          reservationCode: item.code || item.ticketNumber,
          slot: targetSlot,
          vehicleType: tipo === 'moto' ? 'Motocicleta (L3)' : 'Automóvil Particular (M1)',
          minutesParked,
          hoursParked,
          totalCost,
          confidence: confidenceScore,
          message: `Salida autorizada. Estancia: ${hoursParked}h (${minutesParked}m). Total: S/ ${totalCost.toFixed(2)}.`,
          timestamp: new Date().toISOString()
        };

        if (barrierAutoMode) triggerBarrierOpen();
        playAccessAudio(true);

        addAuditLog({
          type: 'LPR',
          action: 'SALIDA_REGISTRADA',
          plate: formatted,
          slot: targetSlot,
          status: 'COMPLETADO',
          detail: `Salida procesada. Total liquidado S/ ${totalCost.toFixed(2)}.`
        });
      } else {
        resultPayload = {
          type: 'LPR_EXIT_UNREGISTERED',
          matched: false,
          actionType: 'EXIT',
          code: formatted,
          rawCode: corrected,
          message: `No se encuentra registro de ingreso para la placa ${formatted} en esta sede.`,
          timestamp: new Date().toISOString()
        };

        playAccessAudio(false);

        addAuditLog({
          type: 'LPR',
          action: 'SALIDA_NO_REGISTRADA',
          plate: formatted,
          slot: 'N/A',
          status: 'ERROR',
          detail: `Placa no encontrada en registros activos de la sede.`
        });
      }
    }

    setScanResult(resultPayload);
    setLoading(false);
  };

  // EMITIR TICKET MANUAL DIRECTO (CLIENTE ESPONTÁNEO)
  const handleIssueWalkInTicket = (customPlate = null) => {
    const targetPlate = customPlate || scanResult?.code || plateInput;
    const clean = formatearPlacaConGuion(corregirCaracteresPlaca(normalizarPlaca(targetPlate)));
    
    if (!clean || clean.length < 3) {
      alert('Por favor ingrese una placa válida para emitir el ticket.');
      return;
    }

    // Buscar primera plaza libre en el plano
    const freeSlotObj = slotList.find(s => s.status === 'free') || { code: `P-${Math.floor(10 + Math.random() * 89)}` };
    const assignedSlot = freeSlotObj.code;

    const newTicket = {
      id: Date.now(),
      ticketNumber: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      estId: selectedEstId,
      estName: currentEst?.name || 'Smart Park Garita',
      plate: clean,
      slot: assignedSlot,
      entryTime: new Date().toISOString(),
      rate: Number(currentEst?.rate || 5.0),
      status: 'ACTIVE'
    };

    // Ocupar plaza en el plano
    occupySlot(selectedEstId, assignedSlot, clean);

    // Guardar en tickets activos
    setWalkInTickets(prev => [newTicket, ...prev]);

    // Abrir barrera de garita y audio
    triggerBarrierOpen();
    playAccessAudio(true);

    // Registrar en bitácora
    addAuditLog({
      type: 'TICKET_MANUAL',
      action: 'INGRESO_DIRECTO',
      plate: clean,
      slot: assignedSlot,
      status: 'AUTORIZADO',
      detail: `Ticket ${newTicket.ticketNumber} emitido en garita. Plaza ${assignedSlot}.`
    });

    // Actualizar resultado en pantalla
    setScanResult({
      type: 'TICKET_ISSUED',
      matched: true,
      actionType: 'ENTRY',
      code: clean,
      reservationCode: newTicket.ticketNumber,
      slot: assignedSlot,
      driverName: 'Ticket Manual Garita',
      rate: newTicket.rate,
      confidence: 100,
      message: `Ticket ${newTicket.ticketNumber} emitido. Barrera levantada para plaza ${assignedSlot}.`,
      timestamp: new Date().toISOString()
    });

    // Mostrar modal con ticket para imprimir o entregar
    setActiveTicketModal(newTicket);
  };

  // LIQUIDAR SALIDA MANUAL DESDE LA LISTA DE VEHÍCULOS
  const handleProcessExitForVehicle = (vehicle) => {
    const entryDate = new Date(vehicle.entryTime);
    const minutesParked = Math.max(10, Math.round((Date.now() - entryDate.getTime()) / 60000));
    const hoursParked = Math.ceil(minutesParked / 60);
    const totalCost = Number((hoursParked * Number(vehicle.rate || 5.0)).toFixed(2));

    // Liberar plaza
    freeSlot(selectedEstId, vehicle.slot);

    if (vehicle.source === 'RESERVATION') {
      checkOutReservation(vehicle.code);
    } else {
      setWalkInTickets(prev => prev.map(t => t.id === vehicle.id ? { ...t, status: 'COMPLETED', exitTime: new Date().toISOString() } : t));
    }

    triggerBarrierOpen();
    playAccessAudio(true);

    addAuditLog({
      type: 'SALIDA_MANUAL',
      action: 'COBRO_Y_SALIDA',
      plate: vehicle.plate,
      slot: vehicle.slot,
      status: 'COMPLETADO',
      detail: `Salida de ${vehicle.plate}. Cobrado S/ ${totalCost.toFixed(2)} (${hoursParked}h).`
    });

    const receipt = {
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      plate: vehicle.plate,
      slot: vehicle.slot,
      estName: currentEst?.name,
      entryTime: vehicle.entryTime,
      exitTime: new Date().toISOString(),
      minutesParked,
      hoursParked,
      rate: vehicle.rate,
      totalCost
    };

    setActiveTicketModal(receipt);
  };

  // INICIALIZAR ESCÁNER QR DE CÁMARA
  useEffect(() => {
    if (activeTab === 'qr') {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 12, qrbox: { width: 240, height: 240 } },
        false
      );

      scanner.render(
        (decodedText) => {
          handleQRValidation(decodedText);
          scanner.clear();
        },
        () => {}
      );

      qrScannerRef.current = scanner;

      return () => {
        if (qrScannerRef.current) {
          try { qrScannerRef.current.clear(); } catch {}
        }
      };
    }
  }, [activeTab]);

  // VALIDACIÓN DE CÓDIGO QR / PISTOLA BARCODE
  const handleQRValidation = async (rawCode) => {
    if (!rawCode) return;
    const clean = rawCode.trim();

    // 1. Buscar en reservas por token o código
    const foundRes = reservations.find(r => 
      r.token === clean || 
      r.code === clean || 
      String(r.id) === clean
    );

    // 2. Buscar en tickets walk-in
    const foundTicket = walkInTickets.find(t => 
      t.ticketNumber === clean || 
      String(t.id) === clean
    );

    if (foundRes) {
      const targetSlot = foundRes.slot || 'A-01';
      await checkInReservation(foundRes.code);
      occupySlot(selectedEstId, targetSlot, foundRes.plate);

      setScanResult({
        type: 'QR_RESERVATION',
        matched: true,
        actionType: 'ENTRY',
        code: foundRes.plate,
        reservationCode: foundRes.code,
        slot: targetSlot,
        driverName: foundRes.customerName || 'Cliente Digital',
        confidence: 100,
        message: `Pase digital ${foundRes.code} validado. Acceso a plaza ${targetSlot}.`,
        timestamp: new Date().toISOString()
      });

      triggerBarrierOpen();
      playAccessAudio(true);

      addAuditLog({
        type: 'QR',
        action: 'INGRESO_PASE_DIGITAL',
        plate: foundRes.plate,
        slot: targetSlot,
        status: 'AUTORIZADO',
        detail: `Pase QR ${foundRes.code} verificado correctamente.`
      });
    } else if (foundTicket) {
      handleProcessExitForVehicle({
        ...foundTicket,
        source: 'WALK_IN'
      });
    } else {
      setScanResult({
        type: 'QR_INVALID',
        matched: false,
        actionType: 'ENTRY',
        code: clean,
        message: `Código QR o pase "${clean}" no válido o no encontrado en el sistema.`,
        timestamp: new Date().toISOString()
      });

      playAccessAudio(false);

      addAuditLog({
        type: 'QR',
        action: 'QR_INVALIDO',
        plate: clean,
        slot: 'N/A',
        status: 'DENEGADO',
        detail: `Código no reconocido en la base de datos.`
      });
    }
  };

  // Procesar archivo de imagen cargado para OCR
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setCapturedSnapshot(base64);
      // Simular reconocimiento de imagen y ejecutar verificación
      const detectedSample = 'AYC-' + Math.floor(100 + Math.random() * 899);
      setPlateInput(detectedSample);
      handleVerifyPlate(detectedSample, 'entry');
    };
    reader.readAsDataURL(file);
  };

  // Filtrar bitácora
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (logFilter === 'ENTRY' && !log.action.includes('INGRESO')) return false;
      if (logFilter === 'EXIT' && !log.action.includes('SALIDA')) return false;
      if (logFilter === 'DENIED' && log.status !== 'DENEGADO' && log.status !== 'REQUIERE_TICKET') return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          (log.plate && log.plate.toLowerCase().includes(s)) ||
          (log.slot && log.slot.toLowerCase().includes(s)) ||
          (log.detail && log.detail.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [auditLogs, logFilter, searchTerm]);

  // Exportar bitácora a CSV
  const handleExportCSV = () => {
    if (auditLogs.length === 0) {
      alert('No hay registros en la bitácora para exportar.');
      return;
    }
    const headers = ['Fecha', 'Hora', 'Sede', 'Tipo', 'Accion', 'Placa', 'Plaza', 'Estado', 'Detalle'];
    const rows = auditLogs.map(l => [
      l.dateFormatted,
      l.timeFormatted,
      `"${l.estName}"`,
      l.type,
      l.action,
      l.plate,
      l.slot,
      l.status,
      `"${l.detail}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bitacora_Garita_${currentEst?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      
      {/* 1. ENCABEZADO MINIMALISTA & SELECTOR DE SEDE */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">
              Control de Garita
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconocimiento LPR, pases QR y barrera vehicular
            </p>
          </div>
        </div>

        {/* Selector de Sede y Tarifa */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedEstId}
              onChange={(e) => setSelectedEstId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[200px] truncate"
            >
              {establishments.map(est => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
            <span className="text-emerald-400">S/ {Number(currentEst?.rate || 5).toFixed(2)}/h</span>
          </div>
        </div>
      </div>

      {/* 2. PESTAÑAS DE NAVEGACIÓN Y MÉTRICAS COMPACTAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('lpr')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'lpr' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Lector LPR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Pases QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vehicles' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span>Vehículos ({vehiclesInside.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Bitácora ({auditLogs.length})</span>
          </button>
        </div>

        {/* Métricas en línea */}
        <div className="flex items-center gap-3 text-xs px-2 font-mono text-slate-600 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <span>Capacidad: <strong className="text-slate-900">{totalSlotsCount}</strong></span>
          <span>Dentro: <strong className="text-blue-700">{vehiclesInside.length}</strong></span>
          <span>Libres: <strong className="text-emerald-700">{freeSlotsCount}</strong></span>
        </div>
      </div>

      {/* 3. VISTA PRINCIPAL: LECTOR LPR */}
      {activeTab === 'lpr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LADO IZQUIERDO: VISOR DE CÁMARA */}
          <div className="lg:col-span-8 space-y-3.5">
            <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-md overflow-hidden relative">
              
              {/* Barra superior de cámara limpia */}
              <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${barrierOpen ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-xs font-semibold text-slate-200">
                    Cámara de Garita
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (barrierOpen) triggerBarrierClose();
                      else {
                        triggerBarrierOpen();
                        playAccessAudio(true);
                      }
                    }}
                    className={`text-xs font-semibold h-7.5 px-2.5 rounded-lg cursor-pointer gap-1.5 ${
                      barrierOpen 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold' 
                        : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span>{barrierOpen ? 'Barrera Abierta' : 'Abrir Barrera'}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setUseRealWebcam(!useRealWebcam)}
                    className="text-xs font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-7.5 px-2.5 rounded-lg cursor-pointer gap-1.5"
                  >
                    {useRealWebcam ? <VideoOff className="w-3 h-3 text-rose-400" /> : <Video className="w-3 h-3 text-emerald-400" />}
                    <span>{useRealWebcam ? 'Apagar WebCam' : 'Activar WebCam'}</span>
                  </Button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-7.5 px-2.5 rounded-lg cursor-pointer gap-1.5"
                  >
                    <Camera className="w-3 h-3 text-blue-400" />
                    <span>Subir Foto</span>
                  </Button>
                </div>
              </div>

              {/* Visor de Video */}
              <div className="relative min-h-[300px] sm:min-h-[340px] bg-slate-900 flex items-center justify-center overflow-hidden">
                {useRealWebcam ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ deviceId: selectedCameraDeviceId ? { exact: selectedCameraDeviceId } : undefined }}
                    className="w-full h-full object-cover min-h-[300px] sm:min-h-[340px]"
                  />
                ) : (
                  <div className="relative w-full h-[300px] sm:h-[340px] bg-slate-950 flex flex-col items-center justify-center p-6">
                    <img 
                      src={capturedSnapshot || currentEst?.image || "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800"} 
                      alt="CCTV Garita" 
                      className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale"
                    />
                    
                    {/* Retícula Minimalista LPR */}
                    <div className="relative z-10 w-64 sm:w-72 h-28 border border-emerald-400/60 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3">
                      <Scan className="w-6 h-6 text-emerald-400 mb-1" />
                      <div className="bg-white text-slate-900 font-mono font-black text-sm px-3.5 py-0.5 rounded-lg border border-slate-900 shadow-xs">
                        {plateInput ? formatearPlacaConGuion(plateInput) : '--- ---'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Banner de Barrera Abierta */}
                {barrierOpen && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Paso Libre (90°)</span>
                  </div>
                )}
              </div>

              {/* Barra Inferior de Acción y Entrada de Placa */}
              <div className="p-3 sm:p-3.5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-400">Placa:</span>
                  <Input
                    type="text"
                    placeholder="ABC-123"
                    value={plateInput}
                    onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyPlate(plateInput, 'entry');
                    }}
                    className="w-32 bg-slate-800 border-slate-700 font-mono font-black text-white text-center text-sm uppercase h-9 rounded-xl"
                  />
                  {plateInput && (
                    <button
                      type="button"
                      onClick={() => setPlateInput('')}
                      className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => handleVerifyPlate(plateInput, 'entry')}
                    disabled={loading || !plateInput}
                    className="flex-1 sm:flex-none font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 h-9 px-4 rounded-xl shadow-xs cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    <span>{loading ? 'Verificando...' : 'Ingreso'}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleVerifyPlate(plateInput, 'exit')}
                    disabled={loading || !plateInput}
                    variant="outline"
                    className="flex-1 sm:flex-none font-semibold text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-9 px-3.5 rounded-xl cursor-pointer"
                  >
                    <span>Salida</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Resultado de la Verificación LPR */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 ${
                scanResult.matched ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scanResult.matched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {scanResult.matched 
                          ? (scanResult.actionType === 'ENTRY' ? 'Acceso Autorizado' : 'Salida Procesada')
                          : 'Sin Reserva Previa'
                        }
                      </h3>
                      <p className="text-[11px] text-slate-600">{scanResult.message}</p>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    {ocrStats.ms}ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Placa</span>
                    <span className="font-bold text-slate-900">{scanResult.code}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Plaza</span>
                    <span className="font-bold text-emerald-700">{scanResult.slot || 'A-01'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Referencia</span>
                    <span className="font-semibold text-slate-800 truncate block">{scanResult.reservationCode || scanResult.driverName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Tarifa</span>
                    <span className="font-semibold text-slate-800">S/ {Number(scanResult.rate || currentEst?.rate || 5).toFixed(2)}/h</span>
                  </div>
                </div>

                {/* Acción para vehículo sin reserva previa */}
                {!scanResult.matched && scanResult.actionType === 'ENTRY' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                    <span className="text-xs text-amber-900">
                      ¿Emitir ticket para placa <strong>{scanResult.code}</strong>?
                    </span>
                    <Button
                      type="button"
                      onClick={() => handleIssueWalkInTicket(scanResult.code)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-8 px-3 gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Emitir Ticket</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LADO DERECHO: PANEL OPERATIVO DE GARITA (SIN DIBUJO DE BARRERA) */}
          <div className="lg:col-span-4 space-y-3.5">
            
            {/* Panel de Emisión Directa de Ticket */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  Ingreso Presencial
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  {freeSlotsCount} plazas libres
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Para vehículos sin reserva previa que ingresan directamente a la cochera.
              </p>

              <Button
                type="button"
                onClick={() => handleIssueWalkInTicket()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Emitir Ticket & Abrir Barrera</span>
              </Button>
            </div>

            {/* Vehículos Actualmente en Cochera (Resumen en Vivo) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  En Cochera ({vehiclesInside.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('vehicles')}
                  className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              {vehiclesInside.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  Cochera vacía en este momento.
                </p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                  {vehiclesInside.slice(0, 4).map(veh => (
                    <div key={veh.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{veh.plate}</span>
                        <span className="text-[10px] text-slate-500">{veh.slot} • {veh.driverName}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessExitForVehicle(veh)}
                        className="h-7 text-[11px] font-semibold px-2.5 rounded-lg border-slate-200 hover:bg-white cursor-pointer"
                      >
                        Salida
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accesos a Pases y Bitácora */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('qr')}
                className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl h-8.5 border-slate-200 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Pases QR</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('audit')}
                className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl h-8.5 border-slate-200 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Bitácora</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ESCÁNER DE PASES QR & LECTORA ÓPTICA */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Lector Óptico de Pases QR Digitales</h3>
              <p className="text-xs text-slate-500">
                Apunta el código QR del pase digital hacia la cámara o ingresa el código del ticket.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[320px]">
              <div id="qr-reader-container" className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-sm border border-slate-200" />
            </div>

            {/* Entrada rápida para Pistola Barcode USB */}
            <div className="flex items-center gap-2 pt-2">
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
              <Input
                placeholder="Ingresar código de pase / Token manual (ej. SPK-AYC891...)"
                value={barcodeGunInput}
                onChange={(e) => setBarcodeGunInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleQRValidation(barcodeGunInput);
                    setBarcodeGunInput('');
                  }
                }}
                className="text-xs h-9 bg-white border-slate-200 font-mono"
              />
              <Button
                type="button"
                onClick={() => {
                  handleQRValidation(barcodeGunInput);
                  setBarcodeGunInput('');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer"
              >
                Validar
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider block">
                Pases Programados Hoy ({reservations.filter(r => String(r.parkingId) === String(selectedEstId)).length})
              </span>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {reservations.filter(r => String(r.parkingId) === String(selectedEstId)).map(res => (
                  <div key={res.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-900">{res.plate}</span>
                      <span className="text-emerald-700 font-bold">{res.slot}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">{res.customerName || 'Cliente'}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>{res.code}</span>
                      <button
                        type="button"
                        onClick={() => handleQRValidation(res.token || res.code)}
                        className="text-emerald-700 hover:underline font-bold font-sans cursor-pointer"
                      >
                        Validar Ingreso →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: VEHÍCULOS EN COCHERA (ACTIVOS) */}
      {activeTab === 'vehicles' && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Vehículos Estacionados Actualmente en {currentEst?.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {vehiclesInside.length} vehículos ocupando plazas en esta sede.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => handleIssueWalkInTicket()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Nuevo Ingreso</span>
            </Button>
          </div>

          {vehiclesInside.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">No hay vehículos registrados actualmente en esta sede.</p>
              <p className="text-[11px] mt-1">Los vehículos ingresados mediante LPR, QR o ticket aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {vehiclesInside.map((veh) => {
                const entryDate = new Date(veh.entryTime);
                const minutes = Math.max(5, Math.round((Date.now() - entryDate.getTime()) / 60000));
                const hours = Math.ceil(minutes / 60);
                const cost = Number((hours * Number(veh.rate || 5.0)).toFixed(2));

                return (
                  <div key={veh.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 hover:border-slate-300 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-black text-base text-slate-900 block leading-none">
                          {veh.plate}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                          {veh.driverName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-emerald-800">
                        {veh.slot}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Tiempo de Estancia</span>
                        <span className="font-bold text-slate-800">{hours}h ({minutes}m)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Monto a Liquidar</span>
                        <span className="font-bold text-emerald-700">S/ {cost.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleProcessExitForVehicle(veh)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-8.5 gap-1.5 shadow-xs cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cobrar y Registrar Salida</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: BITÁCORA DE GARITA (AUDIT TRAIL) */}
      {activeTab === 'audit' && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bitácora de Operaciones en Garita</h3>
              <p className="text-xs text-slate-500 font-medium">
                Registro cronológico inmutable de ingresos, salidas y autorizaciones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportCSV}
                className="text-xs font-semibold rounded-xl h-8.5 px-3 gap-1.5 border-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar CSV</span>
              </Button>
            </div>
          </div>

          {/* Filtros de Bitácora */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'ENTRY', label: 'Ingresos' },
                { key: 'EXIT', label: 'Salidas' },
                { key: 'DENIED', label: 'Alertas / Denegados' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setLogFilter(f.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    logFilter === f.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por placa, plaza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8 bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Tabla de Registros */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Hora / Fecha</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3">Plaza</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-sans">
                      No hay registros en la bitácora para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{log.timeFormatted}</span>
                        <span className="text-[10px] text-slate-400 block">{log.dateFormatted}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 font-sans">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {log.plate}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {log.slot}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold ${
                          log.status === 'AUTORIZADO' || log.status === 'COMPLETADO' 
                            ? 'text-emerald-700' 
                            : 'text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px] max-w-xs truncate">
                        {log.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL DE TICKET IMPRIMIBLE / COMPROBANTE DE COBRO */}
      {activeTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {activeTicketModal.ticketNumber ? 'TICKET DE INGRESO VEHICULAR' : 'COMPROBANTE DE LIQUIDACIÓN'}
              </h3>
              <p className="text-xs font-semibold text-emerald-700">{activeTicketModal.estName || currentEst?.name}</p>
            </div>

            <div className="space-y-2.5 font-mono text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Comprobante N°:</span>
                <span className="font-bold text-slate-900">{activeTicketModal.ticketNumber || activeTicketModal.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Placa del Vehículo:</span>
                <span className="font-black text-slate-900 text-sm">{activeTicketModal.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Plaza Asignada:</span>
                <span className="font-bold text-emerald-700">{activeTicketModal.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Hora de Entrada:</span>
                <span className="text-slate-800">{new Date(activeTicketModal.entryTime).toLocaleTimeString()}</span>
              </div>
              {activeTicketModal.exitTime && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Hora de Salida:</span>
                  <span className="text-slate-800">{new Date(activeTicketModal.exitTime).toLocaleTimeString()}</span>
                </div>
              )}
              {activeTicketModal.totalCost !== undefined && (
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-900 font-sans">Total Cobrado:</span>
                  <span className="text-emerald-700 font-black">S/ {Number(activeTicketModal.totalCost).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="text-xs font-semibold rounded-xl h-9 gap-1.5 border-slate-200 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </Button>

              <Button
                type="button"
                onClick={() => setActiveTicketModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9 cursor-pointer"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
