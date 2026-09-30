import React, { useState } from 'react';
import { 
  X, 
  Megaphone, 
  Tag, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Wrench, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

export const BroadcastDetailModal = ({ broadcast, isOpen, onClose, onNavigate }) => {
  const [copied, setCopied] = useState(false);

  if (!broadcast) return null;

  const handleCopyCode = () => {
    if (!broadcast.promo_code) return;
    navigator.clipboard.writeText(broadcast.promo_code);
    setCopied(true);
    toast.success(`¡Código ${broadcast.promo_code} copiado al portapapeles!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAction = () => {
    if (broadcast.action_url && onNavigate) {
      onNavigate(broadcast.action_url);
    }
    if (onClose) onClose();
  };

  const isPromo = broadcast.category === 'promo' || !!broadcast.promo_code;
  const isMaintenance = broadcast.category === 'maintenance';
  const isUrgent = broadcast.category === 'urgent';

  const categoryLabel = isPromo 
    ? 'Promoción Exclusiva' 
    : isMaintenance 
    ? 'Mantenimiento de Red' 
    : isUrgent 
    ? 'Alerta Prioritaria' 
    : 'Comunicado Oficial';

  const categoryBadgeClass = isPromo
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    : isMaintenance
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    : isUrgent
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  const CategoryIcon = isPromo ? Sparkles : isMaintenance ? Wrench : isUrgent ? AlertTriangle : Megaphone;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
        
        {/* Banner de Imagen si existe */}
        {broadcast.image_url ? (
          <div className="relative w-full h-44 sm:h-52 bg-slate-900 overflow-hidden">
            <img 
              src={broadcast.image_url} 
              alt={broadcast.title} 
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="absolute top-3 left-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border backdrop-blur-md shadow-xs ${categoryBadgeClass}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryLabel}
              </span>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {broadcast.discount_percent && (
              <div className="absolute bottom-3 right-3 bg-emerald-500 text-slate-950 font-black text-sm px-3 py-1 rounded-xl shadow-lg flex items-center gap-1">
                <span>{broadcast.discount_percent}% DSCTO</span>
              </div>
            )}
          </div>
        ) : (
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${categoryBadgeClass}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryLabel}
              </span>
              <button 
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DialogTitle className="text-lg font-black mt-2 text-slate-900 dark:text-white">
              {broadcast.title}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3" /> {broadcast.sentAt || 'Publicado recientemente'}
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Cuerpo del contenido */}
        <div className="p-6 space-y-4">
          {broadcast.image_url && (
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {broadcast.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3" /> {broadcast.sentAt || 'Publicado recientemente'}
              </p>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-[#0B0F19] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {broadcast.message}
          </div>

          {/* Tarjeta de Cupón de Descuento Promocional */}
          {broadcast.promo_code && (
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-emerald-500/10 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Código de Promoción</span>
                  {broadcast.discount_percent && (
                    <span className="bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                      -{broadcast.discount_percent}%
                    </span>
                  )}
                </div>
                <div className="font-mono text-base font-black tracking-widest text-slate-900 dark:text-white">
                  {broadcast.promo_code}
                </div>
                {broadcast.expires_at && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    Vigencia hasta: {broadcast.expires_at}
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleCopyCode}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 cursor-pointer shadow-sm shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </Button>
            </div>
          )}

          {/* Botón de Acción Principal */}
          {broadcast.action_label && (
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleAction}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-11 rounded-xl gap-2 cursor-pointer shadow-md transition"
              >
                <span>{broadcast.action_label}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
