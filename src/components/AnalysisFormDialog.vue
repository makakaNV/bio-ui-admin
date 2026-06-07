<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="isEdit ? 'Редактировать анализ' : 'Новый анализ'"
    :style="{ width: '600px' }"
    modal
    :draggable="false"
    :closable="!loading"
  >
    <div class="form-body">

      <!-- ── Название + номенклатурный код ────────────────────────── -->
      <div class="form-row-2">
        <div class="field-group">
          <label class="field-label">Название <span class="req">*</span></label>
          <input
            v-model="form.name"
            class="field-input"
            :class="{ 'field-input--error': errors.name }"
            placeholder="Общий анализ крови"
            maxlength="120"
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="field-group">
          <label class="field-label">Номенклатурный код <span class="req">*</span></label>
          <input
            v-model="form.code"
            class="field-input"
            :class="{ 'field-input--error': errors.code }"
            placeholder="A09.05.001"
            maxlength="30"
          />
          <span v-if="errors.code" class="field-error">{{ errors.code }}</span>
        </div>
      </div>

      <!-- ── Стоимость ────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Стоимость, ₽ <span class="req">*</span></label>
        <input
          v-model.number="form.price"
          type="number"
          class="field-input"
          :class="{ 'field-input--error': errors.price }"
          placeholder="1500"
          min="0.01"
          max="1000000"
          step="0.01"
        />
        <span v-if="errors.price" class="field-error">{{ errors.price }}</span>
      </div>

      <!-- ── Описание ─────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Описание</label>
        <textarea
          v-model="form.description"
          class="field-textarea"
          :class="{ 'field-input--error': errors.description }"
          placeholder="Краткое описание анализа"
          rows="2"
          maxlength="500"
        />
        <span v-if="errors.description" class="field-error">{{ errors.description }}</span>
      </div>

      <!-- ── Категория (выбирается одна) ──────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Категория</label>

        <div class="picker-section-label">Выбрана</div>
        <div class="picker-zone picker-zone--current">
          <div v-if="form.category" class="rb-wrap">
            <span class="category-chip-sel">
              <span class="category-chip-code">{{ form.category.code }}</span>{{ form.category.name }}
            </span>
            <button
              type="button"
              class="rb-action"
              :disabled="loading"
              @click="form.category = null"
              title="Убрать категорию"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <span v-else class="picker-empty">Категория не выбрана</span>
        </div>

        <div class="picker-section-label" style="margin-top: 0.625rem">Выбрать категорию</div>
        <div v-if="loadingCategories" class="picker-state">
          <i class="pi pi-spin pi-spinner" /> Загрузка категорий...
        </div>
        <template v-else>
          <input
            v-model="categorySearch"
            class="field-input field-input--sm"
            placeholder="Поиск по коду или названию..."
          />
          <div class="picker-zone picker-zone--available">
            <button
              v-for="c in availableCategories"
              :key="c.id"
              type="button"
              class="rb-add"
              :disabled="loading"
              @click="form.category = c"
            >
              <i class="pi pi-plus" /><span class="category-chip-code">{{ c.code }}</span>{{ c.name }}
            </button>
            <span v-if="!availableCategories.length" class="picker-empty">
              {{ categorySearch.trim() ? 'Не найдено' : 'Нет других категорий' }}
            </span>
          </div>
        </template>
      </div>

      <!-- ── Доступные биоматериалы (несколько) ───────────────────── -->
      <div class="field-group">
        <label class="field-label">Доступные биоматериалы <span class="req">*</span></label>

        <div class="picker-section-label">Выбрано</div>
        <div class="picker-zone picker-zone--current">
          <div v-for="b in form.biomaterials" :key="b.id" class="rb-wrap">
            <span class="bio-chip-sel">{{ b.code }}</span>
            <button
              type="button"
              class="rb-action"
              :disabled="loading"
              @click="removeBiomaterial(b)"
              title="Убрать биоматериал"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <span v-if="prefillLoading" class="picker-state"><i class="pi pi-spin pi-spinner" /> Загрузка...</span>
          <span v-else-if="!form.biomaterials.length" class="picker-empty">Биоматериалы не выбраны</span>
        </div>

        <div class="picker-section-label" style="margin-top: 0.625rem">Добавить биоматериал</div>
        <div v-if="loadingBiomaterials" class="picker-state">
          <i class="pi pi-spin pi-spinner" /> Загрузка биоматериалов...
        </div>
        <template v-else>
          <input
            v-model="biomaterialSearch"
            class="field-input field-input--sm"
            placeholder="Поиск по коду..."
          />
          <div class="picker-zone picker-zone--available">
            <button
              v-for="b in availableBiomaterials"
              :key="b.id"
              type="button"
              class="rb-add"
              :disabled="loading"
              @click="addBiomaterial(b)"
            >
              <i class="pi pi-plus" />{{ b.code }}
            </button>
            <span v-if="!availableBiomaterials.length" class="picker-empty">
              {{ biomaterialSearch.trim() ? 'Не найдено' : 'Все биоматериалы уже добавлены' }}
            </span>
          </div>
        </template>

        <span v-if="errors.biomaterials" class="field-error">{{ errors.biomaterials }}</span>
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
          <span>{{ loading ? (isEdit ? 'Сохранение...' : 'Создание...') : (isEdit ? 'Сохранить изменения' : 'Создать анализ') }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import AnalysesService from '@/services/AnalysesService';
import BiomaterialsService from '@/services/BiomaterialsService';

const props = defineProps({
  visible:  { type: Boolean, required: true },
  analysis: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'created', 'updated']);

const isEdit = computed(() => !!props.analysis);

const loading       = ref(false);
const serverError   = ref('');
const prefillLoading = ref(false);

const emptyForm = () => ({
  name:         '',
  code:         '',
  description:  '',
  price:        '',
  category:     null,   // { id, code, name } | null
  biomaterials: [],     // [{ id, code, ... }]
});

const form   = reactive(emptyForm());
const errors = reactive({});

// ── Category pool (загружается один раз) ──────────────────────────
const categoryPool      = ref([]);
const loadingCategories = ref(false);
const categorySearch    = ref('');

async function loadCategoryPool() {
  if (categoryPool.value.length) return;
  loadingCategories.value = true;
  try {
    const res = await AnalysesService.getAllCategories(0, 100);
    categoryPool.value = res.data?.payload?.content ?? [];
  } catch {
    // список доступных категорий просто останется пустым
  } finally {
    loadingCategories.value = false;
  }
}

const availableCategories = computed(() => {
  let pool = categoryPool.value.filter(c => c.code !== form.category?.code);
  const q = categorySearch.value.trim().toLowerCase();
  if (q) pool = pool.filter(c => c.code?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
  return pool;
});

// ── Biomaterial pool (загружается один раз) ───────────────────────
const biomaterialPool      = ref([]);
const loadingBiomaterials  = ref(false);
const biomaterialSearch    = ref('');

async function loadBiomaterialPool() {
  if (biomaterialPool.value.length) return;
  loadingBiomaterials.value = true;
  try {
    const res = await BiomaterialsService.getAll(0, 200);
    biomaterialPool.value = res.data?.payload?.content ?? [];
  } catch {
    // список доступных биоматериалов просто останется пустым
  } finally {
    loadingBiomaterials.value = false;
  }
}

const availableBiomaterials = computed(() => {
  const selectedIds = new Set(form.biomaterials.map(b => b.id));
  let pool = biomaterialPool.value.filter(b => !selectedIds.has(b.id));
  const q = biomaterialSearch.value.trim().toLowerCase();
  if (q) pool = pool.filter(b => b.code?.toLowerCase().includes(q));
  return pool;
});

function addBiomaterial(b) {
  if (!form.biomaterials.some(x => x.id === b.id)) form.biomaterials.push(b);
}

function removeBiomaterial(b) {
  form.biomaterials = form.biomaterials.filter(x => x.id !== b.id);
}

// Reset / pre-fill on open
watch(() => props.visible, async (val) => {
  if (!val) return;

  Object.keys(errors).forEach(k => delete errors[k]);
  serverError.value       = '';
  categorySearch.value    = '';
  biomaterialSearch.value = '';
  prefillLoading.value    = false;

  if (props.analysis) {
    const a = props.analysis;
    Object.assign(form, {
      name:         a.name        || '',
      code:         a.code        || '',
      description:  a.description || '',
      price:        a.price ?? '',
      category:     a.categoryCode ? { code: a.categoryCode, name: a.categoryCode } : null,
      biomaterials: [],
    });
  } else {
    Object.assign(form, emptyForm());
  }

  await Promise.all([loadCategoryPool(), loadBiomaterialPool()]);

  if (props.analysis) {
    if (form.category) {
      const found = categoryPool.value.find(c => c.code === form.category.code);
      if (found) form.category = found;
    }

    prefillLoading.value = true;
    try {
      const res   = await AnalysesService.getAvailableBiomaterials(props.analysis.id);
      const codes = res.data?.payload ?? [];
      form.biomaterials = codes
        .map(code => biomaterialPool.value.find(b => b.code === code))
        .filter(Boolean);
    } catch {
      // не критично — список можно будет заполнить вручную
    } finally {
      prefillLoading.value = false;
    }
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
  if (desc && (desc.length < 2 || desc.length > 500)) errors.description = 'От 2 до 500 символов';

  const price = Number(form.price);
  if (form.price === '' || form.price == null || isNaN(price)) errors.price = 'Обязательное поле';
  else if (price < 0.01 || price > 1000000)                    errors.price = 'От 0,01 до 1 000 000 ₽';

  if (!form.biomaterials.length)          errors.biomaterials = 'Добавьте хотя бы один биоматериал';

  return Object.keys(errors).length === 0;
}

// ── Submit ────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return;
  loading.value     = true;
  serverError.value = '';

  const body = {
    name:                     form.name.trim(),
    code:                     form.code.trim(),
    description:              form.description.trim() || undefined,
    categoryCode:             form.category?.code || undefined,
    availableBiomaterialsIds: form.biomaterials.map(b => b.id),
    price:                    Number(form.price),
  };

  try {
    const res   = isEdit.value
      ? await AnalysesService.update(props.analysis.id, body)
      : await AnalysesService.create(body);
    const saved = res.data?.payload;
    if (isEdit.value) emit('updated', saved);
    else              emit('created', saved);
    emit('update:visible', false);
  } catch (err) {
    const data = err.response?.data;

    if (data?.message === 'Validation failed' && data?.payload && typeof data.payload === 'object') {
      const MAP = {
        name:        'Некорректное название',
        code:        'Некорректный код',
        description: 'Некорректное описание',
        price:       'Некорректная стоимость',
      };
      for (const [field, msg] of Object.entries(data.payload)) {
        errors[field] = MAP[field] || msg;
      }
      return;
    }

    const msg = data?.message || '';
    if (msg.toLowerCase().includes('code'))
      errors.code = 'Анализ с таким кодом уже существует';
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
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 0.25rem;
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

.field-textarea { resize: vertical; min-height: 52px; }

.field-input--sm { margin-bottom: 0.5rem; }

.field-error {
  font-size: 0.72rem;
  color: #be123c;
}

/* ── Pickers (категория / биоматериалы) ───────────────────────────── */
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

/* Selected category chip */
.category-chip-sel {
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

.category-chip-code {
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(159,18,57,.09);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
}

/* Selected biomaterial chip */
.bio-chip-sel {
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
  white-space: nowrap;
}

/* Removable chip wrapper (наводимая кнопка-крестик) */
.rb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
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
}
.rb-wrap:hover .rb-action { opacity: 1; }
.rb-action:disabled { cursor: not-allowed; }
.rb-action .pi { font-size: 0.55rem; }

/* Add button (категория / биоматериал) */
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
