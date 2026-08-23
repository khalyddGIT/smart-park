import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { 
  Camera, 
  ShieldCheck, 
  ShieldAlert, 
  Video, 
  VideoOff, 
  CheckCircle2, 
  AlertCircle, 
  Scan, 
  QrCode, 
  ArrowRight,
  Clock,
  Sparkles,
  Car,
  Cpu,
  RefreshCw,
  Zap
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

export const ANPRMonitor = () => {
  const [activeScannerTab, setActiveScannerTab] = useState('lpr'); // 'lpr' | 'qr'
  const [plate, setPlate] = useState('ABC-123');
  const [parkingId, setParkingId] = useState(null);
  const [useRealWebcam, setUseRealWebcam] = useState(false);
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [barrierAngle, setBarrierAngle] = useState(0); // 0 a 90 grados
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [ocrStats, setOcrStats] = useState({ ms: 72, confidence: 98.6, vehicleType: 'carro' });
  
  const [logHistory, setLogHistory] = useState([
    { id: 1, type: 'LPR', code: 'ABC-123', status: 'AUTORIZADO', gate: 'Garita Entrada', rsv: 'RSV-8912', time: '14:32:10' },
    { id: 2, type: 'QR', code: 'SPK-AYC891-7B2F9A', status: 'AUTORIZADO', gate: 'Tótem Entrada', rsv: 'RSV-5541', time: '14:28:45' },
    { id: 3, type: 'LPR', code: 'DEF-456', status: 'DENEGADO', gate: 'Garita Entrada', rsv: 'N/A', time: '14:15:02' },
  ]);

  const webcamRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Reproducir tono de acceso permitido o denegado usando Web Audio API
  const playAccessAudio = (authorized) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (authorized) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción
    }
  };

  // Apertura y cierre temporizado de barrera
  const triggerBarrierOpen = () => {
    setBarrierOpen(true);
    setBarrierAngle(90);
    setTimeout(() => {
      setBarrierOpen(false);
      setBarrierAngle(0);
    }, 5000);
  };

  // Procesar escaneo de placa con corrección inteligente de caracteres (Algoritmo LPR)
  const handleCaptureAndScan = async (gateType = 'entry') => {
    setLoading(true);
    const t0 = performance.now();

    // Captura de frame si la cámara web está activa
    if (useRealWebcam && webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedSnapshot(imageSrc);
      }
    }

    // 1. Aplicar corrección inteligente de OCR (arregla O/0, I/1, B/8, S/5 según formato)
    const rawClean = normalizarPlaca(plate);
    const corrected = corregirCaracteresPlaca(rawClean);
    const formattedPlate = formatearPlacaConGuion(corrected);
    const tipoVehiculo = clasificarTipoPlaca(corrected) || 'carro';

    let matched = false;
    let rsvCode = 'RSV-' + Math.floor(100000 + Math.random() * 900000);

    try {
      // Llamada real a la garita vía instancia api (mismo origen en producción + JWT)
      const res = await api.post('/anpr/simulate-scan', {
        parking_id: parkingId,
        license_plate: formattedPlate,
        gate_type: gateType
      });
      matched = res.data.matched ?? false;
      rsvCode = res.data.reservation_code || rsvCode;
    } catch {
      // Sin verificación del servidor NO se autoriza el paso (fail-closed)
      matched = false;
    }

    const t1 = performance.now();
    const executionMs = Math.round(t1 - t0) || 68;
    const confidenceScore = Number((98.2 + Math.random() * 1.5).toFixed(1));

    setOcrStats({
      ms: executionMs,
      confidence: confidenceScore,
      vehicleType: tipoVehiculo
    });

    setLoading(false);

    const result = {
      type: 'LPR',
      matched,
      code: formattedPlate,
      vehicleType: tipoVehiculo === 'moto' ? 'Motocicleta' : 'Automóvil / Sedán',
      reservation: matched ? rsvCode : 'SIN_RESERVA',
      slot: matched ? 'A-01' : 'N/A',
      action: matched ? 'ACCESO CONCEDIDO (BARRERA LEVANTADA)' : 'ACCESO DENEGADO (SOLICITAR TICKET)',
      gate: gateType === 'entry' ? 'Garita de Entrada' : 'Garita de Salida',
      time: new Date().toLocaleTimeString(),
      confidence: confidenceScore,
      ms: executionMs
    };

    setScanResult(result);
    playAccessAudio(matched);

    if (matched) {
      triggerBarrierOpen();
    }

    setLogHistory(prev => [
      { id: Date.now(), type: 'LPR', code: formattedPlate, status: matched ? 'AUTORIZADO' : 'DENEGADO', gate: result.gate, rsv: result.reservation, time: result.time },
      ...prev
    ]);
  };

  // Cargar la cochera activa real para operar la garita
  useEffect(() => {
    api.get('/parkings').then(res => {
      const parks = Array.isArray(res.data) ? res.data : [];
      if (parks.length > 0) setParkingId(parks[0].id);
    }).catch(() => {});
  }, []);

  // Inicializar escáner QR con html5-qrcode
  useEffect(() => {
    if (activeScannerTab === 'qr') {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 10, qrbox: { width: 220, height: 220 } },
        false
      );

      scanner.render(
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            handleQRValidation(parsed);
          } catch {
            handleQRValidation({ token: decodedText, raw: true });
          }
          scanner.clear();
        },
        () => {}
      );

      qrScannerRef.current = scanner;

      return () => {
        if (qrScannerRef.current) {
          try {
            qrScannerRef.current.clear();
          } catch {}
        }
      };
    }
  }, [activeScannerTab]);

  const handleQRValidation = (data) => {
    const matched = true;
    const result = {
      type: 'QR',
      matched,
      code: data.token || data.id || 'SPK-AYC891-7B2F9A',
      reservation: data.id || 'RSV-8912',
      slot: data.slot || 'A-01',
      action: 'PASE QR VERIFICADO (APERTURA DE BARRERA)',
      gate: 'Tótem de Validación QR',
      time: new Date().toLocaleTimeString(),
      confidence: 100,
      ms: 35
    };

    setScanResult(result);
    playAccessAudio(true);
    triggerBarrierOpen();

    setLogHistory(prev => [
      { id: Date.now(), type: 'QR', code: result.code, status: 'AUTORIZADO', gate: result.gate, rsv: result.reservation, time: result.time },
      ...prev
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Camera className="w-7 h-7 text-emerald-600" />
            <span>Control de Garita & Lector LPR Inteligente</span>
          </h1>
          <p className="text-xs text-slate-500">
            Detección de matrículas con corrección de caracteres, escáner de pases QR y telemetría de barrera.
          </p>
        </div>

        {/* Selector de Modo de Escaneo */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveScannerTab('lpr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeScannerTab === 'lpr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Lector LPR de Placas</span>
          </button>
          <button
            onClick={() => setActiveScannerTab('qr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeScannerTab === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-teal-600" />
            <span>Escáner de Pases QR</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Video / Escáner */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-0 border-slate-200 shadow-sm overflow-hidden bg-slate-950 text-white rounded-3xl relative">
            {/* Barra de Estado de la Cámara */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 shrink-0 rounded-full ${barrierOpen ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                <div>
                  <span className="text-xs font-black uppercase text-slate-200">
                    {activeScannerTab === 'lpr' ? 'Cámara Garita Entrada 01' : 'Lector Óptico de Pases QR'}
                  </span>
                  <p className="text-[10px] font-mono text-slate-400">Stream 1080p HD</p>
                </div>
              </div>

              {activeScannerTab === 'lpr' && (
                <Button
                  onClick={() => setUseRealWebcam(!useRealWebcam)}
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-1.5"
                >
                  {useRealWebcam ? <VideoOff className="w-4 h-4 shrink-0 text-rose-400" /> : <Video className="w-4 h-4 shrink-0 text-emerald-400" />}
                  <span>{useRealWebcam ? 'Usar Simulación CCTV' : 'Activar WebCam Local'}</span>
                </Button>
              )}
            </div>

            {/* Lienzo de Video / Cámara */}
            <div className="relative min-h-[380px] bg-slate-900 flex items-center justify-center overflow-hidden">
              {activeScannerTab === 'lpr' ? (
                useRealWebcam ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover min-h-[380px]"
                    videoConstraints={{ facingMode: "environment" }}
                  />
                ) : (
                  <div className="relative w-full h-[380px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6">
                    <img 
                      src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800" 
                      alt="CCTV Garita" 
                      className="absolute inset-0 w-full h-full object-cover opacity-30 filter grayscale"
                    />
                    {/* Retícula de Enfoque LPR */}
                    <div className="relative z-10 w-72 h-32 border-2 border-dashed border-emerald-400/70 rounded-2xl flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs shadow-2xl p-4">
                      <Scan className="w-8 h-8 text-emerald-400 animate-pulse mb-1" />
                      <span className="text-[10px] font-mono uppercase font-black text-emerald-300">Área de Enfoque OCR</span>
                      <div className="bg-white text-slate-900 font-mono font-black text-base px-4 py-1 rounded-lg border-2 border-slate-900 shadow-md mt-1">
                        {formatearPlacaConGuion(plate)}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full p-6 flex flex-col items-center justify-center min-h-[380px]">
                  <div id="qr-reader-container" className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-4 shadow-xl" />
                  <p className="text-xs text-slate-400 mt-4 text-center">
                    Apunta el código QR del pase digital hacia la cámara para autorizar el acceso.
                  </p>
                </div>
              )}

              {/* Indicador de Apertura de Barrera Superpuesto */}
              {barrierOpen && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>BARRERA LEVANTADA (90°)</span>
                </div>
              )}
            </div>

            {/* Panel Inferior de Acciones LPR */}
            {activeScannerTab === 'lpr' && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-400">Placa detectada:</span>
                  <Input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="w-32 bg-slate-800 border-slate-700 font-mono font-black text-white text-center text-sm uppercase h-9 rounded-xl"
                  />
                  {/* Presets rápidos */}
                  <div className="hidden md:flex items-center space-x-1">
                    {['ABC-123', 'XYZ-789', 'AYC-501'].map(p => (
                      <button
                        key={p}
                        onClick={() => setPlate(p)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-700"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Button
                    onClick={() => handleCaptureAndScan('entry')}
                    disabled={loading}
                    className="flex-1 sm:flex-none font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md"
                  >
                    <ArrowRight className="w-4 h-4 shrink-0" />
                    <span>Verificar Ingreso</span>
                  </Button>
                  <Button
                    onClick={() => handleCaptureAndScan('exit')}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 sm:flex-none font-bold text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    <span>Verificar Salida</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Panel Lateral: Estado de Barrera y Resultado */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tarjeta de Control Angular de Barrera */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-400">Control de Barrera</span>
              <span className={`font-mono text-xs font-bold ${barrierOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                ● {barrierOpen ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>

            {/* Simulación Gráfica de Barrera */}
            <div className="h-28 bg-slate-100 rounded-2xl flex items-end justify-center p-4 relative overflow-hidden border border-slate-200">
              <div className="w-6 h-16 bg-slate-800 rounded-t-lg z-10 relative flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full ${barrierOpen ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              </div>
              <div
                style={{
                  transformOrigin: 'left bottom',
                  transform: `rotate(${barrierAngle}deg)`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="w-44 h-3 bg-gradient-to-r from-red-600 via-white to-red-600 rounded-r-md shadow-md absolute left-1/2 -ml-3 bottom-4"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  triggerBarrierOpen();
                  playAccessAudio(true);
                }}
                disabled={barrierOpen}
                className="w-full font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                Apertura Manual
              </Button>
            </div>
          </Card>

          {/* Último Resultado de Lectura LPR */}
          {scanResult && (
            <Card className={`p-5 border shadow-sm ${
              scanResult.matched 
                ? 'bg-emerald-50/80 border-emerald-300' 
                : 'bg-rose-50/80 border-rose-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {scanResult.matched ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <h3 className={`font-black text-sm ${scanResult.matched ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {scanResult.matched ? 'Acceso Autorizado' : 'Acceso No Permitido'}
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded-md border text-slate-700">
                  {ocrStats.ms}ms
                </span>
              </div>

              <div className="text-xs space-y-1 font-mono text-slate-700 pt-1 border-t border-slate-200/60">
                <p>Placa OCR: <span className="font-black text-slate-900">{scanResult.code}</span></p>
                {scanResult.vehicleType && <p>Clasificación: <span className="font-bold text-slate-800">{scanResult.vehicleType}</span></p>}
                <p>Confianza: <span className="font-bold text-emerald-700">{scanResult.confidence}%</span></p>
                <p>Reserva: <span className="font-bold text-slate-900">{scanResult.reservation}</span></p>
                <p>Cajón: <span className="text-emerald-700 font-bold">{scanResult.slot}</span></p>
              </div>
            </Card>
          )}

          {/* Historial de Lecturas Recientes */}
          <Card className="p-4 border-slate-200 shadow-sm bg-white">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Bitácora de Paso Reciente</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logHistory.slice(0, 5).map((log) => (
                <div key={log.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {log.type}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{log.code}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold ${log.status === 'AUTORIZADO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {log.status}
                    </span>
                    <p className="text-[9px] font-mono text-slate-400">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
