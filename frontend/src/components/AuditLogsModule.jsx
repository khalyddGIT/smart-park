import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Building2,
  User,
  Info,
  Code2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishments } from '../context/EstablishmentContext';
import api from '../services/api';

export const AuditLogsModule = () => {
  const { role } = useAuth();
  const { establishments } = useEstablishments();

  const [globalFilter, setGlobalFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [parkingFilter, setParkingFilter] = useState('ALL');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [rawData, setRawData] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado para el modal de inspección detallada
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setInitialLoading(prev => rawData.length === 0);
      setIsRefreshing(true);
    }
    try {
      const params = { limit: 100 };
      if (parkingFilter !== 'ALL') params.parking_id = Number(parkingFilter);
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      const res = await api.get('/audit/logs', { params });
      if (Array.isArray(res.data)) setRawData(res.data);
    } catch {
      // Fail-safe: mantener estado sin mock si hay error de red o permisos
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [parkingFilter, severityFilter, rawData.length]);

  useEffect(() => {
    fetchLogs(false);
  }, [parkingFilter, severityFilter]);

  // Auto-refresh silencioso en segundo plano cada 25s (sin parpadeos ni desmontar filas)
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden && !selectedLog) {
        fetchLogs(true);
      }
    }, 25000);
    return () => clearInterval(id);
  }, [fetchLogs, selectedLog]);

  // Métricas KPI Superiores
  const totalEvents = rawData.length;
  const criticalAlerts = useMemo(() => {
    return rawData.filter(d => d.severity === 'Crítico' || d.severity === 'Advertencia').length;
  }, [rawData]);
  const operationalEvents = useMemo(() => {
    return rawData.filter(d => d.severity === 'Info').length;
  }, [rawData]);

  // Filtrado Global (texto)
  const filteredData = useMemo(() => {
    return rawData.filter(d => {
      // Filtro local de severidad si no se filtró en API
      if (severityFilter !== 'ALL' && String(d.severity).toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (!globalFilter) return true;
      const query = globalFilter.toLowerCase();
      return (
        String(d.id || '').toLowerCase().includes(query) ||
        String(d.operator || '').toLowerCase().includes(query) ||
        String(d.action || '').toLowerCase().includes(query) ||
        String(d.target || '').toLowerCase().includes(query) ||
        String(d.ip || '').toLowerCase().includes(query) ||
        String(d.severity || '').toLowerCase().includes(query) ||
        String(d.parking_name || '').toLowerCase().includes(query)
      );
    });
  }, [rawData, globalFilter, severityFilter]);

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

  const handleCopyJson = (details) => {
    try {
      const text = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const exportCSV = () => {
    const headers = "ID,Timestamp,Operador,Rol,Accion,Detalle_Objetivo,Severidad,IP_Terminal,Sede,Metadatos_JSON\n";
    const rows = filteredData.map(d => {
      const jsonStr = d.details ? (typeof d.details === 'string' ? d.details : JSON.stringify(d.details)) : '';
      const safeTarget = String(d.target || '').replace(/"/g, '""');
      const safeAction = String(d.action || '').replace(/"/g, '""');
      const safeOp = String(d.operator || '').replace(/"/g, '""');
      const safeJson = jsonStr.replace(/"/g, '""');
      return `${d.id},"${d.timestamp}","${safeOp}","${d.role || ''}","${safeAction}","${safeTarget}",${d.severity},"${d.ip}","${d.parking_name || ''}","${safeJson}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora_auditoria_smartpark_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderSeverityBadge = (severity) => {
    switch (severity) {
      case 'Crítico':
        return (
          <Badge variant="destructive" className="gap-1.5 shadow-xs text-[10px] font-black tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            Crítico
          </Badge>
        );
      case 'Advertencia':
        return (
          <Badge variant="warning" className="gap-1.5 shadow-xs text-[10px] font-extrabold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Advertencia
          </Badge>
        );
      case 'Info':
      default:
        return (
          <Badge variant="success" className="gap-1.5 text-[10px] font-bold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Info
          </Badge>
        );
    }
  };

  const subtitle = role === 'local'
    ? 'Eventos verificados en tus sedes: accesos ANPR, liquidaciones, incidencias y seguridad local.'
    : role === 'platform'
    ? 'Bitácora central e inmutable de auditoría: ajustes maestros, RBAC, accesos y transacciones globales.'
    : 'Registro cronológico de tus actividades en la red SmartPark.';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{role === 'local' ? 'Auditoría de Sede' : 'Auditoría & Bitácora de Seguridad'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
            <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              • {rawData.length} eventos en memoria
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => fetchLogs(false)} 
            variant="outline" 
            size="sm" 
            disabled={isRefreshing}
            className="gap-1.5 text-xs font-bold h-9 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </Button>
          <Button 
            onClick={exportCSV} 
            variant="outline" 
            className="gap-2 font-bold text-xs h-9 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total de Eventos Registrados
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalEvents}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Línea de tiempo cronológica unificada
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Alertas de Seguridad & Críticas
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {criticalAlerts}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Ajustes maestros, bloqueos y advertencias
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Transacciones y Operaciones
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {operationalEvents}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Reservas, ANPR, liquidaciones e info
            </div>
          </div>
        </Card>
      </div>

      {/* Contenedor Principal con Filtros y Tabla */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#111827]">
        {/* Barra de Filtros */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Buscador de texto */}
            <div className="flex items-center space-x-2 w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar placa, operador, acción o IP..."
                value={globalFilter}
                onChange={e => {
                  setGlobalFilter(e.target.value);
                  setPageIndex(0);
                }}
                className="h-9 text-xs dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
              />
            </div>

            {/* Filtro por Severidad */}
            <select
              value={severityFilter}
              onChange={e => {
                setSeverityFilter(e.target.value);
                setPageIndex(0);
              }}
              className="h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[150px]"
            >
              <option value="ALL">Todas las severidades</option>
              <option value="Crítico">Crítico</option>
              <option value="Advertencia">Advertencia</option>
              <option value="Info">Info</option>
            </select>

            {/* Filtro por Sede / Cochera */}
            <select
              value={parkingFilter}
              onChange={e => { setParkingFilter(e.target.value); setPageIndex(0); }}
              className="h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[170px]"
            >
              <option value="ALL">Todas las cocheras</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 self-end lg:self-auto">
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              {[6, 10, 20, 50].map(size => (
                <option key={size} value={size}>
                  {size} registros
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th onClick={() => handleSort('id')} className="p-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>ID Log</span>
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('timestamp')} className="p-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Fecha & Hora</span>
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('operator')} className="p-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Operador / Origen</span>
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Acción Ejecutada</th>
                <th className="p-3.5">Detalle / Recurso</th>
                <th onClick={() => handleSort('severity')} className="p-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Nivel</span>
                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {initialLoading && rawData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                      <span>Cargando bitácora empresarial...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                    Sin registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : paginatedData.map(row => (
                <tr 
                  key={row.id} 
                  onClick={() => setSelectedLog(row)}
                  title="Haz clic para inspeccionar detalles y metadatos técnicos"
                  className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition select-none group"
                >
                  <td className="p-3.5 font-mono font-bold text-slate-500 dark:text-slate-400 text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {row.id}
                  </td>
                  <td className="p-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {row.timestamp}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{row.operator}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {row.action}
                  </td>
                  <td className="p-3.5 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 max-w-xs truncate">
                    {row.target}
                  </td>
                  <td className="p-3.5">
                    {renderSeverityBadge(row.severity)}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{row.ip}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Página <span className="font-bold text-slate-900 dark:text-white">{pageIndex + 1}</span> de{' '}
            <span className="font-bold text-slate-900 dark:text-white">{pageCount}</span> ({filteredData.length} registros filtrados de {rawData.length} totales)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setPageIndex(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Anterior</span>
            </Button>
            <Button
              onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex >= pageCount - 1}
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Inspección Detallada */}
      <Dialog open={!!selectedLog} onOpenChange={open => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {selectedLog.id}
                    </span>
                    {renderSeverityBadge(selectedLog.severity)}
                  </div>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    {selectedLog.timestamp}
                  </span>
                </div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {selectedLog.action}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Registro inmutable auditado con verificación criptográfica y trazabilidad de IP.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Metadatos Generales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
                      Operador / Identidad
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedLog.operator}</span>
                    </div>
                    {selectedLog.role && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                        Rol: {selectedLog.role}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
                      Terminal / IP de Origen
                    </span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedLog.ip}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
                      Sede / Entidad Vinculada
                    </span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedLog.parking_name || 'Global / Plataforma'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
                      Severidad & Cumplimiento
                    </span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Nivel de Auditoría: {selectedLog.severity}
                    </div>
                  </div>
                </div>

                {/* Recurso / Objetivo afectado */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1.5">
                    Recurso o Parámetro Afectado
                  </span>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 break-words">
                    {selectedLog.target}
                  </div>
                </div>

                {/* Visor de Metadatos Técnicos JSON */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      Metadatos Técnicos Estructurados (JSON)
                    </span>
                    {selectedLog.details && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyJson(selectedLog.details)}
                        className="h-7 px-2 text-[11px] gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar JSON</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {selectedLog.details ? (
                    <pre className="p-3.5 rounded-xl bg-slate-950 dark:bg-black/80 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-56 leading-relaxed select-all">
                      {typeof selectedLog.details === 'string'
                        ? selectedLog.details
                        : JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      Sin metadatos técnicos adicionales para este evento.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button 
                  onClick={() => setSelectedLog(null)} 
                  variant="outline" 
                  className="w-full sm:w-auto font-bold text-xs h-9 dark:border-slate-800 dark:text-slate-200"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AuditLogsModule;
