import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  DollarSign,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  Download,
  Receipt,
  Search,
  Check,
  TrendingUp,
  ShieldCheck,
  Send,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Helpers
const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// RUC ficticio determinístico por parking_id (honesto: bancarios aún sin tabla)
const fakeRUC = (parkingId) => `20${String(100000000 + Number(parkingId) * 137 % 900000000).padStart(9, '0')}`.slice(0, 11);
const fakeCCI = (parkingId) => `00219100${String(parkingId).padStart(4, '0')}9482910012${String(parkingId).padStart(2, '0')}`;

export const PlatformFinancesModule = () => {
  const { role } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [toast, setToast] = useState(null);
  // Liquidaciones locales (sin persistencia): solo registro contable en memoria
  const [localSettled, setLocalSettled] = useState(() => new Set());

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSummary = async () => {
    if (role !== 'platform') return;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const res = await api.get('/finances/summary');
      setSummary(res.data);
    } catch (err) {
      const status = err?.response?.status;
      setErrorStatus(status || null);
      if (status === 401) setError('No autenticado. Inicia sesión como Super Admin (platform).');
      else if (status === 403) setError('Acceso denegado: solo el rol platform puede ver finanzas.');
      else setError(err?.response?.data?.detail || err.message || 'No se pudo cargar el resumen financiero.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Derivar filas de tabla a partir de summary.por_sede
  const payouts = useMemo(() => {
    if (!summary?.por_sede) return [];
    return summary.por_sede.map((s) => {
      const isLocalSettled = localSettled.has(s.parking_id);
      // Estado contable: si no hay recaudación -> sin movimientos; si hay y está marcado local -> COMPLETED
      const hasMovement = Number(s.recaudacion_bruta) > 0;
      const status = !hasMovement ? 'EMPTY' : isLocalSettled ? 'COMPLETED' : 'PENDING';
      return {
        id: `PAY-${s.parking_id}-${String(s.parking_name).slice(0, 8)}`,
        parkingId: s.parking_id,
        parkingName: s.parking_name,
        owner: s.parking_name,
        ruc: fakeRUC(s.parking_id),
        bank: 'Pendiente de completar',
        accountNumber: '—',
        cci: fakeCCI(s.parking_id),
        totalRevenue: Number(s.recaudacion_bruta || 0),
        commissionRate: 12,
        platformFee: Number(s.comision_12 || 0),
        netPayout: Number(s.neto_a_liquidar || 0),
        status,
        period: summary?.nota ? 'Periodo acumulado (todas las reservas no canceladas)' : '—',
        processedAt: isLocalSettled ? new Date().toLocaleString('es-PE') : null,
        totalReservas: s.total_reservas,
        reservasCompleted: s.reservas_completed,
        recaudacionCompleted: s.recaudacion_completed,
        bancoEstado: s.banco_estado,
      };
    });
  }, [summary, localSettled]);

  const totales = summary?.totales || {
    recaudacion_bruta_global: 0,
    comision_liquida_global: 0,
    a_liquidar_global: 0,
    liquidados_global: 0,
    total_reservas_global: 0,
  };

  // KPIs reales
  const grossNetworkRevenue = Number(totales.recaudacion_bruta_global || 0);
  const totalPlatformEarnings = Number(totales.comision_liquida_global || 0);
  // Por transferir = neto global menos lo marcado localmente como liquidado (honesto: si no hay persistencia, es estimado)
  const localSettledNet = payouts.filter((p) => p.status === 'COMPLETED').reduce((acc, p) => acc + p.netPayout, 0);
  const pendingPayoutsAmount = Math.max(0, Number(totales.a_liquidar_global || 0) - localSettledNet);
  const disbursedPayoutsAmount = localSettledNet;

  const handleConfirmPayout = () => {
    if (!selectedPayout) return;
    // No hay backend de liquidaciones persistente: registro contable local honesto
    setLocalSettled((prev) => {
      const next = new Set(prev);
      next.add(selectedPayout.parkingId);
      return next;
    });
    setShowPayoutModal(false);
    setReceiptData({
      ...selectedPayout,
      status: 'COMPLETED',
      processedAt: new Date().toLocaleString('es-PE'),
      operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setShowReceiptModal(true);
    notify(
      `Registro contable — la transferencia se gestiona fuera de la plataforma; ${selectedPayout.parkingName} marcado como liquidado localmente (${fmt(selectedPayout.netPayout)}).`
    );
  };

  const handleExportCSV = () => {
    if (!payouts.length) {
      notify('No hay movimientos para exportar.');
      return;
    }
    const headers =
      'ID,Cochera,RUC,Banco,Cuenta,Total_Recaudado,Comision_SmartPark_Porcentaje,Comision_Plataforma_Soles,Neto_Transferido_Cochera,Estado,Periodo,Total_Reservas,Reservas_Completadas\n';
    const rows = payouts
      .map(
        (p) =>
          `"${p.id}","${p.parkingName}","${p.ruc}","${p.bank}","${p.accountNumber}",${p.totalRevenue},${p.commissionRate}%,${p.platformFee},${p.netPayout},"${p.status}","${p.period}",${p.totalReservas},${p.reservasCompleted}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smart_park_liquidaciones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Reporte financiero exportado (datos reales derivados de reservas).');
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesSearch =
      p.parkingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.parkingId).includes(searchTerm) ||
      p.ruc.includes(searchTerm);
    if (statusFilter === 'ALL') return matchesSearch;
    // EMPTY se muestra solo en ALL; en PENDING/COMPLETED se filtra
    if (p.status === 'EMPTY') return false;
    const matchesStatus = statusFilter === p.status;
    return matchesSearch && matchesStatus;
  });

  const hasAnyMovement = payouts.some((p) => p.totalRevenue > 0);

  // Guard: solo platform ve este módulo
  if (role !== 'platform') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-10 text-center border-amber-200 bg-amber-50/60 rounded-3xl">
          <ShieldCheck className="w-8 h-8 mx-auto text-amber-600 mb-2" />
          <p className="text-sm font-black text-slate-800">Acceso restringido</p>
          <p className="text-xs text-slate-600 mt-1">Este módulo es exclusivo del rol <span className="font-mono font-bold">platform</span> (Super Admin). Inicia sesión con superadmin@smartpark.com.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold border border-slate-800 max-w-sm">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
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
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Finanzas, Comisiones & Liquidaciones a Cocheras</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de comisiones de la plataforma Smart-Park y dispersión bancaria quincenal a propietarios afiliados.{' '}
            <span className="text-amber-700 font-bold">Comisión fija 12% • Fuente: reservas reales (canceladas excluidas).</span>
          </p>
          {summary?.nota && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>{summary.nota}</span>
            </p>
          )}
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
          <Button
            onClick={fetchSummary}
            variant="outline"
            className="text-xs font-bold gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-2xl"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-3 text-sm font-bold">Cargando resumen financiero...</span>
        </div>
      ) : error ? (
        <Card className="p-6 border-rose-200 bg-rose-50/60 rounded-3xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
          <div>
            <p className="text-sm font-black text-rose-900">No se pudo cargar finanzas</p>
            <p className="text-xs text-rose-800 mt-1">{error}</p>
            {errorStatus === 401 && <p className="text-[11px] text-slate-500 mt-1">Verifica tu JWT (localStorage smart_park_access_token).</p>}
            {errorStatus === 403 && <p className="text-[11px] text-slate-500 mt-1">Solo platform puede consultar GET /finances/summary.</p>}
            <Button onClick={fetchSummary} size="sm" className="mt-3 rounded-xl text-xs font-bold">
              Reintentar
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs Financieros Reales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-slate-200/90 rounded-3xl bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Recaudación Bruta Red</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{fmt(grossNetworkRevenue)}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {totales.total_reservas_global} reserva(s) no canceladas • {totales.liquidados_count} completadas
                </p>
              </div>
            </Card>

            <Card className="p-5 border-emerald-200 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Comisión Smart-Park (12%)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shadow-xs">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-emerald-700 font-mono tracking-tight">{fmt(totalPlatformEarnings)}</h3>
                <p className="text-[11px] text-emerald-800/80 font-medium mt-0.5">Ganancia líquida de la plataforma</p>
              </div>
            </Card>

            <Card className="p-5 border-amber-200 rounded-3xl bg-amber-50/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">Por Transferir a Cocheras</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-amber-900 font-mono tracking-tight">{fmt(pendingPayoutsAmount)}</h3>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">Liquidaciones listas para desembolso</p>
              </div>
            </Card>

            <Card className="p-5 border-slate-200/90 rounded-3xl bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Liquidado & Transferido</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{fmt(disbursedPayoutsAmount)}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Marcado como liquidado (local, sin persistencia)</p>
              </div>
            </Card>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar cochera, RUC o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'PENDING', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todas las Sedes' : st === 'PENDING' ? 'Pendientes de Pago' : 'Liquidadas (local)'}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <Card className="rounded-3xl border-slate-200 shadow-xs bg-white overflow-hidden">
            {!hasAnyMovement ? (
              <div className="py-16 text-center space-y-2">
                <DollarSign className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Aún no hay movimientos para liquidar.</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No se encontraron reservas no canceladas. Cuando existan reservas (scheduled/active/completed), aquí verás la
                  recaudación por sede, comisión 12% y neto a liquidar.
                </p>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-slate-500">Sin resultados para el filtro actual.</p>
              </div>
            ) : (
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
                      if (p.status === 'EMPTY') return null;
                      const isPending = p.status === 'PENDING';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-4">
                            <div className="font-extrabold text-slate-900">{p.parkingName}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              RUC: <span className="font-mono">{p.ruc}</span> <span className="text-amber-600 font-bold">• pendiente de completar</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Sede #{p.parkingId} • {p.totalReservas} reserva(s) • {p.reservasCompleted} completada(s)
                            </div>
                          </td>

                          <td className="py-4 px-4 font-mono text-[11px]">
                            <div className="font-bold text-amber-700">{p.bank}</div>
                            <div className="text-slate-500 text-[10px]">Cta: {p.accountNumber}</div>
                            <div className="text-slate-400 text-[9px]">CCI: {p.cci}</div>
                            <div className="text-[9px] text-amber-600 font-bold mt-1">RUC/CCI sin tabla — dato ilustrativo</div>
                          </td>

                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">{fmt(p.totalRevenue)}</td>

                          <td className="py-4 px-4 text-right font-mono">
                            <div className="font-bold text-emerald-700">{fmt(p.platformFee)}</div>
                            <div className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                              {p.commissionRate}%
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right font-mono font-black text-slate-900 text-sm">{fmt(p.netPayout)}</td>

                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase ${
                                isPending ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <span>{isPending ? 'Por Liquidar' : 'Transferido (local)'}</span>
                            </span>
                            {p.processedAt && <div className="text-[9px] text-slate-400 font-mono mt-0.5">{p.processedAt}</div>}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {isPending ? (
                              <Button
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setShowPayoutModal(true);
                                }}
                                size="sm"
                                title="Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado"
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
                                    operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
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
            )}
          </Card>
        </>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Emitir Liquidación Bancaria</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado (sin persistencia).
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 my-2">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                <strong>Aviso honesto:</strong> no existe aún tabla de cuentas bancarias (RUC/CCI) ni endpoint de liquidaciones persistente. El
                RUC/CCI mostrado es ficticio. La liquidación real es manual por tesorería.
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Establecimiento:</span>
                  <strong className="text-slate-900">{selectedPayout.parkingName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">RUC (ilustrativo):</span>
                  <span className="font-mono text-slate-800">{selectedPayout.ruc} — pendiente de completar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Banco & Cuenta:</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedPayout.bank} • {selectedPayout.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">CCI (ilustrativo):</span>
                  <span className="font-mono text-slate-600 text-[11px]">{selectedPayout.cci}</span>
                </div>
              </div>

              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Recaudación Bruta ({selectedPayout.totalReservas} reservas):</span>
                  <span>{fmt(selectedPayout.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Retención Comisión Smart-Park ({selectedPayout.commissionRate}%):</span>
                  <span>- {fmt(selectedPayout.platformFee)}</span>
                </div>
                <div className="border-t border-emerald-200/80 pt-2 flex justify-between text-sm font-black text-slate-900">
                  <span>MONTO NETO A TRANSFERIR:</span>
                  <span className="text-emerald-700 text-base">{fmt(selectedPayout.netPayout)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPayoutModal(false)} className="flex-1 rounded-xl text-xs font-bold">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayout}
                  title="Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar como liquidado</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL COMPROBANTE */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center flex items-center justify-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Comprobante de Liquidación</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              Constancia de registro contable — tesorería gestiona la transferencia fuera de plataforma.
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
                    <span className="text-slate-500">RUC (pendiente):</span>
                    <span className="text-slate-800">{receiptData.ruc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banco:</span>
                    <span className="text-slate-800 font-bold">{receiptData.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha:</span>
                    <span className="text-slate-800">{receiptData.processedAt || '—'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Recaudación Total:</span>
                    <span>{fmt(receiptData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Comisión Smart-Park ({receiptData.commissionRate}%):</span>
                    <span>{fmt(receiptData.platformFee)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-100 pt-1">
                    <span>TOTAL REGISTRADO:</span>
                    <span className="text-emerald-600">{fmt(receiptData.netPayout)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => window.print()}
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
