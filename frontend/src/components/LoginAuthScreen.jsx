import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import { GoogleLogin } from '@react-oauth/google';
import { 
  Building2, 
  Car, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  Camera, 
  QrCode, 
  LayoutDashboard,
  ShieldCheck,
  Star,
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
  KeyRound,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export const LoginAuthScreen = () => {
  const { loginWithGoogle, loginWithEmail, registerUser, registerEstablishmentAdmin } = useAuth();
  const { addEstablishment } = useEstablishments();

  // Estado del flujo principal: 'login' | 'register_driver' | 'register_parking' | 'forgot_password'
  const [view, setView] = useState('login');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoProfiles, setShowDemoProfiles] = useState(false);

  // Estados Formulario Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados Formulario Conductor
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverPassword, setDriverPassword] = useState('');

  // Estados Formulario Admin Cochera
  const [estName, setEstName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [estAddress, setEstAddress] = useState('');
  const [estCity, setEstCity] = useState('Ayacucho - Huamanga');
  const [estCapacity, setEstCapacity] = useState('35');
  const [estRate, setEstRate] = useState('5.00');
  const [adminPassword, setAdminPassword] = useState('');

  // Handler Login
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMsg('Ingresa tu correo electrónico');
      return;
    }
    setErrorMsg('');
    loginWithEmail(loginEmail.trim(), loginPassword);
  };

  // Handler Registro Conductor
  const handleDriverRegister = (e) => {
    e.preventDefault();
    if (!driverName.trim() || !driverEmail.trim()) {
      setErrorMsg('Por favor completa tu nombre y correo');
      return;
    }
    setErrorMsg('');
    registerUser({
      name: driverName.trim(),
      email: driverEmail.trim(),
      phone: driverPhone.trim() || '+51 966 000 000',
      plate: (driverPlate.trim() || 'ABC-123').toUpperCase()
    });
  };

  // Handler Registro Admin Cochera
  const handleAdminRegister = (e) => {
    e.preventDefault();
    if (!estName.trim() || !ownerName.trim() || !adminEmail.trim()) {
      setErrorMsg('Por favor completa los datos principales de tu cochera');
      return;
    }
    setErrorMsg('');

    const newEstId = `EST-${Date.now().toString().slice(-4)}`;
    
    // Crear el nuevo establecimiento en el contexto
    addEstablishment({
      id: newEstId,
      name: estName.trim(),
      address: estAddress.trim() || 'Centro Histórico',
      city: estCity.trim() || 'Ayacucho - Huamanga',
      level: 'Nivel 1 - Superficie',
      rate: Number(estRate) || 5.0,
      status: 'Operativo',
      owner: ownerName.trim(),
      commission: '10%',
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
      elements: [
        { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
        { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
        { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
        { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
        { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
        { id: 6, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 7, type: 'slot', code: 'A-02', slotType: 'auto', x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 8, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'free' }
      ]
    });

    // Iniciar sesión como Admin Local
    registerEstablishmentAdmin({
      ownerName: ownerName.trim(),
      email: adminEmail.trim(),
      phone: adminPhone.trim(),
      establishmentName: estName.trim(),
      address: estAddress.trim(),
      capacity: estCapacity
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Luces volumétricas de fondo */}
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/[0.03] rounded-full blur-[160px] pointer-events-none" />

      {/* Grid de Fondo Tech */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '28px 28px' 
        }} 
      />

      {/* Contenedor Principal Split (Hero Visual Izquierdo + Formulario Derecho) */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* =========================================================================
            COLUMNA IZQUIERDA: HERO VISUAL & SHOWCASE TECNOLÓGICO (Desktop)
            ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          
          {/* Logo & Marca */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-xl font-black tracking-wider text-white font-tech uppercase block">
                  SMART-PARK
                </span>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase font-mono block -mt-0.5">
                  ENTERPRISE PLATFORM
                </span>
              </div>
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {view === 'register_parking' ? (
                <>Digitaliza tu cochera con <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">control inteligente LPR y planos CAD</span></>
              ) : view === 'register_driver' ? (
                <>Encuentra y reserva tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">estacionamiento garantizado en segundos</span></>
              ) : (
                <>Accede al sistema de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400">estacionamientos y reservas en tiempo real</span></>
              )}
            </h2>
            
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              {view === 'register_parking'
                ? 'Afíliate a la mayor red de estacionamientos. Administra tus plazas, tarifa por hora, garitas automáticas y liquidación de caja en tiempo real.'
                : view === 'register_driver'
                ? 'Regístrate para reservar plazas sobre el mapa topográfico interactivo de Ayacucho y accede sin tickets físicos mediante reconocimiento de placa.'
                : 'Plataforma unificada para conductores que buscan plazas y propietarios que gestionan cocheras inteligentes con tecnología ANPR.'}
            </p>
          </div>

          {/* Tarjeta de Monitoreo en Vivo ANPR */}
          <div className="p-5 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 font-tech">Garita ANPR en Línea</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                0.28s LPR Speed
              </Badge>
            </div>

            {/* Simulación de lectura de placa */}
            <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Detección de Entrada</div>
                  <div className="text-sm font-black font-mono text-white tracking-widest">AYC-9821</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-emerald-400 font-bold">ACCESO CONCEDIDO</div>
                <div className="text-[10px] text-slate-400">Reserva Activa A-04</div>
              </div>
            </div>

            {/* Métricas clave */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/50">
                <div className="text-base font-black text-emerald-400 font-mono">99.8%</div>
                <div className="text-[10px] text-slate-400 font-medium">Precisión LPR</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/50">
                <div className="text-base font-black text-cyan-400 font-mono">100%</div>
                <div className="text-[10px] text-slate-400 font-medium">Cloud Serverless</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/50">
                <div className="text-base font-black text-amber-400 font-mono">0 Papel</div>
                <div className="text-[10px] text-slate-400 font-medium">Pase Digital QR</div>
              </div>
            </div>
          </div>

          {/* Badges de confianza */}
          <div className="flex items-center space-x-6 text-xs text-slate-400 font-medium pt-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Google Cloud Auth</span>
            </div>
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Pase QR Dinámico</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Multi-Cocheras</span>
            </div>
          </div>

        </div>

        {/* =========================================================================
            COLUMNA DERECHA: TARJETA DINÁMICA DE AUTENTICACIÓN
            ========================================================================= */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          
          {/* Logo móvil */}
          <div className="flex lg:hidden flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 mb-2">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                  <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-black text-white font-tech uppercase tracking-wider">SMART-PARK</h1>
            <p className="text-xs text-slate-400">Gestión Inteligente de Estacionamientos</p>
          </div>

          {/* Tarjeta Principal */}
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            
            {/* Mensajes de feedback */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs font-bold text-rose-300 text-center animate-fade-in flex items-center justify-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-300 text-center animate-fade-in flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* =========================================================================
                VISTA 1: INICIAR SESIÓN (Limpio y Estándar)
                ========================================================================= */}
            {view === 'login' && (
              <div className="space-y-5 animate-fade-in">
                
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white tracking-tight">Iniciar Sesión</h2>
                  <p className="text-xs text-slate-400">Ingresa a tu cuenta para gestionar tus reservas o cocheras</p>
                </div>

                {/* Botón Oficial Google */}
                <div className="flex justify-center pt-1">
                  <GoogleLogin
                    onSuccess={(res) => loginWithGoogle(res)}
                    onError={() => setErrorMsg('Error al conectar con Google. Verifica tus credenciales.')}
                    size="large"
                    shape="pill"
                    text="signin_with"
                    theme="filled_black"
                  />
                </div>

                {/* Divisor */}
                <div className="flex items-center space-x-3 my-2">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-tech">O con tu correo</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                {/* Formulario de Login */}
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-11 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => { setView('forgot_password'); setErrorMsg(''); }}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 transition"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-11 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 mt-2 transition duration-200"
                  >
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>

                {/* Bloque de Nuevos Registros (Conductor & Cochera) */}
                <div className="border-t border-slate-800/80 pt-4 space-y-3">
                  <div className="text-center text-xs text-slate-400">
                    ¿No tienes una cuenta aún?
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setView('register_driver'); setErrorMsg(''); }}
                      className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 text-left transition group space-y-1"
                    >
                      <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-bold">
                        <Car className="w-3.5 h-3.5" />
                        <span>Soy Conductor</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">Reservar plazas y pases QR</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setView('register_parking'); setErrorMsg(''); }}
                      className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition group space-y-1"
                    >
                      <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Tengo Cochera</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">Software y control LPR</p>
                    </button>
                  </div>
                </div>

                {/* Accesos Rápidos de Prueba (Colapsable / Discreto) */}
                <div className="border-t border-slate-800/50 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDemoProfiles(!showDemoProfiles)}
                    className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-300 transition py-1"
                  >
                    <span className="flex items-center gap-1.5 font-mono">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Probar perfiles de demostración (1-Clic)</span>
                    </span>
                    <span className="text-[10px] font-bold">{showDemoProfiles ? '▲ Ocultar' : '▼ Ver'}</span>
                  </button>

                  {showDemoProfiles && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/60 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => loginWithEmail('conductor@smartpark.com', '1234', 'user')}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-xs font-bold text-center transition"
                      >
                        🚗 Conductor
                      </button>
                      <button
                        type="button"
                        onClick={() => loginWithEmail('operador@smartpark.com', '1234', 'local')}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 text-xs font-bold text-center transition"
                      >
                        🏢 Cochera
                      </button>
                      <button
                        type="button"
                        onClick={() => loginWithEmail('admin@smartpark.com', '1234', 'platform')}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-400 text-xs font-bold text-center transition"
                      >
                        🌐 Super Admin
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* =========================================================================
                VISTA 2: REGISTRO DE CONDUCTOR
                ========================================================================= */}
            {view === 'register_driver' && (
              <div className="space-y-5 animate-fade-in">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Registro de Conductor</h2>
                      <p className="text-[11px] text-slate-400">Acceso a mapa y reservas automáticas</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setErrorMsg(''); }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>
                </div>

                <form onSubmit={handleDriverRegister} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Nombre y Apellidos *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez Huamán"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico *</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="email"
                          required
                          placeholder="correo@ejemplo.com"
                          value={driverEmail}
                          onChange={(e) => setDriverEmail(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp / Celular</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="tel"
                          placeholder="+51 966 123 456"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Placa de Vehículo</label>
                      <div className="relative">
                        <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="text"
                          placeholder="ABC-123"
                          value={driverPlate}
                          onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-cyan-400 rounded-xl text-xs h-10 font-mono uppercase font-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={driverPassword}
                          onChange={(e) => setDriverPassword(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-400/20 mt-2"
                  >
                    <span>Completar Registro y Empezar</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setErrorMsg(''); }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    ¿Ya tienes una cuenta? <span className="text-cyan-400 font-bold underline underline-offset-2">Inicia sesión aquí</span>
                  </button>
                </div>

              </div>
            )}

            {/* =========================================================================
                VISTA 3: AFILIACIÓN DE COCHERA / ESTACIONAMIENTO
                ========================================================================= */}
            {view === 'register_parking' && (
              <div className="space-y-5 animate-fade-in">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Afiliación de Estacionamiento</h2>
                      <p className="text-[11px] text-slate-400">Activa el software en la nube para tu local</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setErrorMsg(''); }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>
                </div>

                <form onSubmit={handleAdminRegister} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Nombre Comercial de la Cochera *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="text"
                        required
                        placeholder="Ej. Cochera San Cristóbal - Centro"
                        value={estName}
                        onChange={(e) => setEstName(e.target.value)}
                        className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Nombre del Propietario *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="text"
                          required
                          placeholder="Ej. Carlos Mendoza"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Correo de Administración *</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="email"
                          required
                          placeholder="admin@cochera.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Dirección del Local</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          type="text"
                          placeholder="Jr. 28 de Julio 340"
                          value={estAddress}
                          onChange={(e) => setEstAddress(e.target.value)}
                          className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Ciudad</label>
                      <Input
                        type="text"
                        value={estCity}
                        onChange={(e) => setEstCity(e.target.value)}
                        className="bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Plazas Totales Estimadas</label>
                      <Input
                        type="number"
                        min="1"
                        value={estCapacity}
                        onChange={(e) => setEstCapacity(e.target.value)}
                        className="bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Tarifa Sugerida / Hora (S/)</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        value={estRate}
                        onChange={(e) => setEstRate(e.target.value)}
                        className="bg-slate-950/80 border-slate-800 text-amber-400 font-bold rounded-xl text-xs h-10 font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-400/20 mt-2"
                  >
                    <span>🚀 Activar Cochera y Abrir Software</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setErrorMsg(''); }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    ¿Ya registraste tu cochera? <span className="text-amber-400 font-bold underline underline-offset-2">Inicia sesión aquí</span>
                  </button>
                </div>

              </div>
            )}

            {/* =========================================================================
                VISTA 4: RECUPERACIÓN DE CONTRASEÑA
                ========================================================================= */}
            {view === 'forgot_password' && (
              <div className="space-y-5 animate-fade-in">
                
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Recuperar Contraseña</h2>
                  <p className="text-xs text-slate-400">Ingresa tu correo para recibir un enlace de restablecimiento</p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSuccessMsg('Hemos enviado las instrucciones a tu correo.');
                    setTimeout(() => {
                      setView('login');
                      setSuccessMsg('');
                    }, 2500);
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Correo Registrado</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                  >
                    <span>Enviar Enlace de Recuperación</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setErrorMsg(''); }}
                    className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a Iniciar Sesión</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
