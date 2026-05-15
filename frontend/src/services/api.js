import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors - don't auto-redirect, let components handle it
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Images API
export const imagesAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  bulkUpload: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/images/upload/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  list: (skip = 0, limit = 50) => api.get(`/images/?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/images/${id}`),
  delete: (id) => api.delete(`/images/${id}`),
};

// Faces API
export const facesAPI = {
  list: (skip = 0, limit = 100) => api.get(`/faces/?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/faces/${id}`),
  search: (file, limit = 20, threshold = null) => {
    const formData = new FormData();
    formData.append('file', file);
    let url = `/faces/search?limit=${limit}`;
    if (threshold) url += `&threshold=${threshold}`;
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  assignPerson: (faceId, personId) =>
    api.put(`/faces/${faceId}/assign-person?person_id=${personId}`),
  unassignPerson: (faceId) => api.delete(`/faces/${faceId}/assign-person`),
};

// Persons API
export const personsAPI = {
  create: (data) => api.post('/persons/', data),
  list: (skip = 0, limit = 100) => api.get(`/persons/?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/persons/${id}`),
  update: (id, data) => api.put(`/persons/${id}`, data),
  delete: (id) => api.delete(`/persons/${id}`),
};

// Clusters API
export const clustersAPI = {
  runClustering: () => api.post('/clusters/run'),
  list: (skip = 0, limit = 100) => api.get(`/clusters/?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/clusters/${id}`),
  update: (id, data) => api.put(`/clusters/${id}`, data),
  delete: (id) => api.delete(`/clusters/${id}`),
};

// Users API (Admin only)
export const usersAPI = {
  list: (skip = 0, limit = 100) => api.get(`/users/?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => api.put(`/users/${id}/password?new_password=${encodeURIComponent(newPassword)}`),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
  getStats: () => api.get('/users/stats'),
};

export default api;
