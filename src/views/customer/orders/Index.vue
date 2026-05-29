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
      <div
        v-if="activeFilterCount > 0"
        class="flex flex-wrap items-center gap-2"
      >
        <span
          v-if="selectedStatus"
          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-full bg-primary"
        >
          {{ selectedStatusLabel }}
          <button
            type="button"
            @click="
              selectedStatus = '';
              applyTempToActive();
            "
            class="ml-1"
          >
            <i class="pi pi-times text-[10px]"></i>
          </button>
        </span>
        <span
          v-if="selectedDate"
          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded-full bg-primary"
        >
          {{ selectedDateLabel }}
          <button
            type="button"
            @click="
              selectedDate = '';
              applyTempToActive();
            "
            class="ml-1"
          >
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

      <!-- Section: Menunggu Pembayaran -->
      <button
        v-if="pendingPaymentCount > 0"
        type="button"
        class="flex items-center justify-between w-full gap-3 p-4 bg-white border border-gray-200 cursor-pointer rounded-2xl"
        @click="goToPendingPayment"
      >
        <div class="flex items-center min-w-0 gap-3">
          <div
            class="flex items-center justify-center px-1 sm:px-2 rounded-xl text-success-foreground"
          >
            <i class="text-2xl pi pi-money-bill"></i>
          </div>
          <div class="min-w-0 text-left">
            <div class="text-sm font-bold text-black truncate">
              Menunggu Pembayaran
            </div>
            <div class="text-xs truncate text-muted-foreground">
              Selesaikan pembayaran untuk memproses pesanan
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="flex items-center justify-center h-6 px-2 text-xs font-bold text-white rounded-full min-w-6 bg-danger-foreground"
          >
            {{ pendingPaymentCount }}
          </span>
          <i class="pi pi-chevron-right text-muted-foreground"></i>
        </div>
      </button>

      <!-- Order list -->
      <div class="grid grid-cols-1 gap-2 sm:gap-4">
        <OrderCard
          v-for="order in filteredOrders"
          :key="order.id"
          :order="order"
          @click="openOrder"
        >
          <template #action="{ order: o }">
            <Button variant="primary" size="sm" @click.stop="buyAgain(o)">
              Beli Lagi
            </Button>
          </template>
        </OrderCard>
      </div>

      <!-- Empty -->
      <div
        v-if="filteredOrders.length === 0"
        class="p-8 text-center bg-white border border-gray-200 rounded-2xl"
      >
        <div class="text-lg font-bold text-black">Pesanan tidak ditemukan</div>
        <div class="mt-1 text-sm text-muted-foreground">
          Coba ubah kata kunci atau filter pencarian.
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter Pesanan"
      show-footer
      @close="closeFilterModal"
    >
      <div class="space-y-6">
        <!-- ===== FILTER SECTION ===== -->
        <div class="space-y-4">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
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
import OrderCard from "@/components/customer/OrderCard.vue";
import TextField from "@/components/forms/TextField.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import SelectField from "@/components/forms/SelectField.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { getCustomerOrders } from "@/services/api/order";
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

// Temp state untuk modal (agar bisa di-cancel)
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
  // dipanggil saat chip di-X langsung dari luar modal
  tempStatus.value = selectedStatus.value;
  tempDate.value = selectedDate.value;
}

const statusOptions = [
  { value: "pending_payment", label: "Menunggu Pembayaran" },
  { value: "processing", label: "Diproses" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
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
  // Format: "1 Mei 2025", "2 Mar 2025", "19 Jan 2025"
  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    Mei: 4,
    Jun: 5,
    Jul: 6,
    Agt: 7,
    Sep: 8,
    Okt: 9,
    Nov: 10,
    Des: 11,
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
  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);

  if (range === "today") {
    return orderDate >= today;
  }
  if (range === "this_week") {
    const dayOfWeek = now.getDay(); // 0 = Minggu
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
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
  if (range === "this_year") {
    return orderDate.getFullYear() === now.getFullYear();
  }
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
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
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

function mapOrder(o) {
  return {
    id: o.id,
    storeName: o.merchant?.name || "Toko",
    dateLabel: formatDateLabel(o.created_at),
    status: mapApiStatus(o.status, o),
    total: o.gross_amount,
    delivery_type: o.delivery_type || "delivery",
    items: (o.items || []).map((it) => ({
      id: it.id,
      title: it.product_name_snapshot || "Produk",
      qty: it.quantity,
      variant: it.product_variant_snapshot || "",
      addons: (it.addons || []).map((a) => ({
        name: a.addon_name_snapshot || a.addon?.name || "Addon",
        price: Number(a.addon_price_snapshot || 0),
      })),
      price: it.unit_price_snapshot,
      imageUrl: getOrderSnapshotUrl(it.id, it.image_snapshot_path),
    })),
    _raw: o,
  };
}

async function fetchOrders() {
  loading.value = true;
  try {
    const { data: res } = await getCustomerOrders({ per_page: 100 });
    const list = res?.data ?? res ?? [];
    orders.value = (Array.isArray(list) ? list : []).map(mapOrder);
  } catch (e) {
    console.error("Gagal memuat pesanan:", e);
    toast.error("Gagal memuat pesanan");
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

const pendingPaymentCount = computed(
  () => orders.value.filter((o) => o.status === "pending_payment").length,
);

// ========================
// FILTERED ORDERS
// ========================
const filteredOrders = computed(() => {
  let result = orders.value;

  // Filter by search query
  const q = query.value.trim().toLowerCase();
  if (q) {
    result = result.filter((o) => {
      const itemText = (o.items || [])
        .map((it) => `${it.title || ""} ${it.variant || ""}`)
        .join(" ");
      const haystack = `${o.storeName} ${itemText} ${o.dateLabel} ${o.id}`
        .toLowerCase()
        .trim();
      return haystack.includes(q);
    });
  }

  // Filter by status
  if (selectedStatus.value) {
    result = result.filter((o) => o.status === selectedStatus.value);
  }

  // Filter by date range
  if (selectedDate.value) {
    result = result.filter((o) =>
      isDateInRange(o.dateLabel, selectedDate.value),
    );
  }

  return result;
});

// ========================
// HELPERS
// ========================
function goBack() {
  router.back();
}

function openOrder(order) {
  router
    .push({ name: "Detail Pesanan", params: { orderId: order.id } })
    .catch(() => router.push(`/orders/${order.id}`));
}

function buyAgain() {
  router.push({ path: "/explore" }).catch(() => router.push("/"));
}

function goToPendingPayment() {
  router
    .push({ path: "/orders/pending-payments" })
    .catch(() => router.push("/orders/pending-payments"));
}

onMounted(() => {
  fetchOrders();
  subscribeOrdersChannel();
});

onUnmounted(() => {
  leaveOrdersChannel(userId.value);
});

watch(userId, (next, prev) => {
  if (prev) {
    leaveOrdersChannel(prev);
  }
  if (next) {
    subscribeOrdersChannel();
  }
});

function subscribeOrdersChannel() {
  if (!userId.value) return;

  ordersChannel = echo.private(`users.${userId.value}.orders`);
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
  echo.leave(`users.${id}.orders`);
  ordersChannel = null;
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
