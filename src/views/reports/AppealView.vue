<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
        <ShieldAlert class="w-8 h-8 text-red-500" />
        Detail Laporan Moderasi
      </h1>
      <button @click="$router.push('/')" class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
        <ArrowLeft class="w-4 h-4" />
        Kembali
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="bg-white rounded-2xl p-6 md:p-8 animate-pulse shadow-sm border border-gray-100">
      <div class="h-8 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>

    <!-- Report Details -->
    <div v-else-if="report" class="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
      
      <!-- Alert Box -->
      <div class="flex flex-col sm:flex-row items-start gap-4 p-5 mb-8 bg-red-50 border border-red-200 rounded-xl">
        <div class="flex-shrink-0 p-2 bg-red-100 rounded-full">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h4 class="text-base font-semibold text-red-800 mb-1">Tindakan Moderasi Diterapkan</h4>
          <p class="text-sm text-red-700 leading-relaxed">
            Konten Anda <strong>"{{ report.reportable_name }}"</strong> telah terkena tindakan moderasi oleh tim keamanan kami karena terindikasi melanggar panduan komunitas.
          </p>
        </div>
      </div>

      <!-- Details Section -->
      <div class="space-y-6 mb-8">
        <div>
          <h3 class="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Alasan Pelanggaran</h3>
          <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p class="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileWarning class="w-5 h-5 text-yellow-500" />
              {{ report.reason?.reason_title || '-' }}
            </p>
            <p class="text-sm text-gray-600 mt-2 leading-relaxed">
              {{ report.reason?.reason_description }}
            </p>
          </div>
        </div>

        <div v-if="report.admin_note">
          <h3 class="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Catatan Admin</h3>
          <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p class="text-sm text-blue-900 leading-relaxed flex items-start gap-3">
              <MessageSquareWarning class="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
              <span>{{ report.admin_note }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Action Section -->
      <div class="pt-6 border-t border-gray-100">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-center sm:text-left">
            <h4 class="font-semibold text-gray-900 mb-1">Merasa tindakan ini tidak tepat?</h4>
            <p class="text-sm text-gray-500">Ajukan sanggahan agar tim kami dapat meninjau ulang keputusan ini.</p>
          </div>
          <button 
            @click="showAppealModal = true"
            class="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:ring-4 focus:ring-primary/30 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Send class="w-4 h-4" />
            Ajukan Sanggahan
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
      <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <SearchX class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Laporan Tidak Ditemukan</h3>
      <p class="text-gray-500 max-w-sm mx-auto mb-6">
        Laporan yang Anda cari mungkin tidak ada, telah dihapus, atau Anda tidak memiliki akses untuk melihatnya.
      </p>
      <button @click="$router.push('/')" class="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded-xl transition-colors">
        Kembali ke Beranda
      </button>
    </div>

    <ReportAppealModal
      v-if="showAppealModal && report"
      :report-id="report.id"
      :target-name="report.reportable_name"
      @close="showAppealModal = false"
      @success="handleAppealSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { ShieldAlert, ArrowLeft, AlertTriangle, FileWarning, MessageSquareWarning, Send, SearchX } from 'lucide-vue-next';
import api from '@/libs/axios';
import ReportAppealModal from '@/components/reports/ReportAppealModal.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const report = ref(null);
const isLoading = ref(true);
const showAppealModal = ref(false);

const fetchReport = async () => {
  isLoading.value = true;
  try {
    const response = await api.get(`/api/reports/${route.params.id}`);
    report.value = response.data?.data || response.data;
  } catch (error) {
    console.error('Failed to fetch report:', error);
    if (error.response?.status !== 403 && error.response?.status !== 404) {
      toast.error('Gagal memuat detail laporan');
    }
  } finally {
    isLoading.value = false;
  }
};

const handleAppealSuccess = () => {
  showAppealModal.value = false;
  toast.success('Sanggahan berhasil dikirim. Tim moderasi akan meninjau ulang permintaan Anda.');
  setTimeout(() => {
    router.push('/');
  }, 2000);
};

onMounted(() => {
  fetchReport();
});
</script>
