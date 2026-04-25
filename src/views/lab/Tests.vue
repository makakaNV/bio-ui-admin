<template>
  <!-- ── Search bar ────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field" :class="{ 'search-field--active': searchField === 'specimen' }">
      <i class="pi pi-box search-icon" />
      <input
        v-model="search.specimenId"
        class="search-input"
        placeholder="Найти по ID образца"
        inputmode="numeric"
        @keyup.enter="searchBySpecimenId"
        @input="onSpecimenIdInput"
      />
      <button v-if="searchField === 'specimen'" class="search-clear" @click="clearSearch" title="Сбросить поиск">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field" :class="{ 'search-field--active': searchField === 'uuid' }">
      <i class="pi pi-id-card search-icon" />
      <input
        v-model="search.uuid"
        class="search-input"
        placeholder="Найти по UUID теста"
        @keyup.enter="searchByUuid"
        @input="onUuidInput"
      />
      <button v-if="searchField === 'uuid'" class="search-clear" @click="clearSearch" title="Сбросить поиск">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>

  <!-- ── Search result bar ─────────────────────────────────────────── -->
  <div v-if="searchMode && searchResultMessage" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMessage }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Tests container ───────────────────────────────────────────── -->
  <div class="tests-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка тестов...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="tests.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Тесты не найдены</span>
      </div>

      <div v-else class="test-list">
        <div v-for="group in groupedTests" :key="group.specimenId" class="test-group">

          <!-- Group header -->
          <div class="group-header">
            <i class="pi pi-box group-icon" />
            <span class="group-title">Образец #{{ group.specimenId ?? '—' }}</span>
            <span class="group-count">{{ group.items.length }}&nbsp;{{ pluralTests(group.items.length) }}</span>
            <button
              v-if="!isGroupPending(group)"
              class="btn-enter-results"
              @click="openResultsDialog(group)"
            >
              <i class="pi pi-pencil" />
              {{ isGroupCompleted(group) ? 'Изменить результаты всех' : 'Внести результаты для всех' }}
            </button>
            <button
              v-else
              class="btn-collect"
              @click="goCollect(group.specimenId)"
            >
              <i class="pi pi-arrow-right" />
              Собрать биоматериал
            </button>
          </div>

          <!-- Test cards -->
          <div v-for="t in group.items" :key="t.id" class="test-card">

            <!-- Identity: short UUID -->
            <div class="test-identity">
              <span class="test-uuid" :title="t.id">{{ shortUuid(t.id) }}</span>
            </div>

            <!-- Chips -->
            <div class="test-chips">
              <div class="t-chip">
                <span class="t-chip-label">Образец</span>
                <span class="t-chip-val t-chip-val--link">{{ t.specimenId ?? '—' }}</span>
              </div>
              <div class="t-chip">
                <span class="t-chip-label">Анализ</span>
                <span
                  class="t-chip-val t-chip-val--link"
                  :title="t.analysisName ?? ''"
                  @click.stop="goToAnalysis(t.analysisId)"
                >{{ truncate(t.analysisName) }}</span>
              </div>
              <div class="t-chip">
                <span class="t-chip-label">Результат</span>
                <span class="t-chip-val">{{ t.result ?? '—' }}</span>
              </div>
            </div>

            <!-- Status badge -->
            <span class="test-status" :class="`test-status--${t.status}`">
              {{ TEST_STATUS[t.status]?.label ?? t.status }}
            </span>

            <!-- Timestamps -->
            <div class="test-ts">
              <span><span class="ts-label">Создан</span> {{ formatTs(t.createdAt) }}</span>
              <span><span class="ts-label">Обновлён</span> {{ formatTs(t.updatedAt) }}</span>
              <span><span class="ts-label">Завершён</span> {{ formatTs(t.completedAt) }}</span>
            </div>

          </div><!-- /test-card -->
        </div><!-- /test-group -->
      </div><!-- /test-list -->

      <Paginator
        v-if="!searchMode && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="tests-paginator"
      />
    </template>
  </div>

  <!-- ── Results dialog ───────────────────────────────────────────── -->
  <Dialog
    v-model:visible="rd.visible"
    modal
    :header="`Результаты тестов · Образец #${rd.specimenId}`"
    :style="{ width: '500px' }"
    :draggable="false"
  >
    <div class="rd-body">
      <div
        v-for="t in rd.groupTests"
        :key="t.id"
        class="rd-row"
      >
        <span class="rd-analysis" :title="t.analysisName ?? ''">
          {{ truncate(t.analysisName, 35) }}
        </span>
        <div
          class="rd-input-wrap"
          :class="{ 'rd-input-wrap--error': rd.errors[t.analysisId] }"
        >
          <input
            :value="rd.values[t.analysisId]"
            type="number"
            step="any"
            class="rd-input"
            placeholder="0.00"
            @input="onResultInput(t.analysisId, $event)"
            @blur="validateResult(t.analysisId)"
          />
        </div>
        <span class="rd-error-msg">{{ rd.errors[t.analysisId] }}</span>
      </div>

      <div v-if="rd.apiError" class="rd-api-error">
        <i class="pi pi-exclamation-circle" />
        {{ rd.apiError }}
      </div>
    </div>

    <template #footer>
      <div class="rd-footer">
        <Button
          label="Внести результаты"
          icon="pi pi-check"
          severity="success"
          :loading="rd.loading"
          @click="submitResults"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Button    from 'primevue/button';
import Paginator from 'primevue/paginator';
import TestsService from '@/services/TestsService';

const router = useRouter();

// ── Search ────────────────────────────────────────────────────────
const search = reactive({ specimenId: '', uuid: '' });

// ── List state ────────────────────────────────────────────────────
const tests               = ref([]);
const loading             = ref(false);
const error               = ref(null);
const currentPage         = ref(0);
const pageLimit           = ref(20);
const totalRecords        = ref(0);
const searchField         = ref('');   // 'specimen' | 'uuid' | ''
const searchMode          = computed(() => searchField.value !== '');
const searchResultMessage = ref('');

const TEST_STATUS = {
  PENDING:     { label: 'Ожидает'    },
  READY:       { label: 'Доступен'   },
  IN_PROGRESS: { label: 'В процессе' },
  COMPLETED:   { label: 'Завершён'   },
  CANCELLED:   { label: 'Отменён'    },
};

function isGroupPending(group) {
  return group.items.every(t => t.status === 'PENDING');
}

function isGroupCompleted(group) {
  return group.items.some(t => t.status === 'COMPLETED');
}

function goCollect(specimenId) {
  router.push({ name: 'Samples', query: { specimenId } });
}

function goToAnalysis(analysisId) {
  if (analysisId) router.push({ name: 'Analyses', query: { id: analysisId } });
}

// ── Grouping by specimenId ────────────────────────────────────────
const groupedTests = computed(() => {
  const map = new Map();
  for (const t of tests.value) {
    const key = t.specimenId ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()].map(([specimenId, items]) => ({ specimenId, items }));
});

function pluralTests(n) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'тестов';
  if (mod10 === 1)                   return 'тест';
  if (mod10 >= 2 && mod10 <= 4)     return 'теста';
  return 'тестов';
}

// ── Fetch all ─────────────────────────────────────────────────────
async function fetchTests(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res     = await TestsService.getAll(page, limit);
    const payload = res.data?.payload;
    tests.value        = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить тесты';
  } finally {
    loading.value = false;
  }
}

function onPage(event) { fetchTests(event.page, event.rows); }

// ── Search functions ──────────────────────────────────────────────
async function searchBySpecimenId() {
  const raw = search.specimenId.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res = await TestsService.getBySpecimenId(Number(raw));
    tests.value               = res.data?.payload?.content ?? [];
    searchResultMessage.value = `Образец #${raw}: ${tests.value.length} ${pluralTests(tests.value.length)}`;
    searchField.value         = 'specimen';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти тесты';
  } finally {
    loading.value = false;
  }
}

async function searchByUuid() {
  const raw = search.uuid.trim();
  if (!raw) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await TestsService.getById(raw);
    const item = res.data?.payload;
    tests.value               = item ? [item] : [];
    searchResultMessage.value = item ? `Тест ${raw.slice(0, 8)}…` : 'Тест не найден';
    searchField.value         = 'uuid';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти тест';
  } finally {
    loading.value = false;
  }
}

function onSpecimenIdInput() { if (!search.specimenId.trim()) clearSearch(); }
function onUuidInput()        { if (!search.uuid.trim())       clearSearch(); }

function clearSearch() {
  searchField.value         = '';
  searchResultMessage.value = '';
  search.specimenId         = '';
  search.uuid               = '';
  fetchTests(0, pageLimit.value);
}

// ── Results dialog ────────────────────────────────────────────────
const rd = reactive({
  visible:    false,
  loading:    false,
  apiError:   '',
  specimenId: null,
  groupTests: [],
  values:     {},   // { [analysisId]: string }
  errors:     {},   // { [analysisId]: string }
});

function openResultsDialog(group) {
  rd.specimenId = group.specimenId;
  rd.groupTests = group.items;
  rd.values     = Object.fromEntries(group.items.map(t => [t.analysisId, '']));
  rd.errors     = Object.fromEntries(group.items.map(t => [t.analysisId, '']));
  rd.apiError   = '';
  rd.loading    = false;
  rd.visible    = true;
}

function onResultInput(analysisId, event) {
  rd.values[analysisId] = event.target.value;
  if (rd.errors[analysisId]) validateResult(analysisId);
}

function validateResult(analysisId) {
  const val = rd.values[analysisId];
  if (val === '' || val == null) {
    rd.errors[analysisId] = 'Обязательное поле';
  } else if (isNaN(Number(val))) {
    rd.errors[analysisId] = 'Введите число';
  } else {
    rd.errors[analysisId] = '';
  }
}

function validateAll() {
  rd.groupTests.forEach(t => validateResult(t.analysisId));
  return Object.values(rd.errors).every(e => !e);
}

async function submitResults() {
  if (!validateAll()) return;
  rd.loading  = true;
  rd.apiError = '';
  try {
    const results = Object.fromEntries(
      Object.entries(rd.values).map(([id, val]) => [id, String(val)])
    );
    const res     = await TestsService.setResults(rd.specimenId, { results });
    const updated = res.data?.payload ?? [];
    if (updated.length) {
      updated.forEach(upd => {
        const idx = tests.value.findIndex(t => t.id === upd.id);
        if (idx !== -1) tests.value[idx] = upd;
      });
    }
    rd.visible = false;
  } catch (err) {
    rd.apiError = err.response?.data?.message ?? 'Не удалось внести результаты';
  } finally {
    rd.loading = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────
const truncate = (str, max = 30) =>
  str == null ? '—' : str.length > max ? str.slice(0, max) + '…' : str;

function shortUuid(uuid) {
  if (!uuid) return '—';
  return uuid.slice(0, 8) + '…';
}

function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

onMounted(() => fetchTests(0));
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
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-field:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}

.search-icon { color: #9ca3af; font-size: 0.875rem; flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.625rem 0;
  font-size: 0.875rem;
  background: transparent;
  color: #111827;
  font-family: inherit;
}
.search-input::placeholder { color: #9ca3af; }

.search-field--active {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.08);
}

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

/* ── Tests container ──────────────────────────────────────────────── */
.tests-wrap {
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

/* ── Test list ────────────────────────────────────────────────────── */
.test-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.875rem;
}

/* ── Test group ───────────────────────────────────────────────────── */
.test-group {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e9ebef;
}

.group-icon { font-size: 0.75rem; color: #9ca3af; }

.group-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.group-count {
  font-size: 0.75rem;
  color: #9ca3af;
}

.btn-enter-results {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.btn-enter-results:hover { background: #dcfce7; border-color: #86efac; }
.btn-enter-results .pi { font-size: 0.75rem; }

.btn-collect {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  background: #fef9c3;
  color: #854d0e;
  border: 1px solid #fde047;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.btn-collect:hover { background: #fef08a; border-color: #facc15; }
.btn-collect .pi { font-size: 0.75rem; }

/* ── Test card ────────────────────────────────────────────────────── */
.test-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.125rem;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
}
.test-group .test-card:last-child { border-bottom: none; }
.test-card:hover { background: #fafafa; }

.test-identity {
  min-width: 110px;
  flex-shrink: 0;
}

.test-uuid {
  font-family: monospace;
  font-size: 0.85rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.175rem 0.55rem;
  border-radius: 4px;
  cursor: default;
}

.test-chips {
  flex: 1;
  display: flex;
  gap: 1.5rem;
}

.t-chip { display: flex; flex-direction: column; gap: 2px; }

.t-chip-label {
  font-size: 0.6375rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.t-chip-val {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.t-chip-val--link { color: #9f1239; cursor: pointer; transition: color 0.12s; }
.t-chip-val--link:hover { color: #be123c; text-decoration: underline; text-underline-offset: 2px; }

.test-status {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.775rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 100px;
  justify-content: center;
}

.test-status--PENDING     { background: #fef9c3; color: #854d0e; }
.test-status--READY       { background: #dbeafe; color: #1d4ed8; }
.test-status--IN_PROGRESS { background: #ffedd5; color: #c2410c; }
.test-status--COMPLETED   { background: #dcfce7; color: #15803d; }
.test-status--CANCELLED   { background: #f3f4f6; color: #6b7280; }

.test-ts {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
  flex-shrink: 0;
  min-width: 140px;
}

.ts-label { color: #d1d5db; font-weight: 500; margin-right: 0.25rem; }

/* ── Paginator ────────────────────────────────────────────────────── */
.tests-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Results dialog ───────────────────────────────────────────────── */
.rd-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.25rem 0 0.5rem;
}

.rd-row { display: flex; align-items: center; gap: 0.875rem; }

.rd-analysis {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.rd-input-wrap {
  width: 130px;
  flex-shrink: 0;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.rd-input-wrap:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}

.rd-input-wrap--error { border-color: #fca5a5; }

.rd-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0.4rem 0.625rem;
  font-size: 0.875rem;
  font-family: monospace;
  background: transparent;
  color: #111827;
  box-sizing: border-box;
}
.rd-input::placeholder { color: #d1d5db; }

.rd-input::-webkit-inner-spin-button,
.rd-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.rd-input[type=number] { -moz-appearance: textfield; }

.rd-error-msg {
  font-size: 0.72rem;
  color: #f43f5e;
  min-width: 100px;
  flex-shrink: 0;
}

.rd-api-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #be123c;
  margin-top: 0.25rem;
}

.rd-footer { display: flex; justify-content: flex-end; width: 100%; }
</style>
