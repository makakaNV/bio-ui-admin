<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo" @click="router.push('/')" title="На главную">
        <img src="@/assets/big-logo.svg" class="sidebar-logo-img" alt="Biospectrum" />
      </div>

      <nav class="sidebar-nav">
        <template v-for="(section, si) in visibleSections" :key="si">
          <div v-if="si > 0" class="nav-sep" />

          <!-- Секция с подгруппами (Лаборатория) -->
          <template v-if="section.subgroups">
            <div v-if="section.label" class="nav-group-label">{{ section.label }}</div>
            <template v-for="sg in section.subgroups" :key="sg.label">
              <div class="nav-subgroup-label">{{ sg.label }}</div>
              <router-link
                v-for="item in sg.items"
                :key="item.to"
                :to="item.to"
                class="nav-item nav-item--sub"
              >
                <i :class="item.icon" />
                <span>{{ item.label }}</span>
              </router-link>
            </template>
          </template>

          <!-- Обычная секция -->
          <template v-else>
            <router-link
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="nav-item"
              :class="{ 'nav-item--exact': item.exact }"
            >
              <i :class="item.icon" />
              <span>{{ item.label }}</span>
            </router-link>
          </template>
        </template>
      </nav>

      <a href="https://biospectrum.ru/" target="_blank" rel="noopener" class="portal-link">
        <i class="pi pi-external-link" />
        <span>Портал</span>
      </a>

      <div class="sidebar-footer">
        <div class="user-info" @click="router.push('/profile')" title="Профиль">
          <i class="pi pi-user-circle" />
          <span class="user-name">{{ userName || '—' }}</span>
        </div>
        <button class="logout-btn" title="Выйти" @click="handleLogout">
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-wrapper">
      <header class="app-header">
        <span class="page-title">{{ route.meta?.title ?? '' }}</span>
      </header>
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthService from '@/services/AuthService';
import { isLoggedIn, userRoles, userName } from '@/stores/auth';

const route  = useRoute();
const router = useRouter();

// ── Nav config ────────────────────────────────────────────────────────
// roles: если не указано — видно всем авторизованным пользователям
const NAV_SECTIONS = [
  {
    items: [
      { to: '/orders',   label: 'Заказы',   icon: 'pi pi-list', roles: ['ADMIN', 'RECEPTIONIST'] },
      { to: '/patients', label: 'Пациенты', icon: 'pi pi-user', roles: ['ADMIN', 'RECEPTIONIST'] },
    ]
  },
  {
    label: 'Лаборатория',
    roles: ['ADMIN', 'MLT'],
    subgroups: [
      {
        label: 'Операционные',
        items: [
          { to: '/lab/samples', label: 'Образцы', icon: 'pi pi-box' },
          { to: '/lab/tests',   label: 'Тесты',   icon: 'pi pi-check-circle' },
        ]
      },
      {
        label: 'Справочные',
        items: [
          { to: '/lab/analyses',     label: 'Анализы',       icon: 'pi pi-chart-bar' },
          { to: '/lab/biomaterials', label: 'Биоматериалы', icon: 'pi pi-heart' },
          { to: '/lab/containers',   label: 'Контейнеры',   icon: 'pi pi-inbox' },
          { to: '/lab/studies',      label: 'Исследования', icon: 'pi pi-book' },
        ]
      }
    ]
  },
  {
    items: [
      { to: '/users', label: 'Пользователи', icon: 'pi pi-users', roles: ['ADMIN'] },
    ]
  }
];

const canAccess = (roles) =>
  !roles || roles.some(r => userRoles.value.includes(r));

const visibleSections = computed(() =>
  NAV_SECTIONS
    .map(section => {
      if (section.subgroups) {
        return canAccess(section.roles) ? section : null;
      }
      const items = section.items.filter(item => canAccess(item.roles));
      return items.length ? { ...section, items } : null;
    })
    .filter(Boolean)
);

// ── Logout ────────────────────────────────────────────────────────────
async function handleLogout() {
  try { await AuthService.logout(); } catch { /* игнорируем сетевую ошибку */ }
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRoles');
  localStorage.removeItem('userName');
  isLoggedIn.value = false;
  userRoles.value  = [];
  userName.value   = '';
  router.push('/login');
}
</script>

<style scoped>
/* ── Layout shell ─────────────────────────────────────────────────── */
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ──────────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #0d0f14;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #1e1f27;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}

.sidebar-logo:hover { opacity: 0.85; }

.sidebar-logo-img {
  width: 100%;
  max-width: 160px;
  height: auto;
  display: block;
}

/* ── Nav container ────────────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  padding: 0.625rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

/* ── Section separator ────────────────────────────────────────────── */
.nav-sep {
  height: 1px;
  background: #1e1f27;
  margin: 0.375rem 0.375rem;
}

/* ── Group label (Лаборатория) ────────────────────────────────────── */
.nav-group-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #374151;
  padding: 0.5rem 0.875rem 0.125rem;
}

/* ── Subgroup label (Операционные / Справочные) ───────────────────── */
.nav-subgroup-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #2d3748;
  padding: 0.5rem 0.875rem 0.125rem 1.375rem;
  margin-top: 0.125rem;
}

/* ── Nav item ─────────────────────────────────────────────────────── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5625rem 0.875rem;
  border-radius: 6px;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.nav-item--sub {
  padding-left: 1.375rem;
  font-size: 0.8375rem;
}

.nav-item:hover {
  background: #15171e;
  color: #d1d5db;
}

.nav-item:hover .pi {
  color: #9ca3af;
}

/* Активный пункт — тонкая красная полоска слева, тёмный фон */
.nav-item--exact.router-link-exact-active,
.nav-item:not(.nav-item--exact).router-link-active {
  background: #1a080e;
  color: #fecdd3;
  border-left: 3px solid #9f1239;
  padding-left: calc(0.875rem - 3px);
}

.nav-item--sub.router-link-active {
  padding-left: calc(1.375rem - 3px);
}

.nav-item--exact.router-link-exact-active .pi,
.nav-item:not(.nav-item--exact).router-link-active .pi {
  color: #fda4af;
}

.nav-item .pi {
  font-size: 0.9375rem;
  width: 1rem;
  flex-shrink: 0;
  color: #4b5563;
  transition: color 0.15s;
}

/* ── Portal link ──────────────────────────────────────────────────── */
.portal-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5625rem 0.875rem;
  margin: 0 0.5rem 0.25rem;
  border-radius: 6px;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.portal-link:hover {
  background: #15171e;
  color: #d1d5db;
}
.portal-link .pi {
  font-size: 0.9375rem;
  width: 1rem;
  flex-shrink: 0;
  color: #4b5563;
  transition: color 0.15s;
}
.portal-link:hover .pi { color: #9ca3af; }

/* ── Sidebar footer ───────────────────────────────────────────────── */
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border-top: 1px solid #1e1f27;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  padding: 0.25rem 0.375rem;
  transition: color 0.15s, background 0.15s;
}
.user-info:hover {
  color: #d1d5db;
  background: #15171e;
}

.user-info .pi {
  font-size: 1.1rem;
  flex-shrink: 0;
  color: #4b5563;
}

.user-name {
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #4b5563;
  padding: 0.375rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.logout-btn:hover {
  color: #f43f5e;
  background: #15171e;
}

.logout-btn .pi { font-size: 1rem; }

/* ── Main wrapper ─────────────────────────────────────────────────── */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f4f4f6;
}

/* ── Header ───────────────────────────────────────────────────────── */
.app-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  flex-shrink: 0;
}

.page-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: #111827;
  letter-spacing: 0.01em;
}

/* ── Content ──────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>
