<template>
  <div class="categories-page">
    <!-- Back -->
    <button class="back-btn" @click="router.push({ name: 'Analyses' })">
      <i class="pi pi-arrow-left" />
      Анализы
    </button>

    <!-- State -->
    <div v-if="loading" class="state-msg">
      <i class="pi pi-spin pi-spinner" /><span>Загрузка категорий...</span>
    </div>
    <div v-else-if="error" class="state-msg state-msg--error">
      <i class="pi pi-exclamation-triangle" /><span>{{ error }}</span>
    </div>

    <div v-else class="categories-grid">
      <div v-for="c in categories" :key="c.id" class="category-card">
        <div class="category-card-header">
          <span class="category-code">{{ c.code }}</span>
        </div>
        <div class="category-name">{{ c.name }}</div>
        <div v-if="c.description" class="category-desc">{{ c.description }}</div>
        <div class="category-dates">
          <span><i class="pi pi-calendar-plus" /> {{ formatTs(c.createdAt) }}</span>
          <span><i class="pi pi-clock" /> {{ formatTs(c.updatedAt) }}</span>
        </div>
      </div>

      <div v-if="categories.length === 0" class="state-msg">
        <i class="pi pi-inbox" /><span>Категории не найдены</span>
      </div>
    </div>

    <Paginator
      v-if="totalRecords > pageLimit"
      :rows="pageLimit"
      :totalRecords="totalRecords"
      :first="currentPage * pageLimit"
      @page="onPage"
      class="categories-paginator"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Paginator from 'primevue/paginator';
import AnalysesService from '@/services/AnalysesService';

const router = useRouter();

const categories   = ref([]);
const loading      = ref(false);
const error        = ref(null);
const currentPage  = ref(0);
const pageLimit    = ref(15);
const totalRecords = ref(0);

async function fetchCategories(page = 0, limit = pageLimit.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res          = await AnalysesService.getAllCategories(page, limit);
    const payload      = res.data?.payload;
    categories.value   = payload?.content ?? [];
    totalRecords.value = (payload?.pagination?.pages ?? 1) * limit;
    currentPage.value  = page;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить категории';
  } finally {
    loading.value = false;
  }
}

function onPage(event) {
  fetchCategories(event.page, event.rows);
}

function formatTs(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(value));
}

onMounted(() => fetchCategories(0));
</script>

<style scoped>
.categories-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
  align-self: flex-start;
}
.back-btn:hover { color: #9f1239; }
.back-btn .pi   { font-size: 0.8rem; }

.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 3rem 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}
.state-msg .pi    { font-size: 2rem; }
.state-msg--error { color: #be123c; }

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.875rem;
}

.category-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}

.category-card-header { display: flex; align-items: center; }

.category-code {
  font-family: monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  background: #fff1f2;
  color: #9f1239;
  border: 1px solid #fecdd3;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.category-name {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.category-desc {
  font-size: 0.8375rem;
  color: #6b7280;
  line-height: 1.45;
  flex: 1;
}

.category-dates {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}
.category-dates .pi { font-size: 0.7rem; margin-right: 0.25rem; }

.categories-paginator { margin-top: 0.25rem; }
</style>
