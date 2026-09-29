import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  LogOut, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Check, 
  Trash2, 
  X,
  LogIn,
  Sun,
  Moon
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../context/ThemeContext';

const getIconForType = (type) => {
  switch (type) {
    case 'success':
      return CheckCircle2;
    case 'warning':
    case 'alert':
      return AlertTriangle;
    default:
      return Info;
  }
};

const getIconStyle = (type, read) => {
  if (read) return 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800';
  switch (type) {
    case 'success':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40';
    case 'alert':
      return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40';
    default:
      return 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40';
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const notifRef = useRef(null);

  const isPersonal = !!(user?.position || user?.staffPosition || user?.isStaffOperator || user?.is_staff);
  const staffRoleLabel = isPersonal 
    ? (user?.position || user?.staffPosition || 'Operador de Garita') 
    : role === 'local' 
    ? 'Admin Local' 
    : role === 'platform' 
    ? 'SuperAdmin' 
    : 'Operador';

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
        <BrandLogo
          dark={isDark}
          iconSize="w-7 h-7 sm:w-9 sm:h-9"
          textClassName="hidden min-[430px]:flex text-xl sm:text-2xl"
        />

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
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificaciones del Sistema" 
              title="Notificaciones"
              className={`relative p-2 sm:p-2.5 rounded-xl transition cursor-pointer border flex items-center justify-center shrink-0 ${
                showNotifications 
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 shadow-xs' 
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Bell className="w-[18px] h-[18px] shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 sm:hidden"
                  onClick={() => setShowNotifications(false)}
                />

                <div className="fixed inset-x-3 top-[60px] max-w-sm mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-w-none bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/60 border border-slate-200/90 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 max-h-[80vh] flex flex-col">
                  
                  {/* Encabezado Cohesivo */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Notificaciones</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                          {unreadCount} nuevas
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          title="Marcar todas como leídas"
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-1.5 py-1 rounded transition cursor-pointer"
                        >
                          Marcar leídas
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearRoleNotifications}
                          title="Limpiar todas"
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filtro Mínimo (Solo si hay notificaciones) */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-1.5 bg-slate-50/60 dark:bg-slate-850/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFilterUnreadOnly(false)}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          !filterUnreadOnly
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Todas ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterUnreadOnly(true)}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          filterUnreadOnly
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        No leídas ({unreadCount})
                      </button>
                    </div>
                  )}

                  {/* Lista de Notificaciones Limpia */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                    {displayedNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-1.5">
                        <Check className="w-6 h-6 mx-auto text-emerald-500 opacity-80" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estás al día</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">Sin notificaciones pendientes</p>
                      </div>
                    ) : (
                      displayedNotifications.map((n) => {
                        const Icon = getIconForType(n.type);

                        return (
                          <div 
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`group px-4 py-3 transition flex items-start gap-3 cursor-pointer ${
                              !n.read 
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/15' 
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/50'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getIconStyle(n.type, n.read)}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className={`text-xs truncate ${!n.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                  {n.title}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                  {n.time}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-center">
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(n.id);
                                }}
                                title="Eliminar"
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
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
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 block leading-tight tracking-tight truncate max-w-[100px]">
                  {user?.name?.split(' ')[0] || 'Usuario'}
                </span>
                {role !== 'user' ? (
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase leading-none tracking-wider">
                    {staffRoleLabel}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block leading-none truncate max-w-[100px]">
                    {user?.email ? user.email.split('@')[0] : 'Cuenta Personal'}
                  </span>
                )}
              </div>
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
    </>
  );
};
