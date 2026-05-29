<template>
 <div class="container mx-auto px-4 py-8 max-w-4xl">
 <!-- Header -->
 <div class="mb-6 flex items-center gap-4">
 <button @click="$router.back()" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
 <ArrowLeft :size="24" class="text-gray-600 " />
 </button>
 <div>
 <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
 Detail Laporan #{{ $route.params.id }}
 <span :class="getStatusBadgeClass(report?.status)" class="text-sm">
 {{ getStatusLabel(report?.status) }}
 </span>
 </h1>
 <p class="text-sm text-gray-500 mt-1">
 Dilaporkan pada {{ formatDate(report?.created_at) }}
 </p>
 </div>
 </div>

 <!-- Loading -->
 <div v-if="isLoading" class="flex justify-center py-20">
 <Loader2 :size="40" class="animate-spin text-blue-600" />
 </div>

 <!-- Error/Not Found -->
 <div v-else-if="!report" class="bg-white rounded-xl p-12 text-center shadow">
 <AlertCircle :size="48" class="mx-auto text-gray-400 mb-4" />
 <h3 class="text-lg font-medium text-gray-900 mb-2">Laporan tidak ditemukan</h3>
 <p class="text-gray-600 ">Anda tidak memiliki akses atau laporan telah dihapus.</p>
 </div>

 <!-- Main Content -->
 <div v-else class="space-y-6">
 
 <!-- Action Banner for Target User -->
 <div v-if="report.is_target && report.action_taken" class="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
 <div class="flex items-start gap-4">
 <div class="bg-red-100 p-3 rounded-full flex-shrink-0">
 <AlertTriangle :size="24" class="text-red-600 " />
 </div>
 <div class="flex-1">
 <h3 class="font-bold text-red-800 text-lg">Tindakan Moderasi Diambil</h3>
 <p class="text-red-700 mt-1 text-sm">
 Konten Anda telah dikenakan tindakan: <strong>{{ getActionLabel(report.action_taken) }}</strong>
 </p>
 <p class="text-red-600 mt-2 text-sm bg-white p-3 rounded-lg border border-red-100 ">
 "{{ report.admin_note || 'Pelanggaran terhadap ketentuan layanan' }}"
 </p>
 </div>
 </div>
 </div>

 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
 <!-- Report Info -->
 <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 ">
 <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
 <Info :size="18" class="text-blue-500" />
 Informasi Laporan
 </h3>
 <div class="space-y-4">
 <div>
 <p class="text-xs text-gray-500 uppercase tracking-wide">Tipe Konten</p>
 <p class="font-medium text-gray-900 mt-1">{{ getTypeLabel(report.reportable_type) }} <span class="text-gray-500 font-normal">({{ report.reportable_name || 'Konten' }})</span></p>
 </div>
 <div>
 <p class="text-xs text-gray-500 uppercase tracking-wide">Alasan</p>
 <p class="font-medium text-gray-900 mt-1">{{ report.reason?.reason_title }}</p>
 </div>
 <div v-if="report.report_comment">
 <p class="text-xs text-gray-500 uppercase tracking-wide">Keterangan Tambahan</p>
 <p class="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">{{ report.report_comment }}</p>
 </div>
 </div>
 </div>

 <!-- Moderation Status -->
 <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 ">
 <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
 <Shield :size="18" class="text-green-500" />
 Status Peninjauan
 </h3>
 <div class="space-y-4">
 <div v-if="report.reviewed_at">
 <p class="text-xs text-gray-500 uppercase tracking-wide">Ditinjau Pada</p>
 <p class="font-medium text-gray-900 mt-1">{{ formatDate(report.reviewed_at) }}</p>
 </div>
 <div v-if="!report.is_target && report.admin_note">
 <p class="text-xs text-gray-500 uppercase tracking-wide">Catatan Admin</p>
 <p class="text-sm text-gray-700 mt-1 bg-blue-50 p-3 rounded-lg border border-blue-100 ">{{ report.admin_note }}</p>
 </div>
 <div v-if="!report.reviewed_at" class="text-center py-6">
 <Clock :size="32" class="mx-auto text-yellow-400 mb-2" />
 <p class="text-sm text-gray-500">Laporan Anda sedang menunggu antrean untuk ditinjau oleh tim moderasi kami.</p>
 </div>
 </div>
 </div>
 </div>

 <!-- Appeals Section (Only for Target) -->
 <div v-if="report.is_target && report.action_taken" class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 ">
 <div class="flex items-center justify-between mb-6">
 <h3 class="font-semibold text-gray-900 flex items-center gap-2">
 <MessageSquare :size="18" class="text-indigo-500" />
 Sanggahan Anda
 </h3>
 <button 
 v-if="!hasPendingAppeal && appeals.length === 0"
 @click="showAppealModal = true"
 class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
 >
 Ajukan Sanggahan
 </button>
 </div>

 <div v-if="appeals.length > 0" class="space-y-4">
 <div v-for="appeal in appeals" :key="appeal.id" class="border rounded-lg p-4 bg-gray-50 ">
 <div class="flex justify-between items-start mb-3">
 <span class="text-sm text-gray-500">{{ formatDate(appeal.created_at) }}</span>
 <span :class="getAppealStatusBadge(appeal.status)">
 {{ getAppealStatusLabel(appeal.status) }}
 </span>
 </div>
 <p class="text-sm text-gray-700 italic mb-4">"{{ appeal.appeal_text }}"</p>
 
 <div v-if="appeal.admin_response" class="mt-3 pt-3 border-t border-gray-200 ">
 <p class="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">Respons Admin:</p>
 <p class="text-sm text-indigo-700 bg-indigo-50 p-3 rounded-lg">{{ appeal.admin_response }}</p>
 </div>
 </div>
 </div>

 <div v-else class="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 ">
 <p class="text-sm text-gray-500 ">Anda belum mengajukan sanggahan untuk laporan ini.</p>
 </div>
 </div>

 </div>

 <!-- Appeal Modal -->
 <ReportAppealModal
 v-if="showAppealModal"
 :report-id="Number($route.params.id)"
 :target-name="report?.reportable_name"
 @close="showAppealModal = false"
 @success="loadAppeals"
 />
 </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Loader2, AlertCircle, AlertTriangle, Info, Shield, Clock, MessageSquare } from 'lucide-vue-next';
import api from '@/libs/axios';
import { useReports } from '@/composables/useReports';
import ReportAppealModal from '@/components/reports/ReportAppealModal.vue';

const route = useRoute();
const { fetchMyAppeals } = useReports();

const report = ref(null);
const appeals = ref([]);
const isLoading = ref(true);
const showAppealModal = ref(false);

const hasPendingAppeal = computed(() => {
 return appeals.value.some(a => a.status === 'pending');
});

const loadReport = async () => {
 isLoading.value = true;
 try {
 const response = await api.get(`/api/reports/${route.params.id}`);
 report.value = response.data?.data;
 
 if (report.value?.is_target && report.value?.action_taken) {
 await loadAppeals();
 }
 } catch (error) {
 console.error('Failed to load report:', error);
 } finally {
 isLoading.value = false;
 }
};

const loadAppeals = async () => {
 appeals.value = await fetchMyAppeals(route.params.id);
};

const getStatusBadgeClass = (status) => {
 const classes = {
 pending: 'px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800 ',
 in_review: 'px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-800 ',
 resolved: 'px-3 py-1 rounded-full font-medium bg-green-100 text-green-800 ',
 dismissed: 'px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-800 ',
 };
 return classes[status] || classes.pending;
};

const getStatusLabel = (status) => {
 const labels = {
 pending: 'Menunggu',
 in_review: 'Ditinjau',
 resolved: 'Selesai',
 dismissed: 'Ditolak',
 };
 return labels[status] || status;
};

const getAppealStatusBadge = (status) => {
 const classes = {
 pending: 'px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800 ',
 reviewed: 'px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 ',
 accepted: 'px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800 ',
 rejected: 'px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800 ',
 };
 return classes[status] || classes.pending;
};

const getAppealStatusLabel = (status) => {
 const labels = {
 pending: 'MENUNGGU',
 reviewed: 'DITINJAU',
 accepted: 'DITERIMA',
 rejected: 'DITOLAK',
 };
 return labels[status] || status.toUpperCase();
};

const getActionLabel = (actionType) => {
 const map = {
 'send_warning': 'Peringatan Pelanggaran Konten',
 'warn_user': 'Peringatan Pengguna',
 'suspend_user': 'Akun Ditangguhkan (Suspend)',
 'deactivate_user': 'Akun Dinonaktifkan',
 'warn_merchant': 'Peringatan UMKM',
 'suspend_merchant': 'UMKM Ditangguhkan (Suspend)',
 'archive_merchant': 'UMKM Diarsipkan',
 'archive_product': 'Produk Diarsipkan',
 'archive_service': 'Jasa Diarsipkan',
 'delete_post': 'Postingan Dihapus',
 'delete_comment': 'Komentar Dihapus',
 };
 return map[actionType] || actionType;
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
 merchant: 'UMKM',
 post: 'Postingan',
 post_comment: 'Komentar',
 user: 'Pengguna',
 };
 return labels[normalizeType(type)] || type;
};

const formatDate = (date) => {
 if (!date) return '-';
 return new Date(date).toLocaleDateString('id-ID', {
 day: 'numeric',
 month: 'long',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
};

onMounted(() => {
 loadReport();
});
</script>
