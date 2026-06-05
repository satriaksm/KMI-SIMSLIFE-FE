<script setup>
<<<<<<< HEAD
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
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
import echo from "@/libs/echo";
import api from "@/libs/axios";
import { formatTime, formatDate } from "@/libs/format.js";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emit = defineEmits(["toggle-sidebar"]);

const currentMerchantSlug = computed(() =>
  route.params?.merchantSlug ? String(route.params.merchantSlug) : null,
);
const currentMerchantId = computed(() => {
  if (!currentMerchantSlug.value) return null;
  return authStore.getMerchantBySlug(currentMerchantSlug.value)?.id ?? null;
});
const currentMerchantName = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return merchant?.name || "UMKM";
});

const formatIDR = (value) => {
  return Number(value || 0).toLocaleString('id-ID');
};

const breadcrumbItems = computed(() => [{ label: "Pesanan Masuk" }]);

// ========================
// ORDERS DATA (from API)
// ========================
const allOrders = ref([]);
const ordersLoading = ref(false);
let ordersChannel = null;

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review"; // sudah bayar, tunggu konfirmasi UMKM
    case "pending":
      if (o.payment_method === 'COD') return "waiting_review"; // COD langsung tunggu konfirmasi
      return beStatus;
    case "responsed":
    case "accepted":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "undelivered":
      return "undelivered";
    default:
      return beStatus;
  }
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}`;
}

function mapMerchantOrder(o) {
  return {
    id: o.id,
    invoice: o.order_code || "-",
    customer: {
      name: o.user_name_snapshot || "Pelanggan",
      phone: o.user_phone_snapshot || "-",
    },
    status: mapApiStatus(o.status, o),
    payment_method: o.payment_method || (o.payment?.payment_method || (o.delivery_type === 'pickup' && !o.payment ? "COD" : "Transfer")),
    delivery_type: o.delivery_type || 'delivery',
    created_at: o.created_at,
    items: (o.items || []).map((it) => ({
      id: it.id,
      name: it.product_name_snapshot || "Produk",
      variant: it.product_variant_snapshot || "",
      addons: (it.addons || []).map((a) => ({
        name: a.addon_name_snapshot || a.addon?.name || "Addon",
        price: Number(a.addon_price_snapshot || 0),
      })),
      qty: it.quantity,
      price: it.unit_price_snapshot,
      subtotal: it.subtotal_snapshot || it.unit_price_snapshot * it.quantity,
      image: getOrderSnapshotUrl(it.id, it.image_snapshot_path),
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
    const params = {
      q: query.value,
      status: activeTab.value !== 'all' ? activeTab.value : undefined,
      start_date: filters.value.start_date,
      end_date: filters.value.end_date,
      sort_by: filters.value.sort_by,
      page: currentPage.value,
      per_page: perPage.value
    };

    const { data: res } = await getMerchantOrders(currentMerchantSlug.value, params);
    const list = res?.data ?? res ?? [];
    allOrders.value = (Array.isArray(list) ? list : []).map(mapMerchantOrder);

    const meta = res?.meta?.pagination || res?.pagination || {};
    totalPages.value = meta.last_page || 1;
    currentPage.value = meta.current_page || 1;
    perPage.value = meta.per_page || 10;
    
    paginationInfo.value = {
      start: (currentPage.value - 1) * perPage.value + (allOrders.value.length ? 1 : 0),
      end: (currentPage.value - 1) * perPage.value + allOrders.value.length,
      total: meta.total || allOrders.value.length,
      per_page: perPage.value
    };

    const countsData = res?.meta?.counts || {};
    tabCountsData.value = countsData;
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

const filters = ref({
  start_date: "",
  end_date: "",
  sort_by: "newest"
});

const sortOptions = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
];

useBodyScrollLock(showFilterModal);

const tabs = [
  { key: "all", label: "Semua" },
  { key: "waiting_review", label: "Konfirmasi" },
  { key: "processing", label: "Diproses" },
  { key: "delivered", label: "Dikirim/Siap" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Batal/Gagal" },
];

const tabCountsData = ref({});

const tabCounts = computed(() => {
  return tabCountsData.value;
});

function openFilterModal() {
  showFilterModal.value = true;
}

function applyFilters() {
  currentPage.value = 1;
  fetchOrders();
  showFilterModal.value = false;
}

function resetFilters() {
  filters.value = {
    start_date: "",
    end_date: "",
    sort_by: "newest"
  };
  currentPage.value = 1;
  fetchOrders();
  showFilterModal.value = false;
}

// ========================
// PAGINATION
// ========================
const currentPage = ref(1);
const totalPages = ref(1);
const perPage = ref(10);
const paginationInfo = ref({
  start: 0,
  end: 0,
  total: 0,
  per_page: 10
});

watch(activeTab, () => {
  currentPage.value = 1;
  fetchOrders();
});

let searchTimeout;
watch(query, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchOrders();
  }, 500);
});

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchOrders();
};

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
  { key: "delivery_type", label: "Pengiriman" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

// ========================
// HELPERS
// ========================


function statusProps(status) {
  const map = {
    waiting_review: {
      variant: "payment",
      status: "pending",
      label: "Perlu Konfirmasi",
      size: "sm",
      showIcon: true,
    },
    processing: {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    },
    ready: {
      variant: "order",
      status: "ready",
      size: "sm",
      showIcon: true,
    },
    shipped: {
      variant: "order",
      status: "shipped",
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
    rejected: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Penjual",
      size: "sm",
      showIcon: true,
    },
    undelivered: {
      variant: "order",
      status: "cancelled",
      label: "Gagal Kirim",
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
  subscribeOrdersChannel();
});

onUnmounted(() => {
  leaveOrdersChannel(currentMerchantId.value);
});

watch(currentMerchantId, (next, prev) => {
  if (prev) {
    leaveOrdersChannel(prev);
  }
  if (next) {
    subscribeOrdersChannel();
  }
});

function subscribeOrdersChannel() {
  if (!currentMerchantId.value) return;

  ordersChannel = echo.private(`merchants.${currentMerchantId.value}.orders`);
  ordersChannel
    .listen(".order.created", () => {
      fetchOrders();
    })
    .listen(".order.status.updated", () => {
      fetchOrders();
    })
    .listen(".payment.status.updated", () => {
      fetchOrders();
    });
}

function leaveOrdersChannel(id) {
  if (!id) return;
  echo.leave(`merchants.${id}.orders`);
  ordersChannel = null;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header - FIXED -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 border-b border-gray-100 sm:border-0"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background sm:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>
        <div>
          <!-- ✅ Desktop: Show breadcrumb -->
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="currentMerchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Kelola pesanan masuk {{ currentMerchantName }}
            </p>
          </div>

          <!-- ✅ Mobile: Show simple title -->
          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Pesanan Masuk
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
=======
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const emit = defineEmits(["toggle-sidebar"]);

const activeTab = ref("semua");
const serviceType = ref("all"); // 'all', 'product', 'service'
const searchQuery = ref("");

// Sample orders data dengan type dan fulfillment status
const orders = ref([
  {
    id: "ORD-001",
    customer: "Tengku Kaisar",
    items: "Pentol Juara x2, Pempek Kapal Selam x1",
    total: "Rp 57.000",
    status: "completed",
    date: "18 Feb 2026",
    paymentStatus: "Lunas",
    type: "product",
    fulfillmentStatus: "ready",
  },
  {
    id: "ORD-002",
    customer: "Budi Santoso",
    items: "Beras WangiKu x5 kg",
    total: "Rp 350.000",
    status: "processing",
    date: "18 Feb 2026",
    paymentStatus: "Lunas",
    type: "product",
    fulfillmentStatus: "preparing",
  },
  {
    id: "ORD-003",
    customer: "Citra Dewi",
    items: "Jasa Pembuatan Website - E-commerce",
    total: "Rp 5.000.000",
    status: "pending",
    date: "17 Feb 2026",
    paymentStatus: "Menunggu",
    type: "service",
    fulfillmentStatus: "pending",
  },
  {
    id: "ORD-004",
    customer: "Doni Haryanto",
    items: "Pentol Juara x1",
    total: "Rp 11.000",
    status: "cancelled",
    date: "16 Feb 2026",
    paymentStatus: "Dibatalkan",
    type: "product",
    fulfillmentStatus: "pending",
  },
  {
    id: "ORD-005",
    customer: "Eka Putri",
    items: "Jasa Desain Grafis - Paket Premium",
    total: "Rp 2.500.000",
    status: "completed",
    date: "15 Feb 2026",
    paymentStatus: "Lunas",
    type: "service",
    fulfillmentStatus: "completed",
  },
]);

const filteredOrders = computed(() => {
  return orders.value.filter((order) => {
    const matchesTab =
      activeTab.value === "semua" || order.status === activeTab.value;
    const matchesType =
      serviceType.value === "all" || order.type === serviceType.value;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.items.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesTab && matchesType && matchesSearch;
  });
});

const getStatusBadge = (status) => {
  const statusMap = {
    pending: { label: "Menunggu", color: "bg-amber-50 text-amber-700" },
    processing: { label: "Diproses", color: "bg-blue-50 text-blue-700" },
    completed: { label: "Selesai", color: "bg-emerald-50 text-emerald-700" },
    cancelled: { label: "Dibatalkan", color: "bg-red-50 text-red-700" },
  };
  return statusMap[status];
};

const getFulfillmentBadge = (fulfillmentStatus, type) => {
  let statusMap = {};
  
  if (type === "product") {
    statusMap = {
      pending: { label: "Menunggu Pengambilan", color: "bg-amber-50 text-amber-700", icon: "pi-clock" },
      preparing: { label: "Disiapkan", color: "bg-blue-50 text-blue-700", icon: "pi-hourglass" },
      ready: { label: "Siap Diambil", color: "bg-emerald-50 text-emerald-700", icon: "pi-check" },
      completed: { label: "Diambil", color: "bg-gray-50 text-gray-700", icon: "pi-check-circle" },
    };
  } else {
    statusMap = {
      pending: { label: "Menunggu Dikerjakan", color: "bg-amber-50 text-amber-700", icon: "pi-clock" },
      preparing: { label: "Sedang Dikerjakan", color: "bg-blue-50 text-blue-700", icon: "pi-spinner" },
      ready: { label: "Selesai Dikerjakan", color: "bg-emerald-50 text-emerald-700", icon: "pi-check" },
      completed: { label: "Sudah Diserahkan", color: "bg-gray-50 text-gray-700", icon: "pi-check-circle" },
    };
  }
  
  return statusMap[fulfillmentStatus] || statusMap.pending;
};

const getNextFulfillmentStatus = (currentStatus) => {
  const flow = ["pending", "preparing", "ready", "completed"];
  const currentIndex = flow.indexOf(currentStatus);
  return currentIndex < flow.length - 1 ? flow[currentIndex + 1] : currentStatus;
};

const updateFulfillmentStatus = (orderId) => {
  const order = orders.value.find(o => o.id === orderId);
  if (order && order.paymentStatus === "Lunas") {
    order.fulfillmentStatus = getNextFulfillmentStatus(order.fulfillmentStatus);
  }
};

const canUpdateFulfillment = (order) => {
  return order.paymentStatus === "Lunas" && order.fulfillmentStatus !== "completed";
};

const tabCounts = computed(() => ({
  semua: orders.value.filter(
    (o) => serviceType.value === "all" || o.type === serviceType.value
  ).length,
  pending: orders.value.filter(
    (o) =>
      o.status === "pending" &&
      (serviceType.value === "all" || o.type === serviceType.value)
  ).length,
  processing: orders.value.filter(
    (o) =>
      o.status === "processing" &&
      (serviceType.value === "all" || o.type === serviceType.value)
  ).length,
  completed: orders.value.filter(
    (o) =>
      o.status === "completed" &&
      (serviceType.value === "all" || o.type === serviceType.value)
  ).length,
  cancelled: orders.value.filter(
    (o) =>
      o.status === "cancelled" &&
      (serviceType.value === "all" || o.type === serviceType.value)
  ).length,
}));
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-6">
    <!-- Header -->
    <div
      class="sticky top-0 z-20 bg-white border-b border-gray-200 sm:static"
    >
      <div class="flex items-center justify-between px-4 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <button
            @click="emit('toggle-sidebar')"
            class="p-2 rounded-lg hover:bg-gray-100 transition sm:hidden"
          >
            <i class="pi pi-bars text-gray-700"></i>
          </button>
          <div>
            <h1 class="text-lg sm:text-2xl font-semibold text-gray-900">
              Pesanan
            </h1>
>>>>>>> staging-ta
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div class="flex gap-2 sm:gap-3 items-center">
=======
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 ml-6">
          <span class="text-sm font-medium text-gray-700">Filter Tipe:</span>
          <div class="flex gap-2">
            <button
              v-for="type in [
                { value: 'all', label: 'Semua' },
                { value: 'product', label: 'Produk' },
                { value: 'service', label: 'Jasa' },
              ]"
              :key="type.value"
              @click="serviceType = type.value"
              :class="[
                'px-3 py-1 text-xs font-medium rounded-lg transition',
                serviceType === type.value
                  ? 'bg-merchant-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              ]"
            >
              {{ type.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 overflow-x-auto border-b border-gray-200 mb-4">
        <button
          v-for="tab in ['semua', 'pending', 'processing', 'completed', 'cancelled']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition',
            activeTab === tab
              ? 'border-merchant-primary text-merchant-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          ]"
        >
          {{ tab === 'semua' ? 'Semua' : getStatusBadge(tab)?.label }}
          <span class="ml-2 text-xs opacity-75">({{ tabCounts[tab] }})</span>
        </button>
>>>>>>> staging-ta
      </div>
    </div>

    <!-- Search Bar & Filters -->
    <div class="px-4 py-4 sm:px-6 space-y-4 border-b border-gray-200">
      <div class="relative max-w-md">
        <i
          class="absolute left-3 top-3 pi pi-search text-gray-400 text-sm"
        ></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari pesanan..."
          class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary"
        />
      </div>
    </div>

<<<<<<< HEAD
    <div class="px-4 py-0 space-y-2 sm:px-6 sm:py-6">
      <!-- STICKY WRAPPER UNTUK TABS DAN SEARCH -->
      <div class=" z-10 top-[88px] sm:top-0 bg-gray-50 pt-0 pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 space-y-2">
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
                v-if="tabCounts[tab.key] && ['waiting_review', 'processing', 'delivered'].includes(tab.key)"
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
            v-if="filters.start_date || filters.end_date || filters.sort_by !== 'newest'"
            class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-merchant-primary"
          >
            !
          </span>
        </button>
      </div>
      </div>

      <!-- DESKTOP TABLE -->
      <div class="hidden sm:block">
        <MerchantTable
          :items="allOrders"
          :columns="tableColumns"
          :loading="ordersLoading"
          :showCheckbox="false"
          :currentPage="currentPage"
          :totalPages="totalPages"
          :paginationInfo="paginationInfo"
          emptyMessage="Tidak ada pesanan masuk"
          @row-click="goToDetail"
          @page-change="handlePageChange"
        >
          <template #cell-invoice="{ item }">
            <div>
              <div class="text-sm font-semibold text-gray-800">
                {{ item.invoice }}
              </div>
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
              <div v-if="item.items[0].variant" class="text-xs text-gray-400 truncate">
                {{ item.items[0].variant }}
              </div>
              <div v-if="item.items[0].addons && item.items[0].addons.length" class="text-xs text-gray-400 truncate">
                + {{ item.items[0].addons.map(a => a.name).join(', ') }}
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

          <template #cell-delivery_type="{ item }">
            <div class="text-sm text-gray-600">
              {{ item.delivery_type === 'pickup' ? 'Ambil Sendiri' : 'Kirim' }}
            </div>
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
      <div class="sm:hidden space-y-3">
        <div
          v-if="ordersLoading"
          v-for="i in 3"
          :key="i"
          class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl animate-pulse"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-24 h-4 bg-gray-200 rounded"></div>
            <div class="w-16 h-5 bg-gray-200 rounded-full"></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div class="flex-1 space-y-2">
              <div class="w-3/4 h-3 bg-gray-200 rounded"></div>
              <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div
            class="flex items-center justify-between pt-3 mt-3 border-t border-gray-100"
          >
            <div class="w-16 h-3 bg-gray-200 rounded"></div>
            <div class="w-20 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div
          v-else-if="!allOrders.length"
          class="p-10 text-center bg-white border border-gray-100 shadow-sm rounded-2xl"
        >
          <div
            class="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full"
          >
            <i class="pi pi-inbox text-gray-400"></i>
          </div>
          <p class="text-sm font-medium text-gray-900">Tidak ada pesanan</p>
          <p class="text-xs text-gray-500 mt-1">Coba sesuaikan filter pencarian.</p>
        </div>

        <div
          v-else
          v-for="order in allOrders"
          :key="order.id"
          class="p-4 bg-white border border-gray-100 shadow-sm cursor-pointer rounded-2xl active:bg-gray-50"
          @click="goToDetail(order)"
        >
          <div
            class="flex items-center justify-between mb-3"
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

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-user shrink-0"></i>
              <span class="text-sm text-gray-700">{{
                order.customer.name
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-box shrink-0"></i>
              <div class="flex-1 min-w-0">
                <span class="text-sm text-gray-600 truncate block">
                  {{ order.items[0].name }}
                  <span v-if="order.items.length > 1" class="text-gray-400">
                    +{{ order.items.length - 1 }} lainnya
                  </span>
                </span>
                <span v-if="order.items[0].variant" class="text-xs text-gray-400 truncate block">
                  {{ order.items[0].variant }}
                </span>
                <span v-if="order.items[0].addons && order.items[0].addons.length" class="text-xs text-gray-400 truncate block">
                  + {{ order.items[0].addons.map(a => a.name).join(', ') }}
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between pt-1">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-credit-card"></i>
                  <span class="text-xs text-gray-500">{{ order.payment_method }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-shopping-bag"></i>
                  <span class="text-xs text-gray-500">{{ order.delivery_type === 'pickup' ? 'Ambil Sendiri' : 'Kirim' }}</span>
                </div>
              </div>
              <span class="text-sm font-bold text-gray-800">
                Rp {{ formatIDR(order.amounts.total) }}
              </span>
            </div>
          </div>
=======
    <!-- Orders List -->
    <div class="px-4 sm:px-6 space-y-3">
      <div
        v-if="filteredOrders.length === 0"
        class="text-center py-12 bg-white rounded-lg border border-gray-200"
      >
        <i class="pi pi-inbox text-5xl text-gray-300 mb-3 block"></i>
        <p class="text-gray-500 font-medium">Tidak ada pesanan</p>
      </div>

      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
      >
        <!-- Order Header -->
        <div class="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900 mb-1">{{ order.id }}</p>
            <p class="text-sm text-gray-600">{{ order.customer }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">{{ order.total }}</p>
            <p class="text-xs text-gray-500">{{ order.date }}</p>
          </div>
        </div>

        <!-- Order Items -->
        <div class="mb-3">
          <p class="text-sm text-gray-700">{{ order.items }}</p>
        </div>



        <!-- Actions -->
        <div class="flex items-center justify-between gap-2">
          <button
            v-if="canUpdateFulfillment(order)"
            @click="updateFulfillmentStatus(order.id)"
            class="px-3 py-2 text-xs font-medium text-white rounded-lg bg-merchant-primary hover:bg-merchant-primary/90 transition"
          >
            {{ order.type === 'product' ? 'Lanjutkan Proses' : 'Update Status' }}
          </button>
          <div v-else class="text-xs text-gray-500 font-medium">✓ Pesanan Selesai</div>
          <button
            class="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Lihat Detail
          </button>
>>>>>>> staging-ta
        </div>
      </div>

      <!-- Mobile Pagination -->

       <div
      v-if="!ordersLoading && allOrders.length > 0"
      class=" pb-4 sm:hidden"
    >
      <MobilePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      />
    </div>
    </div>

    <!-- Modals -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan Pesanan"
      show-footer
      @close="showFilterModal = false"
    >
      <div class="space-y-6">
        <!-- ===== FILTER SECTION ===== -->
        <div class="space-y-4">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
            <i class="pi pi-filter text-merchant-primary"></i>
            Filter Data
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <TextField
              name="start_date"
              type="date"
              label="Mulai"
              v-model="filters.start_date"
              variant="merchant"
            />
            <TextField
              name="end_date"
              type="date"
              label="Sampai"
              v-model="filters.end_date"
              variant="merchant"
            />
          </div>
        </div>

        <!-- ===== SORT SECTION ===== -->
        <div class="pt-6 space-y-4 border-t border-muted-foreground/30">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
            <i class="pi pi-sort-alt text-merchant-primary"></i>
            Urutkan Berdasarkan
          </h3>

          <!-- Sort by Date -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">
              <i class="mr-1 text-xs pi pi-calendar"></i>
              Waktu Pembuatan
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="filters.sort_by = 'newest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  filters.sort_by === 'newest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-down-alt"></i>
                Terbaru
              </button>
              <button
                @click="filters.sort_by = 'oldest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  filters.sort_by === 'oldest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-up"></i>
                Terlama
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button @click="resetFilters" variant="muted-outline" block>
            <i class="mr-2 pi pi-refresh"></i>
            Reset
          </Button>
          <Button @click="applyFilters" block variant="merchant">
            <i class="mr-2 pi pi-check"></i>
            Terapkan
          </Button>
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
