<script setup>
import { ref, computed, onMounted, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import TextField from "@/components/forms/TextField.vue";
import { useEvents } from "@/composables/useEvents";
import { useEventVouchers } from "@/composables/useEventVouchers";
import { useEventMerchants } from "@/composables/useEventMerchants";
import { getEventBannerUrl } from "@/libs/getImageUrl";
import api from "@/libs/axios";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const { fetchEventDetail, deleteEvent, inviteMerchants, loading } = useEvents();
const { 
  availableVouchers, 
  fetchAvailableVouchers, 
  attachVouchersToEvent, 
  detachVoucherFromEvent,
  loading: voucherLoading 
} = useEventVouchers();
const { 
  removeMerchantFromEvent, 
  restoreMerchantToEvent, 
  fetchRemovedMerchants,
  loading: merchantLoading 
} = useEventMerchants();

const event = ref(null);
const merchants = ref([]);
const selectedMerchants = ref([]);
const showInviteModal = ref(false);
const showDeleteModal = ref(false);
const loadingMerchants = ref(false);

// Multiple voucher selection
const showAddVoucherModal = ref(false);
const selectedVoucherIds = ref([]);
const searchVoucherQuery = ref("");
const filterVoucherType = ref("");
const showDeleteVoucherModal = ref(false);
const voucherToDelete = ref(null);

// Removed merchants state
const showRemoveMerchantModal = ref(false);
const merchantToRemove = ref(null);
const breadcrumbItems = computed(() => [
  { label: "Events", to: { name: "Admin - Events" } },
  { label: event.value?.event_name || "Detail Event" },
]);

const showAllVouchers = ref(false);
const displayedVouchers = computed(() => {
  if (!event.value?.vouchers) return [];
  return showAllVouchers.value 
    ? event.value.vouchers 
    : event.value.vouchers.slice(0, 2);
});

const eventBannerUrl = computed(() => {
  if (!event.value?.id || !event.value?.banner_img_path) {
    return "/placeholder.png";
  }
  return getEventBannerUrl(event.value);
});

const availableMerchants = computed(() => {
  const invitedIds = event.value?.merchants?.map((m) => m.id) || [];
  return merchants.value.filter((m) => !invitedIds.includes(m.id));
});

const activeMerchants = computed(() => {
  return event.value?.merchants?.filter(m => m.pivot?.status === 'accepted') || [];
});

const removedMerchantsCount = computed(() => {
  return event.value?.merchants?.filter(m => m.pivot?.status === 'removed').length || 0;
});

// Filtered vouchers
const filteredVouchers = computed(() => {
  let filtered = availableVouchers.value;

  // Search filter
  if (searchVoucherQuery.value) {
    const query = searchVoucherQuery.value.toLowerCase();
    filtered = filtered.filter(v => 
      v.voucher_code.toLowerCase().includes(query) ||
      v.voucher_description?.toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filterVoucherType.value) {
    filtered = filtered.filter(v => v.voucher_type === filterVoucherType.value);
  }

  return filtered;
});

// Selected vouchers count
const selectedVouchersCount = computed(() => selectedVoucherIds.value.length);

// Check if voucher is selected
const isVoucherSelected = (voucherId) => {
  return selectedVoucherIds.value.includes(voucherId);
};

// Toggle voucher selection
const toggleVoucherSelection = (voucherId) => {
  const index = selectedVoucherIds.value.indexOf(voucherId);
  if (index > -1) {
    selectedVoucherIds.value.splice(index, 1);
  } else {
    selectedVoucherIds.value.push(voucherId);
  }
};

// Select all vouchers
const selectAllVouchers = () => {
  if (selectedVoucherIds.value.length === filteredVouchers.value.length) {
    selectedVoucherIds.value = [];
  } else {
    selectedVoucherIds.value = filteredVouchers.value.map(v => v.id);
  }
};

// Clear selection
const clearSelection = () => {
  selectedVoucherIds.value = [];
};

// Load event detail
const loadEvent = async () => {
  try {
    const data = await fetchEventDetail(route.params.id);
    event.value = data;
  } catch (error) {
    console.error("Failed to load event:", error);
    router.push({ name: "Admin - Events" });
  }
};

// Load merchants for invitation
const loadMerchants = async () => {
  loadingMerchants.value = true;
  try {
    const response = await api.get("/api/admin/merchants");
    merchants.value = response.data.data || [];
  } catch (error) {
    console.error("Failed to load merchants:", error);
    toast.error("Gagal memuat data merchant");
  } finally {
    loadingMerchants.value = false;
  }
};

// Toggle merchant selection
const toggleMerchant = (merchantId) => {
  const index = selectedMerchants.value.indexOf(merchantId);
  if (index > -1) {
    selectedMerchants.value.splice(index, 1);
  } else {
    selectedMerchants.value.push(merchantId);
  }
};

// Submit invitation
const handleInvite = async () => {
  if (selectedMerchants.value.length === 0) {
    toast.warning("Pilih minimal 1 merchant");
    return;
  }

  try {
    await inviteMerchants(event.value.id, selectedMerchants.value);
    showInviteModal.value = false;
    selectedMerchants.value = [];
    await loadEvent();
  } catch (error) {
    console.error("Invite failed:", error);
  }
};

const segmentationMap = {
  1: "UMKM Toko",
  2: "UMKM Kuliner",
  3: "UMKM Jasa",
};

// Delete event
const confirmDelete = () => {
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  try {
    await deleteEvent(event.value.id);
    router.push({ name: "Admin - Events" });
  } catch (error) {
    console.error("Delete failed:", error);
  }
};

const goToEdit = () => {
  router.push({
    name: "Admin - Edit Event",
    params: { id: event.value.id },
  });
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

const goBack = () => router.push({ name: "Admin - Events" });

// Open modal and reset
const openAddVoucherModal = async () => {
  try {
    selectedVoucherIds.value = [];
    searchVoucherQuery.value = "";
    filterVoucherType.value = "";
    await fetchAvailableVouchers();
    showAddVoucherModal.value = true;
  } catch (error) {
    console.error("Failed to load vouchers:", error);
  }
};

// Handle add multiple vouchers
const handleAddVouchers = async () => {
  if (selectedVoucherIds.value.length === 0) {
    toast.warning("Pilih minimal 1 voucher");
    return;
  }

  try {
    await attachVouchersToEvent(event.value.id, selectedVoucherIds.value);
    showAddVoucherModal.value = false;
    selectedVoucherIds.value = [];
    await loadEvent();
  } catch (error) {
    console.error("Add vouchers failed:", error);
  }
};

// Confirm delete voucher
const confirmDeleteVoucher = (voucher) => {
  voucherToDelete.value = voucher;
  showDeleteVoucherModal.value = true;
};

// Delete voucher from event
const handleDeleteVoucher = async () => {
  if (!voucherToDelete.value) return;

  try {
    await detachVoucherFromEvent(event.value.id, voucherToDelete.value.id);
    showDeleteVoucherModal.value = false;
    voucherToDelete.value = null;
    await loadEvent();
  } catch (error) {
    console.error("Delete voucher failed:", error);
  }
};

// Confirm remove merchant
const confirmRemoveMerchant = (merchant) => {
  merchantToRemove.value = merchant;
  removalReason.value = "";
  showRemoveMerchantModal.value = true;
};

// Handle remove merchant
const handleRemoveMerchant = async () => {
  if (!removalReason.value.trim()) {
    toast.warning("Alasan penghapusan wajib diisi");
    return;
  }

  try {
    await removeMerchantFromEvent(
      event.value.id,
      merchantToRemove.value.id,
      removalReason.value
    );
    showRemoveMerchantModal.value = false;
    merchantToRemove.value = null;
    removalReason.value = "";
    await loadEvent();
  } catch (error) {
    console.error("Remove merchant failed:", error);
  }
};

// View removed merchants
const viewRemovedMerchants = async () => {
  try {
    removedMerchants.value = await fetchRemovedMerchants(event.value.id);
    showRemovedMerchantsModal.value = true;
  } catch (error) {
    console.error("Fetch removed merchants failed:", error);
  }
};

// Restore merchant
const handleRestoreMerchant = async (merchantId) => {
  try {
    await restoreMerchantToEvent(event.value.id, merchantId);
    await viewRemovedMerchants(); // Refresh list
    await loadEvent(); // Refresh main data
  } catch (error) {
    console.error("Restore merchant failed:", error);
  }
};

const searchMerchantQuery = ref("");
const filterSegmentation = ref("");

const filteredAvailableMerchants = computed(() => {
  let filtered = availableMerchants.value;

  // Search filter
  if (searchMerchantQuery.value) {
    const query = searchMerchantQuery.value.toLowerCase();
    filtered = filtered.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.slug.toLowerCase().includes(query)
    );
  }

  // Segmentation filter
  if (filterSegmentation.value) {
    filtered = filtered.filter(m => m.segmentation_id === parseInt(filterSegmentation.value));
  }

  return filtered;
});

const selectedMerchantsCount = computed(() => selectedMerchants.value.length);

const isMerchantSelected = (merchantId) => {
  return selectedMerchants.value.includes(merchantId);
};


const selectAllMerchants = () => {
  if (selectedMerchants.value.length === filteredAvailableMerchants.value.length) {
    selectedMerchants.value = [];
  } else {
    selectedMerchants.value = filteredAvailableMerchants.value.map(m => m.id);
  }
};

const clearMerchantSelection = () => {
  selectedMerchants.value = [];
};

const openInviteModal = () => {
  selectedMerchants.value = [];
  searchMerchantQuery.value = "";
  filterSegmentation.value = "";
  showInviteModal.value = true;
};

// ✅ Add export modal state
const showExportModal = ref(false);
const exportLoading = ref(false);

// ✅ Export PDF method for detail (move from template area)
const exportDetailPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get(`/api/admin/events/${event.value.id}/export-pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event-detail-${event.value.id}-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan detail event berhasil diunduh");
    showExportModal.value = false;
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

// ✅ Open export modal method
const openExportModal = () => {
  console.log('openExportModal called in Detail.vue');
  showExportModal.value = true;
};

// ✅ Inject the register function from parent
const registerExportModal = inject('registerExportModal', null);

onMounted(async () => {
  await loadEvent();
  await loadMerchants();
  
  // ✅ Register the export modal function with parent
  if (registerExportModal && typeof registerExportModal === 'function') {
    console.log('Registering export modal callback for event detail');
    registerExportModal(openExportModal);
  } else {
    console.warn('registerExportModal not provided by parent');
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 pb-20">
    <!-- Header Section -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {{ event?.event_name }}
            </h1>
            <StatusLabel v-if="event" :status="event.status" variant="event" />
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <button 
            @click="goBack" 
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Kembali
          </button>
          <div class="w-px h-6 bg-gray-200 mx-1"></div>
          <Button @click="goToEdit" variant="merchant-outline" size="sm">
            <i class="pi pi-pencil mr-2 text-xs"></i>
            Edit Event
          </Button>
          <Button @click="confirmDelete" variant="danger-outline" size="sm">
            <i class="pi pi-trash mr-2 text-xs"></i>
            Hapus
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8" v-if="event">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Banner & Info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Banner Card -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="relative group aspect-[16/6] sm:aspect-[21/9]">
              <img
                :src="eventBannerUrl"
                alt="Event banner"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                @error="(e) => (e.target.src = '/placeholder.png')"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <p class="text-white text-sm font-medium">Banner Event KMI Simslife</p>
              </div>
            </div>
            <div class="p-6 sm:p-8">
              <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-merchant-primary/10 flex items-center justify-center text-merchant-primary">
                  <i class="pi pi-info-circle text-xl"></i>
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 flex items-center gap-3">
                    <span class="w-2 h-8 bg-merchant-primary rounded-full"></span>
                    Voucher Event ({{ event?.vouchers?.length || 0 }})
                  </h3>
                </div>
              </div>
              <p class="text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                {{ event.event_description }}
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-merchant-primary/20 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                      <i class="pi pi-calendar"></i>
                    </div>
                    <div>
                      <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Tanggal Mulai</p>
                      <p class="font-bold text-gray-900">{{ formatDate(event.event_start_date) }}</p>
                    </div>
                  </div>
                </div>
                <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-merchant-primary/20 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                      <i class="pi pi-calendar-times"></i>
                    </div>
                    <div>
                      <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Tanggal Selesai</p>
                      <p class="font-bold text-gray-900">{{ formatDate(event.event_end_date) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Participating Merchants Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h3 class="text-xl font-bold text-gray-900">UMKM Terdaftar</h3>
                <span class="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{{ activeMerchants.length }}</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="removedMerchantsCount > 0"
                  @click="viewRemovedMerchants"
                  class="px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg font-bold transition-colors flex items-center gap-2"
                >
                  <i class="pi pi-history"></i>
                  Riwayat
                </button>
                <Button @click="openInviteModal" variant="merchant" size="sm">
                  <i class="pi pi-plus mr-2 text-xs"></i>
                  Undang
                </Button>
              </div>
            </div>

            <div v-if="activeMerchants.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="merchant in activeMerchants"
                :key="merchant.id"
                class="bg-white border border-gray-200 rounded-2xl p-5 hover:border-merchant-primary hover:shadow-md transition-all group relative overflow-hidden"
              >
                <!-- Selection Overlay / Background Decor -->
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-merchant-primary/5 rounded-full blur-2xl group-hover:bg-merchant-primary/10 transition-colors"></div>
                
                <div class="relative flex items-start justify-between mb-4">
                  <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-gray-50 shadow-sm group-hover:border-merchant-primary/30 transition-colors">
                      <img 
                        v-if="merchant.logo_path" 
                        :src="api.defaults.baseURL + '/api/merchant-logo/' + merchant.id" 
                        :alt="merchant.name" 
                        class="w-full h-full object-cover"
                        @error="(e) => { e.target.src = '/placeholder.png' }"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center bg-merchant-primary/10">
                        <span class="text-merchant-primary font-bold text-xl">{{ merchant.name?.charAt(0)?.toUpperCase() }}</span>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <h4 class="font-bold text-gray-900 truncate leading-tight mb-0.5 group-hover:text-merchant-primary transition-colors">{{ merchant.name }}</h4>
                      <p class="text-xs text-gray-500 truncate mb-1.5">@{{ merchant.slug }}</p>
                      <StatusLabel :status="merchant.pivot.status" variant="merchant" size="xs" />
                    </div>
                  </div>
                  
                  <button
                    @click="confirmRemoveMerchant(merchant)"
                    class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                    title="Keluarkan Merchant"
                  >
                    <i class="pi pi-trash text-xs"></i>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                  <div class="bg-gray-50 rounded-xl p-2.5">
                    <p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Segmentasi</p>
                    <p class="text-xs font-bold text-gray-700 truncate">{{ segmentationMap[merchant.segmentation_id] || 'N/A' }}</p>
                  </div>
                  <div class="bg-gray-50 rounded-xl p-2.5">
                    <p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Produk</p>
                    <p class="text-xs font-bold text-gray-700">{{ merchant.products_count || 0 }} Item</p>
                  </div>
                </div>

                <button
                  @click="router.push({ name: 'Admin - Merchant Detail', params: { id: merchant.id } })"
                  class="w-full py-2 text-xs font-bold text-merchant-primary hover:bg-merchant-primary hover:text-white border border-merchant-primary/20 rounded-xl transition-all"
                >
                  Detail UMKM
                </button>
              </div>
            </div>

            <div v-else class="bg-white rounded-2xl p-12 text-center border border-gray-200 border-dashed">
              <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <i class="pi pi-users text-3xl"></i>
              </div>
              <h4 class="text-gray-900 font-bold mb-1">Belum Ada Merchant</h4>
              <p class="text-sm text-gray-500 mb-6">Undang merchant untuk bergabung dalam event ini.</p>
              <Button @click="openInviteModal" variant="merchant" size="sm">
                <i class="pi pi-plus mr-2 text-xs"></i>
                Undang Merchant
              </Button>
            </div>
          </div>
        </div>

        <!-- Right Column: Vouchers & Stats -->
        <div class="space-y-8">
          <!-- Quick Stats -->
          <div class="bg-gradient-to-br from-merchant-primary to-merchant-primary/80 rounded-2xl p-6 text-white shadow-lg shadow-merchant-primary/20 relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <h4 class="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">Ringkasan Event</h4>
            <div class="grid grid-cols-2 gap-4 relative z-10">
              <div class="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p class="text-3xl font-bold mb-1">{{ activeMerchants.length }}</p>
                <p class="text-[10px] font-bold uppercase opacity-80">Total UMKM</p>
              </div>
              <div class="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p class="text-3xl font-bold mb-1">{{ event.vouchers?.length || 0 }}</p>
                <p class="text-[10px] font-bold uppercase opacity-80">Total Voucher</p>
              </div>
            </div>
          </div>

          <!-- Vouchers Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-gray-900">Voucher Event ({{ event?.vouchers?.length || 0 }})</h3>
              <Button @click="openAddVoucherModal" variant="merchant-outline" size="sm">
                <i class="pi pi-plus text-xs"></i>
              </Button>
            </div>

            <div v-if="event.vouchers && event.vouchers.length > 0" class="space-y-4">
              <div class="grid grid-cols-1  gap-4">
                <div
                  v-for="voucher in displayedVouchers"
                  :key="voucher.id"
                  class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:border-merchant-primary/20 transition-all flex flex-col h-full"
                >
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                        <i class="pi pi-ticket"></i>
                      </div>
                      <div>
                        <h4 class="font-bold text-gray-900 leading-tight mb-0.5">{{ voucher.voucher_code }}</h4>
                        <StatusLabel :status="voucher.voucher_status" variant="voucher" size="xs" />
                      </div>
                    </div>
                    <button 
                      @click="confirmDeleteVoucher(voucher)"
                      class="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <i class="pi pi-trash text-sm"></i>
                    </button>
                  </div>

                  <div class="flex items-end justify-between bg-gray-50 rounded-2xl p-4 mb-4">
                    <div>
                      <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Diskon</p>
                      <p class="text-xl font-black text-merchant-primary leading-none">
                        {{ voucher.voucher_type === 'percent' ? `${voucher.value}%` : formatCurrency(voucher.value) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Min. Beli</p>
                      <p class="text-sm font-bold text-gray-700 leading-none">{{ formatCurrency(voucher.min_purchase_amount || 0) }}</p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-4 border-t border-gray-50 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>{{ formatDate(voucher.voucher_start_date) }}</span>
                    <i class="pi pi-arrow-right text-[8px]"></i>
                    <span>{{ formatDate(voucher.voucher_end_date) }}</span>
                  </div>
                </div>
              </div>

              <!-- Show More Button -->
              <div v-if="event?.vouchers?.length > 2" class="mt-6 flex justify-center">
                <button 
                  @click="showAllVouchers = !showAllVouchers"
                  type="button"
                  class="px-6 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-merchant-primary/20 hover:text-merchant-primary transition-all flex items-center gap-2"
                >
                  {{ showAllVouchers ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Lebih Banyak' }}
                  <i class="pi" :class="showAllVouchers ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                </button>
              </div>
            </div>

            <div v-else class="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200 border-dashed">
              <i class="pi pi-ticket text-3xl text-gray-300 mb-2"></i>
              <p class="text-xs text-gray-500 font-medium">Belum ada voucher yang ditautkan.</p>
              <button @click="openAddVoucherModal" class="text-xs text-merchant-primary font-bold mt-2 hover:underline">Tambah Voucher</button>
            </div>
          </div>

          <!-- Report Export Card -->
          <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h4 class="font-bold text-gray-900 mb-4">Laporan Event</h4>
            <p class="text-xs text-gray-500 mb-6 leading-relaxed">Unduh laporan detail event termasuk daftar merchant dan statistik penggunaan voucher.</p>
            <Button @click="openExportModal" variant="merchant" block>
              <i class="pi pi-download mr-2"></i>
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals Section -->
    <!-- Invite Merchant Modal -->
    <ResponsiveModal
      :show="showInviteModal"
      @close="showInviteModal = false"
      title="Undang Merchant ke Event"
      size="xl"
    >
      <div class="p-1 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            name="search_merchant_invite"
            v-model="searchMerchantQuery"
            placeholder="Cari merchant..."
            variant="muted"
            :hide-label="true"
            icon="pi pi-search"
          />
          <div class="relative">
            <select
              v-model="filterSegmentation"
              class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-merchant-primary focus:outline-none appearance-none"
            >
              <option value="">Semua Segmentasi</option>
              <option value="1">UMKM Toko</option>
              <option value="2">UMKM Kuliner</option>
              <option value="3">UMKM Jasa</option>
            </select>
            <i class="pi pi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
          </div>
        </div>

        <div v-if="filteredAvailableMerchants.length > 0" class="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative w-5 h-5 flex items-center justify-center">
              <input
                type="checkbox"
                :checked="selectedMerchantsCount === filteredAvailableMerchants.length && filteredAvailableMerchants.length > 0"
                @change="selectAllMerchants"
                class="peer absolute opacity-0 w-full h-full cursor-pointer"
              />
              <div class="w-full h-full border-2 border-gray-300 rounded-md bg-white peer-checked:border-merchant-primary peer-checked:bg-merchant-primary transition-all flex items-center justify-center">
                <i class="pi pi-check text-[10px] text-white opacity-0 peer-checked:opacity-100"></i>
              </div>
            </div>
            <span class="text-sm font-bold text-gray-700">Pilih Semua Merchant</span>
          </label>
          <p class="text-xs font-bold text-merchant-primary" v-if="selectedMerchantsCount > 0">{{ selectedMerchantsCount }} Merchant Dipilih</p>
        </div>

        <div class="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          <div v-if="loadingMerchants" class="py-10 text-center">
            <i class="pi pi-spin pi-spinner text-3xl text-merchant-primary animate-spin"></i>
          </div>
          <div v-else-if="filteredAvailableMerchants.length === 0" class="py-10 text-center text-gray-400">
            <i class="pi pi-inbox text-4xl mb-2"></i>
            <p>Tidak ada merchant ditemukan</p>
          </div>
          <label
            v-for="merchant in filteredAvailableMerchants"
            :key="merchant.id"
            class="flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
            :class="isMerchantSelected(merchant.id) ? 'border-merchant-primary bg-merchant-primary/5 ring-1 ring-merchant-primary' : 'border-gray-100'"
          >
            <div class="relative w-5 h-5 flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                :checked="isMerchantSelected(merchant.id)"
                @change="toggleMerchant(merchant.id)"
                class="peer absolute opacity-0 w-full h-full cursor-pointer"
              />
              <div class="w-full h-full border-2 border-gray-300 rounded-md bg-white peer-checked:border-merchant-primary peer-checked:bg-merchant-primary transition-all flex items-center justify-center">
                <i class="pi pi-check text-[10px] text-white opacity-0 peer-checked:opacity-100"></i>
              </div>
            </div>
            
            <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-white">
              <img 
                v-if="merchant.logo_path" 
                :src="api.defaults.baseURL + '/api/merchant-logo/' + merchant.id" 
                class="w-full h-full object-cover"
                @error="(e) => (e.target.src = '/placeholder.png')"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-xs">
                {{ merchant.name?.charAt(0) }}
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-gray-900 truncate">{{ merchant.name }}</p>
              <p class="text-[10px] text-gray-400 font-medium">@{{ merchant.slug }} • {{ segmentationMap[merchant.segmentation_id] }}</p>
            </div>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showInviteModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleInvite" variant="merchant" block :disabled="selectedMerchantsCount === 0 || loading">
            Kirim Undangan ({{ selectedMerchantsCount }})
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Add Voucher Modal -->
    <ResponsiveModal
      :show="showAddVoucherModal"
      @close="showAddVoucherModal = false"
      title="Tautkan Voucher ke Event"
      size="xl"
    >
      <div class="p-1 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            name="search_voucher_invite"
            v-model="searchVoucherQuery"
            placeholder="Cari kode voucher..."
            variant="muted"
            :hide-label="true"
            icon="pi pi-search"
          />
          <div class="relative">
            <select
              v-model="filterVoucherType"
              class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-merchant-primary focus:outline-none appearance-none"
            >
              <option value="">Semua Tipe</option>
              <option value="percent">Persentase</option>
              <option value="fixed">Nominal</option>
            </select>
            <i class="pi pi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
          </div>
        </div>

        <div v-if="filteredVouchers.length > 0" class="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative w-5 h-5 flex items-center justify-center">
              <input
                type="checkbox"
                :checked="selectedVouchersCount === filteredVouchers.length && filteredVouchers.length > 0"
                @change="selectAllVouchers"
                class="peer absolute opacity-0 w-full h-full cursor-pointer"
              />
              <div class="w-full h-full border-2 border-gray-300 rounded-md bg-white peer-checked:border-merchant-primary peer-checked:bg-merchant-primary transition-all flex items-center justify-center">
                <i class="pi pi-check text-[10px] text-white opacity-0 peer-checked:opacity-100"></i>
              </div>
            </div>
            <span class="text-sm font-bold text-gray-700">Pilih Semua Voucher</span>
          </label>
          <p class="text-xs font-bold text-merchant-primary" v-if="selectedVouchersCount > 0">{{ selectedVouchersCount }} Voucher Dipilih</p>
        </div>

        <div class="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          <div v-if="voucherLoading" class="py-10 text-center">
            <i class="pi pi-spin pi-spinner text-3xl text-merchant-primary animate-spin"></i>
          </div>
          <div v-else-if="filteredVouchers.length === 0" class="py-10 text-center text-gray-400">
            <i class="pi pi-ticket text-4xl mb-2"></i>
            <p>Tidak ada voucher ditemukan</p>
          </div>
          <label
            v-for="voucher in filteredVouchers"
            :key="voucher.id"
            class="flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
            :class="isVoucherSelected(voucher.id) ? 'border-merchant-primary bg-merchant-primary/5 ring-1 ring-merchant-primary' : 'border-gray-100'"
          >
            <div class="relative w-5 h-5 flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                :checked="isVoucherSelected(voucher.id)"
                @change="toggleVoucherSelection(voucher.id)"
                class="peer absolute opacity-0 w-full h-full cursor-pointer"
              />
              <div class="w-full h-full border-2 border-gray-300 rounded-md bg-white peer-checked:border-merchant-primary peer-checked:bg-merchant-primary transition-all flex items-center justify-center">
                <i class="pi pi-check text-[10px] text-white opacity-0 peer-checked:opacity-100"></i>
              </div>
            </div>
            
            <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
              <i class="pi pi-ticket text-gray-400"></i>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-gray-900 truncate">{{ voucher.voucher_code }}</p>
              <p class="text-[10px] text-gray-400 font-medium">
                {{ voucher.voucher_type === 'percent' ? `${voucher.value}%` : formatCurrency(voucher.value) }} • {{ voucher.voucher_name }}
              </p>
            </div>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showAddVoucherModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleAddVouchers" variant="merchant" block :disabled="selectedVouchersCount === 0 || voucherLoading">
            Tautkan Voucher ({{ selectedVouchersCount }})
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Delete Voucher Confirmation -->
    <ResponsiveModal
      :show="showDeleteVoucherModal"
      @close="showDeleteVoucherModal = false"
      title="Hapus Voucher"
    >
      <div class="text-center py-6">
        <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-trash text-4xl text-red-500"></i>
        </div>
        <p class="text-sm text-gray-600 px-4">
          Lepaskan voucher <span class="font-bold text-gray-900">"{{ voucherToDelete?.voucher_code }}"</span> dari event ini?
        </p>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showDeleteVoucherModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleDeleteVoucher" variant="danger" block>Hapus</Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Remove Merchant Modal -->
    <ResponsiveModal
      :show="showRemoveMerchantModal"
      @close="showRemoveMerchantModal = false"
      title="Keluarkan Merchant"
    >
      <div class="p-1 space-y-6">
        <div class="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex gap-3">
          <i class="pi pi-exclamation-triangle text-orange-500 mt-1"></i>
          <div>
            <p class="text-sm font-bold text-orange-800">Perhatian</p>
            <p class="text-xs text-orange-700 leading-relaxed">Mengeluarkan merchant akan membatalkan semua voucher event yang terhubung dengan merchant ini.</p>
          </div>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-bold text-gray-700">Alasan Pengeluaran</label>
          <textarea
            v-model="removalReason"
            class="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-merchant-primary focus:outline-none text-sm min-h-[120px]"
            placeholder="Tuliskan alasan mengeluarkan merchant ini..."
          ></textarea>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showRemoveMerchantModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleRemoveMerchant" variant="danger" block :disabled="!removalReason.trim() || merchantLoading">
            Keluarkan Merchant
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- History Removed Merchants Modal -->
    <ResponsiveModal
      :show="showRemovedMerchantsModal"
      @close="showRemovedMerchantsModal = false"
      title="Riwayat Merchant Dikeluarkan"
    >
      <div class="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar p-1">
        <div v-if="removedMerchants.length === 0" class="py-12 text-center text-gray-400">
          <i class="pi pi-history text-4xl mb-2"></i>
          <p>Belum ada riwayat pengeluaran</p>
        </div>
        <div
          v-for="m in removedMerchants"
          :key="m.id"
          class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                <img v-if="m.logo_url" :src="m.logo_url" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">{{ m.name?.charAt(0) }}</div>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
                <p class="text-[10px] text-gray-400">Dikeluarkan: {{ formatDate(m.removal_info.removed_at) }}</p>
              </div>
            </div>
            <button
              @click="handleRestoreMerchant(m.id)"
              class="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-600 hover:text-white transition-all"
            >
              Pulihkan
            </button>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Alasan</p>
            <p class="text-xs text-gray-600 leading-relaxed">{{ m.removal_info.reason }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="px-2 pb-2">
          <Button @click="showRemovedMerchantsModal = false" variant="secondary" block>Tutup</Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Delete Event Confirmation -->
    <ResponsiveModal
      :show="showDeleteModal"
      @close="showDeleteModal = false"
      title="Hapus Event"
    >
      <div class="text-center py-6">
        <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-exclamation-triangle text-4xl text-red-500 animate-bounce"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Hapus Event?</h3>
        <p class="text-gray-600 px-4 mb-4">
          Semua data terkait event <span class="font-bold">"{{ event?.event_name }}"</span> akan dihapus permanen dari sistem.
        </p>
        <div class="bg-red-50 p-4 rounded-2xl border border-red-100 mx-4">
          <p class="text-xs text-red-700 flex items-start gap-2 text-left">
            <i class="pi pi-info-circle mt-0.5 shrink-0"></i>
            Tindakan ini akan melepaskan semua voucher dari merchant terkait dan membatalkan status keikutsertaan mereka.
          </p>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showDeleteModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleDelete" variant="danger" block>Ya, Hapus Permanen</Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="showExportModal = false"
      title="Export Detail Event"
    >
      <div class="p-1 space-y-6">
        <div class="bg-gradient-to-br from-merchant-primary/5 to-merchant-primary/10 border border-merchant-primary/10 rounded-2xl p-6">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <i class="pi pi-file-pdf text-2xl text-red-500"></i>
            </div>
            <div>
              <h4 class="font-bold text-gray-900">Format Laporan PDF</h4>
              <p class="text-xs text-gray-500">Dokumen detail event KMI Simslife</p>
            </div>
          </div>
          
          <ul class="space-y-3">
            <li v-for="(item, i) in ['Informasi fundamental event', 'Daftar merchant yang terdaftar', 'Rincian voucher dan periode', 'Status dan statistik partisipasi']" :key="i" class="flex items-center gap-3 text-sm text-gray-700 font-medium">
              <i class="pi pi-check-circle text-merchant-primary text-xs shrink-0"></i>
              {{ item }}
            </li>
          </ul>
        </div>

        <Button
          @click="exportDetailPDF"
          variant="merchant"
          size="lg"
          block
          :loading="exportLoading"
        >
          <i class="pi pi-download mr-2"></i>
          Download Laporan PDF
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