import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui/button';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Verificar si ya está corriendo como PWA instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Verificar si el usuario ya descartó el aviso recientemente
    const dismissedTime = localStorage.getItem('sp_pwa_dismissed_at');
    if (dismissedTime && Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // 3. Capturar el evento oficial beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Pequeño retardo de cortesía para no saturar al usuario inmediatamente
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Detectar cuando la app se instala con éxito
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('[PWA] Smart-Park instalada satisfactoriamente.');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('sp_pwa_dismissed_at', String(Date.now()));
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-100">
              <span>Instalar Smart-Park</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              Pase QR offline y acceso directo sin abrir navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3 py-1.5 h-8 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instalar</span>
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="Cerrar banner de instalación"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
