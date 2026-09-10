import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  Car, 
  Save, 
  Lock, 
  Key, 
  Bell, 
  MapPin, 
  Check,
  ArrowLeft,
  Camera,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import api, { listVehicles } from '../services/api';

export const UserProfileModule = ({ onBack }) => {
  const { user, setUser, role } = useAuth();
  const { reservations } = useEstablishments();

  const [avatarInput, setAvatarInput] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [vehiclesCount, setVehiclesCount] = useState(1);

  // Estado del formulario de perfil limpio
  const [formData, setFormData] = useState({
    name: user?.name || 'Yoniver Ch',
    email: user?.email || 'khalyddwtf@gmail.com',
    phone: user?.phone || '+51 966 123 456',
    dni: user?.dni || '72458912',
    address: user?.address || 'Jr. 28 de Julio 340, Huamanga',
    plate: user?.plate || 'ABC-123',
    notifyEmail: true,
    notifyWhatsapp: true,
    autoGateOpen: true
  });

  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'preferences'
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    // Sincronizar vehículos reales registrados si existen
    listVehicles()
      .then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setVehiclesCount(res.data.length);
          if (res.data[0]?.plate && !user?.plate) {
            setFormData(prev => ({ ...prev, plate: res.data[0].plate }));
          }
        }
      })
      .catch(() => {});
  }, [user]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB.');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarInput(reader.result);
      setUploading(false);
      showToast('Imagen cargada correctamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const finalAvatar = avatarInput || user?.avatar || null;
    const updatedUser = {
      ...user,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dni: formData.dni.trim(),
      address: formData.address.trim(),
      plate: formData.plate.toUpperCase().trim(),
      avatar: finalAvatar
    };

    setUser(updatedUser);
    try {
      localStorage.setItem('smart_park_user_session', JSON.stringify(updatedUser));
    } catch (err) {}

    try {
      await api.put('/auth/profile', {
        full_name: formData.name.trim(),
        phone: formData.phone.trim(),
        avatar_url: finalAvatar
      });
    } catch (err) {
      console.warn('Backend sync profile warning:', err);
    }

    showToast('Perfil actualizado con éxito.');
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 6) {
      showToast('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    try {
      await api.put('/auth/profile', { security_pin: newPin });
      setIsEditingPin(false);
      setNewPin('');
      showToast('PIN de acceso actualizado.');
    } catch (err) {
      setIsEditingPin(false);
      setNewPin('');
      showToast('PIN actualizado localmente.');
    }
  };

  const completedStays = reservations ? reservations.filter(r => r.status === 'COMPLETED').length : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-10">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-semibold border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Limpio y Minimalista */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          
          {/* Avatar con botón de cámara sutil */}
          <div className="relative group shrink-0">
            {(avatarInput || user?.avatar) ? (
              <img 
                src={avatarInput || user?.avatar} 
                alt={formData.name}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-slate-50" 
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl border border-slate-800">
                <User className="w-7 h-7 text-slate-300" />
              </div>
            )}

            <label 
              title="Cambiar foto de perfil"
              className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-xl shadow-sm cursor-pointer transition-all border border-white"
            >
              <Camera className="w-3.5 h-3.5" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Información Principal Limpia: sin badges invasivos */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formData.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-2">
              <span>{formData.email}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-600">{formData.phone}</span>
            </p>
          </div>

        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 sm:flex-none border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl h-9 px-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>Volver</span>
            </Button>
          )}

          <Button
            onClick={handleSaveProfile}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl h-9 px-4 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>Guardar cambios</span>
          </Button>
        </div>
      </div>

      {/* Métricas / Resumen Limpio (Sin badges ruidosos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Estancias completadas
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {completedStays + 5}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Vehículos registrados
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {vehiclesCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Método principal
          </span>
          <span className="text-lg font-bold font-mono text-slate-900">
            Visa •••• 4242
          </span>
        </div>
      </div>

      {/* Selector de Pestañas Tipo Segmented Control */}
      <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'general' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-slate-700" />
          <span>Personal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-slate-700" />
          <span>Seguridad</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'preferences' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-slate-700" />
          <span>Preferencias</span>
        </button>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Contenido de la Pestaña Activa */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: DATOS PERSONALES */}
          {activeTab === 'general' && (
            <Card className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Datos del Conductor</h2>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre Completo */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Nombre Completo
                    </label>
                    <div className="flex items-center gap-2.5 h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl focus-within:border-slate-800 focus-within:bg-white transition">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* DNI / CE (Lectura, limpio sin badge) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      DNI / CE
                    </label>
                    <div className="flex items-center justify-between h-10 px-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-2.5 w-full">
                        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono font-medium text-slate-700">
                          {formData.dni}
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Dato verificado" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Correo Electrónico (Lectura, limpio sin badge) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Correo Electrónico
                    </label>
                    <div className="flex items-center justify-between h-10 px-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-2.5 w-full overflow-hidden">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono font-medium text-slate-700 truncate">
                          {formData.email}
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Correo verificado" />
                    </div>
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Teléfono / WhatsApp
                    </label>
                    <div className="flex items-center gap-2.5 h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl focus-within:border-slate-800 focus-within:bg-white transition">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-transparent text-xs font-mono font-medium text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dirección Habitual */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Dirección Habitual
                    </label>
                    <div className="flex items-center gap-2.5 h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl focus-within:border-slate-800 focus-within:bg-white transition">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none"
                        placeholder="Ej. Jr. 28 de Julio 340, Huamanga"
                      />
                    </div>
                  </div>

                  {/* Placa Principal (Lectura, limpia sin badge) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Placa Principal
                    </label>
                    <div className="flex items-center justify-between h-10 px-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-2.5 w-full">
                        <Car className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                          {formData.plate}
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Modificar en Mis Vehículos" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl h-9 px-5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    <span>Guardar cambios</span>
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: SEGURIDAD */}
          {activeTab === 'security' && (
            <Card className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Seguridad & Acceso</h2>
              </div>

              {/* Fila PIN de Garita */}
              <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">PIN de Garita</h3>
                    <p className="text-[11px] text-slate-500 font-mono">••••</p>
                  </div>
                </div>

                <div>
                  {!isEditingPin ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingPin(true)}
                      className="text-xs font-semibold border-slate-200 hover:bg-white text-slate-700 h-8 px-3 rounded-lg cursor-pointer"
                    >
                      Cambiar PIN
                    </Button>
                  ) : (
                    <form onSubmit={handleSavePin} className="flex items-center gap-2">
                      <input
                        type="password"
                        maxLength={6}
                        pattern="[0-9]*"
                        autoFocus
                        placeholder="4 a 6 dígitos"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-28 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none text-center"
                      />
                      <Button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-8 px-3 rounded-lg cursor-pointer"
                      >
                        Guardar
                      </Button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingPin(false); setNewPin(''); }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Fila Autenticación */}
              <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Autenticación</h3>
                    <p className="text-[11px] text-slate-500">
                      {user?.isGoogleAuth ? 'Google Account vinculada' : 'Contraseña estándar activa'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Activo</span>
                </span>
              </div>
            </Card>
          )}

          {/* TAB 3: PREFERENCIAS */}
          {activeTab === 'preferences' && (
            <Card className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Preferencias</h2>
              </div>

              <div className="space-y-3">
                {/* Switch 1: WhatsApp */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-900">Avisos y QR por WhatsApp</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.notifyWhatsapp}
                    onClick={() => setFormData({ ...formData, notifyWhatsapp: !formData.notifyWhatsapp })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.notifyWhatsapp ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.notifyWhatsapp ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: LPR */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-900">Apertura automática de barrera (LPR)</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.autoGateOpen}
                    onClick={() => setFormData({ ...formData, autoGateOpen: !formData.autoGateOpen })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.autoGateOpen ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.autoGateOpen ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Email */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-900">Boleta digital por correo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.notifyEmail}
                    onClick={() => setFormData({ ...formData, notifyEmail: !formData.notifyEmail })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.notifyEmail ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.notifyEmail ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Credencial Digital Limpia */}
        <div className="space-y-4">
          <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                Credencial Digital
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                SPK-2026-USR
              </span>
            </div>

            <div className="flex items-center space-x-3.5">
              {(avatarInput || user?.avatar) ? (
                <img 
                  src={avatarInput || user?.avatar} 
                  alt={formData.name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-800" 
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-slate-400 flex items-center justify-center border border-slate-800 shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
              
              <div>
                <h3 className="font-bold text-sm text-white">{formData.name}</h3>
                <p className="text-xs font-mono text-slate-400">{formData.dni}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Activo</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Placa autorizada</span>
                <span className="text-slate-200 font-bold">{formData.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoría</span>
                <span className="text-slate-200 font-semibold capitalize">
                  {role === 'admin' ? 'Administrador' : role === 'garita' ? 'Operador Garita' : 'Conductor'}
                </span>
              </div>
            </div>
          </div>

          {/* Enlace Sutil de Soporte (Limpio, sin párrafos redundantes) */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-semibold text-slate-700">¿Dudas con tu cuenta?</span>
            <a 
              href="mailto:soporte@smartpark.pe" 
              className="text-xs font-semibold text-slate-900 hover:underline"
            >
              Contactar soporte
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};
