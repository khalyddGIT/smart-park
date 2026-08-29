import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { X, Move, RefreshCw, CheckCircle2, Camera as CamIcon, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

const CAD_W = 1100;
const CAD_H = 700;
const DEFAULT_CAL = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Calibrador visual: alinea la vista de la camara fisica con el lienzo CAD del
 * plano (1100x700). El recuadro verde representa "donde cae todo el plano"
 * dentro de la foto; los mini-rectangulos son los cajones proyectados.
 */
export const CameraCalibrator = ({ onClose, slots = [], initialCal, grabFrame, onSave }) => {
  const [src, setSrc] = useState(null);
  const [loadingFrame, setLoadingFrame] = useState(false);
  const [cal, setCal] = useState(() => ({
    x: Number(initialCal?.x ?? DEFAULT_CAL.x),
    y: Number(initialCal?.y ?? DEFAULT_CAL.y),
    w: Number(initialCal?.w ?? DEFAULT_CAL.w),
    h: Number(initialCal?.h ?? DEFAULT_CAL.h),
  }));
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  const loadFrame = useCallback(async () => {
    setLoadingFrame(true);
    try {
      const dataUrl = await grabFrame();
      if (!dataUrl) {
        toast.error('Sin imagen: configura la URL de la camara o activa la WebCam de garita.');
        return;
      }
      setSrc(dataUrl);
    } catch {
      toast.error('No se pudo obtener un frame de la camara');
    } finally {
      setLoadingFrame(false);
    }
  }, [grabFrame]);

  useEffect(() => { loadFrame(); }, [loadFrame]);

  const pctFromEvent = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      px: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      py: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onMove = (e) => {
    if (!dragRef.current) return;
    const { mode, px, py, startCal } = dragRef.current;
    const cur = pctFromEvent(e);
    const dx = cur.px - px;
    const dy = cur.py - py;
    setCal(() => {
      const n = { ...startCal };
      if (mode === 'move') {
        n.x = Math.min(1 - n.w, Math.max(0, startCal.x + dx));
        n.y = Math.min(1 - n.h, Math.max(0, startCal.y + dy));
      } else {
        n.w = Math.min(1 - n.x, Math.max(0.08, startCal.w + dx));
        n.h = Math.min(1 - n.y, Math.max(0.08, startCal.h + dy));
      }
      return n;
    });
  };

  const endDrag = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
  };

  const startDrag = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, ...pctFromEvent(e), startCal: { ...cal } };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
  };

  // Proyección de los cajones CAD sobre el frame según la zona actual
  const projected = slots.slice(0, 400).map(el => {
    const leftPct = cal.x * 100 + (el.x || 0) * (cal.w * 100) / CAD_W;
    const topPct = cal.y * 100 + (el.y || 0) * (cal.h * 100) / CAD_H;
    const wPct = (el.w || 60) * (cal.w * 100) / CAD_W;
    const hPct = (el.h || 100) * (cal.h * 100) / CAD_H;
    return {
      code: el.code,
      left: leftPct, top: topPct,
      w: Math.max(wPct, 0.4), h: Math.max(hPct, 0.4),
      hidden: topPct >= 100 || leftPct >= 100 || leftPct < -5 || topPct < -5,
      occupied: el.status === 'occupied',
    };
  });

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(cal);
    setSaving(false);
    if (ok) onClose();
  };

// === JSX ===
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Calibrador Visual de Zonas</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Arrastra el recuadro verde hasta cubrir donde empieza y termina tu playon real; los cajones CAD se proyectan para verificar.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          {!src ? (
            <div className="aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-300">
              <CamIcon className="w-8 h-8 opacity-50" />
              <p className="text-xs font-semibold">{loadingFrame ? 'Obteniendo frame de la camara...' : 'No hay imagen disponible'}</p>
              <Button size="sm" onClick={loadFrame} disabled={loadingFrame} className="gap-1.5">
                <RefreshCw className={'w-4 h-4 ' + (loadingFrame ? 'animate-spin' : '')} /> Reintentar captura
              </Button>
            </div>
          ) : (
            <div ref={wrapRef} className="relative mx-auto select-none touch-none">
              <img src={src} alt="Frame de camara" draggable={false} className="block max-w-full max-h-[60vh] rounded-xl pointer-events-none" />
              {/* Zona calibrada (movible/redimensionable) */}
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-400/10 cursor-move"
                style={{ left: `${cal.x * 100}%`, top: `${cal.y * 100}%`, width: `${cal.w * 100}%`, height: `${cal.h * 100}%` }}
                onPointerDown={startDrag('move')}
              >
                <span className="absolute -top-5 left-0 whitespace-nowrap text-[9px] font-black tracking-widest text-emerald-600 drop-shadow">ZONA = PLANO COMPLETO</span>
                <div
                  onPointerDown={startDrag('resize')}
                  className="absolute -right-2.5 -bottom-2.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg cursor-nwse-resize flex items-center justify-center"
                >
                  <Move className="w-3 h-3 text-white rotate-45" />
                </div>
              </div>
              {/* Proyeccion de cajones del plano */}
              {projected.filter(p => !p.hidden).map(p => (
                <div key={p.code} title={p.code}
                  style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.w}%`, height: `${p.h}%` }}
                  className={'absolute border rounded-[2px] pointer-events-none ' + (p.occupied ? 'border-rose-400/90 bg-rose-400/20' : 'border-sky-300/80 bg-sky-300/10')}>
                  <span className="absolute -top-[9px] left-[1px] text-[7px] font-black text-white bg-slate-900/80 rounded px-0.5">{p.code}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {[['x', 'X'], ['y', 'Y'], ['w', 'ANCHO'], ['h', 'ALTO']].map(([k, label]) => (
              <label key={k} className="text-[10px] font-black tracking-widest text-slate-500">
                {label} (%)
                <input type="number" min={k === 'x' || k === 'y' ? 0 : 8} max={95} step={1}
                  value={Math.round(cal[k] * 100)}
                  onChange={(e) => { const v = Number(e.target.value) / 100; setCal(prev => ({ ...prev, [k]: v })); }}
                  className="mt-1 w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={handleSave} disabled={!src || saving} className="gap-1.5">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Guardar Calibracion
            </Button>
            <Button variant="secondary" onClick={() => setCal({ ...DEFAULT_CAL })} className="gap-1.5">
              <RotateCcw className="w-4 h-4 text-slate-500" /> Restablecer
            </Button>
            <Button variant="ghost" onClick={loadFrame} disabled={loadingFrame} className="gap-1.5 ml-auto">
              <RefreshCw className={'w-4 h-4 ' + (loadingFrame ? 'animate-spin' : '')} /> Nuevo frame
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            La IA interpretara que TODO tu plano CAD esta dentro del recuadro verde. Celeste = cajon libre esperado · Rosado = cajon ocupado actualmente.
          </p>
        </div>
      </div>
    </div>
  );
};

