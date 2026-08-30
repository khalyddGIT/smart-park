import React, { useState, useMemo, useEffect } from 'react';
import { QrCode, Car, Plus, CheckCircle2, AlertTriangle, DollarSign, LogOut, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEstablishments } from '../context/EstablishmentContext';
import { normalizarPlaca, formatearPlacaConGuion } from '../utils/plateOcr';
import api from '../services/api';
import { CulqiPaymentModal } from './CulqiPaymentModal';
import { useAuth } from '../context/AuthContext';

export const PersonalGaritaModule = () => {
  const { establishments, reservations, createReservation, checkInReservation, checkOutReservation } = useEstablishments();
  const { user } = useAuth();
  const [assignedParkingId, setAssignedParkingId] = useState(null);
  useEffect(()=>{
    if(!user?.email) return;
    api.get('/staff').then(r=>{
      const list=Array.isArray(r.data)?r.data:[];
      const me=list.find(s=>(s.email||'').toLowerCase()===user.email.toLowerCase());
      if(me?.parking_id) setAssignedParkingId(String(me.parking_id));
    }).catch(()=>{});
  },[user?.email]);
  const [selectedEstId, setSelectedEstId] = useState(() => establishments[0]?.id || '');
  useEffect(()=>{ if(assignedParkingId) setSelectedEstId(assignedParkingId); },[assignedParkingId]);
  const currentEst = useMemo(() => {
    if(assignedParkingId) return establishments.find(e => String(e.id)===String(assignedParkingId)) || establishments[0];
    return establishments.find(e => String(e.id)===String(selectedEstId)) || establishments[0];
  }, [establishments, selectedEstId, assignedParkingId]);

  const [tab, setTab] = useState('scanner');
  const [codeInput, setCodeInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [walkInSlot, setWalkInSlot] = useState('');
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
    const activeRes = reservations.filter(r=> String(r.parkingId)===String(currentEst?.id) && r.status==='ACTIVE').map(r=> ({id:r.id, code:r.code, plate:r.plate, slot:r.slot, driver:r.customerName||'Registrado', entry:r.startTime||r.createdAt}));
    return activeRes;
  },[reservations, currentEst]);

  const handleScanner = async () => {
    const raw = (codeInput || plateInput).trim();
    if(!raw) return;
    const code = raw.toUpperCase();
    let r = reservations.find(x=> x.code===code || x.token===code);
    let plate = r ? r.plate : raw;
    const norm = normalizarPlaca(plate);
    if(!r) r = reservations.find(x=> normalizarPlaca(x.plate)===norm && String(x.parkingId)===String(currentEst?.id));
    if(!r){
      setScanResult({found:false, msg:`Sin reserva para "${raw}"`, plate: formatearPlacaConGuion(raw)});
      return;
    }
    const isPaid = paidIds.has(Number(r.id));
    const isScheduled = r.status==='SCHEDULED';
    const isActive = r.status==='ACTIVE';
    setScanResult({found:true, r, isPaid, isScheduled, isActive, msg: isScheduled ? `Reserva ${r.code} — Entrada` : isActive ? `Reserva ${r.code} — Salida` : r.status, plate: r.plate, slot:r.slot});
  };

  const handleCheckIn = async () => {
    if(!scanResult?.r) return;
    const res = await checkInReservation(scanResult.r.code);
    setFeedback(res.message || 'Ingreso registrado');
    setTimeout(()=>setFeedback(''),3000);
    setScanResult(null); setCodeInput('');
  };
  const handleCheckOut = async () => {
    if(!scanResult?.r) return;
    const res = await checkOutReservation(scanResult.r.code);
    setFeedback(res.message || 'Salida registrada');
    setTimeout(()=>setFeedback(''),3000);
    setScanResult(null); setCodeInput('');
  };

  const handleWalkIn = async () => {
    if(!walkInSlot || !plateInput.trim()){ setFeedback('Elige cajón y placa'); setTimeout(()=>setFeedback(''),2500); return; }
    const plate = plateInput.trim().toUpperCase();
    const now=new Date();
    const res=await createReservation({parkingId: currentEst.id, slotCode: walkInSlot, plate, hours: walkInHours, startTime: now.toISOString(), expiresAt: new Date(now.getTime()+walkInHours*3600000).toISOString()});
    if(!res){ setFeedback('Cajón ocupado'); setTimeout(()=>setFeedback(''),3000); return; }
    await checkInReservation(res.code);
    setFeedback(`${walkInSlot} • ${plate} — Ingreso OK`);
    setWalkInSlot(''); setPlateInput('');
    setTimeout(()=>setFeedback(''),3000);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      {/* Header minimal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">{currentEst?.name || 'Mi Sede'}</h2>
          <p className="text-xs text-slate-500">{currentEst?.address || ''} • S/ {Number(currentEst?.rate||5).toFixed(2)}/h</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold">{freeSlots.length} libres</span>
          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold">{occupied} ocupados</span>
          <span className="bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold hidden sm:inline">{vehiclesInside.length} dentro</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={()=>setTab('scanner')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab==='scanner'?'bg-slate-900 text-white':'text-slate-600'}`}>Scanner</button>
        <button onClick={()=>setTab('walkin')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab==='walkin'?'bg-emerald-600 text-white':'text-slate-600'}`}>Ingreso</button>
        <button onClick={()=>setTab('inside')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab==='inside'?'bg-slate-900 text-white':'text-slate-600'}`}>Dentro ({vehiclesInside.length})</button>
      </div>

      {feedback && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{feedback}</div>}

      {tab==='scanner' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white mx-auto flex items-center justify-center"><QrCode className="w-6 h-6"/></div>
            <h3 className="text-sm font-black text-slate-900">Escanear QR o Placa</h3>
            <p className="text-xs text-slate-500">Valida reservas SCHEDULED para ingreso y ACTIVE para salida</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="RSV-xxx • SPK-xxx • ABC-123" value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter') handleScanner()}} className="h-11 font-mono text-sm flex-1"/>
            <Button onClick={handleScanner} className="h-11 px-6 rounded-xl bg-slate-900 text-white font-bold">Validar</Button>
          </div>
          {scanResult && (
            <div className={`p-4 rounded-2xl border ${scanResult.found?'bg-white border-slate-200':'bg-amber-50 border-amber-200'}`}>
              <p className={`text-xs font-bold flex items-center gap-1.5 ${scanResult.found?'text-slate-900':'text-amber-800'}`}>{scanResult.found ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <AlertTriangle className="w-4 h-4 text-amber-600"/>} {scanResult.msg}</p>
              {scanResult.found && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <span className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-mono font-black text-sm">{scanResult.plate}</span>
                    <span className="bg-slate-900 text-white rounded-xl px-3 py-2 font-mono font-bold text-sm">{scanResult.slot}</span>
                    <span className={`rounded-xl px-3 py-2 text-xs font-black ${scanResult.isPaid?'bg-emerald-500 text-white':'bg-rose-500 text-white'}`}>{scanResult.isPaid?'Pagado':'Pendiente'}</span>
                  </div>
                  <div className="flex gap-2">
                    {scanResult.isScheduled && <Button onClick={handleCheckIn} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"><LogIn className="w-4 h-4 mr-1"/> Ingreso</Button>}
                    {scanResult.isActive && <Button onClick={handleCheckOut} className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"><LogOut className="w-4 h-4 mr-1"/> Salida</Button>}
                    {!scanResult.isPaid && <Button variant="outline" onClick={()=>setPayTarget(scanResult.r)} className="h-10 rounded-xl font-bold"><DollarSign className="w-4 h-4 mr-1"/> Cobrar</Button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab==='walkin' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-3">
            <p className="text-xs font-bold text-white mb-2">Toca un cajón libre</p>
            <div className="relative bg-[#1e293b] rounded-xl overflow-hidden" style={{height: 360}}>
              <div style={{width: 1100, height: 700, transform: 'scale(0.32)', transformOrigin: 'top left'}} className="relative bg-[#12161f]">
                {(currentEst?.elements||[]).map(el=>{
                  if(el.type==='slot'){
                    const isFree=el.status==='free';
                    const isSel=walkInSlot===el.code;
                    return (
                      <button key={el.code||el.id} disabled={!isFree} onClick={()=> isFree && setWalkInSlot(el.code)}
                        style={{left: el.x, top: el.y, width: el.w||60, height: el.h||100, transform: el.rot?`rotate(${el.rot}deg)`:undefined}}
                        className={`absolute rounded-lg border-2 flex flex-col items-center justify-center text-[10px] font-mono font-black ${isSel?'bg-emerald-500 text-white border-emerald-400 z-20': isFree?'bg-emerald-900/40 text-emerald-300 border-emerald-500/60':'bg-rose-900/40 text-rose-300 border-rose-500/40 opacity-50'}`}>
                        <span>{el.code}</span>
                      </button>
                    );
                  }
                  if(el.type==='wall') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-slate-600 rounded-sm"/>;
                  if(el.type==='road') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-slate-800 border-y border-dashed border-amber-400/40"/>;
                  if(el.type==='gate') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-emerald-900 border border-emerald-500 rounded-lg flex items-center justify-center text-[7px] font-black text-emerald-300">GARITA</div>;
                  return null;
                })}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">{walkInSlot ? `Seleccionado: ${walkInSlot}` : 'Verde = libre • Rojo = ocupado'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
            <h3 className="text-sm font-black text-slate-900">Ingreso sin reserva</h3>
            <div>
              <label className="text-xs font-bold text-slate-700">Placa</label>
              <Input placeholder="ABC-123" value={plateInput} onChange={e=>setPlateInput(e.target.value.toUpperCase())} className="h-11 font-mono font-black uppercase mt-1"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Horas</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1,2,4,8].map(h=> <button key={h} onClick={()=>setWalkInHours(h)} className={`h-10 rounded-xl font-bold text-sm border ${walkInHours===h?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-700 border-slate-200'}`}>{h}h</button>)}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total</span>
              <span className="text-lg font-black font-mono text-slate-900">S/ {(Number(currentEst?.rate||5)*walkInHours).toFixed(2)}</span>
            </div>
            <Button onClick={handleWalkIn} disabled={!walkInSlot || !plateInput.trim()} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40">
              <Plus className="w-4 h-4 mr-1"/> Registrar {walkInSlot && `• ${walkInSlot}`}
            </Button>
          </div>
        </div>
      )}

      {tab==='inside' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Dentro • {vehiclesInside.length}</span>
            <span className="text-xs text-slate-500">{currentEst?.name}</span>
          </div>
          {vehiclesInside.length===0 ? <div className="p-10 text-center text-sm text-slate-400">Vacío</div> : (
            <div className="divide-y divide-slate-100">
              {vehiclesInside.map(v=>{
                const mins=Math.max(0,Math.round((Date.now()-new Date(v.entry).getTime())/60000)); const h=Math.floor(mins/60); const m=mins%60;
                return (
                  <div key={v.code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg">{v.slot}</span>
                      <div>
                        <p className="font-mono font-black text-sm text-slate-900">{v.plate}</p>
                        <p className="text-xs text-slate-500">{v.driver} • {h}h {m}m</p>
                      </div>
                    </div>
                    <button onClick={()=>{ setCodeInput(v.code); setTab('scanner'); }} className="text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl">Ver</button>
                  </div>
                );
              })}
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
