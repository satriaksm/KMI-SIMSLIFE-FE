<template>
  <div class="min-h-screen bg-gray-100">
<MobileHeader title="Pesanan Saya" @back="goBack" variant="primary" />

    <div class="px-4 py-4 mx-auto space-y-2 sm:space-y-4 max-w-7xl">
      <!-- Search + Filter Button -->
      <div class="flex items-center gap-2">
        <TextField
          name="search"
          :modelValue="query"
          @update:modelValue="(v) => (query = v)"
          placeholder="Cari transaksi"
          :hideLabel="true"
          variant="primary"
          wrapperClass="flex-1"
          :alignWithPassword="false"
        />
        <button
          type="button"
          @click="openFilterModal"
          class="relative flex items-center justify-center transition bg-white border w-11 h-11 border-primary rounded-xl shrink-0 active:scale-95"
          aria-label="Filter"
        >
          <i class="pi pi-sliders-h text-primary"></i>
          <span
            v-if="activeFilterCount > 0"
            class="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full bg-danger-foreground"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>

      <!-- Active filter chips -->
      <div v-if="activeFilterCount > 0" class="flex flex-wrap items-center gap-2">
        <span
          v-if="selectedStatus"
          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-full bg-primary"
        >
          {{ selectedStatusLabel }}
          <button type="button" @click="selectedStatus = ''; applyTempToActive()" class="ml-1">
            <i class="pi pi-times text-[10px]"></i>
          </button>
        </span>
        <span
          v-if="selectedDate"
          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-full bg-primary"
        >
          {{ selectedDateLabel }}
          <button type="button" @click="selectedDate = ''; applyTempToActive()" class="ml-1">
            <i class="pi pi-times text-[10px]"></i>
          </button>
        </span>
        <button
          type="button"
          @click="resetFilters"
          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-full bg-danger-foreground"
        >
          <i class="pi pi-times text-[10px]"></i>
          Reset
        </button>
      </div>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="grid grid-cols-1 gap-2 sm:gap-4">
          <div
            v-for="n in 4"
            :key="'skel-' + n"
            class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div class="w-24 h-4 bg-gray-200 rounded"></div>
              </div>
              <div class="w-20 h-5 bg-gray-200 rounded-full"></div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 bg-gray-200 rounded-xl shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
                <div class="w-1/3 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <div class="w-28 h-4 bg-gray-200 rounded"></div>
              <div class="w-20 h-8 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Order list -->
        <div class="grid grid-cols-1 gap-2 sm:gap-4">
          <template v-for="order in filteredOrders" :key="order.order_id || order.id">
            <!-- Jasa Order Card -->
            <ServiceOrderCard
              v-if="order.order_type === 'jasa'"
              :order="order"
              @click="openOrder"
            >
              <template #action="{ order: o }">
                <!-- SLA Countdown: merchant response deadline -->
                <div
                  v-if="getMerchantDeadlineRemaining(o)"
                  class="flex items-center gap-1.5 mb-2 text-xs text-orange-600 font-medium"
                >
                  <i class="pi pi-clock"></i>
                  Sisa waktu respon merchant: {{ getMerchantDeadlineRemaining(o) }}
                </div>
                <!-- SLA Countdown: completion confirmation deadline -->
                <div
                  v-if="getCompletionDeadlineRemaining(o)"
                  class="flex items-center gap-1.5 mb-2 text-xs text-orange-600 font-medium"
                >
                  <i class="pi pi-clock"></i>
                  Sisa waktu konfirmasi selesai: {{ getCompletionDeadlineRemaining(o) }}
                </div>
                <!-- Bayar Kembali (Xendit belum dibayar) -->
                <Button
                  v-if="needsPayment(o)"
                  @click.stop="retryPayment(o)"
                  class="h-8 px-3 py-1.5 text-xs text-white border-0 bg-blue-500 hover:bg-blue-600"
                >
                  <i class="pi pi-credit-card mr-1"></i>
                  Bayar Sekarang
                </Button>
                <!-- Konfirmasi Selesai (merchant sudah upload bukti) -->
                <Button
                  v-if="o.status === 'menunggu_konfirmasi_selesai' || o.status === 'menunggu_selesai'"
                  @click.stop="openOrderConfirmSelesai(o)"
                  class="h-8 px-3 py-1.5 text-xs text-white border-0 bg-green-500 hover:bg-green-600"
                >
                  <i class="pi pi-check-circle mr-1"></i>
                  Konfirmasi Selesai
                </Button>
                <!-- Beri Ulasan (belum pernah review) -->
                <Button
                  v-if="o.can_review"
                  @click.stop="goToReview(o)"
                  class="h-8 px-3 py-1.5 text-xs text-white border-0 bg-merchant-primary hover:bg-merchant-primary/90"
                >
                  <i class="pi pi-star mr-1"></i>
                  Beri Rating dan Ulasan
                </Button>
                <!-- Perbarui Ulasan (sudah review, masih boleh update) -->
                <Button
                  v-else-if="o.is_reviewed && o.can_update_review"
                  @click.stop="goToReview(o)"
                  class="h-8 px-3 py-1.5 text-xs text-white border-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-semibold"
                >
                  <i class="pi pi-pencil mr-1"></i>
                  Perbarui Rating dan Ulasan
                </Button>
                <!-- Ulasan sudah diperbarui (sudah review, tidak boleh update lagi) -->
                <div
                  v-else-if="o.is_reviewed && !o.can_update_review"
                  class="inline-flex items-center gap-1.5 h-8 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 border border-green-300 cursor-default"
                >
                  <i class="pi pi-check-circle"></i>
                  Ulasan sudah diperbarui
                </div>
              </template>
            </ServiceOrderCard>

            <!-- Product/Kuliner Order Card -->
            <OrderCard
              v-else
              :order="order"
              @click="openOrder"
            >
              <template #action="{ order: o }">
                <Button
                  v-if="o.status === 'pending_payment'"
                  @click.stop="retryPayment(o)"
                  class="h-8 px-3 py-1.5 text-xs text-white border-0 bg-blue-500 hover:bg-blue-600"
                >
                  <i class="pi pi-credit-card mr-1"></i>
                  Bayar Sekarang
                </Button>
              </template>
            </OrderCard>
          </template>
        </div>

        <!-- Empty -->
        <div
          v-if="!loading && filteredOrders.length === 0"
          class="p-8 text-center bg-white border border-gray-200 rounded-2xl"
        >
          <div class="text-lg font-bold text-black">Pesanan tidak ditemukan</div>
          <div class="mt-1 text-sm text-muted-foreground">
            {{ orders.length === 0 ? 'Belum ada pesanan.' : 'Coba ubah filter pencarian.' }}
          </div>
        </div>
      </template>
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter Pesanan"
      show-footer
      @close="closeFilterModal"
    >
      <div class="space-y-6">
        <div class="space-y-4">
          <h3 class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase">
            <i class="pi pi-filter text-primary"></i>
            Filter Data
          </h3>

          <!-- Status Filter -->
          <SelectField
            name="filter_status"
            variant="primary"
            v-model="tempStatus"
            label="Status Pesanan"
            :options="statusOptions"
            placeholder="Semua status"
          />

          <!-- Date Range Filter -->
          <SelectField
            name="filter_date"
            variant="primary"
            v-model="tempDate"
            label="Rentang Waktu"
            :options="dateOptions"
            placeholder="Semua tanggal"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <button
            type="button"
            @click="resetFilters"
            class="flex-1 py-2.5 text-sm font-semibold transition border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            @click="applyFilters"
            class="flex-1 py-2.5 text-sm font-semibold text-white transition rounded-xl bg-primary hover:bg-primary/90"
          >
            Terapkan
          </button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import ServiceOrderCard from "@/components/customer/ServiceOrderCard.vue";
import OrderCard from "@/components/customer/OrderCard.vue";
import TextField from "@/components/forms/TextField.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import SelectField from "@/components/forms/SelectField.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import api from "@/libs/axios.js";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import echo from "@/libs/echo";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const userId = computed(() => authStore.user?.id);
let ordersChannel = null;

const query = ref("");
const loading = ref(false);

// ========================
// FILTER STATE
// ========================
const selectedStatus = ref("");
const selectedDate = ref("");
const showFilterModal = ref(false);

const tempStatus = ref("");
const tempDate = ref("");

useBodyScrollLock(showFilterModal);

function openFilterModal() {
  tempStatus.value = selectedStatus.value;
  tempDate.value = selectedDate.value;
  showFilterModal.value = true;
}

function closeFilterModal() {
  showFilterModal.value = false;
}

function applyFilters() {
  selectedStatus.value = tempStatus.value;
  selectedDate.value = tempDate.value;
  closeFilterModal();
}

function applyTempToActive() {
  tempStatus.value = selectedStatus.value;
  tempDate.value = selectedDate.value;
}

const statusOptions = [
  { value: "pending", label: "Menunggu Konfirmasi" },
  { value: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { value: "menunggu_konfirmasi_merchant", label: "Menunggu Konfirmasi" },
  { value: "diterima", label: "Diterima" },
  { value: "layanan_dikerjakan", label: "Sedang Dikerjakan" },
  { value: "dikerjakan", label: "Sedang Dikerjakan" }, // Fallback for backward compatibility
  { value: "menunggu_konfirmasi_selesai", label: "Menunggu Konfirmasi Selesai" },
  { value: "menunggu_selesai", label: "Menunggu Konfirmasi Selesai" }, // Fallback
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Ditolak Merchant" },
  { value: "dibatalkan", label: "Dibatalkan" },
  { value: "batal", label: "Dibatalkan" }, // From orders.status mapping
  { value: "expired", label: "Kadaluarsa" },
];

const dateOptions = [
  { value: "today", label: "Hari Ini" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_3_months", label: "3 Bulan Terakhir" },
  { value: "this_year", label: "Tahun Ini" },
];

const selectedStatusLabel = computed(() => {
  const opt = statusOptions.find((o) => o.value === selectedStatus.value);
  return opt?.label ?? "Semua Status";
});

const selectedDateLabel = computed(() => {
  const opt = dateOptions.find((o) => o.value === selectedDate.value);
  return opt?.label ?? "Semua Tanggal";
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (selectedStatus.value) count++;
  if (selectedDate.value) count++;
  return count;
});

function resetFilters() {
  selectedStatus.value = "";
  selectedDate.value = "";
  tempStatus.value = "";
  tempDate.value = "";
  closeFilterModal();
}

// ========================
// DATE RANGE HELPER
// ========================
function parseDateLabel(label) {
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
    Jul: 6, Agt: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11,
  };
  const parts = label.trim().split(" ");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

function isDateInRange(dateLabel, range) {
  const orderDate = parseDateLabel(dateLabel);
  if (!orderDate) return true;

  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);

  if (range === "today") return orderDate >= today;
  if (range === "this_week") {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - now.getDay());
    return orderDate >= startOfWeek;
  }
  if (range === "this_month") {
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }
  if (range === "last_3_months") {
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return orderDate >= threeMonthsAgo;
  }
  if (range === "this_year") return orderDate.getFullYear() === now.getFullYear();
  return true;
}

// ========================
// ORDERS DATA (from API)
// ========================
const orders = ref([]);

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "pending":
      // Check if expired
      if (o.payment && o.payment.expired_at) {
        const expireTime = new Date(o.payment.expired_at).getTime();
        if (new Date().getTime() > expireTime) return "cancelled";
      }
      // COD orders don't need payment → they are "processing" (waiting UMKM confirm)
      if (o.payment_method === 'COD') return "processing";
      return "pending_payment";
    case "paid":
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

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}`;
}

// Normalize array: handle backend pagination response { data: [...] }
function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

// Check if order is valid (not a corrupted/legacy order)
function isValidOrder(o) {
  // Filter out orders that look like corrupted/legacy service_orders
  // Backend returns service_title for jasa orders, not service_name
  const merchantName = o.merchant?.name || o.merchant_name || '';
  const serviceTitle = o.service_title || o.service_name || '';
  if (merchantName.toLowerCase().includes('umkm') || merchantName === 'Merchant') {
    // If merchant name is generic, check if service is also generic
    if (serviceTitle === 'Layanan' || serviceTitle === 'Layanan') {
      // Check if this is a valid jasa order with actual data
      const hasValidJasaItems = normalizeArray(o.jasa_items || o.jasaItems || o.services).length > 0;
      if (!hasValidJasaItems) {
        return false;
      }
    }
  }
  // Filter out orders with zero total that have no valid items
  const hasProductItems = o.items && o.items.length > 0;
  const hasJasaItems = normalizeArray(o.jasa_items || o.jasaItems || o.services).length > 0;
  if (!hasProductItems && !hasJasaItems && (o.total === 0 || o.gross_amount === 0)) {
    return false;
  }
  // Filter out orders with generic merchant and no actual content
  if (merchantName === 'Merchant' || merchantName === 'UMKM' || merchantName === 'UMJM') {
    if (!hasJasaItems && !hasProductItems) {
      return false;
    }
  }
  return true;
}

function mapOrder(o) {
  // Products use o.items directly (from order_items table)
  // Jasa use o.jasaItems/o.jasa_items (from jasa_order_items table)
  const hasJasaItems = normalizeArray(o.jasa_items || o.jasaItems || o.services).length > 0;
  const isJasaOrder = o.order_type === 'jasa' || o.type === 'jasa' || hasJasaItems;

  // For products: use items array from order_items
  // For jasa: use jasaItems/jasa_items from jasa_order_items
  let rawItems;
  if (isJasaOrder) {
    rawItems = normalizeArray(o.jasa_items || o.jasaItems || o.services);
  } else {
    // Products - use items directly from order_items
    rawItems = normalizeArray(o.order_items || o.orderItems || o.items);
  }

  return {
    id: o.id,
    storeName: o.merchant?.name || o.merchant_name || "Toko",
    dateLabel: formatDateLabel(o.created_at),
    status: mapApiStatus(o.status, o),
    total: o.gross_amount || o.total_price || 0,
    delivery_type: o.delivery_type || "delivery",
    items: rawItems.map((it) => ({
      id: it.id,
      productId: it.product_id || it.jasa_id,
      title: it.product_name_snapshot || it.product?.name || it.service_name || it.jasa?.title || "Item",
      qty: it.quantity || 1,
      variant: it.product_variant_snapshot || "",
      addons: normalizeArray(it.addons || []).map((a) => ({
        name: a.addon_name_snapshot || a.addon?.name || "Addon",
        price: Number(a.addon_price_snapshot || 0),
      })),
      price: it.price !== undefined && it.price !== null ? it.price : (it.unit_price_snapshot || 0),
      imageUrl: (() => {
        const snap = it.image_snapshot_path ? getOrderSnapshotUrl(it.id, it.image_snapshot_path) : null;
        if (snap) return snap;
        const prodImg = it.product?.image;
        const fallbackImg = (prodImg !== undefined && prodImg !== null) ? prodImg : it.service_image;
        if (fallbackImg) {
          if (fallbackImg.startsWith('http')) return fallbackImg;
          const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const cleanPath = fallbackImg.startsWith('/') ? fallbackImg : `/${fallbackImg}`;
          return `${baseUrl}/storage${cleanPath}`;
        }
        return '/placeholder.png';
      })(),
      productSlug: it.product?.slug,
    })),
    order_items: (o.order_items || o.orderItems || []).map((it) => {
      console.log('[customer/Index] product data:', it.product);
      const imageUrl = it.product?.image;
      const finalImage = (imageUrl !== undefined && imageUrl !== null) ? imageUrl : it.service_image;
      let resolvedImage = null;
      if (finalImage) {
        if (finalImage.startsWith('http')) {
          resolvedImage = finalImage;
        } else {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const cleanPath = finalImage.startsWith('/') ? finalImage : `/${finalImage}`;
          resolvedImage = `${baseUrl}/storage${cleanPath}`;
        }
      }
      return {
        id: it.id,
        price: it.price,
        product: {
          name: it.product?.name || "Item",
          image: resolvedImage,
        }
      };
    }),
    order_type: isJasaOrder ? 'jasa' : 'product',
    created_at: o.created_at,
    // CRITICAL: Include payment fields for needsPayment() to work correctly
    payment_status: o.payment_status,
    payment_method: o.payment_method,
    payment_channel: o.payment_channel,
    payment: o.payment,
    invoice_url: o.invoice_url || o.payment?.invoice_url,
    xendit_invoice_url: o.xendit_invoice_url,
    expired_at: o.expired_at,
    _raw: o,
  };
}

// Normalize: support both response.data.data and response.data
function getOrdersList(res) {
  if (!res) {
    console.warn('[getOrdersList] Empty response:', res);
    return [];
  }
  // Laravel paginate: { data: { data: [...], current_page, total, ... }, message, meta }
  if (Array.isArray(res?.data?.data)) {
    console.log('[getOrdersList] Using res.data.data (Laravel paginate)', { count: res.data.data.length });
    return res.data.data;
  }
  // Simple array: { data: [...] }
  if (Array.isArray(res?.data)) {
    console.log('[getOrdersList] Using res.data (simple array)', { count: res.data.length });
    return res.data;
  }
  // Already an array
  if (Array.isArray(res)) {
    console.log('[getOrdersList] Using res (direct array)', { count: res.length });
    return res;
  }
  console.warn('[getOrdersList] Unknown response structure:', { keys: Object.keys(res || {}) });
  return [];
}

async function fetchOrders() {
  loading.value = true;
  try {
    const [resJasa, resProducts] = await Promise.all([
      api.get("/api/jasa-orders", { params: { per_page: 100 } }),
      api.get("/api/orders", { params: { per_page: 100 } }),
    ]);

    // Get raw lists
    const rawJasaOrders = getOrdersList(resJasa).map((item) => ({
      ...item,
      id: item.id || item.order_id,
      order_id: item.order_id || item.id,
      order_type: 'jasa',
    }));

    const rawProductOrders = getOrdersList(resProducts)
      .map(mapOrder)
      // Filter out orders that are actually jasa orders to prevent duplicates
      // The /api/orders endpoint returns ALL orders including jasa ones
      .filter(o => {
        // If order_type is explicitly 'jasa', exclude from product list (jasa already in rawJasaOrders)
        if (o.order_type === 'jasa') return false;
        // If has jasa_items/jasaItems/services, it's a jasa order
        const hasJasaItems = normalizeArray(o.jasa_items || o.jasaItems || o.services || []).length > 0;
        if (hasJasaItems) return false;
        return true;
      });

    // Filter out invalid orders
    const validJasaOrders = rawJasaOrders.filter(o => isValidOrder(o));
    const validProductOrders = rawProductOrders.filter(o => isValidOrder(o));

    // Merge and deduplicate by order.id
    const merged = [...validJasaOrders, ...validProductOrders];
    const seen = new Set();
    const deduplicated = merged.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    // Sort by created_at desc
    deduplicated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    orders.value = deduplicated;

    console.log('[Pesanan Saya] Unified Orders loaded:', {
      total: orders.value.length,
      jasa: validJasaOrders.length,
      product: validProductOrders.length,
      filteredOut: (rawJasaOrders.length - validJasaOrders.length) + (rawProductOrders.length - validProductOrders.length),
    });
  } catch (e) {
    console.error("[Pesanan Saya] Gagal memuat pesanan:", e);
    toast.error("Gagal memuat pesanan");
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

// ========================
// FILTERED ORDERS
// ========================
const filteredOrders = computed(() => {
  let result = orders.value;

  // Filter by search query
  const q = query.value.trim().toLowerCase();
  if (q) {
    result = result.filter((o) => {
      if (o.order_type === 'jasa') {
        const haystack = [
          o.merchant?.name || o.merchant_name || "",
          o.service_name || o.jasa?.title || o.service_title || "",
          o.booking_date || "",
          o.id,
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      } else {
        const itemText = normalizeArray(o.items)
          .map((it) => `${it.title || ""} ${it.variant || ""}`)
          .join(" ");
        const haystack = [
          o.storeName || "",
          itemText,
          o.dateLabel || "",
          o.id,
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      }
    });
  }

  // Filter by status - check both service_status and order_status
  if (selectedStatus.value) {
    result = result.filter((o) => {
      const serviceStatus = String(o.service_status || o.status || "").toLowerCase();
      const orderStatus = String(o.order_status || "").toLowerCase();
      const rawStatus = String(o.status || "").toLowerCase();
      const filter = selectedStatus.value.toLowerCase();

      // For product orders, compare with mapped status or raw status
      if (o.order_type !== 'jasa') {
        return rawStatus === filter || o.status === filter;
      }

      // Match against any of the status fields
      return serviceStatus === filter || orderStatus === filter || rawStatus === filter;
    });
  }

  // Filter by date range
  if (selectedDate.value) {
    result = result.filter((o) => {
      const d = o.created_at ? new Date(o.created_at) : null;
      if (!d || isNaN(d.getTime())) return true;
      const dateLabel = d.toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
      });
      return isDateInRange(dateLabel, selectedDate.value);
    });
  }

  return result;
});

// ========================
// HELPERS
// ========================
function goBack() {
  router.push('/');
}

function openOrder(order) {
  // Resolve orderId from multiple possible field names
  const orderId = order?.id ?? order?.order_id ?? order?.order?.id ?? null;
  console.log('[openOrder] Order clicked:', {
    order,
    resolvedId: orderId,
    idField: order?.id,
    orderIdField: order?.order_id,
    order_type: order?.order_type,
  });

  if (!orderId || orderId === 'undefined' || orderId === 'null') {
    console.error('[openOrder] Order ID tidak valid:', order);
    toast.error('ID pesanan tidak ditemukan');
    return;
  }

  // Determine order_type - check multiple possible sources
  const orderType = order?.order_type || order?.type || (order?._raw?.order_type) || null;

  // Navigate based on order_type to use correct detail endpoint
  if (orderType === 'jasa') {
    // Jasa orders: pass ?type=jasa so Detail.vue knows to use /api/jasa-orders/{id}
    router.push({ name: 'Detail Pesanan', params: { orderId }, query: { type: 'jasa' } });
  } else {
    // Product/Kuliner orders: use standard /api/orders/{id}
    router.push({ name: 'Detail Pesanan', params: { orderId } });
  }
}

function goToReview(order) {
  const numericOrderId = Number(order.order_id || order.id);
  const jasaItemId = order.jasa_order_item_id;

  if (order.is_reviewed) {
    const reviewId = order.review?.id || order.review_id;
    if (reviewId) {
      router.push(`/reviews/${reviewId}/edit`);
    } else if (order.jasa?.slug) {
      router.push(`/jasa/${order.jasa.slug}`);
    }
    return;
  }

  if (!numericOrderId || !jasaItemId) {
    console.warn("[Index] Cannot review: missing ids:", { numericOrderId, jasaItemId, order });
    return;
  }

  // Navigate to /review/service/{order_id}/{jasa_order_item_id}
  router.push(`/review/service/${numericOrderId}/${jasaItemId}`);
}

function openOrderConfirmSelesai(order) {
  // Navigate to order detail — customer can confirm selesai there
  const orderId = order?.id ?? order?.order_id ?? null;
  if (!orderId || orderId === 'undefined') {
    toast.error('ID pesanan tidak ditemukan');
    return;
  }
  // Pass type=jasa for jasa orders to use correct detail endpoint
  const orderType = order?.order_type || order?.type || null;
  if (orderType === 'jasa') {
    router.push({ name: 'Detail Pesanan', params: { orderId }, query: { type: 'jasa' } });
  } else {
    router.push({ name: 'Detail Pesanan', params: { orderId } });
  }
}

// ─── Bayar Kembali ─────────────────────────────────────────────────────

/**
 * Check if order needs payment (Xendit, unpaid)
 * CRITICAL: Must check BOTH payment.status AND order.payment_status
 *
 * For order_type = 'jasa':
 * - Payment is successful when: payment.status = 'PAID' OR order.payment_status = 'PAID'
 * - When paid: status = 'menunggu_konfirmasi', display "Sudah Dibayar" badge
 */
function needsPayment(order) {
  if (!order) return false;

  // COD doesn't need online payment
  const method = String(order.payment_method || '').toUpperCase();
  if (method === 'COD') return false;

  // ─── CHECK PAYMENT STATUS (Priority 1: from orders.payment_status) ───
  const orderPaymentStatus = String(order.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'].includes(orderPaymentStatus)) {
    console.log('[needsPayment] Order payment_status is PAID:', { orderId: order.id, paymentStatus: orderPaymentStatus });
    return false;
  }

  // ─── CHECK PAYMENT RECORD STATUS (Priority 2: from payments.status) ───
  const paymentRecordStatus = String(order.payment?.status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'].includes(paymentRecordStatus)) {
    console.log('[needsPayment] Payment record status is PAID:', { orderId: order.id, paymentStatus: paymentRecordStatus });
    return false;
  }

  // ─── CHECK ORDER STATUS (for cases where payment_status not set yet) ───
  // If order has a status that indicates payment was received, no need to pay
  const rawStatus = String(order.status || '').toLowerCase();
  const paidOrderStatuses = ['paid', 'diterima', 'menunggu_konfirmasi', 'menunggu_konfirmasi_merchant',
                        'layanan_dikerjakan', 'dikerjakan', 'processing',
                        'menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'];
  if (paidOrderStatuses.includes(rawStatus)) {
    // Only return false if payment status is NOT pending/unpaid
    if (!['PENDING', 'WAITING_CONFIRMATION', 'UNPAID'].includes(orderPaymentStatus)) {
      console.log('[needsPayment] Order has paid status:', { orderId: order.id, status: rawStatus });
      return false;
    }
  }

  // ─── TERMINAL STATUSES - no payment needed ───
  const terminalStatuses = ['cancelled', 'dibatalkan', 'ditolak', 'expired', 'batal'];
  if (terminalStatuses.includes(rawStatus)) {
    return false;
  }

  console.log('[needsPayment] Order needs payment:', { orderId: order.id, paymentStatus: orderPaymentStatus, paymentRecordStatus, status: rawStatus });
  return true;
}

/**
 * Get payment status display label for order card
 */
function getPaymentStatusLabel(order) {
  if (!order) return '';

  const method = String(order.payment_method || '').toUpperCase();
  if (method === 'COD') {
    // Check if COD order is paid/completed
    const status = String(order.status || '').toLowerCase();
    const terminalStatuses = ['selesai', 'completed', 'ditolak', 'dibatalkan', 'expired'];
    if (terminalStatuses.includes(status)) {
      return 'COD - Dibayar di Tempat';
    }
    return 'COD - Bayar di Tempat';
  }

  // Check payment_status from orders table
  const orderPaymentStatus = String(order.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'].includes(orderPaymentStatus)) {
    return 'Sudah Dibayar';
  }

  // Check payment record status
  const paymentRecordStatus = String(order.payment?.status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'COMPLETED'].includes(paymentRecordStatus)) {
    return 'Sudah Dibayar';
  }

  // Check if invoice exists (waiting for payment)
  const hasInvoice = order.invoice_url || order.payment?.invoice_url || order.xendit_invoice_url;
  if (hasInvoice) {
    return 'Menunggu Pembayaran';
  }

  return 'Belum Bayar';
}

// ─── SLA Countdown ───────────────────────────────────────────────────────

function formatCountdown(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  if (diff <= 0) return '00:00';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m`;
}

function getMerchantDeadlineRemaining(order) {
  if (order.status !== 'menunggu_konfirmasi' && order.status !== 'menunggu_konfirmasi_merchant') {
    return null;
  }
  return formatCountdown(order.merchant_response_deadline);
}

function getCompletionDeadlineRemaining(order) {
  if (order.status !== 'menunggu_selesai' && order.status !== 'menunggu_konfirmasi_selesai') {
    return null;
  }
  if (!order.completion_deadline_at) return null;
  return formatCountdown(order.completion_deadline_at);
}

/**
 * Retry payment for unpaid Xendit orders
 * Includes fallback to verify payment status from backend
 */
async function retryPayment(order) {
  const orderId = order.order_id || order.id;
  if (!orderId) {
    toast.error('ID pesanan tidak ditemukan');
    return;
  }

  console.log('[retryPayment] Starting payment retry:', {
    orderId,
    order_id: order.id,
    order_number: order.order_number || order.id,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    payment: order.payment,
    invoice_url: order.invoice_url,
    xendit_invoice_url: order.xendit_invoice_url,
  });

  try {
    // Check if we already have a valid invoice URL
    // Priority: order.invoice_url > order.payment.invoice_url > order.xendit_invoice_url
    const existingInvoiceUrl = order.invoice_url || order.payment?.invoice_url || order.xendit_invoice_url;
    if (existingInvoiceUrl) {
      // Check if invoice is expired
      const expiredAt = order.payment?.expired_at || order.expired_at;
      const isExpired = expiredAt && new Date(expiredAt) < new Date();

      console.log('[retryPayment] Existing invoice check:', {
        existingInvoiceUrl,
        expiredAt,
        isExpired,
      });

      if (!isExpired) {
        // Use existing invoice URL - redirect directly
        console.log('[retryPayment] Redirecting to existing invoice:', existingInvoiceUrl);
        window.location.href = existingInvoiceUrl;
        return;
      }
    }

    // First, try to verify if payment was already successful
    // This handles the case where webhook was delayed
    console.log('[retryPayment] Verifying payment status before creating new invoice...');
    try {
      const { data: verifyData } = await api.get(`/api/payments/${orderId}/status`);
      console.log('[retryPayment] Payment status check:', verifyData);

      // If payment is already PAID, show success and refresh orders
      const verifyStatus = verifyData?.data?.payment_status || verifyData?.payment_status;
      if (verifyStatus === 'PAID') {
        toast.success('Pembayaran sudah berhasil! Memperbarui daftar pesanan...');
        await fetchOrders();
        return;
      }
    } catch (verifyErr) {
      console.log('[retryPayment] Payment status check failed, proceeding to create invoice:', verifyErr);
    }

    // Create new invoice
    console.log('[retryPayment] Creating new invoice for order:', orderId);
    const { data } = await api.post(`/api/payments/${orderId}/invoice`);

    console.log('[retryPayment] API Response:', {
      status: data?.status,
      message: data?.message,
      invoice_url: data?.data?.invoice_url || data?.invoice_url,
      fullData: data,
    });

    const invoiceUrl = data?.data?.invoice_url || data?.invoice_url;
    if (invoiceUrl) {
      console.log('[retryPayment] Redirecting to new invoice:', invoiceUrl);
      window.location.href = invoiceUrl;
    } else {
      console.warn('[retryPayment] No invoice URL in response:', data);
      toast.error('Invoice tidak tersedia. Silakan coba lagi.');
    }
  } catch (err) {
    console.error('[retryPayment] Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal membuat invoice pembayaran.');
  }
}

onMounted(() => {
  fetchOrders();
  subscribeOrdersChannel();
});

onUnmounted(() => {
  leaveOrdersChannel(userId.value);
});

watch(userId, (next, prev) => {
  if (prev) leaveOrdersChannel(prev);
  if (next) subscribeOrdersChannel();
});

function subscribeOrdersChannel() {
  if (!userId.value) return;
  ordersChannel = echo.private(`users.${userId.value}.orders`);
  ordersChannel
    .listen(".order.created", () => fetchOrders())
    .listen(".order.status.updated", () => fetchOrders())
    .listen(".payment.status.updated", () => fetchOrders());
}

function leaveOrdersChannel(id) {
  if (!id) return;
  echo.leave(`users.${id}.orders`);
  ordersChannel = null;
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
