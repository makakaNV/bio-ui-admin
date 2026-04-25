<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <img src="@/assets/admin-mini-logo.svg" class="login-logo" alt="Biospectrum" />
        <h1 class="login-title">Biospectrum</h1>
      </div>

      <div class="login-body">
        <div class="field-group">
          <label class="field-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            :class="{ 'field-input--error': errors.email }"
            placeholder="you@biospectrum.ru"
            @blur="validateEmail"
          />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>

        <div class="field-group">
          <label class="field-label">Пароль</label>
          <div class="password-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="field-input"
              :class="{ 'field-input--error': errors.password }"
              placeholder="Введите пароль"
              @keyup.enter="login"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
          </div>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>

        <div v-if="serverError" class="server-error">
          <i class="pi pi-exclamation-circle" />
          {{ serverError }}
        </div>

        <button
          class="submit-btn"
          :disabled="loading"
          @click="login"
        >
          <i v-if="loading" class="pi pi-spinner pi-spin" />
          <span>{{ loading ? 'Вход...' : 'Войти' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import AuthService from '@/services/AuthService';
import UserService from '@/services/UserService';
import { isLoggedIn, userRoles, userName } from '@/stores/auth';

const router = useRouter();
const email        = ref('');
const password     = ref('');
const showPassword = ref(false);
const loading      = ref(false);
const serverError  = ref('');
const errors       = reactive({ email: '', password: '' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail() {
  if (!email.value)               errors.email = 'Введите email';
  else if (!EMAIL_RE.test(email.value)) errors.email = 'Некорректный формат email';
  else                            errors.email = '';
}

function validate() {
  validateEmail();
  errors.password = password.value ? '' : 'Введите пароль';
  return !errors.email && !errors.password;
}

async function login() {
  serverError.value = '';
  if (!validate()) return;
  loading.value = true;
  try {
    const response = await AuthService.login(email.value, password.value);
    const token = response.data?.payload?.token;
    if (!token) throw new Error('No token in response');
    localStorage.setItem('authToken', token);

    // Загружаем профиль и проверяем доступ
    const meRes = await UserService.getMyInfo();
    const user  = meRes.data?.payload;
    const roles = (user?.roles ?? []).map(r => r.name);

    if (roles.length > 0 && roles.every(r => r === 'USER')) {
      localStorage.removeItem('authToken');
      serverError.value = 'Доступ запрещён. Эта система только для сотрудников.';
      return;
    }

    userRoles.value = roles;
    userName.value  = user?.username || user?.email || '';
    localStorage.setItem('userRoles', JSON.stringify(roles));
    localStorage.setItem('userName', userName.value);
    isLoggedIn.value = true;
    router.push('/');
  } catch (error) {
    const status = error.response?.status;
    serverError.value = (status === 401 || status === 400 || status === 500)
      ? 'Неверный email или пароль'
      : 'Произошла ошибка. Попробуйте ещё раз.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ── Page background ──────────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f6;
  padding: 1rem;
}

/* ── Card ─────────────────────────────────────────────────────────── */
.login-card {
  width: 100%;
  max-width: 400px;
  background: #13151c;
  border: 1px solid #1e2029;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px #0d0f14,
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(159, 18, 57, 0.08);
}

/* ── Header ───────────────────────────────────────────────────────── */
.login-header {
  padding: 2.25rem 2rem 1.75rem;
  text-align: center;
  border-bottom: 1px solid #1e2029;
}

.login-logo {
  display: block;
  margin: 0 auto 1.25rem;
  width: 34px;
  height: 42px;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f1f1;
  letter-spacing: 0.02em;
  margin: 0 0 0.375rem;
}

/* ── Form body ────────────────────────────────────────────────────── */
.login-body {
  padding: 1.75rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.03em;
}

.field-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  border: 1.5px solid #1e2029;
  border-radius: 8px;
  outline: none;
  background: #0d0f14;
  color: #e5e7eb;
  caret-color: #e11d48;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}

.field-input::placeholder { color: #374151; }

.field-input:focus {
  border-color: #7f1d1d;
  box-shadow: 0 0 0 3px rgba(159, 18, 57, 0.15);
  background: #0d0f14;
}

.field-input--error {
  border-color: #7f1d1d !important;
  background: #0d0f14;
}

.field-error {
  font-size: 0.78rem;
  color: #f43f5e;
}

/* ── Password toggle ──────────────────────────────────────────────── */
.password-wrapper { position: relative; }
.password-wrapper .field-input { padding-right: 2.75rem; }

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #374151;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}
.password-toggle:hover { color: #9f1239; }

/* ── Server error ─────────────────────────────────────────────────── */
.server-error {
  background: #1a080e;
  border: 1px solid #3d1219;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fda4af;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ── Submit button ────────────────────────────────────────────────── */
.submit-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #9f1239;
  color: #fff;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.2s, box-shadow 0.2s;
  font-family: inherit;
  margin-top: 0.25rem;
}

.submit-btn:hover:not(:disabled) {
  background: #be123c;
  box-shadow: 0 4px 20px rgba(190, 18, 60, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
