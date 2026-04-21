import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Derive the backend origin for static asset URLs (photos, etc.)
// If REACT_APP_API_URL is set to e.g. "https://host/api", we strip the /api suffix
// so that uploads are served from "https://host/uploads/..." correctly.
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL: API_BASE });

export const clientsApi = {
  getAll: () => api.get('/clients').then(r => r.data),
  getOne: (id) => api.get(`/clients/${id}`).then(r => r.data),
  create: (data) => api.post('/clients', data).then(r => r.data),
  update: (id, data) => api.put(`/clients/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/clients/${id}`).then(r => r.data),
};

export const sitesApi = {
  getAll: (params) => api.get('/sites', { params }).then(r => r.data),
  getOne: (id) => api.get(`/sites/${id}`).then(r => r.data),
  create: (data) => api.post('/sites', data).then(r => r.data),
  update: (id, data) => api.put(`/sites/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/sites/${id}`).then(r => r.data),
};

export const systemsApi = {
  getAll: (params) => api.get('/systems', { params }).then(r => r.data),
  getOne: (id) => api.get(`/systems/${id}`).then(r => r.data),
  create: (data) => api.post('/systems', data).then(r => r.data),
  update: (id, data) => api.put(`/systems/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/systems/${id}`).then(r => r.data),

  uploadPhoto: (id, formData) => api.post(`/systems/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  deletePhoto: (id, photoId) => api.delete(`/systems/${id}/photos/${photoId}`).then(r => r.data),

  uploadBackup: (id, formData) => api.post(`/systems/${id}/backups`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  downloadBackup: (id, backupId) => `${API_BASE}/systems/${id}/backups/${backupId}/download`,
  deleteBackup: (id, backupId) => api.delete(`/systems/${id}/backups/${backupId}`).then(r => r.data),

  createHmi: (id, data) => api.post(`/systems/${id}/hmis`, data).then(r => r.data),
  updateHmi: (id, hmiId, data) => api.put(`/systems/${id}/hmis/${hmiId}`, data).then(r => r.data),
  deleteHmi: (id, hmiId) => api.delete(`/systems/${id}/hmis/${hmiId}`).then(r => r.data),
};

export const statsApi = {
  get: () => api.get('/stats').then(r => r.data),
};

export const getPhotoUrl = (filename) =>
  `${BACKEND_ORIGIN}/uploads/photos/${filename}`;

export default api;
