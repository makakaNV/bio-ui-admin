import apiClient from './api';

export default {
  /**
   * Получить все заказы с пагинацией.
   * @param {number} page  — номер страницы (0-based)
   * @param {number} size  — размер страницы
   */
  getAll(page = 0, size = 20) {
    return apiClient.get('/orders/all', { params: { page, size } });
  }
};
