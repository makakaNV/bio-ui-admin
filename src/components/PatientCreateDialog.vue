<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="isEdit ? 'Редактировать пациента' : 'Новый пациент'"
    :style="{ width: '540px' }"
    modal
    :draggable="false"
    :closable="!loading"
  >
    <div class="form-body">

      <!-- ── ФИО ──────────────────────────────────────────────────── -->
      <div class="form-row-3">
        <div class="field-group">
          <label class="field-label">Фамилия <span class="req">*</span></label>
          <input
            v-model="form.lastName"
            class="field-input"
            :class="{ 'field-input--error': errors.lastName }"
            placeholder="Иванов"
          />
          <span v-if="errors.lastName" class="field-error">{{ errors.lastName }}</span>
        </div>
        <div class="field-group">
          <label class="field-label">Имя <span class="req">*</span></label>
          <input
            v-model="form.firstName"
            class="field-input"
            :class="{ 'field-input--error': errors.firstName }"
            placeholder="Иван"
          />
          <span v-if="errors.firstName" class="field-error">{{ errors.firstName }}</span>
        </div>
        <div class="field-group">
          <label class="field-label">Отчество</label>
          <input v-model="form.middleName" class="field-input" placeholder="Иванович" />
        </div>
      </div>

      <!-- ── Дата рождения + Пол ──────────────────────────────────── -->
      <div class="form-row-2">
        <div class="field-group">
          <label class="field-label">Дата рождения <span class="req">*</span></label>
          <input
            v-model="form.birthDate"
            type="date"
            class="field-input"
            :class="{ 'field-input--error': errors.birthDate }"
            :max="today"
          />
          <span v-if="errors.birthDate" class="field-error">{{ errors.birthDate }}</span>
        </div>
        <div class="field-group">
          <label class="field-label">Пол <span class="req">*</span></label>
          <div class="bool-toggle" :class="{ 'bool-toggle--error': errors.gender }">
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'toggle-btn--active': form.gender === 'MALE' }"
              @click="form.gender = 'MALE'"
            >Мужской</button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'toggle-btn--active': form.gender === 'FEMALE' }"
              @click="form.gender = 'FEMALE'"
            >Женский</button>
          </div>
          <span v-if="errors.gender" class="field-error">{{ errors.gender }}</span>
        </div>
      </div>

      <!-- ── СНИЛС ────────────────────────────────────────────────── -->
      <div class="field-group">
        <label class="field-label">СНИЛС <span class="req">*</span></label>
        <input
          :value="form.snils"
          class="field-input"
          :class="{ 'field-input--error': errors.snils }"
          placeholder="123-456-789 00"
          maxlength="14"
          @input="onSnilsInput"
        />
        <span v-if="errors.snils" class="field-error">{{ errors.snils }}</span>
      </div>

      <!-- ── Телефон + Email ──────────────────────────────────────── -->
      <div class="form-row-2">
        <div class="field-group">
          <label class="field-label">Телефон</label>
          <input
            v-model="form.phoneNumber"
            class="field-input"
            placeholder="+7 (999) 999-99-99"
          />
        </div>
        <div class="field-group">
          <label class="field-label">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="field-input"
            :class="{ 'field-input--error': errors.email }"
            placeholder="example@mail.ru"
          />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>
      </div>

      <!-- ── Клинический профиль ──────────────────────────────────── -->
      <div class="clinical-divider"><span>Клинический профиль</span></div>

      <div class="clinical-grid">
        <div class="clinical-row">
          <span class="clinical-label">Курение</span>
          <div class="bool-toggle">
            <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isSmoker === true }"  @click="form.cp.isSmoker = true">Да</button>
            <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isSmoker === false }" @click="form.cp.isSmoker = false">Нет</button>
          </div>
        </div>
        <div class="clinical-row">
          <span class="clinical-label">Употребление алкоголя</span>
          <div class="bool-toggle">
            <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isAlcoholic === true }"  @click="form.cp.isAlcoholic = true">Да</button>
            <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isAlcoholic === false }" @click="form.cp.isAlcoholic = false">Нет</button>
          </div>
        </div>
        <template v-if="form.gender === 'FEMALE'">
          <div class="clinical-row">
            <span class="clinical-label">Беременность</span>
            <div class="bool-toggle">
              <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isPregnant === true }"  @click="form.cp.isPregnant = true">Да</button>
              <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.isPregnant === false }" @click="form.cp.isPregnant = false">Нет</button>
            </div>
          </div>
          <div v-if="form.cp.isPregnant" class="clinical-row">
            <span class="clinical-label">Триместр</span>
            <div class="bool-toggle">
              <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.trimester === 1 }" @click="form.cp.trimester = 1">I</button>
              <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.trimester === 2 }" @click="form.cp.trimester = 2">II</button>
              <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': form.cp.trimester === 3 }" @click="form.cp.trimester = 3">III</button>
            </div>
          </div>
        </template>
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
          <span>{{ loading ? (isEdit ? 'Сохранение...' : 'Создание...') : (isEdit ? 'Сохранить изменения' : 'Создать пациента') }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import PatientService from '@/services/PatientService';

const props = defineProps({
  visible: { type: Boolean, required: true },
  patient: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'created', 'updated']);

const isEdit = computed(() => !!props.patient);

const loading     = ref(false);
const serverError = ref('');

const today = new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  lastName:    '',
  firstName:   '',
  middleName:  '',
  birthDate:   '',
  gender:      null,
  snils:       '',
  phoneNumber: '',
  email:       '',
  cp: {
    isSmoker:    false,
    isAlcoholic: false,
    isPregnant:  false,
    trimester:   null,
  },
});

const form   = reactive(emptyForm());
const errors = reactive({});

// ── Helpers for pre-fill ─────────────────────────────────────────
function toBirthDateInput(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.includes('-')) return val;
  const d = new Date(Number(val));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

function formatSnilsDisplay(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11)
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6, 9) + ' ' + digits.slice(9);
  return raw || '';
}

// Reset / pre-fill on open
watch(() => props.visible, (val) => {
  if (val) {
    Object.keys(errors).forEach(k => delete errors[k]);
    serverError.value = '';
    if (props.patient) {
      const p  = props.patient;
      const cp = p.clinicalProfile;
      Object.assign(form, {
        lastName:    p.lastName    || '',
        firstName:   p.firstName   || '',
        middleName:  p.middleName  || '',
        birthDate:   toBirthDateInput(p.birthDate),
        gender:      p.gender      || null,
        snils:       formatSnilsDisplay(p.snils),
        phoneNumber: p.phoneNumber || '',
        email:       p.email       || '',
        cp: {
          isSmoker:    cp?.isSmoker    ?? false,
          isAlcoholic: cp?.isAlcoholic ?? false,
          isPregnant:  cp?.isPregnant  ?? false,
          trimester:   cp?.trimester   ?? null,
        },
      });
    } else {
      Object.assign(form, emptyForm());
    }
  }
});

// Reset pregnancy fields when gender changes to MALE
watch(() => form.gender, (val) => {
  if (val === 'MALE') {
    form.cp.isPregnant = false;
    form.cp.trimester  = null;
  }
});

// Reset trimester when pregnancy unchecked
watch(() => form.cp.isPregnant, (val) => {
  if (!val) form.cp.trimester = null;
});

// ── СНИЛС auto-format (XXX-XXX-XXX XX) ───────────────────────────
function onSnilsInput(e) {
  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
  let out = raw;
  if (raw.length > 3) out = raw.slice(0, 3) + '-' + raw.slice(3);
  if (raw.length > 6) out = raw.slice(0, 3) + '-' + raw.slice(3, 6) + '-' + raw.slice(6);
  if (raw.length > 9) out = raw.slice(0, 3) + '-' + raw.slice(3, 6) + '-' + raw.slice(6, 9) + ' ' + raw.slice(9);
  form.snils   = out;
  e.target.value = out;
}

// ── Validation ────────────────────────────────────────────────────
function validate() {
  Object.keys(errors).forEach(k => delete errors[k]);
  if (!form.lastName.trim())  errors.lastName  = 'Обязательное поле';
  if (!form.firstName.trim()) errors.firstName = 'Обязательное поле';
  if (!form.birthDate)        errors.birthDate = 'Обязательное поле';
  if (!form.gender)           errors.gender    = 'Выберите пол';

  const snilsDigits = form.snils.replace(/\D/g, '');
  if (!snilsDigits)             errors.snils = 'Обязательное поле';
  else if (snilsDigits.length !== 11) errors.snils = 'СНИЛС должен содержать 11 цифр';

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Некорректный email';

  return Object.keys(errors).length === 0;
}

// ── Submit ────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return;
  loading.value     = true;
  serverError.value = '';

  const cp = {
    isSmoker:    form.cp.isSmoker,
    isAlcoholic: form.cp.isAlcoholic,
    isPregnant:  form.gender === 'FEMALE' ? form.cp.isPregnant : false,
    ...(form.gender === 'FEMALE' && form.cp.isPregnant && form.cp.trimester != null
      ? { trimester: form.cp.trimester }
      : {}),
  };

  const body = {
    lastName:    form.lastName.trim(),
    firstName:   form.firstName.trim(),
    middleName:  form.middleName.trim() || undefined,
    birthDate:   form.birthDate,
    gender:      form.gender,
    snils:       form.snils.replace(/\D/g, ''),
    phoneNumber: form.phoneNumber.trim() || undefined,
    email:       form.email.trim() || undefined,
    clinicalProfile: cp,
  };

  try {
    const res     = isEdit.value
      ? await PatientService.update(props.patient.id, body)
      : await PatientService.create(body);
    const saved = res.data?.payload;
    if (isEdit.value) emit('updated', saved);
    else              emit('created', saved);
    emit('update:visible', false);
  } catch (err) {
    const data = err.response?.data;

    if (data?.message === 'Validation failed' && data?.payload && typeof data.payload === 'object') {
      const MAP = {
        phoneNumber: 'Некорректный номер телефона',
        email:       'Некорректный email',
        snils:       'Некорректный СНИЛС',
        firstName:   'Некорректное имя',
        lastName:    'Некорректная фамилия',
        birthDate:   'Некорректная дата рождения',
      };
      for (const [field, msg] of Object.entries(data.payload)) {
        errors[field] = MAP[field] || msg;
      }
      return;
    }

    const msg = data?.message || '';
    if (msg.toLowerCase().includes('email'))
      errors.email = 'Пациент с таким email уже существует';
    else if (msg.toLowerCase().includes('snils'))
      errors.snils = 'Пациент с таким СНИЛС уже существует';
    else if (msg.toLowerCase().includes('phonenumber'))
      errors.phoneNumber = 'Пациент с таким номером уже существует';
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

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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

.field-input {
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
.field-input:focus {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}
.field-input--error { border-color: #fca5a5; }

.field-error {
  font-size: 0.72rem;
  color: #be123c;
}

/* ── Gender / bool toggle ─────────────────────────────────────────── */
.bool-toggle {
  display: flex;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  overflow: hidden;
  width: fit-content;
}

.bool-toggle--error { border-color: #fca5a5; }

.toggle-btn {
  padding: 0.45rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
  border-right: 1px solid #e5e7eb;
}
.toggle-btn:last-child { border-right: none; }
.toggle-btn:hover:not(.toggle-btn--active) { background: #f9fafb; }

.toggle-btn--active {
  background: #9f1239;
  color: #fff;
}

/* ── Clinical profile ─────────────────────────────────────────────── */
.clinical-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.clinical-divider::before,
.clinical-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}
.clinical-divider span {
  font-size: 0.67rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9ca3af;
  white-space: nowrap;
}

.clinical-grid {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.clinical-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.clinical-label {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
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
