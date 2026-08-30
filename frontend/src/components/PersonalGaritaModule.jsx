import React, { useState, useMemo, useEffect } from 'react';
import { Car, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEstablishments } from '../context/EstablishmentContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const PersonalGaritaModule = () => {
  const { establishments, reservations, createReservation, checkInReservation, checkOutReservation, ensureFloorPlan } = useEstablishments();
  const { user } = useAuth();
  const [assignedParkingId, setAssignedParkingId] = useState(null);
  useEffect(()=>{
    if(!user?.email) return;
    api.get('/staff').then(r=>{
      const me=(Array.isArray(r.data)?r.data:[]).find(s=>(s.email||'').toLowerCase()===user.email.toLowerCase());
      if(me?.parking_id) setAssignedParkingId(String(me.parking_id));
    }).catch(()=>{});
  },[user?.email]);

  const currentEst = useMemo(()=>{
    if(assignedParkingId) return establishments.find(e=>String(e.id)===String(assignedParkingId)) || establishments[0];
    return establishments[0];
  },[establishments, assignedParkingId]);

  // Asegura que el plano del parking asignado esté hidratado (si elements===null estaba en carga)
  useEffect(()=>{
    if(currentEst && currentEst.elements===null && currentEst.id && !String(currentEst.id).startsWith('EST-')){
      ensureFloorPlan(currentEst.id);
    }
  },[currentEst?.id, currentEst?.elements]);

  const [plate, setPlate] = useState('');
  const [slot, setSlot] = useState('');
  const [hours, setHours] = useState(2);
  const [feedback, setFeedback] = useState('');

  const freeSlots = useMemo(()=> (currentEst?.elements||[]).filter(e=>e.type==='slot' && e.status==='free'), [currentEst]);
  const vehiclesInside = useMemo(()=> reservations.filter(r=> String(r.parkingId)===String(currentEst?.id) && r.status==='ACTIVE').map(r=> ({id:r.id, code:r.code, plate:r.plate, slot:r.slot, entry:r.startTime||r.createdAt})), [reservations, currentEst]);

  const handleIngreso = async () => {
    if(!slot || !plate.trim()){ setFeedback('Elige cajón y placa'); setTimeout(()=>setFeedback(''),2500); return; }
    const now=new Date();
    const res=await createReservation({parkingId: currentEst.id, slotCode: slot, plate: plate.trim().toUpperCase(), hours, startTime: now.toISOString(), expiresAt: new Date(now.getTime()+hours*3600000).toISOString()});
    if(!res){ setFeedback('Cajón ocupado'); setTimeout(()=>setFeedback(''),2500); return; }
    await checkInReservation(res.code);
    setFeedback(`${slot} • ${plate.toUpperCase()} ingreso OK`);
    setSlot(''); setPlate('');
    setTimeout(()=>setFeedback(''),3000);
  };

  const handleSalida = async (code) => {
    const r=await checkOutReservation(code);
    setFeedback(r.message || 'Salida OK');
    setTimeout(()=>setFeedback(''),3000);
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900">{currentEst?.name || 'Mi Cochera'}</h2>
          <p className="text-xs text-slate-500">{freeSlots.length} libres • {vehiclesInside.length} dentro • S/ {Number(currentEst?.rate||5).toFixed(2)}/h</p>
        </div>
        <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">{currentEst?.level || 'Playa'}</span>
      </div>

      {feedback && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{feedback}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-3">
          <p className="text-xs font-bold text-white mb-2">Plano — toca un cajón libre</p>
          {currentEst?.elements===null ? (
            <div className="h-[380px] flex items-center justify-center text-xs text-slate-400">Cargando plano del parking...</div>
          ) : (
            <>
          <div className="relative bg-[#1e293b] rounded-xl overflow-hidden" style={{height: 380}}>
            <div style={{width: 1100, height: 700, transform: 'scale(0.33)', transformOrigin: 'top left'}} className="relative bg-[#12161f]">
              {(currentEst?.elements||[]).map(el=>{
                if(el.type==='slot'){
                  const isFree=el.status==='free';
                  const isSel=slot===el.code;
                  return (
                    <button key={el.code||el.id} disabled={!isFree} onClick={()=> isFree && setSlot(el.code)}
                      style={{left: el.x, top: el.y, width: el.w||60, height: el.h||100}}
                      className={`absolute rounded-lg border-2 flex flex-col items-center justify-center text-[10px] font-mono font-black ${isSel?'bg-emerald-500 text-white border-emerald-400 z-20': isFree?'bg-emerald-900/40 text-emerald-300 border-emerald-500/60':'bg-rose-900/40 text-rose-300 border-rose-500/40 opacity-60'}`}>
                      <span>{el.code}</span>
                    </button>
                  );
                }
                if(el.type==='wall') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-slate-600 rounded-sm"/>;
                if(el.type==='gate') return <div key={el.id} style={{left: el.x, top: el.y, width: el.w, height: el.h}} className="absolute bg-emerald-900 border border-emerald-500 rounded-lg flex items-center justify-center text-[7px] font-black text-emerald-300">GARITA</div>;
                return null;
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">{slot ? `Seleccionado: ${slot}` : 'Verde = libre'}</p>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Registrar ingreso presencial</h3>
            <div>
              <label className="text-xs font-bold text-slate-700">Placa</label>
              <Input placeholder="ABC-123" value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} className="h-11 font-mono font-black uppercase mt-1"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Cajón</label>
              <div className="mt-1 h-11 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900">{slot || '— toca en el plano'}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Horas</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1,2,4,8].map(h=> <button key={h} onClick={()=>setHours(h)} className={`h-10 rounded-xl font-bold border ${hours===h?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-700 border-slate-200'}`}>{h}h</button>)}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total</span>
              <span className="text-lg font-black font-mono">S/ {(Number(currentEst?.rate||5)*hours).toFixed(2)}</span>
            </div>
            <Button onClick={handleIngreso} disabled={!slot || !plate.trim()} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40">
              <Plus className="w-4 h-4 mr-1"/> Registrar ingreso
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><Car className="w-4 h-4 text-slate-700"/> Dentro • {vehiclesInside.length}</span>
            </div>
            {vehiclesInside.length===0 ? <div className="p-8 text-center text-sm text-slate-400">Vacío</div> : (
              <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {vehiclesInside.map(v=>{
                  const mins=Math.max(0,Math.round((Date.now()-new Date(v.entry).getTime())/60000)); const h=Math.floor(mins/60); const m=mins%60;
                  return (
                    <div key={v.code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2 py-1 rounded-lg">{v.slot}</span>
                        <div>
                          <p className="font-mono font-black text-sm">{v.plate}</p>
                          <p className="text-xs text-slate-500">{h}h {m}m dentro</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={()=>handleSalida(v.code)} className="h-8 rounded-xl text-xs font-bold">Salida</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
