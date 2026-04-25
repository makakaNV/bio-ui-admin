import apiClient from './api';

export default {
  getAll(page = 0, limit = 20) {
    return apiClient.get('/containers/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/containers/${id}`);
  },
};
