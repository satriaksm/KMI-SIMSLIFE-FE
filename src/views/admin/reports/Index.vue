<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useReports } from "@/composables/useReports";
import AdminTable from "@/components/common/AdminTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useToast } from "vue-toastification";

const router = useRouter();
const toast = useToast();

const { reports, loading, pagination, fetchReports, reviewReport, exportReportsPdf } = useReports();

const searchQuery = ref("");
const statusFilter = ref("");
const typeFilter = ref("");
const currentPage = ref(1);
const perPage = ref(15);

// Quick-action modal state
const showActionModal = ref(false);
const actionTarget = ref(null); // { report, status }
const actionNote = ref("");
const actionLoading = ref(false);

const breadcrumbItems = computed(() => [
  { label: "Laporan" },
]);

const tableColumns = [
  { key: "no", label: "No", sortable: true, filterable: false, class: "w-16" },
  { key: "created_at", label: "Tanggal", sortable: true, filterable: true },
  { key: "reporter.name", label: "Pelapor", sortable: true, filterable: true },
  { key: "reportable_type", label: "Tipe", sortable: true, filterable: true, filterFormat: (val) => getTypeLabel(val) },
  { key: "reason.reason_title", label: "Alasan", sortable: true, filterable: true },
  { key: "status", label: "Status", sortable: true, filterable: true, filterFormat: (val) => getStatusLabel(val) },
  { key: "action_taken", label: "Tindakan Moderasi", sortable: false, filterable: true, filterFormat: (val) => getActionInfo(val).label, class: "w-[400px] min-w-[320px]" },
  { key: "actions", label: "Aksi", sortable: false, filterable: false, class: "w-28 text-right" },
];



const paginationInfo = computed(() => {
  const current = pagination.value?.current_page ?? currentPage.value;
  const per = pagination.value?.per_page ?? perPage.value;
  const total = pagination.value?.total ?? 0;
  return {
    start: total === 0 ? 0 : (current - 1) * per + 1,
    end: Math.min(current * per, total),
    total,
    per_page: per,
  };
});

const normalizeReportableType = (type) => {
  if (!type) return type;
  const raw = type.split("\\").pop();
  const lower = raw.toLowerCase();
  if (lower === "communitypost") return "post";
  if (lower === "postcomment") return "post_comment";
  if (lower === "jasa") return "service";
  return lower;
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Menunggu",
    in_review: "Dalam Peninjauan",
    resolved: "Terselesaikan",
    dismissed: "Ditolak",
  };
  return labels[status] || status;
};

const getTypeLabel = (type) => {
  const labels = {
    product: "Produk",
    service: "Jasa",
    merchant: "Merchant",
    post: "Postingan",
    post_comment: "Komentar",
    user: "Pengguna",
  };
  return labels[normalizeReportableType(type)] || type;
};

const getActionInfo = (actionType) => {
  const map = {
    'send_warning': { label: 'Peringatan', icon: 'pi-envelope', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    'warn_user': { label: 'Peringatan Pengguna', icon: 'pi-exclamation-triangle', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    'suspend_user': { label: 'Suspend Pengguna', icon: 'pi-lock', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    'deactivate_user': { label: 'Nonaktifkan Pengguna', icon: 'pi-times-circle', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    'warn_merchant': { label: 'Peringatan UMKM', icon: 'pi-exclamation-triangle', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    'suspend_merchant': { label: 'Suspend UMKM', icon: 'pi-lock', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    'archive_merchant': { label: 'Arsipkan UMKM', icon: 'pi-box', color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
    'archive_product': { label: 'Arsipkan Produk', icon: 'pi-eye-slash', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    'archive_service': { label: 'Arsipkan Jasa', icon: 'pi-eye-slash', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
    'delete_post': { label: 'Hapus Postingan', icon: 'pi-trash', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
    'delete_comment': { label: 'Hapus Komentar', icon: 'pi-trash', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  };
  return map[actionType] || { label: actionType, icon: 'pi-check', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadReports = async () => {
  const params = {
    page: currentPage.value,
    per_page: perPage.value,
    search: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
    reportable_type: typeFilter.value || undefined,
  };
  await fetchReports(params);
};

const goToDetail = (report) => {
  router.push({ name: "Admin - Report Detail", params: { id: report.id } });
};

const goToReporter = (report) => {
  if (report.reporter?.id) {
    router.push({ name: 'Admin - Customer Detail', params: { id: report.reporter.id } });
  }
};

const goToPage = (page) => { currentPage.value = page; loadReports(); };
const nextPage = () => { if (currentPage.value < (pagination.value?.last_page || 1)) { currentPage.value += 1; loadReports(); } };
const prevPage = () => { if (currentPage.value > 1) { currentPage.value -= 1; loadReports(); } };

// Quick actions from table
const openActionModal = (report, status) => {
  actionTarget.value = { report, status };
  actionNote.value = "";
  showActionModal.value = true;
};

const actionModalTitle = computed(() => {
  if (!actionTarget.value) return "";
  return {
    in_review: "Tandai Dalam Peninjauan",
    resolved: "Selesaikan Laporan",
    dismissed: "Tolak Laporan",
  }[actionTarget.value.status] || "Aksi Laporan";
});

const handleQuickAction = async () => {
  if (!actionTarget.value) return;
  const { report, status } = actionTarget.value;

  if (status === "dismissed" && !actionNote.value.trim()) {
    toast.warning("Catatan admin wajib diisi untuk menolak laporan");
    return;
  }

  actionLoading.value = true;
  try {
    await reviewReport(report.id, {
      status,
      admin_note: actionNote.value || undefined,
    });
    showActionModal.value = false;
    await loadReports();
  } catch {
    // error already shown by composable
  } finally {
    actionLoading.value = false;
  }
};

const triggerExport = () => {
  exportReportsPdf({
    status: statusFilter.value || undefined,
    reportable_type: typeFilter.value || undefined,
    search: searchQuery.value || undefined,
  });
};

watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 1;
  loadReports();
});

const tableRef = ref(null);
const resetAll = () => {
  searchQuery.value = "";
  tableRef.value?.resetFiltersAndSort();
};

onMounted(() => {
  loadReports();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header (consistent with users/Index.vue) -->
    <div
      class="fixed sm:static top-0 left-0 right-0 flex justify-between items-center py-6 px-4 sm:px-6 bg-white z-10 border-b border-gray-200 shadow-sm"
    >
      <div class="flex items-center gap-3 min-w-0">
        <!-- Hamburger Button (Mobile Only) -->
        <button
          @click="$emit('toggle-sidebar')"
          class="lg:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-bars text-gray-600"></i>
        </button>
        <div class="min-w-0">
          <Breadcrumb :items="breadcrumbItems" />
          <p class="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
            Kelola laporan konten dari pengguna
          </p>
        </div>
      </div>

      <!-- Export Button -->
      <div class="flex gap-2 sm:gap-3">
        <Button
          @click="triggerExport"
          variant="merchant-outline"
          size="sm"
          customClass="!hidden sm:!inline"
        >
          <i class="pi pi-download"></i>
          <span class="hidden sm:inline ml-2">Export PDF</span>
        </Button>
        <Button
          @click="triggerExport"
          variant="merchant-outline"
          size="md"
          customClass="sm:!hidden"
        >
          <i class="pi pi-download"></i>
        </Button>
      </div>
    </div>

    <div class="h-[92px] sm:h-0"></div>

    <div class="px-4 p-4 sm:px-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <!-- Filters -->
        <div class="p-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4 border-b border-gray-100">
          <div class="flex-1 flex gap-2 w-full">
            <div class="flex-1 w-full">
              <TextField
                name="search"
                variant="merchant"
                v-model="searchQuery"
                placeholder="Cari laporan..."
                icon="pi pi-search"
              />
            </div>
            <Button @click="resetAll" variant="merchant-outline" customClass="h-[42px] px-4 whitespace-nowrap !border-gray-200 hover:!bg-gray-50 flex-shrink-0">
              <i class="pi pi-filter-slash text-gray-500 mr-1 text-sm"></i> 
              <span class="text-gray-600 text-sm font-medium">Reset</span>
            </Button>
          </div>
        </div>

        <AdminTable
          ref="tableRef"
          :items="reports"
          :columns="tableColumns"
          :loading="loading"
          :current-page="pagination?.current_page || currentPage"
          :total-pages="pagination?.last_page || 1"
          :pagination-info="paginationInfo"
          :show-checkbox="false"
          empty-message="Belum ada laporan masuk."
          @row-click="goToDetail"
          @page-change="goToPage"
          @next-page="nextPage"
          @prev-page="prevPage"
        >
          <template #cell-no="{ item }">
            <span class="text-sm font-mono text-gray-500">
              Report #{{ item.id }}
            </span>
          </template>

          <template #cell-reporter.name="{ item }">
            <span 
              class="text-sm font-medium text-gray-800 cursor-pointer hover:text-primary transition-colors hover:underline"
              @click.stop="goToReporter(item)"
              title="Lihat profil pelapor"
            >
              {{ item.reporter?.name || '-' }}
            </span>
          </template>

          <template #cell-reportable_type="{ value }">
            <span class="text-sm font-medium text-gray-800">
              {{ getTypeLabel(value) }}
            </span>
          </template>

          <template #cell-status="{ value }">
            <StatusLabel variant="report" :status="value" />
          </template>

          <template #cell-created_at="{ value }">
            <span class="text-sm text-gray-600">
              {{ formatDate(value) }}
            </span>
          </template>

          <template #cell-action_taken="{ item }">
            <div v-if="item.action_taken" class="flex flex-col gap-1.5">
              <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold w-max" :class="[getActionInfo(item.action_taken).bg, getActionInfo(item.action_taken).color]">
                <i class="pi" :class="getActionInfo(item.action_taken).icon"></i>
                <span>{{ getActionInfo(item.action_taken).label }}</span>
              </div>
              <span class="text-xs text-gray-600 font-medium">
                {{ item.admin_note || item.action_reason || '-' }}
              </span>
            </div>
            <div v-else-if="item.admin_note || item.reviewer?.name" class="flex flex-col gap-1.5">
              <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold w-max bg-gray-50 border-gray-200 text-gray-600">
                <i class="pi pi-check"></i>
                <span>Ditinjau oleh {{ item.reviewer?.name || 'Admin' }}</span>
              </div>
              <span class="text-xs text-gray-600 font-medium">
                {{ item.admin_note || '-' }}
              </span>
            </div>
            <div v-else>
              <span class="text-xs text-gray-400">-</span>
            </div>
          </template>

          <template #cell-actions="{ item }">
            <div class="flex gap-0.5" @click.stop>
              <!-- View detail -->
              <button
                @click="goToDetail(item)"
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                title="Lihat Detail"
              >
                <i class="pi pi-eye text-sm"></i>
              </button>

              <!-- In Review (only for pending) -->
              <button
                v-if="item.status === 'pending'"
                @click="openActionModal(item, 'in_review')"
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-yellow-600 transition-colors"
                title="Tandai Dalam Peninjauan"
              >
                <i class="pi pi-clock text-sm"></i>
              </button>

              <!-- Resolve (pending or in_review) -->
              <button
                v-if="['pending', 'in_review'].includes(item.status)"
                @click="openActionModal(item, 'resolved')"
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-600 transition-colors"
                title="Selesaikan"
              >
                <i class="pi pi-check text-sm"></i>
              </button>

              <!-- Dismiss (pending or in_review) -->
              <button
                v-if="['pending', 'in_review'].includes(item.status)"
                @click="openActionModal(item, 'dismissed')"
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                title="Tolak"
              >
                <i class="pi pi-times text-sm"></i>
              </button>
            </div>
          </template>
        </AdminTable>
      </div>
    </div>

    <!-- Quick Action Modal -->
    <ResponsiveModal
      :show="showActionModal"
      @close="showActionModal = false"
      :title="actionModalTitle"
    >
      <p class="text-sm text-gray-600 mb-4">
        <template v-if="actionTarget?.status === 'in_review'">
          Tandai laporan <strong>#{{ actionTarget?.report?.id }}</strong> sebagai <strong>Dalam Peninjauan</strong>?
        </template>
        <template v-else-if="actionTarget?.status === 'resolved'">
          Selesaikan laporan <strong>#{{ actionTarget?.report?.id }}</strong>?
        </template>
        <template v-else-if="actionTarget?.status === 'dismissed'">
          Tolak laporan <strong>#{{ actionTarget?.report?.id }}</strong>? Catatan wajib diisi.
        </template>
      </p>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Catatan Admin
          <span v-if="actionTarget?.status === 'dismissed'" class="text-red-500">*</span>
          <span v-else class="text-gray-400">(Opsional)</span>
        </label>
        <textarea
          v-model="actionNote"
          rows="3"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          placeholder="Tulis catatan..."
        />
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showActionModal = false" variant="secondary">
            Batal
          </Button>
          <Button
            @click="handleQuickAction"
            :variant="actionTarget?.status === 'dismissed' ? 'danger' : actionTarget?.status === 'resolved' ? 'success' : 'warning'"
            :disabled="actionLoading"
          >
            <i
              class="mr-2"
              :class="{
                'pi pi-clock': actionTarget?.status === 'in_review',
                'pi pi-check': actionTarget?.status === 'resolved',
                'pi pi-times': actionTarget?.status === 'dismissed',
              }"
            ></i>
            {{ actionLoading ? "Memproses..." : actionModalTitle }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>
