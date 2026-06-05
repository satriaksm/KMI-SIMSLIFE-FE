<script setup>
import { ref, computed, watch, onMounted, inject } from "vue";
import { useRouter } from "vue-router";
import { useVouchers } from "@/composables/useVouchers";
import Button from "@/components/common/Button.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import api from "@/libs/axios";

const router = useRouter();
const {
  vouchers,
  loading,
  pagination,
  fetchVouchers,
  activateVoucher,
  deactivateVoucher,
} = useVouchers();

const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref(15);
const filterStatus = ref("");
const filterType = ref("");
const sortBy = ref("");

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
];

const typeOptions = [
  { value: "", label: "Semua Tipe" },
  { value: "percent", label: "Persentase" },
  { value: "fixed", label: "Nominal" },
];

const sortOptions = [
  { value: "", label: "Urutkan" },
  { value: "name_asc", label: "Nama A-Z" },
  { value: "name_desc", label: "Nama Z-A" },
  { value: "start_newest", label: "Tgl Mulai Terbaru" },
  { value: "start_oldest", label: "Tgl Mulai Terlama" },
  { value: "end_newest", label: "Tgl Berakhir Terbaru" },
  { value: "end_oldest", label: "Tgl Berakhir Terlama" },
];

// Active filters
const hasActiveFilters = computed(() => {
  return filterStatus.value || filterType.value || sortBy.value;
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterStatus.value) count++;
  if (filterType.value) count++;
  if (sortBy.value) count++;
  return count;
});

const clearAllFilters = () => {
  filterStatus.value = "";
  filterType.value = "";
  sortBy.value = "";
  currentPage.value = 1;
};

// Toggle filter functions
const toggleStatusFilter = () => {
  if (filterStatus.value === "") {
    filterStatus.value = "active";
  } else if (filterStatus.value === "active") {
    filterStatus.value = "inactive";
  } else {
    filterStatus.value = "";
  }
  currentPage.value = 1;
  loadVouchers();
};

const toggleTypeFilter = () => {
  if (filterType.value === "") {
    filterType.value = "percent";
  } else if (filterType.value === "percent") {
    filterType.value = "fixed";
  } else {
    filterType.value = "";
  }
  currentPage.value = 1;
  loadVouchers();
};

// Get button labels
const getStatusLabel = computed(() => {
  if (filterStatus.value === "active") return "Hanya Aktif";
  if (filterStatus.value === "inactive") return "Hanya Nonaktif";
  return "Semua Status";
});

const getTypeLabel = computed(() => {
  if (filterType.value === "percent") return "Hanya Persentase";
  if (filterType.value === "fixed") return "Hanya Nominal";
  return "Semua Tipe";
});

const loadVouchers = async () => {
  await fetchVouchers({
    page: currentPage.value,
    per_page: perPage.value,
    search: searchQuery.value || undefined,
    voucher_status: filterStatus.value || undefined,
    voucher_type: filterType.value || undefined,
    sort_by: sortBy.value || undefined,
  });
};

const getStatusRibbonClass = (status) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "bg-green-600 text-white";
    case "inactive":
      return "bg-slate-600 text-white";
    case "expired":
      return "bg-red-600 text-white";
    default:
      return "bg-gray-600 text-white";
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadVouchers();
};

const onStatusChange = () => {
  currentPage.value = 1;
  loadVouchers();
};

const onTypeChange = () => {
  currentPage.value = 1;
  loadVouchers();
};

const onSortChange = () => {
  currentPage.value = 1;
  loadVouchers();
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadVouchers();
  }
};

const nextPage = () => {
  if (currentPage.value < pagination.value.last_page) {
    currentPage.value++;
    loadVouchers();
  }
};

const goToPage = (page) => {
  currentPage.value = page;
  loadVouchers();
};

// Format helpers
const formatVoucherType = (type) =>
  type === "percent" ? "Persentase" : "Nominal";

const formatVoucherValue = (item) =>
  item.voucher_type === "percent"
    ? `${item.value}%`
    : formatCurrency(item.value);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getUsage = (item) =>
  `${item.usages_count || 0} / ${item.usage_limit || "∞"}`;

const goToDetail = (item) =>
  router.push({ name: "Admin - Voucher Detail", params: { id: item.id } });

// Status toggle state
const showStatusModal = ref(false);
const voucherToToggle = ref(null);

// Open status toggle modal
const openStatusToggleModal = (voucher) => {
  voucherToToggle.value = voucher;
  showStatusModal.value = true;
};

// Handle status toggle
const handleToggleStatus = async () => {
  if (!voucherToToggle.value) return;

  try {
    if (voucherToToggle.value.voucher_status === "active") {
      await deactivateVoucher(voucherToToggle.value.id);
    } else {
      await activateVoucher(voucherToToggle.value.id);
    }
    showStatusModal.value = false;
    voucherToToggle.value = null;
    await loadVouchers();
  } catch (error) {
    console.error("Failed to toggle voucher status:", error);
  }
};

// Modals
const showExportModal = ref(false); // ✅ NEW
const exportLoading = ref(false); // ✅ NEW

// ✅ Export Modal methods
const openExportModal = () => {
  console.log("openExportModal called in List.vue");
  showExportModal.value = true;
};

const closeExportModal = () => {
  showExportModal.value = false;
};

// ✅ Export PDF method
const exportPDF = async () => {
  console.log("exportPDF called");
  exportLoading.value = true;
  try {
    const response = await api.get("/api/admin/vouchers/export-pdf", {
      responseType: "blob",
      params: {
        voucher_status: filterStatus.value,
        voucher_type: filterType.value,
        search: searchQuery.value,
      },
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vouchers-report-${new Date().toISOString().split("T")[0]}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan vouchers berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

// ✅ Inject the register function from parent
const registerExportModal = inject("registerExportModal", null);

// ✅ Expose openExportModal to parent via register callback
onMounted(() => {
  // Register the export modal function with parent
  if (registerExportModal && typeof registerExportModal === "function") {
    console.log("Registering export modal callback for vouchers list");
    registerExportModal(openExportModal);
  } else {
    console.warn("registerExportModal not provided by parent");
  }
});

let searchDebounceTimer = null;
watch(
  [searchQuery, sortBy],
  () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage.value = 1;
      loadVouchers();
    }, 400);
  },
  { immediate: true },
);
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="space-y-2 sm:space-y-4 mb-4 bg-white">
      <div class="sm:flex sm:items-center sm:gap-4 pb-1">
        <!-- Search Bar -->
        <div class="flex-1 mb-2 sm:mb-0">
          <TextField
            name="search"
            variant="merchant"
            v-model="searchQuery"
            placeholder="Cari kode atau deskripsi voucher..."
            icon="pi pi-search"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Toggle Status Button -->
        <Button
          :variant="filterStatus ? 'merchant' : 'muted-outline'"
          size="md"
          class="w-full sm:w-auto mb-2 sm:mb-0"
          @click="toggleStatusFilter"
        >
          <i
            :class="[
              'mr-2',
              filterStatus === 'active'
                ? 'pi pi-check-circle'
                : filterStatus === 'inactive'
                  ? 'pi pi-times-circle'
                  : 'pi pi-circle',
            ]"
          ></i>
          {{ getStatusLabel }}
        </Button>

        <!-- Toggle Type Button -->
        <Button
          :variant="filterType ? 'merchant' : 'muted-outline'"
          size="md"
          class="w-full sm:w-auto mb-2 sm:mb-0"
          @click="toggleTypeFilter"
        >
          <i
            :class="[
              'mr-2',
              filterType === 'percent'
                ? 'pi pi-percentage'
                : filterType === 'fixed'
                  ? 'pi pi-money-bill'
                  : 'pi pi-tag',
            ]"
          ></i>
          {{ getTypeLabel }}
        </Button>

        <!-- Sort Dropdown -->
        <SelectField
          name="sort-by"
          placeholder="Sortir"
          v-model="sortBy"
          :options="sortOptions"
          variant="merchant"
          class="w-full sm:w-[180px]"
          @change="onSortChange"
        />
      </div>

      <!-- Active Filters Indicator -->
      <div
        v-if="hasActiveFilters"
        class="flex items-center justify-between pt-2 border-t sm:border-0 sm:pt-0"
      >
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-600">
            {{ activeFiltersCount }} filter aktif:
          </span>

          <!-- Status Badge -->
          <span
            v-if="filterStatus.value"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-merchant-primary/10 text-merchant-primary rounded-full text-xs font-medium"
          >
            <i
              :class="[
                'text-xs',
                filterStatus.value === 'active'
                  ? 'pi pi-check-circle'
                  : 'pi pi-times-circle',
              ]"
            ></i>
            {{ filterStatus.value === "active" ? "Aktif" : "Nonaktif" }}
          </span>

          <!-- Type Badge -->
          <span
            v-if="filterType.value"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-merchant-primary/10 text-merchant-primary rounded-full text-xs font-medium"
          >
            <i
              :class="[
                'text-xs',
                filterType.value === 'percent'
                  ? 'pi pi-percentage'
                  : 'pi pi-money-bill',
              ]"
            ></i>
            {{ filterType.value === "percent" ? "Persentase" : "Nominal" }}
          </span>

          <!-- Sort Badge -->
          <span
            v-if="sortBy.value"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-merchant-primary/10 text-merchant-primary rounded-full text-xs font-medium"
          >
            <i class="pi pi-sort-alt text-xs"></i>
            {{ sortOptions.find((o) => o.value === sortBy.value)?.label }}
          </span>
        </div>

        <button
          @click="clearAllFilters"
          class="text-sm text-merchant-primary hover:text-merchant-primary/80 font-medium flex items-center gap-1"
        >
          <i class="pi pi-times text-xs"></i>
          Hapus Semua
        </button>
      </div>
    </div>

    <!-- Desktop Grid View -->
    <div class="hidden sm:block">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="text-center">
          <i
            class="pi pi-spin pi-spinner text-5xl text-merchant-primary mb-4"
          ></i>
          <p class="text-gray-600">Memuat voucher...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="vouchers.length === 0" class="text-center py-20">
        <div
          class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <i class="pi pi-ticket text-4xl text-gray-400"></i>
        </div>
        <p class="text-gray-600 font-medium mb-2">
          {{
            searchQuery || filterStatus || filterType
              ? "Tidak ada voucher yang sesuai"
              : "Belum ada voucher"
          }}
        </p>
        <p class="text-sm text-gray-500 mb-6">
          {{
            searchQuery || filterStatus || filterType
              ? "Coba ubah filter pencarian"
              : "Tambahkan voucher pertama Anda"
          }}
        </p>
        <Button
          v-if="!searchQuery && !filterStatus && !filterType"
          @click="router.push({ name: 'Admin - Create Voucher' })"
          variant="merchant"
          size="sm"
        >
          <i class="pi pi-plus mr-2"></i>
          Tambah Voucher
        </Button>
      </div>

      <!-- Vouchers Grid -->
      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div
            v-for="voucher in vouchers"
            :key="voucher.id"
            @click="goToDetail(voucher)"
            class="relative overflow-hidden border border-gray-200 rounded-xl hover:border-merchant-primary hover:shadow-lg transition-all cursor-pointer group bg-white"
          >
            <!-- Header with Gradient Background -->
            <div
              :class="[
                'relative p-4 mb-3',
                voucher.voucher_status === 'active'
                  ? 'bg-linear-to-br from-green-100 to-emerald-50/30'
                  : 'bg-linear-to-br from-slate-100 to-gray-50/30',
              ]"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 flex items-start gap-3">
                  <div
                    :class="[
                      'p-2.5 rounded-xl',
                      voucher.voucher_status === 'active'
                        ? 'bg-green-100'
                        : voucher.voucher_status === 'inactive'
                          ? 'bg-slate-100'
                          : 'bg-red-100',
                    ]"
                  >
                    <i
                      :class="[
                        'pi pi-ticket text-lg',
                        voucher.voucher_status === 'active'
                          ? 'text-green-600'
                          : voucher.voucher_status === 'inactive'
                            ? 'text-slate-600'
                            : 'text-red-600',
                      ]"
                    ></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-mono font-bold text-gray-900 truncate text-base mb-1.5"
                      :title="voucher.voucher_code"
                    >
                      {{ voucher.voucher_code }}
                    </h4>
                    <div
                      :class="[
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold',
                        voucher.voucher_status === 'active'
                          ? 'bg-green-600 text-white'
                          : voucher.voucher_status === 'inactive'
                            ? 'bg-slate-600 text-white'
                            : 'bg-red-600 text-white',
                      ]"
                    >
                      <span class="w-1 h-1 bg-white rounded-full"></span>
                      {{
                        voucher.voucher_status === "active"
                          ? "AKTIF"
                          : voucher.voucher_status === "inactive"
                            ? "NONAKTIF"
                            : "KADALUARSA"
                      }}
                    </div>
                  </div>
                </div>

                <!-- Toggle Status Button -->
                <Button
                  v-if="voucher.voucher_status !== 'expired'"
                  @click.stop="openStatusToggleModal(voucher)"
                  :variant="
                    voucher.voucher_status === 'active'
                      ? 'secondary'
                      : 'merchant'
                  "
                  size="sm"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  :title="
                    voucher.voucher_status === 'active'
                      ? 'Nonaktifkan'
                      : 'Aktifkan'
                  "
                >
                  <i
                    :class="
                      voucher.voucher_status === 'active'
                        ? 'pi pi-times'
                        : 'pi pi-check'
                    "
                  ></i>
                </Button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-4 pb-4">
              <!-- Event Badge -->
              <div v-if="voucher.event" class="mb-3">
                <div
                  class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-medium"
                >
                  <i class="pi pi-calendar text-blue-600"></i>
                  <span
                    class="truncate max-w-[200px]"
                    :title="voucher.event.event_name"
                  >
                    {{ voucher.event.event_name }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <p class="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                {{ voucher.voucher_description || "Tidak ada deskripsi" }}
              </p>

              <!-- Info Grid -->
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p class="text-xs text-gray-500 mb-1 font-medium">Tipe</p>
                  <p class="text-sm font-bold text-gray-900">
                    {{ formatVoucherType(voucher.voucher_type) }}
                  </p>
                </div>
                <div
                  class="bg-merchant-primary/5 border border-merchant-primary/10 rounded-lg p-3"
                >
                  <p class="text-xs text-merchant-primary/70 mb-1 font-medium">
                    Nilai
                  </p>
                  <p class="text-sm font-bold text-merchant-primary">
                    {{ formatVoucherValue(voucher) }}
                  </p>
                </div>
              </div>

              <!-- Stats -->
              <div class="pt-3 border-t border-gray-100">
                <div
                  class="flex items-center justify-between text-xs text-gray-600 mb-2.5"
                >
                  <span class="flex items-center gap-1.5 font-medium">
                    <i class="pi pi-shopping-cart text-gray-400"></i>
                    {{ formatCurrency(voucher.min_purchase_amount || 0) }}
                  </span>
                  <span class="flex items-center gap-1.5 font-medium">
                    <i class="pi pi-chart-bar text-gray-400"></i>
                    {{ getUsage(voucher) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <i class="pi pi-calendar text-gray-400"></i>
                  <span class="font-medium">{{
                    formatDate(voucher.voucher_start_date)
                  }}</span>
                  <span>-</span>
                  <span class="font-medium">{{
                    formatDate(voucher.voucher_end_date)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Pagination -->
        <div class="flex items-center justify-between pt-4 border-t">
          <div class="text-sm text-gray-600">
            Menampilkan
            {{ (pagination.current_page - 1) * pagination.per_page + 1 }} -
            {{
              Math.min(
                pagination.current_page * pagination.per_page,
                pagination.total,
              )
            }}
            dari {{ pagination.total }} voucher
          </div>
          <div class="flex items-center gap-2">
            <Button
              @click="prevPage"
              :disabled="currentPage === 1"
              variant="secondary"
              size="sm"
            >
              <i class="pi pi-chevron-left"></i>
            </Button>
            <span class="text-sm text-gray-600">
              Halaman {{ currentPage }} dari {{ pagination.last_page }}
            </span>
            <Button
              @click="nextPage"
              :disabled="currentPage === pagination.last_page"
              variant="merchant"
              size="sm"
            >
              <i class="pi pi-chevron-right"></i>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="sm:hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="text-center">
          <i
            class="pi pi-spin pi-spinner text-4xl text-merchant-primary mb-3"
          ></i>
          <p class="text-sm text-gray-600">Memuat voucher...</p>
        </div>
      </div>

      <!-- Empty State for Mobile -->
      <div v-else-if="vouchers.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <i class="pi pi-ticket text-3xl text-gray-400"></i>
        </div>
        <p class="text-gray-600 font-medium mb-2">
          {{
            searchQuery || filterStatus || filterType
              ? "Tidak ada voucher yang sesuai"
              : "Belum ada voucher"
          }}
        </p>
        <p class="text-sm text-gray-500">
          {{
            searchQuery || filterStatus || filterType
              ? "Coba ubah filter pencarian"
              : "Tambahkan voucher pertama Anda"
          }}
        </p>
      </div>

      <!-- Mobile Cards List -->
      <div v-else class="space-y-4">
        <div
          v-for="voucher in vouchers"
          :key="voucher.id"
          @click="goToDetail(voucher)"
          class="relative overflow-hidden border border-gray-200 rounded-xl hover:border-merchant-primary hover:shadow-lg transition-all cursor-pointer group bg-white"
        >
          <!-- Header with Gradient Background -->
          <div
            :class="[
              'relative p-4 mb-3',
              voucher.voucher_status === 'active'
                ? 'bg-linear-to-br from-green-50 to-emerald-50/30'
                : voucher.voucher_status === 'inactive'
                  ? 'bg-linear-to-br from-slate-50 to-gray-50/30'
                  : 'bg-linear-to-br from-red-50 to-rose-50/30',
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div
                  :class="[
                    'p-2.5 rounded-xl',
                    voucher.voucher_status === 'active'
                      ? 'bg-green-100'
                      : voucher.voucher_status === 'inactive'
                        ? 'bg-slate-100'
                        : 'bg-red-100',
                  ]"
                >
                  <i
                    :class="[
                      'pi pi-ticket',
                      voucher.voucher_status === 'active'
                        ? 'text-green-600'
                        : voucher.voucher_status === 'inactive'
                          ? 'text-slate-600'
                          : 'text-red-600',
                    ]"
                  ></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-mono font-bold text-gray-900 truncate mb-1.5">
                    {{ voucher.voucher_code }}
                  </p>
                  <div
                    :class="[
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold',
                      voucher.voucher_status === 'active'
                        ? 'bg-green-600 text-white'
                        : voucher.voucher_status === 'inactive'
                          ? 'bg-slate-600 text-white'
                          : 'bg-red-600 text-white',
                    ]"
                  >
                    <span class="w-1 h-1 bg-white rounded-full"></span>
                    {{
                      voucher.voucher_status === "active"
                        ? "AKTIF"
                        : voucher.voucher_status === "inactive"
                          ? "NONAKTIF"
                          : "KADALUARSA"
                    }}
                  </div>
                </div>
              </div>
              <Button
                @click.stop="openStatusToggleModal(voucher)"
                :variant="
                  voucher.voucher_status === 'active' ? 'secondary' : 'merchant'
                "
                size="sm"
                :title="
                  voucher.voucher_status === 'active'
                    ? 'Nonaktifkan'
                    : 'Aktifkan'
                "
              >
                <i
                  :class="
                    voucher.voucher_status === 'active'
                      ? 'pi pi-times'
                      : 'pi pi-check'
                  "
                ></i>
              </Button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-4 pb-4">
            <!-- Event Badge -->
            <div v-if="voucher.event" class="mb-3">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-medium"
              >
                <i class="pi pi-calendar text-blue-600"></i>
                <span class="truncate max-w-[200px]">{{
                  voucher.event.event_name
                }}</span>
              </div>
            </div>

            <!-- Info -->
            <div class="space-y-2 mb-3">
              <div
                class="flex justify-between items-center p-2 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <span class="text-xs text-gray-600 font-medium">Nilai:</span>
                <span class="font-bold text-sm text-merchant-primary">
                  {{ formatVoucherValue(voucher) }}
                </span>
              </div>
              <div
                class="flex justify-between items-center p-2 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <span class="text-xs text-gray-600 font-medium"
                  >Penggunaan:</span
                >
                <span class="text-sm font-semibold">{{
                  getUsage(voucher)
                }}</span>
              </div>
              <div
                class="flex justify-between items-center p-2 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <span class="text-xs text-gray-600 font-medium"
                  >Min. Pembelian:</span
                >
                <span class="text-sm font-semibold">{{
                  formatCurrency(voucher.min_purchase_amount || 0)
                }}</span>
              </div>
            </div>

            <!-- Period -->
            <div
              class="text-xs text-gray-500 pt-3 border-t flex items-center gap-1.5"
            >
              <i class="pi pi-calendar text-gray-400"></i>
              <span class="font-medium"
                >{{ formatDate(voucher.voucher_start_date) }} -
                {{ formatDate(voucher.voucher_end_date) }}</span
              >
            </div>
          </div>
        </div>

        <!-- Mobile Pagination -->
        <MobilePagination
          :current-page="currentPage"
          :total-pages="pagination.last_page"
          @prev="prevPage"
          @next="nextPage"
          @go-to="goToPage"
        />
      </div>
    </div>

    <!-- Status Toggle Confirmation Modal -->
    <ResponsiveModal
      :show="showStatusModal"
      variant="merchant"
      @close="showStatusModal = false"
      :title="
        voucherToToggle?.voucher_status === 'active'
          ? 'Nonaktifkan Voucher'
          : 'Aktifkan Voucher'
      "
    >
      <div class="space-y-4">
        <div
          :class="[
            'flex items-start gap-3 p-4 border rounded-xl',
            voucherToToggle?.voucher_status === 'active'
              ? 'bg-warning-background/10 border-warning-foreground/20'
              : 'bg-green-50 border-green-200',
          ]"
        >
          <i
            :class="[
              'text-xl shrink-0 mt-0.5',
              voucherToToggle?.voucher_status === 'active'
                ? 'pi pi-exclamation-triangle text-warning-foreground'
                : 'pi pi-check-circle text-green-600',
            ]"
          ></i>
          <div>
            <h4
              :class="[
                'mb-1 text-sm font-semibold',
                voucherToToggle?.voucher_status === 'active'
                  ? 'text-warning-foreground'
                  : 'text-green-700',
              ]"
            >
              {{
                voucherToToggle?.voucher_status === "active"
                  ? "Perhatian!"
                  : "Konfirmasi Aktivasi"
              }}
            </h4>
            <p
              :class="[
                'text-xs',
                voucherToToggle?.voucher_status === 'active'
                  ? 'text-warning-foreground/80'
                  : 'text-green-600',
              ]"
            >
              {{
                voucherToToggle?.voucher_status === "active"
                  ? "Voucher tidak akan dapat digunakan oleh customer setelah dinonaktifkan."
                  : "Voucher akan dapat digunakan oleh customer setelah diaktifkan."
              }}
            </p>
          </div>
        </div>

        <p class="text-sm text-gray-600">
          Apakah Anda yakin ingin
          <strong>{{
            voucherToToggle?.voucher_status === "active"
              ? "menonaktifkan"
              : "mengaktifkan"
          }}</strong>
          voucher
          <strong class="font-mono">{{ voucherToToggle?.voucher_code }}</strong
          >?
        </p>

        <!-- Voucher Info Card -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <div
              :class="[
                'p-2 rounded-lg',
                voucherToToggle?.voucher_status === 'active'
                  ? 'bg-green-100'
                  : 'bg-slate-100',
              ]"
            >
              <i
                :class="[
                  'pi pi-ticket',
                  voucherToToggle?.voucher_status === 'active'
                    ? 'text-green-600'
                    : 'text-slate-600',
                ]"
              ></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 mb-1">
                {{ voucherToToggle?.voucher_code }}
              </p>
              <p class="text-sm text-gray-600 line-clamp-2">
                {{
                  voucherToToggle?.voucher_description || "Tidak ada deskripsi"
                }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <i class="pi pi-tag"></i>
                  {{
                    voucherToToggle?.voucher_type === "percent"
                      ? "Persentase"
                      : "Nominal"
                  }}
                </span>
                <span class="flex items-center gap-1">
                  <i class="pi pi-chart-bar"></i>
                  {{ voucherToToggle?.usages_count || 0 }} /
                  {{ voucherToToggle?.usage_limit || "∞" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showStatusModal = false" variant="secondary">
            Batal
          </Button>
          <Button
            @click="handleToggleStatus"
            variant="merchant"
            :disabled="loading"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            <i
              v-else
              :class="
                voucherToToggle?.voucher_status === 'active'
                  ? 'pi pi-times mr-2'
                  : 'pi pi-check mr-2'
              "
            ></i>
            {{
              voucherToToggle?.voucher_status === "active"
                ? "Nonaktifkan"
                : "Aktifkan"
            }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ✅ Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan Vouchers"
      subtitle="Unduh laporan data vouchers dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">
                Laporan akan mencakup:
              </p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Data lengkap vouchers (Kode, Deskripsi, Tipe, Nilai)</li>
                <li>Status dan periode berlaku voucher</li>
                <li>Minimal pembelian dan limit penggunaan</li>
                <li>Event yang terhubung dengan voucher</li>
                <li>Filter yang diterapkan (Status, Tipe, Pencarian)</li>
                <li>Informasi waktu download dan admin yang mendownload</li>
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
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
