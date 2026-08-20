<script setup>
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
      if (o.payment_method === 'COD' || o.order_type === 'jasa') return "waiting_review"; // COD/Jasa langsung tunggu konfirmasi
      return beStatus;
    case "responsed":
    case "accepted":
    case "on-progress":
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
    case "unpicked":
      return "unpicked";
    default:
      return beStatus;
  }
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}?size=thumb`;
}

function mapMerchantOrder(o) {
  return {
    id: o.id,
    invoice: o.order_code || `ORD-${o.id}`,
    customer: {
      name: o.nama || o.user_name_snapshot || o.user?.name || "Pelanggan",
      phone: o.tel || o.user_phone_snapshot || o.user?.phone || "-",
    },
    status: mapApiStatus(o.status, o),
    payment_method: o.payment_method === 'WhatsApp' ? 'Belum Ditetapkan' : (o.payment_method || o.metode_pembayaran || 'Belum Ditetapkan'),
    order_type: o.order_type || (o.jasa_id ? 'jasa' : 'product'),
    delivery_type: o.delivery_type || (o.catatan_alamat ? 'delivery' : 'pickup'),
    created_at: o.created_at,
    items: o.order_type === 'jasa' || o.jasa_id
      ? (o.jasa_items || []).map((it) => ({
          id: it.id,
          name: it.jasa_title_snapshot || it.jasa?.title || "Layanan Jasa",
          variant: it.order_method === 'langsung_pesan' || it.order_method === 'keranjang' ? 'Langsung Pesan' : (it.order_method === 'konsultasi' || it.order_method === 'memerlukan_konsultasi' ? 'Konsultasi' : 'Booking'),
          addons: [],
          qty: it.quantity || 1,
          price: it.price || it.jasa_price_snapshot,
          subtotal: it.subtotal || it.price,
          image: getOrderSnapshotUrl(it.id, it.image_snapshot_path || it.jasa_image_snapshot),
        }))
      : (o.items || []).map((it) => ({
          id: it.id,
          name: it.product?.name || it.product_name_snapshot || it.jasa_title_snapshot || "Item/Layanan",
          variant: it.variant?.variant_name || it.variant?.sku || it.product_variant_snapshot || "",
          addons: (it.addons || []).map((a) => ({
            name: a.addon_name_snapshot || a.addon?.name || "Addon",
            price: Number(a.addon_price_snapshot || 0),
          })),
          qty: it.quantity,
          price: it.price || it.unit_price_snapshot,
          subtotal: it.subtotal || it.subtotal_snapshot || ((it.price || it.unit_price_snapshot) * it.quantity),
          image: it.product?.cover_image?.src_url || getOrderSnapshotUrl(it.id, it.image_snapshot_path || it.jasa_image_snapshot),
        })),
    amounts: {
      subtotal: Number(o.subtotal || o.total || 0),
      discount: Number(o.discount_total || 0),
      shipping: Number(o.shipping_fee || o.delivery_fee_snapshot || 0),
      total: Number(o.total || o.gross_amount || 0),
    },
    customer_address:
      (o.customer_address && String(o.customer_address).trim()) ||
      (o.user?.full_address && String(o.user.full_address).trim()) ||
      (o.user?.primary_address?.full_address && String(o.user.primary_address.full_address).trim()) ||
      (o.alamat && String(o.alamat).trim().toLowerCase() !== String(o.merchant?.address || "").trim().toLowerCase() ? String(o.alamat).trim() : "") ||
      [
        o.address_detail_snapshot,
        o.village_name_snapshot,
        o.district_name_snapshot,
        o.city_name_snapshot,
        o.province_name_snapshot,
      ]
        .filter(Boolean)
        .join(", ") || "-",
    shipping_address:
      (o.customer_address && String(o.customer_address).trim()) ||
      (o.user?.full_address && String(o.user.full_address).trim()) ||
      (o.alamat && String(o.alamat).trim().toLowerCase() !== String(o.merchant?.address || "").trim().toLowerCase() ? String(o.alamat).trim() : "") || "",
    note: o.catatan || "",
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
  { key: "waiting_review", label: "Perlu Konfirmasi" },
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
  { key: "itemsSummary", label: "Item/Layanan" },
  { key: "created_at", label: "Tanggal" },
  { key: "amounts.total", label: "Total" },
  { key: "payment_method", label: "Pembayaran" },
  { key: "delivery_type", label: "Pengiriman/Pengerjaan" },
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
    unpicked: {
      variant: "order",
      status: "cancelled",
      label: "Tidak Diambil",
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
    <!-- Header - FIXED -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 border-b border-gray-100 sm:border-0"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background lg:hidden"
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
          </div>
        </div>
      </div>


    </div>
    <div class="h-24 sm:h-0"></div>

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

        <!-- SEARCH + FILTER + REFRESH -->
        <div class="flex items-center gap-2">
          <TextField
            name="search"
            :modelValue="query"
            @update:modelValue="(v) => (query = v)"
            placeholder="Cari no. pesanan / pelanggan / layanan"
            :hideLabel="true"
            variant="merchant"
            wrapperClass="flex-1"
            :alignWithPassword="false"
          />
          <button
            type="button"
            @click="fetchOrders"
            :disabled="ordersLoading"
            title="Segarkan Pesanan"
            class="relative flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
          >
            <i :class="['text-gray-500 pi pi-refresh', { 'animate-spin text-merchant-primary': ordersLoading }]"></i>
          </button>
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
            <div class="space-y-1">
              <div class="font-mono text-sm font-bold text-gray-900">
                {{ item.invoice }}
              </div>
              <span
                class="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md"
                :class="item.order_type === 'jasa' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'"
              >
                {{ item.order_type === 'jasa' ? 'Layanan Jasa' : 'Produk' }}
              </span>
            </div>
          </template>

          <template #cell-customer.name="{ item }">
            <div class="space-y-0.5">
              <div class="text-sm font-semibold text-gray-900">
                {{ item.customer.name }}
              </div>
              <div class="text-xs text-gray-500 flex items-center gap-1">
                <i class="pi pi-phone text-[10px] text-gray-400"></i>
                <span>{{ item.customer.phone || '-' }}</span>
              </div>
            </div>
          </template>

          <template #cell-itemsSummary="{ item }">
            <div v-if="item.items && item.items.length > 0" class="flex items-center gap-2.5 max-w-xs">
              <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                <img
                  v-if="item.items[0].image"
                  :src="item.items[0].image"
                  :alt="item.items[0].name"
                  class="w-full h-full object-cover"
                  @error="(e) => (e.target.style.display = 'none')"
                />
                <i v-else class="pi pi-box text-gray-400 text-sm"></i>
              </div>
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="text-xs font-semibold text-gray-900 truncate" :title="item.items[0].name">
                  {{ item.items[0].name }}
                </div>
                <div class="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
                  <span v-if="item.items[0].variant">{{ item.items[0].variant }}</span>
                  <span v-if="item.items.length > 1" class="text-merchant-primary font-medium">
                    +{{ item.items.length - 1 }} lainnya
                  </span>
                  <span class="text-gray-400">• {{ item.items.reduce((s, it) => s + it.qty, 0) }} item</span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-gray-400">-</div>
          </template>

          <template #cell-created_at="{ item }">
            <div>
              <div class="text-sm font-medium text-gray-800">
                {{ formatDate(item.created_at) }}
              </div>
              <div class="text-xs text-gray-400">
                {{ formatTime(item.created_at) }}
              </div>
            </div>
          </template>

          <template #cell-amounts.total="{ item }">
            <div class="space-y-0.5">
              <div class="text-sm font-bold text-gray-900">
                Rp {{ formatIDR(item.amounts.total) }}
              </div>
              <div v-if="item.amounts.discount > 0" class="text-[10px] text-green-600 font-medium">
                Hemat Rp {{ formatIDR(item.amounts.discount) }}
              </div>
            </div>
          </template>

          <template #cell-payment_method="{ item }">
            <span class="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
              <i :class="item.payment_method === 'QRIS' ? 'pi pi-qrcode text-merchant-primary' : (item.payment_method === 'Transfer Bank' || item.payment_method === 'Transfer' ? 'pi pi-credit-card text-blue-600' : 'pi pi-wallet text-gray-500')"></i>
              <span>{{ item.payment_method }}</span>
            </span>
          </template>

          <template #cell-delivery_type="{ item }">
            <div>
              <span v-if="['cancelled', 'rejected', 'undelivered', 'unpicked', 'batal', 'gagal'].includes(item.status)" class="text-gray-400 text-sm">
                -
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                :class="item.delivery_type === 'pickup' || item.delivery_type === 'in-store' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'"
              >
                <i :class="item.delivery_type === 'pickup' || item.delivery_type === 'in-store' ? 'pi pi-shopping-bag text-[10px]' : 'pi pi-truck text-[10px]'"></i>
                <span>{{ item.order_type === 'jasa' ? (item.delivery_type === 'in-store' ? 'Di Tempat' : (item.delivery_type === 'on-site' ? 'Panggilan' : 'Online')) : (item.delivery_type === 'delivery' ? 'Kirim ke Alamat' : (item.delivery_type === 'pickup' ? 'Ambil Sendiri' : (item.delivery_type === 'WhatsApp' ? 'Belum Ditetapkan' : item.delivery_type))) }}</span>
              </span>
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
          class="p-4 bg-white border border-gray-200/80 shadow-sm cursor-pointer rounded-2xl active:bg-gray-50 transition-all hover:border-gray-300"
          @click="goToDetail(order)"
        >
          <!-- Card Header: Invoice, Type & Status -->
          <div class="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-100">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-bold text-gray-900 truncate">
                  {{ order.invoice }}
                </span>
                <span
                  class="px-1.5 py-0.5 text-[9px] font-semibold rounded"
                  :class="order.order_type === 'jasa' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'"
                >
                  {{ order.order_type === 'jasa' ? 'Jasa' : 'Produk' }}
                </span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5">
                {{ formatDate(order.created_at) }} • {{ formatTime(order.created_at) }}
              </p>
            </div>
            <StatusLabel v-bind="statusProps(order.status)" size="sm" />
          </div>

          <!-- Card Body: Customer & First Item Preview -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5 text-gray-700 font-medium">
                <i class="text-xs text-gray-400 pi pi-user"></i>
                <span>{{ order.customer.name }}</span>
              </div>
              <span class="text-[11px] text-gray-400 font-mono">{{ order.customer.phone || '' }}</span>
            </div>

            <!-- Item Preview -->
            <div v-if="order.items && order.items.length > 0" class="flex items-center gap-3 p-2 rounded-xl bg-gray-50/80 border border-gray-100">
              <div class="w-11 h-11 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0 flex items-center justify-center">
                <img
                  v-if="order.items[0].image"
                  :src="order.items[0].image"
                  :alt="order.items[0].name"
                  class="w-full h-full object-cover"
                  @error="(e) => (e.target.style.display = 'none')"
                />
                <i v-else class="pi pi-box text-gray-400"></i>
              </div>
              <div class="flex-1 min-w-0 space-y-0.5">
                <p class="text-xs font-semibold text-gray-900 truncate">
                  {{ order.items[0].name }}
                </p>
                <p class="text-[11px] text-gray-500 truncate">
                  <span v-if="order.items[0].variant">{{ order.items[0].variant }} • </span>
                  <span>{{ order.items.reduce((s, it) => s + it.qty, 0) }} item</span>
                  <span v-if="order.items.length > 1" class="text-merchant-primary font-medium"> (+{{ order.items.length - 1 }} lainnya)</span>
                </p>
              </div>
            </div>

            <!-- Card Footer: Payment, Delivery & Amount -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700">
                  <i class="text-[9px] pi pi-credit-card"></i>
                  <span>{{ order.payment_method }}</span>
                </span>
                <span
                  v-if="!['cancelled', 'rejected', 'undelivered', 'unpicked', 'batal', 'gagal'].includes(order.status)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                  :class="order.delivery_type === 'pickup' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
                >
                  <i :class="order.delivery_type === 'pickup' ? 'pi pi-shopping-bag text-[9px]' : 'pi pi-truck text-[9px]'"></i>
                  <span>{{ order.delivery_type === 'pickup' ? 'Ambil Sendiri' : 'Kirim' }}</span>
                </span>
              </div>
              <div class="text-right">
                <span class="text-sm font-bold text-gray-900">
                  Rp {{ formatIDR(order.amounts.total) }}
                </span>
              </div>
            </div>
          </div>
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