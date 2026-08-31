import React, { useState, useEffect } from 'react';
import api, { getAccessToken } from '../services/api';
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
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Building2
} from 'lucide-react';

const CARDS_STORAGE_KEY_BASE = 'smart_park_cards_v2';
const getCardsKey = () => {
  try {
    const saved = localStorage.getItem('smart_park_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      return `${CARDS_STORAGE_KEY_BASE}_${u?.id || u?.email || 'guest'}`;
    }
  } catch { }
  return `${CARDS_STORAGE_KEY_BASE}_guest`;
};

export const PaymentsModule = () => {
  const [cards, setCards] = useState(() => {
    try {
      const key = getCardsKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { }
    return [];
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
    } catch (e) { }
  }, [cards]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'history'
  const [toast, setToast] = useState(null);

  // Transacciones reales desde el servidor (GET /payments/my)
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
    if (!getAccessToken()) return;
    api.get('/payments/my').then(r => {
      const rows = (Array.isArray(r.data) ? r.data : []).map(p => ({
        id: p.id,
        date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        description: p.description || 'Reserva Smart Park',
        reservationCode: p.reservation_id ? `#${p.reservation_id}` : '—',
        amount: Number(p.amount) || 0,
        method: p.method === 'paypal' ? 'PayPal (Express)' : p.method === 'card' ? 'Tarjeta (Culqi)' : (p.method || 'Tarjeta'),
        status: p.status === 'succeeded' ? 'Pagado' : (p.status || 'Pagado'),
        chargeId: p.culqi_charge_id || ''
      }));
      setTransactions(rows);
    }).catch(() => {});
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.name || !newCard.expiry) return;

    // Detectar tipo de tarjeta
    const cleanNum = newCard.number.replace(/\s+/g, '');
    let cardType = 'Visa';
    if (cleanNum.startsWith('5')) cardType = 'Mastercard';
    if (cleanNum.startsWith('3')) cardType = 'Amex';

    const formattedLast4 = cleanNum.slice(-4) || '1234';
    const cardObj = {
      id: Date.now(),
      type: cardType,
      number: `•••• •••• •••• ${formattedLast4}`,
      holder: newCard.name.toUpperCase(),
      expiry: newCard.expiry,
      isDefault: cards.length === 0
    };

    setCards([...cards, cardObj]);
    setNewCard({ number: '', name: '', expiry: '', cvc: '' });
    setShowAddModal(false);
    notify(`✓ Tarjeta ${cardType} vinculada con éxito.`);
  };

  const handleSetDefaultCard = (id) => {
    const updated = cards.map(c => ({
      ...c,
      isDefault: c.id === id
    }));
    setCards(updated);
    notify('Tarjeta principal actualizada.');
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
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-bottom-5">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner Ejecutivo */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Métodos de Pago
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Tarjetas tokenizadas, billeteras móviles y comprobantes.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('cards')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cards' ? 'bg-slate-800 text-white shadow-xs font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tarjetas & QR
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'history' ? 'bg-slate-800 text-white shadow-xs font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Comprobantes
              </button>
            </div>

            {activeTab === 'cards' && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto justify-center gap-1.5 font-bold text-xs rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 h-8.5 px-3.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Vincular Tarjeta</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Tarjetas Activas</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">{cards.length}</span>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tokenizadas
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Seguridad bancaria AES-256</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Billeteras Móviles</span>
            <Smartphone className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-bold text-slate-900 font-mono">YAPE & PLIN</span>
            <span className="text-xs text-emerald-700 font-semibold">0% Comisión</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cobro instantáneo QR</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Gasto Facturado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">S/ {totalSpent.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-mono">PEN</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Acumulado del mes</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Comprobantes</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">{transactions.length}</span>
            <span className="text-xs text-emerald-700 font-semibold">SUNAT OK</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Boletas y facturas</p>
        </div>

      </div>

      {/* VISTA 1: TARJETAS & BILLETERAS */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Tarjeta de Billetera Digital Interoperable */}
            <div className="p-6 border border-slate-200/90 shadow-xs bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 flex flex-col justify-between rounded-3xl group hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black shadow-sm">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase font-mono">
                    ● DISPONIBLE 24/7
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">Billeteras Móviles (Yape & Plin)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Escanea el código QR en el tótem de salida o garita para liquidar tu estancia al instante sin contacto.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Comisión de Servicio:</span>
                  <span className="font-mono font-black text-emerald-700">0.0% (Gratuito)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] font-bold text-slate-600">
                  <span>YAPE</span> • <span>PLIN</span> • <span>CULQI</span>
                </div>
              </div>
            </div>

            {/* Tarjeta de PayPal Express Wallet */}
            <div className="p-6 border border-blue-200/80 shadow-xs bg-gradient-to-br from-white via-blue-50/30 to-[#003087]/5 flex flex-col justify-between rounded-3xl group hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center p-2 shadow-sm shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.056 3 37.351 45" className="w-7 h-7">
                      <path fill="#002991" d="M38.914 13.35c0 5.574-5.144 12.15-12.927 12.15H18.49l-.368 2.322L16.373 39H7.056l5.605-36h15.095c5.083 0 9.082 2.833 10.555 6.77a9.7 9.7 0 0 1 .603 3.58"/>
                      <path fill="#60cdff" d="M44.284 23.7A12.894 12.894 0 0 1 31.53 34.5h-5.206L24.157 48H14.89l1.483-9l1.75-11.178l.367-2.322h7.497c7.773 0 12.927-6.576 12.927-12.15c3.825 1.974 6.055 5.963 5.37 10.35"/>
                      <path fill="#008cff" d="M38.914 13.35C37.31 12.511 35.365 12 33.248 12h-12.64L18.49 25.5h7.497c7.773 0 12.927-6.576 12.927-12.15"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase font-mono bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                    ● ACTIVO SANDBOX
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">PayPal Express Checkout</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Paga reservas y salidas con tu saldo PayPal o tarjetas internacionales con protección al comprador.
                </p>
              </div>

              <div className="pt-4 border-t border-blue-100 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Conversión Automática:</span>
                  <span className="font-mono font-black text-blue-700">PEN / USD (1 S/ = $0.27)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] font-bold text-slate-600">
                  <span>SMART BUTTONS</span> • <span>REST API v2</span>
                </div>
              </div>
            </div>

            {/* Listado de Tarjetas Bancarias */}
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative h-60 rounded-3xl p-6 text-white overflow-hidden shadow-xl flex flex-col justify-between group transition-all duration-300 hover:scale-[1.02] border border-white/10"
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
                      <Star className="w-3 h-3 fill-emerald-300" /> PRINCIPAL
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
                <div className="font-mono text-xl font-black tracking-widest text-slate-100 drop-shadow-md">
                  {card.number}
                </div>

                {/* Titular, Expiración y Marca */}
                <div className="flex justify-between items-end pt-3 border-t border-white/10">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">Titular</span>
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

          </div>
        </div>
      )}

      {/* VISTA 2: COMPROBANTES FISCALES */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-xs space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">No hay comprobantes emitidos</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cuando realices pagos o reservas en las garitas inteligentes, tus boletas y facturas electrónicas aparecerán aquí.
              </p>
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs hover:shadow-md transition rounded-3xl bg-white">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-black text-xs border border-emerald-100 shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{t.parking}</h3>
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
                    className="font-bold text-xs gap-1.5 rounded-xl h-9"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Boleta</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Vincular Nueva Tarjeta */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>Vincular Tarjeta de Débito / Crédito</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tus datos bancarios se tokenizan bajo certificación de seguridad PCI-DSS.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCard} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Número de Tarjeta *</label>
              <Input
                type="text"
                placeholder="4557 •••• •••• 1234"
                maxLength={19}
                value={newCard.number}
                onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                className="font-mono font-bold tracking-widest text-sm h-10 bg-slate-50 border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Titular (Como figura en la tarjeta) *</label>
              <Input
                type="text"
                placeholder="NOMBRE Y APELLIDOS DEL TITULAR"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value.toUpperCase() })}
                className="text-xs uppercase font-bold h-10 bg-slate-50 border-slate-200"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiración (MM/AA) *</label>
                <Input
                  type="text"
                  placeholder="12/28"
                  maxLength={5}
                  value={newCard.expiry}
                  onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                  className="font-mono text-center font-bold text-xs h-10 bg-slate-50 border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código CVC / CVV *</label>
                <Input
                  type="password"
                  placeholder="•••"
                  maxLength={4}
                  value={newCard.cvc}
                  onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                  className="font-mono text-center font-bold text-xs h-10 bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-extrabold h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer transition-colors"
            >
              Guardar y Tokenizar Tarjeta
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};
