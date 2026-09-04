import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Car, 
  Printer, 
  Receipt, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  X,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const INITIAL_HISTORY = [
  { id: 'ST-9901', date: '2026-08-18', time: '14:30 - 16:45', duration: '2h 15m', parking: 'Smart Park Plaza Mayor - Planta Baja', slot: 'A-03', plate: 'ABC-123', cost: 17.00, status: 'Completado', invoice: 'B001-004291', paymentMethod: 'Visa •••• 4242' },
  { id: 'ST-8820', date: '2026-08-16', time: '10:00 - 11:30', duration: '1h 30m', parking: 'Smart Park Plaza Mayor - Sótano 1', slot: 'S1-03', plate: 'AYC-501', cost: 15.00, status: 'Completado', invoice: 'B001-003810', paymentMethod: 'Yape QR' },
  { id: 'ST-7742', date: '2026-08-12', time: '18:15 - 20:00', duration: '1h 45m', parking: 'Smart Park Mercado Mariscal Cáceres', slot: 'M-02', plate: 'XYZ-987', cost: 14.80, status: 'Completado', invoice: 'B001-002955', paymentMethod: 'Mastercard •••• 8812' },
  { id: 'ST-6610', date: '2026-08-08', time: '09:00 - 13:00', duration: '4h 00m', parking: 'Smart Park Terminal Terrestre', slot: 'T-01', plate: 'W1P-404', cost: 18.00, status: 'Completado', invoice: 'B001-001890', paymentMethod: 'Efectivo en Garita' },
  { id: 'ST-5504', date: '2026-08-03', time: '16:00 - 17:00', duration: '1h 00m', parking: 'Smart Park Plaza Mayor - Planta Baja', slot: 'A-01', plate: 'ABC-123', cost: 5.00, status: 'Completado', invoice: 'B001-001420', paymentMethod: 'Plin QR' },
];

export const HistoryModule = () => {
  const { reservations, establishments } = useEstablishments();
  const [searchTerm, setSearchTerm] = useState('');
  const [parkingFilter, setParkingFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'MONTH'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Unificar historial: solo reservas completadas del usuario actual - sin fuga de datos demo
  const allHistory = useMemo(() => {
    const fromReservations = reservations
      .filter(r => r.status === 'COMPLETED')
      .map(r => ({
        id: `ST-${r.code.replace('RSV-', '')}`,
        date: new Date(r.startTime).toISOString().split('T')[0],
        time: `${new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(r.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        duration: `${r.hours}h 00m`,
        parking: r.parking,
        slot: r.slot,
        plate: r.plate,
        cost: Number(r.cost) || 10.00,
        status: 'Completado',
        invoice: `B001-00${Math.floor(1000 + Math.random() * 9000)}`,
        paymentMethod: 'Pase Digital / Tarjeta'
      }));

    // Nuevo usuario: historial vacío (no mostrar INITIAL_HISTORY global)
    // Solo combinar si hay reservas reales del usuario
    const combined = [...fromReservations];
    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }, [reservations]);

  // Filtrado
  const filteredHistory = allHistory.filter(h => {
    const matchSearch = 
      h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.parking.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.slot && h.slot.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchParking = parkingFilter === 'ALL' || h.parking.includes(parkingFilter);

    let matchDate = true;
    if (dateFilter === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      matchDate = h.date === today;
    }

    return matchSearch && matchParking && matchDate;
  });

  // Métricas
  const totalStays = allHistory.length;
  const totalSpent = allHistory.reduce((acc, h) => acc + Number(h.cost), 0);
  const avgCost = totalStays > 0 ? totalSpent / totalStays : 0;

  // Exportar CSV
  const exportCSV = () => {
    const headers = "ID,Fecha,Horario,Duracion,Estacionamiento,Plaza,Placa,Costo_PEN,Comprobante,MetodoPago,Estado\n";
    const rows = filteredHistory.map(h => 
      `${h.id},${h.date},"${h.time}",${h.duration},"${h.parking}",${h.slot},${h.plate},${h.cost.toFixed(2)},${h.invoice},"${h.paymentMethod}",${h.status}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Historial_Estancias_SmartPark_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Historial de Estancias & Comprobantes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro cronológico auditado de todos los parqueos finalizados con boletas electrónicas.
            </p>
          </div>
        </div>

        <Button 
          onClick={exportCSV} 
          variant="outline" 
          className="gap-2 font-bold text-xs rounded-xl shadow-xs border-slate-300 h-10 px-4 hover:bg-slate-50"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Exportar a Excel / CSV</span>
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-400/10 dark:bg-slate-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Estancias</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <Car className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">{totalStays}</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
              100% Auditadas
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gasto Total Acumulado</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <DollarSign className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">S/ {totalSpent.toFixed(2)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Moneda: PEN</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#111827]/95 shadow-xs hover:shadow-md dark:shadow-black/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Costo Promedio / Estancia</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">S/ {avgCost.toFixed(2)}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Tarifa media</span>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <Card className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111827] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar por placa, cochera, ID o boleta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">✕</button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-start md:justify-end">
          <select
            value={parkingFilter}
            onChange={(e) => setParkingFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Todas las Cocheras</option>
            {establishments.map(e => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Todo el Historial</option>
            <option value="TODAY">Solo Hoy</option>
          </select>
        </div>
      </Card>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No se encontraron estancias</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Prueba con otros términos de búsqueda.</p>
          </Card>
        ) : (
          filteredHistory.map((h) => (
            <Card 
              key={h.id} 
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md dark:shadow-black/50 transition rounded-2xl bg-white dark:bg-[#111827]"
            >
              <div className="flex items-start sm:items-center space-x-4">
                {/* ID Tag */}
                <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex flex-col items-center justify-center font-mono font-black text-xs shrink-0 shadow-xs border border-transparent dark:border-slate-700">
                  <span className="text-[9px] text-emerald-400 opacity-80">STAY</span>
                  <span>{h.id.replace('ST-', '')}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{h.parking}</h3>
                    <span className="bg-slate-950 text-white px-2 py-0.5 rounded-md font-mono font-black text-[11px] border border-slate-700 shadow-2xs">
                      🇵🇪 {h.plate}
                    </span>
                    {h.slot && (
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/80">
                        Cajón {h.slot}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 
                      <strong className="text-slate-800 dark:text-slate-200">{h.date}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 shrink-0 text-slate-400" /> 
                      {h.time} ({h.duration})
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                      Boleta: <strong className="text-slate-800 dark:text-slate-200">{h.invoice}</strong>
                    </span>
                  </p>
                </div>
              </div>

              {/* Costo y Botón Ver Boleta */}
              <div className="flex items-center space-x-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Liquidado</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">S/ {Number(h.cost).toFixed(2)}</span>
                </div>

                <Button
                  onClick={() => setSelectedReceipt(h)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 h-9"
                >
                  <Receipt className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Ver Boleta</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Boleta Electrónica */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-200 dark:border-emerald-800/80">
                <Receipt className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center text-slate-900 dark:text-white">
                Boleta de Venta Electrónica
              </DialogTitle>
              <DialogDescription className="text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                RUC: 20608945123 • {selectedReceipt.invoice}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs space-y-2.5 my-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cochera:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{selectedReceipt.parking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Estancia:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horario de Permanencia:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placa Vehicular:</span>
                <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{selectedReceipt.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.paymentMethod || 'Tarjeta / QR'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL (INC. IGV 18%):</span>
                <span className="text-emerald-700">S/ {Number(selectedReceipt.cost).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Printer className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Imprimir Boleta</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};
