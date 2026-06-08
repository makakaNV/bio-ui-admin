<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="isEdit ? 'Редактировать исследование' : 'Новое исследование'"
    :style="{ width: '680px' }"
    modal
    :draggable="false"
    :closable="!loading"
  >
    <div class="form-body">

      <!-- ── Название + код ───────────────────────────────────────── -->
      <div class="form-row-2">
        <div class="field-group">
          <label class="field-label">Название <span class="req">*</span></label>
          <input
            v-model="form.name"
            class="field-input"
            :class="{ 'field-input--error': errors.name }"
            placeholder="Комплекс «Здоровье печени»"
            maxlength="120"
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="field-group">
          <label class="field-label">Код <span class="req">*</span></label>
          <input
            v-model="form.code"
            class="field-input"
            :class="{ 'field-input--error': errors.code }"
            placeholder="PANEL-LIVER"
            maxlength="30"
          />
          <span v-if="errors.code" class="field-error">{{ errors.code }}</span>
        </div>
      </div>

      <!-- ── Скидка ───────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Скидка, %</label>
        <input
          v-model.number="form.discountPercent"
          type="number"
          class="field-input field-input--narrow"
          :class="{ 'field-input--error': errors.discountPercent }"
          placeholder="0"
          min="0"
          max="100"
          step="1"
        />
        <span v-if="errors.discountPercent" class="field-error">{{ errors.discountPercent }}</span>
      </div>

      <!-- ── Описание ─────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Описание</label>
        <textarea
          v-model="form.description"
          class="field-textarea"
          :class="{ 'field-input--error': errors.description }"
          placeholder="Краткое описание исследования"
          rows="2"
          maxlength="500"
        />
        <span v-if="errors.description" class="field-error">{{ errors.description }}</span>
      </div>

      <!-- ── Группа (выбирается одна) ─────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Группа комплексов</label>

        <div class="picker-section-label">Выбрана</div>
        <div class="picker-zone picker-zone--current">
          <div v-if="form.group" class="rb-wrap">
            <span class="group-chip-sel">
              <span class="group-chip-code">{{ form.group.code }}</span>{{ form.group.name }}
            </span>
            <button
              type="button"
              class="rb-action"
              :disabled="loading"
              @click="form.group = null"
              title="Убрать группу"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <span v-else class="picker-empty">Группа не выбрана</span>
        </div>

        <div class="picker-section-label" style="margin-top: 0.625rem">Выбрать группу</div>
        <div v-if="loadingGroups" class="picker-state">
          <i class="pi pi-spin pi-spinner" /> Загрузка групп...
        </div>
        <template v-else>
          <input
            v-model="groupSearch"
            class="field-input field-input--sm"
            placeholder="Поиск по коду или названию..."
          />
          <div class="picker-zone picker-zone--available">
            <button
              v-for="g in availableGroups"
              :key="g.id"
              type="button"
              class="rb-add"
              :disabled="loading"
              @click="form.group = g"
            >
              <i class="pi pi-plus" /><span class="group-chip-code">{{ g.code }}</span>{{ g.name }}
            </button>
            <span v-if="!availableGroups.length" class="picker-empty">
              {{ groupSearch.trim() ? 'Не найдено' : 'Нет других групп' }}
            </span>
          </div>
        </template>
      </div>

      <!-- ── Анализы в составе (несколько) ─────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Анализы в составе <span class="req">*</span></label>

        <div class="picker-section-label">Выбрано ({{ form.analyses.length }})</div>
        <div class="picker-zone picker-zone--current">
          <div v-for="a in form.analyses" :key="a.id" class="rb-wrap">
            <span class="analysis-chip-sel">
              <span class="analysis-chip-code">{{ a.code }}</span>{{ a.name }}
            </span>
            <button
              type="button"
              class="rb-action"
              :disabled="loading"
              @click="removeAnalysis(a)"
              title="Убрать анализ"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <span v-if="!form.analyses.length" class="picker-empty">Анализы не выбраны</span>
        </div>

        <div class="picker-section-label" style="margin-top: 0.625rem">Добавить анализ</div>

        <!-- Category filter -->
        <div class="analysis-cat-filter">
          <button
            type="button"
            class="cat-chip"
            :class="{ 'cat-chip--active': selectedAnalysisCategory === null }"
            @click="selectAnalysisCategory(null)"
          >Все</button>
          <button
            v-for="c in analysisCategories"
            :key="c.id"
            type="button"
            class="cat-chip"
            :class="{ 'cat-chip--active': selectedAnalysisCategory?.id === c.id }"
            @click="selectAnalysisCategory(c)"
          >{{ c.name }}</button>
        </div>

        <!-- Keyword search -->
        <div class="analysis-search">
          <i class="pi pi-search" />
          <input
            v-model="analysisKeyword"
            class="analysis-search-input"
            placeholder="Поиск по названию, коду или описанию..."
            @keyup.enter="searchAnalysisPool"
          />
          <button v-if="analysisKeyword" class="analysis-search-clear" @click="clearAnalysisSearch" title="Сбросить поиск">
            <i class="pi pi-times" />
          </button>
          <button class="analysis-search-btn" type="button" :disabled="loadingAnalysisPool" @click="searchAnalysisPool">
            Найти
          </button>
        </div>

        <div v-if="loadingAnalysisPool" class="picker-state">
          <i class="pi pi-spin pi-spinner" /> Загрузка анализов...
        </div>
        <div v-else class="picker-zone picker-zone--analyses">
          <button
            v-for="a in availableAnalysesPool"
            :key="a.id"
            type="button"
            class="analysis-add-row"
            :disabled="loading"
            @click="addAnalysis(a)"
          >
            <i class="pi pi-plus analysis-add-icon" />
            <span class="analysis-chip-code">{{ a.code }}</span>
            <span class="analysis-add-name" :title="a.name">{{ a.name }}</span>
            <span class="analysis-add-price">{{ formatPrice(a.price) }}</span>
          </button>
          <span v-if="!availableAnalysesPool.length" class="picker-empty">
            {{ analysisKeyword.trim() ? 'Не найдено' : 'Нет доступных анализов' }}
          </span>
        </div>

        <span v-if="errors.analyses" class="field-error">{{ errors.analyses }}</span>
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
          <span>{{ loading ? (isEdit ? 'Сохранение...' : 'Создание...') : (isEdit ? 'Сохранить изменения' : 'Создать исследование') }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import PanelsService   from '@/services/PanelsService';
import AnalysesService from '@/services/AnalysesService';

const props = defineProps({
  visible: { type: Boolean, required: true },
  panel:   { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'created', 'updated']);

const isEdit = computed(() => !!props.panel);

const loading     = ref(false);
const serverError = ref('');

const emptyForm = () => ({
  name:            '',
  code:            '',
  description:     '',
  discountPercent: '',
  group:           null,   // { id, code, name } | null
  analyses:        [],     // [{ id, code, name, price, ... }]
});

const form   = reactive(emptyForm());
const errors = reactive({});

function formatPrice(price) {
  if (price == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0
  }).format(price);
}

// ── Group pool (panels-group) ──────────────────────────────────────
const groupPool      = ref([]);
const loadingGroups  = ref(false);
const groupSearch    = ref('');

async function loadGroupPool() {
  if (groupPool.value.length) return;
  loadingGroups.value = true;
  try {
    const res = await PanelsService.getAllGroups(0, 100);
    groupPool.value = res.data?.payload?.content ?? [];
  } catch {
    // список доступных групп просто останется пустым
  } finally {
    loadingGroups.value = false;
  }
}

const availableGroups = computed(() => {
  let pool = groupPool.value.filter(g => g.code !== form.group?.code);
  const q = groupSearch.value.trim().toLowerCase();
  if (q) pool = pool.filter(g => g.code?.toLowerCase().includes(q) || g.name?.toLowerCase().includes(q));
  return pool;
});

// ── Analysis categories (для фильтра при подборе анализов) ─────────
const analysisCategories       = ref([]);
const selectedAnalysisCategory = ref(null);  // null = "Все"
const analysisKeyword          = ref('');
const analysisPool             = ref([]);
const loadingAnalysisPool      = ref(false);

async function loadAnalysisCategories() {
  try {
    const res = await AnalysesService.getAllCategories(0, 100);
    analysisCategories.value = res.data?.payload?.content ?? [];
  } catch {
    // некритично — фильтр по категориям просто не появится
  }
}

async function loadAnalysisPool() {
  loadingAnalysisPool.value = true;
  try {
    const res = selectedAnalysisCategory.value
      ? await AnalysesService.getByCategoryCode(selectedAnalysisCategory.value.code, 0, 100)
      : await AnalysesService.getAll(0, 100);
    analysisPool.value = res.data?.payload?.content ?? [];
  } catch {
    analysisPool.value = [];
  } finally {
    loadingAnalysisPool.value = false;
  }
}

async function searchAnalysisPool() {
  const keyword = analysisKeyword.value.trim();
  if (!keyword) { await loadAnalysisPool(); return; }

  loadingAnalysisPool.value = true;
  try {
    const res = await AnalysesService.search({ keyword }, 0, 50);
    analysisPool.value = res.data?.payload?.content ?? [];
  } catch {
    analysisPool.value = [];
  } finally {
    loadingAnalysisPool.value = false;
  }
}

function clearAnalysisSearch() {
  analysisKeyword.value = '';
  loadAnalysisPool();
}

function selectAnalysisCategory(cat) {
  selectedAnalysisCategory.value = cat;
  analysisKeyword.value          = '';
  loadAnalysisPool();
}

const availableAnalysesPool = computed(() => {
  const selectedIds = new Set(form.analyses.map(a => a.id));
  return analysisPool.value.filter(a => !selectedIds.has(a.id));
});

function addAnalysis(a) {
  if (!form.analyses.some(x => x.id === a.id)) form.analyses.push(a);
}

function removeAnalysis(a) {
  form.analyses = form.analyses.filter(x => x.id !== a.id);
}

// Reset / pre-fill on open
watch(() => props.visible, async (val) => {
  if (!val) return;

  Object.keys(errors).forEach(k => delete errors[k]);
  serverError.value              = '';
  groupSearch.value              = '';
  analysisKeyword.value          = '';
  selectedAnalysisCategory.value = null;

  if (props.panel) {
    const p = props.panel;
    Object.assign(form, {
      name:            p.name        || '',
      code:            p.code        || '',
      description:     p.description || '',
      discountPercent: p.discountPercent ?? '',
      group:           p.groupCode ? { code: p.groupCode, name: p.groupCode } : null,
      analyses:        Array.isArray(p.analyses) ? [...p.analyses] : [],
    });
  } else {
    Object.assign(form, emptyForm());
  }

  await Promise.all([loadGroupPool(), loadAnalysisCategories(), loadAnalysisPool()]);

  if (props.panel && form.group) {
    const found = groupPool.value.find(g => g.code === form.group.code);
    if (found) form.group = found;
  }
});

// ── Validation ────────────────────────────────────────────────────
function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);

  const name = form.name.trim();
  if (!name)                              errors.name = 'Обязательное поле';
  else if (name.length < 2 || name.length > 120) errors.name = 'От 2 до 120 символов';

  const code = form.code.trim();
  if (!code)                              errors.code = 'Обязательное поле';
  else if (code.length < 2 || code.length > 30)  errors.code = 'От 2 до 30 символов';

  const desc = form.description.trim();
  if (desc && desc.length > 500) errors.description = 'До 500 символов';

  if (form.discountPercent !== '' && form.discountPercent != null) {
    const dp = Number(form.discountPercent);
    if (!Number.isInteger(dp) || dp < 0 || dp > 100) errors.discountPercent = 'От 0 до 100';
  }

  if (!form.analyses.length) errors.analyses = 'Добавьте хотя бы один анализ';

  return Object.keys(errors).length === 0;
}

// ── Submit ────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return;
  loading.value     = true;
  serverError.value = '';

  const body = {
    name:            form.name.trim(),
    code:            form.code.trim(),
    description:     form.description.trim() || undefined,
    groupCode:       form.group?.code || undefined,
    discountPercent: form.discountPercent === '' ? undefined : Number(form.discountPercent),
    analysesIds:     form.analyses.map(a => a.id),
  };

  try {
    const res   = isEdit.value
      ? await PanelsService.update(props.panel.id, body)
      : await PanelsService.create(body);
    const saved = res.data?.payload;
    if (isEdit.value) emit('updated', saved);
    else              emit('created', saved);
    emit('update:visible', false);
  } catch (err) {
    const data = err.response?.data;

    if (data?.message === 'Validation failed' && data?.payload && typeof data.payload === 'object') {
      const MAP = {
        name:            'Некорректное название',
        code:            'Некорректный код',
        description:     'Некорректное описание',
        discountPercent: 'Некорректный процент скидки',
        analysesIds:     'Некорректный список анализов',
      };
      for (const [field, msg] of Object.entries(data.payload)) {
        const key = field === 'analysesIds' ? 'analyses' : field;
        errors[key] = MAP[field] || msg;
      }
      return;
    }

    const msg = data?.message || '';
    if (msg.toLowerCase().includes('code'))
      errors.code = 'Исследование с таким кодом уже существует';
    else
      serverError.value = msg || 'Произошла ошибка. Попробуйте ещё раз.';
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
  gap: 1rem;
  padding: 0.25rem 0 0.25rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

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

.req { color: #be123c; }

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
.field-input--narrow { max-width: 140px; }

.field-textarea { resize: vertical; min-height: 52px; }

.field-input--sm { margin-bottom: 0.5rem; }

.field-error {
  font-size: 0.72rem;
  color: #be123c;
}

/* ── Pickers (группа / анализы) ────────────────────────────────────── */
.picker-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.picker-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0.625rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.picker-zone--current   { border-color: #e5e7eb; }
.picker-zone--available { background: #fff; border-color: #e5e7eb; max-height: 160px; overflow-y: auto; }

.picker-empty {
  font-size: 0.8125rem;
  color: #d1d5db;
  align-self: center;
}

.picker-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

/* Selected group chip */
.group-chip-sel {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  background: #fff1f2;
  color: #9f1239;
  border: 1px solid #fecdd3;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.group-chip-code {
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(159,18,57,.09);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
}

/* Removable chip wrapper (наводимая кнопка-крестик) */
.rb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
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
  flex-shrink: 0;
}
.rb-wrap:hover .rb-action { opacity: 1; }
.rb-action:disabled { cursor: not-allowed; }
.rb-action .pi { font-size: 0.55rem; }

/* Add button (группа) */
.rb-add {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px dashed #d1d5db;
  background: transparent;
  color: #6b7280;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s, border-color 0.15s, color 0.15s;
  opacity: 0.8;
}
.rb-add:hover:not(:disabled) { opacity: 1; background: #f9fafb; border-color: #9ca3af; color: #374151; }
.rb-add:disabled { cursor: not-allowed; opacity: 0.35; }
.rb-add .pi { font-size: 0.6rem; }

/* ── Analyses picker ──────────────────────────────────────────────── */
.analysis-chip-sel {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 280px;
  padding: 0.25rem 0.75rem;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analysis-chip-code {
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(29,78,216,.09);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
}
.group-chip-sel .analysis-chip-code,
.analysis-chip-sel .analysis-chip-code { background: rgba(29,78,216,.09); }

.analysis-cat-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.cat-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.76rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.cat-chip:hover         { border-color: #9f1239; color: #9f1239; }
.cat-chip--active       { background: #9f1239; color: #fff; border-color: #9f1239; }
.cat-chip--active:hover { background: #881337; border-color: #881337; }

.analysis-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 0.75rem;
  height: 40px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.analysis-search:focus-within {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}
.analysis-search > .pi-search { color: #9ca3af; font-size: 0.875rem; flex-shrink: 0; }

.analysis-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.8375rem;
  background: transparent;
  color: #111827;
  font-family: inherit;
  min-width: 0;
}
.analysis-search-input::placeholder { color: #9ca3af; }

.analysis-search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  padding: 0 0.125rem;
  flex-shrink: 0;
  transition: color 0.15s;
}
.analysis-search-clear:hover { color: #be123c; }
.analysis-search-clear .pi { font-size: 0.7rem; }

.analysis-search-btn {
  flex-shrink: 0;
  padding: 0.35rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background: #9f1239;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.analysis-search-btn:hover:not(:disabled) { background: #be123c; }
.analysis-search-btn:disabled { opacity: 0.55; cursor: default; }

/* Большая зона подбора анализов — строго вертикальный список без переноса в колонки */
.picker-zone--analyses {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  border-color: #e5e7eb;
  gap: 0.3rem;
}

.analysis-add-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.625rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #374151;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s, border-color 0.12s;
}
.analysis-add-row:hover:not(:disabled) { background: #f9fafb; border-color: #e5e7eb; }
.analysis-add-row:disabled { cursor: not-allowed; opacity: 0.4; }

.analysis-add-icon {
  font-size: 0.7rem;
  color: #9ca3af;
  flex-shrink: 0;
}
.analysis-add-row:hover:not(:disabled) .analysis-add-icon { color: #9f1239; }

.analysis-add-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8375rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-add-price {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
}

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
