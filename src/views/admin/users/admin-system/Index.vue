<script setup>
import { ref, computed, onMounted, watch, inject } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import AdminTable from "@/components/common/AdminTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { getUserProfileUrl } from "@/libs/getImageUrl";

const router = useRouter();
const toast = useToast();

const admins = ref([]);
const loading = ref(false);
const pagination = ref({});

const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref(15);
const sortBy = ref("");
const sortDir = ref("");

const showExportModal = ref(false);
const exportLoading = ref(false);

const activeFilters = ref({
  status: "",
});

// Status change modal
const showStatusModal = ref(false);
const selectedAdmin = ref(null);
const newAdminStatus = ref('');
const statusChangeLoading = ref(false);

const isAnyModalOpen = computed(() => showExportModal.value || showStatusModal.value);
useBodyScrollLock(isAnyModalOpen);

const adminStatusOptions = [
  { value: 'active', label: 'Aktif', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'suspended', label: 'Dibekukan', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'inactive', label: 'Tidak Aktif', color: 'text-gray-700 bg-gray-50 border-gray-200' },
];

const openAdminStatusModal = (admin) => {
  selectedAdmin.value = admin;
  newAdminStatus.value = admin.status;
  showStatusModal.value = true;
};

const confirmAdminStatusChange = async () => {
  if (!selectedAdmin.value || !newAdminStatus.value) return;
  statusChangeLoading.value = true;
  try {
    await api.patch(`/api/admin/users/${selectedAdmin.value.id}/status`, { status: newAdminStatus.value });
    toast.success(`Status admin berhasil diubah`);
    showStatusModal.value = false;
    selectedAdmin.value = null;
    loadAdmins();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal mengubah status');
  } finally {
    statusChangeLoading.value = false;
  }
};

const tableColumns = [
  { key: "photo", label: "Foto", sortable: false },
  { key: "name", label: "Username", sortable: true },
  { key: "email", label: "Email", sortable: false },
  { key: "type", label: "Type", sortable: false },
  { key: "status", label: "Status", sortable: true },
];

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const totalPages = computed(() => pagination.value?.last_page ?? 1);
const totalItems = computed(() => pagination.value?.total ?? 0);

const currentPageFromApi = computed(() => pagination.value?.current_page ?? currentPage.value);
const perPageFromApi = computed(() => pagination.value?.per_page ?? perPage.value);

const paginationInfo = computed(() => {
  const start = totalItems.value === 0 ? 0 : (currentPageFromApi.value - 1) * perPageFromApi.value + 1;
  const end = Math.min(currentPageFromApi.value * perPageFromApi.value, totalItems.value);

  return {
    start,
    end,
    total: totalItems.value,
    current_page: currentPageFromApi.value,
    per_page: perPageFromApi.value,
  };
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (activeFilters.value.status) count++;
  return count;
});

const loadAdmins = async () => {
  loading.value = true;
  try {
    const response = await api.get("/api/admin/manage-admins", {
      params: {
        search: searchQuery.value,
        status: activeFilters.value.status,
        page: currentPage.value,
        per_page: perPage.value,
        sort_by: sortBy.value,
        sort_order: sortDir.value,
      },
    });

    admins.value = response.data.data || [];
    pagination.value = response.data;
  } catch (error) {
    console.error("Failed to load admins:", error);
    toast.error("Gagal memuat data admin");
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadAdmins();
};

const onStatusChange = () => {
  currentPage.value = 1;
  loadAdmins();
};

const openExportModal = () => {
  console.log('openExportModal called in admin-system/Index.vue');
  showExportModal.value = true;
};

const closeExportModal = () => (showExportModal.value = false);

const exportPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get("/api/admin/manage-admins/export-pdf", {
      responseType: "blob",
      params: {
        status: activeFilters.value.status,
        search: searchQuery.value,
      },
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admins-report-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan admin berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

const goToDetail = (admin) => {
  router.push({ name: "Admin - Admin System Detail", params: { id: admin.id } });
};

const handleSortChange = ({ key, dir }) => {
  sortBy.value = key;
  sortDir.value = dir;
  currentPage.value = 1;
  loadAdmins();
};

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

const registerExportModal = inject('registerExportModal', null);

onMounted(() => {
  loadAdmins();
  
  if (registerExportModal && typeof registerExportModal === 'function') {
    console.log('Registering export modal callback for admin-system');
    registerExportModal(openExportModal);
  } else {
    console.warn('registerExportModal not provided by parent');
  }
});

watch(currentPage, () => loadAdmins());
watch(searchQuery, () => {
  currentPage.value = 1;
  loadAdmins();
});
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="space-y-2 sm:space-y-4 mb-4 bg-white">
      <div class="sm:flex sm:items-center sm:gap-4 pb-1">
        <div class="flex-1 mb-2 sm:mb-0">
          <TextField
            name="search"
            variant="merchant"
            v-model="searchQuery"
            placeholder="Cari admin..."
            icon="pi-search"
            @keyup.enter="handleSearch"
          />
        </div>

        <SelectField
          name="filter-status"
          placeholder="Status"
          v-model="activeFilters.status"
          :options="statusOptions"
          variant="merchant"
          class="w-full sm:w-[120px]"
          @change="onStatusChange"
        />
      </div>
    </div>

    <div class="hidden sm:block">
      <AdminTable
        :items="admins"
        :columns="tableColumns"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :pagination-info="paginationInfo"
        :show-checkbox="false"
        :sort-by="sortBy"
        :sort-dir="sortDir"
        empty-message="Tidak ada admin yang ditemukan"
        @row-click="goToDetail"
        @page-change="goToPage"
        @next-page="nextPage"
        @prev-page="prevPage"
        @sort-change="handleSortChange"
      >
        <template #cell-photo="{ item }">
          <div class="w-10 h-10 rounded-full bg-merchant-primary/10 flex items-center justify-center overflow-hidden">
            <img 
              v-if="item.profile_picture_path"
              :src="getUserProfileUrl(item)" 
              :alt="item.name"
              class="w-full h-full object-cover"
              @error="(e) => { 
                e.target.style.display = 'none'; 
                e.target.parentElement.innerHTML = `<span class='text-merchant-primary font-semibold text-sm'>${item.name?.charAt(0)?.toUpperCase() || 'A'}</span>`;
              }"
            />
            <span v-else class="text-merchant-primary font-semibold text-sm">
              {{ item.name?.charAt(0)?.toUpperCase() || "A" }}
            </span>
          </div>
        </template>

        <template #cell-name="{ item }">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-black truncate">{{ item.name || '-' }}</p>
          </div>
        </template>

        <template #cell-email="{ item }">
          <span class="text-sm text-black">{{ item.email || '-' }}</span>
        </template>

        <template #cell-type="{ item }">
          <span
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            :class="item.is_super_admin 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-blue-100 text-blue-700'"
          >
            {{ item.is_super_admin ? 'Super Admin' : 'Admin' }}
          </span>
        </template>

        <template #cell-status="{ item }">
          <StatusLabel :status="item.status" variant="user" size="sm" />
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <Button @click.stop="goToDetail(item)" variant="muted-outline" size="sm">
              <i class="pi pi-eye"></i>
            </Button>
            <Button
              @click.stop="openAdminStatusModal(item)"
              variant="muted-outline"
              size="sm"
              class="!border-blue-400 !text-blue-600 hover:!bg-blue-50"
              title="Ubah Status"
            >
              <i class="pi pi-pencil"></i>
            </Button>
          </div>
        </template>
      </AdminTable>
    </div>

    <div class="sm:hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-merchant-primary"></i>
      </div>

      <div v-else-if="!admins || admins.length === 0" class="text-center py-12">
        <i class="pi pi-shield text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">Tidak ada admin</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="admin in admins"
          :key="admin.id"
          @click="goToDetail(admin)"
          class="bg-white rounded-lg shadow-sm p-4 active:bg-gray-50 transition"
        >
          <div class="flex items-start gap-3 mb-3">
            <div class="w-12 h-12 rounded-full bg-merchant-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                v-if="admin.profile_picture_path"
                :src="getUserProfileUrl(admin)" 
                :alt="admin.name"
                class="w-full h-full object-cover"
                @error="(e) => { 
                  e.target.style.display = 'none'; 
                  e.target.parentElement.innerHTML = `<span class='text-merchant-primary font-semibold'>${admin.name?.charAt(0)?.toUpperCase() || 'A'}</span>`;
                }"
              />
              <span v-else class="text-merchant-primary font-semibold">
                {{ admin.name?.charAt(0)?.toUpperCase() || "A" }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 truncate">{{ admin.name }}</p>
              <p class="text-sm text-gray-600 truncate">{{ admin.email }}</p>
            </div>

            <StatusLabel :status="admin.status" variant="user" size="sm" />
          </div>

          <div class="flex items-center justify-between text-xs border-t pt-2">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
              :class="admin.is_super_admin 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'"
            >
              {{ admin.is_super_admin ? 'Super Admin' : 'Admin' }}
            </span>
          </div>
        </div>
      </div>

      <MobilePagination
        v-if="admins && admins.length > 0"
        class="mt-4"
        :current-page="currentPage"
        :total-pages="totalPages"
        @prev="prevPage"
        @next="nextPage"
        @go-to="goToPage"
      />
    </div>

    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan Admin"
      subtitle="Unduh laporan data admin dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">Laporan akan mencakup:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Data lengkap admin (Nama, Email, Type)</li>
                <li>Status admin</li>
                <li>Filter yang diterapkan (Status, Pencarian)</li>
                <li>Informasi waktu download dan user yang mendownload</li>
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

    <!-- Admin Status Change Modal -->
    <ResponsiveModal
      :show="showStatusModal"
      @close="showStatusModal = false"
      title="Ubah Status Admin"
      :subtitle="selectedAdmin ? `${selectedAdmin.name} · ${selectedAdmin.email}` : ''"
    >
      <div class="space-y-4" v-if="selectedAdmin">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <i class="pi pi-shield text-gray-500"></i>
          <div>
            <p class="text-xs text-gray-500">Status saat ini</p>
            <StatusLabel :status="selectedAdmin.status" variant="user" size="sm" />
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-gray-700 mb-3">Pilih status baru:</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in adminStatusOptions"
              :key="opt.value"
              @click="newAdminStatus = opt.value"
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                newAdminStatus === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              ]"
            >
              <i :class="['pi', newAdminStatus === opt.value ? 'pi-check-circle' : 'pi-circle', 'text-sm']"></i>
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
            @click="confirmAdminStatusChange"
            :disabled="statusChangeLoading || newAdminStatus === selectedAdmin.status"
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
