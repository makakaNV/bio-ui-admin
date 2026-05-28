<template>
  <!-- ── Search bar ──────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field" :class="{ 'search-field--active': searchMode === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="search.id"
        class="search-input"
        placeholder="Найти по ID пользователя"
        inputmode="numeric"
        @keyup.enter="searchById"
        @input="onIdInput"
      />
      <button v-if="searchMode === 'id'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field" :class="{ 'search-field--active': searchMode === 'text' }">
      <i class="pi pi-search search-icon" />
      <input
        v-model="search.text"
        class="search-input"
        placeholder="Поиск по username или email"
        @keyup.enter="searchByText(0)"
        @input="onTextInput"
      />
      <button v-if="searchMode === 'text'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>

  <!-- ── Search result bar ──────────────────────────────────────────── -->
  <div v-if="searchMode && searchResultMsg" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMsg }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Users container ────────────────────────────────────────────── -->
  <div class="users-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка пользователей...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="users.length === 0" class="state-msg">
        <i class="pi pi-users" /><span>Пользователи не найдены</span>
      </div>

      <div v-else class="user-list">
        <div
          v-for="u in users"
          :key="u.id"
          class="user-card"
          @click="openDetail(u)"
        >
          <div class="dots-col">
            <span
              class="dot"
              :class="`dot--${u.registrationStatus}`"
              :title="STATUS_LABELS[u.registrationStatus] ?? u.registrationStatus"
            />
            <span
              class="dot"
              :style="rolesDotStyle(u)"
              :title="(u.roles ?? []).map(r => r.name).join(', ') || 'Нет ролей'"
            />
          </div>
          <span class="user-id">#{{ u.id }}</span>
          <span class="user-name">{{ u.username ?? '—' }}</span>
          <div class="user-middle">
            <span class="user-email">{{ u.email ?? '—' }}</span>
            <span class="login-val">{{ formatTs(u.lastLogin) }}</span>
          </div>
          <i class="pi pi-chevron-right user-arrow" />
        </div>
      </div>

      <Paginator
        v-if="searchMode !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 30]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="users-paginator"
      />
    </template>
  </div>

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  <Dialog
    v-model:visible="detail.visible"
    modal
    :draggable="false"
    :style="{ width: '480px' }"
  >
    <template #header>
      <div class="detail-header">
        <div class="dots-col">
          <span
            class="dot"
            :class="`dot--${detail.user?.registrationStatus}`"
            :title="STATUS_LABELS[detail.user?.registrationStatus]"
          />
          <span
            class="dot"
            :style="rolesDotStyle(detail.user ?? {})"
            :title="(detail.user?.roles ?? []).map(r => r.name).join(', ') || 'Нет ролей'"
          />
        </div>
        <span class="detail-username">{{ detail.user?.username ?? '—' }}</span>
        <span class="detail-id">#{{ detail.user?.id }}</span>
      </div>
    </template>

    <!-- Action buttons -->
    <div class="detail-actions">
      <button class="action-btn" @click="openRolesDialog">Изменить роль</button>
      <button class="action-btn action-btn--disabled" disabled>Заказы</button>
      <button class="action-btn action-btn--danger" @click="openDeleteDialog">Удалить</button>
    </div>

    <!-- Info grid -->
    <div class="detail-info">
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-val">{{ detail.user?.email ?? '—' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Дата создания</span>
        <span class="info-val">{{ formatTs(detail.user?.created) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Последний вход</span>
        <span class="info-val">{{ formatTs(detail.user?.lastLogin) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Статус</span>
        <span class="info-status" :class="`info-status--${detail.user?.registrationStatus}`">
          {{ STATUS_LABELS[detail.user?.registrationStatus] ?? detail.user?.registrationStatus ?? '—' }}
        </span>
      </div>
      <div class="info-row info-row--roles">
        <span class="info-label">Роли</span>
        <div class="info-roles">
          <span
            v-for="r in (detail.user?.roles ?? [])"
            :key="r.id"
            class="role-badge"
            :class="`role-badge--${r.name}`"
          >{{ r.name }}</span>
          <span v-if="!(detail.user?.roles ?? []).length" class="info-val">—</span>
        </div>
      </div>
    </div>
  </Dialog>

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- ── Roles dialog ──────────────────────────────────────────────── -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  <Dialog
    v-model:visible="roles.visible"
    modal
    :draggable="false"
    :style="{ width: '460px' }"
  >
    <template #header>
      <span>Роли пользователя <b>{{ detail.user?.username }}</b></span>
    </template>

    <div class="roles-body">

      <!-- Loading all roles -->
      <div v-if="roles.loadingAll" class="roles-state">
        <i class="pi pi-spin pi-spinner" /> Загрузка ролей...
      </div>

      <template v-else>
        <!-- Current roles -->
        <div class="roles-section-label">Текущие роли</div>
        <div class="roles-zone roles-zone--current">
          <div
            v-for="r in roles.userRoles"
            :key="r"
            class="rb-wrap"
            :class="{ 'rb-wrap--new': isPendingAdd(r) }"
          >
            <span class="role-badge" :class="`role-badge--${r}`">{{ r }}</span>
            <button
              v-if="canDemote()"
              class="rb-action rb-action--remove"
              :disabled="roles.applying"
              @click="removeRoleLocally(r)"
              title="Убрать роль"
            >
              <i class="pi pi-times" />
            </button>
            <span v-else class="rb-protected" title="Нельзя убрать последнюю роль">
              <i class="pi pi-lock" />
            </span>
          </div>
          <span v-if="!roles.userRoles.length" class="roles-empty">Нет ролей</span>
        </div>

        <!-- Available roles to add -->
        <div class="roles-section-label" style="margin-top: 1rem">Добавить роль</div>
        <div class="roles-zone roles-zone--available">
          <button
            v-for="r in availableRoles"
            :key="r"
            class="rb-add"
            :class="`rb-add--${r}`"
            :disabled="roles.applying"
            @click="addRoleLocally(r)"
          >
            <i class="pi pi-plus" />
            {{ r }}
          </button>
          <span v-if="!availableRoles.length" class="roles-empty">Все роли уже назначены</span>
        </div>

        <!-- Error -->
        <div v-if="roles.error" class="roles-error">
          <i class="pi pi-exclamation-circle" /> {{ roles.error }}
        </div>
      </template>
    </div>

    <template #footer>
      <div class="roles-footer">
        <span class="roles-warning">
          Для вступления в силу изменений пользователю необходимо произвести повторный вход
        </span>
        <button
          class="del-btn-confirm"
          :disabled="!hasPendingChanges || roles.applying"
          @click="applyRoles"
        >
          <i v-if="roles.applying" class="pi pi-spin pi-spinner" />
          Применить
        </button>
      </div>
    </template>
  </Dialog>

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- ── Delete confirm dialog ─────────────────────────────────────── -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  <Dialog
    v-model:visible="del.visible"
    modal
    header="Удалить пользователя?"
    :draggable="false"
    :style="{ width: '400px' }"
  >
    <div class="del-body">
      <!-- Soft delete toggle -->
      <label class="del-toggle">
        <input
          v-model="del.soft"
          type="checkbox"
          class="del-checkbox"
        />
        <span class="del-toggle-label">Оставить в системе (мягкое удаление)</span>
      </label>

      <!-- Dynamic hint -->
      <div class="del-hint" :class="del.soft ? 'del-hint--soft' : 'del-hint--hard'">
        <i :class="del.soft ? 'pi pi-info-circle' : 'pi pi-exclamation-triangle'" />
        <span v-if="del.soft">
          Пользователь потеряет доступ, но данные останутся в системе.
        </span>
        <span v-else>
          Данные пользователя будут безвозвратно удалены из системы.
        </span>
      </div>

      <div v-if="del.error" class="del-error">
        <i class="pi pi-exclamation-circle" />
        {{ del.error }}
      </div>
    </div>

    <template #footer>
      <div class="del-footer">
        <button class="del-btn-cancel" @click="del.visible = false">Отмена</button>
        <button class="del-btn-confirm" :disabled="del.loading" @click="confirmDelete">
          <i v-if="del.loading" class="pi pi-spin pi-spinner" />
          {{ del.soft ? 'Деактивировать' : 'Удалить навсегда' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import Dialog    from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import UserService from '@/services/UserService';

// ── Search ────────────────────────────────────────────────────────
const search      = ref({ id: '', text: '' });
const searchMode  = ref('');
const searchResultMsg = ref('');

// ── List state ────────────────────────────────────────────────────
const users        = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(20);
const totalRecords = ref(0);

// ── Metadata ──────────────────────────────────────────────────────
const STATUS_LABELS = {
  ACTIVE:               'Активен',
  INACTIVE:             'Неактивен',
  PENDING_CONFIRMATION: 'Ожидает подтверждения',
};

// ── Role dot ──────────────────────────────────────────────────────
const ROLE_COLORS = {
  ADMIN:        '#ef4444',
  MLT:          '#14b8a6',
  RECEPTIONIST: '#3b82f6',
  USER:         '#6b7280',
};

function rolesDotStyle(u) {
  const roleList = (u.roles ?? []).map(r => r.name);
  if (!roleList.length) return { background: '#d1d5db' };
  const colors = roleList.map(r => ROLE_COLORS[r] ?? '#8b5cf6');
  if (colors.length === 1) return { background: colors[0] };
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ');
  return { background: `conic-gradient(${stops})` };
}

// ── Detail dialog ─────────────────────────────────────────────────
const detail = reactive({
  visible: false,
  user:    null,
});

function openDetail(u) {
  detail.user    = u;
  detail.visible = true;
}

// ── Roles dialog ─────────────────────────────────────────────────
const roles = reactive({
  visible:       false,
  loadingAll:    false,
  allRoles:      [],
  originalRoles: [],   // снимок при открытии
  userRoles:     [],   // визуальный стейт (мутируется локально)
  applying:      false,
  error:         '',
});

const availableRoles = computed(() =>
  roles.allRoles.filter(r => !roles.userRoles.includes(r))
);

const hasPendingChanges = computed(() =>
  roles.userRoles.some(r => !roles.originalRoles.includes(r)) ||
  roles.originalRoles.some(r => !roles.userRoles.includes(r))
);

function canDemote() {
  return roles.userRoles.length > 1;
}

function isPendingAdd(r) {
  return !roles.originalRoles.includes(r);
}

async function openRolesDialog() {
  const names          = (detail.user?.roles ?? []).map(r => r.name);
  roles.originalRoles  = [...names];
  roles.userRoles      = [...names];
  roles.error          = '';
  roles.applying       = false;
  roles.visible        = true;
  if (!roles.allRoles.length) {
    roles.loadingAll = true;
    try {
      const res      = await UserService.getAllRoles();
      roles.allRoles = (res.data?.payload ?? []).map(r => r.name);
    } catch {
      roles.error = 'Не удалось загрузить список ролей';
    } finally {
      roles.loadingAll = false;
    }
  }
}

function addRoleLocally(r) {
  if (!roles.userRoles.includes(r)) roles.userRoles.push(r);
}

function removeRoleLocally(r) {
  roles.userRoles = roles.userRoles.filter(x => x !== r);
}

async function applyRoles() {
  const toAdd = roles.userRoles.filter(r => !roles.originalRoles.includes(r));
  const toDel = roles.originalRoles.filter(r => !roles.userRoles.includes(r));

  roles.applying = true;
  roles.error    = '';
  try {
    for (const r of toAdd) await UserService.promote(detail.user.id, r);
    for (const r of toDel) await UserService.demote(detail.user.id, r);
    const res     = await UserService.getById(detail.user.id);
    const updated = res.data?.payload;
    if (updated) {
      const names         = (updated.roles ?? []).map(r => r.name);
      roles.originalRoles = [...names];
      roles.userRoles     = [...names];
      if (detail.user) detail.user.roles = updated.roles ?? [];
      const idx = users.value.findIndex(u => u.id === updated.id);
      if (idx !== -1) users.value[idx] = { ...users.value[idx], roles: updated.roles };
    }
    roles.visible = false;
  } catch (err) {
    roles.error = err.response?.data?.message ?? 'Ошибка при применении изменений';
  } finally {
    roles.applying = false;
  }
}

// ── Delete dialog ─────────────────────────────────────────────────
const del = reactive({
  visible: false,
  soft:    true,
  loading: false,
  error:   '',
});

function openDeleteDialog() {
  del.soft    = true;
  del.error   = '';
  del.loading = false;
  del.visible = true;
}

async function confirmDelete() {
  del.loading = true;
  del.error   = '';
  try {
    await UserService.deleteUser(detail.user.id, del.soft);
    users.value    = users.value.filter(u => u.id !== detail.user.id);
    del.visible    = false;
    detail.visible = false;
  } catch (err) {
    del.error = err.response?.data?.message ?? 'Не удалось удалить пользователя';
  } finally {
    del.loading = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function formatTs(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts));
}

// ── Fetch ─────────────────────────────────────────────────────────
async function fetchUsers(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res      = await UserService.getAll(page, limit);
    const payload  = res.data?.payload;
    users.value        = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить пользователей';
  } finally {
    loading.value = false;
  }
}

function onPage(event) {
  if (searchMode.value === 'text') searchByText(event.page, event.rows);
  else fetchUsers(event.page, event.rows);
}

// ── Text search ───────────────────────────────────────────────────
async function searchByText(page = 0, limit = pageLimit.value) {
  const q = search.value.text.trim();
  if (!q) return;
  loading.value = true;
  error.value   = null;
  try {
    const res     = await UserService.search({ keyword: q }, page, limit);
    const payload = res.data?.payload;
    users.value        = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
    searchMode.value   = 'text';
    searchResultMsg.value = `«${q}» — ${users.value.length ? totalRecords.value + ' польз.' : 'не найдено'}`;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Ошибка поиска';
  } finally {
    loading.value = false;
  }
}

function onTextInput() { if (!search.value.text.trim()) clearSearch(); }

// ── ID search ─────────────────────────────────────────────────────
async function searchById() {
  const raw = search.value.id.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await UserService.getById(Number(raw));
    const item = res.data?.payload;
    users.value           = item ? [item] : [];
    searchMode.value      = 'id';
    searchResultMsg.value = item
      ? `Пользователь #${raw}: ${item.username ?? item.email}`
      : 'Пользователь не найден';
  } catch (err) {
    if (err.response?.status === 404) {
      users.value           = [];
      searchMode.value      = 'id';
      searchResultMsg.value = `Пользователь #${raw} не найден`;
    } else {
      error.value = err.response?.data?.message ?? 'Ошибка поиска';
    }
  } finally {
    loading.value = false;
  }
}

function onIdInput() { if (!search.value.id.trim()) clearSearch(); }

function clearSearch() {
  search.value.id       = '';
  search.value.text     = '';
  searchMode.value      = '';
  searchResultMsg.value = '';
  fetchUsers(0, pageLimit.value);
}

onMounted(() => fetchUsers(0));
</script>

<style scoped>
/* ── Search bar ───────────────────────────────────────────────────── */
.search-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 0.875rem;
  height: 48px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-field:focus-within,
.search-field--active {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.08);
}

.search-icon { color: #9ca3af; font-size: 0.875rem; flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.875rem;
  background: transparent;
  color: #111827;
  font-family: inherit;
}
.search-input::placeholder { color: #9ca3af; }

.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0 0.125rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}
.search-clear:hover { color: #be123c; }
.search-clear .pi { font-size: 0.75rem; }

/* ── Search result bar ────────────────────────────────────────────── */
.search-result-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fdf2f8;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: #9f1239;
  margin-bottom: 0.625rem;
}
.search-result-clear {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: #be123c;
  font-weight: 600;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── Users container ──────────────────────────────────────────────── */
.users-wrap {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  min-height: 180px;
  overflow: hidden;
}

.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 3rem 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}
.state-msg .pi { font-size: 2rem; }
.state-msg--error { color: #be123c; }

/* ── User list ────────────────────────────────────────────────────── */
.user-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.5rem;
}

/* ── User card ────────────────────────────────────────────────────── */
.user-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s, border-color 0.15s;
}
.user-card:hover { background: #fdf8fb; border-color: #fecdd3; }

/* Dots */
.dots-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot--ACTIVE               { background: #22c55e; }
.dot--INACTIVE             { background: #9ca3af; }
.dot--PENDING_CONFIRMATION { background: #f59e0b; }


/* ID */
.user-id {
  font-family: monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #9f1239;
  min-width: 48px;
  flex-shrink: 0;
}

/* Username */
.user-name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  min-width: 130px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Email + last login */
.user-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.user-email {
  font-size: 0.8125rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-val {
  font-size: 0.75rem;
  color: #b0b7c3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Arrow */
.user-arrow {
  font-size: 0.75rem;
  color: #d1d5db;
  flex-shrink: 0;
  transition: color 0.12s, transform 0.12s;
}
.user-card:hover .user-arrow { color: #9f1239; transform: translateX(2px); }

/* ── Paginator ────────────────────────────────────────────────────── */
.users-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ── Detail dialog ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════ */
.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-username {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.detail-id {
  font-family: monospace;
  font-size: 0.8125rem;
  color: #9f1239;
  background: #fff1f2;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
}

/* Action buttons */
.detail-actions {
  display: flex;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
  transition: background 0.15s, border-color 0.15s;
}
.action-btn .pi { font-size: 0.8rem; }

.action-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-btn--danger {
  background: #fff1f2;
  color: #be123c;
  border-color: #fecdd3;
}
.action-btn--danger:hover {
  background: #ffe4e6;
  border-color: #fda4af;
}

/* Info grid */
.detail-info {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid #f9fafb;
  gap: 1rem;
}
.info-row:last-child { border-bottom: none; }
.info-row--roles { align-items: flex-start; }

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 130px;
  flex-shrink: 0;
}

.info-val {
  font-size: 0.875rem;
  color: #374151;
  word-break: break-all;
}

.info-status {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.2rem 0.625rem;
  border-radius: 20px;
}
.info-status--ACTIVE               { background: #dcfce7; color: #15803d; }
.info-status--INACTIVE             { background: #f3f4f6; color: #6b7280; }
.info-status--PENDING_CONFIRMATION { background: #fef9c3; color: #854d0e; }

.info-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.role-badge {
  padding: 0.175rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.role-badge--ADMIN        { background: #fee2e2; color: #b91c1c; }
.role-badge--USER         { background: #f3f4f6; color: #6b7280; }
.role-badge--MLT          { background: #ccfbf1; color: #0f766e; }
.role-badge--RECEPTIONIST { background: #dbeafe; color: #1d4ed8; }

/* ══════════════════════════════════════════════════════════════════════ */
/* ── Roles dialog ─────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════ */
.roles-dlg-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  color: #374151;
}
.roles-dlg-header .pi { color: #6b7280; }

.roles-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 0 0.5rem;
}

.roles-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

.roles-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.roles-zone {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0.625rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.roles-zone--current { border-color: #e5e7eb; }
.roles-zone--available { background: #fff; border-color: #e5e7eb; }

.roles-empty {
  font-size: 0.8125rem;
  color: #d1d5db;
  align-self: center;
}

/* Removable role badge wrapper */
.rb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.rb-wrap--new .role-badge {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}

.rb-action {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  background: #1f2937;
  color: #fff;
}
.rb-wrap:hover .rb-action { opacity: 1; }
.rb-action:disabled { cursor: not-allowed; }
.rb-action .pi { font-size: 0.55rem; }

.rb-protected {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
}
.rb-wrap:hover .rb-protected { opacity: 1; }
.rb-protected .pi { font-size: 0.5rem; color: #9ca3af; }

/* Add role button */
.rb-add {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.175rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  border: 1.5px dashed;
  background: transparent;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
  opacity: 0.65;
}
.rb-add:hover:not(:disabled) { opacity: 1; }
.rb-add:disabled { cursor: not-allowed; opacity: 0.35; }
.rb-add .pi { font-size: 0.65rem; }

.rb-add--ADMIN        { color: #b91c1c; border-color: #fca5a5; }
.rb-add--ADMIN:hover:not(:disabled) { background: #fee2e2; }
.rb-add--USER         { color: #6b7280; border-color: #d1d5db; }
.rb-add--USER:hover:not(:disabled) { background: #f3f4f6; }
.rb-add--MLT          { color: #0f766e; border-color: #5eead4; }
.rb-add--MLT:hover:not(:disabled) { background: #ccfbf1; }
.rb-add--RECEPTIONIST { color: #1d4ed8; border-color: #93c5fd; }
.rb-add--RECEPTIONIST:hover:not(:disabled) { background: #dbeafe; }

.roles-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: #be123c;
  margin-top: 0.25rem;
}

.roles-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.roles-warning {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #9ca3af;
  line-height: 1.4;
}
.roles-warning .pi { font-size: 0.8rem; flex-shrink: 0; margin-top: 1px; }

/* ══════════════════════════════════════════════════════════════════════ */
/* ── Delete dialog ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════ */
.del-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 0.25rem 0 0.5rem;
}

.del-toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
}

.del-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #9f1239;
  flex-shrink: 0;
}

.del-toggle-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #111827;
}

.del-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.del-hint .pi { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }

.del-hint--soft {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.del-hint--hard {
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.del-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: #be123c;
}

.del-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  width: 100%;
}

.del-btn-cancel {
  padding: 0.5rem 1.125rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.del-btn-cancel:hover { background: #f9fafb; }

.del-btn-confirm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.125rem;
  border-radius: 8px;
  border: 1px solid #fecdd3;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.del-btn-confirm:hover:not(:disabled) { background: #ffe4e6; border-color: #fda4af; }
.del-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.del-btn-confirm .pi { font-size: 0.8rem; }
</style>
