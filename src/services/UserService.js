import apiClient from './api';

export default {
  /** Получить профиль текущего пользователя (роли, username, email и т.д.) */
  getMyInfo() {
    return apiClient.get('/users/me');
  }
};
