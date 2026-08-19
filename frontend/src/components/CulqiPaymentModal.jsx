import React, { useState } from 'react';
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
  Receipt
} from 'lucide-react';

export const CULQI_PUBLIC_KEY = 'pk_test_W5ShN8WanbYh5Ru8';
export const CULQI_SECRET_KEY = 'sk_test_DqGi7c8DVwDLAkrt';

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
  const [activeMethod, setActiveMethod] = useState('card'); // 'card' | 'yape' | 'pagoefectivo'
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario de Tarjeta Culqi
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('Carlos Mendoza');
  const [email, setEmail] = useState(customerEmail);

  // Formulario Yape Culqi
  const [yapePhone, setYapePhone] = useState('966 123 456');
  const [yapeOtp, setYapeOtp] = useState('');

  // Formateador de tarjeta
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

  // Detectar franquicia
  const getCardBrand = (number) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('3')) return 'AMEX';
    if (clean.startsWith('6')) return 'DINERS';
    return 'TARJETA';
  };

  // Procesar Pago con Culqi
  const handleProcessPayment = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsProcessing(true);

    if (activeMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15) {
        setErrorMsg('Por favor ingresa un número de tarjeta válido (16 dígitos).');
        setIsProcessing(false);
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMsg('Por favor ingresa el código CVV (3 o 4 dígitos).');
        setIsProcessing(false);
        return;
      }
    }

    if (activeMethod === 'yape' && yapeOtp.length < 6) {
      setErrorMsg('Ingresa el código de aprobación de 6 dígitos generado en tu App Yape.');
      setIsProcessing(false);
      return;
    }

    // Simulación de Tokenización Culqi v4 y Cargo con API Secret
    setTimeout(() => {
      setIsProcessing(false);
      const chargeData = {
        chargeId: `chr_test_${Math.random().toString(36).substring(2, 10)}`,
        tokenId: `tkn_test_${Math.random().toString(36).substring(2, 10)}`,
        amount: Number(amount),
        currency: 'PEN',
        method: activeMethod === 'card' ? `Tarjeta ${getCardBrand(cardNumber)}` : 'Yape Culqi QR',
        cardBrand: getCardBrand(cardNumber),
        last4: cardNumber.replace(/\s/g, '').slice(-4) || '4242',
        cardHolder,
        email,
        date: new Date().toLocaleString('es-PE'),
        authorizationCode: `AUT-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'PAID',
        gateway: 'CULQI PERÚ'
      };

      setPaymentSuccess(chargeData);
      if (onPaymentSuccess) {
        onPaymentSuccess(chargeData);
      }
    }, 1800);
  };

  const handleResetAndClose = () => {
    setPaymentSuccess(null);
    setErrorMsg('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-slate-200">
        
        {/* Cabecera con Logo Culqi & Seguridad */}
        <DialogHeader className="border-b border-slate-100 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
                C
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Pasarela de Pago Culqi</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                    TEST MODE
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500">Pasarela oficial certificada PCI-DSS Nivel 1</p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" /> SSL 256-bit
            </span>
          </div>
        </DialogHeader>

        {/* =========================================================================
            ESTADO DE PAGO EXITOSO CON COMPROBANTE CULQI
            ========================================================================= */}
        {paymentSuccess ? (
          <div className="py-4 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">¡Pago Procesado Exitosamente!</h3>
              <p className="text-xs text-slate-500">Tu transacción fue autorizada por la pasarela Culqi.</p>
            </div>

            {/* Voucher Culqi */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-sans">Monto Cobrado:</span>
                <strong className="text-emerald-700 text-sm font-black">S/ {paymentSuccess.amount.toFixed(2)} PEN</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">ID de Cargo (Culqi):</span>
                <span className="font-bold text-slate-800">{paymentSuccess.chargeId}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Código de Autorización:</span>
                <span className="font-bold text-slate-800">{paymentSuccess.authorizationCode}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Medio Utilizado:</span>
                <span className="font-bold text-slate-800">{paymentSuccess.method} (•••• {paymentSuccess.last4})</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Cajón Reservado:</span>
                <span className="font-bold text-emerald-800 font-sans">{slotCode} • {parkingName}</span>
              </div>
            </div>

            <Button
              onClick={handleResetAndClose}
              className="w-full font-black py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl cursor-pointer shadow-md"
            >
              <span>Ver mi Pase Digital QR →</span>
            </Button>
          </div>
        ) : (
          /* =========================================================================
              FORMULARIO DE CHECKOUT CULQI
              ========================================================================= */
          <div className="space-y-4 my-1">
            
            {/* Resumen del Monto */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Concepto</span>
                <span className="text-xs font-bold text-slate-200">{concept}</span>
                <span className="text-[10px] text-emerald-400 font-mono block">Cajón: {slotCode}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total a Pagar</span>
                <span className="text-xl font-black text-emerald-400 font-mono">S/ {Number(amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Selector de Método de Pago Culqi */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveMethod('card'); setErrorMsg(''); }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeMethod === 'card'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Tarjeta Visa / MC</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMethod('yape'); setErrorMsg(''); }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeMethod === 'yape'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>Yape Culqi</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProcessPayment} className="space-y-3">
              {activeMethod === 'card' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700">Número de Tarjeta *</label>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {getCardBrand(cardNumber)}
                      </span>
                    </div>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="pl-10 font-mono font-bold text-xs h-10 bg-slate-50/80 border-slate-300"
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
                      <label className="text-xs font-bold text-slate-700 block mb-1">CVV (Seguridad) *</label>
                      <Input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="font-mono font-bold text-xs h-10 bg-slate-50/80 border-slate-300 text-center"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Titular de la Tarjeta *</label>
                    <Input
                      type="text"
                      placeholder="Nombre como figura en la tarjeta"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="text-xs h-10 bg-slate-50/80 border-slate-300"
                      required
                    />
                  </div>
                </>
              )}

              {activeMethod === 'yape' && (
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-900 block">Número de Celular Yape</label>
                    <Input
                      type="tel"
                      value={yapePhone}
                      onChange={(e) => setYapePhone(e.target.value)}
                      className="font-mono font-bold text-xs h-10 bg-white border-purple-300"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-purple-900">Código de Aprobación (6 dígitos) *</label>
                      <span className="text-[10px] text-purple-700 font-bold">Generar en App Yape</span>
                    </div>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={yapeOtp}
                      onChange={(e) => setYapeOtp(e.target.value.replace(/\D/g, ''))}
                      className="font-mono font-black text-center text-sm tracking-widest h-11 bg-white border-purple-300"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Botón de Pago con Culqi */}
              <Button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl cursor-pointer shadow-md gap-2 mt-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando con Servidor Culqi...</span>
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

            <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transacción protegida con Culqi Tokenizer v4 • Clave: pk_test_***</span>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};
