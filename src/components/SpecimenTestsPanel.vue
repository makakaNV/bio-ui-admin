<template>
  <!-- Toggle bar -->
  <div class="tests-toggle-bar" @click="toggle">
    <i class="pi pi-flask toggle-icon" />
    <span class="toggle-label">Тесты</span>
    <div class="toggle-spacer" />
    <i :class="expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="toggle-chevron" />
  </div>

  <!-- Expandable area -->
  <div v-if="expanded" class="tests-area">

    <!-- Loading -->
    <div v-if="loading" class="tests-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Загрузка тестов...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="tests-state tests-state--error">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="tests.length === 0" class="tests-state">
      <i class="pi pi-inbox" />
      <span>Тестов нет</span>
    </div>

    <template v-else>
      <!-- Tests header with action -->
      <div class="tests-header">
        <span class="tests-header-label">{{ tests.length }} {{ pluralTests(tests.length) }}</span>
        <button class="btn-enter-results" @click.stop="openResultsDialog">
          <i class="pi pi-pencil" />
          {{ props.tested ? 'Изменить результаты всех' : 'Внести результаты для всех' }}
        </button>
      </div>

      <!-- Test cards -->
      <div class="test-list">
        <div v-for="t in tests" :key="t.id" class="test-card">

          <!-- Left: id + links -->
          <div class="test-identity">
            <span class="test-uuid" :title="t.id">{{ shortUuid(t.id) }}</span>
          </div>

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

          <!-- Status (non-clickable) -->
          <span class="test-status" :class="`test-status--${t.status}`">
            {{ TEST_STATUS[t.status]?.label ?? t.status }}
          </span>

          <!-- Timestamps column -->
          <div class="test-ts">
            <span><span class="ts-label">Создан</span> {{ formatTs(t.createdAt) }}</span>
            <span><span class="ts-label">Завершён</span> {{ formatTs(t.completedAt) }}</span>
          </div>

        </div>
      </div>
    </template>
  </div>
  <!-- ── Results dialog ──────────────────────────────────────────── -->
  <Dialog
    v-model:visible="rd.visible"
    modal
    :header="`Результаты тестов · Образец #${specimenId}`"
    :style="{ width: '500px' }"
    :draggable="false"
  >
    <div class="rd-body">
      <div
        v-for="t in tests"
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
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import Dialog  from 'primevue/dialog';
import Button  from 'primevue/button';
import TestsService from '@/services/TestsService';

const router = useRouter();

const props = defineProps({
  specimenId: { type: Number, required: true },
  tested:     { type: Boolean, default: false }
});

// ── State ─────────────────────────────────────────────────────────
const expanded = ref(false);
const loaded   = ref(false);
const loading  = ref(false);
const tests    = ref([]);
const error    = ref(null);

// ── Status metadata ───────────────────────────────────────────────
const TEST_STATUS = {
  PENDING:     { label: 'Ожидает'    },
  READY:       { label: 'Доступен'   },
  IN_PROGRESS: { label: 'В процессе' },
  COMPLETED:   { label: 'Завершён'   },
  CANCELLED:   { label: 'Отменён'    },
};

// ── Toggle / fetch ────────────────────────────────────────────────
async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !loaded.value) await fetchTests();
}

async function fetchTests() {
  loading.value = true;
  error.value   = null;
  try {
    const res   = await TestsService.getBySpecimenId(props.specimenId);
    tests.value = res.data?.payload?.content ?? [];
    loaded.value = true;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить тесты';
  } finally {
    loading.value = false;
  }
}

// ── Results dialog ────────────────────────────────────────────────
const rd = reactive({
  visible:  false,
  loading:  false,
  apiError: '',
  values:   {},   // { [analysisId]: string }
  errors:   {},   // { [analysisId]: string }
});

function openResultsDialog() {
  rd.values   = Object.fromEntries(tests.value.map(t => [t.analysisId, '']));
  rd.errors   = Object.fromEntries(tests.value.map(t => [t.analysisId, '']));
  rd.apiError = '';
  rd.loading  = false;
  rd.visible  = true;
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
  tests.value.forEach(t => validateResult(t.analysisId));
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
    const res    = await TestsService.setResults(props.specimenId, { results });
    const updated = res.data?.payload ?? [];
    if (updated.length) tests.value = updated;
    rd.visible = false;
  } catch (err) {
    rd.apiError = err.response?.data?.message ?? 'Не удалось внести результаты';
  } finally {
    rd.loading = false;
  }
}

// ── Navigation ────────────────────────────────────────────────────
function goToAnalysis(analysisId) {
  if (analysisId) router.push({ name: 'Analyses', query: { id: analysisId } });
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

function pluralTests(n) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'тестов';
  if (mod10 === 1)                   return 'тест';
  if (mod10 >= 2 && mod10 <= 4)     return 'теста';
  return 'тестов';
}
</script>

<style scoped>
/* ── Toggle bar ───────────────────────────────────────────────────── */
.tests-toggle-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1.125rem;
  background: #f1f3f6;
  border-top: 1px solid #dde2ea;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.tests-toggle-bar:hover { background: #e8ecf1; }

.toggle-icon {
  font-size: 0.8rem;
  color: #64748b;
}

.toggle-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

.toggle-spacer { flex: 1; }

.toggle-chevron {
  font-size: 0.7rem;
  color: #64748b;
}

/* ── Expandable area ──────────────────────────────────────────────── */
.tests-area {
  border-top: 1px solid #dde2ea;
  background: #f6f8fb;
  padding: 0.625rem 1.125rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* State placeholders */
.tests-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #9ca3af;
  padding: 0.5rem 0;
}
.tests-state .pi { font-size: 1rem; }
.tests-state--error { color: #be123c; }

/* ── Tests header ─────────────────────────────────────────────────── */
.tests-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tests-header-label {
  font-size: 0.775rem;
  font-weight: 600;
  color: #6b7280;
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
.btn-enter-results:hover {
  background: #dcfce7;
  border-color: #86efac;
}
.btn-enter-results .pi { font-size: 0.75rem; }

/* ── Test list ────────────────────────────────────────────────────── */
.test-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* ── Test card ────────────────────────────────────────────────────── */
.test-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.5rem 0.875rem;
  background: #fff;
  border: 1px solid #e9ebef;
  border-radius: 7px;
  transition: background 0.1s;
}
.test-card:hover { background: #fdfcff; }

/* Identity: short UUID */
.test-identity {
  min-width: 90px;
  flex-shrink: 0;
}

.test-uuid {
  font-family: monospace;
  font-size: 0.78rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  cursor: default;
}

/* Chips */
.test-chips {
  flex: 1;
  display: flex;
  gap: 1.25rem;
}

.t-chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.t-chip-label {
  font-size: 0.6rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.t-chip-val {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.t-chip-val--link {
  color: #9f1239;
  cursor: pointer;
  transition: color 0.12s;
}
.t-chip-val--link:hover { color: #be123c; text-decoration: underline; text-underline-offset: 2px; }

/* Status badge — non-clickable */
.test-status {
  display: inline-flex;
  align-items: center;
  padding: 0.225rem 0.65rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 90px;
  justify-content: center;
}

.test-status--PENDING     { background: #fef9c3; color: #854d0e; }
.test-status--READY       { background: #dbeafe; color: #1d4ed8; }
.test-status--IN_PROGRESS { background: #ffedd5; color: #c2410c; }
.test-status--COMPLETED   { background: #dcfce7; color: #15803d; }
.test-status--CANCELLED   { background: #f3f4f6; color: #6b7280; }

/* Timestamps */
.test-ts {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: #9ca3af;
  text-align: right;
  flex-shrink: 0;
  min-width: 120px;
}

.ts-label {
  color: #d1d5db;
  font-weight: 500;
  margin-right: 0.2rem;
}

/* ── Results dialog ───────────────────────────────────────────────── */
.rd-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.25rem 0 0.5rem;
}

.rd-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

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

/* скрываем стрелки у number input */
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

.rd-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
