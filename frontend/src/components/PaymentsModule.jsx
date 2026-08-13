import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Plus, CreditCard, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const PaymentsModule = () => {
  const [cards, setCards] = useState([
    { id: 1, type: 'Visa', number: '•••• •••• •••• 4242', expiry: '12/28', isDefault: true },
    { id: 2, type: 'Mastercard', number: '•••• •••• •••• 8812', expiry: '09/27', isDefault: false },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvc: '' });

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.name) return;
    const cardObj = {
      id: Date.now(),
      type: 'Visa',
      number: `•••• •••• •••• ${newCard.number.slice(-4) || '9999'}`,
      expiry: newCard.expiry || '12/29',
      isDefault: cards.length === 0
    };
    setCards([...cards, cardObj]);
    setShowAddModal(false);
    setNewCard({ number: '', name: '', expiry: '', cvc: '' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Métodos de Pago & Billetera Digital</h1>
          <p className="text-xs text-slate-500">Administra tus tarjetas registradas para el débito automático al salir de los parqueos.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 font-bold shadow-md">
          <Plus className="w-4 h-4" />
          <span>Agregar Tarjeta</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Card key={card.id} className={`p-6 border-slate-200 shadow-sm relative overflow-hidden ${card.isDefault ? 'border-emerald-500/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30' : ''}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-md">
                  {card.type}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{card.type} Crédito</h3>
                  <p className="text-xs text-slate-500 font-mono">{card.number}</p>
                </div>
              </div>
              {card.isDefault ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Principal
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-rose-500 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-mono pt-4 border-t border-slate-100">
              <span>Expira: {card.expiry}</span>
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cifrado 256-bit
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Agregar Tarjeta */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Registrar Nueva Tarjeta</DialogTitle>
            <DialogDescription className="text-xs">
              Tus datos bancarios están protegidos mediante cifrado de grado militar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCard} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Titular de la Tarjeta</label>
              <Input
                type="text"
                placeholder="Nombre completo impreso"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Número de Tarjeta</label>
              <Input
                type="text"
                placeholder="4557 0000 0000 0000"
                value={newCard.number}
                onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiración (MM/AA)</label>
                <Input
                  type="text"
                  placeholder="12/28"
                  value={newCard.expiry}
                  onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CVC / CVV</label>
                <Input
                  type="password"
                  placeholder="123"
                  maxLength={4}
                  value={newCard.cvc}
                  onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-black py-5 mt-2">
              Guardar Tarjeta
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
