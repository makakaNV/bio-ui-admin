import apiClient from './api';

export default {
  login(email, password) {
    return apiClient.post('/auth/login', { email, password });
  },

  getMe() {
    return apiClient.get('/auth/profile');
  },

  logout() {
    return apiClient.post('/auth/logout');
  }
};
