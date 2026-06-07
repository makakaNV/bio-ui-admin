<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="isEdit ? 'Редактировать биоматериал' : 'Новый биоматериал'"
    :style="{ width: '560px' }"
    modal
    :draggable="false"
    :closable="!loading"
  >
    <div class="form-body">

      <!-- ── Код ──────────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Код <span class="req">*</span></label>
        <input
          v-model="form.code"
          class="field-input"
          :class="{ 'field-input--error': errors.code }"
          placeholder="BIO-001"
          maxlength="100"
        />
        <span v-if="errors.code" class="field-error">{{ errors.code }}</span>
      </div>

      <!-- ── Тип ──────────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Тип биоматериала <span class="req">*</span></label>
        <div class="plate-grid" :class="{ 'plate-grid--error': errors.type }">
          <button
            v-for="t in TYPE_OPTIONS"
            :key="t.value"
            type="button"
            class="plate-btn"
            :class="{ 'plate-btn--active': form.type === t.value }"
            @click="form.type = t.value"
          >{{ t.label }}</button>
        </div>
        <span v-if="errors.type" class="field-error">{{ errors.type }}</span>
      </div>

      <!-- ── Время сбора ──────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Время сбора <span class="req">*</span></label>
        <div class="plate-grid" :class="{ 'plate-grid--error': errors.collectTime }">
          <button
            v-for="t in TIME_OPTIONS"
            :key="t.value"
            type="button"
            class="plate-btn"
            :class="{ 'plate-btn--active': form.collectTime === t.value }"
            @click="form.collectTime = t.value"
          >{{ t.label }}</button>
        </div>
        <span v-if="errors.collectTime" class="field-error">{{ errors.collectTime }}</span>
      </div>

      <!-- ── Описание ─────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Описание</label>
        <textarea
          v-model="form.description"
          class="field-textarea"
          :class="{ 'field-input--error': errors.description }"
          placeholder="Краткое описание биоматериала"
          rows="2"
          maxlength="300"
        />
        <span v-if="errors.description" class="field-error">{{ errors.description }}</span>
      </div>

      <!-- ── Контейнеры ───────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">Доступные контейнеры <span class="req">*</span></label>

        <div class="containers-section-label">Выбрано</div>
        <div class="containers-zone containers-zone--current">
          <div v-for="c in form.containers" :key="c.id" class="rb-wrap">
            <span class="container-chip-sel">{{ c.name }}</span>
            <button
              type="button"
              class="rb-action"
              :disabled="loading"
              @click="removeContainer(c)"
              title="Убрать контейнер"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <span v-if="!form.containers.length" class="containers-empty">Контейнеры не выбраны</span>
        </div>

        <div class="containers-section-label" style="margin-top: 0.625rem">Добавить контейнер</div>
        <div v-if="loadingContainers" class="containers-state">
          <i class="pi pi-spin pi-spinner" /> Загрузка контейнеров...
        </div>
        <template v-else>
          <input
            v-model="containerSearch"
            class="field-input field-input--sm"
            placeholder="Поиск по названию..."
          />
          <div class="containers-zone containers-zone--available">
            <button
              v-for="c in availableContainers"
              :key="c.id"
              type="button"
              class="rb-add"
              :disabled="loading"
              @click="addContainer(c)"
            >
              <i class="pi pi-plus" />{{ c.name }}
            </button>
            <span v-if="!availableContainers.length" class="containers-empty">
              {{ containerSearch.trim() ? 'Не найдено' : 'Все контейнеры уже добавлены' }}
            </span>
          </div>
        </template>

        <span v-if="errors.containers" class="field-error">{{ errors.containers }}</span>
      </div>

      <!-- ── Edit note ────────────────────────────────────────────── -->
      <div v-if="isEdit" class="edit-note">
        <i class="pi pi-info-circle" />
        Изменения применятся к активным исследованиям
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
          <span>{{ loading ? (isEdit ? 'Сохранение...' : 'Создание...') : (isEdit ? 'Сохранить изменения' : 'Создать биоматериал') }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import BiomaterialsService from '@/services/BiomaterialsService';
import ContainersService from '@/services/ContainersService';

const props = defineProps({
  visible:     { type: Boolean, required: true },
  biomaterial: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'created', 'updated']);

const isEdit = computed(() => !!props.biomaterial);

const TYPE_OPTIONS = [
  { value: 'VENOUS_BLOOD',    label: 'Венозная кровь' },
  { value: 'CAPILLARY_BLOOD', label: 'Капиллярная кровь' },
  { value: 'PLASMA',          label: 'Плазма' },
  { value: 'SALIVA',          label: 'Слюна' },
];

const TIME_OPTIONS = [
  { value: 'MORNING', label: 'Утром' },
  { value: 'DAILY',   label: 'Днем' },
  { value: 'EVENING', label: 'Вечером' },
  { value: 'RANDOM',  label: 'Произвольно' },
];

const loading     = ref(false);
const serverError = ref('');

const emptyForm = () => ({
  code:        '',
  type:        null,
  collectTime: null,
  description: '',
  containers:  [],
});

const form   = reactive(emptyForm());
const errors = reactive({});

// ── Container pool (загружается один раз при первом открытии) ─────
const containerPool     = ref([]);
const loadingContainers = ref(false);
const containerSearch   = ref('');

async function loadContainerPool() {
  if (containerPool.value.length) return;
  loadingContainers.value = true;
  try {
    const res = await ContainersService.getAll(0, 200);
    containerPool.value = res.data?.payload?.content ?? [];
  } catch {
    // список доступных для добавления контейнеров просто останется пустым
  } finally {
    loadingContainers.value = false;
  }
}

const availableContainers = computed(() => {
  const selectedIds = new Set(form.containers.map(c => c.id));
  let pool = containerPool.value.filter(c => !selectedIds.has(c.id));
  const q = containerSearch.value.trim().toLowerCase();
  if (q) pool = pool.filter(c => c.name?.toLowerCase().includes(q));
  return pool;
});

function addContainer(c) {
  if (!form.containers.some(x => x.id === c.id)) form.containers.push(c);
}

function removeContainer(c) {
  form.containers = form.containers.filter(x => x.id !== c.id);
}

// Reset / pre-fill on open
watch(() => props.visible, (val) => {
  if (val) {
    Object.keys(errors).forEach(k => delete errors[k]);
    serverError.value     = '';
    containerSearch.value = '';
    if (props.biomaterial) {
      const b = props.biomaterial;
      Object.assign(form, {
        code:        b.code        || '',
        type:        b.type        || null,
        collectTime: b.collectTime || null,
        description: b.description || '',
        containers:  [...(b.availableContainers ?? [])],
      });
    } else {
      Object.assign(form, emptyForm());
    }
    loadContainerPool();
  }
});

// ── Validation ────────────────────────────────────────────────────
function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);

  if (!form.code.trim())                      errors.code = 'Обязательное поле';
  else if (form.code.trim().length > 100)     errors.code = 'Не более 100 символов';

  if (!form.type)                             errors.type = 'Выберите тип биоматериала';
  if (!form.collectTime)                      errors.collectTime = 'Выберите время сбора';

  if (form.description.trim().length > 300)   errors.description = 'Не более 300 символов';

  if (!form.containers.length)                errors.containers = 'Добавьте хотя бы один контейнер';

  return Object.keys(errors).length === 0;
}

// ── Submit ────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return;
  loading.value     = true;
  serverError.value = '';

  const body = {
    code:                   form.code.trim(),
    type:                   form.type,
    collectTime:            form.collectTime,
    description:            form.description.trim() || undefined,
    availableContainersIds: form.containers.map(c => c.id),
  };

  try {
    const res   = isEdit.value
      ? await BiomaterialsService.update(props.biomaterial.id, body)
      : await BiomaterialsService.create(body);
    const saved = res.data?.payload;
    if (isEdit.value) emit('updated', saved);
    else              emit('created', saved);
    emit('update:visible', false);
  } catch (err) {
    const data = err.response?.data;

    if (data?.message === 'Validation failed' && data?.payload && typeof data.payload === 'object') {
      const MAP = {
        code:        'Некорректный код',
        description: 'Некорректное описание',
      };
      for (const [field, msg] of Object.entries(data.payload)) {
        errors[field] = MAP[field] || msg;
      }
      return;
    }

    const msg = data?.message || '';
    if (msg.toLowerCase().includes('code'))
      errors.code = 'Биоматериал с таким кодом уже существует';
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

/* ── Type / collect-time plates ───────────────────────────────────── */
.plate-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.plate-btn {
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.plate-btn:hover:not(.plate-btn--active) { background: #f9fafb; border-color: #d1d5db; }

.plate-btn--active {
  background: #9f1239;
  border-color: #9f1239;
  color: #fff;
}

.plate-grid--error .plate-btn { border-color: #fca5a5; }

/* ── Containers picker ────────────────────────────────────────────── */
.containers-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.containers-zone {
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

.containers-zone--current   { border-color: #e5e7eb; }
.containers-zone--available { background: #fff; border-color: #e5e7eb; max-height: 160px; overflow-y: auto; }

.containers-empty {
  font-size: 0.8125rem;
  color: #d1d5db;
  align-self: center;
}

.containers-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

.container-chip-sel {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
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

/* Add-container button */
.rb-add {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px dashed #fbbf24;
  background: transparent;
  color: #92400e;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
  opacity: 0.75;
}
.rb-add:hover:not(:disabled) { opacity: 1; background: #fef3c7; }
.rb-add:disabled { cursor: not-allowed; opacity: 0.35; }
.rb-add .pi { font-size: 0.6rem; }

/* ── Edit note ────────────────────────────────────────────────────── */
.edit-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #1d4ed8;
  line-height: 1.45;
}
.edit-note .pi { font-size: 0.85rem; flex-shrink: 0; margin-top: 1px; }

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
