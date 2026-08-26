import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import api from '../services/api';

export const AuditLogsModule = () => {
  const { role } = useAuth();
  const { establishments } = useEstablishments();

  const [globalFilter, setGlobalFilter] = useState('');
  const [parkingFilter, setParkingFilter] = useState('ALL');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(6);
  const [pageIndex, setPageIndex] = useState(0);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (parkingFilter !== 'ALL') params.parking_id = Number(parkingFilter);
      const res = await api.get('/audit/logs', { params });
      if (Array.isArray(res.data)) setRawData(res.data);
    } catch {
      // Sin datos o sin auth: mantener vacío (se mostrará estado vacío, no mock)
    } finally {
      setLoading(false);
    }
  }, [parkingFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh cada 20s para auditoría en vivo
  useEffect(() => {
    const id = setInterval(fetchLogs, 20000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // Filtrado Global (texto)
  const filteredData = useMemo(() => {
    if (!globalFilter) return rawData;
    const query = globalFilter.toLowerCase();
    return rawData.filter(d => 
      String(d.id).toLowerCase().includes(query) ||
      String(d.operator).toLowerCase().includes(query) ||
      String(d.action).toLowerCase().includes(query) ||
      String(d.target).toLowerCase().includes(query) ||
      String(d.ip).toLowerCase().includes(query) ||
      String(d.severity).toLowerCase().includes(query) ||
      String(d.parking_name || '').toLowerCase().includes(query)
    );
  }, [rawData, globalFilter]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  const pageCount = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageIndex, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportCSV = () => {
    const headers = "ID,Timestamp,Operador,Accion,Detalle,Severidad,IP,Cochera\n";
    const rows = filteredData.map(d => `${d.id},"${d.timestamp}","${d.operator}","${d.action}","${String(d.target).replace(/"/g, '""')}",${d.severity},${d.ip},"${d.parking_name || ''}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora_auditoria_smartpark_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const subtitle = role === 'local'
    ? 'Eventos reales de tus sedes: ingresos ANPR, pagos, incidencias y reseñas (filtrado por cochera).'
    : role === 'platform'
    ? 'Bitácora global de todas las sedes: accesos, pagos e incidencias.'
    : 'Tus acciones registradas en el sistema.';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>{role === 'local' ? 'Auditoría Local' : 'Auditoría & Bitácora de Seguridad'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {subtitle}
            <span className="ml-2 font-mono text-slate-400">{rawData.length} eventos</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-1.5 text-xs font-bold h-9">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={exportCSV} variant="outline" className="gap-2 font-bold text-xs">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      <Card className="p-4 border-slate-200 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="flex items-center space-x-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por operador, placa, acción o IP..."
                value={globalFilter}
                onChange={e => {
                  setGlobalFilter(e.target.value);
                  setPageIndex(0);
                }}
                className="h-9 text-xs"
              />
            </div>
            <select
              value={parkingFilter}
              onChange={e => { setParkingFilter(e.target.value); setPageIndex(0); }}
              className="h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 min-w-[180px]"
            >
              <option value="ALL">Todas las cocheras</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700"
            >
              {[6, 10, 20, 50].map(size => (
                <option key={size} value={size}>
                  {size} registros
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th onClick={() => handleSort('id')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>ID Log</span>
                    <ArrowUpDown className="w-4 h-4 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('timestamp')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Fecha & Hora</span>
                    <ArrowUpDown className="w-4 h-4 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('operator')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Operador / Origen</span>
                    <ArrowUpDown className="w-4 h-4 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Acción Ejecutada</th>
                <th className="p-3.5">Detalle / Entidad</th>
                <th onClick={() => handleSort('severity')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Nivel</span>
                    <ArrowUpDown className="w-4 h-4 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">Cargando bitácora real...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-xs">Sin registros para los filtros actuales. {role === 'local' ? 'Prueba con otra cochera o crea una reserva de prueba.' : ''}</td></tr>
              ) : paginatedData.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-500 text-xs">{row.id}</td>
                  <td className="p-3.5 font-mono text-xs text-slate-700">{row.timestamp}</td>
                  <td className="p-3.5 font-bold text-slate-900 text-xs">{row.operator}</td>
                  <td className="p-3.5 text-xs text-slate-700">{row.action}</td>
                  <td className="p-3.5 font-mono text-xs font-semibold text-emerald-800">{row.target}</td>
                  <td className="p-3.5">
                    <span className={`text-[10px] font-bold ${
                      row.severity === 'Crítico' ? 'text-rose-600' : row.severity === 'Advertencia' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      ● {row.severity}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-400">{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 text-xs text-slate-600">
          <div>
            Página <span className="font-bold text-slate-900">{pageIndex + 1}</span> de{' '}
            <span className="font-bold text-slate-900">{pageCount}</span> ({filteredData.length} registros filtrados de {rawData.length} totales)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setPageIndex(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Anterior</span>
            </Button>
            <Button
              onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex >= pageCount - 1}
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
