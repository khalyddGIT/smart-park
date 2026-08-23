import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, listMyReservations, createReservationApi, cancelReservationApi } from '../services/api';
import api from '../services/api';

const STORAGE_KEY = 'smart_park_unified_establishments_v2';
const RESERVATIONS_STORAGE_KEY_BASE = 'smart_park_unified_reservations_v2';
const REQUESTS_STORAGE_KEY = 'smart_park_affiliation_requests_v1';
const APPROVED_ADMINS_STORAGE_KEY = 'smart_park_approved_admins_v1';

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
      
      // Fila Norte (Compacta)
      { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'ABC-123', color: '#ef4444' },
      { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 285, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 350, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 15, type: 'slot', code: 'A-06', slotType: 'auto', x: 600, y: 80, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'XYZ-789', color: '#3b82f6' },
      { id: 16, type: 'slot', code: 'A-07', slotType: 'auto', x: 665, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 17, type: 'slot', code: 'A-08', slotType: 'moto', x: 730, y: 80, w: 38, h: 65, rot: 0, status: 'free' },
      { id: 18, type: 'slot', code: 'A-09', slotType: 'moto', x: 775, y: 80, w: 38, h: 65, rot: 0, status: 'free' },

      // Fila Sur (Compacta)
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 480, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', x: 145, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 210, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 23, type: 'slot', code: 'B-04', slotType: 'auto', x: 275, y: 480, w: 56, h: 96, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
      { id: 24, type: 'slot', code: 'B-05', slotType: 'auto', x: 600, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 25, type: 'slot', code: 'B-06', slotType: 'auto', x: 665, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
      { id: 26, type: 'slot', code: 'B-07', slotType: 'auto', x: 730, y: 480, w: 56, h: 96, rot: 0, status: 'free' }
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

const EstablishmentContext = createContext();

export const EstablishmentProvider = ({ children }) => {
  const [establishments, setEstablishments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading establishments from storage:', e);
    }
    return INITIAL_ESTABLISHMENTS;
  });

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

  // Sincronización Supabase: parkings siempre (global), reservas solo con token
  // El panel del usuario siempre lee del servidor — no se usa caché local para datos de cocheras
  // Polling + refetch al enfocar la pestaña para que cambios de otros usuarios se vean sin recargar
  const fetchParkings = async () => {
    try {
      const res = await api.get('/parkings');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mappedParkings = res.data.map(p => ({
          id: String(p.id), name: p.name, address: p.address, city: p.city, latitude: p.latitude, longitude: p.longitude, rate: p.hourly_rate, status: p.status === 'active' ? 'Operativo' : p.status, image: p.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800', totalSlots: p.total_capacity, available_slots: p.available_slots, description: p.description || '', phone: p.phone || '', email: p.email || '', reference: p.reference || '', level: p.level || '', elements: null, _needsFloorPlan: true
        }));
        setEstablishments(prev => {
          const localOnly = prev.filter(e => String(e.id).startsWith('EST-'));
          const serverIds = new Set(mappedParkings.map(m => m.id));
          const preservedLocal = localOnly.filter(l => !serverIds.has(String(l.id)));
          return [...mappedParkings, ...preservedLocal];
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchParkings();
    if (getAccessToken()) refreshMyReservations();

    // Polling ligero: cocheras cada 20s, reservas cada 15s (solo con sesión)
    const parkingsInterval = setInterval(fetchParkings, 20000);
    const reservationsInterval = setInterval(() => { if (getAccessToken()) refreshMyReservations(); }, 15000);

    // Refetch inmediato al volver a la pestaña (cambio de rol, edición en otra pestaña, etc.)
    const onFocus = () => { fetchParkings(); if (getAccessToken()) refreshMyReservations(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(parkingsInterval);
      clearInterval(reservationsInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
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
  const createAffiliationRequest = (requestData) => {
    const newReq = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      parkingName: requestData.parkingName,
      ownerName: requestData.ownerName,
      email: (requestData.email || '').trim().toLowerCase(),
      phone: requestData.phone || '',
      address: requestData.address || 'Centro Histórico',
      city: requestData.city || 'Ayacucho - Huamanga',
      capacity: Number(requestData.capacity) || 20,
      rate: Number(requestData.rate) || 5.00,
      notes: requestData.notes || '',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    setAffiliationRequests(prev => [newReq, ...prev]);
    return newReq;
  };

  // Aprobar Solicitud de Afiliación (Crea la Cochera y Habilita la Cuenta de Admin Local)
  const approveAffiliationRequest = (requestId) => {
    const req = affiliationRequests.find(r => r.id === requestId);
    if (!req) return null;

    const newEstId = `EST-${Date.now().toString().slice(-4)}`;
    
    // Crear el nuevo establecimiento con plano base
    const newEstablishment = {
      id: newEstId,
      name: req.parkingName,
      address: req.address || 'Jr. 28 de Julio 100',
      reference: 'Centro Histórico',
      city: req.city || 'Ayacucho - Huamanga',
      level: 'Nivel 1 - Superficie',
      rate: Number(req.rate) || 5.00,
      status: 'Operativo',
      owner: req.ownerName,
      ruc: '20' + Math.floor(100000000 + Math.random() * 900000000),
      phone: req.phone || '+51 966 000 000',
      whatsapp: (req.phone || '').replace(/\D/g, '') || '51966000000',
      email: req.email || 'cochera@smartpark.pe',
      schedule: 'Lunes a Domingo: 24 Horas',
      description: req.notes || 'Estacionamiento afiliado a la red oficial Smart Park con seguridad y atención continua.',
      latitude: -13.1606 + (Math.random() - 0.5) * 0.008,
      longitude: -74.2257 + (Math.random() - 0.5) * 0.008,
      mapsUrl: `https://maps.google.com/?q=-13.1606,-74.2257`,
      socials: {
        facebook: '',
        instagram: '',
        tiktok: '',
        website: ''
      },
      commission: '10%',
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
      elements: [
        { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
        { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
        { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
        { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
        { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
        { id: 6, type: 'crosswalk', x: 500, y: 250, w: 80, h: 200, rot: 0 },
        { id: 7, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'ACCESO GARITA ANPR' },
        { id: 10, type: 'slot', code: 'A-01', slotType: 'auto', x: 80, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 155, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', x: 220, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 285, y: 80, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 480, w: 56, h: 96, rot: 0, status: 'free' },
        { id: 21, type: 'slot', code: 'B-02', slotType: 'moto', x: 145, y: 480, w: 38, h: 65, rot: 0, status: 'free' }
      ]
    };

    // Agregar a establecimientos
    setEstablishments(prev => [newEstablishment, ...prev]);

    // Registrar como admin aprobado para permitir login con rol 'local'
    const newAdmin = {
      id: Date.now(),
      name: req.ownerName,
      email: req.email.toLowerCase(),
      phone: req.phone,
      establishmentId: newEstId,
      establishmentName: req.parkingName,
      role: 'local'
    };

    setApprovedAdmins(prev => [newAdmin, ...prev.filter(a => a.email !== req.email.toLowerCase())]);

    // Actualizar estado de la solicitud
    setAffiliationRequests(prev => prev.map(r => r.id === requestId ? {
      ...r,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      establishmentId: newEstId
    } : r));

    return { establishment: newEstablishment, admin: newAdmin };
  };

  // Rechazar Solicitud
  const rejectAffiliationRequest = (requestId, reason = '') => {
    setAffiliationRequests(prev => prev.map(r => r.id === requestId ? {
      ...r,
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    } : r));
  };

  // Verificar si un correo corresponde a un administrador de cochera aprobado
  const isApprovedAdminEmail = (email) => {
    if (!email) return false;
    const lower = email.trim().toLowerCase();
    return approvedAdmins.some(a => a.email === lower);
  };

  // Agregar nuevo establecimiento manual - intenta Supabase primero
  const addEstablishment = async (newEst) => {
    const token = getAccessToken();
    if (token || true) {
      try {
        const payload = { name: newEst.name, address: newEst.address, city: newEst.city || 'Ayacucho - Huamanga', latitude: newEst.latitude || -13.1604, longitude: newEst.longitude || -74.2259, hourly_rate: newEst.rate || 5, tolerance_minutes: 15, status: 'active', total_capacity: newEst.totalSlots || newEst.elements?.filter(e=>e.type==='slot').length || 10, image_url: newEst.image };
        const res = await api.post('/parkings', payload);
        if (res.data?.id) {
          const created = { ...newEst, id: String(res.data.id), rate: res.data.hourly_rate, image: res.data.image_url, status: res.data.status === 'active' ? 'Operativo' : res.data.status };
          setEstablishments(prev => [created, ...prev]);
          return created;
        }
      } catch (e) { console.warn('addEstablishment backend fallback', e.response?.data); }
    }
    setEstablishments(prev => [newEst, ...prev]);
    return newEst;
  };

  // Actualizar datos de un establecimiento - persistente
  const updateEstablishment = async (id, updatedFields) => {
    setEstablishments(prev => prev.map(est => est.id === id ? { ...est, ...updatedFields } : est));
    const numId = Number(id);
    if (!isNaN(numId)) {
      try {
        const payload = {};
        if (updatedFields.name) payload.name = updatedFields.name;
        if (updatedFields.address) payload.address = updatedFields.address;
        if (updatedFields.city) payload.city = updatedFields.city;
        if (updatedFields.rate) payload.hourly_rate = Number(updatedFields.rate);
        if (updatedFields.status) payload.status = updatedFields.status === 'Operativo' ? 'active' : updatedFields.status;
        if (updatedFields.image) payload.image_url = updatedFields.image;
        if (updatedFields.description !== undefined) payload.description = updatedFields.description;
        if (updatedFields.phone !== undefined) payload.phone = updatedFields.phone;
        if (updatedFields.email !== undefined) payload.email = updatedFields.email;
        if (updatedFields.reference !== undefined) payload.reference = updatedFields.reference;
        if (updatedFields.level !== undefined) payload.level = updatedFields.level;
        if (updatedFields.latitude) payload.latitude = Number(updatedFields.latitude);
        if (updatedFields.longitude) payload.longitude = Number(updatedFields.longitude);
        if (Object.keys(payload).length) await api.put(`/parkings/${numId}`, payload);
      } catch (e) { console.warn('updateEstablishment backend fail', e.response?.data); }
    }
  };

  // Actualizar plano topográfico - persistente via sync
  const updateEstablishmentPlan = async (id, elements) => {
    setEstablishments(prev => prev.map(est => est.id === id ? { ...est, elements } : est));
    const numId = Number(id);
    if (!isNaN(numId) && Array.isArray(elements)) {
      try {
        const slots = elements.filter(e=>e.type==='slot').map(s=>({ code: s.code, floor_level: 'Piso 1', slot_type: s.slotType || 'auto', status: s.status || 'free', pos_x: s.x||0, pos_y: s.y||0, width: s.w||60, height: s.h||100, rotation: s.rot||0 }));
        const elems = elements.filter(e=>e.type!=='slot').map(e=>({ element_type: e.type, pos_x: e.x||0, pos_y: e.y||0, width: e.w||100, height: e.h||20, rotation: e.rot||0, z_index: 1, properties_json: null }));
        await api.post(`/parkings/${numId}/floor-plan/sync`, { parking_id: numId, slots, elements: elems });
      } catch (e) { console.warn('sync floor-plan fail', e.response?.data); }
    }
  };

  // Eliminar establecimiento - persistente
  const deleteEstablishment = async (id) => {
    setEstablishments(prev => prev.filter(est => est.id !== id));
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
    const startMs = new Date(r.start_time).getTime();
    const endMs = new Date(r.end_time).getTime();
    return {
      id: r.id,
      code: r.code,
      token: r.qr_code || r.code,
      parkingId: String(r.parking_id),
      parking: resolveParkingName(r.parking_id),
      slotId: r.slot_id,
      slot: resolveSlotCode(r.parking_id, r.slot_id),
      plate: r.license_plate,
      cost: Number(r.total_cost ?? 0),
      hours: Math.max(1, Math.round((endMs - startMs) / 3600000)) || 1,
      ratePerHour: Number((Number(r.total_cost ?? 0) / Math.max(1, (endMs - startMs) / 3600000)).toFixed(2)),
      status: (r.status || 'scheduled').toUpperCase(),
      startTime: r.start_time,
      expiresAt: r.end_time,
      createdAt: r.actual_entry || r.start_time,
      actualEntry: r.actual_entry || null,
      actualExit: r.actual_exit || null
    };
  };

  // Refresca las reservas del usuario desde GET /my-reservations y sincroniza estado+caché
  const refreshMyReservations = async () => {
    if (!getAccessToken()) return;
    try {
      const data = await listMyReservations();
      if (Array.isArray(data)) {
        const mapped = data.map(mapServerReservation);
        setReservations(mapped);
        try { localStorage.setItem(getReservationsKey(), JSON.stringify(mapped)); } catch {}
      }
    } catch (e) {
      console.warn('No se pudieron refrescar las reservas del servidor', e?.response?.data);
    }
  };

  // Crear nueva reserva: POST real con parking_id y slot_id numéricos reales.
  // Devuelve el objeto optimista para no romper a quienes llaman de forma síncrona;
  // al confirmar el servidor se sincroniza el estado desde my-reservations.
  const createReservation = (bookingData) => {
    const authed = !!getAccessToken();
    const parkingIdNum = Number(bookingData?.parkingId);
    const slotIdNum = Number(bookingData?.slotId);

    // IDs locales "EST-*" o cajón sin id real: bloquear en lugar de fingir reserva
    if (!authed || isNaN(parkingIdNum) || isNaN(slotIdNum)) {
      console.warn('Reserva bloqueada: esta cochera aún no está registrada en el servidor o falta seleccionar un cajón válido.');
      return null;
    }

    const code = bookingData.code || `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
    const token = bookingData.token || `SPK-AYC${code.replace('RSV-', '')}-7B2F9A`;
    const tempId = Date.now();
    const newReservation = {
      id: tempId,
      pendingSync: true,
      code,
      token,
      parkingId: bookingData.parkingId,
      parkingName: bookingData.parkingName || bookingData.parking || 'Smart Park Plaza Mayor',
      parking: bookingData.parkingName || bookingData.parking || 'Smart Park Plaza Mayor',
      slotId: slotIdNum,
      slot: bookingData.slotCode || bookingData.slot || 'A-01',
      customerName: bookingData.customerName || 'Conductor Registrado',
      customerPhone: bookingData.customerPhone || '+51 966 000 000',
      plate: (bookingData.plate || 'ABC-123').toUpperCase(),
      cost: Number(bookingData.totalCost || bookingData.cost || 10.0),
      hours: Number(bookingData.hours || 2),
      ratePerHour: Number(bookingData.rate || 5.0),
      status: 'SCHEDULED',
      startTime: bookingData.startTime instanceof Date ? bookingData.startTime.toISOString() : (bookingData.startTime || new Date().toISOString()),
      expiresAt: bookingData.expiresAt instanceof Date ? bookingData.expiresAt.toISOString() : (bookingData.expiresAt || new Date(Date.now() + (Number(bookingData.hours || 2)) * 60 * 60 * 1000).toISOString()),
      createdAt: new Date().toISOString()
    };
    occupySlot(newReservation.parkingId, newReservation.slot, newReservation.plate);
    saveReservations([newReservation, ...reservations]);

    // Persistir en el servidor con los IDs reales; luego la lista se reconstruye desde la API
    (async () => {
      try {
        await createReservationApi({
          parking_id: parkingIdNum,
          slot_id: slotIdNum,
          license_plate: newReservation.plate,
          start_time: newReservation.startTime,
          end_time: newReservation.expiresAt
        });
        setBookingError(null);
        await refreshMyReservations();
      } catch (e) {
        // Rollback del registro optimista si el servidor rechaza (cajón ocupado, etc.)
        console.error('Error creando reserva en el servidor', e?.response?.data || e);
        setBookingError(e?.response?.data?.detail || 'No se pudo registrar la reserva en el servidor.');
        setReservations(prev => prev.filter(r => r.id !== tempId));
        freeSlot(newReservation.parkingId, newReservation.slot);
      }
    })();

    return newReservation;
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
          const pid = Number(target.parkingId);
          if (!isNaN(pid)) {
            const res = await api.get(`/parkings/${pid}/floor-plan`);
            const slots = Array.isArray(res.data?.slots) ? res.data.slots : [];
            const slotMap = new Map(slots.map(s => [String(s.code), s.status]));
            setEstablishments(prev => prev.map(est => {
              if (String(est.id) !== String(pid)) return est;
              return { ...est, elements: (est.elements || []).map(el => el.type === 'slot' && slotMap.has(el.code) ? { ...el, status: slotMap.get(el.code) } : el) };
            }));
          }
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

  // Check-In de garita: PUT /reservations/{id}/check-in → status active
  const checkInReservation = async (code) => {
    const target = reservations.find(r => r.code === code || String(r.id) === String(code));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };
    if (!isBackendReservation(target)) {
      return { ok: false, message: 'Esta reserva aún no está registrada en el servidor; no se puede registrar el ingreso.' };
    }
    try {
      await api.put(`/reservations/${target.id}/check-in`);
      await refreshMyReservations();
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
  const checkOutReservation = async (code) => {
    const target = reservations.find(r => r.code === code || String(r.id) === String(code));
    if (!target) return { ok: false, message: 'Reserva no encontrada.' };
    if (!isBackendReservation(target)) {
      return { ok: false, message: 'Esta reserva aún no está registrada en el servidor; no se puede registrar la salida.' };
    }
    try {
      await api.put(`/reservations/${target.id}/check-out`);
      await refreshMyReservations();
      return { ok: true, message: `Salida registrada para ${target.plate}. Cajón ${target.slot} liberado.` };
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
  const updateReservationStatus = (code, newStatus) => {
    if (newStatus === 'ACTIVE') return checkInReservation(code);
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
      reservations,
      setReservations,
      affiliationRequests,
      approvedAdmins,
      createAffiliationRequest,
      approveAffiliationRequest,
      rejectAffiliationRequest,
      isApprovedAdminEmail,
      addEstablishment,
      updateEstablishment,
      updateEstablishmentPlan,
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
      resetToDefaults
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
