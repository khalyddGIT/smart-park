import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  AlertTriangle, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Camera, 
  Search, 
  Eye,
  Plus,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Smartphone,
  Check,
  MapPin
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useAuth } from '../context/AuthContext';

const INCIDENTS_STORAGE_KEY = 'smart_park_incidents_v2';

const INITIAL_INCIDENTS = [
  {
    id: 'INC-2026-001',
    type: 'Bloqueo de Rampa de Acceso',
    plate: 'XYZ-789',
    slot: 'A-01',
    parking: 'Smart Park Plaza Mayor - Planta Baja',
    description: 'Vehículo sedán estacionado bloqueando la rampa peatonal de acceso principal.',
    severity: 'Alta',
    status: 'Pendiente',
    date: '2026-08-18 14:10',
    reporter: 'Operador Garita',
    images: [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'
    ]
  },
  {
    id: 'INC-2026-002',
    type: 'Estacionamiento Fuera de Línea',
    plate: 'W1P-404',
    slot: 'B-04',
    parking: 'Smart Park Plaza Mayor - Sótano 1',
    description: 'Vehículo ocupando dos cajones simultáneamente impidiendo ingreso de otro auto.',
    severity: 'Media',
    status: 'En Revisión',
    date: '2026-08-17 18:30',
    reporter: 'Operador Garita',
    images: [
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'
    ]
  },
  {
    id: 'INC-2026-003',
    type: 'Diferencia en Tarifa de Cobro',
    plate: 'DEF-456',
    slot: 'A-05',
    parking: 'Smart Park Mercado Mariscal Cáceres',
    description: 'Conductor reportó discrepancia de 15 minutos en el cálculo de salida.',
    severity: 'Baja',
    status: 'Resuelto',
    date: '2026-08-16 11:20',
    reporter: 'Carlos Mendoza (Conductor)',
    images: []
  }
];

export const IncidentsModule = () => {
  const { role, user } = useAuth();

  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_INCIDENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
    } catch (e) {}
  }, [incidents]);

  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchPlate, setSearchPlate] = useState('');
  const [notification, setNotification] = useState(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    type: role === 'user' ? 'Cajón Ocupado Indebidamente' : 'Estacionamiento Fuera de Línea',
    plate: '',
    slot: '',
    parking: 'Smart Park Plaza Mayor - Planta Baja',
    severity: 'Media',
    description: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const newPhoto = {
      preview: dataUrl,
      name: `captura_${Date.now()}.jpg`,
      isCameraCapture: true
    };

    setUploadedFiles(prev => [newPhoto, ...prev]);

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

  // Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    const mapped = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...mapped]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 6 * 1024 * 1024
  });

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateIncident = (e) => {
    e.preventDefault();
    if (!formData.plate || !formData.slot) return;

    const newInc = {
      id: `INC-2026-${String(incidents.length + 1).padStart(3, '0')}`,
      type: formData.type,
      plate: formData.plate.toUpperCase(),
      slot: formData.slot.toUpperCase(),
      parking: formData.parking,
      description: formData.description || 'Sin observaciones adicionales.',
      severity: formData.severity,
      status: 'Pendiente',
      date: new Date().toLocaleString(),
      reporter: user?.name || (role === 'user' ? 'Conductor' : 'Operador de Garita'),
      images: uploadedFiles.map(f => f.preview)
    };

    setIncidents([newInc, ...incidents]);
    setShowModal(false);
    stopCamera();
    setFormData({
      type: role === 'user' ? 'Cajón Ocupado Indebidamente' : 'Estacionamiento Fuera de Línea',
      plate: '',
      slot: '',
      parking: 'Smart Park Plaza Mayor - Planta Baja',
      severity: 'Media',
      description: ''
    });
    setUploadedFiles([]);
    showToast(`✓ Incidencia ${newInc.id} registrada exitosamente.`);
  };

  const handleResolveIncident = (id) => {
    setIncidents(incidents.map(inc => {
      if (inc.id === id) {
        return { ...inc, status: 'Resuelto' };
      }
      return inc;
    }));
    showToast(`Incidencia ${id} marcada como resuelta.`);
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchPlate = !searchPlate || 
      inc.plate.toLowerCase().includes(searchPlate.toLowerCase()) || 
      inc.id.toLowerCase().includes(searchPlate.toLowerCase()) ||
      inc.parking.toLowerCase().includes(searchPlate.toLowerCase());
    return matchStatus && matchPlate;
  });

  // Métricas
  const totalIncidents = incidents.length;
  const pendingCount = incidents.filter(i => i.status === 'Pendiente').length;
  const inReviewCount = incidents.filter(i => i.status === 'En Revisión').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resuelto').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {role === 'user' ? 'Reportar Incidencias & Asistencia' : 'Gestión de Incidencias & Infracciones'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Bitácora de atención operativa con captura fotográfica en vivo y seguimiento de anomalías.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setShowModal(true);
            setPhotoMode('upload');
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 rounded-xl shadow-md shadow-amber-600/20 h-10 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{role === 'user' ? 'Reportar Problema' : 'Registrar Infracción'}</span>
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Reportes</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900">{totalIncidents}</span>
            <span className="text-xs text-slate-500">Histórico</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-rose-200 shadow-xs bg-rose-50/40 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Pendientes</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-rose-700">{pendingCount}</span>
            <span className="text-xs text-rose-600 font-bold">Por atender</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-amber-200 shadow-xs bg-amber-50/40 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">En Revisión</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-amber-800">{inReviewCount}</span>
            <span className="text-xs text-amber-700 font-bold">En proceso</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-emerald-200 shadow-xs bg-emerald-50/40 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Resueltos</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-700">{resolvedCount}</span>
            <span className="text-xs text-emerald-700 font-bold">Concluidos</span>
          </div>
        </Card>
      </div>

      {/* Buscador y Filtros */}
      <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa, cochera o código INC..."
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold"
          />
          {searchPlate && (
            <button onClick={() => setSearchPlate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✕</button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'Todos', count: totalIncidents },
            { id: 'Pendiente', label: 'Pendientes', count: pendingCount, color: 'text-rose-700 bg-rose-100' },
            { id: 'En Revisión', label: 'En Revisión', count: inReviewCount, color: 'text-amber-800 bg-amber-100' },
            { id: 'Resuelto', label: 'Resueltos', count: resolvedCount, color: 'text-emerald-700 bg-emerald-100' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                filterStatus === st.id 
                  ? 'bg-slate-900 text-white shadow-xs font-black' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{st.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                filterStatus === st.id ? 'bg-white/20 text-white' : st.color || 'bg-slate-200 text-slate-700'
              }`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Grid de Incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIncidents.map((inc) => (
          <Card key={inc.id} className="p-5 border-slate-200 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition rounded-3xl group">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-black text-slate-400">{inc.id}</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                  inc.status === 'Resuelto' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : inc.status === 'Pendiente' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  ● {inc.status}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mb-1">{inc.type}</h3>
              <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{inc.parking}</span>
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs font-mono mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Placa:</span>
                  <span className="font-black text-slate-900 bg-white px-2 py-0.2 rounded border border-slate-200">🇵🇪 {inc.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plaza:</span>
                  <span className="font-bold text-emerald-700">{inc.slot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Severidad:</span>
                  <span className={`font-bold ${inc.severity === 'Alta' ? 'text-rose-600' : inc.severity === 'Media' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {inc.severity}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                  <span>Fecha:</span>
                  <span>{inc.date}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">{inc.description}</p>

              {/* Miniaturas de Fotos Adjuntas */}
              {inc.images && inc.images.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {inc.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 relative group cursor-pointer"
                    >
                      <img src={img} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer de Tarjeta */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {(role === 'local' || role === 'platform') ? (
                inc.status !== 'Resuelto' ? (
                  <Button
                    onClick={() => handleResolveIncident(inc.id)}
                    size="sm"
                    className="w-full text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar como Resuelto</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mx-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Caso Finalizado
                  </span>
                )
              ) : (
                <span className={`text-[11px] font-bold flex items-center gap-1 mx-auto ${
                  inc.status === 'Resuelto' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {inc.status === 'Resuelto' ? 'Resuelto por Administración' : 'En Atención por Garita'}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Reportar Incidencia */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) stopCamera();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>{role === 'user' ? 'Reportar Problema con mi Estancia' : 'Registrar Infracción Operativa'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Detalla lo sucedido y adjunta evidencia fotográfica tomada al instante o desde tu galería.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateIncident} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Anomalía / Reporte *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {role === 'user' ? (
                  <>
                    <option value="Cajón Ocupado Indebidamente">Cajón Ocupado Indebidamente</option>
                    <option value="Dificultad con la Barrera / LPR">Dificultad con la Barrera / LPR</option>
                    <option value="Diferencia en Tarifa de Cobro">Diferencia en Tarifa de Cobro</option>
                    <option value="Daño / Rayón a mi Vehículo">Daño / Rayón a mi Vehículo</option>
                    <option value="Extravío de Pase / Objeto">Extravío de Pase / Objeto</option>
                  </>
                ) : (
                  <>
                    <option value="Bloqueo de Rampa de Acceso">Bloqueo de Rampa de Acceso</option>
                    <option value="Estacionamiento Fuera de Línea">Estacionamiento Fuera de Línea</option>
                    <option value="Estancia Vencida sin Liquidar">Estancia Vencida sin Liquidar</option>
                    <option value="Vehículo con Alarma Activa">Vehículo con Alarma Activa</option>
                    <option value="Ingreso no Autorizado">Ingreso no Autorizado</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Placa Vehicular *</label>
                <Input
                  type="text"
                  placeholder="ABC-123"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  className="font-mono font-bold text-xs uppercase h-10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cajón / Plaza *</label>
                <Input
                  type="text"
                  placeholder="A-01"
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value.toUpperCase() })}
                  className="font-mono font-bold text-xs uppercase h-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Establecimiento</label>
              <select
                value={formData.parking}
                onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Smart Park Plaza Mayor - Planta Baja">Smart Park Plaza Mayor - Planta Baja</option>
                <option value="Smart Park Plaza Mayor - Sótano 1">Smart Park Plaza Mayor - Sótano 1</option>
                <option value="Smart Park Mercado Mariscal Cáceres">Smart Park Mercado Mariscal Cáceres</option>
                <option value="Smart Park Terminal Terrestre">Smart Park Terminal Terrestre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción del Suceso *</label>
              <textarea
                rows={3}
                placeholder="Explica detalladamente lo sucedido..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                required
              />
            </div>

            {/* SECCIÓN DE EVIDENCIA */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Fotos de Evidencia</label>
                
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      photoMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📁 Subir Archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('camera')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                      photoMode === 'camera' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>📸 Tomar Foto</span>
                  </button>
                </div>
              </div>

              {photoMode === 'upload' && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                    isDragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Arrastra fotos aquí o haz clic para subir</p>
                  <p className="text-[10px] text-slate-400">JPG, PNG o WebP hasta 6MB</p>
                </div>
              )}

              {photoMode === 'camera' && (
                <div className="space-y-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-white relative overflow-hidden">
                  <div 
                    id="camera-shutter-flash" 
                    className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150 z-30" 
                  />

                  {cameraError ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-rose-400 font-bold">{cameraError}</p>
                      <Button
                        type="button"
                        onClick={startCamera}
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reintentar Acceso a Cámara</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative w-full h-56 bg-slate-900 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                          <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0" />
                          <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0" />
                          <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0" />
                          <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0" />
                          <span className="text-[10px] text-white/60 font-mono uppercase font-bold">Enfoque Automático</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center pt-1">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capturar Foto Ahora</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Fotos adjuntas ({uploadedFiles.length}):</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Listas para enviar</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group shadow-2xs">
                        <img src={f.preview} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full font-bold h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md cursor-pointer mt-2">
              Enviar Reporte de Incidencia
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Visor de Imagen Grande */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-2xl p-2 bg-slate-950 border-slate-800 rounded-3xl overflow-hidden">
            <div className="relative">
              <img src={selectedImage} alt="Evidencia" className="w-full h-auto rounded-2xl max-h-[80vh] object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center cursor-pointer"
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
