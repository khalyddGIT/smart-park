import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAccessToken, listMyReservations, createReservationApi, cancelReservationApi } from '../services/api';
import api from '../services/api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'smart_park_unified_establishments_v2';
const RESERVATIONS_STORAGE_KEY_BASE = 'smart_park_unified_reservations_v2';
const REQUESTS_STORAGE_KEY = 'smart_park_affiliation_requests_v1';
const APPROVED_ADMINS_STORAGE_KEY = 'smart_park_approved_admins_v1';
export const LOCAL_USER_CREDENTIALS_KEY = 'smart_park_local_user_credentials_v1';

// Helper para persistir credenciales de usuarios/admins locales tanto en modo online como offline
export const saveLocalUserCredential = (cred) => {
  try {
    if (!cred || !cred.email) return;
    const emailKey = cred.email.trim().toLowerCase();
    const prevEmailKey = (cred.previousEmail || cred.previous_email || '').trim().toLowerCase();
    const existingRaw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};

    const prevEntry = existing[emailKey] || (prevEmailKey ? existing[prevEmailKey] : null) || (cred.parkingId ? Object.values(existing).find(c => String(c.parkingId) === String(cred.parkingId)) : null);
    const finalPassword = cred.password || cred.temporary_password || prevEntry?.password || '';

    existing[emailKey] = {
      email: emailKey,
      password: finalPassword,
      full_name: cred.full_name || cred.name || cred.fullName || prevEntry?.full_name || 'Administrador',
      phone: cred.phone || prevEntry?.phone || '',
      role: cred.role || prevEntry?.role || 'local',
      parkingId: cred.parkingId || cred.establishmentId || prevEntry?.parkingId || null,
      updatedAt: new Date().toISOString()
    };

    if (prevEmailKey && prevEmailKey !== emailKey && existing[prevEmailKey]) {
      delete existing[prevEmailKey];
    }

    localStorage.setItem(LOCAL_USER_CREDENTIALS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('saveLocalUserCredential error', e);
  }
};

export const getLocalUserCredentials = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Helper universal para extraer la jerarquía comercial: Empresa / Local Principal y Sucursal
export const getEstablishmentHierarchy = (est) => {
  if (!est) return { companyName: 'Estacionamiento', branchName: 'Sede Principal', isBranch: false };

  const fullName = (est.name || '').trim();
  const explicitCompany = (est.company_name || est.companyName || est.business_name || '').trim();

  // 1. Si tiene un nombre de empresa/local explícito
  if (explicitCompany) {
    let branch = fullName;
    if (fullName.toLowerCase().startsWith(explicitCompany.toLowerCase())) {
      branch = fullName.slice(explicitCompany.length).replace(/^[\s\-–—:]+/, '').trim();
    }
    const hasDistinctBranch = !!branch && branch.toLowerCase() !== explicitCompany.toLowerCase();
    return {
      companyName: explicitCompany,
      branchName: hasDistinctBranch ? branch : (est.address || fullName),
      isBranch: hasDistinctBranch
    };
  }

  // 2. Si el nombre contiene separadores estándar " - ", " – " o " — "
  // Ej: "Smart Park Plaza Mayor - Planta Baja" -> Empresa: "Smart Park Plaza Mayor", Sucursal: "Planta Baja"
  // Ej: "Cochera Central - Sucursal Jr. Cusco" -> Empresa: "Cochera Central", Sucursal: "Sucursal Jr. Cusco"
  const splitMatch = fullName.match(/^(.*?)\s*[-–—]\s*(.+)$/);
  if (splitMatch) {
    const mainPart = splitMatch[1].trim();
    const branchPart = splitMatch[2].trim();
    if (mainPart.length >= 2 && !/^(nivel|piso|planta)\s*\d*$/i.test(mainPart)) {
      return {
        companyName: mainPart,
        branchName: branchPart || 'Sede Principal',
        isBranch: true
      };
    }
  }

  // 3. Local único / standalone (sin sucursales registradas por nombre)
  return {
    companyName: fullName,
    branchName: fullName,
    isBranch: false
  };
};

// Helper estricto para validar si un establecimiento/sucursal le pertenece al usuario actual (Admin Local)
export const isMyEstablishment = (est, user, role) => {
  if (!est) return false;
  if (role === 'platform') return true; // Super Admin ve todas
  if (role !== 'local') return true;   // Conductor ve todas las activas en su módulo
  if (!user) return false;

  const userEmail = (user.email || '').trim().toLowerCase();
  const estEmail = (est.email || '').trim().toLowerCase();
  const estAdminEmail = (est.admin_email || est.adminEmail || '').trim().toLowerCase();
  const estId = String(est.id || '');

  // 1. Coincidencia directa por correo de acceso o correo de administración de la sede
  if (userEmail && (userEmail === estEmail || userEmail === estAdminEmail)) return true;

  // 2. Asignación directa por ID de cochera en la sesión del usuario
  if (user.parking_id && String(user.parking_id) === estId) return true;
  if (user.establishmentId && String(user.establishmentId) === estId) return true;

  // 3. Cuenta semilla demo adminlocal@smartpark.com es administradora exclusiva de Smart Park Plaza Mayor (EST-01 y EST-02)
  if (userEmail === 'adminlocal@smartpark.com') {
    if (estId === 'EST-01' || estId === 'EST-02' || estId === '1' || estId === '2') return true;
    if (estEmail === 'contacto@plazamayorpark.pe') return true;
    const { companyName } = getEstablishmentHierarchy(est);
    if (companyName.toLowerCase().includes('plaza mayor')) return true;
    return false;
  }

  // 4. Verificación en credenciales locales persistentes (smart_park_local_user_credentials_v1)
  try {
    const credsRaw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
    if (credsRaw) {
      const creds = JSON.parse(credsRaw);
      const myCred = creds[userEmail];
      if (myCred && myCred.parkingId && String(myCred.parkingId) === estId) return true;
    }
  } catch {}

  // 5. Verificación en administradores aprobados persistentes (smart_park_approved_admins_v1)
  try {
    const approvedRaw = localStorage.getItem('smart_park_approved_admins_v1');
    if (approvedRaw) {
      const approvedList = JSON.parse(approvedRaw);
      if (Array.isArray(approvedList)) {
        const match = approvedList.find(a => (a.email || '').trim().toLowerCase() === userEmail && String(a.establishmentId || '') === estId);
        if (match) return true;
      }
    }
  } catch {}

  // 6. Si el usuario tiene una empresa/local registrado (user.establishmentName)
  if (user.establishmentName) {
    const { companyName } = getEstablishmentHierarchy(est);
    if (companyName.toLowerCase() === user.establishmentName.trim().toLowerCase()) return true;
  }

  return false;
};

// Helper para aislar datos por usuario - evita fuga entre usuarios
const getCurrentUserKey = () => {
  try {
    const saved = localStorage.getItem('smart_park_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      return u?.id || u?.email || 'guest';
    }
  } catch {}
  return 'guest';
};
const getReservationsKey = () => `${RESERVATIONS_STORAGE_KEY_BASE}_${getCurrentUserKey()}`;

export const parseIsoToDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  let s = String(dateVal).trim();
  // Si es formato ISO pero sin Z ni offset (+/-HH:MM), asumir UTC (ya que el backend corre y persiste en UTC)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const INITIAL_ESTABLISHMENTS = [
  {
    id: 'EST-01',
    name: 'Smart Park Plaza Mayor - Planta Baja',
    address: 'Portal Unión 42, Centro Histórico',
    reference: 'Frente a la Catedral de Huamanga',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    status: 'Operativo',
    owner: 'Inversiones Plaza Mayor Huamanga',
    ruc: '20608945123',
    phone: '+51 966 123 456',
    whatsapp: '51966123456',
    email: 'contacto@plazamayorpark.pe',
    schedule: 'Lunes a Domingo: 24 Horas (Abierto 24/7)',
    description: 'Estacionamiento céntrico con garita inteligente ANPR y acceso asfaltado a pocos metros de la Plaza Mayor de Huamanga.',
    latitude: -13.1604,
    longitude: -74.2259,
    mapsUrl: 'https://maps.google.com/?q=-13.1604,-74.2259',
    socials: {
      facebook: 'https://facebook.com/SmartParkPlazaMayor',
      instagram: 'https://instagram.com/smartpark_ayacucho',
      tiktok: 'https://tiktok.com/@smartpark_oficial',
      website: 'https://smartpark.pe/plazamayor'
    },
    commission: '10%',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 6, type: 'crosswalk', x: 500, y: 300, w: 80, h: 100, rot: 0 },
      { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA ANPR' },
      
      // Fila Norte (Diversificada: Auto, Camioneta, Mototaxi, Moto)
      { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'C-01', slotType: 'camioneta', shaded: true, x: 230, y: 72, w: 68, h: 112, rot: 0, status: 'free' },
      { id: 13, type: 'slot', code: 'C-02', slotType: 'camioneta', x: 310, y: 72, w: 68, h: 112, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#0284c7' },
      { id: 14, type: 'slot', code: 'T-01', slotType: 'mototaxi', x: 390, y: 85, w: 48, h: 85, rot: 0, status: 'free' },
      { id: 15, type: 'slot', code: 'T-02', slotType: 'mototaxi', x: 450, y: 85, w: 48, h: 85, rot: 0, status: 'occupied', plate: '5612-4B', color: '#ca8a04' },
      { id: 16, type: 'slot', code: 'M-01', slotType: 'moto', x: 520, y: 95, w: 38, h: 65, rot: 0, status: 'free' },
      { id: 17, type: 'slot', code: 'M-02', slotType: 'moto', x: 570, y: 95, w: 38, h: 65, rot: 0, status: 'free' },
      { id: 18, type: 'slot', code: 'A-03', slotType: 'auto', x: 630, y: 80, w: 56, h: 96, rot: 0, status: 'free' },

      // Fila Sur (Diversificada)
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 480, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', x: 145, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'C-03', slotType: 'camioneta', x: 220, y: 468, w: 68, h: 112, rot: 0, status: 'free' },
      { id: 23, type: 'slot', code: 'C-04', slotType: 'camioneta', x: 300, y: 468, w: 68, h: 112, rot: 0, status: 'free' },
      { id: 24, type: 'slot', code: 'T-03', slotType: 'mototaxi', x: 380, y: 485, w: 48, h: 85, rot: 0, status: 'free' },
      { id: 25, type: 'slot', code: 'M-03', slotType: 'moto', x: 440, y: 495, w: 38, h: 65, rot: 0, status: 'free' },
      { id: 26, type: 'slot', code: 'B-03', slotType: 'auto', x: 500, y: 480, w: 56, h: 96, rot: 0, status: 'free' }
    ]
  },
  {
    id: 'EST-02',
    name: 'Smart Park Plaza Mayor - Sótano 1',
    address: 'Portal Unión 42, Centro Histórico',
    reference: 'Ingreso vehicular por Jr. Callao',
    city: 'Ayacucho - Huamanga',
    level: 'Sótano -1',
    rate: 4.00,
    status: 'Operativo',
    owner: 'Inversiones Plaza Mayor Huamanga',
    ruc: '20608945123',
    phone: '+51 966 123 456',
    whatsapp: '51966123456',
    email: 'contacto@plazamayorpark.pe',
    schedule: 'Lunes a Domingo: 06:00 AM - 11:30 PM',
    description: 'Nivel subterráneo 100% techado y climatizado. Ideal para estancias prolongadas y protección solar.',
    latitude: -13.1612,
    longitude: -74.2252,
    mapsUrl: 'https://maps.google.com/?q=-13.1612,-74.2252',
    socials: {
      facebook: 'https://facebook.com/SmartParkPlazaMayor',
      instagram: 'https://instagram.com/smartpark_ayacucho',
      tiktok: '',
      website: 'https://smartpark.pe'
    },
    commission: '10%',
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 6, type: 'slot', code: 'S1-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 7, type: 'slot', code: 'S1-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 8, type: 'slot', code: 'S1-03', slotType: 'auto', x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
      { id: 9, type: 'slot', code: 'S1-04', slotType: 'auto', x: 285, y: 80, w: 56, h: 96, rot: 0, status: 'free' }
    ]
  },
  {
    id: 'EST-03',
    name: 'Smart Park Mercado Mariscal Cáceres',
    address: 'Av. Mariscal Cáceres 450',
    reference: 'A 20 metros de la puerta principal del mercado',
    city: 'Ayacucho - Huamanga',
    level: 'Playa Abierta',
    rate: 3.50,
    status: 'Operativo',
    owner: 'Comercial Cáceres SAC',
    ruc: '20509876541',
    phone: '+51 984 555 666',
    whatsapp: '51984555666',
    email: 'mariscal.caceres@cocheras.pe',
    schedule: 'Lunes a Domingo: 05:30 AM - 10:00 PM',
    description: 'Playa amplia de fácil maniobra con tarifa económica, área para camionetas y zona de descarga.',
    latitude: -13.1565,
    longitude: -74.2215,
    mapsUrl: 'https://maps.google.com/?q=-13.1565,-74.2215',
    socials: {
      facebook: 'https://facebook.com/CocheraMariscalCaceres',
      instagram: '',
      tiktok: '',
      website: ''
    },
    commission: '8%',
    image: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 3, type: 'slot', code: 'M-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 4, type: 'slot', code: 'M-02', slotType: 'auto', x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 5, type: 'slot', code: 'M-03', slotType: 'auto', x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 6, type: 'slot', code: 'M-04', slotType: 'moto', x: 285, y: 80, w: 38, h: 65, rot: 0, status: 'free' }
    ]
  },
  {
    id: 'EST-04',
    name: 'Smart Park Terminal Terrestre',
    address: 'Av. Pérez de Cuéllar s/n',
    reference: 'Costado del ingreso al Terminal Libertadores de América',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Exterior',
    rate: 4.50,
    status: 'Mantenimiento',
    owner: 'Consorcio Vial Ayacucho',
    ruc: '20401122334',
    phone: '+51 966 999 888',
    whatsapp: '51966999888',
    email: 'terminal.park@ayacucho.pe',
    schedule: '24 Horas los 365 días',
    description: 'Estacionamiento oficial para viajeros con custodia nocturna y control computarizado.',
    latitude: -13.1718,
    longitude: -74.2210,
    mapsUrl: 'https://maps.google.com/?q=-13.1718,-74.2210',
    socials: {
      facebook: '',
      instagram: '',
      tiktok: '',
      website: ''
    },
    commission: '12%',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 3, type: 'slot', code: 'T-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 4, type: 'slot', code: 'T-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' }
    ]
  }
];

export const INITIAL_AFFILIATION_REQUESTS = [
  {
    id: 'REQ-101',
    parkingName: 'Cochera Colonial San Cristóbal',
    ownerName: 'Roberto Quispe Valdivia',
    email: 'roberto.quispe@cochera.com',
    phone: '+51 966 456 789',
    address: 'Jr. 28 de Julio 342, Centro Histórico',
    city: 'Ayacucho - Huamanga',
    capacity: 25,
    rate: 4.50,
    notes: 'Local cercado y techado en zona céntrica con cámaras de seguridad.',
    status: 'PENDING', // 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'REQ-102',
    parkingName: 'Estacionamiento Los Andes',
    ownerName: 'Elena Huamán Cárdenas',
    email: 'elena.huaman@losandes.pe',
    phone: '+51 984 112 233',
    address: 'Av. Mariscal Cáceres 780',
    city: 'Ayacucho - Huamanga',
    capacity: 40,
    rate: 3.50,
    notes: 'Amplia playa para vehículos pesados y livianos con guardia 24h.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_RESERVATIONS = [
  {
    id: 1,
    code: 'RSV-8912',
    token: 'SPK-AYC891-7B2F9A',
    parkingId: 'EST-01',
    parking: 'Smart Park Plaza Mayor - Planta Baja',
    slot: 'A-01',
    customerName: 'Carlos Mendoza Ramos',
    customerPhone: '+51 966 123 456',
    plate: 'ABC-123',
    cost: 10.00,
    hours: 2,
    ratePerHour: 5.00,
    status: 'SCHEDULED',
    startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 100 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    code: 'RSV-5421',
    token: 'SPK-AYC542-9D1E3F',
    parkingId: 'EST-01',
    parking: 'Smart Park Plaza Mayor - Planta Baja',
    slot: 'A-06',
    customerName: 'Valeria Quispe Castro',
    customerPhone: '+51 984 765 432',
    plate: 'XYZ-789',
    cost: 15.00,
    hours: 3,
    ratePerHour: 5.00,
    status: 'ACTIVE',
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 135 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    code: 'RSV-3319',
    token: 'SPK-AYC331-4A8C2B',
    parkingId: 'EST-02',
    parking: 'Smart Park Plaza Mayor - Sótano 1',
    slot: 'S1-03',
    customerName: 'Jorge Alarcón Díaz',
    customerPhone: '+51 999 888 777',
    plate: 'W1P-404',
    cost: 8.00,
    hours: 2,
    ratePerHour: 4.00,
    status: 'ACTIVE',
    startTime: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  }
];

// Sanitizador de coordenadas: asegura que cualquier cochera tenga coordenadas y datos válidos en Ayacucho
export const sanitizeEstablishment = (est, idx = 0) => {
  let lat = Number(est.latitude);
  let lng = Number(est.longitude);
  let name = est.name || '';
  let address = est.address || '';
  let reference = est.reference || '';

  // Limpieza de nombres y direcciones de Lima heredados
  if (name.includes('San Isidro') || address.includes('Javier Prado')) {
    name = 'Smart Park Plaza Mayor - Planta Baja';
    address = 'Portal Unión 42, Centro Histórico';
    reference = 'Frente a la Catedral de Huamanga';
    lat = -13.1604;
    lng = -74.2259;
  } else if (name.includes('Miraflores') || address.includes('Shell')) {
    name = 'Smart Park Jr. Bellido Colonial';
    address = 'Jr. Bellido 240, Centro Histórico';
    reference = 'A 2 cuadras de la Plaza Mayor';
    lat = -13.1631;
    lng = -74.2236;
  }

  // Si las coordenadas están fuera del rango de Ayacucho (ej. -12.x o -77.x de Lima), reasignar a Ayacucho
  if (isNaN(lat) || isNaN(lng) || lat > -13.0 || lat < -13.3 || lng > -74.0 || lng < -74.4) {
    const defaultCoords = [
      [-13.1604, -74.2259],
      [-13.1631, -74.2236],
      [-13.1565, -74.2215],
      [-13.1718, -74.2210]
    ];
    const fallback = defaultCoords[idx % defaultCoords.length];
    lat = fallback[0];
    lng = fallback[1];
  }
  return { 
    ...est, 
    name,
    address,
    reference,
    latitude: lat, 
    longitude: lng, 
    city: est.city && est.city.includes('Ayacucho') ? est.city : 'Ayacucho - Huamanga',
    company_name: est.company_name || est.companyName || '',
    companyName: est.companyName || est.company_name || '',
    admin_email: est.admin_email || est.adminEmail || '',
    adminEmail: est.adminEmail || est.admin_email || '',
    owner: est.owner || '',
    ruc: est.ruc || '',
    phone: est.phone || '',
    whatsapp: est.whatsapp || '',
    email: est.email || '',
    schedule: est.schedule || 'Lunes a Domingo: 24 Horas',
    description: est.description || '',
    mapsUrl: est.mapsUrl || est.maps_url || (lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : ''),
    socials: typeof est.socials === 'string' ? (() => { try { return JSON.parse(est.socials); } catch { return {}; } })() : (est.socials || { facebook: '', instagram: '', tiktok: '', website: '' }),
    tolerance: Math.max(5, Math.min(120, Number(est.tolerance ?? est.tolerance_minutes ?? 15))),
    rate: Number(est.rate || est.hourly_rate || 5.00),
    rate_auto: Number(est.rate_auto ?? est.rate ?? est.hourly_rate ?? 5.00),
    rate_suv: Number(est.rate_suv ?? 7.00),
    rate_mototaxi: Number(est.rate_mototaxi ?? 3.50),
    rate_moto: Number(est.rate_moto ?? 2.50),
    billing_unit: est.billing_unit || 'hour',
    rate_minute_auto: Number(est.rate_minute_auto ?? ((est.rate_auto ?? est.rate ?? est.hourly_rate ?? 5.0) / 60).toFixed(2)),
    rate_minute_suv: Number(est.rate_minute_suv ?? ((est.rate_suv ?? 7.0) / 60).toFixed(2)),
    rate_minute_mototaxi: Number(est.rate_minute_mototaxi ?? ((est.rate_mototaxi ?? 3.5) / 60).toFixed(2)),
    rate_minute_moto: Number(est.rate_minute_moto ?? ((est.rate_moto ?? 2.5) / 60).toFixed(2)),
    min_stay_minutes: Number(est.min_stay_minutes || 15),
    max_stay_minutes: Number(est.max_stay_minutes || 1440),
    night_shift_enabled: !!est.night_shift_enabled,
    night_shift_start: est.night_shift_start || '20:00',
    night_shift_end: est.night_shift_end || '06:00',
    night_shift_surcharge: Number(est.night_shift_surcharge || 0.0),
    require_reservation_prepay: !!est.require_reservation_prepay,
    reservation_fee: Number(est.reservation_fee || 0.0),
    min_stay_hours: Number(est.min_stay_hours || 1),
    max_stay_hours: Number(est.max_stay_hours || 24),
    allow_open_stay: est.allow_open_stay !== undefined ? !!est.allow_open_stay : true
  };
};

const EstablishmentContext = createContext();

export const EstablishmentProvider = ({ children }) => {
  const { user, role } = useAuth();

  const [establishments, setEstablishments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e, idx) => sanitizeEstablishment(e, idx));
        }
      }
    } catch (e) {
      console.error('Error reading establishments from storage:', e);
    }
    return INITIAL_ESTABLISHMENTS.map((e, idx) => sanitizeEstablishment(e, idx));
  });

  // Establecimientos filtrados que le pertenecen exclusivamente al usuario autenticado (Admin Local)
  const myEstablishments = React.useMemo(() => {
    return establishments.filter(est => isMyEstablishment(est, user, role));
  }, [establishments, user, role]);

  const [reservations, setReservations] = useState(() => {
    try {
      const key = getReservationsKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      // Nuevo usuario: iniciar vacío, no con datos demo de otro usuario
      // Solo mostrar INITIAL_RESERVATIONS si es la primera vez global y no hay usuario previo
      const legacy = localStorage.getItem(RESERVATIONS_STORAGE_KEY_BASE);
      if (legacy && getCurrentUserKey() !== 'guest') {
        // Migrar legacy solo si existe y usuario es guest inicial - luego limpiar
        return [];
      }
    } catch (e) {}
    return [];
  });

  // Último error de reserva devuelto por el servidor (para feedback honesto en la UI)
  const [bookingError, setBookingError] = useState(null);

  const [affiliationRequests, setAffiliationRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return INITIAL_AFFILIATION_REQUESTS;
  });

  const [approvedAdmins, setApprovedAdmins] = useState(() => {
    try {
      const saved = localStorage.getItem(APPROVED_ADMINS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Guardar en localStorage siempre que cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(establishments));
    } catch (e) {}
  }, [establishments]);

  useEffect(() => {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(affiliationRequests));
    } catch (e) {}
  }, [affiliationRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify(approvedAdmins));
    } catch (e) {}
  }, [approvedAdmins]);

  // Recargar reservas al cambiar de usuario (aislamiento)
  useEffect(() => {
    const handleStorage = () => {
      try {
        const key = getReservationsKey();
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setReservations(parsed);
          else setReservations([]);
        } else {
          setReservations([]);
        }
      } catch { setReservations([]); }
    };
    window.addEventListener('storage', handleStorage);
    // También escuchar cambios de sesión en misma pestaña vía evento custom
    const interval = setInterval(() => {
      const currentKey = getReservationsKey();
      if (currentKey !== window.__lastReservationsKey) {
        window.__lastReservationsKey = currentKey;
        handleStorage();
      }
    }, 500);
    window.__lastReservationsKey = getReservationsKey();
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  useEffect(() => {
    try {
      const key = getReservationsKey();
      if (getCurrentUserKey() !== 'guest') {
        localStorage.setItem(key, JSON.stringify(reservations));
      }
    } catch (e) {}
  }, [reservations]);

  // Sincronización con Backend: parkings siempre (global), reservas solo con token
  // El panel del usuario siempre lee del servidor — no se usa caché local para datos de cocheras
  // Polling + refetch al enfocar la pestaña para que cambios de otros usuarios se vean sin recargar

  // Convierte un slot del backend (snake_case) al formato interno del plano (camelCase corto)
  const mapServerSlot = (s) => ({
    id: s.id, type: 'slot', code: s.code, status: s.status || 'free',
    slotType: s.slot_type || 'auto', shaded: false,
    x: s.pos_x || 0, y: s.pos_y || 0, w: s.width || 60, h: s.height || 100, rot: s.rotation || 0
  });

  // Convierte los elementos decorativos del backend (muros, garita, accesos...)
  const mapServerElement = (e) => {
    let extra = {};
    try { if (e.properties_json) extra = JSON.parse(e.properties_json) || {}; } catch {}
    return {
      id: `el-${e.id}`, type: e.element_type,
      x: e.pos_x || 0, y: e.pos_y || 0, w: e.width || 100, h: e.height || 20,
      rot: e.rotation || 0, label: extra.label
    };
  };

  // Evita re-hidratar en cada ciclo de polling las cocheras cuyo plano es legítimamente vacío
  const hydratedPlansRef = useRef(new Set());

  // Carga el plano real (plazas + muros) desde GET /parkings/{id}/floor-plan y lo fusiona en el estado
  const hydrateFloorPlan = async (id, force = false) => {
    const key = String(id);
    const numId = Number(key);
    if (isNaN(numId)) return;
    if (!force && hydratedPlansRef.current.has(key)) return;
    hydratedPlansRef.current.add(key);
    try {
      const res = await api.get(`/parkings/${numId}/floor-plan`);
      const slots = (Array.isArray(res.data?.slots) ? res.data.slots : []).map(mapServerSlot);
      const elements = (Array.isArray(res.data?.elements) ? res.data.elements : []).map(mapServerElement);
      const fullElements = [...elements, ...slots];
      setEstablishments(prev => prev.map(est => String(est.id) === key
        ? { ...est, elements: fullElements, _needsFloorPlan: false }
        : est
      ));
      try {
        window.dispatchEvent(new CustomEvent('smart_park_floorplan_updated', {
          detail: { parkingId: key, elements: fullElements, slots }
        }));
      } catch {}
      return fullElements;
    } catch {
      hydratedPlansRef.current.delete(key);
    }
  };

  // Garantiza que un establecimiento tenga su plano cargado antes de abrirlo (uso desde UI)
  const ensureFloorPlan = (id, force = false) => {
    const est = establishments.find(e => String(e.id) === String(id));
    if (force || !est || est.elements === null || est._needsFloorPlan) {
      return hydrateFloorPlan(id, force);
    }
  };

  const fetchParkings = async () => {
    try {
      const res = await api.get('/parkings');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mappedParkings = res.data.map((p, idx) => sanitizeEstablishment({
          id: String(p.id), 
          name: p.name, 
          address: p.address, 
          city: p.city || 'Ayacucho - Huamanga', 
          latitude: Number(p.latitude), 
          longitude: Number(p.longitude), 
          rate: Number(p.hourly_rate) || 5.00, 
          tolerance: Number(p.tolerance_minutes) || 15,
          status: p.status === 'active' ? 'Operativo' : p.status, 
          image: p.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800', 
          totalSlots: p.total_capacity, 
          available_slots: p.available_slots, 
          owner: p.owner || '',
          ruc: p.ruc || '',
          description: p.description || '', 
          phone: p.phone || '', 
          whatsapp: p.whatsapp || '',
          email: p.email || '', 
          schedule: p.schedule || 'Lunes a Domingo: 24 Horas',
          reference: p.reference || '', 
          level: p.level || 'Nivel 1 - Superficie', 
          mapsUrl: p.maps_url || (p.latitude && p.longitude ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : ''),
          socials: typeof p.socials === 'string' ? (() => { try { return JSON.parse(p.socials); } catch { return {}; } })() : (p.socials || {}),
          camera_url: p.camera_url || '', 
          camera_enabled: !!p.camera_enabled, 
          camera_calibration: p.camera_calibration || null, 
          rate_auto: p.rate_auto != null ? Number(p.rate_auto) : undefined,
          rate_suv: p.rate_suv != null ? Number(p.rate_suv) : undefined,
          rate_mototaxi: p.rate_mototaxi != null ? Number(p.rate_mototaxi) : undefined,
          rate_moto: p.rate_moto != null ? Number(p.rate_moto) : undefined,
          billing_unit: p.billing_unit || 'hour',
          rate_minute_auto: p.rate_minute_auto != null ? Number(p.rate_minute_auto) : undefined,
          rate_minute_suv: p.rate_minute_suv != null ? Number(p.rate_minute_suv) : undefined,
          rate_minute_mototaxi: p.rate_minute_mototaxi != null ? Number(p.rate_minute_mototaxi) : undefined,
          rate_minute_moto: p.rate_minute_moto != null ? Number(p.rate_minute_moto) : undefined,
          min_stay_minutes: p.min_stay_minutes != null ? Number(p.min_stay_minutes) : undefined,
          max_stay_minutes: p.max_stay_minutes != null ? Number(p.max_stay_minutes) : undefined,
          night_shift_enabled: p.night_shift_enabled,
          night_shift_start: p.night_shift_start,
          night_shift_end: p.night_shift_end,
          night_shift_surcharge: p.night_shift_surcharge != null ? Number(p.night_shift_surcharge) : undefined,
          require_reservation_prepay: p.require_reservation_prepay,
          reservation_fee: p.reservation_fee != null ? Number(p.reservation_fee) : undefined,
          min_stay_hours: p.min_stay_hours != null ? Number(p.min_stay_hours) : undefined,
          max_stay_hours: p.max_stay_hours != null ? Number(p.max_stay_hours) : undefined,
          allow_open_stay: p.allow_open_stay !== undefined ? !!p.allow_open_stay : true,
          elements: null, 
          _needsFloorPlan: true
        }, idx));
        const pendingHydration = [];
        setEstablishments(prev => {
          const localOnly = prev.filter(e => String(e.id).startsWith('EST-'));
          const serverIds = new Set(mappedParkings.map(m => m.id));
          const preservedLocal = localOnly.filter(l => !serverIds.has(String(l.id)));
          const prevMap = new Map(prev.map(e => [String(e.id), e]));
          const merged = mappedParkings.map(m => {
            const before = prevMap.get(m.id);
            return before?.elements ? { ...m, elements: before.elements } : m;
          });
          return [...merged, ...preservedLocal].map((e, idx) => sanitizeEstablishment(e, idx));
        });

        // Los planos ya abiertos se preservan sin disparar ráfagas de peticiones en cada ciclo
      }
    } catch {}
  };

  useEffect(() => {
    fetchParkings();
    if (getAccessToken()) refreshMyReservations();

    // Sincronización periódica suave en segundo plano (el WebSocket provee actualizaciones instantáneas)
    const parkingsInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchParkings();
      }
    }, 20000);
    const reservationsInterval = setInterval(() => {
      if (getAccessToken() && document.visibilityState === 'visible') {
        refreshMyReservations();
      }
    }, 20000);

    // Refetch inmediato al volver a la pestaña (cambio de rol, edición en otra pestaña, etc.)
    const onFocus = () => { fetchParkings(); if (getAccessToken()) refreshMyReservations(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // WebSocket en tiempo real: notificaciones push del servidor (misma URL que la API)
    let ws = null;
    let wsReconnectTimer = null;
    const getWsUrl = () => {
      const envUrl = import.meta.env.VITE_WS_URL;
      if (envUrl) return envUrl;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return `${proto}//127.0.0.1:8000/api/v1/ws`;
      if (window.location.hostname.includes('railway.app')) return `${proto}//${window.location.host}/api/v1/ws`;
      return `wss://smart-park-web-production.up.railway.app/api/v1/ws`;
    };
    const connectWs = () => {
      try {
        ws = new WebSocket(getWsUrl());
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.event === 'pong') return;
            if (msg.event === 'parkings:updated' || msg.event === 'refresh') {
              fetchParkings();
              const pid = msg.payload?.parking_id || msg.payload?.parkingId;
              if (pid) try { hydrateFloorPlan(String(pid), true); } catch {}
            }
            if (msg.event === 'spaces:update') {
              const pid = msg.payload?.parking_id;
              const slotCode = msg.payload?.slot_code;
              const slotId = msg.payload?.slot_id;
              const newStatus = msg.payload?.status;
              if (pid && (slotCode || slotId) && newStatus) {
                setEstablishments(prev => prev.map(est => {
                  if (String(est.id) === String(pid)) {
                    const nextElements = (est.elements || []).map(el => {
                      if (el.type === 'slot' && (el.code === slotCode || String(el.id) === String(slotId))) {
                        return { ...el, status: newStatus };
                      }
                      return el;
                    });
                    return { ...est, elements: nextElements };
                  }
                  return est;
                }));
                try { hydrateFloorPlan(String(pid), true); } catch {}
              }
            }
            if (msg.event === 'reservations:updated' || msg.event === 'reservations:cancelled' || msg.event === 'refresh') {
              if (getAccessToken()) refreshMyReservations();
              // Cajón reservado/ocupado cambia plano, refrescar para que no siga disponible
              fetchParkings();
              // Si hay parking_id en payload, hidratar solo ese plano para feedback instantáneo
              const pid = msg.payload?.parking_id || msg.payload?.parkingId;
              if (pid) try { hydrateFloorPlan(String(pid), true); } catch {}
            }
            if (msg.event === 'incidents:updated' || msg.event === 'reviews:updated') { /* NotificationContext hace su propio polling */ }
          } catch {}
        };
        ws.onclose = () => { wsReconnectTimer = setTimeout(connectWs, 3000); };
        ws.onerror = () => { try { ws.close(); } catch {} };
        const ping = setInterval(() => { if (ws && ws.readyState === WebSocket.OPEN) try { ws.send('ping'); } catch {} }, 25000);
        ws.addEventListener('close', () => clearInterval(ping));
      } catch {}
    };
    connectWs();

    return () => {
      clearInterval(parkingsInterval);
      clearInterval(reservationsInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(wsReconnectTimer);
      try { ws && ws.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar reservaciones en localStorage per-user (solo caché de lectura posterior)
  const saveReservations = (newReservations) => {
    setReservations(newReservations);
    try {
      const key = getReservationsKey();
      if (getCurrentUserKey() !== 'guest') {
        localStorage.setItem(key, JSON.stringify(newReservations));
      }
    } catch (e) {}
  };

  // Crear Solicitud de Afiliación de Cochera
  // Carga real desde el servidor (con fallback a localStorage si no hay auth o falla)
  useEffect(() => {
    // Solo platform necesita afiliaciones; evita 403 spam para local/personal
    const { user: _u } = (()=>{ try{ return {user: JSON.parse(localStorage.getItem('smart_park_user_session')||'{}')} }catch{return {user:null}} })();
    if(_u?.role !== 'platform') return;
    const loadAffiliations = async () => {
      if(document.visibilityState!=='visible') return;
      try {
        const res = await api.get('/affiliation-requests');
        if (Array.isArray(res.data)) {
          const mapped = res.data.map(r => ({
            id: r.id,
            parkingName: r.parkingName,
            ownerName: r.ownerName,
            email: r.email,
            phone: r.phone || '',
            address: r.address || '',
            city: r.city || '',
            capacity: r.capacity,
            rate: r.rate,
            notes: r.notes || '',
            status: String(r.status || 'pending').toUpperCase(),
            createdAt: r.created_at || r.createdAt,
          }));
          setAffiliationRequests(mapped);
        }
      } catch {}
    };
    loadAffiliations();
    const iv = setInterval(loadAffiliations, 60000);
    return () => clearInterval(iv);
  }, []);

  const createAffiliationRequest = async (requestData) => {
    const payload = {
      parkingName: requestData.parkingName,
      ownerName: requestData.ownerName,
      email: requestData.email,
      phone: requestData.phone || '',
      address: requestData.address || '',
      city: requestData.city || 'Ayacucho - Huamanga',
      capacity: Number(requestData.capacity) || 20,
      rate: Number(requestData.rate) || 5.0,
      notes: requestData.notes || '',
    };
    try {
      const res = await api.post('/affiliation-requests', payload);
      const r = res.data;
      const mapped = {
        id: r.id,
        parkingName: r.parkingName,
        ownerName: r.ownerName,
        email: r.email,
        phone: r.phone || '',
        address: r.address || '',
        city: r.city || '',
        capacity: r.capacity,
        rate: r.rate,
        notes: r.notes || '',
        status: String(r.status || 'pending').toUpperCase(),
        createdAt: r.created_at || new Date().toISOString(),
      };
      setAffiliationRequests(prev => [mapped, ...prev]);
      return mapped;
    } catch (e) {
      // Fallback local si el servidor no responde (offline)
      const fallback = {
        id: `REQ-${Date.now().toString().slice(-4)}`,
        parkingName: payload.parkingName,
        ownerName: payload.ownerName,
        email: payload.email.toLowerCase(),
        phone: payload.phone,
        address: payload.address || 'Centro Histórico',
        city: payload.city,
        capacity: payload.capacity,
        rate: payload.rate,
        notes: payload.notes,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      setAffiliationRequests(prev => [fallback, ...prev]);
      return fallback;
    }
  };

  // Aprobar: persiste en servidor (crea cochera real) y refresca lista
  // Aprobar: persiste en servidor (crea cochera real con credenciales) y refresca lista
  const approveAffiliationRequest = async (requestId, credentialsData = null) => {
    const adminEmail = (credentialsData?.admin_email || credentialsData?.adminEmail || '').trim().toLowerCase();
    const adminPassword = credentialsData?.admin_password || credentialsData?.adminPassword || '';
    const adminName = credentialsData?.admin_name || credentialsData?.adminName || '';
    const adminPhone = credentialsData?.admin_phone || credentialsData?.adminPhone || '';

    // Preparar payload dual para compatibilidad total
    const payload = credentialsData ? {
      adminEmail: adminEmail || undefined,
      admin_email: adminEmail || undefined,
      adminPassword: adminPassword || undefined,
      admin_password: adminPassword || undefined,
      adminName: adminName || undefined,
      admin_name: adminName || undefined,
      adminPhone: adminPhone || undefined,
      admin_phone: adminPhone || undefined
    } : {};

    try {
      const res = await api.put(`/affiliation-requests/${requestId}/approve`, payload);
      await fetchParkings();
      // Recargar solicitudes para reflejar APPROVED
      try {
        const r2 = await api.get('/affiliation-requests');
        if (Array.isArray(r2.data)) {
          setAffiliationRequests(r2.data.map(r => ({
            id: r.id,
            parkingName: r.parkingName,
            ownerName: r.ownerName,
            email: r.email,
            phone: r.phone || '',
            address: r.address || '',
            city: r.city || '',
            capacity: r.capacity,
            rate: r.rate,
            notes: r.notes || '',
            status: String(r.status || 'pending').toUpperCase(),
            createdAt: r.created_at || r.createdAt,
          })));
        }
      } catch {}

      const effectiveEmail = res.data?.admin_email || adminEmail;
      const effectivePassword = res.data?.admin_password || res.data?.admin_credentials?.temporary_password || adminPassword;
      const effectiveName = res.data?.admin_name || adminName;
      const effectivePhone = res.data?.admin_phone || adminPhone;

      // Registrar en almacenamiento local persistente para garantizar acceso inmediato
      if (effectiveEmail) {
        saveLocalUserCredential({
          email: effectiveEmail,
          password: effectivePassword,
          full_name: effectiveName,
          phone: effectivePhone,
          role: 'local',
          parkingId: res.data?.parking_id
        });
        const newAdmin = {
          id: Date.now(),
          name: effectiveName,
          email: effectiveEmail,
          phone: effectivePhone,
          password: effectivePassword,
          establishmentId: String(res.data?.parking_id || ''),
          establishmentName: res.data?.parking_name || '',
          role: 'local'
        };
        setApprovedAdmins(prev => [newAdmin, ...prev.filter(a => a.email !== effectiveEmail)]);
      }

      return res.data;
    } catch (e) {
      console.warn('approve affiliation fallback local', e?.response?.data);
      // Fallback local resiliente (mantiene compatibilidad offline)
      const req = affiliationRequests.find(r => String(r.id) === String(requestId));
      if (!req) return null;
      const newEstId = `EST-${Date.now().toString().slice(-4)}`;
      const fallbackEmail = (adminEmail || req.email || '').trim().toLowerCase();
      const fallbackName = adminName || req.ownerName || 'Administrador Local';
      const fallbackPassword = adminPassword || `SmartPark_${Date.now().toString().slice(-4)}!`;

      const newEstablishment = {
        id: newEstId,
        name: req.parkingName,
        address: req.address || 'Jr. 28 de Julio 100',
        city: req.city || 'Ayacucho - Huamanga',
        level: 'Nivel 1 - Superficie',
        rate: Number(req.rate) || 5.0,
        status: 'Operativo',
        owner: fallbackName,
        ruc: '20' + Math.floor(100000000 + Math.random() * 900000000),
        phone: req.phone || '+51 966 000 000',
        whatsapp: (req.phone || '').replace(/\D/g, '') || '51966000000',
        email: fallbackEmail,
        schedule: 'Lunes a Domingo: 24 Horas',
        description: req.notes || 'Estacionamiento afiliado',
        latitude: -13.1606 + (Math.random() - 0.5) * 0.008,
        longitude: -74.2257 + (Math.random() - 0.5) * 0.008,
        mapsUrl: `https://maps.google.com/?q=-13.1606,-74.2257`,
        socials: { facebook: '', instagram: '', tiktok: '', website: '' },
        commission: '10%',
        image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
        elements: [{ id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 }, { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 }, { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 }, { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 }, { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 }, { id: 6, type: 'crosswalk', x: 500, y: 250, w: 80, h: 200, rot: 0 }, { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'ACCESO GARITA ANPR' }, { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' }, { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' }, { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'free' }, { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 285, y: 80, w: 56, h: 96, rot: 0, status: 'free' }, { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 480, w: 56, h: 96, rot: 0, status: 'free' }, { id: 21, type: 'slot', code: 'B-02', slotType: 'moto', x: 145, y: 480, w: 38, h: 65, rot: 0, status: 'free' }]
      };
      setEstablishments(prev => [newEstablishment, ...prev]);

      saveLocalUserCredential({
        email: fallbackEmail,
        password: fallbackPassword,
        full_name: fallbackName,
        phone: req.phone,
        role: 'local',
        parkingId: newEstId
      });

      const newAdmin = {
        id: Date.now(),
        name: fallbackName,
        email: fallbackEmail,
        phone: req.phone,
        password: fallbackPassword,
        establishmentId: newEstId,
        establishmentName: req.parkingName,
        role: 'local'
      };
      setApprovedAdmins(prev => [newAdmin, ...prev.filter(a => a.email !== fallbackEmail)]);
      setAffiliationRequests(prev => prev.map(r => String(r.id) === String(requestId) ? { ...r, status: 'APPROVED', approvedAt: new Date().toISOString(), establishmentId: newEstId } : r));

      return {
        status: 'approved',
        parking_id: newEstId,
        parking_name: req.parkingName,
        admin_email: fallbackEmail,
        admin_password: fallbackPassword,
        admin_name: fallbackName,
        admin_phone: req.phone,
        admin_credentials: {
          email: fallbackEmail,
          temporary_password: fallbackPassword,
          full_name: fallbackName,
          phone: req.phone
        },
        message: 'Sede aprobada con credenciales'
      };
    }
  };

  // Obtener credenciales del administrador local de una sede
  const getParkingCredentials = async (parkingId) => {
    let serverData = null;
    try {
      const match = String(parkingId).match(/\d+/);
      const numId = match ? Number(match[0]) : Number(parkingId);
      if (!isNaN(numId)) {
        const res = await api.get(`/parkings/${numId}/admin-credentials`);
        serverData = res.data;
      }
    } catch (e) {
      console.warn('getParkingCredentials server not available, checking local store', e);
    }
    if (serverData) return serverData;

    // Fallback local: buscar en approvedAdmins o local credentials o en el establecimiento
    const est = establishments.find(e => String(e.id) === String(parkingId));
    const targetEmail = (est?.email || '').toLowerCase();
    const localCreds = getLocalUserCredentials();
    const matchedCred = localCreds[targetEmail] || Object.values(localCreds).find(c => String(c.parkingId) === String(parkingId));
    const approved = approvedAdmins.find(a => a.email === targetEmail || String(a.establishmentId) === String(parkingId));

    if (matchedCred || approved) {
      return {
        parking_id: parkingId,
        parking_name: est?.name || 'Sede',
        admin_name: matchedCred?.full_name || approved?.name || est?.owner || 'Administrador',
        admin_email: matchedCred?.email || approved?.email || est?.email || '',
        admin_phone: matchedCred?.phone || approved?.phone || est?.phone || '',
        has_account: true,
        has_admin: true,
        is_active: true,
        role: 'local'
      };
    }

    return est ? {
      parking_id: parkingId,
      parking_name: est.name,
      admin_name: est.owner || '',
      admin_email: est.email || '',
      admin_phone: est.phone || '',
      has_account: !!est.email,
      has_admin: !!est.email,
      is_active: true,
      role: 'local'
    } : null;
  };

  // Asignar o resetear credenciales del administrador local de una sede
  const assignParkingCredentials = async (parkingId, credentialsData) => {
    const email = (credentialsData?.email || '').trim().toLowerCase();
    const fullName = credentialsData?.full_name || credentialsData?.fullName || credentialsData?.adminName || '';
    const phone = credentialsData?.phone || credentialsData?.adminPhone || '';
    const password = credentialsData?.password || credentialsData?.adminPassword || '';
    const previousEmail = (credentialsData?.previous_email || credentialsData?.previousEmail || '').trim().toLowerCase();

    // Obtener contraseña previa si la nueva no fue especificada
    const localCreds = getLocalUserCredentials();
    const prevCred = localCreds[email] || (previousEmail ? localCreds[previousEmail] : null) || Object.values(localCreds).find(c => String(c.parkingId) === String(parkingId));
    const effectivePassword = password || prevCred?.password || '';

    const payload = {
      email,
      password: password || undefined,
      fullName: fullName || undefined,
      full_name: fullName || undefined,
      phone: phone || undefined,
      previous_email: previousEmail || undefined,
      previousEmail: previousEmail || undefined
    };

    let serverResult = null;
    try {
      const match = String(parkingId).match(/\d+/);
      const numId = match ? Number(match[0]) : Number(parkingId);
      if (!isNaN(numId)) {
        const res = await api.post(`/parkings/${numId}/admin-credentials`, payload);
        serverResult = res.data;
        await fetchParkings();
      }
    } catch (e) {
      console.error('assignParkingCredentials backend error', e);
      if (e?.response?.data?.detail) {
        throw new Error(e.response.data.detail);
      }
      throw e;
    }

    // Actualizar sede localmente (email, owner, phone)
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (String(est.id) === String(parkingId)) {
          return {
            ...est,
            email: email || est.email,
            owner: fullName || est.owner,
            phone: phone || est.phone
          };
        }
        return est;
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Guardar credenciales en el store local persistente
    if (email) {
      saveLocalUserCredential({
        email,
        password: effectivePassword,
        full_name: fullName,
        phone,
        role: 'local',
        parkingId,
        previousEmail
      });
      const newAdmin = {
        id: Date.now(),
        name: fullName,
        email,
        phone,
        password: effectivePassword,
        establishmentId: String(parkingId),
        role: 'local'
      };
      setApprovedAdmins(prev => [newAdmin, ...prev.filter(a => a.email !== email && (!previousEmail || a.email !== previousEmail))]);
    }

    return serverResult || {
      status: 'success',
      parking_id: parkingId,
      has_account: true,
      has_admin: true,
      is_active: true,
      role: 'local',
      admin_email: email,
      admin_name: fullName,
      temp_password: effectivePassword,
      message: 'Credenciales guardadas y sincronizadas'
    };
  };

  // Rechazar: persiste en servidor
  const rejectAffiliationRequest = async (requestId, reason = '') => {
    try {
      await api.put(`/affiliation-requests/${requestId}/reject`);
      const r2 = await api.get('/affiliation-requests');
      if (Array.isArray(r2.data)) {
        setAffiliationRequests(r2.data.map(r => ({
          id: r.id, parkingName: r.parkingName, ownerName: r.ownerName, email: r.email, phone: r.phone || '', address: r.address || '', city: r.city || '', capacity: r.capacity, rate: r.rate, notes: r.notes || '', status: String(r.status || 'pending').toUpperCase(), createdAt: r.created_at || r.createdAt,
        })));
      }
      return;
    } catch (e) {
      console.warn('reject affiliation fallback', e?.response?.data);
    }
    setAffiliationRequests(prev => prev.map(r => String(r.id) === String(requestId) ? { ...r, status: 'REJECTED', rejectionReason: reason, rejectedAt: new Date().toISOString() } : r));
  };

  // Verificar si un correo corresponde a un administrador de cochera aprobado
  const isApprovedAdminEmail = (email) => {
    if (!email) return false;
    const lower = email.trim().toLowerCase();
    return approvedAdmins.some(a => a.email === lower);
  };

  // Agregar nuevo establecimiento manual - intenta Backend API primero
  const addEstablishment = async (newEst, adminCredentials = null) => {
    const token = getAccessToken();
    if (token || true) {
      try {
        const payload = { 
          name: newEst.name, 
          address: newEst.address, 
          city: newEst.city || 'Ayacucho - Huamanga', 
          latitude: newEst.latitude || -13.1604, 
          longitude: newEst.longitude || -74.2259, 
          hourly_rate: newEst.rate || 5, 
          tolerance_minutes: Math.max(5, Math.min(60, Number(newEst.tolerance) || 15)), 
          status: 'active', 
          total_capacity: newEst.totalSlots || newEst.elements?.filter(e=>e.type==='slot').length || 10, 
          image_url: newEst.image,
          owner: newEst.owner || (role === 'local' ? (user?.name || 'Administración Local') : ''),
          ruc: newEst.ruc || '',
          description: newEst.description || '',
          phone: newEst.phone || (role === 'local' ? (user?.phone || '') : ''),
          whatsapp: newEst.whatsapp || (role === 'local' ? (user?.phone || '') : ''),
          email: adminCredentials?.email || newEst.email || (role === 'local' ? (user?.email || '') : ''),
          schedule: newEst.schedule || 'Lunes a Domingo: 24 Horas',
          reference: newEst.reference || '',
          level: newEst.level || 'Nivel 1 - Superficie',
          maps_url: newEst.mapsUrl || newEst.maps_url || '',
          socials: typeof newEst.socials === 'object' ? JSON.stringify(newEst.socials) : (newEst.socials || ''),
          rate_auto: newEst.rate_auto != null ? Number(newEst.rate_auto) : (Number(newEst.rate) || 5.0),
          rate_suv: newEst.rate_suv != null ? Number(newEst.rate_suv) : 7.0,
          rate_mototaxi: newEst.rate_mototaxi != null ? Number(newEst.rate_mototaxi) : 3.5,
          rate_moto: newEst.rate_moto != null ? Number(newEst.rate_moto) : 2.5,
          billing_unit: newEst.billing_unit || 'hour',
          rate_minute_auto: newEst.rate_minute_auto != null ? Number(newEst.rate_minute_auto) : 0.08,
          rate_minute_suv: newEst.rate_minute_suv != null ? Number(newEst.rate_minute_suv) : 0.12,
          rate_minute_mototaxi: newEst.rate_minute_mototaxi != null ? Number(newEst.rate_minute_mototaxi) : 0.06,
          rate_minute_moto: newEst.rate_minute_moto != null ? Number(newEst.rate_minute_moto) : 0.04,
          min_stay_minutes: Number(newEst.min_stay_minutes || 15),
          max_stay_minutes: Number(newEst.max_stay_minutes || 1440),
          night_shift_enabled: !!newEst.night_shift_enabled,
          night_shift_start: newEst.night_shift_start || '20:00',
          night_shift_end: newEst.night_shift_end || '06:00',
          night_shift_surcharge: Number(newEst.night_shift_surcharge || 0.0),
          require_reservation_prepay: !!newEst.require_reservation_prepay,
          reservation_fee: Number(newEst.reservation_fee || 0.0),
          min_stay_hours: Number(newEst.min_stay_hours || 1),
          max_stay_hours: Number(newEst.max_stay_hours || 24),
          allow_open_stay: newEst.allow_open_stay !== undefined ? !!newEst.allow_open_stay : true
        };
        const hierarchy = getEstablishmentHierarchy(newEst);
        const effectiveCompany = newEst.company_name || newEst.companyName || hierarchy.companyName;
        const effectiveAdminEmail = adminCredentials?.email || (role === 'local' ? user?.email : newEst.email) || newEst.email || '';

        const res = await api.post('/parkings', payload);
        if (res.data?.id) {
          const credsToAssign = adminCredentials || (role === 'local' && user?.email ? {
            email: user.email,
            fullName: user.name || newEst.owner,
            phone: user.phone || newEst.phone
          } : null);

          if (credsToAssign && credsToAssign.email) {
            try {
              await api.post(`/parkings/${res.data.id}/admin-credentials`, credsToAssign);
            } catch (errCred) {
              console.warn('Could not assign admin credentials on addEstablishment', errCred);
            }
          }

          const created = sanitizeEstablishment({ 
            ...newEst, 
            id: String(res.data.id), 
            company_name: effectiveCompany,
            companyName: effectiveCompany,
            admin_email: effectiveAdminEmail,
            adminEmail: effectiveAdminEmail,
            owner: res.data.owner || newEst.owner || '',
            ruc: res.data.ruc || newEst.ruc || '',
            description: res.data.description || newEst.description || '',
            phone: res.data.phone || newEst.phone || '',
            whatsapp: res.data.whatsapp || newEst.whatsapp || '',
            email: res.data.email || newEst.email || '',
            schedule: res.data.schedule || newEst.schedule || 'Lunes a Domingo: 24 Horas',
            reference: res.data.reference || newEst.reference || '',
            level: res.data.level || newEst.level || '',
            mapsUrl: res.data.maps_url || newEst.mapsUrl || '',
            socials: res.data.socials ? (typeof res.data.socials === 'string' ? JSON.parse(res.data.socials) : res.data.socials) : (newEst.socials || {}),
            rate: res.data.hourly_rate, 
            rate_auto: res.data.rate_auto,
            rate_suv: res.data.rate_suv,
            rate_mototaxi: res.data.rate_mototaxi,
            rate_moto: res.data.rate_moto,
            billing_unit: res.data.billing_unit,
            rate_minute_auto: res.data.rate_minute_auto,
            rate_minute_suv: res.data.rate_minute_suv,
            rate_minute_mototaxi: res.data.rate_minute_mototaxi,
            rate_minute_moto: res.data.rate_minute_moto,
            min_stay_minutes: res.data.min_stay_minutes,
            max_stay_minutes: res.data.max_stay_minutes,
            night_shift_enabled: res.data.night_shift_enabled,
            night_shift_start: res.data.night_shift_start,
            night_shift_end: res.data.night_shift_end,
            night_shift_surcharge: res.data.night_shift_surcharge,
            require_reservation_prepay: res.data.require_reservation_prepay,
            reservation_fee: res.data.reservation_fee,
            min_stay_hours: res.data.min_stay_hours,
            max_stay_hours: res.data.max_stay_hours,
            image: res.data.image_url, 
            status: res.data.status === 'active' ? 'Operativo' : res.data.status 
          });
          setEstablishments(prev => [created, ...prev]);
          await fetchParkings();
          return created;
        }
      } catch (e) { console.warn('addEstablishment backend fallback', e.response?.data); }
    }
    const hierarchy = getEstablishmentHierarchy(newEst);
    const effectiveCompany = newEst.company_name || newEst.companyName || hierarchy.companyName;
    const effectiveAdminEmail = adminCredentials?.email || (role === 'local' ? user?.email : newEst.email) || newEst.email || '';
    const fallbackCreated = sanitizeEstablishment({
      ...newEst,
      company_name: effectiveCompany,
      companyName: effectiveCompany,
      admin_email: effectiveAdminEmail,
      adminEmail: effectiveAdminEmail
    });
    setEstablishments(prev => [fallbackCreated, ...prev]);
    return fallbackCreated;
  };

  // Actualizar datos de un establecimiento - persistente
  const updateEstablishment = async (id, updatedFields) => {
    // 1. Actualización inmediata local
    setEstablishments(prev => {
      const next = prev.map(est => String(est.id) === String(id) ? sanitizeEstablishment({ ...est, ...updatedFields }) : est);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    // 2. Resolver ID numérico para el backend
    let numId = Number(id);
    if (isNaN(numId)) {
      const match = String(id).match(/\d+/);
      if (match) numId = Number(match[0]);
    }

    if (!isNaN(numId)) {
      try {
        const payload = {};
        if (updatedFields.name !== undefined) payload.name = updatedFields.name;
        if (updatedFields.address !== undefined) payload.address = updatedFields.address;
        if (updatedFields.city !== undefined) payload.city = updatedFields.city || 'Ayacucho - Huamanga';
        if (updatedFields.owner !== undefined) payload.owner = updatedFields.owner;
        if (updatedFields.ruc !== undefined) payload.ruc = updatedFields.ruc;
        if (updatedFields.description !== undefined) payload.description = updatedFields.description;
        if (updatedFields.phone !== undefined) payload.phone = updatedFields.phone;
        if (updatedFields.whatsapp !== undefined) payload.whatsapp = updatedFields.whatsapp;
        if (updatedFields.email !== undefined) payload.email = updatedFields.email;
        if (updatedFields.schedule !== undefined) payload.schedule = updatedFields.schedule;
        if (updatedFields.reference !== undefined) payload.reference = updatedFields.reference;
        if (updatedFields.level !== undefined) payload.level = updatedFields.level;
        if (updatedFields.mapsUrl !== undefined || updatedFields.maps_url !== undefined) {
          payload.maps_url = updatedFields.mapsUrl || updatedFields.maps_url;
        }
        if (updatedFields.socials !== undefined) {
          payload.socials = typeof updatedFields.socials === 'object' ? JSON.stringify(updatedFields.socials) : String(updatedFields.socials);
        }
        if (updatedFields.rate !== undefined) payload.hourly_rate = Number(updatedFields.rate);
        if (updatedFields.tolerance !== undefined) payload.tolerance_minutes = Math.max(5, Math.min(60, Number(updatedFields.tolerance) || 15));
        if (updatedFields.status !== undefined) payload.status = updatedFields.status === 'Operativo' ? 'active' : updatedFields.status;
        if (updatedFields.image !== undefined) payload.image_url = updatedFields.image;
        if (updatedFields.latitude !== undefined) payload.latitude = Number(updatedFields.latitude);
        if (updatedFields.longitude !== undefined) payload.longitude = Number(updatedFields.longitude);
        if (updatedFields.rate_auto !== undefined) payload.rate_auto = Number(updatedFields.rate_auto);
        if (updatedFields.rate_suv !== undefined) payload.rate_suv = Number(updatedFields.rate_suv);
        if (updatedFields.rate_mototaxi !== undefined) payload.rate_mototaxi = Number(updatedFields.rate_mototaxi);
        if (updatedFields.rate_moto !== undefined) payload.rate_moto = Number(updatedFields.rate_moto);
        if (updatedFields.billing_unit !== undefined) payload.billing_unit = updatedFields.billing_unit;
        if (updatedFields.rate_minute_auto !== undefined) payload.rate_minute_auto = Number(updatedFields.rate_minute_auto);
        if (updatedFields.rate_minute_suv !== undefined) payload.rate_minute_suv = Number(updatedFields.rate_minute_suv);
        if (updatedFields.rate_minute_mototaxi !== undefined) payload.rate_minute_mototaxi = Number(updatedFields.rate_minute_mototaxi);
        if (updatedFields.rate_minute_moto !== undefined) payload.rate_minute_moto = Number(updatedFields.rate_minute_moto);
        if (updatedFields.min_stay_minutes !== undefined) payload.min_stay_minutes = Number(updatedFields.min_stay_minutes);
        if (updatedFields.max_stay_minutes !== undefined) payload.max_stay_minutes = Number(updatedFields.max_stay_minutes);
        if (updatedFields.night_shift_enabled !== undefined) payload.night_shift_enabled = !!updatedFields.night_shift_enabled;
        if (updatedFields.night_shift_start !== undefined) payload.night_shift_start = updatedFields.night_shift_start;
        if (updatedFields.night_shift_end !== undefined) payload.night_shift_end = updatedFields.night_shift_end;
        if (updatedFields.night_shift_surcharge !== undefined) payload.night_shift_surcharge = Number(updatedFields.night_shift_surcharge);
        if (updatedFields.require_reservation_prepay !== undefined) payload.require_reservation_prepay = !!updatedFields.require_reservation_prepay;
        if (updatedFields.reservation_fee !== undefined) payload.reservation_fee = Number(updatedFields.reservation_fee);
        if (updatedFields.min_stay_hours !== undefined) payload.min_stay_hours = Number(updatedFields.min_stay_hours);
        if (updatedFields.max_stay_hours !== undefined) payload.max_stay_hours = Number(updatedFields.max_stay_hours);
        if (updatedFields.allow_open_stay !== undefined) payload.allow_open_stay = !!updatedFields.allow_open_stay;
        
        if (Object.keys(payload).length) {
          await api.put(`/parkings/${numId}`, payload);
          // Re-sincronizar de inmediato para reflejar datos frescos en todas las pestañas y roles
          await fetchParkings();
        }
      } catch (e) { console.warn('updateEstablishment backend fail', e.response?.data); }
    }
  };

  // Actualizar plano topográfico - persistente via sync
  const updateEstablishmentPlan = async (id, elements) => {
    let numId = Number(id);
    if (isNaN(numId)) {
      const match = String(id).match(/\d+/);
      if (match) numId = Number(match[0]);
    }

    const seenCodes = new Set();
    const cleanElements = Array.isArray(elements) ? elements.map((el, idx) => {
      const cleanX = Math.max(0, Math.round(Number(el.x !== undefined ? el.x : (el.pos_x || 0))));
      const cleanY = Math.max(0, Math.round(Number(el.y !== undefined ? el.y : (el.pos_y || 0))));
      const cleanW = Math.max(15, Math.round(Number(el.w !== undefined ? el.w : (el.width || 60))));
      const cleanH = Math.max(15, Math.round(Number(el.h !== undefined ? el.h : (el.height || 100))));
      const cleanRot = Math.round(Number(el.rot !== undefined ? el.rot : (el.rotation || 0))) % 360;

      if (el.type === 'slot') {
        let code = (el.code || '').trim() || `A-${String(idx + 1).padStart(2, '0')}`;
        let uniqueCode = code;
        let counter = 1;
        while (seenCodes.has(uniqueCode.toUpperCase())) {
          uniqueCode = `${code}-${counter++}`;
        }
        seenCodes.add(uniqueCode.toUpperCase());
        return {
          ...el,
          code: uniqueCode,
          x: cleanX,
          y: cleanY,
          w: cleanW,
          h: cleanH,
          rot: cleanRot,
          slotType: el.slotType || el.slot_type || 'auto',
          status: el.status || 'free'
        };
      }
      return {
        ...el,
        x: cleanX,
        y: cleanY,
        w: cleanW,
        h: cleanH,
        rot: cleanRot
      };
    }) : [];

    setEstablishments(prev => {
      const next = prev.map(est => String(est.id) === String(id) ? { ...est, elements: cleanElements } : est);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    if (!isNaN(numId) && cleanElements.length > 0) {
      try {
        const slots = cleanElements.filter(e => e && e.type === 'slot').map(s => ({
          code: s.code,
          floor_level: s.level || s.floor_level || 'Piso 1',
          slot_type: s.slotType || s.slot_type || 'auto',
          status: s.status || 'free',
          pos_x: s.x,
          pos_y: s.y,
          width: s.w,
          height: s.h,
          rotation: s.rot
        }));
        const elems = cleanElements.filter(e => e && e.type !== 'slot').map(e => ({
          element_type: e.type || e.element_type || 'wall',
          pos_x: e.x,
          pos_y: e.y,
          width: e.w,
          height: e.h,
          rotation: e.rot,
          z_index: e.z_index || 1,
          properties_json: e.label ? JSON.stringify({ label: e.label, gateType: e.gateType }) : null
        }));
        await api.post(`/parkings/${numId}/floor-plan/sync`, { parking_id: numId, slots, elements: elems });
      } catch (e) {
        console.warn('sync floor-plan fail', e.response?.data);
      }
    }
  };

  // Eliminar establecimiento - persistente
  const deleteEstablishment = async (id) => {
    setEstablishments(prev => prev.filter(est => String(est.id) !== String(id)));
    const numId = Number(id);
    if (!isNaN(numId)) {
      try { await api.delete(`/parkings/${numId}`); } catch (e) { console.warn('delete backend fail', e.response?.data); }
    }
  };

  // Ocupar o reservar un cajón específico en un establecimiento
  const occupySlot = (establishmentId, slotCode, plate) => {
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (est.id === establishmentId || est.name === establishmentId) {
          const updatedElements = (est.elements || []).map(el => {
            if (el.type === 'slot' && el.code === slotCode) {
              return {
                ...el,
                status: 'occupied',
                plate,
                color: '#10b981'
              };
            }
            return el;
          });
          return { ...est, elements: updatedElements };
        }
        return est;
      });
      return updated;
    });
  };

  // Liberar un cajón específico
  const freeSlot = (establishmentId, slotCode) => {
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (est.id === establishmentId || est.name === establishmentId) {
          const updatedElements = (est.elements || []).map(el => {
            if (el.type === 'slot' && el.code === slotCode) {
              return {
                ...el,
                status: 'free',
                plate: undefined,
                color: undefined
              };
            }
            return el;
          });
          return { ...est, elements: updatedElements };
        }
        return est;
      });
      return updated;
    });
  };

  // ============================================================
  // RESERVAS: la verdad es la respuesta del servidor.
  // localStorage solo se usa como caché de lectura posterior.
  // ============================================================

  // Los IDs del backend son enteros pequeños; los optimistas locales son Date.now()
  const isBackendReservation = (res) => typeof res?.id === 'number' && res.id > 0 && res.id < 10000000000;

  const resolveParkingName = (parkingIdNum) => {
    const est = establishments.find(e => Number(e.id) === Number(parkingIdNum));
    return est ? est.name : `Sede #${parkingIdNum}`;
  };

  const resolveSlotCode = (parkingIdNum, slotIdNum) => {
    const est = establishments.find(e => Number(e.id) === Number(parkingIdNum));
    const slot = (est?.elements || []).find(el => el.type === 'slot' && Number(el.id) === Number(slotIdNum));
    return slot ? slot.code : `#${slotIdNum}`;
  };

  // Mapea la respuesta del backend al formato interno que consume la UI
  const mapServerReservation = (r) => {
    const startDate = parseIsoToDate(r.start_time);
    const endDate = parseIsoToDate(r.end_time);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const tolMinutes = Number(r.tolerance_minutes ?? 15);
    return {
      id: r.id,
      code: r.code,
      token: r.qr_code || r.code,
      parkingId: String(r.parking_id),
      parking: r.parking_name || resolveParkingName(r.parking_id),
      slotId: r.slot_id,
      slot: r.slot_code || resolveSlotCode(r.parking_id, r.slot_id),
      plate: r.license_plate,
      customerName: r.customer_name || 'Conductor Registrado',
      customerPhone: r.customer_phone || '+51 966 000 000',
      customerEmail: r.customer_email || '',
      cost: Number(r.total_cost ?? 0),
      hours: Math.max(1, Math.round((endMs - startMs) / 3600000)) || 1,
      ratePerHour: Number((Number(r.total_cost ?? 0) / Math.max(1, (endMs - startMs) / 3600000)).toFixed(2)),
      status: (r.status || 'scheduled').toUpperCase(),
      startTime: startDate.toISOString(),
      expiresAt: endDate.toISOString(),
      createdAt: r.actual_entry ? parseIsoToDate(r.actual_entry).toISOString() : startDate.toISOString(),
      actualEntry: r.actual_entry ? parseIsoToDate(r.actual_entry).toISOString() : null,
      actualExit: r.actual_exit ? parseIsoToDate(r.actual_exit).toISOString() : null,
      tolerance: tolMinutes,
      arrivalWindow: tolMinutes,
      toleranceMinutes: tolMinutes,
      vehicleType: r.vehicle_type || 'auto',
      estimatedHours: r.estimated_hours || Math.max(1, Math.round((endMs - startMs) / 3600000)) || 1,
      billingUnit: r.billing_unit || 'hour',
      estimatedMinutes: r.estimated_minutes || Math.max(1, Math.round((endMs - startMs) / 60000)) || 60,
      isNightShift: !!r.is_night_shift,
      prepaid: !!r.prepaid,
      isOpenStay: !!r.is_open_stay
    };
  };

  // Refresca las reservas desde el servidor y sincroniza estado + caché
  const refreshMyReservations = async () => {
    if (!getAccessToken()) return;
    try {
      const userSession = (() => { try { return JSON.parse(localStorage.getItem('smart_park_user_session') || '{}'); } catch { return {}; } })();
      const isStaffOrAdmin = userSession?.role === 'local' || userSession?.role === 'platform';

      const data = isStaffOrAdmin 
        ? await api.get('/reservations').then(r => r.data)
        : await listMyReservations();

      if (Array.isArray(data)) {
        const mapped = data.map(mapServerReservation);
        setReservations(mapped);
        try { localStorage.setItem(getReservationsKey(), JSON.stringify(mapped)); } catch {}
      }
    } catch (e) {
      console.warn('No se pudieron refrescar las reservas del servidor', e?.response?.data);
    }
  };

  // Crear nueva reserva: POST real. Solo retorna éxito tras 201 del servidor (sin optimismo local).
  const createReservation = async (bookingData) => {
    let authed = !!getAccessToken();
    let parkingIdNum = Number(bookingData?.parkingId);
    let slotIdNum = Number(bookingData?.slotId);

    // Auto-login de cortesía para usuarios invitados si no tienen sesión activa
    if (!authed) {
      try {
        const tokenRes = await api.post('/auth/login', { email: 'usuario@smartpark.com', password: 'password123' });
        if (tokenRes.data?.access_token) {
          setAccessToken(tokenRes.data.access_token);
          authed = true;
        }
      } catch (e) {
        try {
          const regRes = await api.post('/auth/register', { full_name: 'Usuario Conductor', email: `guest_${Date.now()}@smartpark.com`, password: 'password123', role: 'user' });
          if (regRes.data?.access_token) {
            setAccessToken(regRes.data.access_token);
            authed = true;
          }
        } catch {}
      }
    }

    // Si el parking seleccionado es un ID string local, mapearlo al primer parking real del servidor
    if (isNaN(parkingIdNum) || parkingIdNum <= 0) {
      const validEst = establishments.find(e => !isNaN(Number(e.id)) && Number(e.id) > 0);
      if (validEst) parkingIdNum = Number(validEst.id);
      else parkingIdNum = 1;
    }

    if (isNaN(slotIdNum) && bookingData?.slotCode) {
      const est = establishments.find(e => Number(e.id) === Number(parkingIdNum) || String(e.id) === String(bookingData.parkingId));
      const slot = (est?.elements || []).find(el => el.type === 'slot' && String(el.code) === String(bookingData.slotCode));
      if (slot) slotIdNum = Number(slot.id);
      // Fallback: si el plano aún no está hidratado en memoria, pedirlo directo al servidor
      if (isNaN(slotIdNum)) {
        try {
          const res = await api.get(`/parkings/${parkingIdNum}/floor-plan`);
          const remoteSlot = (res.data?.slots || []).find(s => String(s.code) === String(bookingData.slotCode)) || res.data?.slots?.[0];
          if (remoteSlot) slotIdNum = Number(remoteSlot.id);
        } catch {}
      }
    }

    if (!authed || isNaN(parkingIdNum) || isNaN(slotIdNum)) {
      const msg = 'No se pudo conectar con el servidor para emitir el ticket. Intenta iniciar sesión.';
      console.warn('Reserva bloqueada: ' + msg);
      setBookingError(msg);
      return null;
    }

    // Validar EST-* explícitamente (nunca persistible)
    if (String(bookingData.parkingId).startsWith('EST-')) {
      const msg = 'No se puede emitir ticket sobre una sede demo (EST-*). Registra la sede en el servidor primero.';
      setBookingError(msg);
      return null;
    }

    const plate = (bookingData.plate || 'ABC-123').toUpperCase();
    const startISO = bookingData.startTime instanceof Date ? bookingData.startTime.toISOString() : (bookingData.startTime || new Date().toISOString());
    const endISO = bookingData.expiresAt instanceof Date ? bookingData.expiresAt.toISOString() : (bookingData.expiresAt || new Date(Date.now() + (Number(bookingData.hours || 2)) * 60 * 60 * 1000).toISOString());

    const tolMinutes = Number(bookingData.toleranceMinutes || bookingData.arrivalWindow || bookingData.etaMinutes || 15);

    try {
      const serverRes = await createReservationApi({
        parking_id: parkingIdNum,
        slot_id: slotIdNum,
        license_plate: plate,
        start_time: startISO,
        end_time: endISO,
        tolerance_minutes: tolMinutes,
        payment_method: bookingData.paymentMethod || bookingData.payment_method || null,
        pay_now: !!bookingData.payNow,
        vehicle_type: bookingData.vehicleType || bookingData.vehicle_type || 'auto',
        estimated_hours: Number(bookingData.estimatedHours || bookingData.hours || 1),
        billing_unit: bookingData.billingUnit || bookingData.billing_unit || 'hour',
        estimated_minutes: Number(bookingData.estimatedMinutes || bookingData.estimated_minutes || (bookingData.hours ? bookingData.hours * 60 : 60)),
        is_open_stay: !!(bookingData.isOpenStay ?? bookingData.is_open_stay ?? true)
      });
      setBookingError(null);
      const mapped = mapServerReservation(serverRes);
      // Refrescar lista completa y plano (para que cajón pase a reservado en vivo)
      await refreshMyReservations();
      try { await fetchParkings(); await hydrateFloorPlan(String(parkingIdNum), true); } catch {}
      return mapped;
    } catch (e) {
      const raw = e?.response?.data?.detail;
      const detail = Array.isArray(raw) ? raw.map(d=> d?.msg || JSON.stringify(d)).join(', ') : (typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : 'No se pudo registrar la reserva en el servidor (cajón ocupado o datos inválidos).');
      console.warn('Reserva rechazada:', detail);
      setBookingError(detail);
      return { error: detail };
    }
  };

  // Cancelar reserva: PUT /reservations/{id}/cancel cuando existe en el servidor
  const cancelReservation = async (code) => {
    const target = reservations.find(r => r.code === code || String(r.id) === String(code));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };

    if (isBackendReservation(target)) {
      try {
        await cancelReservationApi(target.id);
        freeSlot(target.parkingId, target.slot);
        await refreshMyReservations();
        // Refrescar plano real del servidor para que el cajón aparezca libre
        try {
          if (target.parkingId) await hydrateFloorPlan(String(target.parkingId), true);
        } catch {}
        return { ok: true, message: `Reserva ${code} cancelada. Plaza ${target.slot} liberada.` };
      } catch (e) {
        const s = e?.response?.status;
        return {
          ok: false,
          status: s,
          detail: e?.response?.data?.detail,
          message: s === 403
            ? 'Solo operadores autorizados pueden modificar esta reserva.'
            : (e?.response?.data?.detail || 'No se pudo cancelar la reserva.')
        };
      }
    }

    // Fallback local solo para datos demo sin backend (no simula persistencia)
    updateReservationStatusLocal(target.code, 'CANCELLED');
    return { ok: true, message: `Reserva ${code} cancelada localmente (sin registro en servidor).` };
  };

  // Check-In de garita: PUT /reservations/{id}/check-in → status active (con horas de estadía opcional)
  const checkInReservation = async (code, hoursStay = null) => {
    const target = reservations.find(r => r.code === code || String(r.id) === String(code));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };
    if (!isBackendReservation(target)) {
      return { ok: false, message: 'Esta reserva aún no está registrada en el servidor; no se puede registrar el ingreso.' };
    }
    try {
      const params = hoursStay ? { hours_stay: hoursStay } : {};
      await api.put(`/reservations/${target.id}/check-in`, null, { params });
      await refreshMyReservations();
      if (target.parkingId) await hydrateFloorPlan(String(target.parkingId), true);
      return { ok: true, message: `Entrada registrada: vehículo ${target.plate} ingresó a la plaza ${target.slot}.` };
    } catch (e) {
      const s = e?.response?.status;
      return {
        ok: false,
        status: s,
        detail: e?.response?.data?.detail,
        message: s === 403
          ? 'Solo los operadores de garita (local/plataforma) pueden registrar ingresos.'
          : (e?.response?.data?.detail || 'No se pudo registrar el check-in.')
      };
    }
  };

  // Check-Out de garita: PUT /reservations/{id}/check-out → status completed
  const checkOutReservation = async (code, checkoutData = {}) => {
    const target = reservations.find(r => r.code === code || String(r.id) === String(code));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };
    if (!isBackendReservation(target)) {
      return { ok: false, message: 'Esta reserva aún no está registrada en el servidor; no se puede registrar la salida.' };
    }
    try {
      const payload = {};
      if (checkoutData.payment_method) payload.payment_method = checkoutData.payment_method;
      if (checkoutData.amount_paid !== undefined && checkoutData.amount_paid !== null) {
        payload.amount_paid = Number(checkoutData.amount_paid);
      }
      const res = await api.put(`/reservations/${target.id}/check-out`, payload);
      await refreshMyReservations();
      if (target.parkingId) await hydrateFloorPlan(String(target.parkingId), true);
      return { 
        ok: true, 
        message: `Salida registrada para ${target.plate}. Cajón ${target.slot} liberado.`,
        data: res.data
      };
    } catch (e) {
      const s = e?.response?.status;
      return {
        ok: false,
        status: s,
        detail: e?.response?.data?.detail,
        message: s === 403
          ? 'Solo los operadores de garita (local/plataforma) pueden registrar salidas.'
          : (e?.response?.data?.detail || 'No se pudo registrar el check-out.')
      };
    }
  };

  // Mutación de estado puramente local (solo datos demo sin backend)
  const updateReservationStatusLocal = (code, newStatus) => {
    const target = reservations.find(r => r.code === code);
    if (!target) return;

    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      freeSlot(target.parkingId, target.slot);
    } else if (newStatus === 'ACTIVE') {
      occupySlot(target.parkingId, target.slot, target.plate);
    }

    const updated = reservations.map(r => r.code === code ? { ...r, status: newStatus } : r);
    saveReservations(updated);
  };

  // Compatibilidad con llamadas existentes: enruta hacia las acciones reales del servidor
  const updateReservationStatus = (code, newStatus, hoursStay = null) => {
    if (newStatus === 'ACTIVE') return checkInReservation(code, hoursStay);
    if (newStatus === 'COMPLETED') return checkOutReservation(code);
    if (newStatus === 'CANCELLED') return cancelReservation(code);
    updateReservationStatusLocal(code, newStatus);
    return Promise.resolve({ ok: true });
  };

  const completeReservation = (code) => checkOutReservation(code);

  // Restablecer valores por defecto
  const resetToDefaults = () => {
    setEstablishments(INITIAL_ESTABLISHMENTS);
    setReservations(INITIAL_RESERVATIONS);
    setAffiliationRequests(INITIAL_AFFILIATION_REQUESTS);
    setApprovedAdmins([]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ESTABLISHMENTS));
      localStorage.setItem(getReservationsKey(), JSON.stringify(INITIAL_RESERVATIONS));
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_AFFILIATION_REQUESTS));
      localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
  };

  return (
    <EstablishmentContext.Provider value={{
      establishments,
      setEstablishments,
      myEstablishments,
      isMyEstablishment,
      getEstablishmentHierarchy,
      reservations,
      setReservations,
      affiliationRequests,
      approvedAdmins,
      createAffiliationRequest,
      approveAffiliationRequest,
      rejectAffiliationRequest,
      isApprovedAdminEmail,
      getParkingCredentials,
      assignParkingCredentials,
      addEstablishment,
      updateEstablishment,
      updateEstablishmentPlan,
      ensureFloorPlan,
      fetchParkings,
      hydrateFloorPlan,
      deleteEstablishment,
      occupySlot,
      freeSlot,
      createReservation,
      bookingError,
      refreshMyReservations,
      updateReservationStatus,
      cancelReservation,
      checkInReservation,
      checkOutReservation,
      completeReservation,
      resetToDefaults,
      saveLocalUserCredential,
      getLocalUserCredentials
    }}>
      {children}
    </EstablishmentContext.Provider>
  );
};

export const useEstablishments = () => {
  const context = useContext(EstablishmentContext);
  if (!context) {
    throw new Error('useEstablishments must be used within an EstablishmentProvider');
  }
  return context;
};
