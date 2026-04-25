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
        placeholder="Поиск по коду, типу или описанию..."
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
  <div class="biomaterials-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка биоматериалов...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="filteredBiomaterials.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Биоматериалы не найдены</span>
      </div>

      <div v-else class="biomaterials-grid">
        <div
          v-for="b in filteredBiomaterials"
          :key="b.id"
          class="bio-card"
          @click="openDetail(b)"
        >
          <div class="bio-card-grid">
            <span class="bio-code">{{ b.code }}</span>
            <span class="bio-type">{{ TYPE_LABELS[b.type] ?? b.type }}</span>
            <span class="bio-time-badge" :class="`time--${b.collectTime}`">
              <i class="pi pi-clock" />{{ TIME_LABELS[b.collectTime] ?? b.collectTime }}
            </span>
            <span class="bio-desc">{{ b.description ? truncate(b.description, 80) : '—' }}</span>
          </div>
          <i class="pi pi-chevron-right bio-chevron" />
        </div>
      </div>

      <Paginator
        v-if="searchMode !== 'id' && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 15, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="bio-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detailVisible"
    modal
    :header="selectedBio?.code ?? 'Биоматериал'"
    :style="{ width: '520px' }"
    :draggable="false"
  >
    <template v-if="selectedBio">
      <div class="detail-body">
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-hashtag" />ID</span>
          <span class="detail-val">{{ selectedBio.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-tag" />Код</span>
          <span class="detail-val detail-val--mono">{{ selectedBio.code }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-heart" />Тип</span>
          <span class="detail-val">
            <span class="bio-type-badge" :class="`type--${selectedBio.type}`">
              {{ TYPE_LABELS[selectedBio.type] ?? selectedBio.type }}
            </span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-clock" />Время сбора</span>
          <span class="detail-val">
            <span class="bio-time-badge" :class="`time--${selectedBio.collectTime}`">
              <i class="pi pi-clock" />
              {{ TIME_LABELS[selectedBio.collectTime] ?? selectedBio.collectTime }}
            </span>
          </span>
        </div>
        <div v-if="selectedBio.description" class="detail-row detail-row--desc">
          <span class="detail-key detail-key--top"><i class="pi pi-align-left" />Описание</span>
          <span class="detail-val detail-val--desc">{{ selectedBio.description }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-calendar-plus" />Создан</span>
          <span class="detail-val">{{ formatTs(selectedBio.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key"><i class="pi pi-clock" />Обновлён</span>
          <span class="detail-val">{{ formatTs(selectedBio.updatedAt) }}</span>
        </div>

        <!-- Containers block -->
        <div
          v-if="selectedBio.availableContainers?.length"
          class="detail-containers-block"
        >
          <div class="detail-containers-label">
            <i class="pi pi-inbox" />
            Контейнеры
          </div>
          <div class="detail-containers-chips">
            <span
              v-for="c in selectedBio.availableContainers"
              :key="c.id"
              class="container-chip"
              @click="goToContainer(c.id)"
            >{{ c.name }}</span>
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
import BiomaterialsService from '@/services/BiomaterialsService';

const route  = useRoute();
const router = useRouter();

// ── Enum labels ────────────────────────────────────────────────────
const TYPE_LABELS = {
  VENOUS_BLOOD:    'Венозная кровь',
  CAPILLARY_BLOOD: 'Капиллярная кровь',
  PLASMA:          'Плазма',
  SALIVA:          'Слюна',
};

const TIME_LABELS = {
  MORNING: 'Утром',
  DAILY:   'Ежедневно',
  EVENING: 'Вечером',
  RANDOM:  'Произвольно',
};

// ── State ──────────────────────────────────────────────────────────
const biomaterials = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(15);
const totalRecords = ref(0);

const searchId            = ref('');
const searchText          = ref('');
const searchMode          = ref('');  // 'id' | ''
const searchResultMessage = ref('');

const selectedBio   = ref(null);
const detailVisible = ref(false);

// ── Text filter (client-side) ──────────────────────────────────────
const filteredBiomaterials = computed(() => {
  if (!searchText.value.trim()) return biomaterials.value;
  const q = searchText.value.toLowerCase();
  return biomaterials.value.filter(b =>
    b.code?.toLowerCase().includes(q) ||
    TYPE_LABELS[b.type]?.toLowerCase().includes(q) ||
    b.type?.toLowerCase().includes(q) ||
    b.description?.toLowerCase().includes(q)
  );
});

// ── Fetch all ─────────────────────────────────────────────────────
async function fetchBiomaterials(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res          = await BiomaterialsService.getAll(page, limit);
    const payload      = res.data?.payload;
    biomaterials.value = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить биоматериалы';
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
    const res  = await BiomaterialsService.getById(Number(raw));
    const item = res.data?.payload;
    biomaterials.value        = item ? [item] : [];
    searchResultMessage.value = item ? `Биоматериал #${raw}: ${item.code}` : 'Не найден';
    searchMode.value          = 'id';
  } catch {
    biomaterials.value        = [];
    searchResultMessage.value = 'Биоматериал не найден';
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
  fetchBiomaterials(0);
}

// ── Detail dialog ──────────────────────────────────────────────────
function openDetail(bio) {
  selectedBio.value   = bio;
  detailVisible.value = true;
}

function goToContainer(id) {
  if (id) router.push({ name: 'Containers', query: { id } });
}

// ── Pagination ─────────────────────────────────────────────────────
function onPage(event) {
  fetchBiomaterials(event.page, event.rows);
}

// ── Helpers ────────────────────────────────────────────────────────
const truncate = (str, max = 60) =>
  str == null ? '' : str.length > max ? str.slice(0, max) + '…' : str;

function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

// ── Mount ──────────────────────────────────────────────────────────
onMounted(async () => {
  const qId   = route.query.id;
  const qCode = route.query.code;
  if (qId && !isNaN(Number(qId))) {
    searchId.value = String(qId);
    await doSearchById();
    if (biomaterials.value.length === 1) openDetail(biomaterials.value[0]);
  } else if (qCode) {
    await fetchBiomaterials(0, 100);
    searchText.value = qCode;
    if (filteredBiomaterials.value.length === 1) openDetail(filteredBiomaterials.value[0]);
  } else {
    fetchBiomaterials(0);
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
.biomaterials-wrap {
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
.biomaterials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

/* ── Bio card ─────────────────────────────────────────────────────── */
.bio-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  background: #fafafa;
}
.bio-card:hover {
  border-color: #9f1239;
  box-shadow: 0 3px 12px rgba(159,18,57,.09);
  transform: translateY(-1px);
  background: #fff;
}

/* 2×2 grid inside card */
.bio-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 1rem;
  flex: 1;
  min-width: 0;
  align-items: center;
}

.bio-code {
  font-family: monospace;
  font-size: 0.9375rem;
  font-weight: 700;
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  white-space: nowrap;
  justify-self: start;
}

.bio-type {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  justify-self: end;
  text-align: right;
  white-space: nowrap;
}

/* time badge sits bottom-left naturally (grid row 2, col 1) */

.bio-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-self: end;
  text-align: right;
}

.bio-chevron {
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}

/* ── Type badges ──────────────────────────────────────────────────── */
.bio-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.type--VENOUS_BLOOD    { background: #fee2e2; color: #b91c1c; }
.type--CAPILLARY_BLOOD { background: #ffedd5; color: #c2410c; }
.type--PLASMA          { background: #f3e8ff; color: #7e22ce; }
.type--SALIVA          { background: #dcfce7; color: #15803d; }

/* ── Collect time badges ──────────────────────────────────────────── */
.bio-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.bio-time-badge .pi { font-size: 0.65rem; }

.time--MORNING { background: #fef9c3; color: #854d0e; }
.time--DAILY   { background: #dbeafe; color: #1d4ed8; }
.time--EVENING { background: #e0e7ff; color: #4338ca; }
.time--RANDOM  { background: #f3f4f6; color: #4b5563; }

/* ── Paginator ────────────────────────────────────────────────────── */
.bio-paginator {
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
.detail-val--mono { font-family: monospace; }
.detail-val--desc {
  font-size: 0.875rem;
  font-weight: 400;
  color: #374151;
  text-align: right;
  line-height: 1.5;
}

/* ── Containers block ─────────────────────────────────────────────── */
.detail-containers-block {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.detail-containers-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #92400e;
}
.detail-containers-label .pi { font-size: 0.75rem; }

.detail-containers-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.container-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.container-chip:hover {
  background: #fde68a;
  border-color: #f59e0b;
}
</style>
