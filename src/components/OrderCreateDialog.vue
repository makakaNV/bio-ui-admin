<template>
  <Dialog
    :visible="visible"
    @update:visible="onVisibilityChange"
    header="Новый заказ"
    :style="{ width: '660px' }"
    modal
    :draggable="false"
    :closable="!loading"
  >
    <div class="form-body">

      <!-- ── Пациент ──────────────────────────────────────────────── -->
      <div class="section">
        <div class="section-title">Пациент <span class="req">*</span></div>

        <div v-if="!form.patient" class="picker">
          <div class="picker-search">
            <i class="pi pi-search picker-search-icon" />
            <input
              v-model="patientPick.keyword"
              class="picker-search-input"
              placeholder="Поиск по ФИО, email или ID пациента..."
              @keyup.enter="searchPatients"
            />
            <button
              v-if="patientPick.keyword"
              class="picker-search-clear"
              @click="patientPick.keyword = ''; patientPick.results = []; patientPick.searched = false"
              title="Очистить"
            ><i class="pi pi-times" /></button>
          </div>

          <div v-if="patientPick.loading" class="picker-state">
            <i class="pi pi-spin pi-spinner" />Поиск...
          </div>
          <div v-else-if="patientPick.error" class="picker-state picker-state--error">
            <i class="pi pi-exclamation-triangle" />{{ patientPick.error }}
          </div>
          <div v-else-if="patientPick.searched && patientPick.results.length === 0" class="picker-state">
            <i class="pi pi-inbox" />Ничего не найдено
          </div>
          <div v-else-if="patientPick.results.length" class="picker-results">
            <div
              v-for="p in patientPick.results"
              :key="p.id"
              class="picker-result-row"
              @click="selectPatient(p)"
            >
              <div class="picker-result-main">
                <span class="picker-result-name">{{ fullName(p) }}</span>
                <span class="picker-result-meta">
                  <span v-if="p.snils">СНИЛС {{ p.snils }}</span>
                  <span v-if="p.snils && p.email"> · </span>
                  <span v-if="p.email">{{ p.email }}</span>
                </span>
              </div>
              <span class="picker-result-id">#{{ p.id }}</span>
            </div>
          </div>
        </div>

        <div v-else class="selected-patient">
          <div class="selected-patient-info">
            <span class="selected-patient-name">{{ fullName(form.patient) }}</span>
            <span class="selected-patient-meta">
              #{{ form.patient.id }}
              <template v-if="form.patient.snils"> · СНИЛС {{ form.patient.snils }}</template>
            </span>
          </div>
          <button type="button" class="btn-change-selection" @click="clearPatient">Изменить</button>
        </div>
        <span v-if="errors.patient" class="field-error">{{ errors.patient }}</span>

        <!-- Email конечного пользователя -->
        <div v-if="form.patient" class="field-group email-field">
          <label class="field-label">Email для заказа</label>
          <input
            v-model="form.email"
            type="email"
            class="field-input"
            :class="{ 'field-input--error': errors.email }"
            placeholder="client@example.ru"
          />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          <span v-else-if="emailWillUpdatePatient" class="field-hint field-hint--warn">
            <i class="pi pi-info-circle" />
            Email пациента будет обновлён на указанный перед созданием заказа
            (текущий: {{ form.patient.createdBy || '—' }})
          </span>
          <span v-else class="field-hint">Текущий владелец пациента: {{ form.patient.createdBy || '—' }}</span>
        </div>
      </div>

      <!-- ── Состав заказа ────────────────────────────────────────── -->
      <div class="section">
        <div class="section-title">Состав заказа <span class="req">*</span></div>

        <div class="picker">
          <div class="picker-search">
            <i class="pi pi-search picker-search-icon" />
            <input
              v-model="compSearch"
              class="picker-search-input"
              placeholder="Поиск анализов и комплексов по коду или названию..."
            />
            <button
              v-if="compSearch"
              class="picker-search-clear"
              @click="compSearch = ''"
              title="Очистить"
            ><i class="pi pi-times" /></button>
          </div>

          <div v-if="compPoolLoading" class="picker-state">
            <i class="pi pi-spin pi-spinner" />Загрузка каталога...
          </div>
          <div v-else-if="compPoolError" class="picker-state picker-state--error">
            <i class="pi pi-exclamation-triangle" />{{ compPoolError }}
          </div>
          <div v-else-if="compSearch.trim() && compResults.length === 0" class="picker-state">
            <i class="pi pi-inbox" />Ничего не найдено
          </div>
          <div v-else-if="compSearch.trim() && compResults.length" class="picker-results">
            <div
              v-for="r in compResults"
              :key="`${r.type}-${r.item.id}`"
              class="picker-result-row"
              @click="addCompositionItem(r)"
            >
              <span class="comp-type-badge" :class="`comp-type-badge--${r.type}`">
                {{ r.type === 'panel' ? 'Комплекс' : 'Анализ' }}
              </span>
              <div class="picker-result-main">
                <span class="picker-result-name">{{ r.item.code }} — {{ r.item.name }}</span>
                <span v-if="r.type === 'panel'" class="picker-result-meta">
                  Включает {{ (r.item.analyses ?? []).length }} анализ(ов)
                </span>
              </div>
              <i class="pi pi-plus picker-add-icon" />
            </div>
          </div>
        </div>

        <!-- Выбранный состав -->
        <div class="comp-selected">
          <div class="comp-selected-group">
            <span class="comp-selected-label">Анализы ({{ form.selectedAnalyses.length }})</span>
            <div class="comp-chips">
              <span
                v-for="a in form.selectedAnalyses"
                :key="a.id"
                class="comp-chip comp-chip--analysis"
                :title="a.name"
              >
                {{ a.code }}
                <i class="pi pi-times comp-chip-remove" @click="removeAnalysis(a.id)" />
              </span>
              <span v-if="!form.selectedAnalyses.length" class="comp-empty">Не выбрано</span>
            </div>
          </div>
          <div class="comp-selected-group">
            <span class="comp-selected-label">Комплексы ({{ form.selectedPanels.length }})</span>
            <div class="comp-chips">
              <span
                v-for="p in form.selectedPanels"
                :key="p.id"
                class="comp-chip comp-chip--panel"
                :title="`${p.name}. Включает: ${(p.analyses ?? []).map(a => a.code).join(', ') || '—'}`"
              >
                {{ p.code }}
                <i class="pi pi-times comp-chip-remove" @click="removePanel(p.id)" />
              </span>
              <span v-if="!form.selectedPanels.length" class="comp-empty">Не выбрано</span>
            </div>
          </div>
          <div class="comp-total">
            <span>Итого анализов в заказе: <strong>{{ compositionAnalyses.length }}</strong></span>
            <span>Сумма заказа: <strong>{{ formatSum(orderTotal) }}</strong></span>
          </div>
        </div>
        <span v-if="errors.composition" class="field-error">{{ errors.composition }}</span>
      </div>

      <!-- ── Комментарий ──────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Комментарий</label>
        <textarea
          v-model="form.comment"
          class="field-textarea"
          :class="{ 'field-input--error': errors.comment }"
          placeholder="Комментарий к заказу формируется автоматически и доступен для редактирования"
          rows="2"
          @input="commentEdited = true"
        />
        <span v-if="errors.comment" class="field-error">{{ errors.comment }}</span>
      </div>

      <!-- ── Server error ─────────────────────────────────────────── -->
      <div v-if="serverError" class="server-error">
        <i class="pi pi-exclamation-circle" />
        {{ serverError }}
      </div>

    </div>

    <template #footer>
      <div class="dlg-footer">
        <button type="button" class="btn-cancel" :disabled="loading" @click="$emit('update:visible', false)">
          Отмена
        </button>
        <button type="button" class="btn-submit" :disabled="loading" @click="submit">
          <i v-if="loading" class="pi pi-spin pi-spinner" />
          <span>{{ loading ? 'Создание...' : 'Создать заказ' }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import OrdersService   from '@/services/OrdersService';
import PatientService  from '@/services/PatientService';
import AnalysesService from '@/services/AnalysesService';
import PanelsService   from '@/services/PanelsService';

const props = defineProps({
  visible: { type: Boolean, required: true },
});

const emit = defineEmits(['update:visible', 'created']);

const loading     = ref(false);
const serverError = ref('');

const emptyForm = () => ({
  patient: null,
  email:   '',
  comment: '',
  selectedAnalyses: [],
  selectedPanels:   [],
});

const form   = reactive(emptyForm());
const errors = reactive({});

function onVisibilityChange(val) {
  emit('update:visible', val);
}

// ── Reset / load on open ──────────────────────────────────────────
watch(() => props.visible, (val) => {
  if (val) {
    Object.assign(form, emptyForm());
    Object.keys(errors).forEach(k => delete errors[k]);
    serverError.value   = '';
    commentEdited.value = false;
    patientPick.keyword  = '';
    patientPick.results  = [];
    patientPick.error    = '';
    patientPick.searched = false;
    compSearch.value = '';
    loadCompositionPools();
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function fullName(p) {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ') || '—';
}

// ── Patient picker ────────────────────────────────────────────────
const patientPick = reactive({ keyword: '', loading: false, results: [], error: '', searched: false });

async function searchPatients() {
  const raw = patientPick.keyword.trim();
  if (!raw) return;
  patientPick.loading = true;
  patientPick.error   = '';
  try {
    let results;
    if (/^\d+$/.test(raw)) {
      const res = await PatientService.getById(Number(raw));
      results = res.data?.payload ? [res.data.payload] : [];
    } else {
      const res = await PatientService.search({ keyword: raw, deleted: false });
      results = res.data?.payload?.content ?? [];
    }
    patientPick.results  = results;
    patientPick.searched = true;
  } catch {
    patientPick.error   = 'Не удалось выполнить поиск';
    patientPick.results = [];
  } finally {
    patientPick.loading = false;
  }
}

function selectPatient(p) {
  form.patient = p;
  form.email   = p.createdBy || p.email || '';
  patientPick.keyword  = '';
  patientPick.results  = [];
  patientPick.searched = false;
}

function clearPatient() {
  form.patient = null;
  form.email   = '';
}

const emailWillUpdatePatient = computed(() => {
  if (!form.patient) return false;
  const cur  = (form.patient.createdBy || '').trim().toLowerCase();
  const next = form.email.trim().toLowerCase();
  return !!next && next !== cur;
});

// ── Composition picker ────────────────────────────────────────────
const compSearch        = ref('');
const compPoolLoading   = ref(false);
const compPoolError     = ref('');
const analysisPool      = ref([]);
const panelPool         = ref([]);
let poolsLoaded = false;

async function loadCompositionPools() {
  if (poolsLoaded) return;
  compPoolLoading.value = true;
  compPoolError.value   = '';
  try {
    const [aRes, pRes] = await Promise.allSettled([
      AnalysesService.getAll(0, 200),
      PanelsService.getAll(0, 200),
    ]);
    analysisPool.value = aRes.status === 'fulfilled' ? (aRes.value.data?.payload?.content ?? []) : [];
    panelPool.value    = pRes.status === 'fulfilled' ? (pRes.value.data?.payload?.content ?? []) : [];
    if (aRes.status === 'rejected' || pRes.status === 'rejected') {
      compPoolError.value = 'Не удалось загрузить часть каталога анализов';
    } else {
      poolsLoaded = true;
    }
  } finally {
    compPoolLoading.value = false;
  }
}

const compResults = computed(() => {
  const q = compSearch.value.trim().toLowerCase();
  if (!q) return [];
  const selectedA = new Set(form.selectedAnalyses.map(a => a.id));
  const selectedP = new Set(form.selectedPanels.map(p => p.id));
  const matches = (item) => item.code?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q);

  const panels = panelPool.value
    .filter(p => !selectedP.has(p.id) && matches(p))
    .slice(0, 6)
    .map(item => ({ type: 'panel', item }));
  const analyses = analysisPool.value
    .filter(a => !selectedA.has(a.id) && matches(a))
    .slice(0, 6)
    .map(item => ({ type: 'analysis', item }));

  return [...panels, ...analyses];
});

function addCompositionItem(entry) {
  if (entry.type === 'analysis') {
    if (!form.selectedAnalyses.some(a => a.id === entry.item.id)) {
      form.selectedAnalyses.push({
        id: entry.item.id,
        code: entry.item.code,
        name: entry.item.name,
        price: entry.item.price,
      });
    }
  } else {
    if (!form.selectedPanels.some(p => p.id === entry.item.id)) {
      form.selectedPanels.push({
        id: entry.item.id,
        code: entry.item.code,
        name: entry.item.name,
        price: entry.item.price,
        discountPercent: entry.item.discountPercent,
        analyses: entry.item.analyses ?? [],
      });
    }
  }
  compSearch.value = '';
}

function removeAnalysis(id) {
  form.selectedAnalyses = form.selectedAnalyses.filter(a => a.id !== id);
}

function removePanel(id) {
  form.selectedPanels = form.selectedPanels.filter(p => p.id !== id);
}

// Order total — mirrors medstorm-portal cart pricing: panels are charged at
// their own (discounted) price, not the sum of the analyses inside them.
const orderTotal = computed(() => {
  let sum = 0;
  for (const a of form.selectedAnalyses) sum += (a.price || 0);
  for (const p of form.selectedPanels) {
    sum += p.discountPercent > 0 ? p.price * (1 - p.discountPercent / 100) : (p.price || 0);
  }
  return sum;
});

function formatSum(val) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2
  }).format(val || 0);
}

// Final analyses list = standalone + everything included in selected panels (deduped)
const compositionAnalyses = computed(() => {
  const map = new Map();
  for (const a of form.selectedAnalyses) map.set(a.id, a);
  for (const p of form.selectedPanels) {
    for (const a of (p.analyses ?? [])) {
      if (!map.has(a.id)) map.set(a.id, a);
    }
  }
  return [...map.values()];
});

// ── Auto-generated comment ────────────────────────────────────────
const commentEdited = ref(false);

function buildComment() {
  if (!form.patient?.snils || compositionAnalyses.value.length === 0) return '';
  const names = compositionAnalyses.value.map(a => a.name).filter(Boolean).join(', ');
  return `СНИЛС ${form.patient.snils} - ${names}`;
}

watch([() => form.patient, compositionAnalyses], () => {
  if (!commentEdited.value) form.comment = buildComment();
}, { deep: true });

// ── Validation ────────────────────────────────────────────────────
function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);

  if (!form.patient) errors.patient = 'Выберите пациента';
  if (compositionAnalyses.value.length === 0) errors.composition = 'Добавьте хотя бы один анализ или комплекс';

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Некорректный email';

  const commentLen = form.comment.trim().length;
  if (commentLen > 0 && commentLen < 5)    errors.comment = 'Минимум 5 символов';
  else if (commentLen > 1000)              errors.comment = 'Максимум 1000 символов';

  return Object.keys(errors).length === 0;
}

// ── Submit ────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return;
  loading.value     = true;
  serverError.value = '';

  try {
    const newEmail = form.email.trim();
    if (emailWillUpdatePatient.value) {
      await PatientService.changeUser(form.patient.id, newEmail);
    }

    const body = {
      patientId:   form.patient.id,
      analysesIds: compositionAnalyses.value.map(a => a.id),
      panelsIds:   form.selectedPanels.map(p => p.id),
      comment:     form.comment.trim() || undefined,
      email:       newEmail || undefined,
    };

    const res = await OrdersService.createForUser(body);
    emit('created', res.data?.payload);
    emit('update:visible', false);
  } catch (err) {
    serverError.value = err.response?.data?.message ?? 'Не удалось создать заказ. Попробуйте ещё раз.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ── Form layout ──────────────────────────────────────────────────── */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding: 0.25rem 0.25rem 0.25rem 0;
  max-height: 72vh;
  overflow-y: auto;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.req { color: #be123c; }

/* ── Field ────────────────────────────────────────────────────────── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.field-input,
.field-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: #111827;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
  box-sizing: border-box;
}
.field-input:focus,
.field-textarea:focus {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}
.field-input--error { border-color: #fca5a5; }

.field-textarea { resize: vertical; min-height: 52px; }

.field-error {
  font-size: 0.72rem;
  color: #be123c;
}

.field-hint {
  font-size: 0.72rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.field-hint--warn { color: #c2410c; }
.field-hint--warn .pi { font-size: 0.8rem; }

.email-field { margin-top: 0.25rem; }

/* ── Picker (search + results) ────────────────────────────────────── */
.picker {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  padding: 0 0.75rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.picker-search:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}

.picker-search-icon { color: #9ca3af; font-size: 0.8125rem; flex-shrink: 0; }

.picker-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  background: transparent;
  color: #111827;
  font-family: inherit;
}
.picker-search-input::placeholder { color: #9ca3af; }

.picker-search-clear {
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
.picker-search-clear:hover { color: #be123c; }
.picker-search-clear .pi { font-size: 0.7rem; }

.picker-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  color: #9ca3af;
}
.picker-state--error { color: #be123c; }

.picker-results {
  display: flex;
  flex-direction: column;
  border: 1px solid #f3f4f6;
  border-radius: 7px;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.picker-result-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f9fafb;
  transition: background 0.1s;
}
.picker-result-row:last-child { border-bottom: none; }
.picker-result-row:hover { background: #fafafa; }

.picker-result-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.picker-result-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-result-meta {
  font-size: 0.72rem;
  color: #9ca3af;
}

.picker-result-id {
  font-family: monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: #9ca3af;
  flex-shrink: 0;
}

.picker-add-icon {
  font-size: 0.7rem;
  color: #9f1239;
  flex-shrink: 0;
}

.comp-type-badge {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
}
.comp-type-badge--analysis { background: #dbeafe; color: #1e40af; }
.comp-type-badge--panel    { background: #ede9fe; color: #5b21b6; }

/* ── Selected patient ─────────────────────────────────────────────── */
.selected-patient {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  padding: 0.625rem 0.875rem;
}

.selected-patient-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.selected-patient-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.selected-patient-meta {
  font-size: 0.75rem;
  color: #9ca3af;
}

.btn-change-selection {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: #9f1239;
  font-family: inherit;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.12s;
}
.btn-change-selection:hover { color: #be123c; }

/* ── Selected composition ─────────────────────────────────────────── */
.comp-selected {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  border: 1px solid #f3f4f6;
  border-radius: 7px;
  padding: 0.75rem 0.875rem;
}

.comp-selected-group {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.comp-selected-label {
  flex-shrink: 0;
  min-width: 96px;
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 0.2rem;
}

.comp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.comp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.175rem 0.55rem;
  border-radius: 5px;
  font-size: 0.76rem;
  font-weight: 700;
  font-family: monospace;
}

.comp-chip--analysis { background: #dbeafe; color: #1e40af; }
.comp-chip--panel    { background: #ede9fe; color: #5b21b6; }

.comp-chip-remove {
  font-size: 0.6rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.12s;
}
.comp-chip-remove:hover { opacity: 1; }

.comp-empty {
  font-size: 0.8125rem;
  color: #d1d5db;
}

.comp-total {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.78rem;
  color: #6b7280;
  border-top: 1px dashed #f3f4f6;
  padding-top: 0.5rem;
}
.comp-total strong { color: #111827; }

/* ── Server error ─────────────────────────────────────────────────── */
.server-error {
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

/* ── Footer ───────────────────────────────────────────────────────── */
.dlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  width: 100%;
}

.btn-cancel {
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
.btn-cancel:hover:not(:disabled) { background: #f9fafb; }
.btn-cancel:disabled { opacity: 0.55; cursor: default; }

.btn-submit {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 7px;
  background: #9f1239;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
}
.btn-submit:hover:not(:disabled) { background: #be123c; }
.btn-submit:disabled { opacity: 0.55; cursor: default; }
</style>
