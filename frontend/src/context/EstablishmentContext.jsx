import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAccessToken, listMyReservations, createReservationApi, cancelReservationApi } from '../services/api';
import api from '../services/api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'smart_park_unified_establishments_v2';
const RESERVATIONS_STORAGE_KEY_BASE = 'smart_park_unified_reservations_v2';
const REQUESTS_STORAGE_KEY = 'smart_park_affiliation_requests_v1';
const APPROVED_ADMINS_STORAGE_KEY = 'smart_park_approved_admins_v1';
export const LOCAL_USER_CREDENTIALS_KEY = 'smart_park_local_user_credentials_v1';
export const DELETED_ESTABLISHMENTS_KEY = 'smart_park_deleted_est_ids_v2';

export const getDeletedEstablishmentIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_ESTABLISHMENTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch {}
  return new Set();
};

export const recordDeletedEstablishmentId = (...ids) => {
  try {
    const current = getDeletedEstablishmentIds();
    ids.forEach(id => {
      if (id !== undefined && id !== null && String(id).trim() && String(id) !== 'NaN') {
        current.add(String(id).trim());
      }
    });
    localStorage.setItem(DELETED_ESTABLISHMENTS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
};

export const unrecordDeletedEstablishmentId = (id) => {
  try {
    const current = getDeletedEstablishmentIds();
    if (id) {
      current.delete(String(id).trim());
      localStorage.setItem(DELETED_ESTABLISHMENTS_KEY, JSON.stringify(Array.from(current)));
    }
  } catch {}
};

// Helper para persistir credenciales de usuarios/admins locales tanto en modo online como offline
export const saveLocalUserCredential = (cred) => {
  try {
    if (!cred || !cred.email) return;
    const emailKey = cred.email.trim().toLowerCase();
    const prevEmailKey = (cred.previousEmail || cred.previous_email || '').trim().toLowerCase();
    const existingRaw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};

    const prevEntry = existing[emailKey] || (prevEmailKey ? existing[prevEmailKey] : null) || (cred.parkingId ? Object.values(existing).find(c => String(c.parkingId) === String(cred.parkingId)) : null);
    const finalPin = cred.security_pin || cred.pin || prevEntry?.pin || '';
    const phoneVal = cred.phone || cred.dni || prevEntry?.phone || '';

    const positionVal = cred.position || prevEntry?.position || 'Operador de Garita';
    const shiftVal = cred.shift || prevEntry?.shift || '';

    existing[emailKey] = {
      email: emailKey,
      password: finalPassword,
      pin: finalPin,
      full_name: cred.full_name || cred.name || cred.fullName || prevEntry?.full_name || 'Administrador',
      phone: phoneVal,
      role: cred.role || prevEntry?.role || 'local',
      position: positionVal,
      shift: shiftVal,
      isStaffOperator: true,
      is_staff: true,
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

// Normalizador de IDs para compatibilidad total entre maquetas históricas (EST-01..EST-04) y servidor (1..4)
export const normalizeParkingId = (id) => {
  const s = String(id || '').trim();
  if (s === 'EST-01') return '1';
  if (s === 'EST-02') return '4';
  if (s === 'EST-03') return '3';
  if (s === 'EST-04') return '2';
  return s;
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

// Helper centralizado para detectar y filtrar sedes demo o de prueba residuales
export const isDemoEstablishment = (e) => {
  if (!e) return false;
  const sid = String(e.id || '');
  if (sid.startsWith('EST-')) return true;
  if (e.isDemo === true) return true;
  return false;
};

// Helper universal para detectar si el usuario es un operador o personal asignado a garita
export const isStaffOperatorUser = (user) => {
  if (!user) return false;
  const adminEmails = ['adminlocal@smartpark.com', 'superadmin@smartpark.com'];
  const email = (user.email || '').toLowerCase().trim();
  if (adminEmails.includes(email)) return false;

  // 1. Flags explícitos de sesión / API
  if (user.is_staff_operator !== undefined && user.is_staff_operator !== null) {
    if (Boolean(user.is_staff_operator)) return true;
  }
  if (user.isStaffOperator !== undefined && user.isStaffOperator !== null) {
    if (Boolean(user.isStaffOperator)) return true;
  }
  if (user.is_staff !== undefined && user.is_staff !== null) {
    if (Boolean(user.is_staff)) return true;
  }

  // 2. Cargo / Posición de trabajador de garita o seguridad
  const pos = (user.position || user.cargo || user.staffPosition || '').toLowerCase().trim();
  if (pos) {
    const isStaffPos = ['operador', 'garita', 'seguridad', 'vigilante', 'cajero', 'trabajador', 'asistente', 'tecnico', 'técnico'].some(k => pos.includes(k));
    if (isStaffPos) return true;
  }

  // 3. Credenciales locales almacenadas
  try {
    const raw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
    if (raw && email) {
      const creds = JSON.parse(raw);
      const myCred = creds[email];
      if (myCred?.isStaffOperator || myCred?.is_staff) return true;
      const cPos = (myCred?.position || '').toLowerCase();
      if (cPos && ['operador', 'garita', 'seguridad', 'vigilante', 'cajero', 'trabajador'].some(k => cPos.includes(k))) {
        return true;
      }
    }
  } catch {}

  return false;
};

// Helper universal para extraer la empresa autorizada para un usuario local (Admin Local / Garita)
export const getUserAuthorizedCompanyNames = (user, establishments = []) => {
  if (!user) return new Set();
  // Los trabajadores de garita nunca se autorizan a nivel de empresa multi-sede
  if (isStaffOperatorUser(user)) {
    return new Set();
  }
  const userEmail = (user.email || '').trim().toLowerCase();
  const authorizedCompanies = new Set();

  // 1. Empresa explícita en el perfil del usuario
  if (user.companyName) authorizedCompanies.add(user.companyName.trim().toLowerCase());
  if (user.establishmentName) {
    const hier = getEstablishmentHierarchy({ name: user.establishmentName });
    if (hier.companyName) authorizedCompanies.add(hier.companyName.trim().toLowerCase());
  }

  // 2. ID de establecimiento asignado directamente en sesión del usuario
  const userAssignedIds = [user.parking_id, user.parkingId, user.establishmentId]
    .filter(Boolean)
    .map(id => String(id));

  userAssignedIds.forEach(id => {
    const norm = normalizeParkingId(id);
    const matched = (establishments || []).find(e => String(e.id) === id || String(e.id) === norm);
    if (matched) {
      const { companyName } = getEstablishmentHierarchy(matched);
      if (companyName) authorizedCompanies.add(companyName.trim().toLowerCase());
    }
  });

  // 3. Coincidencia por correo electrónico del usuario
  if (userEmail) {
    (establishments || []).forEach(est => {
      const eMail = (est.email || '').trim().toLowerCase();
      const aMail = (est.admin_email || est.adminEmail || '').trim().toLowerCase();
      if (eMail === userEmail || aMail === userEmail) {
        const { companyName } = getEstablishmentHierarchy(est);
        if (companyName) authorizedCompanies.add(companyName.trim().toLowerCase());
      }
    });

    // 4. Búsqueda en credenciales locales persistentes (smart_park_local_user_credentials_v1)
    try {
      const credsRaw = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
      if (credsRaw) {
        const creds = JSON.parse(credsRaw);
        const myCred = creds[userEmail];
        if (myCred) {
          if (myCred.companyName) authorizedCompanies.add(myCred.companyName.trim().toLowerCase());
          if (myCred.establishmentName) {
            const h = getEstablishmentHierarchy({ name: myCred.establishmentName });
            if (h.companyName) authorizedCompanies.add(h.companyName.trim().toLowerCase());
          }
          if (myCred.parkingId) {
            const pid = String(myCred.parkingId);
            const pNorm = normalizeParkingId(pid);
            const matched = (establishments || []).find(e => String(e.id) === pid || String(e.id) === pNorm);
            if (matched) {
              const { companyName } = getEstablishmentHierarchy(matched);
              if (companyName) authorizedCompanies.add(companyName.trim().toLowerCase());
            }
          }
        }
      }
    } catch {}

    // 5. Búsqueda en administradores aprobados persistentes (smart_park_approved_admins_v1)
    try {
      const approvedRaw = localStorage.getItem('smart_park_approved_admins_v1');
      if (approvedRaw) {
        const approvedList = JSON.parse(approvedRaw);
        if (Array.isArray(approvedList)) {
          const match = approvedList.find(a => (a.email || '').trim().toLowerCase() === userEmail);
          if (match) {
            if (match.companyName) authorizedCompanies.add(match.companyName.trim().toLowerCase());
            if (match.establishmentName) {
              const h = getEstablishmentHierarchy({ name: match.establishmentName });
              if (h.companyName) authorizedCompanies.add(h.companyName.trim().toLowerCase());
            }
            if (match.establishmentId) {
              const eid = String(match.establishmentId);
              const eNorm = normalizeParkingId(eid);
              const matched = (establishments || []).find(e => String(e.id) === eid || String(e.id) === eNorm);
              if (matched) {
                const { companyName } = getEstablishmentHierarchy(matched);
                if (companyName) authorizedCompanies.add(companyName.trim().toLowerCase());
              }
            }
          }
        }
      }
    } catch {}
  }

  // 6. Aislamiento estricto de multitenancy:
  // Si no hay empresa identificada todavía, se asocia a la empresa de su garita activa o a la primera empresa legítima,
  // pero NUNCA a todas las empresas a la vez.
  if (authorizedCompanies.size === 0 && Array.isArray(establishments) && establishments.length > 0) {
    let fallbackEst = null;
    try {
      const savedActive = localStorage.getItem('smart_park_active_garita_est');
      if (savedActive) {
        fallbackEst = establishments.find(e => String(e.id) === String(savedActive) && !isDemoEstablishment(e));
      }
    } catch {}

    if (!fallbackEst) {
      fallbackEst = establishments.find(e => !isDemoEstablishment(e)) || establishments[0];
    }

    if (fallbackEst) {
      const { companyName } = getEstablishmentHierarchy(fallbackEst);
      if (companyName) authorizedCompanies.add(companyName.trim().toLowerCase());
    }
  }

  return authorizedCompanies;
};

// Helper estricto para validar si un establecimiento/sucursal le pertenece al usuario actual (Admin Local o Garita)
export const isMyEstablishment = (est, user, role, allEstablishments = null) => {
  if (!est) return false;
  if (isDemoEstablishment(est)) return false; // Las sedes demo nunca le pertenecen a nadie
  if (role === 'platform') return true; // Super Admin ve todas las sedes legítimas
  if (role !== 'local') return true;   // Conductor ve todas las legítimas activas en su módulo
  if (!user) return false;

  // 1. REGLA ESTRICTA PARA TRABAJADORES / OPERADORES DE GARITA:
  // Un colaborador sólo tiene permiso y visibilidad sobre la sede/sucursal exacta donde fue designado.
  // No debe heredar otras sucursales de la empresa ni sedes hermanas.
  if (isStaffOperatorUser(user)) {
    const assignedId = user.parking_id || user.parkingId || user.establishmentId;
    if (!assignedId) return false;
    const estIdStr = String(est.id || '').trim();
    const assignedStr = String(assignedId).trim();
    return estIdStr === assignedStr || 
           normalizeParkingId(estIdStr) === normalizeParkingId(assignedStr) ||
           estIdStr.replace(/\D/g, '') === assignedStr.replace(/\D/g, '');
  }

  // 2. REGLA PARA ADMINISTRADOR LOCAL / DUEÑO DE EMPRESA:
  // El dueño de la empresa gestiona todas las sucursales que pertenecen a su marca registrada.
  const estHierarchy = getEstablishmentHierarchy(est);
  const estCompany = (estHierarchy.companyName || '').trim().toLowerCase();
  if (!estCompany) return false;

  let pool = allEstablishments;
  if (!pool || !pool.length) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          pool = parsed;
        }
      }
    } catch {}
  }
  if (!pool || !pool.length) {
    pool = [est];
  }

  const authorizedCompanies = getUserAuthorizedCompanyNames(user, pool);
  return authorizedCompanies.has(estCompany);
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

export const INITIAL_ESTABLISHMENTS = [];

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
    parkingId: '1',
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
    parkingId: '1',
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
    parkingId: '4',
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
    rate_monthly_auto: Number(est.rate_monthly_auto ?? 180.00),
    rate_monthly_suv: Number(est.rate_monthly_suv ?? 240.00),
    rate_monthly_mototaxi: Number(est.rate_monthly_mototaxi ?? 120.00),
    rate_monthly_moto: Number(est.rate_monthly_moto ?? 90.00),
    rate_monthly: Number(est.rate_monthly ?? est.rate_monthly_auto ?? 180.00),
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
    status: (() => {
      const s = String(est.status || '').toLowerCase();
      if (s === 'active' || s === 'operativo') return 'Operativo';
      if (s === 'closed' || s === 'cerrado') return 'Cerrado';
      return 'Mantenimiento';
    })(),
    image: est.image || est.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    image_url: est.image_url || est.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    allow_open_stay: est.allow_open_stay !== undefined ? !!est.allow_open_stay : true
  };
};

const EstablishmentContext = createContext();

export const EstablishmentProvider = ({ children }) => {
  const { user, role } = useAuth();

  const [establishments, setEstablishments] = useState(() => {
    const deletedIds = getDeletedEstablishmentIds();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter(e => !deletedIds.has(String(e.id)))
            .filter(e => !isDemoEstablishment(e))
            .map((e, idx) => sanitizeEstablishment(e, idx));
        }
      }
    } catch (e) {
      console.error('Error reading establishments from storage:', e);
    }
    return [];
  });

  // Establecimientos filtrados que le pertenecen exclusivamente al usuario autenticado (Admin Local)
  const myEstablishments = React.useMemo(() => {
    return establishments.filter(est => isMyEstablishment(est, user, role, establishments));
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

  const [wsConnected, setWsConnected] = useState(false);

  // Auto-scrubber auto-sanador: limpia en el montaje cualquier residuo de sedes demo (Plaza Mayor, Bellido, Mercado Cáceres, EST-xx)
  // heredadas en localStorage de pruebas previas, protegiendo a todas las cuentas y garantizando
  // que PostgreSQL sea la única fuente de verdad.
  useEffect(() => {
    try {
      // 1. Limpiar smart_park_unified_establishments_v2
      const rawEst = localStorage.getItem(STORAGE_KEY);
      if (rawEst) {
        const parsed = JSON.parse(rawEst);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(e => !isDemoEstablishment(e));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            setEstablishments(cleaned.map((e, idx) => sanitizeEstablishment(e, idx)));
          }
        }
      }

      // 2. Limpiar smart_park_local_user_credentials_v1
      const rawCreds = localStorage.getItem(LOCAL_USER_CREDENTIALS_KEY);
      if (rawCreds) {
        const parsedCreds = JSON.parse(rawCreds);
        let credsChanged = false;
        Object.keys(parsedCreds).forEach(emailKey => {
          const c = parsedCreds[emailKey];
          const pid = String(c?.parkingId || '');
          if (c && (pid.startsWith('EST-') || ['1', '2', '3', '4', '16'].includes(pid))) {
            delete parsedCreds[emailKey];
            credsChanged = true;
          }
        });
        if (credsChanged) {
          localStorage.setItem(LOCAL_USER_CREDENTIALS_KEY, JSON.stringify(parsedCreds));
        }
      }

      // 3. Limpiar smart_park_approved_admins_v1
      const rawApproved = localStorage.getItem(APPROVED_ADMINS_STORAGE_KEY);
      if (rawApproved) {
        const parsedApproved = JSON.parse(rawApproved);
        if (Array.isArray(parsedApproved)) {
          const cleanedApproved = parsedApproved.filter(a => {
            const eid = String(a?.establishmentId || '');
            return !eid.startsWith('EST-') && !['1', '2', '3', '4', '16'].includes(eid);
          });
          if (cleanedApproved.length !== parsedApproved.length) {
            localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify(cleanedApproved));
            setApprovedAdmins(cleanedApproved);
          }
        }
      }

      // 4. Limpiar smart_park_user_session si apuntaba a una sede demo
      const rawSession = localStorage.getItem('smart_park_user_session');
      if (rawSession) {
        const sessionUser = JSON.parse(rawSession);
        let sessionChanged = false;
        const upid = String(sessionUser?.parking_id || '');
        const ueid = String(sessionUser?.establishmentId || '');
        if (upid && (upid.startsWith('EST-') || ['1', '2', '3', '4', '16'].includes(upid))) {
          delete sessionUser.parking_id;
          sessionChanged = true;
        }
        if (ueid && (ueid.startsWith('EST-') || ['1', '2', '3', '4', '16'].includes(ueid))) {
          delete sessionUser.establishmentId;
          sessionChanged = true;
        }
        if (sessionChanged) {
          localStorage.setItem('smart_park_user_session', JSON.stringify(sessionUser));
        }
      }
    } catch (err) {
      console.warn('Auto-scrubber cleanup error:', err);
    }
  }, []);

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
      rot: e.rotation || 0, label: extra.label, gateType: extra.gateType
    };
  };

  // Evita re-hidratar en cada ciclo de polling las cocheras cuyo plano es legítimamente vacío
  const hydratedPlansRef = useRef(new Set());
  const floorPlanInFlightRef = useRef(new Map());
  const floorPlanLastFetchRef = useRef(new Map());

  // Carga el plano real (plazas + muros) desde GET /parkings/{id}/floor-plan y lo fusiona en el estado
  const hydrateFloorPlan = async (id, force = false) => {
    const key = String(id);
    const normKey = normalizeParkingId(key);
    let numId = Number(normKey);
    if (isNaN(numId)) {
      const match = String(id).match(/\d+/);
      if (match) numId = Number(match[0]);
    }
    if (isNaN(numId)) return;
    const strNumId = String(numId);

    // Si ya hay una petición en curso para este parking, reutilizar la misma promesa
    if (floorPlanInFlightRef.current.has(strNumId)) {
      return floorPlanInFlightRef.current.get(strNumId);
    }

    // Cooldown de 5 segundos entre peticiones para proteger contra bucles y rate limiting
    const now = Date.now();
    const lastFetch = floorPlanLastFetchRef.current.get(strNumId) || 0;
    if (now - lastFetch < 5000 && !force) {
      return;
    }
    if (!force && hydratedPlansRef.current.has(strNumId)) return;
    hydratedPlansRef.current.add(strNumId);
    hydratedPlansRef.current.add(key);
    floorPlanLastFetchRef.current.set(strNumId, now);

    const task = (async () => {
      try {
        const res = await api.get(`/parkings/${numId}/floor-plan`);
        const slots = (Array.isArray(res.data?.slots) ? res.data.slots : []).map(mapServerSlot);
        const elements = (Array.isArray(res.data?.elements) ? res.data.elements : []).map(mapServerElement);
        const fullElements = [...elements, ...slots];
        setEstablishments(prev => {
          const next = prev.map(est => {
            const matchExact = String(est.id) === key;
            const matchNum = String(est.id) === String(numId);
            const matchNorm = normalizeParkingId(String(est.id)) === String(numId);
            if (matchExact || matchNum || matchNorm) {
              return { ...est, elements: fullElements, _needsFloorPlan: false };
            }
            return est;
          });
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        try {
          window.dispatchEvent(new CustomEvent('smart_park_floorplan_updated', {
            detail: { parkingId: String(numId), elements: fullElements, slots }
          }));
        } catch {}
        return fullElements;
      } catch {
        hydratedPlansRef.current.delete(key);
        hydratedPlansRef.current.delete(strNumId);
      } finally {
        floorPlanInFlightRef.current.delete(strNumId);
      }
    })();

    floorPlanInFlightRef.current.set(strNumId, task);
    return task;
  };

  // Garantiza que un establecimiento tenga su plano cargado antes de abrirlo (uso desde UI)
  const ensureFloorPlan = (id, force = false) => {
    const norm = normalizeParkingId(String(id));
    const est = establishments.find(e => String(e.id) === String(id) || String(e.id) === norm || normalizeParkingId(String(e.id)) === norm);
    if (force || !est || est.elements === null || est.elements === undefined || est._needsFloorPlan || (Array.isArray(est.elements) && est.elements.length === 0)) {
      return hydrateFloorPlan(id, force);
    }
    return Promise.resolve(est.elements);
  };

  const fetchParkings = async () => {
    try {
      const res = await api.get('/parkings');
      const deletedIds = getDeletedEstablishmentIds();
      if (Array.isArray(res.data)) {
        const mappedParkings = res.data
          .filter(p => !deletedIds.has(String(p.id)) && !isDemoEstablishment(p))
          .map((p, idx) => sanitizeEstablishment({
            id: String(p.id), 
            name: p.name, 
            address: p.address, 
            city: p.city || 'Ayacucho - Huamanga', 
            latitude: Number(p.latitude), 
            longitude: Number(p.longitude), 
            rate: Number(p.hourly_rate) || 5.00, 
            tolerance: Number(p.tolerance_minutes) || 15,
            status: (() => {
              const s = String(p.status || '').toLowerCase();
              if (s === 'active' || s === 'operativo') return 'Operativo';
              if (s === 'closed' || s === 'cerrado') return 'Cerrado';
              return 'Mantenimiento';
            })(), 
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
            rate_monthly_auto: p.rate_monthly_auto != null ? Number(p.rate_monthly_auto) : undefined,
            rate_monthly_suv: p.rate_monthly_suv != null ? Number(p.rate_monthly_suv) : undefined,
            rate_monthly_mototaxi: p.rate_monthly_mototaxi != null ? Number(p.rate_monthly_mototaxi) : undefined,
            rate_monthly_moto: p.rate_monthly_moto != null ? Number(p.rate_monthly_moto) : undefined,
            rate_monthly: p.rate_monthly != null ? Number(p.rate_monthly) : undefined,
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
            subscription_enabled: p.subscription_enabled !== undefined ? !!p.subscription_enabled : true,
            custom_rates: p.custom_rates || null,
            elements: null, 
            _needsFloorPlan: true
          }, idx));

        setEstablishments(prev => {
          const serverIds = new Set(mappedParkings.map(m => String(m.id)));
          const serverNames = new Set(mappedParkings.map(m => (m.name || '').trim().toLowerCase()));

          const preservedLocal = prev.filter(e => {
            const idStr = String(e.id);
            if (serverIds.has(idStr)) return false;
            if (deletedIds.has(idStr)) return false;
            if (isDemoEstablishment(e)) return false;
            const normName = (e.name || '').trim().toLowerCase();
            if (serverNames.has(normName)) return false;
            return e.isUnsavedDraft === true;
          });

          const prevMap = new Map(prev.map(e => [String(e.id), e]));
          const getBefore = (sid) => prevMap.get(String(sid));

          const merged = mappedParkings.map(m => {
            const before = getBefore(String(m.id)) || getBefore(normalizeParkingId(String(m.id)));
            const hasElements = Array.isArray(before?.elements) && before.elements.length > 0;
            return {
              ...m,
              ...(before?.password ? { password: before.password } : {}),
              ...(hasElements ? { elements: before.elements, _needsFloorPlan: false } : {})
            };
          });
          const next = [...merged, ...preservedLocal]
            .filter(e => !deletedIds.has(String(e.id)) && !isDemoEstablishment(e))
            .map((e, idx) => sanitizeEstablishment(e, idx));
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
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
        ws.onopen = () => {
          setWsConnected(true);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.event === 'pong') return;

            // Disparar eventos CustomEvent tipados para sincronización instantánea de componentes reactivos
            if (msg.payload || msg.event) {
              try {
                const eventPayload = { ...(msg.payload || {}), event: msg.event };
                if (msg.event === 'spaces:update') {
                  window.dispatchEvent(new CustomEvent('smart_park_spaces_live', { detail: eventPayload }));
                } else if (msg.event && (msg.event.startsWith('reservations:') || msg.event === 'reservations:updated')) {
                  window.dispatchEvent(new CustomEvent('smart_park_reservation_live', { detail: eventPayload }));
                }
              } catch {}
            }

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
              if (msg.payload?.reservation_id && msg.payload?.reservation_status) {
                setReservations(prev => (prev || []).map(r => {
                  if (String(r.id) === String(msg.payload.reservation_id) || (msg.payload.code && r.code === msg.payload.code)) {
                    return {
                      ...r,
                      status: msg.payload.reservation_status,
                      ...(msg.payload.actual_entry ? { actual_entry: msg.payload.actual_entry, actualEntry: msg.payload.actual_entry } : {}),
                      ...(msg.payload.actual_exit ? { actual_exit: msg.payload.actual_exit, actualExit: msg.payload.actual_exit } : {}),
                      ...(msg.payload.amount_paid !== undefined ? { amount_paid: msg.payload.amount_paid } : {})
                    };
                  }
                  return r;
                }));
              }
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
        ws.onclose = () => { 
          setWsConnected(false);
          wsReconnectTimer = setTimeout(connectWs, 3000); 
        };
        ws.onerror = () => { 
          setWsConnected(false);
          try { ws.close(); } catch {} 
        };
        const ping = setInterval(() => { if (ws && ws.readyState === WebSocket.OPEN) try { ws.send('ping'); } catch {} }, 25000);
        ws.addEventListener('close', () => clearInterval(ping));
      } catch {
        setWsConnected(false);
      }
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
      console.warn('approve affiliation backend error', e?.response?.data || e);
      throw new Error(e?.response?.data?.detail || 'Error al aprobar la solicitud de afiliación en el servidor.');
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

    // Recuperar contraseña guardada en almacenamiento local o en el establecimiento
    const est = establishments.find(e => String(e.id) === String(parkingId));
    const targetEmail = (serverData?.admin_email || serverData?.email || est?.email || '').toLowerCase();
    const localCreds = getLocalUserCredentials();
    const matchedCred = localCreds[targetEmail] || Object.values(localCreds).find(c => String(c.parkingId) === String(parkingId));
    const approved = approvedAdmins.find(a => (targetEmail && (a.email || '').toLowerCase() === targetEmail) || String(a.establishmentId) === String(parkingId));
    const savedPassword = (matchedCred?.password || approved?.password || est?.password || '').trim();

    if (serverData) {
      return {
        ...serverData,
        password: savedPassword || serverData.temp_password || '',
        temp_password: savedPassword || serverData.temp_password || ''
      };
    }

    // Fallback local: buscar en approvedAdmins o local credentials o en el establecimiento
    if (matchedCred || approved) {
      return {
        parking_id: parkingId,
        parking_name: est?.name || 'Sede',
        admin_name: matchedCred?.full_name || approved?.name || est?.owner || 'Administrador',
        admin_email: matchedCred?.email || approved?.email || est?.email || '',
        admin_phone: matchedCred?.phone || approved?.phone || est?.phone || '',
        password: savedPassword,
        temp_password: savedPassword,
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
      password: savedPassword,
      temp_password: savedPassword,
      has_account: !!est.email,
      has_admin: !!est.email,
      is_active: true,
      role: 'local'
    } : null;
  };

  // Asignar o resetear credenciales del administrador local de una sede
  const assignParkingCredentials = async (parkingId, credentialsData) => {
    const email = (credentialsData?.email || '').trim().toLowerCase();
    const fullName = (credentialsData?.full_name || credentialsData?.fullName || credentialsData?.adminName || '').trim();
    const phone = (credentialsData?.phone || credentialsData?.adminPhone || '').trim();
    const password = (credentialsData?.password || credentialsData?.adminPassword || '').trim();
    const previousEmail = (credentialsData?.previous_email || credentialsData?.previousEmail || '').trim().toLowerCase();

    // Obtener contraseña previa si la nueva no fue especificada
    const localCreds = getLocalUserCredentials();
    const prevCred = localCreds[email] || (previousEmail ? localCreds[previousEmail] : null) || Object.values(localCreds).find(c => String(c.parkingId) === String(parkingId));
    const effectivePassword = password || prevCred?.password || '';

    // 1. Guardar y actualizar localmente de inmediato (Garantía de persistencia offline y resiliente)
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

    // Actualizar sede localmente (email, owner, phone, password)
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (String(est.id) === String(parkingId)) {
          return {
            ...est,
            email: email || est.email,
            owner: fullName || est.owner,
            phone: phone || est.phone,
            password: effectivePassword || est.password
          };
        }
        return est;
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // 2. Sincronización con el backend
    let serverResult = null;
    try {
      const match = String(parkingId).match(/\d+/);
      const numId = match ? Number(match[0]) : Number(parkingId);
      if (!isNaN(numId)) {
        const payload = {
          email,
          password: effectivePassword || undefined,
          fullName: fullName || undefined,
          full_name: fullName || undefined,
          phone: phone || undefined,
          previous_email: previousEmail || undefined,
          previousEmail: previousEmail || undefined
        };
        const res = await api.post(`/parkings/${numId}/admin-credentials`, payload);
        serverResult = res.data;
        try { await fetchParkings(); } catch {}
      }
    } catch (e) {
      console.warn('assignParkingCredentials backend sync warning:', e);
    }

    return {
      ...(serverResult || {}),
      status: 'success',
      parking_id: parkingId,
      has_account: true,
      has_admin: true,
      is_active: true,
      role: 'local',
      admin_email: email,
      admin_name: fullName,
      password: effectivePassword,
      temp_password: effectivePassword,
      message: 'Credenciales guardadas y sincronizadas con éxito'
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
          rate_monthly_auto: newEst.rate_monthly_auto != null ? Number(newEst.rate_monthly_auto) : 180.0,
          rate_monthly_suv: newEst.rate_monthly_suv != null ? Number(newEst.rate_monthly_suv) : 240.0,
          rate_monthly_mototaxi: newEst.rate_monthly_mototaxi != null ? Number(newEst.rate_monthly_mototaxi) : 120.0,
          rate_monthly_moto: newEst.rate_monthly_moto != null ? Number(newEst.rate_monthly_moto) : 90.0,
          rate_monthly: newEst.rate_monthly != null ? Number(newEst.rate_monthly) : (newEst.rate_monthly_auto != null ? Number(newEst.rate_monthly_auto) : 180.0),
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
          allow_open_stay: newEst.allow_open_stay !== undefined ? !!newEst.allow_open_stay : true,
          subscription_enabled: newEst.subscription_enabled !== undefined ? !!newEst.subscription_enabled : true,
          custom_rates: typeof newEst.custom_rates === 'object' ? JSON.stringify(newEst.custom_rates) : (newEst.custom_rates || null)
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
            rate_auto: res.data.rate_auto,
            rate_suv: res.data.rate_suv,
            rate_mototaxi: res.data.rate_mototaxi,
            rate_moto: res.data.rate_moto,
            rate_monthly_auto: res.data.rate_monthly_auto,
            rate_monthly_suv: res.data.rate_monthly_suv,
            rate_monthly_mototaxi: res.data.rate_monthly_mototaxi,
            rate_monthly_moto: res.data.rate_monthly_moto,
            rate_monthly: res.data.rate_monthly,
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
            allow_open_stay: res.data.allow_open_stay !== undefined ? !!res.data.allow_open_stay : true,
            subscription_enabled: res.data.subscription_enabled !== undefined ? !!res.data.subscription_enabled : true,
            custom_rates: res.data.custom_rates || null,
            image: res.data.image_url, 
            status: res.data.status === 'active' ? 'Operativo' : res.data.status 
          });
          unrecordDeletedEstablishmentId(String(res.data.id));
          setEstablishments(prev => [created, ...prev]);
          await fetchParkings();
          return created;
        }
      } catch (e) {
        console.error('addEstablishment backend error', e.response?.data || e);
        throw new Error(e.response?.data?.detail || 'Error al guardar el establecimiento en el servidor.');
      }
    }
    throw new Error('No se pudo establecer conexión con el servidor para registrar el establecimiento.');
  };

  // Actualizar datos de un establecimiento - persistente
  const updateEstablishment = async (id, updatedFields) => {
    let updatedLocal = null;
    const normId = normalizeParkingId(id);

    // 1. Actualización inmediata local sobre el ID solicitado y sus posibles aliases
    setEstablishments(prev => {
      const targetIds = new Set([String(id), String(normId)]);
      if (normId === '1') targetIds.add('EST-01');
      if (normId === '4') targetIds.add('EST-02');
      if (normId === '3') targetIds.add('EST-03');
      if (normId === '2') targetIds.add('EST-04');

      const next = prev.map(est => {
        if (targetIds.has(String(est.id))) {
          updatedLocal = sanitizeEstablishment({ ...est, ...updatedFields });
          return updatedLocal;
        }
        return est;
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    // 2. Resolver ID numérico para el backend
    let numId = Number(normId);
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
        // Sincronizar hourly_rate con la tarifa auto/general
        const effRate = updatedFields.rate_auto !== undefined ? Number(updatedFields.rate_auto) : (updatedFields.rate !== undefined ? Number(updatedFields.rate) : undefined);
        if (effRate !== undefined) payload.hourly_rate = effRate;
        if (updatedFields.tolerance !== undefined) payload.tolerance_minutes = Math.max(5, Math.min(60, Number(updatedFields.tolerance) || 15));
        if (updatedFields.status !== undefined) {
          const s = String(updatedFields.status).toLowerCase();
          payload.status = (s === 'operativo' || s === 'active') ? 'active' : (s === 'cerrado' || s === 'closed' ? 'closed' : 'maintenance');
        }
        if (updatedFields.image !== undefined) payload.image_url = updatedFields.image;
        if (updatedFields.latitude !== undefined) payload.latitude = Number(updatedFields.latitude);
        if (updatedFields.longitude !== undefined) payload.longitude = Number(updatedFields.longitude);
        if (updatedFields.rate_auto !== undefined) payload.rate_auto = Number(updatedFields.rate_auto);
        if (updatedFields.rate_suv !== undefined) payload.rate_suv = Number(updatedFields.rate_suv);
        if (updatedFields.rate_mototaxi !== undefined) payload.rate_mototaxi = Number(updatedFields.rate_mototaxi);
        if (updatedFields.rate_moto !== undefined) payload.rate_moto = Number(updatedFields.rate_moto);
        if (updatedFields.rate_monthly_auto !== undefined) payload.rate_monthly_auto = Number(updatedFields.rate_monthly_auto);
        if (updatedFields.rate_monthly_suv !== undefined) payload.rate_monthly_suv = Number(updatedFields.rate_monthly_suv);
        if (updatedFields.rate_monthly_mototaxi !== undefined) payload.rate_monthly_mototaxi = Number(updatedFields.rate_monthly_mototaxi);
        if (updatedFields.rate_monthly_moto !== undefined) payload.rate_monthly_moto = Number(updatedFields.rate_monthly_moto);
        if (updatedFields.rate_monthly !== undefined) payload.rate_monthly = Number(updatedFields.rate_monthly);
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
        if (updatedFields.subscription_enabled !== undefined) payload.subscription_enabled = !!updatedFields.subscription_enabled;
        if (updatedFields.custom_rates !== undefined) {
          payload.custom_rates = typeof updatedFields.custom_rates === 'object' ? JSON.stringify(updatedFields.custom_rates) : String(updatedFields.custom_rates);
        }
        
        if (Object.keys(payload).length) {
          const res = await api.put(`/parkings/${numId}`, payload);
          // Re-sincronizar de inmediato para reflejar datos frescos en todas las pestañas y roles
          await fetchParkings();
          try {
            window.dispatchEvent(new CustomEvent('smart_park_establishment_updated', {
              detail: { id: String(numId), updatedFields }
            }));
          } catch {}
          return res.data;
        }
      } catch (e) {
        console.warn('updateEstablishment backend fail', e.response?.data);
        const detail = e.response?.data?.detail || e.message;
        throw new Error(detail);
      }
    }
    return updatedLocal;
  };

  // Actualizar plano topográfico - persistente via sync
  const updateEstablishmentPlan = async (id, elements) => {
    const normId = normalizeParkingId(id);
    let numId = Number(normId);
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
      const next = prev.map(est => {
        const matchExact = String(est.id) === String(id);
        const matchNum = String(est.id) === String(numId);
        const matchNorm = normalizeParkingId(String(est.id)) === String(numId);
        if (matchExact || matchNum || matchNorm) {
          return { ...est, elements: cleanElements, _needsFloorPlan: false };
        }
        return est;
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    if (!isNaN(numId)) {
      try {
        const slots = cleanElements.filter(e => e && e.type === 'slot').map(s => ({
          code: s.code,
          floor_level: s.level || s.floor_level || 'Piso 1',
          slot_type: s.slotType || s.slot_type || 'auto',
          status: s.status || 'free',
          pos_x: Math.round(Number(s.x) || 0),
          pos_y: Math.round(Number(s.y) || 0),
          width: Math.max(15, Math.round(Number(s.w) || 60)),
          height: Math.max(15, Math.round(Number(s.h) || 100)),
          rotation: Math.round(Number(s.rot) || 0) % 360
        }));
        const elems = cleanElements.filter(e => e && e.type !== 'slot').map(e => ({
          element_type: e.type || e.element_type || 'wall',
          pos_x: Math.round(Number(e.x) || 0),
          pos_y: Math.round(Number(e.y) || 0),
          width: Math.max(15, Math.round(Number(e.w) || 100)),
          height: Math.max(15, Math.round(Number(e.h) || 20)),
          rotation: Math.round(Number(e.rot) || 0) % 360,
          z_index: e.z_index || 1,
          properties_json: (e.label || e.gateType) ? JSON.stringify({ label: e.label || '', gateType: e.gateType || '' }) : null
        }));
        const syncRes = await api.post(`/parkings/${numId}/floor-plan/sync`, { parking_id: numId, slots, elements: elems });
        hydratedPlansRef.current.add(String(numId));
        hydratedPlansRef.current.add(String(id));
        try {
          window.dispatchEvent(new CustomEvent('smart_park_floorplan_updated', {
            detail: { parkingId: String(numId), elements: cleanElements, slots }
          }));
        } catch {}
        return { ok: true, data: syncRes.data };
      } catch (e) {
        console.warn('sync floor-plan fail', e.response?.data);
        const detail = e.response?.data?.detail || 'Error al sincronizar plano con el servidor';
        throw new Error(detail);
      }
    }
    return { ok: true };
  };

  // Eliminar establecimiento - persistente tanto en BD como en almacenamiento local
  const deleteEstablishment = async (id) => {
    let numId = Number(id);
    if (isNaN(numId)) {
      const match = String(id).match(/\d+/);
      if (match) numId = Number(match[0]);
    }

    // 1. Marcar como ID eliminado persistentemente para evitar resurrección por polling o recarga
    recordDeletedEstablishmentId(String(id), !isNaN(numId) ? String(numId) : null);

    // 2. Actualizar estado y sincronizar localStorage de inmediato
    setEstablishments(prev => {
      const next = prev.filter(est => {
        const matchExact = String(est.id) === String(id);
        const matchNum = !isNaN(numId) && String(est.id) === String(numId);
        return !matchExact && !matchNum;
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    // 3. Notificar al backend para cascada en PostgreSQL
    if (!isNaN(numId)) {
      try {
        await api.delete(`/parkings/${numId}`);
      } catch (e) {
        console.warn('delete backend fail', e.response?.data);
      }
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
      isOpenStay: !!r.is_open_stay,
      reservationType: r.reservation_type || 'standard',
      isSubscription: !!r.is_subscription,
      subscriptionMonths: Number(r.subscription_months || 0),
      subscriptionDays: r.subscription_days != null ? Number(r.subscription_days) : null,
      subscriptionType: r.subscription_type || null,
      isOvertime: !!r.is_overtime,
      overtimeMinutes: Number(r.overtime_minutes || 0),
      amountPaid: Number(r.amount_paid ?? 0)
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

      const rawList = Array.isArray(data) ? data : (data?.items || []);
      if (Array.isArray(rawList) && rawList.length >= 0) {
        const mapped = rawList.map(mapServerReservation);
        setReservations(mapped);
        try { localStorage.setItem(getReservationsKey(), JSON.stringify(mapped)); } catch {}
      }
    } catch (e) {
      console.warn('No se pudieron refrescar las reservas del servidor', e?.response?.data);
    }
  };

  // Helper para encontrar la mejor plaza libre compatible (Reserva Rápida)
  const findOptimalSlot = (parking, vehicleType = 'auto') => {
    if (!parking) return null;
    const elements = parking.elements || [];
    const slots = elements.filter(e => e.type === 'slot' && e.status === 'free');
    if (!slots.length) return null;

    const vNorm = (vehicleType || 'auto').toLowerCase();
    const vFamily = (v) => {
      if (['suv', 'camioneta', 'truck', 'pickup'].includes(v)) return 'camioneta';
      if (['moto', 'motorcycle', 'scooter', 'bike'].includes(v)) return 'moto';
      if (['mototaxi', 'torito', 'trimovil'].includes(v)) return 'mototaxi';
      return 'auto';
    };
    const targetFamily = vFamily(vNorm);

    const entryGate = elements.find(e => e.type === 'gate' && (e.gateType === 'entry' || e.gateType !== 'exit')) || elements.find(e => e.type === 'gate');

    const scoredSlots = slots.map(slot => {
      let score = 0;
      const slotFamily = vFamily(slot.slotType || slot.vehicleType || 'auto');
      if (slotFamily === targetFamily) score += 100;
      if (slot.shaded) score += 25;

      if (entryGate && typeof slot.x === 'number' && typeof entryGate.x === 'number') {
        const dist = Math.hypot(slot.x - entryGate.x, slot.y - entryGate.y);
        score += Math.max(0, 50 - (dist / 20));
      }

      return { slot, score };
    });

    scoredSlots.sort((a, b) => b.score - a.score);
    return scoredSlots[0]?.slot || slots[0];
  };

  // Crear nueva reserva: POST real. Solo retorna éxito tras 201 del servidor (sin optimismo local).
  const createReservation = async (bookingData) => {
    let authed = !!getAccessToken();
    let parkingIdNum = Number(bookingData?.parkingId);
    let slotIdNum = Number(bookingData?.slotId);
    const isAutoAssign = !!(bookingData?.autoAssign || bookingData?.isQuickReservation || bookingData?.slotId === null);

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

    // Si es reserva rápida y aún no tiene slotId, intentar resolver con findOptimalSlot
    if (isNaN(slotIdNum) && isAutoAssign) {
      const est = establishments.find(e => Number(e.id) === Number(parkingIdNum));
      const optSlot = findOptimalSlot(est, bookingData?.vehicleType || 'auto');
      if (optSlot && !isNaN(Number(optSlot.id))) {
        slotIdNum = Number(optSlot.id);
      }
    }

    if (!authed || isNaN(parkingIdNum) || (isNaN(slotIdNum) && !isAutoAssign)) {
      const msg = 'No se pudo conectar con el servidor para emitir el ticket. Intenta iniciar sesión.';
      console.warn('Reserva bloqueada: ' + msg);
      setBookingError(msg);
      return { error: msg };
    }

    // Validar EST-* explícitamente (nunca persistible)
    if (String(bookingData.parkingId).startsWith('EST-')) {
      const msg = 'No se puede emitir ticket sobre una sede demo (EST-*). Registra la sede en el servidor primero.';
      setBookingError(msg);
      return { error: msg };
    }

    const plate = (bookingData.plate || 'ABC-123').toUpperCase();
    const startISO = bookingData.startTime instanceof Date ? bookingData.startTime.toISOString() : (bookingData.startTime || new Date().toISOString());
    const endISO = bookingData.expiresAt instanceof Date ? bookingData.expiresAt.toISOString() : (bookingData.expiresAt || new Date(Date.now() + (Number(bookingData.hours || 2)) * 60 * 60 * 1000).toISOString());

    const tolMinutes = Number(bookingData.toleranceMinutes || bookingData.arrivalWindow || bookingData.etaMinutes || 15);

    try {
      const serverRes = await createReservationApi({
        parking_id: parkingIdNum,
        slot_id: (isNaN(slotIdNum) || slotIdNum <= 0) ? null : slotIdNum,
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
        is_open_stay: !!(bookingData.isOpenStay ?? bookingData.is_open_stay ?? true),
        auto_assign: !!isAutoAssign,
        reservation_type: bookingData.reservationType || bookingData.reservation_type || 'standard',
        is_subscription: !!(bookingData.isSubscription || bookingData.is_subscription),
        subscription_months: Number(bookingData.subscriptionMonths || bookingData.subscription_months || 1),
        subscription_days: bookingData.subscriptionDays ?? bookingData.subscription_days ?? null,
        subscription_type: bookingData.subscriptionType || bookingData.subscription_type || null
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

  // Actualizar hora, cajón o duración de estadía: PUT /reservations/{id}/stay
  const updateStayReservation = async (codeOrId, stayData = {}) => {
    const target = reservations.find(r => r.code === codeOrId || String(r.id) === String(codeOrId));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };

    const payload = {};
    if (stayData.actual_entry) payload.actual_entry = stayData.actual_entry;
    if (stayData.hours_stay !== undefined && stayData.hours_stay !== null) payload.hours_stay = Number(stayData.hours_stay);
    if (stayData.is_open_stay !== undefined) payload.is_open_stay = !!stayData.is_open_stay;
    if (stayData.slot_code) payload.slot_code = stayData.slot_code;

    if (isBackendReservation(target)) {
      try {
        const res = await api.put(`/reservations/${target.id}/stay`, payload);
        await refreshMyReservations();
        if (target.parkingId) await hydrateFloorPlan(String(target.parkingId), true);
        return { ok: true, message: 'Estadía actualizada correctamente.', data: res.data };
      } catch (e) {
        const detail = e?.response?.data?.detail || 'No se pudo actualizar la estadía.';
        return { ok: false, message: detail };
      }
    } else {
      // Fallback local
      setReservations(prev => prev.map(r => {
        if (r.code === target.code || String(r.id) === String(target.id)) {
          const entryTime = stayData.actual_entry || r.startTime;
          return {
            ...r,
            startTime: entryTime,
            actual_entry: entryTime,
            slot: stayData.slot_code || r.slot,
            hours: stayData.hours_stay || r.hours,
            isOpenStay: stayData.is_open_stay !== undefined ? stayData.is_open_stay : r.isOpenStay
          };
        }
        return r;
      }));
      return { ok: true, message: 'Estadía actualizada localmente.' };
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
      getUserAuthorizedCompanyNames,
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
      updateStayReservation,
      completeReservation,
      resetToDefaults,
      saveLocalUserCredential,
      getLocalUserCredentials,
      findOptimalSlot,
      wsConnected
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
