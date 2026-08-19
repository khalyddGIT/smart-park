import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useEstablishments } from './context/EstablishmentContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LocalEstablishmentManager } from './components/LocalEstablishmentManager';
import { ANPRMonitor } from './components/ANPRMonitor';
import { PaymentsModule } from './components/PaymentsModule';
import { VehiclesModule } from './components/VehiclesModule';
import { HistoryModule } from './components/HistoryModule';
import { ReviewsModule } from './components/ReviewsModule';
import { AffiliatedParkingsModule } from './components/AffiliatedParkingsModule';
import { UserRolesModule } from './components/UserRolesModule';
import { StaffModule } from './components/StaffModule';
import { AnalyticsGlobalModule } from './components/AnalyticsGlobalModule';
import { IncidentsModule } from './components/IncidentsModule';
import { LoyaltyClubModule } from './components/LoyaltyClubModule';
import { AuditLogsModule } from './components/AuditLogsModule';
import { ResiliencySimModule } from './components/ResiliencySimModule';
import { AyacuchoMap } from './components/AyacuchoMap';
import { CustomerInteractivePlanBooking } from './components/CustomerInteractivePlanBooking';
import { DigitalAccessPassModal } from './components/DigitalAccessPassModal';
import { ReservationsModule } from './components/ReservationsModule';
import { LoginAuthScreen } from './components/LoginAuthScreen';
import { PlatformFinancesModule } from './components/PlatformFinancesModule';
import { PlatformSettingsModule } from './components/PlatformSettingsModule';
import { PlatformGlobalDashboard } from './components/PlatformGlobalDashboard';
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
  Bike
} from 'lucide-react';

import { Card, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { SkeletonParkingCard } from './components/ui/skeleton';

export const App = () => {
  const { role, user } = useAuth();
  const { establishments, occupySlot, createReservation } = useEstablishments();
  const [activeTab, setActiveTab] = useState('dashboard');

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
  const [showQRModal, setShowQRModal] = useState(false);
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

  // Reserva de Plaza por Conductor sobre el Plano Topográfico
  const handleCustomerBooking = (bookingData) => {
    if (!selectedParking) return;

    // 1. Crear la reserva en el contexto global persistente
    const newRes = createReservation({
      parkingId: selectedParking.id,
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

    // 2. Establecer la reserva activa y abrir el modal con el QR y token ANPR
    setActiveReservation(newRes);
    setShowQRModal(true);
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

  // Si no hay sesión activa, renderizar la pantalla de Login y Registro
  if (!user) {
    return <LoginAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#0f172a', color: '#fff', fontSize: '13px' } }} />
      <Navbar />

      <div className="flex flex-1">
        {/* BARRA LATERAL (SIDEBAR) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          
          {/* VISTA ROL CONDUCTOR (BUSCAR Y RESERVAR PLAZAS) */}
          {role === 'user' && (
            <div className="space-y-6">
              {activeTab === 'dashboard' && (
                <>
                  {/* Banner de Búsqueda Inteligente */}
                  <Card className="p-5 sm:p-6 border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm relative overflow-hidden">
                    <div className="mb-3">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Estacionamientos en Ayacucho
                      </h1>
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
                      <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedParkingId(null)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 gap-1.5 cursor-pointer"
                        >
                          ← Volver al Listado de Todas las Sedes
                        </Button>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                          Sede Activa: {selectedParking.name}
                        </span>
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
                            const pmrSlots = elements.filter(e => e.type === 'slot' && e.slotType === 'pmr').length;
                            const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;

                            return (
                              <Card key={p.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                                <div>
                                  <div className="h-44 relative overflow-hidden bg-slate-100">
                                    <img 
                                      src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                                      alt={p.name} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
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
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> 
                                        <span>{p.address} • {p.city || 'Huamanga'}</span>
                                      </p>
                                    </div>

                                    {/* Distintivos de Servicios */}
                                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1">
                                      {pmrSlots > 0 && (
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 font-bold flex items-center gap-0.5">
                                          <Accessibility className="w-3 h-3" /> {pmrSlots} PMR
                                        </span>
                                      )}
                                      {shadedSlots > 0 && (
                                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 font-bold flex items-center gap-0.5">
                                          <Umbrella className="w-3 h-3" /> {shadedSlots} Techados
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-5 pt-0">
                                  <Button 
                                    onClick={() => setSelectedParkingId(p.id)} 
                                    className="w-full font-bold gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer"
                                  >
                                    <span>Ver Estacionamiento & Reservar</span>
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

              {activeTab === 'loyalty' && <LoyaltyClubModule />}
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
              {(activeTab === 'dashboard' || activeTab === 'editor') && (
                <LocalEstablishmentManager />
              )}
              {activeTab === 'reservations' && <ReservationsModule />}
              {(activeTab === 'anpr' || activeTab === 'garita') && <ANPRMonitor />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'staff' && <StaffModule />}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
              {activeTab === 'resiliency' && <ResiliencySimModule />}
              {activeTab === 'reports' && <AnalyticsGlobalModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN PLATAFORMA */}
          {role === 'platform' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'dashboard' && (
                <PlatformGlobalDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'finances' && <PlatformFinancesModule />}
              {activeTab === 'settings' && <PlatformSettingsModule />}
              {activeTab === 'affiliates' && <AffiliatedParkingsModule />}
              {activeTab === 'reservations' && <ReservationsModule />}
              {activeTab === 'analytics' && <AnalyticsGlobalModule />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'users' && <UserRolesModule />}
              {activeTab === 'staff' && <StaffModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
              {activeTab === 'resiliency' && <ResiliencySimModule />}
            </div>
          )}

        </main>
      </div>

      {/* Modal de Pase Digital QR */}
      <DigitalAccessPassModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        reservation={activeReservation}
      />
    </div>
  );
};
