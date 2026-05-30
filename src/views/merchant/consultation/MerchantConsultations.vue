<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const route = useRoute();
const toast = useToast();

const merchantSlug = computed(() => route.params.merchantSlug);

// States
const consultations = ref([]);
const loading = ref(false);
const activeFilter = ref('all');

// Status group config (simplified)
const statusGroupConfig = {
  menunggu: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  negosiasi: { label: 'Negosiasi', color: 'bg-purple-100 text-purple-700' },
  selesai: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
};

// Filter tabs (simple: Semua, Menunggu, Negosiasi, Selesai)
const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'negosiasi', label: 'Negosiasi' },
  { key: 'selesai', label: 'Selesai' },
];

// Price helpers
const getConsultationInitialPrice = (consultation) => {
  return consultation?.initial_price
    || consultation?.original_price
    || consultation?.service?.price
    || consultation?.service?.base_price
    || consultation?.service?.fixed_price
    || consultation?.jasa?.price
    || consultation?.jasa?.base_price
    || consultation?.jasa?.fixed_price
    || null;
};

const getConsultationFinalPrice = (consultation) => {
  return consultation?.final_price
    || (consultation?.status === 'accepted' ? consultation?.negotiated_price : null)
    || null;
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

const formatCurrency = (value) => {
  if (!value) return null;
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

const getStatusGroupLabel = (group) => statusGroupConfig[group]?.label || group || '—';
const getStatusGroupColor = (group) => statusGroupConfig[group]?.color || 'bg-gray-100 text-gray-700';

const fetchConsultations = async (statusGroup = null) => {
  loading.value = true;
  try {
    const params = statusGroup && statusGroup !== 'all' ? { status_group: statusGroup } : {};
    const { data } = await api.get(`/api/merchant/${merchantSlug.value}/service-consultations`, { params });
    const responseData = data?.data;
    if (Array.isArray(responseData)) {
      consultations.value = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
      consultations.value = responseData.data;
    } else {
      consultations.value = [];
    }
  } catch (error) {
    console.error('Gagal memuat konsultasi:', error);
    toast.error('Gagal memuat data konsultasi');
  } finally {
    loading.value = false;
  }
};

const changeFilter = (filter) => {
  activeFilter.value = filter;
  fetchConsultations(filter);
};

onMounted(() => {
  fetchConsultations();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3">
          <router-link
            :to="`/merchant-center/${merchantSlug}/dashboard`"
            class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
          >
            <i class="pi pi-arrow-left"></i>
          </router-link>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Konsultasi</h1>
            <p class="text-xs text-gray-500">Permintaan konsultasi pelanggan</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-4">
      <!-- Filter Tabs -->
      <div class="bg-white rounded-2xl p-2 mb-4 flex gap-2 overflow-x-auto">
        <button
          v-for="filter in filters"
          :key="filter.key"
          @click="changeFilter(filter.key)"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap"
          :class="
            activeFilter === filter.key
              ? 'bg-purple-500 text-white shadow-md'
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
        v-else-if="consultations.length === 0"
        class="bg-white rounded-2xl p-8 text-center"
      >
        <i class="pi pi-comments text-5xl text-gray-300 mb-3"></i>
        <p class="text-gray-500">Belum ada konsultasi</p>
        <p class="text-sm text-gray-400 mt-1">
          Permintaan konsultasi dari pelanggan akan muncul di sini
        </p>
      </div>

      <!-- Consultation List -->
      <div v-else class="space-y-4">
        <router-link
          v-for="consultation in consultations"
          :key="consultation.id"
          :to="`/merchant-center/${merchantSlug}/consultations/${consultation.id}`"
          class="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-purple-200 transition"
        >
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Service Image -->
              <div class="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  :src="consultation.jasa?.cover_img?.url || consultation.jasa?.cover_img?.src_url || '/placeholder.png'"
                  class="object-cover w-full h-full"
                  @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/placeholder.png'; } }"
                />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 line-clamp-2">
                      {{ consultation.jasa?.title || consultation.service_name || 'Layanan Jasa' }}
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      <i class="pi pi-user mr-1"></i>
                      {{ consultation.customer?.name || consultation.customer_name || 'Pelanggan' }}
                    </p>
                  </div>
                  <!-- Status group badge -->
                  <span
                    :class="['px-2.5 py-1 rounded-full text-xs font-medium shrink-0', getStatusGroupColor(consultation.status_group)]"
                  >
                    {{ getStatusGroupLabel(consultation.status_group) }}
                  </span>
                </div>

                <!-- Description Preview -->
                <p v-if="consultation.customer_description" class="mt-2 text-xs text-gray-600 line-clamp-2">
                  "{{ consultation.customer_description }}"
                </p>

                <!-- Price info if responded -->
                <div class="mt-2 flex items-center gap-2 flex-wrap">
                  <span v-if="getConsultationInitialPrice(consultation)" class="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-600">
                    Awal: {{ formatCurrency(getConsultationInitialPrice(consultation)) }}
                  </span>
                  <span v-if="getConsultationFinalPrice(consultation)" class="px-2 py-0.5 bg-green-50 border border-green-100 rounded-full text-xs font-medium text-green-700">
                    Kesepakatan: {{ formatCurrency(getConsultationFinalPrice(consultation)) }}
                  </span>
                  <span v-else-if="consultation.merchant_offered_price && consultation.status !== 'accepted'" class="px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-full text-xs font-medium text-purple-700">
                    Ditawarkan: {{ formatCurrency(consultation.merchant_offered_price) }}
                  </span>
                </div>

                <!-- Notes count -->
                <div v-if="consultation.notes?.length > 0" class="mt-2 text-xs text-gray-500">
                  <i class="pi pi-comment mr-1"></i>
                  {{ consultation.notes.length }} pesan
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs text-gray-400">
                {{ formatDateTime(consultation.created_at) }}
              </span>
              <span class="text-xs text-purple-500 font-medium">
                <i class="pi pi-arrow-right mr-1"></i>
                Buka Chat
              </span>
            </div>
          </div>
        </router-link>
      </div>
    </main>
  </div>
</template>