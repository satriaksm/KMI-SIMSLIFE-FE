<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Laporan Saya</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        Daftar laporan yang pernah Anda kirim
      </p>
    </div>

    <!-- Filter -->
    <div class="mb-6 flex gap-2 flex-wrap">
      <button
        v-for="status in statusFilters"
        :key="status.value"
        @click="selectedStatus = status.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          selectedStatus === status.value
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
      >
        {{ status.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Reports List -->
    <div v-else-if="filteredReports.length > 0" class="space-y-4">
      <div
        v-for="report in filteredReports"
        :key="report.id"
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        @click="viewReportDetail(report)"
      >
        <!-- Status Badge -->
        <div class="flex items-start justify-between mb-4">
          <span :class="getStatusBadgeClass(report.status)">
            {{ getStatusLabel(report.status) }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(report.created_at) }}
          </span>
        </div>

        <!-- Reportable Info -->
        <div class="mb-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Tipe: <span class="font-medium">{{ getTypeLabel(report.reportable_type) }}</span>
          </p>
          <p class="font-medium text-gray-900 dark:text-white mt-1">
            {{ report.reportable_name }}
          </p>
        </div>

        <!-- Reason -->
        <div class="mb-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Alasan: <span class="font-medium">{{ report.reason?.reason_title }}</span>
          </p>
        </div>

        <!-- Comment (if any) -->
        <div v-if="report.report_comment" class="mb-3">
          <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {{ report.report_comment }}
          </p>
        </div>

        <!-- Admin Note (if resolved/dismissed) -->
        <div v-if="report.admin_note && ['resolved', 'dismissed'].includes(report.status)" class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Catatan Admin:</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ report.admin_note }}</p>
        </div>

        <!-- View Details -->
        <div class="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
          <ChevronRight :size="16" />
          Lihat Detail
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
      <Flag :size="48" class="mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Tidak ada laporan
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        {{ selectedStatus === '' ? 'Anda belum pernah membuat laporan' : 'Tidak ada laporan dengan status ini' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Flag, ChevronRight } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const toast = useToast();
const router = useRouter();

// State
const reports = ref([]);
const isLoading = ref(true);
const selectedStatus = ref('');

const statusFilters = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'in_review', label: 'Ditinjau' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'dismissed', label: 'Ditolak' },
];

// Computed
const filteredReports = computed(() => {
  if (!selectedStatus.value) return reports.value;
  return reports.value.filter((r) => r.status === selectedStatus.value);
});

// Methods
const fetchReports = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/api/reports/my');
    reports.value = response.data?.data || response.data?.items || [];
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    toast.error('Gagal memuat laporan');
  } finally {
    isLoading.value = false;
  }
};

const viewReportDetail = (report) => {
  router.push({ name: 'Report Detail', params: { id: report.id } });
};

const getStatusBadgeClass = (status) => {
  const classes = {
    pending: 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    in_review: 'px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    resolved: 'px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dismissed: 'px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  return classes[status] || classes.pending;
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Menunggu Peninjauan',
    in_review: 'Sedang Ditinjau',
    resolved: 'Diselesaikan',
    dismissed: 'Ditolak',
  };
  return labels[status] || status;
};

const normalizeType = (type) => {
  if (!type) return type;
  const raw = type.split('\\').pop();
  const lower = raw.toLowerCase();
  if (lower === 'communitypost') return 'post';
  if (lower === 'postcomment') return 'post_comment';
  if (lower === 'jasa') return 'service';
  return lower;
};

const getTypeLabel = (type) => {
  const labels = {
    product: 'Produk',
    service: 'Jasa',
    merchant: 'Merchant',
    post: 'Postingan',
    post_comment: 'Komentar',
    user: 'Pengguna',
  };
  return labels[normalizeType(type)] || type;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchReports();
});
</script>
