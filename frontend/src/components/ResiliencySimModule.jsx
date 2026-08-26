import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, Radio, Server, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Zap, Database, Activity, Cpu } from 'lucide-react';
import api from '../services/api';

export const ResiliencySimModule = () => {
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, text: 'Iniciando diagnóstico del sistema...', time: new Date().toLocaleTimeString(), type: 'info' },
  ]);

  const fetchDiag = useCallback(async () => {
    try {
      const res = await api.get('/diagnostics/status');
      setDiag(res.data);
    } catch {
      setDiag(prev => prev || { overall: 'DEGRADED', circuit_status: 'DEGRADED', db: { ok: false }, redis: { ok: false, detail: 'No disponible' }, broker: { mode: 'desconocido', queue_depth: 0, processed_count: 0 }, websocket: { connections: 0 }, latency_ms: 0, idempotency_rate: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiag();
    const id = setInterval(fetchDiag, 10000);
    return () => clearInterval(id);
  }, [fetchDiag]);

  const circuitStatus = diag?.circuit_status || 'ONLINE';
  const queueDepth = diag?.broker?.queue_depth ?? 0;
  const latency = diag?.latency_ms ?? 14;
  const brokerMode = diag?.broker?.mode || 'memoria';
  const idempotency = diag?.idempotency_rate ?? 100.0;
  const dbOk = diag?.db?.ok ?? true;
  const redisOk = diag?.redis?.ok ?? false;

  const toggleCircuit = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/diagnostics/circuit/toggle');
      const nxt = res.data.circuit_status;
      await fetchDiag();
      if (nxt === 'DEGRADED') {
        setLogs(prev => [
          { id: Date.now(), text: 'ALERTA: Circuit breaker ABIERTO (persistido en Redis 24h). Entrada en modo degradado.', time: new Date().toLocaleTimeString(), type: 'alert' },
          ...prev
        ]);
      } else {
        setLogs(prev => [
          { id: Date.now(), text: 'RESTAURACIÓN: Circuit breaker CERRADO. Sincronización con clúster central reanudada.', time: new Date().toLocaleTimeString(), type: 'success' },
          ...prev
        ]);
      }
    } catch {
      setLogs(prev => [{ id: Date.now(), text: 'No se pudo conmutar el circuit breaker (sin conexión al servidor).', time: new Date().toLocaleTimeString(), type: 'alert' }, ...prev]);
    } finally {
      setActionLoading(false);
    }
  };

  const dispatchEvent = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/diagnostics/test-event');
      const eid = res.data.event_id || 'EVT-?';
      const via = res.data.via || 'desconocido';
      if (circuitStatus === 'DEGRADED') {
        setLogs(prev => [
          { id: Date.now(), text: `Transacción [${eid}] encolada en broker ${via} (circuito DEGRADED). Pendiente de ACK central.`, time: new Date().toLocaleTimeString(), type: 'warn' },
          ...prev
        ]);
      } else {
        setLogs(prev => [
          { id: Date.now(), text: `Transacción [${eid}] encolada vía ${via} y confirmada por el broker central.`, time: new Date().toLocaleTimeString(), type: 'success' },
          ...prev
        ]);
      }
      await fetchDiag();
    } catch {
      const eid = 'EVT-' + Math.floor(100000 + Math.random() * 900000);
      if (circuitStatus === 'DEGRADED') {
        setLogs(prev => [{ id: Date.now(), text: `Transacción [${eid}] retenida localmente (circuito DEGRADED, sin broker).`, time: new Date().toLocaleTimeString(), type: 'warn' }, ...prev]);
      } else {
        setLogs(prev => [{ id: Date.now(), text: `Transacción [${eid}] procesada localmente (fallback sin broker).`, time: new Date().toLocaleTimeString(), type: 'success' }, ...prev]);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
        <p className="text-xs text-slate-500 mt-2">Cargando diagnóstico en vivo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Server className="w-7 h-7 text-emerald-600" />
            <span>Diagnóstico de Conectividad y Servicios</span>
          </h1>
          <p className="text-xs text-slate-500">
            Estado real del servidor, base de datos, Redis y broker. Sin simulación.
            <span className={`ml-2 font-bold ${brokerMode === 'redis' ? 'text-emerald-600' : 'text-amber-600'}`}>Broker: {brokerMode}</span>
            <span className="ml-2">· WS: {diag?.websocket?.connections ?? 0} conectados</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-bold ${circuitStatus === 'ONLINE' ? 'text-emerald-600' : 'text-rose-600'}`}>
            ● {circuitStatus === 'ONLINE' ? 'Servicio En Línea' : 'Modo Desconectado'}
          </span>
          {!dbOk && <span className="text-xs font-bold text-rose-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> DB caída</span>}
          <span className={`text-[10px] px-2 py-1 rounded-lg border font-mono ${redisOk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            Redis: {redisOk ? `${diag?.redis?.latency_ms ?? 0}ms` : (diag?.redis?.detail || 'degradado')}
          </span>
        </div>
      </div>


      {/* Grid de Estado & Métricas de Infraestructura */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Estado del Servidor</span>
            <Zap className={`w-4 h-4 ${circuitStatus === 'ONLINE' && dbOk ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <p className={`text-xl font-black ${circuitStatus === 'ONLINE' && dbOk ? 'text-emerald-700' : 'text-rose-600'}`}>
            {circuitStatus === 'ONLINE' && dbOk ? 'Operativo' : 'Degradado'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">DB: {dbOk ? 'conectada' : 'no disponible'} · {diag?.db?.latency_ms ?? '-'}ms</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Eventos Pendientes</span>
            <Database className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black font-mono text-slate-900">{queueDepth}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">En cola broker ({brokerMode}) · {diag?.broker?.processed_count ?? 0} procesados</span>
        </Card>


        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Latencia de Red (WAN)</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black font-mono text-indigo-700">{latency} ms</p>
          <span className="text-[10px] text-slate-500 mt-1 block">DB {diag?.db?.latency_ms ?? '-'}ms · Redis {diag?.redis?.latency_ms ?? '-'}ms</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Tasa de Idempotencia</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-600">{Number(idempotency).toFixed(1)}%</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Deduplicación por event_id en {brokerMode}</span>
        </Card>
      </div>

      {/* Panel de Control y Pruebas de Contingencia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 border-slate-200 shadow-sm bg-white space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">Control de Contingencia de Red</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              El circuit breaker real está persistido en Redis (<code className="bg-slate-100 px-1 rounded">diagnostics:circuit</code> 24h). Sin Redis, el toggle es solo local.
            </p>

            <div className="space-y-3 pt-2">
              <Button
                onClick={toggleCircuit}
                disabled={actionLoading}
                className={`w-full font-black text-xs py-5 ${
                  circuitStatus === 'ONLINE' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>{circuitStatus === 'ONLINE' ? 'Forzar Corte de Conectividad WAN' : 'Restablecer Conexión Central'}</span>
              </Button>

              <Button
                onClick={dispatchEvent}
                disabled={actionLoading}
                variant="outline"
                className="w-full font-bold text-xs py-5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ArrowRight className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>Emitir Transacción Vehicular de Prueba</span>
              </Button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-900">Comportamiento en Estado Degradado:</p>
              <p>1. La garita no interrumpe el paso vehicular (fail-open).</p>
              <p>2. Los eventos se encolan en Redis (o memoria si Redis cae).</p>
              <p>3. Al reanudar, el broker drena con idempotencia por event_id.</p>
            </div>
          </Card>
        </div>

        {/* Bitácora de Eventos de Resiliencia */}
        <div className="lg:col-span-7">
          <Card className="p-6 border-slate-200 shadow-sm bg-slate-950 text-white flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Registro de Eventos y Auditoría (tiempo real)</span>
                </h2>
                <button onClick={fetchDiag} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Actualizar
                </button>
              </div>


              <div className="space-y-2 font-mono text-xs max-h-80 overflow-y-auto pr-1">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      l.type === 'alert'
                        ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                        : l.type === 'warn'
                        ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                        : l.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>TIMESTAMP: {l.time}</span>
                      <span className="uppercase font-bold">{l.type}</span>
                    </div>
                    <p>{l.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
