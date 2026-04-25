
import axios from 'axios';
import { getAccessToken } from '../store';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for JWT
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const endpoints = {
  auth: {
    login: (credentials: any) => api.post('/auth/login', credentials),
    me: () => api.get('/auth/me'),
  },
  grievances: {
    getAll: () => api.get('/grievances'),
    getById: (id: string) => api.get(`/grievances/${id}`),
    submit: (data: any) => api.post('/grievances', data),
    updateStatus: (id: string, status: string, remark: string, remarks?: string[]) => 
      api.patch(`/grievances/${id}/status`, { status, remark, remarks }),
    remove: (id: string) => api.delete(`/grievances/${id}`),
  },
};

export default api;
