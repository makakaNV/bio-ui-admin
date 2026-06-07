import apiClient from './api';

export default {
  getAll(page = 0, limit = 15) {
    return apiClient.get('/orders/all', { params: { page, limit } });
  },
  getById(id) {
    return apiClient.get(`/orders/${id}`);
  },
  getByPatientId(id, page = 0, limit = 15) {
    return apiClient.get(`/orders/patient/${id}`, { params: { page, limit } });
  },
  cancel(id, cancelReason) {
    return apiClient.put(`/orders/${id}/cancel`, { cancelReason });
  },
  createForUser(body) {
    return apiClient.post('/orders/for-user', body);
  },
};
