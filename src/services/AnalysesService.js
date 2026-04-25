import apiClient from './api';

export default {
  getAll(page = 0, limit = 20) {
    return apiClient.get('/analyses/all', { params: { page, limit } });
  },
  getByCategoryCode(code, page = 0, limit = 20) {
    return apiClient.get(`/analyses/all/${code}`, { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/analyses/${id}`);
  },
  getAllCategories(page = 0, limit = 100) {
    return apiClient.get('/categories/all', { params: { page, limit } });
  },
  getAvailableBiomaterials(id) {
    return apiClient.get(`/analyses/available_biomaterials/${id}`);
  },
  getRecent() {
    return apiClient.get('/analyses/recent');
  },
};
