<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import api from "@/libs/axios";

// Toast notification
const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();

// Debug: Log user info at component level
console.log('[CustomerServiceHistory] Component created, user:', authStore.user);
console.log('[CustomerServiceHistory] User ID:', authStore.user?.id);
console.log('[CustomerServiceHistory] Is authenticated:', authStore.isAuthenticated);

// States
const orders = ref([]);
const loading = ref(false);
const activeFilter = ref("all");

// Filter options
const filters = [
  { key: "all", label: "Semua" },
  { key: "menunggu_konfirmasi_merchant", label: "Menunggu" },
  { key: "diterima", label: "Diterima" },
  { key: "layanan_dikerjakan", label: "Dikerjakan" },
  { key: "menunggu_konfirmasi_selesai", label: "Menunggu Selesai" },
  { key: "selesai", label: "Selesai" },
  { key: "ditolak", label: "Ditolak" },
];

// Status configurations (new full lifecycle)
// Label di bawah adalah label UI yang ditampilkan ke customer
// Mapping: backend status → label tampilan
const statusConfig = {
  menunggu_konfirmasi_merchant: {
    label: "Pesanan Diajukan",  // customer pertama kalisubmit
    color: "bg-blue-100 text-blue-700",
    icon: "pi-clock",
  },
  diterima: {
    label: "Pesanan Diterima",   // merchant menerima
    color: "bg-indigo-100 text-indigo-700",
    icon: "pi-check",
  },
  ditolak: {
    label: "Pesanan Ditolak",    // merchant menolak
    color: "bg-red-100 text-red-700",
    icon: "pi-times",
  },
  layanan_dikerjakan: {
    label: "Layanan Dikerjakan", // merchant mulai bekerja
    color: "bg-amber-100 text-amber-700",
    icon: "pi-spin pi-spinner",
  },
  menunggu_konfirmasi_selesai: {
    label: "Menunggu Konfirmasi", // bukti dikirim, tunggu customer konfirmasi
    color: "bg-purple-100 text-purple-700",
    icon: "pi-hourglass",
  },
  selesai: {
    label: "Selesai",            // customer mengkonfirmasi selesai
    color: "bg-green-100 text-green-700",
    icon: "pi-check-circle",
  },
};

// Fetch orders
const fetchOrders = async (status = null) => {
  loading.value = true;
  try {
    const params = status && status !== "all" ? { status } : {};
    const { data } = await api.get("/api/service-orders", { params });

    // Debug log raw API response
    console.log('[CustomerServiceHistory] Raw API response:', data);

    const responseData = data?.data;
    let apiOrders = [];
    if (Array.isArray(responseData)) {
      apiOrders = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
      apiOrders = responseData.data;
    }

    console.log('[CustomerServiceHistory] API orders extracted:', apiOrders.length);
    apiOrders.forEach(order => {
      console.log(`[CustomerServiceHistory] Order #${order.id} — status: "${order.status}" | mekanisme: ${order.mekanisme_pemesanan || order.order_type || '-'}`);
    });

    // API data takes priority over localStorage (backend status is source of truth)
    // Merge: API orders first, then local bookings for orders not yet in API
    const localBookings = getLocalBookings();
    const apiIds = new Set(apiOrders.map(o => String(o.id)));
    const newLocalBookings = localBookings.filter(o => !apiIds.has(String(o.id)));

    // Merge: API data first (source of truth), then local-only bookings
    const merged = [...apiOrders, ...newLocalBookings];

    // Deduplicate by id — keep first occurrence (API already takes priority)
    const seen = new Set();
    orders.value = merged.filter((o) => {
      const key = String(o.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log('[CustomerServiceHistory] Final merged orders:', orders.value.length, orders.value);
  } catch (error) {
    console.error('[CustomerServiceHistory] Gagal memuat history:', error);
    // Fallback ke localStorage saja jika API gagal
    orders.value = getLocalBookings();
  } finally {
    loading.value = false;
  }
};

// ===== localStorage helpers =====
const LOCAL_BOOKINGS_KEY = "customer_service_bookings";

function getLocalBookings() {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Get order price from multiple possible sources
const getOrderPrice = (order) => {
  // Priority: order.total_price > order.jasa?.price > order.jasa?.base_price > order.jasa?.fixed_price
  const price = order.total_price ||
                order.jasa?.price ||
                order.jasa?.base_price ||
                order.jasa?.fixed_price ||
                order.service?.price ||
                order.service?.starting_price ||
                order.service?.harga ||
                order.service?.harga_mulai ||
                0;
  return Number(price) || 0;
};

// Format currency
const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

// Format date and time (Indonesian format)
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Format full datetime with time and WIB
const formatDateTime = (date, time = null) => {
  if (!date) return null;
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (time) {
    // Format time to HH:MM WIB
    const timeStr = time.length > 5 ? time.substring(0, 5) : time;
    return `${dateStr}, ${timeStr} WIB`;
  }
  return dateStr;
};

// Get booking display text
const getBookingDisplay = (order) => {
  if (!order.booking_date && !order.booking_time) return null;
  return formatDateTime(order.booking_date, order.booking_time);
};

// Get order address/location based on service_type
const getOrderAddress = (order) => {
  const serviceType = order.service_type ||
    order.booking_service_type ||
    order.jasa?.service_type ||
    '';

  if (serviceType === 'online') {
    return 'Online';
  }

  if (serviceType === 'di_tempat_umkm' || serviceType === 'at_location') {
    // Prioritas: merchant_address dari localStorage/booking langsung
    // lalu alamat merchant dari relasi API
    const merchantAddr =
      order?.merchant_address ||
      order?.merchantAddress ||
      order?.merchant?.primary_address?.detail ||
      order?.merchant?.primaryAddress?.detail ||
      order?.merchant?.location_address ||
      order?.merchant?.locationAddress ||
      order?.merchant?.address ||
      order?.merchant?.alamat ||
      order?.merchant?.profile_address ||
      order?.merchant?.profileAddress ||
      order?.location_address ||
      order?.jasa?.merchant?.address ||
      order?.jasa?.merchant?.alamat ||
      order?.jasa?.location_address ||
      order?.service_location_address ||
      '';
    return merchantAddr || 'Lokasi UMKM tidak tersedia';
  }

  if (serviceType === 'ke_rumah_pelanggan' || serviceType === 'on_site') {
    return order?.customer_address || order?.alamat || '-';
  }

  return order?.customer_address || order?.service_location_address || order?.location_address || '-';
};

// Get address label based on service_type
const getAddressLabel = (order) => {
  const serviceType = order.service_type ||
    order.booking_service_type ||
    order.jasa?.service_type ||
    '';
  if (serviceType === 'online') return 'Lokasi';
  if (serviceType === 'di_tempat_umkm' || serviceType === 'at_location') return 'Lokasi UMKM';
  if (serviceType === 'ke_rumah_pelanggan' || serviceType === 'on_site') return 'Alamat';
  return 'Lokasi';
};

// Go to review page
const goToReview = (order) => {
  // Navigate to universal review page: /review/:reviewableType/:orderId/:reviewableId
  // For service orders, reviewableType = 'service'
  router.push({
    name: "Universal Review",
    params: {
      reviewableType: "service",
      orderId: order.id,
      reviewableId: order.jasa_id,
    },
  });
};

// Check if order can be reviewed
const canReview = (order) => {
  // Can review if: status is 'selesai', not yet reviewed
  return order.status === "selesai" && !order.is_reviewed;
};

// Check if order needs customer confirmation (evidence uploaded by merchant)
const needsConfirmation = (order) => {
  return order.status === "menunggu_konfirmasi_selesai" && !order.customer_confirmed;
};

// Normalize status for comparison
const normalizeStatus = (status) => {
  return String(status || '').toLowerCase();
};

// Check if order can be confirmed
const canConfirmOrder = (order) => {
  return normalizeStatus(order?.status) === 'menunggu_konfirmasi_selesai'
    && getCompletionEvidences(order).length > 0;
};

// Confirm order completed (customer action)
const confirmCompleted = async (order) => {
  // Guard: Only allow confirmation if status is correct
  if (!canConfirmOrder(order)) {
    toast.info(`Pesanan tidak dapat dikonfirmasi. Status saat ini: ${formatStatus(order.status)}`);
    return;
  }

  try {
    console.log('[Confirm] Memulai konfirmasi pesanan:', {
      id: order.id,
      status: order.status,
    });

    const { data } = await api.post(`/api/service-orders/${order.id}/confirm`);

    console.log('[Confirm] Response received:', data);

    // ApiResponse::success returns { message, data } — NOT { success, data }
    // Backend line 211: ApiResponse::success($order->fresh(...), 'Pesanan berhasil dikonfirmasi selesai...')
    // data = { message: "...", data: { order_with_evidences } }
    // axios receives it as: axios response.data = { message: "...", data: { ... } }
    // FE receives: data = axios response.data = { message: "...", data: { ... } }
    const responseMessage = data?.message || 'Pesanan berhasil dikonfirmasi selesai! Terima kasih!';

    toast.success(responseMessage);

    // Refresh daftar pesanan untuk memperbarui status
    await fetchOrders(activeFilter.value);
  } catch (error) {
    console.error('[Confirm] Error:', error.response?.data || error);
    toast.error(
      error.response?.data?.message ||
      (error.response?.data?.errors ? error.response.data.errors[0] : null) ||
      'Gagal mengkonfirmasi pesanan'
    );
  }
};

// Get payment status label
const getPaymentStatusLabel = (order) => {
  const method = order.payment_method || '';
  if (method && method !== 'undefined' && method !== 'null') {
    if (order.payment_status === 'PAID') return 'Sudah Bayar';
    if (order.payment_status === 'WAITING_CONFIRMATION') return 'Menunggu Konfirmasi';
  }
  return 'Bayar di Tempat';
};

// Get payment method display (backend enum → UI label, no undefined)
const getPaymentMethodDisplay = (order) => {
  const method = order.payment_method || order.paymentMethod || '';
  const displayMap = {
    cash: 'Bayar di Tempat',
    cod: 'COD',
    qris: 'QRIS',
    manual_transfer: 'Transfer Manual',
    'Bayar di Tempat': 'Bayar di Tempat',
    'COD': 'COD',
    'QRIS': 'QRIS',
  };
  if (!method || method === 'undefined' || method === 'null') return 'Bayar di Tempat';
  return displayMap[method] || method;
};

// Get payment status color
const getPaymentStatusColor = (order) => {
  return order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
         order.payment_status === 'WAITING_CONFIRMATION' ? 'bg-yellow-100 text-yellow-700' :
         'bg-gray-100 text-gray-600';
};

// Has review
const hasReview = (order) => {
  return order.is_reviewed && order.review;
};

// Get review rating value
const getReviewRating = (order) => {
  return order.review?.rating || 0;
};

// Get review title
const getReviewTitle = (order) => {
  return order.review?.title || '';
};

// Get review comment (handle different possible field names)
const getReviewComment = (order) => {
  return (
    order.review?.comment ||
    order.review?.review ||
    order.review?.ulasan ||
    ''
  );
};

// Get review media - try all possible field names
const getReviewMedia = (order) => {
  // Debug log
  console.log('[CustomerServiceHistory] Review media check:', {
    review_id: order?.review_id,
    review: order?.review,
    rating: order?.rating,
    is_reviewed: order?.is_reviewed,
  });

  return (
    order?.review?.media ||
    order?.review?.reviewMedia ||
    order?.review?.review_media ||
    order?.review?.attachments ||
    order?.rating?.media ||
    order?.rating?.reviewMedia ||
    order?.rating?.review_media ||
    []
  );
};

// Get completion evidences - try all possible field names
const getCompletionEvidences = (order) => {
  // Try paginated response structure first
  if (order?.data) {
    const ev = order.data?.completion_evidences
      || order.data?.completionEvidences
      || order.data?.evidences
      || [];
    return ev;
  }
  // Direct order structure
  return order?.completion_evidences
    || order?.completionEvidences
    || order?.completion_evidence
    || order?.completionEvidence
    || order?.evidences
    || [];
};

// Helper to get media URL from media object
const getMediaUrlFromMedia = (media) => {
  if (!media) return '';

  // Try file_url first (full URL from backend or accessor)
  const fileUrl = media?.file_url || media?.url || '';
  if (fileUrl) {
    // If it's already a full URL, return as-is
    if (fileUrl.startsWith('http')) return fileUrl;
    // If it's a relative path starting with /storage, construct full URL
    if (fileUrl.startsWith('/')) {
      return `${import.meta.env.VITE_API_BASE_URL}${fileUrl}`;
    }
    return fileUrl;
  }

  // Fallback to constructing from file_path
  const filePath = media?.file_path || media?.path || '';
  if (!filePath) return '';

  // Construct full URL
  if (filePath.startsWith('http')) return filePath;
  return `${import.meta.env.VITE_API_BASE_URL}/storage/${filePath}`;
};

// Helper to check if media is image
const isEvidenceImage = (media) => {
  if (!media) return false;
  return media?.file_type === 'image'
    || (media?.mime_type && media.mime_type.startsWith('image/'));
};

// Helper to check if media is video
const isEvidenceVideo = (media) => {
  if (!media) return false;
  return media?.file_type === 'video'
    || (media?.mime_type && media.mime_type.startsWith('video/'));
};

// Get service image URL (for order service image)
const getServiceImage = (order) => {
  if (order?.service_image) return order.service_image;
  if (order?.jasa?.cover_img?.url) return order.jasa.cover_img.url;
  if (order?.jasa?.cover_img?.src_url) return order.jasa.cover_img.src_url;
  if (order?.jasa?.image_url) return order.jasa.image_url;
  if (order?.jasa?.image) return order.jasa.image;
  if (order?.jasa?.cover_img) return order.jasa.cover_img;
  if (order?.jasa?.images?.[0]?.image_url) return order.jasa.images[0].image_url;
  if (order?.jasa?.images?.[0]?.url) return order.jasa.images[0].url;
  return '/placeholder.png';
};

// Get service type label
const getServiceTypeLabel = (order) => {
  const type = order.service_type || order.booking_service_type || order.jasa?.service_type || '';
  const labels = {
    online: 'Online',
    di_tempat_umkm: 'Di Tempat UMKM',
    at_location: 'Di Tempat UMKM',
    ke_rumah_pelanggan: 'Ke Rumah Pelanggan',
    on_site: 'Ke Rumah Pelanggan',
  };
  return labels[type] || type || '-';
};

// Get booking type label
// Get booking/mechanism label from multiple possible field names
const getMekanismeLabel = (order) => {
  const mechanism =
    order?.mekanisme_pemesanan ||
    order?.mechanism ||
    order?.order_type ||
    order?.booking_type ||
    order?.jasa?.mekanisme_pemesanan ||
    '';

  const normalized = String(mechanism).toLowerCase().trim();

  // Checkout tanpa jadwal keywords
  const noScheduleKeywords = ['keranjang', 'checkout', 'tanpa_jadwal', 'cart', 'walk_in', 'walkin'];
  const isNoSchedule = noScheduleKeywords.some((kw) => normalized.includes(kw));

  if (isNoSchedule) {
    return 'Keranjang (Tanpa Jadwal)';
  }

  // Booking dengan jadwal: keyword match ATAU ada booking_date/booking_time
  const scheduleKeywords = ['booking', 'jadwal', 'scheduled', 'schedule'];
  const hasScheduleKeyword = scheduleKeywords.some((kw) => normalized.includes(kw));
  const hasBookingDateTime = order?.booking_date || order?.booking_time;

  if (hasScheduleKeyword || hasBookingDateTime) {
    return 'Booking (Pilih Tanggal & Jam)';
  }

  // Fallback: jika ada booking_date/booking_time → booking, jika tidak → keranjang
  if (hasBookingDateTime) {
    return 'Booking (Pilih Tanggal & Jam)';
  }

  return 'Keranjang (Tanpa Jadwal)';
};

// Get status label — always based on order.status from backend
// Status badge di halaman customer history harus mencerminkan status ASLI dari backend,
// bukan berdasarkan mekanisme_pemesanan atau booking_type
const getStatusLabel = (order) => {
  const status = order?.status;
  const normalized = normalizeStatusForDisplay(status);
  const labels = {
    menunggu_konfirmasi_merchant: 'Pesanan Diajukan',
    diterima: 'Pesanan Diterima',
    ditolak: 'Pesanan Ditolak',
    layanan_dikerjakan: 'Layanan Dikerjakan',
    menunggu_konfirmasi_selesai: 'Menunggu Konfirmasi',
    selesai: 'Selesai',
  };
  return labels[normalized] || status || '-';
};

// Normalize status for display
const normalizeStatusForDisplay = (status) => {
  return String(status || '').toLowerCase().replace(/-/g, '_');
};

// Format status for display
const formatStatus = (status) => {
  const normalized = normalizeStatusForDisplay(status);
  const labels = {
    menunggu_konfirmasi_merchant: 'Booking Diajukan',
    diterima: 'Diterima',
    layanan_dikerjakan: 'Layanan Dikerjakan',
    menunggu_konfirmasi_selesai: 'Menunggu Konfirmasi Selesai',
    selesai: 'Selesai',
    ditolak: 'Ditolak',
  };
  return labels[normalized] || status || '-';
};

// Go to merchant detail
const goToMerchant = (merchantSlug) => {
  router.push(`/merchant/${merchantSlug}`);
};

// Go to service detail
const goToService = (jasaId) => {
  router.push(`/jasa/${jasaId}`);
};

// Change filter
const changeFilter = (filter) => {
  activeFilter.value = filter;
  console.log('[CustomerServiceHistory] Filter changed to:', filter);
  // Reset orders and fetch fresh data
  orders.value = [];
  fetchOrders(filter);
};

// Computed filtered orders (for client-side filtering as backup)
const filteredOrders = computed(() => {
  if (!activeFilter.value || activeFilter.value === "all") {
    return orders.value;
  }
  return orders.value.filter(order => order.status === activeFilter.value);
});

// Initialize
onMounted(async () => {
  console.log('[CustomerServiceHistory] Page mounted, user:', authStore.user);
  console.log('[CustomerServiceHistory] User ID:', authStore.user?.id);
  console.log('[CustomerServiceHistory] Is authenticated:', authStore.isAuthenticated);

  // Wait for auth to be ready
  if (!authStore.authReady) {
    console.log('[CustomerServiceHistory] Waiting for auth to be ready...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('[CustomerServiceHistory] Auth ready, fetching orders...');
  fetchOrders();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header
      class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3"
    >
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-lg font-bold text-gray-900">History Layanan Jasa</h1>
            <p class="text-xs text-gray-500">Riwayat pemesanan Anda</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-4">
      <!-- Debug Info -->
      <div v-if="!loading" class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-800">
        <p><strong>Debug Info:</strong></p>
        <p>• Customer ID: <strong>{{ authStore.user?.id || 'NOT LOGGED IN' }}</strong></p>
        <p>• Total Orders: <strong>{{ orders.length }}</strong></p>
        <p>• Active Filter: <strong>{{ activeFilter }}</strong></p>
        <p>• Filtered Results: <strong>{{ filteredOrders.length }}</strong></p>
        <p v-if="orders.length > 0 && filteredOrders.length === 0">
          ⚠️ Filter active, showing 0 of {{ orders.length }} orders. Try clicking "Semua".
        </p>
      </div>

      <!-- Filter Tabs -->
      <div class="bg-white rounded-2xl p-2 mb-4 flex gap-2 overflow-x-auto">
        <button
          v-for="filter in filters"
          :key="filter.key"
          @click="changeFilter(filter.key)"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap"
          :class="
            activeFilter === filter.key
              ? 'bg-merchant-primary text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          "
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
        <p class="text-gray-500 mt-2">Memuat...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredOrders.length === 0"
        class="bg-white rounded-2xl p-8 text-center"
      >
        <i class="pi pi-inbox text-5xl text-gray-300 mb-3"></i>
        <p class="text-gray-500">Belum ada riwayat pemesanan</p>
        <p class="text-sm text-gray-400 mt-1">
          Pesan layanan jasa untuk melihatnya di sini
        </p>
      </div>

      <!-- Orders List -->
      <div v-else class="space-y-4">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <!-- Order Header -->
          <div class="p-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition"
                  @click="goToService(order.jasa_id)"
                >
                  <img
                    :src="getServiceImage(order)"
                    class="object-cover w-full h-full"
                    @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/placeholder.png'; } }"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-merchant-primary transition"
                    @click="goToService(order.jasa_id)"
                  >
                    {{ order.service_name }}
                  </p>
                  <p
                    class="text-xs text-gray-500 mt-0.5 cursor-pointer hover:text-merchant-primary transition"
                    @click="goToMerchant(order.merchant?.slug || order.merchant_id)"
                  >
                    {{ order.merchant_name }}
                  </p>
                  <!-- Order number & created date -->
                  <p class="text-[11px] text-gray-400 mt-1">
                    {{ order.formatted_order_number || 'SO-' + order.id }} • {{ formatDateTime(order.created_at) }}
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="statusConfig[order.status]?.color || 'bg-gray-100 text-gray-600'"
                >
                  {{ getStatusLabel(order) }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="getPaymentStatusColor(order)"
                >
                  {{ getPaymentStatusLabel(order) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Rejection Reason -->
          <div
            v-if="order.status === 'ditolak' && order.rejection_reason"
            class="px-4 py-3 bg-red-50 border-b border-red-100"
          >
            <div class="flex items-start gap-2">
              <i class="pi pi-info-circle text-red-500 mt-0.5"></i>
              <div>
                <p class="text-xs font-semibold text-red-700">Alasan Penolakan</p>
                <p class="text-sm text-red-600 mt-0.5">{{ order.rejection_reason }}</p>
              </div>
            </div>
          </div>

          <!-- Order Details -->
          <div class="p-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-gray-500">Tipe Layanan</span>
                <p class="font-medium text-gray-800 text-xs">{{ getServiceTypeLabel(order) }}</p>
              </div>
              <div>
                <span class="text-gray-500">Mekanisme</span>
                <p class="text-gray-800 text-xs">{{ getMekanismeLabel(order) }}</p>
              </div>
              <div>
                <span class="text-gray-500">Total</span>
                <p class="font-semibold text-merchant-primary">
                  {{ formatCurrency(getOrderPrice(order)) }}
                </p>
              </div>
              <div v-if="getBookingDisplay(order)">
                <span class="text-gray-500">Jadwal</span>
                <p class="text-gray-800 text-xs">{{ getBookingDisplay(order) }}</p>
              </div>
              <div>
                <span class="text-gray-500">{{ getAddressLabel(order) }}</span>
                <p class="text-gray-800 text-xs line-clamp-2">{{ getOrderAddress(order) }}</p>
              </div>
              <div v-if="order.customer_name">
                <span class="text-gray-500">Pemesan</span>
                <p class="text-gray-800 text-xs">{{ order.customer_name }}</p>
              </div>
              <div v-if="order.customer_phone">
                <span class="text-gray-500">Telepon</span>
                <p class="text-gray-800 text-xs">{{ order.customer_phone }}</p>
              </div>
              <div>
                <span class="text-gray-500">Metode Bayar</span>
                <p class="text-gray-800 text-xs">{{ getPaymentMethodDisplay(order) }}</p>
              </div>
              <div v-if="order.booking_note" class="col-span-2">
                <span class="text-gray-500">Catatan</span>
                <p class="text-gray-800 text-xs line-clamp-2">{{ order.booking_note }}</p>
              </div>
            </div>

            <!-- Completion Evidence (from merchant) -->
            <div
              v-if="order.status === 'menunggu_konfirmasi_selesai'"
              class="mt-4 pt-4 border-t border-gray-100"
            >
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <i class="pi pi-images text-purple-500"></i>
                  Bukti Pengerjaan Merchant
                </p>
                <span v-if="getCompletionEvidences(order).length > 0" class="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                  {{ getCompletionEvidences(order).length }} file
                </span>
              </div>

              <!-- Show evidences if available -->
              <div v-if="getCompletionEvidences(order).length > 0" class="space-y-2">
                <div class="grid grid-cols-3 gap-2">
                  <template
                    v-for="(evidence, idx) in getCompletionEvidences(order)"
                    :key="evidence.id || idx"
                  >
                    <div class="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square group">
                      <img
                        v-if="isEvidenceImage(evidence)"
                        :src="getMediaUrlFromMedia(evidence)"
                        class="w-full h-full object-cover"
                        @error="(e) => { console.error('Image load error:', evidence); e.target.style.display='none'; }"
                      />
                      <video
                        v-else-if="isEvidenceVideo(evidence)"
                        :src="getMediaUrlFromMedia(evidence)"
                        controls
                        class="w-full h-full object-cover"
                      />
                      <!-- Play icon overlay for videos -->
                      <div v-if="isEvidenceVideo(evidence)" class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <i class="pi pi-play text-sm text-gray-700 ml-0.5"></i>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Confirm Completed Button (customer) - only if evidences exist -->
                <div
                  v-if="canConfirmOrder(order)"
                  class="pt-3"
                >
                  <p class="text-xs text-gray-500 mb-2">
                    Merchant telah menyelesaikan pekerjaan. Silakan periksa bukti di atas, kemudian konfirmasi jika sudah sesuai.
                  </p>
                  <button
                    @click="confirmCompleted(order)"
                    class="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-check-circle"></i>
                    Konfirmasi Selesai
                  </button>
                </div>
              </div>

              <!-- Show message if no evidences -->
              <div v-else class="rounded-xl bg-gray-50 p-4 text-center border border-gray-100">
                <i class="pi pi-clock text-gray-400 mb-1 block"></i>
                <p class="text-xs text-gray-500">Bukti pengerjaan belum tersedia</p>
                <p class="text-[11px] text-gray-400 mt-0.5">Mohon tunggu...</p>
              </div>
            </div>

            <!-- Review Section -->
            <div
              v-if="order.status === 'selesai'"
              class="mt-4 pt-4 border-t border-gray-100"
            >
              <!-- Review Submitted -->
              <div
                v-if="hasReview(order)"
                class="review-box"
              >
                <span class="review-badge">Review Terkirim</span>

                <!-- Rating Stars -->
                <div class="rating-stars">
                  <span
                    v-for="star in 5"
                    :key="star"
                    class="star"
                    :class="{ active: star <= Number(getReviewRating(order)) }"
                  >
                    ★
                  </span>
                </div>

                <!-- Review Title -->
                <p
                  v-if="getReviewTitle(order)"
                  class="review-title"
                >
                  {{ getReviewTitle(order) }}
                </p>

                <!-- Review Comment -->
                <p
                  v-if="getReviewComment(order)"
                  class="review-comment"
                >
                  {{ getReviewComment(order) }}
                </p>

                <!-- Review Media -->
                <div
                  v-if="getReviewMedia(order).length > 0"
                  class="review-media"
                >
                  <template
                    v-for="media in getReviewMedia(order)"
                    :key="media.id"
                  >
                    <img
                      v-if="media.file_type === 'image'"
                      :src="getMediaUrlFromMedia(media)"
                      class="review-media-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <video
                      v-else-if="media.file_type === 'video'"
                      :src="getMediaUrlFromMedia(media)"
                      controls
                      class="review-media-video"
                    />
                  </template>
                </div>
              </div>

              <!-- Can Review Button -->
              <button
                v-else-if="canReview(order)"
                @click="goToReview(order)"
                class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition shadow-md"
              >
                <i class="pi pi-star mr-2"></i>
                Beri Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Review Box Styles */
.review-box {
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
}

.review-badge {
  display: inline-block;
  background: #22c55e;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.rating-stars {
  display: flex;
  gap: 4px;
  margin: 8px 0;
}

.star {
  font-size: 20px;
  color: #d1d5db;
}

.star.active {
  color: #facc15;
}

.review-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  margin-top: 4px;
}

.review-comment {
  color: #374151;
  font-size: 14px;
  margin-top: 8px;
  line-height: 1.5;
}

.review-media {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.review-media-img,
.review-media-video {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}
</style>

<style scoped>
/* Using Tailwind utility classes for transitions - no custom styles needed */
</style>
