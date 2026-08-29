import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import {
  Video,
  Camera,
  RefreshCw,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Settings2,
  Save,
  Eye,
  Image as ImageIcon,
  ScanLine,
  Clock,
  Cpu,
  ListChecks,
  Radio,
  Upload,
  X,
  Pencil,
  Trash2,
  RotateCw,
  Copy,
  Layers,
} from 'lucide-react';
import { Button } from './ui/button';
import { useEstablishments } from '../context/EstablishmentContext';
import api from '../services/api';

const CAMERA_EST_STORAGE_KEY = 'smart_park_active_cctv_est';
const CANVAS_W = 1100;
const CANVAS_H = 700;
const camZonesKey = (id) => `smart_park_camera_zones_${id || 'global'}`;

function parseCalibration(raw) {
  if (!raw) return null;
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (d && typeof d === 'object' && ['x', 'y', 'w', 'h'].every((k) => k in d)) return { x: Number(d.x), y: Number(d.y), w: Number(d.w), h: Number(d.h) };
  } catch {}
  return null;
}

export const CameraMonitorModule = () => {
  const { establishments, setEstablishments } = useEstablishments();

  const [selectedEstId, setSelectedEstId] = useState(() => {
    try {
      const saved = localStorage.getItem(CAMERA_EST_STORAGE_KEY);
      if (saved && establishments.some((e) => String(e.id) === String(saved))) return saved;
    } catch {}
    return establishments[0]?.id || '';
  });

  const currentEst = useMemo(
    () => establishments.find((e) => String(e.id) === String(selectedEstId)) || establishments[0] || null,
    [establishments, selectedEstId]
  );
  const numericId = useMemo(() => {
    if (!currentEst) return null;
    const n = Number(currentEst.id);
    return Number.isFinite(n) && !String(currentEst.id).startsWith('EST-') ? n : null;
  }, [currentEst]);

  const cameraUrl = currentEst?.camera_url || '';
  const cameraEnabled = !!currentEst?.camera_enabled;
  const calibration = useMemo(() => parseCalibration(currentEst?.camera_calibration), [currentEst]);

  // --- Zonas de cámara INDEPENDIENTES del plano de estacionamiento ---
  const [camZones, setCamZones] = useState(() => {
    try {
      const raw = localStorage.getItem(camZonesKey(selectedEstId || 'global'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [selectedZoneIdx, setSelectedZoneIdx] = useState(null);
  const [rectW, setRectW] = useState(96);
  const [rectH, setRectH] = useState(48);
  const [currentRot, setCurrentRot] = useState(0);
  const [mode, setMode] = useState('monitor'); // monitor | edit
  const [history, setHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [sourceMode, setSourceMode] = useState(() => (cameraUrl ? 'camera' : 'webcam'));
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedWebcamId, setSelectedWebcamId] = useState('');
  const [testFile, setTestFile] = useState(null);
  const [testPreview, setTestPreview] = useState(null);

  const [threshold, setThreshold] = useState(900);
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [scanIntervalSec, setScanIntervalSec] = useState(5);
  const [lastScan, setLastScan] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [urlDraft, setUrlDraft] = useState(cameraUrl);
  const [enabledDraft, setEnabledDraft] = useState(cameraEnabled);
  const [savingConfig, setSavingConfig] = useState(false);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotObjectUrlRef = useRef(null);
  const testPreviewUrlRef = useRef(null);

  // cargar zonas al cambiar sede
  useEffect(() => {
    try {
      const raw = localStorage.getItem(camZonesKey(selectedEstId || 'global'));
      setCamZones(raw ? JSON.parse(raw) : []);
    } catch { setCamZones([]); }
    setSelectedZoneIdx(null);
    setHistory([]);
    setMode('monitor');
    setLastScan(null);
    setLastError(null);
  }, [selectedEstId]);

  useEffect(() => {
    if (selectedEstId) try { localStorage.setItem(CAMERA_EST_STORAGE_KEY, selectedEstId); } catch {}
  }, [selectedEstId]);

  useEffect(() => { setUrlDraft(cameraUrl); setEnabledDraft(cameraEnabled); }, [cameraUrl, cameraEnabled]);
  useEffect(() => { if (!cameraUrl && sourceMode === 'camera') setSourceMode('webcam'); }, [cameraUrl, sourceMode]);

  useEffect(() => {
    if (testPreview && testPreviewUrlRef.current) URL.revokeObjectURL(testPreviewUrlRef.current);
    if (testFile) {
      const u = URL.createObjectURL(testFile);
      testPreviewUrlRef.current = u;
      setTestPreview(u);
    } else {
      testPreviewUrlRef.current = null;
      setTestPreview(null);
    }
    return () => { if (testPreviewUrlRef.current) try { URL.revokeObjectURL(testPreviewUrlRef.current); } catch {} };
  }, [testFile]);

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const vids = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(vids);
        if (vids.length > 0 && !selectedWebcamId) setSelectedWebcamId(vids[0].deviceId);
      }).catch(() => {});
    }
  }, [selectedWebcamId]);

  const persistZones = useCallback((zones) => {
    try { localStorage.setItem(camZonesKey(selectedEstId || 'global'), JSON.stringify(zones)); } catch {}
  }, [selectedEstId]);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(camZones))].slice(-30));
  }, [camZones]);

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((p) => p.slice(0, -1));
    setCamZones(prev);
    persistZones(prev);
    setSelectedZoneIdx(null);
  };

  const handleSaveZones = () => {
    persistZones(camZones);
    setMode('monitor');
    toast.success(`${camZones.length} zonas de cámara guardadas (módulo independiente)`);
  };

  const handleRotate = (delta = 45) => {
    pushHistory();
    if (selectedZoneIdx !== null && camZones[selectedZoneIdx]) {
      const nz = ((camZones[selectedZoneIdx].rot || 0) + delta) % 360;
      setCamZones((prev) => {
        const next = prev.map((z, i) => (i === selectedZoneIdx ? { ...z, rot: nz } : z));
        persistZones(next); return next;
      });
    } else {
      const nz = (currentRot + delta) % 360;
      setCurrentRot(nz);
      toast(`Rotación base ${nz}° para nuevas zonas`);
    }
  };

  const handleResize = (dw, dh) => {
    pushHistory();
    const nw = Math.max(24, rectW + dw);
    const nh = Math.max(18, rectH + dh);
    setRectW(nw); setRectH(nh);
    if (selectedZoneIdx !== null && camZones[selectedZoneIdx]) {
      setCamZones((prev) => {
        const next = prev.map((z, i) => (i === selectedZoneIdx ? { ...z, w: nw, h: nh } : z));
        persistZones(next); return next;
      });
    }
  };

  // canvas helpers
  const getCanvasCoords = (e) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - r.left) / r.width) * CANVAS_W),
      y: Math.round(((e.clientY - r.top) / r.height) * CANVAS_H),
    };
  };
  const hitTest = (x, y) => {
    for (let i = camZones.length - 1; i >= 0; i--) {
      const z = camZones[i];
      const w = z.w || rectW, h = z.h || rectH;
      // para rotadas, test AABB simplificado (suficiente para editor)
      if (x >= z.x && x <= z.x + w && y >= z.y && y <= z.y + h) return i;
    }
    return -1;
  };
  const handleMouseDown = (e) => {
    if (mode !== 'edit' || e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit >= 0) {
      pushHistory();
      setSelectedZoneIdx(hit);
      setIsDragging(true);
      setDragOffset({ x: x - camZones[hit].x, y: y - camZones[hit].y });
    } else {
      pushHistory();
      const code = `CAM-${String(camZones.length + 1).padStart(2, '0')}`;
      const nz = { id: `cz_${Date.now()}`, code, x: Math.max(0, Math.min(CANVAS_W - rectW, x - rectW / 2)), y: Math.max(0, Math.min(CANVAS_H - rectH, y - rectH / 2)), w: rectW, h: rectH, rot: currentRot, status: 'free' };
      const next = [...camZones, nz];
      setCamZones(next); persistZones(next);
      setSelectedZoneIdx(next.length - 1);
      setIsDragging(true);
      setDragOffset({ x: rectW / 2, y: rectH / 2 });
    }
  };
  const handleMouseMove = (e) => {
    if (mode !== 'edit' || !isDragging || selectedZoneIdx === null) return;
    const { x, y } = getCanvasCoords(e);
    const w = camZones[selectedZoneIdx]?.w || rectW;
    const h = camZones[selectedZoneIdx]?.h || rectH;
    const nx = Math.max(0, Math.min(CANVAS_W - w, x - dragOffset.x));
    const ny = Math.max(0, Math.min(CANVAS_H - h, y - dragOffset.y));
    setCamZones((prev) => {
      const next = prev.map((z, i) => (i === selectedZoneIdx ? { ...z, x: nx, y: ny } : z));
      return next;
    });
  };
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      persistZones(camZones);
    }
  };
  const handleContextMenu = (e) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit >= 0) {
      pushHistory();
      const next = camZones.filter((_, i) => i !== hit);
      setCamZones(next); persistZones(next);
      setSelectedZoneIdx(null);
    }
  };

  // dibujo canvas en modo edición
  useEffect(() => {
    if (mode !== 'edit') return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    camZones.forEach((z, idx) => {
      const isSel = idx === selectedZoneIdx;
      const w = z.w || rectW, h = z.h || rectH;
      ctx.save();
      ctx.translate(z.x + w / 2, z.y + h / 2);
      if (z.rot) ctx.rotate((z.rot * Math.PI) / 180);
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.strokeStyle = isSel ? '#facc15' : z.status === 'occupied' ? '#f43f5e' : '#10b981';
      ctx.fillStyle = isSel ? 'rgba(250,204,21,0.28)' : z.status === 'occupied' ? 'rgba(244,63,94,0.22)' : 'rgba(16,185,129,0.18)';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 6); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h); }
      ctx.fillStyle = 'rgba(15,23,42,0.92)';
      ctx.fillRect(-26, -10, 52, 18);
      ctx.fillStyle = isSel ? '#facc15' : '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(z.code, 0, 0);
      ctx.restore();
    });
  }, [camZones, selectedZoneIdx, mode, rectW, rectH]);

  // snapshot para cámara IP
  const refreshSnapshot = useCallback(async () => {
    if (!numericId || sourceMode !== 'camera' || !cameraUrl) return;
    try {
      const res = await api.get(`/parkings/${numericId}/camera/snapshot`, { responseType: 'blob' });
      if (snapshotObjectUrlRef.current) URL.revokeObjectURL(snapshotObjectUrlRef.current);
      const u = URL.createObjectURL(res.data);
      snapshotObjectUrlRef.current = u;
      setSnapshotUrl(u);
    } catch {}
  }, [numericId, sourceMode, cameraUrl]);

  useEffect(() => {
    if (sourceMode !== 'camera') return;
    refreshSnapshot();
    const iv = setInterval(refreshSnapshot, 4000);
    return () => clearInterval(iv);
  }, [sourceMode, refreshSnapshot]);

  useEffect(() => () => {
    if (snapshotObjectUrlRef.current) try { URL.revokeObjectURL(snapshotObjectUrlRef.current); } catch {}
    if (testPreviewUrlRef.current) try { URL.revokeObjectURL(testPreviewUrlRef.current); } catch {}
  }, []);

  const handleUploadTestImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Imagen demasiado grande (máx 8 MB)'); return; }
    setTestFile(file);
    setSourceMode('image');
    toast.success(`Imagen "${file.name}" lista`);
    e.target.value = '';
  };

  const saveCameraConfig = async () => {
    if (!numericId) { toast.error('Selecciona una sede del servidor para guardar la URL'); return; }
    const trimmed = urlDraft.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) { toast.error('La URL debe comenzar con http:// o https://'); return; }
    setSavingConfig(true);
    try {
      await api.put(`/parkings/${numericId}/camera/config`, { camera_url: trimmed || null, camera_enabled: !!enabledDraft });
      setEstablishments((prev) => prev.map((est) => String(est.id) === String(currentEst.id) ? { ...est, camera_url: trimmed, camera_enabled: !!enabledDraft } : est));
      toast.success('URL de cámara guardada');
      setShowConfig(false);
      if (trimmed) setTimeout(refreshSnapshot, 600);
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'No se pudo guardar');
    } finally { setSavingConfig(false); }
  };

  // Escaneo REAL independiente del estacionamiento: POST /vision/process-boxes
  const runScan = useCallback(async ({ silent = false } = {}) => {
    if (camZones.length === 0) { if (!silent) toast.error('Dibuja al menos 1 zona de cámara (modo Editar)'); return; }
    if (sourceMode === 'camera' && !cameraUrl && !snapshotUrl) {
      // intentar snapshot igual; si no hay URL configurada, pedir webcam/imagen
      if (!silent) toast.error('Configura la URL de la cámara IP o cambia a WebCam/Imagen');
      return;
    }
    if (sourceMode === 'image' && !testFile) { if (!silent) toast.error('Sube una imagen'); return; }
    setScanning(true); setLastError(null);
    const t0 = performance.now();
    try {
      let blob;
      if (sourceMode === 'webcam') {
        const dataUrl = webcamRef.current?.getScreenshot({ width: 1280, height: 720 });
        if (!dataUrl) throw new Error('No se pudo capturar la webcam');
        blob = await (await fetch(dataUrl)).blob();
      } else if (sourceMode === 'image') {
        blob = testFile;
      } else {
        // cámara IP: usar snapshot del servidor
        if (numericId && cameraUrl) {
          const resSnap = await api.get(`/parkings/${numericId}/camera/snapshot`, { responseType: 'blob' });
          blob = resSnap.data;
        } else if (snapshotUrl) {
          blob = await (await fetch(snapshotUrl)).blob();
        } else throw new Error('Sin frame de cámara IP');
      }
      const fd = new FormData();
      fd.append('file', blob, 'frame.jpg');
      fd.append('slots_json', JSON.stringify(camZones.map((z) => ({ code: z.code, x: z.x, y: z.y, w: z.w, h: z.h, rot: z.rot || 0 }))));
      fd.append('threshold', String(threshold));
      if (debugMode) fd.append('debug', 'true');

      const res = await api.post('/parkings/vision/process-boxes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const ms = Math.round(performance.now() - t0);
      const occ = res.data?.occupancy || {};
      const occCount = Object.values(occ).filter(Boolean).length;
      setCamZones((prev) => {
        const next = prev.map((z) => ({ ...z, status: occ[z.code] ? 'occupied' : 'free' }));
        return next;
      });
      setDebugData(res.data?.counts ? res.data : null);
      setLastScan({ ts: new Date().toISOString(), ms, occupancy: occ, occCount, total: camZones.length, source: sourceMode, white_ratio: res.data?.white_ratio });
      if (!silent) toast.success(`Escaneo OK · ${occCount}/${camZones.length} ocupadas · thr ${threshold} · ${ms} ms`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err?.message || 'Fallo el escaneo');
      setLastError(msg);
      if (!silent) toast.error(msg);
    } finally { setScanning(false); }
  }, [camZones, sourceMode, cameraUrl, snapshotUrl, testFile, numericId]);

  const runScanRef = useRef(runScan);
  useEffect(() => { runScanRef.current = runScan; }, [runScan]);
  useEffect(() => {
    if (!autoScan || scanning || mode === 'edit') return;
    if (camZones.length === 0) return;
    const iv = setInterval(() => runScanRef.current({ silent: true }), Math.max(3, scanIntervalSec) * 1000);
    return () => clearInterval(iv);
  }, [autoScan, scanning, mode, camZones.length, scanIntervalSec]);

  const occCount = lastScan ? lastScan.occCount : camZones.filter((z) => z.status === 'occupied').length;
  const freeCount = Math.max(0, camZones.length - occCount);

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Header independiente */}
      <div className="bg-slate-900 border border-slate-800 rounded-[20px] p-4 text-white flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black tracking-tight">Monitoreo de Cámaras — Visión IA</h2>
                <span className="bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Layers className="w-3 h-3" /> MÓDULO INDEPENDIENTE</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">No modifica el plano ni el estado del estacionamiento. Zonas propias de cámara (OpenCV car-parking-finder).</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none min-w-[180px]">
                {establishments.map((est) => (<option key={est.id} value={est.id} className="text-slate-900">{est.name}</option>))}
              </select>
            </div>
            {mode === 'monitor' ? (
              <Button type="button" onClick={() => setMode('edit')} className="h-9 rounded-xl bg-white text-slate-900 font-black text-xs gap-1.5 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /> Editar zonas</Button>
            ) : (
              <Button type="button" onClick={handleSaveZones} className="h-9 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs gap-1.5 hover:bg-emerald-400"><Save className="w-3.5 h-3.5" /> Guardar zonas</Button>
            )}
            <Button type="button" variant="outline" onClick={() => setShowConfig((v) => !v)} className={`h-9 rounded-xl text-xs font-black gap-1.5 ${showConfig ? 'bg-white text-slate-900' : 'bg-slate-800 border-slate-700 text-white'}`}><Settings2 className="w-3.5 h-3.5" /> Cámara IP</Button>
          </div>
        </div>
        {showConfig && (
          <div className="bg-white rounded-2xl p-3 flex flex-col gap-2 text-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black">URL MJPEG/JPEG de la sede · {currentEst?.name}</span>
              <button type="button" onClick={() => setShowConfig(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid md:grid-cols-[1fr_auto] gap-2">
              <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="http://192.168.1.50:8080/video" className="h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500" />
              <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={enabledDraft} onChange={(e) => setEnabledDraft(e.target.checked)} className="w-4 h-4 accent-emerald-500" /> Habilitada</label>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveCameraConfig} disabled={savingConfig || !numericId} className="h-9 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Guardar URL</Button>
              <Button type="button" variant="outline" onClick={refreshSnapshot} disabled={!cameraUrl} className="h-9 rounded-xl text-xs"><Eye className="w-3.5 h-3.5" /> Probar snapshot</Button>
              <span className="text-xs text-slate-500 self-center truncate">{cameraUrl ? `Actual: ${cameraUrl.slice(0, 60)}` : 'Sin URL'} {calibration ? '· calibrada' : ''}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900">FUENTE:</span>
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button type="button" onClick={() => setSourceMode('camera')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${sourceMode === 'camera' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Radio className="w-3.5 h-3.5" /> Cámara IP</button>
            <button type="button" onClick={() => setSourceMode('webcam')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${sourceMode === 'webcam' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Video className="w-3.5 h-3.5" /> WebCam</button>
            <button type="button" onClick={() => setSourceMode('image')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${sourceMode === 'image' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}><ImageIcon className="w-3.5 h-3.5" /> Imagen</button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-black tracking-widest text-slate-500">UMBRAL</span>
            <input type="range" min={300} max={1800} step={50} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-24 accent-emerald-500" title="900 = original car-parking-finder" />
            <span className="text-xs font-mono font-bold min-w-[48px]">{threshold}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">900 original</span>
            <label className="flex items-center gap-1 text-xs font-bold ml-2 border-l border-slate-300 pl-2"><input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} className="w-3.5 h-3.5 accent-violet-500" /> Debug</label>
          </div>
          {sourceMode === 'webcam' && availableDevices.length > 1 && (
            <select value={selectedWebcamId} onChange={(e) => setSelectedWebcamId(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold outline-none">
              {availableDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${d.deviceId.slice(0, 6)}`}</option>)}
            </select>
          )}
          {sourceMode === 'image' && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadTestImage} className="hidden" />
              <Button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-xl bg-slate-900 text-white text-xs font-black gap-1.5"><Upload className="w-3.5 h-3.5" /> Subir imagen</Button>
              {testFile && <span className="text-xs font-medium text-slate-600 max-w-[150px] truncate">{testFile.name}</span>}
            </>
          )}
          <button type="button" onClick={() => setAutoScan((v) => !v)} disabled={mode === 'edit'} className={`h-9 px-3 rounded-xl font-black text-xs flex items-center gap-1.5 border ${autoScan ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} disabled:opacity-40`}>
            <span className={`w-2 h-2 rounded-full ${autoScan ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />{autoScan ? 'Auto ON' : 'Auto OFF'}
          </button>
          {autoScan && (
            <select value={scanIntervalSec} onChange={(e) => setScanIntervalSec(Number(e.target.value))} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold outline-none">
              <option value={3}>cada 3 s</option><option value={5}>cada 5 s</option><option value={10}>cada 10 s</option>
            </select>
          )}
          <Button type="button" onClick={() => runScan()} disabled={scanning || mode === 'edit'} className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-1.5 disabled:opacity-40">
            {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}{scanning ? 'Escaneando…' : 'Escanear ahora'}
          </Button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-[22px] border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${scanning ? 'bg-amber-400 animate-pulse' : autoScan ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-xs font-black text-white truncate">{sourceMode === 'camera' ? 'Cámara IP' : sourceMode === 'webcam' ? 'WebCam' : 'Imagen'} · {camZones.length} zonas</span>
            {lastScan && <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400"><Clock className="w-3 h-3" />{new Date(lastScan.ts).toLocaleTimeString('es-PE')} · {lastScan.ms} ms</span>}
          </div>
          <div className="text-xs font-bold text-slate-400">{mode === 'edit' ? 'Click: crear · Arrastrar: mover · Click derecho: borrar' : `${camZones.length} zonas independientes`}</div>
        </div>

        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[460px]">
          {sourceMode === 'webcam' ? (
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" screenshotQuality={0.92} videoConstraints={{ deviceId: selectedWebcamId ? { exact: selectedWebcamId } : undefined, width: 1280, height: 720 }} className="w-full h-full object-cover min-h-[380px] sm:min-h-[460px]" />
          ) : sourceMode === 'image' ? (
            testPreview ? <img src={testPreview} alt="Prueba" className="w-full h-full object-cover min-h-[380px] sm:min-h-[460px]" /> : <div className="text-center p-8"><ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-sm font-bold text-slate-300">Sube una imagen</p><p className="text-xs text-slate-500">Activa Debug para ver el procesado OpenCV</p></div>
          ) : snapshotUrl ? <img src={snapshotUrl} alt="Snapshot" className="w-full h-full object-cover min-h-[380px] sm:min-h-[460px]" /> : <div className="text-center p-8"><Camera className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-sm font-bold text-slate-300">{cameraUrl ? 'Sin snapshot — pulsa Probar snapshot' : 'Cámara IP no configurada'}</p></div>
          }

          {/* overlay zonas en monitor */}
          {mode === 'monitor' && camZones.map((z) => {
            const occ = z.status === 'occupied';
            return (
              <div key={z.id || z.code} className={`absolute border-2 rounded-md flex items-start justify-center pointer-events-none ${occ ? 'border-rose-500 bg-rose-500/20' : 'border-emerald-500 bg-emerald-500/15'}`} style={{ left: `${(z.x / CANVAS_W) * 100}%`, top: `${(z.y / CANVAS_H) * 100}%`, width: `${(z.w / CANVAS_W) * 100}%`, height: `${(z.h / CANVAS_H) * 100}%`, transform: z.rot ? `rotate(${z.rot}deg)` : undefined, transformOrigin: 'center' }}>
                <span className={`text-[9px] font-mono font-black px-1 py-0.5 rounded-b ${occ ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>{z.code}</span>
              </div>
            );
          })}

          {/* canvas edición */}
          {mode === 'edit' && (
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu} className="absolute inset-0 w-full h-full cursor-crosshair z-20" />
          )}

          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-3 text-white">
            <div className="text-center"><p className="text-[9px] font-black tracking-widest text-emerald-400">LIBRES</p><p className="text-sm font-mono font-black text-emerald-400">{freeCount}/{camZones.length}</p></div>
            <span className="w-px h-7 bg-white/10" />
            <div className="text-center"><p className="text-[9px] font-black tracking-widest text-rose-400">OCUPADAS</p><p className="text-sm font-mono font-black text-rose-400">{occCount}/{camZones.length}</p></div>
          </div>
          {lastError && <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md bg-rose-950/90 backdrop-blur border border-rose-800 rounded-xl px-3 py-2 flex items-start gap-2 text-rose-100"><AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" /><p className="text-xs font-medium leading-tight">{lastError}</p><button type="button" onClick={() => setLastError(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg"><X className="w-3.5 h-3.5" /></button></div>}
        </div>

        {/* toolbar edición */}
        {mode === 'edit' && (
          <div className="px-3 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSaveZones} className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Guardar zonas</Button>
            <Button type="button" variant="outline" onClick={() => handleResize(10, 5)} className="h-9 rounded-xl bg-slate-800 border-slate-700 text-cyan-300 text-xs font-bold">+ TAM</Button>
            <Button type="button" variant="outline" onClick={() => handleResize(-10, -5)} className="h-9 rounded-xl bg-slate-800 border-slate-700 text-cyan-300 text-xs font-bold">- TAM</Button>
            <Button type="button" variant="outline" onClick={() => handleRotate(45)} className="h-9 rounded-xl bg-slate-800 border-slate-700 text-amber-300 text-xs font-bold gap-1"><RotateCw className="w-3.5 h-3.5" /> Rotar 45°</Button>
            <Button type="button" variant="outline" onClick={handleUndo} disabled={!history.length} className="h-9 rounded-xl bg-slate-800 border-slate-700 text-white text-xs font-bold disabled:opacity-40">Deshacer</Button>
            <Button type="button" variant="outline" onClick={() => { pushHistory(); const n=[]; setCamZones(n); persistZones(n); setSelectedZoneIdx(null); }} className="h-9 rounded-xl bg-slate-800 border-slate-700 text-rose-400 text-xs font-bold gap-1"><Trash2 className="w-3.5 h-3.5" /> Limpiar</Button>
            <Button type="button" variant="ghost" onClick={() => setMode('monitor')} className="ml-auto h-9 rounded-xl text-slate-400 hover:text-white text-xs font-bold">Cancelar</Button>
            <span className="w-full text-[11px] text-slate-400">Click para crear zona · Click en zona para seleccionar → +TAM/-TAM/Rotar afecta selección · Click derecho borra · Zonas independientes del estacionamiento.</span>
          </div>
        )}

        {mode === 'monitor' && lastScan && (
          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-300"><Cpu className="w-3.5 h-3.5 text-violet-400" /> Umbral adaptativo</span>
            <span className="w-px h-4 bg-white/10" /><span className="text-slate-400">{lastScan.occCount} ocupadas / {lastScan.total}</span>
            <span className="w-px h-4 bg-white/10" /><span className="text-slate-400">{lastScan.ms} ms · {new Date(lastScan.ts).toLocaleString('es-PE')}</span>
            <span className="ml-auto text-[11px] font-mono text-slate-500">src: {lastScan.source} · independiente</span>
          </div>
        )}
      </div>

      {debugMode && debugData && (
        <div className="bg-violet-950 rounded-[20px] border border-violet-800 p-4 text-white space-y-3">
          <h3 className="text-xs font-black tracking-widest flex items-center gap-2"><Cpu className="w-4 h-4 text-violet-300" /> DEBUG — Procesado OpenCV + conteos por zona (thr {threshold})</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div><p className="text-[10px] font-black tracking-widest text-violet-300 mb-1">PROCESADO (AdaptiveThr → Median → Dilate)</p><img src={debugData.processed_image} alt="Procesado" className="w-full rounded-xl border border-violet-800 bg-black" /></div>
            <div><p className="text-[10px] font-black tracking-widest text-violet-300 mb-1">ANOTADO</p><img src={debugData.annotated_image} alt="Anotado" className="w-full rounded-xl border border-violet-800" /></div>
          </div>
          <div className="overflow-auto max-h-[220px] bg-black/30 rounded-xl p-2">
            <table className="w-full text-xs font-mono">
              <thead className="text-violet-300"><tr><th className="text-left p-1">Zona</th><th className="p-1">count</th><th className="p-1">área</th><th className="p-1">ratio</th><th className="p-1">thr</th><th className="p-1">estado</th><th className="p-1">dark/edge</th></tr></thead>
              <tbody>{Object.entries(debugData.counts || {}).map(([code, v]) => (<tr key={code} className={debugData.occupancy?.[code] ? 'text-rose-300' : 'text-emerald-300'}><td className="p-1 font-black">{code}</td><td className="p-1 text-center">{v.count}</td><td className="p-1 text-center">{v.area}</td><td className="p-1 text-center">{v.ratio}</td><td className="p-1 text-center">{v.threshold}</td><td className="p-1 text-center font-black">{debugData.occupancy?.[code] ? 'OCUP' : 'LIBRE'}</td><td className="p-1 text-[10px]">{v.dark_ratio ? `d${v.dark_ratio}` : ''} {v.edge_density ? `e${v.edge_density}` : ''}</td></tr>))}</tbody>
            </table>
          </div>
          <p className="text-[11px] text-violet-300">Si falla: baja umbral si marca LIBRE con auto, súbelo si marca OCUP con vacío. Zonas deben encerrar solo asfalto + auto, sin pasillos.</p>
        </div>
      )}

      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4">
        <h3 className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-emerald-500" /> ZONAS DE CÁMARA — {camZones.length} zonas (módulo aparte)</h3>
        {camZones.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">Sin zonas de cámara</p>
            <p className="text-xs text-slate-500 mt-1">Pulsa <b>Editar zonas</b> y dibuja rectángulos sobre la vista. Son independientes del plano del estacionamiento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {camZones.map((z, idx) => (
              <button key={z.id} type="button" onClick={() => setSelectedZoneIdx(idx)} className={`rounded-xl border-2 px-2 py-2 text-center transition ${idx === selectedZoneIdx ? 'ring-2 ring-amber-400' : ''} ${z.status === 'occupied' ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
                <p className="text-xs font-mono font-black text-slate-900">{z.code}</p>
                <p className={`text-[10px] font-black tracking-widest ${z.status === 'occupied' ? 'text-rose-700' : 'text-emerald-700'}`}>{z.status === 'occupied' ? 'OCUPADA' : 'LIBRE'}</p>
                <p className="text-[9px] font-mono text-slate-400">{Math.round(z.w)}×{Math.round(z.h)}{z.rot ? ` · ${z.rot}°` : ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraMonitorModule;
