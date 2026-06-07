<template>
  <!-- ── Top bar: search + create ─────────────────────────────────── -->
  <div class="top-bar">
  <div class="search-bar">
    <div class="search-field" :class="{ 'search-field--active': searchField === 'id' }">
      <i class="pi pi-hashtag search-icon" />
      <input
        v-model="search.id"
        class="search-input"
        placeholder="Найти по ID пациента"
        inputmode="numeric"
        @keyup.enter="searchById"
        @input="onIdInput"
      />
      <button v-if="searchField === 'id'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
    <div class="search-field" :class="{ 'search-field--active': searchField === 'keyword' }">
      <i class="pi pi-search search-icon" />
      <input
        v-model="search.keyword"
        class="search-input"
        placeholder="Поиск по ФИО или email..."
        @keyup.enter="searchByKeyword"
        @input="onKeywordInput"
      />
      <button v-if="searchField === 'keyword'" class="search-clear" @click="clearSearch" title="Сбросить">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>
  <button class="btn-create-patient" @click="createDialog.visible = true">
    <i class="pi pi-user-plus" />
    Новый пациент
  </button>
  </div>

  <!-- ── Search result bar ─────────────────────────────────────────── -->
  <div v-if="searchField && searchResultMessage" class="search-result-bar">
    <i class="pi pi-filter" />
    {{ searchResultMessage }}
    <button class="search-result-clear" @click="clearSearch">Сбросить</button>
  </div>

  <!-- ── Patients container ────────────────────────────────────────── -->
  <div class="patients-wrap">

    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка пациентов...</span>
    </div>

    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <template v-else>
      <div v-if="patients.length === 0" class="state-msg">
        <i class="pi pi-users" /><span>Пациенты не найдены</span>
      </div>

      <!-- Two-column vertical layout -->
      <div v-else class="patient-columns">
        <div v-for="(col, ci) in patientColumns" :key="ci" class="patient-col">
          <div
            v-for="p in col"
            :key="p.id"
            class="patient-card"
            @click="openDetail(p)"
          >
            <div class="gender-dot">
              <i :class="p.gender === 'MALE' ? 'pi pi-mars' : 'pi pi-venus'" />
            </div>
            <div class="card-body">
              <span class="card-name">{{ fullName(p) }}</span>
              <div class="card-meta">
                <span>{{ formatBirthDate(p.birthDate) }}</span>
                <span v-if="p.snils" class="meta-sep">·</span>
                <span v-if="p.snils" class="card-snils">{{ p.snils }}</span>
              </div>
            </div>
            <span class="card-id">#{{ p.id }}</span>
            <i class="pi pi-chevron-right card-chevron" />
          </div>
        </div>
      </div>

      <Paginator
        v-if="!searchField && totalRecords > pageLimit"
        :rows="pageLimit"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50]"
        :first="currentPage * pageLimit"
        @page="onPage"
        class="patients-paginator"
      />
    </template>
  </div>

  <!-- ── Detail dialog ─────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="detail.visible"
    modal
    :header="detail.patient ? `#${detail.patient.id} ${fullName(detail.patient)}` : 'Пациент'"
    :style="{ width: '560px' }"
    :draggable="false"
  >
    <div v-if="detail.loading" class="dlg-state">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка данных...</span>
    </div>

    <div v-else-if="detail.error" class="dlg-state dlg-state--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ detail.error }}</span>
    </div>

    <div v-else-if="detail.patient" class="dlg-body">

      <!-- Action buttons -->
      <div class="detail-actions">
        <button class="action-btn" @click="goToOrders(detail.patient.id)">Заказы</button>
        <button class="action-btn" @click="goToSamples(detail.patient.id)">Образцы</button>
        <button class="action-btn" @click="openEdit">Изменить</button>
        <button class="action-btn action-btn--danger" @click="openDelete">Удалить</button>
      </div>

      <!-- Section: Основные данные -->
      <div class="dlg-section">
        <div class="dlg-section-title">Основные данные</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-key">Пол</span>
            <span class="info-val">{{ detail.patient.gender === 'MALE' ? 'Мужской' : 'Женский' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Дата рождения</span>
            <span class="info-val">{{ formatBirthDate(detail.patient.birthDate) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">СНИЛС</span>
            <span class="info-val">{{ detail.patient.snils || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Телефон</span>
            <span class="info-val">{{ detail.patient.phoneNumber || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Email</span>
            <span class="info-val">{{ detail.patient.email || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Добавлен</span>
            <span
              v-if="detail.patient.createdBy"
              class="info-link"
              @click="goToCreatedBy(detail.patient.createdBy)"
            >{{ detail.patient.createdBy }}</span>
            <span v-else class="info-val">—</span>
          </div>
          <div class="info-row">
            <span class="info-key">Дата добавления</span>
            <span class="info-val">{{ formatDate(detail.patient.createdAt) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Последнее обновление</span>
            <span class="info-val">{{ formatDate(detail.patient.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Клинический профиль -->
      <div class="dlg-section">
        <div class="dlg-section-title">Клинический профиль</div>
        <div v-if="!detail.patient.clinicalProfile" class="no-profile">
          Клинический профиль не заполнен
        </div>
        <div v-else class="info-grid">
          <div class="info-row">
            <span class="info-key">Курение</span>
            <span class="info-val">{{ detail.patient.clinicalProfile.isSmoker ? 'Да' : 'Нет' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Употребление алкоголя</span>
            <span class="info-val">{{ detail.patient.clinicalProfile.isAlcoholic ? 'Да' : 'Нет' }}</span>
          </div>
          <template v-if="detail.patient.gender === 'FEMALE'">
            <div class="info-row">
              <span class="info-key">Беременность</span>
              <span class="info-val">{{ detail.patient.clinicalProfile.isPregnant ? 'Да' : 'Нет' }}</span>
            </div>
            <div v-if="detail.patient.clinicalProfile.isPregnant" class="info-row">
              <span class="info-key">Триместр</span>
              <span class="info-val">{{ trimesterLabel(detail.patient.clinicalProfile.trimester) }}</span>
            </div>
          </template>
        </div>
      </div>

    </div>
  </Dialog>

  <!-- ── Create patient dialog ─────────────────────────────────────── -->
  <PatientCreateDialog
    v-model:visible="createDialog.visible"
    @created="onPatientCreated"
  />

  <!-- ── Change-user dialog ────────────────────────────────────────── -->
  <Dialog
    v-model:visible="changeUser.visible"
    modal
    header="Привязать к аккаунту клиента"
    :style="{ width: '440px' }"
    :draggable="false"
    :closable="!changeUser.loading"
  >
    <div class="cu-body">
      <p class="cu-hint">
        Пациент <strong>{{ changeUser.patientName }}</strong> успешно создан.
        Укажите email клиента, чтобы пациент был доступен в его личном кабинете.
        В противном случае пациент будет привязан к аккаунту текущего сотрудника.
      </p>
      <div class="cu-field">
        <label class="cu-label">Email клиента</label>
        <input
          v-model="changeUser.email"
          type="email"
          class="cu-input"
          :class="{ 'cu-input--error': changeUser.error }"
          placeholder="client@example.ru"
          @keyup.enter="doChangeUser"
        />
        <span v-if="changeUser.error" class="cu-error">{{ changeUser.error }}</span>
      </div>
    </div>
    <template #footer>
      <div class="cu-footer">
        <button type="button" class="btn-skip" :disabled="changeUser.loading" @click="closeChangeUser">
          Пропустить
        </button>
        <button type="button" class="btn-assign" :disabled="changeUser.loading || !changeUser.email.trim()" @click="doChangeUser">
          <i v-if="changeUser.loading" class="pi pi-spin pi-spinner" />
          <span>{{ changeUser.loading ? 'Привязка...' : 'Привязать' }}</span>
        </button>
      </div>
    </template>
  </Dialog>

  <!-- ── Edit patient dialog ───────────────────────────────────────── -->
  <PatientCreateDialog
    v-model:visible="editDialog.visible"
    :patient="detail.patient"
    @updated="onPatientUpdated"
  />

  <!-- ── Delete patient dialog ─────────────────────────────────────── -->
  <Dialog
    v-model:visible="deleteDialog.visible"
    modal
    header="Деактивировать пациента"
    :style="{ width: '420px' }"
    :draggable="false"
    :closable="!deleteDialog.loading"
  >
    <div class="del-body">
      <p class="del-text">
        Пациент <strong>{{ detail.patient ? fullName(detail.patient) : '' }}</strong> будет деактивирован.
        Профиль пациента станет недоступен в личном кабинете пользователя.
      </p>
      <p class="del-text del-text--note">
        Все связанные данные останутся в системе.
      </p>
      <div v-if="deleteDialog.error" class="del-error">
        <i class="pi pi-exclamation-circle" />{{ deleteDialog.error }}
      </div>
    </div>
    <template #footer>
      <div class="del-footer">
        <button type="button" class="btn-cancel-del" :disabled="deleteDialog.loading" @click="deleteDialog.visible = false">
          Отмена
        </button>
        <button type="button" class="btn-confirm-del" :disabled="deleteDialog.loading" @click="confirmDelete">
          <i v-if="deleteDialog.loading" class="pi pi-spin pi-spinner" />
          <span>{{ deleteDialog.loading ? 'Удаление...' : 'Деактивировать' }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Dialog    from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import PatientService from '@/services/PatientService';
import PatientCreateDialog from '@/components/PatientCreateDialog.vue';

const router = useRouter();
const route  = useRoute();

// ── Create dialog ─────────────────────────────────────────────────
const createDialog = reactive({ visible: false });

// ── Change-user dialog ────────────────────────────────────────────
const changeUser = reactive({
  visible:     false,
  patientId:   null,
  patientName: '',
  email:       '',
  loading:     false,
  error:       '',
});

function onPatientCreated(patient) {
  fetchPatients(0, pageLimit.value);
  changeUser.patientId   = patient.id;
  changeUser.patientName = [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(' ');
  changeUser.email       = '';
  changeUser.error       = '';
  changeUser.visible     = true;
}

async function doChangeUser() {
  const email = changeUser.email.trim();
  if (!email) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    changeUser.error = 'Некорректный email';
    return;
  }
  changeUser.loading = true;
  changeUser.error   = '';
  try {
    await PatientService.changeUser(changeUser.patientId, email);
    closeChangeUser();
    fetchPatients(0, pageLimit.value);
  } catch (err) {
    changeUser.error = err.response?.data?.message ?? 'Не удалось привязать пациента';
  } finally {
    changeUser.loading = false;
  }
}

function closeChangeUser() {
  changeUser.visible = false;
  changeUser.email   = '';
  changeUser.error   = '';
}

// ── Edit dialog ───────────────────────────────────────────────────
const editDialog = reactive({ visible: false });

function openEdit() {
  editDialog.visible = true;
}

function onPatientUpdated(updated) {
  detail.patient = { ...detail.patient, ...updated };
  fetchPatients(currentPage.value, pageLimit.value);
}

// ── Delete dialog ─────────────────────────────────────────────────
const deleteDialog = reactive({ visible: false, loading: false, error: '' });

function openDelete() {
  deleteDialog.error   = '';
  deleteDialog.visible = true;
}

async function confirmDelete() {
  deleteDialog.loading = true;
  deleteDialog.error   = '';
  try {
    await PatientService.deletePatient(detail.patient.id);
    deleteDialog.visible = false;
    detail.visible       = false;
    fetchPatients(0, pageLimit.value);
  } catch (err) {
    deleteDialog.error = err.response?.data?.message ?? 'Не удалось удалить пациента';
  } finally {
    deleteDialog.loading = false;
  }
}

// ── Search ────────────────────────────────────────────────────────
const search      = reactive({ id: '', keyword: '' });
const searchField = ref(''); // 'id' | 'keyword' | ''
const searchResultMessage = ref('');

// ── List state ────────────────────────────────────────────────────
const patients     = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(20);
const totalRecords = ref(0);

// Split patients into two vertical columns
const patientColumns = computed(() => {
  const half = Math.ceil(patients.value.length / 2);
  return [patients.value.slice(0, half), patients.value.slice(half)];
});

// ── Detail dialog ─────────────────────────────────────────────────
const detail = reactive({
  visible: false,
  loading: false,
  error:   '',
  patient: null,
});

// ── Fetch all ─────────────────────────────────────────────────────
async function fetchPatients(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res      = await PatientService.getAll(page, limit);
    const payload  = res.data?.payload;
    patients.value     = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
    pageLimit.value    = limit;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить пациентов';
  } finally {
    loading.value = false;
  }
}

function onPage(event) { fetchPatients(event.page, event.rows); }

// ── Search by ID ──────────────────────────────────────────────────
async function searchById() {
  const raw = search.id.trim();
  if (!raw || isNaN(Number(raw))) return;
  loading.value = true;
  error.value   = null;
  try {
    const res  = await PatientService.getById(Number(raw));
    const item = res.data?.payload;
    patients.value            = item ? [item] : [];
    searchResultMessage.value = item
      ? `Пациент #${raw}: ${fullName(item)}`
      : `Пациент #${raw} не найден`;
    searchField.value = 'id';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось найти пациента';
  } finally {
    loading.value = false;
  }
}

// ── Search by keyword ─────────────────────────────────────────────
async function searchByKeyword() {
  const raw = search.keyword.trim();
  if (!raw) return;
  loading.value = true;
  error.value   = null;
  try {
    const res     = await PatientService.search({ keyword: raw });
    const payload = res.data?.payload;
    patients.value            = payload?.content ?? [];
    searchResultMessage.value = `Найдено: ${patients.value.length}`;
    searchField.value         = 'keyword';
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось выполнить поиск';
  } finally {
    loading.value = false;
  }
}

function onIdInput()      { if (!search.id.trim())      clearSearch(); }
function onKeywordInput() { if (!search.keyword.trim()) clearSearch(); }

function clearSearch() {
  searchField.value         = '';
  searchResultMessage.value = '';
  search.id                 = '';
  search.keyword            = '';
  fetchPatients(0, pageLimit.value);
}

// ── Detail dialog ─────────────────────────────────────────────────
async function openDetail(p) {
  detail.patient = p;
  detail.error   = '';
  detail.loading = true;
  detail.visible = true;
  try {
    const res      = await PatientService.getById(p.id);
    detail.patient = res.data?.payload ?? p;
  } catch {
    detail.error = 'Не удалось загрузить данные пациента';
  } finally {
    detail.loading = false;
  }
}

// Navigate to Users page with createdBy value as keyword search
function goToCreatedBy(createdBy) {
  router.push({ name: 'Users', query: { keyword: createdBy } });
}

// Navigate to Orders / Samples pages filtered by this patient's ID
function goToOrders(patientId) {
  if (patientId) router.push({ name: 'Orders', query: { patientId } });
}

function goToSamples(patientId) {
  if (patientId) router.push({ name: 'Samples', query: { patientId } });
}

// ── Helpers ───────────────────────────────────────────────────────
function fullName(p) {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ') || '—';
}

function formatBirthDate(val) {
  if (!val) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(val));
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(ts));
}

function trimesterLabel(t) {
  if (!t) return '—';
  return ['I триместр', 'II триместр', 'III триместр'][t - 1] ?? '—';
}

onMounted(() => {
  const qId = route.query.patientId;
  if (qId && !isNaN(Number(qId))) {
    fetchPatients(0);
    openDetailById(Number(qId));
  } else {
    fetchPatients(0);
  }
});

async function openDetailById(id) {
  detail.patient = { id };
  detail.error   = '';
  detail.loading = true;
  detail.visible = true;
  try {
    const res      = await PatientService.getById(id);
    detail.patient = res.data?.payload ?? { id };
  } catch {
    detail.error = 'Не удалось загрузить данные пациента';
  } finally {
    detail.loading = false;
  }
}
</script>

<style scoped>
/* ── Top bar ──────────────────────────────────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.top-bar .search-bar {
  flex: 1;
  margin-bottom: 0;
}

.btn-create-patient {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 1.125rem;
  height: 38px;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: #9f1239;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-create-patient:hover { background: #be123c; }
.btn-create-patient .pi { font-size: 0.8rem; }

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

/* ── Patients container ───────────────────────────────────────────── */
.patients-wrap {
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

/* ── Two-column vertical layout ───────────────────────────────────── */
.patient-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.patient-col {
  display: flex;
  flex-direction: column;
}

.patient-col:first-child .patient-card {
  border-right: 1px solid #f3f4f6;
}

/* ── Patient card ─────────────────────────────────────────────────── */
.patient-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1.125rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.1s;
}
.patient-card:last-child { border-bottom: none; }
.patient-card:hover { background: #fafafa; }

.gender-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.9rem;
  background: #f3f4f6;
  color: #6b7280;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.775rem;
  color: #9ca3af;
}

.meta-sep { color: #d1d5db; }

.card-snils {
  font-family: monospace;
  font-size: 0.75rem;
}

.card-id {
  font-family: monospace;
  font-size: 0.78rem;
  color: #d1d5db;
  flex-shrink: 0;
}

.card-chevron {
  font-size: 0.65rem;
  color: #d1d5db;
  flex-shrink: 0;
  transition: color 0.12s;
}
.patient-card:hover .card-chevron { color: #9f1239; }

/* ── Paginator ────────────────────────────────────────────────────── */
.patients-paginator {
  border-top: 1px solid #f3f4f6;
  padding: 0.375rem 1rem;
}

/* ── Dialog state ─────────────────────────────────────────────────── */
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

/* ── Dialog body ──────────────────────────────────────────────────── */
.dlg-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.125rem 0 0.25rem;
}

/* Section */
.dlg-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dlg-section-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9ca3af;
}

/* Info grid */
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

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.625rem;
  border-radius: 20px;
}
.status-badge--active  { background: #dcfce7; color: #15803d; }
.status-badge--deleted { background: #fee2e2; color: #b91c1c; }

.no-profile {
  font-size: 0.8125rem;
  color: #9ca3af;
  padding: 0.75rem 0;
}

/* ── Change-user dialog ───────────────────────────────────────────── */
.cu-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.125rem 0 0.25rem;
}

.cu-hint {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.55;
  margin: 0;
}

.cu-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cu-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.cu-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
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
.cu-input:focus {
  border-color: #9f1239;
  box-shadow: 0 0 0 3px rgba(159,18,57,.1);
}
.cu-input--error { border-color: #fca5a5; }

.cu-error {
  font-size: 0.72rem;
  color: #be123c;
}

.cu-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  width: 100%;
}

.btn-skip {
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
.btn-skip:hover:not(:disabled) { background: #f9fafb; }
.btn-skip:disabled { opacity: 0.55; cursor: default; }

.btn-assign {
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
.btn-assign:hover:not(:disabled) { background: #be123c; }
.btn-assign:disabled { opacity: 0.55; cursor: default; }

/* ── Detail action buttons ────────────────────────────────────────── */
.detail-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.45rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.action-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}
.action-btn--disabled {
  color: #d1d5db;
  cursor: default;
}
.action-btn--danger {
  color: #be123c;
  border-color: #fecdd3;
}
.action-btn--danger:hover:not(:disabled) {
  background: #fff1f2;
  border-color: #fca5a5;
}

/* ── Delete dialog ────────────────────────────────────────────────── */
.del-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.125rem 0 0.25rem;
}

.del-text {
  font-size: 0.8125rem;
  color: #374151;
  line-height: 1.55;
  margin: 0;
}

.del-text--note {
  color: #6b7280;
  font-size: 0.78rem;
}

.del-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: #be123c;
  margin-top: 0.25rem;
}

.del-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  width: 100%;
}

.btn-cancel-del {
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
.btn-cancel-del:hover:not(:disabled) { background: #f9fafb; }
.btn-cancel-del:disabled { opacity: 0.55; cursor: default; }

.btn-confirm-del {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 7px;
  background: #be123c;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
}
.btn-confirm-del:hover:not(:disabled) { background: #9f1239; }
.btn-confirm-del:disabled { opacity: 0.55; cursor: default; }
</style>
