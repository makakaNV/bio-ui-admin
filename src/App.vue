<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import UserService from './services/UserService';
import { isLoggedIn, userRoles, userName } from './stores/auth';

// При загрузке валидируем токен через /users/me и заодно обновляем роли.
// Сбрасываем только при явном 401 — сетевые ошибки не разлогинивают.
onMounted(async () => {
  if (!isLoggedIn.value) return;
  try {
    const res  = await UserService.getMyInfo();
    const user = res.data?.payload;
    if (user) {
      const roles = (user.roles ?? []).map(r => r.name);
      userRoles.value = roles;
      userName.value  = user.username || user.email || '';
      localStorage.setItem('userRoles', JSON.stringify(roles));
      localStorage.setItem('userName', userName.value);

      // Пользователи с ролью USER не имеют доступа к admin-контуру
      if (roles.length > 0 && roles.every(r => r === 'USER')) {
        clearAuth();
      }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      clearAuth();
    }
  }
});

function clearAuth() {
  isLoggedIn.value = false;
  userRoles.value  = [];
  userName.value   = '';
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRoles');
  localStorage.removeItem('userName');
}
</script>

<style>
:root {
  --brand-50:  #fff1f2;
  --brand-100: #ffe4e6;
  --brand-200: #fecdd3;
  --brand-400: #fb7185;
  --brand-500: #f43f5e;
  --brand-600: #e11d48;
  --brand-700: #be123c;
  --brand-800: #9f1239;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: var(--surface-ground);
  color: var(--text-color);
  margin: 0;
  padding: 0;
}
</style>
