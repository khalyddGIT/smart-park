import React, { useState, useMemo, useEffect } from 'react';
import { QrCode, Car, ScanLine, Plus, Clock, CheckCircle2, AlertTriangle, DollarSign, LogOut, LogIn, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEstablishments } from '../context/EstablishmentContext';
import { normalizarPlaca, formatearPlacaConGuion } from '../utils/plateOcr';
import api from '../services/api';
import { CulqiPaymentModal } from './CulqiPaymentModal';

export const PersonalGaritaModule = () => {
  const { establishments, reservations, createReservation, checkInReservation, checkOutReservation } = useEstablishments();
  const [selectedEstId, setSelectedEstId] = useState(() => establishments[0]?.id || '');
  const currentEst = useMemo(() => establishments.find(e => String(e.id)===String(selectedEstId)) || establishments[0], [establishments, selectedEstId]);
  const [tab, setTab] = useState('scanner'); // scanner | walkin | inside
  const [codeInput, setCodeInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [walkInSlot, setWalkInSlot] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInHours, setWalkInHours] = useState(2);
  const [scanResult, setScanResult] = useState(null);
  const [paidIds, setPaidIds] = useState(new Set());
  const [payTarget, setPayTarget] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(()=>{
    const token=localStorage.getItem('smart_park_access_token');
    if(!token) return;
    api.get('/payments/my').then(r=>{
      const ids=new Set((Array.isArray(r.data)?r.data:[]).filter(p=>p.status==='succeeded'&&p.reservation_id).map(p=>Number(p.reservation_id)));
      setPaidIds(ids);
    }).catch(()=>{});
  },[reservations.length]);

  const freeSlots = useMemo(()=> (currentEst?.elements||[]).filter(e=>e.type==='slot' && e.status==='free'), [currentEst]);
  const occupied = (currentEst?.elements||[]).filter(e=>e.type==='slot' && e.status==='occupied').length;
  const total = (currentEst?.elements||[]).filter(e=>e.type==='slot').length;

  const vehiclesInside = useMemo(()=>{
    const activeRes = reservations.filter(r=> String(r.parkingId)===String(selectedEstId) && r.status==='ACTIVE').map(r=> ({id:r.id, code:r.code, plate:r.plate, slot:r.slot, driver:r.customerName||'Registrado', entry:r.startTime||r.createdAt, rate:r.ratePerHour||currentEst?.rate||5}));
    return activeRes;
  },[reservations, selectedEstId, currentEst]);

  const handleScanner = async () => {
    const raw = (codeInput || plateInput).trim();
    if(!raw) return;
    const code = raw.toUpperCase();
    // try code/token first
    let r = reservations.find(x=> x.code===code || x.token===code);
    let plate = r ? r.plate : raw;
    const norm = normalizarPlaca(plate);
    if(!r) r = reservations.find(x=> normalizarPlaca(x.plate)===norm && String(x.parkingId)===String(selectedEstId));
    if(!r){
      setScanResult({found:false, msg:`No hay reserva SCHEDULED/ACTIVE para "${raw}" en ${currentEst?.name}`, plate: formatearPlacaConGuion(raw)});
      return;
    }
    const isPaid = paidIds.has(Number(r.id));
    const isScheduled = r.status==='SCHEDULED';
    const isActive = r.status==='ACTIVE';
    setScanResult({found:true, r, isPaid, isScheduled, isActive, msg: isScheduled ? `Reserva ${r.code} SCHEDULED - lista para check-in` : isActive ? `Reserva ${r.code} ACTIVE - lista para check-out` : `Reserva ${r.code} ${r.status}`, plate: r.plate, slot:r.slot});
  };

  const handleCheckIn = async () => {
    if(!scanResult?.r) return;
    const res = await checkInReservation(scanResult.r.code);
    setFeedback(res.message || 'Check-in OK');
    setTimeout(()=>setFeedback(''),3000);
    setScanResult(null); setCodeInput('');
  };
  const handleCheckOut = async () => {
    if(!scanResult?.r) return;
    const res = await checkOutReservation(scanResult.r.code);
    setFeedback(res.message || 'Check-out OK');
    setTimeout(()=>setFeedback(''),3000);
    setScanResult(null); setCodeInput('');
  };

  const handleWalkIn = async () => {
    if(!walkInSlot || !plateInput.trim()){ setFeedback('Elige cajón y placa'); setTimeout(()=>setFeedback(''),2500); return; }
    const plate = plateInput.trim().toUpperCase();
    const now=new Date();
    const res=await createReservation({parkingId: currentEst.id, slotCode: walkInSlot, plate, hours: walkInHours, startTime: now.toISOString(), expiresAt: new Date(now.getTime()+walkInHours*3600000).toISOString()});
    if(!res){ setFeedback('No se pudo emitir ticket (cajón ocupado)'); setTimeout(()=>setFeedback(''),3000); return; }
    await checkInReservation(res.code);
    setFeedback(`Ticket ${res.code} ${walkInSlot} para ${plate} - check-in OK`);
    setWalkInSlot(''); setPlateInput(''); setWalkInName('');
    setTimeout(()=>setFeedback(''),3000);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      <div className="bg-slate-900 rounded-[20px] border border-slate-800 p-4 text-white flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><ScanLine className="w-5 h-5 text-emerald-400"/></div>
            <div>
              <h2 className="text-sm font-black">Garita Personal — Operativa</h2>
              <p className="text-xs text-slate-400">Solo lectura de cámara + scanner + walk-in + en cochera</p>
            </div>
          </div>
          <select value={selectedEstId} onChange={e=>setSelectedEstId(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none">
            {establishments.map(est=> <option key={est.id} value={est.id} className="text-slate-900">{est.name}</option>)}
          </select>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-3 flex items-center gap-3">
          <img src={currentEst?.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'} alt="cam" className="w-20 h-14 rounded-xl object-cover border border-white/20"/>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] tracking-widest font-black text-slate-400">LIBRES</p><p className="text-sm font-mono font-black text-emerald-400">{freeSlots.length}/{total}</p></div>
            <div><p className="text-[10px] tracking-widest font-black text-slate-400">OCUPADAS</p><p className="text-sm font-mono font-black text-rose-400">{occupied}/{total}</p></div>
            <div><p className="text-[10px] tracking-widest font-black text-slate-400">EN COCHERA</p><p className="text-sm font-mono font-black text-white">{vehiclesInside.length}</p></div>
          </div>
          <span className="text-[10px] font-black tracking-widest border border-white/20 rounded-full px-2 py-1 hidden sm:inline">SOLO LECTURA</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={()=>setTab('scanner')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${tab==='scanner'?'bg-slate-900 text-white shadow':'text-slate-600 hover:bg-white'}`}><QrCode className="w-3.5 h-3.5"/> Scanner</button>
        <button onClick={()=>setTab('walkin')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${tab==='walkin'?'bg-emerald-600 text-white shadow':'text-slate-600 hover:bg-white'}`}><Plus className="w-3.5 h-3.5"/> Walk-in</button>
        <button onClick={()=>setTab('inside')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${tab==='inside'?'bg-slate-900 text-white shadow':'text-slate-600 hover:bg-white'}`}><Car className="w-3.5 h-3.5"/> En cochera ({vehiclesInside.length})</button>
      </div>

      {feedback && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/>{feedback}</div>}

      {tab==='scanner' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-600"/> Validar QR / Placa — Entrada y Salida</h3>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <Input placeholder="Pega RSV-xxx, token SPK-... o placa ABC-123" value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter') handleScanner()}} className="h-10 font-mono text-xs"/>
            <Button onClick={handleScanner} className="h-10 rounded-xl bg-slate-900 text-white font-black text-xs gap-1.5"><ScanLine className="w-4 h-4"/> Validar</Button>
          </div>
          <p className="text-[11px] text-slate-500">Tip: usa pistola lectora + Enter. Busca SCHEDULED para check-in y ACTIVE para check-out en esta sede.</p>
          {scanResult && (
            <div className={`p-3 rounded-2xl border text-xs ${scanResult.found?'bg-emerald-50 border-emerald-200 text-emerald-900':'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <p className="font-bold flex items-center gap-1.5">{scanResult.found ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <AlertTriangle className="w-4 h-4 text-amber-600"/>} {scanResult.msg}</p>
              {scanResult.found && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-black bg-white border border-slate-200 px-2 py-1 rounded-lg">{scanResult.plate}</span>
                    <span className="font-mono bg-white border border-slate-200 px-2 py-1 rounded-lg">Cajón {scanResult.slot}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${scanResult.isPaid?'bg-emerald-500 text-white border-emerald-500':'bg-rose-500 text-white border-rose-500'}`}>{scanResult.isPaid?'PAGADO':'PENDIENTE'}</span>
                  </div>
                  <div className="flex gap-2">
                    {scanResult.isScheduled && <Button onClick={handleCheckIn} className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1"><LogIn className="w-3.5 h-3.5"/> Check-in + Abrir</Button>}
                    {scanResult.isActive && <Button onClick={handleCheckOut} className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-xs gap-1"><LogOut className="w-3.5 h-3.5"/> Check-out + Liquidar</Button>}
                    {!scanResult.isPaid && <Button variant="outline" onClick={()=>setPayTarget(scanResult.r)} className="h-9 rounded-xl text-xs font-bold gap-1"><DollarSign className="w-3.5 h-3.5"/> Cobrar</Button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab==='walkin' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600"/> Walk-in rápido — Sin reserva previa</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Placa *</label>
              <Input placeholder="ABC-123" value={plateInput} onChange={e=>setPlateInput(e.target.value.toUpperCase())} className="h-10 font-mono font-black text-xs uppercase"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Horas</label>
              <select value={walkInHours} onChange={e=>setWalkInHours(Number(e.target.value))} className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold">
                <option value={1}>1h</option><option value={2}>2h</option><option value={4}>4h</option><option value={8}>8h</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Mapa del parking — toca un cajón libre *</label>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg font-mono">{freeSlots.length} libres / {total}</span>
            </div>
            {/* Plano visual del parking para el trabajador */}
            <div className="relative bg-[#0f172a] rounded-2xl border-2 border-slate-800 overflow-hidden p-2" style={{height: 340}}>
              <div className="absolute inset-2 bg-[#1e293b] rounded-xl overflow-hidden">
                <div style={{width: 1100, height: 700, transform: 'scale(0.31)', transformOrigin: 'top left'}} className="relative bg-[#12161f]">
                  {(currentEst?.elements||[]).map(el=>{
                    if(el.type==='slot'){
                      const isFree=el.status==='free';
                      const isSelected=walkInSlot===el.code;
                      return (
                        <button key={el.code||el.id} type="button" disabled={!isFree} onClick={()=> isFree && setWalkInSlot(el.code)}
                          style={{left: el.x, top: el.y, width: el.w||60, height: el.h||100, transform: el.rot?`rotate(${el.rot}deg)`:undefined}}
                          className={`absolute rounded-lg border-2 flex flex-col items-center justify-center text-[10px] font-mono font-black transition ${isSelected?'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300 z-20': isFree?'bg-emerald-900/40 text-emerald-300 border-emerald-500/60 hover:bg-emerald-800/60':'bg-rose-900/40 text-rose-300 border-rose-500/50 opacity-60 cursor-not-allowed'}`}>
                          <span>{el.code}</span>
                          <span className="text-[8px]">{isFree?'LIBRE':'OCUPADO'}</span>
                        </button>
                      );
                    }
                    if(el.type==='wall') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-slate-600 rounded-sm"/>;
                    if(el.type==='road') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-slate-800 border-y border-dashed border-amber-400/50 flex items-center justify-center text-[9px] font-bold text-amber-300">CARRIL</div>;
                    if(el.type==='gate') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-emerald-900 border border-emerald-500 rounded-lg flex items-center justify-center text-[8px] font-black text-emerald-300">GARITA</div>;
                    return null;
                  })}
                </div>
              </div>
              {walkInSlot && <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow">Seleccionado: {walkInSlot}</div>}
            </div>
            {freeSlots.length===0 && <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold text-center">Sin cajones libres</div>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nombre conductor (opcional)</label>
            <Input placeholder="Nombres" value={walkInName} onChange={e=>setWalkInName(e.target.value)} className="h-10 text-xs"/>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Total estimado</span>
            <span className="text-lg font-black font-mono text-emerald-700">S/ {(Number(currentEst?.rate||5)*walkInHours).toFixed(2)}</span>
          </div>
          <Button onClick={handleWalkIn} disabled={!walkInSlot || !plateInput.trim()} className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5"><Plus className="w-4 h-4"/> Emitir ticket {walkInSlot && `• ${walkInSlot}`} y check-in</Button>
        </div>
      )}

      {tab==='inside' && (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-2"><Car className="w-4 h-4 text-emerald-600"/> En cochera • {vehiclesInside.length}</span>
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1"><Camera className="w-3 h-3"/> {currentEst?.name}</span>
          </div>
          {vehiclesInside.length===0 ? <div className="p-8 text-center text-xs text-slate-500">Sin vehículos con check-in activo en esta sede.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-2 text-left">Placa</th><th className="px-3 py-2 text-left">Cajón</th><th className="px-3 py-2 text-left">Conductor</th><th className="px-3 py-2 text-left">Entrada</th><th className="px-3 py-2 text-left">Tiempo</th><th className="px-3 py-2 text-right">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {vehiclesInside.map(v=>{
                    const entry=new Date(v.entry); const mins=Math.max(0,Math.round((Date.now()-entry.getTime())/60000)); const h=Math.floor(mins/60); const m=mins%60; const isPaid=paidIds.has(Number(v.id));
                    return (
                      <tr key={v.code+v.plate} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-black">{v.plate}</td>
                        <td className="px-3 py-2 font-mono font-bold">{v.slot}</td>
                        <td className="px-3 py-2 truncate max-w-[120px]">{v.driver}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{entry.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="px-3 py-2 font-mono">{h}h {m}m</td>
                        <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                          {isPaid ? <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">PAGADO</span> : <button onClick={()=>setPayTarget(reservations.find(x=>String(x.id)===String(v.id)))} className="text-[10px] font-black bg-amber-500 text-slate-900 px-2 py-1 rounded-lg">Cobrar</button>}
                          <button onClick={()=>{ setCodeInput(v.code); setTab('scanner'); }} className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg">Ver</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payTarget && (
        <CulqiPaymentModal isOpen={!!payTarget} onClose={()=>setPayTarget(null)} amount={Number(payTarget.cost||10)} concept={`Garita ${payTarget.plate} — ${payTarget.slot}`} parkingName={String(payTarget.parking||currentEst?.name)} slotCode={String(payTarget.slot||'')} reservationId={Number(payTarget.id)} onPaymentSuccess={()=>{ setPaidIds(prev=> new Set([...prev, Number(payTarget.id)])); setPayTarget(null); }} />
      )}
    </div>
  );
};
