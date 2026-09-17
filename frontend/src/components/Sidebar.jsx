import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Search, 
  Car, 
  CalendarCheck, 
  CreditCard, 
  History, 
  Star, 
  Settings, 
  Building2, 
  Camera, 
  Video,
  Users, 
  BarChart3, 
  Shield, 
  Radio,
  Server,
  Award,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

const isPersonalAccount = (user) => {
  if (!user) return false;
  const pos = (user.position || user.staffPosition || '').toLowerCase();
  if (pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor')) return true;
  // Fallback: todo Staff con role local que no sea el admin semilla es personal
  const adminEmails = ['adminlocal@smartpark.com', 'superadmin@smartpark.com'];
  if (adminEmails.includes((user.email || '').toLowerCase())) return false;
  // Si el usuario fue creado via StaffModule, su session guardará staffPosition; si no hay dato, asumimos dueño
  return !!user.isStaffOperator;
};

const PERSONAL_SECTIONS = [
  {
    section: 'GARITA PERSONAL',
    items: [
      { id: 'dashboard', label: 'Mapa & Sedes', shortLabel: 'Mapa', icon: Building2 },
      { id: 'anpr', label: 'Garita - Entrada/Salida', shortLabel: 'Garita', icon: Camera },
      { id: 'reservations', label: 'Tickets & Reservas', shortLabel: 'Tickets', icon: CalendarCheck },
      { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
      { id: 'audit', label: 'Mi Auditoría', shortLabel: 'Auditoría', icon: ShieldCheck },
    ]
  }
];

const SECTIONS_BY_ROLE = {
  user: [
    {
      section: 'EXPLORAR & SERVICIOS',
      items: [
        { id: 'dashboard', label: 'Búsqueda & Mapa', shortLabel: 'Mapa', icon: Search },
        { id: 'reservations', label: 'Mis Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'vehicles', label: 'Mis Vehículos', shortLabel: 'Vehículos', icon: Car },
        { id: 'payments', label: 'Métodos de Pago', shortLabel: 'Pagos', icon: CreditCard },
        { id: 'history', label: 'Historial & Boletas', shortLabel: 'Historial', icon: History },
        { id: 'reviews', label: 'Reseñas & Opiniones', shortLabel: 'Reseñas', icon: Star },
        { id: 'incidents', label: 'Incidencias & Soporte', shortLabel: 'Soporte', icon: AlertTriangle },
      ]
    }
  ],
  local: [
    {
      section: 'ADMINISTRACIÓN DE SEDE',
      items: [
        { id: 'dashboard', label: 'Mi Sede & Plano CAD', shortLabel: 'Sede', icon: Building2 },
        { id: 'anpr', label: 'Control de Garita', shortLabel: 'Garita', icon: Camera },
        { id: 'reservations', label: 'Reservas & Tickets', shortLabel: 'Tickets', icon: CalendarCheck },
        { id: 'cameras', label: 'Monitoreo CCTV', shortLabel: 'Cámaras', icon: Video },
        { id: 'staff', label: 'Personal & Turnos', shortLabel: 'Personal', icon: Users },
        { id: 'reports', label: 'Reportes & Cierres', shortLabel: 'Reportes', icon: BarChart3 },
        { id: 'reviews', label: 'Reseñas de Clientes', shortLabel: 'Reseñas', icon: Star },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'audit', label: 'Auditoría Local', shortLabel: 'Auditoría', icon: ShieldCheck },
      ]
    }
  ],
  platform: [
    {
      section: 'ADMINISTRACIÓN & FINANZAS',
      items: [
        { id: 'dashboard', label: 'Panel Global', shortLabel: 'Panel', icon: LayoutDashboard },
        { id: 'finances', label: 'Finanzas & Pagos', shortLabel: 'Finanzas', icon: CreditCard },
        { id: 'affiliates', label: 'Sedes & Afiliación', shortLabel: 'Sedes', icon: Building2 },
        { id: 'cameras', label: 'Monitoreo Cámara', shortLabel: 'Cámara', icon: Video },
        { id: 'settings', label: 'Ajustes Maestros', shortLabel: 'Ajustes', icon: Settings },
        { id: 'reservations', label: 'Padrón Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'analytics', label: 'Analítica Global', shortLabel: 'Métricas', icon: BarChart3 },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'users', label: 'Usuarios & RBAC', shortLabel: 'Usuarios', icon: Shield },
        { id: 'audit', label: 'Auditoría', shortLabel: 'Auditoría', icon: ShieldCheck },
        { id: 'resiliency', label: 'Estado del Sistema', shortLabel: 'Servidores', icon: Server },
      ]
    }
  ]
};

export const Sidebar = ({ activeTab, setActiveTab, onOpenTerms }) => {
  const { role, user } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [staffPositions, setStaffPositions] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('smart_park_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smart_park_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Bloquear el scroll del body cuando el drawer móvil está abierto para evitar scroll trabado / doble scroll
  useEffect(() => {
    if (mobileDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setMobileDrawerOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (role !== 'local' || !user?.email) return;
    const email = user.email.toLowerCase();
    if (['adminlocal@smartpark.com', 'superadmin@smartpark.com'].includes(email)) return;
    api.get('/staff').then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      const match = list.find(s => (s.email || '').toLowerCase() === email);
      if (match) {
        const pos = (match.position || '').toLowerCase();
        const isOp = pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor') || pos.includes('vigilante');
        setStaffPositions({ email, isOp, position: match.position });
      }
    }).catch(() => {});
  }, [role, user?.email]);

  const isPersonal = role === 'local' && (isPersonalAccount(user) || !!staffPositions.isOp);
  const currentSections = isPersonal ? PERSONAL_SECTIONS : (SECTIONS_BY_ROLE[role] || SECTIONS_BY_ROLE.user);
  const allItems = currentSections.flatMap(sec => sec.items);

  // Configuración de los 4 botones principales por rol en navegación móvil
  const getMobileNavConfig = () => {
    if (role === 'local') {
      return {
        left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
        left2: allItems.find(i => i.id === 'reservations') || allItems[1],
        center: allItems.find(i => i.id === 'anpr') || allItems[2],
        right1: allItems.find(i => i.id === 'incidents') || allItems[3],
      };
    }
    if (role === 'platform') {
      return {
        left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
        left2: allItems.find(i => i.id === 'finances') || allItems[1],
        center: allItems.find(i => i.id === 'affiliates') || allItems[2],
        right1: allItems.find(i => i.id === 'reservations') || allItems[4],
      };
    }
    return {
      left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
      left2: allItems.find(i => i.id === 'reservations') || allItems[1],
      center: allItems.find(i => i.id === 'vehicles') || allItems[2],
      right1: allItems.find(i => i.id === 'payments') || allItems[3],
    };
  };

  const navConfig = getMobileNavConfig();
  const mobileNavButtons = [navConfig.left1, navConfig.left2, navConfig.center, navConfig.right1].filter(Boolean);
  const isDrawerActive = !mobileNavButtons.some(i => i.id === activeTab);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* =========================================================================
          SIDEBAR DESKTOP DINÁMICO & COLAPSABLE (ALTO RENDIMIENTO Y UX LIMPIA)
          ========================================================================= */}
      <aside 
        className={`hidden md:flex bg-white dark:bg-[#0B0F19] border-r border-slate-200/90 dark:border-slate-800/80 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-2xs z-30 select-none shrink-0 transition-[width] duration-200 ease-out will-change-[width] ${
          isCollapsed ? 'w-16 min-w-[64px] max-w-[64px]' : 'w-56 min-w-[224px] max-w-[224px]'
        }`}
      >
        {/* Navegación y Secciones */}
        <div className="p-2 space-y-3.5 overflow-y-auto overflow-x-hidden flex-1">
          {(currentSections || []).map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-2 block truncate">
                  {sec.section}
                </span>
              )}
              <nav className="space-y-0.5">
                {(sec.items || []).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                          isCollapsed 
                            ? 'justify-center p-2.5' 
                            : 'space-x-2.5 px-3 py-2 text-left'
                        } ${
                          isActive
                            ? 'bg-slate-900 dark:bg-emerald-500/15 text-white dark:text-emerald-300 font-bold shadow-xs border border-slate-800 dark:border-emerald-500/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        {!isCollapsed && (
                          <span className="tracking-tight truncate">{item.label}</span>
                        )}
                      </button>

                      {/* Tooltip flotante en modo colapsado */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer del Sidebar: Rol (solo para roles administrativos/operativos) & Botón Colapsar */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0B0F19] space-y-1">
          {!isCollapsed && role !== 'user' && (
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Rol:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-bold capitalize text-xs truncate">
                {isPersonal ? 'Trabajador' : role === 'local' ? 'Admin Local' : 'SuperAdmin'}
              </strong>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            className={`w-full flex items-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 p-2 text-xs font-semibold transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : 'justify-between px-2.5'
            }`}
          >
            {!isCollapsed && <span className="text-[11px] font-medium">Colapsar menú</span>}
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
            )}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          NAVBAR MÓVIL OPTIMIZADO — CERO JANK, RESPUENDE INSTANTÁNEA & ACCESIBLE
          ========================================================================= */}
      <nav 
        aria-label="Navegación Móvil Principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none will-change-transform"
        style={{ touchAction: 'manipulation' }}
      >
        {(mobileNavButtons || []).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 cursor-pointer relative min-h-[46px] active:scale-95 ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors duration-150 ${
                isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                <Icon className="w-5 h-5 shrink-0 stroke-[2.2]" />
              </div>
              <span className={`text-[10px] tracking-tight leading-none mt-0.5 truncate max-w-[64px] ${
                isActive ? 'font-black' : 'font-semibold'
              }`}>
                {item.shortLabel || item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* Botón "+ Más" */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 cursor-pointer relative min-h-[46px] active:scale-95 ${
            mobileDrawerOpen || isDrawerActive
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors duration-150 ${
            mobileDrawerOpen || isDrawerActive
              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}>
            <Menu className="w-5 h-5 shrink-0 stroke-[2.2]" />
          </div>
          <span className={`text-[10px] tracking-tight leading-none mt-0.5 truncate max-w-[64px] ${
            mobileDrawerOpen || isDrawerActive ? 'font-black' : 'font-semibold'
          }`}>
            Más
          </span>
          {(mobileDrawerOpen || isDrawerActive) && (
            <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-0.5" />
          )}
        </button>
      </nav>

      {/* =========================================================================
          DRAWER MÓVIL SUAVE (BOTTOM SHEET CON TOUCH-SCROLL AISLADO)
          ========================================================================= */}
      {mobileDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#111827] rounded-t-3xl p-5 max-h-[82vh] overflow-y-auto space-y-4 shadow-2xl dark:shadow-black/80 border-t border-slate-200/90 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior de arrastre */}
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2" />

            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                  {role === 'user' ? 'Menú Principal' : `Menú • ${isPersonal ? 'Trabajador' : role === 'local' ? 'Admin Local' : 'Super Admin'}`}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {(allItems || []).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition-colors duration-150 cursor-pointer active:scale-98 ${
                      isActive 
                        ? 'bg-slate-900 dark:bg-emerald-950/80 text-white dark:text-emerald-300 border-slate-900 dark:border-emerald-800 shadow-md font-bold' 
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="text-xs font-semibold tracking-tight truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
