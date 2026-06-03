import apiClient from './api';

export default {
  getAll(page = 0, limit = 20) {
    return apiClient.get('/patients/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/patients/${id}`);
  },
  search(body, page = 0, limit = 20) {
    return apiClient.post('/patients/search', body, { params: { page, limit } });
  },
  create(body) {
    return apiClient.post('/patients/create', body);
  },
  update(id, body) {
    return apiClient.put(`/patients/${id}`, body);
  },
  deletePatient(id) {
    return apiClient.delete(`/patients/${id}`);
  },
  changeUser(id, newUserEmail) {
    return apiClient.put(`/patients/${id}/change-user`, { newUserEmail });
  },
};
