import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const STORAGE_KEY = 'smart_park_notifications_v2';

const INITIAL_NOTIFICATIONS = [
  // NOTIFICACIONES ROL CONDUCTOR (USER)
  {
    id: 'NOTIF-U1',
    role: 'user',
    title: 'Reserva Confirmada',
    message: 'Tu plaza A-01 en Smart Park Plaza Mayor está reservada. Pase QR activo.',
    time: 'Hace 5 min',
    timestamp: Date.now() - 5 * 60 * 1000,
    read: false,
    type: 'success', // 'info' | 'success' | 'warning' | 'alert'
    targetTab: 'reservations'
  },
  {
    id: 'NOTIF-U2',
    role: 'user',
    title: 'Detección ANPR en Garita',
    message: 'Vehículo placa ABC-123 detectado. Barrera de acceso abierta automáticamente.',
    time: 'Hace 25 min',
    timestamp: Date.now() - 25 * 60 * 1000,
    read: false,
    type: 'info',
    targetTab: 'vehicles'
  },
  {
    id: 'NOTIF-U3',
    role: 'user',
    title: 'Comprobante Electrónico Emitido',
    message: 'Tu boleta de venta B001-004291 por S/ 17.00 ya está disponible para descarga.',
    time: 'Ayer',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    read: true,
    type: 'success',
    targetTab: 'history'
  },

  // NOTIFICACIONES ROL ADMIN LOCAL (LOCAL)
  {
    id: 'NOTIF-L1',
    role: 'local',
    title: 'Nuevo Ingreso Vehicular',
    message: 'Vehículo placa AYC-501 ingresó a la plaza B-01. Registro automático completado.',
    time: 'Hace 3 min',
    timestamp: Date.now() - 3 * 60 * 1000,
    read: false,
    type: 'info',
    targetTab: 'reservations'
  },
  {
    id: 'NOTIF-L2',
    role: 'local',
    title: 'Incidencia Operativa Reportada',
    message: 'Reporte de vehículo fuera de línea en plaza B-04. Pendiente de revisión.',
    time: 'Hace 18 min',
    timestamp: Date.now() - 18 * 60 * 1000,
    read: false,
    type: 'warning',
    targetTab: 'incidents'
  },
  {
    id: 'NOTIF-L3',
    role: 'local',
    title: 'Alerta de Alta Ocupación',
    message: 'Cochera al 85% de capacidad total. Quedan 3 plazas disponibles en planta baja.',
    time: 'Hace 1 hora',
    timestamp: Date.now() - 60 * 60 * 1000,
    read: false,
    type: 'warning',
    targetTab: 'dashboard'
  },
  {
    id: 'NOTIF-L4',
    role: 'local',
    title: 'Salida Registrada & Plaza Liberada',
    message: 'Placa W1P-404 completó Check-Out. Cajón A-04 disponible inmediatamente.',
    time: 'Hace 2 horas',
    timestamp: Date.now() - 120 * 60 * 1000,
    read: true,
    type: 'success',
    targetTab: 'dashboard'
  },

  // NOTIFICACIONES ROL SUPER ADMIN (PLATFORM)
  {
    id: 'NOTIF-P1',
    role: 'platform',
    title: 'Nueva Solicitud de Afiliación',
    message: 'La cochera "Cochera San Blas Ayacucho" ha solicitado afiliarse a la red.',
    time: 'Hace 12 min',
    timestamp: Date.now() - 12 * 60 * 1000,
    read: false,
    type: 'info',
    targetTab: 'affiliates'
  },
  {
    id: 'NOTIF-P2',
    role: 'platform',
    title: 'Liquidación Financiera Diaria',
    message: 'Cierre de transacciones consolidado: S/ 1,480.00 procesados en la red hoy.',
    time: 'Hace 45 min',
    timestamp: Date.now() - 45 * 60 * 1000,
    read: false,
    type: 'success',
    targetTab: 'finances'
  },
  {
    id: 'NOTIF-P3',
    role: 'platform',
    title: 'Monitoreo de Servidores & Telemetría',
    message: 'Servidor WebSocket y API FastAPI operando con 100% de disponibilidad.',
    time: 'Hace 3 horas',
    timestamp: Date.now() - 180 * 60 * 1000,
    read: true,
    type: 'info',
    targetTab: 'resiliency'
  },
  {
    id: 'NOTIF-P4',
    role: 'platform',
    title: 'Auditoría de Seguridad',
    message: 'Se actualizó la tarifa por hora en el establecimiento Plaza Mayor.',
    time: 'Ayer',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    read: true,
    type: 'warning',
    targetTab: 'audit'
  }
];

export const NotificationProvider = ({ children }) => {
  const { role } = useAuth();
  
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Notificaciones filtradas según el rol activo
  const currentRoleNotifications = notifications.filter(n => n.role === role);
  const unreadCount = currentRoleNotifications.filter(n => !n.read).length;

  // Marcar una como leída
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Marcar todas las del rol como leídas
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => n.role === role ? { ...n, read: true } : n));
  };

  // Limpiar / Eliminar una notificación
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Limpiar todas las notificaciones del rol
  const clearRoleNotifications = () => {
    setNotifications(prev => prev.filter(n => n.role !== role));
  };

  // Agregar nueva notificación dinámica
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
      targetTab: notif.targetTab || 'dashboard'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications: currentRoleNotifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearRoleNotifications,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
