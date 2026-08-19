import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Settings, 
  Percent, 
  Clock, 
  Send, 
  Bell, 
  CreditCard, 
  ShieldAlert, 
  Save, 
  Check, 
  Radio, 
  Users, 
  Building2, 
  Sliders, 
  AlertTriangle,
  Zap,
  Globe,
  Lock,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const SETTINGS_STORAGE_KEY = 'smart_park_platform_settings_v2';
const BROADCASTS_STORAGE_KEY = 'smart_park_broadcasts_v2';

const INITIAL_SETTINGS = {
  defaultCommission: 12,
  gracePeriodMinutes: 15,
  minHourlyRate: 3.00,
  maxHourlyRate: 15.00,
  maintenanceMode: false,
  maintenanceMessage: 'Smart-Park está realizando una breve actualización programada de servidores. Volvemos en unos minutos.',
  paymentGateways: {
    culqi: true,
    culqiPublicKey: 'pk_test_W5ShN8WanbYh5Ru8',
    culqiSecretKey: 'sk_test_DqGi7c8DVwDLAkrt',
    yape: true,
    plin: true,
    cards: true,
    environment: 'sandbox'
  },
  security: {
    qrExpirationMinutes: 30,
    maxPinAttempts: 5,
    requireLprConfirmation: true
  }
};

const INITIAL_BROADCASTS = [
  {
    id: 'BRD-001',
    title: 'Descuento del 20% en Cocheras del Centro',
    target: 'CONDUCTORES',
    channel: 'Push App & Notificación Instantánea',
    message: 'Aprovecha este fin de semana para aparcar en Plaza Mayor y Jr. 28 de Julio con 20% de descuento usando Smart Wallet.',
    sentAt: '2026-08-16 09:00',
    sentCount: 1420
  },
  {
    id: 'BRD-002',
    title: 'Mantenimiento de Servidores LPR & ANPR',
    target: 'COCHERAS',
    channel: 'Panel Garita & Correo',
    message: 'Estimados administradores: este domingo a las 02:00 AM se realizará actualización de firmware en las cámaras de garita.',
    sentAt: '2026-08-14 18:30',
    sentCount: 6
  }
];

export const PlatformSettingsModule = () => {
  const { addNotification } = useNotifications();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...INITIAL_SETTINGS, ...parsed };
      }
    } catch (e) {}
    return INITIAL_SETTINGS;
  });

  const [broadcasts, setBroadcasts] = useState(() => {
    try {
      const saved = localStorage.getItem(BROADCASTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BROADCASTS;
  });

  const [activeSection, setActiveSection] = useState('business'); // 'business' | 'payments' | 'security' | 'broadcasts'
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Formulario para nuevo comunicado
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    target: 'ALL',
    message: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(broadcasts));
    } catch (e) {}
  }, [broadcasts]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {}
    notify('✓ Ajustes maestros de la plataforma guardados exitosamente.');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;

    const count = newBroadcast.target === 'ALL' ? 1426 : newBroadcast.target === 'CONDUCTORES' ? 1420 : 6;

    const created = {
      id: `BRD-00${broadcasts.length + 1}`,
      title: newBroadcast.title.trim(),
      target: newBroadcast.target,
      channel: 'Push App & Notificación Instantánea',
      message: newBroadcast.message.trim(),
      sentAt: new Date().toLocaleString(),
      sentCount: count
    };

    setBroadcasts([created, ...broadcasts]);

    // Disparar notificaciones reales en el sistema según la audiencia
    if (newBroadcast.target === 'ALL' || newBroadcast.target === 'CONDUCTORES') {
      addNotification({
        role: 'user',
        title: created.title,
        message: created.message,
        type: 'info',
        targetTab: 'dashboard'
      });
    }

    if (newBroadcast.target === 'ALL' || newBroadcast.target === 'COCHERAS') {
      addNotification({
        role: 'local',
        title: created.title,
        message: created.message,
        type: 'warning',
        targetTab: 'dashboard'
      });
    }

    setShowBroadcastModal(false);
    setNewBroadcast({ title: '', target: 'ALL', message: '' });
    notify(`✓ Comunicado emitido en tiempo real a ${count} destinatarios.`);
  };

  const handleDeleteBroadcast = (id) => {
    setBroadcasts(prev => prev.filter(b => b.id !== id));
    notify('Comunicado eliminado del registro histórico.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Ajustes Maestros & Centro de Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configuración global de comisiones, tolerancia de garitas, pasarelas de pago y avisos masivos a la red.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-2 h-10 px-4 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Emitir Comunicado Masivo</span>
          </Button>

          <Button
            type="button"
            onClick={handleSaveSettings}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md gap-2 h-10 px-4 cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Guardar Ajustes</span>
          </Button>
        </div>
      </div>

      {/* Pestañas de Navegación de Ajustes */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSection('business')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'business' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4 text-emerald-600" />
          <span>1. Comisiones & Tolerancia</span>
        </button>

        <button
          onClick={() => setActiveSection('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'payments' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>2. Pasarelas de Pago</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'security' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          <span>3. Modo Mantenimiento & Seguridad</span>
        </button>

        <button
          onClick={() => setActiveSection('broadcasts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'broadcasts' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>4. Historial de Comunicados ({broadcasts.length})</span>
        </button>
      </div>

      {/* SECCIÓN 1: REGLAS COMERCIALES & TOLERANCIA */}
      {activeSection === 'business' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Comisiones de Plataforma & Políticas Arancelarias</h2>
                <p className="text-xs text-slate-500">Configura la comisión retenida por reserva y los límites arancelarios para cocheras en Ayacucho.</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                Comisión Vigente: {settings.defaultCommission}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Comisión Estándar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comisión Global por Defecto (%)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.defaultCommission}
                    onChange={(e) => setSettings({ ...settings, defaultCommission: Number(e.target.value) })}
                    className="pr-8 font-mono font-bold text-xs h-10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Porcentaje retenido por cada reserva liquidada.</p>
              </div>

              {/* Tiempo de Gracia */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiempo de Gracia en Garita (Minutos)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={settings.gracePeriodMinutes}
                    onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                    className="pr-12 font-mono font-bold text-xs h-10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">min</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tolerancia antes de cobrar la siguiente fracción/hora.</p>
              </div>

              {/* Tarifa Mínima */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Mínima Permitida (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={settings.minHourlyRate}
                  onChange={(e) => setSettings({ ...settings, minHourlyRate: Number(e.target.value) })}
                  className="font-mono font-bold text-xs h-10"
                />
                <p className="text-[10px] text-slate-400 mt-1">Piso arancelario en la ciudad de Huamanga.</p>
              </div>

              {/* Tarifa Máxima */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Máxima Permitida (S/)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={settings.maxHourlyRate}
                  onChange={(e) => setSettings({ ...settings, maxHourlyRate: Number(e.target.value) })}
                  className="font-mono font-bold text-xs h-10"
                />
                <p className="text-[10px] text-slate-400 mt-1">Techo arancelario para evitar cobros excesivos.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-6 cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" />
                <span>Guardar Reglas Comerciales</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 2: PASARELAS DE PAGO */}
      {activeSection === 'payments' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Métodos de Cobro Digital & Pasarelas Integradas</h2>
                <p className="text-xs text-slate-500">Habilitación de procesadores de pago para conductores y liquidación a cocheras.</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                Entorno: {settings.paymentGateways.environment.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Culqi */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-900 font-black">Culqi Perú</strong>
                    <input
                      type="checkbox"
                      checked={settings.paymentGateways.culqi}
                      onChange={(e) => setSettings({
                        ...settings,
                        paymentGateways: { ...settings.paymentGateways, culqi: e.target.checked }
                      })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">pk_test_W5Sh...</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700">Comisión Culqi: 3.99% + IGV</span>
              </div>

              {/* Yape & Plin */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-900 font-black">Yape QR & Plin</strong>
                    <input
                      type="checkbox"
                      checked={settings.paymentGateways.yape}
                      onChange={(e) => setSettings({
                        ...settings,
                        paymentGateways: { ...settings.paymentGateways, yape: e.target.checked }
                      })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">Cobro directo con QR 0% comisión</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700">Instantáneo</span>
              </div>

              {/* Tarjetas */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-900 font-black">Tarjetas Visa / MC</strong>
                    <input
                      type="checkbox"
                      checked={settings.paymentGateways.cards}
                      onChange={(e) => setSettings({
                        ...settings,
                        paymentGateways: { ...settings.paymentGateways, cards: e.target.checked }
                      })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">Tokenización PCI-DSS v4.0</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-700">3D Secure Activo</span>
              </div>

              {/* Selector de Entorno */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <strong className="text-xs text-slate-900 font-black block">Entorno de Operación</strong>
                  <span className="text-[10px] text-slate-500 block mt-1">Modo de procesamiento</span>
                </div>
                <select
                  value={settings.paymentGateways.environment}
                  onChange={(e) => setSettings({
                    ...settings,
                    paymentGateways: { ...settings.paymentGateways, environment: e.target.value }
                  })}
                  className="bg-white border border-slate-300 rounded-xl text-xs font-bold px-2.5 py-1.5 cursor-pointer"
                >
                  <option value="sandbox">Sandbox (Pruebas)</option>
                  <option value="production">Producción Oficial</option>
                </select>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-6 cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" />
                <span>Guardar Pasarelas de Pago</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 3: MODO MANTENIMIENTO & SEGURIDAD */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          <Card className={`p-6 rounded-3xl border transition shadow-xs ${
            settings.maintenanceMode ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  settings.maintenanceMode ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Modo Mantenimiento de la Plataforma</h3>
                  <p className="text-xs text-slate-500">
                    Si se activa, los conductores verán un aviso de mantenimiento y las reservas se suspenderán temporalmente.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-xs font-black uppercase font-mono ${settings.maintenanceMode ? 'text-rose-700' : 'text-slate-400'}`}>
                  {settings.maintenanceMode ? 'Activado' : 'Desactivado'}
                </span>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    settings.maintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>
            </div>

            {settings.maintenanceMode && (
              <div className="mt-4 pt-4 border-t border-rose-200">
                <label className="block text-xs font-bold text-rose-900 mb-1">Mensaje para los Usuarios</label>
                <Input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                  className="bg-white border-rose-300 text-xs text-slate-800 h-10"
                />
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Parámetros de Seguridad de Garita</h3>
              <p className="text-xs text-slate-500">Control de validez de tokens y pases QR.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiración de Pases QR (Minutos tras fin de reserva)</label>
                <Input
                  type="number"
                  value={settings.security.qrExpirationMinutes}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, qrExpirationMinutes: Number(e.target.value) }
                  })}
                  className="text-xs font-mono font-bold h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Máximo de Intentos de PIN en Garita</label>
                <Input
                  type="number"
                  value={settings.security.maxPinAttempts}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, maxPinAttempts: Number(e.target.value) }
                  })}
                  className="text-xs font-mono font-bold h-10"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-6 cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" />
                <span>Guardar Parámetros de Seguridad</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 4: HISTORIAL DE COMUNICADOS MASIVOS */}
      {activeSection === 'broadcasts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Historial de Comunicados Masivos Emitidos</h2>
            </div>
            <Button
              onClick={() => setShowBroadcastModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 px-4 cursor-pointer gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nuevo Comunicado</span>
            </Button>
          </div>

          <div className="space-y-3">
            {broadcasts.length === 0 ? (
              <Card className="p-8 text-center bg-white rounded-3xl border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-700">No hay comunicados registrados</p>
                <p className="text-[11px] text-slate-400">Emite un comunicado masivo para avisar a los usuarios o administradores de cocheras.</p>
              </Card>
            ) : (
              broadcasts.map((b) => (
                <Card key={b.id} className="p-5 rounded-3xl border-slate-200 shadow-xs bg-white space-y-2.5 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {b.id}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">{b.title}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase">
                        Destino: {b.target}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {b.sentCount} entregados
                      </span>
                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    "{b.message}"
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
                    <span>Canal: {b.channel}</span>
                    <span>Enviado: {b.sentAt}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA EMITIR COMUNICADO MASIVO */}
      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Emitir Comunicado Masivo a la Red</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envía una notificación push instantánea a todos los conductores y administradores de cochera.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendBroadcast} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Audiencia Objetivo *</label>
              <select
                value={newBroadcast.target}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, target: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="ALL">🌐 Todos (Conductores + Administradores de Cocheras)</option>
                <option value="CONDUCTORES">🚗 Solo Conductores Registrados</option>
                <option value="COCHERAS">🏢 Solo Administradores de Cocheras Afiliadas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título del Comunicado *</label>
              <Input
                type="text"
                placeholder="Ej. Descuento de Fin de Semana o Mantenimiento Programado"
                value={newBroadcast.title}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                className="text-xs font-bold h-10"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje del Comunicado *</label>
              <textarea
                rows={4}
                placeholder="Escribe el contenido de la notificación push que verán los usuarios en tiempo real..."
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-4 rounded-xl shadow-md gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Disparar Notificación Masiva en Tiempo Real</span>
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};
