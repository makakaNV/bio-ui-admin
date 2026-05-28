import apiClient from './api';

export default {
  getMyInfo() {
    return apiClient.get('/users/me');
  },
  getAll(page = 0, limit = 20) {
    return apiClient.get('/users/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/users/${id}`);
  },
  search(body, page = 0, limit = 20) {
    return apiClient.post('/users/search', body, { params: { page, limit } });
  },
  deleteUser(id, softDelete = true) {
    return apiClient.delete(`/users/${id}`, { params: { softDelete } });
  },
  getAllRoles() {
    return apiClient.get('/roles/all');
  },
  promote(id, role) {
    return apiClient.post(`/users/${id}/promote`, null, { params: { role } });
  },
  demote(id, role) {
    return apiClient.post(`/users/${id}/demote`, null, { params: { role } });
  },
};
