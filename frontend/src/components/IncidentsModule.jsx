import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Clock,
  Camera,
  Search,
  Eye,
  Plus,
  ShieldCheck,
  RefreshCw,
  Check,
  MapPin,
  Loader2,
  Upload
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CATEGORY_LABELS = {
  cajon_bloqueado: 'Cajón Bloqueado',
  cobro_indebido: 'Cobro Indebido',
  dano_vehicular: 'Daño Vehicular',
  iluminacion: 'Iluminación Deficiente',
  otro: 'Otro'
};

// Compresión de imagen a dataURL JPEG (~máx 300KB) para photo_url base64
const compressToDataUrl = (source, srcW, srcH) => {
  const MAX_DIM = 1280;
  let w = srcW;
  let h = srcH;
  if (w > MAX_DIM || h > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);
  const MAX_BYTES = 300 * 1024;
  let quality = 0.8;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while ((dataUrl.length * 0.75) > MAX_BYTES && quality > 0.3) {
    quality -= 0.15;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
};

const fileToCompressedDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => resolve(compressToDataUrl(img, img.width, img.height));
    img.onerror = reject;
    img.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
};

export const IncidentsModule = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'local' || role === 'platform';

  const [incidents, setIncidents] = useState([]);
  const [parkingsMap, setParkingsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterParking, setFilterParking] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [notification, setNotification] = useState(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    category: 'cajon_bloqueado',
    parkingId: '',
    description: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  // Cámara
  const [photoMode, setPhotoMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu navegador no soporta captura de cámara directa.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const dataUrl = compressToDataUrl(
      video,
      video.videoWidth || 640,
      video.videoHeight || 480
    );

    setPhotoPreview(dataUrl);
    stopCamera();
    setPhotoMode('upload');

    const shutter = document.getElementById('camera-shutter-flash');
    if (shutter) {
      shutter.style.opacity = '1';
      setTimeout(() => {
        shutter.style.opacity = '0';
      }, 150);
    }
  };

  useEffect(() => {
    if (!showModal || photoMode !== 'camera') {
      stopCamera();
    } else if (showModal && photoMode === 'camera' && !isCameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showModal, photoMode]);

  // Dropzone (una sola foto de evidencia)
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhotoPreview(dataUrl);
    } catch (e) {
      showToast('No se pudo procesar la imagen.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 6 * 1024 * 1024
  });

  const removePhoto = () => setPhotoPreview(null);

  // Cargar incidencias REALES desde la API (el backend filtra por rol) + catálogo de cocheras
  const loadIncidents = async () => {
    try {
      const [incRes, parkRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/parkings'),
      ]);
      const incs = Array.isArray(incRes.data) ? incRes.data : [];
      const parks = Array.isArray(parkRes.data) ? parkRes.data : [];
      const pmap = {};
      parks.forEach(p => { pmap[p.id] = p.name; });
      setParkingsMap(pmap);
      setIncidents(incs);
      setFormData(prev => ({ ...prev, parkingId: prev.parkingId || String(parks[0]?.id || '') }));
    } catch (e) {
      showToast('No se pudieron cargar las incidencias. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIncidents(); }, []);

  const parkingNameOf = (inc) => parkingsMap[inc.parking_id] || `Cochera #${inc.parking_id}`;

  const resetForm = () => {
    setFormData({ category: 'cajon_bloqueado', parkingId: String(Object.keys(parkingsMap)[0] || ''), description: '' });
    setPhotoPreview(null);
    setPhotoMode('upload');
  };

  // POST /incidents (requiere JWT): cualquier usuario autenticado puede reportar
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!formData.parkingId || formData.description.trim().length < 5) return;
    setSubmitting(true);
    try {
      await api.post('/incidents', {
        parking_id: Number(formData.parkingId),
        category: formData.category,
        description: formData.description.trim(),
        photo_url: photoPreview || null
      });
      setShowModal(false);
      resetForm();
      showToast('✓ Incidencia registrada exitosamente.');
      await loadIncidents(); // refresca desde el servidor
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) showToast('Debes iniciar sesión para reportar una incidencia.');
      else if (status === 404) showToast('El estacionamiento seleccionado no existe.');
      else showToast('No se pudo registrar la incidencia. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // PUT /incidents/{id}/resolve (solo local/platform)
  const handleOpenResolve = (inc) => {
    setResolveTarget(inc);
    setResolutionNote('');
    setShowResolveModal(true);
  };

  const handleResolveIncident = async (e) => {
    e.preventDefault();
    if (!resolveTarget || !resolutionNote.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/incidents/${resolveTarget.id}/resolve`, { resolution_note: resolutionNote.trim() });
      setShowResolveModal(false);
      setResolveTarget(null);
      showToast('Incidencia marcada como resuelta.');
      await loadIncidents();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) showToast(err?.response?.data?.detail || 'La incidencia ya fue resuelta.');
      else if (status === 403) showToast('Solo administradores pueden resolver incidencias.');
      else showToast('No se pudo resolver la incidencia.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchParking = filterParking === 'all' || String(inc.parking_id) === filterParking;
    const q = searchText.toLowerCase();
    const matchSearch = !q ||
      String(inc.id).includes(q) ||
      (inc.user_name || '').toLowerCase().includes(q) ||
      (CATEGORY_LABELS[inc.category] || '').toLowerCase().includes(q) ||
      parkingNameOf(inc).toLowerCase().includes(q) ||
      (inc.description || '').toLowerCase().includes(q);
    return matchStatus && matchParking && matchSearch;
  });

  // Métricas honestas derivadas del servidor
  const totalIncidents = incidents.length;
  const reportedCount = incidents.filter(i => i.status === 'reported').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">

      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 dark:bg-[#111827]/95 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/15 text-amber-500 dark:text-amber-400 rounded-2xl border border-amber-500/30 shadow-xs shrink-0">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {role === 'user' ? 'Reportar Incidencias & Asistencia' : 'Gestión de Incidencias & Asistencia'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {role === 'user'
                ? 'Reporta anomalías en tus estancias con evidencia fotográfica y sigue su resolución.'
                : isAdmin
                ? `Bitácora central de atención operativa${user?.name ? ` • Operador: ${user.name}` : ''}.`
                : 'Bitácora de atención operativa con captura fotográfica y seguimiento.'}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setShowModal(true);
            setPhotoMode('upload');
          }}
          className="gap-2 font-bold cursor-pointer"
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>{role === 'user' ? 'Reportar Problema' : 'Registrar Incidencia'}</span>
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-400/10 dark:bg-slate-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Reportes</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">{totalIncidents}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Histórico</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Acumulado del sistema</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reportadas</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Clock className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">{reportedCount}</span>
            <span className="text-xs text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800/80">Por atender</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">En cola de resolución</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resueltas</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">Concluidas</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Casos cerrados con éxito</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tasa de Resolución</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">{resolutionRate}%</span>
            <span className="text-xs text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800/80">{isAdmin ? 'Red' : 'Tus casos'}</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Efectividad de soporte</p>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 shrink-0 text-slate-400" />
          <Input
            type="text"
            placeholder={role === 'user' ? 'Buscar por código, categoría o descripción...' : 'Buscar por código, reportante o cochera...'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✕</button>
          )}
        </div>

        {isAdmin && (
          <select
            value={filterParking}
            onChange={(e) => setFilterParking(e.target.value)}
            className="h-10 w-full lg:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 cursor-pointer"
          >
            <option value="all">Todas las Cocheras</option>
            {Object.entries(parkingsMap).map(([pid, pname]) => (
              <option key={pid} value={pid}>{pname}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'Todos', count: totalIncidents },
            { id: 'reported', label: 'Reportadas', count: reportedCount, color: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20' },
            { id: 'resolved', label: 'Resueltas', count: resolvedCount, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                filterStatus === st.id
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60'
              }`}
            >
              <span>{st.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                filterStatus === st.id ? 'bg-white/20 text-white' : st.color || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Incidencias */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <span className="text-sm font-bold">Cargando incidencias...</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white/95 dark:bg-[#111827]/95 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-12 text-center shadow-xs dark:shadow-black/50 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          {searchText || filterStatus !== 'all' || filterParking !== 'all' ? (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ninguna incidencia coincide con los filtros</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Ajusta la búsqueda o restablece los filtros para ver otros reportes.</p>
            </>
          ) : role === 'user' ? (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Aún no has reportado incidencias</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Si algo falla durante tu estancia, repórtalo aquí con evidencia fotográfica.</p>
            </>
          ) : (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No hay incidencias registradas en la red</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Todo en orden por ahora: los reportes de los conductores aparecerán aquí.</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {filteredIncidents.map((inc) => (
              <div key={inc.id} className="h-full flex flex-col gap-4 p-6 border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 rounded-2xl shadow-xs hover:shadow-md dark:shadow-black/50 transition">
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-black text-slate-400 dark:text-slate-500">INC-{String(inc.id).padStart(3, '0')}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-2 ${
                      inc.status === 'resolved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/80'
                    }`}>
                      ● {inc.status === 'resolved' ? 'Resuelta' : 'Pendiente'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{CATEGORY_LABELS[inc.category] || inc.category}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{parkingNameOf(inc)}</span>
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-xs font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">Reportante:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{inc.user_name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500">Categoría:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate ml-2">
                        {CATEGORY_LABELS[inc.category] || inc.category}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>Fecha:</span>
                      <span>{formatDateTime(inc.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{inc.description}</p>

                  {/* Evidencia Fotográfica Adjunta */}
                  {inc.photo_url && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedImage(inc.photo_url)}
                        className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group/eye cursor-pointer"
                      >
                        <img src={inc.photo_url} alt="Evidencia" className="w-full h-40 object-cover group-hover/eye:scale-105 transition" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/eye:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-5 h-5 shrink-0 text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Nota de Resolución del Administrador */}
                {inc.status === 'resolved' && inc.resolution_note && (
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 p-4 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                      <span>Nota de Resolución</span>
                    </span>
                    <p className="text-xs text-emerald-950 dark:text-emerald-200 font-medium">{inc.resolution_note}</p>
                  </div>
                )}

                {/* Footer de Tarjeta */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                  {isAdmin ? (
                    inc.status !== 'resolved' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenResolve(inc)}
                        className="w-full gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>Resolver</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-2 mx-auto">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" /> Caso Finalizado · {formatDateTime(inc.resolved_at)}
                      </span>
                    )
                  ) : (
                    <span className={`text-[11px] font-bold flex items-center gap-2 mx-auto ${
                      inc.status === 'resolved' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      <Clock className="w-5 h-5 shrink-0" />
                      {inc.status === 'resolved' ? 'Resuelto por Administración' : 'En Atención por Garita'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Reportar Incidencia */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) stopCamera();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{role === 'user' ? 'Reportar Problema con mi Estancia' : 'Registrar Incidencia Operativa'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Detalla lo sucedido y adjunta evidencia fotográfica tomada al instante o desde tu galería.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateIncident} className="flex flex-col gap-4 my-2">
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Anomalía *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="h-10 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Establecimiento *</label>
              <select
                value={formData.parkingId}
                onChange={(e) => setFormData({ ...formData, parkingId: e.target.value })}
                className="h-10 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                required
              >
                {Object.keys(parkingsMap).length === 0 && (
                  <option value="">Cargando cocheras...</option>
                )}
                {Object.entries(parkingsMap).map(([pid, pname]) => (
                  <option key={pid} value={pid}>{pname}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Descripción del Suceso *</label>
              <textarea
                rows={3}
                placeholder="Explica detalladamente lo sucedido (mínimo 5 caracteres)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                required
              />
            </div>

            {/* SECCIÓN DE EVIDENCIA (opcional, una foto) */}
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center justify-between gap-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Foto de Evidencia (opcional)</label>

                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition text-xs gap-2 flex items-center cursor-pointer ${
                      photoMode === 'upload' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>Subir Archivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('camera')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 text-xs cursor-pointer ${
                      photoMode === 'camera' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-5 h-5 shrink-0" />
                    <span>Tomar Foto</span>
                  </button>
                </div>
              </div>

              {photoMode === 'upload' && !photoPreview && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col gap-2 items-center ${
                    isDragActive ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Arrastra una foto aquí o haz clic para subir</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">JPG, PNG o WebP hasta 6MB (se comprime automáticamente)</p>
                </div>
              )}

              {photoMode === 'camera' && (
                <div className="flex flex-col gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-white relative overflow-hidden">
                  <div
                    id="camera-shutter-flash"
                    className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150 z-30"
                  />

                  {cameraError ? (
                    <div className="p-4 text-center flex flex-col gap-4 items-center">
                      <p className="text-xs text-rose-400 font-bold">{cameraError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={startCamera}
                        className="gap-2"
                      >
                        <RefreshCw className="w-5 h-5 shrink-0" />
                        <span>Reintentar Acceso a Cámara</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative w-full h-40 bg-slate-900 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-40 object-cover"
                        />

                        <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                          <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0" />
                          <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0" />
                          <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0" />
                          <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0" />
                          <span className="text-[10px] text-white/60 font-mono uppercase font-bold">Enfoque Automático</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          onClick={capturePhoto}
                          className="gap-2 rounded-full"
                        >
                          <Camera className="w-5 h-5 shrink-0" />
                          <span>Capturar Foto Ahora</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setPhotoMode('upload')}
                          className="gap-2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {photoPreview && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Evidencia adjunta:</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                      ~{Math.round(photoPreview.length * 0.75 / 1024)} KB · Lista para enviar
                    </span>
                  </div>
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <img src={photoPreview} alt="Evidencia" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="primary" size="md" type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 shrink-0 animate-spin" /> Enviando Reporte...</span>
              ) : (
                'Enviar Reporte de Incidencia'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Resolver Incidencia (ADMIN LOCAL / PLATAFORMA) */}
      {isAdmin && (
        <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Resolver Incidencia INC-{String(resolveTarget?.id || '').padStart(3, '0')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Caso reportado por <strong className="text-slate-800 dark:text-slate-200">{resolveTarget?.user_name}</strong> en {resolveTarget ? parkingNameOf(resolveTarget) : ''}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResolveIncident} className="flex flex-col gap-4 my-2">
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nota de Resolución *</label>
                <textarea
                  rows={4}
                  placeholder="Describe cómo se atendió o resolvió el caso..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                  required
                />
              </div>

              <Button variant="primary" size="md" type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 shrink-0 animate-spin" /> Procesando...</span>
                ) : (
                  'Confirmar Resolución'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Visor de Imagen Grande */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-2xl p-2 bg-slate-950 border-slate-800 rounded-3xl overflow-hidden">
            <div className="relative">
              <img src={selectedImage} alt="Evidencia" className="w-full h-auto max-h-[80vh] object-cover rounded-2xl" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
