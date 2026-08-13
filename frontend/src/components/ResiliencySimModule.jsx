import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle2, Radio, Server, Plus } from 'lucide-react';

export const ResiliencySimModule = () => {
  const [serviceStatus, setServiceStatus] = useState('ONLINE'); // ONLINE o OFFLINE
  const [logs, setLogs] = useState([
    { time: '14:30:00', text: 'Sistema operando en estado óptimo. RabbitMQ listo.', type: 'info' }
  ]);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const toggleService = () => {
    const nextStatus = serviceStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setServiceStatus(nextStatus);
    const newLog = {
      time: new Date().toLocaleTimeString(),
      text: nextStatus === 'OFFLINE' 
        ? '⚠️ Servicio de Notificaciones CAÍDO (Simulación de fallo de red/sobrecarga).' 
        : '✅ Servicio de Notificaciones RECUPERADO. Reanudando consumo de eventos en cola...',
      type: nextStatus === 'OFFLINE' ? 'warning' : 'success'
    };
    setLogs(prev => [newLog, ...prev]);

    if (nextStatus === 'ONLINE' && pendingQueueCount > 0) {
      setTimeout(() => {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          text: `🎉 RabbitMQ entregó ${pendingQueueCount} evento(s) retenidos. Notificaciones enviadas con Idempotencia (ACK OK).`,
          type: 'success'
        }, ...prev]);
        setPendingQueueCount(0);
      }, 1000);
    }
  };

  const simulateReservationWithFailure = () => {
    const timeStr = new Date().toLocaleTimeString();
    const resCode = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 1. Registro en BD Central siempre exitoso
    const step1 = { time: timeStr, text: `1. Reserva ${resCode} creada en BD Central (PostgreSQL) y espacio A-01 reservado.`, type: 'info' };
    const step2 = { time: timeStr, text: `2. Evento 'ReservaCreada' (ID: EVT-${Math.floor(100 + Math.random()*900)}) publicado en RabbitMQ.`, type: 'info' };

    setLogs(prev => [step2, step1, ...prev]);

    if (serviceStatus === 'OFFLINE') {
      setPendingQueueCount(prev => prev + 1);
      setTimeout(() => {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          text: `3. ⏳ Servicio Notificaciones inactivo. RabbitMQ retiene el mensaje en cola segura sin cancelar la reserva.`,
          type: 'warning'
        }, ...prev]);
      }, 500);
    } else {
      setTimeout(() => {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          text: `3. 📲 Notificación SMS enviada al conductor con el Pase QR para ${resCode}.`,
          type: 'success'
        }, ...prev]);
      }, 500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Simulador de Resiliencia & Tolerancia a Fallos (Escenario 3)</h1>
          <p className="text-xs text-slate-500">Demostración del desacoplamiento por eventos con RabbitMQ e Idempotencia durante caídas de notificaciones.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={serviceStatus === 'ONLINE' ? 'success' : 'destructive'} className="text-xs font-black py-1.5 px-3">
            Notificaciones: {serviceStatus}
          </Badge>
          <Button onClick={toggleService} variant={serviceStatus === 'ONLINE' ? 'destructive' : 'default'} className="font-bold gap-2">
            <Radio className="w-4 h-4" />
            <span>{serviceStatus === 'ONLINE' ? 'Simular Caída de Notificaciones' : 'Recuperar Servicio'}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Control */}
        <Card className="p-6 space-y-4">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-600" /> Control de Incidentes
          </CardTitle>
          <CardDescription className="text-xs">
            Prueba cómo el registro de reservas continúa operando al 100% en la Base de Datos Central aunque el Servicio de Notificaciones esté caído.
          </CardDescription>

          <Button onClick={simulateReservationWithFailure} className="w-full font-black py-6 gap-2">
            <Plus className="w-4 h-4" />
            <span>Crear Reserva de Prueba</span>
          </Button>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <p className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Mensajes Retenidos en RabbitMQ:</span>
              <span className="font-mono text-amber-700 text-sm font-black">{pendingQueueCount}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              RabbitMQ conserva los eventos con persistencia en disco hasta recibir la señal ACK.
            </p>
          </div>
        </Card>

        {/* Consola de Logs e Incidentes en Vivo */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <CardTitle className="text-base font-extrabold mb-4 flex items-center justify-between">
              <span>Consola de Eventos & Logs de Resiliencia</span>
              <Badge variant="outline" className="font-mono text-[10px]">AMQP Protocol IDEMPOTENT</Badge>
            </CardTitle>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 min-h-[300px] max-h-[350px] overflow-y-auto space-y-2.5 font-mono text-xs shadow-inner">
              {logs.map((log, idx) => (
                <div key={idx} className={`p-2 rounded-lg border text-xs ${
                  log.type === 'warning' ? 'bg-amber-950/40 border-amber-800/50 text-amber-300' :
                  log.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' :
                  'bg-slate-800/60 border-slate-700/50 text-slate-300'
                }`}>
                  <span className="text-slate-500 mr-2">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
