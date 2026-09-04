import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  variant = 'destructive',
  icon,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/90 shadow-2xl dark:shadow-black/60">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variant === 'destructive' ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400'}`}>
              {icon || (variant === 'destructive' ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0 space-y-1">
                <DialogTitle className="text-sm font-black text-slate-900 dark:text-white text-left">{title}</DialogTitle>
                <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={() => { onConfirm?.(); onOpenChange(false); }}
              className={`h-9 rounded-xl text-xs font-black gap-1.5 ${variant === 'destructive' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20' : 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
