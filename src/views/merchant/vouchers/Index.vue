<script setup>
// =======================
// 1. IMPORTS
// =======================
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import InputDateField from "@/components/forms/InputDateField.vue";
import Button from "@/components/common/Button.vue";
import MerchantList from "@/components/common/MerchantList.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import BulkActionBar from "@/components/common/BulkActionBar.vue";
import { useVouchers } from "@/composables/useVouchers";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { formatPercent, formatPrice, formatDateID } from "@/libs/format";

const {
  vouchers,
  loading,
  loadingDetail,
  pagination,
  fetchMerchantVouchers,
  fetchMerchantVoucherDetail,
  deleteMerchantVoucher,
  editMerchantVoucherStatus,
  bulkDeleteMerchantVoucher,
  editBulkStatus,
} = useVouchers();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

// State
const router = useRouter();
const route = useRoute();
const toast = useToast();

const selectedVouchers = ref([]); // Array of id
const selectAll = ref(false);

const showDeleteModal = ref(false);
const showBulkDeleteModal = ref(false);
const showFilterModal = ref(false);
const showDetailModal = ref(false);
const selectedVoucherDetail = ref(null);
// === STATUS FLOW (SAMA DENGAN PRODUCT) ===
const showStatusModal = ref(false);
const showStatusChangeModal = ref(false);
const showBulkActionModal = ref(false);
const showBulkStatusChangeModal = ref(false);

// Lock body scroll saat modal terbuka (mencegah scroll di belakang modal)
const isAnyModalOpen = computed(() => {
  return (
    showDeleteModal.value ||
    showBulkDeleteModal.value ||
    showFilterModal.value ||
    showDetailModal.value ||
    showStatusModal.value ||
    showStatusChangeModal.value ||
    showBulkActionModal.value ||
    showBulkStatusChangeModal.value
  );
});

useBodyScrollLock(isAnyModalOpen);
const emit = defineEmits(["toggle-sidebar"]);
// Selected
const selectedVoucherForStatus = ref(null);
const selectedVoucherForStatusChange = ref(null);
const newStatusForChange = ref(null);
const newBulkStatus = ref(null);

const selectedVoucherForDelete = ref(null);

const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref();
const selectedVouchersCount = computed(() => selectedVouchers.value.length);
const selectedVouchersData = computed(() =>
  vouchers.value.filter((v) => selectedVouchers.value.includes(v.id)),
);

const defaultFilters = {
  status: "",
  type: "",
  is_expired: "",
  start_date: "",
  end_date: "",
  sortByDate: "",
  sortByName: "",
  sortByValue: "",
  sortByUsage: "",
};

const filters = ref({ ...defaultFilters }); // modal (draft)
const activeFilters = ref({ ...defaultFilters }); // applied

const resetFilters = () => {
  filters.value = { ...defaultFilters };
  activeFilters.value = { ...defaultFilters };
  currentPage.value = 1;
  loadVouchers();
};
const hasActiveSort = (filters) => {
  return (
    !!filters.sortByDate ||
    !!filters.sortByName ||
    !!filters.sortByValue ||
    !!filters.sortByUsage
  );
};
const activeFilterCount = computed(() => {
  let count = 0;
  const f = activeFilters.value;

  // === FILTER BIASA ===
  if (f.status) count++;
  if (f.type) count++;
  if (f.is_expired !== "") count++;
  if (f.start_date) count++;
  if (f.end_date) count++;

  // === SORT (DIHITUNG 1 SAJA) ===
  if (hasActiveSort(f)) count++;

  return count;
});

const buildSortByParam = (filters) => {
  if (filters.sortByDate) return filters.sortByDate;
  if (filters.sortByName) return filters.sortByName;
  if (filters.sortByValue) return filters.sortByValue;
  if (filters.sortByUsage) return filters.sortByUsage;
  return "newest";
};

const openFilterModal = () => {
  showFilterModal.value = true;
};

const applyFilters = () => {
  activeFilters.value = { ...filters.value };
  currentPage.value = 1;
  showFilterModal.value = false;
  loadVouchers();
};

const totalPages = computed(() => pagination.value?.last_page ?? 1);
const paginationInfo = computed(() => ({
  current_page: pagination.value?.current_page ?? currentPage.value,
  total: pagination.value?.total ?? 0,
  per_page: pagination.value?.per_page ?? perPage.value,
}));

const perPageOptions = [
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

const breadcrumbItems = computed(() => [
  {
    label: "List Voucher",
  },
]);

// Table columns
const tableColumns = [
  { key: "voucher_name", label: "Voucher", sortable: false },
  { key: "voucher_code", label: "Kode", sortable: false },
  { key: "value", label: "Nilai", sortable: false },
  { key: "voucher_period", label: "Periode", sortable: false },
  { key: "voucher_status", label: "Status", sortable: false },
  { key: "usage", label: "Pemakaian", sortable: false },
  { key: "actions", label: "Aksi", sortable: false },
];

// Table actions
const tableActions = [
  {
    icon: "pi-eye",
    label: "Lihat Detail",
    handler: (voucher) => goToDetail(voucher),
    variant: "muted-outline",
  },
  {
    icon: "pi-pencil",
    label: "Edit Voucher",
    handler: (voucher) => goToEdit(voucher),
    variant: "merchant-outline",
  },
  {
    icon: "pi-cog",
    label: "Ubah Status",
    handler: (voucher) => toggleVoucherStatus(voucher),
    variant: "primary-outline",
  },
  {
    icon: "pi-trash",
    label: "Hapus Voucher",
    handler: (voucher) => deleteVoucherAction(voucher),
    variant: "danger-outline",
  },
];
const openBulkActionModal = () => {
  showBulkActionModal.value = true;
};
const closeBulkActionModal = () => {
  showBulkActionModal.value = false;
};
const bulkUpdateStatusAction = (status) => {
  newBulkStatus.value = status;
  showBulkActionModal.value = false;
  showBulkStatusChangeModal.value = true;
};

const confirmBulkStatusChange = async () => {
  if (!newBulkStatus.value || selectedVouchers.value.length === 0) return;

  try {
    await editBulkStatus(
      currentMerchantSlug.value,
      selectedVouchers.value,
      newBulkStatus.value,
    );

    toast.success(`${selectedVouchers.value.length} voucher berhasil diubah`);

    selectedVouchers.value = [];
    selectAll.value = false;
    closeBulkStatusChangeModal();
    loadVouchers();
  } catch (e) {}
};

const closeBulkStatusChangeModal = () => {
  showBulkStatusChangeModal.value = false;
  newBulkStatus.value = null;
};

const loadVouchers = async () => {
  if (!currentMerchantSlug.value) return;

  const sortBy = buildSortByParam(activeFilters.value);

  await fetchMerchantVouchers(currentMerchantSlug.value, {
    q: searchQuery.value || undefined,
    page: currentPage.value,
    per_page: perPage.value,

    status: activeFilters.value.status || undefined,
    type: activeFilters.value.type || undefined,
    is_expired:
      activeFilters.value.is_expired !== ""
        ? activeFilters.value.is_expired
        : undefined,
    start_date: activeFilters.value.start_date || undefined,
    end_date: activeFilters.value.end_date || undefined,

    sort_by: sortBy,
  });

  selectedVouchers.value = [];
  selectAll.value = false;
};

// Methods
const handleSearch = () => {
  currentPage.value = 1;
  loadVouchers();
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedVouchers.value = vouchers.value.map((v) => v.id);
  } else {
    selectedVouchers.value = [];
  }
};

const toggleVoucherSelection = (voucherId) => {
  if (!voucherId) return;

  if (selectedVouchers.value.includes(voucherId)) {
    selectedVouchers.value = selectedVouchers.value.filter(
      (id) => id !== voucherId,
    );
  } else {
    selectedVouchers.value = [...selectedVouchers.value, voucherId];
  }

  selectAll.value =
    vouchers.value.length > 0 &&
    selectedVouchers.value.length === vouchers.value.length;
};

const goToCreate = () => {
  router.push({
    name: "Merchant - Buat Voucher",
    params: { merchantSlug: currentMerchantSlug.value },
  });
};

const goToEdit = (voucher) => {
  if (!currentMerchantSlug.value || !voucher?.id) return;

  router.push({
    name: "Merchant - Voucher Edit",
    params: {
      merchantSlug: currentMerchantSlug.value,
      id: voucher.id,
    },
  });
};

const goToDetail = async (voucher) => {
  if (!currentMerchantSlug.value || !voucher?.id) return;

  try {
    showDetailModal.value = true;
    selectedVoucherDetail.value = null;

    const res = await fetchMerchantVoucherDetail(
      currentMerchantSlug.value,
      voucher.id,
    );

    // API kamu return { data: {...} }
    selectedVoucherDetail.value = res.data ?? res;
  } catch (err) {
    showDetailModal.value = false;
  }
};

const deleteVoucherAction = (voucher) => {
  selectedVoucherForDelete.value = voucher;
  showDeleteModal.value = true;
};

const confirmDeleteVoucher = async () => {
  if (!selectedVoucherForDelete.value || !currentMerchantSlug.value) return;

  try {
    await deleteMerchantVoucher(
      currentMerchantSlug.value,
      selectedVoucherForDelete.value.id,
    );

    closeDeleteModal();
    selectedVouchers.value = [];
    selectAll.value = false;

    await loadVouchers();
  } catch (error) {}
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  selectedVoucherForDelete.value = null;
};
const toggleVoucherStatus = (voucher) => {
  selectedVoucherForStatus.value = voucher;
  showStatusModal.value = true;
};

const confirmSingleStatusChange = async () => {
  if (!selectedVoucherForStatusChange.value || !newStatusForChange.value)
    return;

  try {
    await editMerchantVoucherStatus(
      currentMerchantSlug.value,
      selectedVoucherForStatusChange.value.id,
      newStatusForChange.value,
    );

    closeStatusChangeModal();
    loadVouchers();
  } catch (e) {}
};

const closeStatusModal = () => {
  showStatusModal.value = false;
  selectedVoucherForStatus.value = null;
};

const closeStatusChangeModal = () => {
  showStatusChangeModal.value = false;
  selectedVoucherForStatusChange.value = null;
  newStatusForChange.value = null;
  selectedVoucherForStatus.value = null;
};

const confirmStatusChange = (status) => {
  selectedVoucherForStatusChange.value = selectedVoucherForStatus.value;
  newStatusForChange.value = status;

  showStatusModal.value = false;
  showStatusChangeModal.value = true;
};

const bulkDelete = () => {
  showBulkDeleteModal.value = true;
};

const confirmBulkDelete = async () => {
  if (selectedVouchers.value.length === 0) return;

  try {
    await bulkDeleteMerchantVoucher(
      currentMerchantSlug.value,
      selectedVouchers.value,
    );

    toast.success(`${selectedVouchers.value.length} voucher berhasil dihapus`);

    selectedVouchers.value = [];
    selectAll.value = false;
    closeBulkDeleteModal();
    loadVouchers();
  } catch (e) {}
};

const closeBulkDeleteModal = () => {
  showBulkDeleteModal.value = false;
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1);
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1);
  }
};

watch(
  currentMerchantSlug,
  (newVal) => {
    if (newVal) {
      currentPage.value = 1;
      loadVouchers();
    }
  },
  { immediate: true },
);

watch(currentPage, () => {
  loadVouchers();
});

watch(perPage, () => {
  currentPage.value = 1;
  loadVouchers();
});

// Sinkronkan selectAll dengan realita seleksi (desktop ↔ mobile)
watch(selectedVouchers, (newVal) => {
  selectAll.value =
    vouchers.value.length > 0 && newVal.length === vouchers.value.length;
});
onBeforeRouteLeave(() => {
  selectedVouchers.value = [];
  selectAll.value = false;
});
</script>

<template>
  <div>
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="$emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background lg:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Kelola voucher promo.
          </p>
        </div>
      </div>
      <Button
        @click="goToCreate"
        variant="merchant"
        size="sm"
        customClass="!hidden md:!inline"
      >
        <i class="pi pi-plus"></i>
        <span class="hidden ml-2 md:inline">Tambah Voucher</span>
      </Button>
      <Button
        @click="goToCreate"
        variant="merchant"
        size="md"
        customClass="md:!hidden"
      >
        <i class="pi pi-plus"></i>
      </Button>
    </div>

    <div class="h-24 sm:h-0"></div>

    <!-- Search & Toolbar -->
    <div class="px-4 my-2 space-y-2 sm:my-4 sm:px-6 sm:space-y-4">
      <!-- Search Bar -->
      <div class="pb-1 sm:flex sm:items-center sm:gap-4">
        <div class="flex-1 mb-2 sm:mb-0">
          <TextField
            name="search"
            variant="merchant"
            v-model="searchQuery"
            placeholder="Cari voucher"
            icon="pi-search"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Desktop: Filter button inline -->
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

        <SelectField
          name="per_page"
          variant="merchant"
          size="sm"
          v-model="perPage"
          :options="perPageOptions"
          class="hidden sm:block"
          placeholder="10"
        />
      </div>

      <div v-if="activeFilterCount > 0" class="mb-4">
        <div
          class="p-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-filter text-merchant-primary"></i>
              <span class="text-sm font-semibold text-black">
                {{ activeFilterCount }} Filter Aktif
              </span>
            </div>
            <button
              @click="resetFilters"
              class="flex items-center gap-1 text-xs font-medium text-danger-foreground hover:underline"
            >
              <i class="pi pi-times-circle"></i>
              Reset Semua
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <!-- Existing filters (status, category, price, stock) -->
            <span
              v-if="activeFilters.status"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-bookmark"></i>
              Status:
              {{ activeFilters.status === "active" ? "Aktif" : "Tidak Aktif" }}
              <button
                @click="
                  activeFilters.status = '';
                  loadVouchers();
                "
              >
                <i class="pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.type"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-tag"></i>
              Tipe:
              {{ activeFilters.type === "percent" ? "Persentase" : "Nominal" }}
              <button
                @click="
                  activeFilters.type = '';
                  loadVouchers();
                "
                class="ml-1 hover:text-merchant-primary/80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.is_expired !== ''"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-clock"></i>
              Kadaluarsa:
              {{ activeFilters.is_expired === 1 ? "Ya" : "Tidak" }}
              <button
                @click="
                  activeFilters.is_expired = '';
                  loadVouchers();
                "
                class="ml-1 hover:text-merchant-primary/80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <!-- ✅ NEW: Sort Badges (Multiple) -->
            <span
              v-if="activeFilters.sortByDate"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-calendar"></i>
              {{
                activeFilters.sortByDate === "newest" ? "Terbaru" : "Terlama"
              }}
              <button
                @click="clearFilterGroup('sort_date')"
                class="ml-1 hover:opacity-80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.sortByName"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-sort-alpha-down"></i>
              {{
                activeFilters.sortByName === "name_asc"
                  ? "Nama A-Z"
                  : "Nama Z-A"
              }}
              <button
                @click="clearFilterGroup('sort_name')"
                class="ml-1 hover:opacity-80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.sortByValue"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-dollar"></i>
              {{
                activeFilters.sortByValue === "value_asc"
                  ? "Harga Terendah"
                  : "Harga Tertinggi"
              }}
              <button
                @click="clearFilterGroup('sort_value')"
                class="ml-1 hover:opacity-80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.sortByUsage"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-box"></i>
              {{
                activeFilters.sortByUsage === "usage_asc"
                  ? "Stok Terendah"
                  : "Stok Tertinggi"
              }}
              <button
                @click="clearFilterGroup('sort_usage')"
                class="ml-1 hover:opacity-80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- Mobile: Toolbar (Pilih Semua + Filter) -->
      <div
        class="flex flex-row items-center justify-between gap-4 px-3 pb-1 rounded-lg sm:hidden"
      >
        <label class="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            v-model="selectAll"
            @change="toggleSelectAll"
            class="appearance-none w-5 h-5 border-2 border-muted-foreground rounded-md bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
          />
          <span
            class="ml-2 text-xs transition-colors text-muted-foreground group-hover:text-merchant-primary"
          >
            Pilih Semua
          </span>
        </label>

        <div class="flex items-center h-10 gap-1">
          <Button
            @click="openFilterModal"
            variant="muted-outline"
            size="md"
            custom-class="!flex sm:!hidden items-center gap-2 whitespace-nowrap relative h-full items-stretch h-full"
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
          <SelectField
            name="per_page"
            variant="merchant"
            size="sm"
            v-model="perPage"
            :options="perPageOptions"
            class="sm:hidden w-fit"
            placeholder="10"
          />
        </div>
      </div>
    </div>

    <!-- Bulk Action Bar -->
    <BulkActionBar
      :show="selectedVouchers.length > 0"
      :selected-count="selectedVouchers.length"
      @cancel="
        selectedVouchers = [];
        selectAll = false;
      "
      @delete="bulkDelete"
      @change-status="openBulkActionModal"
    />

    <!-- Table -->
    <div class="hidden px-4 sm:block sm:px-6">
      <MerchantTable
        :items="vouchers"
        :row-key="'id'"
        :columns="tableColumns"
        :loading="loading"
        :selected-items="selectedVouchers"
        @update:selected-items="selectedVouchers = $event"
        :current-page="currentPage"
        :total-pages="totalPages"
        :pagination-info="paginationInfo"
        empty-message="Tidak ada voucher untuk ditampilkan."
        @row-click="goToDetail"
        @page-change="goToPage"
        @next-page="nextPage"
        @prev-page="prevPage"
      >
        <template #cell-voucher_name="{ value, item }">
          <div class="flex flex-col items-start gap-1">
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-semibold truncate transition text-merchant-primary"
                :title="value"
              >
                {{ value }}
              </span>
              <span v-if="item.is_secret" class="px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 bg-gray-200 rounded">Secret</span>
            </div>
            <span
              v-if="item.event?.event_name"
              class="text-xs truncate text-muted-foreground"
              :title="item.event?.event_name"
            >
              Event: {{ item.event?.event_name }}
            </span>
          </div>
        </template>
        <template #cell-voucher_code="{ value }">
          <span class="font-mono text-sm text-muted-foreground">{{
            value
          }}</span>
        </template>
        <template #cell-voucher_period="{ item }">
          <span class="text-sm font-semibold truncate text-merchant-primary"
            >{{ formatDateID(item.voucher_start_date) }} -
            {{ formatDateID(item.voucher_end_date) }}</span
          >
        </template>
        <template #cell-voucher_status="{ value, item }">
          <StatusLabel
            v-if="!item.is_expired"
            :status="value === 'active' ? 'success' : 'danger'"
            :label="value === 'active' ? 'Aktif' : 'Tidak Aktif'"
            variant="general"
          />
          <StatusLabel
            v-else
            status="warning"
            label="Kadaluarsa"
            variant="general"
          />
        </template>
        <template #cell-value="{ value, item }">
          <span
            class="text-sm font-semibold text-merchant-primary truncate max-w-[150px]"
          >
            {{
              item.voucher_type === "percent"
                ? formatPercent(value)
                : formatPrice(value)
            }}
          </span>
        </template>
        <template #cell-usage="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-sm font-medium whitespace-nowrap"
            >{{ value }}</span
          >
        </template>
        <template #cell-actions="{ item }">
          <div class="flex gap-1">
            <Button
              v-for="action in tableActions"
              :key="action.label"
              :title="action.label"
              size="sm"
              class="w-8! border-none"
              :variant="action.variant || 'muted'"
              @click.stop="action.handler(item)"
            >
              <i :class="['pi', action.icon, 'text-sm']"></i>
            </Button>
          </div>
        </template>
      </MerchantTable>
    </div>

    <!-- Mobile List (sm and below) -->
    <div class="px-4 sm:hidden">
      <div
        v-if="loading"
        class="flex items-center justify-center py-10 h-[70dvh]"
      >
        <div
          class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
        ></div>
      </div>

      <div
        v-else-if="!vouchers || vouchers.length === 0"
        class="py-10 text-sm text-center text-muted-foreground"
      >
        Tidak ada voucher untuk ditampilkan.
      </div>

      <div v-else class="mb-2 space-y-3">
        <MerchantList
          v-for="voucher in vouchers"
          :key="voucher.id"
          :item="voucher"
          :selected="selectedVouchers.includes(voucher.id)"
          :checkbox-value="voucher.id"
          :show-image="false"
          :title="voucher.voucher_name"
          :subtitle="voucher.voucher_code"
          @toggle-select="toggleVoucherSelection"
          @view-detail="goToDetail"
        >
          <template #badges="{ item }">
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span v-if="item.is_secret" class="px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 bg-gray-200 rounded">Secret</span>
              <span
                class="inline-flex items-center px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-xs font-medium whitespace-nowrap"
              >
                <i class="mr-2 pi pi-box"></i>Pemakaian:
                {{ item.usage || "-" }}
              </span>
            </div>
          </template>

          <template #details="{ item }">
            <div class="grid grid-cols-1 gap-2 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-muted-foreground">Periode</span>
                <span
                  class="text-xs font-semibold truncate text-merchant-primary"
                >
                  {{ formatDateID(item.voucher_start_date) }} -
                  {{ formatDateID(item.voucher_end_date) }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-muted-foreground">Nilai</span>
                <span class="text-xs font-semibold text-merchant-primary">
                  {{
                    item.voucher_type === "percent"
                      ? formatPercent(item.value)
                      : formatPrice(item.value)
                  }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-muted-foreground">Status</span>
                <StatusLabel
                  v-if="!item.is_expired"
                  :status="
                    item.voucher_status === 'active' ? 'success' : 'danger'
                  "
                  :label="
                    item.voucher_status === 'active' ? 'Aktif' : 'Tidak Aktif'
                  "
                  variant="general"
                  size="xs"
                />
                <StatusLabel
                  v-else
                  status="warning"
                  label="Kadaluarsa"
                  variant="general"
                  size="xs"
                />
              </div>
            </div>
          </template>

          <template #actions="{ item }">
            <div class="flex items-center justify-between gap-2">
              <Button
                variant="danger-outline"
                class="w-4! border-none"
                @click.stop="deleteVoucherAction(item)"
              >
                <i class="pi pi-trash"></i>
              </Button>

              <div class="flex gap-2">
                <Button
                  variant="muted-outline"
                  class="w-6! border-none"
                  title="Lihat Detail"
                  @click.stop="goToDetail(item)"
                >
                  <i class="pi pi-eye"></i>
                </Button>

                <Button
                  variant="merchant-outline"
                  class="w-6! border-none"
                  title="Edit Voucher"
                  @click.stop="goToEdit(item)"
                >
                  <i class="pi pi-pencil"></i>
                </Button>

                <Button
                  variant="primary-outline"
                  class="w-6! border-none"
                  title="Ubah Status"
                  @click.stop="toggleVoucherStatus(item)"
                >
                  <i class="pi pi-cog"></i>
                </Button>
              </div>
            </div>
          </template>
        </MerchantList>
      </div>
    </div>

    <div v-if="!loading && vouchers.length" class="px-4 pb-4 sm:hidden">
      <MobilePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @prev="prevPage"
        @next="nextPage"
        @go="goToPage"
      />
    </div>

    <!-- Delete Modal -->
    <ResponsiveModal
      v-model:show="showDeleteModal"
      title="Hapus Voucher"
      :subtitle="selectedVoucherForDelete?.voucher_name"
      show-footer
      @close="closeDeleteModal"
    >
      <!-- Content -->
      <div class="space-y-4">
        <!-- Warning Banner -->
        <div
          class="flex items-start gap-3 p-4 border bg-danger-background/10 border-danger-foreground/20 rounded-xl"
        >
          <i
            class="pi pi-exclamation-triangle text-danger-foreground text-xl shrink-0 mt-0.5"
          ></i>
          <div>
            <h4 class="mb-1 text-sm font-semibold text-danger-foreground">
              Peringatan!
            </h4>
            <p class="text-xs text-danger-foreground/80">
              Tindakan ini tidak dapat dibatalkan. Voucher akan dihapus permanen
              dari sistem.
            </p>
          </div>
        </div>

        <!-- ✅ FIXED: Product Preview dengan image URL yang benar -->
        <div
          v-if="selectedVoucherForDelete"
          class="flex items-center gap-3 p-4 bg-muted-background rounded-xl"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-black truncate">
              {{ selectedVoucherForDelete.voucher_name }}
            </p>
            <p class="text-xs text-muted-foreground">
              Kode Voucher: {{ selectedVoucherForDelete.voucher_code || "-" }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <div class="flex gap-3">
          <Button @click="closeDeleteModal" variant="muted-outline" block>
            <i class="mr-2 pi pi-times"></i>
            Batal
          </Button>
          <Button
            @click="confirmDeleteVoucher"
            variant="danger"
            block
            :loading="loading"
          >
            <i class="mr-2 pi pi-trash"></i>
            Hapus Voucher
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Bulk Delete Modal -->
    <ResponsiveModal
      v-model:show="showBulkDeleteModal"
      title="Hapus voucher Massal"
      :subtitle="`${selectedVouchersCount} voucher dipilih`"
      show-footer
      @close="closeBulkDeleteModal"
    >
      <div class="space-y-4">
        <!-- Warning Banner -->
        <div
          class="flex items-start gap-3 p-4 border bg-danger-background/10 border-danger-foreground/20 rounded-xl"
        >
          <i
            class="pi pi-exclamation-triangle text-danger-foreground text-xl shrink-0 mt-0.5"
          ></i>
          <div>
            <h4 class="mb-1 text-sm font-semibold text-danger-foreground">
              Peringatan!
            </h4>
            <p class="text-xs text-danger-foreground/80">
              Tindakan ini tidak dapat dibatalkan. Semua voucher yang dipilih
              akan dihapus permanen.
            </p>
          </div>
        </div>

        <!-- Selected Products Count -->
        <div class="p-4 text-center bg-muted-background rounded-xl">
          <div class="flex items-center justify-center gap-2 mb-2">
            <i class="text-3xl pi pi-tag text-merchant-primary"></i>
            <span class="text-4xl font-bold text-merchant-primary">
              {{ selectedVouchersCount }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">Voucher akan dihapus</p>
        </div>

        <!-- ✅ FIXED: Product List Preview dengan image URL yang benar -->
        <div
          v-if="selectedVouchersData.length > 0"
          class="space-y-2 overflow-y-auto max-h-60"
        >
          <div
            v-for="voucher in selectedVouchersData.slice(0, 5)"
            :key="voucher.id"
            class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">
                {{ voucher.voucher_name }}
              </p>
              <p class="text-xs text-muted-foreground">
                Kode Voucher: {{ voucher.voucher_code || "-" }}
              </p>
            </div>
          </div>

          <!-- Show more indicator -->
          <div v-if="selectedVouchersData.length > 5" class="py-2 text-center">
            <p class="text-xs text-muted-foreground">
              +{{ selectedVouchersData.length - 5 }} voucher lainnya
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <div class="flex gap-3">
          <Button @click="closeBulkDeleteModal" variant="muted-outline" block>
            <i class="mr-2 pi pi-times"></i>
            Batal
          </Button>
          <Button
            @click="confirmBulkDelete"
            variant="danger"
            block
            :loading="loading"
          >
            <i class="mr-2 pi pi-trash"></i>
            Hapus {{ selectedVouchersCount }} Voucher
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ✅ FIXED: Single Status Change Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showStatusChangeModal"
      title="Konfirmasi Ubah Status"
      :subtitle="selectedVoucherForStatusChange?.voucher_name"
      show-footer
      @close="closeStatusChangeModal"
    >
      <!-- Content -->
      <div class="space-y-4">
        <!-- Warning Banner -->
        <div
          class="flex items-start gap-3 p-4 border bg-warning-background/10 border-warning-foreground/20 rounded-xl"
        >
          <i
            class="pi pi-info-circle text-warning-foreground text-xl shrink-0 mt-0.5"
          ></i>
          <div>
            <h4 class="mb-1 text-sm font-semibold text-warning-foreground">
              Perhatian!
            </h4>
            <p class="text-xs text-warning-foreground/80">
              Status voucher akan diubah. Pastikan Anda telah memeriksa detail
              voucher.
            </p>
          </div>
        </div>

        <!-- ✅ FIXED: Product Preview dengan image URL yang benar -->
        <div
          v-if="selectedVoucherForStatusChange"
          class="flex items-center gap-3 p-4 bg-muted-background rounded-xl"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-black truncate">
              {{ selectedVoucherForStatusChange.voucher_name }}
            </p>
            <p class="text-xs text-muted-foreground">
              Kode Voucher:
              {{ selectedVoucherForStatusChange.voucher_code || "-" }}
            </p>
          </div>
        </div>

        <!-- Status Change Info -->
        <div
          class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 p-4 bg-white rounded-xl border border-gray-200"
        >
          <div class="text-center">
            <p class="mb-2 text-xs text-muted-foreground">Status Saat Ini</p>
            <StatusLabel
              v-if="selectedVoucherForStatusChange"
              :status="
                selectedVoucherForStatusChange.voucher_status === 'active'
                  ? 'success'
                  : 'danger'
              "
              :label="
                selectedVoucherForStatusChange.voucher_status === 'active'
                  ? 'Aktif'
                  : 'Tidak aktif'
              "
              variant="general"
              size="md"
            />
          </div>

          <div class="flex items-center justify-center">
            <i class="text-xl pi pi-arrow-right text-merchant-primary"></i>
          </div>

          <div class="text-center">
            <p class="mb-2 text-xs text-muted-foreground">Status Baru</p>
            <StatusLabel
              v-if="newStatusForChange"
              :status="newStatusForChange === 'active' ? 'success' : 'danger'"
              :label="newStatusForChange === 'active' ? 'Aktif' : 'Tidak aktif'"
              variant="general"
              size="md"
            />
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <div class="flex gap-3">
          <Button @click="closeStatusChangeModal" variant="muted-outline" block>
            <i class="mr-2 pi pi-times"></i>
            Batal
          </Button>

          <Button
            @click="confirmSingleStatusChange"
            variant="merchant"
            block
            :loading="loading"
          >
            <i class="mr-2 pi pi-check"></i>
            Ubah Status
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- UPDATED: Bulk Action Modal - Single Footer -->
    <ResponsiveModal
      v-model:show="showBulkActionModal"
      title="Ubah Status Voucher Massal"
      :subtitle="`${selectedVouchersCount} voucher akan diubah statusnya`"
      show-footer
      footer-class="sm:hidden"
      @close="closeBulkActionModal"
    >
      <!-- Body -->
      <div class="space-y-3">
        <!-- Publish Action -->
        <button
          @click="bulkUpdateStatusAction('active')"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-check-circle text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">Aktif</h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Voucher akan muncul di checkout dan dapat digunakan
            </p>
          </div>
        </button>

        <!-- Archive Action -->
        <button
          @click="bulkUpdateStatusAction('inactive')"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-box text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Tidak Aktif
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Voucher tidak aktif dan tidak dapat digunakan
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="closeBulkActionModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- UPDATED: Visibility Modal - Single Footer -->
    <ResponsiveModal
      v-model:show="showStatusModal"
      title="Ubah Status Voucher"
      :subtitle="selectedVoucherForStatus?.voucher_name"
      show-footer
      footer-class="sm:hidden"
      @close="closeStatusModal"
    >
      <!-- Content -->
      <div class="space-y-3">
        <!-- Current Status Info -->
        <div
          v-if="selectedVoucherForStatus"
          class="p-4 bg-muted-background rounded-xl"
        >
          <p class="mb-2 text-xs text-muted-foreground">Status Saat Ini</p>
          <StatusLabel
            :status="
              selectedVoucherForStatus.voucher_status === 'active'
                ? 'success'
                : 'danger'
            "
            :label="
              selectedVoucherForStatus.voucher_status === 'active'
                ? 'Aktif'
                : 'Tidak aktif'
            "
            variant="general"
            size="md"
          />
        </div>

        <!-- Publish Action -->
        <button
          @click="confirmStatusChange('active')"
          :disabled="selectedVoucherForStatus?.voucher_status === 'active'"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl group"
          :class="
            selectedVoucherForStatus?.voucher_status === 'active'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background"
            :class="
              selectedVoucherForStatus?.voucher_status !== 'active' &&
              'group-hover:scale-110'
            "
          >
            <i class="text-2xl pi pi-check-circle text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">Aktif</h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Voucher akan muncul di checkout dan dapat digunakan
            </p>
          </div>
        </button>

        <!-- Archive Action -->
        <button
          @click="confirmStatusChange('inactive')"
          :disabled="selectedVoucherForStatus?.voucher_status === 'inactive'"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl group"
          :class="
            selectedVoucherForStatus?.voucher_status === 'inactive'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background"
            :class="
              selectedVoucherForStatus?.voucher_status !== 'inactive' &&
              'group-hover:scale-110'
            "
          >
            <i class="text-2xl pi pi-box text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Tidak Aktif
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Voucher tidak aktif dan tidak dapat digunakan
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="closeStatusModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- ✅ FIXED: Bulk Status Change Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showBulkStatusChangeModal"
      title="Konfirmasi Ubah Status Massal"
      :subtitle="`${selectedVouchersCount} voucher dipilih`"
      show-footer
      @close="closeBulkStatusChangeModal"
    >
      <!-- Content -->
      <div class="space-y-4">
        <!-- Warning Banner -->
        <div
          class="flex items-start gap-3 p-4 border bg-warning-background/10 border-warning-foreground/20 rounded-xl"
        >
          <i
            class="pi pi-info-circle text-warning-foreground text-xl shrink-0 mt-0.5"
          ></i>
          <div>
            <h4 class="mb-1 text-sm font-semibold text-warning-foreground">
              Perhatian!
            </h4>
            <p class="text-xs text-warning-foreground/80">
              Status semua voucher yang dipilih akan diubah sekaligus.
            </p>
          </div>
        </div>

        <!-- Selected Vouchers Count -->
        <div class="p-4 text-center bg-muted-background rounded-xl">
          <div class="flex items-center justify-center gap-2 mb-2">
            <i class="text-3xl pi pi-tag text-merchant-primary"></i>
            <span class="text-4xl font-bold text-merchant-primary">
              {{ selectedVouchersCount }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">Voucher akan diubah</p>
        </div>

        <!-- New Status Preview -->
        <div class="p-4 bg-white border border-gray-200 rounded-xl">
          <p class="mb-3 text-xs text-center text-muted-foreground">
            Status Baru:
          </p>
          <div class="flex justify-center">
            <StatusLabel
              v-if="newBulkStatus"
              :status="newBulkStatus === 'active' ? 'success' : 'danger'"
              :label="newBulkStatus === 'active' ? 'Aktif' : 'Tidak aktif'"
              variant="general"
              size="lg"
            />
          </div>
        </div>

        <!-- ✅ FIXED: Voucher List Preview dengan image URL yang benar -->
        <div
          v-if="selectedVouchersData.length > 0"
          class="space-y-2 overflow-y-auto max-h-60"
        >
          <div
            v-for="voucher in selectedVouchersData.slice(0, 5)"
            :key="voucher.id"
            class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">
                {{ voucher.voucher_name }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <StatusLabel
                  :status="
                    voucher.voucher_status === 'active' ? 'success' : 'danger'
                  "
                  :label="
                    voucher.voucher_status === 'active'
                      ? 'Aktif'
                      : 'Tidak aktif'
                  "
                  variant="general"
                  size="xs"
                />
                <i class="text-xs pi pi-arrow-right text-muted-foreground"></i>
                <StatusLabel
                  :status="newBulkStatus === 'active' ? 'success' : 'danger'"
                  :label="newBulkStatus === 'active' ? 'Aktif' : 'Tidak aktif'"
                  variant="general"
                  size="xs"
                />
              </div>
            </div>
          </div>

          <!-- Show more indicator -->
          <div v-if="selectedVouchersData.length > 5" class="py-2 text-center">
            <p class="text-xs text-muted-foreground">
              +{{ selectedVouchersData.length - 5 }} voucher lainnya
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <div class="flex gap-3">
          <Button
            @click="closeBulkStatusChangeModal"
            variant="muted-outline"
            block
          >
            <i class="mr-2 pi pi-times"></i>
            Batal
          </Button>
          <Button
            @click="confirmBulkStatusChange"
            variant="merchant"
            block
            :loading="loading"
          >
            <i class="mr-2 pi pi-check"></i>
            Ubah {{ selectedVouchersCount }} Voucher
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <ResponsiveModal
      v-model:show="showDetailModal"
      title="Detail Voucher"
      :show-footer="true"
    >
      <!-- Loading -->
      <div
        v-if="loadingDetail"
        class="py-10 text-sm text-center text-muted-foreground"
      >
        Memuat detail voucher...
      </div>

      <!-- Content -->
      <div v-else-if="selectedVoucherDetail" class="space-y-4 text-sm">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted-foreground">Nama Voucher</p>
            <p class="font-semibold">
              {{ selectedVoucherDetail.voucher_name }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Voucher Event</p>
            <p class="font-semibold">
              {{ selectedVoucherDetail.event?.event_name || "-" }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Kode Voucher</p>
            <p class="font-mono font-semibold text-merchant-primary">
              {{ selectedVoucherDetail.voucher_code }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Status</p>
            <StatusLabel
              v-if="!selectedVoucherDetail.is_expired"
              :status="
                selectedVoucherDetail.voucher_status === 'active'
                  ? 'success'
                  : 'danger'
              "
              :label="
                selectedVoucherDetail.voucher_status === 'active'
                  ? 'Aktif'
                  : 'Tidak Aktif'
              "
              variant="general"
            />
            <StatusLabel
              v-else
              status="warning"
              label="Kadaluarsa"
              variant="general"
            />
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Tipe Voucher</p>
            <p class="font-semibold">
              {{
                selectedVoucherDetail.voucher_type === "percent"
                  ? "Persentase"
                  : "Nominal"
              }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Nilai Voucher</p>
            <p class="font-semibold text-merchant-primary">
              {{
                selectedVoucherDetail.voucher_type === "percent"
                  ? formatPercent(selectedVoucherDetail.value)
                  : formatPrice(selectedVoucherDetail.value)
              }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Pemakaian/Orang</p>
            <p class="font-semibold">
              {{ selectedVoucherDetail.usage_limit_per_user }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Total Pemakaian</p>
            <p class="font-semibold">
              {{ selectedVoucherDetail.usage }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Minimal Pembelian</p>
            <p class="font-semibold">
              {{ formatPrice(selectedVoucherDetail.min_purchase_amount) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Maksimal Diskon</p>
            <p
              v-if="selectedVoucherDetail.max_discount_amount"
              class="font-semibold"
            >
              {{ formatPrice(selectedVoucherDetail.max_discount_amount) }}
            </p>
            <p v-else>-</p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Berlaku Dari</p>
            <p class="font-semibold">
              {{ formatDateID(selectedVoucherDetail.voucher_start_date) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Berlaku Sampai</p>
            <p class="font-semibold">
              {{ formatDateID(selectedVoucherDetail.voucher_end_date) }}
            </p>
          </div>
        </div>

        <div>
          <p class="text-xs text-muted-foreground">Deskripsi</p>
          <p class="mt-1 whitespace-pre-line">
            {{ selectedVoucherDetail.voucher_description || "-" }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showDetailModal = false"
          >
            Tutup
          </Button>
          <Button
            variant="primary"
            block
            @click="goToEdit(selectedVoucherDetail)"
          >
            Edit
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan Voucher"
      :show-footer="true"
    >
      <div class="mb-6 space-y-4">
        <h3
          class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
        >
          <i class="pi pi-filter text-merchant-primary"></i>
          Filter Data
        </h3>
        <!-- Status -->
        <SelectField
          name="status"
          label="Status Voucher"
          variant="merchant"
          v-model="filters.status"
          :options="[
            { label: 'Aktif', value: 'active' },
            { label: 'Tidak Aktif', value: 'inactive' },
          ]"
          placeholder="Semua status"
        />

        <!-- Type -->
        <SelectField
          name="type"
          label="Tipe Voucher"
          variant="merchant"
          v-model="filters.type"
          :options="[
            { label: 'Persentase', value: 'percent' },
            { label: 'Nominal', value: 'fixed' },
          ]"
          placeholder="Semua tipe"
        />

        <!-- Expired -->
        <SelectField
          name="is_expired"
          label="Status Kadaluarsa"
          variant="merchant"
          v-model="filters.is_expired"
          :options="[
            { label: 'Aktif', value: 0 },
            { label: 'Kadaluarsa', value: 1 },
          ]"
          placeholder="Semua"
        />

        <div class="w-full">
          <label class="block mb-2 text-sm font-bold text-black">
            Rentang Tanggal Voucher
          </label>
          <div
            class="grid items-center grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2"
          >
            <div class="min-w-0">
              <InputDateField
                label="Mulai dari"
                variant="merchant"
                v-model="filters.start_date"
                :hideLabel="true"
              />
            </div>
            <span class="px-1 font-bold text-muted-foreground">-</span>

            <div class="min-w-0">
              <InputDateField
                label="Sampai"
                variant="merchant"
                v-model="filters.end_date"
                :hideLabel="true"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- ===== SORT SECTION ===== -->
      <div class="pt-6 space-y-4 border-t border-muted-foreground/30">
        <h3
          class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
        >
          <i class="pi pi-sort-alt text-merchant-primary"></i>
          Urutkan Berdasarkan
        </h3>

        <!-- Sort by Date -->
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-700">
            <i class="mr-1 text-xs pi pi-calendar"></i>
            Waktu Pembuatan
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="filters.sortByDate = 'newest'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByDate === 'newest'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              "
            >
              <i class="mr-1 text-xs pi pi-sort-amount-down-alt"></i>
              Terbaru
            </button>
            <button
              @click="filters.sortByDate = 'oldest'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByDate === 'oldest'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              "
            >
              <i class="mr-1 text-xs pi pi-sort-amount-up"></i>
              Terlama
            </button>
          </div>
          <button
            v-if="filters.sortByDate"
            @click="filters.sortByDate = ''"
            type="button"
            class="mt-2 text-xs text-danger-foreground hover:underline"
          >
            <i class="mr-1 text-xs pi pi-times"></i>
            Hapus urutan waktu
          </button>
        </div>

        <!-- Sort by Name -->
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-700">
            <i class="mr-1 text-xs pi pi-sort-alpha-down"></i>
            Nama Voucher
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="filters.sortByName = 'name_asc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByName === 'name_asc'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
              "
            >
              A → Z
            </button>
            <button
              @click="filters.sortByName = 'name_desc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByName === 'name_desc'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
              "
            >
              Z → A
            </button>
          </div>
          <button
            v-if="filters.sortByName"
            @click="filters.sortByName = ''"
            type="button"
            class="mt-2 text-xs text-danger-foreground hover:underline"
          >
            <i class="mr-1 text-xs pi pi-times"></i>
            Hapus urutan nama
          </button>
        </div>

        <!-- Sort by Value -->
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-700">
            <i class="mr-1 text-xs pi pi-dollar"></i>
            Nilai Voucher
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="filters.sortByValue = 'value_asc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByValue === 'value_asc'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
              "
            >
              <i class="mr-1 text-xs pi pi-arrow-down"></i>
              Terendah
            </button>
            <button
              @click="filters.sortByValue = 'value_desc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByValue === 'value_desc'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
              "
            >
              <i class="mr-1 text-xs pi pi-arrow-up"></i>
              Tertinggi
            </button>
          </div>
          <button
            v-if="filters.sortByValue"
            @click="filters.sortByValue = ''"
            type="button"
            class="mt-2 text-xs text-danger-foreground hover:underline"
          >
            <i class="mr-1 text-xs pi pi-times"></i>
            Hapus urutan nilai
          </button>
        </div>

        <!-- Sort by Usage -->
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-700">
            <i class="mr-1 text-xs pi pi-box"></i>
            Penggunaan Voucher
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="filters.sortByUsage = 'usage_asc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByUsage === 'usage_asc'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
              "
            >
              <i class="mr-1 text-xs pi pi-arrow-down"></i>
              Terendah
            </button>
            <button
              @click="filters.sortByUsage = 'usage_desc'"
              type="button"
              class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
              :class="
                filters.sortByUsage === 'usage_desc'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
              "
            >
              <i class="mr-1 text-xs pi pi-arrow-up"></i>
              Tertinggi
            </button>
          </div>
          <button
            v-if="filters.sortByUsage"
            @click="filters.sortByUsage = ''"
            type="button"
            class="mt-2 text-xs text-danger-foreground hover:underline"
          >
            <i class="mr-1 text-xs pi pi-times"></i>
            Hapus urutan penggunaan
          </button>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button @click="resetFilters" variant="muted-outline" block>
            <i class="mr-2 pi pi-refresh"></i>
            Reset
          </Button>
          <Button @click="applyFilters" block variant="merchant">
            <i class="mr-2 pi pi-check"></i>
            Terapkan
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
/* Custom style jika perlu */
</style>
