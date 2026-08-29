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
        { id: 'cameras', label: 'Monitoreo Cámara', shortLabel: 'Cámara', icon: Video },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'staff', label: 'Personal', shortLabel: 'Personal', icon: Users },
        { id: 'reports', label: 'Reportes', shortLabel: 'Reportes', icon: BarChart3 },
        { id: 'audit', label: 'Auditoría Local', shortLabel: 'Auditoría', icon: ShieldCheck },
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },
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
        { id: 'vehicles', label: 'Vehículos Registrados', shortLabel: 'Vehículos', icon: Car },
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
      center: allItems.find(i => i.id === 'vehicles') || allItems[2],
      right1: allItems.find(i => i.id === 'payments') || allItems[3],
    };
  };

  const navConfig = getMobileNavConfig();
  const isDrawerActive = ![navConfig.left1?.id, navConfig.left2?.id, navConfig.center?.id, navConfig.right1?.id].includes(activeTab);

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
        <div className="p-2 border-t border-slate-100 bg-slate-50/70 space-y-1">
          <button
            type="button"
            onClick={onOpenTerms}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition cursor-pointer group"
          >
            <Scale className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            <span className="text-xs font-semibold tracking-tight truncate">Términos Legales</span>
          </button>

          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500 text-xs font-medium">Rol:</span>
            <strong className="text-slate-800 font-bold capitalize text-xs truncate">
              {role === 'user' ? 'Conductor' : role === 'local' ? 'Garita' : 'Admin'}
            </strong>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          NAVBAR MÓVIL FLOTANTE GLASSMORPHISM CON BOTÓN ACTIVO ELEVADO DINÁMICO
          ========================================================================= */}
      <nav 
        aria-label="Navegación Móvil Flotante Glassmorphism"
        className="md:hidden fixed bottom-3 left-3 right-3 max-w-sm sm:max-w-md mx-auto z-40 bg-white/80 backdrop-blur-xl rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-white/80 ring-1 ring-slate-900/5 px-2 sm:px-3 py-1 flex items-center justify-between select-none"
      >
        {/* 4 Botones Principales por Rol */}
        {[navConfig.left1, navConfig.left2, navConfig.center, navConfig.right1].filter(Boolean).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer relative"
            >
              {isActive ? (
                <div className="flex flex-col items-center justify-center -mt-6 animate-in zoom-in-90 duration-200">
                  <div className="w-12 h-12 rounded-full bg-slate-950 text-emerald-400 border-[3.5px] border-white shadow-xl shadow-slate-950/30 ring-2 ring-emerald-500/20 flex items-center justify-center transition-transform duration-200 scale-105 active:scale-95">
                    <Icon className="w-5 h-5 stroke-[2.4]" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 tracking-tight mt-1">
                    {item.shortLabel || item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1 transition-all duration-200">
                  <div className="p-1 text-slate-400 group-hover:text-slate-700 transition-colors">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-tight group-hover:text-slate-700 transition-colors">
                    {item.shortLabel || item.label}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* 5. Botón Derecho: Menú "+ Más" */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer relative"
        >
          {mobileDrawerOpen || isDrawerActive ? (
            <div className="flex flex-col items-center justify-center -mt-6 animate-in zoom-in-90 duration-200">
              <div className="w-12 h-12 rounded-full bg-slate-950 text-emerald-400 border-[3.5px] border-white shadow-xl shadow-slate-950/30 ring-2 ring-emerald-500/20 flex items-center justify-center transition-transform duration-200 scale-105 active:scale-95">
                <Menu className="w-5 h-5 stroke-[2.4]" />
              </div>
              <span className="text-[10px] font-black text-slate-900 tracking-tight mt-1">
                Más
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 transition-all duration-200">
              <div className="p-1 text-slate-400 group-hover:text-slate-700 transition-colors">
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-semibold text-slate-400 tracking-tight group-hover:text-slate-700 transition-colors">
                Más
              </span>
            </div>
          )}
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
