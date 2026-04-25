<template>
  <!-- ── Search bar ────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field" :class="{ 'search-field--active': searchField === 'order' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="search.orderId"
        class="search-input"
        placeholder="Найти по ID заказа"
        inputmode="numeric"
        @keyup.enter="searchByOrderId"
        @input="onOrderIdInput"
      />
      <button v-if="searchField === 'order'" class="search-clear" @click="clearSearch" title="Сбросить поиск">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field" :class="{ 'search-field--active': searchField === 'patient' }">
      <i class="pi pi-user search-icon" />
      <input
        v-model="search.patient"
        class="search-input"
        placeholder="Найти по ID пациента"
        inputmode="numeric"
        @keyup.enter="searchByPatientId"
        @input="onPatientInput"
      />
      <button v-if="searchField === 'patient'" class="search-clear" @click="clearSearch" title="Сбросить поиск">
        <i class="pi pi-times" />
      </button>
    </div>
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
  </div>

  <!-- ── Search result message ────────────────────────────────────── -->
  <div v-if="searchMode && searchResultMessage" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMessage }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Specimens container ──────────────────────────────────────── -->
  <div class="specimens-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка образцов...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="specimens.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Образцы не найдены</span>
      </div>

      <div v-else class="specimen-list">
        <div v-for="group in groupedSpecimens" :key="group.orderId" class="specimen-group">

          <!-- Group header -->
          <div class="group-header">
            <i class="pi pi-receipt group-icon" />
            <span class="group-title">Заказ #{{ group.orderId ?? '—' }}</span>
            <span class="group-count">{{ group.items.length }}&nbsp;{{ pluralSpecimens(group.items.length) }}</span>
          </div>

        <div v-for="s in group.items" :key="s.id" class="specimen-card">
          <div class="card-row"><!-- ← обёртка основной строки карточки -->

          <!-- Identity -->
          <div class="card-identity">
            <span class="s-id">#{{ s.id }}</span>
            <span class="s-barcode">{{ s.barcode ?? '—' }}</span>
          </div>

          <!-- Linked chips + Собран -->
          <div class="card-chips">
            <div class="chip">
              <span class="chip-label">Заказ</span>
              <span class="chip-val chip-val--link">{{ s.orderId ?? '—' }}</span>
            </div>
            <div class="chip">
              <span class="chip-label">Пациент</span>
              <span class="chip-val chip-val--link">{{ s.patientId ?? '—' }}</span>
            </div>
            <div class="chip">
              <span class="chip-label">Биомат.</span>
              <span
                class="chip-val chip-val--link"
                :title="s.biomaterialCode ?? ''"
                @click.stop="goToBiomaterial(s.biomaterialId)"
              >{{ truncate(s.biomaterialCode) }}</span>
            </div>
            <div class="chip">
              <span class="chip-label">Контейнер</span>
              <span
                class="chip-val chip-val--link"
                :title="s.containerName ?? ''"
                @click.stop="goToContainer(s.containerId)"
              >{{ truncate(s.containerName) }}</span>
            </div>
            <div class="chip">
              <span class="chip-label">Собран</span>
              <span class="chip-val">{{ formatTs(s.collectionTimestamp) }}</span>
            </div>
          </div>

          <!-- Status badge -->
          <button
            class="status-badge"
            :class="[`status--${s.status}`, { 'status-badge--static': s.status === 'DISPOSED' }]"
            @click="s.status !== 'DISPOSED' && openDialog(s)"
          >
            {{ STATUS_META[s.status]?.label ?? s.status }}
            <i v-if="s.status !== 'DISPOSED'" class="pi pi-angle-down" />
          </button>

          <!-- Timestamps column -->
          <div class="card-ts">
            <span><span class="ts-label">Создан</span> {{ formatTs(s.createdAt) }}</span>
            <span><span class="ts-label">Обновлён</span> {{ formatTs(s.updatedAt) }}</span>
          </div>

          </div><!-- /card-row -->

          <!-- Tests panel — только для COLLECTED -->
          <SpecimenTestsPanel
            v-if="s.status === 'COLLECTED' || s.status === 'TESTED'"
            :specimen-id="s.id"
            :tested="s.status === 'TESTED'"
          />

        </div><!-- /specimen-card -->
        </div><!-- /specimen-group -->
      </div><!-- /specimen-list -->

      <Paginator
        v-if="!searchMode && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="specimens-paginator"
      />
    </template>
  </div>

  <!-- ── Status / collect dialog ───────────────────────────────────── -->
  <Dialog
    v-model:visible="dialog.visible"
    modal
    :header="`Образцы заказа #${dialog.specimen?.orderId}`"
    :style="{ width: '480px' }"
    :draggable="false"
  >
    <div class="dlg-body">

      <!-- Current status -->
      <div class="dlg-row">
        <span class="dlg-key">Текущий статус</span>
        <span class="status-badge" :class="`status--${dialog.specimen?.status}`">
          {{ STATUS_META[dialog.specimen?.status]?.label ?? dialog.specimen?.status }}
        </span>
      </div>

      <!-- TESTED warning -->
      <div v-if="dialog.specimen?.status === 'TESTED'" class="dlg-warning">
        <i class="pi pi-exclamation-triangle" />
        Повторный сбор удалит текущие результаты тестирования. Тестирование придётся провести заново.
      </div>

      <!-- Notice -->
      <div class="dlg-notice">
        <i class="pi pi-info-circle" />
        Действие применится ко <strong>всем образцам</strong> заказа #{{ dialog.specimen?.orderId }}
      </div>

      <!-- ── Barcode inputs (для сбора) ──────────────────────────── -->
      <div class="barcode-section">
        <div class="barcode-section-title">
          <i class="pi pi-barcode" />
          Штрихкоды образцов для сбора
        </div>

        <div
          v-for="(s, idx) in dialog.orderSpecimens"
          :key="s.id"
          class="barcode-row"
        >
          <span class="barcode-specimen-id">#{{ s.id }}</span>
          <div class="barcode-input-wrap" :class="{ 'barcode-input-wrap--error': dialog.barcodeErrors[idx] }">
            <input
              :value="dialog.barcodes[idx]"
              class="barcode-input"
              placeholder="000-000"
              maxlength="7"
              @input="onBarcodeInput(idx, $event)"
              @blur="validateBarcode(idx)"
            />
          </div>
          <span class="barcode-error-msg">{{ dialog.barcodeErrors[idx] }}</span>
        </div>
      </div>

      <!-- API error -->
      <div v-if="dialog.error" class="dlg-error">
        <i class="pi pi-exclamation-circle" />
        {{ dialog.error }}
      </div>

    </div>

    <template #footer>
      <div class="dlg-footer">
        <Button
          label="Биоматериал собран"
          icon="pi pi-check-circle"
          severity="success"
          :loading="dialog.loadingCollect"
          :disabled="dialog.loadingDispose"
          @click="collectOrder"
        />
        <Button
          label="Биоматериал утилизирован"
          icon="pi pi-trash"
          severity="danger"
          :loading="dialog.loadingDispose"
          :disabled="dialog.loadingCollect"
          @click="disposeOrder"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Button    from 'primevue/button';
import Paginator from 'primevue/paginator';
import SpecimensService  from '@/services/SpecimensService';
import SpecimenTestsPanel from '@/components/SpecimenTestsPanel.vue';

const route  = useRoute();
const router = useRouter();

// ── Search ────────────────────────────────────────────────────────
const search = reactive({ orderId: '', patient: '', specimenId: '' });

// ── List state ────────────────────────────────────────────────────
const specimens           = ref([]);
const loading             = ref(false);
const error               = ref(null);
const currentPage         = ref(0);
const pageLimit           = ref(20);
const totalRecords        = ref(0);
const searchField         = ref('');   // 'order' | 'patient' | 'specimen' | ''
const searchMode          = computed(() => searchField.value !== '');
const searchResultMessage = ref('');

const STATUS_META = {
  AWAITS_COLLECTION: { label: 'Ожидает сбора'  },
  COLLECTED:         { label: 'Собран'           },
  IN_LAB:            { label: 'В лаборатории'   },
  TESTED:            { label: 'Протестирован'    },
  DISPOSED:          { label: 'Утилизирован'     },
};

// ── Grouping ──────────────────────────────────────────────────────
const groupedSpecimens = computed(() => {
  const map = new Map();
  for (const s of specimens.value) {
    const key = s.orderId ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.entries()].map(([orderId, items]) => ({ orderId, items }));
});

function pluralSpecimens(n) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'образцов';
  if (mod10 === 1)                   return 'образец';
  if (mod10 >= 2 && mod10 <= 4)     return 'образца';
  return 'образцов';
}

// ── Fetch ─────────────────────────────────────────────────────────
async function fetchSpecimens(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res     = await SpecimensService.getAll(page, limit);
    const payload = res.data?.payload;
    specimens.value    = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить образцы';
  } finally {
    loading.value = false;
  }
}

function onPage(event) { fetchSpecimens(event.page, event.rows); }

// ── Search functions ──────────────────────────────────────────────
async function searchByOrderId() {
  const raw = search.orderId.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res = await SpecimensService.getByOrderId(Number(raw));
    specimens.value           = res.data?.payload ?? [];
    searchResultMessage.value = `Заказ #${raw}: ${specimens.value.length} ${pluralSpecimens(specimens.value.length)}`;
    searchField.value         = 'order';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти образцы';
  } finally {
    loading.value = false;
  }
}

async function searchByPatientId() {
  const raw = search.patient.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res = await SpecimensService.getByPatientId(Number(raw));
    specimens.value           = res.data?.payload ?? [];
    searchResultMessage.value = `Пациент #${raw}: ${specimens.value.length} ${pluralSpecimens(specimens.value.length)}`;
    searchField.value         = 'patient';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти образцы';
  } finally {
    loading.value = false;
  }
}

async function searchBySpecimenId() {
  const raw = search.specimenId.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await SpecimensService.getById(Number(raw));
    const item = res.data?.payload;
    specimens.value           = item ? [item] : [];
    searchResultMessage.value = item ? `Образец #${raw}` : `Образец #${raw} не найден`;
    searchField.value         = 'specimen';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти образец';
  } finally {
    loading.value = false;
  }
}

function onOrderIdInput()   { if (!search.orderId.trim())    clearSearch(); }
function onPatientInput()    { if (!search.patient.trim())    clearSearch(); }
function onSpecimenIdInput() { if (!search.specimenId.trim()) clearSearch(); }

function clearSearch() {
  searchField.value         = '';
  searchResultMessage.value = '';
  search.orderId            = '';
  search.patient            = '';
  search.specimenId         = '';
  fetchSpecimens(0, pageLimit.value);
}

// ── Dialog state ──────────────────────────────────────────────────
const dialog = reactive({
  visible:        false,
  specimen:       null,
  orderSpecimens: [],   // все образцы этого заказа на текущей странице
  barcodes:       [],   // значения полей [idx] → string
  barcodeErrors:  [],   // ошибки валидации [idx] → string
  error:          '',
  loadingCollect: false,
  loadingDispose: false,
});

function openDialog(specimen) {
  const orderSpecs         = specimens.value.filter(s => s.orderId === specimen.orderId);
  dialog.specimen          = specimen;
  dialog.orderSpecimens    = orderSpecs;
  dialog.barcodes          = orderSpecs.map(() => '');
  dialog.barcodeErrors     = orderSpecs.map(() => '');
  dialog.error             = '';
  dialog.loadingCollect    = false;
  dialog.loadingDispose    = false;
  dialog.visible           = true;
}

// ── Barcode input handling ────────────────────────────────────────
const BARCODE_RE = /^\d{3}-\d{3}$/;

function onBarcodeInput(idx, event) {
  // Оставляем только цифры, вставляем тире после 3-й
  let raw = event.target.value.replace(/\D/g, '').slice(0, 6);
  const formatted = raw.length > 3 ? raw.slice(0, 3) + '-' + raw.slice(3) : raw;
  dialog.barcodes[idx] = formatted;
  event.target.value   = formatted;
  if (dialog.barcodeErrors[idx]) validateBarcode(idx);
}

function validateBarcode(idx) {
  dialog.barcodeErrors[idx] = BARCODE_RE.test(dialog.barcodes[idx]) ? '' : 'Формат: 000-000';
}

function validateAllBarcodes() {
  dialog.barcodes.forEach((_, idx) => validateBarcode(idx));
  return dialog.barcodeErrors.every(e => !e);
}

// ── Actions ───────────────────────────────────────────────────────
async function collectOrder() {
  if (!validateAllBarcodes()) return;
  dialog.loadingCollect = true;
  dialog.error = '';
  try {
    const body = dialog.orderSpecimens.map((s, idx) => ({ id: s.id, barcode: dialog.barcodes[idx] }));
    const res  = await SpecimensService.collectList(body);
    applyUpdates(res.data?.payload ?? []);
    dialog.visible = false;
  } catch (err) {
    dialog.error = err.response?.data?.message ?? 'Не удалось обновить статус';
  } finally {
    dialog.loadingCollect = false;
  }
}

async function disposeOrder() {
  dialog.loadingDispose = true;
  dialog.error = '';
  try {
    const res = await SpecimensService.disposeByOrder(dialog.specimen.orderId);
    applyUpdates(res.data?.payload ?? []);
    dialog.visible = false;
  } catch (err) {
    dialog.error = err.response?.data?.message ?? 'Не удалось обновить статус';
  } finally {
    dialog.loadingDispose = false;
  }
}

function applyUpdates(updatedList) {
  updatedList.forEach(upd => {
    const idx = specimens.value.findIndex(s => s.id === upd.id);
    if (idx !== -1) specimens.value[idx] = upd;
  });
}

// ── Formatters ────────────────────────────────────────────────────
const truncate = (str, max = 30) =>
  str == null ? '—' : str.length > max ? str.slice(0, max) + '…' : str;

function goToBiomaterial(id) {
  if (id) router.push({ name: 'Biomaterials', query: { id } });
}

function goToContainer(id) {
  if (id) router.push({ name: 'Containers', query: { id } });
}

function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

onMounted(() => {
  const qSpecimen = route.query.specimenId;
  if (qSpecimen && !isNaN(Number(qSpecimen))) {
    search.specimenId = String(qSpecimen);
    searchBySpecimenId();
  } else {
    fetchSpecimens(0);
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

/* ── Specimens container ──────────────────────────────────────────── */
.specimens-wrap {
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

/* ── Specimen list ────────────────────────────────────────────────── */
.specimen-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.875rem;
}

/* ── Specimen group ───────────────────────────────────────────────── */
.specimen-group {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e9ebef;
}

.group-icon {
  font-size: 0.75rem;
  color: #9ca3af;
}

.group-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.group-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: #9ca3af;
}

/* ── Specimen card ────────────────────────────────────────────────── */
.specimen-card {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
  overflow: hidden;
}
.specimen-group .specimen-card:last-child { border-bottom: none; }

/* Основная строка карточки */
.card-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.625rem 1.125rem;
}
.card-row:hover { background: #fafafa; }

/* Identity */
.card-identity {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 170px;
  flex-shrink: 0;
}

.s-id {
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.s-barcode {
  font-size: 0.78rem;
  font-family: monospace;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

/* Chips row */
.card-chips {
  flex: 1;
  display: flex;
  gap: 1.25rem;
  flex-wrap: nowrap;
  align-items: flex-end;
}

.chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.chip-label {
  font-size: 0.6375rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.chip-val {
  font-size: 0.8375rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.chip-val--link {
  color: #9f1239;
  cursor: pointer;
  transition: color 0.12s;
}
.chip-val--link:hover { color: #be123c; text-decoration: underline; text-underline-offset: 2px; }

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.275rem 0.7rem;
  border-radius: 20px;
  font-size: 0.73rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.1s;
  font-family: inherit;
  min-width: 120px;
  justify-content: center;
}
.status-badge:hover { opacity: 0.82; transform: translateY(-1px); }

.status--AWAITS_COLLECTION { background: #fef9c3; color: #854d0e; }
.status--COLLECTED          { background: #ede9fe; color: #6d28d9; }
.status--IN_LAB             { background: #ffedd5; color: #c2410c; }
.status--TESTED             { background: #ccfbf1; color: #0f766e; }
.status--DISPOSED           { background: #f3f4f6; color: #6b7280; }

.status-badge .pi { font-size: 0.65rem; }

.status-badge--static {
  cursor: default;
  pointer-events: none;
  opacity: 0.75;
}

/* Timestamps column */
.card-ts {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
  flex-shrink: 0;
  min-width: 130px;
}

.ts-label {
  color: #d1d5db;
  font-weight: 500;
  margin-right: 0.25rem;
}

/* ── Paginator ────────────────────────────────────────────────────── */
.specimens-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Dialog ───────────────────────────────────────────────────────── */
.dlg-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.125rem 0 0.25rem;
}

.dlg-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dlg-key {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  min-width: 120px;
  flex-shrink: 0;
}

.dlg-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #374151;
}
.dlg-notice .pi { color: #6b7280; flex-shrink: 0; margin-top: 1px; }

.dlg-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #92400e;
}
.dlg-warning .pi { color: #d97706; flex-shrink: 0; margin-top: 1px; }

/* Barcode section */
.barcode-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.barcode-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}
.barcode-section-title .pi { font-size: 0.875rem; }

.barcode-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.barcode-specimen-id {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #374151;
  min-width: 56px;
  flex-shrink: 0;
}

.barcode-input-wrap {
  flex: 1;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.barcode-input-wrap:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}

.barcode-input-wrap--error { border-color: #fca5a5; }

.barcode-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0.4rem 0.625rem;
  font-size: 0.9rem;
  font-family: monospace;
  background: transparent;
  color: #111827;
  letter-spacing: 0.04em;
  box-sizing: border-box;
}
.barcode-input::placeholder { color: #d1d5db; }

.barcode-error-msg {
  font-size: 0.75rem;
  color: #f43f5e;
  min-width: 80px;
  flex-shrink: 0;
}

.dlg-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #be123c;
}

.dlg-footer {
  display: flex;
  gap: 0.625rem;
  justify-content: flex-end;
  width: 100%;
}
</style>
