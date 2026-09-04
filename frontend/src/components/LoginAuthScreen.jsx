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
  Send,
  FileCheck2,
  X,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BrandLogo } from './BrandLogo';
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

  // 'login' | 'register' | 'affiliation' | 'forgot_password'
  const [authMode, setAuthMode] = useState(defaultAuthMode);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

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
    loginWithEmail(loginEmail.trim(), loginPassword).catch(err => {
      setErrorMsg(err?.message || 'No se pudo iniciar sesión');
    });
  };

  // Submit Registro Conductor
  const handleDriverRegister = (e) => {
    e.preventDefault();
    if (!driverName.trim() || !driverEmail.trim()) {
      setErrorMsg('Por favor completa tu nombre y correo');
      return;
    }
    if (!driverPassword || driverPassword.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!hasAcceptedTerms) {
      setErrorMsg('Debes aceptar los Términos y Condiciones para crear tu cuenta');
      setShowTermsModal(true);
      return;
    }
    setErrorMsg('');
    registerUser({
      name: driverName.trim(),
      email: driverEmail.trim(),
      phone: driverPhone.trim() || '+51 966 000 000',
      plate: (driverPlate.trim() || 'ABC-123').toUpperCase(),
      password: driverPassword
    }).catch(err => {
      setErrorMsg(err?.message || 'No se pudo completar el registro');
    });
  };

  // Submit Solicitud de Afiliación
  const handleAffiliationSubmit = (e) => {
    e.preventDefault();
    if (!reqParkingName.trim() || !reqOwnerName.trim() || !reqEmail.trim()) {
      setErrorMsg('Por favor completa el nombre de cochera, propietario y correo');
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
      setAuthMode('login');
      // Reset campos
      setReqParkingName('');
      setReqOwnerName('');
      setReqEmail('');
      setReqPhone('');
      setReqAddress('');
      setReqNotes('');
    }, 3500);
  };

  const screenContent = (
    <div className={`${isModal ? 'w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6' : 'min-h-screen p-4 sm:p-6 lg:p-8'} bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between items-center relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white`}>
      

      {/* Fondo con brillo sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-100/60 dark:from-emerald-950/30 via-slate-100/40 dark:via-transparent to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[400px] h-[200px] bg-teal-100/40 dark:bg-teal-950/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Header / Brand */}
      <div className="relative z-10 pt-2 sm:pt-4 flex flex-col items-center text-center space-y-1 bg-transparent">
        <BrandLogo className="h-10 sm:h-11 w-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1 bg-transparent">
          Gestión y Reserva de Estacionamientos
        </p>
      </div>

      {/* Tarjeta Central de Autenticación */}
      <main className="w-full max-w-[440px] my-auto relative z-10 py-3">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/60 dark:shadow-black/50 space-y-5">
          
          {/* Tabs principales para Conductor/Usuario: Iniciar Sesión | Crear Cuenta */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md font-extrabold scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-semibold'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md font-extrabold scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-semibold'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* Alertas de error y éxito */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 text-center flex items-center justify-center space-x-2 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 text-center flex items-center justify-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* =========================================================================
              MODO 1: INICIAR SESIÓN (USUARIOS / CONDUCTORES / ADMINS LOCALES)
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
                <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
                <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">o con tu correo y contraseña</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
              </div>

              {/* Formulario Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10.5 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); }}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
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
                      className="pl-10 pr-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10.5 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/25 mt-1 transition cursor-pointer"
                >
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 text-white" />
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
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Registro de Conductor</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Reserva plazas garantizadas en tiempo real</p>
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
                <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
                <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">o con tu correo</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
              </div>

              <form onSubmit={handleDriverRegister} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Nombre Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      required
                      placeholder="Nombres y Apellidos"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="pl-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="usuario@correo.com"
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      className="pl-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Celular</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      placeholder="+51 987 654 321"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="pl-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                  />
                </div>

                <label className="flex items-start gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-800/60 cursor-pointer select-none border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={hasAcceptedTerms}
                    onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                    He leído y acepto los{' '}
                    <button
                      type="button"
                      onClick={(ev) => { ev.preventDefault(); setShowTermsModal(true); }}
                      className="text-emerald-600 dark:text-emerald-400 font-bold underline hover:text-emerald-500 cursor-pointer"
                    >
                      Términos y Condiciones
                    </button>
                    {' '}y la Política de Privacidad (Ley N° 29733).
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={!hasAcceptedTerms}
                  className="w-full h-10.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/25 mt-1 cursor-pointer"
                >
                  <span>Registrarme como Conductor</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 text-white" />
                </Button>
              </form>
            </div>
          )}

          {/* =========================================================================
              MODO 3: SOLICITUD DE AFILIACIÓN DE ESTACIONAMIENTO / COCHERA
              ========================================================================= */}
          {authMode === 'affiliation' && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Solicitud de Afiliación de Cochera</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Envía tus datos para habilitar tu cuenta de Admin Local</p>
              </div>

              {reqSuccess ? (
                <div className="py-6 text-center space-y-3 animate-fade-in bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">¡Solicitud Enviada con Éxito!</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    El Super Admin ha recibido los datos de tu establecimiento. Una vez aprobada la solicitud, podrás iniciar sesión con tu correo.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAffiliationSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Nombre Comercial del Estacionamiento *</label>
                    <Input
                      type="text"
                      required
                      placeholder="Nombre del Establecimiento"
                      value={reqParkingName}
                      onChange={(e) => setReqParkingName(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Propietario / Responsable *</label>
                      <Input
                        type="text"
                        required
                        placeholder="Nombres y Apellidos"
                        value={reqOwnerName}
                        onChange={(e) => setReqOwnerName(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Correo Electrónico *</label>
                      <Input
                        type="email"
                        required
                        placeholder="contacto@cochera.com"
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp / Teléfono</label>
                      <Input
                        type="tel"
                        placeholder="+51 966 123 456"
                        value={reqPhone}
                        onChange={(e) => setReqPhone(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Dirección del Local</label>
                      <Input
                        type="text"
                        placeholder="Jr. 28 de Julio 340"
                        value={reqAddress}
                        onChange={(e) => setReqAddress(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Plazas Estimadas</label>
                      <Input
                        type="number"
                        min="1"
                        value={reqCapacity}
                        onChange={(e) => setReqCapacity(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Tarifa Sugerida / h (S/)</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        value={reqRate}
                        onChange={(e) => setReqRate(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs h-10 font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 mt-1 cursor-pointer"
                  >
                    <Send className="w-4 h-4 ml-1 text-white mr-1.5" />
                    <span>Enviar Solicitud de Afiliación</span>
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* =========================================================================
              MODO 4: RECUPERAR CONTRASEÑA
              ========================================================================= */}
          {authMode === 'forgot_password' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Recuperar Contraseña</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa tu correo para recibir un PIN temporal</p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setSuccessMsg('Código enviado a tu correo.');
                }} 
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Correo Electrónico</label>
                  <Input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs h-10.5"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <span>Enviar Enlace</span>
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 pt-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </div>
          )}

          {/* Botón inferior dinámico para alternar entre Afiliación e Iniciar Sesión */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            {authMode === 'affiliation' ? (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center mx-auto space-x-1.5 transition cursor-pointer"
              >
                <span>¿Ya tienes tu cuenta de cochera habilitada?</span>
                <span className="text-emerald-600 dark:text-emerald-400 underline font-extrabold">Iniciar Sesión</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthMode('affiliation')}
                className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center space-x-2 group cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>¿Administras una cochera? Solicitar Afiliación</span>
              </button>
            )}
          </div>

        </div>
      </main>

      {/* Footer minimalista con enlace a Términos y Condiciones */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 dark:text-slate-400 space-x-2">
        <span>Smart-Park Enterprise &copy; 2026 &bull; Ayacucho, Perú</span>
        <span>&bull;</span>
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold underline cursor-pointer"
        >
          Términos y Condiciones
        </button>
      </footer>

      {/* Modal de Términos y Condiciones — solo al crear cuenta o bajo demanda desde footer */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setHasAcceptedTerms(true)}
        initialAccepted={hasAcceptedTerms}
      />

    </div>
  );

  if (isModal) {
    return (
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      >
        <div className="relative z-[10000] w-full max-w-lg my-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-[10001] p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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

