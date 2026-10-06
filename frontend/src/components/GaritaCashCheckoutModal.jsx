import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Clock,
  Car,
  Receipt,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { formatearPlacaConGuion } from '../utils/plateOcr';

export const GaritaCashCheckoutModal = ({
  isOpen,
  onClose,
  stayData,
  onConfirmCheckout,
  loading = false,
  parkingName = 'Cochera Smart Park'
}) => {
  const [method, setMethod] = useState('efectivo'); // 'efectivo' | 'yape' | 'pos'
  const [cashTendered, setCashTendered] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Cálculos de liquidación en tiempo real
  const metrics = useMemo(() => {
    if (!stayData) {
      return { mins: 0, hours: 1, rate: 5, totalCost: 5, alreadyPaid: 0, outstanding: 5 };
    }

    const entry = new Date(
      stayData.actual_entry ||
      stayData.actualEntry ||
      stayData.startTime ||
      stayData.entryTime ||
      Date.now()
    ).getTime();

    const now = Date.now();
    const diffMins = Math.max(1, Math.round((now - entry) / 60000));
    const billedHours = Math.max(1, Math.ceil(diffMins / 60));
    const rate = Number(stayData.rate || stayData.ratePerHour || 5.0);
    const billingUnit = String(stayData.billing_unit || stayData.billingUnit || 'hour').toLowerCase();

    const serverCost = Number(stayData.totalCost ?? stayData.total_cost ?? 0);
    let calculatedCost = 0;
    if (serverCost > 0) {
      calculatedCost = serverCost;
    } else if (billingUnit === 'minute') {
      const minRate = Number(stayData.minute_rate || stayData.minuteRate || (rate / 60) || 0.10);
      calculatedCost = Number((diffMins * minRate).toFixed(2));
    } else {
      calculatedCost = Number((billedHours * rate).toFixed(2));
    }

    const alreadyPaid = Number(stayData.amountPaid || stayData.amount_paid || 0);
    const outstanding = Math.max(0, Number((calculatedCost - alreadyPaid).toFixed(2)));

    return {
      mins: diffMins,
      hours: billedHours,
      rate,
      totalCost: calculatedCost,
      alreadyPaid,
      outstanding
    };
  }, [stayData]);

  // Al abrir o cambiar de estadía, inicializar el monto en efectivo sugerido
  useEffect(() => {
    if (isOpen && stayData) {
      setCheckoutComplete(false);
      setReceiptData(null);
      setErrorMsg('');
      setReferenceCode('');
      setMethod('efectivo');
      setCashTendered(metrics.outstanding > 0 ? String(metrics.outstanding) : '0');
    }
  }, [isOpen, stayData, metrics.outstanding]);

  const cashNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, Number((cashNum - metrics.outstanding).toFixed(2)));
  const isCashInsufficient = method === 'efectivo' && metrics.outstanding > 0 && cashNum < (metrics.outstanding - 0.01);

  const handleQuickCash = (amount) => {
    setCashTendered(String(amount));
  };

  const handleAddBill = (val) => {
    const current = Number(cashTendered) || 0;
    setCashTendered(String(current + val));
  };

  const handleSubmit = async () => {
    if (isCashInsufficient) {
      setErrorMsg(`El efectivo ingresado (S/ ${cashNum.toFixed(2)}) no cubre el total de S/ ${metrics.outstanding.toFixed(2)}.`);
      return;
    }

    setErrorMsg('');
    try {
      const result = await onConfirmCheckout({
        payment_method: method,
        amount_paid: metrics.outstanding,
        cash_tendered: method === 'efectivo' ? cashNum : metrics.outstanding,
        change_returned: method === 'efectivo' ? changeDue : 0,
        reference_code: referenceCode.trim() || undefined
      });

      if (result?.ok) {
        setReceiptData({
          ticketCode: stayData.code || stayData.ticketNumber || `TKT-${stayData.id}`,
          plate: stayData.plate,
          slot: stayData.slot,
          driverName: stayData.driverName || stayData.customerName || 'Cliente Garita',
          entryTime: stayData.actual_entry || stayData.actualEntry || stayData.entryTime || stayData.startTime,
          exitTime: new Date().toISOString(),
          durationMins: metrics.mins,
          durationHours: metrics.hours,
          ratePerHour: metrics.rate,
          totalCharged: metrics.totalCost,
          alreadyPaid: metrics.alreadyPaid,
          collectedNow: metrics.outstanding,
          cashTendered: method === 'efectivo' ? cashNum : metrics.outstanding,
          changeDue: method === 'efectivo' ? changeDue : 0,
          paymentMethod: method,
          reference: referenceCode.trim() || null,
          parkingName: parkingName || stayData.parkingName || 'Cochera Smart Park'
        });
        setCheckoutComplete(true);
      } else {
        setErrorMsg(result?.message || 'Error al procesar la salida en el servidor.');
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al procesar la salida.');
    }
  };

  const handleExonerate = async () => {
    if (!window.confirm(`¿Exonerar cobro y registrar la salida autorizada para el vehículo ${stayData.plate}?`)) return;
    setErrorMsg('');
    try {
      const result = await onConfirmCheckout({
        payment_method: 'cortesia',
        amount_paid: 0,
        force_unpaid: true,
        reference_code: 'EXONERADO'
      });

      if (result?.ok) {
        setReceiptData({
          ticketCode: stayData.code || stayData.ticketNumber || `TKT-${stayData.id}`,
          plate: stayData.plate,
          slot: stayData.slot,
          driverName: stayData.driverName || stayData.customerName || 'Cliente Garita',
          entryTime: stayData.actual_entry || stayData.actualEntry || stayData.entryTime || stayData.startTime,
          exitTime: new Date().toISOString(),
          durationMins: metrics.mins,
          durationHours: metrics.hours,
          ratePerHour: metrics.rate,
          totalCharged: 0,
          alreadyPaid: 0,
          collectedNow: 0,
          cashTendered: 0,
          changeDue: 0,
          paymentMethod: 'cortesia (exonerado)',
          reference: 'EXONERADO',
          parkingName: parkingName || stayData.parkingName || 'Cochera Smart Park'
        });
        setCheckoutComplete(true);
      } else {
        setErrorMsg(result?.message || 'Error al procesar la salida exonerada.');
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al procesar la salida.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!stayData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-md sm:max-w-lg w-[95vw] p-0 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        
        {/* Estilo para impresión limpia de ticket térmico 80mm/58mm */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            #thermal-receipt-ticket, #thermal-receipt-ticket * { visibility: visible !important; }
            #thermal-receipt-ticket {
              position: fixed !important;
              left: 0;
              top: 0;
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 4mm !important;
              font-family: monospace !important;
              font-size: 11px !important;
              color: #000 !important;
              background: #fff !important;
            }
          }
        `}} />

        {/* ── Vista 1: Formulario de Cobro en Garita ── */}
        {!checkoutComplete ? (
          <div className="flex flex-col">
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Caja Garita • Cobro de Salida
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {parkingName}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              
              {/* Tarjeta de Resumen del Vehículo y Tiempo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-mono font-black text-sm tracking-wider shadow-xs">
                      {formatearPlacaConGuion(stayData.plate)}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Cajón <span className="font-mono font-black text-slate-900 dark:text-white">{stayData.slot}</span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                    {stayData.driverName || stayData.customerName || 'Cliente Garita'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tiempo</span>
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white mt-0.5 block">
                      {Math.floor(metrics.mins / 60)}h {String(metrics.mins % 60).padStart(2, '0')}m
                    </span>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tarifa</span>
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white mt-0.5 block">
                      S/ {metrics.rate.toFixed(2)}/h
                    </span>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Facturable</span>
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white mt-0.5 block">
                      {metrics.hours} {metrics.hours === 1 ? 'hora' : 'horas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel de Liquidación Financiera */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
                  <span>Total estadía acumulada:</span>
                  <span className="font-mono font-bold">S/ {metrics.totalCost.toFixed(2)}</span>
                </div>

                {metrics.alreadyPaid > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Abono / prepago previo:</span>
                    <span className="font-mono font-bold">- S/ {metrics.alreadyPaid.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      Saldo a Liquidar
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {metrics.outstanding === 0 ? '100% Pagado previamente' : 'Obligatorio para habilitar salida'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-2xl text-amber-600 dark:text-amber-400">
                    S/ {metrics.outstanding.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Selección de Método de Cobro */}
              {metrics.outstanding > 0 ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Forma de Cobro en Garita
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('efectivo')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        method === 'efectivo'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs font-bold">Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod('yape')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        method === 'yape'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-5 h-5" />
                      <span className="text-xs font-bold">Yape / Plin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod('pos')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        method === 'pos'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs font-bold">POS / Tarjeta</span>
                    </button>
                  </div>

                  {/* Detalle interactivo según método */}
                  {method === 'efectivo' && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Paga con efectivo (S/)
                          </label>
                          <span className="text-[11px] font-mono text-slate-500">
                            Exacto: S/ {metrics.outstanding.toFixed(2)}
                          </span>
                        </div>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="Monto entregado"
                          className="font-mono font-bold text-base h-11 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />
                      </div>

                      {/* Botones rápidos de billetes comunes */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickCash(metrics.outstanding)}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 cursor-pointer"
                        >
                          Exacto
                        </button>
                        {[10, 20, 50, 100].map(bill => (
                          <button
                            key={bill}
                            type="button"
                            onClick={() => handleQuickCash(bill)}
                            className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 cursor-pointer"
                          >
                            S/ {bill}
                          </button>
                        ))}
                      </div>

                      {/* Cálculo de vuelto en tiempo real */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {isCashInsufficient ? 'Monto insuficiente:' : 'Vuelto a devolver:'}
                        </span>
                        {isCashInsufficient ? (
                          <span className="text-xs font-mono font-black text-rose-500">
                            Faltan S/ {(metrics.outstanding - cashNum).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                            S/ {changeDue.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {method === 'yape' && (
                    <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-2 text-xs text-purple-900 dark:text-purple-300">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                        Muestra el QR de Yape/Plin de la cochera al cliente.
                      </p>
                      <Input
                        type="text"
                        placeholder="N° de Operación o celular (opcional)"
                        value={referenceCode}
                        onChange={(e) => setReferenceCode(e.target.value)}
                        className="bg-white dark:bg-slate-900 text-xs h-10 border-purple-200 dark:border-purple-800"
                      />
                    </div>
                  )}

                  {method === 'pos' && (
                    <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 space-y-2 text-xs text-blue-900 dark:text-blue-300">
                      <p className="font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                        Procesa la tarjeta en el POS físico de la garita.
                      </p>
                      <Input
                        type="text"
                        placeholder="N° de Referencia / Lote POS (opcional)"
                        value={referenceCode}
                        onChange={(e) => setReferenceCode(e.target.value)}
                        className="bg-white dark:bg-slate-900 text-xs h-10 border-blue-200 dark:border-blue-800"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      Estadía ya pagada al 100%
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      El conductor ya liquidó su estancia en línea. No se requiere cobro adicional.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={onClose}
                  className="flex-1 rounded-2xl text-xs font-bold h-11 border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  disabled={loading || isCashInsufficient}
                  onClick={handleSubmit}
                  className="flex-[2] rounded-2xl text-xs font-black h-11 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando salida...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {metrics.outstanding > 0
                          ? `Cobrar S/ ${metrics.outstanding.toFixed(2)} y Dar Salida`
                          : 'Confirmar Salida y Liberar Cajón'}
                      </span>
                    </>
                  )}
                </Button>
              </div>

              {metrics.outstanding > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleExonerate}
                  className="text-center text-[11px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-1 cursor-pointer font-medium underline underline-offset-2"
                >
                  Exonerar pago / Salida libre autorizada (Cortesía o Prueba)
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Vista 2: Ticket de Salida Impreso (Thermal Receipt) ── */
          <div className="flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                    Salida y Cobro Registrados
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Cajón {receiptData?.slot} liberado. Comprobante listo.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Contenedor del Comprobante Térmico */}
              <div
                id="thermal-receipt-ticket"
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3"
              >
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <h4 className="font-black text-sm tracking-tight uppercase">
                    {receiptData?.parkingName}
                  </h4>
                  <p className="text-[10px] text-slate-500">CONTROL DE GARITA · SMART PARK</p>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    TICKET DE SALIDA: {receiptData?.ticketCode}
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Placa:</span>
                    <span className="font-black">{formatearPlacaConGuion(receiptData?.plate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cajón:</span>
                    <span className="font-bold">{receiptData?.slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conductor:</span>
                    <span className="truncate max-w-[170px]">{receiptData?.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entrada:</span>
                    <span>{new Date(receiptData?.entryTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Salida:</span>
                    <span>{new Date(receiptData?.exitTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tiempo Total:</span>
                    <span className="font-bold">{Math.floor(receiptData?.durationMins / 60)}h {String(receiptData?.durationMins % 60).padStart(2, '0')}m</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total liquidado:</span>
                    <span>S/ {receiptData?.totalCharged?.toFixed(2)}</span>
                  </div>
                  {receiptData?.alreadyPaid > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Pagado online prev.:</span>
                      <span>S/ {receiptData?.alreadyPaid?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Cobrado en garita:</span>
                    <span>S/ {receiptData?.collectedNow?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Método de pago:</span>
                    <span className="uppercase">{receiptData?.paymentMethod}</span>
                  </div>
                  {receiptData?.paymentMethod === 'efectivo' && receiptData?.collectedNow > 0 && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Entregó efectivo:</span>
                        <span>S/ {receiptData?.cashTendered?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600 text-[10px]">
                        <span>Vuelto entregado:</span>
                        <span>S/ {receiptData?.changeDue?.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-center text-[10px] text-slate-500">
                  ¡Gracias por su preferencia! · Buen viaje
                </div>
              </div>

              {/* Botones de Acción Posterior */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1 rounded-2xl h-11 text-xs font-bold gap-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Imprimir Ticket</span>
                </Button>

                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl h-11 text-xs font-black bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white cursor-pointer"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
