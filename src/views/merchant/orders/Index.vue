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

const breadcrumbItems = computed(() => [{ label: "Pesanan Masuk" }]);

// ========================
// ORDER TYPE TAB (Produk vs Jasa)
// ========================
const activeOrderType = ref("produk"); // "produk" | "jasa"

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

  // Jika tab Jasa aktif, fetch dari endpoint service-orders
  if (activeOrderType.value === "jasa") {
    await fetchServiceOrders();
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
// SERVICE ORDERS DATA (JASA)
// ========================
const allServiceOrders = ref([]);
const serviceOrdersLoading = ref(false);
let serviceOrdersChannel = null;

// Modals for service orders
const showServiceDetailModal = ref(false);
const showRejectModal = ref(false);
const showEvidenceModal = ref(false);
const selectedServiceOrder = ref(null);
const rejectReason = ref('');
const completionNote = ref('');
const evidenceFiles = ref([]);
const submittingService = ref(false);

// Filter tabs for service orders
const serviceTabs = [
  { key: "all", label: "Semua" },
  { key: "menunggu", label: "Konfirmasi" },
  { key: "diterima", label: "Diterima" },
  { key: "dikerjakan", label: "Dikerjakan" },
  { key: "tunggu_selesai", label: "Tunggu Selesai" },
  { key: "selesai", label: "Selesai" },
  { key: "ditolak", label: "Ditolak" },
];

// Service order status mapping for display
// Maps raw backend status values to frontend display status
const serviceStatusMap = {
  // service_orders status values
  'pending': 'menunggu',
  'menunggu_konfirmasi_merchant': 'menunggu',
  'diterima': 'diterima',
  'ditolak': 'ditolak',
  'layanan_dikerjakan': 'dikerjakan',
  'dikerjakan': 'dikerjakan',
  'menunggu_konfirmasi_selesai': 'tunggu_selesai',
  'selesai': 'selesai',
  'completed': 'selesai',
  // orders table status values (mapped)
  'proses': 'diterima', // In process = accepted
  'batal': 'ditolak',
};

// Get display status for service orders
const getServiceDisplayStatus = (order) => {
  // Use service_status first (from service_orders table or mapped)
  // Then fall back to status (from orders table)
  const rawStatus = String(order.service_status || order.status || '').toLowerCase();
  const displayStatus = serviceStatusMap[rawStatus];
  if (displayStatus) return displayStatus;
  // If no mapping found, return as-is
  return rawStatus;
};

// Get order ID for API calls (use orders.id, fallback to service_order_id)
const getServiceOrderId = (order) => {
  return order.order_id || order.id;
};

// Check if order is pending (needs merchant action)
const isServicePendingOrder = (order) => {
  const status = getServiceDisplayStatus(order);
  return status === 'menunggu';
};

// Check if order is terminal
const isServiceTerminal = (order) => {
  const status = getServiceDisplayStatus(order);
  return ['selesai', 'ditolak'].includes(status);
};

// Can perform actions based on status
const canServiceAccept = (order) => isServicePendingOrder(order);
const canServiceReject = (order) => isServicePendingOrder(order);
const canServiceStart = (order) => {
  const status = getServiceDisplayStatus(order);
  return status === 'diterima';
};
const canServiceEvidence = (order) => {
  const status = getServiceDisplayStatus(order);
  return status === 'dikerjakan';
};

// Format service type for display
const formatServiceType = (type) => {
  if (!type) return 'Jasa';
  const normalized = type.toString().toLowerCase().trim();
  if (normalized === 'consultation' || normalized === 'konsultasi') return 'Konsultasi';
  if (normalized === 'booking' || normalized === 'booking_schedule') return 'Booking';
  if (normalized === 'direct_checkout' || normalized === 'keranjang') return 'Keranjang';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

// Get service image URL
const getServiceImageUrl = (order) => {
  const image = order.service_image || order.items?.[0]?.image;
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${image.replace(/^storage\//, '')}`;
};

// Get order price
const getServiceOrderPrice = (order) => {
  return order.total_price || order.amounts?.total || 0;
};

// Get booking display string
const getBookingDisplay = (order) => {
  const parts = [];
  if (order.booking_date) {
    parts.push(formatDate(order.booking_date));
  }
  if (order.booking_time) {
    parts.push(order.booking_time);
  }
  return parts.length > 0 ? parts.join(' ') : null;
};

// Get payment status label
const getServicePaymentLabel = (order) => {
  const isManualPayment =
    order?.payment_method === 'COD' ||
    order?.payment_method === 'MANUAL' ||
    order?.payment_status === 'PAID';

  if (isManualPayment) return 'Sudah Bayar';

  const labels = {
    'UNPAID': 'Belum Bayar',
    'WAITING_CONFIRMATION': 'Menunggu Konfirmasi',
    'PAID': 'Lunas',
  };
  return labels[order?.payment_status] || order?.payment_status || '—';
};

const getServicePaymentColor = (order) => {
  const isManualPayment =
    order?.payment_method === 'COD' ||
    order?.payment_method === 'MANUAL' ||
    order?.payment_status === 'PAID';

  if (isManualPayment) return 'bg-green-100 text-green-700';

  const colors = {
    'UNPAID': 'bg-yellow-100 text-yellow-700',
    'WAITING_CONFIRMATION': 'bg-yellow-100 text-yellow-700',
    'PAID': 'bg-green-100 text-green-700',
  };
  return colors[order?.payment_status] || 'bg-gray-100 text-gray-700';
};

// Map service order to unified format
function mapServiceOrder(o) {
  return {
    id: o.id,
    invoice: o.order_number || o.formatted_order_number || `ORD-${String(o.id).padStart(6, '0')}`,
    order_id: o.order_id,
    customer: {
      name: o.customer_name || o.customer?.name || o.user?.name || "Pelanggan",
      phone: o.customer_phone || o.customer?.phone || o.user?.phone || "-",
    },
    status: getServiceDisplayStatus(o),
    service_status: o.service_status || o.status,
    order_status: o.order_status,
    payment_method: o.payment_method || "COD",
    payment_status: o.payment_status,
    created_at: o.created_at,
    items: [{
      id: o.jasa_order_item_id,
      name: o.service_name || o.jasa?.title || "Layanan Jasa",
      variant: formatServiceType(o.order_type || o.service_type),
      addons: [],
      qty: 1,
      price: o.total_price,
      subtotal: o.total_price,
      image: getServiceImageUrl(o),
    }],
    amounts: {
      total: Number(o.total_price || 0),
    },
    booking_date: o.booking_date,
    booking_time: o.booking_time,
    booking_note: o.booking_note,
    order_type: o.order_type,
    service_type: o.service_type,
    completion_evidences: o.completion_evidences || [],
    review: o.review,
    rejection_reason: o.rejection_reason,
    completion_note: o.completion_note,
    _raw: o,
  };
}

async function fetchServiceOrders() {
  if (!currentMerchantSlug.value) {
    console.log('[fetchServiceOrders] No merchant slug, skipping...');
    return;
  }

  serviceOrdersLoading.value = true;
  try {
    const merchantSlug = currentMerchantSlug.value;
    // Use new endpoint: /api/merchant/{merchant}/orders
    const url = `/api/merchant/${merchantSlug}/orders`;

    console.log('[fetchServiceOrders] Merchant slug:', merchantSlug);
    console.log('[fetchServiceOrders] Full URL:', url);
    console.log('[fetchServiceOrders] Filter params:', {
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

    console.log('[fetchServiceOrders] Full response:', res);

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
      console.log('[fetchServiceOrders] Paginated response detected');
      console.log('[fetchServiceOrders] Total records:', responseData.total);
      console.log('[fetchServiceOrders] Current page:', responseData.current_page);
      ordersArray = Array.isArray(responseData.data) ? responseData.data : [];
    } else if (Array.isArray(responseData)) {
      // Direct array response
      console.log('[fetchServiceOrders] Direct array response');
      ordersArray = responseData;
    } else if (responseData && typeof responseData === 'object') {
      // Try to find array property
      console.log('[fetchServiceOrders] Object response, trying to find array property');
      const arrayProp = Object.values(responseData).find(v => Array.isArray(v));
      ordersArray = arrayProp || [];
    } else {
      console.log('[fetchServiceOrders] No data found');
    }

    console.log('[fetchServiceOrders] Extracted orders count:', ordersArray.length);

    // Log all orders with their status fields
    console.log('[fetchServiceOrders] All orders status data:');
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

    allServiceOrders.value = ordersArray.map(mapServiceOrder);

    console.log('[fetchServiceOrders] Mapped orders:', allServiceOrders.value.length);

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
    console.error('[fetchServiceOrders] Error:', e);
    console.error('[fetchServiceOrders] Error response:', e.response?.data);
    console.error('[fetchServiceOrders] Error status:', e.response?.status);
    toast.error(e.response?.data?.message || e.response?.data?.error || "Gagal memuat pesanan jasa");
    allServiceOrders.value = [];
  } finally {
    serviceOrdersLoading.value = false;
  }
}

// Filter service orders by status tab
const filteredServiceOrders = computed(() => {
  if (activeTab.value === 'all') {
    console.log('[filteredServiceOrders] Showing all orders:', allServiceOrders.value.length);
    return allServiceOrders.value;
  }

  // Debug: Log all orders with their statuses
  console.log('[filteredServiceOrders] All orders status:');
  allServiceOrders.value.forEach(order => {
    console.log({
      id: order.id,
      order_number: order.order_number,
      'order.status': order.status,
      'order.service_status': order.service_status,
      displayStatus: getServiceDisplayStatus(order)
    });
  });

  // Mapping from tab key to allowed display statuses
  const tabStatusMap = {
    'menunggu': ['menunggu'],
    'diterima': ['diterima'],
    'dikerjakan': ['dikerjakan'],
    'tunggu_selesai': ['tunggu_selesai'],
    'selesai': ['selesai'],
    'ditolak': ['ditolak'],
  };

  const allowedStatuses = tabStatusMap[activeTab.value] || [];
  console.log('[filteredServiceOrders] Selected filter:', activeTab.value, '| Allowed statuses:', allowedStatuses);

  const filtered = allServiceOrders.value.filter(order => {
    const displayStatus = getServiceDisplayStatus(order);
    const matches = allowedStatuses.includes(displayStatus);
    if (matches) {
      console.log('[filteredServiceOrders] MATCH - Order:', order.order_number, '| Status:', displayStatus);
    }
    return matches;
  });

  console.log('[filteredServiceOrders] Filtered count:', filtered.length);
  return filtered;
});

// Get status badge class for service orders
const getServiceStatusClass = (status) => {
  const classes = {
    'menunggu': 'bg-yellow-100 text-yellow-700',
    'diterima': 'bg-blue-100 text-blue-700',
    'dikerjakan': 'bg-amber-100 text-amber-700',
    'tunggu_selesai': 'bg-purple-100 text-purple-700',
    'selesai': 'bg-green-100 text-green-700',
    'ditolak': 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const getServiceStatusLabel = (status) => {
  const labels = {
    'menunggu': 'Menunggu Konfirmasi',
    'diterima': 'Diterima',
    'dikerjakan': 'Dikerjakan',
    'tunggu_selesai': 'Tunggu Selesai',
    'selesai': 'Selesai',
    'ditolak': 'Ditolak',
  };
  return labels[status] || status || '-';
};

// Service order actions
const acceptServiceOrder = async (orderId) => {
  submittingService.value = true;
  try {
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'diterima'
    });
    toast.success('Pesanan berhasil diterima');
    fetchServiceOrders();
  } catch (e) {
    console.error('[acceptServiceOrder] Error:', e);
    console.error('[acceptServiceOrder] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal menerima pesanan');
  } finally {
    submittingService.value = false;
  }
};

const openServiceRejectModal = (order) => {
  selectedServiceOrder.value = order;
  rejectReason.value = '';
  showRejectModal.value = true;
};

const submitServiceRejection = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Alasan penolakan wajib diisi');
    return;
  }
  submittingService.value = true;
  try {
    const orderId = getServiceOrderId(selectedServiceOrder.value);
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'ditolak',
      rejection_reason: rejectReason.value,
    });
    toast.success('Pesanan berhasil ditolak');
    showRejectModal.value = false;
    rejectReason.value = '';
    fetchServiceOrders();
  } catch (e) {
    console.error('[submitServiceRejection] Error:', e);
    console.error('[submitServiceRejection] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal menolak pesanan');
  } finally {
    submittingService.value = false;
  }
};

const startServiceWorking = async (orderId) => {
  submittingService.value = true;
  try {
    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    await api.patch(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, {
      status: 'layanan_dikerjakan'
    });
    toast.success('Pesanan sedang dikerjakan');
    fetchServiceOrders();
  } catch (e) {
    console.error('[startServiceWorking] Error:', e);
    console.error('[startServiceWorking] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal memulai pekerjaan');
  } finally {
    submittingService.value = false;
  }
};

const openServiceEvidenceModal = (order) => {
  selectedServiceOrder.value = order;
  completionNote.value = '';
  evidenceFiles.value = [];
  showEvidenceModal.value = true;
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

const submitServiceEvidence = async () => {
  if (evidenceFiles.value.length === 0) {
    toast.error('Minimal 1 bukti pengerjaan wajib diunggah');
    return;
  }
  submittingService.value = true;
  try {
    const orderId = getServiceOrderId(selectedServiceOrder.value);
    const formData = new FormData();
    formData.append('status', 'selesai');
    formData.append('completion_note', completionNote.value || '');
    evidenceFiles.value.forEach((file) => {
      formData.append('evidences[]', file);
    });

    // Use new endpoint: /api/merchant/{merchant}/orders/{id}/status
    await api.post(`/api/merchant/${currentMerchantSlug.value}/orders/${orderId}/status`, formData);
    toast.success('Bukti pengerjaan berhasil dikirim');
    showEvidenceModal.value = false;
    showServiceDetailModal.value = false;
    completionNote.value = '';
    evidenceFiles.value = [];
    selectedServiceOrder.value = null;
    fetchServiceOrders();
  } catch (e) {
    console.error('[submitServiceEvidence] Error:', e);
    console.error('[submitServiceEvidence] Response:', e.response?.data);
    toast.error(e.response?.data?.message || 'Gagal mengirim bukti pengerjaan');
  } finally {
    submittingService.value = false;
  }
};

const openServiceDetailModal = (order) => {
  selectedServiceOrder.value = order;
  showServiceDetailModal.value = true;
};

const getServiceMediaUrl = (mediaOrPath) => {
  if (!mediaOrPath) return '';
  if (typeof mediaOrPath === 'string') {
    if (mediaOrPath.startsWith('http')) return mediaOrPath;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${mediaOrPath}`;
  }
  const rawFileUrl = mediaOrPath?.file_url;
  if (rawFileUrl && typeof rawFileUrl === 'string') {
    if (rawFileUrl.startsWith('http')) return rawFileUrl;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${rawFileUrl}`;
  }
  return '';
};

const getCompletionEvidences = (order) => {
  return order?.completion_evidences || order?.completionEvidences || [];
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

const serviceTableColumns = [
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
    openServiceDetailModal(order);
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
          </div>
        </div>
      </div>

      <div class="flex gap-2 sm:gap-3 items-center">
      </div>
    </div>


    <div class="px-4 py-0 space-y-2 sm:px-6 sm:py-6">
      <!-- STICKY WRAPPER UNTUK TABS DAN SEARCH -->
      <div class=" z-10 top-[88px] sm:top-0 bg-gray-50 pt-0 pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 space-y-2">
        <!-- ORDER TYPE TABS (Produk / Jasa) -->
        <div class="bg-white shadow-sm rounded-xl">
          <div class="flex">
            <button
              @click="activeOrderType = 'produk'"
              :class="[
                'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition border-b-2',
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
                'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition border-b-2',
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

        <!-- STATUS TABS -->
        <div class="overflow-x-auto bg-white shadow-sm rounded-xl no-scrollbar">
          <div class="flex min-w-max sm:min-w-0">
            <button
              v-for="tab in (activeOrderType === 'jasa' ? serviceTabs : tabs)"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition whitespace-nowrap border-b-2',
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
                  <tr v-if="serviceOrdersLoading">
                    <td colspan="9" class="px-4 py-12 text-center">
                      <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                      <p class="mt-2 text-sm text-gray-500">Memuat...</p>
                    </td>
                  </tr>
                  <tr v-else-if="!filteredServiceOrders.length">
                    <td colspan="9" class="px-4 py-12 text-center">
                      <i class="pi pi-inbox text-3xl text-gray-300"></i>
                      <p class="mt-2 text-sm text-gray-500">Tidak ada pesanan jasa</p>
                    </td>
                  </tr>
                  <template v-else>
                    <tr
                      v-for="order in filteredServiceOrders"
                      :key="order.id"
                      class="hover:bg-gray-50 cursor-pointer transition"
                      @click="openServiceDetailModal(order)"
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
                        <div class="text-sm text-gray-800 max-w-xs">
                          <div class="truncate">{{ order.items[0].name }}</div>
                          <div v-if="order.items[0].variant" class="text-xs text-purple-500 font-medium">{{ order.items[0].variant }}</div>
                          <div v-if="order.booking_note" class="text-xs text-gray-400 truncate max-w-[200px]">Catatan: {{ order.booking_note }}</div>
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
                        <span :class="['inline-block px-2 py-0.5 rounded-full text-xs font-medium', getServicePaymentColor(order)]">
                          {{ getServicePaymentLabel(order) }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-sm text-gray-600">
                          {{ order.service_type === 'online' ? 'Online' : order.service_type === 'ke_rumah_pelanggan' ? 'Ke Rumah' : 'Di Tempat' }}
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <span :class="['inline-block px-2.5 py-1 rounded-full text-xs font-medium', getServiceStatusClass(order.status)]">
                          {{ getServiceStatusLabel(order.status) }}
                        </span>
                      </td>
                      <td class="px-4 py-3" @click.stop>
                        <div class="flex items-center justify-center gap-2">
                          <button
                            v-if="canServiceAccept(order)"
                            @click="acceptServiceOrder(getServiceOrderId(order))"
                            class="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition"
                            :disabled="submittingService"
                          >
                            <i class="pi pi-check mr-1"></i>Terima
                          </button>
                          <button
                            v-if="canServiceReject(order)"
                            @click="openServiceRejectModal(order)"
                            class="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition"
                            :disabled="submittingService"
                          >
                            <i class="pi pi-times mr-1"></i>Tolak
                          </button>
                          <button
                            v-if="canServiceStart(order)"
                            @click="startServiceWorking(getServiceOrderId(order))"
                            class="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition"
                            :disabled="submittingService"
                          >
                            <i class="pi pi-play mr-1"></i>Kerjakan
                          </button>
                          <button
                            v-if="canServiceEvidence(order)"
                            @click="openServiceEvidenceModal(order)"
                            class="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition"
                            :disabled="submittingService"
                          >
                            <i class="pi pi-upload mr-1"></i>Bukti
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div v-if="filteredServiceOrders.length > 0" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
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
          v-if="serviceOrdersLoading"
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
          v-else-if="!filteredServiceOrders.length"
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
          v-for="order in filteredServiceOrders"
          :key="order.id"
          class="p-4 bg-white border border-gray-100 shadow-sm cursor-pointer rounded-2xl active:bg-gray-50"
          @click="openServiceDetailModal(order)"
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
            <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', getServiceStatusClass(order.status)]">
              {{ getServiceStatusLabel(order.status) }}
            </span>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-user shrink-0"></i>
              <span class="text-sm text-gray-700">{{ order.customer.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="text-xs text-gray-400 pi pi-briefcase shrink-0"></i>
              <div class="flex-1 min-w-0">
                <span class="text-sm text-gray-600 truncate block">
                  {{ order.items[0].name }}
                </span>
                <span class="text-xs text-purple-500 font-medium truncate block">
                  {{ order.items[0].variant }}
                </span>
                <span v-if="order.booking_note" class="text-xs text-gray-400 truncate block">
                  {{ order.booking_note }}
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between pt-1">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-credit-card"></i>
                  <span class="text-xs text-gray-500">{{ getServicePaymentLabel(order) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="text-[10px] text-gray-400 pi pi-map-marker"></i>
                  <span class="text-xs text-gray-500">{{ order.service_type === 'online' ? 'Online' : order.service_type === 'ke_rumah_pelanggan' ? 'Ke Rumah' : 'Di Tempat' }}</span>
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
              v-if="canServiceAccept(order)"
              @click="acceptServiceOrder(getServiceOrderId(order))"
              class="flex-1 py-2 px-3 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1"
              :disabled="submittingService"
            >
              <i class="pi pi-check"></i>Terima
            </button>
            <button
              v-if="canServiceReject(order)"
              @click="openServiceRejectModal(order)"
              class="flex-1 py-2 px-3 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-1"
              :disabled="submittingService"
            >
              <i class="pi pi-times"></i>Tolak
            </button>
            <button
              v-if="canServiceStart(order)"
              @click="startServiceWorking(getServiceOrderId(order))"
              class="flex-1 py-2 px-3 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-1"
              :disabled="submittingService"
            >
              <i class="pi pi-play"></i>Kerjakan
            </button>
            <button
              v-if="canServiceEvidence(order)"
              @click="openServiceEvidenceModal(order)"
              class="flex-1 py-2 px-3 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-1"
              :disabled="submittingService"
            >
              <i class="pi pi-upload"></i>Bukti
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->

       <div
      v-if="!ordersLoading && !serviceOrdersLoading && (allOrders.length > 0 || filteredServiceOrders.length > 0)"
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
        v-if="showServiceDetailModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div class="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden">
          <!-- Modal Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Detail Pesanan Jasa</h2>
            <button
              type="button"
              class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              @click="showServiceDetailModal = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="selectedServiceOrder" class="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-4 space-y-5">
            <!-- Service Info -->
            <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div class="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden">
                <img
                  v-if="getServiceImageUrl(selectedServiceOrder)"
                  :src="getServiceImageUrl(selectedServiceOrder)"
                  class="w-full h-full object-cover"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <i v-else class="pi pi-briefcase w-full h-full flex items-center justify-center text-gray-400"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ selectedServiceOrder.items[0].name }}
                </p>
                <p class="text-sm text-merchant-primary font-bold">
                  Rp {{ formatIDR(getServiceOrderPrice(selectedServiceOrder)) }}
                </p>
              </div>
            </div>

            <!-- Customer Info -->
            <div class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Data Pelanggan</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Nama</span>
                  <span class="text-gray-800 font-medium">{{ selectedServiceOrder.customer.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Telepon</span>
                  <span class="text-gray-800">{{ selectedServiceOrder.customer.phone || "—" }}</span>
                </div>
              </div>
            </div>

            <!-- Booking Info -->
            <div v-if="selectedServiceOrder.booking_date || selectedServiceOrder.booking_time" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Jadwal</h4>
              <div class="space-y-2 text-sm">
                <div v-if="selectedServiceOrder.booking_date" class="flex justify-between">
                  <span class="text-gray-500">Tanggal</span>
                  <span class="text-gray-800">{{ formatDate(selectedServiceOrder.booking_date) }}</span>
                </div>
                <div v-if="selectedServiceOrder.booking_time" class="flex justify-between">
                  <span class="text-gray-500">Waktu</span>
                  <span class="text-gray-800">{{ selectedServiceOrder.booking_time }}</span>
                </div>
              </div>
            </div>

            <!-- Booking Note -->
            <div v-if="selectedServiceOrder.booking_note" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Catatan</h4>
              <div class="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                {{ selectedServiceOrder.booking_note }}
              </div>
            </div>

            <!-- Order Number -->
            <div class="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <span class="text-xs text-gray-500">No. Pesanan</span>
              <span class="text-xs font-bold text-gray-700 font-mono">
                {{ selectedServiceOrder.invoice }}
              </span>
            </div>

            <!-- Status Badges -->
            <div class="flex gap-2 flex-wrap">
              <span :class="['inline-block px-3 py-1.5 rounded-full text-xs font-medium', getServiceStatusClass(selectedServiceOrder.status)]">
                {{ getServiceStatusLabel(selectedServiceOrder.status) }}
              </span>
              <span :class="['inline-block px-3 py-1.5 rounded-full text-xs font-medium', getServicePaymentColor(selectedServiceOrder)]">
                {{ getServicePaymentLabel(selectedServiceOrder) }}
              </span>
            </div>

            <!-- Rejection Reason -->
            <div v-if="selectedServiceOrder.rejection_reason" class="mb-4">
              <h4 class="text-xs font-semibold text-red-500 uppercase mb-2">Alasan Penolakan</h4>
              <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <i class="pi pi-info-circle mr-1"></i>
                {{ selectedServiceOrder.rejection_reason }}
              </div>
            </div>

            <!-- Completion Note -->
            <div v-if="selectedServiceOrder.completion_note" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Catatan Pengerjaan</h4>
              <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700">
                <i class="pi pi-file mr-1"></i>
                {{ selectedServiceOrder.completion_note }}
              </div>
            </div>

            <!-- Completion Evidences -->
            <div v-if="getCompletionEvidences(selectedServiceOrder).length > 0" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Bukti Pengerjaan ({{ getCompletionEvidences(selectedServiceOrder).length }})
              </h4>
              <div class="grid grid-cols-3 gap-2">
                <template v-for="ev in getCompletionEvidences(selectedServiceOrder)" :key="ev.id">
                  <img
                    v-if="ev.file_type === 'image'"
                    :src="getServiceMediaUrl(ev)"
                    class="w-full aspect-square object-cover rounded-xl"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                  <video
                    v-else-if="ev.file_type === 'video'"
                    :src="getServiceMediaUrl(ev)"
                    controls
                    class="w-full aspect-square object-cover rounded-xl"
                  />
                </template>
              </div>
            </div>

            <!-- Action Buttons -->
            <div v-if="!isServiceTerminal(selectedServiceOrder)" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Aksi</h4>
              <div class="space-y-2">
                <!-- Menunggu Konfirmasi -->
                <template v-if="canServiceAccept(selectedServiceOrder)">
                  <button
                    @click="acceptServiceOrder(getServiceOrderId(selectedServiceOrder))"
                    :disabled="submittingService"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-check"></i>
                    Terima Pesanan
                  </button>
                  <button
                    @click="openServiceRejectModal(selectedServiceOrder)"
                    :disabled="submittingService"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <i class="pi pi-times mr-1"></i>
                    Tolak Pesanan
                  </button>
                </template>

                <!-- Diterima -->
                <template v-else-if="canServiceStart(selectedServiceOrder)">
                  <button
                    @click="startServiceWorking(getServiceOrderId(selectedServiceOrder))"
                    :disabled="submittingService"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-play"></i>
                    Mulai Kerjakan
                  </button>
                </template>

                <!-- Dikerjakan -->
                <template v-else-if="canServiceEvidence(selectedServiceOrder)">
                  <button
                    @click="openServiceEvidenceModal(selectedServiceOrder)"
                    :disabled="submittingService"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-upload"></i>
                    Kirim Bukti & Selesai
                  </button>
                </template>

                <!-- Menunggu Konfirmasi Selesai -->
                <template v-else-if="selectedServiceOrder.status === 'tunggu_selesai'">
                  <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 text-center">
                    <i class="pi pi-clock mr-1"></i>
                    Menunggu pelanggan mengkonfirmasi penyelesaian...
                  </div>
                </template>
              </div>
            </div>

            <!-- Review Section -->
            <div v-if="selectedServiceOrder.status === 'selesai' && selectedServiceOrder.review" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Review Pelanggan</h4>
              <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                <span class="inline-block bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">Review Terkirim</span>
                <div class="flex items-center gap-2 mt-2 mb-1">
                  <span class="text-sm font-medium text-gray-800">{{ getReviewerName(selectedServiceOrder) }}</span>
                  <span v-if="selectedServiceOrder.review.is_anonymous" class="text-xs text-gray-500">(Anonim)</span>
                </div>
                <div class="flex gap-1">
                  <i
                    v-for="star in 5"
                    :key="star"
                    class="pi text-sm"
                    :class="star <= Number(selectedServiceOrder.review.rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                  ></i>
                </div>
                <p v-if="getReviewComment(selectedServiceOrder)" class="text-sm text-gray-700 mt-2">
                  {{ getReviewComment(selectedServiceOrder) }}
                </p>
                <div v-if="getReviewMedia(selectedServiceOrder.review).length > 0" class="flex gap-2 mt-3 flex-wrap">
                  <template v-for="media in getReviewMedia(selectedServiceOrder.review)" :key="media.id">
                    <img
                      v-if="media.file_type === 'image'"
                      :src="getServiceMediaUrl(media)"
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
        v-if="showRejectModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">
          <div class="px-5 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Tolak Pesanan</h3>
              <button @click="showRejectModal = false" class="text-gray-400 hover:text-gray-600">
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
                @click="showRejectModal = false"
                class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                @click="submitServiceRejection"
                :disabled="submittingService"
                class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {{ submittingService ? 'Mengirim...' : 'Tolak Pesanan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Evidence Upload Modal -->
    <transition name="fade">
      <div
        v-if="showEvidenceModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Kirim Bukti Pengerjaan</h3>
              <button @click="showEvidenceModal = false" class="text-gray-400 hover:text-gray-600">
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
              @click="submitServiceEvidence"
              :disabled="submittingService || evidenceFiles.length === 0"
              class="w-full py-3 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <i class="pi pi-spin pi-spinner" v-if="submittingService"></i>
              <i class="pi pi-upload" v-else></i>
              {{ submittingService ? 'Mengirim...' : 'Kirim Bukti & Selesai' }}
            </button>
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
