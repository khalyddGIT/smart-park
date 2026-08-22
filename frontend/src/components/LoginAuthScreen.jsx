import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import { GoogleLogin } from '@react-oauth/google';
import { 
  Building2, 
  Car, 
  CheckCircle2, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  KeyRound,
  Zap,
  Send,
  FileCheck2,
  X,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';

export const LoginAuthScreen = ({ isModal = false, onClose = null, defaultAuthMode = 'login' }) => {
  const { user, loginWithGoogle, loginWithEmail, registerUser } = useAuth();
  const { createAffiliationRequest } = useEstablishments();

  // Cerrar modal automáticamente si ya existe una sesión de usuario activa
  useEffect(() => {
    if (user && isModal && onClose) {
      onClose();
    }
  }, [user, isModal, onClose]);

  // 'login' | 'register' | 'forgot_password'
  const [authMode, setAuthMode] = useState(defaultAuthMode);
  const [showAffiliationModal, setShowAffiliationModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados Formulario Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados Formulario Registro Conductor
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverPassword, setDriverPassword] = useState('');

  // Estados Formulario Solicitud de Afiliación de Cochera
  const [reqParkingName, setReqParkingName] = useState('');
  const [reqOwnerName, setReqOwnerName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [reqCity, setReqCity] = useState('Ayacucho - Huamanga');
  const [reqCapacity, setReqCapacity] = useState('30');
  const [reqRate, setReqRate] = useState('5.00');
  const [reqNotes, setReqNotes] = useState('');
  const [reqSuccess, setReqSuccess] = useState(false);

  // Submit Login
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico');
      return;
    }
    setErrorMsg('');
    loginWithEmail(loginEmail.trim(), loginPassword);
  };

  // Submit Registro Conductor
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

  // Submit Solicitud de Afiliación
  const handleAffiliationSubmit = (e) => {
    e.preventDefault();
    if (!reqParkingName.trim() || !reqOwnerName.trim() || !reqEmail.trim()) {
      return;
    }

    createAffiliationRequest({
      parkingName: reqParkingName.trim(),
      ownerName: reqOwnerName.trim(),
      email: reqEmail.trim(),
      phone: reqPhone.trim(),
      address: reqAddress.trim() || 'Centro Histórico',
      city: reqCity.trim() || 'Ayacucho - Huamanga',
      capacity: Number(reqCapacity) || 25,
      rate: Number(reqRate) || 5.0,
      notes: reqNotes.trim()
    });

    setReqSuccess(true);
    setTimeout(() => {
      setReqSuccess(false);
      setShowAffiliationModal(false);
      // Reset campos
      setReqParkingName('');
      setReqOwnerName('');
      setReqEmail('');
      setReqPhone('');
      setReqAddress('');
      setReqNotes('');
    }, 3000);
  };

  const screenContent = (
    <div className={`${isModal ? 'w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6' : 'min-h-screen p-4 sm:p-6 lg:p-8'} bg-slate-50/70 text-slate-800 flex flex-col justify-between items-center relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white`}>
      
      {/* Botón de cerrar modal si está en modo modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Fondo con brillo sutil y elegante en tema claro */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-100/60 via-slate-100/40 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[400px] h-[200px] bg-teal-100/40 rounded-full blur-[90px] pointer-events-none" />

      {/* Header / Brand acorde al Navbar del sistema */}
      <header className="relative z-10 pt-2 sm:pt-4 flex flex-col items-center text-center space-y-1.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 font-tech uppercase">
            SMART-PARK
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Plataforma Integral de Gestión y Reserva de Estacionamientos
        </p>
      </header>

      {/* Tarjeta Central de Autenticación */}
      <main className="w-full max-w-[420px] my-auto relative z-10 py-4">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-5">
          
          {/* Segmented Control / Tabs: Login vs Registro de Conductor */}
          {authMode !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`py-2 rounded-xl transition-all duration-150 ${
                  authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                className={`py-2 rounded-xl transition-all duration-150 ${
                  authMode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* Alertas de error y éxito */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 text-center flex items-center justify-center space-x-2 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 text-center flex items-center justify-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* =========================================================================
              MODO 1: INICIAR SESIÓN (USUARIOS / CONDUCTORES / ADMINS)
              ========================================================================= */}
          {authMode === 'login' && (
            <div className="space-y-4">
              
              {/* Botón Google */}
              <div className="flex justify-center pt-1">
                <GoogleLogin
                  onSuccess={(res) => loginWithGoogle(res)}
                  onError={() => setErrorMsg('Error al conectar con Google.')}
                  size="large"
                  shape="pill"
                  text="signin_with"
                  theme="outline"
                  width="100%"
                />
              </div>

              {/* Divisor */}
              <div className="flex items-center space-x-3 my-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] text-slate-400 font-medium">o con tu correo</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Formulario Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10.5 focus:bg-white focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); }}
                      className="text-[11px] text-slate-500 hover:text-emerald-600 transition"
                    >
                      ¿La olvidaste?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10.5 focus:bg-white focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm mt-1 transition"
                >
                  <span>Ingresar</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 text-emerald-400" />
                </Button>
              </form>

            </div>
          )}

          {/* =========================================================================
              MODO 2: REGISTRO DE CONDUCTOR
              ========================================================================= */}
          {authMode === 'register' && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <h3 className="text-sm font-black text-slate-900">Registro de Conductor</h3>
                <p className="text-[11px] text-slate-500">Reserva plazas garantizadas en tiempo real</p>
              </div>

              {/* Botón Google Registro */}
              <div className="flex justify-center pt-1">
                <GoogleLogin
                  onSuccess={(res) => loginWithGoogle(res)}
                  onError={() => setErrorMsg('Error al conectar con Google.')}
                  size="large"
                  shape="pill"
                  text="signup_with"
                  theme="outline"
                  width="100%"
                />
              </div>

              {/* Divisor */}
              <div className="flex items-center space-x-3 my-1">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] text-slate-400 font-medium">o con tu correo</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <form onSubmit={handleDriverRegister} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nombre Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="pl-10 bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      className="pl-10 bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Celular</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      placeholder="+51 987 654 321"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="pl-10 bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    className="bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm mt-2 cursor-pointer"
                >
                  <span>Registrarme como Conductor</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 text-emerald-400" />
                </Button>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed pt-1">
                  Al registrarte, aceptas nuestros{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer"
                  >
                    Términos y Condiciones
                  </button>{' '}
                  y Política de Privacidad (Ley N° 29733).
                </p>
              </form>
            </div>
          )}

          {/* =========================================================================
              MODO 3: RECUPERAR CONTRASEÑA
              ========================================================================= */}
          {authMode === 'forgot_password' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Recuperar Contraseña</h3>
                <p className="text-xs text-slate-500">Ingresa tu correo para recibir un PIN temporal</p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setSuccessMsg('Código enviado a tu correo.');
                }} 
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Correo Electrónico</label>
                  <Input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-slate-50/80 border-slate-200 text-slate-900 rounded-xl text-xs h-10.5"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  <span>Enviar Enlace</span>
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5 pt-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </div>
          )}

          {/* =========================================================================
              SECCIÓN SOLICITAR REGISTRO DE ESTACIONAMIENTO
              ========================================================================= */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <div className="text-[11px] text-slate-500">
              ¿Administras o eres dueño de una cochera?
            </div>
            <button
              type="button"
              onClick={() => setShowAffiliationModal(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center justify-center space-x-2 group shadow-2xs cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Solicitar Afiliación de Estacionamiento</span>
            </button>
          </div>



        </div>
      </main>

      {/* Footer minimalista con enlace a Términos y Condiciones */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 space-x-2">
        <span>Smart-Park Enterprise &copy; 2026 &bull; Ayacucho, Perú</span>
        <span>&bull;</span>
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-slate-600 hover:text-emerald-700 font-bold underline cursor-pointer"
        >
          Términos y Condiciones
        </button>
      </footer>

      {/* =========================================================================
          MODAL: SOLICITUD DE AFILIACIÓN DE ESTACIONAMIENTO
          ========================================================================= */}
      {showAffiliationModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Solicitud de Afiliación de Cochera</h3>
                  <p className="text-xs text-slate-500">Envía tus datos para que el administrador habilite tu cuenta</p>
                </div>
              </div>
              <button
                onClick={() => setShowAffiliationModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estado de Éxito al Enviar */}
            {reqSuccess ? (
              <div className="py-8 text-center space-y-3 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <FileCheck2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black text-slate-900">¡Solicitud Enviada con Éxito!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  El Administrador del Sistema ha recibido los datos de tu establecimiento. Una vez aprobada la solicitud, se habilitará tu cuenta con tu correo para que gestiones tu cochera.
                </p>
              </div>
            ) : (
              /* Formulario de Solicitud */
              <form onSubmit={handleAffiliationSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nombre Comercial del Estacionamiento *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Cochera San Cristóbal"
                    value={reqParkingName}
                    onChange={(e) => setReqParkingName(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Propietario / Responsable *</label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej. Roberto Quispe"
                      value={reqOwnerName}
                      onChange={(e) => setReqOwnerName(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Correo Electrónico *</label>
                    <Input
                      type="email"
                      required
                      placeholder="contacto@cochera.com"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">WhatsApp / Teléfono</label>
                    <Input
                      type="tel"
                      placeholder="+51 966 123 456"
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Ciudad / Distrito</label>
                    <Input
                      type="text"
                      value={reqCity}
                      onChange={(e) => setReqCity(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Dirección del Local</label>
                  <Input
                    type="text"
                    placeholder="Jr. 28 de Julio 340"
                    value={reqAddress}
                    onChange={(e) => setReqAddress(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Plazas Estimadas</label>
                    <Input
                      type="number"
                      min="1"
                      value={reqCapacity}
                      onChange={(e) => setReqCapacity(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs h-10 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Tarifa Sugerida / h (S/)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      value={reqRate}
                      onChange={(e) => setReqRate(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-emerald-700 font-bold rounded-xl text-xs h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Descripción o notas adicionales</label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Cochera techada, cámaras de seguridad, portón levadizo..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs p-2.5 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Al enviar la solicitud, declaras ser titular o representante facultado del inmueble y aceptas los{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer"
                  >
                    Términos y Condiciones para Cocheras
                  </button>.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAffiliationModal(false)}
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100 text-xs h-10.5 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10.5 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    <span>Enviar Solicitud</span>
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Modal de Términos y Condiciones */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

    </div>
  );

  if (isModal) {
    return (
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      >
        <div className="relative z-[10000] w-full max-w-xl my-8 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-[10001] p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {screenContent}
        </div>
      </div>
    );
  }

  return screenContent;
};
