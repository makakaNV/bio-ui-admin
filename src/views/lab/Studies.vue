<template>
  <!-- ── Search bar ────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field search-field--id" :class="{ 'search-field--active': searchMode === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="searchId"
        class="search-input"
        placeholder="Поиск по ID исследования"
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
        placeholder="Поиск по названию, коду или описанию..."
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

  <!-- ── Group tabs ────────────────────────────────────────────────── -->
  <div class="group-tabs">
    <button
      class="group-tab"
      :class="{ 'group-tab--active': selectedGroup === null }"
      @click="selectGroup(null)"
    >Все</button>
    <button
      v-for="g in groups"
      :key="g.id"
      class="group-tab"
      :class="{ 'group-tab--active': selectedGroup?.id === g.id }"
      @click="selectGroup(g)"
    >{{ g.name }}</button>
    <button class="group-info-btn" @click="router.push({ name: 'StudiesGroups' })" title="Просмотр всех групп">
      <i class="pi pi-arrow-right" />
    </button>
  </div>

  <!-- ── Content ────────────────────────────────────────────────────── -->
  <div class="panels-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка исследований...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="filteredPanels.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Исследования не найдены</span>
      </div>

      <div v-else class="panels-grid">
        <div
          v-for="p in filteredPanels"
          :key="p.id"
          class="panel-card"
          @click="openDetail(p)"
        >
          <div class="panel-card-top">
            <span class="panel-name">{{ p.name }}</span>
            <span class="panel-code">{{ p.code }}</span>
          </div>
          <div v-if="p.analyses?.length" class="panel-analyses">
            <span
              v-for="a in p.analyses"
              :key="a.id"
              class="analysis-chip"
              @click.stop="goToAnalysis(a.id)"
              :title="a.name"
            >{{ a.code }}</span>
          </div>
          <div v-else class="panel-no-analyses">Анализы не указаны</div>
        </div>
      </div>

      <Paginator
        v-if="searchMode !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="panels-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detailVisible"
    modal
    :header="selectedPanel?.name ?? 'Исследование'"
    :style="{ width: '560px' }"
    :draggable="false"
  >
    <template v-if="selectedPanel">
      <div class="detail-body">
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-hashtag" />ID</span>
          <span class="detail-val">{{ selectedPanel.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-tag" />Код</span>
          <span class="detail-val detail-val--mono">{{ selectedPanel.code }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-folder" />Группа</span>
          <span class="detail-val">{{ selectedPanel.groupCode ?? '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-wallet" />Стоимость</span>
          <span class="detail-val">{{ formatPrice(selectedPanel.price) }}</span>
        </div>
        <div v-if="selectedPanel.discountPercent" class="detail-row">
          <span class="detail-key"><i class="pi pi-percentage" />Скидка</span>
          <span class="detail-val detail-val--discount">{{ selectedPanel.discountPercent }}%</span>
        </div>
        <div v-if="selectedPanel.description" class="detail-row detail-row--desc">
          <span class="detail-key detail-key--top"><i class="pi pi-align-left" />Описание</span>
          <span class="detail-val detail-val--desc">{{ selectedPanel.description }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-calendar-plus" />Создан</span>
          <span class="detail-val">{{ formatTs(selectedPanel.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-clock" />Обновлён</span>
          <span class="detail-val">{{ formatTs(selectedPanel.updatedAt) }}</span>
        </div>

        <!-- Analyses block -->
        <div v-if="selectedPanel.analyses?.length" class="detail-analyses-block">
          <div class="detail-analyses-label">
            <i class="pi pi-chart-bar" />
            Анализы ({{ selectedPanel.analyses.length }})
          </div>
          <div class="detail-analyses-chips">
            <span
              v-for="a in selectedPanel.analyses"
              :key="a.id"
              class="detail-analysis-chip"
              :title="a.name"
              @click="goToAnalysis(a.id)"
            >{{ a.code }}</span>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import PanelsService from '@/services/PanelsService';

const route  = useRoute();
const router = useRouter();

// ── State ──────────────────────────────────────────────────────────
const panels       = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(20);
const totalRecords = ref(0);

const groups       = ref([]);
const selectedGroup = ref(null);  // null = "Все"

const searchId            = ref('');
const searchText          = ref('');
const searchMode          = ref('');  // 'id' | ''
const searchResultMessage = ref('');

const selectedPanel = ref(null);
const detailVisible = ref(false);

// ── Text filter (client-side) ──────────────────────────────────────
const filteredPanels = computed(() => {
  if (!searchText.value.trim()) return panels.value;
  const q = searchText.value.toLowerCase();
  return panels.value.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.code?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q)
  );
});

// ── Fetch panels ───────────────────────────────────────────────────
async function fetchPanels(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res = selectedGroup.value
      ? await PanelsService.getByGroupCode(selectedGroup.value.code, page, limit)
      : await PanelsService.getAll(page, limit);
    const payload      = res.data?.payload;
    panels.value       = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить исследования';
  } finally {
    loading.value = false;
  }
}

// ── Fetch groups ───────────────────────────────────────────────────
async function fetchGroups() {
  try {
    const res    = await PanelsService.getAllGroups(0, 100);
    groups.value = res.data?.payload?.content ?? [];
  } catch { /* некритично */ }
}

// ── Group selection ────────────────────────────────────────────────
function selectGroup(group) {
  searchMode.value          = '';
  searchResultMessage.value = '';
  searchId.value            = '';
  searchText.value          = '';
  selectedGroup.value       = group;
  fetchPanels(0);
}

// ── Search by ID ───────────────────────────────────────────────────
async function doSearchById() {
  const raw = searchId.value.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await PanelsService.getById(Number(raw));
    const item = res.data?.payload;
    panels.value              = item ? [item] : [];
    searchResultMessage.value = item ? `Исследование #${raw}: ${item.name}` : 'Не найдено';
    searchMode.value          = 'id';
  } catch {
    panels.value              = [];
    searchResultMessage.value = 'Исследование не найдено';
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
  fetchPanels(0);
}

// ── Detail dialog ──────────────────────────────────────────────────
function openDetail(panel) {
  selectedPanel.value = panel;
  detailVisible.value = true;
}

// ── Navigation ─────────────────────────────────────────────────────
function goToAnalysis(id) {
  if (id) router.push({ name: 'Analyses', query: { id } });
}

// ── Pagination ─────────────────────────────────────────────────────
function onPage(event) {
  fetchPanels(event.page, event.rows);
}

// ── Helpers ────────────────────────────────────────────────────────
function formatPrice(price) {
  if (price == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0
  }).format(price);
}

function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

// ── Mount ──────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchGroups();
  const qId = route.query.id;
  if (qId && !isNaN(Number(qId))) {
    searchId.value = String(qId);
    await doSearchById();
    if (panels.value.length === 1) openDetail(panels.value[0]);
  } else {
    fetchPanels(0);
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

/* ── Group tabs ───────────────────────────────────────────────────── */
.group-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 0.875rem;
  margin-bottom: 0.875rem;
  border-bottom: 1px solid #f3f4f6;
}

.group-tab {
  padding: 0.35rem 0.875rem;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.group-tab:hover         { border-color: #9f1239; color: #9f1239; }
.group-tab--active       { background: #9f1239; color: #fff; border-color: #9f1239; }
.group-tab--active:hover { background: #881337; border-color: #881337; }

.group-info-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.group-info-btn:hover { border-color: #9f1239; color: #9f1239; background: #fff1f2; }
.group-info-btn .pi   { font-size: 0.75rem; }

/* ── Content wrapper ──────────────────────────────────────────────── */
.panels-wrap {
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

/* ── Panels grid ──────────────────────────────────────────────────── */
.panels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 0.875rem;
  padding: 1rem;
}

/* ── Panel card ───────────────────────────────────────────────────── */
.panel-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1.125rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  background: #fafafa;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.panel-card:hover {
  border-color: #9f1239;
  box-shadow: 0 3px 12px rgba(159,18,57,.09);
  background: #fff;
}

.panel-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-code {
  font-family: monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Analysis chips row */
.panel-analyses {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  align-items: center;
}

.analysis-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.175rem 0.5rem;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: monospace;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.analysis-chip:hover { background: #dbeafe; border-color: #93c5fd; }

.panel-no-analyses {
  font-size: 0.8rem;
  color: #9ca3af;
  font-style: italic;
}

/* ── Paginator ────────────────────────────────────────────────────── */
.panels-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Detail dialog ────────────────────────────────────────────────── */
.detail-body {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0;
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
.detail-row--desc      { align-items: flex-start; }

.detail-key {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8375rem;
  color: #6b7280;
  flex-shrink: 0;
  white-space: nowrap;
}
.detail-key--top { align-items: flex-start; padding-top: 2px; }
.detail-key .pi  { font-size: 0.8rem; color: #9ca3af; }

.detail-val {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  text-align: right;
}
.detail-val--mono     { font-family: monospace; }
.detail-val--discount { color: #15803d; }
.detail-val--desc {
  font-size: 0.875rem;
  font-weight: 400;
  color: #374151;
  text-align: right;
  line-height: 1.5;
}

/* ── Analyses block inside dialog ─────────────────────────────────── */
.detail-analyses-block {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.detail-analyses-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #1d4ed8;
}
.detail-analyses-label .pi { font-size: 0.75rem; }

.detail-analyses-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail-analysis-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.detail-analysis-chip:hover { background: #bfdbfe; border-color: #60a5fa; }
</style>
