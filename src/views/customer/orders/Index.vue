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
          <ServiceOrderCard
            v-for="order in filteredOrders"
            :key="order.order_id || order.id"
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
                Bayar Kembali
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
        </div>

        <!-- Empty -->
        <div
          v-if="!loading && filteredOrders.length === 0"
          class="p-8 text-center bg-white border border-gray-200 rounded-2xl"
        >
          <div class="text-lg font-bold text-black">Pesanan tidak ditemukan</div>
          <div class="mt-1 text-sm text-muted-foreground">
            {{ orders.length === 0 ? 'Belum ada pesanan layanan jasa.' : 'Coba ubah filter pencarian.' }}
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
    const { data: res } = await api.get("/api/jasa-orders", {
      params: { per_page: 100 },
    });

    // Normalize: ensure every item has BOTH id and order_id
    const rawOrders = getOrdersList(res);
    orders.value = rawOrders.map((item) => ({
      ...item,
      id: item.id || item.order_id,
      order_id: item.order_id || item.id,
    }));

    // Debug: Log status values from API response
    console.log('[Pesanan Saya] Orders loaded:', {
      total: orders.value.length,
      statuses: orders.value.map(o => ({
        id: o.id,
        status: o.status,
        service_status: o.service_status,
        order_status: o.order_status,
        status_label: o.status_label,
      })),
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
      const haystack = [
        o.merchant?.name || o.merchant_name || "",
        o.service_name || o.jasa?.title || o.service_title || "",
        o.booking_date || "",
        o.id,
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  // Filter by status - check both service_status and order_status
  if (selectedStatus.value) {
    result = result.filter((o) => {
      const serviceStatus = String(o.service_status || o.status || "").toLowerCase();
      const orderStatus = String(o.order_status || "").toLowerCase();
      const rawStatus = String(o.status || "").toLowerCase();
      const filter = selectedStatus.value.toLowerCase();

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
  });

  if (!orderId || orderId === 'undefined' || orderId === 'null') {
    console.error('[openOrder] Order ID tidak valid:', order);
    toast.error('ID pesanan tidak ditemukan');
    return;
  }

  // Use named route for type-safe navigation
  router.push({ name: 'Detail Pesanan', params: { orderId } });
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
  router.push({ name: 'Detail Pesanan', params: { orderId } });
}

// ─── Bayar Kembali ─────────────────────────────────────────────────────

/**
 * Check if order needs payment (Xendit, unpaid)
 */
function needsPayment(order) {
  if (!order) return false;

  // COD doesn't need online payment
  const method = String(order.payment_method || '').toUpperCase();
  if (method === 'COD') return false;

  // Already paid
  const ps = String(order.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED'].includes(ps)) return false;

  // Terminal statuses
  const rawStatus = String(order.status || '').toLowerCase();
  const terminalStatuses = ['cancelled', 'dibatalkan', 'ditolak', 'expired', 'selesai', 'completed'];
  if (terminalStatuses.includes(rawStatus)) return false;

  return true;
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
