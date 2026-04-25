import apiClient from './api';

export default {
  getAll(page = 0, limit = 20) {
    return apiClient.get('/specimens/all', { params: { page, limit } });
  },

  /** Получить один образец по ID */
  getById(id) {
    return apiClient.get(`/specimens/${id}`);
  },

  /** Получить все образцы конкретного заказа (непагинированный список) */
  getByOrderId(orderId) {
    return apiClient.get(`/specimens/order/${orderId}`);
  },

  /** Получить все образцы пациента */
  getByPatientId(patientId) {
    return apiClient.get(`/specimens/patient/${patientId}`);
  },

  /**
   * Отметить образцы как COLLECTED.
   * @param {Array<{id: number, barcode: string}>} specimens
   */
  collectList(specimens) {
    return apiClient.patch('/specimens/collect/list', specimens);
  },

  /** Отметить все образцы заказа как DISPOSED
   *  TODO: уточнить endpoint у бэка */
  disposeByOrder(orderId) {
    return apiClient.patch(`/specimens/dispose/order/${orderId}`);
  },

  getRecent(page = 0, limit = 20) {
    return apiClient.get('/specimens/recent', { params: { page, limit } });
  },
};
