import axios from 'axios';

const DEFAULT_API = 'http://localhost:4000'
const apiBaseUrl = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : DEFAULT_API;
const api = axios.create({ baseURL: apiBaseUrl });

if (apiBaseUrl === DEFAULT_API) {
  // Helpful during development when vite env is not provided
  // eslint-disable-next-line no-console
  console.warn(`VITE_API_BASE not set, defaulting API base to ${DEFAULT_API}`)
}
// Attach Authorization header from localStorage when present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token && config && config.headers) {
      // @ts-ignore
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore (e.g., SSR or localStorage unavailable)
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      try {
        localStorage.clear();
        // Force redirect to login if session expires
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      } catch (e) { /* ignore */ }
    }
    return Promise.reject(err);
  }
);

export default api;
