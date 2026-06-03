<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import MerchantPageHeader from "@/components/merchant/MerchantPageHeader.vue";
import api from "@/libs/axios";

const emit = defineEmits(["toggle-sidebar"]);

// Toast notification
const toast = useToast();
const router = useRouter();
const route = useRoute();

// Merchant slug from layout
const merchantSlug = computed(() => route.params.merchantSlug);

// States
const orders = ref([]);
const loading = ref(false);
const activeFilter = ref('all');
const selectedOrder = ref(null);
const showDetailModal = ref(false);

// Modals
const showRejectModal = ref(false);
const showEvidenceModal = ref(false);
const rejectReason = ref('');
const completionNote = ref('');
const evidenceFiles = ref([]);
const submitting = ref(false);

// Filter options - 6 states matching backend
const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'menunggu_konfirmasi_merchant', label: 'Menunggu' },
  { key: 'diterima', label: 'Diterima' },
  { key: 'ditolak', label: 'Ditolak' },
  { key: 'layanan_dikerjakan', label: 'Dikerjakan' },
  { key: 'menunggu_konfirmasi_selesai', label: 'Tunggu Selesai' },
  { key: 'selesai', label: 'Selesai' },
];

// Status configurations for 6-state flow
const statusConfig = {
  menunggu_konfirmasi_merchant: {
    label: 'Menunggu Konfirmasi',
    color: 'bg-yellow-100 text-yellow-700',
    icon: 'pi-clock',
  },
  diterima: {
    label: 'Diterima',
    color: 'bg-blue-100 text-blue-700',
    icon: 'pi-check',
  },
  ditolak: {
    label: 'Ditolak',
    color: 'bg-red-100 text-red-700',
    icon: 'pi-times',
  },
  layanan_dikerjakan: {
    label: 'Layanan Dikerjakan',
    color: 'bg-amber-100 text-amber-700',
    icon: 'pi-spin pi-spinner',
  },
  menunggu_konfirmasi_selesai: {
    label: 'Menunggu Konfirmasi Selesai',
    color: 'bg-purple-100 text-purple-700',
    icon: 'pi-check-circle',
  },
  selesai: {
    label: 'Selesai',
    color: 'bg-green-100 text-green-700',
    icon: 'pi-check',
  },
};

// Valid next statuses by current status
const getNextStatusOptions = (currentStatus) => {
  const options = [];
  switch (currentStatus) {
    case 'menunggu_konfirmasi_merchant':
      options.push({ key: 'diterima', label: 'Terima', color: 'bg-blue-500 text-white' });
      options.push({ key: 'ditolak', label: 'Tolak', color: 'bg-red-500 text-white' });
      break;
    case 'diterima':
      options.push({ key: 'layanan_dikerjakan', label: 'Mulai Kerjakan', color: 'bg-amber-500 text-white' });
      break;
    case 'layanan_dikerjakan':
      options.push({ key: 'menunggu_konfirmasi_selesai', label: 'Kirim Bukti & Selesai', color: 'bg-purple-500 text-white' });
      break;
  }
  return options;
};

// Fetch orders
const fetchOrders = async (status = null) => {
  if (!merchantSlug.value) return;

  loading.value = true;
  try {
    const params = status && status !== 'all' ? { status } : {};
    const url = `/api/merchant/${merchantSlug.value}/service-orders`;
    const { data } = await api.get(url, { params });

    // Check if the request was successful (accept multiple response formats)
    console.log("Merchant service orders (raw):", data);
    const res = data; // axios response.data — Laravel ApiResponse: { message, data: [...] }
    console.log("res?.message:", res?.message, "| res?.data:", res?.data);

    // ApiResponse::success → { message: 'success', data: [...] }
    // If res.data is undefined and res.message is not 'success', the API call may have failed
    const hasSuccessFlag = res?.status === true || res?.status === 'success' || res?.success === true;
    const hasSuccessMessage = typeof res?.message === 'string' && res.message === 'success';
    const hasDataArray = Array.isArray(res?.data);
    const hasDataObject = res?.data && typeof res?.data === 'object' && !Array.isArray(res?.data);
    const isSuccess = hasSuccessFlag || hasSuccessMessage || hasDataArray || hasDataObject;

    console.log("isSuccess check:", { hasSuccessFlag, hasSuccessMessage, hasDataArray, hasDataObject }, "→", isSuccess);

    if (!isSuccess) {
      console.error("Merchant orders fetch failed — res:", JSON.stringify(res));
      toast.error(res?.message || 'Gagal memuat history pesanan');
      orders.value = [];
      return;
    }

    // Extract orders data
    // ApiResponse::success → { message, data: <array or {data:[...]}> }
    let rawData = res?.data;
    console.log("rawData:", rawData);
    orders.value =
      Array.isArray(rawData) ? rawData :
      (rawData && typeof rawData === 'object') ? (rawData.orders || rawData.data || []) :
      [];
    console.log("Extracted orders count:", orders.value.length, orders.value[0] ? '(first id: ' + orders.value[0].id + ')' : '');
  } catch (error) {
    console.error('Gagal memuat history:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Gagal memuat history pesanan';
    toast.error(errorMessage);
    orders.value = [];
  } finally {
    loading.value = false;
  }
};

// Format date and time in Indonesian
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
};

// Get booking display string
const getBookingDisplay = (order) => {
  const parts = [];
  if (order.booking_date) {
    parts.push(formatDateTime(order.booking_date).split(',')[0]);
  }
  if (order.booking_time) {
    parts.push(order.booking_time);
  }
  return parts.length > 0 ? parts.join(' ') : null;
};

// Check if order is in terminal state
const isTerminal = (order) => {
  return ['selesai', 'ditolak'].includes(order.status);
};

// Get payment status label and color
// Temporary until Xendit payment gateway integration is completed.
// COD/manual service orders are treated as paid for demonstration/testing purposes.
const getPaymentStatusLabel = (order) => {
  // For COD/manual payment methods, treat as paid (no Xendit integration yet)
  const isManualPayment =
    order?.payment_method === 'COD' ||
    order?.payment_method === 'MANUAL' ||
    order?.payment_method === 'cash' ||
    order?.payment_method === 'bayar_di_tempat' ||
    order?.payment_method === 'Bayar di Tempat' ||
    order?.payment_status === 'PAID';

  if (isManualPayment) {
    return 'Sudah Bayar';
  }

  const labels = {
    UNPAID: 'Belum Bayar',
    WAITING_CONFIRMATION: 'Menunggu Konfirmasi',
    PAID: 'Lunas',
  };
  return labels[order?.payment_status] || order?.payment_status || '—';
};

const getPaymentStatusColor = (order) => {
  // For COD/manual payment methods, show green (paid) - no Xendit integration yet
  const isManualPayment =
    order?.payment_method === 'COD' ||
    order?.payment_method === 'MANUAL' ||
    order?.payment_method === 'cash' ||
    order?.payment_method === 'bayar_di_tempat' ||
    order?.payment_method === 'Bayar di Tempat' ||
    order?.payment_status === 'PAID';

  if (isManualPayment) {
    return 'bg-green-100 text-green-700';
  }

  const colors = {
    UNPAID: 'bg-yellow-100 text-yellow-700',
    WAITING_CONFIRMATION: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
  };
  return colors[order?.payment_status] || 'bg-gray-100 text-gray-700';
};

// Open reject modal
const openRejectModal = (order) => {
  selectedOrder.value = order;
  rejectReason.value = '';
  showRejectModal.value = true;
};

// Submit rejection
const submitRejection = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Alasan penolakan wajib diisi');
    return;
  }
  submitting.value = true;
  try {
    console.log('Reject payload:', {
      id: selectedOrder.value?.id,
      status: 'ditolak',
      rejection_reason: rejectReason.value
    });

    const { data } = await api.patch(
      `/api/merchant/${merchantSlug.value}/service-orders/${selectedOrder.value.id}/status`,
      {
        status: 'ditolak',
        rejection_reason: rejectReason.value,
      }
    );

    console.log('Reject response:', data);

    // Check response with multiple formats including Indonesian message
    const isSuccess =
      data?.status === true ||
      data?.status === 'success' ||
      data?.success === true ||
      data?.message === 'success' ||
      data?.message === 'Status berhasil diperbarui';

    if (isSuccess) {
      toast.success('Pesanan berhasil ditolak');
      showRejectModal.value = false;
      rejectReason.value = '';
      fetchOrders(activeFilter.value);
    } else {
      console.error('Reject error response:', data);
      toast.error(data?.message || 'Gagal menolak pesanan');
    }
  } catch (error) {
    console.error('Gagal menolak pesanan:', error);
    console.error('Reject error response:', error.response?.data);
    toast.error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menolak pesanan'
    );
  } finally {
    submitting.value = false;
  }
};

// Open evidence modal
const openEvidenceModal = (order) => {
  selectedOrder.value = order;
  completionNote.value = '';
  evidenceFiles.value = [];
  showEvidenceModal.value = true;
};

// Handle file selection
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || []);
  const maxImageSize = 5 * 1024 * 1024; // 5MB for images
  const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos
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

// Remove file from selection
const removeFile = (index) => {
  evidenceFiles.value.splice(index, 1);
};

const mimeExtensionMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

// Normalize file name — add extension from MIME type if missing
const normalizeFile = (file) => {
  let name = file.name || 'evidence';
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 5 || !/\w/.test(ext)) {
    const addedExt = mimeExtensionMap[file.type] || '';
    if (addedExt && !name.endsWith(addedExt)) {
      name = name + addedExt;
    }
  }
  return new File([file], name, { type: file.type });
};

// Submit evidence and complete
const submitEvidence = async () => {
  if (!selectedOrder.value) {
    toast.error('Pesanan tidak ditemukan');
    return;
  }
  if (evidenceFiles.value.length === 0) {
    toast.error('Minimal 1 bukti pengerjaan wajib diunggah');
    return;
  }
  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('status', 'completed');
    formData.append('completion_note', completionNote.value || '');
    evidenceFiles.value.forEach((file) => {
      const normalized = normalizeFile(file);
      formData.append('evidences[]', normalized, normalized.name);
    });

    const { data } = await api.post(
      `/api/merchant/${merchantSlug.value}/service-orders/${selectedOrder.value.id}/status`,
      formData
    );

    const isSuccess =
      data?.status === true ||
      data?.status === 'success' ||
      data?.success === true ||
      data?.message === 'success' ||
      data?.message === 'Status berhasil diperbarui' ||
      (data?.message && data?.message.includes('berhasil'));

    if (isSuccess) {
      toast.success('Bukti pengerjaan berhasil dikirim.');
      showEvidenceModal.value = false;
      showDetailModal.value = false;
      completionNote.value = '';
      evidenceFiles.value = [];
      selectedOrder.value = null;
      await fetchOrders(activeFilter.value);
    } else {
      toast.error(data?.message || 'Gagal mengirim bukti pengerjaan');
    }
  } catch (error) {
    const validationErrors = error.response?.data?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const messages = Object.entries(validationErrors)
        .flatMap(([field, values]) =>
          (Array.isArray(values) ? values : [values]).map((value) => `${field}: ${value}`)
        );
      if (messages.length > 0) {
        toast.error(messages.join(' | '));
        return;
      }
    }
    toast.error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengirim bukti pengerjaan'
    );
  } finally {
    submitting.value = false;
  }
};

// Accept order
const acceptOrder = async (orderId) => {
  submitting.value = true;
  try {
    console.log('Accept order payload:', {
      id: orderId,
      status: 'diterima'
    });

    const { data } = await api.patch(
      `/api/merchant/${merchantSlug.value}/service-orders/${orderId}/status`,
      { status: 'diterima' }
    );

    console.log('Accept response:', data);

    // Check response with multiple formats including Indonesian message
    const isSuccess =
      data?.status === true ||
      data?.status === 'success' ||
      data?.success === true ||
      data?.message === 'success' ||
      data?.message === 'Status berhasil diperbarui';

    if (isSuccess) {
      toast.success('Pesanan berhasil diterima');
      showDetailModal.value = false;
      selectedOrder.value = null;
      console.log('Updated service order:', data);
      await fetchOrders(activeFilter.value);
    } else {
      console.error('Accept error response:', data);
      toast.error(data?.message || 'Gagal menerima pesanan');
    }
  } catch (error) {
    console.error('Gagal menerima pesanan:', error);
    console.error('Accept error response:', error.response?.data);
    toast.error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.errors?.status?.[0] ||
      'Gagal menerima pesanan'
    );
  } finally {
    submitting.value = false;
  }
};

// Start working on order
const startWorking = async (orderId) => {
  submitting.value = true;
  try {
    console.log('Start working payload:', {
      id: orderId,
      status: 'layanan_dikerjakan'
    });

    const { data } = await api.patch(
      `/api/merchant/${merchantSlug.value}/service-orders/${orderId}/status`,
      { status: 'layanan_dikerjakan' }
    );

    console.log('Start working response:', data);

    // Check response with multiple formats including Indonesian message
    const isSuccess =
      data?.status === true ||
      data?.status === 'success' ||
      data?.success === true ||
      data?.message === 'success' ||
      data?.message === 'Status berhasil diperbarui';

    if (isSuccess) {
      toast.success('Pesanan sedang dikerjakan');
      showDetailModal.value = false;
      selectedOrder.value = null;
      console.log('Updated service order:', data);
      await fetchOrders(activeFilter.value);
    } else {
      console.error('Start working error response:', data);
      toast.error(data?.message || 'Gagal memulai pekerjaan');
    }
  } catch (error) {
    console.error('Gagal memulai pekerjaan:', error);
    console.error('Start working error response:', error.response?.data);
    toast.error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.errors?.status?.[0] ||
      'Gagal memulai pekerjaan'
    );
  } finally {
    submitting.value = false;
  }
};

// Get order price from multiple possible sources
const getOrderPrice = (order) => {
  // Priority: order.total_price > order.total > order.grand_total > order.final_price > order.agreed_price > jasa/service prices
  const price = order.total_price ||
                order.total ||
                order.grand_total ||
                order.final_price ||
                order.agreed_price ||
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

// Get service type from multiple possible sources
const getServiceType = (order) => {
  return order.service_type ||
         order.booking_type ||
         order.order_type ||
         order.jasa?.booking_type ||
         order.jasa?.service_type ||
         order.jasa?.mechanism ||
         order.service?.booking_type ||
         order.service?.service_type ||
         order.service?.mechanism ||
         '';
};

// Get order address based on service_type
const getOrderAddress = (order) => {
  const serviceType = getServiceType(order);

  if (serviceType === 'online') return 'Online';

  if (serviceType === 'di_tempat_umkm' || serviceType === 'at_location') {
    return order?.service_location_address
      || order?.merchant?.address
      || order?.merchant_address
      || order?.customer_address
      || 'Alamat tidak tersedia';
  }

  if (serviceType === 'ke_rumah_pelanggan' || serviceType === 'on_site') {
    return order?.customer_address || '-';
  }

  // Fallback: try all address fields
  return order?.customer_address || order?.service_location_address || '-';
};

// Format service type for display
const formatServiceType = (type) => {
  if (!type) return 'Layanan Jasa';
  const normalized = type.toString().toLowerCase().trim();
  if (normalized === 'cart_no_schedule' || normalized === 'keranjang_tanpa_jadwal') {
    return 'Keranjang Tanpa Jadwal';
  }
  if (normalized === 'booking_schedule' || normalized === 'booking_dengan_jadwal') {
    return 'Booking Dengan Jadwal';
  }
  if (normalized === 'consultation' || normalized === 'konsultasi') {
    return 'Konsultasi';
  }
  if (normalized === 'direct_order' || normalized === 'langsung_pesan') {
    return 'Langsung Pesan';
  }
  // Return original if no match, capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
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

// Format date
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Format phone for WhatsApp
const formatPhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/^0/, "62");
};

const getImageUrl = (image) => {
  if (!image) return '/images/default-service.png';

  const imageValue = String(image).trim();

  if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
    return imageValue;
  }

  if (imageValue.startsWith('/storage/')) {
    return `http://localhost:8000${imageValue}`;
  }

  if (imageValue.startsWith('storage/')) {
    return `http://localhost:8000/${imageValue}`;
  }

  if (imageValue.startsWith('/api/images/')) {
    return `http://localhost:8000${imageValue}`;
  }

  if (imageValue.startsWith('api/images/')) {
    return `http://localhost:8000/${imageValue}`;
  }

  if (imageValue.startsWith('/')) {
    return `http://localhost:8000${imageValue}`;
  }

  return `http://localhost:8000/storage/${imageValue}`;
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

// Get review media - only one declaration
const getReviewMedia = (review) => {
  return review?.media
    || review?.medias
    || review?.review_media
    || review?.reviewMedia
    || review?.images
    || [];
};

// Get completion evidences - only one declaration
const getCompletionEvidences = (order) => {
  return order?.completion_evidences
    || order?.completionEvidences
    || order?.completion_evidence
    || order?.completionEvidence
    || [];
};

// Helper to construct full media URL from file_path or file_url
const getMediaUrl = (mediaOrPath) => {
  if (!mediaOrPath) return '';
  // If string path:
  if (typeof mediaOrPath === 'string') {
    const path = mediaOrPath;
    if (path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_BASE_URL}/storage/${path}`;
  }
  // If media object:
  const media = mediaOrPath;
  // file_url: try raw value first (may be relative /storage/... or full http://...)
  const rawFileUrl = media?.file_url;
  if (rawFileUrl && typeof rawFileUrl === 'string' && rawFileUrl.trim()) {
    if (rawFileUrl.startsWith('http')) return rawFileUrl;
    return `${import.meta.env.VITE_API_BASE_URL}${rawFileUrl}`;
  }
  // media_url accessor (always returns full URL or null)
  const mediaUrl = media?.media_url;
  if (mediaUrl && typeof mediaUrl === 'string') {
    if (mediaUrl.startsWith('http')) return mediaUrl;
    return `${import.meta.env.VITE_API_BASE_URL}${mediaUrl}`;
  }
  // Fallback from file_path
  const fp = media?.file_path || media?.path || '';
  if (!fp) return '';
  if (fp.startsWith('http')) return fp;
  return `${import.meta.env.VITE_API_BASE_URL}/storage/${fp}`;
};

// Status helpers for modal detail
const normalizeStatus = (status) => {
  return String(status || '').toLowerCase();
};

// Check if order can perform action based on status
const canPerformAction = (order, action) => {
  if (!order) return false;
  const status = normalizeStatus(order.status);

  switch (action) {
    case 'accept':
    case 'reject':
      return status === 'menunggu_konfirmasi_merchant';
    case 'start':
      return status === 'diterima';
    case 'evidence':
      return status === 'layanan_dikerjakan';
    default:
      return false;
  }
};

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  const classes = {
    menunggu_konfirmasi_merchant: 'bg-yellow-100 text-yellow-700',
    diterima: 'bg-blue-100 text-blue-700',
    layanan_dikerjakan: 'bg-amber-100 text-amber-700',
    menunggu_konfirmasi_selesai: 'bg-purple-100 text-purple-700',
    selesai: 'bg-green-100 text-green-700',
    ditolak: 'bg-red-100 text-red-700',
  };

  return classes[normalized] || 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);

  const labels = {
    menunggu_konfirmasi_merchant: 'Menunggu Konfirmasi',
    diterima: 'Diterima',
    layanan_dikerjakan: 'Layanan Dikerjakan',
    menunggu_konfirmasi_selesai: 'Menunggu Konfirmasi Selesai',
    selesai: 'Selesai',
    ditolak: 'Ditolak',
  };

  return labels[normalized] || status || '-';
};

// Get service image URL
const getServiceImage = (order) => {
  const source =
    order?.service_image ||
    order?.image ||
    order?.jasa?.image ||
    order?.jasa?.cover_img?.url ||
    order?.jasa?.cover_img?.src_url ||
    order?.jasa?.image_url ||
    order?.jasa?.images?.[0]?.image_url ||
    order?.jasa?.images?.[0]?.url ||
    order?.service?.image ||
    order?.service?.cover_img?.url ||
    order?.service?.cover_img?.src_url ||
    order?.service?.image_url ||
    order?.service?.images?.[0]?.image_url ||
    order?.service?.images?.[0]?.url ||
    '';

  return getImageUrl(source);
};

const openDetailModal = (order) => {
  selectedOrder.value = order;
  showDetailModal.value = true;
};

// Open WhatsApp
const openWhatsApp = (phone, order) => {
  if (!phone) {
    toast.error('Nomor WhatsApp tidak tersedia');
    return;
  }
  const url = buildWhatsAppLink(order);
  window.open(url, '_blank');
};

// Build WhatsApp Link
const buildWhatsAppLink = (order) => {
  const phone = order.customer_phone;
  if (!phone) return '#';
  const message = `Halo ${order.customer_name},

 Terima kasih telah memesan layanan "${order.service_name}" melalui SIMSLIFE.

 Pesanan Anda:
 - Harga: ${formatCurrency(getOrderPrice(order))}
 - Tanggal: ${order.booking_date ? formatDate(order.booking_date) : '-'}
 - Waktu: ${order.booking_time || '-'}
 - Catatan: ${order.booking_note || '-'}
 - No. Pesanan: ${order.formatted_order_number || order.order_number || '—'}

 Kami akan segera memproses pesanan Anda. Mohon tunggu konfirmasi selanjutnya.

 Salam,
 ${order.merchant_name}`;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formatPhone(phone)}?text=${encodedMessage}`;
};

// Change filter
const changeFilter = (filter) => {
  activeFilter.value = filter;
  fetchOrders(filter);
};

// Initialize
onMounted(() => {
  fetchOrders();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <MerchantPageHeader
      title="History Layanan Jasa"
      subtitle="Pesanan masuk dari pelanggan"
      :show-menu-button="true"
      :show-back-button="true"
      :back-to="`/merchant-center/${merchantSlug}/dashboard`"
      @toggle-sidebar="emit('toggle-sidebar')"
    />

    <!-- Main Content -->
    <main class="merchant-page-content">
      <!-- Filter Tabs -->
      <div class="tabs-container bg-white rounded-2xl p-2 mb-4">
        <button
          v-for="filter in filters"
          :key="filter.key"
          @click="changeFilter(filter.key)"
          class="tab-button px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap"
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
        v-else-if="orders.length === 0"
        class="bg-white rounded-2xl p-8 text-center"
      >
        <i class="pi pi-inbox text-5xl text-gray-300 mb-3"></i>
        <p class="text-gray-500">Belum ada pesanan masuk</p>
        <p class="text-sm text-gray-400 mt-1">
          Pesanan dari pelanggan akan muncul di sini
        </p>
      </div>

      <!-- Orders List -->
      <div v-else class="order-list space-y-4">
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card rounded-2xl border bg-white shadow-sm overflow-hidden"
        >
          <!-- Header -->
          <div class="p-4 border-b border-gray-100">
            <div class="flex items-start justify-between mb-3">
              <span class="text-xs font-mono font-medium text-gray-400">
                {{ order.formatted_order_number || order.order_number || `ORDER #${order.id}` }}
              </span>
              <span
                class="px-2.5 py-1 rounded-full text-xs font-medium"
                :class="order.status ? (statusConfig[order.status]?.color || 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'"
              >
                {{ order.status ? (statusConfig[order.status]?.label || order.status) : 'Unknown' }}
              </span>
            </div>

            <!-- Service & Customer Info -->
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  :src="getServiceImage(order)"
                  class="service-image"
                  @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/images/default-service.png'; } }"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 line-clamp-2">
                  {{ order.service_name }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ order.customer_name }}
                </p>
              </div>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="p-4 border-b border-gray-100">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-500">Total</p>
                  <p class="font-semibold text-orange-600">
                    {{ formatCurrency(getOrderPrice(order)) }}
                  </p>
                </div>
                <div v-if="order.customer_phone">
                  <p class="text-xs text-gray-500">Telepon</p>
                  <p class="text-sm text-gray-900">{{ order.customer_phone }}</p>
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-500">Pembayaran</p>
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getPaymentStatusColor(order)"
                  >
                    {{ getPaymentStatusLabel(order) }}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Tipe Layanan</p>
                  <p class="text-sm font-medium text-gray-900">
                    {{ formatServiceType(getServiceType(order)) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Action Buttons (for menunggu_konfirmasi_merchant) -->
          <div v-if="order.status === 'menunggu_konfirmasi_merchant'" class="p-4 border-b border-gray-100">
            <div class="flex gap-2">
              <button
                @click="acceptOrder(order.id)"
                :disabled="submitting"
                class="flex-1 py-3 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition"
              >
                <i class="pi pi-check mr-1"></i>
                Terima
              </button>
              <button
                @click="openRejectModal(order)"
                :disabled="submitting"
                class="flex-1 py-3 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
              >
                <i class="pi pi-times mr-1"></i>
                Tolak
              </button>
            </div>
          </div>

          <!-- Main Action Buttons (for other statuses) -->
          <div v-else-if="order.status === 'diterima' || order.status === 'layanan_dikerjakan' || order.status === 'menunggu_konfirmasi_selesai'" class="p-4 border-b border-gray-100">
            <!-- Evidence Upload Button for Dikerjakan status -->
            <button
              v-if="order.status === 'layanan_dikerjakan'"
              @click="openEvidenceModal(order)"
              :disabled="submitting"
              class="w-full py-3 rounded-xl text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition"
            >
              <i class="pi pi-upload mr-1"></i>
              Kirim Bukti Pengerjaan
            </button>

            <!-- Rejection Reason Badge -->
            <div v-if="order.status === 'ditolak' && order.rejection_reason" class="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p class="text-xs text-red-600">
                <i class="pi pi-info-circle mr-1"></i>
                {{ order.rejection_reason }}
              </p>
            </div>

            <!-- Start Working Button for Diterima status -->
            <button
              v-if="order.status === 'diterima'"
              @click="startWorking(order.id)"
              :disabled="submitting"
              class="w-full py-3 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition"
            >
              <i class="pi pi-play mr-1"></i>
              Mulai Kerjakan
            </button>

            <!-- Waiting Confirmation Message -->
            <div v-if="order.status === 'menunggu_konfirmasi_selesai'" class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 text-center">
              <i class="pi pi-clock mr-1"></i>
              Menunggu konfirmasi selesai dari pelanggan...
            </div>
          </div>

          <!-- Secondary Actions -->
          <div class="px-4 py-3 flex items-center justify-end gap-4">
            <button
              @click="openDetailModal(order)"
              class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
            >
              <i class="pi pi-eye"></i>
              Detail
            </button>
            <a
              v-if="order.customer_phone"
              :href="buildWhatsAppLink(order)"
              target="_blank"
              class="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition font-medium"
            >
              <i class="pi pi-whatsapp"></i>
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>

    <!-- Detail Modal -->
    <transition name="fade">
      <div
        v-if="showDetailModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div class="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden">

          <!-- Modal Header - Sticky -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Detail Pesanan</h2>
            <button
              type="button"
              class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              @click="showDetailModal = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Modal Body - Scrollable -->
          <div v-if="selectedOrder" class="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-4 space-y-5">
            <!-- Service Info -->
            <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div class="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden">
                <img
                  :src="getImageUrl(selectedOrder.service_image || selectedOrder.image || selectedOrder.jasa?.image || selectedOrder.jasa?.cover_img?.url || selectedOrder.jasa?.cover_img?.src_url)"
                  class="service-image"
                  @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/images/default-service.png'; } }"
                />
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ selectedOrder.service_name }}
                </p>
                <p class="text-sm text-merchant-primary font-bold">
                  {{ formatCurrency(getOrderPrice(selectedOrder)) }}
                </p>
              </div>
            </div>

            <!-- Customer Info -->
            <div class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Data Pelanggan
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Nama</span>
                  <span class="text-gray-800 font-medium"
                    >{{ selectedOrder.customer_name }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Telepon</span>
                  <span class="text-gray-800"
                    >{{ selectedOrder.customer_phone || "—" }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Alamat</span>
                  <span class="text-gray-800 text-right">{{ getOrderAddress(selectedOrder) }}</span>
                </div>
              </div>
            </div>

            <!-- Booking Info -->
            <div class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Jadwal
              </h4>
              <div class="space-y-2 text-sm">
                <div v-if="selectedOrder.booking_date || selectedOrder.booking_time">
                  <div class="flex justify-between">
                    <span class="text-gray-500">Tanggal</span>
                    <span class="text-gray-800"
                      >{{
                        selectedOrder.booking_date
                          ? formatDate(selectedOrder.booking_date)
                          : "-"
                      }}</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Waktu</span>
                    <span class="text-gray-800"
                      >{{ selectedOrder.booking_time || "-" }}</span
                    >
                  </div>
                </div>
                <div v-else class="text-center py-2 text-gray-400 italic text-sm">
                  <i class="pi pi-calendar mr-1"></i>
                  Tidak menggunakan jadwal
                </div>
                <div v-if="selectedOrder.booking_note" class="flex justify-between">
                  <span class="text-gray-500">Catatan</span>
                  <span class="text-gray-800 text-right">{{
                    selectedOrder.booking_note
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Order Number -->
            <div class="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <span class="text-xs text-gray-500">No. Pesanan</span>
              <span class="text-xs font-bold text-gray-700 font-mono">
                {{ selectedOrder.formatted_order_number || selectedOrder.order_number || '—' }}
              </span>
            </div>

            <!-- Status Badges -->
            <div class="flex gap-2 flex-wrap">
              <span class="inline-block px-3 py-1.5 rounded-full text-xs font-medium" :class="getStatusClass(selectedOrder.status)">
                {{ getStatusLabel(selectedOrder.status) }}
              </span>
              <span v-if="selectedOrder.payment_status" class="inline-block px-3 py-1.5 rounded-full text-xs font-medium" :class="getPaymentStatusColor(selectedOrder)">
                {{ getPaymentStatusLabel(selectedOrder) }}
              </span>
            </div>

            <!-- Rejection Reason -->
            <div v-if="selectedOrder.status === 'ditolak' && selectedOrder.rejection_reason" class="mb-4">
              <h4 class="text-xs font-semibold text-red-500 uppercase mb-2">
                Alasan Penolakan
              </h4>
              <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <i class="pi pi-info-circle mr-1"></i>
                {{ selectedOrder.rejection_reason }}
              </div>
            </div>

            <!-- Completion Note -->
            <div v-if="selectedOrder.completion_note" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Catatan Pengerjaan
              </h4>
              <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700">
                <i class="pi pi-file mr-1"></i>
                {{ selectedOrder.completion_note }}
              </div>
            </div>

            <!-- Completion Evidences from Merchant -->
            <div v-if="getCompletionEvidences(selectedOrder).length > 0" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Bukti Pengerjaan ({{ getCompletionEvidences(selectedOrder).length }})
              </h4>
              <div class="grid grid-cols-3 gap-2">
                <template
                  v-for="ev in getCompletionEvidences(selectedOrder)"
                  :key="ev.id"
                >
                  <img
                    v-if="ev.file_type === 'image'"
                    :src="getMediaUrl(ev)"
                    class="w-full aspect-square object-cover rounded-xl"
                    @error="(e) => (e.target.style.display = 'none')"
                  />
                  <video
                    v-else-if="ev.file_type === 'video'"
                    :src="getMediaUrl(ev)"
                    controls
                    class="w-full aspect-square object-cover rounded-xl"
                  />
                </template>
              </div>
            </div>

            <!-- Action Buttons by Status -->
            <div v-if="!isTerminal(selectedOrder)" class="mb-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Aksi
              </h4>
              <div class="space-y-2">
                <!-- Menunggu Konfirmasi -->
                <template v-if="canPerformAction(selectedOrder, 'accept')">
                  <button
                    @click="acceptOrder(selectedOrder.id)"
                    :disabled="submitting"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-check"></i>
                    Terima Pesanan
                  </button>
                  <button
                    @click="openRejectModal(selectedOrder)"
                    :disabled="submitting"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <i class="pi pi-times mr-1"></i>
                    Tolak Pesanan
                  </button>
                </template>

                <!-- Diterima -->
                <template v-else-if="canPerformAction(selectedOrder, 'start')">
                  <button
                    @click="startWorking(selectedOrder.id)"
                    :disabled="submitting"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-spin pi-spinner" v-if="submitting"></i>
                    <i class="pi pi-play" v-else></i>
                    Mulai Kerjakan
                  </button>
                </template>

                <!-- Dikerjakan -->
                <template v-else-if="canPerformAction(selectedOrder, 'evidence')">
                  <button
                    @click="openEvidenceModal(selectedOrder)"
                    :disabled="submitting"
                    class="w-full py-3 rounded-xl text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-upload"></i>
                    Kirim Bukti & Selesai
                  </button>
                </template>

                <!-- Menunggu Konfirmasi Selesai -->
                <template v-else-if="selectedOrder.status === 'menunggu_konfirmasi_selesai'">
                  <div class="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 text-center">
                    <i class="pi pi-clock mr-1"></i>
                    Menunggu pelanggan mengkonfirmasi penyelesaian...
                  </div>
                </template>
              </div>
            </div>

            <!-- Review Status -->
            <div
              v-if="selectedOrder.status === 'selesai'"
              class="mb-4"
            >
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">
                Review Pelanggan
              </h4>

              <!-- If reviewed -->
              <div v-if="selectedOrder.is_reviewed && selectedOrder.review" class="review-box">
                <span class="review-badge">Review Terkirim</span>

                <!-- Rating Stars -->
                <div class="flex gap-1 mt-1">
                  <i
                    v-for="star in 5"
                    :key="star"
                    class="pi text-sm"
                    :class="star <= Number(selectedOrder.review.rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                  ></i>
                </div>

                <!-- Review Title -->
                <p v-if="selectedOrder.review.title" class="review-title">
                  {{ selectedOrder.review.title }}
                </p>

                <!-- Review Comment -->
                <p v-if="getReviewComment(selectedOrder)" class="review-comment">
                  {{ getReviewComment(selectedOrder) }}
                </p>

                <!-- Review Media -->
                <div
                  v-if="getReviewMedia(selectedOrder.review).length > 0"
                  class="review-media"
                >
                  <template
                    v-for="media in getReviewMedia(selectedOrder.review)"
                    :key="media.id"
                  >
                    <img
                      v-if="media.file_type === 'image'"
                      :src="getMediaUrl(media)"
                      class="review-media-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <video
                      v-else-if="media.file_type === 'video'"
                      :src="getMediaUrl(media)"
                      controls
                      class="review-media-video"
                    />
                  </template>
                </div>
              </div>

              <!-- If not reviewed -->
              <div v-else class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
                <i class="pi pi-star mr-1"></i>
                Belum ada review dari pelanggan
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
                @click="submitRejection"
                :disabled="submitting"
                class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {{ submitting ? 'Mengirim...' : 'Tolak Pesanan' }}
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
              @click="$refs.fileInput.click()"
            >
              <i class="pi pi-upload text-2xl text-gray-400 mb-1"></i>
              <p class="text-xs text-gray-500">Klik untuk pilih file</p>
              <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, MP4, MOV, WebM</p>
              <input
                ref="fileInput"
                type="file"
                accept="image/*,video/*"
                multiple
                class="hidden"
                @change="handleFileSelect"
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
                <button @click="removeFile(index)" class="text-red-400 hover:text-red-600 ml-2">
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
              @click="submitEvidence"
              :disabled="submitting || evidenceFiles.length === 0"
              class="w-full py-3 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <i class="pi pi-spin pi-spinner" v-if="submitting"></i>
              <i class="pi pi-upload" v-else></i>
              {{ submitting ? 'Mengirim...' : 'Kirim Bukti & Selesai' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.merchant-page-content {
  width: 100%;
  max-width: 100%;
  padding: 0 24px 24px;
  box-sizing: border-box;
}

.tabs-container {
  width: 100%;
  display: flex;
  gap: 12px;
  padding: 0;
  margin: 0 0 24px 0;
  box-sizing: border-box;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-button {
  flex: 1 1 0;
  min-width: 120px;
  height: 52px;
  border-radius: 14px;
}

.order-list {
  width: 100%;
}

.order-card {
  width: 100%;
  box-sizing: border-box;
}

.service-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 640px) {
  .merchant-page-content {
    padding: 0 16px 16px;
  }

  .tab-button {
    min-width: 112px;
    height: 48px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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