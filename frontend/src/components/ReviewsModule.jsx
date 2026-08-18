import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Star, MessageSquare, Plus, Reply, Trash2, Check, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReviewsModule = () => {
  const { role } = useAuth();
  const [reviews, setReviews] = useState([
    { id: 1, user_name: 'Carlos Mendoza', parking_id: 1, parking_name: 'Smart Park Central San Isidro', rating: 5, comment: 'Excelente servicio. La barrera ANPR me reconoció al instante sin necesidad de bajar la ventana.', response: '¡Muchas gracias Carlos! Nos alegra que disfrutes el ingreso automatizado.', date: 'Hace 2 días' },
    { id: 2, user_name: 'Ana María R.', parking_id: 2, parking_name: 'Smart Park Miraflores Kennedy', rating: 4, comment: 'Muy buen estacionamiento, limpio y techado. El plano 2D interactivo facilita elegir el cajón con anticipación.', response: null, date: 'Hace 5 días' },
    { id: 3, user_name: 'David Huamán', parking_id: 1, parking_name: 'Smart Park Plaza Mayor Ayacucho', rating: 5, comment: 'Pude pagar directamente con Yape desde la app y mi pase QR se generó al instante. 100% recomendado.', response: '¡Gracias por confiar en Smart Park Ayacucho!', date: 'Ayer' },
  ]);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/reviews')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(d => ({
            id: d.id,
            user_name: d.user_name,
            parking_id: d.parking_id,
            parking_name: 'Smart Park Establecimiento',
            rating: d.rating,
            comment: d.comment,
            response: d.response,
            date: 'Reciente'
          }));
          setReviews(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!newComment) return;

    const newObj = {
      id: Date.now(),
      user_name: 'Carlos Mendoza',
      parking_id: 1,

      parking_name: 'Smart Park Central San Isidro',
      rating: Number(newRating),
      comment: newComment,
      response: null,
      date: 'Hace un momento'
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parking_id: 1,
          rating: Number(newRating),
          comment: newComment
        })
      });
      if (res.ok) {
        const saved = await res.json();
        newObj.id = saved.id;
      }
    } catch {}

    setReviews([newObj, ...reviews]);
    setShowAddModal(false);
    setNewComment('');
    setNewRating(5);
    notify('Tu reseña ha sido publicada exitosamente.');
  };

  const handleOpenReply = (r) => {
    setSelectedReview(r);
    setReplyText(r.response || '');
    setShowReplyModal(true);
  };

  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!selectedReview || !replyText) return;

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/reviews/${selectedReview.id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: replyText })
      });
    } catch {}

    setReviews(reviews.map(r => r.id === selectedReview.id ? { ...r, response: replyText } : r));
    setShowReplyModal(false);
    notify('Respuesta del establecimiento guardada.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Deseas eliminar esta reseña?')) return;

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/reviews/${id}`, { method: 'DELETE' });
    } catch {}

    setReviews(reviews.filter(r => r.id !== id));
    notify('Reseña eliminada.');
  };

  const filtered = reviews.filter(r => {
    if (ratingFilter === 'all') return true;
    return r.rating === Number(ratingFilter);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
            <span>Reseñas, Calificaciones & Muro Social (CRUD)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Opiniones verificadas de conductores sobre la experiencia en la red de estacionamientos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="all">Todas las Calificaciones</option>
            <option value="5">Calificación: 5/5 (Excelente)</option>
            <option value="4">Calificación: 4/5 (Muy Bueno)</option>
            <option value="3">Calificación: 3/5 (Aceptable)</option>
          </select>

          <Button onClick={() => setShowAddModal(true)} className="gap-2 font-bold shadow-md bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4" />
            <span>Escribir Reseña</span>
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <Card key={r.id} className="p-6 border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{r.user_name}</h3>
                <p className="text-xs text-slate-500">{r.parking_name} • <span className="text-slate-400">{r.date}</span></p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                {(role === 'local' || role === 'platform') && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-rose-500 hover:bg-rose-50 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
              "{r.comment}"
            </p>

            {/* Respuesta del Establecimiento */}
            {r.response ? (
              <div className="bg-emerald-50/80 border border-emerald-200/70 p-3.5 rounded-2xl ml-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                    <Reply className="w-3 h-3 text-emerald-700" />
                    <span>Respuesta del Administrador del Local</span>
                  </span>
                  {(role === 'local' || role === 'platform') && (
                    <Button variant="link" size="sm" onClick={() => handleOpenReply(r)} className="p-0 h-auto text-[10px] text-emerald-700 font-bold">
                      Modificar respuesta
                    </Button>
                  )}
                </div>
                <p className="text-xs text-emerald-950 font-medium">{r.response}</p>
              </div>
            ) : (
              (role === 'local' || role === 'platform') && (
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => handleOpenReply(r)} className="text-xs font-bold gap-1 text-emerald-700 hover:bg-emerald-50">
                    <Reply className="w-3.5 h-3.5" />
                    <span>Responder como Administrador</span>
                  </Button>
                </div>
              )
            )}
          </Card>
        ))}
      </div>

      {/* Modal Escribir Reseña */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Calificar Estacionamiento</DialogTitle>
            <DialogDescription className="text-xs">
              Tu reseña ayuda a otros conductores a encontrar el mejor servicio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReview} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Puntuación de Experiencia</label>
              <div className="flex items-center justify-center space-x-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="p-1 hover:scale-125 transition"
                  >
                    <Star className={`w-8 h-8 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Comentario *</label>
              <textarea
                rows={4}
                placeholder="Describe tu experiencia (ANPR, limpieza, facilidad de pago, etc.)..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                required
              />
            </div>

            <Button type="submit" className="w-full font-black py-5 bg-amber-500 hover:bg-amber-600 text-white">
              Publicar Calificación
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Responder Reseña */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Responder a la Opinión</DialogTitle>
            <DialogDescription className="text-xs">
              Respuesta oficial del establecimiento para {selectedReview?.user_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveReply} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje de Respuesta</label>
              <textarea
                rows={4}
                placeholder="Agradece el feedback o aclara cualquier incidencia..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                required
              />
            </div>

            <Button type="submit" className="w-full font-black py-5 bg-emerald-600 hover:bg-emerald-700 text-white">
              Guardar Respuesta
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
