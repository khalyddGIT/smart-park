import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api, { getAccessToken } from '../services/api';

const NotificationContext = createContext();

const STORAGE_KEY = 'smart_park_notifications_v2';
const POLL_INTERVAL_MS = 60 * 1000;

// Formato honesto igual que ReviewsModule.jsx — sin inventar tiempo relativo
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

const getReadCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Migración: array legacy de notificaciones -> mapa id->read
      const map = {};
      parsed.forEach((n) => { if (n && n.id) map[n.id] = !!n.read; });
      return map;
    }
    if (parsed && typeof parsed === 'object') {
      const vals = Object.values(parsed);
      // mapa booleano esperado
      if (vals.length === 0 || vals.every((v) => typeof v === 'boolean')) return parsed;
      // formato inesperado: ignorar
      return {};
    }
    return {};
  } catch { return {}; }
};

const setReadCache = (map) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
};

export const NotificationProvider = ({ children }) => {
  const { role, user } = useAuth();

  // Fuente de verdad: derivada de APIs reales. Vacía hasta que el polling responda (vacío honesto).
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDerived = useCallback(async () => {
    const derived = [];
    const currentRole = role;

    // Todos: GET /incidents (RBAC servidor: user ve propias, local/platform todas). Si 401, se ignora.
    let incidents = [];
    try {
      const res = await api.get('/incidents');
      incidents = Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 401) {
        // error no-auth se silencia; otros se ignoran también para no romper polling
      }
      incidents = [];
    }

    incidents.forEach((inc) => {
      const isResolved = inc.status === 'resolved';
      const title = isResolved ? 'Incidencia resuelta' : 'Incidencia reportada';
      // Mensaje honesto con datos reales: categoría + descripción + cochera
      const desc = (inc.description || '').slice(0, 90);
      const parkingInfo = inc.parking_id ? `Cochera #${inc.parking_id}` : 'Cochera';
      derived.push({
        id: `real-incident-${inc.id}`,
        role: currentRole,
        title,
        message: `${inc.category || 'general'}: ${desc}${desc.length >= 90 ? '…' : ''} — ${parkingInfo}${isResolved && inc.resolution_note ? ` · Resp.: ${inc.resolution_note.slice(0,60)}` : ''}`,
        time: formatDate(inc.created_at),
        timestamp: inc.created_at ? Date.parse(inc.created_at) : Date.now(),
        read: false,
        type: isResolved ? 'success' : inc.status === 'reported' ? 'warning' : 'info',
        targetTab: 'incidents',
      });
    });

    // Platform: además GET /reviews (últimas 5) -> "Nueva reseña de X en Y"
    if (currentRole === 'platform') {
      try {
        const res = await api.get('/reviews');
        const reviews = Array.isArray(res.data) ? res.data : [];
        reviews.slice(0, 5).forEach((r) => {
          derived.push({
            id: `real-review-${r.id}`,
            role: 'platform',
            title: `Nueva reseña de ${r.user_name || 'usuario'}`,
            message: `"${(r.comment || '').slice(0, 70)}${(r.comment || '').length > 70 ? '…' : ''}" en Cochera #${r.parking_id} · ${r.rating}★`,
            time: formatDate(r.created_at),
            timestamp: r.created_at ? Date.parse(r.created_at) : Date.now(),
            read: false,
            type: r.rating >= 4 ? 'success' : r.rating <= 2 ? 'warning' : 'info',
            targetTab: 'reviews',
          });
        });
      } catch (e) {
        // GET /reviews es público; si falla se ignora y queda vacío honesto
      }
    }

    // Conductor: GET /reservations/my-reservations -> "Tu reserva #id vence en..."
    if (currentRole === 'user') {
      try {
        // Solo si hay JWT, el backend responde 401 sin token
        const token = getAccessToken();
        if (token) {
          const res = await api.get('/reservations/my-reservations');
          const reservations = Array.isArray(res.data) ? res.data : [];
          reservations.forEach((r) => {
            // Solo notificar reservas vigentes; canceladas/completadas no generan ruido
            if (r.status === 'cancelled' || r.status === 'completed') return;
            const end = r.end_time ? new Date(r.end_time) : null;
            const start = r.start_time ? new Date(r.start_time) : null;
            let message = '';
            let title = `Reserva ${r.code || `#${r.id}`}`;
            let type = 'info';
            if (r.status === 'active' && end) {
              const diffMs = end.getTime() - Date.now();
              const diffMin = Math.ceil(diffMs / 60000);
              if (diffMs <= 0) {
                message = `Tu reserva ${r.code} vencida — realiza check-out. Placa ${r.license_plate}`;
                type = 'alert';
              } else if (diffMin <= 120) {
                message = `Tu reserva ${r.code} vence en ${diffMin} min. Placa ${r.license_plate} · Cochera #${r.parking_id}`;
                type = 'warning';
              } else {
                message = `Reserva activa ${r.code} hasta ${formatDate(r.end_time)} · Placa ${r.license_plate}`;
                type = 'info';
              }
            } else if (r.status === 'scheduled' && start) {
              message = `Tu reserva ${r.code} programada para ${formatDate(r.start_time)} · Placa ${r.license_plate}`;
              type = 'success';
            } else {
              message = `Reserva ${r.code} · ${r.license_plate} · Cochera #${r.parking_id} · ${r.status}`;
            }
            derived.push({
              id: `real-reservation-${r.id}`,
              role: 'user',
              title,
              message,
              time: formatDate(r.end_time || r.start_time),
              timestamp: r.end_time ? Date.parse(r.end_time) : (r.start_time ? Date.parse(r.start_time) : Date.now()),
              read: false,
              type,
              targetTab: 'reservations',
            });
          });
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status !== 401) {
          // silenciar; lista queda vacía honesta
        }
      }
    }

    // Merge preservando flag read del caché localStorage (no fuente de verdad)
    const cache = getReadCache();
    const merged = derived.map((n) => ({ ...n, read: !!cache[n.id] }));
    // Orden descendente por timestamp (más reciente primero)
    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return merged;
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const run = async (isInitial) => {
      if (isInitial) setLoading(true);
      const merged = await fetchDerived();
      if (!cancelled) {
        setNotifications(merged);
        if (isInitial) setLoading(false);
      }
    };

    run(true);
    intervalId = setInterval(() => run(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchDerived, role, user?.id]);

  // Reacciona a cambios de storage externos (otro tab marca leído) — opcional honesto
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const cache = getReadCache();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: !!cache[n.id] })));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Notificaciones filtradas según el rol activo (compatibilidad API)
  const currentRoleNotifications = notifications.filter((n) => n.role === role);
  const unreadCount = currentRoleNotifications.filter((n) => !n.read).length;

  // Marcar una como leída — persiste solo el flag en caché
  const markAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const cache = getReadCache();
    cache[id] = true;
    setReadCache(cache);
  };

  // Marcar todas las del rol como leídas
  const markAllAsRead = () => {
    const ids = notifications.filter((n) => n.role === role).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => (n.role === role ? { ...n, read: true } : n)));
    const cache = getReadCache();
    ids.forEach((id) => { cache[id] = true; });
    setReadCache(cache);
  };

  // Limpiar / Eliminar una notificación (solo en memoria; reaparece si el dato real sigue en el servidor)
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Limpiar todas las notificaciones del rol (en memoria)
  const clearRoleNotifications = () => {
    setNotifications((prev) => prev.filter((n) => n.role !== role));
  };

  // Agregar nueva notificación dinámica (compatibilidad; se marca no leída)
  const addNotification = (notif) => {
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      role: notif.role || role,
      title: notif.title,
      message: notif.message,
      time: 'Ahora mismo',
      timestamp: Date.now(),
      read: false,
      type: notif.type || 'info',
      targetTab: notif.targetTab || 'dashboard',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications: currentRoleNotifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearRoleNotifications,
      addNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
