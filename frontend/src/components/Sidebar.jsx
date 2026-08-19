import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Users, 
  BarChart3, 
  Shield, 
  Radio,
  Server,
  Award,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Scale,
  Sparkles
} from 'lucide-react';

const SECTIONS_BY_ROLE = {
  user: [
    {
      section: 'CONDUCTOR',
      items: [
        { id: 'dashboard', label: 'Búsqueda & Mapa', shortLabel: 'Mapa', icon: Search },
        { id: 'reservations', label: 'Mis Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'loyalty', label: 'Smart Club', shortLabel: 'Club', icon: Award },
        { id: 'vehicles', label: 'Mis Vehículos', shortLabel: 'Vehículos', icon: Car },
        { id: 'payments', label: 'Métodos de Pago', shortLabel: 'Pagos', icon: CreditCard },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'history', label: 'Historial', shortLabel: 'Historial', icon: History },
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },
      ]
    }
  ],
  local: [
    {
      section: 'GARITA & SEDE',
      items: [
        { id: 'dashboard', label: 'Espacios & Plano', shortLabel: 'Espacios', icon: Building2 },
        { id: 'reservations', label: 'Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'anpr', label: 'Control LPR', shortLabel: 'Garita', icon: Camera },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'staff', label: 'Personal', shortLabel: 'Personal', icon: Users },
        { id: 'reports', label: 'Reportes', shortLabel: 'Reportes', icon: BarChart3 },
        { id: 'audit', label: 'Accesos', shortLabel: 'Accesos', icon: ShieldCheck },
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },
        { id: 'resiliency', label: 'Diagnóstico', shortLabel: 'Servidor', icon: Radio },
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
        { id: 'settings', label: 'Ajustes Maestros', shortLabel: 'Ajustes', icon: Settings },
        { id: 'reservations', label: 'Padrón Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'analytics', label: 'Analítica Global', shortLabel: 'Métricas', icon: BarChart3 },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'users', label: 'Usuarios & RBAC', shortLabel: 'Usuarios', icon: Shield },
        { id: 'staff', label: 'Directorio Personal', shortLabel: 'Personal', icon: Users },
        { id: 'audit', label: 'Auditoría', shortLabel: 'Auditoría', icon: ShieldCheck },
        { id: 'reviews', label: 'Supervisión', shortLabel: 'Calidad', icon: Star },
        { id: 'resiliency', label: 'Servicios Backend', shortLabel: 'Servicios', icon: Radio },
      ]
    }
  ]
};

export const Sidebar = ({ activeTab, setActiveTab, onOpenTerms }) => {
  const { role } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentSections = SECTIONS_BY_ROLE[role] || SECTIONS_BY_ROLE.user;
  const allItems = currentSections.flatMap(sec => sec.items);

  // Configuración de los 5 botones del Navbar Móvil Estilo Flotante Curvo
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
    // Default: 'user'
    return {
      left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
      left2: allItems.find(i => i.id === 'reservations') || allItems[1],
      center: allItems.find(i => i.id === 'loyalty') || allItems[2],
      right1: allItems.find(i => i.id === 'vehicles') || allItems[3],
    };
  };

  const navConfig = getMobileNavConfig();
  const isDrawerActive = !['dashboard', 'reservations', navConfig.center?.id, 'vehicles', 'incidents', 'finances', 'affiliates'].includes(activeTab);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Sidebar Desktop Ajustado y Compacto (185px de ancho exacto) */}
      <aside className="hidden md:flex w-[185px] min-w-[185px] max-w-[185px] bg-white border-r border-slate-200/90 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-xs z-30 select-none shrink-0">
        <div className="p-2 space-y-3.5 overflow-y-auto">
          {currentSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider font-tech px-2 block">
                {sec.section}
              </span>
              <nav className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs border border-slate-800 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="tracking-tight truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer del Sidebar Desktop Profesional y Limpio */}
        <div className="p-2 border-t border-slate-100 bg-slate-50/70 space-y-1.5">
          <button
            type="button"
            onClick={onOpenTerms}
            className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-white hover:shadow-xs transition cursor-pointer group"
          >
            <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
            <span className="text-[11px] font-medium tracking-tight truncate">Términos Legales</span>
          </button>

          <div className="flex items-center justify-between px-2 py-1 bg-white/80 rounded-xl border border-slate-200/60 text-[11px]">
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-slate-500 text-[10px]">Rol:</span>
              <strong className="text-slate-800 font-bold capitalize text-[10px] truncate">{role}</strong>
            </div>
            <span className="text-[9px] font-mono text-slate-400 font-medium shrink-0">v2.4</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          NAVBAR MÓVIL FLOTANTE CURVO CON BOTÓN ELEVADO CENTRAL & LABELS
          ========================================================================= */}
      <nav 
        aria-label="Navegación Móvil Flotante"
        className="md:hidden fixed bottom-3 left-3 right-3 max-w-sm sm:max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/90 px-2 sm:px-3 py-1.5 flex items-center justify-between select-none"
      >
        {/* 1. Botón Izquierdo 1 */}
        {navConfig.left1 && (() => {
          const Icon = navConfig.left1.icon;
          const isActive = activeTab === navConfig.left1.id;
          return (
            <button
              onClick={() => handleSelectTab(navConfig.left1.id)}
              className="flex-1 flex flex-col items-center justify-center py-0.5 transition group cursor-pointer active:scale-95"
            >
              <div className={`p-1 transition-colors ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <span className={`text-[9px] font-extrabold tracking-tight transition-colors ${isActive ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                {navConfig.left1.shortLabel}
              </span>
              <span className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${isActive ? 'bg-emerald-600 opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </button>
          );
        })()}

        {/* 2. Botón Izquierdo 2 */}
        {navConfig.left2 && (() => {
          const Icon = navConfig.left2.icon;
          const isActive = activeTab === navConfig.left2.id;
          return (
            <button
              onClick={() => handleSelectTab(navConfig.left2.id)}
              className="flex-1 flex flex-col items-center justify-center py-0.5 transition group cursor-pointer active:scale-95"
            >
              <div className={`p-1 transition-colors ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <span className={`text-[9px] font-extrabold tracking-tight transition-colors ${isActive ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                {navConfig.left2.shortLabel}
              </span>
              <span className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${isActive ? 'bg-emerald-600 opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </button>
          );
        })()}

        {/* 3. BOTÓN CENTRAL PROMINENTE ELEVADO (Curved Highlight Action) */}
        {navConfig.center && (() => {
          const Icon = navConfig.center.icon;
          const isActive = activeTab === navConfig.center.id;
          return (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <button
                onClick={() => handleSelectTab(navConfig.center.id)}
                title={navConfig.center.label}
                className={`w-11 h-11 -mt-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer border-4 border-white active:scale-90 ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-emerald-600/50 ring-4 ring-emerald-500/25 scale-105' 
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 shadow-slate-900/30'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.4]" />
              </button>
              <span className={`text-[9px] font-black tracking-tight mt-0.5 transition-colors ${isActive ? 'text-emerald-700 font-black' : 'text-slate-600'}`}>
                {navConfig.center.shortLabel}
              </span>
              <span className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${isActive ? 'bg-emerald-600 opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </div>
          );
        })()}

        {/* 4. Botón Derecho 1 */}
        {navConfig.right1 && (() => {
          const Icon = navConfig.right1.icon;
          const isActive = activeTab === navConfig.right1.id;
          return (
            <button
              onClick={() => handleSelectTab(navConfig.right1.id)}
              className="flex-1 flex flex-col items-center justify-center py-0.5 transition group cursor-pointer active:scale-95"
            >
              <div className={`p-1 transition-colors ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <span className={`text-[9px] font-extrabold tracking-tight transition-colors ${isActive ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                {navConfig.right1.shortLabel}
              </span>
              <span className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${isActive ? 'bg-emerald-600 opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </button>
          );
        })()}

        {/* 5. Botón Derecho 2: Menú "+ Más" */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-0.5 transition group cursor-pointer active:scale-95"
        >
          <div className={`p-1 transition-colors ${mobileDrawerOpen || isDrawerActive ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <span className={`text-[9px] font-extrabold tracking-tight transition-colors ${mobileDrawerOpen || isDrawerActive ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
            Más
          </span>
          <span className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${mobileDrawerOpen || isDrawerActive ? 'bg-emerald-600 opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
        </button>
      </nav>

      {/* Drawer Móvil Desplegable (Slide-Up Sheet) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-black text-slate-900 text-sm">Menú Completo ({role.toUpperCase()})</h3>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold' 
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold tracking-tight truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Acceso a Términos desde el móvil */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  if (onOpenTerms) onOpenTerms();
                }}
                className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Scale className="w-4 h-4 text-slate-500" />
                <span>Términos y Condiciones Legales</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
