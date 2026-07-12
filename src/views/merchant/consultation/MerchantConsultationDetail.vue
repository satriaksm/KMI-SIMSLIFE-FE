<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const merchantSlug = computed(() => route.params.merchantSlug);

// States
const consultation = ref(null);
const messages = ref([]);
const newMessage = ref('');
const loading = ref(true);
const sending = ref(false);
const messageListRef = ref(null);
const fileInputRef = ref(null);
const selectedFiles = ref([]);
const showCloseModal = ref(false);
const closeReason = ref('');
let autoRefreshTimer = null;

// Response modals
const showOfferModal = ref(false);
const showRejectModal = ref(false);

// Form data
const offerPrice = ref('');
const offerNote = ref('');
const rejectReason = ref('');

// Open offer modal - reset form first
const openOfferModal = () => {
  offerPrice.value = '';
  offerNote.value = '';
  showOfferModal.value = true;
};

// Status config
const statusConfig = {
  pending: { label: 'Chat Dengan Merchant', color: 'bg-yellow-100 text-yellow-700', icon: 'pi-clock' },
  dapat_dikerjakan: { label: 'Pengajuan', color: 'bg-blue-100 text-blue-700', icon: 'pi-check' },
  perlu_penyesuaian: { label: 'Pengajuan', color: 'bg-purple-100 text-purple-700', icon: 'pi-comments' },
  ditolak: { label: 'Ditolak Merchant', color: 'bg-red-100 text-red-700', icon: 'pi-times' },
  accepted: { label: 'Pembayaran Berhasil', color: 'bg-green-100 text-green-700', icon: 'pi-check-circle' },
  closed: { label: 'Percakapan Dihentikan', color: 'bg-gray-100 text-gray-700', icon: 'pi-minus-circle' },
  penawaran_ditolak: { label: 'Penawaran Ditolak', color: 'bg-red-100 text-red-700', icon: 'pi-times-circle' },
};

const getStatusColor = (status) => statusConfig[status]?.color || 'bg-gray-100 text-gray-700';

const isPaid = computed(() =>
  String(consultation.value?.payment_status || consultation.value?.order_payment_status || '').toUpperCase() === 'PAID'
  || consultation.value?.is_paid === true
);

const isOrderCompleted = computed(() => {
  const orderStatus = String(consultation.value?.order_status || '').toLowerCase();
  return ['selesai', 'completed'].includes(orderStatus);
});

const conversationStatusLabel = computed(() => {
  if (consultation.value?.conversation_status_label) return consultation.value.conversation_status_label;
  const orderStatus = String(consultation.value?.order_status || '').toLowerCase();
  if (isPaid.value) {
    if (['layanan_dikerjakan', 'dikerjakan', 'processing'].includes(orderStatus)) return 'Layanan Diproses';
    if (['menunggu_konfirmasi_selesai', 'menunggu_selesai'].includes(orderStatus)) return 'Menunggu Persetujuan';
    if (['selesai', 'completed'].includes(orderStatus)) return 'Selesai';
    return 'Pembayaran Berhasil';
  }
  return statusConfig[consultation.value?.status]?.label || consultation.value?.status || '—';
});

// Computed actions
const canRespond = computed(() => consultation.value?.status === 'pending');
const canCreateOffer = computed(() => ['dapat_dikerjakan', 'perlu_penyesuaian'].includes(consultation.value?.status) && !isPaid.value);
const canAccept = computed(() => false);
const canClose = computed(() => {
  const status = String(consultation.value?.status || '').toLowerCase();

  return consultation.value?.can_stop_conversation === true
    && !isPaid.value
    && !isOrderCompleted.value
    && !['closed', 'ditolak', 'penawaran_ditolak'].includes(status);
});
const isTerminal = computed(() => isOrderCompleted.value || ['closed', 'penawaran_ditolak', 'ditolak'].includes(consultation.value?.status));
const canSendMessage = computed(() => !isOrderCompleted.value && !['ditolak', 'closed', 'penawaran_ditolak'].includes(consultation.value?.status));
const initialMessage = computed(() =>
  consultation.value?.messages?.find(m => m.message_type === 'initial')
);

// Initial media: new flow (via initial message) or legacy (direct media on consultation)
const initialMedia = computed(() => {
  if (initialMessage.value?.media?.length) return initialMessage.value.media;
  return consultation.value?.media || [];
});

// Price helpers
const getConsultationInitialPrice = () => {
  return consultation.value?.initial_price
    || consultation.value?.original_price
    || consultation.value?.jasa?.price
    || consultation.value?.jasa?.base_price
    || consultation.value?.jasa?.fixed_price
    || null;
};

// Get starting price (harga mulai) - used for offer validation
const getStartingPrice = () => {
  // Prioritas: base_price, price, fixed_price dari jasa
  return consultation.value?.jasa?.base_price
    || consultation.value?.jasa?.price
    || consultation.value?.jasa?.fixed_price
    || consultation.value?.original_price
    || null;
};

const getConsultationFinalPrice = () => {
  return consultation.value?.final_price
    || (consultation.value?.status === 'accepted' ? consultation.value?.negotiated_price : null)
    || null;
};

// Offer price validation - must be greater than starting price
const offerPriceError = computed(() => {
  const price = Number(offerPrice.value);
  const startingPrice = getStartingPrice();
  if (!offerPrice.value || isNaN(price) || price <= 0) {
    return null; // Let other validation handle this
  }
  if (startingPrice && price <= startingPrice) {
    return `Harga penawaran harus lebih besar dari harga mulai (${formatCurrency(startingPrice)})`;
  }
  return null;
});

// Check if submit button should be disabled
const canSubmitOffer = computed(() => {
  const price = Number(offerPrice.value);
  const startingPrice = getStartingPrice();

  // Must have valid price
  if (!offerPrice.value || isNaN(price) || price <= 0) {
    return false;
  }

  // Price must be greater than starting price
  if (startingPrice && price <= startingPrice) {
    return false;
  }

  return true;
});

// Format currency
const formatCurrency = (value) => {
  if (!value) return '-';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

// Format date
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

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

// Fetch consultation detail
const fetchConsultation = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    const { data } = await api.get(`/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}`);
    consultation.value = data?.data || data;
    messages.value = consultation.value?.messages || [];

    const latestStatus = String(consultation.value?.status || '').toLowerCase();
    const latestOrderStatus = String(consultation.value?.order_status || '').toLowerCase();

    if (
      ['closed', 'ditolak', 'penawaran_ditolak'].includes(latestStatus) ||
      ['selesai', 'completed'].includes(latestOrderStatus)
    ) {
      showCloseModal.value = false;
      closeReason.value = '';
    }

    // Debug: Log consultation data and service image
    console.log('CONSULTATION DATA:', consultation.value);
    console.log('SERVICE IMAGE:', consultation.value?.service_image);
    console.log('JASA IMAGE:', consultation.value?.jasa?.cover_img?.url || consultation.value?.jasa?.image_url);

    scrollToBottom();
  } catch (error) {
    console.error('Gagal memuat konsultasi:', error);
    if (!silent) {
      toast.error('Gagal memuat detail konsultasi');
    }
  } finally {
    if (!silent) loading.value = false;
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

// Send message
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
      `/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}/messages`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.data.data) messages.value.push(response.data.data);
    newMessage.value = '';
    selectedFiles.value = [];
    scrollToBottom();
    toast.success('Pesan terkirim');
  } catch (error) {
    console.error('Gagal mengirim pesan:', error);
    toast.error(error.response?.data?.message || 'Gagal mengirim pesan');
  } finally {
    sending.value = false;
  }
};

// Submit offer
const submitOffer = async () => {
  // Parse price - input type="number" gives us a string or number
  const priceRaw = offerPrice.value;
  const price = Number(String(priceRaw).replace(/[^\d]/g, ''));
  const startingPrice = getStartingPrice();

  // Validation - basic
  if (!priceRaw || String(priceRaw).trim() === '' || isNaN(price) || price <= 0) {
    toast.error('Harga penawaran wajib diisi dan harus lebih dari 0');
    return;
  }

  // Validation - must be greater than starting price
  if (startingPrice && price <= startingPrice) {
    toast.error(`Harga penawaran harus lebih besar dari harga mulai (${formatCurrency(startingPrice)})`);
    return;
  }

  // Prevent double-submit
  if (sending.value) return;

  sending.value = true;
  try {
    const responseType = 'perlu_penyesuaian';
    const endpoint = `/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}/respond`;

    const payload = {
      response: responseType,
      merchant_offered_price: price,
      merchant_note: offerNote.value || null,
    };

    const { data } = await api.post(endpoint, payload);

    // ApiResponse::success → { message, data }
    // Close modal and reset form
    showOfferModal.value = false;
    offerPrice.value = '';
    offerNote.value = '';

    toast.success(data?.message || 'Penawaran berhasil dikirim.');

    // Refresh consultation data to get updated status, messages, and offered price
    await fetchConsultation();
    await nextTick();
    scrollToBottom();

    // If response includes a new message from the offer, push it to the chat
    if (data?.data?.message || data?.data) {
      const newMsg = data.data?.message || data.data;
      if (newMsg && newMsg.id && !messages.value.find(m => m.id === newMsg.id)) {
        messages.value.push(newMsg);
        await nextTick();
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('[submitOffer] error:', error);
    toast.error(
      error.response?.data?.message ||
      (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Gagal mengirim penawaran. Silakan coba lagi.')
    );
  } finally {
    sending.value = false;
  }
};

// Reject consultation
const submitRejection = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Alasan penolakan wajib diisi');
    return;
  }

  if (sending.value) return;
  sending.value = true;

  try {
    const { data } = await api.post(
      `/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}/respond`,
      {
        response: 'tidak_bisa_dikerjakan',
        merchant_note: rejectReason.value,
      }
    );
    if (data.success) {
      toast.success('Konsultasi ditolak');
      showRejectModal.value = false;
      rejectReason.value = '';
      await fetchConsultation();
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal menolak konsultasi');
  } finally {
    sending.value = false;
  }
};

// Merchant accepts the customer's accepted offer and creates service order
const submitAccept = async () => {
  if (sending.value) return;
  sending.value = true;

  try {
    const { data } = await api.post(
      `/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}/accept`
    );
    if (data.success) {
      toast.success('Pesanan berhasil dibuat!');
      await fetchConsultation();
    }
  } catch (error) {
    console.error('Accept order error:', error);
    toast.error(error.response?.data?.message || 'Gagal membuat pesanan');
  } finally {
    sending.value = false;
  }
};

// Close consultation (without creating order)
const openCloseModal = () => {
  closeReason.value = '';
  showCloseModal.value = true;
};

const submitClose = async () => {
  if (sending.value) return;

  sending.value = true;

  try {
    const payload = closeReason.value.trim()
      ? { reason: closeReason.value.trim() }
      : {};

    await api.post(
      `/api/merchant/${merchantSlug.value}/service-consultations/${route.params.id}/close`,
      payload
    );

    showCloseModal.value = false;
    closeReason.value = '';

    toast.success('Percakapan berhasil dihentikan');

    await fetchConsultation(true);
  } catch (error) {
    const message = error.response?.data?.message || '';

    if (
      message.toLowerCase().includes('sudah ditutup') ||
      message.toLowerCase().includes('sudah dihentikan') ||
      message.toLowerCase().includes('tidak aktif') ||
      error.response?.status === 400 ||
      error.response?.status === 409
    ) {
      showCloseModal.value = false;
      closeReason.value = '';

      toast.success('Percakapan berhasil dihentikan');

      await fetchConsultation(true);
      return;
    }

    toast.error(message || 'Gagal menutup konsultasi');
  } finally {
    sending.value = false;
  }
};

// Scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

onMounted(async () => {
  await fetchConsultation();
  autoRefreshTimer = window.setInterval(() => {
    if (!document.hidden && !sending.value) {
      fetchConsultation(true);
    }
  }, 5000);
});

onBeforeUnmount(() => {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header - Sticky -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 lg:px-4 px-4 py-3 shrink-0">
      <div class="flex items-center">
        <button
          @click="router.back()"
          class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"
        >
          <i class="pi pi-arrow-left text-sm"></i>
        </button>
        <div class="flex-1 min-w-0 px-3">
          <h1 class="text-sm font-bold text-gray-900 truncate">
            {{ consultation?.jasa?.title || consultation?.service_name || 'Konsultasi' }}
          </h1>
          <p class="text-xs text-gray-500 truncate">
            <i class="pi pi-user mr-1"></i>
            {{ consultation?.customer?.name || 'Pelanggan' }}
          </p>
        </div>
        <span
          v-if="consultation?.status"
          :class="['px-2 py-0.5 rounded-full text-xs font-medium shrink-0', getStatusColor(consultation.status)]"
        >
          {{ conversationStatusLabel }}
        </span>
        <button
          v-if="canClose"
          @click="openCloseModal"
          :disabled="sending"
          class="ml-2 hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
        >
          Hentikan Percakapan
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <template v-else-if="consultation">
      <!-- Service Info Banner -->
      <div class="bg-white border-b border-gray-100 lg:pl-4 px-4 py-2 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              :src="consultation.service_image || consultation.jasa?.cover_img?.url || consultation.jasa?.image_url || '/placeholder.png'"
              class="object-cover w-full h-full"
              @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/placeholder.png'; } }"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-800 truncate">{{ consultation.jasa?.title || 'Layanan' }}</p>
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

      <!-- Action Status Card -->
      <div v-if="consultation.status !== 'pending'" class="lg:pl-4 px-4 py-2 bg-white border-b border-gray-100 shrink-0">
        <div class="max-w-xl">
          <!-- Response explanation -->
          <p v-if="consultation.merchant_response" class="text-xs text-gray-600">
            <i class="pi pi-info-circle mr-1 text-purple-500"></i>
            {{ getResponseExplanation(consultation.merchant_response) }}
          </p>

          <!-- Merchant note -->
          <p v-if="consultation.merchant_note" class="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">
            <i class="pi pi-comment mr-1"></i>
            {{ consultation.merchant_note }}
          </p>

          <!-- Action buttons -->
          <div v-if="!isTerminal" class="mt-2 flex gap-2">
            <!-- Respond to pending -->
            <template v-if="canRespond">
              <button
                @click="openOfferModal"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                <i class="pi pi-check mr-1"></i>Bisa
              </button>
              <button
                @click="showRejectModal = true"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <i class="pi pi-times mr-1"></i>Tidak
              </button>
            </template>

            <!-- Customer accepted - merchant confirms and creates order -->
            <button
              v-if="false && canAccept && consultation.customer_accepted"
              @click="submitAccept"
              :disabled="sending"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50"
            >
              <i class="pi pi-check mr-1"></i>Konfirmasi Pesanan
            </button>

            <!-- Close (only when customer hasn't accepted) -->
            <button
              v-if="canClose && !consultation.customer_accepted"
              @click="openCloseModal"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              Hentikan Percakapan
            </button>
          </div>

          <!-- Terminal notice -->
          <div v-else-if="consultation.order_id" class="mt-2 flex gap-2">
            <button
              @click="router.push(`/merchant-center/${merchantSlug}/orders/${consultation.order_id}`)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 transition"
            >
              <i class="pi pi-eye mr-1"></i>Lihat Pesanan
            </button>
          </div>
          <p v-else-if="isTerminal" class="text-xs text-gray-500 mt-1">
            <i class="pi pi-info-circle mr-1"></i>
            {{ conversationStatusLabel }}
          </p>
        </div>
      </div>

      <!-- Rejection Notice -->
      <div v-if="consultation.status === 'ditolak'" class="lg:pl-4 px-4 py-2 bg-red-50 border-b border-red-100 shrink-0">
        <div class="max-w-xl">
          <p class="text-xs text-red-700 font-medium">
            <i class="pi pi-info-circle mr-1"></i>
            Konsultasi ditolak
          </p>
        </div>
      </div>

      <!-- Offer Rejected by Customer Notice -->
      <div v-if="consultation.status === 'penawaran_ditolak'" class="lg:pl-4 px-4 py-2 bg-red-50 border-b border-red-100 shrink-0">
        <div class="max-w-xl">
          <p class="text-xs text-red-700 font-medium">
            <i class="pi pi-times-circle mr-1"></i>
            Penawaran Ditolak oleh Customer
          </p>
        </div>
      </div>

      <!-- Chat Messages - Scrollable -->
      <div ref="messageListRef" class="flex-1 overflow-y-auto lg:pl-4 px-4 py-4 pb-28">
        <div class="max-w-xl space-y-3">
          <!-- Initial request -->
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 lg:rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                <i class="pi pi-user text-purple-600 text-[10px]"></i>
              </div>
              <span class="text-xs font-medium text-gray-500">Permintaan</span>
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
            <!-- Offer bubble (messages with proposed_price) -->
            <div v-if="msg.proposed_price" class="w-full max-w-[95%] mx-auto">
              <!-- Offer from merchant (right side) -->
              <div v-if="msg.sender_type === 'merchant'" class="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left lg:rounded-xl">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <i class="pi pi-tag text-white text-[10px]"></i>
                  </div>
                  <span class="text-xs font-medium text-blue-700">Pengajuan Harga</span>
                </div>
                <p class="text-lg font-bold text-blue-800">{{ formatCurrency(msg.proposed_price) }}</p>
                <p v-if="msg.merchant_note" class="text-sm text-blue-600 mt-1.5">
                  <i class="pi pi-comment mr-1"></i>
                  {{ msg.merchant_note }}
                </p>
                <p v-if="msg.message && !msg.merchant_note" class="text-sm text-gray-600 mt-1.5">
                  {{ msg.message }}
                </p>
                <div class="mt-3 flex items-center gap-2">
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    Menunggu Respon
                  </span>
                  <span class="text-[10px] text-gray-400">{{ formatDateTime(msg.created_at) }}</span>
                </div>
              </div>

              <!-- Offer from customer (left side) - acceptance -->
              <div v-else class="bg-green-50 border border-green-200 rounded-2xl p-4 text-left lg:rounded-xl">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <i class="pi pi-check text-white text-[10px]"></i>
                  </div>
                  <span class="text-xs font-medium text-green-700">Pelanggan Menerima</span>
                </div>
                <p class="text-lg font-bold text-green-800">{{ formatCurrency(msg.proposed_price) }}</p>
                <p v-if="msg.message" class="text-sm text-gray-600 mt-1.5">{{ msg.message }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Harga Kesepakatan
                  </span>
                  <span class="text-[10px] text-gray-400">{{ formatDateTime(msg.created_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Regular chat message - merchant (right) -->
            <div
              v-else-if="msg.sender_type === 'merchant'"
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

            <!-- Regular chat message - customer (left) -->
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
    <div v-if="selectedFiles.length > 0" class="bg-purple-50 border-t border-purple-100 lg:pl-4 px-4 py-2 shrink-0">
      <div class="flex items-center gap-3 overflow-x-auto">
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
    <div v-if="canSendMessage" class="bg-white border-t border-gray-200 lg:pl-4 px-4 py-3 shrink-0">
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

        <!-- Quick offer button -->
        <button
          v-if="canSendMessage && !isPaid"
          @click="openOfferModal"
          class="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition shrink-0"
          title="Kirim Harga"
        >
          <i class="pi pi-tag text-sm"></i>
        </button>

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

    <!-- Cannot send notice -->
    <div v-else class="bg-gray-50 border-t border-gray-200 lg:pl-4 px-4 py-2 text-center text-xs text-gray-400 shrink-0">
      <i class="pi pi-info-circle mr-1"></i>
      {{ conversationStatusLabel }}
    </div>


    <!-- Close Conversation Modal -->
    <teleport to="body">
      <transition name="fade">
        <div
          v-if="showCloseModal"
          class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="showCloseModal = false"
        >
          <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Hentikan Percakapan?</h3>
              <button @click="showCloseModal = false" class="text-gray-400 hover:text-gray-600">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="p-5 space-y-4">
              <p class="text-sm text-gray-600">
                Percakapan akan dihentikan. Order yang belum dibayar juga akan dibatalkan.
              </p>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Alasan (opsional)</label>
                <textarea
                  v-model="closeReason"
                  rows="3"
                  maxlength="500"
                  placeholder="Contoh: Customer tidak jadi melanjutkan"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
                ></textarea>
              </div>
              <div class="flex gap-2">
                <button
                  @click="showCloseModal = false"
                  class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  @click="submitClose"
                  :disabled="sending"
                  class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <i v-if="sending" class="pi pi-spin pi-spinner"></i>
                  {{ sending ? 'Memproses...' : 'Hentikan' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Offer Modal -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showOfferModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showOfferModal = false">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Kirim Penawaran</h3>
              <button @click="showOfferModal = false" class="text-gray-400 hover:text-gray-600">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="p-5 space-y-4">
              <!-- Starting Price Info -->
              <div v-if="getStartingPrice()" class="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                <p class="text-xs text-purple-700">
                  <i class="pi pi-info-circle mr-1"></i>
                  Harga mulai: <span class="font-semibold">{{ formatCurrency(getStartingPrice()) }}</span>
                </p>
                <p class="text-xs text-purple-600 mt-1">
                  Harga penawaran harus lebih besar dari harga mulai.
                </p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Harga Penawaran *</label>
                <input
                  v-model="offerPrice"
                  type="number"
                  :min="getStartingPrice() ? getStartingPrice() + 1 : 1"
                  placeholder="Contoh: 150000"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
                <!-- Error: less than or equal to 0 -->
                <p v-if="offerPrice && Number(offerPrice) <= 0" class="mt-1 text-xs text-red-500">Harga harus lebih dari 0</p>
                <!-- Error: less than or equal to starting price -->
                <p v-if="offerPriceError" class="mt-1 text-xs text-red-500">{{ offerPriceError }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  v-model="offerNote"
                  rows="3"
                  placeholder="Deskripsi layanan, detail yang perlu diperhatikan"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                ></textarea>
              </div>
              <div class="flex gap-2">
                <button
                  @click="showOfferModal = false"
                  class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  @click="submitOffer"
                  :disabled="sending || !canSubmitOffer"
                  class="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <i v-if="sending" class="pi pi-spin pi-spinner"></i>
                  {{ sending ? 'Mengirim...' : 'Kirim' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Reject Modal -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Tolak Konsultasi</h3>
              <button @click="showRejectModal = false" class="text-gray-400 hover:text-gray-600">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="p-5">
              <p class="text-sm text-gray-600 mb-3">Jelaskan alasan penolakan:</p>
              <textarea
                v-model="rejectReason"
                rows="4"
                placeholder="Contoh: Terlalu jauh, terlalu banyak pesanan"
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
                  :disabled="sending"
                  class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
                >
                  {{ sending ? 'Mengirim...' : 'Tolak' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>