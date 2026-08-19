import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Star, MessageSquare, Plus, Reply, Trash2, Check, Filter, ShieldCheck, ThumbsUp, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const REVIEWS_STORAGE_KEY = 'smart_park_reviews_v2';

const INITIAL_REVIEWS = [
  { id: 1, user_name: 'Carlos Mendoza', parking_id: 'EST-01', parking_name: 'Smart Park Plaza Mayor - Planta Baja', rating: 5, comment: 'Excelente servicio. La barrera ANPR me reconoció al instante sin necesidad de bajar la ventana.', response: '¡Muchas gracias Carlos! Nos alegra que disfrutes el ingreso automatizado.', date: 'Hace 2 días' },
  { id: 2, user_name: 'Ana María R.', parking_id: 'EST-02', parking_name: 'Smart Park Plaza Mayor - Sótano 1', rating: 4, comment: 'Muy buen estacionamiento, limpio y techado. El plano interactivo facilita elegir el cajón con anticipación.', response: null, date: 'Hace 5 días' },
  { id: 3, user_name: 'David Huamán', parking_id: 'EST-01', parking_name: 'Smart Park Plaza Mayor - Planta Baja', rating: 5, comment: 'Pude pagar directamente con Yape desde la app y mi pase QR se generó al instante. 100% recomendado.', response: '¡Gracias por confiar en Smart Park Ayacucho!', date: 'Ayer' },
  { id: 4, user_name: 'Jorge Quispe', parking_id: 'EST-03', parking_name: 'Smart Park Mercado Mariscal Cáceres', rating: 5, comment: 'Céntrico y seguro. Las cámaras en garita dan mucha tranquilidad.', response: 'Apreciamos tu preferencia Jorge.', date: 'Hace 3 días' }
];

export const ReviewsModule = () => {
  const { role, user } = useAuth();
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_REVIEWS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    } catch (e) {}
  }, [reviews]);

  const [ratingFilter, setRatingFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [selectedParkingForReview, setSelectedParkingForReview] = useState('Smart Park Plaza Mayor - Planta Baja');
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Solo conductores pueden crear nuevas reseñas
  const handleCreateReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newObj = {
      id: Date.now(),
      user_name: user?.name || 'Conductor Registrado',
      parking_id: 'EST-01',
      parking_name: selectedParkingForReview,
      rating: Number(newRating),
      comment: newComment.trim(),
      response: null,
      date: 'Hace un momento'
    };

    setReviews([newObj, ...reviews]);
    setShowAddModal(false);
    setNewComment('');
    setNewRating(5);
    notify('¡Tu reseña ha sido publicada exitosamente!');
  };

  // Administrador de local o plataforma puede responder
  const handleOpenReply = (r) => {
    setSelectedReview(r);
    setReplyText(r.response || '');
    setShowReplyModal(true);
  };

  const handleSaveReply = (e) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;

    setReviews(reviews.map(r => r.id === selectedReview.id ? { ...r, response: replyText.trim() } : r));
    setShowReplyModal(false);
    notify('Respuesta oficial guardada y notificada al cliente.');
  };

  // Eliminar / moderar reseña (Solo Super Admin)
  const handleDelete = (id) => {
    if (!window.confirm('¿Deseas moderar y retirar esta reseña de la plataforma?')) return;
    setReviews(reviews.filter(r => r.id !== id));
    notify('Reseña retirada por moderación.');
  };

  const filtered = reviews.filter(r => {
    if (ratingFilter === 'all') return true;
    return r.rating === Number(ratingFilter);
  });

  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera Diferenciada por Rol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {role === 'user' && 'Reseñas & Opiniones de la Comunidad'}
              {role === 'local' && 'Atención y Respuesta a Reseñas del Local'}
              {role === 'platform' && 'Supervisión Global de Calidad & Reseñas'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'user' && 'Comparte tu experiencia como conductor o revisa las valoraciones de otros usuarios.'}
            {role === 'local' && 'Monitorea el nivel de satisfacción de tus clientes y responde directamente a sus comentarios.'}
            {role === 'platform' && 'Panel de control central para la calidad del servicio en todas las cocheras de la red.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro por Calificación */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none"
          >
            <option value="all">Todas las Puntuaciones</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
            <option value="4">⭐⭐⭐⭐ (4 Estrellas)</option>
            <option value="3">⭐⭐⭐ (3 Estrellas)</option>
          </select>

          {/* BOTÓN SOLO PARA CONDUCTORES (ROLE === 'USER') */}
          {role === 'user' && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="gap-2 font-bold shadow-md bg-amber-500 hover:bg-amber-600 text-white rounded-2xl"
            >
              <Plus className="w-4 h-4" />
              <span>Dejar Reseña</span>
            </Button>
          )}

          {/* BADGE DE SUPERVISOR PARA ADMIN LOCAL / PLATAFORMA */}
          {role !== 'user' && (
            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Calificación Promedio: <strong className="font-mono text-slate-900">{avgRating} / 5.0</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Reseñas */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <Card key={r.id} className="p-5 sm:p-6 border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{r.user_name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{r.parking_name}</span>
                  <span>•</span>
                  <span className="text-slate-400">{r.date}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-0.5 text-amber-400 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/60">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-xs font-mono font-black text-amber-800 ml-1">{r.rating}.0</span>
                </div>

                {/* BOTÓN ELIMINAR SOLO PARA SUPER ADMIN */}
                {role === 'platform' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(r.id)} 
                    title="Moderar / Eliminar Reseña"
                    className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              "{r.comment}"
            </p>

            {/* Respuesta del Establecimiento */}
            {r.response ? (
              <div className="bg-emerald-50/90 border border-emerald-200/80 p-3.5 rounded-2xl ml-3 sm:ml-6 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Respuesta Oficial de la Cochera</span>
                  </span>
                  {(role === 'local' || role === 'platform') && (
                    <button 
                      onClick={() => handleOpenReply(r)} 
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Editar Respuesta
                    </button>
                  )}
                </div>
                <p className="text-xs text-emerald-950 font-medium">{r.response}</p>
              </div>
            ) : (
              (role === 'local' || role === 'platform') && (
                <div className="flex justify-end pt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenReply(r)} 
                    className="text-xs font-bold gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Responder al Conductor</span>
                  </Button>
                </div>
              )
            )}
          </Card>
        ))}
      </div>

      {/* Modal Escribir Reseña (SOLO PARA CONDUCTOR) */}
      {role === 'user' && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Calificar Estacionamiento</DialogTitle>
              <DialogDescription className="text-xs">
                Tu opinión ayuda a mantener altos estándares en la red Smart Park.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateReview} className="space-y-4 my-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cochera a Calificar</label>
                <select
                  value={selectedParkingForReview}
                  onChange={(e) => setSelectedParkingForReview(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Smart Park Plaza Mayor - Planta Baja">Smart Park Plaza Mayor - Planta Baja</option>
                  <option value="Smart Park Plaza Mayor - Sótano 1">Smart Park Plaza Mayor - Sótano 1</option>
                  <option value="Smart Park Mercado Mariscal Cáceres">Smart Park Mercado Mariscal Cáceres</option>
                  <option value="Smart Park Terminal Terrestre">Smart Park Terminal Terrestre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Puntuación</label>
                <div className="flex items-center justify-center space-x-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-125 transition cursor-pointer"
                    >
                      <Star className={`w-8 h-8 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tu Comentario *</label>
                <textarea
                  rows={4}
                  placeholder="Describe tu experiencia (rapidez de garita, limpieza, atención)..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full font-black py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl">
                Publicar Reseña
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Responder Reseña (SOLO PARA ADMIN LOCAL / PLATAFORMA) */}
      {(role === 'local' || role === 'platform') && (
        <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Respuesta Oficial</DialogTitle>
              <DialogDescription className="text-xs">
                Respuesta pública para la reseña de <strong>{selectedReview?.user_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveReply} className="space-y-4 my-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje Institucional</label>
                <textarea
                  rows={4}
                  placeholder="Escribe una respuesta cordial o aclara la consulta del usuario..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full font-black py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl">
                Publicar Respuesta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
