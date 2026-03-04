<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { getMerchantOrders } from "@/services/api/order";
import { useToast } from "vue-toastification";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emit = defineEmits(["toggle-sidebar"]);

const currentMerchantSlug = computed(() =>
  route.params?.merchantSlug ? String(route.params.merchantSlug) : null,
);

const breadcrumbItems = computed(() => [{ label: "Pesanan Masuk" }]);

// ========================
// ORDERS DATA (from API)
// ========================
const allOrders = ref([]);
const ordersLoading = ref(false);

function mapApiStatus(beStatus) {
  switch (beStatus) {
    case "pending":
      return "pending_payment";
    case "paid":
    case "responsed":
    case "delivered":
      return "processing";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return beStatus;
  }
}

function mapMerchantOrder(o) {
  return {
    id: o.id,
    invoice: o.order_code || "-",
    customer: {
      name: o.user_name_snapshot || "Pelanggan",
      phone: o.user_phone_snapshot || "-",
    },
    status: mapApiStatus(o.status),
    payment_method: o.paid_at ? "QRIS" : "COD",
    created_at: o.created_at,
    items: (o.items || []).map((it) => ({
      name: it.product_name_snapshot || "Produk",
      qty: it.quantity,
      price: it.unit_price_snapshot,
      subtotal: it.subtotal_snapshot || it.unit_price_snapshot * it.quantity,
      image: it.image_snapshot_path || null,
    })),
    amounts: {
      subtotal: Number(o.subtotal || 0),
      discount: Number(o.discount_total || 0),
      shipping: Number(o.delivery_fee_snapshot || 0),
      total: Number(o.gross_amount || 0),
    },
    shipping_address: [
      o.address_detail_snapshot,
      o.village_name_snapshot,
      o.district_name_snapshot,
      o.city_name_snapshot,
      o.province_name_snapshot,
    ]
      .filter(Boolean)
      .join(", "),
    note: "",
    _raw: o,
  };
}

async function fetchOrders() {
  if (!currentMerchantSlug.value) return;
  ordersLoading.value = true;
  try {
    const { data: res } = await getMerchantOrders(currentMerchantSlug.value, {
      per_page: 100,
    });
    const list = res?.data ?? res ?? [];
    allOrders.value = (Array.isArray(list) ? list : []).map(mapMerchantOrder);
  } catch (e) {
    console.error("Gagal memuat pesanan merchant:", e);
    toast.error("Gagal memuat pesanan");
    allOrders.value = [];
  } finally {
    ordersLoading.value = false;
  }
}

// ========================
// FILTER STATE
// ========================
const query = ref("");
const activeTab = ref("all");
const showFilterModal = ref(false);
const tempDate = ref("");
const selectedDate = ref("");

useBodyScrollLock(showFilterModal);

const tabs = [
  { key: "all", label: "Semua" },
  { key: "pending_payment", label: "Menunggu Bayar" },
  { key: "processing", label: "Diproses" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

const dateOptions = [
  { value: "today", label: "Hari Ini" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_3_months", label: "3 Bulan Terakhir" },
  { value: "this_year", label: "Tahun Ini" },
];

const tabCounts = computed(() => {
  const counts = { all: allOrders.value.length };
  allOrders.value.forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });
  return counts;
});

// ========================
// DATE HELPER
// ========================
function isDateInRange(dateStr, range) {
  const orderDate = new Date(dateStr);
  if (isNaN(orderDate.getTime())) return true;
  const now = new Date();
  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);
  if (range === "today") return orderDate >= today;
  if (range === "this_week") {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - now.getDay());
    return orderDate >= startOfWeek;
  }
  if (range === "this_month") {
    return (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  }
  if (range === "last_3_months") {
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return orderDate >= threeMonthsAgo;
  }
  if (range === "this_year")
    return orderDate.getFullYear() === now.getFullYear();
  return true;
}

// ========================
// FILTERED ORDERS
// ========================
const filteredOrders = computed(() => {
  let result = allOrders.value;
  if (activeTab.value !== "all") {
    result = result.filter((o) => o.status === activeTab.value);
  }
  const q = query.value.trim().toLowerCase();
  if (q) {
    result = result.filter((o) => {
      const itemText = o.items.map((it) => it.name).join(" ");
      return `${o.invoice} ${o.customer.name} ${itemText}`
        .toLowerCase()
        .includes(q);
    });
  }
  if (selectedDate.value) {
    result = result.filter((o) =>
      isDateInRange(o.created_at, selectedDate.value),
    );
  }
  return result;
});

const activeFilterCount = computed(() => (selectedDate.value ? 1 : 0));

function openFilterModal() {
  tempDate.value = selectedDate.value;
  showFilterModal.value = true;
}
function applyFilters() {
  selectedDate.value = tempDate.value;
  showFilterModal.value = false;
}
function resetFilters() {
  selectedDate.value = "";
  tempDate.value = "";
  showFilterModal.value = false;
}

// ========================
// PAGINATION (client-side)
// ========================
const currentPage = ref(1);
const perPage = 10;

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredOrders.value.slice(start, start + perPage);
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredOrders.value.length / perPage)),
);
const paginationInfo = computed(() => ({
  start:
    filteredOrders.value.length === 0
      ? 0
      : (currentPage.value - 1) * perPage + 1,
  end: Math.min(currentPage.value * perPage, filteredOrders.value.length),
  total: filteredOrders.value.length,
  per_page: perPage,
}));

watch(filteredOrders, () => {
  currentPage.value = 1;
});

// ========================
// TABLE COLUMNS
// ========================
const tableColumns = [
  { key: "invoice", label: "No. Pesanan" },
  { key: "customer.name", label: "Pelanggan" },
  { key: "itemsSummary", label: "Produk" },
  { key: "created_at", label: "Tanggal" },
  { key: "amounts.total", label: "Total" },
  { key: "payment_method", label: "Pembayaran" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

// ========================
// HELPERS
// ========================
function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function statusProps(status) {
  const map = {
    pending_payment: {
      variant: "payment",
      status: "pending",
      label: "Menunggu Bayar",
      size: "sm",
      showIcon: true,
    },
    processing: {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    },
    completed: {
      variant: "order",
      status: "completed",
      size: "sm",
      showIcon: true,
    },
    cancelled: {
      variant: "order",
      status: "cancelled",
      size: "sm",
      showIcon: true,
    },
  };
  return (
    map[status] ?? {
      variant: "order",
      status: "pending",
      size: "sm",
      showIcon: true,
    }
  );
}
function goToDetail(order) {
  router.push(
    `/merchant-center/${currentMerchantSlug.value}/orders/${order.id}`,
  );
}

onMounted(() => {
  fetchOrders();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-gray-100 sm:hidden"
        >
          <i class="text-gray-500 pi pi-bars"></i>
        </button>
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Kelola & proses pesanan masuk.
          </p>
        </div>
      </div>
    </div>

    <div class="h-20 sm:h-0"></div>

    <div class="px-4 py-2 space-y-4 sm:px-6 sm:py-6">
      <!-- STATUS TABS -->
      <div class="overflow-x-auto bg-white shadow-sm rounded-xl no-scrollbar">
        <div class="flex min-w-max sm:min-w-0">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition whitespace-nowrap',
              activeTab === tab.key
                ? 'text-merchant-primary border-b-2 border-merchant-primary'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent',
            ]"
          >
            {{ tab.label }}
            <span
              v-if="tabCounts[tab.key]"
              :class="[
                'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold',
                activeTab === tab.key
                  ? 'bg-merchant-primary text-white'
                  : 'bg-gray-100 text-gray-500',
              ]"
            >
              {{ tabCounts[tab.key] }}
            </span>
          </button>
        </div>
      </div>

      <!-- SEARCH + FILTER -->
      <div class="flex items-center gap-2">
        <TextField
          name="search"
          :modelValue="query"
          @update:modelValue="(v) => (query = v)"
          placeholder="Cari no. pesanan / pelanggan / produk"
          :hideLabel="true"
          variant="merchant"
          wrapperClass="flex-1"
          :alignWithPassword="false"
        />
        <button
          type="button"
          @click="openFilterModal"
          class="relative flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
        >
          <i class="text-gray-500 pi pi-sliders-h"></i>
          <span
            v-if="activeFilterCount > 0"
            class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-merchant-primary"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>

      <!-- Active filter chip -->
      <div v-if="selectedDate" class="flex flex-wrap gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white rounded-full bg-merchant-primary"
        >
          {{ dateOptions.find((d) => d.value === selectedDate)?.label }}
          <button
            type="button"
            @click="selectedDate = ''"
            class="hover:opacity-75"
          >
            <i class="pi pi-times text-[9px]"></i>
          </button>
        </span>
      </div>

      <!-- DESKTOP TABLE -->
      <div class="hidden sm:block">
        <MerchantTable
          :items="paginatedOrders"
          :columns="tableColumns"
          :loading="ordersLoading"
          :showCheckbox="false"
          :currentPage="currentPage"
          :totalPages="totalPages"
          :paginationInfo="paginationInfo"
          emptyMessage="Tidak ada pesanan masuk"
          @row-click="goToDetail"
          @page-change="(p) => (currentPage = p)"
          @next-page="currentPage++"
          @prev-page="currentPage--"
        >
          <template #cell-invoice="{ item }">
            <div>
              <div class="text-sm font-semibold text-gray-800">
                {{ item.invoice }}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">{{ item.id }}</div>
            </div>
          </template>

          <template #cell-customer.name="{ item }">
            <div>
              <div class="text-sm font-medium text-gray-800">
                {{ item.customer.name }}
              </div>
              <div class="text-xs text-gray-400">{{ item.customer.phone }}</div>
            </div>
          </template>

          <template #cell-itemsSummary="{ item }">
            <div class="max-w-xs">
              <div class="text-sm text-gray-800 truncate">
                {{ item.items[0].name }}
                <span v-if="item.items.length > 1" class="text-gray-400">
                  +{{ item.items.length - 1 }} lainnya
                </span>
              </div>
              <div class="text-xs text-gray-400">
                {{ item.items.reduce((s, it) => s + it.qty, 0) }} item
              </div>
            </div>
          </template>

          <template #cell-created_at="{ item }">
            <div>
              <div class="text-sm text-gray-700">
                {{ formatDate(item.created_at) }}
              </div>
              <div class="text-xs text-gray-400">
                {{ formatTime(item.created_at) }}
              </div>
            </div>
          </template>

          <template #cell-amounts.total="{ item }">
            <div class="text-sm font-semibold text-gray-800">
              Rp {{ formatIDR(item.amounts.total) }}
            </div>
          </template>

          <template #cell-payment_method="{ item }">
            <div class="text-sm text-gray-600">{{ item.payment_method }}</div>
          </template>

          <template #cell-status="{ item }">
            <StatusLabel v-bind="statusProps(item.status)" />
          </template>

          <template #cell-actions="{ item }">
            <Button variant="merchant" size="sm" @click.stop="goToDetail(item)">
              Detail
            </Button>
          </template>
        </MerchantTable>
      </div>

      <!-- MOBILE CARD LIST -->
      <div class="space-y-3 sm:hidden">
        <div
          v-if="paginatedOrders.length === 0"
          class="flex flex-col items-center justify-center py-16 bg-white rounded-xl"
        >
          <i class="mb-3 text-4xl text-gray-300 pi pi-inbox"></i>
          <p class="text-sm text-gray-400">Tidak ada pesanan masuk</p>
        </div>

        <button
          v-for="order in paginatedOrders"
          :key="order.id"
          type="button"
          class="w-full text-left bg-white rounded-2xl border border-gray-200 overflow-hidden active:scale-[0.99] transition"
          @click="goToDetail(order)"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-gray-100"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-800 truncate">
                {{ order.invoice }}
              </p>
              <p class="text-xs text-gray-400">
                {{ formatDate(order.created_at) }}
                {{ formatTime(order.created_at) }}
              </p>
            </div>
            <StatusLabel v-bind="statusProps(order.status)" />
          </div>

          <div class="px-4 py-3 space-y-2">
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-user shrink-0"></i>
              <span class="text-sm text-gray-700">{{
                order.customer.name
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-box shrink-0"></i>
              <span class="text-sm text-gray-600 truncate">
                {{ order.items[0].name }}
                <span v-if="order.items.length > 1" class="text-gray-400">
                  +{{ order.items.length - 1 }} lainnya
                </span>
              </span>
            </div>
            <div class="flex items-center justify-between pt-1">
              <div class="flex items-center gap-1.5">
                <i class="text-xs text-gray-400 pi pi-credit-card"></i>
                <span class="text-xs text-gray-500">{{
                  order.payment_method
                }}</span>
              </div>
              <span class="text-sm font-bold text-gray-800">
                Rp {{ formatIDR(order.amounts.total) }}
              </span>
            </div>
          </div>
        </button>

        <MobilePagination
          v-if="totalPages > 1"
          :currentPage="currentPage"
          :totalPages="totalPages"
          :paginationInfo="paginationInfo"
          @next-page="currentPage++"
          @prev-page="currentPage--"
        />
      </div>
    </div>

    <!-- FILTER MODAL -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter Pesanan"
      show-footer
      @close="showFilterModal = false"
    >
      <div class="space-y-4">
        <SelectField
          name="filter_date"
          variant="merchant"
          v-model="tempDate"
          label="Rentang Waktu"
          :options="dateOptions"
          placeholder="Semua tanggal"
        />
      </div>
      <template #footer>
        <div class="flex gap-3">
          <button
            type="button"
            @click="resetFilters"
            class="flex-1 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            Reset
          </button>
          <button
            type="button"
            @click="applyFilters"
            class="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl bg-merchant-primary hover:bg-merchant-primary/90 transition"
          >
            Terapkan
          </button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
