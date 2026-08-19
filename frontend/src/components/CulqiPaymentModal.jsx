import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
  Printer,
  Copy,
  Check,
  Building,
  HelpCircle,
  Clock,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

export const CULQI_PUBLIC_KEY = 'pk_test_W5ShN8WanbYh5Ru8';
export const CULQI_SECRET_KEY = 'sk_test_DqGi7c8DVwDLAkrt';

// Tarjetas de prueba oficiales de Culqi Sandbox
const CULQI_TEST_CARDS = [
  { label: 'Visa Aprobada', number: '4242424242424242', exp: '12/28', cvv: '123', brand: 'VISA', type: 'success' },
  { label: 'Mastercard Aprobada', number: '5555555555554444', exp: '09/27', cvv: '456', brand: 'MASTERCARD', type: 'success' },
  { label: 'Amex Aprobada', number: '378282246310005', exp: '11/26', cvv: '1234', brand: 'AMEX', type: 'success' },
  { label: 'Fondos Insuficientes', number: '4000000000000002', exp: '10/26', cvv: '999', brand: 'VISA', type: 'declined' },
];

export const CulqiPaymentModal = ({ 
  isOpen, 
  onClose, 
  amount = 10.00, 
  concept = 'Reserva de Estacionamiento Smart-Park', 
  parkingName = 'Smart Park Plaza Mayor',
  slotCode = 'A-01',
  customerEmail = 'conductor@smartpark.com',
  onPaymentSuccess 
}) => {
  const [activeMethod, setActiveMethod] = useState('card'); // 'card' | 'yape' | 'plin' | 'pagoefectivo'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCIP, setCopiedCIP] = useState(false);
  const [showCVV, setShowCVV] = useState(false);

  // Formulario Tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('CARLOS MENDOZA');
  const [installments, setInstallments] = useState(1);
  const [saveCard, setSaveCard] = useState(true);

  // Formulario Yape
  const [yapePhone, setYapePhone] = useState('966 123 456');
  const [yapeOtp, setYapeOtp] = useState('');
  const [qrTimer, setQrTimer] = useState(120);

  // Formulario PagoEfectivo (CIP)
  const [cipCode] = useState(`CIP-${Math.floor(10000000 + Math.random() * 90000000)}`);

  // Temporizador para QR de Yape/Plin
  useEffect(() => {
    let interval;
    if (isOpen && (activeMethod === 'yape' || activeMethod === 'plin') && qrTimer > 0 && !paymentSuccess) {
      interval = setInterval(() => setQrTimer(prev => (prev > 0 ? prev - 1 : 120)), 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, activeMethod, qrTimer, paymentSuccess]);

  // Formateadores
  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').substring(0, 4);
    if (digits.length >= 3) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    return digits;
  };

  const getCardBrand = (number) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('3')) return 'AMEX';
    if (clean.startsWith('6')) return 'DINERS';
    return 'GENÉRICA';
  };

  // Cargar preset de prueba de Culqi
  const fillTestCard = (preset) => {
    setCardNumber(formatCardNumber(preset.number));
    setCardExpiry(preset.exp);
    setCardCvv(preset.cvv);
    setErrorMsg('');
  };

  // Procesar Pago
  const handleProcessPayment = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (activeMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15) {
        setErrorMsg('Ingresa un número de tarjeta válido (16 dígitos).');
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMsg('Ingresa el código CVV (3 o 4 dígitos).');
        return;
      }
      if (cleanCard === '4000000000000002') {
        setIsProcessing(true);
        setProcessingStep('Validando fondos con el banco emisor...');
        setTimeout(() => {
          setIsProcessing(false);
          setErrorMsg('Error Culqi [declined]: La tarjeta no cuenta con fondos suficientes.');
        }, 1500);
        return;
      }
    }

    if (activeMethod === 'yape' && yapeOtp.length < 6 && activeMethod !== 'pagoefectivo') {
      setErrorMsg('Ingresa el código de aprobación de 6 dígitos de tu app Yape.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Cifrando credenciales con Culqi Tokenizer v4...');

    setTimeout(() => {
      setProcessingStep('Autorizando cargo con sk_test_DqGi7c8DVwDLAkrt...');
    }, 800);

    setTimeout(() => {
      setIsProcessing(false);
      const chargeData = {
        chargeId: `chr_test_${Math.random().toString(36).substring(2, 10)}`,
        tokenId: `tkn_test_${Math.random().toString(36).substring(2, 10)}`,
        amount: Number(amount),
        currency: 'PEN',
        currencySymbol: 'S/',
        method: activeMethod === 'card' 
          ? `Tarjeta ${getCardBrand(cardNumber)}` 
          : activeMethod === 'yape' 
          ? 'Yape Culqi' 
          : activeMethod === 'plin' 
          ? 'Plin Culqi' 
          : 'PagoEfectivo CIP',
        cardBrand: getCardBrand(cardNumber),
        last4: cardNumber.replace(/\s/g, '').slice(-4) || '4242',
        cardHolder: cardHolder || 'CARLOS MENDOZA',
        email: customerEmail,
        installments: Number(installments),
        invoiceNumber: `B001-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString('es-PE'),
        authorizationCode: `AUT-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'PAID',
        gateway: 'CULQI PERÚ (PCI-DSS)'
      };

      setPaymentSuccess(chargeData);
      if (onPaymentSuccess) {
        onPaymentSuccess(chargeData);
      }
    }, 1900);
  };

  const handleResetAndClose = () => {
    setPaymentSuccess(null);
    setErrorMsg('');
    setIsProcessing(false);
    onClose();
  };

  const handleCopyCIP = () => {
    navigator.clipboard.writeText(cipCode.replace('CIP-', ''));
    setCopiedCIP(true);
    setTimeout(() => setCopiedCIP(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border-slate-200 shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* Cabecera Culqi */}
        <DialogHeader className="border-b border-slate-100 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                C
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Culqi Checkout v4</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    TEST MODE
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500">Pasarela oficial certificada PCI-DSS Nivel 1 • Cifrado TLS 1.3</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total a Pagar</span>
              <span className="text-lg font-black text-emerald-600 font-mono">S/ {Number(amount).toFixed(2)}</span>
            </div>
          </div>
        </DialogHeader>

        {/* =========================================================================
            PANTALLA DE PAGO EXITOSO CON VOUCHER SUNAT & CULQI
            ========================================================================= */}
        {paymentSuccess ? (
          <div className="py-2 space-y-4 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">¡Pago Aprobado por Culqi!</h3>
              <p className="text-xs text-slate-500">Tu transacción fue autorizada satisfactoriamente.</p>
            </div>

            {/* Voucher Oficial Culqi & Boleta */}
            <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-xl space-y-3 font-mono border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">SMART PARK PERÚ S.A.C.</span>
                  <span className="text-[9px] text-slate-400">RUC: 20608912341 • BOLETA {paymentSuccess.invoiceNumber}</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  PAGADO
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Cochera:</span>
                  <strong className="text-white font-sans">{parkingName}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Cajón Reservado:</span>
                  <strong className="text-emerald-400 font-mono">{slotCode}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Medio de Pago:</span>
                  <span className="text-white">{paymentSuccess.method} (•••• {paymentSuccess.last4})</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">ID de Cargo (Culqi):</span>
                  <span className="text-slate-400 text-[10px]">{paymentSuccess.chargeId}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Autorización:</span>
                  <span className="text-emerald-400 font-bold">{paymentSuccess.authorizationCode}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Fecha y Hora:</span>
                  <span className="text-slate-400 text-[10px]">{paymentSuccess.date}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm">
                <span className="font-sans text-slate-400 text-xs">Monto Total Liquidado:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">S/ {paymentSuccess.amount.toFixed(2)} PEN</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 py-3 text-xs font-bold gap-1.5 rounded-2xl border-slate-300 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir Voucher</span>
              </Button>
              <Button
                type="button"
                onClick={handleResetAndClose}
                className="flex-1 py-3 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl cursor-pointer shadow-md"
              >
                <span>Ver Mi Pase QR →</span>
              </Button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              FORMULARIO DE CHECKOUT CULQI CON MÉTODOS PERUANOS
              ========================================================================= */
          <div className="space-y-4 my-1">
            
            {/* Selector de Pestañas de Pago */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveMethod('card'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMethod('yape'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'yape' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Yape</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMethod('plin'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'plin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-sky-600" />
                <span>Plin</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMethod('pagoefectivo'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'pagoefectivo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-amber-600" />
                <span>Agentes CIP</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. MÉTODO: TARJETA CRÉDITO / DÉBITO */}
            {activeMethod === 'card' && (
              <div className="space-y-3.5">
                {/* Visual Card 3D Preview */}
                <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-2xl text-white shadow-lg space-y-3 border border-slate-700 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold">SMART-PARK CULQI PAY</span>
                    <span className="text-xs font-black tracking-wider bg-white/10 px-2 py-0.5 rounded">
                      {getCardBrand(cardNumber)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                      <div className="w-4 h-3 border border-amber-600 rounded-xs opacity-60" />
                    </div>
                    <span className="text-xs font-mono text-slate-400">••••</span>
                  </div>

                  <div className="font-mono text-sm tracking-widest font-black text-slate-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex justify-between items-end text-[10px] font-mono text-slate-300">
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Titular</span>
                      <span className="font-bold tracking-tight">{cardHolder || 'NOMBRE DEL TITULAR'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Vence</span>
                      <span className="font-bold">{cardExpiry || 'MM/AA'}</span>
                    </div>
                  </div>
                </div>

                {/* Presets rápidos para probar Culqi */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tarjetas de Prueba Culqi (Sandbox):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CULQI_TEST_CARDS.map((tc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => fillTestCard(tc)}
                        className={`text-[10px] font-mono px-2 py-1 rounded-lg border font-bold transition cursor-pointer ${
                          tc.type === 'success' 
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50' 
                            : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {tc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleProcessPayment} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Número de Tarjeta *</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="pl-9 font-mono font-bold text-xs h-10 bg-slate-50/80 border-slate-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Vencimiento *</label>
                      <Input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="font-mono font-bold text-xs h-10 bg-slate-50/80 border-slate-300 text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">CVV *</label>
                      <div className="relative">
                        <Input
                          type={showCVV ? "text" : "password"}
                          placeholder="123"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="font-mono font-bold text-xs h-10 bg-slate-50/80 border-slate-300 text-center pr-8"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCVV(!showCVV)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showCVV ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Titular *</label>
                    <Input
                      type="text"
                      placeholder="Como figura en el plástico"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="text-xs h-10 bg-slate-50/80 border-slate-300 uppercase font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Cuotas</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800"
                      >
                        <option value={1}>1 Cuota (Sin Intereses)</option>
                        <option value={2}>2 Cuotas</option>
                        <option value={3}>3 Cuotas</option>
                        <option value={6}>6 Cuotas</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                      <input
                        type="checkbox"
                        id="saveCard"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                      <label htmlFor="saveCard" className="text-xs text-slate-700 font-medium cursor-pointer">
                        Recordar para 1-clic
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl cursor-pointer shadow-md gap-2 mt-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{processingStep}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-emerald-200" />
                        <span>Pagar S/ {Number(amount).toFixed(2)} con Culqi</span>
                        <ArrowRight className="w-4 h-4 text-emerald-200" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* 2. MÉTODO: YAPE CULQI */}
            {activeMethod === 'yape' && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950">Pago Inmediato con Yape Culqi</span>
                    <span className="text-[10px] font-mono font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                      Expira: {Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-bold text-purple-900 block mb-1">Número de Celular Yape</label>
                      <Input
                        type="tel"
                        value={yapePhone}
                        onChange={(e) => setYapePhone(e.target.value)}
                        className="font-mono font-bold text-xs h-10 bg-white border-purple-300"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-purple-900">Código de Aprobación (6 dígitos) *</label>
                        <span className="text-[10px] text-purple-700 font-bold">Abre Yape → Código de Aprobación</span>
                      </div>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={yapeOtp}
                        onChange={(e) => setYapeOtp(e.target.value.replace(/\D/g, ''))}
                        className="font-mono font-black text-center text-base tracking-widest h-11 bg-white border-purple-300"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="w-full py-4 text-xs font-black bg-purple-700 hover:bg-purple-600 text-white rounded-2xl cursor-pointer shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando OTP con Yape Culqi...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Yapear S/ {Number(amount).toFixed(2)} Ahora</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 3. MÉTODO: PLIN & BILLETERAS */}
            {activeMethod === 'plin' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-3xl bg-sky-50/70 border border-sky-200 space-y-3">
                  <h4 className="text-xs font-black text-sky-950">Escanea el QR con Plin, Interbank o BBVA</h4>
                  
                  {/* QR Simulado */}
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border-2 border-sky-300 shadow-md flex items-center justify-center relative">
                    <QrCode className="w-28 h-28 text-slate-800" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-7 h-7 bg-sky-600 text-white font-black text-[10px] rounded-lg flex items-center justify-center shadow-xs">
                        PLIN
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-sky-800 font-mono">
                    Monto exacto: <strong>S/ {Number(amount).toFixed(2)}</strong> • Smart Park Perú
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="w-full py-4 text-xs font-black bg-sky-600 hover:bg-sky-500 text-white rounded-2xl cursor-pointer shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirmando transferencia Plin...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Ya realicé el pago por Plin</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 4. MÉTODO: PAGOEFECTIVO CIP */}
            {activeMethod === 'pagoefectivo' && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-950">Pago en Agentes y Banca por Internet</span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono">
                      Vence en 24h
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-amber-300 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Código CIP de Pago</span>
                      <span className="text-lg font-black text-slate-900 tracking-wider">{cipCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCIP}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedCIP ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCIP ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-600 space-y-1">
                    <p>• Paga en Agentes BCP, BBVA, Interbank, Kasnet o Western Union.</p>
                    <p>• Indica el código CIP <strong>{cipCode}</strong> y el monto <strong>S/ {Number(amount).toFixed(2)}</strong>.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="w-full py-4 text-xs font-black bg-amber-600 hover:bg-amber-500 text-white rounded-2xl cursor-pointer shadow-md gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando acreditación en Agente...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simular Pago Acreditado en Agente</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Footer de Seguridad */}
            <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1 border-t border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transacción cifrada de extremo a extremo con Culqi v4 • Clave: pk_test_W5Sh...</span>
            </div>

          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};
