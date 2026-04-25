import apiClient from './api';

export default {
  /** Получить все тесты (пагинированный список) */
  getAll(page = 0, limit = 20) {
    return apiClient.get('/tests/all', { params: { page, limit } });
  },

  /** Получить один тест по UUID */
  getById(uuid) {
    return apiClient.get(`/tests/${uuid}`);
  },

  /** Получить тесты, привязанные к конкретному образцу */
  getBySpecimenId(specimenId) {
    return apiClient.get(`/tests/all/specimens/${specimenId}`);
  },

  /**
   * Внести результаты тестов для образца.
   * @param {number} specimenId
   * @param {{ results: Record<string, string> }} body  — { results: { "analysisId": "value", ... } }
   */
  setResults(specimenId, body) {
    return apiClient.patch(`/tests/results/for-specimen/${specimenId}`, body);
  }
};
