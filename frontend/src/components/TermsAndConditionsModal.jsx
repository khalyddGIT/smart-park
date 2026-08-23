import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Download, 
  Search, 
  Car, 
  Building2, 
  Scale, 
  Lock, 
  CreditCard, 
  AlertTriangle 
} from 'lucide-react';

export const TermsAndConditionsModal = ({ isOpen, onClose }) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [hasAccepted, setHasAccepted] = useState(false);

  const sections = [
    {
      id: 'sec-1',
      title: '1. Objeto y Naturaleza de la Plataforma Smart-Park',
      icon: <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      content: `Smart-Park es un ecosistema digital multi-tenant (Marketplace y Software as a Service) que intermedia tecnológicamente entre:
a) Conductores y usuarios finales que buscan, reservan y pagan plazas de estacionamiento vehicular.
b) Propietarios o administradores de playas de estacionamiento legalmente constituidas ("Establecimientos Afiliados").
Smart-Park no es propietario de los inmuebles físicos de estacionamiento (salvo indicación expresa), actuando como intermediario tecnológico para la optimización y digitalización del servicio.`
    },
    {
      id: 'sec-2',
      title: '2. Obligaciones y Derechos del Conductor (Usuario Final)',
      icon: <Car className="w-4 h-4 text-blue-600 shrink-0" />,
      content: `• Reserva y Ocupación: El usuario tiene derecho a ocupar el cajón específico reservado durante el lapso de tiempo contratado.
• Tolerancia y Horarios: Se otorga un periodo de gracia estándar de 15 minutos. El tiempo excedente será cobrado según el tarifario oficial de la cochera mediante la pasarela de pago o en garita.
• Custodia y Objetos de Valor: El conductor debe cerrar debidamente su vehículo. Smart-Park y el establecimiento no se hacen responsables por bienes no declarados expresamente en garita conforme al Art. 1756 del Código Civil Peruano.
• Plazas PMR e Inclusivas: Queda terminantemente prohibido ocupar plazas reservadas para personas con movilidad reducida (PMR - Norma A.120) sin contar con la acreditación CONADIS correspondiente.`
    },
    {
      id: 'sec-3',
      title: '3. Obligaciones de los Establecimientos Afiliados (Cocheras)',
      icon: <Scale className="w-4 h-4 text-amber-600 shrink-0" />,
      content: `• Disponibilidad Garantizada: La cochera afiliada se compromete a mantener liberado el cajón asignado al conductor con reserva activa.
• Transparencia Tarifaria: Los precios por hora o fracción publicados en Smart-Park deben coincidir con los cobrados en garita sin recargos arbitrarios.
• Infraestructura y Cámaras LPR: La cochera debe mantener operativas sus cámaras de lectura de placas (ANPR) y barreras electromecánicas para garantizar una experiencia ágil y segura.`
    },
    {
      id: 'sec-4',
      title: '4. Pasarela de Pagos, Comisiones y Liquidaciones',
      icon: <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />,
      content: `• Métodos de Pago: Se admiten pagos mediante billeteras interoperables (Yape, Plin), tarjetas de crédito/débito tokenizadas bajo estándar PCI-DSS y Smart Wallet.
• Comisión de Plataforma: Smart-Park retiene automáticamente una comisión por servicio tecnológico del 10% al 12% sobre el valor bruto procesado.
• Dispersión a Cocheras (Payouts): Los fondos netos son transferidos quincenalmente a las cuentas bancarias registradas (BCP, BBVA, Interbank) acompañados del respectivo comprobante contable.`
    },
    {
      id: 'sec-5',
      title: '5. Políticas de Cancelación y Reembolso',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />,
      content: `• Cancelación Gratuita: El conductor puede cancelar su reserva sin penalidad hasta 15 minutos antes de la hora pactada de inicio.
• Cancelación Tardía / No-Show: Si el conductor no se presenta dentro del periodo de tolerancia sin cancelar previamente, se retendrá el equivalente a la primera hora por concepto de costo de reserva de plaza.`
    },
    {
      id: 'sec-6',
      title: '6. Protección de Datos Personales y Lectura Óptica LPR',
      icon: <Lock className="w-4 h-4 text-emerald-600 shrink-0" />,
      content: `En estricto cumplimiento de la Ley N° 29733 (Ley de Protección de Datos Personales del Perú) y su Reglamento:
• Los datos de registro (Nombres, DNI, Teléfono, Correo y Placas Vehiculares) son almacenados de forma segura y cifrada.
• Las capturas ópticas de matrículas (LPR / ANPR) se utilizan exclusivamente con fines de control de acceso, auditoría de seguridad y cálculo automático de estancias. No se comparten con terceros ajenos a la operación del servicio.`
    },
    {
      id: 'sec-7',
      title: '7. Jurisdicción y Ley Aplicable',
      icon: <ShieldCheck className="w-4 h-4 text-slate-800 shrink-0" />,
      content: `Los presentes términos se rigen e interpretan bajo las leyes de la República del Perú. Para cualquier controversia no resuelta por acuerdo directo, las partes se someten a la competencia de los jueces y tribunales del Distrito Judicial de Ayacucho.`
    }
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
    s.content.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8 max-h-[88vh] overflow-y-auto bg-white border-slate-200">
        
        {/* Encabezado Principal */}
        <DialogHeader className="border-b border-slate-100 pb-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                  Términos y Condiciones de Uso
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Smart-Park Perú • Versión 2.4 (Vigente 2026)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs font-bold text-slate-700 rounded-xl gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Imprimir / PDF</span>
              </Button>
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1">
            Al acceder, registrarte o contratar plazas mediante el ecosistema <strong>Smart-Park</strong>, aceptas formalmente las siguientes cláusulas contractuales conforme a la legislación peruana vigente (Ley N° 29571 y Ley N° 29733).
          </DialogDescription>
        </DialogHeader>

        {/* Buscador dentro del documento legal */}
        <div className="relative my-4">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cláusula (ej. reembolsos, LPR, comisiones, tolerancia)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Cuerpo de Cláusulas */}
        <div className="space-y-4 my-2">
          {filteredSections.map((sec) => (
            <div key={sec.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition space-y-2">
              <div className="flex items-center space-x-2">
                {sec.icon}
                <h3 className="text-xs sm:text-sm font-black text-slate-900">{sec.title}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pl-6">
                {sec.content}
              </p>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No se encontraron cláusulas que coincidan con "{searchFilter}".
            </div>
          )}
        </div>

        {/* Footer con Checkbox de Conformidad */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAccepted}
              onChange={(e) => setHasAccepted(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
            />
            <span>He leído y comprendido los Términos y Condiciones</span>
          </label>

          <Button
            type="button"
            onClick={() => {
              setHasAccepted(true);
              onClose();
            }}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-6 py-2.5 shadow-xs cursor-pointer"
          >
            Aceptar y Continuar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
