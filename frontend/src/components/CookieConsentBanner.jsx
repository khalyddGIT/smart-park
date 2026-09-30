import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const COOKIE_STORAGE_KEY = 'smart_park_cookie_consent_v1';

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!consent) {
        // Mostrar con un leve retardo para no interferir con la carga inicial
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({ acceptedAt: new Date().toISOString(), version: 1 }));
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) {
    return (
      <CookieDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onAccept={handleAccept}
      />
    );
  }

  return (
    <>
      <div 
        role="region" 
        aria-label="Aviso de Cookies y Privacidad"
        className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl text-slate-800 dark:text-slate-200 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Cookies Esenciales y Seguridad
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Smart Park utiliza cookies técnicas estrictamente necesarias (sesión HttpOnly cifrada y protección anti-falsificación CSRF) para garantizar tu acceso seguro.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAccept}
              title="Cerrar aviso"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              Detalles
            </button>
            <Button
              type="button"
              onClick={handleAccept}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs cursor-pointer"
            >
              Aceptar esenciales
            </Button>
          </div>
        </div>
      </div>

      <CookieDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onAccept={handleAccept}
      />
    </>
  );
};

const CookieDetailModal = ({ open, onClose, onAccept }) => {
  const cookiesList = [
    {
      name: 'access_token',
      tipo: 'Esencial / HttpOnly',
      duracion: '7 días (deslizante)',
      proposito: 'Almacena tu token de autenticación cifrado. Al tener la propiedad HttpOnly activada, el navegador impide que scripts maliciosos (XSS) puedan acceder a tus credenciales.'
    },
    {
      name: 'csrf_token',
      tipo: 'Seguridad / CSRF',
      duracion: '7 días',
      proposito: 'Previene ataques de falsificación de peticiones en sitios cruzados (Cross-Site Request Forgery). Valida que las operaciones de reserva, cobro y configuración provengan de tu sesión legítima.'
    },
    {
      name: 'smart_park_theme',
      tipo: 'Preferencia local',
      duracion: 'Persistente',
      proposito: 'Conserva tu preferencia de interfaz visual entre modo claro y modo oscuro para ofrecer una experiencia ergonómica.'
    },
    {
      name: 'smart_park_user_session',
      tipo: 'Caché de sesión',
      duracion: 'Sesión activa',
      proposito: 'Optimiza los tiempos de carga de tu perfil, asignación de garita o privilegios de plataforma sin demoras de red.'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Política de Cookies y Almacenamiento Seguro</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            En Smart Park no utilizamos cookies de publicidad invasiva ni rastreadores de terceros. Solo empleamos datos técnicos requeridos para la operatividad y la seguridad de la red.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 my-2 max-h-[60vh] overflow-y-auto pr-1">
          {cookiesList.map((c) => (
            <div 
              key={c.name}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {c.name}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  {c.tipo}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {c.proposito}
              </p>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Vigencia: {c.duracion}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer"
          >
            Aceptar y Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
