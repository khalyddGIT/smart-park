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
  Award
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardDescription } from './ui/card';

export const LoginAuthScreen = () => {
  const { loginWithGoogle, loginWithEmail, registerUser, registerEstablishmentAdmin } = useAuth();
  const { addEstablishment } = useEstablishments();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register_user' | 'register_admin'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados Formulario Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('user');

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

  // Handler Login
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMsg('Ingresa tu correo electrónico');
      return;
    }
    setErrorMsg('');
    loginWithEmail(loginEmail, loginPassword, loginRole);
  };

  // Handler Registro Conductor
  const handleDriverRegister = (e) => {
    e.preventDefault();
    if (!driverName.trim() || !driverEmail.trim()) {
      setErrorMsg('Por favor, completa los campos requeridos');
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
      setErrorMsg('Por favor, completa la información de tu establecimiento');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0B1120] to-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans text-slate-100">
      
      {/* Luces de fondo arquitectónicas */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Contenedor Principal */}
      <div className="w-full max-w-xl relative z-10 space-y-6">
        
        {/* Cabecera & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 border border-slate-800 shadow-xl mb-1 ring-4 ring-slate-900/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-tech uppercase">
            SMART-PARK
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Plataforma Inteligente de Gestión de Estacionamientos, Reconocimiento LPR y Reserva de Plazas CAD.
          </p>
        </div>

        {/* Pestañas de Selección: Login | Conductor | Admin Cochera */}
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 grid grid-cols-3 gap-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'login' 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register_user'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'register_user' 
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Conductor</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register_admin'); setErrorMsg(''); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'register_admin' 
                ? 'bg-amber-400 text-slate-950 font-black shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Afiliar Cochera</span>
          </button>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300 text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* ============================================================
            PESTAÑA 1: INICIAR SESIÓN (GOOGLE + CORREO + ACCESOS DEMO)
            ============================================================ */}
        {activeTab === 'login' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            
            {/* Botón Oficial de Google */}
            <div className="space-y-2 text-center">
              <span className="text-[11px] font-bold uppercase text-slate-400 font-tech block">Acceso Rápido Seguro</span>
              <div className="flex justify-center py-1">
                <GoogleLogin
                  onSuccess={(res) => loginWithGoogle(res)}
                  onError={() => setErrorMsg('Error al conectar con Google')}
                  size="large"
                  shape="pill"
                  text="signin_with"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 my-3">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[10px] uppercase font-bold text-slate-500 font-tech">O ingresa con tus credenciales</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            {/* Formulario Correo y Contraseña */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    required
                    placeholder="ejemplo@smartpark.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
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
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              {/* Selector de Perfil al Entrar */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Entrar como</label>
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="user">🚗 Conductor (Reservas & Pases QR)</option>
                  <option value="local">🏢 Administrador de Establecimiento</option>
                  <option value="platform">🌐 Administrador Global de Plataforma</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 mt-2"
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Accesos Directos de Prueba (1-Clic) */}
            <div className="border-t border-slate-800/80 pt-4 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-tech block text-center">Acceso Rápido por Perfil:</span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => loginWithEmail('conductor@smartpark.com', '1234', 'user')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-center transition"
                >
                  🚗 Conductor
                </button>
                <button
                  type="button"
                  onClick={() => loginWithEmail('operador@smartpark.com', '1234', 'local')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 text-center transition"
                >
                  🏢 Admin Cochera
                </button>
                <button
                  type="button"
                  onClick={() => loginWithEmail('admin@smartpark.com', '1234', 'platform')}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-center transition"
                >
                  🌐 Super Admin
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================
            PESTAÑA 2: REGISTRO DE CONDUCTOR
            ============================================================ */}
        {activeTab === 'register_user' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <span>Registro Gratuito de Conductor</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Reserva plazas garantizadas y accede con lectura automática de placa.</p>
            </div>

            <form onSubmit={handleDriverRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Yoniver Choque"
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Teléfono / WhatsApp</label>
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Placa de Vehículo Principal</label>
                  <div className="relative">
                    <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="ABC-123"
                      value={driverPlate}
                      onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                      className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10 font-mono uppercase font-black"
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
                className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 mt-2"
              >
                <span>Crear Cuenta de Conductor</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 3: AFILIAR COCHERA / CUENTA ADMINISTRADOR
            ============================================================ */}
        {activeTab === 'register_admin' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Afiliación y Software para Estacionamientos</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Digitaliza tu cochera con control de accesos LPR, tarifas y plano CAD.</p>
            </div>

            <form onSubmit={handleAdminRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nombre Comercial de la Cochera / Estacionamiento *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Cochera San Juan - Centro"
                    value={estName}
                    onChange={(e) => setEstName(e.target.value)}
                    className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nombre del Propietario / Gerente *</label>
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico de Contacto *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="email"
                      required
                      placeholder="administrador@cochera.com"
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
                      placeholder="Jr. Asamblea 120"
                      value={estAddress}
                      onChange={(e) => setEstAddress(e.target.value)}
                      className="pl-10 bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ciudad / Región</label>
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Capacidad Estimada (Plazas)</label>
                  <Input
                    type="number"
                    min="1"
                    value={estCapacity}
                    onChange={(e) => setEstCapacity(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tarifa Sugerida por Hora (PEN)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    value={estRate}
                    onChange={(e) => setEstRate(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-white rounded-xl text-xs h-10 font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-400/20 mt-2"
              >
                <span>🚀 Registrar Cochera y Activar Software</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
