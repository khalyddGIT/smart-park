import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Award, 
  Gift, 
  Star, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  QrCode
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export const LoyaltyClubModule = () => {
  const [points, setPoints] = useState(850);
  const [redeemedCoupon, setRedeemedCoupon] = useState(null);

  const rewards = [
    {
      id: 'REW-01',
      title: '1 Hora de Estancia Gratuita',
      pointsCost: 200,
      description: 'Válido en cualquier sede Smart Park de Ayacucho durante días hábiles.',
      tag: 'Más Popular'
    },
    {
      id: 'REW-02',
      title: '50% Descuento Fin de Semana',
      pointsCost: 350,
      description: 'Aplica a estancias superiores a 3 horas los días sábado o domingo.',
      tag: 'Fin de Semana'
    },
    {
      id: 'REW-03',
      title: 'Lavado Ecológico de Cortesía',
      pointsCost: 650,
      description: 'Limpieza exterior con cera en garita asociada mientras tu auto está parqueado.',
      tag: 'Premium'
    },
    {
      id: 'REW-04',
      title: 'Pase Preferencial Sede Plaza Mayor',
      pointsCost: 500,
      description: 'Prioridad de reserva sobre cajones techados en horario punta.',
      tag: 'Exclusivo'
    }
  ];

  const badges = [
    { title: 'Conductor Puntual', desc: '0 sobrestadías en tus últimas 10 reservas', unlocked: true },
    { title: 'Socio Huamanga', desc: '+15 visitas a sedes del Centro Histórico', unlocked: true },
    { title: 'Eco Digital', desc: '100% pagos digitales con QR o Yape', unlocked: true },
    { title: 'Platino VIP', desc: 'Alcanza 2,000 puntos acumulados', unlocked: false }
  ];

  const history = [
    { id: 1, text: 'Reserva completada en Plaza Mayor (RSV-8912)', pts: '+50 pts', date: 'Hoy, 14:30', type: 'earn' },
    { id: 2, text: 'Pago puntual mediante código QR', pts: '+25 pts', date: 'Ayer, 10:15', type: 'earn' },
    { id: 3, text: 'Canje de 1 hora gratuita de parqueo', pts: '-200 pts', date: '12 Ago 2026', type: 'redeem' },
    { id: 4, text: 'Bonificación de bienvenida Smart Club', pts: '+300 pts', date: '01 Ago 2026', type: 'earn' }
  ];

  const handleRedeem = (reward) => {
    if (points < reward.pointsCost) {
      alert('No cuentas con suficientes puntos para este canje.');
      return;
    }
    setPoints(prev => prev - reward.pointsCost);
    setRedeemedCoupon({
      ...reward,
      code: `CUPON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      expires: 'Válido por 30 días'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-600" />
            <span>Smart Club & Recompensas</span>
          </h1>
          <p className="text-xs text-slate-500">
            Acumula puntos en cada estancia y canjea horas gratis, descuentos y beneficios exclusivos.
          </p>
        </div>
      </div>

      {/* Banner de Nivel de Conductor */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                Membresía Activa
              </span>
              <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px]">
                NIVEL ORO
              </Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {points.toLocaleString()} <span className="text-emerald-400 text-xl md:text-2xl font-bold">Smart Points</span>
            </h2>
            <p className="text-xs text-slate-400">
              Estás a <span className="text-white font-bold">650 puntos</span> de alcanzar el nivel <span className="text-emerald-300 font-bold">Platino VIP</span>.
            </p>
          </div>

          {/* Barra de Progreso a Nivel Platino */}
          <div className="w-full md:w-80 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Progreso a Platino</span>
              <span className="text-emerald-400 font-bold">57%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[57%]" />
            </div>
            <span className="text-[10px] text-slate-400 block">Siguiente beneficio: 20% descuento permanente</span>
          </div>
        </div>
      </Card>

      {/* Catálogo de Beneficios y Canjes */}
      <div>
        <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-600" />
          <span>Catálogo de Canjes Disponibles</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewards.map((rew) => {
            const canAfford = points >= rew.pointsCost;
            return (
              <Card key={rew.id} className="p-5 border-slate-200 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-600">
                      {rew.tag}
                    </Badge>
                    <span className="font-mono font-black text-sm text-emerald-600">
                      {rew.pointsCost} pts
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm mb-1">{rew.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{rew.description}</p>
                </div>

                <Button
                  onClick={() => handleRedeem(rew)}
                  disabled={!canAfford}
                  size="sm"
                  className={`w-full font-bold text-xs ${
                    canAfford 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? 'Canjear Cupón' : 'Puntos Insuficientes'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Grid: Medallas de Logros e Historial de Puntos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Medallas & Logros */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span>Medallas de Conductor</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border transition ${
                    b.unlocked 
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-900' 
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                      b.unlocked ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs">{b.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Historial de Movimientos de Puntos */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span>Bitácora de Puntos Reciente</span>
            </h3>

            <div className="space-y-2.5">
              {history.map((h) => (
                <div key={h.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{h.text}</p>
                    <p className="text-[10px] text-slate-400">{h.date}</p>
                  </div>
                  <span className={`font-mono font-black text-sm ${
                    h.type === 'earn' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {h.pts}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Cupón Canjeado Exitosamente */}
      {redeemedCoupon && (
        <Dialog open={!!redeemedCoupon} onOpenChange={() => setRedeemedCoupon(null)}>
          <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Gift className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">¡Canje Exitoso!</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Presenta este código o aplícalo en tu próxima reserva.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-900 text-white p-4 rounded-2xl my-2 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Código del Cupón</span>
              <p className="text-xl font-black text-emerald-400 tracking-widest">{redeemedCoupon.code}</p>
            </div>

            <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
              <p className="font-bold text-slate-900">{redeemedCoupon.title}</p>
              <p className="text-[11px] text-slate-500">{redeemedCoupon.description}</p>
              <p className="text-[10px] text-emerald-700 font-bold pt-1">{redeemedCoupon.expires}</p>
            </div>

            <Button onClick={() => setRedeemedCoupon(null)} className="w-full font-bold mt-2">
              Entendido, Guardar Cupón
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
