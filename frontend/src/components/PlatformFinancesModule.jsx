import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  DollarSign, 
  Percent, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  Send, 
  CreditCard, 
  Wallet, 
  Receipt,
  Search,
  Filter,
  Check,
  TrendingUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';

export const PlatformFinancesModule = () => {
  const { establishments } = useEstablishments();

  // Datos iniciales de liquidaciones por cochera afiliada
  const [payouts, setPayouts] = useState([
    {
      id: 'PAY-2026-0801',
      parkingId: 'EST-01',
      parkingName: 'Smart Park Plaza Mayor - Planta Baja',
      owner: 'Inversiones Huamanga S.A.C.',
      ruc: '20608941231',
      bank: 'BCP',
      accountNumber: '191-9482910-0-12',
      cci: '00219100948291001254',
      totalRevenue: 14850.00,
      commissionRate: 12,
      platformFee: 1782.00,
      netPayout: 13068.00,
      status: 'PENDING', // 'PENDING' | 'COMPLETED' | 'PROCESSING'
      period: '1 al 15 de Agosto 2026',
      processedAt: null
    },
    {
      id: 'PAY-2026-0802',
      parkingId: 'EST-02',
      parkingName: 'Smart Park Plaza Mayor - Sótano 1',
      owner: 'Estacionamientos del Centro E.I.R.L.',
      ruc: '20489102844',
      bank: 'BBVA Continental',
      accountNumber: '0011-0284-0100049281',
      cci: '01128400010004928190',
      totalRevenue: 9600.00,
      commissionRate: 10,
      platformFee: 960.00,
      netPayout: 8640.00,
      status: 'COMPLETED',
      period: '1 al 15 de Agosto 2026',
      processedAt: '2026-08-16 10:30'
    },
    {
      id: 'PAY-2026-0803',
      parkingId: 'EST-03',
      parkingName: 'Smart Park Mercado Mariscal Cáceres',
      owner: 'Consorcio Comercial Ayacucho',
      ruc: '20194820193',
      bank: 'Interbank',
      accountNumber: '200-3004918291',
      cci: '00320000300491829188',
      totalRevenue: 12400.00,
      commissionRate: 12,
      platformFee: 1488.00,
      netPayout: 10912.00,
      status: 'PENDING',
      period: '1 al 15 de Agosto 2026',
      processedAt: null
    },
    {
      id: 'PAY-2026-0804',
      parkingId: 'EST-04',
      parkingName: 'Smart Park Terminal Terrestre',
      owner: 'Transportes & Servicios Libertadores S.A.',
      ruc: '20593810291',
      bank: 'Scotiabank',
      accountNumber: '000-4829104',
      cci: '00900000048291049210',
      totalRevenue: 18900.00,
      commissionRate: 10,
      platformFee: 1890.00,
      netPayout: 17010.00,
      status: 'COMPLETED',
      period: '1 al 15 de Agosto 2026',
      processedAt: '2026-08-16 11:15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Cálculos consolidados para el Dueño del Sistema
  const grossNetworkRevenue = payouts.reduce((acc, p) => acc + p.totalRevenue, 0);
  const totalPlatformEarnings = payouts.reduce((acc, p) => acc + p.platformFee, 0);
  const pendingPayoutsAmount = payouts
    .filter(p => p.status === 'PENDING')
    .reduce((acc, p) => acc + p.netPayout, 0);
  const disbursedPayoutsAmount = payouts
    .filter(p => p.status === 'COMPLETED')
    .reduce((acc, p) => acc + p.netPayout, 0);

  // Ejecutar liquidación a la cochera
  const handleConfirmPayout = () => {
    if (!selectedPayout) return;

    const updated = payouts.map(p => {
      if (p.id === selectedPayout.id) {
        return {
          ...p,
          status: 'COMPLETED',
          processedAt: new Date().toLocaleString()
        };
      }
      return p;
    });

    setPayouts(updated);
    setShowPayoutModal(false);
    
    // Generar recibo
    setReceiptData({
      ...selectedPayout,
      status: 'COMPLETED',
      processedAt: new Date().toLocaleString(),
      operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`
    });
    setShowReceiptModal(true);
    notify(`Liquidación de S/ ${selectedPayout.netPayout.toFixed(2)} transferida exitosamente a ${selectedPayout.parkingName}.`);
  };

  // Exportar reporte contable a CSV
  const handleExportCSV = () => {
    const headers = 'ID,Cochera,RUC,Banco,Cuenta,Total_Recaudado,Comision_SmartPark_Porcentaje,Comision_Plataforma_Soles,Neto_Transferido_Cochera,Estado,Periodo\n';
    const rows = payouts.map(p => 
      `"${p.id}","${p.parkingName}","${p.ruc}","${p.bank}","${p.accountNumber}",${p.totalRevenue},${p.commissionRate}%,${p.platformFee},${p.netPayout},"${p.status}","${p.period}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smart_park_liquidaciones_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Reporte financiero exportado exitosamente en formato CSV para contabilidad.');
  };

  const filteredPayouts = payouts.filter(p => {
    const matchesSearch = 
      p.parkingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ruc.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Finanzas, Comisiones & Liquidaciones a Cocheras
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de comisiones de la plataforma Smart-Park y dispersión bancaria quincenal a propietarios afiliados.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="text-xs font-bold gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-2xl shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar para Contabilidad (CSV)</span>
          </Button>
        </div>
      </div>

      {/* KPIs Financieros Consolidados de la Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudación Bruta Red */}
        <Card className="p-5 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Recaudación Bruta Red</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              S/ {grossNetworkRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Volumen total procesado en el periodo</p>
          </div>
        </Card>

        {/* Ganancia Neta Smart-Park (Comisiones) */}
        <Card className="p-5 border-emerald-200 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Comisión Smart-Park (Neto)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shadow-xs">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              S/ {totalPlatformEarnings.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-emerald-800/80 font-medium mt-0.5">Ganancia líquida de la plataforma</p>
          </div>
        </Card>

        {/* Saldo Pendiente por Liquidar */}
        <Card className="p-5 border-amber-200 rounded-3xl bg-amber-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">Por Transferir a Cocheras</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-900 font-mono tracking-tight">
              S/ {pendingPayoutsAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">Liquidaciones listas para desembolso</p>
          </div>
        </Card>

        {/* Desembolsado a Cocheras */}
        <Card className="p-5 border-slate-200/90 rounded-3xl bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Liquidado & Transferido</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              S/ {disbursedPayoutsAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Transferido a cuentas bancarias</p>
          </div>
        </Card>
      </div>

      {/* Controles de Búsqueda y Filtros de Liquidación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar cochera, RUC o razón social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas las Sedes' : st === 'PENDING' ? 'Pendientes de Pago' : 'Liquidadas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Liquidaciones a Cocheras */}
      <Card className="rounded-3xl border-slate-200 shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 font-tech">
                <th className="py-3.5 px-4">Establecimiento & Razón Social</th>
                <th className="py-3.5 px-4">Datos Bancarios</th>
                <th className="py-3.5 px-4 text-right">Recaudado</th>
                <th className="py-3.5 px-4 text-right">Comisión Smart-Park</th>
                <th className="py-3.5 px-4 text-right">Neto a Transferir</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPayouts.map((p) => {
                const isPending = p.status === 'PENDING';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    {/* Cochera */}
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900">{p.parkingName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{p.owner} • RUC: <span className="font-mono">{p.ruc}</span></div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {p.id}</div>
                    </td>

                    {/* Banco */}
                    <td className="py-4 px-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-800">{p.bank}</div>
                      <div className="text-slate-500 text-[10px]">Cta: {p.accountNumber}</div>
                      <div className="text-slate-400 text-[9px]">CCI: {p.cci}</div>
                    </td>

                    {/* Total Recaudado */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      S/ {p.totalRevenue.toFixed(2)}
                    </td>

                    {/* Comisión Smart-Park */}
                    <td className="py-4 px-4 text-right font-mono">
                      <div className="font-bold text-emerald-700">S/ {p.platformFee.toFixed(2)}</div>
                      <div className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                        {p.commissionRate}%
                      </div>
                    </td>

                    {/* Neto Cochera */}
                    <td className="py-4 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      S/ {p.netPayout.toFixed(2)}
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span>{isPending ? 'Por Liquidar' : 'Transferido'}</span>
                      </span>
                      {p.processedAt && (
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{p.processedAt}</div>
                      )}
                    </td>

                    {/* Botón de Acción */}
                    <td className="py-4 px-4 text-center">
                      {isPending ? (
                        <Button
                          onClick={() => {
                            setSelectedPayout(p);
                            setShowPayoutModal(true);
                          }}
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs gap-1"
                        >
                          <Send className="w-3 h-3 text-emerald-400" />
                          <span>Liquidar Fondos</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setReceiptData({
                              ...p,
                              operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`
                            });
                            setShowReceiptModal(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-xl gap-1"
                        >
                          <Receipt className="w-3 h-3 text-slate-500" />
                          <span>Comprobante</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL DE CONFIRMACIÓN DE LIQUIDACIÓN */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Emitir Liquidación Bancaria</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirmación de dispersión de fondos a la cuenta bancaria de la cochera.
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 my-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Establecimiento:</span>
                  <strong className="text-slate-900">{selectedPayout.parkingName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Titular / RUC:</span>
                  <span className="font-mono text-slate-800">{selectedPayout.owner} ({selectedPayout.ruc})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Banco & Cuenta:</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedPayout.bank} • {selectedPayout.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">CCI Interbancario:</span>
                  <span className="font-mono text-slate-600 text-[11px]">{selectedPayout.cci}</span>
                </div>
              </div>

              {/* Desglose Monetario */}
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Recaudación Bruta del Periodo:</span>
                  <span>S/ {selectedPayout.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Retención Comisión Smart-Park ({selectedPayout.commissionRate}%):</span>
                  <span>- S/ {selectedPayout.platformFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-emerald-200/80 pt-2 flex justify-between text-sm font-black text-slate-900">
                  <span>MONTO NETO A TRANSFERIR:</span>
                  <span className="text-emerald-700 text-base">S/ {selectedPayout.netPayout.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayout}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar y Transferir</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE COMPROBANTE / VOUCHER DE LIQUIDACIÓN */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center flex items-center justify-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Comprobante de Liquidación</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              Constancia oficial de dispersión de fondos de la plataforma Smart-Park.
            </DialogDescription>
          </DialogHeader>

          {receiptData && (
            <div className="space-y-4 my-2">
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 text-xs font-mono">
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="font-extrabold text-sm text-slate-900 font-sans">SMART-PARK ENTERPRISE</div>
                  <div className="text-[10px] text-slate-400">RUC: 20719284019 • Ayacucho, Perú</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-1">{receiptData.operationNumber}</div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destinatario:</span>
                    <strong className="text-slate-900">{receiptData.parkingName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">RUC Titular:</span>
                    <span className="text-slate-800">{receiptData.ruc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banco:</span>
                    <span className="text-slate-800 font-bold">{receiptData.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha de Proceso:</span>
                    <span className="text-slate-800">{receiptData.processedAt || '2026-08-18'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Recaudación Total:</span>
                    <span>S/ {receiptData.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Comisión Smart-Park ({receiptData.commissionRate}%):</span>
                    <span>S/ {receiptData.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-100 pt-1">
                    <span>TOTAL TRANSFERIDO:</span>
                    <span className="text-emerald-600">S/ {receiptData.netPayout.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  window.print();
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 py-4"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir / Descargar Voucher</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
