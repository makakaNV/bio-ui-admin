<template>
  <div class="profile-wrap">

    <!-- Loading -->
    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка профиля...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else-if="user">

      <!-- ── Hero ──────────────────────────────────────────────────── -->
      <div class="hero" :style="{ '--role-color': primaryRole.color, '--role-bg': primaryRole.bg, '--role-border': primaryRole.border }">
        <div class="hero-avatar">
          <img v-if="primaryRole.img" :src="primaryRole.img" class="hero-avatar-img" alt="" />
          <i v-else :class="primaryRole.icon" />
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ user.username }}</h1>
          <span class="hero-email">{{ user.email }}</span>
          <div class="hero-roles">
            <span
              v-for="r in user.roles"
              :key="r.id"
              class="role-badge"
              :style="{
                background: ROLE_META[r.name]?.bg ?? '#f3f4f6',
                color:      ROLE_META[r.name]?.color ?? '#374151',
                border:     `1px solid ${ROLE_META[r.name]?.border ?? '#e5e7eb'}`
              }"
            >
              <i :class="ROLE_META[r.name]?.icon" />
              {{ ROLE_META[r.name]?.label ?? r.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Account details ───────────────────────────────────────── -->
      <div class="section">
        <div class="section-title">Данные аккаунта</div>
        <div class="info-list">
          <div class="info-row">
            <span class="info-key"><i class="pi pi-hashtag" />ID</span>
            <span class="info-val">{{ user.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-key"><i class="pi pi-user" />Имя пользователя</span>
            <span class="info-val">{{ user.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-key"><i class="pi pi-envelope" />Email</span>
            <span class="info-val">{{ user.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-key"><i class="pi pi-calendar-plus" />Дата регистрации</span>
            <span class="info-val">{{ formatDate(user.created) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key"><i class="pi pi-clock" />Последний вход</span>
            <span class="info-val">{{ formatDate(user.lastLogin) }}</span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import UserService from '@/services/UserService';
import chemistryIcon from '@/assets/chemistry.png';

// ── Role metadata ─────────────────────────────────────────────────
const ROLE_META = {
  ADMIN: {
    label:  'Системный администратор',
    desc:   'Полный доступ ко всем разделам системы, управление пользователями и настройками',
    icon:   'pi pi-shield',
    color:  '#9f1239',
    bg:     '#fff1f2',
    border: '#fecdd3',
  },
  MLT: {
    label:  'Лаборант',
    desc:   'Работа с образцами, тестами и результатами лабораторных исследований',
    icon:   null,
    img:    chemistryIcon,
    color:  '#0f766e',
    bg:     '#f0fdfa',
    border: '#99f6e4',
  },
  RECEPTIONIST: {
    label:  'Регистратор',
    desc:   'Оформление заказов, работа с пациентами и входящей документацией',
    icon:   'pi pi-id-card',
    color:  '#1d4ed8',
    bg:     '#eff6ff',
    border: '#bfdbfe',
  },
};


// ── State ─────────────────────────────────────────────────────────
const user    = ref(null);
const loading = ref(true);
const error   = ref('');

// Приоритет: ADMIN > MLT > RECEPTIONIST
const ROLE_PRIORITY = ['ADMIN', 'MLT', 'RECEPTIONIST'];

const primaryRole = computed(() => {
  if (!user.value?.roles?.length) return ROLE_META.MLT;
  const names = user.value.roles.map(r => r.name);
  const top   = ROLE_PRIORITY.find(r => names.includes(r)) ?? names[0];
  return ROLE_META[top] ?? ROLE_META.MLT;
});

// ── Fetch ─────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res  = await UserService.getMyInfo();
    user.value = res.data?.payload ?? null;
  } catch {
    error.value = 'Не удалось загрузить профиль';
  } finally {
    loading.value = false;
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
}
</script>

<style scoped>
.profile-wrap {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── State ────────────────────────────────────────────────────────── */
.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 4rem 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}
.state-msg .pi { font-size: 2rem; }
.state-msg--error { color: #be123c; }

/* ── Hero ─────────────────────────────────────────────────────────── */
.hero {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  padding: 1.75rem 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
  overflow: hidden;
}

/* Тонкая цветная полоска сверху по роли */
.hero::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--role-color);
}

.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: var(--role-bg);
  border: 2px solid var(--role-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-avatar .pi {
  font-size: 1.875rem;
  color: var(--role-color);
}

.hero-avatar-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name {
  font-size: 1.375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem;
}

.hero-email {
  font-size: 0.875rem;
  color: #6b7280;
  display: block;
  margin-bottom: 0.625rem;
}

.hero-roles {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.625rem;
  border-radius: 20px;
  font-size: 0.73rem;
  font-weight: 600;
}
.role-badge .pi { font-size: 0.65rem; }

.hero-status {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  padding: 0.2rem 0.625rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}


/* ── Section ──────────────────────────────────────────────────────── */
.section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  overflow: hidden;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  padding: 0.75rem 1.5rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

/* ── Info list ────────────────────────────────────────────────────── */
.info-list {
  padding: 0.25rem 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #f9fafb;
  gap: 1rem;
}
.info-row:last-child { border-bottom: none; }

.info-key {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8375rem;
  color: #6b7280;
  flex-shrink: 0;
}
.info-key .pi { font-size: 0.8rem; color: #9ca3af; }

.info-val {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  text-align: right;
}

</style>
