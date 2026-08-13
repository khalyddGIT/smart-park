import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FloorPlanEditor } from './components/FloorPlanEditor';
import { ANPRMonitor } from './components/ANPRMonitor';
import { PaymentsModule } from './components/PaymentsModule';
import { VehiclesModule } from './components/VehiclesModule';
import { HistoryModule } from './components/HistoryModule';
import { ReviewsModule } from './components/ReviewsModule';
import { AffiliatedParkingsModule } from './components/AffiliatedParkingsModule';
import { UserRolesModule } from './components/UserRolesModule';
import { AnalyticsGlobalModule } from './components/AnalyticsGlobalModule';
import { ResiliencySimModule } from './components/ResiliencySimModule';
import { AyacuchoMap } from './components/AyacuchoMap';
import { ProfessionalTerrainEditor } from './components/ProfessionalTerrainEditor';
import { Search, MapPin, QrCode, Car, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';

export const App = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estados de Usuario
  const [selectedParking, setSelectedParking] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeReservation, setActiveReservation] = useState(null);

  // Datos de Estacionamientos en Ayacucho (Huamanga)
  const parkings = [
    {
      id: 1,
      name: 'Smart Park Plaza Mayor Ayacucho',
      address: 'Portal Unión 42, Centro Histórico',
      city: 'Ayacucho - Huamanga',
      rate: 5.00,
      available: 14,
      total: 25,
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'
    },
    {
      id: 2,
      name: 'Smart Park Jr. 28 de Julio',
      address: 'Jr. 28 de Julio 350',
      city: 'Ayacucho - Huamanga',
      rate: 4.50,
      available: 8,
      total: 20,
      image: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800'
    },
    {
      id: 3,
      name: 'Smart Park Av. Independencia',
      address: 'Av. Independencia 520',
      city: 'Ayacucho - Huamanga',
      rate: 6.00,
      available: 20,
      total: 40,
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800'
    }
  ];

  const handleReserveSlot = (slotCode) => {
    setSelectedSlot(slotCode);
    const newRes = {
      code: `RSV-${Math.floor(1000 + Math.random() * 9000)}`,
      parking: selectedParking.name,
      slot: slotCode,
      plate: 'ABC-123',
      cost: selectedParking.rate * 2,
      qr: `SMARTPARK-${slotCode}-ABC123`
    };
    setActiveReservation(newRes);
    setShowQRModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <div className="flex flex-1">
        {/* BARRA LATERAL (SIDEBAR) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          {/* VISTA ROL USUARIO CONDUCTOR */}
          {role === 'user' && (
            <div className="max-w-7xl mx-auto space-y-8">
              {activeTab === 'dashboard' && (
                <>
                  {/* Banner de Búsqueda */}
                  <Card className="p-8 border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="success" className="gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Sistema en Vivo
                      </Badge>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Encuentra tu Estacionamiento Ideal</h1>
                    <p className="text-xs text-slate-500 mb-6 max-w-2xl">Búsqueda en tiempo real, reserva directa sobre plano 2D interactivo y acceso automatizado mediante QR o lectura ANPR.</p>
                    
                    <div className="flex flex-col md:flex-row gap-3 relative z-10">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Buscar por distrito, avenida o nombre del local..."
                          className="pl-10 h-10 border-slate-200"
                        />
                      </div>
                      <Button size="lg" className="px-6 font-black shadow-emerald-600/20">
                        Buscar Disponibles
                      </Button>
                    </div>
                  </Card>

                  {/* Mapa Interactivo de Ayacucho (Huamanga) */}
                  {!selectedParking && (
                    <AyacuchoMap parkings={parkings} onSelectParking={(p) => setSelectedParking(p)} />
                  )}

                  {/* Listado de Parqueos */}
                  {!selectedParking ? (
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 mb-4">Estacionamientos Destacados Cercanos</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {parkings.map(p => (
                          <Card key={p.id} className="overflow-hidden border-slate-200/80 hover:border-emerald-500/50 hover:shadow-lg transition group">
                            <div className="h-48 overflow-hidden relative">
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                              <Badge className="absolute top-3 right-3 bg-emerald-600 text-white font-black px-3 py-1 shadow-md text-xs">
                                S/ {p.rate.toFixed(2)} / hr
                              </Badge>
                            </div>
                            <CardHeader className="p-6 pb-2">
                              <CardTitle className="text-lg font-extrabold">{p.name}</CardTitle>
                              <CardDescription className="flex items-center text-slate-500 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1" /> {p.address}, {p.city}
                              </CardDescription>
                            </CardHeader>
                            <CardFooter className="p-6 pt-4 flex justify-between items-center border-t border-slate-100">
                              <Badge variant="success" className="font-bold">
                                {p.available} plazas libres
                              </Badge>
                              <Button
                                onClick={() => setSelectedParking(p)}
                                variant="default"
                                className="font-bold gap-1"
                              >
                                <span>Ver Plano & Reservar</span>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Vista de Selección de Plano 2D para Cliente */
                    <div className="space-y-4">
                      <Button
                        variant="link"
                        onClick={() => setSelectedParking(null)}
                        className="p-0 font-bold text-emerald-700"
                      >
                        ← Volver a lista de estacionamientos
                      </Button>
                      <Card className="p-6">
                        <CardHeader className="p-0 mb-4">
                          <CardTitle>{selectedParking.name}</CardTitle>
                          <CardDescription>Haz clic sobre un cajón verde libre para reservarlo inmediatamente.</CardDescription>
                        </CardHeader>

                        <div className="bg-slate-100/70 border border-slate-200 rounded-3xl p-8 min-h-[300px] flex items-center justify-center relative shadow-inner">
                          <div className="grid grid-cols-4 gap-4">
                            {['A-01', 'A-02', 'A-03', 'A-04', 'B-01', 'B-02', 'B-03', 'B-04'].map((code, idx) => {
                              const isFree = idx % 2 === 0;
                              return (
                                <Button
                                  key={code}
                                  disabled={!isFree}
                                  variant={isFree ? "outline" : "secondary"}
                                  onClick={() => handleReserveSlot(code)}
                                  className={`w-20 h-28 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center space-y-2 transition shadow-sm ${
                                    isFree
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100 hover:scale-105'
                                      : 'bg-rose-50 border-rose-200 text-rose-500 cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <span>{code}</span>
                                  <Car className="w-5 h-5" />
                                  <Badge variant={isFree ? "success" : "destructive"} className="text-[8px] px-1.5 py-0">
                                    {isFree ? 'Libre' : 'Ocupado'}
                                  </Badge>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reservations' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-black text-slate-900">Mis Reservas & Pases Digitales</h1>
                  <Card className="p-6 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="success">Reserva Activa</Badge>
                        <span className="text-xs font-mono text-slate-400">RSV-8912</span>
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-900">Smart Park Central San Isidro</h3>
                      <p className="text-xs text-slate-500">Cajón Asignado: <span className="font-bold text-emerald-700 font-mono">A-01</span> | Placa: <span className="font-bold text-slate-700 font-mono">ABC-123</span></p>
                    </div>
                    <Button onClick={() => {
                      setActiveReservation({
                        code: 'RSV-8912',
                        parking: 'Smart Park Central San Isidro',
                        slot: 'A-01',
                        plate: 'ABC-123',
                        cost: 17.00,
                        qr: 'SMARTPARK-A-01-ABC123'
                      });
                      setShowQRModal(true);
                    }} className="font-bold gap-2">
                      <QrCode className="w-4 h-4" />
                      <span>Ver Código QR</span>
                    </Button>
                  </Card>
                </div>
              )}

              {activeTab === 'vehicles' && <VehiclesModule />}
              {activeTab === 'payments' && <PaymentsModule />}
              {activeTab === 'history' && <HistoryModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN LOCAL */}
          {role === 'local' && (
            <div className="space-y-6">
              {activeTab === 'dashboard' && <FloorPlanEditor />}
              {activeTab === 'editor' && <ProfessionalTerrainEditor />}
              {(activeTab === 'anpr' || activeTab === 'garita') && <ANPRMonitor />}
              {activeTab === 'staff' && (
                <div className="max-w-7xl mx-auto space-y-6">
                  <h1 className="text-2xl font-black text-slate-900">Gestión de Personal de Garita</h1>
                  <Card className="p-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-base">Juan Pérez (Operador Garita)</h3>
                      <p className="text-xs text-slate-500">Turno: Mañana | DNI: 44556677</p>
                    </div>
                    <Badge variant="success">Activo</Badge>
                  </Card>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="max-w-7xl mx-auto space-y-6">
                  <h1 className="text-2xl font-black text-slate-900">Reportes de Afluencia del Local</h1>
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-6">
                      <p className="text-xs font-bold text-slate-400 uppercase">Vehículos Ingresados Hoy</p>
                      <p className="text-3xl font-black text-emerald-600 mt-1">142 Vehículos</p>
                    </Card>
                    <Card className="p-6">
                      <p className="text-xs font-bold text-slate-400 uppercase">Recaudación Garita</p>
                      <p className="text-3xl font-black text-teal-600 mt-1">S/ 1,840.00</p>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISTA ROL ADMIN PLATAFORMA */}
          {role === 'platform' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-black text-slate-900">Panel Consolidado de la Red Smart Park</h1>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                      <CardDescription className="uppercase font-extrabold text-[10px] text-slate-400">Ingresos Globales Hoy</CardDescription>
                      <p className="text-3xl font-black text-emerald-600 mt-2">S/ 12,450.00</p>
                    </Card>
                    <Card className="p-6">
                      <CardDescription className="uppercase font-extrabold text-[10px] text-slate-400">Locales Afiliados Activos</CardDescription>
                      <p className="text-3xl font-black text-teal-600 mt-2">42 Locales</p>
                    </Card>
                    <Card className="p-6">
                      <CardDescription className="uppercase font-extrabold text-[10px] text-slate-400">Ocupación Media Red</CardDescription>
                      <p className="text-3xl font-black text-amber-600 mt-2">78.5%</p>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'affiliates' && <AffiliatedParkingsModule />}
              {activeTab === 'users' && <UserRolesModule />}
              {activeTab === 'analytics' && <AnalyticsGlobalModule />}
              {activeTab === 'resiliency' && <ResiliencySimModule />}
            </div>
          )}
        </main>
      </div>

      {/* Modal de Pase Digital QR */}
      {showQRModal && activeReservation && (
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <QrCode className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">¡Reserva Confirmada!</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Muestra este código QR en el tótem de entrada o utiliza la barrera ANPR.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-900 p-4 rounded-2xl inline-block my-2 shadow-md mx-auto">
              <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center text-slate-900 font-mono text-xs font-bold p-2 text-center border-4 border-emerald-500">
                [QR CODE SMART PARK]
                <br />
                {activeReservation.code}
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-700 font-mono my-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p>Código: <span className="font-bold text-slate-900">{activeReservation.code}</span></p>
              <p>Cajón: <span className="text-emerald-700 font-bold">{activeReservation.slot}</span></p>
              <p>Placa: <span className="text-teal-700 font-bold">{activeReservation.plate}</span></p>
              <p>Monto Estimado: <span className="text-amber-700 font-bold">S/ {activeReservation.cost.toFixed(2)}</span></p>
            </div>

            <Button onClick={() => setShowQRModal(false)} className="w-full font-black">
              Cerrar y Ver Mis Reservas
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
