import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  MapPin, 
  DollarSign, 
  Percent, 
  Check, 
  AlertTriangle, 
  Layers,
  Inbox,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Car,
  KeyRound,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useEstablishments } from '../context/EstablishmentContext';

export const AffiliatedParkingsModule = () => {
  const { 
    establishments, 
    addEstablishment, 
    updateEstablishment, 
    deleteEstablishment,
    affiliationRequests = [],
    approveAffiliationRequest,
    rejectAffiliationRequest,
    getParkingCredentials,
    assignParkingCredentials
  } = useEstablishments();

  // 'establishments' | 'requests'
  const [activeSubTab, setActiveSubTab] = useState('establishments');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParking, setSelectedParking] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    commission: '12%',
    owner: '',
    phone: '',
    createAdminAccount: true,
    adminEmail: '',
    adminPassword: '',
    showAdminPassword: false
  });
  const [toast, setToast] = useState(null);

  // Estados para Modal de Aprobación con Credenciales
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [approveForm, setApproveForm] = useState({
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    adminPhone: '',
    showPassword: false
  });
  const [approvingLoading, setApprovingLoading] = useState(false);

  // Estados para Modal de Ver / Asignar Credenciales a Sede Activa
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsSede, setCredentialsSede] = useState(null);
  const [credentialsForm, setCredentialsForm] = useState({
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    adminPhone: '',
    showPassword: false,
    hasExistingAdmin: false
  });
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  // Estados para Diálogo de Credenciales Generadas (Éxito + Compartir por WhatsApp)
  const [credentialsResult, setCredentialsResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const pendingRequestsCount = affiliationRequests.filter(r => r.status === 'PENDING').length;

  // Generador de contraseñas seguras y legibles
  const generateSecurePassword = (prefix = 'SP') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}@${num}${rand.slice(0, 3)}`;
  };

  // Helper para construir el enlace de WhatsApp con el mensaje formateado
  const getWhatsAppMessageUrl = (creds) => {
    if (!creds) return '#';
    const targetPhone = creds.phone ? String(creds.phone).replace(/[^0-9]/g, '') : '';
    const phoneWithCode = targetPhone.startsWith('51') ? targetPhone : `51${targetPhone}`;
    const appUrl = window.location.origin;
    const text = `*ACCESO DE ADMINISTRADOR - SMART PARK*\n\n` +
      `Estimado(a) *${creds.ownerName || 'Administrador(a)'}*, su estacionamiento *"${creds.parkingName}"* ha sido habilitado en nuestra plataforma.\n\n` +
      `🔑 *Sus Credenciales Oficiales:*\n` +
      `• *Plataforma:* ${appUrl}\n` +
      `• *Usuario / Correo:* ${creds.email}\n` +
      `• *Contraseña de Acceso:* ${creds.password}\n` +
      `• *Rol Asignado:* Administrador de Sede (Local)\n\n` +
      `Desde su panel podrá:\n` +
      `1. Monitorear ocupación y mapa en vivo.\n` +
      `2. Gestionar cobros, tarifas por minuto/hora y penalidades.\n` +
      `3. Registrar ingresos con lectura de placas ANPR y garita.\n\n` +
      `¡Bienvenido(a) a la red Smart Park!`;
    return targetPhone ? `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}` : null;
  };

  const copyCredentialsToClipboard = (creds) => {
    if (!creds) return;
    const appUrl = window.location.origin;
    const text = `=== CREDENCIALES SMART PARK ===\n` +
      `Sede: ${creds.parkingName}\n` +
      `Plataforma: ${appUrl}\n` +
      `Usuario / Correo: ${creds.email}\n` +
      `Contraseña: ${creds.password}\n` +
      `Rol: Administrador de Sede (Local)\n` +
      (creds.phone ? `Teléfono: ${creds.phone}\n` : '') +
      `==============================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenAdd = () => {
    const autoPass = generateSecurePassword('SP');
    setFormData({ 
      name: '', 
      address: '', 
      city: 'Ayacucho - Huamanga', 
      level: 'Nivel 1 - Superficie',
      rate: 5.00, 
      commission: '12%', 
      owner: 'Inversiones Ayacucho S.A.C.',
      phone: '',
      createAdminAccount: true,
      adminEmail: '',
      adminPassword: autoPass,
      showAdminPassword: false
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedParking(p);
    setFormData({
      name: p.name,
      address: p.address || '',
      city: p.city || 'Ayacucho - Huamanga',
      level: p.level || 'Nivel 1 - Superficie',
      rate: p.rate || 5.00,
      commission: p.commission || '12%',
      owner: p.owner || 'Socio Comercial',
      phone: p.phone || '',
      allow_open_stay: p.allow_open_stay !== false,
      createAdminAccount: false,
      adminEmail: '',
      adminPassword: '',
      showAdminPassword: false
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const defaultNewElements = [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 60, y: 280, w: 980, h: 120, rot: 0, label: 'CARRIL VIAL PRINCIPAL' },
      { id: 6, type: 'crosswalk', x: 520, y: 280, w: 80, h: 120, rot: 0 },
      { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'GARITA ANPR' },
      { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'moto', x: 165, y: 470, w: 50, h: 140, rot: 0, status: 'free' }
    ];

    const newObj = {
      id: `EST-${Math.floor(10 + Math.random() * 90)}`,
      name: formData.name,
      address: formData.address || 'Jr. 28 de Julio 100',
      city: formData.city || 'Ayacucho - Huamanga',
      level: formData.level || 'Nivel 1 - Superficie',
      rate: Number(formData.rate) || 5.00,
      commission: formData.commission || '12%',
      owner: formData.owner || 'Socio Comercial',
      phone: formData.phone || '',
      status: 'Operativo',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
      elements: defaultNewElements
    };

    let adminCredentials = null;
    if (formData.createAdminAccount && formData.adminEmail && formData.adminPassword) {
      adminCredentials = {
        email: formData.adminEmail.trim(),
        password: formData.adminPassword,
        full_name: formData.owner || formData.name,
        phone: formData.phone || ''
      };
    }

    await addEstablishment(newObj, adminCredentials);
    setShowAddModal(false);
    notify(`Establecimiento "${newObj.name}" afiliado a la red.`);

    if (adminCredentials) {
      setCredentialsResult({
        title: '¡Sede Creada y Administrador Asignado!',
        parkingName: newObj.name,
        email: adminCredentials.email,
        password: adminCredentials.password,
        role: 'Administrador de Sede (Local)',
        phone: adminCredentials.phone,
        ownerName: adminCredentials.full_name
      });
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!selectedParking) return;

    const updated = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      level: formData.level,
      rate: Number(formData.rate),
      commission: formData.commission,
      owner: formData.owner,
      phone: formData.phone,
      allow_open_stay: formData.allow_open_stay !== false
    };

    updateEstablishment(selectedParking.id, updated);
    setShowEditModal(false);
    notify(`Establecimiento "${formData.name}" actualizado.`);
  };

  const toggleStatus = (id) => {
    const target = establishments.find(p => p.id === id);
    if (!target) return;
    const nextStatus = target.status === 'Operativo' ? 'Mantenimiento' : 'Operativo';

    updateEstablishment(id, { status: nextStatus });
    notify(`Estado de "${target.name}" cambiado a ${nextStatus}.`);
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Seguro que deseas dar de baja el establecimiento "${name}"?`)) return;
    deleteEstablishment(id);
    notify(`Establecimiento "${name}" eliminado de la red.`);
  };

  // Abrir Modal para Aprobar Solicitud con formulario de credenciales
  const handleOpenApproveModal = (req) => {
    setApprovingRequest(req);
    const suggestedPassword = generateSecurePassword('SP');
    setApproveForm({
      adminEmail: req.email || '',
      adminPassword: suggestedPassword,
      adminName: req.ownerName || '',
      adminPhone: req.phone || '',
      showPassword: false
    });
    setShowApproveModal(true);
  };

  // Confirmar Aprobación con Credenciales
  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!approvingRequest) return;
    setApprovingLoading(true);

    try {
      const chosenPassword = approveForm.adminPassword;
      const chosenEmail = approveForm.adminEmail.trim();
      const chosenName = approveForm.adminName.trim();
      const chosenPhone = approveForm.adminPhone.trim();

      const res = await approveAffiliationRequest(approvingRequest.id, {
        admin_email: chosenEmail,
        admin_password: chosenPassword,
        admin_name: chosenName,
        admin_phone: chosenPhone,
        adminEmail: chosenEmail,
        adminPassword: chosenPassword,
        adminName: chosenName,
        adminPhone: chosenPhone
      });

      setShowApproveModal(false);

      const resultingPassword = res?.admin_password || res?.admin_credentials?.temporary_password || chosenPassword;
      const resultingEmail = res?.admin_email || res?.admin_credentials?.email || chosenEmail;

      // Mostrar modal con credenciales listas para compartir
      setCredentialsResult({
        title: '¡Sede Aprobada y Activada Exitosamente!',
        parkingName: approvingRequest.parkingName,
        email: resultingEmail,
        password: resultingPassword,
        role: 'Administrador de Sede (Local)',
        phone: chosenPhone,
        ownerName: chosenName
      });

      notify(`✓ Solicitud aprobada: "${approvingRequest.parkingName}" activada en el sistema`);
    } catch (err) {
      notify(`Error al aprobar solicitud: ${err.message || 'Error inesperado'}`);
    } finally {
      setApprovingLoading(false);
    }
  };

  // Handler para Rechazar Solicitud de Cochera
  const handleRejectRequest = (req) => {
    if (!window.confirm(`¿Rechazar la solicitud de "${req.parkingName}"?`)) return;
    rejectAffiliationRequest(req.id, 'No cumple con los requisitos del local');
    notify(`Solicitud de "${req.parkingName}" rechazada.`);
  };

  // Abrir Modal de Credenciales para Sede Activa
  const handleOpenCredentialsModal = async (parking) => {
    setCredentialsSede(parking);
    setShowCredentialsModal(true);
    setCredentialsLoading(true);

    try {
      const info = await getParkingCredentials(parking.id);
      const email = (info?.admin_email || info?.email || parking.email || '').trim();
      const name = (info?.admin_name || info?.full_name || parking.owner || '').trim();
      const phone = (info?.admin_phone || info?.phone || parking.phone || '').trim();
      const hasExisting = !!(info?.has_account || info?.has_admin || info?.admin_email || parking.email);

      if (hasExisting) {
        setCredentialsForm({
          adminEmail: email,
          previousEmail: email,
          adminPassword: '',
          adminName: name,
          adminPhone: phone,
          showPassword: false,
          hasExistingAdmin: true
        });
      } else {
        const autoPass = generateSecurePassword('SP');
        setCredentialsForm({
          adminEmail: email,
          previousEmail: email,
          adminPassword: autoPass,
          adminName: name,
          adminPhone: phone,
          showPassword: false,
          hasExistingAdmin: false
        });
      }
    } catch (err) {
      console.warn('Error fetching credentials', err);
    } finally {
      setCredentialsLoading(false);
    }
  };

  // Guardar o Actualizar Credenciales de Sede Activa
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!credentialsSede) return;
    if (!credentialsForm.adminEmail) {
      alert('El correo electrónico es requerido');
      return;
    }

    setSavingCredentials(true);
    try {
      const email = credentialsForm.adminEmail.trim().toLowerCase();
      const fullName = credentialsForm.adminName.trim();
      const phone = credentialsForm.adminPhone.trim();
      const password = credentialsForm.adminPassword ? credentialsForm.adminPassword.trim() : undefined;
      const previousEmail = credentialsForm.previousEmail ? credentialsForm.previousEmail.trim().toLowerCase() : undefined;

      const payload = {
        email,
        full_name: fullName,
        fullName: fullName,
        phone,
        previous_email: previousEmail,
        previousEmail: previousEmail
      };
      if (password) {
        payload.password = password;
      }

      const res = await assignParkingCredentials(credentialsSede.id, payload);
      setShowCredentialsModal(false);

      setCredentialsResult({
        title: 'Credenciales de Sede Actualizadas',
        parkingName: credentialsSede.name,
        email,
        password: password || res?.temp_password || '(Contraseña actual mantenida sin cambios)',
        role: 'Administrador de Sede (Local)',
        phone,
        ownerName: fullName
      });

      notify(`✓ Credenciales guardadas para "${credentialsSede.name}"`);
    } catch (err) {
      notify(`Error al actualizar credenciales: ${err.message || 'Error'}`);
    } finally {
      setSavingCredentials(false);
    }
  };

  const filteredEstablishments = establishments.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-600" />
            <span>Red de Estacionamientos & Afiliaciones</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administra las sedes activas, asigna credenciales a los administradores de local y gestiona las solicitudes entrantes.
          </p>
        </div>

        {/* Pestañas Sub-Navegación */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('establishments')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeSubTab === 'establishments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Sedes Activas ({establishments.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 relative ${
              activeSubTab === 'requests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4 shrink-0" />
            <span>Solicitudes de Afiliación</span>
            {pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: SEDES ACTIVAS
          ========================================================================= */}
      {activeSubTab === 'establishments' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controles de filtro y botón crear */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="operativo">Solo Operativos</option>
                <option value="mantenimiento">En Mantenimiento</option>
              </select>
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 shrink-0 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar sede o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <Button onClick={handleOpenAdd} className="w-full sm:w-auto gap-2 font-bold shadow-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9">
              <Plus className="w-4 h-4" />
              <span>Nueva Sede Manual</span>
            </Button>
          </div>

          {/* Grid de Sedes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEstablishments.map((p) => {
              const elements = p.elements || [];
              const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

              return (
                <Card key={p.id} className="p-5 border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition group rounded-3xl bg-white">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        ● {p.status}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base mb-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{p.city || 'Ayacucho'} • {p.address}</span>
                    </p>

                    <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                      <p className="flex justify-between text-slate-600">
                        <span>Capacidad Total:</span>
                        <span className="font-bold text-slate-900">{totalSlots} Plazas</span>
                      </p>
                      <p className="flex justify-between text-slate-600">
                        <span>Tarifa / Hora:</span>
                        <span className="font-bold text-emerald-700">S/ {Number(p.rate).toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between text-slate-600">
                        <span>Titular / Operador:</span>
                        <span className="text-slate-800 font-semibold truncate max-w-[140px]">{p.owner || 'Comercial'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    {/* Botón de Credenciales Superadmin */}
                    <Button 
                      onClick={() => handleOpenCredentialsModal(p)}
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs font-bold rounded-xl h-8.5 border-amber-300 text-amber-900 bg-amber-50/60 hover:bg-amber-100/80 flex items-center justify-center gap-1.5 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Credenciales de Acceso</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => toggleStatus(p.id)} 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs font-bold rounded-xl h-8"
                      >
                        {p.status === 'Operativo' ? 'Pausar' : 'Reanudar'}
                      </Button>
                      <Button 
                        onClick={() => handleOpenEdit(p)} 
                        variant="ghost" 
                        size="sm" 
                        className="p-2 text-slate-600 hover:text-slate-900 rounded-xl"
                        title="Editar información de sede"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(p.id, p.name)} 
                        variant="ghost" 
                        size="sm" 
                        className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                        title="Eliminar sede"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: SOLICITUDES DE AFILIACIÓN DE COCHERAS (BANDEJA DE APROBACIÓN)
          ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4 animate-fade-in">
          
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
            <Inbox className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Bandeja de Solicitudes de Nuevas Cocheras</p>
              <p className="text-amber-800 leading-relaxed">
                Cuando un propietario solicita afiliar su establecimiento, sus datos aparecen aquí. Al presionar <strong>"Aprobar y Asignar Credenciales"</strong>, podrás configurar o generar su contraseña segura, crear la cuenta oficial con rol <strong>local</strong> y enviarle sus credenciales por WhatsApp en 1 clic.
              </p>
            </div>
          </div>

          {affiliationRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No hay solicitudes pendientes</h3>
              <p className="text-xs text-slate-400">Las nuevas solicitudes que envíen los propietarios aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {affiliationRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';

                return (
                  <Card key={req.id} className="p-5 border-slate-200 rounded-3xl bg-white shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      
                      {/* Estado y Fecha */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isPending && <Clock className="w-4 h-4 shrink-0" />}
                          {isApproved && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {!isPending && !isApproved && <XCircle className="w-4 h-4 shrink-0" />}
                          <span>{req.status === 'PENDING' ? 'Pendiente de Aprobación' : req.status === 'APPROVED' ? 'Aprobada & Activa' : 'Rechazada'}</span>
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {req.id}
                        </span>
                      </div>

                      {/* Nombre y Contacto */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{req.parkingName}</h3>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Titular: <strong className="text-slate-800">{req.ownerName}</strong>
                        </p>
                      </div>

                      {/* Grid de Datos */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">CORREO ACCESO:</span>
                          <span className="font-bold text-slate-800 truncate block">{req.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">TELÉFONO:</span>
                          <span className="font-bold text-slate-800">{req.phone || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">DIRECCIÓN:</span>
                          <span className="text-slate-700 truncate block">{req.address}, {req.city}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">CAPACIDAD / TARIFA:</span>
                          <span className="font-bold text-emerald-700">{req.capacity} plazas • S/ {Number(req.rate).toFixed(2)}/h</span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{req.notes}"
                        </p>
                      )}

                    </div>

                    {/* Botones de Acción para el Administrador del Sistema */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <Button
                          onClick={() => handleRejectRequest(req)}
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl h-9 px-3"
                        >
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleOpenApproveModal(req)}
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Aprobar y Asignar Credenciales</span>
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cuenta habilitada ({req.email})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Sede Operativa</span>
                      </div>
                    )}

                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          MODAL 1: APROBAR COCHERA Y ASIGNAR CREDENCIALES
          ========================================================================= */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Aprobar Sede y Asignar Credenciales</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Crea la cuenta de usuario para el administrador de <strong>"{approvingRequest?.parkingName}"</strong> con rol de local.
            </DialogDescription>
          </DialogHeader>

          {approvingRequest && (
            <form onSubmit={handleConfirmApprove} className="space-y-4 mt-2">
              {/* Resumen del establecimiento */}
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{approvingRequest.parkingName}</span>
                  <span className="text-emerald-700 font-black">S/ {Number(approvingRequest.rate).toFixed(2)}/h</span>
                </p>
                <p className="text-slate-500 text-[11px] truncate">
                  {approvingRequest.address}, {approvingRequest.city} • {approvingRequest.capacity} plazas
                </p>
              </div>

              {/* Correo / Usuario */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Correo Electrónico (Usuario de Acceso) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    value={approveForm.adminEmail}
                    onChange={(e) => setApproveForm({ ...approveForm, adminEmail: e.target.value })}
                    placeholder="propietario@ejemplo.com"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Nombre del Administrador */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                  <Input
                    type="text"
                    value={approveForm.adminName}
                    onChange={(e) => setApproveForm({ ...approveForm, adminName: e.target.value })}
                    placeholder="Juan Pérez"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={approveForm.adminPhone}
                      onChange={(e) => setApproveForm({ ...approveForm, adminPhone: e.target.value })}
                      placeholder="966 123 456"
                      className="pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Contraseña de Acceso *</label>
                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, adminPassword: generateSecurePassword('SP') })}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Regenerar</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={approveForm.showPassword ? "text" : "password"}
                    required
                    value={approveForm.adminPassword}
                    onChange={(e) => setApproveForm({ ...approveForm, adminPassword: e.target.value })}
                    placeholder="Contraseña segura"
                    className="pl-9 pr-10 text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, showPassword: !approveForm.showPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {approveForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  El propietario podrá iniciar sesión inmediatamente con este usuario y contraseña.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowApproveModal(false)} 
                  disabled={approvingLoading}
                  className="flex-1 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={approvingLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  {approvingLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando Cuenta...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Aprobar y Habilitar</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: GESTIONAR CREDENCIALES DE SEDE ACTIVA
          ========================================================================= */}
      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <span>Credenciales de Acceso</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Administra el usuario y contraseña del administrador del local para <strong>"{credentialsSede?.name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          {credentialsLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <p className="text-xs">Consultando credenciales...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveCredentials} className="space-y-4 mt-2">
              {credentialsForm.hasExistingAdmin ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Esta sede ya tiene una cuenta activa vinculada:</p>
                    <p className="font-mono text-[11px] mt-0.5">{credentialsForm.adminEmail}</p>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      Si especificas una nueva contraseña abajo, se actualizará. De lo contrario, se conservará la contraseña existente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Sin cuenta asignada todavía</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Ingresa el correo y genera una contraseña para crear el usuario con rol "local".
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    value={credentialsForm.adminEmail}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, adminEmail: e.target.value })}
                    placeholder="admin@cochera.com"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                  <Input
                    type="text"
                    value={credentialsForm.adminName}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, adminName: e.target.value })}
                    placeholder="Nombre del encargado"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={credentialsForm.adminPhone}
                      onChange={(e) => setCredentialsForm({ ...credentialsForm, adminPhone: e.target.value })}
                      placeholder="966 000 000"
                      className="pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {credentialsForm.hasExistingAdmin ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCredentialsForm({ ...credentialsForm, adminPassword: generateSecurePassword('SP') })}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar Segura</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={credentialsForm.showPassword ? "text" : "password"}
                    required={!credentialsForm.hasExistingAdmin}
                    value={credentialsForm.adminPassword}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, adminPassword: e.target.value })}
                    placeholder={credentialsForm.hasExistingAdmin ? "Dejar en blanco para mantener la actual" : "Contraseña de acceso"}
                    className="pl-9 pr-10 text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setCredentialsForm({ ...credentialsForm, showPassword: !credentialsForm.showPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {credentialsForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCredentialsModal(false)}
                  disabled={savingCredentials}
                  className="flex-1 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={savingCredentials}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  {savingCredentials ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Credenciales</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: DIÁLOGO DE CREDENCIALES RESULTANTES (COPIAR & WHATSAPP)
          ========================================================================= */}
      <Dialog open={!!credentialsResult} onOpenChange={(open) => !open && setCredentialsResult(null)}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900 text-center">
              {credentialsResult?.title || 'Credenciales Listas'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-center">
              Comparte las credenciales oficiales de acceso con el administrador del local.
            </DialogDescription>
          </DialogHeader>

          {credentialsResult && (
            <div className="space-y-4 mt-2">
              {/* Tarjeta Visual de Credenciales */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 font-mono text-xs border border-slate-800">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <span className="truncate max-w-[200px]">{credentialsResult.parkingName}</span>
                  <span className="text-emerald-400 font-bold">ROL: LOCAL</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ENLACE DE ACCESO:</span>
                  <span className="text-slate-200 text-xs break-all">{window.location.origin}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">USUARIO / CORREO:</span>
                  <span className="text-emerald-400 font-bold text-sm select-all">{credentialsResult.email}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">CONTRASEÑA:</span>
                  <span className="text-amber-300 font-bold text-sm tracking-wider select-all">{credentialsResult.password}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => copyCredentialsToClipboard(credentialsResult)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl h-10 flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiado al Portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Copiar Credenciales</span>
                      </>
                    )}
                  </Button>

                  {getWhatsAppMessageUrl(credentialsResult) && (
                    <a
                      href={getWhatsAppMessageUrl(credentialsResult)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-10 flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Enviar WhatsApp</span>
                    </a>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => setCredentialsResult(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9"
                >
                  Entendido / Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 4: CREAR AFILIADO MANUAL
          ========================================================================= */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Afiliar Nueva Sede Manualmente</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra un nuevo local comercial y asígnale su cuenta de administrador de local.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial del Local *</label>
              <Input
                required
                placeholder="Ej. Smart Park Jr. Cusco"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección Exacta *</label>
              <Input
                required
                placeholder="Ej. Jr. Cusco 320"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad / Distrito</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa por Hora (S/)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Titular / Empresa</label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Inversiones Ayacucho"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="966 123 456"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Credenciales de Acceso para el Local */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createAdminAccount}
                  onChange={(e) => setFormData({ ...formData, createAdminAccount: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crear cuenta de acceso para el Administrador del Local</span>
                </span>
              </label>

              {formData.createAdminAccount && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Correo de Acceso (Usuario) *</label>
                    <Input
                      type="email"
                      required={formData.createAdminAccount}
                      placeholder="admin@cochera.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="text-xs bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Contraseña de Acceso *</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, adminPassword: generateSecurePassword('SP') })}
                        className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Regenerar</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={formData.showAdminPassword ? "text" : "password"}
                        required={formData.createAdminAccount}
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        className="text-xs bg-white pr-9 font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, showAdminPassword: !formData.showAdminPassword })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {formData.showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                Guardar Sede
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 5: EDITAR AFILIADO
          ========================================================================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Editar Sede</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifica los datos operativos de esta sede afiliada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dirección</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tarifa (S/)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Titular</label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Habilitar opción "Hora (Libre)"</span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.allow_open_stay !== false}
                  onChange={(e) => setFormData({ ...formData, allow_open_stay: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
