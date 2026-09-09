import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Car, 
  Printer, 
  Receipt, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  RotateCcw,
  Star,
  Sparkles,
  ThumbsUp,
  Check,
  MessageSquare
} from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { playTone } from '../utils/soundEffects';
import api from '../services/api';

const QUICK_TAGS = [
  'Techada',
  'Entrada rápida',
  'Buen trato',
  'Céntrica',
  'Fácil salida',
  'Iluminada'
];

export const HistoryModule = () => {
  const { reservations, establishments } = useEstablishments();
  const [searchTerm, setSearchTerm] = useState('');
  const [parkingFilter, setParkingFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Calificaciones guardadas localmente
  const [ratedStays, setRatedStays] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_park_rated_stays_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal de Calificación
  const [rateModal, setRateModal] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const notify = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Unificar historial: solo reservas completadas del usuario actual
  const allHistory = useMemo(() => {
    const fromReservations = reservations
      .filter(r => r.status === 'COMPLETED')
      .map(r => {
        const pObj = establishments.find(e => e.name === r.parking || String(e.id) === String(r.parkingId || r.parking_id));
        return {
          id: `ST-${(r.code || String(r.id)).replace('RSV-', '')}`,
          code: r.code,
          parkingId: pObj?.id || r.parkingId || r.parking_id || 1,
          date: new Date(r.startTime).toISOString().split('T')[0],
          time: `${new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(r.expiresAt || r.actualExit || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          duration: `${r.hours || 1}h 00m`,
          parking: r.parking || pObj?.name || 'Smart Park Cochera',
          slot: r.slot,
          plate: r.plate,
          cost: Number(r.cost || r.total_cost) || 10.00,
          status: 'Completado',
          invoice: `B001-00${Math.floor(1000 + Math.random() * 9000)}`,
          paymentMethod: r.paymentMethod || 'Pase Digital / Tarjeta'
        };
      });

    const unique = [];
    const seen = new Set();
    for (const item of fromReservations) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }, [reservations, establishments]);

  // Filtrado
  const filteredHistory = allHistory.filter(h => {
    const matchSearch = 
      h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.parking.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.slot && h.slot.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchParking = parkingFilter === 'ALL' || h.parking.includes(parkingFilter);

    let matchDate = true;
    if (dateFilter === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      matchDate = h.date === today;
    }

    return matchSearch && matchParking && matchDate;
  });

  // Métricas
  const totalStays = allHistory.length;
  const totalSpent = allHistory.reduce((acc, h) => acc + Number(h.cost), 0);
  const avgCost = totalStays > 0 ? totalSpent / totalStays : 0;

  // Abrir Modal de Calificación
  const handleOpenRateModal = (stay) => {
    setRateModal({
      stay,
      rating: 5
    });
    setHoverRating(5);
    setSelectedTags([]);
    setReviewComment('');
  };

  // Enviar Reseña al Backend
  const handleSubmitReview = async () => {
    if (!rateModal) return;
    setIsSubmitting(true);
    const { stay, rating } = rateModal;

    const tagsText = selectedTags.length > 0 ? ` [${selectedTags.join(', ')}]` : '';
    const fullComment = (reviewComment.trim() + tagsText).trim() || 'Excelente servicio y rapidez en el ingreso con placa.';

    try {
      await api.post('/reviews', {
        parking_id: Number(stay.parkingId),
        rating: Number(rating),
        comment: fullComment
      });

      // Guardar localmente
      const updated = {
        ...ratedStays,
        [stay.id]: {
          rating,
          comment: fullComment,
          date: new Date().toLocaleDateString('es-PE')
        }
      };
      setRatedStays(updated);
      try {
        localStorage.setItem('smart_park_rated_stays_v1', JSON.stringify(updated));
      } catch {}

      playTone('success');
      notify(`¡Gracias por calificar ${stay.parking}! Tu reseña fue publicada con éxito.`);
      setRateModal(null);
    } catch (e) {
      // Si ya existía o falla la API, guardar feedback local para la mejor UX
      const updated = {
        ...ratedStays,
        [stay.id]: {
          rating,
          comment: fullComment,
          date: new Date().toLocaleDateString('es-PE')
        }
      };
      setRatedStays(updated);
      try {
        localStorage.setItem('smart_park_rated_stays_v1', JSON.stringify(updated));
      } catch {}

      playTone('success');
      notify(`¡Gracias! Tu calificación de ${rating} estrellas fue registrada.`);
      setRateModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternar tag rápido
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Exportar CSV
  const exportCSV = () => {
    const headers = "ID,Fecha,Horario,Duracion,Estacionamiento,Plaza,Placa,Costo_PEN,Comprobante,MetodoPago,Estado\n";
    const rows = filteredHistory.map(h => 
      `${h.id},${h.date},"${h.time}",${h.duration},"${h.parking}",${h.slot},${h.plate},${h.cost.toFixed(2)},${h.invoice},"${h.paymentMethod}",${h.status}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Historial_Estancias_SmartPark_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast de Notificación */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-md animate-in slide-in-from-top">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Historial de Estancias
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tus estancias finalizadas y comprobantes.
            </p>
          </div>
        </div>

        <Button 
          onClick={exportCSV} 
          variant="outline" 
          className="gap-2 font-bold text-xs rounded-xl shadow-xs border-slate-300 dark:border-slate-700 h-10 px-4 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Exportar CSV</span>
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Estancias</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {totalStays}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Pagado</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            S/ {totalSpent.toFixed(2)}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Promedio por Estancia</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            S/ {avgCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por ID, placa, boleta o cochera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">✕</button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-start md:justify-end">
          <select
            value={parkingFilter}
            onChange={(e) => setParkingFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Todas las Cocheras</option>
            {establishments.map(e => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Todo el Historial</option>
            <option value="TODAY">Solo Hoy</option>
          </select>
        </div>
      </Card>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No se encontraron estancias</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Prueba con otros términos de búsqueda.</p>
          </Card>
        ) : (
          filteredHistory.map((h) => {
            const hasReview = ratedStays[h.id];
            return (
              <Card 
                key={h.id} 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition rounded-2xl bg-white dark:bg-[#111827]"
              >
                <div className="flex items-start sm:items-center space-x-4">
                  {/* ID Tag */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex flex-col items-center justify-center font-mono font-black text-xs shrink-0 shadow-xs border border-transparent dark:border-slate-700">
                    <span className="text-[9px] text-emerald-400 opacity-80">STAY</span>
                    <span>{h.id.replace('ST-', '')}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{h.parking}</h3>
                      <span className="bg-slate-950 text-white px-2 py-0.5 rounded-md font-mono font-black text-[11px] border border-slate-700 shadow-2xs">
                        🇵🇪 {h.plate}
                      </span>
                      {h.slot && (
                        <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/80">
                          Cajón {h.slot}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 
                        <strong className="text-slate-800 dark:text-slate-200">{h.date}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 shrink-0 text-slate-400" /> 
                        {h.time} ({h.duration})
                      </span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                        Boleta: <strong className="text-slate-800 dark:text-slate-200">{h.invoice}</strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Costo y Botones: Ver Boleta & Calificar */}
                <div className="flex items-center space-x-3 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right mr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Liquidado</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">S/ {Number(h.cost).toFixed(2)}</span>
                  </div>

                  {/* Botón de Calificación o Badge */}
                  {hasReview ? (
                    <div className="h-9 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{hasReview.rating}.0 Calificado</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleOpenRateModal(h)}
                      size="sm"
                      className="rounded-xl text-xs font-bold gap-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 h-9 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Calificar</span>
                    </Button>
                  )}

                  <Button
                    onClick={() => setSelectedReceipt(h)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 h-9"
                  >
                    <Receipt className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Ver Boleta</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* =========================================================================
          MODAL DE CALIFICACIÓN DE SERVICIO (RATE STAY)
          ========================================================================= */}
      {rateModal && (
        <Dialog open={!!rateModal} onOpenChange={() => setRateModal(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">
                Calificar tu Estancia
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                {rateModal.stay.parking} • Cajón {rateModal.stay.slot}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-3">
              {/* Selector de Estrellas Interactivo */}
              <div className="flex flex-col items-center justify-center space-y-1 py-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rateModal.rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(rateModal.rating)}
                        onClick={() => setRateModal(prev => ({ ...prev, rating: star }))}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <Star className={`w-8 h-8 ${isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {rateModal.rating === 5 && 'Excelente'}
                  {rateModal.rating === 4 && 'Muy bueno'}
                  {rateModal.rating === 3 && 'Regular'}
                  {rateModal.rating === 2 && 'Mejorable'}
                  {rateModal.rating === 1 && 'Malo'}
                </span>
              </div>

              {/* Tags Rápidos */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  ¿Qué destacarías?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comentario Abierto */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tu opinión (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Cuéntanos tu experiencia (opcional)..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setRateModal(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="flex-1 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Publicando...' : 'Publicar Reseña'}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Boleta Electrónica */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-200 dark:border-emerald-800/80">
                <Receipt className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center text-slate-900 dark:text-white">
                Boleta de Venta Electrónica
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                RUC: 20608945123 • {selectedReceipt.invoice}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs space-y-2.5 my-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cochera:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate">{selectedReceipt.parking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Estancia:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horario de Permanencia:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placa Vehicular:</span>
                <strong className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{selectedReceipt.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedReceipt.paymentMethod || 'Tarjeta / QR'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>TOTAL (INC. IGV 18%):</span>
                <span className="text-emerald-700 dark:text-emerald-400">S/ {Number(selectedReceipt.cost).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Printer className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Imprimir Boleta</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};
