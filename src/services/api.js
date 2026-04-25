import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://medstorm-api.ru',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Добавляем JWT-токен из localStorage к каждому запросу
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
