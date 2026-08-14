// Axios Configuration with Token Expiration Handling
import axios from 'axios';
import toast from 'react-hot-toast';

let isRedirecting = false;

export const clearAuthAndRedirect = (msg) => {
  if (isRedirecting) return;
  isRedirecting = true;

  localStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminUser');
  localStorage.removeItem('employeeToken');
  localStorage.removeItem('employeeData');
  localStorage.removeItem('resellerToken');
  localStorage.removeItem('resellerData');

  toast.error(msg || 'Your session has expired. Please login again.');

  const path = window.location.pathname;
  let targetLogin = '/login';
  if (path.startsWith('/employee')) targetLogin = '/employee/login';
  else if (path.startsWith('/reseller')) targetLogin = '/reseller/login';

  setTimeout(() => {
    isRedirecting = false;
    window.location.href = targetLogin;
  }, 600);
};

// Global default axios interceptor for ALL axios calls throughout the app
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const url = config?.url || '';

      // Skip public routes and external proxy calls
      const isExempt = url.includes('/public') || 
                       url.includes('/login') || 
                       url.includes('/pay-') || 
                       url.includes('/proxy/');

      if (!isExempt && (status === 401 || status === 403)) {
        const msg = data?.message || 'Your session has expired. Please login again.';
        clearAuthAndRedirect(msg);
      }
    }
    return Promise.reject(error);
  }
);

// Create custom admin axios instance
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
  timeout: 10000,
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for custom instance
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const url = config?.url || '';
      const isExempt = url.includes('/proxy/');

      if (!isExempt && (status === 401 || status === 403)) {
        clearAuthAndRedirect(data?.message || 'Your session has expired. Please login again.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Employee Axios Instance ───────────────────────────────────────────────────

export const employeeApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor - attach employee token
employeeApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('employeeToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - auto logout on 401
employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthAndRedirect('Your session has expired. Please login again.');
    }
    return Promise.reject(error);
  }
);

/**
 * Call the logout API and clear local storage for admin.
 */
export const logoutAdmin = async () => {
  try {
    await api.post('/auth/logout');
  } catch (_) { /* best-effort */ }
  clearAuthAndRedirect('Logged out successfully.');
};

/**
 * Call the logout API and clear local storage for employee.
 */
export const logoutEmployee = async () => {
  try {
    await employeeApi.post('/api/staff-auth/logout');
  } catch (_) { /* best-effort */ }
  clearAuthAndRedirect('Logged out successfully.');
};
