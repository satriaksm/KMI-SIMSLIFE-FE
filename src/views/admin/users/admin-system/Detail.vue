<script setup>
import { ref, computed, onMounted, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import { getUserProfileUrl } from "@/libs/getImageUrl";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const admin = ref(null);
const activityLogs = ref([]);
const loading = ref(true);
const logsLoading = ref(false);

const showExportModal = ref(false);
const exportLoading = ref(false);

const registerExportModal = inject('registerExportModal', null);

const loadAdmin = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/api/admin/users/${route.params.id}`);
    admin.value = res.data.user || res.data;
  } catch (e) {
    console.error('Failed to load admin:', e);
    toast.error("Gagal memuat detail admin");
    router.push({ name: "Admin - Admin System List" });
  } finally {
    loading.value = false;
  }
};

const loadActivityLogs = async () => {
  logsLoading.value = true;
  try {
    const res = await api.get(`/api/admin/manage-admins/${route.params.id}/activity-logs`);
    activityLogs.value = res.data.logs?.data || [];
  } catch (e) {
    console.error('Failed to load activity logs:', e);
    toast.error("Gagal memuat riwayat aktivitas");
  } finally {
    logsLoading.value = false;
  }
};

const openExportModal = () => (showExportModal.value = true);
const closeExportModal = () => (showExportModal.value = false);

const exportPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get(`/api/admin/manage-admins/${route.params.id}/export-pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admin-detail-${route.params.id}-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan admin detail berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

const getActionTypeLabel = (type) => {
  const labels = {
    'status_change': 'Perubahan Status',
    'manual_override': 'Override Manual',
    'send_notification': 'Kirim Notifikasi',
    'warn_user': 'Peringatan User',
    'suspend_user': 'Suspend User',
    'unsuspend_user': 'Unsuspend User',
  };
  return labels[type] || type;
};

onMounted(async () => {
  await loadAdmin();
  await loadActivityLogs();
  
  if (typeof registerExportModal === 'function') {
    registerExportModal(openExportModal);
    console.log('Admin Detail: Export callback registered');
  }
});
</script>

<template>
  <div v-if="admin && !loading" class="p-4 sm:p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="p-6">
          <div class="flex flex-col sm:flex-row gap-6">
            <div class="shrink-0">
              <div class="w-32 h-32 rounded-full bg-admin-primary/10 flex items-center justify-center border-2 border-gray-200 overflow-hidden">
                <img
                  v-if="admin.profile_picture_path"
                  :src="getUserProfileUrl(admin)"
                  :alt="admin.name"
                  class="w-full h-full object-cover"
                  @error="(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class='text-5xl font-bold text-admin-primary'>${admin.name?.charAt(0).toUpperCase()}</span>`; }"
                />
                <span v-else class="text-5xl font-bold text-admin-primary">
                  {{ admin.name?.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>

            <div class="flex-1">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ admin.name }}</h2>
                  <p class="text-gray-600">{{ admin.email }}</p>
                </div>
                <StatusLabel :status="admin.status" variant="user" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-admin-primary/10 rounded-lg">
                    <i class="pi pi-shield text-admin-primary"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Type</p>
                    <p class="font-medium text-gray-900">
                      {{ admin.is_super_admin ? 'Super Admin' : 'Admin' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="p-2 bg-admin-primary/10 rounded-lg">
                    <i class="pi pi-verified text-admin-primary"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Status Verifikasi</p>
                    <p class="font-medium text-gray-900">
                      {{ admin.email_verified_at ? "Email Terverifikasi" : "Belum Verifikasi" }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">Riwayat Aktivitas</h3>

        <div v-if="logsLoading" class="flex justify-center py-8">
          <i class="pi pi-spin pi-spinner text-3xl text-merchant-primary"></i>
        </div>

        <div v-else-if="!activityLogs || activityLogs.length === 0" class="text-center py-8">
          <i class="pi pi-history text-4xl text-gray-300 mb-2"></i>
          <p class="text-gray-500">Belum ada riwayat aktivitas</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="log in activityLogs"
            :key="log.id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-circle-fill text-xs text-merchant-primary"></i>
                <span class="font-medium text-gray-900">{{ getActionTypeLabel(log.action_type) }}</span>
              </div>
              <span class="text-xs text-gray-500">{{ formatDate(log.created_at) }}</span>
            </div>

            <p v-if="log.reason" class="text-sm text-gray-600 mb-2">
              <strong>Alasan:</strong> {{ log.reason }}
            </p>

            <div v-if="log.metadata" class="text-xs text-gray-500 bg-gray-50 rounded p-2">
              <pre class="whitespace-pre-wrap">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">Timeline</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 rounded-lg">
              <i class="pi pi-calendar-plus text-green-600"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">Admin Created</p>
              <p class="font-medium text-gray-900">{{ formatDate(admin.created_at) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <i class="pi pi-clock text-blue-600"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">Last Updated</p>
              <p class="font-medium text-gray-900">{{ formatDate(admin.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Detail Admin"
      subtitle="Unduh laporan detail admin dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">Laporan akan mencakup:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Profil lengkap admin (Nama, Email, Type)</li>
                <li>Status dan verifikasi</li>
                <li>Riwayat aktivitas admin</li>
                <li>Informasi timestamp</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          @click="exportPDF"
          variant="merchant"
          size="lg"
          custom-class="w-full justify-center"
          :loading="exportLoading"
        >
          <i class="pi pi-download mr-2"></i>
          <span>Download Laporan PDF</span>
        </Button>
      </div>
    </ResponsiveModal>
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <div class="text-center">
      <i class="pi pi-spin pi-spinner text-4xl text-merchant-primary mb-4"></i>
      <p class="text-gray-600">Memuat data admin...</p>
    </div>
  </div>
</template>
