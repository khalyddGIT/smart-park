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
  X
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

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Sidebar Desktop Ajustado y Compacto (185px de ancho exacto) */}
      <aside className="hidden md:flex w-[185px] min-w-[185px] max-w-[185px] bg-white border-r border-slate-200/90 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-xs z-30 select-none flex-shrink-0">
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

        <div className="p-2 border-t border-slate-100 bg-slate-50/60 space-y-1">
          <button
            type="button"
            onClick={onOpenTerms}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] text-slate-500 hover:text-emerald-700 font-bold rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <span>⚖️ Términos & Legal</span>
            <span className="text-[9px] font-mono text-slate-400">v2.4</span>
          </button>
          <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-slate-500 font-medium">
            <span>Rol: <strong className="text-slate-800 font-bold capitalize">{role}</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Navegación Móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-1.5 flex justify-around items-center shadow-lg"
      >
        {allItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition duration-150 ${
                isActive 
                  ? 'text-emerald-600 font-black' 
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-sans">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Botón "+ Más" */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition duration-150 ${
            mobileDrawerOpen || allItems.slice(4).some(i => i.id === activeTab)
              ? 'text-emerald-600 font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="p-1 rounded-lg text-slate-400">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-sans">
            Más
          </span>
        </button>
      </nav>

      {/* Drawer Móvil Desplegable (Slide-Up Sheet) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-black text-slate-900 text-sm">Menú de Navegación ({role.toUpperCase()})</h3>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
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
                className="w-full py-2 px-3 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 rounded-xl flex items-center justify-center gap-2"
              >
                <span>⚖️ Ver Términos y Condiciones Legales</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
