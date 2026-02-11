import axios from 'axios';

const DEFAULT_API = 'http://localhost:4000'
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || DEFAULT_API });
if (!import.meta.env.VITE_API_BASE) {
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
    // central place for handling 401/refresh in future
    return Promise.reject(err);
  }
);

export default api;
