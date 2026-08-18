import React, { useState, useCallback } from 'react';
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
  Plus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export const IncidentsModule = () => {
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
      images: [
        'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'
      ]
    },
    {
      id: 'INC-2026-003',
      type: 'Estancia Vencida sin Liquidar',
      plate: 'DEF-456',
      slot: 'A-05',
      parking: 'Smart Park Av. Independencia',
      description: 'Vehículo superó en más de 4 horas el tiempo contratado sin retiro ni ampliación.',
      severity: 'Baja',
      status: 'Resuelto',
      date: '2026-08-16 11:20',
      images: []
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchPlate, setSearchPlate] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    type: 'Estacionamiento Fuera de Línea',
    plate: '',
    slot: '',
    parking: 'Smart Park Plaza Mayor',
    severity: 'Media',
    description: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Configuración de react-dropzone
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
      images: uploadedFiles.map(f => f.preview)
    };

    setIncidents([newInc, ...incidents]);
    setShowModal(false);
    setFormData({
      type: 'Estacionamiento Fuera de Línea',
      plate: '',
      slot: '',
      parking: 'Smart Park Plaza Mayor',
      severity: 'Media',
      description: ''
    });
    setUploadedFiles([]);
  };

  const handleResolveIncident = (id) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'Resuelto' } : inc));
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchStatus = filterStatus === 'all' || inc.status.toLowerCase() === filterStatus.toLowerCase();
    const matchSearch = inc.plate.toLowerCase().includes(searchPlate.toLowerCase()) || inc.id.toLowerCase().includes(searchPlate.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
            <span>Gestión de Incidencias & Evidencias</span>
          </h1>
          <p className="text-xs text-slate-500">
            Registro fotográfico de infracciones, bloqueos de rampa y anomalías en cajones.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} className="gap-2 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md">
          <Plus className="w-4 h-4" />
          <span>Reportar Incidencia</span>
        </Button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por placa o ID de reporte..."
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pendiente', 'En Revisión', 'Resuelto'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === st 
                  ? 'bg-slate-900 text-white shadow-sm' 
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
          <Card key={inc.id} className="p-5 border-slate-200 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-black text-slate-400">{inc.id}</span>
                <Badge variant={inc.status === 'Resuelto' ? 'success' : inc.status === 'Pendiente' ? 'destructive' : 'warning'} className="text-[10px] font-bold">
                  {inc.status}
                </Badge>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mb-1">{inc.type}</h3>
              <p className="text-xs text-slate-500 mb-3">{inc.parking}</p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs font-mono mb-3">
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
                      className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 relative group"
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {inc.status !== 'Resuelto' ? (
                <Button
                  onClick={() => handleResolveIncident(inc.id)}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar como Resuelto</span>
                </Button>
              ) : (
                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mx-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Caso Finalizado
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal para Reportar Incidencia con React-Dropzone */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Reportar Nueva Incidencia</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registra la anomalía con placa y fotos de evidencia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateIncident} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Infracción / Anomalía *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Bloqueo de Rampa PMR">Bloqueo de Rampa PMR</option>
                <option value="Estacionamiento Fuera de Línea">Estacionamiento Fuera de Línea</option>
                <option value="Estancia Vencida sin Liquidar">Estancia Vencida sin Liquidar</option>
                <option value="Vehículo con Alarma Activa">Vehículo con Alarma Activa</option>
                <option value="Daño / Rayón a Terceros">Daño / Rayón a Terceros</option>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Cajón Afectado *</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sede *</label>
                <select
                  value={formData.parking}
                  onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Smart Park Plaza Mayor">Smart Park Plaza Mayor</option>
                  <option value="Smart Park Jr. 28 de Julio">Smart Park Jr. 28 de Julio</option>
                  <option value="Smart Park Av. Independencia">Smart Park Av. Independencia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nivel de Severidad</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta (Urgente)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción de los Hechos</label>
              <textarea
                rows={2}
                placeholder="Detalla la situación observada..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Zona Dropzone para Carga de Evidencias */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fotos de Evidencia (Arrastra o Selecciona)</label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                  isDragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                <p className="text-xs font-bold text-slate-700">Arrastra fotos aquí o haz clic para buscar</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Formatos JPG, PNG, WEBP hasta 5MB</p>
              </div>

              {/* Previsualización de Fotos */}
              {uploadedFiles.length > 0 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 flex-shrink-0">
                      <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl shadow-md">
              Guardar Reporte de Incidencia
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Lightbox para ver Imagen en Grande */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-4 bg-slate-950 text-white border-slate-800">
            <img src={selectedImage} alt="Evidencia en Grande" className="w-full max-h-[75vh] object-contain rounded-2xl" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
