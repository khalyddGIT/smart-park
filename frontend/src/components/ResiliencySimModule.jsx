import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, ShieldAlert, Radio, Server, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Zap, Database, Activity, Cpu } from 'lucide-react';

export const ResiliencySimModule = () => {
  const [circuitStatus, setCircuitStatus] = useState('ONLINE'); // 'ONLINE' o 'DEGRADED'
  const [queueDepth, setQueueDepth] = useState(0);
  const [logs, setLogs] = useState([
    { id: 1, text: 'Cluster RabbitMQ: Broker conectado en amqp://localhost:5672 (Canal Activo).', time: '14:20:00', type: 'info' },
    { id: 2, text: 'Idempotency Key Verifier: 1,420 transacciones procesadas con hash SHA-256 único.', time: '14:21:15', type: 'success' },
    { id: 3, text: 'Heartbeat de Gateway Local: Latencia 12ms | Reconciliación en segundo plano activa.', time: '14:22:05', type: 'info' },
  ]);
  const [latency, setLatency] = useState(14);

  const toggleCircuit = () => {
    if (circuitStatus === 'ONLINE') {
      setCircuitStatus('DEGRADED');
      setLatency(450);
      setLogs(prev => [
        { id: Date.now(), text: 'ALERTA DE SISTEMA: Interrupción de Enlace Wan detectada. Activando Modo Edge Autónomo (Circuit Breaker ABIERTO).', time: new Date().toLocaleTimeString(), type: 'alert' },
        ...prev
      ]);
    } else {
      setCircuitStatus('ONLINE');
      setLatency(14);
      setLogs(prev => [
        { id: Date.now(), text: 'RESTAURACIÓN DE ENLACE: Conexión recuperada. Vaciando cola de reconciliación hacia el clúster central...', time: new Date().toLocaleTimeString(), type: 'success' },
        { id: Date.now() + 1, text: `Sincronización completa: ${queueDepth} eventos encolados fueron persistidos con éxito.`, time: new Date().toLocaleTimeString(), type: 'info' },
        ...prev
      ]);
      setQueueDepth(0);
    }
  };

  const dispatchEvent = () => {
    const eventId = 'EVT-' + Math.floor(100000 + Math.random() * 900000);
    if (circuitStatus === 'DEGRADED') {
      setQueueDepth(prev => prev + 1);
      setLogs(prev => [
        { id: Date.now(), text: `Transacción [${eventId}] retenida en Buffer Local Seguro (IndexedDB/Cache Edge). Pendiente de ACK central.`, time: new Date().toLocaleTimeString(), type: 'warn' },
        ...prev
      ]);
    } else {
      setLogs(prev => [
        { id: Date.now(), text: `Transacción [${eventId}] procesada y confirmada en tiempo real por el clúster central (ACK 200).`, time: new Date().toLocaleTimeString(), type: 'success' },
        ...prev
      ]);
    }
  };

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
            Monitoreo del estado de conexión, sincronización y respaldo de operaciones.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-bold ${circuitStatus === 'ONLINE' ? 'text-emerald-600' : 'text-rose-600'}`}>
            ● {circuitStatus === 'ONLINE' ? 'Servicio En Línea' : 'Modo Desconectado'}
          </span>
        </div>
      </div>


      {/* Grid de Estado & Métricas de Infraestructura */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Estado del Servidor</span>
            <Zap className={`w-4 h-4 ${circuitStatus === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <p className={`text-xl font-black ${circuitStatus === 'ONLINE' ? 'text-emerald-700' : 'text-rose-600'}`}>
            {circuitStatus === 'ONLINE' ? 'Operativo' : 'Desconectado'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Comunicación con la base central</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Eventos Pendientes</span>
            <Database className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black font-mono text-slate-900">{queueDepth}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Registros guardados en cola local</span>
        </Card>


        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Latencia de Red (WAN)</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black font-mono text-indigo-700">{latency} ms</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Tiempo de ida y vuelta (RTT)</span>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Tasa de Idempotencia</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-600">100.0%</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Prevención de duplicidad de transacciones</span>
        </Card>
      </div>

      {/* Panel de Control y Pruebas de Contingencia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 border-slate-200 shadow-sm bg-white space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">Control de Contingencia de Red</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permite auditar el comportamiento del sistema cuando se produce una desconexión en garita o sobrecarga de tráfico.
            </p>

            <div className="space-y-3 pt-2">
              <Button
                onClick={toggleCircuit}
                className={`w-full font-black text-xs py-5 ${
                  circuitStatus === 'ONLINE' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                <span>{circuitStatus === 'ONLINE' ? 'Forzar Corte de Conectividad WAN' : 'Restablecer Conexión Central'}</span>
              </Button>

              <Button
                onClick={dispatchEvent}
                variant="outline"
                className="w-full font-bold text-xs py-5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ArrowRight className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>Emitir Transacción Vehicular de Prueba</span>
              </Button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-900">Comportamiento en Estado Degradado:</p>
              <p>1. La garita no interrumpe el paso vehicular.</p>
              <p>2. Los eventos se almacenan cifrados en el buffer local.</p>
              <p>3. Al reanudar el enlace, se ejecutan reintentos con backoff exponencial.</p>
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
                  <span>Registro de Eventos y Auditoría</span>
                </h2>
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
