<template>
  <!-- ── Search bar ────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field search-field--id" :class="{ 'search-field--active': searchMode === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="searchId"
        class="search-input"
        placeholder="Поиск по ID анализа"
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

  <!-- ── Category tabs ─────────────────────────────────────────────── -->
  <div class="category-tabs">
    <button
      class="cat-tab"
      :class="{ 'cat-tab--active': selectedCategory === null }"
      @click="selectCategory(null)"
    >Все</button>
    <button
      v-for="cat in categories"
      :key="cat.id"
      class="cat-tab"
      :class="{ 'cat-tab--active': selectedCategory?.id === cat.id }"
      @click="selectCategory(cat)"
    >{{ cat.name }}</button>
    <button class="cat-info-btn" @click="router.push({ name: 'AnalysesCategories' })" title="Просмотр всех категорий">
      <i class="pi pi-arrow-right" />
    </button>
  </div>

  <!-- ── Content ────────────────────────────────────────────────────── -->
  <div class="analyses-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка анализов...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="filteredAnalyses.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Анализы не найдены</span>
      </div>

      <div v-else class="analyses-grid">
        <div
          v-for="a in filteredAnalyses"
          :key="a.id"
          class="analysis-card"
          @click="openDetail(a)"
        >
          <div class="card-header">
            <span class="card-code">{{ a.code }}</span>
            <span v-if="a.categoryCode && selectedCategory === null" class="card-category">{{ a.categoryCode }}</span>
          </div>
          <div class="card-name">{{ a.name }}</div>
          <div v-if="a.description" class="card-desc">{{ truncate(a.description, 90) }}</div>
        </div>
      </div>

      <Paginator
        v-if="searchMode !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="analyses-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detailVisible"
    modal
    :header="selectedAnalysis?.name ?? 'Анализ'"
    :style="{ width: '520px' }"
    :draggable="false"
  >
    <template v-if="selectedAnalysis">
      <div class="detail-body">
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-hashtag" />ID</span>
          <span class="detail-val">{{ selectedAnalysis.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-tag" />Код</span>
          <span class="detail-val detail-val--mono">{{ selectedAnalysis.code }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-folder" />Категория</span>
          <span class="detail-val">{{ selectedAnalysis.categoryCode ?? '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-wallet" />Стоимость</span>
          <span class="detail-val detail-val--price">{{ formatPrice(selectedAnalysis.price) }}</span>
        </div>

        <!-- Biomaterials block -->
        <div class="detail-bio-block">
          <div class="detail-bio-label">
            <i class="pi pi-heart" />
            Доступные биоматериалы
          </div>
          <div v-if="biomaterialsLoading" class="detail-bio-loading">
            <i class="pi pi-spin pi-spinner" />
            <span>Загрузка...</span>
          </div>
          <div v-else-if="biomaterials.length === 0" class="detail-bio-empty">Нет данных</div>
          <div v-else class="detail-bio-chips">
            <span
              v-for="code in biomaterials"
              :key="code"
              class="bio-chip"
              @click="goToBiomaterial(code)"
            >{{ code }}</span>
          </div>
        </div>
        <div v-if="selectedAnalysis.description" class="detail-row detail-row--desc">
          <span class="detail-key detail-key--top"><i class="pi pi-align-left" />Описание</span>
          <span class="detail-val detail-val--desc">{{ selectedAnalysis.description }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-calendar-plus" />Создан</span>
          <span class="detail-val">{{ formatTs(selectedAnalysis.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-clock" />Обновлён</span>
          <span class="detail-val">{{ formatTs(selectedAnalysis.updatedAt) }}</span>
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
import AnalysesService from '@/services/AnalysesService';

const route  = useRoute();
const router = useRouter();

// ── State ──────────────────────────────────────────────────────────
const analyses     = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(20);
const totalRecords = ref(0);

const categories       = ref([]);
const selectedCategory = ref(null);   // null = "Все"

const searchId            = ref('');
const searchText          = ref('');
const searchMode          = ref('');  // 'id' | ''
const searchResultMessage = ref('');

const selectedAnalysis     = ref(null);
const detailVisible        = ref(false);
const biomaterials         = ref([]);
const biomaterialsLoading  = ref(false);

// ── Text filter (client-side) ──────────────────────────────────────
const filteredAnalyses = computed(() => {
  if (!searchText.value.trim()) return analyses.value;
  const q = searchText.value.toLowerCase();
  return analyses.value.filter(a =>
    a.name?.toLowerCase().includes(q) ||
    a.code?.toLowerCase().includes(q) ||
    a.description?.toLowerCase().includes(q)
  );
});

// ── Fetch analyses ─────────────────────────────────────────────────
async function fetchAnalyses(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res = selectedCategory.value
      ? await AnalysesService.getByCategoryCode(selectedCategory.value.code, page, limit)
      : await AnalysesService.getAll(page, limit);
    const payload      = res.data?.payload;
    analyses.value     = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить анализы';
  } finally {
    loading.value = false;
  }
}

// ── Fetch categories ───────────────────────────────────────────────
async function fetchCategories() {
  try {
    const res        = await AnalysesService.getAllCategories(0, 100);
    categories.value = res.data?.payload?.content ?? [];
  } catch { /* некритично */ }
}

// ── Category selection ─────────────────────────────────────────────
function selectCategory(cat) {
  searchMode.value          = '';
  searchResultMessage.value = '';
  searchId.value            = '';
  searchText.value          = '';
  selectedCategory.value    = cat;
  fetchAnalyses(0);
}

// ── Search by ID ───────────────────────────────────────────────────
async function doSearchById() {
  const raw = searchId.value.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await AnalysesService.getById(Number(raw));
    const item = res.data?.payload;
    analyses.value            = item ? [item] : [];
    searchResultMessage.value = item ? `Анализ #${raw}: ${item.name}` : 'Анализ не найден';
    searchMode.value          = 'id';
  } catch (err) {
    analyses.value            = [];
    searchResultMessage.value = 'Анализ не найден';
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
  fetchAnalyses(0);
}

// ── Detail dialog ──────────────────────────────────────────────────
async function openDetail(analysis) {
  selectedAnalysis.value = analysis;
  biomaterials.value     = [];
  detailVisible.value    = true;
  biomaterialsLoading.value = true;
  try {
    const res          = await AnalysesService.getAvailableBiomaterials(analysis.id);
    biomaterials.value = res.data?.payload ?? [];
  } catch { /* некритично */ }
  finally { biomaterialsLoading.value = false; }
}

function goToBiomaterial(code) {
  router.push({ name: 'Biomaterials', query: { code } });
}

// ── Pagination ─────────────────────────────────────────────────────
function onPage(event) {
  fetchAnalyses(event.page, event.rows);
}

// ── Helpers ────────────────────────────────────────────────────────
const truncate = (str, max = 60) =>
  str == null ? '' : str.length > max ? str.slice(0, max) + '…' : str;

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
  await fetchCategories();
  const qId = route.query.id;
  if (qId && !isNaN(Number(qId))) {
    searchId.value = String(qId);
    await doSearchById();
    if (analyses.value.length === 1) openDetail(analyses.value[0]);
  } else {
    fetchAnalyses(0);
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

/* ── Category tabs ────────────────────────────────────────────────── */
.category-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-bottom: 0.875rem;
  margin-bottom: 0.875rem;
  border-bottom: 1px solid #f3f4f6;
}

.cat-tab {
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
.cat-tab:hover          { border-color: #9f1239; color: #9f1239; }
.cat-tab--active        { background: #9f1239; color: #fff; border-color: #9f1239; }
.cat-tab--active:hover  { background: #881337; border-color: #881337; }

.cat-info-btn {
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
.cat-info-btn:hover { border-color: #9f1239; color: #9f1239; background: #fff1f2; }
.cat-info-btn .pi   { font-size: 0.75rem; }

/* ── Content wrapper ──────────────────────────────────────────────── */
.analyses-wrap {
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
.state-msg .pi     { font-size: 2rem; }
.state-msg--error  { color: #be123c; }

/* ── Card grid ────────────────────────────────────────────────────── */
.analyses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
  gap: 0.875rem;
  padding: 1rem;
}

/* ── Analysis card ────────────────────────────────────────────────── */
.analysis-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem 1.125rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  background: #fafafa;
}
.analysis-card:hover {
  border-color: #9f1239;
  box-shadow: 0 4px 14px rgba(159,18,57,.1);
  transform: translateY(-2px);
  background: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-code {
  font-family: monospace;
  font-size: 0.875rem;
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-weight: 700;
}

.card-category {
  margin-left: auto;
  font-size: 0.7rem;
  background: #fff1f2;
  color: #9f1239;
  border: 1px solid #fecdd3;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.card-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
}

.card-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.45;
  flex: 1;
}


/* ── Paginator ────────────────────────────────────────────────────── */
.analyses-paginator {
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
.detail-row:last-child       { border-bottom: none; }
.detail-row--desc            { align-items: flex-start; }

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
.detail-val--mono  { font-family: monospace; font-size: 0.875rem; }
.detail-val--price { color: #111827; }
.detail-val--desc  {
  font-size: 0.875rem;
  font-weight: 400;
  color: #374151;
  text-align: right;
  line-height: 1.5;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ── Biomaterials block ───────────────────────────────────────────── */
.detail-bio-block {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.detail-bio-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #0f766e;
}
.detail-bio-label .pi { font-size: 0.75rem; }

.detail-bio-loading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #0f766e;
}

.detail-bio-empty {
  font-size: 0.8125rem;
  color: #6b7280;
}

.detail-bio-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.bio-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: #ccfbf1;
  color: #0f766e;
  border: 1px solid #5eead4;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.bio-chip:hover {
  background: #99f6e4;
  border-color: #2dd4bf;
}
</style>
