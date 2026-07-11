<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';
import { usePaymentMethods } from '@/composables/usePaymentMethods';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const userStore = useUserStore();
const consultationId = computed(() => route.params.consultationId);

const {
  paymentMethodsList,
  fetchPaymentFees,
  getFilteredPaymentMethods,
  calculatePlatformFee,
  isCodMethod,
} = usePaymentMethods();

const consultation = ref(null);
const loading = ref(true);
const submitting = ref(false);
const locating = ref(false);

const form = ref({
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  booking_note: '',
  payment_method: '',
});

const coordinates = ref({
  latitude: null,
  longitude: null,
});

const service = computed(() => consultation.value?.jasa || consultation.value?.service || {});
const merchant = computed(() => consultation.value?.merchant || {});

const agreedPrice = computed(() => Number(
  consultation.value?.negotiated_price
  || consultation.value?.merchant_offered_price
  || consultation.value?.final_price
  || 0
));

const getdeliveryType = () => String(
  service.value?.delivery_type
  || consultation.value?.delivery_type
  || ''
).toLowerCase();

const isOnlineService = computed(() => getdeliveryType() === 'online');
const isHomeService = computed(() => ['on-site', 'ke_tempat_pelanggan', 'on_site', 'customer_location'].includes(getdeliveryType()));
const isMerchantPlaceService = computed(() => ['in-store', 'ditempat_umkm', 'in-store', 'at_merchant'].includes(getdeliveryType()));

const merchantAddress = computed(() =>
  merchant.value?.address
  || merchant.value?.alamat
  || merchant.value?.full_address
  || consultation.value?.merchant_address
  || ''
);

const enabledPaymentMethods = computed(() => {
  const raw = service.value?.payment_methods || service.value?.paymentMethods || '';
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
});

const availablePaymentMethods = computed(() => {
  const filtered = getFilteredPaymentMethods(enabledPaymentMethods.value);
  return filtered.length ? filtered : paymentMethodsList.value;
});

const selectedPayment = computed(() =>
  availablePaymentMethods.value.find((method) => method.id === form.value.payment_method) || null
);

const platformFee = computed(() => calculatePlatformFee(form.value.payment_method, agreedPrice.value));
const totalPayment = computed(() => agreedPrice.value + platformFee.value);

const serviceImage = computed(() =>
  service.value?.cover_img?.url
  || service.value?.cover_img?.src_url
  || service.value?.image_url
  || service.value?.image
  || '/placeholder.png'
);

const isConversationClosed = computed(() => {
  const status = String(consultation.value?.status || '').toLowerCase();
  return ['closed', 'ditolak', 'penawaran_ditolak'].includes(status);
});

const isPaid = computed(() =>
  String(consultation.value?.payment_status || consultation.value?.order_payment_status || '').toUpperCase() === 'PAID'
  || consultation.value?.is_paid === true
);

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return `Rp ${number.toLocaleString('id-ID')}`;
};

const useProfileContact = () => {
  const user = authStore.user;
  if (!user) {
    toast.error('Silakan login terlebih dahulu');
    return;
  }

  form.value.customer_name = user.name || user.full_name || user.profile?.name || form.value.customer_name;
  form.value.customer_phone = user.phone || user.no_telp || user.profile?.phone || form.value.customer_phone;
  toast.success('Data profil digunakan');
};

const getAddressPart = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'object') {
    return String(
      value.name ||
      value.nama ||
      value.label ||
      value.value ||
      ''
    ).trim();
  }

  return String(value).trim();
};

const buildProfileAddress = () => {
  const user = authStore.user || {};
  const profileUser = userStore.user || {};
  const profile = user.profile || profileUser.profile || {};

  const directCandidates = [
    profileUser.full_address,
    profileUser.fullAddress,
    profileUser.address,
    profileUser.alamat,
    user.full_address,
    user.fullAddress,
    user.address,
    user.alamat,
    profile.full_address,
    profile.fullAddress,
    profile.address,
    profile.alamat,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const addressObject =
    profileUser.primary_address ||
    profileUser.primaryAddress ||
    profileUser.address_detail ||
    profileUser.addressDetail ||
    user.primary_address ||
    user.primaryAddress ||
    user.address_detail ||
    user.addressDetail ||
    profile.primary_address ||
    profile.primaryAddress ||
    profile.address_detail ||
    profile.addressDetail ||
    null;

  if (addressObject && typeof addressObject === 'object') {
    const objectParts = [
      addressObject.detail,
      addressObject.address_detail,
      addressObject.detail_alamat,
      addressObject.alamat,
      addressObject.village,
      addressObject.village_name,
      addressObject.district,
      addressObject.district_name,
      addressObject.city,
      addressObject.city_name,
      addressObject.regency,
      addressObject.regency_name,
      addressObject.province,
      addressObject.province_name,
    ]
      .map(getAddressPart)
      .filter(Boolean);

    if (objectParts.length) {
      return objectParts.join(', ');
    }
  }

  const parts = [
    profileUser.detail_address || profileUser.address_detail || profileUser.detail_alamat || profileUser.detail,
    profileUser.village || profileUser.village_name,
    profileUser.district || profileUser.district_name,
    profileUser.city || profileUser.city_name || profileUser.regency || profileUser.regency_name,
    profileUser.province || profileUser.province_name,

    user.detail_address || user.address_detail || user.detail_alamat || user.detail,
    user.village || user.village_name,
    user.district || user.district_name,
    user.city || user.city_name || user.regency || user.regency_name,
    user.province || user.province_name,

    profile.detail_address || profile.address_detail || profile.detail_alamat || profile.detail,
    profile.village || profile.village_name,
    profile.district || profile.district_name,
    profile.city || profile.city_name || profile.regency || profile.regency_name,
    profile.province || profile.province_name,
  ]
    .map(getAddressPart)
    .filter(Boolean);

  return [...new Set(parts)].join(', ');
};

const useProfileAddress = () => {
  const address = buildProfileAddress();

  if (!address) {
    toast.error('Alamat profil belum tersedia. Silakan lengkapi alamat profil terlebih dahulu.');
    return;
  }

  form.value.customer_address = address;
  toast.success('Alamat profil berhasil digunakan');
};

const setDefaultPaymentMethod = () => {
  if (!availablePaymentMethods.value.length) return;
  if (form.value.payment_method && availablePaymentMethods.value.some((m) => m.id === form.value.payment_method)) return;

  const nonCod = availablePaymentMethods.value.find((m) => !isCodMethod(m.id));
  form.value.payment_method = nonCod?.id || availablePaymentMethods.value[0].id;
};

watch(availablePaymentMethods, setDefaultPaymentMethod, { immediate: true });

const fetchConsultation = async () => {
  loading.value = true;
  try {
    const response = await api.get(`/api/service-consultations/${consultationId.value}`);
    consultation.value = response.data?.data || response.data;

    if (isConversationClosed.value) {
      toast.error('Percakapan sudah dihentikan atau penawaran sudah tidak aktif.');
      router.push(`/customer/consultations/${consultationId.value}`);
      return;
    }

    if (isPaid.value) {
      toast.info('Pembayaran untuk konsultasi ini sudah berhasil.');
      router.push(`/customer/consultations/${consultationId.value}`);
      return;
    }

    form.value.customer_name = authStore.user?.name || authStore.user?.full_name || '';
    form.value.customer_phone = authStore.user?.phone || authStore.user?.no_telp || '';
    form.value.booking_note = consultation.value?.customer_note || consultation.value?.customer_description || '';

    if (isOnlineService.value) {
      form.value.customer_address = 'Online';
    } else if (isMerchantPlaceService.value) {
      form.value.customer_address = merchantAddress.value;
    }

    setDefaultPaymentMethod();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal memuat data konsultasi');
    router.back();
  } finally {
    loading.value = false;
  }
};

const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.display_name) {
      return data.display_name;
    }

    if (data.address) {
      const address = data.address;

      const parts = [
        address.road,
        address.neighbourhood,
        address.suburb,
        address.village || address.town || address.city,
        address.county,
        address.state,
        address.postcode,
        address.country,
      ].filter(Boolean);

      if (parts.length) {
        return parts.join(', ');
      }
    }

    return null;
  } catch (error) {
    console.error('[CustomerConsultationCheckout] Reverse geocode error:', error);
    return null;
  }
};

const requestDeviceLocation = () => {
  if (!navigator.geolocation) {
    toast.warning('Perangkat tidak mendukung GPS');
    return;
  }

  locating.value = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      coordinates.value.latitude = latitude;
      coordinates.value.longitude = longitude;

      const address = await reverseGeocode(latitude, longitude);

      if (address) {
        form.value.customer_address = address;
        toast.success('Lokasi berhasil terdeteksi dan alamat terisi otomatis');
      } else {
        form.value.customer_address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        toast.success('Koordinat berhasil diambil. Silakan lengkapi alamat secara manual');
      }

      locating.value = false;
    },
    (error) => {
      locating.value = false;

      if (error.code === 1) {
        toast.error('Izin lokasi ditolak. Silakan isi alamat secara manual.');
      } else if (error.code === 2) {
        toast.error('Lokasi tidak tersedia. Silakan isi alamat secara manual.');
      } else if (error.code === 3) {
        toast.error('Waktu mengambil lokasi habis. Silakan coba lagi.');
      } else {
        toast.error('Gagal mengambil lokasi');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};

const createInvoiceAndRedirect = async (orderId) => {
  const methodId = form.value.payment_method;

  if (isCodMethod(methodId)) {
    toast.success('Pesanan berhasil dibuat. Pembayaran dilakukan secara COD.');
    router.push(`/orders/${orderId}?type=jasa`);
    return;
  }

  const { data } = await api.post(`/api/payments/${orderId}/invoice`, {
    payment_method: 'xendit',
    payment_channel: methodId,
    channel_code: methodId,
  });

  const invoiceUrl = data?.data?.invoice_url;
  if (!invoiceUrl) {
    throw new Error('Invoice pembayaran tidak ditemukan');
  }

  toast.success('Invoice dibuat. Selesaikan pembayaran dalam 1 jam.');
  window.location.href = invoiceUrl;
};

const submitCheckout = async () => {
  if (submitting.value) return;

  if (!form.value.customer_name.trim()) {
    toast.error('Nama wajib diisi');
    return;
  }

  if (!form.value.customer_phone.trim()) {
    toast.error('No. HP wajib diisi');
    return;
  }

  if (isHomeService.value && !form.value.customer_address.trim()) {
    toast.error('Alamat layanan wajib diisi');
    return;
  }

  if (!form.value.payment_method) {
    toast.error('Pilih metode pembayaran terlebih dahulu');
    return;
  }

  submitting.value = true;
  try {
    const methodId = form.value.payment_method;
    const payload = {
      jasa_id: consultation.value?.jasa_id || service.value?.id,
      consultation_id: Number(consultationId.value),
      customer_name: form.value.customer_name,
      customer_phone: form.value.customer_phone,
      customer_address: form.value.customer_address || null,
      booking_date: null,
      booking_time: null,
      booking_note: form.value.booking_note || null,
      order_method: 'konsultasi',
      payment_method: isCodMethod(methodId) ? 'COD' : 'xendit',
      payment_channel: isCodMethod(methodId) ? null : methodId,
      channel_code: isCodMethod(methodId) ? null : methodId,
      subtotal: agreedPrice.value,
      total_price: totalPayment.value,
      latitude: coordinates.value.latitude,
      longitude: coordinates.value.longitude,
    };

    const response = await api.post('/api/jasa-orders', payload);
    const responseData = response.data?.data || response.data;
    const orderId = responseData?.order_id || responseData?.id;

    if (!orderId) {
      throw new Error('Order tidak ditemukan dalam response');
    }

    await createInvoiceAndRedirect(orderId);
  } catch (error) {
    toast.error(error.response?.data?.message || error.message || 'Gagal membuat pesanan');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await fetchPaymentFees();
  await fetchConsultation();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-28">
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center gap-3">
        <button
          type="button"
          @click="router.back()"
          class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div>
          <h1 class="text-base font-bold text-gray-900">Ringkasan Pesanan</h1>
          <p class="text-xs text-gray-500">Hasil konsultasi tanpa voucher dan tanpa jadwal booking</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <main v-else-if="consultation" class="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <div class="space-y-4">
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i class="pi pi-clipboard text-merchant-primary"></i>
            Detail Layanan
          </h2>
          <div class="flex gap-3">
            <div class="w-24 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
              <img :src="serviceImage" class="w-full h-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-900 line-clamp-2">{{ service?.title || consultation.service_name || 'Layanan' }}</p>
              <p class="text-xs text-gray-500 mt-1">
                <i class="pi pi-store mr-1"></i>{{ merchant?.name || 'Merchant' }}
              </p>
              <p class="text-xs text-gray-500 mt-2">Harga Penawaran</p>
              <p class="text-lg font-bold text-merchant-primary">{{ formatCurrency(agreedPrice) }}</p>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              <i class="pi pi-user text-merchant-primary"></i>
              Data Pemesan
            </h2>
            <button
              type="button"
              @click="useProfileContact"
              class="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            >
              Gunakan Profil
            </button>
          </div>
          <div class="space-y-3">
            <input
              v-model="form.customer_name"
              type="text"
              placeholder="Nama lengkap"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-merchant-primary/30"
            />
            <input
              v-model="form.customer_phone"
              type="tel"
              placeholder="Nomor HP"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-merchant-primary/30"
            />
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i class="pi pi-map-marker text-merchant-primary"></i>
            Alamat Layanan
          </h2>

          <div v-if="isOnlineService" class="p-3 rounded-xl bg-blue-50 text-blue-700 text-sm border border-blue-100">
            <i class="pi pi-globe mr-1"></i>Layanan dilakukan secara online.
          </div>

          <div v-else-if="isMerchantPlaceService" class="p-3 rounded-xl bg-gray-50 text-gray-700 text-sm border border-gray-100">
            <p>{{ merchantAddress || 'Alamat merchant belum tersedia' }}</p>
            <p class="text-xs text-gray-500 mt-1">Layanan dilakukan di tempat UMKM.</p>
          </div>

          <div v-else class="space-y-2">
            <textarea
              v-model="form.customer_address"
              rows="3"
              placeholder="Masukkan alamat lengkap layanan"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-merchant-primary/30"
            ></textarea>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                @click="useProfileAddress"
                class="px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
              >
                <i class="pi pi-home mr-1"></i>
                Ambil Alamat dari Profil
              </button>

              <button
                type="button"
                @click="requestDeviceLocation"
                :disabled="locating"
                class="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 disabled:opacity-60 hover:bg-emerald-100 transition"
              >
                <i :class="['pi', locating ? 'pi-spin pi-spinner' : 'pi-map-marker', 'mr-1']"></i>
                {{ locating ? 'Mengambil...' : 'Ambil Lokasi Perangkat' }}
              </button>
            </div>

            <p
              v-if="coordinates.latitude && coordinates.longitude"
              class="mt-1 text-xs text-gray-500"
            >
              <i class="pi pi-globe mr-1"></i>
              Koordinat: {{ Number(coordinates.latitude).toFixed(6) }},
              {{ Number(coordinates.longitude).toFixed(6) }}
            </p>
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i class="pi pi-comment text-merchant-primary"></i>
            Catatan
          </h2>
          <textarea
            v-model="form.booking_note"
            rows="3"
            placeholder="Catatan tambahan untuk merchant"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-merchant-primary/30"
          ></textarea>
        </section>
      </div>

      <aside class="space-y-4">
        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i class="pi pi-credit-card text-merchant-primary"></i>
            Metode Pembayaran
          </h2>

          <div class="space-y-2">
            <label
              v-for="method in availablePaymentMethods"
              :key="method.id"
              class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition"
              :class="form.payment_method === method.id ? 'border-merchant-primary bg-merchant-primary/5' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input v-model="form.payment_method" type="radio" :value="method.id" class="mt-1" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ method.name }}</p>
                <p class="text-xs text-gray-500">{{ method.description }}</p>
              </div>
            </label>
          </div>
        </section>

        <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 class="text-sm font-bold text-gray-900 mb-3">Rincian Pembayaran</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Harga layanan</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(agreedPrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Voucher</span>
              <span class="font-medium text-gray-400">Tidak tersedia</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Biaya admin</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(platformFee) }}</span>
            </div>
            <div class="border-t border-gray-100 pt-3 flex justify-between text-base font-bold">
              <span>Total</span>
              <span class="text-merchant-primary">{{ formatCurrency(totalPayment) }}</span>
            </div>
          </div>

          <div class="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-700">
            <i class="pi pi-clock mr-1"></i>
            Setelah invoice dibuat, pembayaran harus diselesaikan dalam 1 jam.
          </div>

          <button
            type="button"
            @click="submitCheckout"
            :disabled="submitting"
            class="w-full mt-4 py-3 rounded-xl bg-merchant-primary text-white text-sm font-bold hover:bg-merchant-primary/90 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <i :class="['pi', submitting ? 'pi-spin pi-spinner' : 'pi-send']"></i>
            {{ submitting ? 'Memproses...' : isCodMethod(form.payment_method) ? 'Buat Pesanan COD' : 'Lanjut Pembayaran' }}
          </button>
        </section>
      </aside>
    </main>
  </div>
</template>
