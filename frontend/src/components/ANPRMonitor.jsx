import React, { useState } from 'react';
import { Camera, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export const ANPRMonitor = () => {
  const [plate, setPlate] = useState('ABC-123');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSimulateScan = (gateType) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (plate.trim().toUpperCase() === 'ABC-123') {
        setScanResult({
          matched: true,
          plate: plate.trim().toUpperCase(),
          reservation: 'RSV-9912',
          slot: 'A-01',
          action: gateType === 'entry' ? 'APERTURA BARRERA ENTRADA' : 'APERTURA BARRERA SALIDA',
          confidence: '99.4%',
          time: new Date().toLocaleTimeString()
        });
      } else {
        setScanResult({
          matched: false,
          plate: plate.trim().toUpperCase(),
          action: 'TICKET MANUAL REQUERIDO',
          confidence: '95.1%',
          time: new Date().toLocaleTimeString()
        });
      }
    }, 600);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reconocimiento Automático de Placas (ANPR / LPR)</h1>
          <p className="text-xs text-slate-500">Simulación de lecturas de cámaras en garita y validación en tiempo real contra reservas activas.</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold shadow-sm">
          <Cpu className="w-4 h-4 animate-pulse text-emerald-600" />
          <span>Cámaras Online (IA Active)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulador de Cámara Entrada */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <Camera className="w-6 h-6 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900">Cámara Tótem Garita Entrada #1</h2>
          </div>

          <div className="aspect-video bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 mb-4 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950 opacity-60" />
            <div className="w-48 h-20 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center bg-black/50 z-10">
              <span className="font-mono text-2xl font-black tracking-widest text-emerald-300">{plate || '___-___'}</span>
            </div>
            <span className="absolute bottom-3 left-3 text-[10px] font-mono text-emerald-400 bg-black/70 px-2.5 py-1 rounded-md">FPS: 60 | IA Confidence: 99.4%</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ingresar Placa a Simular:</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono font-bold text-center uppercase tracking-widest text-lg focus:outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSimulateScan('entry')}
                disabled={loading}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
              >
                {loading ? 'Procesando IA...' : 'Simular Entrada (ANPR)'}
              </button>
              <button
                onClick={() => handleSimulateScan('exit')}
                disabled={loading}
                className="py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition"
              >
                {loading ? 'Procesando IA...' : 'Simular Salida (ANPR)'}
              </button>
            </div>
          </div>
        </div>

        {/* Bitácora de Respuestas ANPR */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 mb-4">Resultado de Cotejo en Tiempo Real</h2>
            {scanResult ? (
              <div className={`p-5 rounded-2xl border ${scanResult.matched ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <div className="flex items-center space-x-3 mb-3">
                  {scanResult.matched ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <ShieldAlert className="w-8 h-8 text-rose-600" />}
                  <div>
                    <h3 className="font-extrabold text-base">{scanResult.action}</h3>
                    <p className="text-xs opacity-75">Hora de captura: {scanResult.time}</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono border-t border-slate-200 pt-3 mt-3 text-slate-700">
                  <p>Placa Detectada: <span className="font-bold text-slate-900">{scanResult.plate}</span></p>
                  {scanResult.matched ? (
                    <>
                      <p>Reserva Asociada: <span className="text-emerald-700 font-bold">{scanResult.reservation}</span></p>
                      <p>Cajón Asignado: <span className="text-teal-700 font-bold">{scanResult.slot}</span></p>
                    </>
                  ) : (
                    <p className="text-rose-600 font-bold">Sin reserva previa detectada para este vehículo.</p>
                  )}
                  <p>Certeza Lectura: <span className="text-amber-600 font-bold">{scanResult.confidence}</span></p>
                </div>
              </div>
            ) : (
              <div className="h-48 border border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                Haz clic en Simular Entrada o Salida para evaluar la regla de apertura de barrera.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
