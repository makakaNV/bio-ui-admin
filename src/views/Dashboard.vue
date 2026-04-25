<template>
  <!-- ═══════════════════════════════════ MLT VIEW ═══════════════════ -->
  <div v-if="isMLT" class="dashboard">

    <!-- Welcome bar -->
    <div class="welcome-bar">
      <div class="welcome-left">
        <span class="welcome-greeting">Добро пожаловать, {{ userName || 'Лаборант' }}</span>
        <span class="welcome-date">{{ todayStr }}</span>
      </div>
      <span class="role-badge">Лаборант</span>
    </div>

    <!-- Two-column widgets -->
    <div class="widgets-row">

      <!-- Specimens awaiting collection -->
      <div class="widget">
        <div class="widget-header">
          <div class="widget-title">
            <i class="pi pi-box" />
            Образцы на сбор
          </div>
          <span class="widget-count" :class="specimensCountClass">
            {{ recentSpecimens.length }}
          </span>
        </div>
        <div class="widget-sub">Зарегистрированы за последние 7 дней</div>

        <div v-if="loadingSpecimens" class="widget-state">
          <i class="pi pi-spin pi-spinner" /><span>Загрузка...</span>
        </div>
        <div v-else-if="recentSpecimens.length === 0" class="widget-state widget-state--ok">
          <i class="pi pi-check-circle" /><span>Новых образцов нет</span>
        </div>
        <div v-else class="specimen-list">
          <div
            v-for="s in recentSpecimens"
            :key="s.id"
            class="specimen-row"
            @click="goToSpecimen(s.id)"
          >
            <span class="specimen-id">#{{ s.id }}</span>
            <span class="specimen-bio">{{ s.biomaterialCode ?? '—' }}</span>
            <span class="specimen-container">{{ s.containerName ?? '—' }}</span>
            <span class="specimen-ts">{{ shortDate(s.createdAt) }}</span>
            <i class="pi pi-arrow-right specimen-arrow" />
          </div>
        </div>

        <button v-if="recentSpecimens.length > 0" class="widget-link" @click="router.push({ name: 'Samples' })">
          Все образцы <i class="pi pi-arrow-right" />
        </button>
      </div>

      <!-- Recent analyses changes -->
      <div class="widget">
        <div class="widget-header">
          <div class="widget-title">
            <i class="pi pi-chart-bar" />
            Обновления анализов
          </div>
          <span class="widget-count widget-count--blue">
            {{ recentAnalysesEntries.length }}
          </span>
        </div>
        <div class="widget-sub">Изменения за последние 7 дней</div>

        <div v-if="loadingAnalyses" class="widget-state">
          <i class="pi pi-spin pi-spinner" /><span>Загрузка...</span>
        </div>
        <div v-else-if="recentAnalysesEntries.length === 0" class="widget-state widget-state--ok">
          <i class="pi pi-check-circle" /><span>Изменений нет</span>
        </div>
        <div v-else class="analysis-list">
          <div
            v-for="[id, name] in recentAnalysesEntries"
            :key="id"
            class="analysis-row"
            @click="goToAnalysis(id)"
          >
            <span class="analysis-id">#{{ id }}</span>
            <span class="analysis-name">{{ name }}</span>
            <i class="pi pi-arrow-right analysis-arrow" />
          </div>
        </div>

        <button v-if="recentAnalysesEntries.length > 0" class="widget-link widget-link--blue" @click="router.push({ name: 'Analyses' })">
          Все анализы <i class="pi pi-arrow-right" />
        </button>
      </div>

    </div>

  </div>

  <!-- ═══════════════════════════════ RECEPTIONIST VIEW ════════════════ -->
  <div v-else-if="isReceptionist" class="dashboard">
    <div class="welcome-bar">
      <div class="welcome-left">
        <span class="welcome-greeting">Добро пожаловать, {{ userName || 'Регистратор' }}</span>
        <span class="welcome-date">{{ todayStr }}</span>
      </div>
      <span class="role-badge role-badge--blue">Регистратор</span>
    </div>
  </div>

  <!-- ═══════════════════════════════════ ADMIN VIEW ══════════════════ -->
  <div v-else-if="isAdmin" class="dashboard">
    <div class="welcome-bar">
      <div class="welcome-left">
        <span class="welcome-greeting">Добро пожаловать, {{ userName || 'Администратор' }}</span>
        <span class="welcome-date">{{ todayStr }}</span>
      </div>
      <span class="role-badge role-badge--rose">Администратор</span>
    </div>
  </div>

  <!-- ════════════════════════════════ GENERIC ════════════════════════ -->
  <div v-else class="dashboard">
    <div class="welcome-bar">
      <div class="welcome-left">
        <span class="welcome-greeting">Добро пожаловать{{ userName ? ', ' + userName : '' }}</span>
        <span class="welcome-date">{{ todayStr }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { userRoles, userName } from '@/stores/auth';
import SpecimensService from '@/services/SpecimensService';
import AnalysesService  from '@/services/AnalysesService';

const router = useRouter();

// ── Role flags ─────────────────────────────────────────────────────
const isMLT          = computed(() => userRoles.value.includes('MLT'));
const isAdmin        = computed(() => userRoles.value.includes('ADMIN'));
const isReceptionist = computed(() => userRoles.value.includes('RECEPTIONIST'));

// ── Today's date ───────────────────────────────────────────────────
const todayStr = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date());

// ── MLT state ──────────────────────────────────────────────────────
const recentSpecimens      = ref([]);
const loadingSpecimens     = ref(false);
const recentAnalysesEntries = ref([]);  // [[id, name], ...]
const loadingAnalyses      = ref(false);

const specimensCountClass = computed(() =>
  recentSpecimens.value.length > 0 ? 'widget-count--red' : 'widget-count--ok'
);

// ── Fetch ──────────────────────────────────────────────────────────
async function fetchRecentSpecimens() {
  loadingSpecimens.value = true;
  try {
    const res              = await SpecimensService.getRecent(0, 20);
    recentSpecimens.value  = res.data?.payload?.content ?? [];
  } catch { /* тихо */ }
  finally { loadingSpecimens.value = false; }
}

async function fetchRecentAnalyses() {
  loadingAnalyses.value = true;
  try {
    const res  = await AnalysesService.getRecent();
    const map  = res.data?.payload ?? {};
    recentAnalysesEntries.value = Object.entries(map);
  } catch { /* тихо */ }
  finally { loadingAnalyses.value = false; }
}

// ── Navigation ─────────────────────────────────────────────────────
function goToSpecimen(id) {
  router.push({ name: 'Samples', query: { specimenId: id } });
}

function goToAnalysis(id) {
  router.push({ name: 'Analyses', query: { id } });
}

// ── Helpers ────────────────────────────────────────────────────────
function shortDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit'
  }).format(new Date(ts));
}

// ── Mount ──────────────────────────────────────────────────────────
onMounted(() => {
  if (isMLT.value) {
    fetchRecentSpecimens();
    fetchRecentAnalyses();
  }
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1100px;
}

/* ── Welcome bar ──────────────────────────────────────────────────── */
.welcome-bar {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}

.welcome-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.welcome-greeting {
  font-size: 1.375rem;
  font-weight: 700;
  color: #111827;
}

.welcome-date {
  font-size: 0.9375rem;
  color: #9ca3af;
  text-transform: capitalize;
}

.role-badge {
  padding: 0.3rem 0.875rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f0fdfa;
  color: #0f766e;
  border: 1px solid #99f6e4;
}

.role-badge--blue {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.role-badge--rose {
  background: #fff1f2;
  color: #9f1239;
  border-color: #fecdd3;
}

/* ── Widgets row ──────────────────────────────────────────────────── */
.widgets-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

/* ── Widget ───────────────────────────────────────────────────────── */
.widget {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.375rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
  min-height: 340px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #111827;
}
.widget-title .pi { color: #6b7280; font-size: 1rem; }

.widget-count {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.15rem 0.625rem;
  border-radius: 20px;
}
.widget-count--red { background: #fee2e2; color: #b91c1c; }
.widget-count--ok  { background: #dcfce7; color: #15803d; }
.widget-count--blue { background: #dbeafe; color: #1d4ed8; }

.widget-sub {
  font-size: 0.875rem;
  color: #9ca3af;
  margin-top: -0.25rem;
}

.widget-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #9ca3af;
}
.widget-state .pi { font-size: 1.25rem; }
.widget-state--ok  { color: #15803d; }
.widget-state--ok .pi { font-size: 1.1rem; }

/* ── Specimen list ────────────────────────────────────────────────── */
.specimen-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
}

.specimen-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.425rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  border: 1px solid transparent;
}
.specimen-row:hover {
  background: #fdf2f8;
  border-color: #fecdd3;
}

.specimen-id {
  font-family: monospace;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #9f1239;
  min-width: 58px;
  flex-shrink: 0;
}

.specimen-bio {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.specimen-container {
  font-size: 0.875rem;
  color: #6b7280;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.specimen-ts {
  font-size: 0.8125rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.specimen-arrow {
  font-size: 0.65rem;
  color: #d1d5db;
  flex-shrink: 0;
}
.specimen-row:hover .specimen-arrow { color: #9f1239; }

/* ── Analysis list ────────────────────────────────────────────────── */
.analysis-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
}

.analysis-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.425rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  border: 1px solid transparent;
}
.analysis-row:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.analysis-id {
  font-family: monospace;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1d4ed8;
  min-width: 58px;
  flex-shrink: 0;
}

.analysis-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-arrow {
  font-size: 0.65rem;
  color: #d1d5db;
  flex-shrink: 0;
}
.analysis-row:hover .analysis-arrow { color: #1d4ed8; }

/* ── Widget link ──────────────────────────────────────────────────── */
.widget-link {
  align-self: flex-end;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #9f1239;
  padding: 0;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.15s;
  margin-top: auto;
}
.widget-link:hover { color: #be123c; }
.widget-link--blue { color: #1d4ed8; }
.widget-link--blue:hover { color: #1e40af; }
.widget-link .pi { font-size: 0.7rem; }

/* ── Quick nav ────────────────────────────────────────────────────── */
.quicknav-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.quicknav-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #9ca3af;
}

.quicknav-grid {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quicknav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1.25rem;
  min-width: 100px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
}
.quicknav-card:hover {
  border-color: #9f1239;
  box-shadow: 0 3px 10px rgba(159,18,57,.1);
  transform: translateY(-1px);
}

.quicknav-icon {
  font-size: 1.25rem;
  color: #6b7280;
  transition: color 0.15s;
}
.quicknav-card:hover .quicknav-icon { color: #9f1239; }

.quicknav-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}
</style>
