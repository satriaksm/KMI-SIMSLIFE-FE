<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import {
  getMerchantOrderDetail,
  updateOrderStatus,
} from "@/services/api/order";
import { useToast } from "vue-toastification";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const emit = defineEmits(["toggle-sidebar"]);
const breadcrumbItems = computed(() => [
  {
    label: "Pesanan Masuk",
    path: `/merchant-center/${currentMerchantSlug.value}/orders`,
  },
  {
    label: "Detail Pesanan",
  },
]);
const currentMerchantSlug = computed(() =>
  route.params?.merchantSlug ? String(route.params.merchantSlug) : null,
);

// ========================
// DATA (from API)
// ========================
const rawOrder = ref(null);
const loading = ref(true);
const actionLoading = ref(false);

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

const order = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;
  return {
    id: o.id,
    invoice: o.order_code || "-",
    customer: {
      name: o.user_name_snapshot || "Pelanggan",
      phone: o.user_phone_snapshot || "-",
      email: o.user?.email || "",
    },
    status: mapApiStatus(o.status),
    _rawStatus: o.status,
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
  };
});

async function fetchOrder() {
  if (!currentMerchantSlug.value || !route.params?.orderId) return;
  loading.value = true;
  try {
    const { data: res } = await getMerchantOrderDetail(
      currentMerchantSlug.value,
      route.params.orderId,
    );
    rawOrder.value = res?.data ?? res ?? null;
  } catch (e) {
    console.error("Gagal memuat detail pesanan:", e);
    toast.error("Gagal memuat detail pesanan");
    rawOrder.value = null;
  } finally {
    loading.value = false;
  }
}

// ========================
// STATUS CONFIG
// ========================
const statusConfig = {
  pending_payment: {
    props: {
      variant: "payment",
      status: "pending",
      label: "Menunggu Bayar",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  processing: {
    props: {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    },
    nextAction: {
      label: "Tandai Selesai",
      icon: "pi-check-circle",
      color: "bg-merchant-primary",
    },
  },
  completed: {
    props: {
      variant: "order",
      status: "completed",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  cancelled: {
    props: {
      variant: "order",
      status: "cancelled",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
};

const currentStatusConfig = computed(() => {
  const s = order.value?.status;
  return statusConfig[s] ?? statusConfig.pending_payment;
});

// ========================
// ORDER TIMELINE
// ========================
const timeline = computed(() => {
  if (!order.value) return [];
  const status = order.value.status;
  const steps = [
    {
      key: "pending_payment",
      label: "Pesanan Diterima",
      desc: "Menunggu pembayaran customer",
      icon: "pi-shopping-bag",
    },
    {
      key: "processing",
      label: "Sedang Diproses",
      desc: "Pesanan sedang disiapkan",
      icon: "pi-sync",
    },
    {
      key: "completed",
      label: "Pesanan Selesai",
      desc: "Pesanan telah diterima",
      icon: "pi-check-circle",
    },
  ];
  const statusOrder = ["pending_payment", "processing", "completed"];
  const order_idx = statusOrder.indexOf(status);
  return steps.map((s, i) => ({
    ...s,
    done: i <= order_idx && status !== "cancelled",
    active: statusOrder.indexOf(s.key) === order_idx,
  }));
});

// ========================
// CONFIRM STATUS MODAL
// ========================
const showConfirmModal = ref(false);

function getNextStatus() {
  const rawStatus = rawOrder.value?.status;
  // Map raw BE status to next action status
  switch (rawStatus) {
    case "pending":
      return "responsed";
    case "paid":
      return "delivered";
    case "responsed":
      return "delivered";
    case "delivered":
      return "completed";
    default:
      return null;
  }
}

const nextActionLabel = computed(() => {
  const next = getNextStatus();
  switch (next) {
    case "responsed":
      return "Terima & Proses Pesanan";
    case "delivered":
      return "Tandai Dikirim";
    case "completed":
      return "Tandai Selesai";
    default:
      return null;
  }
});

async function confirmAction() {
  const nextStatus = getNextStatus();
  if (!nextStatus || !currentMerchantSlug.value || !rawOrder.value?.id) return;

  actionLoading.value = true;
  try {
    await updateOrderStatus(
      currentMerchantSlug.value,
      rawOrder.value.id,
      nextStatus,
    );
    toast.success("Status pesanan berhasil diperbarui");
    showConfirmModal.value = false;
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal memperbarui status");
  } finally {
    actionLoading.value = false;
  }
}

async function handleCancel() {
  if (!currentMerchantSlug.value || !rawOrder.value?.id) return;
  actionLoading.value = true;
  try {
    await updateOrderStatus(
      currentMerchantSlug.value,
      rawOrder.value.id,
      "cancelled",
    );
    toast.success("Pesanan berhasil dibatalkan");
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal membatalkan pesanan");
  } finally {
    actionLoading.value = false;
  }
}

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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function goBack() {
  router.push(`/merchant-center/${currentMerchantSlug.value}/orders`);
}

onMounted(() => {
  fetchOrder();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <MerchantMobileHeader title="Detail Pesanan" />

    <div
      class="top-0 left-0 right-0 z-10 items-center justify-between hidden px-4 py-4 bg-white border-b border-gray-100 sm:flex sm:fixed sm:static sm:px-6"
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
            Lihat detail dan kelola pesanan masuk.
          </p>
        </div>
      </div>
    </div>

    <div class="h-20 sm:h-0"></div>

    <!-- Not found -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center px-4 py-24"
    >
      <i class="text-2xl pi pi-spin pi-spinner text-merchant-primary"></i>
      <p class="mt-2 text-sm text-gray-500">Memuat pesanan...</p>
    </div>

    <div
      v-else-if="!order"
      class="flex flex-col items-center justify-center px-4 py-24"
    >
      <i class="mb-4 text-5xl text-gray-300 pi pi-inbox"></i>
      <p class="text-lg font-semibold text-gray-500">Pesanan tidak ditemukan</p>
      <button
        @click="goBack"
        class="mt-4 text-sm underline text-merchant-primary"
      >
        Kembali ke daftar
      </button>
    </div>

    <div v-else class="max-w-3xl px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6">
      <!-- ======================== -->
      <!-- TIMELINE                 -->
      <!-- ======================== -->
      <div
        v-if="order.status !== 'cancelled'"
        class="p-4 bg-white shadow-sm rounded-2xl"
      >
        <h2 class="mb-4 text-sm font-semibold text-gray-700">Status Pesanan</h2>
        <div class="flex items-start gap-0">
          <template v-for="(step, idx) in timeline" :key="step.key">
            <div class="flex flex-col items-center flex-1">
              <!-- Circle -->
              <div
                :class="[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border-2 transition',
                  step.done
                    ? 'bg-merchant-primary border-merchant-primary text-white'
                    : 'bg-white border-gray-300 text-gray-400',
                ]"
              >
                <i :class="['pi text-xs', step.icon]"></i>
              </div>
              <!-- Label -->
              <div class="px-1 mt-2 text-center">
                <p
                  :class="[
                    'text-xs font-semibold',
                    step.done ? 'text-merchant-primary' : 'text-gray-400',
                  ]"
                >
                  {{ step.label }}
                </p>
                <p class="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                  {{ step.desc }}
                </p>
              </div>
            </div>
            <!-- Connector line -->
            <div
              v-if="idx < timeline.length - 1"
              :class="[
                'flex-1 h-0.5 mt-4 transition',
                timeline[idx + 1]?.done ? 'bg-merchant-primary' : 'bg-gray-200',
              ]"
            ></div>
          </template>
        </div>
      </div>

      <!-- Cancelled banner -->
      <div
        v-if="order.status === 'cancelled'"
        class="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-2xl"
      >
        <i class="text-xl text-red-500 pi pi-times-circle shrink-0"></i>
        <div>
          <p class="text-sm font-semibold text-red-700">Pesanan Dibatalkan</p>
          <p v-if="order.note" class="text-xs text-red-500 mt-0.5">
            {{ order.note }}
          </p>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ORDER INFO               -->
      <!-- ======================== -->
      <div class="p-4 space-y-3 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Informasi Pesanan
        </h2>
        <div class="grid grid-cols-2 text-sm gap-y-3 gap-x-4">
          <div>
            <p class="text-xs text-gray-400">No. Pesanan</p>
            <p class="font-medium text-gray-800">{{ order.invoice }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">ID Pesanan</p>
            <p class="font-medium text-gray-800">{{ order.id }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Tanggal</p>
            <p class="font-medium text-gray-800">
              {{ formatDate(order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Jam</p>
            <p class="font-medium text-gray-800">
              {{ formatTime(order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Metode Pembayaran</p>
            <p class="font-medium text-gray-800">{{ order.payment_method }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- CUSTOMER INFO            -->
      <!-- ======================== -->
      <div class="p-4 space-y-3 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Data Pelanggan
        </h2>
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-merchant-primary/10 shrink-0"
          >
            <span class="text-sm font-bold text-merchant-primary">
              {{ order.customer.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">
              {{ order.customer.name }}
            </p>
            <p class="text-xs text-gray-500">{{ order.customer.phone }}</p>
            <p v-if="order.customer.email" class="text-xs text-gray-500">
              {{ order.customer.email }}
            </p>
          </div>
        </div>

        <div v-if="order.shipping_address" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Alamat Pengiriman</p>
          <div class="flex items-start gap-2">
            <i
              class="pi pi-map-marker text-xs text-gray-400 mt-0.5 shrink-0"
            ></i>
            <p class="text-sm text-gray-700">{{ order.shipping_address }}</p>
          </div>
        </div>

        <div v-if="order.note" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Catatan</p>
          <div class="flex items-start gap-2">
            <i class="pi pi-comment text-xs text-gray-400 mt-0.5 shrink-0"></i>
            <p class="text-sm italic text-gray-700">{{ order.note }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ITEMS                    -->
      <!-- ======================== -->
      <div class="p-4 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 mb-3 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Produk ({{ order.items.length }} item)
        </h2>
        <div class="space-y-3">
          <div
            v-for="(item, idx) in order.items"
            :key="idx"
            class="flex items-center gap-3"
          >
            <!-- Image placeholder -->
            <div
              class="flex items-center justify-center overflow-hidden bg-gray-100 w-14 h-14 rounded-xl shrink-0"
            >
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.name"
                class="object-cover w-full h-full"
              />
              <i v-else class="text-xl text-gray-300 pi pi-box"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ item.name }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ item.qty }}x × Rp {{ formatIDR(item.price) }}
              </p>
            </div>
            <p class="text-sm font-semibold text-gray-800 shrink-0">
              Rp {{ formatIDR(item.subtotal) }}
            </p>
          </div>
        </div>

        <!-- Amount breakdown -->
        <div class="pt-4 mt-4 space-y-2 border-t border-gray-100">
          <div class="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>Rp {{ formatIDR(order.amounts.subtotal) }}</span>
          </div>
          <div
            v-if="order.amounts.discount > 0"
            class="flex justify-between text-sm text-green-600"
          >
            <span>Diskon</span>
            <span>-Rp {{ formatIDR(order.amounts.discount) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>Ongkos Kirim</span>
            <span>Rp {{ formatIDR(order.amounts.shipping) }}</span>
          </div>
          <div
            class="flex justify-between pt-2 text-base font-bold text-gray-800 border-t border-gray-100"
          >
            <span>Total</span>
            <span>Rp {{ formatIDR(order.amounts.total) }}</span>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ACTION BUTTON            -->
      <!-- ======================== -->
      <div v-if="nextActionLabel" class="pb-6 space-y-2">
        <button
          type="button"
          @click="showConfirmModal = true"
          :disabled="actionLoading"
          class="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.98] bg-merchant-primary disabled:opacity-50"
        >
          <i class="pi pi-check-circle"></i>
          {{ nextActionLabel }}
        </button>
        <button
          v-if="
            rawOrder?.status === 'pending' || rawOrder?.status === 'responsed'
          "
          type="button"
          @click="handleCancel"
          :disabled="actionLoading"
          class="w-full py-3 text-sm font-semibold text-red-600 transition bg-red-50 rounded-2xl hover:bg-red-100 disabled:opacity-50"
        >
          Batalkan Pesanan
        </button>
      </div>
    </div>

    <!-- ======================== -->
    <!-- CONFIRM MODAL            -->
    <!-- ======================== -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showConfirmModal"
        class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/50"
        @click.self="showConfirmModal = false"
      >
        <div class="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-merchant-primary/10"
            >
              <i class="pi pi-check-circle text-merchant-primary"></i>
            </div>
            <h3 class="text-base font-semibold text-gray-800">
              Konfirmasi Tindakan
            </h3>
          </div>
          <p class="mb-6 text-sm text-gray-600">
            Apakah Anda yakin ingin mengubah status pesanan ini?
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showConfirmModal = false"
              class="flex-1 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              @click="confirmAction"
              :disabled="actionLoading"
              class="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl bg-merchant-primary hover:bg-merchant-primary/90 transition disabled:opacity-50"
            >
              {{ actionLoading ? "Memproses..." : "Ya, Konfirmasi" }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped></style>
