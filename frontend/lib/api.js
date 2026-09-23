import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.249:3001';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

// Attach JWT token if exists
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('afna_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        // redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          localStorage.removeItem('afna_token');
          localStorage.removeItem('afna_user');
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    }
  );
}

export const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('afna_token') : null);
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('afna_user')); } catch { return null; }
};
export const setAuth = (token, user) => {
  localStorage.setItem('afna_token', token);
  localStorage.setItem('afna_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('afna_token');
  localStorage.removeItem('afna_user');
};
export const isAdmin = () => getUser()?.role === 'admin';
export const isPop = () => getUser()?.role === 'pop';
export const isTeknisi = () => getUser()?.role === 'teknisi';

export { API_URL, WS_URL };

export const formatBits = (bps) => {
  if (bps == null || isNaN(bps)) return '0 bps';
  if (bps >= 1e9) return (bps / 1e9).toFixed(2) + ' Gbps';
  if (bps >= 1e6) return (bps / 1e6).toFixed(2) + ' Mbps';
  if (bps >= 1e3) return (bps / 1e3).toFixed(2) + ' Kbps';
  return bps + ' bps';
};

export const formatBytes = (bps) => {
  const bytes = bps / 8;
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB/s';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB/s';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB/s';
  return bytes.toFixed(0) + ' B/s';
};
