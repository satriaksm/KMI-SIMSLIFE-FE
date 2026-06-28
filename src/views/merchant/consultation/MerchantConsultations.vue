<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';
import TextField from '@/components/forms/TextField.vue';
import Button from '@/components/common/Button.vue';
import ResponsiveModal from '@/components/common/ResponsiveModal.vue';
import Breadcrumb from '@/components/merchant/Breadcrumb.vue';
import MobilePagination from '@/components/common/MobilePagination.vue';
import { formatDate, formatTime } from '@/libs/format.js';

const emit = defineEmits(['toggle-sidebar']);

const route = useRoute();
const router = useRouter();
const toast = useToast();

const merchantSlug = computed(() => route.params.merchantSlug);

const breadcrumbItems = computed(() => [{ label: "Konsultasi" }]);

// States
const consultations = ref([]);
const loading = ref(false);
const activeFilter = ref('all');

// Filter & Sort State
const showFilterModal = ref(false);
const filters = ref({
  sort_by: 'newest', // newest, oldest, date, price
  date_from: '',
  date_to: '',
  min_price: '',
  max_price: ''
});
const currentPage = ref(1);
const totalPages = ref(1);
const paginationInfo = ref({
  start: 0,
  end: 0,
  total: 0,
  per_page: 10
});

// Sort options
const sortOptions = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'date', label: 'Tanggal' },
  { value: 'price', label: 'Harga' },
];

// Filter tabs - simplified for merchant
const filterTabs = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'waiting_customer', label: 'Menunggu Customer' },
  { key: 'accepted', label: 'Disepakati' },
  { key: 'rejected', label: 'Ditolak' },
];

// Status config - simplified labels for merchant
const statusConfig = {
  // Pending - waiting for merchant response
  'pending': { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  'menunggu': { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },

  // Waiting Customer - merchant sent offer, waiting for customer response
  'dapat_dikerjakan': { label: 'Menunggu Customer', color: 'bg-blue-100 text-blue-700' },
  'perlu_penyesuaian': { label: 'Menunggu Customer', color: 'bg-blue-100 text-blue-700' },
  'penyesuaian': { label: 'Menunggu Customer', color: 'bg-blue-100 text-blue-700' },
  'offer_sent': { label: 'Menunggu Customer', color: 'bg-blue-100 text-blue-700' },

  // Rejected - closed/rejected consultations
  'ditolak': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  'rejected': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  'penawaran_ditolak': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  'offer_rejected': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  'closed': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  'ditutup': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },

  // Accepted - customer accepted the offer
  'accepted': { label: 'Disepakati', color: 'bg-green-100 text-green-700' },
  'disepakati': { label: 'Disepakati', color: 'bg-green-100 text-green-700' },
  'selesai': { label: 'Disepakati', color: 'bg-green-100 text-green-700' },
};

const getStatusLabel = (status) => statusConfig[status]?.label || status || '—';
const getStatusColor = (status) => statusConfig[status]?.color || 'bg-gray-100 text-gray-700';

// Status groups for filtering
const statusGroups = {
  pending: ['pending', 'menunggu'],
  waiting_customer: ['dapat_dikerjakan', 'perlu_penyesuaian', 'penyesuaian', 'offer_sent', 'bisa_dikerjakan'],
  accepted: ['accepted', 'disepakati', 'selesai'],
  rejected: ['ditolak', 'rejected', 'penawaran_ditolak', 'offer_rejected', 'closed', 'ditutup'],
};

// Helper function to get customer name from various sources
const getCustomerName = (consultation) => {
  return consultation?.customer?.name
    || consultation?.customer_name
    || consultation?.user?.name
    || consultation?.customer?.full_name
    || 'Pelanggan';
};

// Helper function to get customer phone from various sources
const getCustomerPhone = (consultation) => {
  return consultation?.customer?.phone
    || consultation?.customer_phone
    || consultation?.user?.phone
    || '';
};

// Price helpers
const getStartingPrice = (consultation) => {
  return consultation?.initial_price
    || consultation?.original_price
    || consultation?.jasa_order_item?.jasa?.base_price
    || consultation?.jasa_order_item?.jasa?.price
    || consultation?.jasa?.base_price
    || consultation?.jasa?.price
    || consultation?.jasa?.fixed_price
    || null;
};

const getOfferedPrice = (consultation) => {
  return consultation?.merchant_offered_price
    || consultation?.offered_price
    || consultation?.proposed_price
    || null;
};

const getFinalPrice = (consultation) => {
  return consultation?.final_price
    || consultation?.agreed_price
    || consultation?.deal_price
    || consultation?.negotiated_price
    || null;
};

// Legacy price helper (kept for compatibility)
const getConsultationPrice = (consultation) => {
  return getStartingPrice(consultation);
};

const formatCurrency = (value) => {
  if (!value) return null;
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

// Helper functions for accessing nested data
const getJasaTitle = (consultation) => {
  // Primary: dari jasa_order_item.jasa.title (struktur baru)
  const title = consultation?.jasa_order_item?.jasa?.title;
  if (title) return title;

  // Fallback: dari jasa langsung
  return consultation?.jasa?.title || consultation?.service_name || 'Layanan';
};

const getJasaImage = (consultation) => {
  // Primary: dari service_image (dari backend)
  const serviceImage = consultation?.service_image;
  if (serviceImage) {
    if (serviceImage.startsWith('http')) return serviceImage;
    return `/storage/${serviceImage}`;
  }

  // Fallback: dari jasa_order_item.jasa.image (struktur baru)
  const image = consultation?.jasa_order_item?.jasa?.image;
  if (image) {
    if (image.startsWith('http')) return image;
    return `/storage/${image}`;
  }

  // Fallback: dari jasa.cover_img (struktur baru dengan polymorphic)
  const coverImg = consultation?.jasa?.cover_img?.url;
  if (coverImg) {
    if (coverImg.startsWith('http')) return coverImg;
    return `/storage/${coverImg}`;
  }

  // Fallback: dari jasa.image_url (jasa accessor)
  const imageUrl = consultation?.jasa?.image_url;
  if (imageUrl) {
    if (imageUrl.startsWith('http')) return imageUrl;
    return `/storage/${imageUrl}`;
  }

  // Fallback: dari jasa.image (legacy)
  const legacyImage = consultation?.jasa?.image;
  if (legacyImage) {
    if (legacyImage.startsWith('http')) return legacyImage;
    return `/storage/${legacyImage}`;
  }

  return '/placeholder.png';
};

// Fetch consultations
const fetchConsultations = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      per_page: paginationInfo.value.per_page,
      sort_by: filters.value.sort_by,
    };

    // Only send status_group if not "all"
    if (activeFilter.value !== 'all') {
      params.status_group = activeFilter.value;
    }

    // Date filters
    if (filters.value.date_from) {
      params.date_from = filters.value.date_from;
    }
    if (filters.value.date_to) {
      params.date_to = filters.value.date_to;
    }

    // Price filters
    if (filters.value.min_price) {
      params.min_price = filters.value.min_price;
    }
    if (filters.value.max_price) {
      params.max_price = filters.value.max_price;
    }

    console.log('[fetchConsultations] Params:', params);

    const { data } = await api.get(`/api/merchant/${merchantSlug.value}/service-consultations`, { params });

    const responseData = data?.data || data;
    let consultationsArray = [];

    if (Array.isArray(responseData)) {
      consultationsArray = responseData;
      totalPages.value = 1;
      currentPage.value = 1;
      paginationInfo.value = {
        start: 1,
        end: consultationsArray.length,
        total: consultationsArray.length,
        per_page: paginationInfo.value.per_page
      };
    } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      // Paginated response
      consultationsArray = Array.isArray(responseData.data) ? responseData.data : [];
      totalPages.value = responseData.last_page || 1;
      currentPage.value = responseData.current_page || 1;
      paginationInfo.value = {
        start: responseData.from || 1,
        end: responseData.to || consultationsArray.length,
        total: responseData.total || consultationsArray.length,
        per_page: responseData.per_page || 10
      };
    } else {
      consultationsArray = [];
    }

    // Frontend fallback filter - ensure we show correct statuses even if backend doesn't filter properly
    if (activeFilter.value !== 'all') {
      const allowedStatuses = statusGroups[activeFilter.value] || [activeFilter.value];
      const beforeFilter = consultationsArray.length;
      consultationsArray = consultationsArray.filter((item) =>
        allowedStatuses.includes(item.status)
      );
      console.log('[fetchConsultations] Frontend filter:', {
        filter: activeFilter.value,
        allowedStatuses,
        before: beforeFilter,
        after: consultationsArray.length
      });
    }

    consultations.value = consultationsArray;

    // Debug logs
    console.log('[fetchConsultations] Response:', data);
    console.log('CONSULTATION DATA:', responseData);
    console.log('STATUSES FOUND:', [...new Set(consultationsArray.map(c => c.status))]);
    console.log('CUSTOMER DATA:', consultationsArray.map(c => ({
      id: c.id,
      status: c.status,
      customer_name: c.customer_name,
      customer: c.customer,
    })));
    console.log('[fetchConsultations] Loaded:', consultationsArray.length);
  } catch (error) {
    console.error('[fetchConsultations] Error:', error);
    console.error('[fetchConsultations] Response:', error.response?.data);
    toast.error('Gagal memuat data konsultasi');
  } finally {
    loading.value = false;
  }
};

// Filter actions
function openFilterModal() {
  showFilterModal.value = true;
}

function applyFilters() {
  // Validate date range
  if (filters.value.date_from && filters.value.date_to) {
    const from = new Date(filters.value.date_from);
    const to = new Date(filters.value.date_to);
    if (from > to) {
      toast.error('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      return;
    }
  }

  // Validate price range
  const minPrice = Number(filters.value.min_price);
  const maxPrice = Number(filters.value.max_price);
  if (filters.value.min_price && filters.value.max_price && minPrice > maxPrice) {
    toast.error('Harga minimum tidak boleh lebih besar dari harga maksimum');
    return;
  }

  console.log('[applyFilters] Applying filters:', filters.value);
  currentPage.value = 1;
  fetchConsultations();
  showFilterModal.value = false;
}

function resetFilters() {
  console.log('[resetFilters] Resetting filters');
  filters.value = {
    sort_by: 'newest',
    date_from: '',
    date_to: '',
    min_price: '',
    max_price: ''
  };
  currentPage.value = 1;
  fetchConsultations();
  showFilterModal.value = false;
}

// Filter change
const changeFilter = (filter) => {
  activeFilter.value = filter;
  currentPage.value = 1;
  fetchConsultations();
};

// Pagination
const handlePageChange = (page) => {
  currentPage.value = page;
  fetchConsultations();
};

// Go to detail
const goToDetail = (consultation) => {
  router.push(`/merchant-center/${merchantSlug.value}/consultations/${consultation.id}`);
};

// On mount
onMounted(() => {
  fetchConsultations();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 border-b border-gray-100 sm:border-0"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-gray-100 sm:hidden"
        >
          <i class="pi pi-bars text-gray-500"></i>
        </button>
        <div>
          <!-- Desktop: Show breadcrumb -->
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="merchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-gray-500">
              Kelola konsultasi pelanggan
            </p>
          </div>

          <!-- Mobile: Show simple title -->
          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-purple-600">
              Konsultasi
            </h1>
            <p class="text-xs text-gray-500">
              Permintaan konsultasi
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 sm:gap-3 items-center">
      </div>
    </div>

    <!-- Mobile Header Spacer -->
    <div class="h-24 sm:h-0"></div>

    <div class="px-4 py-0 space-y-2 sm:px-6 sm:py-6">
      <!-- STICKY WRAPPER -->
      <div class="z-10 top-[88px] sm:top-0 bg-gray-50 pt-0 pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 space-y-2">

        <!-- Filter Tabs -->
        <div class="overflow-x-auto bg-white shadow-sm rounded-xl no-scrollbar">
          <div class="flex min-w-max sm:min-w-0">
            <button
              v-for="tab in filterTabs"
              :key="tab.key"
              @click="changeFilter(tab.key)"
              :class="[
                'relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition whitespace-nowrap border-b-2',
                activeFilter === tab.key
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700 border-transparent',
              ]"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Search + Filter -->
        <div class="flex items-center gap-2">
          <TextField
            name="search"
            placeholder="Cari konsultasi..."
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
              v-if="filters.sort_by !== 'newest'"
              class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-purple-600"
            >
              !
            </span>
          </button>
        </div>
      </div>

      <!-- Consultation List - Desktop -->
      <div class="hidden sm:block">
        <div class="bg-white shadow-sm rounded-xl overflow-hidden">
          <!-- Table Header -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Layanan</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <!-- Loading -->
                <tr v-if="loading">
                  <td colspan="7" class="px-4 py-12 text-center">
                    <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                    <p class="mt-2 text-sm text-gray-500">Memuat...</p>
                  </td>
                </tr>
                <!-- Empty -->
                <tr v-else-if="!consultations.length">
                  <td colspan="7" class="px-4 py-12 text-center">
                    <div class="flex flex-col items-center">
                      <i class="pi pi-comments text-3xl text-gray-300 mb-3"></i>
                      <p class="text-sm text-gray-500">Belum ada konsultasi</p>
                    </div>
                  </td>
                </tr>
                <!-- Data -->
                <template v-else>
                  <tr
                    v-for="consultation in consultations"
                    :key="consultation.id"
                    class="hover:bg-gray-50 cursor-pointer transition"
                    @click="goToDetail(consultation)"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          <img
                            :src="getJasaImage(consultation)"
                            class="w-full h-full object-cover"
                            @error="(e) => e.target.src = '/placeholder.png'"
                          />
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                            {{ getJasaTitle(consultation) }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <p class="text-sm text-gray-800">{{ getCustomerName(consultation) }}</p>
                      <p class="text-xs text-gray-400">{{ getCustomerPhone(consultation) }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <p class="text-sm text-gray-600 line-clamp-2 max-w-[250px]">
                        {{ consultation.customer_description || '-' }}
                      </p>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="space-y-1">
                        <p v-if="getStartingPrice(consultation)" class="text-sm font-semibold text-gray-800">
                          {{ formatCurrency(getStartingPrice(consultation)) }}
                        </p>
                        <p v-if="getOfferedPrice(consultation)" class="text-xs text-purple-600">
                          Penawaran: {{ formatCurrency(getOfferedPrice(consultation)) }}
                        </p>
                        <p v-if="getFinalPrice(consultation)" class="text-xs text-green-600 font-medium">
                          Kesepakatan: {{ formatCurrency(getFinalPrice(consultation)) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <p class="text-sm text-gray-700">{{ formatDate(consultation.created_at) }}</p>
                      <p class="text-xs text-gray-400">{{ formatTime(consultation.created_at) }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <span :class="['inline-block px-2.5 py-1 rounded-full text-xs font-medium', getStatusColor(consultation.status)]">
                        {{ getStatusLabel(consultation.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3" @click.stop>
                      <Button variant="merchant" size="sm" @click="goToDetail(consultation)">
                        Detail
                      </Button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="consultations.length > 0" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
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

      <!-- Consultation List - Mobile -->
      <div class="sm:hidden space-y-3">
        <!-- Loading -->
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl animate-pulse">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div class="flex-1 space-y-2">
                <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div class="h-3 w-full bg-gray-200 rounded"></div>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!consultations.length"
          class="p-10 text-center bg-white border border-gray-100 shadow-sm rounded-2xl"
        >
          <div class="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full">
            <i class="pi pi-comments text-gray-400"></i>
          </div>
          <p class="text-sm font-medium text-gray-900">Belum ada konsultasi</p>
          <p class="text-xs text-gray-500 mt-1">Permintaan konsultasi akan muncul di sini</p>
        </div>

        <!-- Data -->
        <div
          v-else
          v-for="consultation in consultations"
          :key="consultation.id"
          class="p-4 bg-white border border-gray-100 shadow-sm cursor-pointer rounded-2xl active:bg-gray-50"
          @click="goToDetail(consultation)"
        >
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
              <img
                :src="getJasaImage(consultation)"
                class="w-full h-full object-cover"
                @error="(e) => e.target.src = '/placeholder.png'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold text-gray-800 truncate">
                  {{ getJasaTitle(consultation) }}
                </p>
                <span :class="['shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(consultation.status)]">
                  {{ getStatusLabel(consultation.status) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">
                <i class="pi pi-user mr-1"></i>
                {{ getCustomerName(consultation) }}
              </p>
              <p v-if="consultation.customer_description" class="text-xs text-gray-400 mt-1 line-clamp-2">
                "{{ consultation.customer_description }}"
              </p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-gray-400">
                  {{ formatDate(consultation.created_at) }}
                </span>
                <div class="text-right">
                  <span v-if="getStartingPrice(consultation)" class="text-sm font-semibold text-gray-800">
                    {{ formatCurrency(getStartingPrice(consultation)) }}
                  </span>
                  <span v-if="getOfferedPrice(consultation)" class="block text-xs text-purple-600">
                    Penawaran: {{ formatCurrency(getOfferedPrice(consultation)) }}
                  </span>
                  <span v-if="getFinalPrice(consultation)" class="block text-xs text-green-600 font-medium">
                    Deal: {{ formatCurrency(getFinalPrice(consultation)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->
      <div
        v-if="!loading && consultations.length > 0"
        class="pb-4 sm:hidden"
      >
        <MobilePagination
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan"
      show-footer
      @close="showFilterModal = false"
    >
      <div class="space-y-6">
        <!-- Sort Section -->
        <div class="pt-2 space-y-4">
          <h3 class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase">
            <i class="pi pi-sort-alt text-purple-600"></i>
            Urutkan Berdasarkan
          </h3>

          <!-- Sort Options -->
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              @click="filters.sort_by = option.value"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg flex items-center justify-center gap-2"
              :class="
                filters.sort_by === option.value
                  ? 'border-purple-600 bg-purple-50 text-purple-600'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              "
            >
              <i v-if="option.value === 'newest'" class="pi pi-sort-amount-down-alt text-xs"></i>
              <i v-else-if="option.value === 'oldest'" class="pi pi-sort-amount-up text-xs"></i>
              <i v-else-if="option.value === 'date'" class="pi pi-calendar text-xs"></i>
              <i v-else-if="option.value === 'price'" class="pi pi-tag text-xs"></i>
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Date Filter (shown when date sort is selected) -->
        <div v-if="filters.sort_by === 'date'" class="space-y-4">
          <h3 class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase">
            <i class="pi pi-calendar text-purple-600"></i>
            Filter Tanggal
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Dari Tanggal</label>
              <input
                v-model="filters.date_from"
                type="date"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Sampai Tanggal</label>
              <input
                v-model="filters.date_to"
                type="date"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        <!-- Price Filter (shown when price sort is selected) -->
        <div v-if="filters.sort_by === 'price'" class="space-y-4">
          <h3 class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase">
            <i class="pi pi-tag text-purple-600"></i>
            Filter Harga
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Harga Minimum</label>
              <input
                v-model="filters.min_price"
                type="number"
                placeholder="Contoh: 50000"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Harga Maksimum</label>
              <input
                v-model="filters.max_price"
                type="number"
                placeholder="Contoh: 200000"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
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
</style>