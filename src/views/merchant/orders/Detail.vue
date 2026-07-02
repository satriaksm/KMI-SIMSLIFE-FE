<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import ResponsiveImage from "@/components/common/ResponsiveImage.vue";
import {
  getMerchantOrderDetail,
  updateOrderStatus,
} from "@/services/api/order";
import { useToast } from "vue-toastification";
import echo from "@/libs/echo";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";

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
let orderChannel = null;

// Countdown untuk deadline konfirmasi UMKM
const confirmCountdownText = ref("");
const isConfirmExpired = ref(false);
let confirmTimer = null;

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review"; // sudah bayar, menunggu konfirmasi UMKM
    case "pending":
      if (o.payment_method === 'COD') return "waiting_review";
      return beStatus;
    case "responsed":
    case "accepted":
      return "processing";
    case "ready_to_pickup":
      return "ready";
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
      profile_picture: o.user?.profile_picture || null,
      profile_picture_urls: o.user?.profile_picture_urls || null,
    },
    status: mapApiStatus(o.status, o),
    _rawStatus: o.status,
    payment_method: o.payment_method || (o.payment?.payment_method || (o.delivery_type === 'pickup' && !o.payment ? "COD" : "Transfer")),
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
      platform_fee: Number(o.platform_fee || 0),
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
    buyer_lat: o.latitude_snapshot,
    buyer_lng: o.longitude_snapshot,
    merchant_lat: o.merchant?.primary_address?.latitude,
    merchant_lng: o.merchant?.primary_address?.longitude,
    delivery_type: o.delivery_type,
    note: o.notes || "",
    proof_image_url: o.proof_image_url,
    failed_reason: o.failed_reason,
  };
});

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}?size=thumb`;
}

async function fetchOrder() {
  if (!currentMerchantSlug.value || !route.params?.orderId) return;
  loading.value = true;
  try {
    const { data: res } = await getMerchantOrderDetail(
      currentMerchantSlug.value,
      route.params.orderId,
    );
    rawOrder.value = res?.data ?? res ?? null;

    // Preload images
    const imageUrls = [];
    if (order.value?.items) {
      order.value.items.forEach((item) => {
        if (item.image) imageUrls.push(item.image);
      });
    }
    if (order.value?.customer?.profile_picture) {
      imageUrls.push(order.value.customer.profile_picture);
    }
    if (order.value?.proof_image_url) {
      imageUrls.push(order.value.proof_image_url);
    }

    if (imageUrls.length > 0) {
      await Promise.all(
        imageUrls.map(
          (url) =>
            new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "use-credentials";
              img.onload = resolve;
              img.onerror = resolve;
              img.src = url;
            })
        )
      );
    }

    startConfirmCountdown();
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
  waiting_review: {
    props: {
      variant: "payment",
      status: "pending",
      label: "Perlu Konfirmasi",
      size: "sm",
      showIcon: true,
    },
    nextAction: {
      label: "Terima Pesanan",
      icon: "pi-check-circle",
      color: "bg-merchant-primary",
    },
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
  rejected: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Penjual",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  undelivered: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Gagal Kirim",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  unpicked: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Tidak Diambil",
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
  const isPickup = order.value.delivery_type === "pickup";

  const steps = [
    {
      key: "waiting_review",
      label: "Menunggu Konfirmasi",
      desc: "Pembayaran diterima",
      icon: "pi-credit-card",
    },
    {
      key: "processing",
      label: "Sedang Diproses",
      desc: "Pesanan disiapkan",
      icon: "pi-sync",
    },
    {
      key: isPickup ? "ready" : "shipped",
      label: isPickup ? "Siap Diambil" : "Sedang Diantar",
      desc: isPickup ? "Siap diambil di toko" : "Pesanan dikirim",
      icon: isPickup ? "pi-map-marker" : "pi-truck",
    },
    {
      key: "completed",
      label: "Pesanan Selesai",
      desc: isPickup ? "Pesanan diambil" : "Pesanan diterima",
      icon: "pi-check-circle",
    },
  ];

  const statusOrder = [
    "waiting_review",
    "processing",
    isPickup ? "ready" : "shipped",
    "completed",
  ];
  const order_idx = statusOrder.indexOf(status);
  return steps.map((s, i) => ({
    ...s,
    done: i <= order_idx && status !== "cancelled",
    active: statusOrder.indexOf(s.key) === order_idx,
  }));
});

// ========================
// DISTANCE & ROUTE
// ========================
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
const distanceKm = computed(() => {
  if (!order.value?.buyer_lat || !order.value?.buyer_lng || !order.value?.merchant_lat || !order.value?.merchant_lng) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(order.value.buyer_lat - order.value.merchant_lat);
  const dLon = deg2rad(order.value.buyer_lng - order.value.merchant_lng);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(order.value.merchant_lat)) * Math.cos(deg2rad(order.value.buyer_lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d.toFixed(1);
});

const gmapsRouteUrl = computed(() => {
  if (!order.value?.buyer_lat || !order.value?.buyer_lng || !order.value?.merchant_lat || !order.value?.merchant_lng) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${order.value.merchant_lat},${order.value.merchant_lng}&destination=${order.value.buyer_lat},${order.value.buyer_lng}`;
});

const waLink = computed(() => {
  if (!order.value?.customer?.phone) return "#";
  let phone = order.value.customer.phone.replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  return `https://wa.me/${phone}`;
});

// ========================
// CONFIRM STATUS MODAL
// ========================
const showConfirmModal = ref(false);
const actionType = ref("next");
const proofImage = ref(null);
const failedReason = ref("");

function getNextStatus() {
  const rawStatus = rawOrder.value?.status;
  switch (rawStatus) {
    case "paid":
      return "accepted"; // UMKM terima pesanan yang sudah dibayar
    case "pending":
      // COD order — UMKM bisa langsung terima
      if (rawOrder.value?.payment_method === 'COD') return "accepted";
      return null; // Transfer pending = belum bayar
    case "responsed":
    case "accepted":
      return rawOrder.value?.delivery_type === 'pickup' ? 'ready_to_pickup' : 'delivered';
    case "delivered":
    case "ready_to_pickup":
      // UMKM (penjual) bisa menekan "completed" (Pesanan Tiba) untuk semua jenis pesanan
      return "completed";
    default:
      return null;
  }
}

const nextActionLabel = computed(() => {
  const next = getNextStatus();
  const isPickup = order.value?.delivery_type === "pickup";
  switch (next) {
    case "accepted":
      return "Terima & Proses Pesanan";
    case "delivered":
      return "Tandai Dikirim";
    case "ready_to_pickup":
      return "Tandai Siap Diambil";
    case "completed":
      return isPickup ? "Tandai Selesai / Sudah Diambil" : "Pesanan Tiba & Selesai";
    default:
      return null;
  }
});

// Apakah bisa dibatalkan oleh UMKM
const canCancel = computed(() => {
  const s = rawOrder.value?.status;
  return s === "paid" || s === "responsed" || s === "accepted" || (s === "pending" && rawOrder.value?.payment_method === 'COD');
});

// Apakah bisa ditandai gagal kirim (undelivered) / tidak diambil
const canUndelivered = computed(() => {
  const s = rawOrder.value?.status;
  return s === "delivered" || s === "ready_to_pickup";
});

function onFileChange(e) {
  if (e.target.files && e.target.files[0]) {
    proofImage.value = e.target.files[0];
  }
}

// ========================
// COUNTDOWN TIMER KONFIRMASI
// ========================
function startConfirmCountdown() {
  if (confirmTimer) clearInterval(confirmTimer);

  const deadline = rawOrder.value?.confirm_deadline;
  const status = rawOrder.value?.status;

  // Hanya tampilkan countdown jika status masih menunggu konfirmasi
  if (!deadline || !['pending', 'paid'].includes(status)) {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

  // COD pending: tampilkan
  // Transfer paid: tampilkan
  // Transfer pending (belum bayar): jangan tampilkan
  if (status === 'pending' && rawOrder.value?.payment_method !== 'COD') {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

  const expireTime = new Date(deadline).getTime();

  const tick = () => {
    const now = new Date().getTime();
    const distance = expireTime - now;

    if (distance < 0) {
      clearInterval(confirmTimer);
      isConfirmExpired.value = true;
      confirmCountdownText.value = "00:00:00";
    } else {
      isConfirmExpired.value = false;
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      confirmCountdownText.value =
        String(hours).padStart(2, '0') + ":" +
        String(minutes).padStart(2, '0') + ":" +
        String(seconds).padStart(2, '0');
    }
  };

  tick();
  confirmTimer = setInterval(tick, 1000);
}


async function confirmAction() {
  let targetStatus;
  if (actionType.value === 'reject') targetStatus = 'rejected';
  else if (actionType.value === 'undelivered') {
    targetStatus = rawOrder.value?.delivery_type === 'pickup' ? 'unpicked' : 'undelivered';
  }
  else targetStatus = getNextStatus();
  
  if (!targetStatus || !currentMerchantSlug.value || !rawOrder.value?.id) return;

  actionLoading.value = true;
  try {
    let payload = targetStatus;
    if ((targetStatus === 'completed' || targetStatus === 'undelivered') && proofImage.value) {
      payload = new FormData();
      payload.append('status', targetStatus);
      payload.append('proof_image', proofImage.value);
      if (targetStatus === 'undelivered' && failedReason.value) {
        payload.append('failed_reason', failedReason.value);
      }
    } else if (targetStatus === 'undelivered' && !proofImage.value) {
        toast.error("Bukti foto wajib diunggah untuk pesanan gagal kirim.");
        actionLoading.value = false;
        return;
    } else if (targetStatus === 'completed' && !proofImage.value) {
        toast.error("Bukti foto wajib diunggah saat barang diserahkan/diambil.");
        actionLoading.value = false;
        return;
    } else if (targetStatus === 'rejected' || targetStatus === 'cancelled') {
        if (!failedReason.value) {
            toast.error("Alasan penolakan wajib diisi.");
            actionLoading.value = false;
            return;
        }
        payload = {
            status: targetStatus,
            failed_reason: failedReason.value
        };
    }

    await updateOrderStatus(
      currentMerchantSlug.value,
      rawOrder.value.id,
      payload,
    );
    toast.success("Status pesanan berhasil diperbarui");
    showConfirmModal.value = false;
    proofImage.value = null;
    failedReason.value = "";
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal memperbarui status");
  } finally {
    actionLoading.value = false;
  }
}

function handleCancel() {
  actionType.value = 'reject';
  showConfirmModal.value = true;
}

function handleUndelivered() {
  actionType.value = 'undelivered';
  showConfirmModal.value = true;
}

function handleNextAction() {
  actionType.value = 'next';
  showConfirmModal.value = true;
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
  subscribeOrderChannel();
});

onUnmounted(() => {
  leaveOrderChannel(route.params?.orderId);
  if (confirmTimer) clearInterval(confirmTimer);
});

watch(
  () => route.params?.orderId,
  (next, prev) => {
    if (prev) {
      leaveOrderChannel(prev);
    }
    if (next) {
      subscribeOrderChannel();
    }
  },
);

function subscribeOrderChannel() {
  const id = route.params?.orderId;
  if (!id) return;

  orderChannel = echo.private(`orders.${id}`);
  orderChannel
    .listen(".order.status.updated", () => {
      fetchOrder();
    })
    .listen(".payment.status.updated", () => {
      fetchOrder();
    });
}

function leaveOrderChannel(id) {
  if (!id) return;
  echo.leave(`orders.${id}`);
  orderChannel = null;
}
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

    <!-- Loading Skeleton -->
    <div
      v-if="loading"
      class=" px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6"
    >
      <!-- Timeline skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-28 h-4 mb-4 bg-gray-200 rounded"></div>
        <div class="flex items-center gap-2">
          <div v-for="n in 4" :key="'tl-'+n" class="flex items-center flex-1">
            <div class="w-8 h-8 bg-gray-200 rounded-full shrink-0"></div>
            <div v-if="n < 4" class="flex-1 h-0.5 bg-gray-200 mx-1"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mt-4">
          <div class="space-y-1">
            <div class="w-20 h-3 bg-gray-200 rounded"></div>
            <div class="w-32 h-3 bg-gray-200 rounded"></div>
          </div>
          <div class="w-20 h-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>
      <!-- Countdown skeleton -->
      <div class="p-3 bg-white border border-gray-200 rounded-xl animate-pulse">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-amber-100 rounded-full"></div>
          <div class="w-48 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
      <!-- Customer info skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-28 h-4 mb-3 bg-gray-200 rounded"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="w-1/3 h-4 bg-gray-200 rounded"></div>
            <div class="w-1/4 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <!-- Items skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-24 h-4 mb-4 bg-gray-200 rounded"></div>
        <div v-for="n in 2" :key="'item-'+n" class="flex items-start gap-3 mb-3">
          <div class="w-14 h-14 bg-gray-200 rounded-xl shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
            <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
            <div class="w-1/4 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <!-- Summary skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-32 h-4 mb-4 bg-gray-200 rounded"></div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="w-20 h-3 bg-gray-200 rounded"></div><div class="w-16 h-3 bg-gray-200 rounded"></div></div>
          <div class="flex justify-between"><div class="w-24 h-3 bg-gray-200 rounded"></div><div class="w-16 h-3 bg-gray-200 rounded"></div></div>
          <div class="flex justify-between pt-2 border-t border-gray-100"><div class="w-16 h-4 bg-gray-200 rounded"></div><div class="w-24 h-4 bg-gray-200 rounded"></div></div>
        </div>
      </div>
      <!-- Action buttons skeleton -->
      <div class="flex gap-3 animate-pulse">
        <div class="flex-1 h-11 bg-gray-200 rounded-xl"></div>
        <div class="flex-1 h-11 bg-gray-200 rounded-xl"></div>
      </div>
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

    <div v-else class=" px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6">
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
        v-if="['cancelled', 'rejected', 'undelivered'].includes(order.status)"
        class="flex flex-col gap-3 p-4 border bg-red-50 rounded-2xl"
        :class="order.status === 'undelivered' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'"
      >
        <div class="flex items-center gap-3">
          <i class="text-xl pi shrink-0" :class="order.status === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500'"></i>
          <div>
            <p class="text-sm font-semibold" :class="order.status === 'undelivered' ? 'text-orange-700' : 'text-red-700'">
              {{ order.status === 'rejected' ? 'Pesanan Ditolak Penjual' : order.status === 'undelivered' ? (rawOrder?.delivery_type === 'pickup' ? 'Pesanan Tidak Diambil' : 'Pesanan Gagal Kirim') : 'Pesanan Dibatalkan' }}
            </p>
            <p v-if="order.failed_reason" class="text-xs mt-0.5" :class="order.status === 'undelivered' ? 'text-orange-600' : 'text-red-500'">
              {{ order.failed_reason }}
            </p>
          </div>
        </div>
      </div>

      <!-- Countdown konfirmasi UMKM -->
      <div
        v-if="confirmCountdownText && order.status === 'waiting_review'"
        class="p-4 bg-white shadow-sm rounded-2xl"
      >
        <div v-if="isConfirmExpired" class="flex items-center gap-3">
          <i class="text-xl text-red-500 pi pi-clock shrink-0"></i>
          <div>
            <p class="text-sm font-semibold text-red-700">Batas waktu konfirmasi habis</p>
            <p class="text-xs text-red-500 mt-0.5">Pesanan akan otomatis dibatalkan.</p>
          </div>
        </div>
        <div v-else class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 shrink-0">
            <i class="text-lg pi pi-clock text-amber-600"></i>
          </div>
          <div class="flex-1">
            <p class="text-xs text-gray-500">Batas waktu konfirmasi pesanan</p>
            <p class="text-lg font-bold text-amber-700 font-mono">{{ confirmCountdownText }}</p>
          </div>
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
          <div>
            <p class="text-xs text-gray-400">Metode Pengiriman</p>
            <p class="font-medium text-gray-800">
              {{ order.delivery_type === 'pickup' ? 'Ambil Sendiri (Pickup)' : 'Kirim ke Alamat (Delivery)' }}
            </p>
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
          <div class="w-10 h-10 overflow-hidden bg-gray-100 rounded-full shrink-0 flex items-center justify-center border border-gray-200">
            <ResponsiveImage v-if="order.customer.profile_picture" :src="order.customer.profile_picture" :urls="order.customer.profile_picture_urls" customClass="object-cover w-full h-full" alt="Customer avatar" />
            <svg v-else class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">
              {{ order.customer.name }}
            </p>
            <a :href="waLink" target="_blank" class="text-xs text-merchant-primary underline flex items-center gap-1 mt-0.5">
              <i class="pi pi-whatsapp"></i> {{ order.customer.phone }}
            </a>
            <p v-if="order.customer.email" class="text-xs text-gray-500 mt-0.5">
              {{ order.customer.email }}
            </p>
          </div>
        </div>

        <div v-if="order.shipping_address && order.delivery_type === 'delivery'" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Alamat Pengiriman</p>
          <div class="flex items-start gap-2">
            <i
              class="pi pi-map-marker text-xs text-gray-400 mt-0.5 shrink-0"
            ></i>
            <div class="flex-1">
              <p class="text-sm text-gray-700">{{ order.shipping_address }}</p>
              <div v-if="distanceKm && gmapsRouteUrl" class="mt-2 flex items-center gap-3">
                <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{{ distanceKm }} km</span>
                <a :href="gmapsRouteUrl" target="_blank" class="text-xs font-semibold text-white bg-blue-500 px-3 py-1 rounded-md hover:bg-blue-600 transition flex items-center gap-1">
                  <i class="pi pi-map"></i> Rute Gmaps
                </a>
              </div>
            </div>
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
      <!-- PROOF OF DELIVERY        -->
      <!-- ======================== -->
      <div v-if="order.proof_image_url" class="p-4 bg-white shadow-sm rounded-2xl">
        <h2 class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Bukti Foto
        </h2>
        <div class="mt-3">
          <ResponsiveImage :src="order.proof_image_url" customClass="w-full max-w-sm rounded-xl border border-gray-200" alt="Bukti Foto" />
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
              <ResponsiveImage
                v-if="item.image"
                :src="item.image"
                :alt="item.name"
                customClass="object-cover w-full h-full"
              />
              <i v-else class="text-xl text-gray-300 pi pi-box"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ item.name }}
              </p>
              <p v-if="item.variant" class="text-xs text-gray-500 mt-0.5">
                {{ item.variant }}
              </p>
              <p v-if="item.addons && item.addons.length" class="text-xs text-gray-500 mt-0.5">
                <span class="text-merchant-primary">+</span> {{ item.addons.map(a => a.name).join(', ') }}
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
            v-if="order.amounts.platform_fee > 0"
            class="flex justify-between text-sm text-gray-600"
          >
            <span>Biaya Layanan/Admin</span>
            <span>Rp {{ formatIDR(order.amounts.platform_fee) }}</span>
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
      <div class="pb-6 space-y-2">
        <Button
          v-if="nextActionLabel"
          variant="merchant"
          block
          :loading="actionLoading"
          @click="handleNextAction"
          size="lg"
        >
          <i class="pi pi-check-circle"></i>
          {{ nextActionLabel }}
        </Button>
        <Button
          v-if="canCancel"
          variant="danger-outline"
          block
          :disabled="actionLoading"
          @click="handleCancel"
        >
          Tolak / Batalkan Pesanan
        </Button>
        <Button
          v-if="canUndelivered"
          variant="warning-outline"
          block
          :disabled="actionLoading"
          @click="handleUndelivered"
        >
          {{ rawOrder?.delivery_type === 'pickup' ? 'Tandai Tidak Diambil' : 'Tandai Gagal Kirim' }}
        </Button>
      </div>
    </div>

    <!-- ======================== -->
    <!-- CONFIRM MODAL            -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showConfirmModal"
      title="Konfirmasi Tindakan"
      subtitle="Apakah Anda yakin ingin mengubah status pesanan ini?"
      :showFooter="true"
    >
      <div class="flex items-center gap-4 py-2">
        <div class="flex items-center justify-center w-12 h-12 rounded-full shrink-0" :class="actionType === 'next' ? 'bg-merchant-primary/10' : (actionType === 'undelivered' ? 'bg-orange-100' : 'bg-red-100')">
          <i class="text-xl pi" :class="actionType === 'next' ? 'pi-check-circle text-merchant-primary' : (actionType === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500')"></i>
        </div>
        <p class="text-sm text-gray-600">
          <span v-if="actionType === 'undelivered'">Tindakan ini akan menandai pesanan {{ rawOrder?.delivery_type === 'pickup' ? 'tidak diambil' : 'gagal kirim' }}. Dana akan tetap diteruskan.</span>
          <span v-else-if="actionType === 'reject'">Tindakan ini akan menolak pesanan dan dana akan dikembalikan ke pembeli.</span>
          <span v-else>Tindakan ini akan memperbarui status pesanan dan dapat mengirimkan notifikasi ke pelanggan.</span>
        </p>
      </div>

      <!-- Upload Proof Image -->
      <div v-if="(actionType === 'next' && getNextStatus() === 'completed') || actionType === 'undelivered'" class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Bukti Foto {{ actionType === 'undelivered' ? (rawOrder?.delivery_type === 'pickup' ? 'Tidak Diambil (Wajib)' : 'Gagal Kirim (Wajib)') : (rawOrder?.delivery_type === 'pickup' ? 'Selesai (Wajib)' : 'Barang Tiba (Wajib)') }}
        </label>
        <input type="file" @change="onFileChange" accept="image/*" class="w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-merchant-primary file:text-white hover:file:bg-merchant-primary/90" />
      </div>

      <!-- Failed Reason -->
      <div v-if="actionType === 'undelivered' || actionType === 'reject'" class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">Alasan {{ actionType === 'reject' ? 'Penolakan' : (rawOrder?.delivery_type === 'pickup' ? 'Tidak Diambil' : 'Gagal Kirim') }} (Wajib)</label>
        <textarea v-model="failedReason" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary" rows="3" :placeholder="actionType === 'reject' ? 'Contoh: Maaf, stok sedang habis...' : (rawOrder?.delivery_type === 'pickup' ? 'Contoh: Pembeli tidak datang untuk mengambil pesanan hingga toko tutup...' : 'Contoh: Pembeli tidak dapat dihubungi dan rumah kosong...')"></textarea>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showConfirmModal = false"
          >
            Batal
          </Button>
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="confirmAction"
          >
            Ya, Konfirmasi
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped></style>
