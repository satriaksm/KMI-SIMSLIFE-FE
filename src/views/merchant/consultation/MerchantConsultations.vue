<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import MerchantPageHeader from '@/components/merchant/MerchantPageHeader.vue';
import api from '@/libs/axios';

const emit = defineEmits(['toggle-sidebar']);

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
  <div class="min-h-screen bg-[#f6f7fb] pb-20">
    <MerchantPageHeader
      title="Konsultasi"
      subtitle="Permintaan konsultasi pelanggan"
      :show-menu-button="true"
      :show-back-button="true"
      :back-to="`/merchant-center/${merchantSlug}/dashboard`"
      @toggle-sidebar="emit('toggle-sidebar')"
    />

    <!-- Main Content -->
    <main class="merchant-page-content">
      <div class="space-y-4">
        <!-- Filter Tabs -->
        <div class="tabs-container rounded-3xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
          <button
            v-for="filter in filters"
            :key="filter.key"
            @click="changeFilter(filter.key)"
            class="tab-button flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition"
            :class="
              activeFilter === filter.key
                ? 'bg-[#A855F7] text-white shadow-[0_10px_24px_rgba(168,85,247,0.28)]'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            "
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="rounded-3xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
          <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
          <p class="mt-2 text-gray-500">Memuat...</p>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="consultations.length === 0"
          class="rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-gray-100"
        >
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <i class="pi pi-comments text-4xl"></i>
          </div>
          <p class="text-lg font-semibold text-gray-700">Belum ada konsultasi</p>
          <p class="mt-2 text-sm text-gray-400">Permintaan konsultasi dari pelanggan akan muncul di sini</p>
        </div>

        <!-- Consultation List -->
        <div v-else class="space-y-4">
          <router-link
            v-for="consultation in consultations"
            :key="consultation.id"
            :to="`/merchant-center/${merchantSlug}/consultations/${consultation.id}`"
            class="block overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
          >
            <div class="p-4 sm:p-5">
              <div class="flex items-start gap-4">
                <!-- Service Image -->
                <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    :src="consultation.jasa?.cover_img?.url || consultation.jasa?.cover_img?.src_url || '/placeholder.png'"
                    class="h-full w-full object-cover"
                    @error="(e) => { if (!e.target.dataset.errored) { e.target.dataset.errored = 'true'; e.target.src = '/placeholder.png'; } }"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="line-clamp-2 text-sm font-semibold text-gray-900">
                        {{ consultation.jasa?.title || consultation.service_name || 'Layanan Jasa' }}
                      </p>
                      <p class="mt-1 text-xs text-gray-500">
                        <i class="pi pi-user mr-1"></i>
                        {{ consultation.customer?.name || consultation.customer_name || 'Pelanggan' }}
                      </p>
                    </div>
                    <!-- Status group badge -->
                    <span
                      :class="['shrink-0 rounded-full px-3 py-1 text-xs font-semibold', getStatusGroupColor(consultation.status_group)]"
                    >
                      {{ getStatusGroupLabel(consultation.status_group) }}
                    </span>
                  </div>

                  <!-- Description Preview -->
                  <p v-if="consultation.customer_description" class="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-600">
                    "{{ consultation.customer_description }}"
                  </p>

                  <!-- Price info if responded -->
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <span v-if="getConsultationInitialPrice(consultation)" class="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                      Awal: {{ formatCurrency(getConsultationInitialPrice(consultation)) }}
                    </span>
                    <span v-if="getConsultationFinalPrice(consultation)" class="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Kesepakatan: {{ formatCurrency(getConsultationFinalPrice(consultation)) }}
                    </span>
                    <span v-else-if="consultation.merchant_offered_price && consultation.status !== 'accepted'" class="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      Ditawarkan: {{ formatCurrency(consultation.merchant_offered_price) }}
                    </span>
                  </div>

                  <!-- Notes count -->
                  <div v-if="consultation.notes?.length > 0" class="mt-3 text-xs text-gray-500">
                    <i class="pi pi-comment mr-1"></i>
                    {{ consultation.notes.length }} pesan
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span class="text-xs text-gray-400">
                  {{ formatDateTime(consultation.created_at) }}
                </span>
                <span class="text-xs font-semibold text-purple-500">
                  <i class="pi pi-arrow-right mr-1"></i>
                  Buka Chat
                </span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.merchant-page-content {
  width: 100%;
  max-width: none;
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

@media (max-width: 640px) {
  .merchant-page-content {
    padding: 0 16px 16px;
  }

  .tab-button {
    min-width: 112px;
    height: 48px;
  }
}
</style>