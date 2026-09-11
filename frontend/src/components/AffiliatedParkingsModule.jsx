import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Building2, 
  Store,
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
  Loader2,
  Settings,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { useEstablishments, getEstablishmentHierarchy } from '../context/EstablishmentContext';

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
    company_name: '',
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
  const [credentialsTarget, setCredentialsTarget] = useState(null);
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

  // Estados para Ajustes de Empresa Comercial (Matriz)
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyFormData, setCompanyFormData] = useState({
    originalName: '',
    company_name: '',
    owner: '',
    ruc: '',
    phone: '',
    email: '',
    city: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

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

  const handleOpenAdd = (parentGroup = null) => {
    const autoPass = generateSecurePassword('SP');
    const companyName = parentGroup?.companyName || '';
    setFormData({ 
      name: companyName ? `${companyName} - Sucursal ` : '', 
      company_name: companyName,
      address: '', 
      city: parentGroup?.city || 'Ayacucho - Huamanga', 
      level: 'Nivel 1 - Superficie',
      rate: 5.00, 
      commission: '12%', 
      owner: parentGroup?.owner || 'Inversiones Ayacucho S.A.C.',
      phone: parentGroup?.phone || '',
      createAdminAccount: !companyName,
      adminEmail: '',
      adminPassword: autoPass,
      showAdminPassword: false
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    const hierarchy = getEstablishmentHierarchy(p);
    setSelectedParking(p);
    setFormData({
      name: p.name,
      company_name: p.company_name || p.companyName || hierarchy.companyName || '',
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

    const hierarchy = getEstablishmentHierarchy({ name: formData.name, company_name: formData.company_name });
    const effectiveCompany = (formData.company_name || hierarchy.companyName || formData.name).trim();

    const newObj = {
      id: `EST-${Math.floor(10 + Math.random() * 90)}`,
      name: formData.name,
      company_name: effectiveCompany,
      companyName: effectiveCompany,
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

    const hierarchy = getEstablishmentHierarchy({ name: formData.name, company_name: formData.company_name });
    const effectiveCompany = (formData.company_name || hierarchy.companyName || formData.name).trim();

    const updated = {
      name: formData.name,
      company_name: effectiveCompany,
      companyName: effectiveCompany,
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

  // --- ACCIONES A NIVEL DE EMPRESA / MATRIZ ---
  const handleOpenEditCompany = (group) => {
    setSelectedCompany(group);
    setCompanyFormData({
      originalName: group.companyName,
      company_name: group.companyName,
      owner: group.owner || '',
      ruc: group.ruc || '',
      phone: group.phone || '',
      email: group.email || '',
      city: group.city || 'Ayacucho - Huamanga'
    });
    setShowEditCompanyModal(true);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    const newCompanyName = (companyFormData.company_name || '').trim();
    if (!newCompanyName) {
      alert('El nombre de la empresa es obligatorio.');
      return;
    }

    setSavingCompany(true);
    try {
      const branches = selectedCompany.branches || [];
      for (const branch of branches) {
        let newBranchName = branch.name;
        if (branch.branchDisplayName && branch.branchDisplayName !== branch.name) {
          newBranchName = `${newCompanyName} - ${branch.branchDisplayName}`;
        } else if (branches.length === 1 && (branch.name === selectedCompany.companyName || !branch.isBranch)) {
          newBranchName = newCompanyName;
        }

        await updateEstablishment(branch.id, {
          name: newBranchName,
          company_name: newCompanyName,
          companyName: newCompanyName,
          owner: companyFormData.owner,
          ruc: companyFormData.ruc,
          phone: companyFormData.phone,
          email: companyFormData.email,
          city: companyFormData.city
        });
      }

      setShowEditCompanyModal(false);
      notify(`Empresa "${newCompanyName}" actualizada con éxito.`);
    } catch (err) {
      console.error('Error al guardar ajustes de empresa', err);
      notify('Error al actualizar la empresa.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleToggleCompanyStatus = async (group) => {
    const isCurrentlyActive = group.activeBranchesCount > 0;
    const nextStatus = isCurrentlyActive ? 'Mantenimiento' : 'Operativo';
    const actionLabel = isCurrentlyActive ? 'deshabilitar' : 'habilitar';

    if (!window.confirm(`¿Deseas ${actionLabel} la empresa "${group.companyName}" y actualizar sus ${group.branches.length} sedes al estado "${nextStatus}"?`)) {
      return;
    }

    try {
      for (const branch of group.branches) {
        await updateEstablishment(branch.id, { status: nextStatus });
      }
      notify(`Empresa "${group.companyName}" ${isCurrentlyActive ? 'deshabilitada' : 'habilitada'} con éxito.`);
    } catch (err) {
      console.error('Error al cambiar estado de la empresa', err);
      notify('Error al cambiar estado de la empresa.');
    }
  };

  const handleDeleteCompany = async (group) => {
    const count = group.branches.length;
    if (!window.confirm(`⚠️ ACCIÓN DE SUPERADMIN:\n\n¿Estás seguro de que deseas ELIMINAR permanentemente la empresa "${group.companyName}" y sus ${count} sedes asociadas?\n\nEsta acción es irreversible y eliminará todos sus accesos y configuraciones.`)) {
      return;
    }

    try {
      for (const branch of group.branches) {
        await deleteEstablishment(branch.id);
      }
      notify(`Empresa "${group.companyName}" y sus ${count} sedes han sido eliminadas.`);
    } catch (err) {
      console.error('Error al eliminar empresa', err);
      notify('Error al eliminar la empresa.');
    }
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

  // Abrir Modal de Credenciales para el Local (Empresa Afiliada)
  const handleOpenCredentialsModal = async (target) => {
    const isGroup = !!(target?.companyName && Array.isArray(target?.branches));
    const branches = isGroup ? target.branches : (target ? [target] : []);
    const primaryBranch = isGroup ? (target.branches.find(b => b.email) || target.branches[0]) : target;
    const companyName = isGroup ? target.companyName : (target?.company_name || target?.name || 'Local Comercial');

    setCredentialsTarget({
      isGroup,
      companyName,
      branchesCount: branches.length,
      branches,
      owner: isGroup ? target.owner : target?.owner,
      email: isGroup ? target.email : target?.email,
      phone: isGroup ? target.phone : target?.phone
    });
    setCredentialsSede(primaryBranch);
    setShowCredentialsModal(true);
    setCredentialsLoading(true);

    try {
      const info = primaryBranch?.id ? await getParkingCredentials(primaryBranch.id) : null;
      const email = (info?.admin_email || info?.email || target?.email || primaryBranch?.email || '').trim();
      const name = (info?.admin_name || info?.full_name || target?.owner || primaryBranch?.owner || '').trim();
      const phone = (info?.admin_phone || info?.phone || target?.phone || primaryBranch?.phone || '').trim();
      const hasExisting = !!(info?.has_account || info?.has_admin || info?.admin_email || email);

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

  // Guardar o Actualizar Credenciales del Local (Empresa Afiliada)
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

      // Sincronizar todas las sucursales de la empresa para que queden vinculadas al administrador
      const branchesToSync = credentialsTarget?.branches || [];
      for (const branch of branchesToSync) {
        if (branch.id !== credentialsSede.id) {
          try {
            await updateEstablishment(branch.id, {
              email,
              owner: fullName,
              phone: phone || branch.phone
            });
          } catch (errBranch) {
            console.warn(`Error al sincronizar credenciales en sucursal ${branch.id}:`, errBranch);
          }
        }
      }

      setShowCredentialsModal(false);

      const targetTitle = credentialsTarget?.companyName || credentialsSede.name;
      setCredentialsResult({
        title: 'Credenciales del Administrador del Local',
        parkingName: targetTitle,
        email,
        password: password || res?.temp_password || '(Contraseña actual mantenida sin cambios)',
        role: 'Administrador de Sede (Local)',
        phone,
        ownerName: fullName
      });

      notify(`✓ Credenciales guardadas para el local "${targetTitle}"`);
    } catch (err) {
      notify(`Error al actualizar credenciales: ${err.message || 'Error'}`);
    } finally {
      setSavingCredentials(false);
    }
  };

  const filteredEstablishments = establishments.filter(p => {
    const q = search.toLowerCase().trim();
    const matchesSearch = 
      p.name.toLowerCase().includes(q) || 
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.company_name && p.company_name.toLowerCase().includes(q)) ||
      (p.owner && p.owner.toLowerCase().includes(q));
    
    const s = (p.status || '').toLowerCase();
    const sf = statusFilter.toLowerCase();
    const matchesStatus = sf === 'all' || 
      (sf === 'operativo' && (s === 'operativo' || s === 'active')) ||
      (sf === 'mantenimiento' && (s === 'mantenimiento' || s === 'maintenance')) ||
      s === sf;
    return matchesSearch && matchesStatus;
  });

  // Agrupación jerárquica: Empresa / Matriz -> Sedes y Sucursales
  const companyGroups = React.useMemo(() => {
    const groups = new Map();

    filteredEstablishments.forEach((p) => {
      const hierarchy = getEstablishmentHierarchy(p);
      const companyName = (p.company_name || p.companyName || hierarchy.companyName || p.name).trim();
      const branchDisplayName = hierarchy.branchName || p.name;
      const groupKey = companyName.toLowerCase().trim();

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          companyName: companyName,
          owner: p.owner || 'Comercial',
          ruc: p.ruc || '',
          phone: p.phone || '',
          email: p.email || p.admin_email || '',
          city: p.city || 'Ayacucho - Huamanga',
          branches: [],
          totalSlots: 0,
          activeBranchesCount: 0
        });
      }

      const g = groups.get(groupKey);
      const elements = p.elements || [];
      const calculatedSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

      g.branches.push({
        ...p,
        branchDisplayName,
        calculatedSlots
      });
      g.totalSlots += calculatedSlots;
      if (p.status === 'Operativo' || p.status === 'active') {
        g.activeBranchesCount += 1;
      }

      if (!g.phone && p.phone) g.phone = p.phone;
      if (!g.ruc && p.ruc) g.ruc = p.ruc;
      if (!g.email && (p.email || p.admin_email)) g.email = p.email || p.admin_email;
    });

    return Array.from(groups.values());
  }, [filteredEstablishments]);

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
            Administra las empresas y sus sedes activas, asigna credenciales a los administradores y gestiona solicitudes.
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
            <span>Empresas & Sedes ({companyGroups.length} emp. / {establishments.length} sedes)</span>
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
          VISTA 1: EMPRESAS Y SUS RESPECTIVAS SEDES / SUCURSALES
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
                  placeholder="Buscar empresa, sede o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <Button onClick={() => handleOpenAdd(null)} className="w-full sm:w-auto gap-2 font-bold shadow-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9">
              <Plus className="w-4 h-4" />
              <span>Nueva Empresa / Sede Manual</span>
            </Button>
          </div>

          {/* Listado Agrupado: Empresa Matriz -> Sedes contenidas */}
          {companyGroups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No se encontraron empresas ni sedes</h3>
              <p className="text-xs text-slate-400">
                {search ? `No hay coincidencias para "${search}".` : 'Registra la primera empresa o sede para comenzar.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {companyGroups.map((group) => (
                <div 
                  key={group.key} 
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5 sm:p-6 transition hover:border-slate-300"
                >
                  {/* CABECERA DE LA EMPRESA */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="p-3 rounded-2xl bg-slate-900 text-emerald-400 shrink-0 shadow-sm">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                            Empresa Comercial
                          </span>
                          {group.activeBranchesCount > 0 ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              ● Activa
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              ● Deshabilitada
                            </span>
                          )}
                          {group.ruc && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              RUC: {group.ruc}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-500">
                            {group.activeBranchesCount} de {group.branches.length} sedes operativas
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                          {group.companyName}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {group.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{group.city}</span>
                            </span>
                          )}
                          {group.owner && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">Titular: {group.owner}</span>
                            </span>
                          )}
                          {group.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{group.phone}</span>
                            </span>
                          )}
                          {group.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{group.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Métricas y Barra de Acciones de Empresa */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedes</div>
                          <div className="font-black text-slate-900 font-mono text-sm leading-none">{group.branches.length}</div>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacidad Global</div>
                          <div className="font-bold text-emerald-700 font-mono text-xs leading-none">
                            {group.totalSlots} Plazas
                          </div>
                        </div>
                      </div>

                      {/* Botón Deshabilitar / Habilitar Empresa */}
                      {group.activeBranchesCount > 0 ? (
                        <Button
                          type="button"
                          onClick={() => handleToggleCompanyStatus(group)}
                          variant="outline"
                          size="sm"
                          className="border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100 text-xs font-bold rounded-xl h-10 px-3 gap-1.5 cursor-pointer transition shadow-2xs"
                          title={`Deshabilitar empresa y pausar sus ${group.branches.length} sedes`}
                        >
                          <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Deshabilitar</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleToggleCompanyStatus(group)}
                          variant="outline"
                          size="sm"
                          className="border-emerald-300 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-bold rounded-xl h-10 px-3 gap-1.5 cursor-pointer transition shadow-2xs"
                          title={`Habilitar empresa y activar sus ${group.branches.length} sedes`}
                        >
                          <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Habilitar</span>
                        </Button>
                      )}

                      {/* Botón Credenciales del Local (Empresa Afiliada) */}
                      <Button
                        type="button"
                        onClick={() => handleOpenCredentialsModal(group)}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-950 bg-amber-50/90 hover:bg-amber-100 text-xs font-bold rounded-xl h-10 px-3.5 gap-2 cursor-pointer transition shadow-2xs flex items-center"
                        title={`Credenciales de acceso del Administrador para ${group.companyName}`}
                      >
                        <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Credenciales de Acceso</span>
                      </Button>

                      {/* Botón Ajustes de Empresa */}
                      <Button
                        type="button"
                        onClick={() => handleOpenEditCompany(group)}
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold rounded-xl h-10 px-3 gap-1.5 cursor-pointer transition"
                        title="Ajustes de empresa matriz"
                      >
                        <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Ajustes</span>
                      </Button>

                      {/* Botón Eliminar Empresa */}
                      <Button
                        type="button"
                        onClick={() => handleDeleteCompany(group)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-10 px-2.5 cursor-pointer transition"
                        title="Eliminar empresa y todas sus sedes"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      {/* Botón Nueva Sede */}
                      <Button
                        type="button"
                        onClick={() => handleOpenAdd(group)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm rounded-xl h-10 px-3.5 shrink-0 cursor-pointer"
                        title={`Nueva sede para ${group.companyName}`}
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Nueva Sede</span>
                      </Button>
                    </div>
                  </div>

                  {/* SUB-GRID DE SEDES Y SUCURSALES DE ESTA EMPRESA */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>Sedes Registradas ({group.branches.length})</span>
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Gestión individual de accesos, tarifas y operatividad
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.branches.map((p) => {
                        return (
                          <Card 
                            key={p.id} 
                            className="p-4 border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition group rounded-2xl bg-white"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
                                    <Building2 className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-slate-900 text-sm truncate leading-tight">
                                      {p.branchDisplayName || p.name}
                                    </h4>
                                    {p.branchDisplayName && p.branchDisplayName !== p.name && (
                                      <p className="text-[10px] text-slate-400 truncate">{p.name}</p>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                  p.status === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  ● {p.status}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{p.address} {p.level ? `• ${p.level}` : ''}</span>
                              </p>

                              <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                                <p className="flex justify-between text-slate-600 text-[11px]">
                                  <span>Capacidad:</span>
                                  <span className="font-bold text-slate-900">{p.calculatedSlots} Plazas</span>
                                </p>
                                <p className="flex justify-between text-slate-600 text-[11px]">
                                  <span>Tarifa / Hora:</span>
                                  <span className="font-bold text-emerald-700">S/ {Number(p.rate).toFixed(2)}</span>
                                </p>
                                <p className="flex justify-between text-slate-600 text-[11px]">
                                  <span>Comisión:</span>
                                  <span className="text-slate-800 font-semibold">{p.commission || '12%'}</span>
                                </p>
                                <p className="flex justify-between text-slate-600 text-[11px]">
                                  <span>Titular Local:</span>
                                  <span className="text-slate-800 font-semibold truncate max-w-[130px]">{p.owner || group.owner}</span>
                                </p>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100">
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VISTA 2: SOLICITUDES DE AFILIACIÓN DE COCHERAS (BANDEJA DE APROBACIÓN)
          ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4 animate-fade-in">

          {affiliationRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No hay solicitudes pendientes</h3>
              <p className="text-xs text-slate-400">Las nuevas solicitudes aparecerán aquí para su revisión y alta.</p>
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
                          <span>{req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}</span>
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
                          <span className="text-slate-400 block text-[10px]">Correo:</span>
                          <span className="font-bold text-slate-800 truncate block">{req.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Teléfono:</span>
                          <span className="font-bold text-slate-800">{req.phone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Ubicación:</span>
                          <span className="text-slate-700 truncate block">{req.address}, {req.city}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Capacidad & Tarifa:</span>
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
                          <span>Aprobar Sede</span>
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Habilitada ({req.email})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Operativa</span>
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
              <span>Aprobar Sede</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Crea la cuenta de usuario para el administrador de <strong>"{approvingRequest?.parkingName}"</strong>.
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
              <span>Credenciales de Acceso del Local</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Administra el usuario y contraseña del Administrador para el local (empresa afiliada) <strong>"{credentialsTarget?.companyName || credentialsSede?.name}"</strong>.
              {credentialsTarget?.branchesCount > 1 && (
                <span className="block mt-1 text-[11px] text-emerald-700 font-semibold">
                  ✓ Este acceso es unificado para la empresa y le permite gestionar sus {credentialsTarget.branchesCount} sucursales registradas.
                </span>
              )}
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
                    <p className="font-bold">Este local ya cuenta con un Administrador activo:</p>
                    <p className="font-mono text-[11px] mt-0.5">{credentialsForm.adminEmail}</p>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      Si especificas una nueva contraseña abajo, se actualizará. De lo contrario, se conservará la contraseña actual.
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
              <label className="text-xs font-bold text-slate-700 block mb-1">Empresa / Razón Social (Matriz)</label>
              <Input
                placeholder="Ej. Inversiones Plaza S.A.C."
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="text-xs"
              />
              <span className="text-[10px] text-slate-400">Si pertenece a una empresa registrada, se agrupará bajo ella automáticamente.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de la Sede / Sucursal *</label>
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
              {formData.company_name ? (
                <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Credenciales Unificadas del Local</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Esta sucursal pertenecerá al local <strong>"{formData.company_name}"</strong>. El Administrador del Local gestionará esta sucursal con sus credenciales actuales. No requiere crear usuarios adicionales.
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                </>
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
              <label className="text-xs font-bold text-slate-700 block mb-1">Empresa / Razón Social (Matriz)</label>
              <Input
                placeholder="Ej. Inversiones Plaza S.A.C."
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de la Sede / Sucursal</label>
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

      {/* =========================================================================
          MODAL 6: AJUSTES DE EMPRESA COMERCIAL (MATRIZ)
          ========================================================================= */}
      <Dialog open={showEditCompanyModal} onOpenChange={setShowEditCompanyModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              <span>Ajustes de Empresa Comercial</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifica los datos comerciales de la empresa matriz y sus sedes afiliadas.
            </DialogDescription>
          </DialogHeader>

          {selectedCompany && (
            <form onSubmit={handleSaveCompany} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial de la Empresa *</label>
                <Input
                  required
                  value={companyFormData.company_name}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                  placeholder="Ej. Inversiones Plaza S.A.C."
                  className="text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Titular / Representante</label>
                  <Input
                    value={companyFormData.owner}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, owner: e.target.value })}
                    placeholder="Ej. Carlos Mendoza"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">RUC (Opcional)</label>
                  <Input
                    value={companyFormData.ruc}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, ruc: e.target.value })}
                    placeholder="20601234567"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <Input
                    value={companyFormData.phone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                    placeholder="966 123 456"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo de Contacto</label>
                  <Input
                    type="email"
                    value={companyFormData.email}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                    placeholder="contacto@empresa.com"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad / Ubicación Central</label>
                <Input
                  value={companyFormData.city}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                  placeholder="Ayacucho - Huamanga"
                  className="text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Alcance de los cambios:</p>
                <p>Se sincronizarán los datos comerciales en las <strong>{selectedCompany.branches?.length || 0} sedes</strong> registradas bajo esta empresa.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditCompanyModal(false)} className="flex-1 text-xs">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={savingCompany}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {savingCompany ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Ajustes</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
