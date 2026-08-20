import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Plus, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  Lock, 
  Receipt, 
  FileText, 
  Check, 
  DollarSign,
  Smartphone,
  Star,
  Printer,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

const CARDS_STORAGE_KEY_BASE = 'smart_park_cards_v2';
const getCardsKey = () => {
  try {
    const saved = localStorage.getItem('smart_park_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      return `${CARDS_STORAGE_KEY_BASE}_${u?.id || u?.email || 'guest'}`;
    }
  } catch {}
  return `${CARDS_STORAGE_KEY_BASE}_guest`;
};

const INITIAL_CARDS = [];

export const PaymentsModule = () => {
  const [cards, setCards] = useState(() => {
    try {
      const key = getCardsKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return INITIAL_CARDS;
  });

  // Recargar tarjetas al cambiar de usuario
  useEffect(() => {
    const loadForUser = () => {
      try {
        const key = getCardsKey();
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setCards(parsed);
          else setCards([]);
        } else setCards([]);
      } catch { setCards([]); }
    };
    const interval = setInterval(() => {
      const k = getCardsKey();
      if (k !== window.__lastCardsKey) {
        window.__lastCardsKey = k;
        loadForUser();
      }
    }, 500);
    window.__lastCardsKey = getCardsKey();
    window.addEventListener('storage', loadForUser);
    return () => { clearInterval(interval); window.removeEventListener('storage', loadForUser); };
  }, []);

  useEffect(() => {
    try {
      const key = getCardsKey();
      if (!key.endsWith('_guest')) localStorage.setItem(key, JSON.stringify(cards));
    } catch (e) {}
  }, [cards]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'history'
  const [toast, setToast] = useState(null);

  // Nuevo usuario: sin transacciones heredadas
  const transactions = [];

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.name) return;

    const raw4 = newCard.number.replace(/\D/g, '').slice(-4) || '9999';
    const cardType = newCard.number.startsWith('5') ? 'Mastercard' : 'Visa';

    const cardObj = {
      id: Date.now(),
      type: cardType,
      number: `•••• •••• •••• ${raw4}`,
      rawLast4: raw4,
      expiry: newCard.expiry || '12/29',
      isDefault: cards.length === 0,
      holder: newCard.name.toUpperCase().trim()
    };

    setCards([...cards, cardObj]);
    setShowAddModal(false);
    setNewCard({ number: '', name: '', expiry: '', cvc: '' });
    notify('✓ Tarjeta bancaria tokenizada y vinculada con éxito.');
  };

  const handleSetDefaultCard = (id) => {
    const updated = cards.map(c => ({
      ...c,
      isDefault: c.id === id
    }));
    setCards(updated);
    notify('Tarjeta predeterminada para cobro automático actualizada.');
  };

  const handleDeleteCard = (id) => {
    if (!window.confirm('¿Deseas desvincular esta tarjeta?')) return;
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    notify('Tarjeta eliminada de tus métodos de pago.');
  };

  const openReceipt = (txn) => {
    setSelectedReceipt(txn);
    setShowReceiptModal(true);
  };

  const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Métodos de Pago & Facturación
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra tus tarjetas bancarias tokenizadas, billeteras móviles y consulta tus boletas electrónicas.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'cards' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mis Tarjetas & QR
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comprobantes Fiscales
            </button>
          </div>

          {activeTab === 'cards' && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="gap-1.5 font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarjeta</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tarjetas Activas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900">{cards.length}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              Encriptación AES-256
            </span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billeteras Móviles</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-black text-teal-700 font-mono">YAPE & PLIN</span>
            <span className="text-xs text-slate-400">0% Comisión</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gasto Facturado</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-700">S/ {totalSpent.toFixed(2)}</span>
            <span className="text-xs text-slate-500 font-mono">Moneda: PEN</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Comprobantes SUNAT</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-800">{transactions.length}</span>
            <span className="text-xs text-emerald-700 font-bold">Validadas</span>
          </div>
        </Card>
      </div>

      {/* VISTA 1: TARJETAS & BILLETERAS */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div 
                key={card.id} 
                className="relative h-56 rounded-3xl p-6 text-white overflow-hidden shadow-xl flex flex-col justify-between group transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: card.type === 'Visa'
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)'
                    : 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #7c2d12 100%)'
                }}
              >
                {/* Chip EMV & Contactless */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    {/* Chip Dorado */}
                    <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-500/50 shadow-inner flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/40 rounded-xs" />
                    </div>
                    {/* Icono Contactless */}
                    <div className="text-slate-400 text-xs font-mono font-bold tracking-widest flex items-center gap-1">
                      <span>📶</span>
                      <span className="text-[10px] text-slate-300">NFC PASS</span>
                    </div>
                  </div>

                  {card.isDefault ? (
                    <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-emerald-300" /> Principal
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultCard(card.id)}
                      className="text-slate-400 hover:text-white text-[10px] font-bold underline cursor-pointer"
                    >
                      Hacer Principal
                    </button>
                  )}
                </div>

                {/* Número Enmascarado */}
                <div className="font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-100 drop-shadow-md">
                  {card.number}
                </div>

                {/* Titular, Expiración y Marca */}
                <div className="flex justify-between items-end pt-2 border-t border-white/10">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">Titular de la Tarjeta</span>
                    <span className="font-bold text-xs tracking-wider uppercase text-slate-100">{card.holder}</span>
                  </div>

                  <div className="text-center">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">Vence</span>
                    <span className="font-mono font-bold text-xs text-slate-100">{card.expiry}</span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-mono font-black text-base text-white tracking-wider drop-shadow-md">
                      {card.type.toUpperCase()}
                    </span>
                    {!card.isDefault && (
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-bold mt-1 cursor-pointer"
                        title="Eliminar tarjeta"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Tarjeta de Billetera Digital Interoperable */}
            <Card className="p-6 border-slate-200 shadow-xs bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 flex flex-col justify-between rounded-3xl">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-900 text-teal-300 flex items-center justify-center font-black shadow-sm">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-mono">
                    Habilitado 24/7
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">Billeteras Móviles (Yape & Plin)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Escanea el código QR en el tótem de salida o garita para liquidar tu estancia al instante sin contacto.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>Comisión por Pago:</span>
                  <span className="font-mono font-black text-emerald-700">0.0% (Gratuito)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md">YAPE</span>
                  <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-md">PLIN</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">CULQI</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VISTA 2: COMPROBANTES FISCALES */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {transactions.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 shadow-xs hover:shadow-md transition rounded-3xl bg-white">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-black text-xs border border-emerald-100 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{t.parking}</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      ● {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {t.date} • Placa: <span className="font-bold text-slate-800">{t.plate}</span> • Boleta: <span className="font-bold text-teal-700">{t.invoice}</span> • {t.method}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <span className="text-lg font-black text-slate-900 font-mono">S/ {t.amount.toFixed(2)}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openReceipt(t)} 
                  className="font-bold text-xs gap-1.5 border-slate-300 rounded-xl h-9 hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver Boleta</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Agregar Tarjeta */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Vincular Tarjeta Bancaria</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos de tu tarjeta de crédito o débito (Tokenización segura).
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
                className="text-xs h-10 uppercase font-bold"
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
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                  setNewCard({ ...newCard, number: val });
                }}
                className="font-mono tracking-widest font-bold text-xs h-10"
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
                  className="font-mono text-center font-bold text-xs h-10"
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
                  className="font-mono text-center font-bold text-xs h-10"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 text-slate-600 text-xs font-medium">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tus datos son procesados mediante pasarela certificada PCI-DSS con tokenización.</span>
            </div>

            <Button type="submit" className="w-full font-bold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
              Guardar y Tokenizar Tarjeta
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Comprobante Fiscal */}
      {selectedReceipt && (
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center text-slate-900">
                Boleta de Venta Electrónica
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-mono text-slate-500">
                RUC: 20608945123 • {selectedReceipt.invoice}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs space-y-2.5 my-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Establecimiento:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{selectedReceipt.parking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Emisión:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placa Autorizada:</span>
                <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{selectedReceipt.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.method}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL LIQUIDADO (INC. IGV):</span>
                <span className="text-emerald-700">S/ {selectedReceipt.amount.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={() => window.print()} className="w-full font-black h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-1.5">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir / Descargar Comprobante</span>
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
