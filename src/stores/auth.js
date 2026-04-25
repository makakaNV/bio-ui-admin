import { ref } from 'vue';

// Инициализируем из localStorage сразу — без мигания при загрузке.
// App.vue корректирует при невалидном/протухшем токене (401).
export const isLoggedIn = ref(!!localStorage.getItem('authToken'));
export const userRoles  = ref(JSON.parse(localStorage.getItem('userRoles') || '[]'));
export const userName   = ref(localStorage.getItem('userName') || '');
