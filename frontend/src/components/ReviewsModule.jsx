import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Star, MessageSquare, Plus, Reply, Trash2, Check, Filter, ShieldCheck, ThumbsUp, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Formatea la fecha ISO del backend a texto relativo/corto
const formatDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays <= 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return ''; }
};

export const ReviewsModule = () => {
  const { role, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [parkingsMap, setParkingsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [ratingFilter, setRatingFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [selectedParkingId, setSelectedParkingId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar reseñas REALES desde la API (públicas para todos los usuarios) + catálogo de cocheras
  const loadReviews = async () => {
    try {
      const [revRes, parkRes] = await Promise.all([
        api.get('/reviews'),
        api.get('/parkings'),
      ]);
      const revs = Array.isArray(revRes.data) ? revRes.data : [];
      const parks = Array.isArray(parkRes.data) ? parkRes.data : [];
      const pmap = {};
      parks.forEach(p => { pmap[p.id] = p.name; });
      setParkingsMap(pmap);
      setReviews(revs);
      if (!selectedParkingId && parks.length > 0) setSelectedParkingId(String(parks[0].id));
    } catch (e) {
      notify('No se pudieron cargar las reseñas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const parkingNameOf = (r) => r.parking_name || parkingsMap[r.parking_id] || `Cochera #${r.parking_id}`;

  // Solo conductores pueden crear nuevas reseñas -> POST /reviews (requiere JWT)
  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedParkingId) return;
    try {
      await api.post('/reviews', {
        parking_id: Number(selectedParkingId),
        rating: Number(newRating),
        comment: newComment.trim(),
      });
      setShowAddModal(false);
      setNewComment('');
      setNewRating(5);
      notify('¡Tu reseña ha sido publicada exitosamente!');
      await loadReviews(); // refresca desde el servidor: visible para TODOS los usuarios
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) notify('Debes iniciar sesión para dejar una reseña.');
      else notify('No se pudo publicar la reseña. Intenta de nuevo.');
    }
  };

  // Administrador de local o plataforma puede responder -> PUT /reviews/{id}/reply
  const handleOpenReply = (r) => {
    setSelectedReview(r);
    setReplyText(r.response || '');
    setShowReplyModal(true);
  };

  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;
    try {
      await api.put(`/reviews/${selectedReview.id}/reply`, { response: replyText.trim() });
      setShowReplyModal(false);
      notify('Respuesta oficial guardada y notificada al cliente.');
      await loadReviews();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) notify('Solo administradores pueden responder reseñas.');
      else notify('No se pudo guardar la respuesta.');
    }
  };

  // Eliminar / moderar reseña (Solo Super Admin) -> DELETE /reviews/{id}
  const handleDelete = async (id) => {
    if (!window.confirm('¿Deseas moderar y retirar esta reseña de la plataforma?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      notify('Reseña retirada por moderación.');
      await loadReviews();
    } catch (err) {
      notify('No se pudo eliminar la reseña.');
    }
  };

  const filtered = reviews.filter(r => {
    if (ratingFilter === 'all') return true;
    return r.rating === Number(ratingFilter);
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera Diferenciada por Rol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 shrink-0 text-amber-500 fill-amber-400" />
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
              variant="primary" size="md"
            >
              <Plus className="w-4 h-4" />
              <span>Dejar Reseña</span>
            </Button>
          )}

          {/* BADGE DE SUPERVISOR PARA ADMIN LOCAL / PLATAFORMA */}
          {role !== 'user' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Calificación Promedio: <strong className="font-mono text-slate-900">{avgRating} / 5.0</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Reseñas */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-3 text-sm font-bold">Cargando reseñas de la comunidad...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 border-dashed border-slate-300 text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-500">Aún no hay reseñas publicadas.</p>
          {role === 'user' && <p className="text-xs text-slate-400">¡Sé el primero en compartir tu experiencia!</p>}
        </Card>
      ) : (
        <div className="gap-4">
          {filtered.map((r) => (
            <Card key={r.id} className="p-5 sm:p-6 border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{r.user_name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{parkingNameOf(r)}</span>
                    <span>•</span>
                    <span className="text-slate-400">{formatDate(r.created_at)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-400 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/60">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 shrink-0 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
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
                      <Reply className="w-4 h-4 shrink-0 text-emerald-700" />
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
                      <Reply className="w-4 h-4 shrink-0" />
                      <span>Responder al Conductor</span>
                    </Button>
                  </div>
                )
              )}
            </Card>
          ))}
        </div>
      )}

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

            <form onSubmit={handleCreateReview} className="gap-4 my-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cochera a Calificar</label>
                <select
                  value={selectedParkingId}
                  onChange={(e) => setSelectedParkingId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {Object.entries(parkingsMap).length === 0 && (
                    <option value="">Cargando cocheras...</option>
                  )}
                  {Object.entries(parkingsMap).map(([pid, pname]) => (
                    <option key={pid} value={pid}>{pname}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Puntuación</label>
                <div className="flex items-center justify-center gap-2 py-2">
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

            <form onSubmit={handleSaveReply} className="gap-4 my-2">
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
