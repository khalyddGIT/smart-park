import React from 'react';
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
  ChevronRight
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { role } = useAuth();

  const menuSections = {
    user: [
      {
        section: 'MÓDULOS DEL CONDUCTOR',
        items: [
          { id: 'dashboard', label: 'Búsqueda & Mapa', icon: Search },
          { id: 'reservations', label: 'Mis Reservas & QR', icon: CalendarCheck },
          { id: 'loyalty', label: 'Smart Club & Puntos', icon: Award },
          { id: 'vehicles', label: 'Mis Vehículos (Placas)', icon: Car },
          { id: 'payments', label: 'Métodos de Pago', icon: CreditCard },
          { id: 'incidents', label: 'Reportar Incidencia', icon: AlertTriangle },
          { id: 'history', label: 'Historial de Estancias', icon: History },
          { id: 'reviews', label: 'Reseñas & Opiniones', icon: Star },
        ]
      }
    ],
    local: [
      {
        section: 'OPERACIONES & GARITA',
        items: [
          { id: 'dashboard', label: 'Sedes & Distribución de Espacios', icon: Building2 },
          { id: 'reservations', label: 'Gestión de Reservas & Tickets', icon: CalendarCheck },
          { id: 'anpr', label: 'Control Garita LPR & QR', icon: Camera },
          { id: 'incidents', label: 'Gestión de Incidencias', icon: AlertTriangle },
          { id: 'staff', label: 'Personal & Turnos', icon: Users },
          { id: 'reports', label: 'Analítica de Ocupación', icon: BarChart3 },
          { id: 'audit', label: 'Bitácora de Accesos', icon: ShieldCheck },
          { id: 'reviews', label: 'Moderación de Reseñas', icon: Star },
          { id: 'resiliency', label: 'Diagnóstico del Servidor', icon: Radio },
        ]
      }
    ],
    platform: [
      {
        section: 'ADMINISTRACIÓN GLOBAL',
        items: [
          { id: 'dashboard', label: 'Panel Consolidado', icon: LayoutDashboard },
          { id: 'affiliates', label: 'Sedes de Estacionamiento', icon: Building2 },
          { id: 'reservations', label: 'Padrón Global de Reservas', icon: CalendarCheck },
          { id: 'analytics', label: 'Business Intelligence', icon: BarChart3 },
          { id: 'incidents', label: 'Control de Incidencias', icon: AlertTriangle },
          { id: 'audit', label: 'Auditoría & Seguridad', icon: ShieldCheck },
          { id: 'users', label: 'Padrón de Usuarios (RBAC)', icon: Shield },
          { id: 'staff', label: 'Directorio de Personal', icon: Users },
          { id: 'reviews', label: 'Supervisión de Calidad', icon: Star },
          { id: 'resiliency', label: 'Diagnóstico de Servicios', icon: Server },
        ]
      }
    ]
  };

  const currentSections = menuSections[role] || menuSections.user;

  return (
    <>
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200/90 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-sm z-30 select-none">
        <div className="p-4 space-y-6 overflow-y-auto">
          {currentSections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider font-tech px-3 block">
                {sec.section}
              </span>
              <nav className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                          : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
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

        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50">
          <button className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition">
            <div className="flex items-center space-x-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Configuración</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 px-2 py-2 flex justify-around shadow-lg">
        {currentSections[0]?.items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[11px] font-semibold ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

