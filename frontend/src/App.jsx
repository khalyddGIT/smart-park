import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useEstablishments } from './context/EstablishmentContext';
import api from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PersonalGaritaModule } from './components/PersonalGaritaModule';
import { PaymentsModule } from './components/PaymentsModule';
import { VehiclesModule } from './components/VehiclesModule';
import { HistoryModule } from './components/HistoryModule';
import { ReviewsModule } from './components/ReviewsModule';
import { IncidentsModule } from './components/IncidentsModule';
import { VerifyReservationPage } from './components/VerifyReservationPage';
import { AyacuchoMap } from './components/AyacuchoMap';
import { CustomerInteractivePlanBooking } from './components/CustomerInteractivePlanBooking';
import { DigitalAccessPassModal } from './components/DigitalAccessPassModal';
import { CulqiPaymentModal } from './components/CulqiPaymentModal';
import { ReservationsModule } from './components/ReservationsModule';
import { LoginAuthScreen } from './components/LoginAuthScreen';
import { TermsAndConditionsModal } from './components/TermsAndConditionsModal';
import { UserProfileModule } from './components/UserProfileModule';
import { LandingPage } from './components/LandingPage';
import { AutoFitFloorPlan } from './components/AutoFitFloorPlan';

// Lazy-loaded heavy modules for code-splitting & lightning performance
const LocalEstablishmentManager = lazy(() => import('./components/LocalEstablishmentManager').then(m => ({ default: m.LocalEstablishmentManager })));
const ANPRMonitor = lazy(() => import('./components/ANPRMonitor').then(m => ({ default: m.ANPRMonitor })));
const PlatformFinancesModule = lazy(() => import('./components/PlatformFinancesModule').then(m => ({ default: m.PlatformFinancesModule })));
const PlatformSettingsModule = lazy(() => import('./components/PlatformSettingsModule').then(m => ({ default: m.PlatformSettingsModule })));
const PlatformGlobalDashboard = lazy(() => import('./components/PlatformGlobalDashboard').then(m => ({ default: m.PlatformGlobalDashboard })));
const UserRolesModule = lazy(() => import('./components/UserRolesModule').then(m => ({ default: m.UserRolesModule })));
const AnalyticsGlobalModule = lazy(() => import('./components/AnalyticsGlobalModule').then(m => ({ default: m.AnalyticsGlobalModule })));
const CameraMonitorModule = lazy(() => import('./components/CameraMonitorModule').then(m => ({ default: m.CameraMonitorModule })));
const ResiliencySimModule = lazy(() => import('./components/ResiliencySimModule').then(m => ({ default: m.ResiliencySimModule })));
const AuditLogsModule = lazy(() => import('./components/AuditLogsModule').then(m => ({ default: m.AuditLogsModule })));
const StaffModule = lazy(() => import('./components/StaffModule').then(m => ({ default: m.StaffModule })));
const AffiliatedParkingsModule = lazy(() => import('./components/AffiliatedParkingsModule').then(m => ({ default: m.AffiliatedParkingsModule })));

const FALLBACK_PARKING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' width='800' height='500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='210' r='85' fill='%2310b981' fill-opacity='0.15'/%3E%3Cpath d='M345 250 L455 250 L430 175 L370 175 Z' fill='%2310b981' fill-opacity='0.6'/%3E%3Crect x='330' y='250' width='140' height='40' rx='10' fill='%2310b981'/%3E%3Ccircle cx='365' cy='290' r='14' fill='%230f172a'/%3E%3Ccircle cx='435' cy='290' r='14' fill='%230f172a'/%3E%3Ctext x='400' y='370' font-family='system-ui, sans-serif' font-size='22' font-weight='bold' fill='%23f8fafc' text-anchor='middle'%3ESmart Park Huamanga%3C/text%3E%3Ctext x='400' y='402' font-family='system-ui, sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle'%3EEstacionamiento Seguro y Conectado%3C/text%3E%3C/svg%3E";

const LoadingModule = () => (
  <div className="flex items-center justify-center min-h-[350px] w-full py-12">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Cargando módulo de Smart-Park...</span>
    </div>
  </div>
);
import { 
  Search, 
  MapPin, 
  QrCode, 
  Car, 
  ChevronRight, 
  Award, 
  AlertTriangle, 
  ShieldCheck,
  Building2,
  Sparkles,
  Filter,
  CheckCircle2,
  Accessibility,
  Umbrella,
  Crown,
  Bike,
  ArrowLeft,
  MessageSquare,
  Phone
} from 'lucide-react';

import { Card, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { SkeletonParkingCard } from './components/ui/skeleton';

export const App = () => {
  // Ruta pública de verificación de QR: /verify/RSV-XXXX (accesible sin login, escaneable con Google Lens)
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/verify/')) {
    return <VerifyReservationPage />;
  }

  const { role, user } = useAuth();
  const { establishments, occupySlot, createReservation, bookingError } = useEstablishments();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookingFeedback, setBookingFeedback] = useState(null);
  const [isPersonalStaff, setIsPersonalStaff] = useState(false);
  const [personalParkingId, setPersonalParkingId] = useState(null);
  useEffect(() => {
    if (role !== 'local' || !user?.email) { setIsPersonalStaff(false); setPersonalParkingId(null); return; }
    if (['adminlocal@smartpark.com','superadmin@smartpark.com'].includes(user.email.toLowerCase())) { setIsPersonalStaff(false); setPersonalParkingId(null); return; }
    api.get('/staff').then(r=>{
      const list = Array.isArray(r.data)? r.data : [];
      const match = list.find(s=> (s.email||'').toLowerCase()===user.email.toLowerCase());
      if (match) {
        const pos=(match.position||'').toLowerCase();
        if (pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor') || pos.includes('vigilante')) {
          setIsPersonalStaff(true);
          if(match.parking_id) setPersonalParkingId(String(match.parking_id));
        }
      }
    }).catch(()=>{});
  }, [role, user?.email]);

  // Redirección segura entre vistas al cambiar de rol
  useEffect(() => {
    const validTabsByRole = {
      user: ['dashboard', 'reservations', 'profile', 'vehicles', 'payments', 'incidents', 'history', 'reviews'],
      local: ['dashboard', 'editor', 'reservations', 'profile', 'anpr', 'garita', 'cameras', 'incidents', 'staff', 'reports', 'audit', 'reviews'],
      platform: ['dashboard', 'profile', 'finances', 'settings', 'affiliates', 'reservations', 'analytics', 'incidents', 'audit', 'users', 'vehicles', 'staff', 'reviews', 'resiliency']
    };
    if (!validTabsByRole[role]?.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role]);

  // Filtros de Búsqueda para Conductor
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos'); // 'todos' | 'centro' | 'techados' | 'economicos'
  const [isLoadingSedes, setIsLoadingSedes] = useState(false);

  // Efecto sutil de carga skeleton al cambiar filtros
  const handleFilterChange = (newCat) => {
    setIsLoadingSedes(true);
    setCategoryFilter(newCat);
    setTimeout(() => setIsLoadingSedes(false), 300);
  };

  const handleSearchChange = (val) => {
    setIsLoadingSedes(true);
    setSearchQuery(val);
    setTimeout(() => setIsLoadingSedes(false), 250);
  };

  // Estados de Reserva de Usuario
  const [selectedParkingId, setSelectedParkingId] = useState(null);
  useEffect(()=>{ if(personalParkingId) setSelectedParkingId(personalParkingId); },[personalParkingId]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [activeReservation, setActiveReservation] = useState({
    code: 'RSV-8912',
    token: 'SPK-AYC891-7B2F9A',
    parking: 'Smart Park Plaza Mayor - Planta Baja',
    slot: 'A-01',
    plate: 'ABC-123',
    cost: 10.00,
    hours: 2,
    startTime: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
  });

  // Obtener el establecimiento actualmente seleccionado en tiempo real desde el context
  const selectedParking = establishments.find(e => e.id === selectedParkingId) || null;

  // Reserva de Plaza por Conductor - soporta hold (pago en garita) vs prepago con pasarela de pago
  const handleCustomerBooking = async (bookingData) => {
    if (!selectedParking) return;
    try {
      const newRes = await createReservation({
        parkingId: bookingData.parkingId || selectedParking.id,
        slotId: bookingData.slotId,
        parkingName: bookingData.parkingName || selectedParking.name,
        slotCode: bookingData.slotCode,
        plate: bookingData.plate,
        customerName: 'Conductor Registrado',
        customerPhone: '+51 966 123 456',
        totalCost: bookingData.totalCost,
        hours: bookingData.hours,
        rate: selectedParking.rate,
        startTime: bookingData.startTime,
        expiresAt: bookingData.expiresAt
      });
      if (!newRes || newRes.error) {
        const msg = newRes?.error || bookingError || 'No se pudo crear la reserva. Verifica que el cajón esté libre y tu sesión activa.';
        setBookingFeedback(msg);
        setTimeout(() => setBookingFeedback(null), 6000);
        return;
      }

      const enriched = {
        ...newRes,
        etaMinutes: bookingData.etaMinutes ?? 15,
        arrivalWindow: bookingData.arrivalWindow ?? 15,
        payNow: !!bookingData.payNow,
        paymentMethod: bookingData.paymentMethod || (bookingData.payNow ? 'Prepago asegurado' : 'Pago en garita al salir')
      };

      // Si es "Pagar ahora", desplegar la Pasarela de Pagos (PayPal, Tarjeta Culqi, Yape, Plin)
      if (bookingData.payNow) {
        setPaymentTarget({
          reservationId: newRes.id || newRes.code,
          amount: Number(bookingData.totalCost) || Number((selectedParking.rate * bookingData.hours).toFixed(2)),
          concept: `Reserva ${newRes.code || 'Smart Park'} — Cajón ${newRes.slotCode || bookingData.slotCode} en ${newRes.parkingName || selectedParking.name}`,
          parkingName: newRes.parkingName || selectedParking.name,
          slotCode: newRes.slotCode || bookingData.slotCode || 'A-01',
          customerEmail: user?.email || 'conductor@smartpark.com',
          enrichedData: enriched
        });
      } else {
        // Reservar y pagar en garita al llegar (Hold)
        setActiveReservation(enriched);
        setShowQRModal(true);
        setSelectedParkingId(null);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || bookingError || 'No se pudo crear la reserva. Verifica que el cajón esté libre y tu sesión activa.';
      setBookingFeedback(msg);
      setTimeout(() => setBookingFeedback(null), 4000);
    }
  };

  // Filtrado de establecimientos para la vista Conductor
  const filteredParkings = establishments.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.level && p.level.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'centro') {
      return p.address.toLowerCase().includes('centro') || p.name.toLowerCase().includes('plaza mayor');
    }
    if (categoryFilter === 'techados') {
      const hasShaded = (p.elements || []).some(e => e.type === 'slot' && e.shaded);
      return hasShaded || (p.level && (p.level.toLowerCase().includes('techado') || p.level.toLowerCase().includes('sótano')));
    }
    if (categoryFilter === 'economicos') {
      return Number(p.rate) <= 4.50;
    }
    return true;
  });

  // Cálculos consolidados para el Administrador de Plataforma
  const totalNetworkSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot').length;
  }, 0);

  const totalFreeSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
  }, 0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [pendingParkingForBooking, setPendingParkingForBooking] = useState(null);

  // Manejar selección de cochera con login bajo demanda
  const handleSelectParking = (parking) => {
    if (!user) {
      setPendingParkingForBooking(parking.id);
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setSelectedParkingId(parking.id);
  };

  // Redirección inmediata a Landing Page y reseteo completo de estados al cerrar sesión
  useEffect(() => {
    if (!user) {
      setSelectedParkingId(null);
      setActiveTab('dashboard');
      setShowAuthModal(false);
      setPendingParkingForBooking(null);
    }
  }, [user]);

  // Cerrar modal de autenticación inmediatamente al autenticarse y reanudar selección si aplica
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
      if (pendingParkingForBooking) {
        setSelectedParkingId(pendingParkingForBooking);
        setPendingParkingForBooking(null);
      }
    }
  }, [user, pendingParkingForBooking]);

  // --- Fix botón atrás en móvil: no cerrar la app, navegar dentro del SPA ---
  const lastBackPressRef = React.useRef(0);
  useEffect(() => {
    try { window.history.replaceState({ appTab: activeTab, ts: Date.now() }, ''); } catch {}
  }, []);
  useEffect(() => {
    try { window.history.pushState({ appTab: activeTab, ts: Date.now() }, ''); } catch {}
  }, [activeTab]);
  useEffect(() => {
    if (selectedParkingId) {
      try { window.history.pushState({ appTab: activeTab, parkingId: selectedParkingId }, ''); } catch {}
    }
  }, [selectedParkingId]);
  useEffect(() => {
    const onPopState = () => {
      if (showQRModal) { setShowQRModal(false); try { window.history.pushState({ appTab: activeTab }, ''); } catch {} return; }
      if (showTermsModal) { setShowTermsModal(false); try { window.history.pushState({ appTab: activeTab }, ''); } catch {} return; }
      if (showAuthModal) { setShowAuthModal(false); try { window.history.pushState({ appTab: activeTab }, ''); } catch {} return; }
      if (selectedParkingId) { setSelectedParkingId(null); try { window.history.pushState({ appTab: activeTab }, ''); } catch {} return; }
      if (activeTab !== 'dashboard') { setActiveTab('dashboard'); try { window.history.pushState({ appTab: 'dashboard' }, ''); } catch {} return; }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) return;
      lastBackPressRef.current = now;
      try { window.history.pushState({ appTab: 'dashboard' }, ''); } catch {}
      try {
        const el = document.createElement('div');
        el.textContent = 'Pulsa atrás de nuevo para salir';
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.3)';
        document.body.appendChild(el);
        setTimeout(()=> el.remove(), 1800);
      } catch {}
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeTab, selectedParkingId, showQRModal, showTermsModal, showAuthModal]);

  const handleTabNavigation = (tab) => {
    if (!user && tab !== 'dashboard') {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setActiveTab(tab);
  };

  // Si el usuario no ha iniciado sesión, mostrar SIEMPRE la Landing Page de inicio
  if (!user) {
    return (
      <div className="w-full bg-[#FBFBFA] text-[#191919] font-sans antialiased selection:bg-[#EAEAEA] selection:text-black">
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#0f172a', color: '#fff', fontSize: '13px' } }} />
        
        <LandingPage
          establishments={establishments}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'login');
            setShowAuthModal(true);
          }}
          onSelectParking={handleSelectParking}
          onOpenTerms={() => setShowTermsModal(true)}
        />

        {/* Modal de Autenticación Rápida Bajo Demanda */}
        {showAuthModal && (
          <LoginAuthScreen
            isModal={true}
            onClose={() => setShowAuthModal(false)}
            defaultAuthMode={authModalMode}
          />
        )}

        {/* Modal de Términos y Condiciones */}
        <TermsAndConditionsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070B14] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors">
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#0f172a', color: '#fff', fontSize: '13px' } }} />
      <Navbar 
        onNavigateProfile={() => {
          if (!user) {
            setAuthModalMode('login');
            setShowAuthModal(true);
          } else {
            setActiveTab(prev => prev === 'profile' ? 'dashboard' : 'profile');
          }
        }} 
        onNavigateTab={handleTabNavigation}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setShowAuthModal(true);
        }}
      />

      <div className="flex flex-1">
        {/* BARRA LATERAL (SIDEBAR) */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabNavigation} 
          onOpenTerms={() => setShowTermsModal(true)} 
        />

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto pb-28 md:pb-6 w-full max-w-full overflow-x-hidden min-w-0">
          <Suspense fallback={<LoadingModule />}>
          
          {/* VISTA ROL CONDUCTOR (BUSCAR Y RESERVAR PLAZAS) */}
          {(role === 'user' || !user) && (
            <div className="space-y-6">
              {activeTab === 'dashboard' && (
                <>
                  {/* Banner de Búsqueda Inteligente */}
                  <Card className="p-4 sm:p-5 border-slate-200 bg-white shadow-2xs relative overflow-hidden rounded-2xl">
                    <div className="mb-3">
                      <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                        Estacionamientos Inteligentes en Ayacucho
                      </h1>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Explora en vivo, consulta tarifas y reserva tu plaza en segundos
                      </p>
                    </div>
                    
                    {/* Barra de Búsqueda y Filtros de Categoría */}
                    <div className="space-y-3 relative z-10 pt-1">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="flex-1 relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="Buscar cochera, jirón o avenida..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 h-10 border-slate-200 bg-white shadow-xs text-xs"
                          />
                        </div>
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSearchChange('')}
                            className="text-xs font-bold text-slate-600 h-10 cursor-pointer"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>

                      {/* Filtros Rápidos */}
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none flex-nowrap shrink-0">
                        <span className="text-slate-400 font-bold uppercase text-[10px] pr-1 flex items-center gap-1 shrink-0">
                          <Filter className="w-3 h-3" /> Filtro:
                        </span>
                        <button
                          onClick={() => handleFilterChange('todos')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Todas ({establishments.length})
                        </button>
                        <button
                          onClick={() => handleFilterChange('centro')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'centro' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Centro Histórico
                        </button>
                        <button
                          onClick={() => handleFilterChange('techados')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'techados' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Techadas
                        </button>
                        <button
                          onClick={() => handleFilterChange('economicos')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'economicos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Económicas (≤ S/ 4.50)
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* MAPA INTERACTIVO DE AYACUCHO */}
                  <AyacuchoMap 
                    parkings={establishments}
                    onSelectParking={(parking) => setSelectedParkingId(parking.id)} 
                    selectedParkingId={selectedParkingId} 
                  />

                  {/* VISTA DEL PLANO O LISTADO DE TARJETAS DE SEDES */}
                  {selectedParking ? (
                    /* Vista del Plano Topográfico Interactivo para el Conductor */
                    <div className="space-y-4 animate-in fade-in">
                      {bookingFeedback && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>{bookingFeedback}</span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center space-x-3">
                          <button 
                            type="button"
                            onClick={() => setSelectedParkingId(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver</span>
                          </button>
                          <div>
                            <h2 className="text-sm font-bold text-slate-900 leading-tight">
                              {selectedParking.name}
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                              {selectedParking.address || 'Ayacucho - Huamanga'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-700 font-mono">
                            S/ {(selectedParking.hourly_rate || selectedParking.rate || 5.0).toFixed(2)} / hora
                          </span>
                        </div>
                      </div>

                      <CustomerInteractivePlanBooking 
                        parking={selectedParking} 
                        planElements={selectedParking.elements || []}
                        onReserveSlot={handleCustomerBooking}
                      />
                    </div>
                  ) : (
                    /* Grid de Tarjetas de Estacionamientos Disponibles con Skeleton Loader */
                    <div className="space-y-3">
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        <span>Sedes de Estacionamiento Registradas ({filteredParkings.length})</span>
                      </h2>

                      {isLoadingSedes ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                          {[...Array(6)].map((_, i) => (
                            <SkeletonParkingCard key={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredParkings.map((p) => {
                            const elements = p.elements || [];
                            const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
                            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
                            const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;

                            return (
                              <Card key={p.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                                <div>
                                  <div className="h-44 relative overflow-hidden bg-slate-100">
                                    <img 
                                      src={p.image || FALLBACK_PARKING_IMAGE} 
                                      alt={p.name} 
                                      referrerPolicy="no-referrer"
                                      crossOrigin="anonymous"
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                                      }}
                                    />
                                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-800 shadow-sm border border-slate-200">
                                      S/ {Number(p.rate).toFixed(2)}/h
                                    </div>
                                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                                      {freeSlots} Libres de {totalSlots}
                                    </div>
                                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                      {p.level}
                                    </div>
                                  </div>

                                  <div className="p-5 space-y-3">
                                    <div>
                                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">{p.name}</h3>
                                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> 
                                        <span className="truncate">{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                                      </p>
                                    </div>

                                    {/* Contacto & WhatsApp */}
                                    {(p.whatsapp || p.phone) && (
                                      <div className="flex items-center space-x-2 text-xs pt-0.5">
                                        {p.whatsapp && (
                                          <a
                                            href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=Hola,%20solicito%20informaci%C3%B3n%20sobre%20el%20estacionamiento%20${encodeURIComponent(p.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>WhatsApp</span>
                                          </a>
                                        )}
                                        {p.phone && (
                                          <span className="text-[11px] text-slate-500 font-mono inline-flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{p.phone}</span>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="p-5 pt-0 space-y-2.5">


                                  <Button 
                                    onClick={() => handleSelectParking(p)} 
                                    className="w-full font-bold gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer py-2.5 rounded-xl"
                                  >
                                    <span>Ver Plano & Reservar</span>
                                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reservations' && (
                <ReservationsModule 
                  onNavigateToBooking={() => {
                    setSelectedParkingId(null);
                    setActiveTab('dashboard');
                  }} 
                />
              )}

              {activeTab === 'profile' && <UserProfileModule onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'vehicles' && <VehiclesModule />}
              {activeTab === 'payments' && <PaymentsModule />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'history' && <HistoryModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN LOCAL */}
          {role === 'local' && (
            <div className="space-y-6">
              {(activeTab === 'dashboard' || activeTab === 'editor') && !isPersonalStaff && (
                <LocalEstablishmentManager />
              )}
              {isPersonalStaff && (activeTab === 'dashboard' || activeTab === 'editor') && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600"/> Mapa de Sedes — Solo lectura</h2>
                      <p className="text-xs text-slate-500">Vista del personal: consulta ubicación, tarifa y ocupación en vivo. Edición solo Admin Local.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">Personal</span>
                  </div>
                  {/* Solo mapa del parking del establecimiento para el trabajador */}
                  {(() => {
                    const est = establishments.find(e=>String(e.id)===String(selectedParkingId)) || establishments[0];
                    if(!est) return <div className="p-6 text-center text-xs text-slate-500">Sin sede asignada</div>;
                    const free=(est.elements||[]).filter(e=>e.type==='slot' && e.status==='free').length;
                    const total=(est.elements||[]).filter(e=>e.type==='slot').length || 0;
                    const occupied=total-free;
                    return (
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isPersonalStaff ? (
                              <span className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800">Sede asignada: {est.name} — S/ {Number(est.rate).toFixed(2)}/h</span>
                            ) : (
                              <select value={est.id} onChange={e=>setSelectedParkingId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none">
                                {establishments.map(p=> <option key={p.id} value={p.id}>{p.name} — S/ {Number(p.rate).toFixed(2)}/h</option>)}
                              </select>
                            )}
                            <span className="text-xs font-mono font-bold text-emerald-700">{free} libres / {occupied} ocupados</span>
                          </div>
                          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">{isPersonalStaff ? 'Asignada' : 'Solo Lectura'}</span>
                        </div>
                        <AutoFitFloorPlan elements={est.elements} name={est.name} />
                        <p className="text-[11px] text-center text-slate-500">Para registrar entradas/salidas usa <b>Garita → Walk-in</b> (toca un cajón libre en el mapa de arriba) o <b>Scanner</b>.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {activeTab === 'reservations' && <ReservationsModule />}
              {activeTab === 'profile' && <UserProfileModule />}
              {(activeTab === 'anpr' || activeTab === 'garita') && (isPersonalStaff ? <PersonalGaritaModule /> : <ANPRMonitor />)}
              {activeTab === 'cameras' && (isPersonalStaff ? <CameraMonitorModule readOnly /> : <CameraMonitorModule />)}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'staff' && !isPersonalStaff && <StaffModule />}
              {activeTab === 'staff' && isPersonalStaff && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">Solo el Admin Local gestiona el personal.</div>}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
              {activeTab === 'resiliency' && !isPersonalStaff && <ResiliencySimModule />}
              {activeTab === 'reports' && !isPersonalStaff && <AnalyticsGlobalModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN PLATAFORMA */}
          {role === 'platform' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'dashboard' && (
                <PlatformGlobalDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'cameras' && <CameraMonitorModule />}
              {activeTab === 'profile' && <UserProfileModule />}
              {activeTab === 'finances' && <PlatformFinancesModule />}
              {activeTab === 'settings' && <PlatformSettingsModule />}
              {activeTab === 'affiliates' && <AffiliatedParkingsModule />}
              {activeTab === 'reservations' && <ReservationsModule />}
              {activeTab === 'analytics' && <AnalyticsGlobalModule />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'users' && <UserRolesModule />}
              {activeTab === 'vehicles' && <VehiclesModule />}
              {activeTab === 'staff' && <StaffModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
              {activeTab === 'resiliency' && <ResiliencySimModule />}
            </div>
          )}

          </Suspense>
        </main>
      </div>

      {/* Modal de Pase Digital QR */}
      <DigitalAccessPassModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        reservation={activeReservation}
      />

      {/* Modal de Pasarela de Pagos (PayPal, Culqi, Yape, Plin, PagoEfectivo) */}
      <CulqiPaymentModal
        isOpen={!!paymentTarget}
        onClose={() => {
          if (paymentTarget) {
            setActiveReservation(paymentTarget.enrichedData);
            setShowQRModal(true);
            setSelectedParkingId(null);
            setPaymentTarget(null);
          }
        }}
        amount={Number(paymentTarget?.amount || 10.00)}
        concept={paymentTarget?.concept || 'Reserva Smart Park'}
        parkingName={paymentTarget?.parkingName || 'Smart Park'}
        slotCode={paymentTarget?.slotCode || 'A-01'}
        customerEmail={paymentTarget?.customerEmail || user?.email || 'conductor@smartpark.com'}
        reservationId={paymentTarget?.reservationId}
        onPaymentSuccess={(receipt) => {
          if (paymentTarget) {
            const paidEnriched = {
              ...paymentTarget.enrichedData,
              status: 'confirmed',
              payNow: true,
              paymentMethod: receipt?.paymentMethod || 'Culqi / PayPal (Pagado)'
            };
            setActiveReservation(paidEnriched);
            setShowQRModal(true);
            setSelectedParkingId(null);
            setPaymentTarget(null);
          }
        }}
      />

      {/* Modal de Términos y Condiciones */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Modal de Autenticación Rápida Bajo Demanda */}
      {showAuthModal && (
        <LoginAuthScreen
          isModal={true}
          onClose={() => setShowAuthModal(false)}
          defaultAuthMode={authModalMode}
        />
      )}
    </div>
  );
};
