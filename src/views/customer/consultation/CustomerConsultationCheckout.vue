<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const consultationId = computed(() => route.params.consultationId);

// States
const consultation = ref(null);
const loading = ref(true);
const submitting = ref(false);
const locating = ref(false);

// Form data
const form = ref({
  customer_name: '',
  customer_phone: '',
  booking_date: '',
  booking_time: '',
  booking_note: '',
  payment_method: 'COD',
});

// Address fields (separate from form for flexibility)
const addressData = ref({
  customer_address: '',
  customer_latitude: null,
  customer_longitude: null,
});

const paymentMethods = [
  { value: 'COD', label: 'COD (Bayar di Tempat)' },
  { value: 'MANUAL', label: 'Transfer Manual' },
];

// Service type helpers
const getServiceType = () => {
  return (
    consultation.value?.jasa?.service_type ||
    consultation.value?.service_type ||
    consultation.value?.service?.service_type ||
    ''
  ).toLowerCase();
};

const isOnlineService = computed(() => getServiceType() === 'online');
const isHomeService = computed(() => getServiceType() === 'ke_rumah_pelanggan');
const isMerchantPlaceService = computed(() => getServiceType() === 'di_tempat_umkm');

// Merchant address for di_tempat_umkm
const merchantAddress = computed(() => {
  const merchant = consultation.value?.merchant;
  if (!merchant) return '';
  return (
    merchant.address ||
    merchant.alamat ||
    merchant.full_address ||
    ''
  );
});

// Service area info
const serviceArea = computed(() => {
  return consultation.value?.jasa?.service_area || '';
});

const formatCurrency = (value) => {
  if (!value) return '-';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

// Get device location
const requestDeviceLocation = () => {
  if (!navigator.geolocation) {
    toast.warning('Perangkat tidak mendukung GPS');
    return;
  }

  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      addressData.value.customer_latitude = position.coords.latitude;
      addressData.value.customer_longitude = position.coords.longitude;
      // Try to get address from coordinates
      reverseGeocode(position.coords.latitude, position.coords.longitude);
      locating.value = false;
      toast.success('Lokasi berhasil diambil');
    },
    (error) => {
      locating.value = false;
      console.error('Geolocation error:', error);
      toast.error('Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

// Reverse geocode lat/lng to address
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    if (data?.display_name) {
      addressData.value.customer_address = data.display_name;
    }
  } catch (e) {
    console.log('Reverse geocode failed, using coordinates');
    addressData.value.customer_address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

const fetchConsultation = async () => {
  loading.value = true;
  try {
    const response = await api.get(`/api/service-consultations/${consultationId.value}`);
    consultation.value = response.data.data;
  } catch (error) {
    console.error('Error fetching consultation:', error);
    toast.error('Gagal memuat data konsultasi');
    setTimeout(() => router.back(), 2000);
  } finally {
    loading.value = false;
  }
};

const submitCheckout = async () => {
  // Validation
  if (!form.value.customer_name.trim()) {
    toast.error('Nama wajib diisi');
    return;
  }
  if (!form.value.customer_phone.trim()) {
    toast.error('No. HP wajib diisi');
    return;
  }

  // Address validation for home service
  if (isHomeService.value && !addressData.value.customer_address.trim()) {
    toast.error('Alamat lengkap wajib diisi untuk layanan ke rumah pelanggan');
    return;
  }

  if (submitting.value) return;
  submitting.value = true;

  try {
    // Prepare payload
    const payload = {
      customer_name: form.value.customer_name,
      customer_phone: form.value.customer_phone,
      booking_date: form.value.booking_date || null,
      booking_time: form.value.booking_time || null,
      booking_note: form.value.booking_note || null,
      payment_method: form.value.payment_method,
    };

    // Add address based on service type
    if (isHomeService.value) {
      payload.customer_address = addressData.value.customer_address;
      payload.customer_latitude = addressData.value.customer_latitude;
      payload.customer_longitude = addressData.value.customer_longitude;
    }

    // For online and di_tempat_umkm, don't send customer_address
    // Backend will handle it based on service_type

    console.log('[Checkout] Mengirim request book consultation...');

    const { data } = await api.post(
      `/api/service-consultations/${consultationId.value}/book`,
      payload
    );

    console.log('[Checkout] Response received:', data);

    // ApiResponse::success returns { message, data } — NOT { success, data }
    // Check data.data for order info
    const responseData = data?.data ?? data;
    const orderId = responseData?.service_order?.id;

    toast.success(data?.message || 'Pesanan konsultasi berhasil dibuat!');

    // Open WhatsApp if URL is available
    if (responseData?.whatsapp_url) {
      window.open(responseData.whatsapp_url, '_blank');
    }

    // Redirect to Service History — NOT pembayaran-jasa
    // Konsultasi langsung jadi pesanan COD/manual, tidak perlu halaman pembayaran
    router.push('/service-history');
  } catch (error) {
    console.error('[Checkout] Error:', error.response?.data || error);
    toast.error(error.response?.data?.message || 'Gagal membuat pesanan');
  } finally {
    submitting.value = false;
  }
};

onMounted(fetchConsultation);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-lg mx-auto">
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Checkout Konsultasi</h1>
            <p class="text-xs text-gray-500">Lengkapi data pesanan</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <template v-else-if="consultation">
      <!-- Order Summary -->
      <div class="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 class="text-sm font-semibold text-gray-800 mb-3">Ringkasan Pesanan</h3>

        <div class="flex items-start gap-3">
          <div class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            <img
              :src="consultation.jasa?.cover_img?.url || '/placeholder.png'"
              class="object-cover w-full h-full"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900">{{ consultation.jasa?.title || consultation.service_name }}</p>
            <p class="text-xs text-gray-500 mt-0.5">
              <i class="pi pi-store mr-1"></i>
              {{ consultation.merchant?.name || 'Merchant' }}
            </p>
            <div class="mt-2 flex items-center gap-2">
              <span class="text-xs text-gray-500">Harga:</span>
              <span class="text-sm font-bold text-purple-700">
                {{ formatCurrency(consultation.negotiated_price || consultation.merchant_offered_price) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Checkout Form -->
      <div class="mx-4 mt-4 space-y-3">
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">Data Diri</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap *</label>
              <input
                v-model="form.customer_name"
                type="text"
                placeholder="Masukkan nama lengkap"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">No. HP *</label>
              <input
                v-model="form.customer_phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>

            <!-- Online: No address needed -->
            <div v-if="isOnlineService" class="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p class="text-xs text-blue-700 flex items-center gap-2">
                <i class="pi pi-globe"></i>
                Layanan dilakukan secara online, alamat tidak diperlukan.
              </p>
            </div>

            <!-- Merchant Place: Show merchant address readonly -->
            <div v-if="isMerchantPlaceService" class="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Lokasi Layanan</label>
              <p class="text-sm text-gray-700">{{ merchantAddress || 'Alamat tidak tersedia' }}</p>
              <p class="text-xs text-gray-400 mt-1">
                <i class="pi pi-map-marker mr-1"></i>
                Layanan dilakukan di tempat UMKM
              </p>
            </div>

            <!-- Home Service: Required customer address -->
            <div v-if="isHomeService">
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Alamat Lengkap *
                <span class="text-red-500">- wajib diisi</span>
              </label>
              <textarea
                v-model="addressData.customer_address"
                rows="3"
                placeholder="Masukkan alamat lengkap pelanggan"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              ></textarea>
              <div class="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  @click="requestDeviceLocation"
                  :disabled="locating"
                  class="px-3 py-1.5 text-xs font-medium rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i :class="['pi', locating ? 'pi-spin pi-spinner' : 'pi-map-marker']"></i>
                  {{ locating ? 'Mengambil...' : 'Ambil Lokasi dari Device' }}
                </button>
                <span v-if="addressData.customer_latitude" class="text-xs text-gray-400">
                  Koordinat: {{ addressData.customer_latitude.toFixed(6) }}, {{ addressData.customer_longitude.toFixed(6) }}
                </span>
              </div>
              <p v-if="serviceArea" class="text-xs text-gray-500 mt-1.5">
                <i class="pi pi-info-circle mr-1"></i>
                Area layanan: {{ serviceArea }}
              </p>
            </div>
          </div>
        </div>

        <!-- Booking Details -->
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">Detail Pesanan</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Tanggal (opsional)</label>
              <input
                v-model="form.booking_date"
                type="date"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Catatan (opsional)</label>
              <textarea
                v-model="form.booking_note"
                rows="2"
                placeholder="Catatan tambahan untuk merchant"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">Metode Pembayaran</h3>

          <div class="space-y-2">
            <label
              v-for="method in paymentMethods"
              :key="method.value"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
              :class="form.payment_method === method.value ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input
                v-model="form.payment_method"
                type="radio"
                :value="method.value"
                class="text-purple-600 focus:ring-purple-500"
              />
              <span class="text-sm text-gray-700">{{ method.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="mx-4 mt-6">
        <button
          @click="submitCheckout"
          :disabled="submitting"
          class="w-full py-3 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
          <i v-else class="pi pi-check"></i>
          {{ submitting ? 'Memproses...' : 'Buat Pesanan' }}
        </button>
      </div>
    </template>
  </div>
</template>