<script setup>
import { ref, computed, onMounted, watch, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import AdminTable from "@/components/common/AdminTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import Button from "@/components/common/Button.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { useEvents } from "@/composables/useEvents";
import { getEventBannerUrl } from "@/libs/getImageUrl";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
const route = useRoute();
const router = useRouter();
const toast = useToast();

const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref(10);
const statusFilter = ref("");
const sortBy = ref("event_start_date");
const sortDesc = ref(true);

const showFilterModal = ref(false);
const showExportModal = ref(false);
const showDeleteModal = ref(false);
const exportLoading = ref(false);

const selectedEvent = ref(null);

const selectedEvents = ref([]);
const selectAll = ref(false);

const activeFilters = ref({
  status: "",
});

const { events, loading, pagination, fetchEvents, deleteEvent } = useEvents();

const tableColumns = [
  { key: "banner_img_path", label: "Banner", sortable: false },
  { key: "event_name", label: "Event", sortable: true },
  { key: "merchants_count", label: "UMKM", sortable: true },
  { key: "vouchers_count", label: "Voucher", sortable: true },
  { key: "event_start_date", label: "Periode", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "actions", label: "Aksi", sortable: false },
];

const paginationInfo = computed(() => ({
  start:
    (pagination.value?.current_page - 1) * (pagination.value?.per_page || 10) +
    1,
  end: Math.min(
    (pagination.value?.current_page || 1) * (pagination.value?.per_page || 10),
    pagination.value?.total || 0,
  ),
  total: pagination.value?.total || 0,
}));

const loadEvents = async () => {
  const params = {
    page: currentPage.value,
    per_page: perPage.value,
    search: searchQuery.value || undefined,
    status: activeFilters.value.status || undefined,
    sort_by: sortBy.value,
    sort_desc: sortDesc.value ? 1 : 0,
  };
  await fetchEvents(params, true);
};

const goToDetail = (event) => {
  router.push({ name: "Admin - Event Detail", params: { id: event.id } });
};
const goToEdit = (event) => {
  router.push({ name: "Admin - Edit Event", params: { id: event.id } });
};
const goToCreate = () => {
  router.push({ name: "Admin - Create Event" });
};

const confirmDelete = (event) => {
  selectedEvent.value = event;
  showDeleteModal.value = true;
};

const handleSearch = () => {
  currentPage.value = 1;
  loadEvents();
};

const onStatusChange = () => {
  currentPage.value = 1;
  loadEvents();
};

function highlightText(text) {
  if (!searchQuery.value.trim() || !text) return text;
  const q = searchQuery.value.trim();
  const re = new RegExp(`(${q})`, "gi");
  return String(text).replace(
    re,
    '<span class="bg-merchant-primary/20 text-merchant-primary font-bold px-1 rounded">' +
      "$1" +
      "</span>",
  );
}

// Filter options
const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Draft" },
];

const handleDelete = async () => {
  try {
    await deleteEvent(selectedEvent.value.id);
    showDeleteModal.value = false;
    loadEvents();
  } catch (error) {
    toast.error("Gagal menghapus event");
  }
};

const toggleEventSelection = (eventId) => {
  const idx = selectedEvents.value.indexOf(eventId);
  if (idx > -1) selectedEvents.value.splice(idx, 1);
  else selectedEvents.value.push(eventId);
  selectAll.value = selectedEvents.value.length === events.value.length;
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedEvents.value = events.value.map((e) => e.id);
  } else {
    selectedEvents.value = [];
  }
};

// Pagination
const goToPage = (page) => {
  currentPage.value = page;
  loadEvents();
};
const nextPage = () => {
  if (currentPage.value < (pagination.value?.last_page || 1)) {
    currentPage.value++;
    loadEvents();
  }
};
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadEvents();
  }
};

let searchDebounceTimer = null;
watch([searchQuery, () => activeFilters.value.status], () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadEvents();
  }, 400);
});

// Modal methods
const openExportModal = () => {
  console.log("openExportModal called in List.vue");
  showExportModal.value = true;
};

const closeExportModal = () => {
  showExportModal.value = false;
};

// ✅ Export PDF method
const exportPDF = async () => {
  console.log("exportPDF called"); // ✅ ADD debug log
  exportLoading.value = true;
  try {
    const response = await api.get("/api/admin/events/export-pdf", {
      responseType: "blob",
      params: {
        status: activeFilters.value.status,
        search: searchQuery.value,
      },
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `events-report-${new Date().toISOString().split("T")[0]}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan events berhasil diunduh");
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
  loadEvents();

  // Register the export modal function with parent
  if (registerExportModal && typeof registerExportModal === "function") {
    console.log("Registering export modal callback for events list");
    registerExportModal(openExportModal);
  } else {
    console.warn("registerExportModal not provided by parent");
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <!-- Header & Filters Section -->
    <div class="bg-white border-b border-gray-200">
      <div class="p-4 sm:px-6 sm:py-6">
        <Form>
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative group">
                <TextField
                  name="search"
                  variant="merchant"
                  v-model="searchQuery"
                  placeholder="Cari nama event atau deskripsi..."
                  custom-class="pl-11"
                  :hide-label="true"
                  @keyup.enter="handleSearch"
                />
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-merchant-primary transition-colors">
                  <i class="pi pi-search"></i>
                </div>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="w-full sm:w-48">
              <SelectField
                name="filter-status"
                v-model="activeFilters.status"
                :options="statusOptions"
                variant="merchant"
                placeholder="Semua Status"
                :hide-label="true"
                @change="onStatusChange"
              />
            </div>
          </div>
        </Form>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <!-- Desktop Table -->
      <div class="hidden sm:block">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <AdminTable
            :items="events"
            :columns="tableColumns"
            :loading="loading"
            :current-page="currentPage"
            :total-pages="pagination?.last_page || 1"
            :pagination-info="paginationInfo"
            :show-checkbox="true"
            :selected-items="selectedEvents"
            :select-all="selectAll"
            @update:selected-items="selectedEvents = $event"
            @update:select-all="selectAll = $event; toggleSelectAll()"
            empty-message="Belum ada event yang dibuat. Klik 'Tambah Event' untuk memulai."
            @row-click="goToDetail"
            @page-change="goToPage"
            @next-page="nextPage"
            @prev-page="prevPage"
          >
            <!-- Banner column -->
            <template #cell-banner_img_path="{ item }">
              <div class="py-2">
                <div class="w-24 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group relative">
                  <img
                    v-if="item.banner_img_path"
                    :src="getEventBannerUrl(item)"
                    :alt="item.event_name"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    @error="(e) => (e.target.src = '/placeholder.png')"
                  />
                  <div v-else class="flex flex-col items-center justify-center gap-1">
                    <i class="pi pi-image text-gray-300 text-lg"></i>
                  </div>
                </div>
              </div>
            </template>

            <!-- Event Name column -->
            <template #cell-event_name="{ item }">
              <div class="py-2 min-w-0 max-w-xs lg:max-w-md">
                <p class="font-bold text-gray-900 text-base mb-0.5 truncate group-hover:text-merchant-primary transition-colors" v-html="highlightText(item.event_name)"></p>
                <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed" v-html="highlightText(item.event_description)"></p>
              </div>
            </template>

            <!-- Merchant count column -->
            <template #cell-merchants_count="{ item }">
              <div class="py-2 text-center">
                <span class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                  {{ item.merchants_count || 0 }}
                </span>
              </div>
            </template>

            <!-- Voucher count column -->
            <template #cell-vouchers_count="{ item }">
              <div class="py-2 text-center">
                <span class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                  {{ item.vouchers_count || 0 }}
                </span>
              </div>
            </template>

            <!-- Periode column -->
            <template #cell-event_start_date="{ item }">
              <div class="py-2 whitespace-nowrap">
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="pi pi-calendar text-xs text-merchant-primary"></i>
                  <span class="text-sm font-medium">{{ new Date(item.event_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                </div>
                <div class="flex items-center gap-2 text-gray-400 mt-1">
                  <i class="pi pi-arrow-right text-[10px]"></i>
                  <span class="text-xs">{{ new Date(item.event_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                </div>
              </div>
            </template>

            <!-- Status column -->
            <template #cell-status="{ item }">
              <div class="py-2">
                <StatusLabel v-if="item && item.status" :status="item.status" variant="event" />
                <span v-else class="text-gray-300">-</span>
              </div>
            </template>

            <!-- Actions column -->
            <template #cell-actions="{ item }">
              <div class="py-2 flex items-center justify-end gap-1">
                <button 
                  @click.stop="goToDetail(item)" 
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-merchant-primary hover:bg-merchant-primary/10 rounded-lg transition-all"
                  title="Lihat Detail"
                >
                  <i class="pi pi-eye text-sm"></i>
                </button>
                <button 
                  @click.stop="goToEdit(item)" 
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Edit Event"
                >
                  <i class="pi pi-pencil text-sm"></i>
                </button>
                <button 
                  @click.stop="confirmDelete(item)" 
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Hapus Event"
                >
                  <i class="pi pi-trash text-sm"></i>
                </button>
              </div>
            </template>
          </AdminTable>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="sm:hidden space-y-4 pb-20">
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 border-gray-100 border-t-merchant-primary rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-gray-500 font-medium animate-pulse">Memuat data event...</p>
        </div>

        <!-- Empty State for Mobile -->
        <div v-else-if="events.length === 0" class="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-sm">
          <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-calendar-plus text-4xl text-gray-300"></i>
          </div>
          <h3 class="text-gray-900 font-bold mb-2">Belum Ada Event</h3>
          <p class="text-gray-500 text-sm mb-6">Mulai buat event pertama Anda untuk menjangkau lebih banyak customer.</p>
          <Button @click="goToCreate" variant="merchant" block>
            <i class="pi pi-plus mr-2"></i>
            Tambah Event
          </Button>
        </div>

        <!-- Cards List -->
        <div v-else class="space-y-4">
          <div
            v-for="event in events"
            :key="event.id"
            class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden active:scale-[0.98] transition-transform"
            @click="goToDetail(event)"
          >
            <!-- Banner Section -->
            <div class="relative h-32 w-full bg-gray-100">
              <img
                v-if="event.banner_img_path"
                :src="getEventBannerUrl(event)"
                class="w-full h-full object-cover"
                @error="(e) => (e.target.src = '/placeholder.png')"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <i class="pi pi-image text-gray-300 text-3xl"></i>
              </div>
              <div class="absolute top-3 right-3">
                <StatusLabel :status="event.status" variant="event" size="xs" />
              </div>
            </div>

            <!-- Content Section -->
            <div class="p-4">
              <div class="flex justify-between items-start mb-2 gap-2">
                <h3 class="font-bold text-gray-900 line-clamp-1 flex-1 leading-tight">
                  {{ event.event_name }}
                </h3>
              </div>
              
              <p class="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[32px] leading-relaxed">
                {{ event.event_description }}
              </p>

              <div class="flex items-center gap-4 py-3 border-y border-gray-50 mb-4">
                <div class="flex-1">
                  <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Mulai</p>
                  <p class="text-xs font-bold text-gray-800">
                    {{ new Date(event.event_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }}
                  </p>
                </div>
                <div class="w-px h-6 bg-gray-100"></div>
                <div class="flex-1">
                  <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Selesai</p>
                  <p class="text-xs font-bold text-gray-800">
                    {{ new Date(event.event_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }}
                  </p>
                </div>
              </div>

              <div class="flex gap-2">
                <button 
                  @click.stop="goToEdit(event)" 
                  class="flex-1 bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <i class="pi pi-pencil text-[10px]"></i>
                  Edit
                </button>
                <button 
                  @click.stop="confirmDelete(event)" 
                  class="w-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <i class="pi pi-trash text-sm"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Pagination -->
          <MobilePagination
            :current-page="currentPage"
            :total-pages="pagination?.last_page || 1"
            @prev="prevPage"
            @next="nextPage"
            @go-to="goToPage"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Delete Modal -->
    <ResponsiveModal
      :show="showDeleteModal"
      @close="showDeleteModal = false"
      title="Hapus Event"
    >
      <div class="text-center py-6">
        <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-exclamation-triangle text-4xl text-red-500 animate-bounce"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
        <p class="text-gray-600 px-4">
          Apakah Anda yakin ingin menghapus event <span class="font-bold text-gray-900">"{{ selectedEvent?.event_name }}"</span>?
        </p>
        <p class="text-xs text-red-500 mt-4 bg-red-50 p-3 rounded-lg inline-block border border-red-100">
          <i class="pi pi-info-circle mr-1"></i>
          Tindakan ini tidak dapat dibatalkan dan semua data terkait akan hilang.
        </p>
      </div>
      <template #footer>
        <div class="flex gap-3 px-2 pb-2">
          <Button @click="showDeleteModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleDelete" variant="danger" block>
            <i class="pi pi-trash mr-2"></i> Hapus Sekarang
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan Events"
    >
      <div class="p-2">
        <div class="bg-gradient-to-br from-merchant-primary/5 to-merchant-primary/10 border border-merchant-primary/10 rounded-2xl p-6 mb-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i class="pi pi-file-pdf text-2xl text-red-500"></i>
            </div>
            <div>
              <h4 class="font-bold text-gray-900">Format PDF</h4>
              <p class="text-xs text-gray-500">Laporan ringkasan event KMI</p>
            </div>
          </div>
          
          <ul class="space-y-2.5">
            <li v-for="(item, i) in ['Statistik partisipasi merchant', 'Ringkasan voucher aktif', 'Timeline pelaksanaan event', 'Detail deskripsi & status']" :key="i" class="flex items-center gap-3 text-sm text-gray-700">
              <i class="pi pi-check-circle text-merchant-primary text-xs"></i>
              {{ item }}
            </li>
          </ul>
        </div>

        <Button
          @click="exportPDF"
          variant="merchant"
          size="lg"
          block
          :loading="exportLoading"
        >
          <i class="pi pi-download mr-2"></i>
          <span>Unduh Laporan Sekarang</span>
        </Button>
        <p class="text-[10px] text-center text-gray-400 mt-4">
          Laporan akan diunduh secara otomatis setelah proses selesai.
        </p>
      </div>
    </ResponsiveModal>
  </div>
</template>
