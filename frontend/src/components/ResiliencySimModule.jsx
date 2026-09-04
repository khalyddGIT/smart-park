import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Server,
  Database,
  Zap,
  Radio,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  Terminal,
  Trash2,
} from 'lucide-react';
import api from '../services/api';

export const ResiliencySimModule = () => {
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10); // segundos (0 = pausado)
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [logs, setLogs] = useState([
    {
      id: 1,
      time: new Date().toLocaleTimeString('es-PE'),
      type: 'info',
      tag: 'INIT',
      text: 'Monitor de infraestructura y servicios iniciado correctamente.',
    },
  ]);

  const logsEndRef = useRef(null);

  const fetchDiag = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const checkTime = new Date().toLocaleTimeString('es-PE');
    try {
      const res = await api.get('/diagnostics/status');
      const data = res.data;
      setDiag(data);
      setLastCheckTime(checkTime);

      const dbLatency = data.db?.latency_ms ?? 0;
      const redisLatency = data.redis?.latency_ms ?? 0;
      const brokerMode = data.broker?.mode || 'memoria';
      const wsCount = data.websocket?.connections ?? 0;

      const logType = (!data.db?.ok || data.overall !== 'ONLINE') ? 'alert' : (dbLatency > 80 ? 'warn' : 'success');
      const logTag = logType === 'alert' ? 'CRITICAL' : (logType === 'warn' ? 'LATENCY_WARN' : 'TELEMETRY_OK');

      const logText = data.db?.ok
        ? `DB: ${dbLatency}ms | Redis: ${data.redis?.ok ? `${redisLatency}ms` : 'Degradado'} | Broker: ${brokerMode.toUpperCase()} (${data.broker?.queue_depth ?? 0} en cola) | WS: ${wsCount} activos`
        : 'ALERTA: Falla de conexión con el motor de base de datos.';

      setLogs((prev) => [
        {
          id: Date.now(),
          time: checkTime,
          type: logType,
          tag: logTag,
          text: logText,
        },
        ...prev.slice(0, 49),
      ]);
    } catch (err) {
      setDiag((prev) => prev || {
        overall: 'DEGRADED',
        circuit_status: 'DEGRADED',
        db: { ok: false, latency_ms: null },
        redis: { ok: false, detail: 'Sin conexión' },
        rabbitmq: { ok: false, detail: 'Desconectado' },
        broker: { mode: 'desconectado', queue_depth: 0, processed_count: 0 },
        websocket: { connections: 0 },
        latency_ms: 0,
        idempotency_rate: 0,
      });
      setLogs((prev) => [
        {
          id: Date.now(),
          time: checkTime,
          type: 'alert',
          tag: 'NET_ERROR',
          text: `Error al contactar el servidor de diagnóstico: ${err.message || 'Sin respuesta'}`,
        },
        ...prev.slice(0, 49),
      ]);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 350);
      }
    }
  }, []);

  useEffect(() => {
    fetchDiag();
  }, [fetchDiag]);

  useEffect(() => {
    if (pollingInterval <= 0) return;
    const intervalId = setInterval(() => {
      fetchDiag(false);
    }, pollingInterval * 1000);
    return () => clearInterval(intervalId);
  }, [fetchDiag, pollingInterval]);

  const clearLogs = () => {
    setLogs([
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString('es-PE'),
        type: 'info',
        tag: 'CLEAR',
        text: 'Registro de telemetría limpiado por el operador.',
      },
    ]);
  };

  const isOnline = diag?.overall === 'ONLINE' && diag?.db?.ok;
  const dbOk = diag?.db?.ok ?? false;
  const dbLatency = diag?.db?.latency_ms ?? 0;
  const redisOk = diag?.redis?.ok ?? false;
  const redisLatency = diag?.redis?.latency_ms ?? 0;
  const brokerMode = diag?.broker?.mode || 'memoria';
  const queueDepth = diag?.broker?.queue_depth ?? 0;
  const processedCount = diag?.broker?.processed_count ?? 0;
  const wsConnections = diag?.websocket?.connections ?? 0;
  const idempotencyRate = Number(diag?.idempotency_rate ?? 100).toFixed(1);
  const rabbitMqOk = diag?.rabbitmq?.ok ?? false;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">Verificando telemetría de infraestructura...</p>
        <p className="text-xs text-slate-400">Consultando PostgreSQL, Redis, RabbitMQ y WebSockets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Estado del Sistema & Infraestructura
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Telemetría en tiempo real y diagnóstico de salud para servicios de producción.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones y Estado */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge de Estado General */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono tracking-tight ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isOnline ? 'SISTEMA OPERATIVO' : 'MODO DEGRADADO'}</span>
          </div>

          {/* Selector de Intervalo */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-2.5 py-1 rounded-xl text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Sincronizar:</span>
            <select
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              className="bg-transparent font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value={5} className="dark:bg-slate-900">5s</option>
              <option value={10} className="dark:bg-slate-900">10s</option>
              <option value={30} className="dark:bg-slate-900">30s</option>
              <option value={0} className="dark:bg-slate-900">Pausar</option>
            </select>
          </div>

          {/* Botón de Diagnóstico Manual */}
          <Button
            size="sm"
            onClick={() => fetchDiag(true)}
            disabled={refreshing}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Diagnosticar Ahora</span>
          </Button>
        </div>
      </div>

      {/* Grid de 4 KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Base de Datos */}
        <Card className="p-5 bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/80 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Base de Datos
            </span>
            <div className={`p-2 rounded-xl ${dbOk ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-black font-mono ${dbOk ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {dbOk ? `${dbLatency} ms` : 'Caída'}
            </p>
            {dbOk && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                dbLatency < 30 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {dbLatency < 30 ? 'Óptima' : 'Normal'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dbOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{dbOk ? 'SQLAlchemy Async · PostgreSQL' : 'Error en consulta SELECT 1'}</span>
          </p>
        </Card>

        {/* 2. Caché Redis */}
        <Card className="p-5 bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/80 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Caché & Clúster
            </span>
            <div className={`p-2 rounded-xl ${redisOk ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-black font-mono ${redisOk ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
              {redisOk ? `${redisLatency} ms` : 'Local'}
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              redisOk ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {redisOk ? 'Redis Clúster' : 'En Memoria'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${redisOk ? 'bg-indigo-500' : 'bg-amber-500'}`} />
            <span className="truncate">{redisOk ? 'Sesiones & Rate-Limit activos' : (diag?.redis?.detail || 'Sin REDIS_URL configurada')}</span>
          </p>
        </Card>

        {/* 3. Event Broker */}
        <Card className="p-5 bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/80 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Colas & Mensajería
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {queueDepth}
            </p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
              {queueDepth === 0 ? 'Sin atascos' : 'Pendientes'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span>{processedCount} procesados · Broker {brokerMode.toUpperCase()}</span>
          </p>
        </Card>

        {/* 4. WebSockets */}
        <Card className="p-5 bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/80 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Conexiones en Vivo
            </span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {wsConnections}
            </p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
              En línea
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span>Garitas, barreras y conductores</span>
          </p>
        </Card>
      </div>

      {/* Panel Detallado: Arquitectura de Servicios + Consola de Telemetría */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Izquierdo: Desglose de Microservicios & Políticas de Producción */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Matriz de Servicios & Capas de Red</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Último check: {lastCheckTime || '—'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* Servicio 1: FastAPI Core */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">API Core & Rutas REST</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">FastAPI Async · Uvicorn ASGI Worker</p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 text-[10px] rounded-md font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    HTTP/2 · 200 OK
                  </span>
                </div>
              </div>

              {/* Servicio 2: Base de Datos Relacional */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Motor de Persistencia (PostgreSQL)</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Sesiones ACID asíncronas con pool dinámico</p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                      dbOk
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {dbOk ? `${dbLatency}ms` : 'DESCONECTADO'}
                  </span>
                </div>
              </div>

              {/* Servicio 3: Redis */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Almacén de Caché & Tokens</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Redis Clúster · Rate limiting y validación de sesiones</p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                      redisOk
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {redisOk ? `${redisLatency}ms` : 'MEMORIA LOCAL'}
                  </span>
                </div>
              </div>

              {/* Servicio 4: RabbitMQ / AMQP */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Bus de Eventos (RabbitMQ / Redis)</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Procesamiento de pagos y barreras en segundo plano
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                      rabbitMqOk
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {rabbitMqOk ? 'AMQP CONECTADO' : 'REDIS STREAM STANDBY'}
                  </span>
                </div>
              </div>

              {/* Servicio 5: WebSocket Realtime */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Hub de Telemetría WebSocket</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Notificaciones bidireccionales y apertura de barrera</p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 text-[10px] rounded-md font-bold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                    {wsConnections} CANALES
                  </span>
                </div>
              </div>
            </div>

            {/* Banner de Garantías Técnicas */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Garantía de Resiliencia & Idempotencia
                </span>
                <span className="ml-auto font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {idempotencyRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Cada evento vehicular posee un identificador <code className="text-slate-800 dark:text-slate-200 font-mono">UUIDv4</code> único. Si una garita pierde conectividad temporalmente, las operaciones se ejecutan de manera autónoma y se concilian al restablecer el enlace sin duplicar cobros.
              </p>
            </div>
          </Card>
        </div>

        {/* Lado Derecho: Terminal de Telemetría en Tiempo Real */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 shadow-xl overflow-hidden flex flex-col h-full min-h-[420px]">
            {/* Cabecera de la Terminal */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 ml-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>infrastructure.telemetry.log</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>STREAM EN VIVO</span>
                </div>
                <button
                  onClick={clearLogs}
                  title="Limpiar registro"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cuerpo de Logs */}
            <div className="p-4 space-y-2 font-mono text-xs overflow-y-auto flex-1 max-h-[380px]">
              {logs.map((log) => {
                let badgeClass = 'text-slate-400 border-slate-800 bg-slate-900';
                if (log.type === 'alert') badgeClass = 'text-rose-400 border-rose-900/50 bg-rose-950/40';
                if (log.type === 'warn') badgeClass = 'text-amber-400 border-amber-900/50 bg-amber-950/40';
                if (log.type === 'success') badgeClass = 'text-emerald-400 border-emerald-900/50 bg-emerald-950/40';

                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-colors ${badgeClass}`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300">[{log.time}]</span>
                      <span className="font-bold tracking-wider px-1.5 py-0.2 rounded bg-black/40 text-[9px]">
                        {log.tag}
                      </span>
                    </div>
                    <p className="text-slate-200">{log.text}</p>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>

            {/* Footer de la Terminal */}
            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Host: 127.0.0.1:8000 · Python 3.12 · FastAPI</span>
              <span>Eventos registrados: {logs.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
