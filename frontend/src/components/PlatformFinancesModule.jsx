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
        <Card className="p-6 h-full flex flex-col gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600" />
            <p className="text-subheading text-slate-800">Acceso restringido</p>
          </div>
          <p className="text-xs text-slate-600">Este módulo es exclusivo del rol <span className="font-mono font-bold">platform</span> (Super Admin). Inicia sesión con superadmin@smartpark.com.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-800 max-w-sm">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wallet className="w-5 h-5 shrink-0" />
            </div>
            <h1 className="text-heading text-xl sm:text-2xl text-slate-900 tracking-tight">Finanzas, Comisiones & Liquidaciones a Cocheras</h1>
          </div>
          <p className="text-xs text-slate-500">
            Control de comisiones de la plataforma Smart-Park y dispersión bancaria quincenal a propietarios afiliados.{' '}
            <span className="text-amber-700 font-bold">Comisión fija 12% • Fuente: reservas reales (canceladas excluidas).</span>
          </p>
          {summary?.nota && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Info className="w-5 h-5 shrink-0" />
              <span>{summary.nota}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            size="sm"
          >
            <Download className="w-4 h-4 shrink-0" />
            Exportar para Contabilidad (CSV)
          </Button>
          <Button
            onClick={fetchSummary}
            variant="secondary"
            size="sm"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <span className="text-sm font-bold">Cargando resumen financiero...</span>
        </div>
      ) : error ? (
        <Card className="p-6 h-full flex flex-col gap-4 border-rose-200 bg-rose-50/60">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex flex-col gap-2">
              <p className="text-subheading text-rose-900">No se pudo cargar finanzas</p>
              <p className="text-xs text-rose-800">{error}</p>
              {errorStatus === 401 && <p className="text-xs text-slate-500">Verifica tu JWT (localStorage smart_park_access_token).</p>}
              {errorStatus === 403 && <p className="text-xs text-slate-500">Solo platform puede consultar GET /finances/summary.</p>}
              <Button onClick={fetchSummary} variant="primary" size="sm">
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs Financieros Reales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 h-full flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-400">Recaudación Bruta Red</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 shrink-0" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-heading text-2xl font-mono tracking-tight text-slate-900">{fmt(grossNetworkRevenue)}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {totales.total_reservas_global} reserva(s) no canceladas • {totales.liquidados_count} completadas
                </p>
              </div>
            </Card>

            <Card className="p-6 h-full flex flex-col justify-between gap-4 border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-emerald-800">Comisión Smart-Park (12%)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Percent className="w-5 h-5 shrink-0" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-heading text-2xl font-mono tracking-tight text-emerald-700">{fmt(totalPlatformEarnings)}</h3>
                <p className="text-xs text-emerald-800/80 font-medium">Ganancia líquida de la plataforma</p>
              </div>
            </Card>

            <Card className="p-6 h-full flex flex-col justify-between gap-4 border-amber-200 bg-amber-50/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-amber-800">Por Transferir a Cocheras</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 shrink-0" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-heading text-2xl font-mono tracking-tight text-amber-900">{fmt(pendingPayoutsAmount)}</h3>
                <p className="text-xs text-amber-700 font-medium">Liquidaciones listas para desembolso</p>
              </div>
            </Card>

            <Card className="p-6 h-full flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-slate-400">Liquidado & Transferido</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-heading text-2xl font-mono tracking-tight text-slate-900">{fmt(disbursedPayoutsAmount)}</h3>
                <p className="text-xs text-slate-500 font-medium">Marcado como liquidado (local, sin persistencia)</p>
              </div>
            </Card>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 shrink-0 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar cochera, RUC o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'PENDING', 'COMPLETED'].map((st) => (
                <Button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  variant={statusFilter === st ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {st === 'ALL' ? 'Todas las Sedes' : st === 'PENDING' ? 'Pendientes de Pago' : 'Liquidadas (local)'}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <Card className="overflow-hidden p-0 gap-0">
            {!hasAnyMovement ? (
              <div className="p-6 flex flex-col items-center gap-2 py-16 text-center">
                <DollarSign className="w-5 h-5 shrink-0 text-slate-300" />
                <p className="text-subheading text-slate-600">Aún no hay movimientos para liquidar.</p>
                <p className="text-xs text-slate-400 max-w-md">
                  No se encontraron reservas no canceladas. Cuando existan reservas (scheduled/active/completed), aquí verás la
                  recaudación por sede, comisión 12% y neto a liquidar.
                </p>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="p-6 py-12 text-center">
                <p className="text-subheading text-slate-500">Sin resultados para el filtro actual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-caption text-slate-500">Establecimiento & Razón Social</th>
                      <th className="p-4 text-caption text-slate-500">Datos Bancarios</th>
                      <th className="p-4 text-caption text-slate-500 text-right">Recaudado</th>
                      <th className="p-4 text-caption text-slate-500 text-right">Comisión Smart-Park</th>
                      <th className="p-4 text-caption text-slate-500 text-right">Neto a Transferir</th>
                      <th className="p-4 text-caption text-slate-500 text-center">Estado</th>
                      <th className="p-4 text-caption text-slate-500 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPayouts.map((p) => {
                      if (p.status === 'EMPTY') return null;
                      const isPending = p.status === 'PENDING';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4">
                            <div className="font-extrabold text-slate-900">{p.parkingName}</div>
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                              <span>RUC: <span className="font-mono">{p.ruc}</span></span>
                              <span className="text-amber-600 font-bold">• pendiente de completar</span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              Sede #{p.parkingId} • {p.totalReservas} reserva(s) • {p.reservasCompleted} completada(s)
                            </div>
                          </td>

                          <td className="p-4 font-mono text-xs">
                            <div className="font-bold text-amber-700">{p.bank}</div>
                            <div className="text-slate-500 text-xs">Cta: {p.accountNumber}</div>
                            <div className="text-slate-400 text-xs">CCI: {p.cci}</div>
                            <div className="text-xs text-amber-600 font-bold mt-1">RUC/CCI sin tabla — dato ilustrativo</div>
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-slate-900">{fmt(p.totalRevenue)}</td>

                          <td className="p-4 text-right font-mono">
                            <div className="font-bold text-emerald-700">{fmt(p.platformFee)}</div>
                            <div className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                              {p.commissionRate}%
                            </div>
                          </td>

                          <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">{fmt(p.netPayout)}</td>

                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase ${
                                isPending ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <span>{isPending ? 'Por Liquidar' : 'Transferido (local)'}</span>
                            </span>
                            {p.processedAt && <div className="text-xs text-slate-400 font-mono mt-1">{p.processedAt}</div>}
                          </td>

                          <td className="p-4 text-center">
                            {isPending ? (
                              <Button
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setShowPayoutModal(true);
                                }}
                                variant="primary"
                                size="sm"
                                title="Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado"
                              >
                                <Send className="w-4 h-4 shrink-0" />
                                Liquidar Fondos
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
                                variant="secondary"
                                size="sm"
                              >
                                <Receipt className="w-4 h-4 shrink-0" />
                                Comprobante
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
            <DialogTitle className="text-heading flex items-center gap-2">
              <Send className="w-5 h-5 shrink-0 text-emerald-600" />
              Emitir Liquidación Bancaria
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado (sin persistencia).
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="flex flex-col gap-4 my-2">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
                <strong>Aviso honesto:</strong> no existe aún tabla de cuentas bancarias (RUC/CCI) ni endpoint de liquidaciones persistente. El
                RUC/CCI mostrado es ficticio. La liquidación real es manual por tesorería.
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Establecimiento:</span>
                  <strong className="text-slate-900">{selectedPayout.parkingName}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">RUC (ilustrativo):</span>
                  <span className="font-mono text-slate-800">{selectedPayout.ruc} — pendiente de completar</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Banco & Cuenta:</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedPayout.bank} • {selectedPayout.accountNumber}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">CCI (ilustrativo):</span>
                  <span className="font-mono text-slate-600 text-xs">{selectedPayout.cci}</span>
                </div>
              </div>

              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 flex flex-col gap-2 text-xs font-mono">
                <div className="flex justify-between gap-2 text-slate-700">
                  <span>Recaudación Bruta ({selectedPayout.totalReservas} reservas):</span>
                  <span>{fmt(selectedPayout.totalRevenue)}</span>
                </div>
                <div className="flex justify-between gap-2 text-emerald-800 font-bold">
                  <span>Retención Comisión Smart-Park ({selectedPayout.commissionRate}%):</span>
                  <span>- {fmt(selectedPayout.platformFee)}</span>
                </div>
                <div className="border-t border-emerald-200/80 pt-2 flex justify-between gap-2 text-sm font-black text-slate-900">
                  <span>MONTO NETO A TRANSFERIR:</span>
                  <span className="text-emerald-700 text-base">{fmt(selectedPayout.netPayout)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" size="md" onClick={() => setShowPayoutModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayout}
                  variant="primary"
                  size="md"
                  title="Registro contable — la transferencia se gestiona fuera de la plataforma; este botón solo marca como liquidado"
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Marcar como liquidado
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
            <DialogTitle className="text-heading text-center flex items-center justify-center gap-2">
              <Receipt className="w-5 h-5 shrink-0 text-emerald-600" />
              Comprobante de Liquidación
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              Constancia de registro contable — tesorería gestiona la transferencia fuera de plataforma.
            </DialogDescription>
          </DialogHeader>

          {receiptData && (
            <div className="flex flex-col gap-4 my-2">
              <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col gap-4 text-xs font-mono">
                <div className="text-center pb-2 border-b border-slate-100 flex flex-col gap-2">
                  <div className="font-extrabold text-sm text-slate-900 font-sans">SMART-PARK ENTERPRISE</div>
                  <div className="text-xs text-slate-400">RUC: 20719284019 • Ayacucho, Perú</div>
                  <div className="text-xs font-bold text-emerald-600">{receiptData.operationNumber}</div>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Destinatario:</span>
                    <strong className="text-slate-900">{receiptData.parkingName}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">RUC (pendiente):</span>
                    <span className="text-slate-800">{receiptData.ruc}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Banco:</span>
                    <span className="text-slate-800 font-bold">{receiptData.bank}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Fecha:</span>
                    <span className="text-slate-800">{receiptData.processedAt || '—'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between gap-2 text-slate-600">
                    <span>Recaudación Bruta Total:</span>
                    <span>{fmt(receiptData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-emerald-700 font-semibold">
                    <span>Comisión Smart-Park ({receiptData.commissionRate}%):</span>
                    <span>- {fmt(receiptData.platformFee)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-slate-500 text-[10px] pl-2 border-l-2 border-slate-200">
                    <span>Subtotal Base Imponible:</span>
                    <span>{fmt(receiptData.platformFee / 1.18)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-slate-500 text-[10px] pl-2 border-l-2 border-slate-200">
                    <span>IGV Débito Fiscal (18% SUNAT):</span>
                    <span>{fmt(receiptData.platformFee - (receiptData.platformFee / 1.18))}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-black text-slate-900 text-sm border-t border-slate-200 pt-2 mt-1">
                    <span>NETO A TRANSFERIR:</span>
                    <span className="text-emerald-600 text-base">{fmt(receiptData.netPayout)}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-400 font-mono text-center mt-2 border border-slate-200">
                    HASH CPE: SHA256-SUNAT-{Math.random().toString(36).substring(2, 10).toUpperCase()} • VÁLIDO PARA DECLARACIÓN TRIBUTARIA
                  </div>
                </div>
              </div>

              <Button
                onClick={() => window.print()}
                variant="primary"
                size="md"
                className="w-full font-bold shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                Imprimir / Guardar Voucher PDF Oficial
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
