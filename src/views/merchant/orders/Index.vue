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

// ========================
// PAYMENT STATUS HELPER
// ========================

/**
 * Format payment status to user-friendly label (case-insensitive)
 */
const formatPaymentStatus = (status) => {
  const value = String(status || '').toLowerCase().trim();

  if (['paid', 'lunas', 'settled', 'success'].includes(value)) {
    return 'Sudah Bayar';
  }
  if (['unpaid', 'pending', 'waiting', 'menunggu_pembayaran', 'menunggu'].includes(value)) {
    return 'Menunggu Pembayaran';
  }
  if (['expired', 'kadaluarsa'].includes(value)) {
    return 'Kadaluarsa';
  }
  if (['failed', 'gagal'].includes(value)) {
    return 'Gagal';
  }
  if (['waiting_confirmation', 'menunggu_konfirmasi'].includes(value)) {
    return 'Menunggu Konfirmasi';
  }

  return 'Belum Dibayar';
};

/**
 * Get color class for payment status
 */
const getPaymentStatusColorClass = (status) => {
  const value = String(status || '').toLowerCase().trim();

  if (['paid', 'lunas', 'settled', 'success'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }
  if (['unpaid', 'pending', 'waiting', 'menunggu_pembayaran', 'menunggu'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }
  if (['expired', 'kadaluarsa', 'failed', 'gagal'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }
  if (['waiting_confirmation', 'menunggu_konfirmasi'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const breadcrumbItems = computed(() => [{ label: "Pesanan Masuk" }]);

// ========================
// ORDER TYPE TAB (Produk vs Jasa)
// ========================
const activeOrderType = ref("produk"); // "produk" | "jasa"

const segmentationId = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return Number(merchant?.segmentation?.id || merchant?.segmentation_id || 0);
});

watch(
  segmentationId,
  (newId) => {
    if (newId === 3) {
      activeOrderType.value = "jasa";
    } else {
      activeOrderType.value = "produk";
    }
  },
  { immediate: true }
);

// ========================
// ORDERS DATA (from API) - PRODUK
// ========================
const allOrders = ref([]);
const ordersLoading = ref(false);
let ordersChannel = null;

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review"; // sudah bayar, tunggu konfirmasi UMKM
    case "pending":
    case "menunggu_konfirmasi":
    case "menunggu_konfirmasi_merchant":
      if (o.payment_method === 'COD') return "waiting_review"; // COD langsung tunggu konfirmasi
      return "waiting_review";
    case "responsed":
    case "accepted":
    case "diterima":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
    case "selesai":
      return "completed";
    case "ditolak":
      return "ditolak";
    case "dibatalkan":
    case "cancelled":
      return "dibatalkan";
    case "rejected":
      return "ditolak";
    case "expired":
    case "kadaluarsa":
      return "expired";
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

  // Jika tab Jasa aktif, fetch dari endpoint merchant orders
  if (activeOrderType.value === "jasa") {
    await fetchJasaOrders();
    return;
  }

  // Default: fetch produk orders
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
// JASA ORDERS DATA
// ========================
const allJasaOrders = ref([]);
const jasaOrdersLoading = ref(false);
let jasaOrdersChannel = null;

// Modals for jasa orders
const showJasaDetailModal = ref(false);
const showJasaRejectModal = ref(false);
const showJasaEvidenceModal = ref(false);
const showJasaEvidenceViewModal = ref(false); // Modal untuk melihat bukti
const showJasaReviewModal = ref(false);
const selectedJasaOrder = ref(null);
const selectedReview = ref(null);
const showReviewHistory = ref(false); // Toggle review history visibility
const rejectReason = ref('');
const completionNote = ref('');
const evidenceFiles = ref([]);
const submittingJasa = ref(false);
const merchantReplyText = ref('');
const submittingReply = ref(false);

// Filter tabs for service orders
const jasaTabs = [
  { key: "all", label: "Semua" },
  { key: "perlu_diproses", label: "Perlu Diproses" },
  { key: "sedang_diproses", label: "Sedang Diproses" },
  { key: "selesai", label: "Selesai" },
  { key: "batal_gagal", label: "Batal/Gagal" },
];

// Service order status mapping for display
// Maps raw backend status values to frontend display status
const jasaStatusMap = {
  // orders.status display value mapping
  'pending': 'menunggu',
  'menunggu_konfirmasi': 'menunggu',
  'menunggu_konfirmasi_merchant': 'menunggu',
  'diterima': 'diterima',
  'ditolak': 'ditolak',
  'layanan_dikerjakan': 'dikerjakan',
  'dikerjakan': 'dikerjakan',
  'processing': 'dikerjakan',
  'menunggu_konfirmasi_selesai': 'tunggu_selesai',
  'menunggu_selesai': 'tunggu_selesai',
  'selesai': 'selesai',
  'completed': 'selesai',
  // orders table status values (mapped) - for backward compatibility
  'proses': 'diterima', // In process = accepted
  'batal': 'dibatalkan',
  'dibatalkan': 'dibatalkan',
  'cancelled': 'dibatalkan',
  'expired': 'expired',
  'kadaluarsa': 'expired',
};

// Get display status for jasa orders
const getJasaDisplayStatus = (order) => {
  // Use status (from orders.status - PRIMARY) first, then service_status as fallback
  // Backend now uses orders.status as source of truth
  const rawStatus = String(order.status || order.service_status || '').toLowerCase();
  const displayStatus = jasaStatusMap[rawStatus];
  if (displayStatus) return displayStatus;
  // If no mapping found, return as-is
  return rawStatus;
};

// Get human-readable status label for terminal/completed orders
// Distinguishes between customer cancellation and merchant rejection
const getJasaOrderStatusLabel = (order) => {
  const status = String(order.status || order.order_status || '').toLowerCase();

  // Kadaluarsa — merchant didn't respond in time
  if (status === 'expired' || status === 'kadaluarsa') return 'Kadaluarsa';

  // Dibatalkan — distinguish who cancelled
  if (['dibatalkan', 'cancelled', 'canceled'].includes(status)) {
    if (order.cancelled_by === 'customer') return 'Dibatalkan Customer';
    if (order.cancelled_by === 'merchant') return 'Dibatalkan Merchant';
    return 'Dibatalkan';
  }

  // Ditolak — distinguish who rejected
  if (['ditolak', 'rejected'].includes(status)) {
    if (order.rejected_by === 'merchant') return 'Ditolak Merchant';
    if (order.rejected_by === 'customer') return 'Ditolak Customer';
    return 'Ditolak';
  }

  // Other statuses — use status_label from backend or raw status
  return order.status_label || order.order_status_label || status;
};

// Get order ID for API calls (use orders.id)
const getOrderId = (order) => {
  return order.order_id || order.id;
};

// Check if order is pending (needs merchant action) — but not expired
const isJasaPendingOrder = (order) => {
  const status = getJasaDisplayStatus(order);
  return status === 'menunggu';
};

// Check if order is expired (merchant deadline passed)
const isJasaExpired = (order) => {
  const displayStatus = getJasaDisplayStatus(order);
  if (displayStatus !== 'menunggu') return false;
  if (!order.merchant_response_deadline) return false;
  return new Date(order.merchant_response_deadline) <= new Date();
};

// Check if order is terminal
const isJasaTerminal = (order) => {
  const status = getJasaDisplayStatus(order);
  return ['selesai', 'ditolak', 'dibatalkan', 'expired'].includes(status);
};

// Can perform actions based on status
const canJasaAccept = (order) => {
  if (!order) return false;
  if (!isJasaPendingOrder(order) || isJasaExpired(order)) return false;

  const prefix = getJasaPaymentMethodPrefix(order);
  const ps = String(order.payment_status || '').toUpperCase();

  if (prefix === 'Xendit' || prefix === 'Transfer') {
    return ['PAID', 'SETTLED', 'SUCCEEDED'].includes(ps);
  }

  // COD is paid on completion/delivery, so merchant can accept/reject even if unpaid
  return true;
};
const canJasaReject = (order) => canJasaAccept(order);
const canJasaStart = (order) => {
  const status = getJasaDisplayStatus(order);
  return status === 'diterima';
};
const canJasaEvidence = (order) => {
  const status = getJasaDisplayStatus(order);
  return status === 'dikerjakan';
};

// SLA Countdown helpers
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

// SLA real-time clock
const now = ref(Date.now());
let clockInterval = null;
onMounted(() => {
  clockInterval = setInterval(() => {
    now.value = Date.now();
  }, 60000); // update every minute
});
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});

// Get merchant response deadline remaining (for waiting orders) — live
const getJasaMerchantDeadlineRemaining = (order) => {
  const displayStatus = getJasaDisplayStatus(order);
  const rawStatus = String(order.status || '').toLowerCase();
  if (displayStatus !== 'menunggu' && !['menunggu_konfirmasi', 'menunggu_konfirmasi_merchant', 'pending'].includes(rawStatus)) return null;
  if (!order.merchant_response_deadline) return null;
  const diff = new Date(order.merchant_response_deadline) - now.value;
  if (diff <= 0) return null; // expired
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
};

// Check if SLA deadline has passed
const isJasaMerchantDeadlinePassed = (order) => {
  const displayStatus = getJasaDisplayStatus(order);
  const rawStatus = String(order.status || '').toLowerCase();
  if (displayStatus !== 'menunggu' && !['menunggu_konfirmasi', 'menunggu_konfirmasi_merchant', 'pending'].includes(rawStatus)) return false;
  if (!order.merchant_response_deadline) return false;
  return new Date(order.merchant_response_deadline) <= now.value;
};

// SLA urgency color class for merchant response deadline
const getJasaSlaDeadlineColorClass = (order) => {
  if (isJasaMerchantDeadlinePassed(order)) return 'border-red-400 bg-red-50 text-red-700';
  const remaining = getJasaMerchantDeadlineRemaining(order);
  if (!remaining) return 'border-gray-200 bg-gray-50 text-gray-700';
  // Parse remaining string "23j 45m" or "45m"
  const parts = remaining.match(/(\d+)j|(\d+)m/g) || [];
  const hours = parseInt(parts.find(p => p.endsWith('j'))?.replace('j', '') || '0');
  const minutes = parseInt(parts.find(p => p.endsWith('m'))?.replace('m', '') || '0');
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 60) return 'border-red-400 bg-red-50 text-red-700';
  if (totalMinutes < 360) return 'border-yellow-400 bg-yellow-50 text-yellow-700';
  return 'border-green-400 bg-green-50 text-green-700';
};

// SLA badge color class for status column (uses bg- prefix for badge styling)
const getJasaSlaBadgeColorClass = (order) => {
  if (isJasaMerchantDeadlinePassed(order)) return 'bg-red-100 text-red-600';
  const remaining = getJasaMerchantDeadlineRemaining(order);
  if (!remaining) return 'bg-gray-100 text-gray-400';
  const parts = remaining.match(/(\d+)j|(\d+)m/g) || [];
  const hours = parseInt(parts.find(p => p.endsWith('j'))?.replace('j', '') || '0');
  const minutes = parseInt(parts.find(p => p.endsWith('m'))?.replace('m', '') || '0');
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 60) return 'bg-red-100 text-red-600';
  if (totalMinutes < 360) return 'bg-orange-100 text-orange-600';
  return 'bg-green-100 text-green-600';
};

// Get simple payment line 1 (method name only)
const getJasaPaymentLine1 = (order) => {
  return getJasaPaymentMethodPrefix(order);
};

// Get simple payment line 2 (status text)
const getJasaPaymentLine2 = (order) => {
  const prefix = getJasaPaymentMethodPrefix(order);
  if (prefix === 'COD') return 'Bayar di Tempat';
  if (prefix === 'Transfer') return getJasaPaymentStatusLabel(order?.payment_status);
  return getJasaPaymentStatusLabel(order?.payment_status);
};

// Get SLA badge display text
const getJasaSlaBadgeText = (order) => {
  if (isJasaMerchantDeadlinePassed(order)) return 'Berakhir';
  return getJasaMerchantDeadlineRemaining(order) || null;
};

// SLA countdown color for table row display (text only)
const getJasaMerchantDeadlineColorClass = (order) => {
  if (isJasaMerchantDeadlinePassed(order)) return 'text-red-600';
  const remaining = getJasaMerchantDeadlineRemaining(order);
  if (!remaining) return 'text-gray-400';
  const parts = remaining.match(/(\d+)j|(\d+)m/g) || [];
  const hours = parseInt(parts.find(p => p.endsWith('j'))?.replace('j', '') || '0');
  const minutes = parseInt(parts.find(p => p.endsWith('m'))?.replace('m', '') || '0');
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 60) return 'text-red-600';
  if (totalMinutes < 360) return 'text-orange-500';
  return 'text-orange-600';
};

// Format merchant deadline date for SLA display
const formatMerchantDeadlineDate = (deadline) => {
  if (!deadline) return '';
  const d = new Date(deadline);
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time} WIB`;
};

// Determine order method from order object with correct priority
const getJasaOrderMethod = (order) => {
  // If backend already provides the label, use it
  if (order?.cara_pemesanan_label) return order.cara_pemesanan_label;
  // Priority: cara_pemesanan > order_method > mekanisme_pemesanan > service_type_booking >
  //           jasa_order_item.order_method > jasa_order_item.service_type_booking
  const raw =
    order?.cara_pemesanan ||
    order?.order_method ||
    order?.mekanisme_pemesanan ||
    order?.service_type_booking ||
    order?.jasa_order_item?.order_method ||
    order?.jasa_order_item?.service_type_booking ||
    '';

  const val = String(raw).toLowerCase().trim();

  // Map to labels
  if (['direct_checkout', 'keranjang', 'checkout', 'tanpa_jadwal'].includes(val)) {
    return 'Checkout Tanpa Jadwal';
  }
  if (['booking', 'booking_schedule', 'jadwal', 'booking_jadwal'].includes(val)) {
    return 'Booking Jadwal';
  }
  if (['consultation', 'konsultasi', 'hasil_konsultasi'].includes(val)) {
    return 'Hasil Konsultasi';
  }

  // Fallback heuristics
  if (order?.booking_date || order?.booking_time) {
    return 'Booking Jadwal';
  }
  if (order?.consultation_id || order?.consultation) {
    return 'Hasil Konsultasi';
  }

  return 'Checkout Tanpa Jadwal';
};

// Get order method label (for display)
const getJasaOrderMethodLabel = (order) => {
  return getJasaOrderMethod(order);
};

// Get category with proper field priority
const getJasaCategory = (order) => {
  return (
    order?.category_name ||
    order?.service_category ||
    order?.jasa_category ||
    order?.jasa_order_item?.category_name ||
    order?.jasa_order_item?.jasa?.categories?.[0]?.name ||
    order?.jasa?.categories?.[0]?.name ||
    order?._raw?.category_name ||
    order?._raw?.jasa?.categories?.[0]?.name ||
    '—'
  );
};

// Get agreed/final price with priority
const getOrderAgreedPrice = (order) => {
  const val = order?.total_price
    || order?.total_amount
    || order?.grand_total
    || order?.final_price
    || order?.agreed_price
    || order?.jasa_order_item?.total_price
    || order?.jasa_order_item?.agreed_price
    || order?.jasa_order_item?.price
    || 0;
  return Number(val);
};

// Get completion confirmation deadline remaining (for waiting_selesai orders)
const getJasaCompletionDeadlineRemaining = (order) => {
  const status = String(order.status || '').toLowerCase();
  if (status !== 'menunggu_selesai' && status !== 'menunggu_konfirmasi_selesai') return null;
  if (!order.completion_deadline_at) return null;
  return formatCountdown(order.completion_deadline_at);
};

// Format service type for display
const formatJasaType = (type) => {
  if (!type) return 'Jasa';
  const normalized = type.toString().toLowerCase().trim();
  if (normalized === 'consultation' || normalized === 'konsultasi') return 'Konsultasi';
  if (normalized === 'booking' || normalized === 'booking_schedule') return 'Booking';
  if (normalized === 'direct_checkout' || normalized === 'keranjang') return 'Keranjang';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

// Get service image URL
const getJasaImageUrl = (order) => {
  const image = order.service_image || order.items?.[0]?.image;
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${image.replace(/^storage\//, '')}`;
};

// Get order price
const getOrderPrice = (order) => {
  return order.total_price || order.amounts?.total || 0;
};

// Get booking display string
const getJasaBookingDisplay = (order) => {
  const parts = [];
  if (order.booking_date) {
    parts.push(formatDate(order.booking_date));
  }
  if (order.booking_time) {
    parts.push(order.booking_time);
  }
  return parts.length > 0 ? parts.join(' ') : null;
};

// ========================
// PAYMENT DISPLAY HELPER
// ========================

/**
 * Get payment method prefix (Xendit or COD)
 */
const getJasaPaymentMethodPrefix = (order) => {
  const method = String(order?.payment_method || '').toUpperCase();
  // Xendit/Online methods
  if (['QRIS', 'BCA', 'BNI', 'BRI', 'MANDIRI', 'OVO', 'DANA', 'SHOPEEPAY', 'ALFAMART', 'ONLINE', 'ONLINE_XENDIT', 'XENDIT', 'EWALLET', 'VA', 'VIRTUAL_ACCOUNT'].includes(method)) {
    return 'Xendit';
  }
  // COD/Cash on Delivery
  if (['COD', 'CASH', 'BAYAR_DI_TEMPAT', 'BAYAR_DI_TEMPAT'].includes(method)) {
    return 'COD';
  }
  // Check if it's a manual/cash method
  if (['MANUAL', 'MANUAL_TRANSFER', 'TRANSFER'].includes(method)) {
    return 'Transfer';
  }
  // Default: check if online/xendit in the value
  if (method.includes('ONLINE') || method.includes('XENDIT') || method.includes('QRIS')) {
    return 'Xendit';
  }
  return 'Xendit'; // Default to Xendit for unknown methods
};

/**
 * Get payment status label (internal status)
 */
const getJasaPaymentStatusLabel = (status) => {
  return formatPaymentStatus(status);
};

// Get payment method display for table/modal
const getJasaPaymentLabel = (order) => {
  const prefix = getJasaPaymentMethodPrefix(order);
  const method = String(order?.payment_method || '').toUpperCase();

  // COD/Manual methods - show as-is, NOT as "Sudah Bayar"
  if (prefix === 'COD') {
    return 'COD - Bayar di Tempat';
  }
  if (prefix === 'Transfer') {
    return 'Transfer - ' + getJasaPaymentStatusLabel(order?.payment_status);
  }

  // Xendit - show status based on payment_status
  const status = getJasaPaymentStatusLabel(order?.payment_status);
  return `${prefix} - ${status}`;
};

const getJasaPaymentColor = (order) => {
  const prefix = getJasaPaymentMethodPrefix(order);

  // COD - always yellow (waiting for payment at service completion)
  if (prefix === 'COD') {
    return 'bg-yellow-100 text-yellow-700';
  }

  // Use status-based color
  return getPaymentStatusColorClass(order?.payment_status);
};

// Get service type label for display (accepts order object)
const getServiceTypeLabel = (orderOrType) => {
  // If backend already provides the label, use it
  if (orderOrType?.service_type_label) return orderOrType.service_type_label;
  const type = (
    orderOrType?.service_type ||
    orderOrType?.tipe_layanan ||
    orderOrType?.service_location_type ||
    orderOrType?.order_type ||
    orderOrType?.jasa_order_item?.service_type ||
    orderOrType?.jasa_order_item?.jasa?.service_type ||
    orderOrType?.jasa?.service_type ||
    orderOrType?._raw?.service_type ||
    orderOrType?._raw?.jasa?.service_type ||
    (typeof orderOrType === 'string' ? orderOrType : '') ||
    ''
  );
  if (!type) return '—';
  const val = String(type).toLowerCase().trim();
  if (['di_tempat_umkm', 'ditempat_umkm', 'ditempat', 'di_tempat', 'di tempat', 'at_merchant'].includes(val)) return 'Di Tempat UMKM';
  if (['ke_rumah_pelanggan', 'ke_tempat_pelanggan', 'kerumah', 'ke_rumah', 'customer_location'].includes(val)) return 'Ke Tempat Pelanggan';
  if (val === 'online') return 'Online';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

// Map service order to unified format
function mapJasaOrder(o) {
  // Debug logging for completion evidences
  console.log('[mapJasaOrder] Order:', o.id, '| completion_evidences:', o.completion_evidences);
  console.log('[mapJasaOrder] Evidence count:', (o.completion_evidences || []).length);

  return {
    id: o.id,
    invoice: o.order_number || o.formatted_order_number || `ORD-${String(o.id).padStart(6, '0')}`,
    order_id: o.order_id,
    customer: {
      name: o.customer_name || o.customer?.name || o.user?.name || "Pelanggan",
      phone: o.customer_phone || o.customer?.phone || o.user?.phone || "-",
      address: o.customer_address || o.address || '',
    },
    status: getJasaDisplayStatus(o),
    service_status: o.service_status || o.status,
    order_status: o.order_status,
    payment_method: o.payment_method || "COD",
    payment_status: o.payment_status,
    created_at: o.created_at,
    // Service info
    service_name: o.service_name || o.jasa?.title || "Layanan Jasa",
    category_name: o.category_name || o.service_category || o.jasa_category || o.jasa_order_item?.category_name || o.jasa_order_item?.jasa?.categories?.[0]?.name || o.jasa?.categories?.[0]?.name || '',
    service_type: o.service_type || o.tipe_layanan || o.service_location_type || o.order_type || o.jasa_order_item?.service_type || o.jasa_order_item?.jasa?.service_type || o.jasa?.service_type || '',
    service_type_label: o.service_type_label || '',
    cara_pemesanan: o.cara_pemesanan || o.booking_type || '',
    cara_pemesanan_label: o.cara_pemesanan_label || '',
    // Addresses (from API — already computed by backend based on service_type)
    merchant_address: o.merchant_address || o.merchant?.address || o.umkm_address || '',
    service_location_address: o.service_location_address || '',
    customer_address: o.customer_address || '',
    // Price snapshot — use agreed/final price from order
    total_price: o.total_price || o.total_amount || o.grand_total || o.final_price || o.agreed_price || 0,
    // Order method — use correct priority
    order_method: o.order_method || o.mekanisme_pemesanan || o.service_type_booking || o.jasa_order_item?.order_method || o.jasa_order_item?.service_type_booking || '',
    // SLA
    merchant_response_deadline: o.merchant_response_deadline,
    completion_deadline_at: o.completion_deadline_at,
    consultation_id: o.consultation_id,
    consultation: o.consultation,
    items: [{
      id: o.jasa_order_item_id,
      name: o.service_name || o.jasa?.title || "Layanan Jasa",
      variant: formatJasaType(o.order_type || o.service_type),
      addons: [],
      qty: 1,
      price: o.total_price,
      subtotal: o.total_price,
      image: getJasaImageUrl(o),
    }],
    amounts: {
      total: Number(o.total_price || 0),
    },
    booking_date: o.booking_date,
    booking_time: o.booking_time,
    booking_note: o.booking_note,
    customer_note: o.customer_note || o.note || '',
    order_type: o.order_type,
    service_type: o.service_type,
    completion_evidences: o.completion_evidences || [],
    review: o.review,
    rejection_reason: o.rejection_reason,
    completion_note: o.completion_note,
    _raw: o,
  };
}

async function fetchJasaOrders() {
  if (!currentMerchantSlug.value) {
    console.log('[fetchJasaOrders] No merchant slug, skipping...');
    return;
  }

  jasaOrdersLoading.value = true;
  try {
    const merchantSlug = currentMerchantSlug.value;
    // Use new endpoint: /api/merchant/{merchant}/orders
    const url = `/api/merchant/${merchantSlug}/orders`;

    console.log('[fetchJasaOrders] Merchant slug:', merchantSlug);
    console.log('[fetchJasaOrders] Full URL:', url);
    console.log('[fetchJasaOrders] Filter params:', {
      q: query.value,
      start_date: filters.value.start_date,
      end_date: filters.value.end_date,
      sort_by: filters.value.sort_by,
      page: currentPage.value,
      per_page: perPage.value
    });

    const params = {
      page: currentPage.value,
      per_page: perPage.value,
      q: query.value || undefined,
      sort_by: filters.value.sort_by,
      start_date: filters.value.start_date || undefined,
      end_date: filters.value.end_date || undefined,
    };

    const { data: res } = await api.get(url, { params });

    console.log('[fetchJasaOrders] Full response:', res);

    // Laravel paginate response wrapped in ApiResponse::success():
    // { message: "success", data: { current_page, data: [...], total, ... } }
    const responseData = res?.data;

    // Check if it's a paginated response (has current_page, data, total)
    const isPaginated = responseData &&
      typeof responseData === 'object' &&
      'current_page' in responseData &&
      'data' in responseData;

    let ordersArray = [];

    if (isPaginated) {
      // Extract orders from paginated data
      console.log('[fetchJasaOrders] Paginated response detected');
      console.log('[fetchJasaOrders] Total records:', responseData.total);
      console.log('[fetchJasaOrders] Current page:', responseData.current_page);
      ordersArray = Array.isArray(responseData.data) ? responseData.data : [];
    } else if (Array.isArray(responseData)) {
      // Direct array response
      console.log('[fetchJasaOrders] Direct array response');
      ordersArray = responseData;
    } else if (responseData && typeof responseData === 'object') {
      // Try to find array property
      console.log('[fetchJasaOrders] Object response, trying to find array property');
      const arrayProp = Object.values(responseData).find(v => Array.isArray(v));
      ordersArray = arrayProp || [];
    } else {
      console.log('[fetchJasaOrders] No data found');
    }

    console.log('[fetchJasaOrders] Extracted orders count:', ordersArray.length);

    // Log all orders with their status fields
    console.log('[fetchJasaOrders] All orders status data:');
    ordersArray.forEach((order, idx) => {
      console.log(`[Order ${idx + 1}]`, {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        service_status: order.service_status,
        status_label: order.status_label,
        service_status_label: order.service_status_label,
      });
    });

    allJasaOrders.value = ordersArray.map(mapJasaOrder);

    console.log('[fetchJasaOrders] Mapped orders:', allJasaOrders.value.length);

    // Debug: Log final state after refresh
    console.log('[fetchJasaOrders] MERCHANT ORDERS AFTER REFRESH:', allJasaOrders.value.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      displayStatus: o.status,
    })));

    // Update pagination from response
    if (isPaginated) {
      totalPages.value = responseData.last_page || 1;
      currentPage.value = responseData.current_page || 1;
      paginationInfo.value = {
        start: responseData.from || 1,
        end: responseData.to || ordersArray.length,
        total: responseData.total || ordersArray.length,
        per_page: responseData.per_page || perPage.value
      };
    } else {
      totalPages.value = 1;
      currentPage.value = 1;
      paginationInfo.value = {
        start: 1,
        end: ordersArray.length,
        total: ordersArray.length,
        per_page: perPage.value
      };
    }
  } catch (e) {
    console.error('[fetchJasaOrders] Error:', e);
    console.error('[fetchJasaOrders] Error response:', e.response?.data);
    console.error('[fetchJasaOrders] Error status:', e.response?.status);
    toast.error(e.response?.data?.message || e.response?.data?.error || "Gagal memuat pesanan jasa");
    allJasaOrders.value = [];
  } finally {
    jasaOrdersLoading.value = false;
  }
}

// Filter service orders by status tab
const filteredJasaOrders = computed(() => {
  if (activeTab.value === 'all') {
    console.log('[filteredJasaOrders] Showing all orders:', allJasaOrders.value.length);
    return allJasaOrders.value;
  }

  // Debug: Log all orders with their statuses
  console.log('[filteredJasaOrders] All orders status:');
  allJasaOrders.value.forEach(order => {
    console.log({
      id: order.id,
      order_number: order.order_number,
      'order.status': order.status,
      'order.service_status': order.service_status,
      displayStatus: getJasaDisplayStatus(order)
    });
  });

  // Mapping from tab key to allowed display statuses
  const tabStatusMap = {
    'perlu_diproses': ['menunggu'],
    'sedang_diproses': ['diterima', 'dikerjakan', 'tunggu_selesai'],
    'selesai': ['selesai'],
    'batal_gagal': ['ditolak', 'dibatalkan', 'expired', 'kadaluarsa'],
  };

  const allowedStatuses = tabStatusMap[activeTab.value] || [];
  console.log('[filteredJasaOrders] Selected filter:', activeTab.value, '| Allowed statuses:', allowedStatuses);

  const filtered = allJasaOrders.value.filter(order => {
    const displayStatus = getJasaDisplayStatus(order);
    const matches = allowedStatuses.includes(displayStatus);
    if (matches) {
      console.log('[filteredJasaOrders] MATCH - Order:', order.order_number, '| Status:', displayStatus);
    }
    return matches;
  });

  console.log('[filteredJasaOrders] Filtered count:', filtered.length);
  return filtered;
});

// Get status badge class for service orders
const getJasaStatusClass = (status) => {
  const classes = {
    'menunggu': 'bg-yellow-100 text-yellow-700',
    'diterima': 'bg-blue-100 text-blue-700',
    'dikerjakan': 'bg-amber-100 text-amber-700',
    'tunggu_selesai': 'bg-purple-100 text-purple-700',
    'selesai': 'bg-green-100 text-green-700',
    'ditolak': 'bg-red-100 text-red-700',
    'dibatalkan': 'bg-red-100 text-red-700',
    'expired': 'bg-pink-100 text-pink-700',
    'kadaluarsa': 'bg-pink-100 text-pink-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const getJasaStatusLabel = (status, order = {}) => {
  // For expired/kadaluarsa
  if (status === 'expired' || status === 'kadaluarsa') return 'Kadaluarsa';

  // For dibatalkan — show who cancelled
  if (status === 'dibatalkan') {
    if (order.cancelled_by === 'customer') return 'Dibatalkan Customer';
    if (order.cancelled_by === 'merchant') return 'Dibatalkan Merchant';
    return 'Dibatalkan';
  }
  // For ditolak — show who rejected
  if (status === 'ditolak') {
    if (order.rejected_by === 'merchant') return 'Ditolak Merchant';
    if (order.rejected_by === 'customer') return 'Ditolak Customer';
    return 'Ditolak';
  }
  const labels = {
    'menunggu': 'Menunggu Konfirmasi',
    'diterima': 'Diterima',
    'dikerjakan': 'Sedang Dikerjakan',
    'tunggu_selesai': 'Menunggu Selesai',
    'selesai': 'Selesai',
  };
  return labels[status] || status || '-';
};

// Service order actions
const acceptJasaOrder = async (orderId) => {
  submittingJasa.value = true;
  try {
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    const response = await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'diterima'
    });

    // Debug: Log the response
    console.log('[acceptJasaOrder] UPDATE STATUS RESPONSE:', response.data);
    console.log('[acceptJasaOrder] New status:', response.data?.data?.status, response.data?.data?.order_status);

    toast.success('Pesanan berhasil diterima');

    // Update selectedJasaOrder reactively
    if (selectedJasaOrder.value && (selectedJasaOrder.value.id === orderId || selectedJasaOrder.value.order_id === orderId)) {
      if (response.data?.data) {
        selectedJasaOrder.value = mapJasaOrder(response.data.data);
      } else {
        selectedJasaOrder.value.status = 'diterima';
        selectedJasaOrder.value.service_status = 'diterima';
        selectedJasaOrder.value.order_status = 'diterima';
        selectedJasaOrder.value.status_label = 'Diterima';
      }
    }

    // Refetch orders to get updated data
    await fetchJasaOrders();
  } catch (e) {
    console.error('[acceptJasaOrder] Error:', e);
    console.error('[acceptJasaOrder] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal menerima pesanan');
  } finally {
    submittingJasa.value = false;
  }
};

const openJasaRejectModal = (order) => {
  selectedJasaOrder.value = order;
  rejectReason.value = '';
  showJasaRejectModal.value = true;
};

const submitJasaRejection = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Alasan penolakan wajib diisi');
    return;
  }
  submittingJasa.value = true;
  try {
    const orderId = getOrderId(selectedJasaOrder.value);
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    const response = await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'ditolak',
      rejection_reason: rejectReason.value,
    });
    toast.success('Pesanan berhasil ditolak');
    showJasaRejectModal.value = false;
    rejectReason.value = '';

    // Update selectedJasaOrder reactively
    if (selectedJasaOrder.value) {
      if (response.data?.data) {
        selectedJasaOrder.value = mapJasaOrder(response.data.data);
      } else {
        selectedJasaOrder.value.status = 'ditolak';
        selectedJasaOrder.value.service_status = 'ditolak';
        selectedJasaOrder.value.order_status = 'ditolak';
        selectedJasaOrder.value.status_label = 'Ditolak';
        selectedJasaOrder.value.rejection_reason = rejectReason.value;
      }
    }

    await fetchJasaOrders();
  } catch (e) {
    console.error('[submitJasaRejection] Error:', e);
    console.error('[submitJasaRejection] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal menolak pesanan');
  } finally {
    submittingJasa.value = false;
  }
};

const startJasaWorking = async (orderId) => {
  submittingJasa.value = true;
  try {
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    const response = await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'layanan_dikerjakan'
    });

    // Debug: Log the response from server
    console.log('[startJasaWorking] Success response:', {
      orderId,
      response: response.data,
      newStatus: response.data?.data?.status,
      serviceStatus: response.data?.data?.service_status,
    });

    toast.success('Pesanan sedang dikerjakan');

    // Update selectedJasaOrder reactively
    if (selectedJasaOrder.value && (selectedJasaOrder.value.id === orderId || selectedJasaOrder.value.order_id === orderId)) {
      if (response.data?.data) {
        selectedJasaOrder.value = mapJasaOrder(response.data.data);
      } else {
        selectedJasaOrder.value.status = 'layanan_dikerjakan';
        selectedJasaOrder.value.service_status = 'layanan_dikerjakan';
        selectedJasaOrder.value.order_status = 'layanan_dikerjakan';
        selectedJasaOrder.value.status_label = 'Sedang Dikerjakan';
      }
    }

    await fetchJasaOrders();
  } catch (e) {
    console.error('[startJasaWorking] Error:', e);
    console.error('[startJasaWorking] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal memulai pekerjaan');
  } finally {
    submittingJasa.value = false;
  }
};

const openJasaEvidenceModal = (order) => {
  selectedJasaOrder.value = order;
  completionNote.value = '';
  evidenceFiles.value = [];
  showJasaEvidenceModal.value = true;
};

const handleEvidenceFileSelect = (event) => {
  const files = Array.from(event.target.files || []);
  const maxImageSize = 5 * 1024 * 1024;
  const maxVideoSize = 50 * 1024 * 1024;
  const validImages = ['image/jpeg', 'image/png', 'image/webp'];
  const validVideos = ['video/mp4', 'video/quicktime', 'video/webm'];

  for (const file of files) {
    const isImage = validImages.includes(file.type);
    const isVideo = validVideos.includes(file.type);
    if (!isImage && !isVideo) {
      toast.error(`File ${file.name} tidak valid. Gunakan gambar atau video.`);
      continue;
    }
    const maxAllowed = isImage ? maxImageSize : maxVideoSize;
    const maxMB = isImage ? 5 : 50;
    if (file.size > maxAllowed) {
      toast.error(`File ${file.name} terlalu besar. Maksimal ${maxMB}MB.`);
      continue;
    }
    evidenceFiles.value.push(file);
  }
  event.target.value = '';
};

const removeEvidenceFile = (index) => {
  evidenceFiles.value.splice(index, 1);
};

const submitJasaEvidence = async () => {
  if (evidenceFiles.value.length === 0) {
    toast.error('Minimal 1 bukti pengerjaan wajib diunggah');
    return;
  }
  submittingJasa.value = true;
  try {
    const orderId = getOrderId(selectedJasaOrder.value);
    const formData = new FormData();
    formData.append('status', 'menunggu_konfirmasi_selesai');
    formData.append('completion_note', completionNote.value || '');
    evidenceFiles.value.forEach((file) => {
      formData.append('evidences[]', file);
    });

    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    await api.post(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, formData);
    toast.success('Bukti pengerjaan berhasil dikirim');
    showJasaEvidenceModal.value = false;
    showJasaDetailModal.value = false;
    completionNote.value = '';
    evidenceFiles.value = [];
    selectedJasaOrder.value = null;
    fetchJasaOrders();
  } catch (e) {
    console.error('[submitJasaEvidence] Error:', e);
    console.error('[submitJasaEvidence] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal mengirim bukti pengerjaan');
  } finally {
    submittingJasa.value = false;
  }
};

const openJasaDetailModal = (order) => {
  selectedJasaOrder.value = order;
  console.log('[LOG SEMENTARA - MERCHANT DETAIL] Selected Order ID:', order?.id);
  console.log('[LOG SEMENTARA - MERCHANT DETAIL] Completion evidences from API:', order?._raw?.completion_evidences);
  console.log('[LOG SEMENTARA - MERCHANT DETAIL] Mapped completion evidences:', order?.completion_evidences);
  console.log('selectedJasaOrder full:', JSON.stringify(order, null, 2));
  console.log('[openJasaDetailModal] category fields:', {
    category_name: order?.category_name,
    service_category: order?.service_category,
    jasa_category: order?.jasa_category,
    jasa_order_item_category: order?.jasa_order_item?.category_name,
    jasa_jasa_category: order?.jasa?.category?.name,
  });
  console.log('[openJasaDetailModal] service_type fields:', {
    service_type: order?.service_type,
    tipe_layanan: order?.tipe_layanan,
    service_location_type: order?.service_location_type,
    order_type: order?.order_type,
    jasa_order_item_service_type: order?.jasa_order_item?.service_type,
    jasa_jasa_service_type: order?.jasa?.service_type,
  });
  showJasaDetailModal.value = true;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getEvidenceUrl = (evidence) => {
  const raw =
    evidence?.file_url ||
    evidence?.url ||
    evidence?.media_url ||
    evidence?.evidence_url ||
    evidence?.file_path ||
    evidence?.path;

  if (!raw) {
    console.warn('[getEvidenceUrl] No URL field found in evidence:', evidence);
    return null;
  }
  if (String(raw).startsWith('http')) return raw;
  if (String(raw).startsWith('/storage')) return `${API_BASE_URL}${raw}`;
  const result = `${API_BASE_URL}/storage/${String(raw).replace(/^\/+/, '').replace(/^public\//, '')}`;
  console.log('[getEvidenceUrl] raw:', raw, '→ result:', result);
  return result;
};

const isImageEvidence = (evidence) => {
  const type = evidence?.file_type || evidence?.media_type || evidence?.mime_type || '';
  const url = getEvidenceUrl(evidence) || '';
  return String(type).includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
};

const isVideoEvidence = (evidence) => {
  const type = evidence?.file_type || evidence?.media_type || evidence?.mime_type || '';
  const url = getEvidenceUrl(evidence) || '';
  return String(type).includes('video') || /\.(mp4|mov|webm)$/i.test(url);
};

const getServiceMediaUrl = (mediaOrPath) => {
  if (!mediaOrPath) return '';
  if (typeof mediaOrPath === 'string') {
    if (mediaOrPath.startsWith('http')) return mediaOrPath;
    if (mediaOrPath.startsWith('/storage')) return `${API_BASE_URL}${mediaOrPath}`;
    return `${API_BASE_URL}/storage/${mediaOrPath.replace(/^\/+/, '').replace(/^public\//, '')}`;
  }
  return getEvidenceUrl(mediaOrPath);
};

const getJasaMediaUrl = (mediaOrPath) => getServiceMediaUrl(mediaOrPath);

const getJasaCompletionEvidences = (order) => {
  const ev = order?.completion_evidences || order?.completionEvidences || [];
  console.log('[getJasaCompletionEvidences] Order:', order?.id, '| Count:', ev.length, '| Data:', ev);
  return ev;
};

// Check if order has completion evidences
const hasJasaCompletionEvidences = (order) => {
  const evidences = order?.completion_evidences || [];
  console.log('ORDER EVIDENCE:', order.id, evidences);
  return Array.isArray(evidences) && evidences.length > 0;
};

// Open evidence view modal
const openJasaEvidenceViewModal = (order) => {
  selectedJasaOrder.value = order;
  showJasaEvidenceViewModal.value = true;
};

const getReviewMedia = (review) => {
  return review?.media || [];
};

const getReviewComment = (order) => {
  return order.review?.comment || '';
};

const getReviewerName = (order) => {
  if (order.review?.is_anonymous) return 'Anonim';
  return order.review?.user?.name || order.review?.reviewer_name || 'Pelanggan';
};

// ========================
// REVIEW HISTORY HELPERS
// ========================
const getReviewHistories = (review) => {
  // Fallback: histories or review_histories
  return review?.histories || review?.review_histories || [];
};

const getHistoryMedia = (history, type) => {
  // type: 'old' or 'new'
  const key = `${type}_media`;
  return history?.[key] || [];
};

// ========================
// MERCHANT REPLY TO REVIEW
// ========================
const openJasaReviewModal = (order) => {
  selectedJasaOrder.value = order;
  selectedReview.value = order.review;
  merchantReplyText.value = order.review?.merchant_reply || '';
  showReviewHistory.value = false; // Reset history visibility
  showJasaReviewModal.value = true;

  // Debug: Log review data
  console.log('MERCHANT MODAL REVIEW DATA:', order.review);
};

const submitMerchantReply = async () => {
  if (!merchantReplyText.value.trim()) {
    toast.error('Tanggapan tidak boleh kosong');
    return;
  }
  if (merchantReplyText.value.length > 1000) {
    toast.error('Tanggapan maksimal 1000 karakter');
    return;
  }

  submittingReply.value = true;
  try {
    const reviewId = selectedReview.value?.id;
    if (!reviewId) {
      toast.error('Review tidak ditemukan');
      return;
    }
    const response = await api.post(
      `/api/merchant/${currentMerchantSlug.value}/reviews/${reviewId}/reply`,
      { merchant_reply: merchantReplyText.value }
    );
    toast.success('Tanggapan berhasil dikirim');
    showJasaReviewModal.value = false;
    merchantReplyText.value = '';
    selectedReview.value = null;
    selectedJasaOrder.value = null;
    fetchJasaOrders();
  } catch (e) {
    console.error('[submitMerchantReply] Error:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal mengirim tanggapan');
  } finally {
    submittingReply.value = false;
  }
};

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
  console.log('[applyFilters] Applying filters:', {
    start_date: filters.value.start_date,
    end_date: filters.value.end_date,
    sort_by: filters.value.sort_by,
    query: query.value
  });
  currentPage.value = 1;
  fetchOrders();
  showFilterModal.value = false;
}

function resetFilters() {
  console.log('[resetFilters] Resetting filters');
  filters.value = {
    start_date: "",
    end_date: "",
    sort_by: "newest"
  };
  query.value = "";
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

// Watch order type change
watch(activeOrderType, () => {
  currentPage.value = 1;
  activeTab.value = 'all';
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

const jasaTableColumns = [
  { key: "invoice", label: "No. Pesanan" },
  { key: "customer.name", label: "Pelanggan" },
  { key: "itemsSummary", label: "Layanan" },
  { key: "created_at", label: "Tanggal" },
  { key: "amounts.total", label: "Total" },
  { key: "payment_method", label: "Pembayaran" },
  { key: "service_type", label: "Tipe" },
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
    // Service order statuses
    menunggu: {
      variant: "payment",
      status: "pending",
      label: "Menunggu Konfirmasi",
      size: "sm",
      showIcon: true,
    },
    diterima: {
      variant: "order",
      status: "processing",
      label: "Diterima",
      size: "sm",
      showIcon: true,
    },
    ditolak: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak",
      size: "sm",
      showIcon: true,
    },
    dikerjakan: {
      variant: "order",
      status: "processing",
      label: "Dikerjakan",
      size: "sm",
      showIcon: true,
    },
    tunggu_selesai: {
      variant: "order",
      status: "ready",
      label: "Tunggu Selesai",
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
  if (activeOrderType.value === 'jasa') {
    openJasaDetailModal(order);
  } else {
    router.push(`/merchant-center/${currentMerchantSlug.value}/orders/${order.id}`);
  }
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
    <!-- Header -->
    <div
      class="sticky top-0 z-30 bg-white sm:static sm:z-auto border-b border-gray-100 sm:border-0"
    >
      <div class="px-4 pt-4 pb-2 sm:px-6 sm:py-6 sm:bg-transparent">
        <div class="flex items-center gap-3">
          <button
            @click="emit('toggle-sidebar')"
            class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background shrink-0 border border-gray-100"
          >
            <i class="pi pi-bars text-muted-foreground"></i>
          </button>
          <div>
            <h1 class="text-base font-semibold text-merchant-primary sm:hidden">
              Pesanan Masuk
            </h1>
            <div class="hidden sm:block">
              <Breadcrumb
                :items="breadcrumbItems"
                :merchantId="currentMerchantSlug"
              />
              <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
                Kelola pesanan masuk {{ currentMerchantName }}
              </p>
            </div>
            <p class="text-xs text-muted-foreground sm:hidden">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>

      <!-- ORDER TYPE TABS (Produk / Jasa) -->
      <div v-if="false" class="px-4 sm:px-6">
        <div class="bg-white shadow-sm rounded-xl">
          <div class="flex">
            <button
              @click="activeOrderType = 'produk'"
              :class="[
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2',
                activeOrderType === 'produk'
                  ? 'text-merchant-primary border-merchant-primary'
                  : 'text-gray-500 hover:text-gray-700 border-transparent',
              ]"
            >
              <i class="pi pi-box"></i>
              Produk
            </button>
            <button
              @click="activeOrderType = 'jasa'"
              :class="[
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2',
                activeOrderType === 'jasa'
                  ? 'text-merchant-primary border-merchant-primary'
                  : 'text-gray-500 hover:text-gray-700 border-transparent',
              ]"
            >
              <i class="pi pi-briefcase"></i>
              Jasa
            </button>
          </div>
        </div>
      </div>

      <!-- STATUS TABS - horizontal scroll on mobile -->
      <div class="px-4 sm:px-6 pb-2">
        <div class="bg-white shadow-sm rounded-xl overflow-x-auto no-scrollbar">
          <div class="flex min-w-max">
            <button
              v-for="tab in (activeOrderType === 'jasa' ? jasaTabs : tabs)"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition whitespace-nowrap border-b-2 shrink-0',
                activeTab === tab.key
                  ? 'text-merchant-primary border-merchant-primary'
                  : 'text-gray-500 hover:text-gray-700 border-transparent',
              ]"
            >
              {{ tab.label }}
              <span
                v-if="tabCounts[tab.key] && ['waiting_review', 'processing', 'delivered'].includes(tab.key) && activeOrderType === 'produk'"
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
      </div>

      <!-- SEARCH + FILTER (mobile only) -->
      <div class="px-4 pb-4 sm:hidden">
        <div class="flex items-center gap-2">
          <TextField
            name="search"
            :modelValue="query"
            @update:modelValue="(v) => (query = v)"
            placeholder="Cari no. pesanan / pelanggan / produk"
            :hideLabel="true"
            variant="merchant"
            wrapperClass="flex-1 min-w-0"
            :alignWithPassword="false"
          />
          <button
            type="button"
            @click="openFilterModal"
            class="flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
          >
            <i class="text-gray-500 pi pi-sliders-h"></i>
            <span
              v-if="filters.start_date || filters.end_date || filters.sort_by !== 'newest'"
              class="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-merchant-primary"
            >
              !
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-4 py-2 space-y-2 sm:px-6 sm:py-6">

      <!-- SEARCH + FILTER (desktop only) -->
      <div class="hidden sm:flex items-center gap-2">
        <TextField
          name="search"
          :modelValue="query"
          @update:modelValue="(v) => (query = v)"
          placeholder="Cari no. pesanan / pelanggan / produk"
          :hideLabel="true"
          variant="merchant"
          wrapperClass="flex-1 min-w-0"
          :alignWithPassword="false"
        />
        <button
          type="button"
          @click="openFilterModal"
          class="flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
        >
          <i class="text-gray-500 pi pi-sliders-h"></i>
          <span
            v-if="filters.start_date || filters.end_date || filters.sort_by !== 'newest'"
            class="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-merchant-primary"
          >
            !
          </span>
        </button>
      </div>

      <!-- DESKTOP TABLE - PRODUK -->
        <div v-if="activeOrderType === 'produk'" class="hidden sm:block">
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

        <!-- DESKTOP TABLE - JASA -->
        <div v-else class="hidden sm:block">
          <div class="bg-white shadow-sm rounded-xl overflow-hidden">
            <!-- Table Header -->
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Pesanan</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Layanan</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pembayaran</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-if="jasaOrdersLoading">
                    <td colspan="9" class="px-4 py-12 text-center">
                      <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                      <p class="mt-2 text-sm text-gray-500">Memuat...</p>
                    </td>
                  </tr>
                  <tr v-else-if="!filteredJasaOrders.length">
                    <td colspan="9" class="px-4 py-12 text-center">
                      <i class="pi pi-inbox text-3xl text-gray-300"></i>
                      <p class="mt-2 text-sm text-gray-500">Tidak ada pesanan jasa</p>
                    </td>
                  </tr>
                  <template v-else>
                    <tr
                      v-for="order in filteredJasaOrders"
                      :key="order.id"
                      class="hover:bg-gray-50 cursor-pointer transition"
                      @click="openJasaDetailModal(order)"
                    >
                      <td class="px-4 py-3">
                        <div class="text-sm font-semibold text-gray-800">{{ order.invoice }}</div>
                        <div v-if="order.booking_date" class="text-xs text-gray-400">
                          {{ formatDate(order.booking_date) }} {{ order.booking_time || '' }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-800">{{ order.customer.name }}</div>
                        <div class="text-xs text-gray-400">{{ order.customer.phone }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-600 space-y-0.5">
                          <div class="truncate font-medium">{{ order.items[0].name }}</div>
                          <div v-if="order.category_name" class="text-xs text-purple-500 font-medium truncate">{{ order.category_name }}</div>
                          <div class="text-[11px] text-gray-400">{{ getJasaOrderMethod(order) }}</div>
                          <div v-if="order.booking_note" class="text-[11px] text-gray-400 truncate max-w-[180px]">Catatan: {{ order.booking_note }}</div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-700">{{ formatDate(order.created_at) }}</div>
                        <div class="text-xs text-gray-400">{{ formatTime(order.created_at) }}</div>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <div class="text-sm font-semibold text-gray-800">Rp {{ formatIDR(order.amounts.total) }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-xs space-y-0.5">
                          <div class="font-medium text-gray-700">{{ getJasaPaymentLine1(order) }}</div>
                          <div class="text-gray-500">{{ getJasaPaymentLine2(order) }}</div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-600">{{ getServiceTypeLabel(order.service_type) }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <span :class="['inline-block px-2.5 py-1 rounded-full text-xs font-medium', getJasaStatusClass(order.status)]">
                            {{ getJasaStatusLabel(order.status, order) }}
                          </span>
                          <div v-if="getJasaSlaBadgeText(order)" :class="['inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', getJasaSlaBadgeColorClass(order)]">
                            <i class="pi pi-clock" style="font-size: 9px"></i>
                            Sisa {{ getJasaSlaBadgeText(order) }}
                          </div>
                          <div v-else-if="getJasaCompletionDeadlineRemaining(order)" class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            <i class="pi pi-clock" style="font-size: 9px"></i>
                            Konfirmasi {{ getJasaCompletionDeadlineRemaining(order) }}
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3" @click.stop>
                        <div class="flex flex-wrap items-center gap-1">
                          <button
                            v-if="canJasaAccept(order)"
                            @click="acceptJasaOrder(getOrderId(order))"
                            class="px-2 py-1 bg-blue-500 text-white text-[11px] font-medium rounded-md hover:bg-blue-600 transition"
                            :disabled="submittingJasa"
                          >
                            Terima
                          </button>
                          <button
                            v-if="canJasaReject(order)"
                            @click="openJasaRejectModal(order)"
                            class="px-2 py-1 border border-red-200 text-red-600 text-[11px] font-medium rounded-md hover:bg-red-50 transition"
                            :disabled="submittingJasa"
                          >
                            Tolak
                          </button>
                          <button
                            v-if="canJasaStart(order)"
                            @click="startJasaWorking(getOrderId(order))"
                            class="px-2 py-1 bg-amber-500 text-white text-[11px] font-medium rounded-md hover:bg-amber-600 transition"
                            :disabled="submittingJasa"
                          >
                            Kerjakan
                          </button>
                          <button
                            v-if="canJasaEvidence(order)"
                            @click="openJasaEvidenceModal(order)"
                            class="px-2 py-1 bg-purple-500 text-white text-[11px] font-medium rounded-md hover:bg-purple-600 transition"
                            :disabled="submittingJasa"
                          >
                            Upload
                          </button>
                          <button
                            v-if="hasJasaCompletionEvidences(order)"
                            @click.stop="openJasaEvidenceViewModal(order)"
                            class="px-2 py-1 bg-purple-600 text-white text-[11px] font-medium rounded-md hover:bg-purple-700 transition"
                            title="Lihat Bukti Penyelesaian"
                          >
                            Bukti
                          </button>
                          <button
                            v-if="order.is_reviewed || order.review"
                            @click.stop="openJasaReviewModal(order)"
                            class="px-2 py-1 bg-green-500 text-white text-[11px] font-medium rounded-md hover:bg-green-600 transition"
                          >
                            Rating
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div v-if="filteredJasaOrders.length > 0" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div class="text-sm text-gray-500">
                Menampilkan {{ paginationInfo.start }} - {{ paginationInfo.end }} dari {{ paginationInfo.total }}
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="handlePageChange(currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="pi pi-chevron-left"></i>
                </button>
                <span class="text-sm text-gray-600">Halaman {{ currentPage }} dari {{ totalPages }}</span>
                <button
                  @click="handlePageChange(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="pi pi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

      <!-- MOBILE CARD LIST - PRODUK -->
      <div v-if="activeOrderType === 'produk'" class="sm:hidden space-y-3">
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
        </div>
      </div>

      <!-- MOBILE CARD LIST - JASA -->
      <div v-else class="sm:hidden space-y-3">
        <div
          v-if="jasaOrdersLoading"
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
          v-else-if="!filteredJasaOrders.length"
          class="p-10 text-center bg-white border border-gray-100 shadow-sm rounded-2xl"
        >
          <div
            class="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full"
          >
            <i class="pi pi-inbox text-gray-400"></i>
          </div>
          <p class="text-sm font-medium text-gray-900">Tidak ada pesanan jasa</p>
          <p class="text-xs text-gray-500 mt-1">Coba sesuaikan filter pencarian.</p>
        </div>

        <div
          v-else
          v-for="order in filteredJasaOrders"
          :key="order.id"
          class="p-4 bg-white border border-gray-100 shadow-sm cursor-pointer rounded-2xl active:bg-gray-50"
          @click="openJasaDetailModal(order)"
        >
          <div
            class="flex items-start justify-between mb-3"
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
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span :class="['px-2 py-0.5 rounded-full text-[11px] font-medium', getJasaStatusClass(order.status)]">
                {{ getJasaStatusLabel(order.status, order) }}
              </span>
              <span v-if="getJasaSlaBadgeText(order)" :class="['inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full', getJasaSlaBadgeColorClass(order)]">
                <i class="pi pi-clock" style="font-size: 8px"></i>
                Sisa {{ getJasaSlaBadgeText(order) }}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-user shrink-0"></i>
              <span class="text-sm text-gray-700">{{ order.customer.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-briefcase shrink-0"></i>
              <div class="flex-1 min-w-0">
                <span class="text-sm text-gray-600 truncate block font-medium">{{ order.items[0].name }}</span>
                <span v-if="order.category_name" class="text-xs text-purple-500 truncate block">{{ order.category_name }}</span>
                <span class="text-[11px] text-gray-400 truncate block">{{ getJasaOrderMethod(order) }}</span>
                <span v-if="order.booking_note" class="text-[11px] text-gray-400 truncate block">Catatan: {{ order.booking_note }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between pt-1">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-credit-card"></i>
                  <span class="text-[11px] text-gray-700 font-medium">{{ getJasaPaymentLine1(order) }}</span>
                  <span class="text-[11px] text-gray-400">{{ getJasaPaymentLine2(order) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-map-marker"></i>
                  <span class="text-[11px] text-gray-500">{{ getServiceTypeLabel(order.service_type) }}</span>
                </div>
              </div>
              <span class="text-sm font-bold text-gray-800">
                Rp {{ formatIDR(order.amounts.total) }}
              </span>
            </div>
          </div>

          <!-- Mobile Action Buttons -->
          <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100" @click.stop>
            <button
              v-if="canJasaAccept(order)"
              @click="acceptJasaOrder(getOrderId(order))"
              class="flex-1 py-1.5 px-3 bg-blue-500 text-white text-[11px] font-medium rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1"
              :disabled="submittingJasa"
            >
              Terima
            </button>
            <button
              v-if="canJasaReject(order)"
              @click="openJasaRejectModal(order)"
              class="flex-1 py-1.5 px-3 border border-red-200 text-red-600 text-[11px] font-medium rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-1"
              :disabled="submittingJasa"
            >
              Tolak
            </button>
            <button
              v-if="canJasaStart(order)"
              @click="startJasaWorking(getOrderId(order))"
              class="flex-1 py-1.5 px-3 bg-amber-500 text-white text-[11px] font-medium rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-1"
              :disabled="submittingJasa"
            >
              Kerjakan
            </button>
            <button
              v-if="canJasaEvidence(order)"
              @click="openJasaEvidenceModal(order)"
              class="flex-1 py-1.5 px-3 bg-purple-500 text-white text-[11px] font-medium rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-1"
              :disabled="submittingJasa"
            >
              Upload
            </button>
            <button
              v-if="hasJasaCompletionEvidences(order)"
              @click.stop="openJasaEvidenceViewModal(order)"
              class="flex-1 py-1.5 px-3 bg-purple-600 text-white text-[11px] font-medium rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-1"
            >
              Bukti
            </button>
            <button
              v-if="order.is_reviewed || order.review"
              @click.stop="openJasaReviewModal(order)"
              class="flex-1 py-1.5 px-3 bg-green-500 text-white text-[11px] font-medium rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-1"
            >
              Rating
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->

       <div
      v-if="!ordersLoading && !jasaOrdersLoading && (allOrders.length > 0 || filteredJasaOrders.length > 0)"
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
        <div class="pt-6 space-y-4 border-t border-gray-200">
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

    <!-- Service Order Detail Modal -->
    <transition name="fade">
      <div
        v-if="showJasaDetailModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div class="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden">
          <!-- Modal Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Detail Pesanan Jasa</h2>
            <button
              type="button"
              class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              @click="showJasaDetailModal = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="selectedJasaOrder" class="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-4 space-y-4">

            <!-- 1. HEADER LAYANAN -->
            <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div class="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden shrink-0">
                <img
                  v-if="getJasaImageUrl(selectedJasaOrder)"
                  :src="getJasaImageUrl(selectedJasaOrder)"
                  class="w-full h-full object-cover"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <i v-else class="pi pi-briefcase w-full h-full flex items-center justify-center text-gray-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 leading-tight">
                  {{ selectedJasaOrder.service_name || selectedJasaOrder.items[0].name }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Kategori: {{ getJasaCategory(selectedJasaOrder) }}
                </p>
                <p class="text-xs text-purple-500 mt-0.5 font-medium">
                  Tipe Layanan: {{ getServiceTypeLabel(selectedJasaOrder) }}
                </p>
              </div>
            </div>

            <!-- 2. RINGKASAN PESANAN (grid 2 kolom) -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ringkasan Pesanan</h3>
              <div class="grid grid-cols-2 gap-2">
                <div class="p-3 bg-gray-50 rounded-xl space-y-1.5 text-sm">
                  <p class="text-xs text-gray-400">No. Pesanan</p>
                  <p class="text-gray-800 font-semibold font-mono">{{ selectedJasaOrder.invoice }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-xl space-y-1.5 text-sm">
                  <p class="text-xs text-gray-400">Tanggal Pesanan</p>
                  <p class="text-gray-800">{{ formatDate(selectedJasaOrder.created_at) }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-xl space-y-1.5 text-sm">
                  <p class="text-xs text-gray-400">Cara Pemesanan</p>
                  <p class="text-gray-800 font-medium">{{ getJasaOrderMethod(selectedJasaOrder) }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-xl space-y-1.5 text-sm">
                  <p class="text-xs text-gray-400">Status Pesanan</p>
                  <span :class="['inline-block px-2 py-0.5 rounded-full text-xs font-medium', getJasaStatusClass(selectedJasaOrder.status)]">
                    {{ getJasaStatusLabel(selectedJasaOrder.status, selectedJasaOrder) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 3. DATA PELANGGAN -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Pelanggan</h3>
              <div class="p-3 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Nama</span>
                  <span class="text-gray-800 font-medium">{{ selectedJasaOrder.customer.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Nomor Telepon</span>
                  <span class="text-gray-800">{{ selectedJasaOrder.customer.phone || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- 4. METODE PEMBAYARAN -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Metode Pembayaran</h3>
              <div class="p-3 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Metode</span>
                  <span :class="['inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', getJasaPaymentColor(selectedJasaOrder)]">
                    {{ getJasaPaymentMethodPrefix(selectedJasaOrder) === 'COD' ? 'COD' : getJasaPaymentMethodPrefix(selectedJasaOrder) === 'Transfer' ? 'Transfer' : 'Xendit' }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Status</span>
                  <span class="text-gray-800 text-xs">{{ getJasaPaymentLabel(selectedJasaOrder) }}</span>
                </div>
              </div>
            </div>

            <!-- 5. JADWAL -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jadwal</h3>
              <div v-if="selectedJasaOrder.booking_date || selectedJasaOrder.booking_time" class="p-3 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div v-if="selectedJasaOrder.booking_date" class="flex justify-between">
                  <span class="text-gray-500">Tanggal Booking</span>
                  <span class="text-gray-800">{{ formatDate(selectedJasaOrder.booking_date) }}</span>
                </div>
                <div v-if="selectedJasaOrder.booking_time" class="flex justify-between">
                  <span class="text-gray-500">Jam Booking</span>
                  <span class="text-gray-800">{{ formatTime(selectedJasaOrder.booking_time) }} WIB</span>
                </div>
              </div>
              <div v-else class="p-3 bg-gray-50 rounded-xl text-sm text-gray-400 text-center italic">
                Tidak menggunakan jadwal booking
              </div>
            </div>

            <!-- 5b. TIPE LAYANAN (dengan alamat sesuai jenis) -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe Layanan</h3>
              <div class="p-3 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Tipe</span>
                  <span class="text-gray-800 font-medium">{{ getServiceTypeLabel(selectedJasaOrder) }}</span>
                </div>
                <!-- Alamat UMKM untuk "Di Tempat UMKM" -->
                <div v-if="['Di Tempat UMKM'].includes(getServiceTypeLabel(selectedJasaOrder))" class="flex justify-between">
                  <span class="text-gray-500">Alamat UMKM</span>
                  <span class="text-gray-800 text-right max-w-[60%]">
                    {{ selectedJasaOrder.merchant_address || '—' }}
                  </span>
                </div>
                <!-- Alamat Pelanggan untuk "Ke Tempat Pelanggan" -->
                <div v-else-if="['Ke Tempat Pelanggan'].includes(getServiceTypeLabel(selectedJasaOrder))" class="flex justify-between">
                  <span class="text-gray-500">Alamat Pelanggan</span>
                  <span class="text-gray-800 text-right max-w-[60%]">
                    {{ selectedJasaOrder.customer.address || selectedJasaOrder.customer_address || '—' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 6. TOTAL HARGA + SLA (side by side) -->
            <div class="grid grid-cols-2 gap-2">
              <!-- Total Harga Disepakati -->
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total Harga</p>
                <p class="text-lg font-bold text-blue-700 leading-tight">
                  {{ getOrderAgreedPrice(selectedJasaOrder) > 0 ? 'Rp ' + formatIDR(getOrderAgreedPrice(selectedJasaOrder)) : '—' }}
                </p>
              </div>
              <!-- SLA Respon Merchant -->
              <div
                v-if="String(selectedJasaOrder.status || '').toLowerCase() === 'menunggu_konfirmasi' || String(selectedJasaOrder.status || '').toLowerCase() === 'menunggu'"
                class="p-3 rounded-xl border-2"
                :class="isJasaMerchantDeadlinePassed(selectedJasaOrder)
                  ? 'border-red-400 bg-red-50'
                  : getJasaSlaDeadlineColorClass(selectedJasaOrder)"
              >
                <p class="text-xs font-semibold uppercase tracking-wide mb-1"
                  :class="isJasaMerchantDeadlinePassed(selectedJasaOrder)
                    ? 'text-red-600'
                    : ''">
                  Sisa Waktu
                </p>
                <p class="text-lg font-bold leading-tight"
                  :class="isJasaMerchantDeadlinePassed(selectedJasaOrder)
                    ? 'text-red-700'
                    : ''">
                  {{ isJasaMerchantDeadlinePassed(selectedJasaOrder)
                    ? 'Berakhir'
                    : (getJasaMerchantDeadlineRemaining(selectedJasaOrder) || '—') }}
                </p>
                <p v-if="selectedJasaOrder.merchant_response_deadline" class="text-[10px] mt-1 opacity-70">
                  Batas respon: {{ formatMerchantDeadlineDate(selectedJasaOrder.merchant_response_deadline) }}
                </p>
              </div>
              <div v-else-if="['expired', 'kadaluarsa'].includes(String(selectedJasaOrder.status || '').toLowerCase())" class="p-3 bg-pink-50 border border-pink-200 rounded-xl">
                <p class="text-xs font-semibold text-pink-500 uppercase tracking-wide mb-1">Sisa Waktu</p>
                <p class="text-lg font-bold text-pink-600 leading-tight">Kadaluarsa</p>
              </div>
              <div v-else class="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sisa Waktu</p>
                <p class="text-lg font-bold text-gray-400 leading-tight">—</p>
              </div>
            </div>

            <!-- 7. CATATAN PELANGGAN -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catatan Pelanggan</h3>
              <div class="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                {{ selectedJasaOrder.customer_note || selectedJasaOrder.booking_note || '—' }}
              </div>
            </div>

            <!-- Alasan Penolakan -->
            <div v-if="selectedJasaOrder.rejection_reason" class="space-y-2">
              <h3 class="text-xs font-semibold text-red-500 uppercase tracking-wide">Alasan Penolakan</h3>
              <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <i class="pi pi-info-circle mr-1"></i>
                {{ selectedJasaOrder.rejection_reason }}
              </div>
            </div>

            <!-- Catatan Pengerjaan -->
            <div v-if="selectedJasaOrder.completion_note" class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catatan Pengerjaan</h3>
              <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700">
                <i class="pi pi-file mr-1"></i>
                {{ selectedJasaOrder.completion_note }}
              </div>
            </div>

            <!-- SLA Info: menunggu_selesai -->
            <div v-if="getJasaCompletionDeadlineRemaining(selectedJasaOrder)" class="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div class="flex items-center gap-2 text-sm text-purple-700 font-medium">
                <i class="pi pi-clock shrink-0"></i>
                Menunggu konfirmasi customer. Auto-selesai dalam: <strong>{{ getJasaCompletionDeadlineRemaining(selectedJasaOrder) }}</strong>
              </div>
            </div>

            <!-- 9. BUKTI PENGERJAAN -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bukti Pengerjaan</h3>
              <div v-if="getJasaCompletionEvidences(selectedJasaOrder).length > 0" class="grid grid-cols-3 gap-2">
                <template v-for="ev in getJasaCompletionEvidences(selectedJasaOrder)" :key="ev.id">
                  <img
                    v-if="isImageEvidence(ev)"
                    :src="getEvidenceUrl(ev)"
                    class="w-full aspect-square object-cover rounded-xl cursor-pointer"
                    @click="openJasaEvidenceViewModal(selectedJasaOrder)"
                    @error="(e) => { console.error('[Thumbnail failed]', getEvidenceUrl(ev), ev); e.target.style.display = 'none'; }"
                  />
                  <video
                    v-else-if="isVideoEvidence(ev)"
                    :src="getEvidenceUrl(ev)"
                    controls
                    class="w-full aspect-square object-cover rounded-xl"
                  />
                </template>
              </div>
              <div v-else class="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                <i class="pi pi-image text-2xl text-gray-300 mb-1"></i>
                <p class="text-xs text-gray-500">Belum ada bukti penyelesaian.</p>
              </div>
            </div>

            <!-- 10. AKSI -->
            <div v-if="!isJasaTerminal(selectedJasaOrder)" class="space-y-2 pt-1">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</h3>
              <div class="space-y-2">
                <!-- Menunggu Konfirmasi -->
                <template v-if="canJasaAccept(selectedJasaOrder)">
                  <button
                    @click="acceptJasaOrder(getOrderId(selectedJasaOrder))"
                    :disabled="submittingJasa"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-check"></i>
                    Terima Pesanan
                  </button>
                  <button
                    @click="openJasaRejectModal(selectedJasaOrder)"
                    :disabled="submittingJasa"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <i class="pi pi-times mr-1"></i>
                    Tolak Pesanan
                  </button>
                </template>
                <!-- Diterima -->
                <template v-else-if="canJasaStart(selectedJasaOrder)">
                  <button
                    @click="startJasaWorking(getOrderId(selectedJasaOrder))"
                    :disabled="submittingJasa"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-play"></i>
                    Mulai Kerjakan
                  </button>
                </template>
                <!-- Dikerjakan -->
                <template v-else-if="canJasaEvidence(selectedJasaOrder)">
                  <button
                    @click="openJasaEvidenceModal(selectedJasaOrder)"
                    :disabled="submittingJasa"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-upload"></i>
                    Kirim Bukti & Selesai
                  </button>
                </template>
                <!-- Menunggu Konfirmasi Selesai -->
                <template v-else-if="String(selectedJasaOrder.status || '').toLowerCase() === 'tunggu_selesai' || String(selectedJasaOrder.status || '').toLowerCase() === 'menunggu_selesai'">
                  <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 text-center">
                    <i class="pi pi-clock mr-1"></i>
                    Menunggu pelanggan mengkonfirmasi penyelesaian...
                  </div>
                </template>
              </div>
            </div>

            <!-- Rating dan Ulasan (bukan bagian dari 10 section, muncul jika pesanan selesai) -->
            <div v-if="String(selectedJasaOrder.status || '').toLowerCase() === 'selesai' && selectedJasaOrder.review" class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating dan Ulasan</h3>
              <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                <span class="inline-block bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">Ulasan dari Pelanggan</span>
                <div class="flex items-center gap-2 mt-2 mb-1">
                  <span class="text-sm font-medium text-gray-800">{{ getReviewerName(selectedJasaOrder) }}</span>
                  <span v-if="selectedJasaOrder.review.is_anonymous" class="text-xs text-gray-500">(Anonim)</span>
                </div>
                <div class="flex gap-1">
                  <i
                    v-for="star in 5"
                    :key="star"
                    class="pi text-sm"
                    :class="star <= Number(selectedJasaOrder.review.rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                  ></i>
                </div>
                <p v-if="getReviewComment(selectedJasaOrder)" class="text-sm text-gray-700 mt-2">
                  {{ getReviewComment(selectedJasaOrder) }}
                </p>
                <div v-if="getReviewMedia(selectedJasaOrder.review).length > 0" class="flex gap-2 mt-3 flex-wrap">
                  <template v-for="media in getReviewMedia(selectedJasaOrder.review)" :key="media.id">
                    <img
                      v-if="media.file_type === 'image'"
                      :src="getJasaMediaUrl(media)"
                      class="w-16 h-16 object-cover rounded-lg"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                  </template>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </transition>

    <!-- Reject Order Modal -->
    <transition name="fade">
      <div
        v-if="showJasaRejectModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div class="px-5 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Tolak Pesanan</h3>
              <button @click="showJasaRejectModal = false" class="text-gray-400 hover:text-gray-600">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
          <div class="p-5">
            <p class="text-sm text-gray-600 mb-3">
              Jelaskan alasan penolakan pesanan ini:
            </p>
            <textarea
              v-model="rejectReason"
              rows="4"
              placeholder="Contoh: Jadwal penuh, lokasi terlalu jauh, dll."
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            ></textarea>
            <div class="flex gap-2 mt-4">
              <button
                @click="showJasaRejectModal = false"
                class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                @click="submitJasaRejection"
                :disabled="submittingJasa"
                class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {{ submittingJasa ? 'Mengirim...' : 'Tolak Pesanan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Evidence Upload Modal -->
    <transition name="fade">
      <div
        v-if="showJasaEvidenceModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Kirim Bukti Pengerjaan</h3>
              <button @click="showJasaEvidenceModal = false" class="text-gray-400 hover:text-gray-600">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
          <div class="p-5">
            <p class="text-sm text-gray-600 mb-3">
              Unggah foto/video bukti pengerjaan (maksimal 50MB per file).
            </p>

            <!-- File Input -->
            <div
              class="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center mb-3 cursor-pointer hover:border-purple-300 transition"
              @click="$refs.serviceFileInput.click()"
            >
              <i class="pi pi-upload text-2xl text-gray-400 mb-1"></i>
              <p class="text-xs text-gray-500">Klik untuk pilih file</p>
              <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, MP4, MOV, WebM</p>
              <input
                ref="serviceFileInput"
                type="file"
                accept="image/*,video/*"
                multiple
                class="hidden"
                @change="handleEvidenceFileSelect"
              />
            </div>

            <!-- Selected Files Preview -->
            <div v-if="evidenceFiles.length > 0" class="space-y-2 mb-3">
              <div
                v-for="(file, index) in evidenceFiles"
                :key="index"
                class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-2 overflow-hidden">
                  <i class="pi text-sm text-purple-500" :class="file.type.startsWith('video') ? 'pi-video' : 'pi-image'"></i>
                  <span class="text-xs text-gray-700 truncate max-w-[180px]">{{ file.name }}</span>
                  <span class="text-xs text-gray-400">{{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
                </div>
                <button @click="removeEvidenceFile(index)" class="text-red-400 hover:text-red-600 ml-2">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
            </div>

            <!-- Completion Note -->
            <textarea
              v-model="completionNote"
              rows="3"
              placeholder="Catatan pengerjaan (opsional)"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 mb-4"
            ></textarea>

            <button
              @click="submitJasaEvidence"
              :disabled="submittingJasa || evidenceFiles.length === 0"
              class="w-full py-3 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <i class="pi pi-spin pi-spinner" v-if="submittingJasa"></i>
              <i class="pi pi-upload" v-else></i>
              {{ submittingJasa ? 'Mengirim...' : 'Kirim Bukti & Selesai' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  <!-- Review Modal -->
    <transition name="fade">
      <div
        v-if="showJasaReviewModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showJasaReviewModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
            <h3 class="font-bold text-gray-900">Rating dan Ulasan Pelanggan</h3>
            <button @click="showJasaReviewModal = false" class="text-gray-400 hover:text-gray-600">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="selectedReview" class="p-5 space-y-4">
            <!-- Service Info -->
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  v-if="getJasaImageUrl(selectedJasaOrder)"
                  :src="getJasaImageUrl(selectedJasaOrder)"
                  class="w-full h-full object-cover"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <i v-else class="pi pi-briefcase w-full h-full flex items-center justify-center text-gray-400"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ selectedJasaOrder?.items?.[0]?.name || 'Layanan' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ selectedJasaOrder?.invoice || '#' + selectedJasaOrder?.id }}
                </p>
              </div>
            </div>

            <!-- Reviewer Info -->
            <div class="text-center py-2">
              <p class="text-sm font-medium text-gray-700">
                {{ getReviewerName(selectedJasaOrder) }}
              </p>
              <p v-if="selectedReview.is_anonymous" class="text-xs text-gray-400">(Anonim)</p>
            </div>

            <!-- Star Rating -->
            <div class="flex items-center justify-center gap-1">
              <i
                v-for="star in 5"
                :key="star"
                class="pi text-2xl"
                :class="star <= Number(selectedReview.rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
              ></i>
              <span class="ml-2 text-sm font-semibold text-gray-700">
                {{ selectedReview.rating }}/5
              </span>
            </div>

            <!-- Review Comment -->
            <div v-if="selectedReview.comment" class="p-4 bg-gray-50 rounded-xl">
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedReview.comment }}</p>
            </div>

            <!-- Review Media -->
            <div v-if="getReviewMedia(selectedReview).length > 0">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Foto/Video Ulasan</p>
              <div class="grid grid-cols-4 gap-2">
                <template v-for="(media, idx) in getReviewMedia(selectedReview)" :key="media.id || idx">
                  <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      v-if="isImageEvidence(media)"
                      :src="getEvidenceUrl(media)"
                      class="w-full h-full object-cover"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <video
                      v-else-if="isVideoEvidence(media)"
                      :src="getEvidenceUrl(media)"
                      controls
                      class="w-full h-full object-cover"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- Review Date -->
            <div v-if="selectedReview.created_at" class="text-center">
              <p class="text-xs text-gray-400">
                {{ formatDate(selectedReview.created_at) }} {{ formatTime(selectedReview.created_at) }}
              </p>
            </div>

            <!-- Review Update History -->
            <div v-if="getReviewHistories(selectedReview).length > 0" class="mt-4">
              <div class="border-t border-gray-200 pt-4">
                <button
                  @click="showReviewHistory = !showReviewHistory"
                  class="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-history text-amber-500"></i>
                    <span class="text-sm font-medium text-amber-700">Riwayat Perubahan Ulasan</span>
                    <span class="text-xs text-amber-600">({{ getReviewHistories(selectedReview).length }})</span>
                  </div>
                  <i :class="['pi', showReviewHistory ? 'pi-chevron-up' : 'pi-chevron-down', 'text-amber-500']"></i>
                </button>

                <div v-if="showReviewHistory" class="mt-3 space-y-3">
                  <div
                    v-for="(history, index) in getReviewHistories(selectedReview)"
                    :key="history.id || index"
                    class="p-4 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <!-- Before Update -->
                    <div class="mb-4">
                      <p class="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <i class="pi pi-arrow-right"></i>
                        Sebelum diperbarui
                      </p>
                      <div class="space-y-2">
                        <!-- Old Rating -->
                        <div class="flex items-center gap-1">
                          <i
                            v-for="star in 5"
                            :key="'old-' + star"
                            class="pi text-sm"
                            :class="star <= Number(history.old_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                          ></i>
                          <span class="text-xs text-gray-500 ml-1">{{ history.old_rating }}/5</span>
                        </div>
                        <!-- Old Comment -->
                        <p v-if="history.old_comment" class="text-sm text-gray-600 whitespace-pre-wrap">
                          {{ history.old_comment }}
                        </p>
                        <!-- Old Media -->
                        <div v-if="getHistoryMedia(history, 'old').length > 0" class="flex flex-wrap gap-2 mt-2">
                          <img
                            v-for="(media, mIdx) in getHistoryMedia(history, 'old')"
                            :key="'old-media-' + mIdx"
                            :src="getJasaMediaUrl(media)"
                            class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            @error="(e) => e.target.style.display = 'none'"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- After Update -->
                    <div class="mb-4 pb-4 border-b border-gray-200">
                      <p class="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                        <i class="pi pi-check"></i>
                        Setelah diperbarui
                      </p>
                      <div class="space-y-2">
                        <!-- New Rating -->
                        <div class="flex items-center gap-1">
                          <i
                            v-for="star in 5"
                            :key="'new-' + star"
                            class="pi text-sm"
                            :class="star <= Number(history.new_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                          ></i>
                          <span class="text-xs text-gray-500 ml-1">{{ history.new_rating }}/5</span>
                        </div>
                        <!-- New Comment -->
                        <p v-if="history.new_comment" class="text-sm text-gray-600 whitespace-pre-wrap">
                          {{ history.new_comment }}
                        </p>
                        <!-- New Media -->
                        <div v-if="getHistoryMedia(history, 'new').length > 0" class="flex flex-wrap gap-2 mt-2">
                          <img
                            v-for="(media, mIdx) in getHistoryMedia(history, 'new')"
                            :key="'new-media-' + mIdx"
                            :src="getJasaMediaUrl(media)"
                            class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            @error="(e) => e.target.style.display = 'none'"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Change Date -->
                    <p class="text-xs text-gray-400">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ formatDate(history.created_at) }} {{ formatTime(history.created_at) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-200"></div>

            <!-- Merchant Reply Section -->
            <div v-if="selectedReview.merchant_reply">
              <!-- Already Replied - Show the reply -->
              <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-check-circle text-green-500"></i>
                  <p class="text-sm font-semibold text-green-700">Tanggapan Merchant</p>
                </div>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedReview.merchant_reply }}</p>
                <p v-if="selectedReview.merchant_reply_at" class="text-xs text-gray-400 mt-2">
                  {{ formatDate(selectedReview.merchant_reply_at) }} {{ formatTime(selectedReview.merchant_reply_at) }}
                </p>
                <div class="mt-3 pt-3 border-t border-green-200">
                  <p class="text-xs text-green-600 flex items-center gap-1">
                    <i class="pi pi-info-circle"></i>
                    Ulasan ini sudah ditanggapi dan tidak dapat direspon ulang.
                  </p>
                </div>
              </div>
            </div>

            <div v-else>
              <!-- Not Replied Yet - Show Reply Form -->
              <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                <p class="text-xs text-amber-700 flex items-start gap-2">
                  <i class="pi pi-info-circle mt-0.5 shrink-0"></i>
                  <span>Anda hanya dapat merespon ulasan ini satu kali. Pastikan tanggapan Anda sudah tepat sebelum dikirim.</span>
                </p>
              </div>

              <textarea
                v-model="merchantReplyText"
                rows="4"
                placeholder="Tulis tanggapan untuk ulasan pelanggan..."
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 placeholder-gray-400"
                maxlength="1000"
              ></textarea>

              <div class="flex items-center justify-between mt-2">
                <p class="text-xs text-gray-400">
                  {{ merchantReplyText.length }}/1000 karakter
                </p>
              </div>

              <button
                @click="submitMerchantReply"
                :disabled="submittingReply || !merchantReplyText.trim()"
                class="w-full mt-4 py-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <i class="pi pi-send" v-if="!submittingReply"></i>
                <i class="pi pi-spin pi-spinner" v-else></i>
                {{ submittingReply ? 'Mengirim...' : 'Kirim Tanggapan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Evidence View Modal -->
    <transition name="fade">
      <div
        v-if="showJasaEvidenceViewModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showJasaEvidenceViewModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
            <h3 class="font-bold text-gray-900">Bukti Penyelesaian</h3>
            <button @click="showJasaEvidenceViewModal = false" class="text-gray-400 hover:text-gray-600">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="selectedJasaOrder" class="p-5 space-y-4">
            <!-- Order Info -->
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  v-if="getJasaImageUrl(selectedJasaOrder)"
                  :src="getJasaImageUrl(selectedJasaOrder)"
                  class="w-full h-full object-cover"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <i v-else class="pi pi-briefcase w-full h-full flex items-center justify-center text-gray-400"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ selectedJasaOrder.items?.[0]?.name || 'Layanan' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ selectedJasaOrder.invoice || '#' + selectedJasaOrder.id }}
                </p>
              </div>
            </div>

            <!-- Order Status -->
            <div class="flex items-center gap-2">
              <span :class="['inline-block px-3 py-1.5 rounded-full text-xs font-medium', getJasaStatusClass(selectedJasaOrder.status)]">
                {{ getJasaStatusLabel(selectedJasaOrder.status, selectedJasaOrder) }}
              </span>
            </div>

            <!-- Completion Note -->
            <div v-if="selectedJasaOrder.completion_note" class="p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <p class="text-xs font-semibold text-purple-700 uppercase mb-2">Keterangan</p>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedJasaOrder.completion_note }}</p>
            </div>

            <!-- Evidence List -->
            <div v-if="getJasaCompletionEvidences(selectedJasaOrder).length > 0">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-3">
                Bukti ({{ getJasaCompletionEvidences(selectedJasaOrder).length }})
              </p>
              <div class="space-y-3">
                <div
                  v-for="(evidence, idx) in getJasaCompletionEvidences(selectedJasaOrder)"
                  :key="evidence.id || idx"
                  class="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden"
                >
                  <!-- Evidence Image/Video -->
                  <div class="aspect-video bg-gray-100">
                    <!-- Debug -->
                    {{ console.log('[Evidence render]', idx, evidence) || '' }}
                    <!-- Image -->
                    <img
                      v-if="isImageEvidence(evidence)"
                      :src="getEvidenceUrl(evidence)"
                      class="w-full h-full object-contain"
                      @error="(e) => { console.error('[Evidence image failed]', getEvidenceUrl(evidence), evidence); e.target.style.display = 'none'; const fb = e.target.nextElementSibling; if (fb) { fb.style.display = 'flex'; } }"
                    />
                    <!-- Fallback when image fails to load -->
                    <div
                      v-if="isImageEvidence(evidence)"
                      class="w-full h-full items-center justify-center text-gray-400 hidden"
                      style="display: none"
                    >
                      <div class="text-center">
                        <i class="pi pi-image text-3xl mb-1"></i>
                        <p class="text-xs">Bukti tidak dapat dimuat</p>
                      </div>
                    </div>
                    <!-- Video -->
                    <video
                      v-else-if="isVideoEvidence(evidence)"
                      :src="getEvidenceUrl(evidence)"
                      controls
                      class="w-full h-full object-contain"
                    />
                    <!-- Unknown format fallback -->
                    <div v-else class="w-full h-full flex items-center justify-center">
                      <div class="text-center">
                        <i class="pi pi-file text-3xl text-gray-400 mb-1"></i>
                        <p class="text-xs text-gray-400">Format tidak dikenali</p>
                      </div>
                    </div>
                  </div>

                  <!-- Evidence Info -->
                  <div class="p-3">
                    <p v-if="evidence.description || evidence.note" class="text-sm text-gray-700 mb-2">
                      {{ evidence.description || evidence.note }}
                    </p>
                    <p class="text-xs text-gray-400">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ formatDate(evidence.created_at) }}
                      <span class="mx-1">|</span>
                      <i class="pi pi-clock mr-1"></i>
                      {{ formatTime(evidence.created_at) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Evidence State -->
            <div v-else class="text-center py-8">
              <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
              <p class="text-sm text-gray-500">Tidak ada bukti penyelesaian</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
