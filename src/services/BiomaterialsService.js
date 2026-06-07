import apiClient from './api';

export default {
  getAll(page = 0, limit = 15) {
    return apiClient.get('/biomaterials/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/biomaterials/${id}`);
  },
  create(body) {
    return apiClient.post('/biomaterials', body);
  },
  update(id, body) {
    return apiClient.put(`/biomaterials/${id}`, body);
  },
  delete(id) {
    return apiClient.delete(`/biomaterials/${id}`, { params: { softDelete: true } });
  },
};
