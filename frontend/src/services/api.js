import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    if (window.location.hostname.includes('railway.app')) {
      return window.location.origin;
    }
  }
  return 'https://smart-park-web-production.up.railway.app';
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Envía y recibe cookies HttpOnly automáticamente
  xsrfCookieName: 'csrf_token',
  xsrfHeaderName: 'X-CSRF-Token',
  withXSRFToken: true,
});

let memoryToken = null;

export const setAccessToken = (token) => {
  try {
    memoryToken = token || null;
    if (token) {
      localStorage.setItem('smart_park_access_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('smart_park_access_token');
      delete api.defaults.headers.common['Authorization'];
    }
  } catch {}
};

export const getAccessToken = () => {
  if (memoryToken) return memoryToken;
  try {
    const saved = localStorage.getItem('smart_park_access_token');
    if (saved) {
      memoryToken = saved;
      return saved;
    }
    return localStorage.getItem('smart_park_user_session') ? 'cookie_session' : null;
  } catch { 
    return null; 
  }
};

// Interceptor para garantizar que el token Bearer siempre acompañe a la solicitud si existe
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && token !== 'cookie_session' && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Inicializar cabecera con token persistido si existe
try {
  const bootToken = localStorage.getItem('smart_park_access_token');
  if (bootToken) {
    memoryToken = bootToken;
    api.defaults.headers.common['Authorization'] = `Bearer ${bootToken}`;
  }
} catch {}

// Auth
export const register = (data) => api.post('/auth/register', data).then(r => r.data);
export const login = (data) => api.post('/auth/login', data).then(r => r.data);
export const logoutApi = () => api.post('/auth/logout').then(r => r.data);
export const googleAuth = (data) => api.post('/auth/google', data).then(r => r.data);
export const verifyPinApi = (pin) => api.post('/auth/verify-pin', { pin }).then(r => r.data);
export const loginWithPinApi = (identifier, pin) => api.post('/auth/login-pin', { identifier, pin }).then(r => r.data);

// Vehicles (requiere JWT)
export const listVehicles = () => api.get('/vehicles').then(r => r.data);
export const createVehicle = (data) => api.post('/vehicles', data).then(r => r.data);
export const updateVehicleApi = (id, data) => api.put(`/vehicles/${id}`, data).then(r => r.data);
export const deleteVehicleApi = (id) => api.delete(`/vehicles/${id}`).then(r => r.data);
export const lookupVehicleImageApi = (brand, model, year, vehicleType) => 
  api.get('/vehicles/lookup-image', { params: { brand, model, year, vehicle_type: vehicleType } }).then(r => r.data);
export const uploadVehicleImageApi = (formData) => 
  api.post('/vehicles/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = getApiBase();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Reservations (requiere JWT)
export const listReservations = (params = {}) => api.get('/reservations', { params }).then(r => r.data);
export const listMyReservations = () => api.get('/reservations/my-reservations').then(r => r.data);
export const createReservationApi = (data) => api.post('/reservations', data).then(r => r.data);
export const cancelReservationApi = (id) => api.put(`/reservations/${id}/cancel`).then(r => r.data);

export default api;
