import React, { useState, useMemo, useEffect } from 'react';
import { Car, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEstablishments } from '../context/EstablishmentContext';
import { useAuth } from '../context/AuthContext';
import { AutoFitFloorPlan } from './AutoFitFloorPlan';
import api from '../services/api';

export const PersonalGaritaModule = () => {
  const { establishments, reservations, createReservation, checkInReservation, checkOutReservation, ensureFloorPlan, fetchParkings } = useEstablishments();
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
  const [payMethod, setPayMethod] = useState('efectivo');
  const [feedback, setFeedback] = useState('');
  const [garitaReservations, setGaritaReservations] = useState([]);

  const fetchGaritaReservations = async () => {
    if(!currentEst?.id || String(currentEst.id).startsWith('EST-')) return;
    try {
      const r = await api.get('/reservations', { params: { parking_id: Number(currentEst.id) } });
      if(Array.isArray(r.data)) setGaritaReservations(r.data.map(x=> ({
        id: x.id, code: x.code, plate: x.license_plate, slotId: x.slot_id, parkingId: String(x.parking_id),
        status: (x.status||'scheduled').toUpperCase(), startTime: x.start_time, endTime: x.end_time, total_cost: x.total_cost
      })));
    } catch {}
  };
  useEffect(()=>{
    fetchGaritaReservations();
    const iv=setInterval(()=>{
      if(document.visibilityState==='visible') fetchGaritaReservations();
    }, 30000);
    const onVis=()=>{ if(document.visibilityState==='visible') fetchGaritaReservations(); };
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  },[currentEst?.id]);

  const freeSlots = useMemo(()=> (currentEst?.elements||[]).filter(e=>e.type==='slot' && e.status==='free'), [currentEst]);
  const vehiclesInside = useMemo(()=>{
    const src = garitaReservations.length ? garitaReservations : reservations;
    return src.filter(r=> {
      const pid = String(r.parkingId || r.parking_id || '');
      return pid===String(currentEst?.id) && (r.status||'').toUpperCase()==='ACTIVE';
    }).map(r=>{
      let slotCode=r.slot||'';
      if(!slotCode && r.slotId){
        const el=(currentEst?.elements||[]).find(e=> String(e.id)===String(r.slotId));
        if(el) slotCode=el.code;
      }
      return {id:r.id, code:r.code, plate:r.plate||r.license_plate, slot: slotCode||r.slotId, entry: r.startTime||r.start_time||r.createdAt};
    });
  },[garitaReservations, reservations, currentEst]);

  const handleIngreso = async () => {
    if(!slot || !plate.trim()){ setFeedback('Elige cajón y placa'); setTimeout(()=>setFeedback(''),2500); return; }
    const now=new Date();
    const isPendiente = payMethod==='pendiente';
    const res=await createReservation({parkingId: currentEst.id, slotCode: slot, plate: plate.trim().toUpperCase(), hours, startTime: now.toISOString(), expiresAt: new Date(now.getTime()+hours*3600000).toISOString(), paymentMethod: isPendiente? null : payMethod, payNow: !isPendiente});
    if(!res){ setFeedback('Cajón ocupado'); setTimeout(()=>setFeedback(''),2500); return; }
    await checkInReservation(res.code);
    setFeedback(`${slot} • ${plate.toUpperCase()} ingreso OK ${isPendiente?' (pendiente)':`(${payMethod})`}`);
    setSlot(''); setPlate('');
    setTimeout(()=>setFeedback(''),3000);
    fetchGaritaReservations();
    try { await fetchParkings(); await ensureFloorPlan(String(currentEst.id)); } catch {}
  };

  const handleSalida = async (code) => {
    const r=await checkOutReservation(code);
    setFeedback(r.message || 'Salida OK');
    setTimeout(()=>setFeedback(''),3000);
    fetchGaritaReservations();
    try { await fetchParkings(); await ensureFloorPlan(String(currentEst.id)); } catch {}
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-900 leading-snug">{currentEst?.name || 'Mi Cochera'}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{freeSlots.length} libres</span>
            <span>•</span>
            <span className="font-bold text-slate-700">{vehiclesInside.length} dentro</span>
            <span>•</span>
            <span className="font-semibold text-slate-600">S/ {Number(currentEst?.rate||5).toFixed(2)}/h</span>
          </p>
        </div>
        <span className="self-start sm:self-center text-xs font-black bg-slate-900 text-white px-3.5 py-1.5 rounded-full shadow-sm">{currentEst?.level || 'Playa'}</span>
      </div>

      {feedback && <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600"/>{feedback}</div>}

      <div className="grid lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-[#0b1329] rounded-2xl border border-slate-800 p-3.5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-black text-slate-200 tracking-wide uppercase">Plano interactivo — Toca un cajón libre</p>
            {slot && <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-600/60 px-2.5 py-0.5 rounded-full">Seleccionado: {slot}</span>}
          </div>
          {currentEst?.elements===null ? (
            <div className="h-[520px] flex items-center justify-center text-xs font-semibold text-slate-400">Cargando plano del parking...</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <AutoFitFloorPlan 
                elements={currentEst?.elements||[]} 
                name={currentEst?.name} 
                selectable={true} 
                selectedSlot={slot} 
                onSelectSlot={setSlot} 
                containerHeightClass="h-[460px] sm:h-[520px] lg:h-[560px]" 
              />
              <p className="text-[11px] font-medium text-slate-400 mt-2 text-center">{slot ? `Cajón verde [${slot}] listo para registrar` : 'Verde = Disponible • Rojo = Ocupado'}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm flex-1">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Registrar ingreso presencial</h3>
            <div>
              <label className="text-xs font-bold text-slate-700">Placa del vehículo</label>
              <Input placeholder="ABC-123" value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} className="h-11 font-mono font-black uppercase mt-1 text-slate-900 border-slate-300 focus:border-emerald-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Cajón seleccionado</label>
              <div className={`mt-1 h-11 flex items-center px-3.5 border rounded-xl text-sm font-mono font-black transition-all ${slot ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                {slot ? `Cajón ${slot}` : '— Toca un cajón verde en el mapa'}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Tiempo de estadía estimado</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1,2,4,8].map(h=> <button key={h} type="button" onClick={()=>setHours(h)} className={`h-10 rounded-xl font-bold border transition-all ${hours===h?'bg-slate-900 text-white border-slate-900 shadow-sm':'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>{h}h</button>)}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Método de Pago</label>
              <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="mt-1 w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500">
                <option value="efectivo">Efectivo (en garita)</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="tarjeta">Tarjeta Débito/Crédito</option>
                <option value="transferencia">Transferencia bancaria</option>
                <option value="pendiente">Pendiente — Pago al salir</option>
              </select>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Monto Total a Cobrar</span>
              <span className="text-xl font-black font-mono text-slate-900">S/ {(Number(currentEst?.rate||5)*hours).toFixed(2)}</span>
            </div>
            <Button onClick={handleIngreso} disabled={!slot || !plate.trim()} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md disabled:opacity-40 transition-all">
              + Registrar Ingreso
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
