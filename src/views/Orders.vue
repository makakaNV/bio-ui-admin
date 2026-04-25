<template>
  <div class="orders-page">
    <DataTable
      :value="orders"
      :loading="loading"
      lazy
      :rows="pageSize"
      :totalRecords="totalRecords"
      paginator
      :rowsPerPageOptions="[10, 20, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :currentPageReportTemplate="'{first}–{last} из {totalRecords}'"
      @page="onPage"
      dataKey="id"
      stripedRows
      size="small"
      class="orders-table"
    >
      <template #empty>
        <div class="table-empty">
          <i class="pi pi-inbox" />
          <span>Заказы не найдены</span>
        </div>
      </template>

      <template #loading>
        <div class="table-empty">
          <i class="pi pi-spin pi-spinner" />
          <span>Загрузка...</span>
        </div>
      </template>

      <Column field="id" header="ID" style="width: 80px" />
      <Column field="orderNumber" header="Номер заказа" style="min-width: 140px">
        <template #body="{ data }">
          <span class="order-number">{{ data.orderNumber ?? data.id }}</span>
        </template>
      </Column>
      <Column header="Пациент" style="min-width: 180px">
        <template #body="{ data }">
          {{ patientName(data) }}
        </template>
      </Column>
      <Column header="Статус" style="width: 140px">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column header="Сумма" style="width: 110px">
        <template #body="{ data }">
          {{ formatPrice(data.totalPrice ?? data.price) }}
        </template>
      </Column>
      <Column header="Дата создания" style="min-width: 150px">
        <template #body="{ data }">
          {{ formatDate(data.createdAt) }}
        </template>
      </Column>
    </DataTable>

    <Message v-if="error" severity="error" class="mt-3">{{ error }}</Message>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import OrdersService from '@/services/OrdersService';

const orders      = ref([]);
const loading     = ref(false);
const error       = ref(null);
const currentPage = ref(0);
const pageSize    = ref(20);
const totalRecords = ref(0);

async function fetchOrders(page = 0, size = pageSize.value) {
  loading.value = true;
  error.value   = null;
  try {
    const res = await OrdersService.getAll(page, size);
    const payload = res.data?.payload;
    orders.value      = payload?.content ?? [];
    totalRecords.value = payload?.pagination
      ? payload.pagination.pages * size   // pages × size как приближение
      : orders.value.length;
    currentPage.value = page;
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Не удалось загрузить заказы';
  } finally {
    loading.value = false;
  }
}

function onPage(event) {
  pageSize.value = event.rows;
  fetchOrders(event.page, event.rows);
}

// ── Вспомогательные функции ────────────────────────────────────────

function patientName(order) {
  if (order.patient) {
    const p = order.patient;
    return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ') || p.email || '—';
  }
  return order.patientName ?? '—';
}

const STATUS_MAP = {
  PENDING:    { label: 'Ожидает',     severity: 'warn'    },
  PROCESSING: { label: 'В работе',    severity: 'info'    },
  COMPLETED:  { label: 'Выполнен',    severity: 'success' },
  CANCELLED:  { label: 'Отменён',     severity: 'danger'  },
  PAID:       { label: 'Оплачен',     severity: 'success' },
};

function statusLabel(status) {
  return STATUS_MAP[status]?.label ?? status ?? '—';
}

function statusSeverity(status) {
  return STATUS_MAP[status]?.severity ?? 'secondary';
}

function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

onMounted(() => fetchOrders(0));
</script>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
}

.orders-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

.order-number {
  font-family: monospace;
  font-size: 0.85rem;
  color: #be123c;
  font-weight: 600;
}

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.table-empty .pi {
  font-size: 2rem;
}
</style>
