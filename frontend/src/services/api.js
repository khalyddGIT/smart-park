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
});

// Adjuntar JWT si existe
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('smart_park_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

export const setAccessToken = (token) => {
  try {
    if (token) localStorage.setItem('smart_park_access_token', token);
    else localStorage.removeItem('smart_park_access_token');
  } catch {}
};

export const getAccessToken = () => {
  try { return localStorage.getItem('smart_park_access_token'); } catch { return null; }
};

// Auth
export const register = (data) => api.post('/auth/register', data).then(r => r.data);
export const login = (data) => api.post('/auth/login', data).then(r => r.data);
export const googleAuth = (data) => api.post('/auth/google', data).then(r => r.data);
export const verifyPinApi = (pin) => api.post('/auth/verify-pin', { pin }).then(r => r.data);

// Vehicles (requiere JWT)
export const listVehicles = () => api.get('/vehicles').then(r => r.data);
export const createVehicle = (data) => api.post('/vehicles', data).then(r => r.data);
export const deleteVehicleApi = (id) => api.delete(`/vehicles/${id}`).then(r => r.data);

// Reservations (requiere JWT)
export const listReservations = (params = {}) => api.get('/reservations', { params }).then(r => r.data);
export const listMyReservations = () => api.get('/reservations/my-reservations').then(r => r.data);
export const createReservationApi = (data) => api.post('/reservations', data).then(r => r.data);
export const cancelReservationApi = (id) => api.put(`/reservations/${id}/cancel`).then(r => r.data);

export default api;
