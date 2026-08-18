import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  FileSpreadsheet
} from 'lucide-react';

export const AuditLogsModule = () => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(6);
  const [pageIndex, setPageIndex] = useState(0);

  const rawData = useMemo(() => [
    {
      id: 'LOG-1094',
      timestamp: '2026-08-18 14:32:10',
      operator: 'Sistema ANPR / Garita 01',
      action: 'Apertura de Barrera (Ingreso LPR)',
      target: 'Placa ABC-123 / Cajón A-01',
      severity: 'Info',
      ip: '192.168.1.101'
    },
    {
      id: 'LOG-1093',
      timestamp: '2026-08-18 14:28:45',
      operator: 'Tótem Óptico QR',
      action: 'Validación de Pase Digital QR',
      target: 'Reserva RSV-5541 / Cajón A-04',
      severity: 'Info',
      ip: '192.168.1.104'
    },
    {
      id: 'LOG-1092',
      timestamp: '2026-08-18 14:15:02',
      operator: 'Operador: Juan Quispe',
      action: 'Apertura Manual Forzada de Barrera',
      target: 'Placa DEF-456 (Sin Reserva)',
      severity: 'Advertencia',
      ip: '192.168.1.102'
    },
    {
      id: 'LOG-1091',
      timestamp: '2026-08-18 13:50:22',
      operator: 'Admin: Carlos Mendoza',
      action: 'Modificación de Tarifa por Hora',
      target: 'Sede Plaza Mayor: S/ 5.00 -> S/ 6.00',
      severity: 'Advertencia',
      ip: '190.235.44.12'
    },
    {
      id: 'LOG-1090',
      timestamp: '2026-08-18 12:40:11',
      operator: 'Sistema de Pagos',
      action: 'Liquidación Yape / Plin',
      target: 'Transacción #8912 - S/ 10.00',
      severity: 'Info',
      ip: 'Gateway-01'
    },
    {
      id: 'LOG-1089',
      timestamp: '2026-08-18 11:20:00',
      operator: 'Supervisor: Rosa Gutiérrez',
      action: 'Registro de Incidencia',
      target: 'Infracción: Bloqueo Rampa PMR',
      severity: 'Crítico',
      ip: '192.168.1.105'
    },
    {
      id: 'LOG-1088',
      timestamp: '2026-08-18 10:10:40',
      operator: 'Admin: Carlos Mendoza',
      action: 'Asignación de Rol de Seguridad',
      target: 'Usuario ID #4 -> Operador Garita',
      severity: 'Info',
      ip: '190.235.44.12'
    },
    {
      id: 'LOG-1087',
      timestamp: '2026-08-18 09:05:15',
      operator: 'Sistema ANPR / Garita 01',
      action: 'Lectura Placa Autorizada',
      target: 'Placa AYC-501 / Cajón B-01',
      severity: 'Info',
      ip: '192.168.1.101'
    }
  ], []);

  // Filtrado Global
  const filteredData = useMemo(() => {
    if (!globalFilter) return rawData;
    const query = globalFilter.toLowerCase();
    return rawData.filter(d => 
      d.id.toLowerCase().includes(query) ||
      d.operator.toLowerCase().includes(query) ||
      d.action.toLowerCase().includes(query) ||
      d.target.toLowerCase().includes(query) ||
      d.ip.toLowerCase().includes(query) ||
      d.severity.toLowerCase().includes(query)
    );
  }, [rawData, globalFilter]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginación
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
    const headers = "ID,Timestamp,Operador,Accion,Detalle,Severidad,IP\n";
    const rows = rawData.map(d => `${d.id},"${d.timestamp}","${d.operator}","${d.action}","${d.target}",${d.severity},${d.ip}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora_auditoria_smartpark_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>Auditoría & Bitácora de Seguridad</span>
          </h1>
          <p className="text-xs text-slate-500">
            Registro de accesos vehiculares, aperturas de barrera y cambios administrativos.
          </p>
        </div>

        <Button onClick={exportCSV} variant="outline" className="gap-2 font-bold text-xs">
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Exportar Bitácora (CSV)</span>
        </Button>
      </div>

      {/* Controles de Búsqueda y Paginación */}
      <Card className="p-4 border-slate-200 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
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
              {[6, 10, 20].map(size => (
                <option key={size} value={size}>
                  {size} registros
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th onClick={() => handleSort('id')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>ID Log</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('timestamp')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Fecha & Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('operator')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Operador / Origen</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Acción Ejecutada</th>
                <th className="p-3.5">Detalle / Entidad</th>
                <th onClick={() => handleSort('severity')} className="p-3.5 cursor-pointer select-none hover:text-slate-900">
                  <div className="flex items-center gap-1">
                    <span>Nivel</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(row => (
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

        {/* Paginador */}
        <div className="flex items-center justify-between pt-4 text-xs text-slate-600">
          <div>
            Página <span className="font-bold text-slate-900">{pageIndex + 1}</span> de{' '}
            <span className="font-bold text-slate-900">{pageCount}</span> ({filteredData.length} registros filtrados)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setPageIndex(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
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
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
