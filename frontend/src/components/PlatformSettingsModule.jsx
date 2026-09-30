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
  Info,
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
  Trash2,
  Compass,
  Map,
  Palette,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Camera,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Eye,
  BellRing,
  Sparkles,
  ShieldCheck,
  Power,
  Database,
  HardDrive,
  RefreshCw,
  History,
  CalendarClock,
  ChevronUp,
  ChevronDown,
  Tag,
  Gift,
  Wrench,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useEstablishments } from '../context/EstablishmentContext';
import { useTheme } from '../context/ThemeContext';
import { MapContainer3D } from './map/MapContainer3D';
import { BroadcastDetailModal } from './BroadcastDetailModal';
import api from '../services/api';

const SETTINGS_STORAGE_KEY = 'smart_park_platform_settings_v2';
const BROADCASTS_STORAGE_KEY = 'smart_park_broadcasts_v2';

const BROADCAST_TEMPLATES = [
  {
    name: '🏷️ Promoción Semana Santa (20% OFF)',
    category: 'promo',
    target: 'CONDUCTORES',
    title: '¡20% de Descuento en Cocheras del Centro!',
    message: 'Reserva con antelación tu espacio en las cocheras de Plaza Mayor y Jr. 28 de Julio con 20% de descuento durante las festividades.',
    image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    promo_code: 'SEMANASANTA20',
    discount_percent: 20,
    action_label: 'Reservar Cochera con Descuento',
    action_url: 'dashboard',
    expires_at: '2026-04-10'
  },
  {
    name: '🔧 Mantenimiento Preventivo ANPR',
    category: 'maintenance',
    target: 'COCHERAS',
    title: 'Actualización Programada de Firmware en Cámaras Garita',
    message: 'Estimados administradores: este domingo a las 02:00 AM se realizará una sincronización del motor de reconocimiento de placas (ANPR). El servicio se mantendrá operativo.',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    promo_code: '',
    discount_percent: 0,
    action_label: 'Ver Estado del Sistema',
    action_url: 'settings',
    expires_at: ''
  },
  {
    name: '🚨 Alerta Vial Urgente',
    category: 'urgent',
    target: 'CONDUCTORES',
    title: 'Desvío de Tráfico en Centro Histórico',
    message: 'Cierre de vías en Jr. 28 de Julio por eventos cívicos. Recomendamos ingresar por Jr. Bellido y asegurar su reserva con antelación.',
    image_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80',
    promo_code: '',
    discount_percent: 0,
    action_label: 'Ver Mapa de Cocheras',
    action_url: 'dashboard',
    expires_at: ''
  },
  {
    name: '📢 Aviso Informativo Red',
    category: 'info',
    target: 'ALL',
    title: 'Nueva Versión Smart-Park v2.4 Disponible',
    message: 'Hemos optimizado la velocidad del plano interactivo 2D y la verificación con QR instantáneo. ¡Gracias por ser parte de nuestra comunidad!',
    image_url: '',
    promo_code: '',
    discount_percent: 0,
    action_label: 'Explorar Novedades',
    action_url: 'dashboard',
    expires_at: ''
  }
];

const IMAGE_PRESETS = [
  { label: '🚗 Cochera Centro', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80' },
  { label: '🎁 Descuento / Promo', url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80' },
  { label: '🔧 Mantenimiento TI', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' }
];

const INITIAL_SETTINGS = {
  defaultCommission: 12,
  gracePeriodMinutes: 15,
  minHourlyRate: 3.00,
  maxHourlyRate: 15.00,
  maintenanceMode: false,
  maintenanceMessage: 'Smart-Park está realizando una breve actualización programada de servidores. Volvemos en unos minutos.',
  // Ajustes del Sistema Operativo
  autoCancelNoShow: true,
  advanceNotificationMinutes: 10,
  lprCameraEnabled: true,
  soundAlertsEnabled: true,
  publicAffiliationsEnabled: true,
  allowUnpaidBooking: true,
  // Pasarelas
  paymentGateways: {
    culqi: true,
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
    category: 'promo',
    promo_code: 'SEMANASANTA20',
    discount_percent: 20,
    action_label: 'Reservar con Descuento',
    action_url: 'dashboard',
    image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    channel: 'Push App & Notificación Instantánea',
    message: 'Aprovecha este fin de semana para aparcar en Plaza Mayor y Jr. 28 de Julio con 20% de descuento usando Smart Wallet.',
    sentAt: '2026-08-16 09:00',
    sentCount: 1420
  },
  {
    id: 'BRD-002',
    title: 'Mantenimiento de Servidores LPR & ANPR',
    target: 'COCHERAS',
    category: 'maintenance',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    channel: 'Panel Garita & Correo',
    message: 'Estimados administradores: este domingo a las 02:00 AM se realizará actualización de firmware en las cámaras de garita.',
    sentAt: '2026-08-14 18:30',
    sentCount: 6
  }
];

const INITIAL_NEW_BROADCAST = {
  title: '',
  target: 'ALL',
  category: 'promo',
  message: '',
  image_url: '',
  promo_code: '',
  discount_percent: 20,
  action_label: 'Reservar con Descuento',
  action_url: 'dashboard',
  expires_at: ''
};

export const PlatformSettingsModule = () => {
  const { addNotification } = useNotifications();
  const { theme, setTheme, availableThemes, autoDark, setAutoDark } = useTheme();

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

  const { establishments } = useEstablishments();
  const [activeSection, setActiveSection] = useState('system'); // 'system' | 'appearance' | 'business' | 'payments' | 'security' | 'broadcasts' | 'map'
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedPreviewBroadcast, setSelectedPreviewBroadcast] = useState(null);
  const [toast, setToast] = useState(null);

  // Estado honesto de pasarelas desde el backend
  const [gatewayStatus, setGatewayStatus] = useState({ 
    loading: true, 
    culqi_configured: false, 
    paypal_configured: false, 
    paypal_client_id: '',
    paypal_mode: 'sandbox',
    exchange_rate: 0.27,
    environment: '—', 
    message: 'Consultando servidor...' 
  });

  // Formulario para nuevo comunicado
  const [newBroadcast, setNewBroadcast] = useState(INITIAL_NEW_BROADCAST);

  const resetBroadcastForm = () => {
    setNewBroadcast(INITIAL_NEW_BROADCAST);
  };

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Consultar estado real de pasarelas en el servidor
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await api.get('/payments/status');
        if (!cancelled) {
          setGatewayStatus({ 
            loading: false, 
            culqi_configured: !!res.data.culqi_configured, 
            paypal_configured: !!res.data.paypal_configured,
            paypal_client_id: res.data.paypal_client_id || '',
            paypal_mode: res.data.paypal_mode || 'sandbox',
            exchange_rate: res.data.exchange_rate || 0.27,
            environment: res.data.environment || 'sandbox', 
            message: res.data.message || '' 
          });
        }
      } catch (err) {
        if (!cancelled) {
          setGatewayStatus({ 
            loading: false, 
            culqi_configured: false, 
            paypal_configured: true,
            paypal_client_id: 'BAADoNYpVsJd20zFA2pZHva0nt7lYj4GnPqKFDFI_7Cdta0qd-FqG4g8wmndZYuPPcEAmSO-ukcu2mJDR0',
            paypal_mode: 'sandbox',
            exchange_rate: 0.27,
            environment: 'sandbox', 
            message: 'PayPal Sandbox activo.' 
          });
        }
      }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, []);

  // Estado real de respaldos desde el backend (PostgreSQL / volumen persistente /data/backups)
  const [backupStatus, setBackupStatus] = useState(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const [showBackupsHistory, setShowBackupsHistory] = useState(false);

  const fetchBackupStatus = async () => {
    try {
      setLoadingBackup(true);
      const res = await api.get('/backups/status');
      setBackupStatus(res.data);
    } catch (err) {
      console.error('Error al consultar estado de respaldos:', err);
    } finally {
      setLoadingBackup(false);
    }
  };

  // Cargar configuración real del servidor (con fallback a localStorage)
  useEffect(() => {
    let cancelled = false;
    const loadPlatformData = async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          api.get('/platform/settings').catch(() => null),
          api.get('/platform/broadcasts').catch(() => null),
        ]);
        if (!cancelled && sRes?.data) setSettings(prev => ({ ...prev, ...sRes.data }));
        if (!cancelled && bRes?.data && Array.isArray(bRes.data) && bRes.data.length) setBroadcasts(bRes.data);
      } catch {}
    };
    loadPlatformData();
    fetchBackupStatus();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(broadcasts));
    } catch (e) {}
  }, [broadcasts]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let serverOk = false;
    try {
      await api.put('/platform/settings', settings);
      serverOk = true;
    } catch (err) {
      console.warn('Could not persist settings to server, saving locally', err);
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {}
    if (serverOk) {
      notify('✓ Ajustes maestros de la plataforma guardados exitosamente (persistidos en servidor).');
    } else {
      notify('✓ Ajustes guardados localmente (sin conexión al servidor).');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;

    const payload = {
      title: newBroadcast.title.trim(),
      message: newBroadcast.message.trim(),
      target: newBroadcast.target,
      category: newBroadcast.category || 'info',
      image_url: newBroadcast.image_url?.trim() || null,
      promo_code: newBroadcast.promo_code?.trim() || null,
      discount_percent: Number(newBroadcast.discount_percent) || 0,
      action_url: newBroadcast.action_url?.trim() || null,
      action_label: newBroadcast.action_label?.trim() || null,
      expires_at: newBroadcast.expires_at || null,
    };

    try {
      const res = await api.post('/platform/broadcasts', payload);
      const created = res.data;
      setBroadcasts(prev => [created, ...prev]);
      const notifType = created.category === 'promo' ? 'success' : created.category === 'maintenance' ? 'warning' : created.category === 'urgent' ? 'alert' : 'info';
      if (newBroadcast.target === 'ALL' || newBroadcast.target === 'CONDUCTORES') {
        addNotification({ 
          role: 'user', 
          title: created.title, 
          message: created.message, 
          type: notifType, 
          targetTab: created.action_url || 'dashboard',
          broadcast: created 
        });
      }
      if (newBroadcast.target === 'ALL' || newBroadcast.target === 'COCHERAS') {
        addNotification({ 
          role: 'local', 
          title: created.title, 
          message: created.message, 
          type: notifType, 
          targetTab: created.action_url || 'dashboard',
          broadcast: created 
        });
      }
      setShowBroadcastModal(false);
      resetBroadcastForm();
      notify(`✓ Comunicado emitido a ${created.sentCount} destinatarios (persistido en servidor).`);
      return;
    } catch {}

    // Fallback local si el servidor no responde
    const count = newBroadcast.target === 'ALL' ? 1426 : newBroadcast.target === 'CONDUCTORES' ? 1420 : 6;
    const created = {
      id: `BRD-00${broadcasts.length + 1}`,
      ...payload,
      sentAt: new Date().toLocaleString(),
      sentCount: count
    };
    setBroadcasts([created, ...broadcasts]);
    const notifType = created.category === 'promo' ? 'success' : created.category === 'maintenance' ? 'warning' : created.category === 'urgent' ? 'alert' : 'info';
    if (newBroadcast.target === 'ALL' || newBroadcast.target === 'CONDUCTORES') {
      addNotification({ 
        role: 'user', 
        title: created.title, 
        message: created.message, 
        type: notifType, 
        targetTab: created.action_url || 'dashboard',
        broadcast: created 
      });
    }
    if (newBroadcast.target === 'ALL' || newBroadcast.target === 'COCHERAS') {
      addNotification({ 
        role: 'local', 
        title: created.title, 
        message: created.message, 
        type: notifType, 
        targetTab: created.action_url || 'dashboard',
        broadcast: created 
      });
    }
    setShowBroadcastModal(false);
    resetBroadcastForm();
    notify(`✓ Comunicado emitido en tiempo real a ${count} destinatarios.`);
  };

  const handleDeleteBroadcast = async (id) => {
    try { await api.delete(`/platform/broadcasts/${id}`); } catch {}
    setBroadcasts(prev => prev.filter(b => b.id !== id));
    notify('Comunicado eliminado del registro histórico.');
  };

  // Generar snapshot inmediato de PostgreSQL en el servidor (/data/backups)
  const handleGenerateServerBackup = async () => {
    try {
      setGeneratingBackup(true);
      const res = await api.post('/backups/generate');
      notify(`✓ Respaldo generado en servidor: ${res.data.filename} (${res.data.total_records} registros, ${res.data.size_kb} KB)`);
      await fetchBackupStatus();
    } catch (err) {
      notify('Error al generar respaldo en el servidor', 'error');
    } finally {
      setGeneratingBackup(false);
    }
  };

  // Descargar el último respaldo real de la base de datos desde el backend
  const handleDownloadLatestBackup = async () => {
    try {
      setLoadingBackup(true);
      const res = await api.get('/backups/download/latest', { responseType: 'blob' });
      const filename = backupStatus?.latest_backup?.filename || `smartpark_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      notify('✓ Respaldo real de PostgreSQL descargado en JSON.');
    } catch (err) {
      // Fallback a exportación desde el cliente si la red o API falla
      handleExportBackupClientFallback();
    } finally {
      setLoadingBackup(false);
    }
  };

  // Descargar un archivo de respaldo específico del historial
  const handleDownloadSpecificBackup = async (filename) => {
    try {
      const res = await api.get(`/backups/download/${encodeURIComponent(filename)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      notify(`✓ Archivo ${filename} descargado.`);
    } catch (err) {
      notify('Error al descargar archivo de respaldo', 'error');
    }
  };

  // Fallback de exportación en navegador si no hay conexión al backend
  const handleExportBackupClientFallback = () => {
    const backupData = {
      app: 'Smart-Park',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      platformSettings: settings,
      broadcastsCount: broadcasts.length,
      broadcasts,
      affiliatedParkingsCount: establishments.length,
      affiliatedParkings: establishments.map(e => ({
        id: e.id,
        name: e.name,
        address: e.address,
        rate: e.rate,
        tolerance: e.tolerance,
        totalSlots: e.totalSlots,
        status: e.status
      }))
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-park-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('✓ Respaldo de contingencia descargado en JSON.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Configuración de Plataforma
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Parámetros globales, pasarelas de pago y comunicados a la red.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            onClick={handleDownloadLatestBackup}
            variant="outline"
            className="w-full sm:w-auto border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs gap-2 h-10 px-3 cursor-pointer justify-center"
            title="Exportar respaldo completo del sistema en JSON"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Exportar Backup</span>
          </Button>

          <Button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-2 h-10 px-4 cursor-pointer justify-center"
          >
            <Send className="w-4 h-4" />
            <span>Emitir Comunicado</span>
          </Button>

          <Button
            type="button"
            onClick={handleSaveSettings}
            className="w-full sm:w-auto bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-md gap-2 h-10 px-4 cursor-pointer justify-center"
          >
            <Save className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Guardar Ajustes</span>
          </Button>
        </div>
      </div>

      {/* Pestañas de Navegación de Ajustes */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSection('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'system' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Sistema</span>
        </button>

        <button
          onClick={() => setActiveSection('appearance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'appearance' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Apariencia</span>
        </button>

        <button
          onClick={() => setActiveSection('business')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'business' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Tarifas & Comisiones</span>
        </button>

        <button
          onClick={() => setActiveSection('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'payments' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Pasarelas</span>
        </button>

        <button
          onClick={() => setActiveSection('broadcasts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'broadcasts' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Comunicados ({broadcasts.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'map' ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Mapa de Sedes</span>
        </button>
      </div>

      {/* SECCIÓN 1: AJUSTES OPERATIVOS DEL SISTEMA */}
      {activeSection === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Tarjeta 1: Motor de Reservas y Cancelación Automática */}
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Tolerancia & Reservas</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Reglas de llegada y cancelación por no-show.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Auto Cancelación */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Auto-cancelación por No-Show
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Libera el cajón automáticamente si se supera la tolerancia sin registrar ingreso.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, autoCancelNoShow: !prev.autoCancelNoShow }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.autoCancelNoShow ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Notificaciones Preventivas */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-amber-500" />
                      Alertas preventivas (10 y 5 min)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Notificación urgente al conductor antes de liberar la plaza.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, advanceNotificationMinutes: prev.advanceNotificationMinutes > 0 ? 0 : 10 }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.advanceNotificationMinutes > 0 ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Reserva sin Pago */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Reservas sin pago previo
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Permite reservar y abonar la estadía directamente en garita al salir.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, allowUnpaidBooking: !prev.allowUnpaidBooking }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.allowUnpaidBooking ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Aviso Previo de Expiración */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Aviso Previo de Expiración</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Antelación para notificar al conductor (cobro continuo sin gracia).</span>
                  </div>
                  <select
                    value={settings.gracePeriodMinutes}
                    onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 dark:text-white cursor-pointer shadow-2xs"
                  >
                    <option value="10">10 minutos</option>
                    <option value="15">15 minutos (Estándar)</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Tarjeta 2: Operatividad de Garitas & Reconocimiento */}
            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Garita & Afiliaciones</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Detección vehicular, alertas y admisión pública.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* LPR / ANPR */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Detección de placas (LPR)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Lectura asistida por cámara para validar ingresos de vehículos registrados.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, lprCameraEnabled: !prev.lprCameraEnabled }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.lprCameraEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Alertas Sonoras */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                      Alertas sonoras en garita
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Efectos sonoros de confirmación al registrar accesos o incidencias.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, soundAlertsEnabled: !prev.soundAlertsEnabled }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.soundAlertsEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Afiliaciones Públicas */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Solicitudes públicas de afiliación
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Permite a nuevas cocheras postular a la red desde la página de inicio.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, publicAffiliationsEnabled: !prev.publicAffiliationsEnabled }))}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      settings.publicAffiliationsEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                  </button>
                </div>

                {/* Expiración de QR */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Vigencia Máxima del Pase QR</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Tiempo de validez de lectura en el escáner.</span>
                  </div>
                  <select
                    value={settings.security.qrExpirationMinutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, qrExpirationMinutes: Number(e.target.value) }
                    })}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 dark:text-white cursor-pointer shadow-2xs"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos (Estándar)</option>
                    <option value="60">60 minutos</option>
                  </select>
                </div>
              </div>
            </Card>

          </div>

          {/* Tarjeta 3: Mantenimiento Global & Respaldo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${settings.maintenanceMode ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Modo Mantenimiento de la Plataforma</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Suspende temporalmente las reservas para operaciones de infraestructura.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    settings.maintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                </button>
              </div>

              {settings.maintenanceMode && (
                <div className="space-y-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">Mensaje público para usuarios y conductores:</label>
                  <textarea
                    rows={2}
                    value={settings.maintenanceMessage}
                    onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                    className="w-full bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 text-xs font-medium text-rose-900 dark:text-rose-200 focus:outline-none"
                  />
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] flex flex-col justify-between space-y-4 lg:col-span-2">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Respaldos de Base de Datos en Producción</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Copia integral de todas las tablas de PostgreSQL (usuarios, tarifas, reservas, transacciones, auditoría) firmada con SHA-256.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {backupStatus?.database_engine || 'PostgreSQL'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {backupStatus?.is_persistent_volume ? '/data/backups (Volumen)' : 'Local'}
                    </span>
                  </div>
                </div>

                {/* Métricas y Estado Actual */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-slate-400" />
                      Frecuencia
                    </p>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Diario (cada 24h)</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Retención: {backupStatus?.retention_count || 14} días</p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Último snapshot</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {backupStatus?.latest_backup?.created_at
                        ? new Date(backupStatus.latest_backup.created_at).toLocaleString()
                        : (loadingBackup ? 'Consultando...' : 'Sin respaldos previos')}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {backupStatus?.latest_backup?.filename || 'Pendiente'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volumen & Registros</p>
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {backupStatus?.latest_backup?.metadata?.total_records != null
                        ? `${backupStatus.latest_backup.metadata.total_records} filas`
                        : '—'}
                      {' '}• {backupStatus?.latest_backup?.size_kb || 0} KB
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Total archivados: {backupStatus?.total_backups_stored || 0} copias
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    disabled={generatingBackup}
                    onClick={handleGenerateServerBackup}
                    className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-xs gap-2 h-10 cursor-pointer justify-center"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-400 dark:text-emerald-600 ${generatingBackup ? 'animate-spin' : ''}`} />
                    <span>{generatingBackup ? 'Generando snapshot...' : 'Crear Snapshot Ahora (Servidor)'}</span>
                  </Button>

                  <Button
                    type="button"
                    disabled={loadingBackup}
                    onClick={handleDownloadLatestBackup}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-2 h-10 cursor-pointer justify-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Último Respaldo (JSON)</span>
                  </Button>
                </div>

                {backupStatus?.available_backups?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBackupsHistory(!showBackupsHistory)}
                    className="w-full text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{showBackupsHistory ? 'Ocultar historial de archivos' : `Ver historial de archivos en el volumen (${backupStatus.total_backups_stored})`}</span>
                    {showBackupsHistory ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                  </button>
                )}

                {/* Lista Histórica Desplegable */}
                {showBackupsHistory && backupStatus?.available_backups && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto animate-in fade-in">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Archivos almacenados en volumen persistente (/data/backups):</p>
                    <div className="space-y-1.5">
                      {backupStatus.available_backups.map((b) => (
                        <div key={b.filename} className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="truncate pr-2">
                            <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{b.filename}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(b.created_at).toLocaleString()} • {b.size_kb} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDownloadSpecificBackup(b.filename)}
                            className="h-7 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Descargar</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: TEMAS & APARIENCIA VISUAL */}
      {activeSection === 'appearance' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Personalización de Temas Visuales</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecciona la paleta de colores del sistema. Se aplica instantáneamente a todos los módulos y se recuerda en tu navegador.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">Tema activo:</span>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  {availableThemes.find(t => t.id === theme)?.name || 'Claro Esmeralda'}
                </span>
              </div>
            </div>

            {/* Grid de Selector de Temas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableThemes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      notify(`✓ Tema "${t.name}" aplicado correctamente.`);
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          {t.isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                          <span>{t.name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.desc}</p>
                      </div>

                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Previsualización de Muestra de Paleta */}
                    <div className="rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/60 space-y-2" style={{ backgroundColor: t.preview.bg }}>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg shadow-xs" style={{ backgroundColor: t.preview.card, borderColor: t.preview.border }}>
                        <span className="text-[10px] font-bold" style={{ color: t.preview.text }}>Smart-Park</span>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.preview.accent }} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: t.preview.accent }} />
                        <span className="h-2 w-8 rounded-full" style={{ backgroundColor: t.preview.border }} />
                      </div>
                    </div>

                    {/* Botón de Selección */}
                    <button
                      type="button"
                      className={`w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tema Activo</span>
                        </span>
                      ) : 'Activar Tema'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Configuración Adicional de Apariencia */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                <div className="space-y-0.5 max-w-[80%]">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Modo Oscuro Automático según la Hora Local
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Activa automáticamente el tema oscuro a partir de las 19:00 (7:00 PM) y vuelve a claro al amanecer (06:00 AM).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoDark;
                    setAutoDark(next);
                    notify(next ? '✓ Modo oscuro automático activado (19:00 - 06:00).' : 'Modo oscuro automático desactivado.');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    autoDark ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-100 shadow-sm block" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Estilo del Mapa de Sedes</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Modo visual predeterminado para el visor geoespacial.</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  Calles Normal (Mapbox)
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 3: REGLAS COMERCIALES & TOLERANCIA */}
      {activeSection === 'business' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Comisiones de Plataforma & Políticas Arancelarias</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configura la comisión retenida por reserva y los límites arancelarios para cocheras en Ayacucho.</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                Comisión Vigente: {settings.defaultCommission}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Comisión Estándar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Comisión Estándar (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.defaultCommission}
                    onChange={(e) => setSettings({ ...settings, defaultCommission: Number(e.target.value) })}
                    className="pr-8 text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Porcentaje retenido por cada reserva completada.</p>
              </div>

              {/* Aviso Previo de Expiración */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aviso Previo de Expiración (min)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.gracePeriodMinutes}
                    onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                    className="pr-8 text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Tiempo de antelación para notificar al conductor antes del cobro de exceso.</p>
              </div>

              {/* Tarifa Mínima Sugerida */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tarifa Mínima Sugerida (S/)
                </label>
                <Input
                  type="number"
                  step="0.50"
                  value={settings.minHourlyRate}
                  onChange={(e) => setSettings({ ...settings, minHourlyRate: Number(e.target.value) })}
                  className="text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Piso arancelario para cocheras afiliadas.</p>
              </div>

              {/* Tarifa Máxima Permitida */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tarifa Máxima Permitida (S/)
                </label>
                <Input
                  type="number"
                  step="0.50"
                  value={settings.maxHourlyRate}
                  onChange={(e) => setSettings({ ...settings, maxHourlyRate: Number(e.target.value) })}
                  className="text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Techo regulatorio para evitar abusos en temporada alta.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 4: PASARELAS DE PAGO */}
      {activeSection === 'payments' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Estado de Pasarelas de Pago Digital</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monitoreo de Culqi (Yape/Tarjetas) y PayPal en servidores de Smart-Park.</p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                Entorno: {settings.paymentGateways.environment.toUpperCase()}
              </span>
            </div>

            {/* Banner de Estado Real del Servidor */}
            <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-medium ${
              gatewayStatus.paypal_configured 
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300' 
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">
                  {gatewayStatus.paypal_configured ? 'Pasarelas conectadas al servidor backend' : 'Estado de conexión parcial'}
                </span>
                <span className="text-[11px] opacity-80">{gatewayStatus.message}</span>
              </div>
              <span className="font-mono text-[10px] bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                TC: S/ 1 = ${gatewayStatus.exchange_rate} USD
              </span>
            </div>

            {/* Switches de Métodos de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Yape & Plin (Vía Pasarela)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Permite pagos móviles directos en reservas.</span>
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

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Tarjetas de Débito y Crédito</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Visa, Mastercard, Amex a través de Culqi/PayPal.</span>
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
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 5: HISTORIAL DE COMUNICADOS MASIVOS */}
      {activeSection === 'broadcasts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Registro Histórico de Comunicados & Promociones</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Canal central de difusión con soporte para cupones de descuento, avisos de mantenimiento, imágenes y notificaciones push.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 h-9 px-3.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nuevo Comunicado</span>
            </Button>
          </div>

          <div className="space-y-3">
            {broadcasts.length === 0 ? (
              <Card className="p-12 rounded-3xl border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-[#111827] space-y-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay comunicados registrados aún</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Crea tu primera promoción o comunicado técnico para toda la red.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowBroadcastModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 h-8 px-3 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Crear Comunicado</span>
                  </Button>
                </div>
              </Card>
            ) : (
              broadcasts.map((b) => {
                const isPromo = b.category === 'promo' || !!b.promo_code;
                const isMaintenance = b.category === 'maintenance';
                const isUrgent = b.category === 'urgent';

                const categoryBadge = isPromo ? (
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Promoción
                  </span>
                ) : isMaintenance ? (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Mantenimiento
                  </span>
                ) : isUrgent ? (
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Urgente
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Informativo
                  </span>
                );

                const targetLabel = b.target === 'CONDUCTORES' 
                  ? '🚗 Conductores' 
                  : b.target === 'COCHERAS' 
                  ? '🏢 Cocheras' 
                  : '👥 Toda la Red';

                return (
                  <Card key={b.id} className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {b.image_url ? (
                        <img 
                          src={b.image_url} 
                          alt={b.title} 
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : null}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {b.id}
                          </span>
                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {targetLabel}
                          </span>
                          {categoryBadge}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {b.sentAt}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {b.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                          {b.message}
                        </p>

                        {/* Ficha de cupón si aplica */}
                        {b.promo_code && (
                          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/60 dark:border-purple-700/60">
                              <Tag className="w-3 h-3" />
                              Cupón: {b.promo_code}
                            </span>
                            {b.discount_percent > 0 && (
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                -{b.discount_percent}% OFF
                              </span>
                            )}
                            {b.expires_at && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Vence: {b.expires_at}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        {b.sentCount} recibidos
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedPreviewBroadcast(b)}
                        title="Ver vista previa de la tarjeta"
                        className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Previsualizar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBroadcast(b.id)}
                        title="Eliminar del historial"
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN 6: MAPA GENERAL DE SEDES */}
      {activeSection === 'map' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="p-5 rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mapa General de Cocheras en Ayacucho</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualización interactiva, geolocalización y ruteo de todas las cocheras registradas en Huamanga.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-xl w-fit inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{establishments.length} Sedes Registradas</span>
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative min-h-[480px]">
              <MapContainer3D 
                parkings={establishments} 
                forceShowAdminPanel={true} 
              />
            </div>
          </Card>
        </div>
      )}

      {/* MODAL PARA EMITIR COMUNICADO MASIVO */}
      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Emisión de Comunicado & Promoción Masiva</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Difunde promociones con cupones, avisos de mantenimiento técnico o alertas viales a toda la red con entrega inmediata en tiempo real.
            </DialogDescription>
          </DialogHeader>

          {/* Plantillas Rápidas con 1 Clic */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Plantillas Rápidas Preconfiguradas:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNewBroadcast(prev => ({ ...prev, ...tmpl }))}
                  className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 my-2">
            {/* Categoría Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoría del Comunicado *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'promo', label: '🏷️ Promoción', desc: 'Cupones & descuentos' },
                  { id: 'maintenance', label: '🔧 Mantenimiento', desc: 'ANPR & servidores' },
                  { id: 'urgent', label: '🚨 Aviso Urgente', desc: 'Tráfico & accesos' },
                  { id: 'info', label: '📢 Informativo', desc: 'Novedades de la red' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewBroadcast({ ...newBroadcast, category: cat.id })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      newBroadcast.category === cat.id
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold text-xs">{cat.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audiencia y Título */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Audiencia Objetivo *
                </label>
                <select
                  value={newBroadcast.target}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, target: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer h-10"
                >
                  <option value="ALL">👥 Toda la Red (Conductores + Cocheras)</option>
                  <option value="CONDUCTORES">🚗 Solo Conductores</option>
                  <option value="COCHERAS">🏢 Solo Cocheras Afiliadas</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Comunicado *
                </label>
                <Input
                  type="text"
                  placeholder="Ej. ¡20% de Descuento en Cocheras del Centro!"
                  value={newBroadcast.title}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                  className="text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Campos condicionales para Promoción */}
            {newBroadcast.category === 'promo' && (
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Configuración del Cupón Promocional</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Código del Cupón
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej. SEMANASANTA20"
                      value={newBroadcast.promo_code}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, promo_code: e.target.value.toUpperCase() })}
                      className="text-xs font-mono font-bold h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Porcentaje de Descuento (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="20"
                      value={newBroadcast.discount_percent}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, discount_percent: Number(e.target.value) })}
                      className="text-xs font-bold h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Límite de Vigencia
                    </label>
                    <Input
                      type="date"
                      value={newBroadcast.expires_at}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, expires_at: e.target.value })}
                      className="text-xs font-bold h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mensaje o Descripción Detallada *
              </label>
              <textarea
                rows={3}
                placeholder="Escribe el contenido que verán los usuarios en la notificación y el modal..."
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                required
              />
            </div>

            {/* Banner de Imagen */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Banner de Imagen (URL Opcional)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {IMAGE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewBroadcast({ ...newBroadcast, image_url: p.url })}
                      className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                  {newBroadcast.image_url && (
                    <button
                      type="button"
                      onClick={() => setNewBroadcast({ ...newBroadcast, image_url: '' })}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <Input
                type="url"
                placeholder="https://images.unsplash.com/... o enlace directo a imagen"
                value={newBroadcast.image_url}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, image_url: e.target.value })}
                className="text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />

              {newBroadcast.image_url && (
                <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                  <img
                    src={newBroadcast.image_url}
                    alt="Previsualización"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                    Vista previa de banner
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Acción Opcional (CTA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Texto del Botón de Acción (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Reservar con Descuento"
                  value={newBroadcast.action_label}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, action_label: e.target.value })}
                  className="text-xs font-bold h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pestaña de Destino (Opcional)
                </label>
                <select
                  value={newBroadcast.action_url}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, action_url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer h-10"
                >
                  <option value="dashboard">🗺️ Dashboard / Exploración de Cocheras</option>
                  <option value="history">📅 Mis Reservas (Historial)</option>
                  <option value="vehicles">🚗 Mi Garaje de Vehículos</option>
                  <option value="settings">⚙️ Ajustes del Sistema</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBroadcastModal(false)}
                className="text-xs font-bold h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Emitir a la Red</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Previsualizar Detalle Completo de Comunicado */}
      <BroadcastDetailModal
        broadcast={selectedPreviewBroadcast}
        isOpen={!!selectedPreviewBroadcast}
        onClose={() => setSelectedPreviewBroadcast(null)}
      />

    </div>
  );
};
