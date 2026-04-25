<template>
  <!-- ── Search bar ────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field search-field--id" :class="{ 'search-field--active': searchMode === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="searchId"
        class="search-input"
        placeholder="Поиск по ID"
        inputmode="numeric"
        @keyup.enter="doSearchById"
        @input="onIdInput"
      />
      <button v-if="searchMode === 'id'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field search-field--text">
      <i class="pi pi-search search-icon" />
      <input
        v-model="searchText"
        class="search-input"
        placeholder="Поиск по названию, типу или антикоагулянту..."
      />
      <button v-if="searchText" class="search-clear" @click="searchText = ''" title="Очистить">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>

  <!-- ── Search result bar ─────────────────────────────────────────── -->
  <div v-if="searchMode === 'id' && searchResultMessage" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMessage }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Content ────────────────────────────────────────────────────── -->
  <div class="containers-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка контейнеров...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="filteredContainers.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Контейнеры не найдены</span>
      </div>

      <div v-else class="containers-grid">
        <div
          v-for="c in filteredContainers"
          :key="c.id"
          class="container-card"
          :style="{ '--accent': TYPE_COLORS[c.containerType] ?? '#9ca3af' }"
          @click="openDetail(c)"
        >
          <div class="card-accent" />
          <div class="card-body">
            <span class="card-name">{{ c.name }}</span>
            <span class="card-type">{{ TYPE_LABELS[c.containerType] ?? c.containerType }}</span>
            <span
              v-if="c.anticoagulantType"
              class="card-antikoa"
              :class="`antikoa--${c.anticoagulantType}`"
            >{{ c.anticoagulantType }}</span>
            <span v-else class="card-antikoa card-antikoa--none">—</span>
          </div>
          <i class="pi pi-chevron-right card-chevron" />
        </div>
      </div>

      <Paginator
        v-if="searchMode !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="containers-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detailVisible"
    modal
    :header="selectedContainer?.name ?? 'Контейнер'"
    :style="{ width: '480px' }"
    :draggable="false"
  >
    <template v-if="selectedContainer">
      <div class="detail-body">
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-hashtag" />ID</span>
          <span class="detail-val">{{ selectedContainer.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-tag" />Название</span>
          <span class="detail-val">{{ selectedContainer.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-inbox" />Тип контейнера</span>
          <span class="detail-val">{{ TYPE_LABELS[selectedContainer.containerType] ?? selectedContainer.containerType }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-shield" />Антикоагулянт</span>
          <span class="detail-val">
            <span
              v-if="selectedContainer.anticoagulantType"
              class="card-antikoa"
              :class="`antikoa--${selectedContainer.anticoagulantType}`"
            >{{ selectedContainer.anticoagulantType }}</span>
            <span v-else class="detail-val-muted">Не указан</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-calendar-plus" />Создан</span>
          <span class="detail-val">{{ formatTs(selectedContainer.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-clock" />Обновлён</span>
          <span class="detail-val">{{ formatTs(selectedContainer.updatedAt) }}</span>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import ContainersService from '@/services/ContainersService';

const route = useRoute();

// ── Enum labels & colors ───────────────────────────────────────────
const TYPE_LABELS = {
  VACUTAINER_RED:   'Вакутайнер красный',
  VACUTAINER_GREEN: 'Вакутайнер зелёный',
  VACUTAINER_BLUE:  'Вакутайнер синий',
  URINE_CUP:        'Стакан для мочи',
};

const TYPE_COLORS = {
  VACUTAINER_RED:   '#ef4444',
  VACUTAINER_GREEN: '#22c55e',
  VACUTAINER_BLUE:  '#3b82f6',
  URINE_CUP:        '#f59e0b',
};

// ── State ──────────────────────────────────────────────────────────
const containers   = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(20);
const totalRecords = ref(0);

const searchId            = ref('');
const searchText          = ref('');
const searchMode          = ref('');  // 'id' | ''
const searchResultMessage = ref('');

const selectedContainer = ref(null);
const detailVisible     = ref(false);

// ── Text filter (client-side) ──────────────────────────────────────
const filteredContainers = computed(() => {
  if (!searchText.value.trim()) return containers.value;
  const q = searchText.value.toLowerCase();
  return containers.value.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.containerType?.toLowerCase().includes(q) ||
    TYPE_LABELS[c.containerType]?.toLowerCase().includes(q) ||
    c.anticoagulantType?.toLowerCase().includes(q)
  );
});

// ── Fetch all ─────────────────────────────────────────────────────
async function fetchContainers(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res          = await ContainersService.getAll(page, limit);
    const payload      = res.data?.payload;
    containers.value   = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить контейнеры';
  } finally {
    loading.value = false;
  }
}

// ── Search by ID ───────────────────────────────────────────────────
async function doSearchById() {
  const raw = searchId.value.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await ContainersService.getById(Number(raw));
    const item = res.data?.payload;
    containers.value          = item ? [item] : [];
    searchResultMessage.value = item ? `Контейнер #${raw}: ${item.name}` : 'Не найден';
    searchMode.value          = 'id';
  } catch {
    containers.value          = [];
    searchResultMessage.value = 'Контейнер не найден';
    searchMode.value          = 'id';
  } finally {
    loading.value = false;
  }
}

function onIdInput() {
  if (!searchId.value.trim()) clearSearch();
}

function clearSearch() {
  searchMode.value          = '';
  searchResultMessage.value = '';
  searchId.value            = '';
  fetchContainers(0);
}

// ── Detail dialog ──────────────────────────────────────────────────
function openDetail(container) {
  selectedContainer.value = container;
  detailVisible.value     = true;
}

// ── Pagination ─────────────────────────────────────────────────────
function onPage(event) {
  fetchContainers(event.page, event.rows);
}

// ── Helpers ────────────────────────────────────────────────────────
function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

// ── Mount ──────────────────────────────────────────────────────────
onMounted(async () => {
  const qId = route.query.id;
  if (qId && !isNaN(Number(qId))) {
    searchId.value = String(qId);
    await doSearchById();
    if (containers.value.length === 1) openDetail(containers.value[0]);
  } else {
    fetchContainers(0);
  }
});
</script>

<style scoped>
/* ── Search bar ───────────────────────────────────────────────────── */
.search-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 1rem;
  height: 48px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-field--id   { flex: 1; }
.search-field--text { flex: 2; }

.search-field:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}

.search-field--active {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.08);
}

.search-icon { color: #9ca3af; font-size: 0.9375rem; flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9375rem;
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
  flex-shrink: 0;
}
.search-clear:hover { color: #be123c; }
.search-clear .pi   { font-size: 0.75rem; }

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
  margin-bottom: 0.75rem;
}
.search-result-bar .pi { flex-shrink: 0; }

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
.search-result-clear:hover { color: #9f1239; }

/* ── Content wrapper ──────────────────────────────────────────────── */
.containers-wrap {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  min-height: 200px;
  overflow: hidden;
}

.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 3.5rem 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}
.state-msg .pi    { font-size: 2rem; }
.state-msg--error { color: #be123c; }

/* ── Card grid ────────────────────────────────────────────────────── */
.containers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.625rem;
  padding: 0.875rem;
}

/* ── Container card ───────────────────────────────────────────────── */
.container-card {
  display: flex;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fafafa;
}
.container-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 10px rgba(0,0,0,.07);
  background: #fff;
}

/* Colored left strip */
.card-accent {
  width: 5px;
  align-self: stretch;
  background: var(--accent);
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 0.875rem;
  min-width: 0;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
  flex-shrink: 0;
}

.card-type {
  font-size: 0.8125rem;
  color: #6b7280;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Anticoagulant badge ──────────────────────────────────────────── */
.card-antikoa {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.card-antikoa--none { color: #9ca3af; padding: 0; background: none; }

.antikoa--EDTA    { background: #f3e8ff; color: #7e22ce; }
.antikoa--CITRATE { background: #dbeafe; color: #1d4ed8; }
.antikoa--HEPARIN { background: #dcfce7; color: #15803d; }

.card-chevron {
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
  margin-right: 0.75rem;
}

/* ── Paginator ────────────────────────────────────────────────────── */
.containers-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Detail dialog ────────────────────────────────────────────────── */
.detail-body {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0 0.25rem;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f9fafb;
  gap: 1rem;
}
.detail-row:last-child { border-bottom: none; }

.detail-key {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8375rem;
  color: #6b7280;
  flex-shrink: 0;
  white-space: nowrap;
}
.detail-key .pi { font-size: 0.8rem; color: #9ca3af; }

.detail-val {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  text-align: right;
}

.detail-val-muted {
  font-size: 0.875rem;
  color: #9ca3af;
}
</style>
