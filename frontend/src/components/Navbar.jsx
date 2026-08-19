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
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-emerald-500 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center px-0.5 shadow-xs animate-pulse border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 sm:hidden"
                  onClick={() => setShowNotifications(false)}
                />

                <div className="fixed inset-x-3 top-14 max-w-sm mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 sm:max-w-none bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  
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
                        title="Limpiar todas las notificaciones de este rol"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpiar</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {displayedNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">No tienes notificaciones pendientes</p>
                        <p className="text-[10px] text-slate-400">Los avisos de reservas, LPR y accesos aparecerán aquí.</p>
                      </div>
                    ) : (
                      displayedNotifications.map((n) => {
                        const Icon = getIconForType(n.type);
                        const colors = getColorForType(n.type);

                        return (
                          <div 
                            key={n.id}
                            className={`p-3.5 transition flex items-start space-x-3 ${
                              n.read ? 'bg-white opacity-70 hover:opacity-100' : 'bg-emerald-50/30'
                            } hover:bg-slate-50`}
                          >
                            <div className={`p-2 rounded-xl border shrink-0 ${colors}`}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  {n.title}
                                </h4>
                                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                  {n.time}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                                {n.message}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-1">
                                {n.targetTab ? (
                                  <button
                                    onClick={() => handleNotificationClick(n)}
                                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Ver detalle</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <span />
                                )}

                                <button
                                  onClick={() => removeNotification(n.id)}
                                  title="Eliminar notificación"
                                  className="text-slate-300 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <span className="text-[10px] font-mono text-slate-500">
                      Notificaciones en tiempo real para {role.toUpperCase()}
                    </span>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Botón de Perfil de Usuario Directo Limpio */}
          <div className="flex items-center space-x-1 sm:space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
            <button
              onClick={() => {
                if (onNavigateProfile) onNavigateProfile();
              }}
              title="Abrir Mi Perfil"
              className="flex items-center space-x-1.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer group bg-slate-50 border border-slate-200"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="hidden lg:block text-left pr-1">
                <span className="text-xs font-black text-slate-800 block leading-tight tracking-tight">
                  {user?.name?.split(' ')[0] || 'Usuario'}
                </span>
                <span className="text-[9px] font-mono text-emerald-700 font-bold block uppercase leading-none">
                  {role}
                </span>
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
