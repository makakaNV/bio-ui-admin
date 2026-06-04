<template>
  <!-- ── Search bar ─────────────────────────────────────────────────── -->
  <div class="search-bar">
    <div class="search-field" :class="{ 'search-field--active': searchField === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="search.id"
        class="search-input"
        placeholder="Найти по ID заказа"
        inputmode="numeric"
        @keyup.enter="searchById"
        @input="onIdInput"
      />
      <button v-if="searchField === 'id'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field" :class="{ 'search-field--active': searchField === 'patient' }">
      <i class="pi pi-user search-icon" />
      <input
        v-model="search.patientId"
        class="search-input"
        placeholder="Найти по ID пациента"
        inputmode="numeric"
        @keyup.enter="searchByPatientId"
        @input="onPatientIdInput"
      />
      <button v-if="searchField === 'patient'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>

  <!-- ── Search result bar ─────────────────────────────────────────── -->
  <div v-if="searchField && searchResultMessage" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMessage }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Orders container ──────────────────────────────────────────── -->
  <div class="orders-wrap">
    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка заказов...</span>
    </div>
    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>
    <template v-else>
      <div v-if="orders.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Заказы не найдены</span>
      </div>
      <div v-else class="orders-list">
        <div
          v-for="o in orders"
          :key="o.id"
          class="order-card"
          @click="openDetail(o)"
        >
          <!-- Identity: order ID alone, creates visual gap before chips -->
          <div class="order-identity">
            <span class="o-id">#{{ o.id }}</span>
          </div>

          <!-- Chips: label on top, value below -->
          <div class="order-chips">
            <div class="o-chip">
              <span class="o-chip-label">Пациент</span>
              <span
                class="o-chip-val o-chip-val--link"
                @click.stop="goToPatient(o.patientId)"
              >{{ o.patientId ?? '—' }}</span>
            </div>
            <div class="o-chip">
              <span class="o-chip-label">Сумма</span>
              <span class="o-chip-val">{{ formatSum(o.totalSum) }}</span>
            </div>
            <div class="o-chip">
              <span class="o-chip-label">Кем создан</span>
              <span
                class="o-chip-val o-chip-val--link"
                @click.stop="goToCreatedBy(o.createdBy)"
              >{{ o.createdBy || '—' }}</span>
            </div>
          </div>

          <!-- Status badge — before timestamps -->
          <div class="order-status-badge" :style="statusStyle(o.status)">
            {{ statusLabel(o.status) }}
          </div>

          <!-- Timestamps -->
          <div class="order-ts">
            <span><span class="ts-label">Создан</span>{{ formatDate(o.createdAt) }}</span>
            <span><span class="ts-label">Обновлён</span>{{ formatDate(o.updatedAt) }}</span>
          </div>

          <!-- Samples link — far right -->
          <button class="btn-samples" @click.stop="goToSamples(o.id)" title="Образцы этого заказа">
            <i class="pi pi-box" />
          </button>
        </div>
      </div>

      <Paginator
        v-if="searchField !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="orders-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detail.visible"
    modal
    :header="detail.order ? `Заказ #${detail.order.id}` : 'Заказ'"
    :style="{ width: '520px' }"
    :draggable="false"
  >
    <div v-if="detail.loading" class="dlg-state">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка данных...</span>
    </div>
    <div v-else-if="detail.error" class="dlg-state dlg-state--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ detail.error }}</span>
    </div>
    <div v-else-if="detail.order" class="dlg-body">
      <div class="info-grid">
        <div class="info-row">
          <span class="info-key">Статус</span>
          <span class="status-chip" :style="statusStyle(detail.order.status)">
            {{ statusLabel(detail.order.status) }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">ID пациента</span>
          <span
            v-if="detail.order.patientId"
            class="info-link"
            @click="goToPatient(detail.order.patientId)"
          >{{ detail.order.patientId }}</span>
          <span v-else class="info-val">—</span>
        </div>
        <div class="info-row">
          <span class="info-key">Сумма</span>
          <span class="info-val">{{ formatSum(detail.order.totalSum) }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Комментарий</span>
          <span class="info-val">{{ detail.order.comment || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Создан</span>
          <span
            v-if="detail.order.createdBy"
            class="info-link"
            @click="goToCreatedBy(detail.order.createdBy)"
          >{{ detail.order.createdBy }}</span>
          <span v-else class="info-val">—</span>
        </div>

        <!-- Состав: analyses + panels inline -->
        <div class="info-row info-row--top">
          <span class="info-key">Состав</span>
          <div class="comp-val">
            <div v-if="detail.composition.loading" class="comp-loading-inline">
              <i class="pi pi-spin pi-spinner" />Загрузка...
            </div>
            <template v-else>
              <div class="comp-group-inline">
                <span class="comp-group-label">Анализы</span>
                <template v-if="detail.composition.analyses.length">
                  <span
                    v-for="a in detail.composition.analyses"
                    :key="a.id"
                    class="comp-chip comp-chip--analysis"
                    :title="a.name"
                    @click="goToAnalysis(a.id)"
                  >{{ a.code }}</span>
                </template>
                <span v-else class="comp-none">—</span>
              </div>
              <div class="comp-group-inline">
                <span class="comp-group-label">Комплексы</span>
                <template v-if="detail.composition.panels.length">
                  <span
                    v-for="p in detail.composition.panels"
                    :key="p.id"
                    class="comp-chip comp-chip--panel"
                    :title="p.name"
                    @click="goToPanel(p.id)"
                  >{{ p.code }}</span>
                </template>
                <span v-else class="comp-none">—</span>
              </div>
              <div v-if="detail.composition.error" class="comp-error-inline">
                <i class="pi pi-exclamation-triangle" />{{ detail.composition.error }}
              </div>
            </template>
          </div>
        </div>

        <div class="info-row">
          <span class="info-key">Дата создания</span>
          <span class="info-val">{{ formatDate(detail.order.createdAt) }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Последнее обновление</span>
          <span class="info-val">{{ formatDate(detail.order.updatedAt) }}</span>
        </div>
      </div>

    </div>

    <template v-if="detail.order && detail.order.status !== 'CANCELED'" #footer>
      <div class="dlg-footer">
        <button class="btn-cancel-order" @click="openCancel">
          <i class="pi pi-ban" />
          Отменить заказ
        </button>
      </div>
    </template>
  </Dialog>

  <!-- ── Cancel order dialog ───────────────────────────────────────── -->
  <Dialog
    v-model:visible="cancelDialog.visible"
    modal
    header="Отменить заказ"
    :style="{ width: '460px' }"
    :draggable="false"
    :closable="!cancelDialog.loading"
  >
    <div class="cancel-body">
      <div class="cancel-warning">
        <i class="pi pi-exclamation-triangle cancel-warning-icon" />
        <div class="cancel-warning-text">
          <p>Заказ <strong>#{{ detail.order?.id }}</strong> останется в системе, но дальнейшая диагностика будет невозможна.</p>
          <p>Все связанные образцы будут <strong>утилизированы</strong>.</p>
        </div>
      </div>

      <div class="cancel-field">
        <label class="cancel-label">Причина отмены</label>
        <textarea
          v-model="cancelDialog.reason"
          class="cancel-textarea"
          :class="{ 'cancel-textarea--error': cancelDialog.error }"
          placeholder="Укажите причину отмены заказа..."
          rows="3"
        />
        <span v-if="cancelDialog.error" class="cancel-error">{{ cancelDialog.error }}</span>
      </div>
    </div>

    <template #footer>
      <div class="cancel-footer">
        <button
          type="button"
          class="btn-cancel-back"
          :disabled="cancelDialog.loading"
          @click="cancelDialog.visible = false"
        >Назад</button>
        <button
          type="button"
          class="btn-cancel-confirm"
          :disabled="cancelDialog.loading || !cancelDialog.reason.trim()"
          @click="confirmCancel"
        >
          <i v-if="cancelDialog.loading" class="pi pi-spin pi-spinner" />
          <i v-else class="pi pi-ban" />
          {{ cancelDialog.loading ? 'Отмена...' : 'Отменить заказ' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import OrdersService   from '@/services/OrdersService';
import AnalysesService from '@/services/AnalysesService';
import PanelsService   from '@/services/PanelsService';

const router = useRouter();

// ── Status map ────────────────────────────────────────────────
const STATUS_MAP = {
  REGISTERED:  { label: 'В обработке',          bg: '#fff7ed', color: '#c2410c' },
  APPROVED:    { label: 'Ожидает сбора',         bg: '#e0f2fe', color: '#0369a1' },
  PATCHING:    { label: 'В процессе изменения',  bg: '#f5f0ff', color: '#6d28d9' },
  IN_PROGRESS: { label: 'В лаборатории',         bg: '#eef2ff', color: '#3730a3' },
  COMPLETED:   { label: 'Завершён',              bg: '#eff6ff', color: '#1e40af' },
  CANCELED:    { label: 'Отменён',               bg: '#f3f4f6', color: '#6b7280' },
};

function statusLabel(status) {
  return STATUS_MAP[status]?.label ?? status ?? '—';
}

function statusStyle(status) {
  const s = STATUS_MAP[status];
  if (!s) return {};
  return { background: s.bg, color: s.color };
}

// ── Search ────────────────────────────────────────────────────
const search      = reactive({ id: '', patientId: '' });
const searchField = ref(''); // '' | 'id' | 'patient'
const searchResultMessage  = ref('');
const searchPatientIdStored = ref(null);

// ── List state ────────────────────────────────────────────────
const orders       = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(15);
const totalRecords = ref(0);

// ── Detail dialog ─────────────────────────────────────────────
const detail = reactive({
  visible: false,
  loading: false,
  error:   '',
  order:   null,
  composition: {
    loading:  false,
    analyses: [],
    panels:   [],
    error:    '',
  },
});

// ── Fetch all ─────────────────────────────────────────────────
async function fetchOrders(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res     = await OrdersService.getAll(page, limit);
    const payload = res.data?.payload;
    orders.value       = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить заказы';
  } finally {
    loading.value = false;
  }
}

// ── Fetch by patient ID ───────────────────────────────────────
async function fetchByPatientId(patientId, page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res     = await OrdersService.getByPatientId(patientId, page, limit);
    const payload = res.data?.payload;
    orders.value       = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
    if (page === 0) {
      searchResultMessage.value = `Заказы пациента #${patientId}: найдено ${orders.value.length}`;
    }
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти заказы';
  } finally {
    loading.value = false;
  }
}

// ── Page change ───────────────────────────────────────────────
function onPage(event) {
  pageLimit.value = event.rows;
  if (searchField.value === 'patient') {
    fetchByPatientId(searchPatientIdStored.value, event.page, event.rows);
  } else {
    fetchOrders(event.page, event.rows);
  }
}

// ── Search by order ID ────────────────────────────────────────
async function searchById() {
  const raw = search.id.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await OrdersService.getById(Number(raw));
    const item = res.data?.payload;
    orders.value              = item ? [item] : [];
    searchResultMessage.value = item ? `Заказ #${raw}` : `Заказ #${raw} не найден`;
    searchField.value         = 'id';
    totalRecords.value        = orders.value.length;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти заказ';
  } finally {
    loading.value = false;
  }
}

// ── Search by patient ID ──────────────────────────────────────
async function searchByPatientId() {
  const raw = search.patientId.trim();
  if (!raw || isNaN(Number(raw))) return;
  const pid = Number(raw);
  searchPatientIdStored.value = pid;
  searchField.value           = 'patient';
  await fetchByPatientId(pid, 0, pageLimit.value);
}

function onIdInput()        { if (!search.id.trim())        clearSearch(); }
function onPatientIdInput() { if (!search.patientId.trim()) clearSearch(); }

function clearSearch() {
  searchField.value           = '';
  searchResultMessage.value   = '';
  search.id                   = '';
  search.patientId            = '';
  searchPatientIdStored.value = null;
  fetchOrders(0, pageLimit.value);
}

// ── Cancel dialog ─────────────────────────────────────────────
const cancelDialog = reactive({
  visible: false,
  loading: false,
  reason:  '',
  error:   '',
});

function openCancel() {
  cancelDialog.reason  = '';
  cancelDialog.error   = '';
  cancelDialog.loading = false;
  cancelDialog.visible = true;
}

async function confirmCancel() {
  const reason = cancelDialog.reason.trim();
  if (!reason) { cancelDialog.error = 'Укажите причину отмены'; return; }
  cancelDialog.loading = true;
  cancelDialog.error   = '';
  try {
    const res = await OrdersService.cancel(detail.order.id, reason);
    const updated = res.data?.payload;
    if (updated) detail.order = updated;
    cancelDialog.visible = false;
    fetchOrders(currentPage.value, pageLimit.value);
  } catch (err) {
    cancelDialog.error = err.response?.data?.message ?? 'Не удалось отменить заказ';
  } finally {
    cancelDialog.loading = false;
  }
}

// ── Navigation ────────────────────────────────────────────────
function goToPatient(id) {
  if (id) router.push({ name: 'Patients', query: { patientId: id } });
}

function goToCreatedBy(email) {
  if (email) router.push({ name: 'Users', query: { keyword: email } });
}

function goToSamples(orderId) {
  if (orderId) router.push({ name: 'Samples', query: { orderId } });
}

function goToAnalysis(id) {
  if (id) router.push({ name: 'Analyses', query: { id } });
}

function goToPanel(id) {
  if (id) router.push({ name: 'Studies', query: { id } });
}

// ── Detail ────────────────────────────────────────────────────
async function openDetail(o) {
  detail.order   = o;
  detail.error   = '';
  detail.loading = true;
  detail.visible = true;

  // Reset composition
  detail.composition.loading  = true;
  detail.composition.analyses = [];
  detail.composition.panels   = [];
  detail.composition.error    = '';

  // Fire composition fetch immediately with card's IDs (non-blocking)
  fetchComposition(o.analysesIds ?? [], o.panelsIds ?? []);

  try {
    const res    = await OrdersService.getById(o.id);
    detail.order = res.data?.payload ?? o;
  } catch {
    detail.error = 'Не удалось загрузить данные заказа';
  } finally {
    detail.loading = false;
  }
}

async function fetchComposition(analysesIds, panelsIds) {
  const [aRes, pRes] = await Promise.allSettled([
    analysesIds.length ? AnalysesService.getByIds(analysesIds) : Promise.resolve(null),
    panelsIds.length   ? PanelsService.getByIds(panelsIds)     : Promise.resolve(null),
  ]);
  detail.composition.analyses = aRes.status === 'fulfilled' && aRes.value
    ? (aRes.value.data?.payload ?? []) : [];
  detail.composition.panels   = pRes.status === 'fulfilled' && pRes.value
    ? (pRes.value.data?.payload ?? []) : [];
  if (aRes.status === 'rejected' || pRes.status === 'rejected') {
    detail.composition.error = 'Не удалось загрузить часть данных состава';
  }
  detail.composition.loading = false;
}

// ── Helpers ───────────────────────────────────────────────────
function formatSum(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2
  }).format(val);
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
}

function formatIds(arr) {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

onMounted(() => fetchOrders(0));
</script>

<style scoped>
/* ── Search bar ───────────────────────────────────────────────── */
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
.search-field--active {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.08);
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

.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0 0.125rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s;
}
.search-clear:hover { color: #be123c; }
.search-clear .pi { font-size: 0.75rem; }

/* ── Search result bar ────────────────────────────────────────── */
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

/* ── Orders container ─────────────────────────────────────────── */
.orders-wrap {
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

/* ── Orders list ──────────────────────────────────────────────── */
.orders-list {
  display: flex;
  flex-direction: column;
}

/* ── Order card ───────────────────────────────────────────────── */
.order-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #e9ebef;
  cursor: pointer;
  transition: background 0.1s;
}
.order-card:last-child { border-bottom: none; }
.order-card:hover { background: #fafafa; }

/* Identity: order ID, fixed width creates gap before chips */
.order-identity {
  min-width: 90px;
  flex-shrink: 0;
}

.o-id {
  font-family: monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

/* Chips area */
.order-chips {
  flex: 1;
  display: flex;
  gap: 2.25rem;
  align-items: flex-end;
}

.o-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.o-chip-label {
  font-size: 0.675rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.045em;
  white-space: nowrap;
}

.o-chip-val {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.o-chip-val--link {
  color: #9f1239;
  cursor: pointer;
  transition: color 0.12s;
}
.o-chip-val--link:hover { color: #be123c; text-decoration: underline; text-underline-offset: 2px; }

/* Samples button */
.btn-samples {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.btn-samples .pi { font-size: 0.85rem; }
.btn-samples:hover {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #9f1239;
}

/* Timestamps */
.order-ts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: right;
  flex-shrink: 0;
  min-width: 148px;
}

.ts-label {
  color: #d1d5db;
  font-weight: 500;
  margin-right: 0.25rem;
}

/* Status badge */
.order-status-badge {
  flex-shrink: 0;
  padding: 0.35rem 0.875rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  min-width: 120px;
  text-align: center;
}

/* ── Paginator ────────────────────────────────────────────────── */
.orders-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Dialog ───────────────────────────────────────────────────── */
.dlg-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}
.dlg-state .pi { font-size: 1.75rem; }
.dlg-state--error { color: #be123c; }

.dlg-body {
  padding: 0.125rem 0 0.25rem;
}

.info-grid {
  display: flex;
  flex-direction: column;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.875rem;
  border-bottom: 1px solid #f9fafb;
  gap: 1rem;
}
.info-row:last-child { border-bottom: none; }

.info-key {
  font-size: 0.8125rem;
  color: #6b7280;
  flex-shrink: 0;
}

.info-val {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  text-align: right;
}

.info-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #9f1239;
  cursor: pointer;
  text-align: right;
  transition: color 0.12s;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.info-link:hover { color: #be123c; }

.status-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.625rem;
  border-radius: 20px;
}

/* ── Composition (inline in info-grid) ────────────────────────── */
.info-row--top { align-items: flex-start; padding-top: 0.6rem; padding-bottom: 0.6rem; }
.info-row--top .info-key { padding-top: 2px; }

.comp-val {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  align-items: flex-end;
}

.comp-loading-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #9ca3af;
}

.comp-group-inline {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.comp-group-label {
  font-size: 0.67rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.comp-none {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #d1d5db;
}

.comp-chip {
  display: inline-block;
  padding: 0.175rem 0.55rem;
  border-radius: 5px;
  font-size: 0.76rem;
  font-weight: 700;
  font-family: monospace;
  cursor: pointer;
  transition: opacity 0.12s;
}
.comp-chip:hover { opacity: 0.72; }

.comp-chip--analysis { background: #dbeafe; color: #1e40af; }
.comp-chip--panel    { background: #ede9fe; color: #5b21b6; }

.comp-error-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #be123c;
}

/* ── Detail dialog footer ─────────────────────────────────────── */
.dlg-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.btn-cancel-order {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1.5px solid #fecdd3;
  border-radius: 7px;
  background: #fff;
  color: #be123c;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.btn-cancel-order:hover { background: #fff1f2; border-color: #fca5a5; }
.btn-cancel-order .pi { font-size: 0.8rem; }

/* ── Cancel order dialog ──────────────────────────────────────── */
.cancel-body {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding: 0.125rem 0 0.25rem;
}

.cancel-warning {
  display: flex;
  gap: 0.875rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.875rem 1rem;
}

.cancel-warning-icon {
  font-size: 1.25rem;
  color: #be123c;
  flex-shrink: 0;
  margin-top: 1px;
}

.cancel-warning-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cancel-warning-text p {
  margin: 0;
  font-size: 0.8375rem;
  color: #374151;
  line-height: 1.5;
}

.cancel-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cancel-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.cancel-textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: #111827;
  font-family: inherit;
  resize: vertical;
  min-height: 72px;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.cancel-textarea:focus {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}
.cancel-textarea--error { border-color: #fca5a5; }

.cancel-error {
  font-size: 0.72rem;
  color: #be123c;
}

.cancel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  width: 100%;
}

.btn-cancel-back {
  padding: 0.5rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel-back:hover:not(:disabled) { background: #f9fafb; }
.btn-cancel-back:disabled { opacity: 0.55; cursor: default; }

.btn-cancel-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 7px;
  background: #be123c;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-cancel-confirm:hover:not(:disabled) { background: #9f1239; }
.btn-cancel-confirm:disabled { opacity: 0.55; cursor: default; }
</style>
