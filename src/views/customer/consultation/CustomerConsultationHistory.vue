<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const router = useRouter();
const toast = useToast();

const consultations = ref([]);
const loading = ref(false);
const activeFilter = ref('all');

// ─── Filter tabs with counts ───────────────────────────────────────────────────
const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'negosiasi', label: 'Negosiasi' },
  { key: 'selesai', label: 'Selesai' },
];

// Normalize backend status to frontend group filter
function normalizeConsultationStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  
  const groups = {
    menunggu: [
      'pending',
      'menunggu',
      'menunggu_respon',
      'menunggu_konfirmasi'
    ],
    negosiasi: [
      'perlu_penyesuaian',
      'penyesuaian',
      'negosiasi',
      'offer_sent',
      'penawaran_dikirim',
      'dapat_dikerjakan'
    ],
    selesai: [
      'accepted',
      'diterima',
      'selesai',
      'closed',
      'rejected',
      'ditolak',
      'offer_rejected',
      'penawaran_ditolak'
    ]
  };

  if (groups.menunggu.includes(s)) return 'menunggu';
  if (groups.negosiasi.includes(s)) return 'negosiasi';
  if (groups.selesai.includes(s)) return 'selesai';
  
  return 'menunggu'; // default fallback
}

// Get neat Indonesian status label
function getConsultationStatusLabel(status) {
  const s = String(status || '').toLowerCase().trim();
  const map = {
    pending: 'Menunggu Respon',
    menunggu: 'Menunggu Respon',
    menunggu_respon: 'Menunggu Respon',
    menunggu_konfirmasi: 'Menunggu Respon',
    
    perlu_penyesuaian: 'Perlu Penyesuaian',
    penyesuaian: 'Perlu Penyesuaian',
    negosiasi: 'Perlu Penyesuaian',
    
    offer_sent: 'Penawaran Dikirim',
    penawaran_dikirim: 'Penawaran Dikirim',
    dapat_dikerjakan: 'Penawaran Dikirim',
    
    accepted: 'Penawaran Diterima',
    diterima: 'Penawaran Diterima',
    
    rejected: 'Ditolak',
    ditolak: 'Ditolak',
    
    offer_rejected: 'Penawaran Ditolak',
    penawaran_ditolak: 'Penawaran Ditolak',
    
    closed: 'Selesai',
    selesai: 'Selesai'
  };
  
  return map[s] || status || '—';
}

// Get neat status badge background color & border
function getConsultationStatusBg(status) {
  const s = String(status || '').toLowerCase().trim();
  const map = {
    pending: 'bg-amber-50 text-amber-600 border border-amber-100',
    menunggu: 'bg-amber-50 text-amber-600 border border-amber-100',
    menunggu_respon: 'bg-amber-50 text-amber-600 border border-amber-100',
    menunggu_konfirmasi: 'bg-amber-50 text-amber-600 border border-amber-100',
    
    perlu_penyesuaian: 'bg-purple-50 text-purple-600 border border-purple-100',
    penyesuaian: 'bg-purple-50 text-purple-600 border border-purple-100',
    negosiasi: 'bg-purple-50 text-purple-600 border border-purple-100',
    offer_sent: 'bg-purple-50 text-purple-600 border border-purple-100',
    penawaran_dikirim: 'bg-purple-50 text-purple-600 border border-purple-100',
    dapat_dikerjakan: 'bg-purple-50 text-purple-600 border border-purple-100',
    
    accepted: 'bg-green-50 text-green-600 border border-green-100',
    diterima: 'bg-green-50 text-green-600 border border-green-100',
    selesai: 'bg-green-50 text-green-600 border border-green-100',
    closed: 'bg-green-50 text-green-600 border border-green-100',
    
    rejected: 'bg-red-50 text-red-600 border border-red-100',
    ditolak: 'bg-red-50 text-red-600 border border-red-100',
    offer_rejected: 'bg-red-50 text-red-600 border border-red-100',
    penawaran_ditolak: 'bg-red-50 text-red-600 border border-red-100',
  };
  
  return map[s] || 'bg-gray-50 text-gray-500 border border-gray-100';
}

const statusCounts = computed(() => {
  const counts = { all: consultations.value.length, menunggu: 0, negosiasi: 0, selesai: 0 };
  consultations.value.forEach(c => {
    const group = normalizeConsultationStatus(c.status);
    if (counts[group] !== undefined) {
      counts[group]++;
    }
  });
  return counts;
});

// ─── Status config ─────────────────────────────────────────────────────────────
const statusGroupConfig = {
  menunggu:  { label: 'Menunggu',   bg: 'bg-yellow-100 text-yellow-700' },
  negosiasi:  { label: 'Negosiasi',  bg: 'bg-purple-100 text-purple-700' },
  selesai:    { label: 'Selesai',    bg: 'bg-green-100 text-green-700' },
};

// ─── Price helpers ─────────────────────────────────────────────────────────────
const getInitialPrice = (c) =>
  c?.initial_price || c?.original_price || c?.service?.price || c?.service?.base_price
  || c?.service?.fixed_price || c?.jasa?.price || c?.jasa?.base_price || c?.jasa?.fixed_price || null;

const getOfferedPrice = (c) =>
  (normalizeConsultationStatus(c.status) === 'negosiasi' && c.merchant_offered_price) ? c.merchant_offered_price : null;

const getFinalPrice = (c) =>
  c?.final_price || (['accepted', 'diterima', 'selesai', 'closed'].includes(String(c?.status || '').toLowerCase()) ? c?.negotiated_price : null);

// ─── Format helpers ───────────────────────────────────────────────────────────
const formatCurrency = (value) => {
  if (!value) return null;
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
};

// ─── Status helpers ────────────────────────────────────────────────────────────
const getGroupLabel = (group) => statusGroupConfig[group]?.label || group || '—';
const getGroupBg   = (group) => statusGroupConfig[group]?.bg    || 'bg-gray-100 text-gray-600';

// ─── Computed: empty state message per tab ─────────────────────────────────────
const emptyMessages = {
  all:        { icon: 'pi-comments', title: 'Belum ada konsultasi', sub: 'Ajukan konsultasi dari detail layanan jasa' },
  menunggu:   { icon: 'pi-clock',   title: 'Tidak ada yang menunggu', sub: 'Konsultasi baru akan muncul di sini' },
  negosiasi:  { icon: 'pi-comments', title: 'Belum ada negosiasi', sub: 'Mulai negosiasi harga di halaman konsultasi' },
  selesai:    { icon: 'pi-check-circle', title: 'Belum ada yang selesai', sub: 'Konsultasi yang terselesaikan akan muncul di sini' },
};

const currentEmpty = computed(() => emptyMessages[activeFilter.value] || emptyMessages.all);
const showEmpty    = computed(() => !loading.value && consultations.value.length === 0);

const filteredConsultations = computed(() => {
  if (activeFilter.value === 'all') {
    return consultations.value;
  }
  return consultations.value.filter(c => normalizeConsultationStatus(c.status) === activeFilter.value);
});

const filteredEmpty = computed(() => {
  return filteredConsultations.value.length === 0;
});

// ─── API ───────────────────────────────────────────────────────────────────────
const fetchConsultations = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/api/service-consultations');
    consultations.value = data?.data?.data ?? data?.data ?? [];
  } catch (error) {
    toast.error('Gagal memuat data konsultasi');
  } finally {
    loading.value = false;
  }
};

const changeFilter = (key) => {
  activeFilter.value = key;
};

const openConsultation = (id) => {
  router.push(`/customer/consultations/${id}`);
};

onMounted(() => fetchConsultations());
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-12">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-[1080px] mx-auto">
        <div class="flex items-center gap-3">
          <router-link
            to="/"
            class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
          >
            <i class="pi pi-arrow-left text-sm"></i>
          </router-link>
          <div>
            <h1 class="text-base font-bold text-gray-900 leading-tight">Konsultasi Saya</h1>
            <p class="text-xs text-gray-500">Riwayat konsultasi layanan jasa</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-[1080px] mx-auto px-4 pt-4">

      <!-- Filter Tabs with counts -->
      <div class="bg-white rounded-2xl p-1.5 mb-4 flex gap-1">
        <button
          v-for="filter in filters"
          :key="filter.key"
          @click="changeFilter(filter.key)"
          class="flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          :class="activeFilter === filter.key
            ? 'bg-purple-500 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-50'"
        >
          {{ filter.label }}
          <span
            v-if="statusCounts[filter.key] !== undefined"
            class="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            :class="activeFilter === filter.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'"
          >
            {{ statusCounts[filter.key] }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        <p class="text-sm text-gray-500 mt-2">Memuat...</p>
      </div>

      <!-- Empty state per tab -->
      <div v-else-if="filteredEmpty" class="bg-white rounded-2xl px-6 py-14 text-center">
        <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <i :class="['pi', currentEmpty.icon, 'text-2xl text-gray-300']"></i>
        </div>
        <p class="text-sm font-semibold text-gray-500">{{ currentEmpty.title }}</p>
        <p class="text-xs text-gray-400 mt-1">{{ currentEmpty.sub }}</p>
      </div>

      <!-- Consultation Cards -->
      <div v-else class="space-y-2">
        <div
          v-for="consultation in filteredConsultations"
          :key="consultation.id"
          @click="openConsultation(consultation.id)"
          class="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-purple-200 hover:shadow-sm transition cursor-pointer"
        >
          <div class="px-4 py-3">
            <!-- Row 1: merchant + group badge -->
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-gray-500 truncate">
                <i class="pi pi-store text-[10px] mr-1"></i>
                {{ consultation.merchant?.name || consultation.merchant_name || 'Merchant' }}
              </p>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getGroupBg(normalizeConsultationStatus(consultation.status))]">
                {{ getGroupLabel(normalizeConsultationStatus(consultation.status)) }}
              </span>
            </div>

            <!-- Row 2: service title -->
            <p class="text-sm font-bold text-gray-900 leading-snug mt-1.5 line-clamp-2">
              {{ consultation.service_name || consultation.jasa?.title || 'Layanan Jasa' }}
            </p>

            <!-- Row 3: individual status + price -->
            <div class="flex items-center justify-between gap-3 mt-2">
              <!-- Status individual -->
              <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', getConsultationStatusBg(consultation.status)]">
                {{ getConsultationStatusLabel(consultation.status) }}
              </span>

              <!-- Price -->
              <div class="flex items-center gap-2 flex-wrap justify-end">
                <span v-if="getInitialPrice(consultation)" class="text-[11px] text-gray-500">
                  Awal: <span class="font-medium text-gray-700">{{ formatCurrency(getInitialPrice(consultation)) }}</span>
                </span>
                <span v-if="getOfferedPrice(consultation)" class="px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[10px] font-semibold text-purple-700">
                  Penawaran: {{ formatCurrency(getOfferedPrice(consultation)) }}
                </span>
                <span v-if="getFinalPrice(consultation)" class="px-1.5 py-0.5 bg-green-50 border border-green-100 rounded text-[10px] font-semibold text-green-700">
                  Kesepakatan: {{ formatCurrency(getFinalPrice(consultation)) }}
                </span>
              </div>
            </div>

            <!-- Row 4: description preview + footer -->
            <div class="flex items-center justify-between gap-3 mt-2">
              <p v-if="consultation.customer_description" class="text-xs text-gray-500 line-clamp-1 flex-1">
                "{{ consultation.customer_description }}"
              </p>
              <div v-else class="flex-1"></div>

              <div class="flex items-center gap-3 shrink-0">
                <span class="text-[11px] text-gray-400">
                  {{ formatDateTime(consultation.created_at) }}
                </span>
                <button
                  class="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                  @click.stop="openConsultation(consultation.id)"
                >
                  <i class="pi pi-arrow-right text-[10px]"></i>
                  Buka
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
