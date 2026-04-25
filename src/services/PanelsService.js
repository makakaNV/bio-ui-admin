import apiClient from './api';

export default {
  getAll(page = 0, limit = 20) {
    return apiClient.get('/panels/all', { params: { page, limit } });
  },
  getByGroupCode(code, page = 0, limit = 20) {
    return apiClient.get(`/panels/all/${code}`, { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/panels/${id}`);
  },
  getAllGroups(page = 0, limit = 100) {
    return apiClient.get('/panels-group/all', { params: { page, limit } });
  },
};
