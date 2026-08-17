<script setup>
import { ref, computed, onMounted, watch, inject } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useMerchants } from "@/composables/useMerchants";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import AdminTable from "@/components/common/AdminTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import api from "@/libs/axios";
import { getMerchantLogoUrl } from "@/libs/getImageUrl"; // ✅ ADD import

const router = useRouter();
const toast = useToast();

const { merchants, loading, pagination, fetchMerchants } = useMerchants();

const registerExportModal = inject("registerExportModal", null);

// State
const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref(10);
const sortBy = ref("");
const sortDir = ref("");

// Modals
const showFilterModal = ref(false);
const showExportModal = ref(false);
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const exportLoading = ref(false);

// Selected merchant for approval/rejection
const selectedMerchant = ref(null);
const rejectionReason = ref("");
const processingAction = ref(false);

// Temp filters for modal
const tempFilters = ref({
  status: "",
  segmentation: "",
});

const activeFilters = ref({
  status: "",
  segmentation: "",
});

// Status change modal
const showStatusModal = ref(false);
const selectedStatusMerchant = ref(null);
const newMerchantStatus = ref('');
const statusChangeLoading = ref(false);

const isAnyModalOpen = computed(
  () =>
    showFilterModal.value ||
    showExportModal.value ||
    showApproveModal.value ||
    showRejectModal.value,
);
useBodyScrollLock(isAnyModalOpen);

const merchantStatusOptions = [
  { value: 'approved', label: 'Disetujui', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'suspended', label: 'Dibekukan', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'archived', label: 'Diarsipkan', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  { value: 'rejected', label: 'Ditolak', color: 'text-orange-700 bg-orange-50 border-orange-200' },
];

const openMerchantStatusModal = (merchant) => {
  selectedStatusMerchant.value = merchant;
  newMerchantStatus.value = merchant.status;
  showStatusModal.value = true;
};

const confirmMerchantStatusChange = async () => {
  if (!selectedStatusMerchant.value || !newMerchantStatus.value) return;
  statusChangeLoading.value = true;
  try {
    await api.patch(`/api/admin/merchants/${selectedStatusMerchant.value.id}/status`, { status: newMerchantStatus.value });
    toast.success(`Status merchant berhasil diubah`);
    showStatusModal.value = false;
    selectedStatusMerchant.value = null;
    loadMerchants();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal mengubah status');
  } finally {
    statusChangeLoading.value = false;
  }
};

// Table config
const tableColumns = [
  { key: "logo", label: "Logo", sortable: false },
  { key: "name", label: "UMKM", sortable: true },
  { key: "owner", label: "Pemilik", sortable: false },
  { key: "segmentation", label: "Segmentasi", sortable: false },
  { key: "products_count", label: "Produk", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "actions", label: "Aksi", sortable: false },
];

// Safe pagination helpers
const totalPages = computed(() => pagination.value?.last_page ?? 1);
const totalItems = computed(() => pagination.value?.total ?? 0);
const currentPageFromApi = computed(
  () => pagination.value?.current_page ?? currentPage.value,
);
const perPageFromApi = computed(
  () => pagination.value?.per_page ?? perPage.value,
);

const paginationInfo = computed(() => {
  const start =
    totalItems.value === 0
      ? 0
      : (currentPageFromApi.value - 1) * perPageFromApi.value + 1;
  const end = Math.min(
    currentPageFromApi.value * perPageFromApi.value,
    totalItems.value,
  );
  return {
    start,
    end,
    total: totalItems.value,
    current_page: currentPageFromApi.value,
    per_page: perPageFromApi.value,
  };
});

// Filter options
const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const segmentationOptions = [
  { value: "", label: "Semua Segmentasi" },
  { value: "1", label: "Toko" },
  { value: "2", label: "Jasa" },
  { value: "3", label: "Kuliner" },
];

const activeFilterCount = computed(() => {
  let count = 0;
  if (activeFilters.value.status) count++;
  if (activeFilters.value.segmentation) count++;
  return count;
});

// Load merchants with filters
const loadMerchants = async () => {
  try {
    await fetchMerchants({
      search: searchQuery.value,
      status: activeFilters.value.status,
      segmentation_id: activeFilters.value.segmentation,
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortDir.value,
    });
  } catch (error) {
    console.error("Failed to load merchants:", error);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadMerchants();
};

// Modals
const openFilterModal = () => {
  tempFilters.value = { ...activeFilters.value };
  showFilterModal.value = true;
};
const closeFilterModal = () => (showFilterModal.value = false);

const openExportModal = () => {
  console.log("openExportModal called in merchants/Index.vue");
  showExportModal.value = true;
};
const closeExportModal = () => (showExportModal.value = false);

// Approve/Reject modal handlers
const openApproveModal = (merchant) => {
  selectedMerchant.value = merchant;
  showApproveModal.value = true;
};

const openRejectModal = (merchant) => {
  selectedMerchant.value = merchant;
  rejectionReason.value = "";
  showRejectModal.value = true;
};

const closeApproveModal = () => {
  showApproveModal.value = false;
  selectedMerchant.value = null;
};

const closeRejectModal = () => {
  showRejectModal.value = false;
  selectedMerchant.value = null;
  rejectionReason.value = "";
};

// Approve merchant
const approveMerchant = async () => {
  if (!selectedMerchant.value) return;

  processingAction.value = true;
  try {
    await api.patch(
      `/api/admin/merchants/${selectedMerchant.value.id}/approve`,
    );

    toast.success(
      `Merchant "${selectedMerchant.value.name}" berhasil di-approve`,
    );
    closeApproveModal();
    loadMerchants();
  } catch (error) {
    console.error("Failed to approve merchant:", error);
    toast.error(error.response?.data?.message || "Gagal approve merchant");
  } finally {
    processingAction.value = false;
  }
};

// Reject merchant
const rejectMerchant = async () => {
  if (!selectedMerchant.value) return;

  if (!rejectionReason.value.trim()) {
    toast.error("Alasan penolakan harus diisi");
    return;
  }

  processingAction.value = true;
  try {
    await api.patch(
      `/api/admin/merchants/${selectedMerchant.value.id}/reject`,
      {
        rejection_reason: rejectionReason.value,
      },
    );

    toast.success(`Merchant "${selectedMerchant.value.name}" berhasil ditolak`);
    closeRejectModal();
    loadMerchants();
  } catch (error) {
    console.error("Failed to reject merchant:", error);
    toast.error(error.response?.data?.message || "Gagal reject merchant");
  } finally {
    processingAction.value = false;
  }
};

const applyFilters = () => {
  activeFilters.value = { ...tempFilters.value };
  currentPage.value = 1;
  closeFilterModal();
  loadMerchants();
};

const resetFilters = () => {
  const defaults = { status: "", segmentation: "" };
  tempFilters.value = { ...defaults };
  activeFilters.value = { ...defaults };
  currentPage.value = 1;
  closeFilterModal();
  toast.success("Filter berhasil direset");
  loadMerchants();
};

// Export placeholders
const exportExcel = async () => {
  toast.info("Export Excel sedang dalam pengembangan");
  closeExportModal();
};

// Export methods
const exportPDF = async () => {
  exportLoading.value = true; // ✅ Set loading to true
  try {
    const response = await api.get("/api/admin/merchants/export-pdf", {
      responseType: "blob",
      params: {
        status: activeFilters.value.status,
        segmentation_id: activeFilters.value.segmentation,
        search: searchQuery.value,
      },
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `merchants-report-${new Date().toISOString().split("T")[0]}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan UMKM berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false; // ✅ Set loading to false
  }
};

// Actions
const goToDetail = (merchant) => {
  router.push({ name: "Admin - Merchant Detail", params: { id: merchant.id } });
};

const handleSortChange = ({ key, dir }) => {
  sortBy.value = key;
  sortDir.value = dir;
  currentPage.value = 1;
  loadMerchants();
};

// Pagination methods
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
const nextPage = () => {
  if (currentPage.value < totalPages.value) goToPage(currentPage.value + 1);
};
const prevPage = () => {
  if (currentPage.value > 1) goToPage(currentPage.value - 1);
};

watch(currentPage, () => loadMerchants());

// Register callback on mount
onMounted(() => {
  loadMerchants();

  // Register the export modal function with parent
  if (registerExportModal && typeof registerExportModal === "function") {
    console.log("Registering export modal callback for merchants");
    registerExportModal(openExportModal);
  } else {
    console.warn("registerExportModal not provided by parent");
  }
});
</script>

<template>
  <div class="p-4 sm:p-6">
    <!-- Search & Toolbar -->
    <div class="mb-4 space-y-2 bg-white sm:space-y-4">
      <div class="pb-1 sm:flex sm:items-center sm:gap-4">
        <div class="flex-1 mb-2 sm:mb-0">
          <TextField
            name="search"
            variant="merchant"
            v-model="searchQuery"
            placeholder="Cari merchant / owner..."
            icon="pi-search"
            @keyup.enter="handleSearch"
          />
        </div>

        <Button
          @click="openFilterModal"
          variant="muted-outline"
          size="md"
          custom-class="!hidden sm:!flex items-center gap-2 whitespace-nowrap relative !rounded-xl !py-2"
        >
          <i class="pi pi-filter"></i>
          <span>Filter</span>
          <span
            v-if="activeFilterCount > 0"
            class="absolute flex items-center justify-center w-5 h-5 text-xs font-semibold text-white rounded-full -top-2 -right-2 bg-primary"
          >
            {{ activeFilterCount }}
          </span>
        </Button>
      </div>

      <!-- Mobile toolbar -->
      <div
        class="flex sm:hidden flex-row justify-between items-center px-3 rounded-lg gap-4 pb-1"
      >
        <div class="text-xs text-muted-foreground">Total: {{ totalItems }}</div>

        <Button
          @click="openFilterModal"
          variant="muted-outline"
          size="sm"
          custom-class="!flex sm:!hidden items-center gap-2 whitespace-nowrap relative"
        >
          <i class="pi pi-filter"></i>
          <span>Filter</span>
          <span
            v-if="activeFilterCount > 0"
            class="absolute flex items-center justify-center w-5 h-5 text-xs font-semibold text-white rounded-full -top-2 -right-2 bg-primary"
          >
            {{ activeFilterCount }}
          </span>
        </Button>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden sm:block">
      <AdminTable
        :items="merchants"
        :columns="tableColumns"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :pagination-info="paginationInfo"
        :show-checkbox="false"
        :sort-by="sortBy"
        :sort-dir="sortDir"
        empty-message="Tidak ada merchant yang ditemukan"
        @row-click="goToDetail"
        @page-change="goToPage"
        @next-page="nextPage"
        @prev-page="prevPage"
        @sort-change="handleSortChange"
      >
        <template #cell-logo="{ item }">
          <div class="flex items-center justify-center">
            <div
              v-if="item.logo_path"
              class="w-10 h-10 rounded-full overflow-hidden"
            >
              <img
                :src="getMerchantLogoUrl(item, 'thumb')"
                :alt="item.name"
                class="w-full h-full object-cover"
                @error="
                  (e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span class='text-merchant-primary font-semibold text-sm'>${item.name?.charAt(0)?.toUpperCase()}</span>`;
                  }
                "
              />
            </div>
            <div
              v-else
              class="w-10 h-10 rounded-full bg-merchant-primary/10 flex items-center justify-center"
            >
              <span class="text-merchant-primary font-semibold text-sm">
                {{ item.name?.charAt(0)?.toUpperCase() }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-owner="{ item }">
          <div>
            <p class="text-sm font-medium">{{ item.user?.name || "-" }}</p>
            <p class="text-xs text-gray-500">{{ item.user?.email || "-" }}</p>
          </div>
        </template>

        <template #cell-segmentation="{ item }">
          <StatusLabel
            :status="
              item.segmentation?.code ||
              item.segmentation?.name?.toLowerCase().replace(/\s/g, '_')
            "
            variant="segmentation"
            size="sm"
          />
        </template>

        <template #cell-products_count="{ item }">
          <span class="font-semibold">{{ item.products_count || 0 }}</span>
        </template>

        <template #cell-status="{ item }">
          <StatusLabel :status="item.status" variant="merchant" size="sm" />
        </template>

        <!-- Actions cell dengan conditional buttons -->
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <Button
              @click.stop="goToDetail(item)"
              variant="outline"
              size="sm"
              title="Lihat Detail"
            >
              <i class="pi pi-eye"></i>
            </Button>

            <Button
              @click.stop="openMerchantStatusModal(item)"
              variant="outline"
              size="sm"
              class="!border-blue-400 !text-blue-600 hover:!bg-blue-50"
              title="Ubah Status"
            >
              <i class="pi pi-pencil"></i>
            </Button>

            <!-- Show approve/reject buttons only for pending -->
            <template v-if="item.status === 'pending'">
              <Button
                @click.stop="openApproveModal(item)"
                variant="outline"
                size="sm"
                custom-class="!border-green-500 !text-green-600 hover:!bg-green-50"
                title="Approve Merchant"
              >
                <i class="pi pi-check"></i>
              </Button>

              <Button
                @click.stop="openRejectModal(item)"
                variant="outline"
                size="sm"
                custom-class="!border-red-500 !text-red-600 hover:!bg-red-50"
                title="Reject Merchant"
              >
                <i class="pi pi-times"></i>
              </Button>
            </template>
          </div>
        </template>
      </AdminTable>
    </div>

    <!-- Mobile List -->
    <div class="sm:hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <i class="text-4xl pi pi-spin pi-spinner text-merchant-primary"></i>
      </div>

      <div
        v-else-if="!merchants || merchants.length === 0"
        class="py-12 text-center"
      >
        <i class="mb-4 text-6xl text-gray-300 pi pi-building"></i>
        <p class="text-gray-500">Tidak ada merchant</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="m in merchants"
          :key="m.id"
          @click="goToDetail(m)"
          class="p-4 transition bg-white rounded-lg shadow-sm active:bg-gray-50"
        >
          <div class="flex items-start gap-3 mb-3">
            <div
              v-if="m.logo_path"
              class="w-12 h-12 rounded-full overflow-hidden shrink-0"
            >
              <img
                :src="getMerchantLogoUrl(m, 'thumb')"
                :alt="m.name"
                class="w-full h-full object-cover"
                @error="
                  (e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div class='w-12 h-12 rounded-full bg-merchant-primary/10 flex items-center justify-center shrink-0'><span class='text-merchant-primary font-semibold'>${m.name?.charAt(0)?.toUpperCase()}</span></div>`;
                  }
                "
              />
            </div>
            <div
              v-else
              class="w-12 h-12 rounded-full bg-merchant-primary/10 flex items-center justify-center shrink-0"
            >
              <span class="text-merchant-primary font-semibold">
                {{ m.name?.charAt(0)?.toUpperCase() }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 truncate">{{ m.name }}</p>
              <p class="text-sm text-gray-600 truncate">
                Owner: {{ m.user?.name || "-" }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ m.user?.email || "-" }}
              </p>
            </div>

            <StatusLabel :status="m.status" variant="merchant" size="sm" />
          </div>

          <div class="flex items-center justify-between pt-2 text-xs border-t">
            <StatusLabel
              :status="
                m.segmentation?.code ||
                m.segmentation?.name?.toLowerCase().replace(/\s/g, '_')
              "
              :label="m.segmentation?.name"
              variant="segmentation"
              size="sm"
            />
            <span class="text-gray-600">
              <i class="mr-1 pi pi-box"></i>
              {{ m.products_count || 0 }} Produk
            </span>
          </div>

          <!-- ✅ NEW: Mobile action buttons for pending -->
          <div
            v-if="m.status === 'pending'"
            class="flex gap-2 pt-3 mt-3 border-t"
            @click.stop
          >
            <Button
              @click="openApproveModal(m)"
              variant="outline"
              size="sm"
              custom-class="flex-1 !border-green-500 !text-green-600"
            >
              <i class="mr-1 pi pi-check"></i>
              Approve
            </Button>
            <Button
              @click="openRejectModal(m)"
              variant="outline"
              size="sm"
              custom-class="flex-1 !border-red-500 !text-red-600"
            >
              <i class="mr-1 pi pi-times"></i>
              Reject
            </Button>
          </div>
        </div>
      </div>

      <MobilePagination
        v-if="merchants && merchants.length > 0"
        class="mt-4"
        :current-page="currentPage"
        :total-pages="totalPages"
        @prev="prevPage"
        @next="nextPage"
        @go-to="goToPage"
      />
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      :show="showFilterModal"
      @close="closeFilterModal"
      title="Filter Merchant"
      subtitle="Pilih filter yang diinginkan"
      :show-footer="true"
    >
      <div class="space-y-4">
        <SelectField
          name="filter-status"
          label="Status"
          v-model="tempFilters.status"
          :options="statusOptions"
          variant="merchant"
        />
        <SelectField
          name="filter-segmentation"
          label="Segmentasi"
          v-model="tempFilters.segmentation"
          :options="segmentationOptions"
          variant="merchant"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button @click="resetFilters" variant="secondary">Reset</Button>
          <Button @click="applyFilters" variant="merchant">Terapkan</Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Export Modal (dipanggil dari parent header) -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan UMKM"
      subtitle="Unduh laporan data UMKM dalam format PDF"
    >
      <div class="space-y-4">
        <div class="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">
                Laporan akan mencakup:
              </p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Data lengkap UMKM (Nama, Pemilik, Email, Telepon)</li>
                <li>Segmentasi dan status UMKM</li>
                <li>Jumlah produk yang dimiliki</li>
                <li>Filter yang diterapkan (Status, Segmentasi, Pencarian)</li>
                <li>Informasi waktu download dan user yang mendownload</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          @click="exportPDF"
          variant="merchant"
          size="lg"
          custom-class="justify-center w-full"
          :loading="exportLoading"
        >
          <i class="mr-2 pi pi-download"></i>
          <span>Download Laporan PDF</span>
        </Button>
      </div>
    </ResponsiveModal>

    <!-- Approve Modal -->
    <ResponsiveModal
      :show="showApproveModal"
      @close="closeApproveModal"
      title="Approve Merchant"
      subtitle="Apakah Anda yakin ingin meng-approve merchant ini?"
    >
      <div class="py-4 text-center">
        <i class="mb-4 text-4xl text-green-500 pi pi-check-circle"></i>
        <p class="mb-2 font-semibold text-gray-800">
          Merchant "{{ selectedMerchant?.name }}" akan di-approve
        </p>
        <p class="text-sm text-gray-500">
          Merchant yang di-approve akan mendapatkan akses penuh ke platform.
        </p>
      </div>

      <div class="flex gap-3 justify-center">
        <Button
          @click="closeApproveModal"
          variant="secondary"
          size="lg"
          custom-class="w-full max-w-[150px]"
          :disabled="processingAction"
        >
          Batal
        </Button>
        <Button
          @click="approveMerchant"
          variant="merchant"
          size="lg"
          custom-class="w-full max-w-[150px]"
          :disabled="processingAction"
          :loading="processingAction"
        >
          Setujui
        </Button>
      </div>
    </ResponsiveModal>

    <!-- Reject Modal -->
    <ResponsiveModal
      :show="showRejectModal"
      @close="closeRejectModal"
      title="Reject Merchant"
      subtitle="Berikan alasan penolakan"
    >
      <div class="space-y-4">
        <textarea
          v-model="rejectionReason"
          class="w-full p-3 border rounded-md resize-none focus:ring-1 focus:ring-primary focus:outline-none"
          rows="3"
          placeholder="Masukkan alasan penolakan di sini..."
        ></textarea>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button
            @click="closeRejectModal"
            variant="secondary"
            :disabled="processingAction"
            >Batal</Button
          >
          <Button
            @click="rejectMerchant"
            variant="merchant"
            :disabled="!rejectionReason.trim() || processingAction"
            :loading="processingAction"
          >
            Tolak Merchant
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Merchant Status Change Modal -->
    <ResponsiveModal
      :show="showStatusModal"
      @close="showStatusModal = false"
      title="Ubah Status Merchant"
      :subtitle="selectedStatusMerchant ? selectedStatusMerchant.name : ''"
    >
      <div class="space-y-4" v-if="selectedStatusMerchant">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <i class="pi pi-building text-gray-500"></i>
          <div>
            <p class="text-xs text-gray-500">Status saat ini</p>
            <StatusLabel :status="selectedStatusMerchant.status" variant="merchant" size="sm" />
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-gray-700 mb-3">Pilih status baru:</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in merchantStatusOptions"
              :key="opt.value"
              @click="newMerchantStatus = opt.value"
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                newMerchantStatus === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              ]"
            >
              <i :class="['pi', newMerchantStatus === opt.value ? 'pi-check-circle' : 'pi-circle', 'text-sm']"></i>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            @click="showStatusModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            @click="confirmMerchantStatusChange"
            :disabled="statusChangeLoading || newMerchantStatus === selectedStatusMerchant.status"
            class="flex-1 px-4 py-2 bg-merchant-primary text-white rounded-lg text-sm font-medium hover:bg-merchant-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <i v-if="statusChangeLoading" class="pi pi-spin pi-spinner text-sm"></i>
            {{ statusChangeLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  </div>
</template>
