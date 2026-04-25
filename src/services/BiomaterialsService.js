import apiClient from './api';

export default {
  getAll(page = 0, limit = 15) {
    return apiClient.get('/biomaterials/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/biomaterials/${id}`);
  },
};
