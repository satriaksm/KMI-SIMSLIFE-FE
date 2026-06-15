diantara <script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const consultationId = computed(() => route.params.consultationId);

// States
const consultation = ref(null);
const messages = ref([]);
const newMessage = ref('');
const loading = ref(true);
const sending = ref(false);
const booking = ref(false);
const messageListRef = ref(null);
const fileInputRef = ref(null);
const selectedFiles = ref([]);

// Booking proposal form
const showBookingForm = ref(false);
const bookingForm = ref({
  proposed_date: '',
  proposed_time: '',
  proposed_notes: '',
});

// Track rejected offer state (for UI before refresh)
const offerRejected = ref(false);
const offerRejectedPrice = ref(null);

// Status config
const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  dapat_dikerjakan: { label: 'Dapat Dikerjakan', color: 'bg-blue-100 text-blue-700' },
  perlu_penyesuaian: { label: 'Perlu Penyesuaian', color: 'bg-purple-100 text-purple-700' },
  ditolak: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  accepted: { label: 'Disepakati', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Ditutup', color: 'bg-gray-100 text-gray-700' },
  penawaran_ditolak: { label: 'Penawaran Ditolak', color: 'bg-red-100 text-red-700' },
};

const getStatusLabel = (status) => statusConfig[status]?.label || status || '—';
const getStatusColor = (status) => statusConfig[status]?.color || 'bg-gray-100 text-gray-700';

// Computed
const service = computed(() => consultation.value?.jasa);
const merchant = computed(() => consultation.value?.merchant);
const initialMessage = computed(() =>
  consultation.value?.messages?.find(m => m.message_type === 'initial')
);

// Initial media: new flow (via initial message) or legacy (direct media on consultation)
const initialMedia = computed(() => {
  if (initialMessage.value?.media?.length) return initialMessage.value.media;
  return consultation.value?.media || [];
});

// Check if consultation is agreed (accepted status)
const isAgreed = computed(() => consultation.value?.status === 'accepted');

// Check if already has order (new FK: order_id, not service_order_id)
const hasOrder = computed(() => !!consultation.value?.order_id);

// Price helpers
const getConsultationInitialPrice = () => {
  return consultation.value?.initial_price
    || consultation.value?.original_price
    || consultation.value?.service?.price
    || consultation.value?.service?.base_price
    || consultation.value?.service?.fixed_price
    || consultation.value?.jasa?.price
    || consultation.value?.jasa?.base_price
    || consultation.value?.jasa?.fixed_price
    || null;
};

const getConsultationFinalPrice = () => {
  return consultation.value?.final_price
    || (consultation.value?.status === 'accepted' ? consultation.value?.negotiated_price : null)
    || consultation.value?.negotiated_price
    || consultation.value?.merchant_offered_price
    || null;
};

const canSendMessage = computed(() => {
  return ['pending', 'dapat_dikerjakan', 'perlu_penyesuaian'].includes(consultation.value?.status);
});

// Customer has an active (pending) offer from merchant — show top card
const hasActiveOffer = computed(() => {
  const c = consultation.value;
  if (!c) return false;
  const status = String(c.status || '').toLowerCase();
  // Terminal statuses — no action can be taken
  if (['accepted', 'diterima', 'disepakati', 'ditolak', 'dibatalkan', 'ditutup', 'closed', 'selesai', 'penawaran_ditolak'].includes(status)) {
    return false;
  }
  // Must have merchant response with workable status
  const response = c.merchant_response;
  if (!response || !['dapat_dikerjakan', 'perlu_penyesuaian', 'bisa_dikerjakan'].includes(response)) {
    return false;
  }
  // Must have offered price
  if (!c.merchant_offered_price) return false;
  // Must not already be accepted locally
  if (c.customer_accepted) return false;
  // Must not have an order yet (check new FK: order_id)
  if (c.order_id) return false;
  return true;
});

// Customer can accept offer — same as hasActiveOffer but for guards
const canAcceptOffer = computed(() => hasActiveOffer.value);

// Guard function for acceptOffer
const canAcceptOfferGuard = () => hasActiveOffer.value;

// Get response explanation
const getResponseExplanation = (response) => {
  if (response === 'bisa_dikerjakan') {
    return 'Merchant menyatakan layanan dapat dikerjakan sesuai permintaan.';
  }
  if (response === 'perlu_penyesuaian') {
    return 'Merchant menyatakan layanan dapat dikerjakan dengan beberapa penyesuaian pada harga, jadwal, atau ruang lingkup.';
  }
  if (response === 'tidak_bisa_dikerjakan') {
    return 'Merchant tidak dapat mengerjakan layanan ini.';
  }
  return '';
};

// Open booking proposal form
const openBookingForm = () => {
  showBookingForm.value = true;
  // Pre-fill with existing proposal if any
  if (consultation.value?.proposed_date) {
    bookingForm.value.proposed_date = consultation.value.proposed_date;
  }
  if (consultation.value?.proposed_time) {
    const time = new Date(consultation.value.proposed_time);
    bookingForm.value.proposed_time = time.toTimeString().slice(0, 5);
  }
  if (consultation.value?.proposed_notes) {
    bookingForm.value.proposed_notes = consultation.value.proposed_notes;
  }
};

// Accept merchant offer
const acceptOffer = async () => {
  if (sending.value) return;
  if (!canAcceptOfferGuard()) {
    toast.info('Penawaran sudah diproses atau tidak dapat diterima');
    await fetchConsultation();
    return;
  }

  sending.value = true;
  try {
    const { data } = await api.post(
      `/api/service-consultations/${consultationId.value}/accept-offer`,
      {
        proposed_date: bookingForm.value.proposed_date || null,
        proposed_time: bookingForm.value.proposed_time || null,
        proposed_notes: bookingForm.value.proposed_notes || null,
      }
    );
    // ApiResponse::success → { message, data }
    showBookingForm.value = false;
    toast.success(data?.message || 'Penawaran diterima!');
    await fetchConsultation();
    await nextTick();
    scrollToBottom();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal menerima penawaran');
  } finally {
    sending.value = false;
  }
};

// Book the service - navigate to checkout page with consultation data
const bookNow = () => {
  router.push(`/customer/consultations/${consultationId.value}/checkout`);
};

// Go to order history
const goToOrderHistory = () => {
  router.push('/pembayaran-jasa');
};

// Navigate to jasa history (for consultation-based orders)
const viewOrderDetail = () => {
  router.push('/jasa-history');
};

// Close consultation
const closeConsultation = async () => {
  if (sending.value) return;

  sending.value = true;
  try {
    const { data } = await api.post(
      `/api/service-consultations/${consultationId.value}/close`
    );
    toast.success(data?.message || 'Konsultasi ditutup');
    await fetchConsultation();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal menutup konsultasi');
  } finally {
    sending.value = false;
  }
};

// Reject merchant offer
const rejectOffer = async () => {
  if (sending.value) return;
  if (!canAcceptOfferGuard()) {
    toast.info('Penawaran sudah diproses');
    return;
  }

  sending.value = true;
  const rejectedPrice = consultation.value?.merchant_offered_price;
  try {
    // Call customerRespond endpoint with response='reject'
    const { data } = await api.post(
      `/api/service-consultations/${consultationId.value}/customer-respond`,
      {
        response: 'reject',
        customer_note: null,
      }
    );
    // Update local state immediately for UI feedback
    offerRejected.value = true;
    offerRejectedPrice.value = rejectedPrice;
    toast.success(data?.message || 'Penawaran berhasil ditolak.');
    await fetchConsultation();
  } catch (error) {
    // Reset local state on error
    offerRejected.value = false;
    toast.error(error.response?.data?.message || 'Gagal menolak penawaran');
  } finally {
    sending.value = false;
  }
};

const formatCurrency = (value) => {
  if (!value) return '-';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return null;
  try {
    const time = new Date(timeStr);
    return time.toTimeString().slice(0, 5) + ' WIB';
  } catch {
    return timeStr;
  }
};

const fetchConsultation = async () => {
  loading.value = true;
  try {
    const response = await api.get(`/api/service-consultations/${consultationId.value}`);
    consultation.value = response.data.data;
    messages.value = response.data.data?.messages || [];
    // Reset local rejected state — driven by backend status after refresh
    offerRejected.value = String(response.data.data?.status || '').toLowerCase() === 'penawaran_ditolak';
    offerRejectedPrice.value = offerRejected.value ? response.data.data?.merchant_offered_price || null : null;
    scrollToBottom();
  } catch (error) {
    console.error('[CustomerConsultationDetail] Fetch error:', error);
    toast.error(error.response?.data?.message || 'Gagal memuat data konsultasi');
    if (error.response?.status === 404) {
      router.back();
    }
  } finally {
    loading.value = false;
  }
};

// File handling
const triggerFileInput = () => fileInputRef.value?.click();

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || []);
  const maxFiles = 5;
  const maxSize = 50 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];

  for (const file of files) {
    if (selectedFiles.value.length >= maxFiles) {
      toast.warning(`Maksimal ${maxFiles} file`);
      break;
    }
    if (file.size > maxSize) {
      toast.warning(`${file.name}: maximal 50MB`);
      continue;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.warning(`${file.name}: format tidak didukung`);
      continue;
    }
    selectedFiles.value.push(file);
  }
  event.target.value = '';
};

const removeFile = (index) => selectedFiles.value.splice(index, 1);
const getFilePreview = (file) => URL.createObjectURL(file);
const openMedia = (url) => window.open(url, '_blank');

const sendMessage = async () => {
  const hasMessage = newMessage.value.trim().length > 0;
  const hasFiles = selectedFiles.value.length > 0;

  if (!hasMessage && !hasFiles) {
    toast.error('Pesan atau media wajib diisi');
    return;
  }

  if (sending.value) return;

  sending.value = true;
  try {
    const formData = new FormData();
    if (hasMessage) formData.append('message', newMessage.value.trim());
    selectedFiles.value.forEach((file) => formData.append('media[]', file));

    const response = await api.post(
      `/api/service-consultations/${consultationId.value}/messages`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.data.data) messages.value.push(response.data.data);
    newMessage.value = '';
    selectedFiles.value = [];
    scrollToBottom();
    toast.success('Pesan berhasil dikirim');
  } catch (error) {
    console.error('[CustomerConsultationDetail] Send error:', error);
    toast.error(error.response?.data?.message || 'Gagal mengirim pesan');
  } finally {
    sending.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

onMounted(async () => {
  await fetchConsultation();
});
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header - Sticky -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 lg:px-6 px-4 py-3 shrink-0">
      <div class="max-w-5xl mx-auto">
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0 lg:-ml-1"
          >
            <i class="pi pi-arrow-left text-sm"></i>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-gray-900 truncate">
              {{ service?.title || 'Konsultasi Layanan' }}
            </h1>
            <p class="text-xs text-gray-500 truncate">
              <i class="pi pi-store mr-1"></i>
              {{ merchant?.name || 'Merchant' }}
            </p>
          </div>
          <span
            v-if="consultation?.status"
            :class="['px-2 py-0.5 rounded-full text-xs font-medium shrink-0', getStatusColor(consultation.status)]"
          >
            {{ getStatusLabel(consultation.status) }}
          </span>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <template v-else-if="consultation">
      <!-- Service Info Banner -->
      <div class="bg-white border-b border-gray-100 lg:px-6 px-4 py-2 shrink-0">
        <div class="max-w-5xl mx-auto flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              :src="service?.cover_img?.url || service?.cover_img?.src_url || '/placeholder.png'"
              class="object-cover w-full h-full"
              @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/placeholder.png'; } }"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-800 truncate">{{ service?.title || 'Layanan' }}</p>
            <div class="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
              <span>Awal:</span>
              <span class="font-medium">{{ formatCurrency(getConsultationInitialPrice()) }}</span>
              <span v-if="consultation.merchant_offered_price" class="text-purple-600">
                → {{ formatCurrency(consultation.merchant_offered_price) }}
              </span>
              <span v-if="getConsultationFinalPrice()" class="text-green-600">
                → Kesepakatan: {{ formatCurrency(getConsultationFinalPrice()) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Offer Card (shown only when merchant has a pending offer) -->
      <div
        v-if="hasActiveOffer && consultation.merchant_offered_price"
        class="lg:px-6 px-4 py-3 bg-white border-b border-gray-100 shrink-0"
      >
        <div class="max-w-5xl mx-auto">
          <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <!-- Header -->
            <div class="flex items-start gap-3 mb-3">
              <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <i class="pi pi-tag text-white text-sm"></i>
              </div>
              <div class="flex-1">
                <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide">Pengajuan Harga dari Merchant</p>
                <p class="text-2xl font-bold text-blue-900 mt-0.5">{{ formatCurrency(consultation.merchant_offered_price) }}</p>
                <p v-if="consultation.merchant_note" class="text-sm text-blue-700 mt-1">
                  <i class="pi pi-comment mr-1"></i>{{ consultation.merchant_note }}
                </p>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex gap-2 mt-1">
              <button
                @click="openBookingForm"
                :disabled="sending"
                class="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <i v-if="sending" class="pi pi-spin pi-spinner"></i>
                <i class="pi pi-check mr-1"></i>
                {{ sending ? 'Memproses...' : 'Terima & Ajukan Jadwal' }}
              </button>
              <button
                @click="rejectOffer"
                :disabled="sending"
                class="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition"
              >
                <i class="pi pi-times mr-1"></i>
                Tolak
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rejected Offer Banner (shown locally before refresh) -->
      <div
        v-if="offerRejected && offerRejectedPrice"
        class="lg:px-6 px-4 py-3 bg-red-50 border-b border-red-100 shrink-0"
      >
        <div class="max-w-5xl mx-auto flex items-center gap-3">
          <div class="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center shrink-0">
            <i class="pi pi-times text-white text-sm"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-red-700">Penawaran Ditolak</p>
            <p class="text-xs text-red-500">Rp {{ Number(offerRejectedPrice).toLocaleString('id-ID') }}</p>
          </div>
        </div>
      </div>

      <!-- Booking Proposal Modal -->
      <div v-if="showBookingForm" class="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
        <div class="w-full md:max-w-lg max-h-[85vh] bg-white rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden">
          <!-- Header - Sticky -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Ajukan Jadwal (Opsional)</h3>
              <p class="text-xs text-gray-400 mt-0.5">Isi jadwal yang diinginkan</p>
            </div>
            <button
              @click="showBookingForm = false"
              class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition shrink-0"
            >
              <i class="pi pi-times text-gray-500 text-sm"></i>
            </button>
          </div>

          <!-- Body - Scrollable -->
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p class="text-xs text-gray-500">
              Anda dapat mengisi jadwal layanan yang diinginkan. Jika tidak diisi, merchant akan menghubungi untuk konfirmasi.
            </p>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Tanggal Layanan</label>
              <input
                v-model="bookingForm.proposed_date"
                type="date"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Jam Layanan</label>
              <input
                v-model="bookingForm.proposed_time"
                type="time"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Catatan Kebutuhan</label>
              <textarea
                v-model="bookingForm.proposed_notes"
                rows="3"
                placeholder="Contoh: Butuh layanan diantar ke alamat saya"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
              ></textarea>
            </div>
          </div>

          <!-- Footer - Sticky -->
          <div class="shrink-0 px-5 py-4 border-t border-gray-100 bg-white space-y-2">
            <button
              @click="acceptOffer"
              :disabled="sending"
              class="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <i :class="['pi', sending ? 'pi-spin pi-spinner' : 'pi-check']"></i>
              {{ sending ? 'Memproses...' : 'Terima dengan Jadwal' }}
            </button>
            <button
              @click="acceptOffer"
              :disabled="sending"
              class="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
            >
              <i class="pi pi-skip-forward mr-1"></i>
              Lewati Jadwal
            </button>
            <button
              @click="showBookingForm = false"
              class="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>

      <!-- Booking Card for Accepted Consultations -->
      <div v-if="isAgreed" class="lg:px-6 px-4 py-3 bg-green-50 border-b border-green-100 shrink-0">
        <div class="max-w-5xl mx-auto">
          <!-- Booking Card -->
          <div class="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
            <!-- Header -->
            <div class="bg-green-500 px-4 py-2">
              <p class="text-xs font-medium text-white">
                <i class="pi pi-check-circle mr-1"></i>
                Kesepakatan Layanan
              </p>
            </div>

            <!-- Body -->
            <div class="p-4">
              <!-- Service Info -->
              <div class="flex items-start gap-3">
                <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    :src="service?.cover_img?.url || service?.cover_img?.src_url || '/placeholder.png'"
                    class="object-cover w-full h-full"
                  />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-900">{{ consultation.service_name }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    <i class="pi pi-store mr-1"></i>
                    {{ merchant?.name || 'Merchant' }}
                  </p>
                </div>
              </div>

              <!-- Price -->
              <div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <p class="text-xs text-gray-500">Harga Kesepakatan</p>
                <p class="text-lg font-bold text-green-700">
                  {{ formatCurrency(getConsultationFinalPrice()) }}
                </p>
              </div>

              <!-- Schedule (if any) -->
              <div v-if="consultation.proposed_date || consultation.proposed_time || consultation.proposed_notes" class="mt-3 space-y-2">
                <div v-if="consultation.proposed_date" class="flex items-center gap-2 text-xs text-gray-600">
                  <i class="pi pi-calendar text-gray-400"></i>
                  <span>{{ formatDate(consultation.proposed_date) }}</span>
                </div>
                <div v-if="consultation.proposed_time" class="flex items-center gap-2 text-xs text-gray-600">
                  <i class="pi pi-clock text-gray-400"></i>
                  <span>{{ formatTime(consultation.proposed_time) }}</span>
                </div>
                <div v-if="consultation.proposed_notes" class="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-600">
                    <i class="pi pi-info-circle mr-1 text-gray-400"></i>
                    {{ consultation.proposed_notes }}
                  </p>
                </div>
              </div>
              <div v-else class="mt-3 text-xs text-gray-400 italic">
                <i class="pi pi-calendar mr-1"></i>
                Tidak menggunakan jadwal
              </div>

              <!-- Action Buttons -->
              <div class="mt-4 space-y-2">
                <!-- If no order yet, show Booking button -->
                <button
                  v-if="!hasOrder"
                  @click="bookNow"
                  :disabled="booking"
                  class="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <i :class="['pi', booking ? 'pi-spin pi-spinner' : 'pi-calendar-plus']"></i>
                  {{ booking ? 'Memproses...' : 'Booking Sekarang' }}
                </button>

                <!-- If already has service order -->
                <div v-else class="space-y-2">
                  <div class="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <p class="text-xs font-medium text-blue-700">
                      <i class="pi pi-check-circle mr-1"></i>
                      Booking Diajukan
                    </p>
                  </div>
                  <button
                    @click="viewOrderDetail"
                    class="w-full py-2.5 bg-purple-500 text-white rounded-xl text-xs font-medium hover:bg-purple-600 transition flex items-center justify-center gap-2"
                  >
                    <i class="pi pi-eye"></i>
                    Lihat Detail Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Accepted notice -->
      <div v-if="consultation.status === 'accepted'" class="lg:px-6 px-4 py-2 bg-green-50 border-b border-green-100 shrink-0">
        <div class="max-w-5xl mx-auto">
          <p class="text-xs font-medium text-green-700">
            <i class="pi pi-check-circle mr-1"></i>
            Kesepakatan harga: {{ formatCurrency(getConsultationFinalPrice()) }}
          </p>
        </div>
      </div>

      <!-- Rejection Notice -->
      <div v-if="consultation.status === 'ditolak'" class="lg:px-6 px-4 py-2 bg-red-50 border-b border-red-100 shrink-0">
        <div class="max-w-5xl mx-auto">
          <p class="text-xs font-medium text-red-700">
            <i class="pi pi-times-circle mr-1"></i>
            Konsultasi ditolak
          </p>
          <p v-if="consultation.merchant_note" class="text-xs text-red-500 mt-0.5">{{ consultation.merchant_note }}</p>
        </div>
      </div>

      <!-- Offer Rejected Notice -->
      <div v-if="consultation.status === 'penawaran_ditolak'" class="lg:px-6 px-4 py-2 bg-red-50 border-b border-red-100 shrink-0">
        <div class="max-w-5xl mx-auto">
          <p class="text-xs font-medium text-red-700">
            <i class="pi pi-times-circle mr-1"></i>
            Penawaran Ditolak
          </p>
        </div>
      </div>

      <!-- Chat Messages - Scrollable -->
      <div ref="messageListRef" class="flex-1 overflow-y-auto lg:px-6 px-4 py-4 pb-28">
        <div class="max-w-5xl mx-auto space-y-3">
          <!-- Initial request -->
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 lg:rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                <i class="pi pi-user text-purple-600 text-[10px]"></i>
              </div>
              <span class="text-xs font-medium text-gray-500">Permintaan Saya</span>
              <span class="text-xs text-gray-400 ml-auto">{{ formatDateTime(consultation.created_at) }}</span>
            </div>
            <p class="text-sm text-gray-700">{{ consultation.customer_description }}</p>
            <div v-if="consultation.customer_budget" class="mt-2 text-xs text-gray-500">
              Budget: {{ formatCurrency(consultation.customer_budget) }}
            </div>
            <div v-if="consultation.customer_note" class="mt-1.5 text-xs text-gray-500 italic">
              Note: {{ consultation.customer_note }}
            </div>
            <!-- Initial media -->
            <div v-if="initialMedia?.length" class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div v-for="media in initialMedia" :key="media.id" class="rounded-lg overflow-hidden">
                <img :src="media.file_url" class="w-full h-28 object-cover" />
              </div>
            </div>
          </div>

          <!-- Chat messages -->
          <template v-for="msg in messages" :key="msg.id">
            <!-- Offer message from merchant — show as plain text line, not a card -->
            <div v-if="msg.proposed_price && msg.sender_type === 'merchant'" class="text-center py-1">
              <span class="text-sm text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full">
                <i class="pi pi-tag text-[10px] mr-1"></i>
                Merchant mengajukan harga {{ formatCurrency(msg.proposed_price) }}
                <span v-if="msg.merchant_note || msg.message"> — {{ msg.merchant_note || msg.message }}</span>
              </span>
            </div>

            <!-- Offer accepted by customer — show as highlighted system text -->
            <div v-else-if="msg.proposed_price && msg.sender_type === 'customer'" class="text-center py-1">
              <span class="text-sm text-green-700 bg-green-50 px-4 py-1.5 rounded-full">
                <i class="pi pi-check-circle text-[10px] mr-1"></i>
                Penawaran disetujui: {{ formatCurrency(msg.proposed_price) }}
              </span>
            </div>

            <!-- Regular chat message - customer (right) -->
            <div
              v-else-if="msg.sender_type === 'customer'"
              class="max-w-[90%] ml-auto"
            >
              <div class="bg-purple-500 text-white rounded-2xl rounded-tr-sm p-3">
                <p v-if="msg.message" class="text-sm">{{ msg.message }}</p>
                <div v-if="msg.media?.length" class="mt-2 space-y-2">
                  <template v-for="media in msg.media" :key="media.id">
                    <img
                      v-if="media.file_type === 'image' || (media.mime_type && media.mime_type.startsWith('image/'))"
                      :src="media.file_url"
                      class="max-w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                      style="max-height: 220px;"
                      @click="openMedia(media.file_url)"
                    />
                    <video
                      v-else-if="media.file_type === 'video' || (media.mime_type && media.mime_type.startsWith('video/'))"
                      :src="media.file_url"
                      controls
                      class="max-w-full rounded-lg"
                      style="max-height: 220px;"
                    />
                  </template>
                </div>
              </div>
              <p class="text-[10px] text-gray-400 mt-1 text-right">{{ formatDateTime(msg.created_at) }}</p>
            </div>

            <!-- Regular chat message - merchant (not offer) -->
            <div
              v-else
              class="max-w-[90%]"
            >
              <div class="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                <p v-if="msg.message" class="text-sm text-gray-700">{{ msg.message }}</p>
                <div v-if="msg.media?.length" class="mt-2 space-y-2">
                  <template v-for="media in msg.media" :key="media.id">
                    <img
                      v-if="media.file_type === 'image' || (media.mime_type && media.mime_type.startsWith('image/'))"
                      :src="media.file_url"
                      class="max-w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                      style="max-height: 220px;"
                      @click="openMedia(media.file_url)"
                    />
                    <video
                      v-else-if="media.file_type === 'video' || (media.mime_type && media.mime_type.startsWith('video/'))"
                      :src="media.file_url"
                      controls
                      class="max-w-full rounded-lg"
                      style="max-height: 220px;"
                    />
                  </template>
                </div>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">{{ formatDateTime(msg.created_at) }}</p>
            </div>
          </template>

          <!-- Empty messages -->
          <div v-if="messages.length === 0 && consultation.merchant_response" class="text-center py-8 text-gray-400">
            <i class="pi pi-comments text-2xl mb-1"></i>
            <p class="text-xs">Mulai percakapan</p>
          </div>
        </div>
      </div>
    </template>

    <!-- File Preview -->
    <div v-if="selectedFiles.length > 0" class="bg-purple-50 border-t border-purple-100 lg:px-6 px-4 py-2 shrink-0">
      <div class="max-w-5xl mx-auto flex items-center gap-3 overflow-x-auto">
        <span class="text-xs text-purple-600 font-medium shrink-0 text-nowrap">Attached:</span>
        <div v-for="(file, index) in selectedFiles" :key="index" class="relative shrink-0">
          <img
            v-if="file.type.startsWith('image/')"
            :src="getFilePreview(file)"
            class="w-10 h-10 rounded-lg object-cover border"
          />
          <video
            v-else
            :src="getFilePreview(file)"
            class="w-10 h-10 rounded-lg object-cover border"
          />
          <button
            @click="removeFile(index)"
            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
          >
            <i class="pi pi-times text-[8px]"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Input Area - Sticky Bottom -->
    <div v-if="canSendMessage" class="bg-white border-t border-gray-200 lg:px-6 px-4 py-3 shrink-0">
      <div class="max-w-5xl mx-auto">
        <div class="flex gap-3 items-center">
          <!-- Attachment -->
          <button
            @click="triggerFileInput"
            class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition shrink-0"
          >
            <i class="pi pi-paperclip text-sm"></i>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- Message input -->
          <input
            v-model="newMessage"
            type="text"
            placeholder="Ketik pesan..."
            class="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
            :disabled="sending"
            @keyup.enter="sendMessage"
          />

          <!-- Send button -->
          <button
            @click="sendMessage"
            :disabled="(!newMessage.trim() && selectedFiles.length === 0) || sending"
            class="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
          >
            <i :class="['pi', sending ? 'pi-spin pi-spinner' : 'pi-send', 'text-sm']"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Cannot send notice -->
    <div v-else class="bg-gray-50 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-400 shrink-0">
      <i class="pi pi-info-circle mr-1"></i>
      {{ consultation?.status === 'penawaran_ditolak' ? 'Penawaran ditolak' : consultation?.status === 'ditolak' ? 'Konsultasi ditolak' : consultation?.status === 'accepted' ? 'Sudah disepakati' : 'Konsultasi ditutup' }}
    </div>
  </div>
</template>
