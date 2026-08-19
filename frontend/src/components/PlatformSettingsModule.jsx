import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  Smartphone, 
  Users, 
  Building2, 
  Sliders, 
  AlertTriangle,
  Zap,
  Globe,
  Lock,
  Layers
} from 'lucide-react';

export const PlatformSettingsModule = () => {
  // Parámetros de negocio de la plataforma
  const [settings, setSettings] = useState({
    defaultCommission: 12,
    gracePeriodMinutes: 15,
    minHourlyRate: 3.00,
    maxHourlyRate: 15.00,
    maintenanceMode: false,
    maintenanceMessage: 'Smart-Park está realizando una breve actualización programada de servidores. Volvemos en unos minutos.',
    paymentGateways: {
      yape: true,
      plin: true,
      cards: true,
      smartWallet: true,
      environment: 'production' // 'production' | 'sandbox'
    },
    security: {
      qrExpirationMinutes: 30,
      maxPinAttempts: 5,
      requireLprConfirmation: true
    }
  });

  // Historial de Comunicados Masivos
  const [broadcasts, setBroadcasts] = useState([
    {
      id: 'BRD-001',
      title: 'Descuento del 20% en Cocheras del Centro',
      target: 'CONDUCTORES', // 'CONDUCTORES' | 'COCHERAS' | 'ALL'
      channel: 'Push App & SMS',
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
  ]);

  // Formulario para nuevo comunicado
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    target: 'ALL',
    message: ''
  });

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    notify('Ajustes maestros de la plataforma guardados exitosamente.');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;

    const count = newBroadcast.target === 'ALL' ? 1426 : newBroadcast.target === 'CONDUCTORES' ? 1420 : 6;

    const created = {
      id: `BRD-00${broadcasts.length + 1}`,
      title: newBroadcast.title,
      target: newBroadcast.target,
      channel: 'Push App & Notificación Instantánea',
      message: newBroadcast.message,
      sentAt: new Date().toLocaleString(),
      sentCount: count
    };

    setBroadcasts([created, ...broadcasts]);
    setShowBroadcastModal(false);
    setNewBroadcast({ title: '', target: 'ALL', message: '' });
    notify(`Comunicado enviado en tiempo real a ${count} destinatarios.`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Ajustes Maestros & Centro de Comunicados
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configuración global de comisiones, pasarelas de pago, tolerancia de garita y avisos masivos a la red.
          </p>
        </div>

        <Button
          onClick={() => setShowBroadcastModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Nuevo Comunicado Masivo</span>
        </Button>
      </div>

      {/* Formulario de Configuración Maestra */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Parámetros de Negocio y Tolerancia */}
        <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Percent className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">Reglas Comerciales & Tolerancia Operativa</h2>
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
                  className="pr-8 font-mono font-bold text-xs"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Se aplica a nuevas cocheras que se afilien.</p>
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
                  className="pr-12 font-mono font-bold text-xs"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">min</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Tolerancia antes de cobrar la siguiente hora.</p>
            </div>

            {/* Tarifa Mínima Sugerida */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Mínima Permitida (S/)</label>
              <Input
                type="number"
                step="0.50"
                value={settings.minHourlyRate}
                onChange={(e) => setSettings({ ...settings, minHourlyRate: Number(e.target.value) })}
                className="font-mono font-bold text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Piso arancelario en la ciudad de Huamanga.</p>
            </div>

            {/* Tarifa Máxima Sugerida */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Máxima Permitida (S/)</label>
              <Input
                type="number"
                step="0.50"
                value={settings.maxHourlyRate}
                onChange={(e) => setSettings({ ...settings, maxHourlyRate: Number(e.target.value) })}
                className="font-mono font-bold text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Techo arancelario para evitar cobros excesivos.</p>
            </div>
          </div>
        </Card>

        {/* Pasarelas de Pago & Entorno */}
        <Card className="p-6 rounded-3xl border-slate-200 shadow-xs bg-white space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">Métodos de Cobro Digital & Pasarelas</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-xs text-slate-900 block font-extrabold">Yape QR & Plin</strong>
                <span className="text-[10px] text-slate-500">Cobro instantáneo</span>
              </div>
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

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-xs text-slate-900 block font-extrabold">Tarjetas Visa/Mastercard</strong>
                <span className="text-[10px] text-slate-500">Pasarela Niubiz / Stripe</span>
              </div>
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

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-xs text-slate-900 block font-extrabold">Smart Wallet</strong>
                <span className="text-[10px] text-slate-500">Billetera de la app</span>
              </div>
              <input
                type="checkbox"
                checked={settings.paymentGateways.smartWallet}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentGateways: { ...settings.paymentGateways, smartWallet: e.target.checked }
                })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-xs text-slate-900 block font-extrabold">Entorno Pasarela</strong>
                <span className="text-[10px] text-emerald-700 font-bold uppercase font-mono">{settings.paymentGateways.environment}</span>
              </div>
              <select
                value={settings.paymentGateways.environment}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentGateways: { ...settings.paymentGateways, environment: e.target.value }
                })}
                className="bg-white border border-slate-300 rounded-lg text-xs font-bold px-2 py-1"
              >
                <option value="production">Producción</option>
                <option value="sandbox">Sandbox / Demo</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Modo Mantenimiento */}
        <Card className={`p-6 rounded-3xl border transition shadow-xs ${
          settings.maintenanceMode ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                settings.maintenanceMode ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Modo Mantenimiento de la Plataforma</h3>
                <p className="text-xs text-slate-500">
                  Si se activa, los conductores verán una pantalla de mantenimiento y no podrán reservar plazas temporalmente.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-xs font-black uppercase ${settings.maintenanceMode ? 'text-rose-700' : 'text-slate-400'}`}>
                {settings.maintenanceMode ? 'Activado' : 'Desactivado'}
              </span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                  settings.maintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
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
                className="bg-white border-rose-300 text-xs text-slate-800"
              />
            </div>
          )}
        </Card>

        {/* Botón Guardar Cambios */}
        <div className="flex justify-end">
          <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md gap-2 px-6 py-5">
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Guardar Ajustes de la Plataforma</span>
          </Button>
        </div>
      </form>

      {/* Historial de Comunicados Masivos Enviados */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900">Historial de Comunicados Masivos a la Red</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Últimos comunicados emitidos</span>
        </div>

        <div className="space-y-3">
          {broadcasts.map((b) => (
            <Card key={b.id} className="p-5 rounded-3xl border-slate-200 shadow-xs bg-white space-y-2 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-bold text-slate-400">{b.id}</span>
                  <h3 className="font-extrabold text-slate-900 text-sm">{b.title}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-xl uppercase">
                    Destino: {b.target}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-xl">
                    {b.sentCount} recibidos
                  </span>
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
          ))}
        </div>
      </div>

      {/* MODAL PARA EMITIR COMUNICADO MASIVO */}
      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Emitir Comunicado Masivo</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envía una notificación push instantánea a los usuarios o cocheras de la red.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendBroadcast} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Audiencia Objetivo *</label>
              <select
                value={newBroadcast.target}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, target: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
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
                placeholder="Ej. Promoción de Fin de Semana o Aviso de Actualización"
                value={newBroadcast.title}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                className="text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje del Comunicado *</label>
              <textarea
                rows={4}
                placeholder="Escribe el contenido de la notificación push..."
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-4 rounded-xl shadow-md gap-2"
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
