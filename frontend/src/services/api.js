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
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};

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

// Interceptor para garantizar que el token Bearer y el token CSRF siempre acompañen a la solicitud
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && token !== 'cookie_session' && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Garantizar que toda mutación HTTP lleve el header X-CSRF-Token leído de la cookie
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCookie('csrf_token');
    if (csrf && !config.headers['X-CSRF-Token']) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }

  return config;
}, (error) => Promise.reject(error));

// Interceptor de respuesta: auto-recuperación transparente mediante /auth/refresh ante expiración 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthRoute = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        const newToken = refreshRes.data?.access_token;
        if (newToken) {
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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
export const refreshSessionApi = () => api.post('/auth/refresh').then(r => r.data);
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
