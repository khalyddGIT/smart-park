import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Plus, CreditCard, Trash2, CheckCircle2, ShieldCheck, QrCode, Lock, Receipt, FileText, Check, DollarSign } from 'lucide-react';

export const PaymentsModule = () => {
  const [cards, setCards] = useState([
    { id: 1, type: 'Visa', number: '•••• •••• •••• 4242', expiry: '12/28', isDefault: true, holder: 'Carlos Mendoza' },
    { id: 2, type: 'Mastercard', number: '•••• •••• •••• 8812', expiry: '09/27', isDefault: false, holder: 'Carlos Mendoza' },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' o 'history'
  const [toast, setToast] = useState(null);

  const transactions = [
    { id: 'TXN-90218', date: '2026-08-15 16:45', parking: 'Smart Park Central San Isidro', plate: 'ABC-123', amount: 17.00, method: 'Visa •••• 4242', invoice: 'B001-004291', status: 'Liquidado' },
    { id: 'TXN-89412', date: '2026-08-12 11:30', parking: 'Smart Park Miraflores Kennedy', plate: 'ABC-123', amount: 15.00, method: 'Yape QR', invoice: 'B001-003810', status: 'Liquidado' },
    { id: 'TXN-76120', date: '2026-08-05 20:00', parking: 'Smart Park Central San Isidro', plate: 'XYZ-987', amount: 14.80, method: 'Mastercard •••• 8812', invoice: 'B001-002955', status: 'Liquidado' },
  ];

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.name) return;
    const cardObj = {
      id: Date.now(),
      type: newCard.number.startsWith('5') ? 'Mastercard' : 'Visa',
      number: `•••• •••• •••• ${newCard.number.slice(-4) || '9999'}`,
      expiry: newCard.expiry || '12/29',
      isDefault: cards.length === 0,
      holder: newCard.name
    };
    setCards([...cards, cardObj]);
    setShowAddModal(false);
    setNewCard({ number: '', name: '', expiry: '', cvc: '' });
    notify('Tarjeta bancaria tokenizada y vinculada con éxito.');
  };

  const openReceipt = (txn) => {
    setSelectedReceipt(txn);
    setShowReceiptModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            <span>Métodos de Pago</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra tus tarjetas registradas y consulta tus comprobantes de pago.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tarjetas & Billeteras
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comprobantes
            </button>
          </div>
          {activeTab === 'cards' && (
            <Button onClick={() => setShowAddModal(true)} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              <span>Nueva Tarjeta</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cards View */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className={`p-6 border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between ${
              card.isDefault ? 'border-emerald-500/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30' : 'bg-white'
            }`}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center font-mono font-black text-xs shadow-md border border-slate-800">
                      {card.type.slice(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{card.type} Débito/Crédito</h3>
                      <p className="text-xs text-slate-500 font-mono">{card.number}</p>
                    </div>
                  </div>
                  {card.isDefault ? (
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                      Principal
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-rose-500 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl font-mono text-xs mb-4 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>TITULAR</span>
                    <span>EXPIRACIÓN</span>
                  </div>
                  <div className="flex justify-between font-bold text-white">
                    <span className="uppercase">{card.holder}</span>
                    <span>{card.expiry}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 font-mono pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> Pago Seguro
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">Activa</span>
              </div>
            </Card>
          ))}

          {/* Tarjeta de Billetera Digital Interoperable */}
          <Card className="p-6 border-slate-200 shadow-sm bg-gradient-to-br from-white to-teal-50/40 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 rounded-2xl bg-teal-900 text-teal-300 flex items-center justify-center font-black text-xs shadow-md">
                  <QrCode className="w-6 h-6" />
                </div>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Billeteras Móviles (Yape / Plin)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Escanea el código QR al salir para pagar al instante desde tu celular.
              </p>
            </div>


            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-teal-800">
                <span>Comisión por Transacción:</span>
                <span className="font-mono font-black">0.0% (Convenio)</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* History & Invoices View */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {transactions.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-black text-xs border border-slate-200">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{t.parking}</h3>
                    <span className="text-[10px] font-bold text-emerald-600">● {t.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {t.date} • Placa: <span className="font-bold text-slate-800">{t.plate}</span> • Comprobante: <span className="font-bold text-teal-700">{t.invoice}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-lg font-black text-slate-900 font-mono">S/ {t.amount.toFixed(2)}</span>
                <Button variant="outline" size="sm" onClick={() => openReceipt(t)} className="font-bold text-xs gap-1.5 border-slate-300">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver Comprobante</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Agregar Tarjeta */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Agregar Tarjeta</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa los datos de tu tarjeta de crédito o débito.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCard} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Impreso en la Tarjeta *</label>
              <Input
                type="text"
                placeholder="CARLOS MENDOZA"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Número de Tarjeta *</label>
              <Input
                type="text"
                maxLength={19}
                placeholder="4557 8890 1234 5678"
                value={newCard.number}
                onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                className="font-mono tracking-widest font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiración (MM/AA) *</label>
                <Input
                  type="text"
                  maxLength={5}
                  placeholder="12/28"
                  value={newCard.expiry}
                  onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                  className="font-mono text-center font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código CVV *</label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="•••"
                  value={newCard.cvc}
                  onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                  className="font-mono text-center font-bold"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-bold py-5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              Guardar Tarjeta
            </Button>

          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Comprobante Fiscal */}
      {selectedReceipt && (
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">Boleta de Venta Electrónica</DialogTitle>
              <DialogDescription className="text-center text-xs font-mono">
                RUC: 20608912345 • {selectedReceipt.invoice}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs space-y-2 my-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Establecimiento:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.parking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Emisión:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placa Autorizada:</span>
                <span className="font-bold text-emerald-800">{selectedReceipt.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.method}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black">
                <span>TOTAL LIQUIDADO (INC. IGV):</span>
                <span className="text-emerald-700">S/ {selectedReceipt.amount.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={() => window.print()} variant="outline" className="w-full font-black py-4 border-slate-300">
              Imprimir / Descargar PDF
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
