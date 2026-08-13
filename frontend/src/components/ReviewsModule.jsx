import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Star, MessageSquare } from 'lucide-react';

export const ReviewsModule = () => {
  const [reviews, setReviews] = useState([
    { id: 1, user: 'Carlos Mendoza', parking: 'Smart Park Central San Isidro', rating: 5, comment: 'Excelente servicio. La barrera ANPR me reconoció al instante sin necesidad de bajar la ventana.', date: 'Hace 2 días' },
    { id: 2, user: 'Ana María R.', parking: 'Smart Park Miraflores Kennedy', rating: 4, comment: 'Muy buen estacionamiento, limpio y techado. El plano 2D facilita elegir cajón.', date: 'Hace 5 días' },
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Reseñas & Calificaciones</h1>
        <p className="text-xs text-slate-500">Opiniones verificadas de conductores sobre la red de estacionamientos.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <Card key={r.id} className="p-6 border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{r.user}</h3>
                <p className="text-xs text-slate-500">{r.parking} • <span className="text-slate-400">{r.date}</span></p>
              </div>
              <div className="flex items-center space-x-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">{r.comment}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
