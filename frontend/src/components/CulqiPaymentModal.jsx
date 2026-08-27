import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../services/api';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  ArrowRight, 
  Printer, 
  Copy, 
  Check, 
  Building, 
  Eye, 
  EyeOff,
  ExternalLink,
  ShieldAlert,
  Wallet
} from 'lucide-react';

// Credenciales públicas para frontend (el secreto CULQI_SECRET_KEY y PAYPAL_CLIENT_SECRET residen en el backend)
export const CULQI_PUBLIC_KEY = import.meta.env.VITE_CULQI_PUBLIC_KEY || 'pk_test_ZqUyhWj5y7nmIHax';
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'BAADoNYpVsJd20zFA2pZHva0nt7lYj4GnPqKFDFI_7Cdta0qd-FqG4g8wmndZYuPPcEAmSO-ukcu2mJDR0';
export const PAYPAL_EXCHANGE_RATE = Number(import.meta.env.VITE_PAYPAL_EXCHANGE_RATE || 0.27);

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
  onPaymentSuccess,
  reservationId = null
}) => {
  const [activeMethod, setActiveMethod] = useState('paypal'); // 'paypal' | 'card' | 'yape' | 'plin' | 'pagoefectivo'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCIP, setCopiedCIP] = useState(false);
  const [showCVV, setShowCVV] = useState(false);

  // PayPal SDK Loading State
  const [paypalSdkLoaded, setPaypalSdkLoaded] = useState(false);
  const [paypalSdkLoading, setPaypalSdkLoading] = useState(false);
  const [paypalSdkError, setPaypalSdkError] = useState('');
  const paypalContainerRef = useRef(null);
  const paypalButtonsRendered = useRef(false);

  // Formulario Tarjeta Culqi
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

  // CIP informativo
  const [cipCode] = useState(`CIP-${Math.floor(10000000 + Math.random() * 90000000)}`);

  // Cálculos de moneda
  const amountPen = Number(amount) || 10.00;
  const amountUsd = Math.max(0.50, Number((amountPen * PAYPAL_EXCHANGE_RATE).toFixed(2)));

  // Temporizador para QR de Yape/Plin
  useEffect(() => {
    let interval;
    if (isOpen && (activeMethod === 'yape' || activeMethod === 'plin') && qrTimer > 0 && !paymentSuccess) {
      interval = setInterval(() => setQrTimer(prev => (prev > 0 ? prev - 1 : 120)), 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, activeMethod, qrTimer, paymentSuccess]);

  // Cargar SDK oficial de PayPal dinámicamente
  useEffect(() => {
    if (!isOpen || paymentSuccess) return;

    const clientId = PAYPAL_CLIENT_ID?.trim();
    if (!clientId) {
      setPaypalSdkError('VITE_PAYPAL_CLIENT_ID no está configurado.');
      return;
    }

    if (window.paypal) {
      setPaypalSdkLoaded(true);
      return;
    }

    const scriptId = 'paypal-sdk-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      setPaypalSdkLoading(true);
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
      script.async = true;
      script.onload = () => {
        setPaypalSdkLoaded(true);
        setPaypalSdkLoading(false);
      };
      script.onerror = () => {
        setPaypalSdkError('No se pudo cargar el SDK oficial de PayPal. Verifica tu conexión a internet.');
        setPaypalSdkLoading(false);
      };
      document.body.appendChild(script);
    } else {
      if (window.paypal) {
        setPaypalSdkLoaded(true);
      } else {
        script.addEventListener('load', () => setPaypalSdkLoaded(true));
      }
    }
  }, [isOpen, paymentSuccess]);

  // Renderizar PayPal Smart Buttons cuando el tab está activo y el SDK cargado
  useEffect(() => {
    if (!isOpen || activeMethod !== 'paypal' || !paypalSdkLoaded || !window.paypal || paymentSuccess) {
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    // Limpiar contenedor anterior antes de volver a montar
    container.innerHTML = '';
    paypalButtonsRendered.current = false;

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 44
        },
        createOrder: async () => {
          setIsProcessing(true);
          setProcessingStep('Generando orden PayPal...');
          setErrorMsg('');
          try {
            const res = await api.post('/payments/paypal/create-order', {
              amount: amountPen,
              currency: 'PEN',
              reservation_id: reservationId,
              description: concept
            });
            setIsProcessing(false);
            if (!res.data?.order_id) {
              throw new Error('PayPal no devolvió un ID de orden válido.');
            }
            return res.data.order_id;
          } catch (err) {
            setIsProcessing(false);
            const msg = err.response?.data?.detail || err.message || 'Error al crear la orden con PayPal';
            setErrorMsg(`Error en PayPal: ${msg}`);
            throw err;
          }
        },
        onApprove: async (data) => {
          setIsProcessing(true);
          setProcessingStep('Capturando pago en el servidor...');
          try {
            const res = await api.post('/payments/paypal/capture-order', {
              order_id: data.orderID,
              reservation_id: reservationId,
              amount_pen: amountPen,
              description: concept
            });

            const captureData = res.data;
            setIsProcessing(false);
            setPaymentSuccess(captureData);
            if (onPaymentSuccess) onPaymentSuccess(captureData);
          } catch (err) {
            setIsProcessing(false);
            const msg = err.response?.data?.detail || err.message || 'Fallo al confirmar el pago en PayPal';
            setErrorMsg(`Error al capturar pago PayPal: ${msg}`);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          setErrorMsg('Transacción de PayPal cancelada por el usuario.');
        },
        onError: (err) => {
          setIsProcessing(false);
          setErrorMsg(`Error en el botón de PayPal: ${err?.message || 'Problema de conexión con PayPal'}`);
        }
      }).render('#paypal-button-container');

      paypalButtonsRendered.current = true;
    } catch (e) {
      console.error('Error renderizando botones de PayPal:', e);
    }
  }, [isOpen, activeMethod, paypalSdkLoaded, amountPen, reservationId, concept, paymentSuccess]);

  // Formateadores de Tarjeta
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

  const fillTestCard = (preset) => {
    setCardNumber(formatCardNumber(preset.number));
    setCardExpiry(preset.exp);
    setCardCvv(preset.cvv);
    setErrorMsg('');
  };

  const parseExpiry = (val) => {
    const [mm, yy] = val.split('/');
    const month = (mm || '').padStart(2, '0');
    let year = yy || '';
    if (year.length === 2) year = '20' + year;
    return { month, year };
  };

  // Procesar Pago con Tarjeta Culqi
  const handleProcessCulqiCard = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorMsg('Ingresa un número de tarjeta válido (15-16 dígitos).');
      return;
    }
    if (cardCvv.length < 3) {
      setErrorMsg('Ingresa el código CVV (3 o 4 dígitos).');
      return;
    }
    if (!cardExpiry.includes('/') || cardExpiry.length < 5) {
      setErrorMsg('Ingresa vencimiento en formato MM/AA.');
      return;
    }
    const { month, year } = parseExpiry(cardExpiry);
    if (!month || !year || Number(month) < 1 || Number(month) > 12) {
      setErrorMsg('Vencimiento inválido.');
      return;
    }

    const pk = (CULQI_PUBLIC_KEY || '').trim();
    if (!pk || !pk.startsWith('pk_')) {
      setErrorMsg('Llave pública de Culqi no configurada en el frontend (VITE_CULQI_PUBLIC_KEY).');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Tokenizando tarjeta con Culqi...');

    let tokenId;
    try {
      const tokenResp = await fetch('https://api.culqi.com/v2/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pk}`,
        },
        body: JSON.stringify({
          card_number: cleanCard,
          cvv: cardCvv,
          expiration_month: month,
          expiration_year: year,
          email: customerEmail,
        }),
      });
      const tokenData = await tokenResp.json().catch(() => ({}));
      if (!tokenResp.ok) {
        const msg = tokenData.user_message || tokenData.merchant_message || tokenData.message || `Error al tokenizar (${tokenResp.status})`;
        throw new Error(msg);
      }
      tokenId = tokenData.id;
      if (!tokenId) throw new Error('Culqi no devolvió token (id vacío)');
    } catch (err) {
      setIsProcessing(false);
      setErrorMsg(err.message?.includes('Failed to fetch') ? 'No se pudo conectar con Culqi para tokenizar. Verifica tu conexión.' : `Error al tokenizar: ${err.message}`);
      return;
    }

    setProcessingStep('Efectuando cobro en el servidor...');
    try {
      const amountCents = Math.round(Number(amountPen) * 100);
      const payload = {
        amount_cents: amountCents,
        currency: 'PEN',
        token_id: tokenId,
        description: (concept || 'Reserva Smart Park').slice(0, 80),
        email: customerEmail,
      };
      if (reservationId) payload.reservation_id = reservationId;

      const res = await api.post('/payments/charge', payload);
      const data = res.data;

      const chargeData = {
        chargeId: data.id || data.chargeId || tokenId,
        tokenId: tokenId,
        amount: Number(amountPen),
        currency: 'PEN',
        currencySymbol: 'S/',
        method: `Tarjeta ${getCardBrand(cardNumber)}`,
        cardBrand: getCardBrand(cardNumber),
        last4: cleanCard.slice(-4) || '4242',
        cardHolder: cardHolder || 'CARLOS MENDOZA',
        email: customerEmail,
        installments: Number(installments),
        invoiceNumber: data.invoice_number || `B001-${String(data.id || '').slice(-6) || Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString('es-PE'),
        authorizationCode: data.authorization_code || data.auth_code || `AUT-${String(data.id || '').slice(-6) || '---'}`,
        status: 'PAID',
        gateway: 'CULQI PERÚ (PCI-DSS)',
        raw: data,
      };

      setIsProcessing(false);
      setPaymentSuccess(chargeData);
      if (onPaymentSuccess) onPaymentSuccess(chargeData);
    } catch (err) {
      setIsProcessing(false);
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.message || 'Error desconocido';
      if (status === 401) {
        setErrorMsg('Sesión expirada. Inicia sesión nuevamente para pagar.');
      } else if (status === 503) {
        setErrorMsg(`${detail} — El cobro no pudo procesarse.`);
      } else if (status === 402) {
        setErrorMsg(`Pago rechazado por Culqi: ${detail}`);
      } else {
        setErrorMsg(`El cobro no pudo procesarse: ${detail}`);
      }
    }
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
        
        {/* Cabecera del Checkout */}
        <DialogHeader className="border-b border-slate-100 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#003087] to-[#0079C1] text-white flex items-center justify-center font-black text-xs shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Smart-Park Checkout</span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Seguro
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500">Pasarelas certificadas • PayPal REST & Culqi PCI-DSS</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total a Pagar</span>
              <div className="flex flex-col items-end leading-none">
                <span className="text-lg font-black text-emerald-600 font-mono">S/ {amountPen.toFixed(2)}</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">≈ ${amountUsd.toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* PANTALLA DE PAGO EXITOSO CON VOUCHER FISCAL */}
        {paymentSuccess ? (
          <div className="py-2 space-y-4 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {paymentSuccess.method?.includes('PayPal') ? '¡Pago Confirmado con PayPal!' : '¡Pago Aprobado con Éxito!'}
              </h3>
              <p className="text-xs text-slate-500">Tu transacción fue autorizada y liquidada satisfactoriamente.</p>
            </div>

            {/* Voucher Oficial */}
            <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-xl space-y-3 font-mono border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">SMART PARK PERÚ S.A.C.</span>
                  <span className="text-[9px] text-slate-400">
                    RUC: 20608912341 • BOLETA {paymentSuccess.invoiceNumber || 'B001-000001'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  ✓ LIQUIDADO
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
                  <span className="text-white font-bold">{paymentSuccess.method}</span>
                </div>
                {paymentSuccess.payer_email && (
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">Titular / Email:</span>
                    <span className="text-slate-200">{paymentSuccess.payer_name || paymentSuccess.payer_email}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">ID de Cargo / Transacción:</span>
                  <span className="text-slate-400 text-[10px] break-all">{paymentSuccess.chargeId || paymentSuccess.capture_id || paymentSuccess.order_id}</span>
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

              <div className="border-t border-slate-800 pt-2.5 flex justify-between items-baseline">
                <span className="font-sans text-slate-400 text-xs">Monto Total Liquidado:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400 font-mono block">S/ {Number(paymentSuccess.amount).toFixed(2)} PEN</span>
                  {paymentSuccess.amount_usd && (
                    <span className="text-[10px] text-slate-400 font-mono">(${Number(paymentSuccess.amount_usd).toFixed(2)} USD)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 py-3 text-xs font-bold gap-1.5 rounded-2xl border-slate-300 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0 text-slate-600" />
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
          <div className="space-y-4 my-1">
            
            {/* Selector de Métodos de Pago */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              
              {/* TAB 1: PAYPAL */}
              <button
                type="button"
                onClick={() => { setActiveMethod('paypal'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'paypal' ? 'bg-[#003087] text-white shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center font-black text-[10px]">
                  🅿️
                </div>
                <span>PayPal</span>
              </button>

              {/* TAB 2: TARJETA CULQI */}
              <button
                type="button"
                onClick={() => { setActiveMethod('card'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Tarjeta</span>
              </button>

              {/* TAB 3: YAPE */}
              <button
                type="button"
                onClick={() => { setActiveMethod('yape'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'yape' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0 text-purple-600" />
                <span>Yape</span>
              </button>

              {/* TAB 4: PLIN */}
              <button
                type="button"
                onClick={() => { setActiveMethod('plin'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'plin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 shrink-0 text-sky-600" />
                <span>Plin</span>
              </button>

              {/* TAB 5: CIP */}
              <button
                type="button"
                onClick={() => { setActiveMethod('pagoefectivo'); setErrorMsg(''); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMethod === 'pagoefectivo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Agentes</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. MÉTODO: PAYPAL (SMART BUTTONS & BACKEND CAPTURE) */}
            {activeMethod === 'paypal' && (
              <div className="space-y-4">
                
                {/* Banner Oficial PayPal */}
                <div className="bg-gradient-to-br from-[#00246B] via-[#003087] to-[#0079C1] p-4 rounded-3xl text-white shadow-md space-y-2 border border-blue-400/30 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-white text-[#003087] font-black flex items-center justify-center text-xs shadow-xs">
                        PP
                      </div>
                      <div>
                        <span className="text-xs font-black tracking-wide block">PayPal Checkout Express</span>
                        <span className="text-[10px] text-blue-200 font-mono">Sandbox Testbed Habilitado</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-mono">
                      SANDBOX
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-xs font-mono">
                    <span className="text-blue-100 font-sans text-[11px]">Conversión oficial PayPal:</span>
                    <div className="text-right">
                      <strong className="text-white text-sm">S/ {amountPen.toFixed(2)} PEN</strong>
                      <span className="text-amber-300 font-bold ml-1.5">≈ ${amountUsd.toFixed(2)} USD</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-blue-200 italic leading-tight">
                    * PayPal procesa en USD (tipo de cambio referencial 1 PEN = ${PAYPAL_EXCHANGE_RATE.toFixed(2)} USD).
                  </p>
                </div>

                {/* Contenedor de Botones de PayPal */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Selecciona tu forma de pago con PayPal:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Popup seguro oficial</span>
                  </div>

                  {paypalSdkLoading && (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Cargando pasarela oficial de PayPal...</p>
                    </div>
                  )}

                  {paypalSdkError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                      <span className="font-bold block">Aviso de conexión PayPal:</span>
                      <span>{paypalSdkError}</span>
                    </div>
                  )}

                  {/* Smart Buttons Container */}
                  <div 
                    id="paypal-button-container" 
                    ref={paypalContainerRef}
                    className="min-h-[90px] w-full"
                  />

                  {isProcessing && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-center gap-2 animate-pulse font-bold">
                      <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-700" />
                      <span>{processingStep || 'Procesando con PayPal...'}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-700 block uppercase font-mono">Credenciales Sandbox Aplicadas:</span>
                    <div className="text-[10px] font-mono text-slate-500 break-all">
                      <span>Client ID: </span>
                      <strong className="text-slate-800">{PAYPAL_CLIENT_ID.slice(0, 16)}...{PAYPAL_CLIENT_ID.slice(-8)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. MÉTODO: TARJETA CULQI */}
            {activeMethod === 'card' && (
              <div className="space-y-3.5">
                <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-2xl text-white shadow-lg space-y-3 border border-slate-700 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold">SMART-PARK CULQI PAY</span>
                    <span className="text-xs font-black tracking-wider bg-white/10 px-2 py-0.5 rounded">
                      {getCardBrand(cardNumber)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-5 shrink-0 rounded bg-amber-400/80 border border-amber-300 flex items-center justify-center">
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

                <form onSubmit={handleProcessCulqiCard} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Número de Tarjeta *</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 shrink-0 absolute left-3 top-3 text-slate-400" />
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
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCVV ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
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

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl cursor-pointer shadow-md gap-2 mt-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                        <span>{processingStep}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 shrink-0 text-emerald-200" />
                        <span>Pagar S/ {amountPen.toFixed(2)} con Tarjeta</span>
                        <ArrowRight className="w-4 h-4 shrink-0 text-emerald-200" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* 3. MÉTODO: YAPE */}
            {activeMethod === 'yape' && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950">Pago con Yape QR</span>
                    <span className="text-[10px] font-mono font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">Billetera Digital</span>
                  </div>
                  <p className="text-xs text-slate-600">Escanea o usa tu código de aprobación de Yape para pagar.</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-bold text-purple-900 block mb-1">Número de Celular Yape</label>
                      <Input type="tel" value={yapePhone} onChange={(e) => setYapePhone(e.target.value)} className="font-mono font-bold text-xs h-10 bg-white border-purple-300" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-purple-900 block mb-1">Código de Aprobación (6 dígitos)</label>
                      <Input type="text" maxLength={6} placeholder="123456" value={yapeOtp} onChange={(e) => setYapeOtp(e.target.value.replace(/\D/g, ''))} className="font-mono font-black text-center text-base tracking-widest h-11 bg-white border-purple-300" />
                    </div>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={() => {
                    setErrorMsg('Para pagos en vivo con billeteras usa PayPal o Tarjeta. La integración bancaria BCP Yape requiere terminal POS.');
                  }} 
                  className="w-full py-4 text-xs font-black bg-purple-700 hover:bg-purple-600 text-white rounded-2xl cursor-pointer shadow-md gap-2"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Validar Yape S/ {amountPen.toFixed(2)}</span>
                </Button>
              </div>
            )}

            {/* 4. MÉTODO: PLIN */}
            {activeMethod === 'plin' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-3xl bg-sky-50/70 border border-sky-200 space-y-3">
                  <h4 className="text-xs font-black text-sky-950">Plin Interoperable</h4>
                  <p className="text-xs text-slate-600">Escanea desde BBVA, Interbank o Scotiabank.</p>
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border-2 border-sky-300 shadow-md flex items-center justify-center relative">
                    <QrCode className="w-28 h-28 text-slate-800" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 shrink-0 bg-sky-600 text-white font-black text-[10px] rounded-lg flex items-center justify-center shadow">PLIN</div>
                    </div>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setErrorMsg('Usa la pasarela de PayPal o Tarjeta para procesar cobros digitales instantáneos.')}
                  className="w-full py-4 text-xs font-black bg-sky-600 hover:bg-sky-500 text-white rounded-2xl cursor-pointer shadow-md gap-2"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Confirmar Recepción Plin</span>
                </Button>
              </div>
            )}

            {/* 5. MÉTODO: PAGOEFECTIVO CIP */}
            {activeMethod === 'pagoefectivo' && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-950">PagoEfectivo CIP</span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono">Agentes y Bodegas</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Paga en efectivo en cualquier agente KasNet, BCP o Western Union indicando este código:</p>
                  <div className="bg-white p-3.5 rounded-2xl border border-amber-300 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Código CIP Generado</span>
                      <span className="text-lg font-black text-slate-900 tracking-wider">{cipCode}</span>
                    </div>
                    <button type="button" onClick={handleCopyCIP} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition">
                      {copiedCIP ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <Copy className="w-4 h-4 shrink-0" />}
                      <span>{copiedCIP ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer de Seguridad */}
            <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Transacciones protegidas con PayPal REST API & Culqi PCI-DSS • Encriptación TLS 1.3</span>
            </div>

          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};