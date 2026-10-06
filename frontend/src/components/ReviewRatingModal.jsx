import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Car, 
  Loader2, 
  X,
  Sparkles,
  Check
} from 'lucide-react';
import api from '../services/api';
import { playTone } from '../utils/soundEffects';

const QUICK_TAGS = [
  'Seguridad 24/7',
  'Acceso rápido',
  'Espacios limpios',
  'Buena atención',
  'Buena iluminación',
  'Precio justo',
  'Techado',
  'Fácil salida'
];

const RATING_DESCRIPTIONS = {
  5: 'Excelente • ¡Totalmente recomendado!',
  4: 'Muy buena • Espacio seguro y cómodo',
  3: 'Aceptable • Cumplió el servicio básico',
  2: 'Regular • Tuvo inconvenientes o demoras',
  1: 'Pésima • Mala experiencia en la cochera'
};

export const ReviewRatingModal = ({
  isOpen,
  onClose,
  stay,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!stay) return null;

  const parkingId = stay.parkingId || stay.parking_id || stay.parking?.id;
  const reservationId = stay.dbId || stay.reservationId || stay.reservation_id || stay.id;
  const parkingName = stay.parkingName || stay.parking || 'Cochera Smart Park';
  const plate = stay.plate || stay.license_plate || '—';
  const code = stay.code || (stay.id ? `RSV-${stay.id}` : 'ST-0000');

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!parkingId) {
      setErrorMessage('Identificador de estacionamiento no disponible.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        parking_id: Number(parkingId),
        rating: Number(rating),
        comment: comment.trim(),
        tags: selectedTags
      };

      if (reservationId && !String(reservationId).startsWith('ST-')) {
        payload.reservation_id = Number(reservationId);
      }

      const res = await api.post('/reviews', payload);
      const createdReview = res.data;

      // Guardar registro localmente para feedback inmediato en UI
      try {
        const saved = localStorage.getItem('smart_park_rated_stays_v1');
        const map = saved ? JSON.parse(saved) : {};
        const key = stay.id || code;
        map[key] = {
          rating,
          comment: comment.trim(),
          tags: selectedTags,
          date: new Date().toLocaleDateString('es-PE'),
          review_id: createdReview?.id
        };
        localStorage.setItem('smart_park_rated_stays_v1', JSON.stringify(map));
      } catch {}

      playTone('success');
      onReviewSubmitted?.(createdReview, stay);
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 400 && detail?.includes('ya cuenta con una reseña')) {
        setErrorMessage('Esta estancia ya cuenta con una reseña previa registrada.');
      } else {
        setErrorMessage(detail || 'No se pudo registrar la reseña. Inténtalo nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentActiveRating = hoverRating || rating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl overflow-hidden animate-in fade-in-95">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg sm:text-xl font-black flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 border border-amber-200 dark:border-amber-800/80">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </span>
            <span>Calificar Estancia Verificada</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Tu opinión auténtica ayuda a otros conductores y premia el buen servicio de la cochera.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de la Estancia Real (Tarjeta Ticket) */}
        <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                {parkingName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 text-[10px] font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Estancia Verificada</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <span>Ticket: <strong className="text-slate-700 dark:text-slate-300 font-bold">{code}</strong></span>
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-700 dark:text-slate-300 font-bold">{plate}</strong>
            </span>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selector de Estrellas Interactivo */}
        <div className="py-2 text-center space-y-2">
          <div className="flex justify-center items-center gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 sm:p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                aria-label={`Calificar con ${star} estrellas`}
              >
                <Star
                  className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                    star <= currentActiveRating
                      ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                      : 'text-slate-200 dark:text-slate-700 hover:text-amber-200'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 h-5 flex items-center justify-center transition-all">
            {RATING_DESCRIPTIONS[currentActiveRating] || ''}
          </p>
        </div>

        {/* Etiquetas Rápidas (Chips) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            ¿Qué destacarías de la estancia?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                    active
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {active && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comentario Opcional */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <label className="font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Comentario u Observación <span className="font-normal text-slate-400">(Opcional)</span>
            </label>
            <span className="font-mono text-slate-400 text-[10px]">{comment.length}/500</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="¿Qué tal fue la atención del operador, la facilidad de parqueo o la seguridad?"
            rows={3}
            className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none placeholder:text-slate-400"
          />
        </div>

        {/* Nota de Transparencia y Anti-Spam */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Esta reseña quedará registrada de forma transparente e inmutable vinculada a tu estancia verificada.
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Omitir por ahora
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Publicar Reseña</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
