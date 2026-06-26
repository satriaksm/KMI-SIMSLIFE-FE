<script setup>
// =======================
// 1. IMPORTS
// =======================
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue"; // ✅ ADD
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import ProductCard from "@/components/common/ProductCard.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import BulkActionBar from "@/components/common/BulkActionBar.vue";
import { useProducts } from "@/composables/useProducts";
import { useCategories } from "@/composables/useCategories";
import {
  getProductModerationBlock,
  isProductPublishBlocked,
} from "@/utils/moderation";
import ProductModerationBlockModal from "@/components/reports/ProductModerationBlockModal.vue";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();
let perPageDebounceTimer = null;

const debouncedLoadProductsByPerPage = () => {
  if (perPageDebounceTimer) {
    clearTimeout(perPageDebounceTimer);
  }

  perPageDebounceTimer = setTimeout(() => {
    currentPage.value = 1; // reset page
    loadProducts();
  }, 400); // ⏱️ 400ms (ideal untuk UX)
};

// ✅ Merchant slug from route (URL menggunakan slug)
const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

// (Optional) numeric id still available via authStore if needed elsewhere
const currentMerchantId = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return merchant?.id ?? null;
});

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "List Produk",
  },
]);

// ✅ ADD: Get merchant name for display
const currentMerchantName = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return merchant?.name || "UMKM";
});

// ✅ Use products composable
const {
  products,
  loadingExport,
  loading,
  loadingFetchProducts,
  pagination,
  fetchProducts,
  deleteProduct,
  updateProductStatus,
  bulkDeleteProducts,
  bulkUpdateStatus,
  exportExcel,
  exportPDF,
} = useProducts();

// ✅ NEW: Use categories composable
const { categoriesLevel1, loadingLevel1, fetchLevel1Categories } =
  useCategories();

// Emit untuk toggle sidebar dari parent layout
const emit = defineEmits(["toggle-sidebar"]);

// State
const selectedProducts = ref([]); // Array of slugs
const selectAll = ref(false);

// Modals
const showExportModal = ref(false);
const showFilterModal = ref(false);
const showBulkActionModal = ref(false);
const showVisibilityModal = ref(false);
const showDeleteModal = ref(false);
const showBulkDeleteModal = ref(false);
// ✅ ADD: Status change confirmation modals
const showStatusChangeModal = ref(false);
const showBulkStatusChangeModal = ref(false);
const showModerationBlockModal = ref(false);

// Selected items for actions
const selectedProductForVisibility = ref(null);
const selectedProductForDelete = ref(null);
// ✅ ADD: Selected product and new status for confirmation
const selectedProductForStatusChange = ref(null);
const newStatusForChange = ref(null);
const newBulkStatus = ref(null);
const moderationBlockInfo = ref(null);

// Combined modal state for body scroll lock
const isAnyModalOpen = computed(() => {
  return (
    showExportModal.value ||
    showFilterModal.value ||
    showBulkActionModal.value ||
    showVisibilityModal.value ||
    showDeleteModal.value ||
    showBulkDeleteModal.value ||
    showStatusChangeModal.value ||
    showBulkStatusChangeModal.value ||
    showModerationBlockModal.value
  );
});

useBodyScrollLock(isAnyModalOpen);

// Filters
const searchQuery = ref("");
const tempFilters = ref({
  status: "",
  category: "",
  minPrice: null,
  maxPrice: null,
  minStock: null,
  maxStock: null,
  sortByDate: "",
  sortByName: "",
  sortByPrice: "",
  sortByStock: "",
});

const activeFilters = ref({
  status: "",
  category: "",
  minPrice: null,
  maxPrice: null,
  minStock: null,
  maxStock: null,
  sortByDate: "",
  sortByName: "",
  sortByPrice: "",
  sortByStock: "",
});

const currentPage = ref(1);
const perPageOptions = [
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

const perPage = ref(); // default

// ✅ NEW: Build sort_by parameter untuk API
const buildSortByParam = (filters) => {
  if (filters.sortByDate) return filters.sortByDate;
  if (filters.sortByName) return filters.sortByName;
  if (filters.sortByPrice) return filters.sortByPrice;
  if (filters.sortByStock) return filters.sortByStock;
  return "newest";
};

// ✅ UPDATED: Load products dengan merchantSlug dari route
const loadProducts = async () => {
  if (!currentMerchantSlug.value) {
    toast.error("Merchant slug tidak ditemukan");
    return;
  }

  try {
    const sortBy = buildSortByParam(activeFilters.value);

    await fetchProducts({
      merchantSlug: currentMerchantSlug.value,
      searchQuery: searchQuery.value,
      status: activeFilters.value.status,
      category: activeFilters.value.category,
      minPrice: activeFilters.value.minPrice,
      maxPrice: activeFilters.value.maxPrice,
      minStock: activeFilters.value.minStock,
      maxStock: activeFilters.value.maxStock,
      sortBy: sortBy,
      perPage: perPage.value,
      page: currentPage.value,
    });
  } catch (error) {
    // toast error sudah ditangani di composable
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadProducts();
};

// ✅ Toggle product selection using slug
const toggleProductSelection = (productSlug) => {
  const index = selectedProducts.value.indexOf(productSlug);

  if (index > -1) {
    // Remove from selection
    selectedProducts.value.splice(index, 1);
  } else {
    // Add to selection
    selectedProducts.value.push(productSlug);
  }

  // Update selectAll checkbox state
  selectAll.value = selectedProducts.value.length === products.value.length;
};

// ✅ Toggle select all using slug
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedProducts.value = products.value.map((p) => p.slug);
  } else {
    selectedProducts.value = [];
  }
};

// ✅ Bulk Actions - Use real API
const bulkDelete = () => {
  showBulkDeleteModal.value = true;
};

// ✅ NEW: Confirm bulk delete
const confirmBulkDelete = async () => {
  try {
    await bulkDeleteProducts(currentMerchantSlug.value, selectedProducts.value);

    toast.success(`${selectedProductsCount.value} produk berhasil dihapus`);

    selectedProducts.value = [];
    selectAll.value = false;
    closeBulkDeleteModal();
  } catch (e) {
    // toast error sudah ditangani di composable
  }
};

// ✅ NEW: Close bulk delete modal
const closeBulkDeleteModal = () => {
  showBulkDeleteModal.value = false;
};

// Modal methods (unchanged)
const openExportModal = () => {
  showExportModal.value = true;
};

const openFilterModal = () => {
  tempFilters.value = { ...activeFilters.value };
  showFilterModal.value = true;
};

const openBulkActionModal = () => {
  showBulkActionModal.value = true;
};

const closeBulkActionModal = () => {
  showBulkActionModal.value = false;
};

const closeFilterModal = () => {
  showFilterModal.value = false;
};

const closeExportModal = () => {
  showExportModal.value = false;
};

const cancelSelection = () => {
  selectedProducts.value = [];
  selectAll.value = false;
};

const applyFilters = () => {
  activeFilters.value = { ...tempFilters.value };
  currentPage.value = 1;
  closeFilterModal();

  loadProducts();
};

const resetFilters = () => {
  const defaultFilters = {
    status: "",
    category: "",
    minPrice: null,
    maxPrice: null,
    minStock: null,
    maxStock: null,
    sortBy: "newest",
  };

  tempFilters.value = { ...defaultFilters };
  activeFilters.value = { ...defaultFilters };
  currentPage.value = 1;
  closeFilterModal();
  loadProducts();
};

// Helper: buat URL params dari filter aktif
const buildExportParams = () => {
  const params = {
    q: searchQuery.value || undefined,
    status: activeFilters.value.status || undefined,
    category_id: activeFilters.value.category || undefined,
    min_price: activeFilters.value.minPrice ?? undefined,
    max_price: activeFilters.value.maxPrice ?? undefined,
    min_stock: activeFilters.value.minStock ?? undefined,
    max_stock: activeFilters.value.maxStock ?? undefined,
    sort_by: buildSortByParam(activeFilters.value) || "newest",
  };
  Object.keys(params).forEach(
    (k) => params[k] === undefined && delete params[k],
  );
  return params;
};

// Export Excel (via BE)
const confirmExportExcel = async () => {
  await exportExcel(currentMerchantSlug.value, buildExportParams());
  closeExportModal();
};

// Export PDF (via BE)
const confirmExportPDF = async () => {
  await exportPDF(currentMerchantSlug.value, buildExportParams());
  closeExportModal();
};

// ✅ UPDATED: goToCreate with merchantId
const goToCreate = () => {
  router.push({
    name: "Merchant - Buat Product",
    params: { merchantSlug: currentMerchantSlug.value },
  });
};

// ✅ UPDATED: goToEdit with merchantId and slug
const goToEdit = (product) => {
  router.push({
    name: "Merchant - Product Edit",
    params: {
      merchantSlug: currentMerchantSlug.value,
      slug: product.slug, // ✅ gunakan slug
    },
  });
};

// ✅ UPDATED: goToDetail with merchantId and slug
const goToDetail = (product) => {
  router.push({
    name: "Merchant - Product Detail",
    params: {
      merchantSlug: currentMerchantSlug.value,
      slug: product.slug, // ✅ gunakan slug
    },
  });
};

// ✅ Delete product - Use real API
const deleteProductAction = (product) => {
  selectedProductForDelete.value = product;
  showDeleteModal.value = true;
};

// ✅ NEW: Confirm single delete
const confirmDeleteProduct = async () => {
  if (!selectedProductForDelete.value) return;

  await deleteProduct(
    currentMerchantSlug.value,
    selectedProductForDelete.value.slug,
  );
  closeDeleteModal();
};

const hasSelectedProducts = computed(() => {
  return selectedProducts.value.length > 0;
});

const selectedProductsCount = computed(() => {
  return selectedProducts.value.length;
});

// ✅ ADD: Computed untuk mendapatkan data produk yang dipilih (untuk modal preview)
const selectedProductsData = computed(() => {
  return products.value.filter((p) => selectedProducts.value.includes(p.slug));
});

// ✅ ADD: Missing method - Close visibility modal
const closeVisibilityModal = () => {
  showVisibilityModal.value = false;
  selectedProductForVisibility.value = null;
};

// ✅ NEW: Clear individual filter group
const clearFilterGroup = (group) => {
  switch (group) {
    case "sort_date":
      activeFilters.value.sortByDate = "";
      tempFilters.value.sortByDate = "";
      break;
    case "sort_name":
      activeFilters.value.sortByName = "";
      tempFilters.value.sortByName = "";
      break;
    case "sort_price":
      activeFilters.value.sortByPrice = "";
      tempFilters.value.sortByPrice = "";
      break;
    case "sort_stock":
      activeFilters.value.sortByStock = "";
      tempFilters.value.sortByStock = "";
      break;
  }
  loadProducts();
};

// ✅ NEW: Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  selectedProductForDelete.value = null;
};

// Add number formatter helper
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "jt";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "rb";
  }
  return num.toString();
};

const formatPrice = (min, max) => {
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formatCompact = (num) => {
    if (num >= 1000000000) {
      return "Rp " + (num / 1000000000).toFixed(1) + "M";
    }
    if (num >= 1000000) {
      return "Rp " + (num / 1000000).toFixed(1) + "jt";
    }
    return formatter.format(num);
  };

  if (min === max) {
    return formatCompact(min);
  }

  return `${formatCompact(min)} - ${formatCompact(max)}`;
};

// ✅ UPDATED: Pagination methods - sync dengan backend pagination
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

// Helper functions for status
const getStatusLabel = (status) => {
  const labels = {
    published: "Dipublish",
    archived: "Diarsipkan",
    draft: "Draft",
    out_of_stock: "Stok Habis",
  };
  return labels[status] || status;
};

// Toggle visibility method
const toggleProductVisibility = (product) => {
  selectedProductForVisibility.value = product;
  showVisibilityModal.value = true;
};

const openModerationBlockModal = (product, extra = {}) => {
  moderationBlockInfo.value =
    getProductModerationBlock(product) ||
    {
      message:
        extra.message ||
        "Anda tidak dapat mempublish produk ini karena terkena pelanggaran.",
      reportId: extra.reportId ?? null,
      productName: extra.productName ?? product?.name ?? null,
      productSlug: extra.productSlug ?? product?.slug ?? null,
      adminNote: extra.adminNote ?? null,
      canAppeal: extra.canAppeal ?? true,
      hasPendingAppeal: extra.hasPendingAppeal ?? false,
      blocked: true,
    };
  showModerationBlockModal.value = true;
};

const closeModerationBlockModal = () => {
  showModerationBlockModal.value = false;
  moderationBlockInfo.value = null;
};

const handleAppealSubmitted = () => {
  toast.info(
    "Sanggahan berhasil dikirim. Tim moderasi akan meninjau permintaan Anda.",
  );
  loadProducts();
};

// ✅ UPDATED: Confirm visibility change - Show final confirmation
const confirmVisibilityChange = (newStatus) => {
  if (!selectedProductForVisibility.value) return;

  if (
    newStatus === "published" &&
    isProductPublishBlocked(selectedProductForVisibility.value)
  ) {
    const product = selectedProductForVisibility.value;
    closeVisibilityModal();
    openModerationBlockModal(product);
    return;
  }

  selectedProductForStatusChange.value = selectedProductForVisibility.value;
  newStatusForChange.value = newStatus;
  showVisibilityModal.value = false;
  showStatusChangeModal.value = true;
};

// ✅ NEW: Confirm single status change (final step)
const confirmSingleStatusChange = async () => {
  if (!selectedProductForStatusChange.value || !newStatusForChange.value)
    return;

  try {
    await updateProductStatus(
      currentMerchantSlug.value,
      selectedProductForStatusChange.value.slug,
      newStatusForChange.value,
    );
    const statusLabel = getStatusLabel(newStatusForChange.value);
    toast.success(`Status produk berhasil diubah menjadi ${statusLabel}`);
    closeStatusChangeModal();
  } catch (error) {
    if (error?.moderationBlock) {
      closeStatusChangeModal();
      openModerationBlockModal(
        selectedProductForStatusChange.value,
        error.moderationBlock,
      );
    }
  }
};

// ✅ NEW: Close status change modal
const closeStatusChangeModal = () => {
  showStatusChangeModal.value = false;
  selectedProductForStatusChange.value = null;
  newStatusForChange.value = null;
  selectedProductForVisibility.value = null;
};

// ✅ UPDATED: Bulk update status - Show selection modal first
const bulkUpdateStatusAction = (status) => {
  newBulkStatus.value = status;
  showBulkActionModal.value = false;
  showBulkStatusChangeModal.value = true;
};

// ✅ NEW: Confirm bulk status change
const confirmBulkStatusChange = async () => {
  if (!newBulkStatus.value) return;

  try {
    await bulkUpdateStatus(
      currentMerchantSlug.value,
      selectedProducts.value,
      newBulkStatus.value,
    );

    const statusLabel = getStatusLabel(newBulkStatus.value);
    toast.success(
      `${selectedProductsCount.value} produk berhasil diubah menjadi ${statusLabel}`,
    );

    selectedProducts.value = [];
    selectAll.value = false;
    closeBulkStatusChangeModal();
  } catch (e) {
    // error toast sudah di composable
  }
};

// ✅ NEW: Close bulk status change modal
const closeBulkStatusChangeModal = () => {
  showBulkStatusChangeModal.value = false;
  newBulkStatus.value = null;
};

// ✅ IMPROVED: Cookie debugging utility
const logCookies = (context) => {
  if (import.meta.env.DEV) {
    const cookies = document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean);

    const cookieObj = cookies.reduce((acc, cookie) => {
      const [name, value] = cookie.split("=");
      if (name) acc[name] = value?.substring(0, 20) + "...";
      return acc;
    }, {});
  }
};

// ✅ Watch currentMerchantId changes (when switching merchant)
watch(currentMerchantId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    logCookies("merchantId changed"); // ✅ ADD: Log cookies on merchant change

    // Reset filters and pagination
    currentPage.value = 1;
    searchQuery.value = "";
    activeFilters.value = {
      status: "",
      category: "",
      minPrice: null,
      maxPrice: null,
      minStock: null,
      maxStock: null,
      sortByDate: "",
      sortByName: "",
      sortByPrice: "",
      sortByStock: "",
    };
    loadProducts();
  }
});

// ✅ Watch currentPage untuk auto-load
watch(currentPage, () => {
  loadProducts();
});

// Sinkronkan selectAll dengan realita seleksi (desktop ↔ mobile)
watch(selectedProducts, (newVal) => {
  selectAll.value =
    products.value.length > 0 && newVal.length === products.value.length;
});

watch(perPage, (val, oldVal) => {
  if (val === oldVal) return;

  localStorage.setItem("products_per_page", val);
  debouncedLoadProductsByPerPage();
});

// ✅ Initial load
onMounted(async () => {
  const savedPerPage = localStorage.getItem("products_per_page");
  if (savedPerPage) perPage.value = Number(savedPerPage);

  // ✅ Guard di FE juga: cegah akses jika merchant belum approved
  const merchant =
    authStore.getMerchantById(currentMerchantId.value) ||
    authStore.activeMerchant;
  if (!merchant || merchant.status !== "approved") {
    toast.warning(
      "UMKM Anda belum disetujui. Silakan menunggu persetujuan admin.",
    );
    router.push("/merchant-register");
    return;
  }

  await fetchLevel1Categories();
  loadProducts();
});

// ✅ OPTIONS: Status filter options (dikembalikan)
const statusOptions = [
  { label: "Dipublish", value: "published" },
  { label: "Diarsipkan", value: "archived" },
  { label: "Draft", value: "draft" },
];

// ✅ OPTIONS: Category options dari categoriesLevel1 (dikembalikan)
const categoryOptions = computed(() => {
  const items =
    (categoriesLevel1.value || []).map((c) => ({
      label: c.name || c.label,
      value: c.id || c.value,
    })) ?? [];
  return items;
});

// ✅ COUNT: Jumlah filter aktif (dikembalikan agar komponen table & mobile pagination bekerja)
const activeFilterCount = computed(() => {
  let count = 0;
  if (activeFilters.value.status) count++;
  if (activeFilters.value.category) count++;
  if (
    activeFilters.value.minPrice != null ||
    activeFilters.value.maxPrice != null
  )
    count++;
  if (
    activeFilters.value.minStock != null ||
    activeFilters.value.maxStock != null
  )
    count++;
  if (activeFilters.value.sortByDate) count++;
  if (activeFilters.value.sortByName) count++;
  if (activeFilters.value.sortByPrice) count++;
  if (activeFilters.value.sortByStock) count++;
  return count;
});

// ✅ PAGINATION INFO (dikembalikan agar komponen table & mobile pagination bekerja)
const totalPages = computed(() => pagination.value?.last_page ?? 1);
const paginationInfo = computed(() => ({
  current_page: pagination.value?.current_page ?? currentPage.value,
  total: pagination.value?.total ?? 0,
  per_page: pagination.value?.per_page ?? perPage.value,
}));

// Table Configuration
const tableColumns = [
  { key: "name", label: "Produk", sortable: false },
  { key: "sku", label: "SKU", sortable: false, cellClass: "font-mono" },
  { key: "category", label: "Kategori", sortable: false },
  { key: "total_stock", label: "Stok", sortable: false },
  { key: "price", label: "Harga", sortable: false },
  { key: "status", label: "Status", sortable: false },
  { key: "actions", label: "Aksi", sortable: false },
];

const tableActions = [
  {
    icon: "pi-eye",
    label: "Lihat Detail",
    handler: (product) => goToDetail(product),
    variant: "muted-outline",
  },
  {
    icon: "pi-pencil",
    label: "Edit Produk",
    handler: (product) => goToEdit(product),
    variant: "merchant-outline",
  },
  {
    icon: "pi-cog",
    label: "Ubah Status",
    handler: (product) => toggleProductVisibility(product),
    variant: "primary-outline",
  },
  {
    icon: "pi-trash",
    label: "Hapus Produk",
    handler: (product) => deleteProductAction(product),
    variant: "danger-outline",
  },
];
</script>

<template>
  <div class="">
    <!-- Header - FIXED -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-6 bg-white sm:sticky sm:bg-gray-50 sm:z-30 sm:px-6"
    >
      <div class="flex items-center gap-3">
        <!-- Hamburger Button (Mobile) -->
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background sm:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>

        <div>
          <!-- ✅ Desktop: Show breadcrumb -->
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="currentMerchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Kelola produk {{ currentMerchantName }}
            </p>
          </div>

          <!-- ✅ Mobile: Show simple title -->
          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Daftar Produk
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 sm:gap-3">
        <Button
          @click="goToCreate"
          variant="merchant"
          size="sm"
          customClass="!hidden md:!inline"
        >
          <i class="pi pi-plus"></i>
          <span class="hidden ml-2 md:inline">Tambah Produk</span>
        </Button>
        <Button
          @click="goToCreate"
          variant="merchant"
          size="md"
          customClass="md:!hidden"
        >
          <i class="pi pi-plus"></i>
        </Button>
        <Button
          @click="openExportModal"
          variant="merchant-outline"
          size="sm"
          customClass="!hidden md:!inline"
        >
          <i class="pi pi-download"></i>
          <span class="hidden ml-2 md:inline">Export</span>
        </Button>
        <Button
          @click="openExportModal"
          variant="merchant-outline"
          size="md"
          customClass="md:!hidden"
        >
          <i class="pi pi-download"></i>
        </Button>
      </div>
    </div>

    <!-- Spacer untuk kompensasi fixed header -->
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
            placeholder="Cari produk"
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

      <!-- ✅ ADD: Active Filters Display (Debug) -->
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
              {{
                statusOptions.find((o) => o.value === activeFilters.status)
                  ?.label
              }}
              <button
                @click="
                  activeFilters.status = '';
                  loadProducts();
                "
                class="ml-1 hover:text-merchant-primary/80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.category"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-tag"></i>
              Kategori:
              {{
                categoryOptions.find((o) => o.value === activeFilters.category)
                  ?.label || "Unknown"
              }}
              <button
                @click="
                  activeFilters.category = '';
                  loadProducts();
                "
                class="ml-1 hover:text-merchant-primary/80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.minPrice || activeFilters.maxPrice"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-money-bill"></i>
              Harga: Rp{{ activeFilters.minPrice || 0 }} - Rp{{
                activeFilters.maxPrice || "∞"
              }}
              <button
                @click="
                  activeFilters.minPrice = null;
                  activeFilters.maxPrice = null;
                  loadProducts();
                "
                class="ml-1 hover:text-merchant-primary/80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="
                activeFilters.minStock !== null ||
                activeFilters.maxStock !== null
              "
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-box"></i>
              Stok: {{ activeFilters.minStock || 0 }} -
              {{ activeFilters.maxStock || "∞" }} pcs
              <button
                @click="
                  activeFilters.minStock = null;
                  activeFilters.maxStock = null;
                  loadProducts();
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
              v-if="activeFilters.sortByPrice"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-dollar"></i>
              {{
                activeFilters.sortByPrice === "price_asc"
                  ? "Harga Terendah"
                  : "Harga Tertinggi"
              }}
              <button
                @click="clearFilterGroup('sort_price')"
                class="ml-1 hover:opacity-80"
              >
                <i class="text-xs pi pi-times"></i>
              </button>
            </span>

            <span
              v-if="activeFilters.sortByStock"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-medium"
            >
              <i class="text-xs pi pi-box"></i>
              {{
                activeFilters.sortByStock === "stock_asc"
                  ? "Stok Terendah"
                  : "Stok Tertinggi"
              }}
              <button
                @click="clearFilterGroup('sort_stock')"
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

    <!-- ✅ FIXED: Product List -->
    <div class="px-4 sm:px-6">
      <!-- Mobile: Card List -->
      <div
        v-if="!loadingFetchProducts"
        class="flex flex-col gap-2 py-2 sm:hidden"
      >
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :selected="selectedProducts.includes(product.slug)"
          @toggle-select="toggleProductSelection(product.slug)"
          @view-detail="goToDetail"
          @edit="goToEdit"
          @delete="deleteProductAction"
          @toggle-visibility="toggleProductVisibility"
        />
      </div>

      <!-- Desktop: Use MerchantTable Component -->
      <div class="hidden mb-4 sm:block">
        <MerchantTable
          :items="products"
          :row-key="'slug'"
          :loading="loadingFetchProducts"
          :columns="tableColumns"
          :selected-items="selectedProducts"
          :current-page="currentPage"
          :total-pages="totalPages"
          :pagination-info="paginationInfo"
          empty-message="Tidak ada produk untuk ditampilkan."
          @update:selected-items="selectedProducts = $event"
          @row-click="goToDetail"
          @page-change="goToPage"
          @next-page="nextPage"
          @prev-page="prevPage"
        >
          <!-- ✅ FIXED: Custom Product Cell dengan image URL yang benar -->
          <template #cell-name="{ item }">
            <div class="flex items-center gap-3 cursor-pointer">
              <div
                class="w-12 h-12 overflow-hidden rounded-lg shrink-0 bg-muted-background"
              >
                <!-- ✅ FIXED: Gunakan helper getImageUrl -->
                <img
                  v-if="item.cover_image?.src_url"
                  :src="item.cover_image.thumb_url || item.cover_image.src_url"
                  :alt="item.name"
                  class="object-cover w-full h-full"
                  @error="(e) => (e.target.style.display = 'none')"
                />
                <div
                  v-else
                  class="flex items-center justify-center w-full h-full bg-gray-200"
                >
                  <i class="text-gray-400 pi pi-image"></i>
                </div>
              </div>
              <div class="max-w-xs min-w-0">
                <p
                  class="text-sm font-semibold truncate transition text-merchant-primary"
                  :title="item.name"
                >
                  {{ item.name }}
                </p>
              </div>
            </div>
          </template>

          <!-- Custom SKU Cell -->
          <template #cell-sku="{ item }">
            <p
              class="text-sm text-muted-foreground font-mono truncate max-w-[150px]"
              :title="item.sku || '-'"
            >
              {{ item.sku || "-" }}
            </p>
          </template>

          <!-- Custom Stock Cell -->
          <template #cell-total_stock="{ value }">
            <span
              class="inline-flex items-center px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-sm font-medium whitespace-nowrap"
            >
              {{ formatNumber(value || 0) }}
            </span>
          </template>

          <!-- Custom Price Cell -->
          <template #cell-price="{ item }">
            <p
              class="text-sm font-semibold text-merchant-primary truncate max-w-[150px]"
              :title="formatPrice(item.min_price, item.max_price)"
            >
              {{ formatPrice(item.min_price, item.max_price) }}
            </p>
          </template>

          <!-- Custom Status Cell -->
          <template #cell-status="{ item }">
            <div class="flex flex-col gap-1">
              <StatusLabel
                :status="item.status"
                variant="product"
                class="w-fit"
              />
              <StatusLabel
                v-if="item.variants_count > 0 && item.total_stock === 0"
                status="out_of_stock"
                variant="product"
                size="xs"
                label="Stok habis"
              />
            </div>
          </template>

          <!-- ✅ ADD: Custom Category Cell for better styling -->
          <template #cell-category="{ item }">
            <div v-if="item.categories && item.categories.length > 0">
              <span
                class="inline-flex items-center px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-xs font-medium truncate max-w-[150px]"
                :title="item.categories.map((c) => c.name).join(', ')"
              >
                <i class="pi pi-tag text-xs mr-1.5"></i>
                {{ item.categories[0].name }}
              </span>
              <!-- Show count jika ada multiple categories -->
              <span
                v-if="item.categories.length > 1"
                class="ml-1 text-xs text-muted-foreground"
                :title="
                  item.categories
                    .slice(1)
                    .map((c) => c.name)
                    .join(', ')
                "
              >
                +{{ item.categories.length - 1 }}
              </span>
            </div>
            <span v-else class="text-sm italic text-muted-foreground">
              Tidak ada kategori
            </span>
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
    </div>

    <div class="px-4 sm:hidden">
      <div
        v-if="loadingFetchProducts"
        class="flex items-center justify-center py-10 h-[70dvh]"
      >
        <div
          class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
        ></div>
      </div>
    </div>

    <!-- ✅ FIXED: Mobile Pagination (Bottom) -->
    <div
      v-if="!loadingFetchProducts && products.length > 0"
      class="px-4 pb-4 sm:hidden"
    >
      <MobilePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @prev="prevPage"
        @next="nextPage"
        @go-to="goToPage"
      />
    </div>
    <div
      v-else-if="!loadingFetchProducts && products.length === 0"
      class="py-10 text-sm text-center sm:hidden text-muted-foreground"
    >
      Tidak ada produk untuk ditampilkan.
    </div>

    <!-- Spacer untuk Floating Bulk Action Bar (Mobile) -->
    <div v-if="hasSelectedProducts" class="h-20 sm:h-0"></div>

    <!-- BulkActionBar Component -->
    <BulkActionBar
      :selected-count="selectedProductsCount"
      :show="hasSelectedProducts"
      @cancel="cancelSelection"
      @delete="bulkDelete"
      @change-status="openBulkActionModal"
    />

    <!-- UPDATED: Filter Modal - Single Footer untuk Mobile & Desktop -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan Produk"
      show-footer
      @close="closeFilterModal"
    >
      <div class="space-y-6">
        <!-- ===== FILTER SECTION ===== -->
        <div class="space-y-4">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
            <i class="pi pi-filter text-merchant-primary"></i>
            Filter Data
          </h3>

          <!-- Status Filter -->
          <SelectField
            name="filter_status"
            variant="merchant"
            v-model="tempFilters.status"
            label="Status Produk"
            :options="statusOptions"
            placeholder="Semua status"
          />

          <!-- Category Filter -->
          <SelectField
            name="filter_category"
            variant="merchant"
            v-model="tempFilters.category"
            label="Kategori"
            :options="categoryOptions"
            :disabled="loadingLevel1"
            placeholder="Semua kategori"
          />

          <!-- Price Range -->
          <div class="w-full">
            <label class="block mb-2 text-sm font-bold text-black">
              Rentang Harga
            </label>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TextField
                name="filter_min_price"
                variant="merchant"
                v-model.number="tempFilters.minPrice"
                type="number"
                placeholder="Min"
                prefix="Rp"
                :hideLabel="true"
                label="Harga Minimum"
              />
              <span class="px-1 font-bold text-muted-foreground">-</span>
              <TextField
                name="filter_max_price"
                variant="merchant"
                v-model.number="tempFilters.maxPrice"
                type="number"
                placeholder="Max"
                prefix="Rp"
                :hideLabel="true"
                label="Harga Maximum"
              />
            </div>
          </div>

          <!-- Stock Range -->
          <div class="w-full">
            <label class="block mb-2 text-sm font-bold text-black">
              Rentang Stok
            </label>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TextField
                name="filter_min_stock"
                variant="merchant"
                v-model.number="tempFilters.minStock"
                type="number"
                placeholder="Min"
                suffix="pcs"
                :hideLabel="true"
                label="Stok Minimum"
              />
              <span class="px-1 font-bold text-muted-foreground">-</span>
              <TextField
                name="filter_max_stock"
                variant="merchant"
                v-model.number="tempFilters.maxStock"
                type="number"
                placeholder="Max"
                suffix="pcs"
                :hideLabel="true"
                label="Stok Maximum"
              />
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
                @click="tempFilters.sortByDate = 'newest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByDate === 'newest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-down-alt"></i>
                Terbaru
              </button>
              <button
                @click="tempFilters.sortByDate = 'oldest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByDate === 'oldest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-up"></i>
                Terlama
              </button>
            </div>
            <button
              v-if="tempFilters.sortByDate"
              @click="tempFilters.sortByDate = ''"
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
              Nama Produk
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="tempFilters.sortByName = 'name_asc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByName === 'name_asc'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                "
              >
                A → Z
              </button>
              <button
                @click="tempFilters.sortByName = 'name_desc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByName === 'name_desc'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                "
              >
                Z → A
              </button>
            </div>
            <button
              v-if="tempFilters.sortByName"
              @click="tempFilters.sortByName = ''"
              type="button"
              class="mt-2 text-xs text-danger-foreground hover:underline"
            >
              <i class="mr-1 text-xs pi pi-times"></i>
              Hapus urutan nama
            </button>
          </div>

          <!-- Sort by Price -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">
              <i class="mr-1 text-xs pi pi-dollar"></i>
              Harga
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="tempFilters.sortByPrice = 'price_asc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByPrice === 'price_asc'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                "
              >
                <i class="mr-1 text-xs pi pi-arrow-down"></i>
                Terendah
              </button>
              <button
                @click="tempFilters.sortByPrice = 'price_desc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByPrice === 'price_desc'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                "
              >
                <i class="mr-1 text-xs pi pi-arrow-up"></i>
                Tertinggi
              </button>
            </div>
            <button
              v-if="tempFilters.sortByPrice"
              @click="tempFilters.sortByPrice = ''"
              type="button"
              class="mt-2 text-xs text-danger-foreground hover:underline"
            >
              <i class="mr-1 text-xs pi pi-times"></i>
              Hapus urutan harga
            </button>
          </div>

          <!-- Sort by Stock -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">
              <i class="mr-1 text-xs pi pi-box"></i>
              Stok
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="tempFilters.sortByStock = 'stock_asc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByStock === 'stock_asc'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                "
              >
                <i class="mr-1 text-xs pi pi-arrow-down"></i>
                Terendah
              </button>
              <button
                @click="tempFilters.sortByStock = 'stock_desc'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  tempFilters.sortByStock === 'stock_desc'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                "
              >
                <i class="mr-1 text-xs pi pi-arrow-up"></i>
                Tertinggi
              </button>
            </div>
            <button
              v-if="tempFilters.sortByStock"
              @click="tempFilters.sortByStock = ''"
              type="button"
              class="mt-2 text-xs text-danger-foreground hover:underline"
            >
              <i class="mr-1 text-xs pi pi-times"></i>
              Hapus urutan stok
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
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

    <!-- UPDATED: Export Modal - Single Footer -->
    <ResponsiveModal
      v-model:show="showExportModal"
      title="Export Data"
      show-footer
      footer-class="sm:hidden"
      @close="closeExportModal"
    >
      <!-- Content -->
      <div class="space-y-3">
        <button
          @click="confirmExportPDF"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
          :class="
            loadingExport
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-file-pdf text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Export ke PDF
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Download data produk dalam format PDF
            </p>
          </div>
        </button>

        <button
          @click="confirmExportExcel"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
          :class="
            loadingExport
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-file-excel text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Export ke Excel
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Download dalam format Excel (.xlsx)
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="closeExportModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- UPDATED: Bulk Action Modal - Single Footer -->
    <ResponsiveModal
      v-model:show="showBulkActionModal"
      title="Ubah Status Produk"
      :subtitle="`${selectedProductsCount} produk akan diubah statusnya`"
      show-footer
      footer-class="sm:hidden"
      @close="closeBulkActionModal"
    >
      <!-- Body -->
      <div class="space-y-3">
        <!-- Publish Action -->
        <button
          @click="bulkUpdateStatusAction('published')"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-check-circle text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Dipublish
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Produk akan muncul di katalog dan dapat dibeli
            </p>
          </div>
        </button>

        <!-- Archive Action -->
        <button
          @click="bulkUpdateStatusAction('archived')"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-box text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Diarsipkan
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Produk diarsipkan dan tidak aktif
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
      v-model:show="showVisibilityModal"
      title="Ubah Status Produk"
      :subtitle="selectedProductForVisibility?.name"
      show-footer
      footer-class="sm:hidden"
      @close="closeVisibilityModal"
    >
      <!-- Content -->
      <div class="space-y-3">
        <!-- Current Status Info -->
        <div
          v-if="selectedProductForVisibility"
          class="p-4 bg-muted-background rounded-xl"
        >
          <p class="mb-2 text-xs text-muted-foreground">Status Saat Ini</p>
          <StatusLabel
            :status="selectedProductForVisibility.status"
            variant="product"
            size="md"
          />
        </div>

        <!-- Moderation warning for admin-archived products -->
        <div
          v-if="
            selectedProductForVisibility &&
            isProductPublishBlocked(selectedProductForVisibility)
          "
          class="flex items-start gap-3 p-4 border bg-danger-background/10 border-danger-foreground/20 rounded-xl"
        >
          <i
            class="pi pi-ban text-danger-foreground text-lg shrink-0 mt-0.5"
          ></i>
          <div>
            <p class="text-sm font-semibold text-danger-foreground">
              Produk terkena pelanggaran
            </p>
            <p class="text-xs text-danger-foreground/80 mt-1">
              Produk ini diarsipkan oleh admin karena pelanggaran dan tidak
              dapat dipublish kembali hingga sanggahan diterima atau laporan
              ditarik.
            </p>
          </div>
        </div>

        <!-- Publish Action -->
        <button
          @click="confirmVisibilityChange('published')"
          :disabled="selectedProductForVisibility?.status === 'published'"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl group"
          :class="
            selectedProductForVisibility?.status === 'published'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background"
            :class="
              selectedProductForVisibility?.status !== 'published' &&
              'group-hover:scale-110'
            "
          >
            <i class="text-2xl pi pi-check-circle text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Dipublish
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Produk akan muncul di katalog dan dapat dibeli
            </p>
          </div>
        </button>

        <!-- Archive Action -->
        <button
          @click="confirmVisibilityChange('archived')"
          :disabled="selectedProductForVisibility?.status === 'archived'"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl group"
          :class="
            selectedProductForVisibility?.status === 'archived'
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background"
            :class="
              selectedProductForVisibility?.status !== 'archived' &&
              'group-hover:scale-110'
            "
          >
            <i class="text-2xl pi pi-box text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Diarsipkan
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Produk diarsipkan dan tidak aktif
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="closeVisibilityModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- ✅ NEW: Single Delete Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showDeleteModal"
      title="Hapus Produk"
      :subtitle="selectedProductForDelete?.name"
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
              Tindakan ini tidak dapat dibatalkan. Produk akan dihapus permanen
              dari sistem.
            </p>
          </div>
        </div>

        <!-- ✅ FIXED: Product Preview dengan image URL yang benar -->
        <div
          v-if="selectedProductForDelete"
          class="flex items-center gap-3 p-4 bg-muted-background rounded-xl"
        >
          <div class="w-16 h-16 overflow-hidden bg-white rounded-lg shrink-0">
            <!-- ✅ FIXED: Gunakan helper getImageUrl -->
            <img
              v-if="selectedProductForDelete.cover_image?.src_url"
              :src="selectedProductForDelete.cover_image.src_url"
              :alt="selectedProductForDelete.name"
              class="object-cover w-full h-full"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <div
              v-else
              class="flex items-center justify-center w-full h-full bg-gray-200"
            >
              <i class="text-xl text-gray-400 pi pi-image"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-black truncate">
              {{ selectedProductForDelete.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              SKU: {{ selectedProductForDelete.sku || "-" }}
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
            @click="confirmDeleteProduct"
            variant="danger"
            block
            :loading="loading"
          >
            <i class="mr-2 pi pi-trash"></i>
            Hapus Produk
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ✅ FIXED: Bulk Delete Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showBulkDeleteModal"
      title="Hapus Produk Massal"
      :subtitle="`${selectedProductsCount} produk dipilih`"
      show-footer
      @close="closeBulkDeleteModal"
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
              Tindakan ini tidak dapat dibatalkan. Semua produk yang dipilih
              akan dihapus permanen.
            </p>
          </div>
        </div>

        <!-- Selected Products Count -->
        <div class="p-4 text-center bg-muted-background rounded-xl">
          <div class="flex items-center justify-center gap-2 mb-2">
            <i class="text-3xl pi pi-box text-merchant-primary"></i>
            <span class="text-4xl font-bold text-merchant-primary">
              {{ selectedProductsCount }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">Produk akan dihapus</p>
        </div>

        <!-- ✅ FIXED: Product List Preview dengan image URL yang benar -->
        <div
          v-if="selectedProductsData.length > 0"
          class="space-y-2 overflow-y-auto max-h-60"
        >
          <div
            v-for="product in selectedProductsData.slice(0, 5)"
            :key="product.id"
            class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div
              class="w-12 h-12 overflow-hidden rounded-lg shrink-0 bg-muted-background"
            >
              <!-- ✅ FIXED: Gunakan helper getImageUrl -->
              <img
                v-if="product.cover_image?.src_url"
                :src="product.cover_image.src_url"
                :alt="product.name"
                class="object-cover w-full h-full"
                @error="(e) => (e.target.style.display = 'none')"
              />
              <div
                v-else
                class="flex items-center justify-center w-full h-full bg-gray-200"
              >
                <i class="text-gray-400 pi pi-image"></i>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">
                {{ product.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                SKU: {{ product.sku || "-" }}
              </p>
            </div>
          </div>

          <!-- Show more indicator -->
          <div v-if="selectedProductsData.length > 5" class="py-2 text-center">
            <p class="text-xs text-muted-foreground">
              +{{ selectedProductsData.length - 5 }} produk lainnya
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
            Hapus {{ selectedProductsCount }} Produk
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ✅ FIXED: Single Status Change Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showStatusChangeModal"
      title="Konfirmasi Ubah Status"
      :subtitle="selectedProductForStatusChange?.name"
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
              Status produk akan diubah. Pastikan Anda telah memeriksa detail
              produk.
            </p>
          </div>
        </div>

        <!-- ✅ FIXED: Product Preview dengan image URL yang benar -->
        <div
          v-if="selectedProductForStatusChange"
          class="flex items-center gap-3 p-4 bg-muted-background rounded-xl"
        >
          <div class="w-16 h-16 overflow-hidden bg-white rounded-lg shrink-0">
            <!-- ✅ FIXED: Gunakan helper getImageUrl -->
            <img
              v-if="selectedProductForStatusChange.cover_image?.src_url"
              :src="selectedProductForStatusChange.cover_image.src_url"
              :alt="selectedProductForStatusChange.name"
              class="object-cover w-full h-full"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <div
              v-else
              class="flex items-center justify-center w-full h-full bg-gray-200"
            >
              <i class="text-xl text-gray-400 pi pi-image"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-black truncate">
              {{ selectedProductForStatusChange.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              SKU: {{ selectedProductForStatusChange.sku || "-" }}
            </p>
          </div>
        </div>

        <!-- Status Change Info -->
        <div
          class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 bg-white rounded-xl border border-gray-200"
        >
          <div class="text-center">
            <p class="mb-2 text-xs text-muted-foreground">Status Saat Ini</p>
            <StatusLabel
              v-if="selectedProductForStatusChange"
              :status="selectedProductForStatusChange.status"
              variant="product"
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
              :status="newStatusForChange"
              variant="product"
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

    <!-- ✅ FIXED: Bulk Status Change Confirmation Modal -->
    <ResponsiveModal
      v-model:show="showBulkStatusChangeModal"
      title="Konfirmasi Ubah Status Massal"
      :subtitle="`${selectedProductsCount} produk dipilih`"
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
              Status semua produk yang dipilih akan diubah sekaligus.
            </p>
          </div>
        </div>

        <!-- Selected Products Count -->
        <div class="p-4 text-center bg-muted-background rounded-xl">
          <div class="flex items-center justify-center gap-2 mb-2">
            <i class="text-3xl pi pi-box text-merchant-primary"></i>
            <span class="text-4xl font-bold text-merchant-primary">
              {{ selectedProductsCount }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">Produk akan diubah</p>
        </div>

        <!-- New Status Preview -->
        <div class="p-4 bg-white border border-gray-200 rounded-xl">
          <p class="mb-3 text-xs text-center text-muted-foreground">
            Status Baru:
          </p>
          <div class="flex justify-center">
            <StatusLabel
              v-if="newBulkStatus"
              :status="newBulkStatus"
              variant="product"
              size="lg"
            />
          </div>
        </div>

        <!-- ✅ FIXED: Product List Preview dengan image URL yang benar -->
        <div
          v-if="selectedProductsData.length > 0"
          class="space-y-2 overflow-y-auto max-h-60"
        >
          <div
            v-for="product in selectedProductsData.slice(0, 5)"
            :key="product.id"
            class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div
              class="w-12 h-12 overflow-hidden rounded-lg shrink-0 bg-muted-background"
            >
              <!-- ✅ FIXED: Gunakan helper getImageUrl -->
              <img
                v-if="product.cover_image?.src_url"
                :src="product.cover_image.src_url"
                :alt="product.name"
                class="object-cover w-full h-full"
                @error="(e) => (e.target.style.display = 'none')"
              />
              <div
                v-else
                class="flex items-center justify-center w-full h-full bg-gray-200"
              >
                <i class="text-gray-400 pi pi-image"></i>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">
                {{ product.name }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <StatusLabel
                  :status="product.status"
                  variant="product"
                  size="xs"
                />
                <i class="text-xs pi pi-arrow-right text-muted-foreground"></i>
                <StatusLabel
                  :status="newBulkStatus"
                  variant="product"
                  size="xs"
                />
              </div>
            </div>
          </div>

          <!-- Show more indicator -->
          <div v-if="selectedProductsData.length > 5" class="py-2 text-center">
            <p class="text-xs text-muted-foreground">
              +{{ selectedProductsData.length - 5 }} produk lainnya
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
            Ubah {{ selectedProductsCount }} Produk
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <ProductModerationBlockModal
      :show="showModerationBlockModal"
      :block-info="moderationBlockInfo"
      @close="closeModerationBlockModal"
      @appeal-submitted="handleAppealSubmitted"
    />
  </div>
</template>

<style scoped>
/* Desktop table custom scrollbar */
@media (min-width: 640px) {
  .overflow-x-auto::-webkit-scrollbar {
    height: 8px;
  }

  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
}
</style>
