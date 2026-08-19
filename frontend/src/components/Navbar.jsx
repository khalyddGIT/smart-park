import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  Shield, 
  LogOut, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock, 
  Check, 
  Trash2, 
  X,
  ChevronRight
} from 'lucide-react';
import { KeypadModal } from './KeypadModal';

export const Navbar = ({ onNavigateProfile, onNavigateTab }) => {
  const { role, setRole, user, pinVerified, logout } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearRoleNotifications 
  } = useNotifications();

  const [showKeypad, setShowKeypad] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const notifRef = useRef(null);

  const handleRoleChange = (e) => {
    const selected = e.target.value;
    if (selected === 'local' || selected === 'platform') {
      if (!pinVerified) {
        setPendingRole(selected);
        setShowKeypad(true);
        return;
      }
    }
    setRole(selected);
    setShowNotifications(false);
  };

  const handlePinSuccess = () => {
    if (pendingRole) {
      setRole(pendingRole);
      setPendingRole(null);
    }
  };

  // Cerrar panel de notificaciones al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.targetTab && onNavigateTab) {
      onNavigateTab(notif.targetTab);
    }
    setShowNotifications(false);
  };

  const displayedNotifications = filterUnreadOnly 
    ? notifications.filter(n => !n.read) 
    : notifications;

  return (
    <>
      <header className="glass-panel sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-md select-none">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-sm border border-slate-800 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 sm:w-5 sm:h-5">
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-tech">
            SMART-PARK
          </span>
        </div>

        {/* Selector de Rol, Campana de Notificaciones & Perfil */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          
          {/* Selector de Rol RBAC */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-1.5 shadow-xs max-w-[120px] sm:max-w-[160px] md:max-w-none">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <select
              value={role}
              onChange={handleRoleChange}
              className="bg-transparent text-[11px] sm:text-xs text-slate-900 font-bold focus:outline-none cursor-pointer tracking-tight truncate w-full"
            >
              <option value="user" className="bg-white text-slate-800">🚗 Conductor</option>
              <option value="local" className="bg-white text-slate-800">🏢 Admin Cochera</option>
              <option value="platform" className="bg-white text-slate-800">🌐 Super Admin</option>
            </select>
          </div>

          {/* =========================================================================
              CENTRO DE NOTIFICACIONES INTERACTIVO POR ROL
              ========================================================================= */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificaciones del Sistema" 
              title="Ver notificaciones del sistema"
              className={`relative p-2 rounded-xl transition shadow-xs cursor-pointer border ${
                showNotifications 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              
              {/* Indicador de Notificaciones No Leídas */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-emerald-500 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center px-0.5 shadow-xs animate-pulse border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Panel Desplegable de Notificaciones Responsive */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-76 sm:w-96 max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                
                {/* Cabecera del Panel */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="font-extrabold text-xs tracking-tight">
                        Notificaciones ({role === 'user' ? 'Conductor' : role === 'local' ? 'Garita / Cochera' : 'Super Admin'})
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        title="Marcar todas como leídas"
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1 rounded cursor-pointer"
                      >
                        Leer todas
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filtro Rápido */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setFilterUnreadOnly(false)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        !filterUnreadOnly ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Todas ({notifications.length})
                    </button>
                    <button
                      onClick={() => setFilterUnreadOnly(true)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        filterUnreadOnly ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      No leídas ({unreadCount})
                    </button>
                  </div>

                  {notifications.length > 0 && (
                    <button
                      onClick={clearRoleNotifications}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>

                {/* Lista de Notificaciones con Scroll */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {displayedNotifications.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No hay notificaciones</p>
                      <p className="text-[11px] text-slate-400">
                        {filterUnreadOnly ? 'Has leído todos tus avisos.' : 'No tienes notificaciones pendientes en este rol.'}
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((n) => {
                      const isSuccess = n.type === 'success';
                      const isWarning = n.type === 'warning';

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 transition cursor-pointer flex items-start space-x-3 group ${
                            !n.read ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* Icono temático */}
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            isSuccess 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : isWarning 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isSuccess ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Info className="w-4 h-4" />
                            )}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-xs leading-tight truncate ${!n.read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                {n.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                                {n.time}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-snug">
                              {n.message}
                            </p>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-emerald-700 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                                <span>Ver detalle</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(n.id);
                                }}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition"
                                title="Eliminar aviso"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Indicador No Leído */}
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <span className="text-[10px] font-mono text-slate-500">
                    Notificaciones en tiempo real para {role.toUpperCase()}
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* Botón de Perfil de Usuario Directo */}
          <div className="flex items-center space-x-1 sm:space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
            <button
              onClick={() => {
                if (onNavigateProfile) onNavigateProfile();
              }}
              title="Abrir Mi Perfil"
              className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer group"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0 group-hover:border-emerald-500 transition" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center border border-slate-200 group-hover:border-emerald-300 shadow-xs shrink-0 transition">
                  <User className="w-4 h-4" />
                </div>
              )}
              
              <div className="text-left hidden xl:block pr-1">
                <p className="text-xs font-bold text-slate-900 leading-none tracking-tight group-hover:text-emerald-700 transition truncate max-w-[120px]">{user?.name || 'Usuario'}</p>
                <p className="text-[10px] text-slate-500 font-tech font-medium capitalize mt-0.5 truncate max-w-[120px]">{user?.email || `Rol: ${role}`}</p>
              </div>
            </button>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <KeypadModal
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  );
};
