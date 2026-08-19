import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Car, 
  Award, 
  CheckCircle2, 
  Save, 
  Lock, 
  Camera, 
  Key, 
  Bell, 
  MapPin, 
  Calendar,
  CreditCard,
  History,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400'
];

export const UserProfileModule = () => {
  const { user, setUser, role } = useAuth();
  const { reservations } = useEstablishments();

  // Estado del formulario de perfil
  const [formData, setFormData] = useState({
    name: user?.name || 'Carlos Mendoza',
    email: user?.email || 'carlos.mendoza@smartpark.pe',
    phone: user?.phone || '+51 966 123 456',
    dni: user?.dni || '72458912',
    address: user?.address || 'Jr. 28 de Julio 340, Huamanga',
    plate: user?.plate || 'ABC-123',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    notifyEmail: true,
    notifyWhatsapp: true,
    autoGateOpen: true
  });

  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'preferences'

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dni: formData.dni.trim(),
      address: formData.address.trim(),
      plate: formData.plate.toUpperCase().trim(),
      avatar: formData.avatar
    };

    setUser(updatedUser);
    try {
      localStorage.setItem('smart_park_user_session', JSON.stringify(updatedUser));
    } catch (err) {}

    showToast('✓ Datos de perfil actualizados exitosamente.');
  };

  const completedStays = reservations.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header de Perfil */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center space-x-4">
            
            {/* Avatar con selector de foto */}
            <div className="relative group">
              <img
                src={formData.avatar}
                alt={formData.name}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-slate-200 shadow-md group-hover:opacity-90 transition"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 p-1.5 rounded-xl border border-slate-800 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Info Básica */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{formData.name}</h1>
                <span className="text-emerald-800 font-mono text-[11px] font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Cuenta Verificada
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                <span>{formData.email}</span>
                <span>•</span>
                <span className="font-bold text-slate-700 capitalize">Rol: {role}</span>
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                <span>Nivel Smart Club: <strong className="text-emerald-700 font-bold">Oro</strong></span>
                <span>•</span>
                <span className="font-mono">Placa: <strong className="text-slate-900 font-bold">{formData.plate}</strong></span>
              </div>
            </div>

          </div>

          <Button
            onClick={handleSaveProfile}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-md shadow-emerald-600/20 h-10 px-5"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Actividad */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estancias Completadas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900">{completedStays + 5}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              Histórico
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Puntos Smart Club</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-700">1,250 PTS</span>
            <span className="text-xs text-amber-700 font-bold">Nivel 2</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vehículos Vinculados</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-800">3 Autos</span>
            <span className="text-xs text-slate-400">LPR Activo</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Método de Cobro Principal</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-slate-900 font-mono">VISA •••• 4242</span>
            <span className="text-xs text-emerald-700 font-bold">Activa</span>
          </div>
        </Card>
      </div>

      {/* Pestañas de Navegación del Perfil */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'general' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-emerald-600" />
          <span>Datos Personales & Contacto</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'security' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-emerald-600" />
          <span>Seguridad & Acceso Garita</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'preferences' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>Notificaciones & Preferencias</span>
        </button>
      </div>

      {/* Formulario Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario según Tab */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: DATOS PERSONALES */}
          {activeTab === 'general' && (
            <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Información del Conductor / Usuario</h3>
                <p className="text-xs text-slate-500">Datos registrados para reservas y emisión de comprobantes electrónicos.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10 text-xs h-10 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Documento de Identidad (DNI / CE) *</label>
                    <Input
                      required
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      className="text-xs font-mono font-bold h-10"
                      placeholder="72458912"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 text-xs h-10 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10 text-xs font-mono h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Dirección Habitual</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="pl-10 text-xs h-10"
                        placeholder="Jr. 28 de Julio 340, Huamanga"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Placa Vehicular Principal</label>
                    <div className="relative">
                      <Car className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        value={formData.plate}
                        onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                        className="pl-10 text-xs font-mono font-black h-10 uppercase"
                        placeholder="ABC-123"
                      />
                    </div>
                  </div>
                </div>

                {/* Selección de Avatar */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-700 block mb-2">Elegir Avatar de Perfil:</label>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: av })}
                        className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                          formData.avatar === av ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img src={av} alt="Preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-6">
                    <Save className="w-4 h-4 mr-1.5" />
                    <span>Guardar Datos Personales</span>
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: SEGURIDAD */}
          {activeTab === 'security' && (
            <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Seguridad & Credenciales</h3>
                <p className="text-xs text-slate-500">Configura tu PIN de seguridad y autorización para garitas.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">PIN de Acceso Operativo (Garitas)</h4>
                      <p className="text-[11px] text-slate-500">Código de 4 dígitos para autorizar cambios en ventanilla.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200">
                    •••• (Activo)
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">Autenticación Biométrica / Google</h4>
                      <p className="text-[11px] text-slate-500">{user?.isGoogleAuth ? 'Vinculado con cuenta Google' : 'Acceso mediante credenciales locales'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    Protegido
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: PREFERENCIAS */}
          {activeTab === 'preferences' && (
            <Card className="p-6 bg-white rounded-3xl border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Notificaciones & Automatización</h3>
                <p className="text-xs text-slate-500">Personaliza tus avisos de entrada, expiración y apertura de barrera.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Avisos por WhatsApp al reservar o ingresar</p>
                    <p className="text-[10px] text-slate-500">Envío instantáneo de pase digital con QR a tu número.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifyWhatsapp}
                    onChange={(e) => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Apertura automática de barrera con LPR</p>
                    <p className="text-[10px] text-slate-500">Permite a las cámaras abrir la garita al detectar tu placa {formData.plate}.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoGateOpen}
                    onChange={(e) => setFormData({ ...formData, autoGateOpen: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Envío de Boletas Electrónicas por Correo</p>
                    <p className="text-[10px] text-slate-500">Comprobante fiscal en PDF al finalizar cada estancia.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>
              </div>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Tarjeta Visual de Credencial */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-emerald-400">
                CREDENCIAL DIGITAL SMART-PARK
              </span>
              <span className="text-[9px] font-mono text-slate-400">ID: SPK-2026-USR</span>
            </div>

            <div className="flex items-center space-x-3.5">
              <img
                src={formData.avatar}
                alt="Avatar"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-md"
              />
              <div>
                <h4 className="font-extrabold text-sm text-white">{formData.name}</h4>
                <p className="text-[11px] font-mono text-slate-400">{formData.dni}</p>
                <div className="mt-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-mono font-bold inline-block border border-emerald-500/30">
                  ESTADO: ACTIVO
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Placa Autorizada:</span>
                <span className="text-amber-400 font-bold">{formData.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría:</span>
                <span className="text-white font-bold capitalize">{role}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 text-center font-mono">
              Válido en todos los estacionamientos Smart Park de Ayacucho.
            </div>
          </div>

          <Card className="p-4 bg-slate-50 border-slate-200 rounded-3xl space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">¿Necesitas ayuda con tu cuenta?</span>
            <p className="text-slate-500 text-[11px]">
              Comunícate con soporte de plataforma para solicitar cambio de titular o asistencia con facturación.
            </p>
          </Card>
        </div>

      </div>

    </div>
  );
};
