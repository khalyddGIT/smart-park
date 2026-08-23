import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle2, XCircle, Clock, MapPin, Car, Calendar, Hash, AlertTriangle, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export const VerifyReservationPage = () => {
  const codeFromPath = typeof window !== 'undefined' ? decodeURIComponent(window.location.pathname.replace(/^\/verify\//, '').split('?')[0].split('#')[0]) : '';
  const code = codeFromPath || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/reservations/verify/${encodeURIComponent(code)}`)
      .then(res => { if (!cancelled) { setData(res.data); setError(null); } })
      .catch(err => { if (!cancelled) setError(err?.response?.data?.detail || 'No se pudo verificar la reserva.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  const statusMeta = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'active') return { label: 'Activa — Vehículo dentro', color: 'emerald', Icon: CheckCircle2 };
    if (v === 'scheduled') return { label: 'Programada — Esperando ingreso', color: 'amber', Icon: Clock };
    if (v === 'completed') return { label: 'Completada', color: 'slate', Icon: CheckCircle2 };
    if (v === 'cancelled') return { label: 'Cancelada', color: 'rose', Icon: XCircle };
    return { label: s || '—', color: 'slate', Icon: ShieldCheck };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm font-bold text-slate-500 mt-3">Verificando reserva {code}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-rose-200">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-black text-slate-900">Reserva no encontrada</h1>
          <p className="text-xs text-slate-500">{error}</p>
          <p className="text-xs text-slate-400">Código consultado: <span className="font-mono font-bold">{code}</span></p>
          <a href="/"><Button variant="outline" className="w-full gap-2 rounded-xl text-xs font-bold"><ArrowLeft className="w-4 h-4" />Volver al inicio</Button></a>
        </Card>
      </div>
    );
  }

  const meta = statusMeta(data.status);
  const valid = ['scheduled', 'active'].includes((data.status || '').toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />Smart Park
        </a>

        <Card className={`p-6 space-y-4 border-2 ${valid ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${valid ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <meta.Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Estado de la reserva</p>
              <p className={`text-sm font-black ${valid ? 'text-emerald-700' : 'text-slate-700'}`}>{meta.label}</p>
            </div>
            {valid && <span className="ml-auto text-[10px] font-black uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-full">Válido</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Hash className="w-4 h-4 shrink-0" />Código</p>
              <p className="font-mono font-black text-slate-900 mt-1">{data.code}</p>
              <p className="font-mono text-[11px] text-slate-500 break-all">{data.qr_code}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Car className="w-4 h-4 shrink-0" />Placa</p>
              <p className="font-mono font-black text-slate-900 mt-1">{data.license_plate}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 col-span-2">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-4 h-4 shrink-0" />Sede / Cajón</p>
              <p className="font-bold text-slate-900 mt-1">{data.parking_name} — {data.slot_code}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Calendar className="w-4 h-4 shrink-0" />Ingreso</p>
              <p className="font-bold text-slate-900 mt-1">{new Date(data.start_time).toLocaleString('es-PE')}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-4 h-4 shrink-0" />Vence</p>
              <p className="font-bold text-slate-900 mt-1">{new Date(data.end_time).toLocaleString('es-PE')}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">Total</span>
            <span className="text-base font-black font-mono text-emerald-700">S/ {Number(data.total_cost).toFixed(2)}</span>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Verificación en vivo contra el servidor · Escaneado el {new Date().toLocaleString('es-PE')}
          </p>
        </Card>

        {!valid && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Esta reserva ya no autoriza el ingreso. Si es un error, contacta a garita.</span>
          </div>
        )}
      </div>
    </div>
  );
};
