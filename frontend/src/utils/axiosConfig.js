// Axios Configuration with Token Expiration Handling
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401 && (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_REVOKED')) {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminUser');
        toast.error('Your session has expired. Please login again.');
        setTimeout(() => { window.location.href = '/login'; }, 1000);
      } else if (status === 401 && (data.code === 'INVALID_TOKEN' || data.code === 'AUTH_FAILED')) {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminUser');
        toast.error('Authentication failed. Please login again.');
        setTimeout(() => { window.location.href = '/login'; }, 1000);
      } else if (status === 423 && data.code === 'ACCOUNT_LOCKED') {
        toast.error(data.message);
      } else if (status === 429 && data.code === 'RATE_LIMITED') {
        toast.error(data.message);
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
    if (error.response?.status === 401) {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeData');
      toast.error('Your session has expired. Please login again.');
      setTimeout(() => { window.location.href = '/employee/login'; }, 1000);
    } else if (error.response?.status === 423 && error.response?.data?.code === 'ACCOUNT_LOCKED') {
      toast.error(error.response.data.message);
    } else if (error.response?.status === 429) {
      toast.error('Too many login attempts. Please try again after 15 minutes.');
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
  localStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminUser');
};

/**
 * Call the logout API and clear local storage for employee.
 */
export const logoutEmployee = async () => {
  try {
    await employeeApi.post('/api/staff-auth/logout');
  } catch (_) { /* best-effort */ }
  localStorage.removeItem('employeeToken');
  localStorage.removeItem('employeeData');
};
