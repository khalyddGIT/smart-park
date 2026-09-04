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
  ChevronRight,
  Building2,
  LogIn,
  Sun,
  Moon
} from 'lucide-react';
import { KeypadModal } from './KeypadModal';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../context/ThemeContext';

const getIconForType = (type) => {
  switch (type) {
    case 'success':
      return CheckCircle2;
    case 'warning':
      return AlertTriangle;
    case 'alert':
      return AlertTriangle;
    default:
      return Info;
  }
};

const getColorForType = (type) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80';
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/80';
    case 'alert':
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/80';
    default:
      return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/80';
  }
};

export const Navbar = ({ onNavigateProfile, onNavigateTab, onOpenAuthModal }) => {
  const { role, setRole, user, pinVerified, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
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
      <header className="glass-panel sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md select-none transition-colors">
        
        {/* Brand Logo */}
        <BrandLogo className="h-8 sm:h-9 w-auto" dark={isDark} />

        {/* Controles de Usuario / Visitante */}
        {!user ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              title={`Tema actual: ${theme}. Clic para alternar modo claro/oscuro`}
              aria-label="Alternar modo visual"
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 hover:text-indigo-600 transition" />
              )}
            </button>
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-md shadow-slate-900/20 cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Ingresar / Registrarse</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={toggleTheme}
              title={`Tema actual: ${theme}. Clic para alternar modo claro/oscuro`}
              aria-label="Alternar modo visual"
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 hover:text-indigo-600 transition" />
              )}
            </button>
            


          {/* =========================================================================
              CENTRO DE NOTIFICACIONES INTERACTIVO POR ROL
              ========================================================================= */}
          <div className="relative shrink-0" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificaciones del Sistema" 
              title="Ver notificaciones del sistema"
              className={`relative p-2 sm:p-2.5 rounded-xl transition shadow-xs cursor-pointer border flex items-center justify-center shrink-0 ${
                showNotifications 
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 shadow-md' 
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Bell className="w-[18px] h-[18px] shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] bg-emerald-500 text-white font-mono font-bold text-[10px] rounded-full flex items-center justify-center px-1 shadow-md ring-2 ring-white dark:ring-slate-900 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 sm:hidden"
                  onClick={() => setShowNotifications(false)}
                />

                <div className="fixed inset-x-3 top-[64px] max-w-sm mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 sm:max-w-none bg-white dark:bg-[#111827] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-200/90 dark:border-slate-800/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 max-h-[80vh] flex flex-col">
                  
                  <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
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

                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setFilterUnreadOnly(false)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                          !filterUnreadOnly ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Todas ({notifications.length})
                      </button>
                      <button
                        onClick={() => setFilterUnreadOnly(true)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                          filterUnreadOnly ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        No leídas ({unreadCount})
                      </button>
                    </div>

                    {notifications.length > 0 && (
                      <button
                        onClick={clearRoleNotifications}
                        className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Limpiar todas las notificaciones de este rol"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Limpiar</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {displayedNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No tienes notificaciones pendientes</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Los avisos de reservas, LPR y accesos aparecerán aquí.</p>
                      </div>
                    ) : (
                      displayedNotifications.map((n) => {
                        const Icon = getIconForType(n.type);
                        const colors = getColorForType(n.type);

                        return (
                          <div 
                            key={n.id}
                            className={`p-3.5 transition flex items-start space-x-3 ${
                              n.read ? 'bg-white dark:bg-[#111827] opacity-70 hover:opacity-100' : 'bg-emerald-50/30 dark:bg-emerald-950/20'
                            } hover:bg-slate-50 dark:hover:bg-slate-850`}
                          >
                            <div className={`p-2 rounded-xl border shrink-0 ${colors}`}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {n.title}
                                </h4>
                                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                  {n.time}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                                {n.message}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-1">
                                {n.targetTab ? (
                                  <button
                                    onClick={() => handleNotificationClick(n)}
                                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Ver detalle</span>
                                    <ChevronRight className="w-4 h-4 shrink-0" />
                                  </button>
                                ) : (
                                  <span />
                                )}

                                <button
                                  onClick={() => removeNotification(n.id)}
                                  title="Eliminar notificación"
                                  className="text-slate-300 dark:text-slate-600 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                >
                                  <X className="w-4 h-4 shrink-0" />
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

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Notificaciones en tiempo real para {role.toUpperCase()}
                    </span>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Perfil - adaptativo y armónico en claro/oscuro */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => { if (onNavigateProfile) onNavigateProfile(); }}
              title="Abrir Mi Perfil"
              className="flex items-center gap-2 py-1.5 px-2 sm:px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-7 h-7 rounded-xl object-cover shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 bg-white" onError={(e)=>{e.currentTarget.style.display='none'; if(e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display='flex';}} />
              ) : null}
              <div className={`w-7 h-7 rounded-xl bg-slate-900 dark:bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 items-center justify-center font-bold shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-emerald-500/30 ${user?.avatar ? 'hidden' : 'flex'}`} style={{display: user?.avatar ? 'none' : 'flex'}}>
                <User className="w-4 h-4 shrink-0" />
              </div>
              <div className="hidden sm:block text-left min-w-0 pr-1">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 block leading-tight tracking-tight truncate max-w-[90px]">
                  {user?.name?.split(' ')[0] || 'Usuario'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase leading-none tracking-wider">
                  {role}
                </span>
              </div>
              <span className="sm:hidden text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-[60px]">{user?.name?.split(' ')[0] || 'Yo'}</span>
            </button>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              className="flex items-center gap-1.5 p-2 sm:p-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-800 shadow-xs shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs font-bold">Salir</span>
            </button>
          </div>

        </div>
        )}
      </header>

      <KeypadModal
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  );
};
