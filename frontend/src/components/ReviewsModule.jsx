import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Star,
  MessageSquare,
  Plus,
  Reply,
  Trash2,
  Check,
  Filter,
  ShieldCheck,
  Building2,
  Loader2,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  MessageCircle,
  HelpCircle,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import api from '../services/api';

// Formatea la fecha ISO a formato legible
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays <= 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return '';
  }
};

export const ReviewsModule = () => {
  const { role, user } = useAuth();
  const { myEstablishments } = useEstablishments();
  const isAdmin = role === 'local' || role === 'platform';

  const [reviews, setReviews] = useState([]);
  const [parkingsMap, setParkingsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [ratingFilter, setRatingFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'visible' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [parkingFilter, setParkingFilter] = useState('all');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Estados de formulario
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [selectedParkingId, setSelectedParkingId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar reseñas y cocheras desde el backend
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
      if (!selectedParkingId && parks.length > 0) {
        setSelectedParkingId(String(parks[0].id));
      }
    } catch (e) {
      notify('No se pudieron cargar las reseñas del servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const parkingNameOf = (r) => r.parking_name || parkingsMap[r.parking_id] || `Cochera #${r.parking_id}`;

  // Filtrar reseñas asignadas si es admin local
  const myParkingIds = useMemo(() => {
    return new Set((myEstablishments || []).map(e => String(e.id)));
  }, [myEstablishments]);

  const scopedReviews = useMemo(() => {
    if (role === 'local') {
      return reviews.filter(r => myParkingIds.has(String(r.parking_id)));
    }
    return reviews;
  }, [reviews, role, myParkingIds]);

  // Manejar creación de reseña (Conductor)
  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedParkingId) return;
    setSubmittingReview(true);
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
      await loadReviews();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) notify('Debes iniciar sesión para dejar una reseña.', 'error');
      else notify('No se pudo publicar la reseña. Intenta de nuevo.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Abrir modal de respuesta (Admin)
  const handleOpenReply = (r) => {
    setSelectedReview(r);
    setReplyText(r.response || '');
    setShowReplyModal(true);
  };

  // Guardar respuesta oficial
  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await api.put(`/reviews/${selectedReview.id}/reply`, { response: replyText.trim() });
      setShowReplyModal(false);
      // Actualizar estado local inmediatamente
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? { ...r, response: replyText.trim() } : r));
      notify('Respuesta institucional guardada con éxito.');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) notify('No tienes permisos para responder en esta cochera.', 'error');
      else notify('No se pudo guardar la respuesta.', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Desactivar / Ocultar o Activar reseña (Admin local o SuperAdmin)
  const handleToggleVisibility = async (review) => {
    const willHide = !review.is_hidden;
    setTogglingVisibilityId(review.id);
    try {
      await api.put(`/reviews/${review.id}/visibility`, { is_hidden: willHide });
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_hidden: willHide } : r));
      notify(
        willHide
          ? 'Reseña desactivada y oculta para el público y conductores.'
          : 'Reseña reactivada y visible públicamente.'
      );
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) notify('No tienes permisos para moderar esta reseña.', 'error');
      else notify('Error al actualizar visibilidad de la reseña.', 'error');
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Eliminar reseña (Solo SuperAdmin)
  const handleDelete = async (id) => {
    if (!window.confirm('¿Deseas eliminar permanentemente esta reseña de la plataforma?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      notify('Reseña eliminada del sistema.');
    } catch (err) {
      notify('No se pudo eliminar la reseña.', 'error');
    }
  };

  // Filtrado compuesto
  const filteredReviews = useMemo(() => {
    return scopedReviews.filter(r => {
      // Filtro de calificación
      if (ratingFilter !== 'all' && Number(r.rating) !== Number(ratingFilter)) {
        return false;
      }
      // Filtro de visibilidad (solo admins ven ocultas)
      if (isAdmin && visibilityFilter !== 'all') {
        if (visibilityFilter === 'visible' && r.is_hidden) return false;
        if (visibilityFilter === 'hidden' && !r.is_hidden) return false;
      }
      // Filtro por cochera
      if (parkingFilter !== 'all' && String(r.parking_id) !== parkingFilter) {
        return false;
      }
      // Buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = (r.user_name || '').toLowerCase().includes(q);
        const matchesComment = (r.comment || '').toLowerCase().includes(q);
        const matchesParking = parkingNameOf(r).toLowerCase().includes(q);
        const matchesResponse = (r.response || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesComment && !matchesParking && !matchesResponse) {
          return false;
        }
      }
      return true;
    });
  }, [scopedReviews, ratingFilter, visibilityFilter, parkingFilter, searchQuery, isAdmin, parkingsMap]);

  // Métricas KPI
  const totalCount = scopedReviews.length;
  const visibleCount = scopedReviews.filter(r => !r.is_hidden).length;
  const hiddenCount = scopedReviews.filter(r => r.is_hidden).length;
  const repliedCount = scopedReviews.filter(r => !!r.response).length;
  const responseRate = totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 0;
  const avgRating = totalCount > 0
    ? (scopedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalCount).toFixed(1)
    : '—';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-300 border ${
          toast.type === 'error' ? 'bg-rose-900 border-rose-800' : 'bg-slate-900 border-slate-800'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          ) : (
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/15 text-amber-500 dark:text-amber-400 rounded-2xl border border-amber-500/30 shadow-xs shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500 shrink-0" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {role === 'user' && 'Reseñas & Experiencias de Usuarios'}
              {role === 'local' && 'Gestión y Moderación de Reseñas'}
              {role === 'platform' && 'Supervisión Global de Calidad & Reseñas'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {role === 'user' && 'Consulta valoraciones de otros conductores y califica tus estancias en la red.'}
              {role === 'local' && 'Responde a clientes y modera la visibilidad de opiniones en tus sedes.'}
              {role === 'platform' && 'Monitoreo de reputación y moderación de contenido en todas las cocheras.'}
            </p>
          </div>
        </div>

        {/* Acción primaria para conductores */}
        {role === 'user' && (
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            size="md"
            className="gap-2 font-bold cursor-pointer"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>Dejar Reseña</span>
          </Button>
        )}
      </div>

      {/* Tarjetas KPI para métricas de reputación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI: Calificación Promedio */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Puntuación Media</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">{avgRating}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">sobre 5.0 estrellas</span>
          </div>
        </div>

        {/* KPI: Total de Opiniones */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Reseñas</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <MessageSquare className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">{totalCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Registradas</span>
          </div>
        </div>

        {/* KPI: Tasa de Respuesta */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tasa de Respuesta</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Reply className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{responseRate}%</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
              {repliedCount} atendidas
            </span>
          </div>
        </div>

        {/* KPI: Moderación / Ocultas */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAdmin ? 'Ocultas / Desactivadas' : 'Opiniones Públicas'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              {isAdmin ? <EyeOff className="w-4 h-4 stroke-[2.2]" /> : <ShieldCheck className="w-4 h-4 stroke-[2.2]" />}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
              {isAdmin ? hiddenCount : visibleCount}
            </span>
            <span className="text-xs text-purple-700 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800/80">
              {isAdmin ? `${visibleCount} públicas` : 'Verificadas'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827] shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 shrink-0 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por usuario, comentario o sede..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro por Cochera (Admins con múltiples sedes) */}
        {isAdmin && Object.keys(parkingsMap).length > 1 && (
          <select
            value={parkingFilter}
            onChange={(e) => setParkingFilter(e.target.value)}
            className="h-10 w-full lg:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas las Sedes</option>
            {Object.entries(parkingsMap).map(([pid, pname]) => (
              <option key={pid} value={pid}>{pname}</option>
            ))}
          </select>
        )}

        {/* Filtro por Estrellas */}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="h-10 w-full lg:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="all">Todas las Puntuaciones</option>
          <option value="5">5 Estrellas (Excelente)</option>
          <option value="4">4 Estrellas (Bueno)</option>
          <option value="3">3 Estrellas (Regular)</option>
          <option value="2">2 Estrellas (Malo)</option>
          <option value="1">1 Estrella (Pésimo)</option>
        </select>

        {/* Filtro de Visibilidad (Solo para administradores) */}
        {isAdmin && (
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto">
            {[
              { id: 'all', label: 'Todas', count: totalCount },
              { id: 'visible', label: 'Públicas', count: visibleCount, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20' },
              { id: 'hidden', label: 'Ocultas', count: hiddenCount, color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVisibilityFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  visibilityFilter === tab.id
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  visibilityFilter === tab.id ? 'bg-white/20 text-white' : tab.color || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Reseñas */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <span className="text-sm font-bold">Cargando reseñas...</span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-12 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          {searchQuery || ratingFilter !== 'all' || visibilityFilter !== 'all' ? (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ninguna reseña coincide con los filtros aplicados</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Prueba limpiando la búsqueda o cambiando el filtro de estrellas o visibilidad.</p>
            </>
          ) : role === 'user' ? (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Aún no hay reseñas registradas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Sé el primero en compartir tu experiencia en nuestras cocheras afiliadas.</p>
            </>
          ) : (
            <>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No hay reseñas para mostrar</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Las valoraciones de los conductores que utilicen tus sedes aparecerán aquí.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((r) => {
            const isHidden = !!r.is_hidden;
            const isToggling = togglingVisibilityId === r.id;

            return (
              <Card
                key={r.id}
                className={`p-5 sm:p-6 border transition rounded-3xl shadow-xs space-y-4 ${
                  isHidden
                    ? 'border-amber-300/80 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827] hover:shadow-md'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                      {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {r.user_name || 'Conductor Anónimo'}
                        </h3>

                        {/* Badges de Visibilidad para Administradores */}
                        {isAdmin && (
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                            isHidden
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700/70'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/70'
                          }`}>
                            {isHidden ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Oculta al Público</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Pública</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">{parkingNameOf(r)}</span>
                        <span>•</span>
                        <span className="text-slate-400 dark:text-slate-500">{formatDate(r.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Puntuación de Estrellas y Acciones */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl border border-amber-200/70 dark:border-amber-800/70">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 shrink-0 ${
                            i < r.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-mono font-black text-amber-900 dark:text-amber-300 ml-1">
                        {r.rating}.0
                      </span>
                    </div>

                    {/* BOTÓN OCULTAR / DESACTIVAR (ADMIN LOCAL & SUPERADMIN) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleToggleVisibility(r)}
                        disabled={isToggling}
                        title={isHidden ? 'Hacer visible al público nuevamente' : 'Desactivar y ocultar para conductores'}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                          isHidden
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                        ) : isHidden ? (
                          <>
                            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="hidden sm:inline">Reactivar</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="hidden sm:inline">Desactivar</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* BOTÓN ELIMINAR (SUPERADMIN) */}
                    {role === 'platform' && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        title="Eliminar permanentemente"
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comentario del Usuario */}
                <div className="bg-slate-50/90 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    "{r.comment}"
                  </p>
                  {isHidden && isAdmin && (
                    <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Esta reseña se encuentra oculta para los conductores. Solo administradores pueden verla en este panel.</span>
                    </div>
                  )}
                </div>

                {/* Respuesta Oficial Institucional */}
                {r.response ? (
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 p-4 rounded-2xl ml-2 sm:ml-6 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <Reply className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        <span>Respuesta Oficial del Establecimiento</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenReply(r)}
                          className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold hover:underline cursor-pointer"
                        >
                          Editar Respuesta
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
                      {r.response}
                    </p>
                  </div>
                ) : (
                  isAdmin && (
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReply(r)}
                        className="text-xs font-bold gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl"
                      >
                        <Reply className="w-4 h-4 shrink-0" />
                        <span>Responder al Conductor</span>
                      </Button>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Escribir Reseña (Conductor) */}
      {role === 'user' && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                <span>Calificar Cochera</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Tu opinión sincera contribuye a elevar el estándar de servicio en la red.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateReview} className="space-y-4 my-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estacionamiento a Calificar *
                </label>
                <select
                  value={selectedParkingId}
                  onChange={(e) => setSelectedParkingId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                >
                  {Object.entries(parkingsMap).length === 0 && (
                    <option value="">Cargando cocheras disponibles...</option>
                  )}
                  {Object.entries(parkingsMap).map(([pid, pname]) => (
                    <option key={pid} value={pid}>{pname}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Calificación *
                </label>
                <div className="flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-125 transition cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= newRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono font-black text-sm text-slate-700 dark:text-slate-200">
                    {newRating}.0
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tu Experiencia y Comentarios *
                </label>
                <textarea
                  rows={4}
                  placeholder="Detalla qué tal fue el acceso, seguridad, rapidez en garita y limpieza..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submittingReview}
                className="w-full font-black py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl gap-2 cursor-pointer"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-white text-white" />
                    <span>Publicar Reseña</span>
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Responder Reseña (Admin Local & SuperAdmin) */}
      {isAdmin && (
        <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Reply className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Respuesta Institucional</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Respondiendo a <strong>{selectedReview?.user_name}</strong> para la sede{' '}
                <strong>{selectedReview ? parkingNameOf(selectedReview) : ''}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveReply} className="space-y-4 my-2">
              <div className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                "{selectedReview?.comment}"
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mensaje Oficial al Conductor *
                </label>
                <textarea
                  rows={4}
                  placeholder="Escribe una respuesta cordial, aclara cualquier duda o detalla las medidas correctivas..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submittingReply}
                className="w-full font-black py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-2xl gap-2 cursor-pointer"
              >
                {submittingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando respuesta...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar Respuesta</span>
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
