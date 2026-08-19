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
  Smartphone
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useAuth } from '../context/AuthContext';

export const IncidentsModule = () => {
  const { role, user } = useAuth();

  const [incidents, setIncidents] = useState([
    {
      id: 'INC-2026-001',
      type: 'Bloqueo de Rampa PMR',
      plate: 'XYZ-789',
      slot: 'A-01 (PMR)',
      parking: 'Smart Park Plaza Mayor',
      description: 'Vehículo sedán estacionado bloqueando la rampa peatonal de acceso inclusivo.',
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
      parking: 'Smart Park Jr. 28 de Julio',
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
      parking: 'Smart Park Av. Independencia',
      description: 'Conductor reportó discrepancia de 15 minutos en el cálculo de salida.',
      severity: 'Baja',
      status: 'Resuelto',
      date: '2026-08-16 11:20',
      reporter: 'Carlos Mendoza (Conductor)',
      images: []
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchPlate, setSearchPlate] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    type: role === 'user' ? 'Cajón Ocupado Indebidamente' : 'Estacionamiento Fuera de Línea',
    plate: '',
    slot: '',
    parking: 'Smart Park Plaza Mayor',
    severity: 'Media',
    description: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // =========================================================================
  // ESTADOS Y REFERENCIAS PARA LA CÁMARA / TOMAR FOTO EN VIVO
  // =========================================================================
  const [photoMode, setPhotoMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Iniciar la cámara
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
      console.error('Error al abrir la cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
      setIsCameraActive(false);
    }
  };

  // Detener la cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capturar foto desde el stream de video
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

    // Efecto de feedback auditivo/visual sutil
    const shutter = document.getElementById('camera-shutter-flash');
    if (shutter) {
      shutter.style.opacity = '1';
      setTimeout(() => {
        shutter.style.opacity = '0';
      }, 150);
    }
  };

  // Apagar cámara al cerrar modal o cambiar modo
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

  // React Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    const mapped = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...mapped]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024
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
      parking: 'Smart Park Plaza Mayor',
      severity: 'Media',
      description: ''
    });
    setUploadedFiles([]);
  };

  const handleResolveIncident = (id) => {
    setIncidents(incidents.map(inc => {
      if (inc.id === id) {
        return { ...inc, status: 'Resuelto' };
      }
      return inc;
    }));
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchPlate = !searchPlate || inc.plate.toLowerCase().includes(searchPlate.toLowerCase()) || inc.id.toLowerCase().includes(searchPlate.toLowerCase());
    return matchStatus && matchPlate;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Diferenciado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {role === 'user' && 'Reportar Incidencias & Asistencia'}
              {role === 'local' && 'Gestión de Incidencias en Garita'}
              {role === 'platform' && 'Control Central de Incidencias de la Red'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'user' && 'Notifica cualquier anomalía en tu plaza, dificultad con la barrera o cobro indebido.'}
            {role === 'local' && 'Monitorea y resuelve reportes de conductores e infracciones vehiculares en tu local.'}
            {role === 'platform' && 'Supervisión y resolución de incidencias en toda la red de estacionamientos.'}
          </p>
        </div>

        <Button
          onClick={() => {
            setShowModal(true);
            setPhotoMode('upload');
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 rounded-2xl shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{role === 'user' ? 'Reportar Problema' : 'Registrar Infracción'}</span>
        </Button>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa o código INC..."
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            className="pl-10 h-10 text-xs bg-white border-slate-200 shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pendiente', 'En Revisión', 'Resuelto'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === st 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Todos los Reportes' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIncidents.map((inc) => (
          <Card key={inc.id} className="p-5 border-slate-200 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition rounded-3xl">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-black text-slate-400">{inc.id}</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                  inc.status === 'Resuelto' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : inc.status === 'Pendiente' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  ● {inc.status}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mb-1">{inc.type}</h3>
              <p className="text-xs text-slate-500 mb-3">{inc.parking}</p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs font-mono mb-3">
                <p>Placa: <span className="font-black text-slate-900">{inc.plate}</span></p>
                <p>Cajón: <span className="font-bold text-emerald-700">{inc.slot}</span></p>
                <p>Severidad: <span className={`font-bold ${inc.severity === 'Alta' ? 'text-rose-600' : inc.severity === 'Media' ? 'text-amber-600' : 'text-blue-600'}`}>{inc.severity}</span></p>
                <p className="text-[10px] text-slate-400">{inc.date}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">{inc.description}</p>

              {/* Miniaturas de Fotos Adjuntas */}
              {inc.images && inc.images.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                  {inc.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 relative group cursor-pointer"
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
                    variant="outline"
                    className="w-full text-xs font-bold gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-300 rounded-xl cursor-pointer"
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

      {/* =========================================================================
          MODAL PARA REPORTAR INCIDENCIA CON OPCIÓN DE CÁMARA O SUBIR FOTO
          ========================================================================= */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) stopCamera();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>{role === 'user' ? 'Reportar Problema con mi Estancia' : 'Registrar Infracción Operativa'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {role === 'user' 
                ? 'Detalla el problema ocurrido y adjunta fotos tomadas al instante con tu cámara o galería.' 
                : 'Registra la anomalía con placa y fotos de evidencia para la bitácora.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateIncident} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Anomalía / Reclamo *</label>
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
                    <option value="Bloqueo de Rampa PMR">Bloqueo de Rampa PMR</option>
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
                  className="font-mono font-bold text-xs uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cajón / Zona *</label>
                <Input
                  type="text"
                  placeholder="A-01"
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value.toUpperCase() })}
                  className="font-mono font-bold text-xs uppercase"
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
                <option value="Smart Park Plaza Mayor">Smart Park Plaza Mayor</option>
                <option value="Smart Park Jr. 28 de Julio">Smart Park Jr. 28 de Julio</option>
                <option value="Smart Park Av. Independencia">Smart Park Av. Independencia</option>
                <option value="Smart Park Mercado Mariscal Cáceres">Smart Park Mercado Mariscal Cáceres</option>
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

            {/* SECCIÓN DE EVIDENCIA: SUBIR O TOMAR FOTO DIRECTA */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Fotos de Evidencia</label>
                
                {/* Selector de Modo: Subir vs Cámara */}
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

              {/* MODO 1: SUBIR DESDE ARCHIVO */}
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
                  <p className="text-[10px] text-slate-400">JPG, PNG o WebP hasta 5MB</p>
                </div>
              )}

              {/* MODO 2: TOMAR FOTO CON LA CÁMARA / WEBCAM EN VIVO */}
              {photoMode === 'camera' && (
                <div className="space-y-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-white relative overflow-hidden">
                  
                  {/* Flash visual de obturador */}
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
                      {/* Visor de Video en Vivo */}
                      <div className="relative w-full h-56 bg-slate-900 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Retícula de Enfoque */}
                        <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                          <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0" />
                          <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0" />
                          <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0" />
                          <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0" />
                          <span className="text-[10px] text-white/60 font-mono tracking-wider uppercase font-bold">Enfoque Automático</span>
                        </div>
                      </div>

                      {/* Botón Obturador */}
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

              {/* Lista de Fotos de Evidencia Adjuntas (Subidas o Capturadas) */}
              {uploadedFiles.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Fotos adjuntas ({uploadedFiles.length}):</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Listas para enviar</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 group shadow-2xs">
                        <img src={f.preview} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          title="Eliminar foto"
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                        >
                          ×
                        </button>
                        {f.isCameraCapture && (
                          <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-[8px] text-white font-bold text-center py-0.2">
                            Cámara
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full font-black py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl cursor-pointer shadow-md mt-2">
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
              <img src={selectedImage} alt="Evidencia en grande" className="w-full h-auto rounded-2xl max-h-[80vh] object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center text-white cursor-pointer"
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
