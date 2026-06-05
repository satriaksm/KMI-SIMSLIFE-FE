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
import JasaCard from "@/components/common/ProductCard.vue"; // reuse ProductCard for jasa listing
import MobilePagination from "@/components/common/MobilePagination.vue";
import BulkActionBar from "@/components/common/BulkActionBar.vue";
import { useJasa } from "@/composables/useJasa"; // ✅ GANTI: import useJasa
import { useCategories } from "@/composables/useCategories";
import { getImageUrl } from "@/libs/getImageUrl.js";
import api from "@/libs/axios";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

// ✅ Merchant Center uses :merchantSlug in routes
const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

// ✅ Derive merchantId from slug (for API filter)
const currentMerchantId = computed(() => {
  const slug = currentMerchantSlug.value;
  if (slug) {
    const merchant = authStore.getMerchantBySlug(slug);
    return merchant?.id ?? authStore.merchantId ?? null;
  }

  return authStore.merchantId ?? null;
});

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "List Jasa", // ✅ GANTI: List Produk menjadi List Jasa
  },
]);

// ✅ ADD: Get merchant name for display
const currentMerchantName = computed(() => {
  const merchant = currentMerchantSlug.value
    ? authStore.getMerchantBySlug(currentMerchantSlug.value)
    : authStore.getMerchantById(currentMerchantId.value);
  return merchant?.name || "UMKM";
});

const currentMerchantAddress = computed(() => {
  const merchant = currentMerchantSlug.value
    ? authStore.getMerchantBySlug(currentMerchantSlug.value)
    : authStore.getMerchantById(currentMerchantId.value);

  if (!merchant) return "";

  const primary = merchant.primary_address;
  if (primary) {
    const parts = [
      primary.detail,
      primary.village,
      primary.district,
      primary.city,
      primary.province,
    ].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  return merchant.address || merchant.alamat || "";
});

// Pagination / totals
const totalItems = computed(
  () => pagination.value?.total ?? jasas.value.length
);
const totalPages = computed(() => pagination.value?.last_page ?? 1);
const paginationInfo = computed(() => ({
  from: pagination.value?.from ?? 0,
  to: pagination.value?.to ?? 0,
  total: pagination.value?.total ?? jasas.value.length,
}));

// Active filter count
const activeFilterCount = computed(() => {
  const f = activeFilters.value;
  let count = 0;
  if (f.status) count++;
  if (f.category) count++;
  if (f.minPrice != null || f.maxPrice != null) count++;
  if (f.minStock != null || f.maxStock != null) count++;
  if (f.sortByDate) count++;
  if (f.sortByName) count++;
  if (f.sortByPrice) count++;
  if (f.sortByStock) count++;
  return count;
});

// Count draft jasas
const draftJasasCount = computed(() => {
  return jasas.value.filter((j) => j.status === 'draft').length;
});

const hasDraftJasas = computed(() => draftJasasCount.value > 0);

// ✅ Use categories composable (declare before using categoryOptions)
const { categoriesLevel1, loadingLevel1, fetchLevel1Categories } =
  useCategories();

// Options used in template
const statusOptions = [
  { label: "Semua", value: "" },
  { label: "Dipublish", value: "published" },
  { label: "Diarsipkan", value: "archived" },
  { label: "Draft", value: "draft" },
  { label: "Stok Habis", value: "out_of_stock" },
];

const categoryOptions = categoriesLevel1;

// ✅ Use jasa composable
const {
  jasas, // ✅ GANTI: products menjadi jasas
  loading,
  pagination,
  fetchJasas, // ✅ GANTI: fetchProducts menjadi fetchJasas
  deleteJasa, // ✅ GANTI: deleteProduct menjadi deleteJasa
  updateJasaStatus, // ✅ GANTI: updateProductStatus menjadi updateJasaStatus
  bulkDeleteJasas, // ✅ GANTI: bulkDeleteProducts menjadi bulkDeleteJasas
  bulkUpdateStatus,
} = useJasa(); // ✅ GANTI: useProducts menjadi useJasa

// Emit untuk toggle sidebar dari parent layout
const emit = defineEmits(["toggle-sidebar"]);

// State
const selectedJasas = ref([]); // ✅ GANTI: selectedProducts menjadi selectedJasas
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

// Selected items for actions
const selectedJasaForVisibility = ref(null); // ✅ GANTI: selectedProductForVisibility menjadi selectedJasaForVisibility
const selectedJasaForDelete = ref(null); // ✅ GANTI: selectedProductForDelete menjadi selectedJasaForDelete
// ✅ ADD: Selected jasa and new status for confirmation
const selectedJasaForStatusChange = ref(null); // ✅ GANTI: selectedProductForStatusChange menjadi selectedJasaForStatusChange
const newStatusForChange = ref(null);
const newBulkStatus = ref(null);

// Combined modal state for body scroll lock
const isAnyModalOpen = computed(() => {
  return (
    showExportModal.value ||
    showFilterModal.value ||
    showBulkActionModal.value ||
    showVisibilityModal.value ||
    showDeleteModal.value ||
    showBulkDeleteModal.value ||
    showStatusChangeModal.value || // ✅ ADD
    showBulkStatusChangeModal.value // ✅ ADD
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
const perPage = ref(10);

// ✅ NEW: Build sort_by parameter untuk API
const buildSortByParam = (filters) => {
  if (filters.sortByDate) return filters.sortByDate;
  if (filters.sortByName) return filters.sortByName;
  if (filters.sortByPrice) return filters.sortByPrice;
  if (filters.sortByStock) return filters.sortByStock;
  return "newest";
};

// ✅ INIT: Load data saat komponen siap & merchantId sudah ada
onMounted(async () => {
  console.log("[Indexjasa] Component mounted");
  console.log("[Indexjasa] Merchant Slug:", currentMerchantSlug.value);
  console.log("[Indexjasa] Merchant ID:", currentMerchantId.value);

  // Selalu pastikan kategori ter-load
  await fetchLevel1Categories();

  // Jika merchantId sudah ada saat mount, langsung load jasa.
  // Kalau belum (mis. store belum siap), watcher currentMerchantId akan memanggil loadJasas.
  if (currentMerchantId.value) await loadJasas();
});

// 🔁 Tambahan: jika merchantId berubah (atau baru ter-set), reload jasa
watch(currentMerchantId, async (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return;
  console.log("[Indexjasa] merchantId changed, reloading jasas...", newVal);
  await loadJasas();
});

// Watch for route query changes to trigger reload (e.g., after edit)
watch(
  () => route.query.t,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      console.log("[Indexjasa] Route query changed, reloading...");
      loadJasas();
    }
  }
);

// ✅ UPDATED: Load jasas dengan merchantId dari route
const loadJasas = async () => {
  // ✅ Validate merchantId exists
  // Jangan tampilkan error kalau masih proses resolve merchant (biar request tetap bisa jalan saat computed terisi)
  if (!currentMerchantId.value) {
    console.warn("[loadJasas] Merchant ID belum tersedia, menunggu...");
    return;
  }

  // ✅ ADD: Prevent duplicate calls
  if (loading.value) {
    console.warn("[loadJasas] Already loading, skipping...");
    return;
  }

  console.log("[loadJasas] Starting...", {
    merchantId: currentMerchantId.value,
    page: currentPage.value,
    filters: activeFilters.value,
  });

  try {
    const sortBy = buildSortByParam(activeFilters.value);

    await fetchJasas({
      merchantId: currentMerchantId.value,
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
    const serverMsg = error.response?.data?.message || "";
    if (
      error.response?.status === 403 &&
      serverMsg &&
      (serverMsg.includes("Segment") || serverMsg.includes("UMKM"))
    ) {
      if (currentMerchantSlug.value) {
        router.push(`/merchant-center/${currentMerchantSlug.value}`);
      } else {
        router.push(`/merchant-center`);
      }
    } else {
      toast.error(serverMsg || "Gagal memuat jasa");
    }
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadJasas();
};

// ✅ ADD: Missing method for toggling jasa selection
const toggleJasaSelection = (jasaId) => {
  // ✅ GANTI: toggleProductSelection menjadi toggleJasaSelection
  const index = selectedJasas.value.indexOf(jasaId);

  if (index > -1) {
    // Remove from selection
    selectedJasas.value.splice(index, 1);
  } else {
    // Add to selection
    selectedJasas.value.push(jasaId);
  }

  // Update selectAll checkbox state
  selectAll.value = selectedJasas.value.length === jasas.value.length;
};

// ✅ UPDATE: toggleSelectAll method
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedJasas.value = jasas.value.map((j) => j.id);
  } else {
    selectedJasas.value = [];
  }
};

// ✅ Bulk Actions - Use real API
const bulkDelete = () => {
  showBulkDeleteModal.value = true;
};

// ✅ NEW: Confirm bulk delete
const confirmBulkDelete = async () => {
  try {
    await bulkDeleteJasas(selectedJasas.value); // ✅ GANTI: bulkDeleteProducts menjadi bulkDeleteJasas
    toast.success(`${selectedJasasCount.value} jasa berhasil dihapus`);
    selectedJasas.value = [];
    selectAll.value = false;
    closeBulkDeleteModal();
  } catch (error) {
    toast.error(error.response?.data?.message || "Gagal menghapus jasa");
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
  selectedJasas.value = [];
  selectAll.value = false;
};

const applyFilters = () => {
  console.log("[Filter] Applying filters:", tempFilters.value);

  activeFilters.value = { ...tempFilters.value };
  currentPage.value = 1;
  closeFilterModal();

  console.log("[Filter] Active filters:", activeFilters.value);

  loadJasas();
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
  toast.success("Filter berhasil direset");
  loadJasas();
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
    (k) => params[k] === undefined && delete params[k]
  );
  return params;
};

// Helper: unduh Blob ke file
const saveBlob = (blob, fallbackName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Export Excel (via BE)
const exportExcel = async () => {
  try {
    const params = buildExportParams();
    const res = await api.get("/jasas/export/excel", {
      // ✅ GANTI: products/export/excel menjadi jasas/export/excel
      params,
      responseType: "blob",
    });

    // Ambil nama file dari header jika ada
    const disposition = res.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] ||
      `jasas-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "")}.xlsx`;

    saveBlob(res.data, filename);
    toast.success("Export Excel berhasil diunduh");
  } catch (err) {
    toast.error(err.response?.data?.message || "Gagal export Excel");
  } finally {
    closeExportModal();
  }
};

// Export PDF (via BE)
const exportPDF = async () => {
  try {
    const params = buildExportParams();
    const res = await api.get("/jasas/export/pdf", {
      // ✅ GANTI: products/export/pdf menjadi jasas/export/pdf
      params,
      responseType: "blob",
    });

    // Ambil nama file dari header jika ada
    const disposition = res.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] ||
      `jasas-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.pdf`;

    saveBlob(res.data, filename);
    toast.success("Export PDF berhasil diunduh");
  } catch (err) {
    toast.error(err.response?.data?.message || "Gagal export PDF");
  } finally {
    closeExportModal();
  }
};

// ✅ UPDATED: goToCreate with merchantId
const goToCreate = () => {
  console.log("[Indexjasa] goToCreate called");
  console.log("[Indexjasa] Current merchant slug:", currentMerchantSlug.value);
  if (!currentMerchantSlug.value) {
    console.error("[Indexjasa] No merchantSlug - cannot create");
    return;
  }
  // Route parent pakai merchantSlug di params
  router.push({
    name: "Merchant - Jasa Create",
    params: { merchantSlug: currentMerchantSlug.value },
  });
};

// ✅ UPDATED: goToEdit with merchantId
const goToEdit = (jasa) => {
  // ✅ GANTI: goToEdit(product) menjadi goToEdit(jasa)
  router.push({
    name: "Merchant - Jasa Edit", // ✅ GANTI: Merchant - Product Edit menjadi Merchant - Jasa Edit
    params: {
      merchantSlug: currentMerchantSlug.value,
      id: jasa.id,
    },
  });
};

// ✅ UPDATED: goToDetail with merchantId
const goToDetail = (jasa) => {
  // ✅ GANTI: goToDetail(product) menjadi goToDetail(jasa)
  router.push({
    name: "Merchant - Jasa Detail", // ✅ GANTI: Merchant - Product Detail menjadi Merchant - Jasa Detail
    params: {
      merchantSlug: currentMerchantSlug.value,
      id: jasa.id,
    },
  });
};

// ✅ Delete jasa - Use real API
const deleteJasaAction = (jasa) => {
  // ✅ GANTI: deleteProductAction menjadi deleteJasaAction
  selectedJasaForDelete.value = jasa;
  showDeleteModal.value = true;
};

// ✅ NEW: Confirm single delete
const confirmDeleteJasa = async () => {
  // ✅ GANTI: confirmDeleteProduct menjadi confirmDeleteJasa
  if (!selectedJasaForDelete.value) return;

  try {
    await deleteJasa(selectedJasaForDelete.value.id); // ✅ GANTI: deleteProduct menjadi deleteJasa
    toast.success("Jasa berhasil dihapus");
    closeDeleteModal();
  } catch (error) {
    toast.error(error.response?.data?.message || "Gagal menghapus jasa");
  }
};

// Publish single jasa (khusus yang masih draft)
const publishJasa = async (jasa) => {
  if (!jasa || jasa.status !== "draft") return;

  try {
    await updateJasaStatus(jasa.id, "published");
    toast.success("Jasa berhasil dipublish");
    // Refresh data agar status & styling kartu terupdate
    loadJasas();
  } catch (error) {
    toast.error(error.response?.data?.message || "Gagal mempublish jasa");
  }
};

const hasSelectedJasas = computed(() => {
  // ✅ GANTI: hasSelectedProducts menjadi hasSelectedJasas
  return selectedJasas.value.length > 0;
});

const selectedJasasCount = computed(() => {
  // ✅ GANTI: selectedProductsCount menjadi selectedJasasCount
  return selectedJasas.value.length;
});

// ✅ ADD: Computed untuk mendapatkan data jasa yang dipilih (untuk modal preview)
const selectedJasasData = computed(() => {
  // ✅ GANTI: selectedProductsData menjadi selectedJasasData
  return jasas.value.filter((j) => selectedJasas.value.includes(j.id));
});

// ✅ ADD: Missing method - Close visibility modal
const closeVisibilityModal = () => {
  showVisibilityModal.value = false;
  selectedJasaForVisibility.value = null;
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
  loadJasas();
};

// ✅ NEW: Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  selectedJasaForDelete.value = null;
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

// Format tanggal & jam jasa (created_at / updated_at)
const formatJasaDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format single price (IDR)
const formatPriceId = (num) => {
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(num || 0);
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

const getServiceTypeLabel = (serviceType) => {
  if (serviceType === "at_location") return "Di Tempat Saya";
  if (serviceType === "on_site") return "Ke Lokasi Pelanggan";
  if (serviceType === "online") return "Online";
  return "-";
};

const getDisplayServiceAddress = (jasa) => {
  if (!jasa) return "-";
  if (jasa.service_type === "online") return "Tidak memerlukan alamat";
  if (jasa.service_type === "on_site") {
    return jasa.service_area || "Alamat akan diisi customer saat pembayaran";
  }
  return jasa.location_address || currentMerchantAddress.value || "-";
};

// Toggle visibility method
const toggleJasaVisibility = (jasa) => {
  // ✅ GANTI: toggleProductVisibility menjadi toggleJasaVisibility
  selectedJasaForVisibility.value = jasa;
  showVisibilityModal.value = true;
};

// ✅ UPDATED: Confirm visibility change - Show final confirmation
const confirmVisibilityChange = (newStatus) => {
  if (!selectedJasaForVisibility.value) return;

  selectedJasaForStatusChange.value = selectedJasaForVisibility.value;
  newStatusForChange.value = newStatus;
  showVisibilityModal.value = false;
  showStatusChangeModal.value = true;
};

// ✅ NEW: Confirm single status change (final step)
const confirmSingleStatusChange = async () => {
  if (!selectedJasaForStatusChange.value || !newStatusForChange.value) return;

  try {
    await updateJasaStatus(
      selectedJasaForStatusChange.value.id,
      newStatusForChange.value
    );
    const statusLabel = getStatusLabel(newStatusForChange.value);
    toast.success(`Status jasa berhasil diubah menjadi ${statusLabel}`);
    closeStatusChangeModal();
  } catch (error) {
    toast.error(error.response?.data?.message || "Gagal mengubah status");
  }
};

// ✅ NEW: Close status change modal
const closeStatusChangeModal = () => {
  showStatusChangeModal.value = false;
  selectedJasaForStatusChange.value = null;
  newStatusForChange.value = null;
  selectedJasaForVisibility.value = null;
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
    await bulkUpdateStatus(selectedJasas.value, newBulkStatus.value);
    const statusLabel = getStatusLabel(newBulkStatus.value);
    toast.success(
      `${selectedJasasCount.value} jasa berhasil diubah menjadi ${statusLabel}`
    );
    selectedJasas.value = [];
    selectAll.value = false;
    closeBulkStatusChangeModal();
  } catch (error) {
    toast.error(error.response?.data?.message || "Gagal mengubah status");
  }
};

// ✅ NEW: Close bulk status change modal
const closeBulkStatusChangeModal = () => {
  showBulkStatusChangeModal.value = false;
  newBulkStatus.value = null;
};

// Helper: pilih cover image dari relasi baru atau fallback ke field legacy `image`
// Prioritas: API URL (cover_img.src_url, images[].url) > fallback ke ID
const getPrimaryImageSrc = (jasaItem) => {
  if (!jasaItem) return "";

  // Prioritas 1: cover_img.src_url dari backend (sama seperti produk)
  if (jasaItem.cover_img?.src_url) {
    return getImageUrl(jasaItem.cover_img.src_url);
  }
  if (jasaItem.cover_img?.url) {
    return getImageUrl(jasaItem.cover_img.url);
  }
  if (jasaItem.cover_img?.id) {
    return getImageUrl(jasaItem.cover_img.id);
  }
  
  const images = jasaItem.images || [];
  
  if (images.length > 0) {
    // Cari gambar cover atau ambil yang pertama
    const coverImage = images.find((img) => img.is_cover) || images[0];
    
    // Prioritas 2: url/src_url dari backend (API endpoint /api/images/{id})
    if (coverImage.url) return getImageUrl(coverImage.url);
    if (coverImage.src_url) return getImageUrl(coverImage.src_url);
    
    // Prioritas 3: gunakan image ID untuk akses via /api/images/{id}
    if (coverImage.id) return getImageUrl(coverImage.id);
    if (coverImage.image_path) return getImageUrl(coverImage.image_path);
  }

  if (jasaItem.image) return getImageUrl(jasaItem.image);
  
  return "";
};

</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile Header -->
    <div
      class="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-6 bg-white border-b border-gray-100 sm:static sm:px-6 sm:mb-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 rounded-full sm:hidden hover:bg-gray-100"
        >
          <i class="pi pi-bars"></i>
        </button>
        <div>
          <h1 class="text-base font-semibold text-merchant-primary sm:text-3xl sm:font-bold">Daftar Layanan Jasa</h1>
          <p class="mt-1 text-xs sm:text-sm text-gray-600">
            <i class="mr-1 pi pi-shop"></i>
            {{ currentMerchantName }}
          </p>
        </div>
      </div>
    </div>

    <!-- Spacer for fixed mobile header -->
    <div class="h-24 sm:h-0"></div>

    <div class="px-4 sm:px-6">
      <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div
        class="w-10 h-10 border-4 rounded-full border-gray-200 border-t-blue-500 animate-spin"
      ></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="jasas.length === 0"
      class="py-20 text-center bg-white rounded-2xl shadow-sm border border-gray-100"
    >
      <i class="block mb-4 text-6xl text-gray-300 pi pi-inbox"></i>
      <p class="mb-6 text-lg text-gray-500">Belum ada jasa yang ditambahkan</p>
      <button
        @click="goToCreate"
        class="inline-flex items-center gap-2 px-6 py-3 font-medium text-white transition rounded-lg bg-merchant-primary hover:bg-merchant-primary/90"
      >
        <i class="text-sm pi pi-plus"></i>
        <span>Tambah Jasa Baru</span>
      </button>
    </div>

    <!-- Data Table -->
    <div v-else>
      <!-- Draft Warning Banner -->
      <div
        v-if="hasDraftJasas"
        class="flex items-start gap-4 p-4 mb-6 border-l-4 rounded-2xl bg-yellow-50 border-l-yellow-400 border border-yellow-200 shadow-sm"
      >
        <div class="flex-shrink-0 mt-0.5">
          <svg
            class="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="mb-1 text-base font-semibold text-amber-800">
            ⚠️ Anda memiliki {{ draftJasasCount }} jasa yang belum dipublikasikan
          </h3>
          <p class="text-sm text-amber-700">
            Jasa dengan status <span class="font-semibold">DRAFT</span> tidak akan
            terlihat oleh pelanggan. Silakan klik tombol "Publish" pada jasa
            yang ingin Anda tampilkan kepada pelanggan.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          @click="goToCreate"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-merchant-primary to-merchant-primary/90 text-white rounded-lg font-medium hover:shadow-lg transition"
        >
          <i class="text-sm pi pi-plus"></i>
          <span>Tambah Jasa Baru</span>
        </button>
        <!-- Tombol Chat Pembeli sementara disembunyikan. Aktifkan kembali dengan menghapus komentar ini. -->
        <!--
        <button
          @click="openChatModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-merchant-primary/40 text-merchant-primary bg-white hover:bg-merchant-primary/5 transition font-medium"
        >
          <i class="text-sm pi pi-comments"></i>
          <span>Chat Pembeli</span>
        </button>
        -->
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(jasa, index) in jasas"
          :key="jasa.id"
          class="overflow-hidden transition bg-white border border-gray-100 rounded-lg shadow-md hover:shadow-lg"
          :class="
            !jasa.is_active || jasa.status === 'draft' ? 'opacity-75' : ''
          "
        >
          <!-- Card Header dengan Nomor -->
          <div
            class="flex items-center justify-between px-4 py-3 bg-linear-to-r from-merchant-primary to-merchant-primary/80"
          >
            <div class="flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center w-8 h-8 text-base font-bold text-white rounded-full bg-white/30"
              >
                {{ (currentPage - 1) * perPage + index + 1 }}
              </span>
              <span class="text-sm font-medium text-white truncate">{{
                jasa.title
              }}</span>
            </div>
            <span
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium shrink-0',
                jasa.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : jasa.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700',
              ]"
            >
              {{
                jasa.status === "published"
                  ? "Dipublish"
                  : jasa.status === "draft"
                  ? "Draft"
                  : "Diarsipkan"
              }}
            </span>
          </div>

          <!-- Card Body -->
          <div class="p-4">
            <!-- Gambar -->
            <div class="mb-4">
              <div
                v-if="(jasa.images && jasa.images.length > 0) || jasa.cover_img"
                class="flex items-center justify-center w-full h-40 mb-3 overflow-hidden bg-gray-100 rounded-lg"
              >
                <img
                  :src="getPrimaryImageSrc(jasa)"
                  :alt="jasa.title"
                  class="object-cover w-full h-full max-w-full max-h-full"
                  @error="
                    (e) =>
                      (e.target.src =
                        'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect fill=%27%23f3f4f6%27 width=%27100%27 height=%27100%27/%3E%3Ctext x=%2750%27 y=%2750%27 font-size=%2714%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%239ca3af%27%3ENo Image%3C/text%3E%3C/svg%3E')
                  "
                />
              </div>
              <div
                v-else
                class="flex items-center justify-center w-full h-40 mb-3 bg-gray-100 rounded-lg"
              >
                <i class="text-4xl text-gray-400 pi pi-image"></i>
              </div>
            </div>

            <!-- Nama Jasa -->
            <h3 class="mb-2 text-lg font-bold text-gray-900 line-clamp-2">
              {{ jasa.title }}
            </h3>

            <!-- Info Grid -->
            <div class="mb-4 space-y-2 text-sm">
              <!-- Kategori -->
              <div class="flex items-start gap-2">
                <i class="mt-1 text-xs pi pi-tag text-merchant-primary"></i>
                <div class="flex-1">
                  <div class="font-medium text-gray-700">
                    {{ jasa.category?.name || "-" }}
                  </div>
                  <div
                    v-if="jasa.subcategory?.name"
                    class="text-xs text-gray-500"
                  >
                    {{ jasa.subcategory.name }}
                  </div>
                </div>
              </div>

              <!-- Harga -->
              <div class="flex items-start gap-2">
                <i
                  class="pi pi-wallet text-merchant-primary text-xs mt-0.5"
                ></i>
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-merchant-primary">
                    <template v-if="jasa.fixed_price && jasa.fixed_price > 0">
                      {{ formatPriceId(jasa.fixed_price) }}
                    </template>
                    <template
                      v-else-if="jasa.base_price && jasa.base_price > 0"
                    >
                      Mulai {{ formatPriceId(jasa.base_price) }}
                    </template>
                    <template v-else> - </template>
                  </span>
                  <span
                    v-if="jasa.fixed_price && jasa.fixed_price > 0"
                    class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-0.5 uppercase tracking-wide"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    ></span>
                    Harga Tetap
                  </span>
                  <span
                    v-else-if="jasa.base_price && jasa.base_price > 0"
                    class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 uppercase tracking-wide"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                    Harga Mulai
                  </span>
                </div>
              </div>

              <!-- Tanggal Upload & Edit -->
              <div class="flex items-start gap-2 text-xs text-gray-500">
                <i class="pi pi-clock text-merchant-primary text-xs mt-0.5"></i>
                <div>
                  <div>Upload: {{ formatJasaDateTime(jasa.created_at) }}</div>
                  <div
                    v-if="
                      jasa.updated_at && jasa.updated_at !== jasa.created_at
                    "
                  >
                    Edit: {{ formatJasaDateTime(jasa.updated_at) }}
                  </div>
                </div>
              </div>

              <!-- Tipe Layanan & Lokasi -->
              <div class="flex items-start gap-2 text-xs text-gray-600">
                <i class="pi pi-map-marker text-merchant-primary text-xs mt-0.5"></i>
                <div class="space-y-0.5">
                  <div>
                    <span class="font-semibold">Tipe:</span>
                    {{ getServiceTypeLabel(jasa.service_type) }}
                  </div>
                  <div class="break-words">
                    <span class="font-semibold">Lokasi:</span>
                    {{ getDisplayServiceAddress(jasa) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Footer dengan Aksi -->
          <div
            class="flex flex-wrap gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50"
          >
            <button
              @click="goToDetail(jasa)"
              class="inline-flex items-center justify-center flex-1 px-2 py-2 text-xs font-medium text-blue-600 transition border rounded border-blue-500/30 bg-blue-50 hover:bg-blue-100"
              title="Lihat detail"
            >
              <i class="mr-1 text-xs pi pi-eye"></i>
              <span>Detail</span>
            </button>
            <!-- Tombol Publish khusus untuk jasa Draft -->
            <button
              v-if="jasa.status === 'draft'"
              @click="publishJasa(jasa)"
              class="inline-flex items-center justify-center flex-1 px-2 py-2 text-xs font-semibold text-white transition rounded shadow-sm bg-linear-to-r from-emerald-500 to-emerald-600 hover:shadow-md hover:from-emerald-600 hover:to-emerald-700"
              title="Publish jasa ini"
            >
              <i class="mr-1 text-xs pi pi-send"></i>
              <span>Publish</span>
            </button>
            <button
              @click="goToEdit(jasa)"
              class="inline-flex items-center justify-center flex-1 px-2 py-2 text-xs font-medium transition border rounded border-merchant-primary/40 text-merchant-primary bg-merchant-primary/5 hover:bg-merchant-primary/10"
              title="Edit jasa"
            >
              <i class="mr-1 text-xs pi pi-pencil"></i>
              <span>Edit</span>
            </button>
            <button
              @click="deleteJasaAction(jasa)"
              class="inline-flex items-center justify-center flex-1 px-2 py-2 text-xs font-medium text-red-600 transition border rounded border-red-500/30 bg-red-50 hover:bg-red-100"
              title="Hapus jasa"
            >
              <i class="mr-1 text-xs pi pi-trash"></i>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <ResponsiveModal
        v-model:show="showDeleteModal"
        title="Hapus Jasa"
        show-footer
        @close="closeDeleteModal"
      >
        <p class="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus jasa
          <span class="font-semibold">{{ selectedJasaForDelete?.title }}</span
          >? Tindakan ini tidak dapat dibatalkan.
        </p>
        <template #footer>
          <div class="flex w-full gap-2">
            <Button
              variant="muted-outline"
              class="flex-1"
              @click="closeDeleteModal"
            >
              Batal
            </Button>
            <Button variant="danger" class="flex-1" @click="confirmDeleteJasa">
              Hapus
            </Button>
          </div>
        </template>
      </ResponsiveModal>

    </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-4">
        <button
          v-for="page in totalPages"
          :key="page"
          @click="
            currentPage = page;
            loadJasas();
          "
          :class="[
            'px-3 py-1 rounded',
            page === currentPage
              ? 'bg-merchant-primary text-white'
              : 'bg-gray-200',
          ]"
        >
          {{ page }}
        </button>
      </div>
    </div>
  </div>
</template>