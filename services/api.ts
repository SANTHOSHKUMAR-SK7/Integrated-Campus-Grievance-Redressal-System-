
import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mocking backend responses for the UI until you connect the Python server
// In your real project, remove these mocks and let the Axios calls hit your FastAPI
export const endpoints = {
  auth: {
    login: (credentials: any) => api.post('/auth/login', credentials),
    register: (data: any) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
  },
  grievances: {
    getAll: () => api.get('/grievances'),
    getById: (id: string) => api.get(`/grievances/${id}`),
    submit: (data: any) => api.post('/grievances', data),
    updateStatus: (id: string, status: string, remark: string) => 
      api.patch(`/grievances/${id}/status`, { status, remark }),
  },
  admin: {
    getStats: () => api.get('/admin/analytics'),
    manageUsers: () => api.get('/admin/users'),
    createUser: (user: any) => api.post('/admin/users', user),
  }
};

export default api;
