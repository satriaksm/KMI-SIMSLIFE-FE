<script setup>
import { ref, computed, onMounted, watch, inject } from "vue"; // ✅ ADD inject
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useUsers } from "@/composables/useUsers";
import api from "@/libs/axios";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import AdminTable from "@/components/common/AdminTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { getUserProfileUrl } from "@/libs/getImageUrl"; // ✅ ADD import

const router = useRouter();
const toast = useToast();

const { users, loading, pagination, fetchUsers } = useUsers();

// State
const searchQuery = ref("");
const currentPage = ref(1);
const perPage = ref(15);
const sortBy = ref("");
const sortDir = ref("");

// Modals
const showExportModal = ref(false);
const exportLoading = ref(false); // ✅ ADD loading state for export

const activeFilters = ref({
  status: "",
  role: "",
});

// Cycle through role filters
const toggleRoleFilter = () => {
  // ✅ Cycle only between customer and umkm-owner, never admin
  if (activeFilters.value.role === "") {
    activeFilters.value.role = "customer";
  } else if (activeFilters.value.role === "customer") {
    activeFilters.value.role = "umkm-owner";
  } else {
    activeFilters.value.role = "";
  }
  currentPage.value = 1;
  loadUsers();
};

const onStatusChange = () => {
  currentPage.value = 1;
  loadUsers();
};

const getRoleLabel = computed(() => {
  if (activeFilters.value.role === "customer") return "Hanya Customer";
  if (activeFilters.value.role === "umkm-owner") return "Hanya UMKM";
  return "Semua Role";
});

const getRoleIcon = computed(() => {
  if (activeFilters.value.role === "customer") return "pi-user";
  if (activeFilters.value.role === "umkm-owner") return "pi-building";
  return "pi-users";
});

// Status change modal state
const showStatusModal = ref(false);
const selectedUser = ref(null);
const newStatus = ref('');
const statusChangeLoading = ref(false);

const isAnyModalOpen = computed(() => showExportModal.value || showStatusModal.value);
useBodyScrollLock(isAnyModalOpen);

const statusChangeOptions = [
  { value: 'active', label: 'Aktif', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'suspended', label: 'Dibekukan', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'inactive', label: 'Tidak Aktif', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  { value: 'watchlist', label: 'Watchlist', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
];

const openStatusModal = (user) => {
  selectedUser.value = user;
  newStatus.value = user.status;
  showStatusModal.value = true;
};

const confirmStatusChange = async () => {
  if (!selectedUser.value || !newStatus.value) return;
  statusChangeLoading.value = true;
  try {
    await api.patch(`/api/admin/users/${selectedUser.value.id}/status`, { status: newStatus.value });
    toast.success(`Status pengguna berhasil diubah menjadi ${newStatus.value}`);
    showStatusModal.value = false;
    selectedUser.value = null;
    loadUsers();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal mengubah status');
  } finally {
    statusChangeLoading.value = false;
  }
};

const tableColumns = [
  { key: "photo", label: "Foto", sortable: false },
  { key: "name", label: "Username", sortable: true },
  { key: "phone", label: "No HP", sortable: true },
  { key: "nik", label: "NIK", sortable: true },
  { key: "roles", label: "Roles", sortable: false },
  { key: "merchants", label: "UMKM", sortable: false },
  { key: "status", label: "Status", sortable: true },
];

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Active" },
  { value: "declining", label: "Declining" },
  { value: "watchlist", label: "Watchlist" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];

const tableActions = [
  {
    icon: "pi-eye",
    label: "Lihat Detail",
    handler: (user) => goToDetail(user),
    class: "hover:bg-muted-foreground/20 text-muted-foreground",
  },
  {
    icon: "pi-pencil",
    label: "Ubah Status",
    handler: (user) => openStatusModal(user),
    class: "hover:bg-blue-100 text-blue-600",
  },
];

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

const activeFilterCount = computed(() => {
  let count = 0;
  if (activeFilters.value.status) count++;
  if (activeFilters.value.role) count++;
  return count;
});

const loadUsers = async () => {
  try {
    await fetchUsers({
      exclude_admin: true, // ⬅️ pastikan admin tidak ditampilkan
      search: searchQuery.value,
      status: activeFilters.value.status,
      // ✅ Filter: never show admin in customer list
      role: activeFilters.value.role === "admin" ? "" : activeFilters.value.role,
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortDir.value,
    });
  } catch (error) {
    console.error("Failed to load users:", error);
  }
};

const roleNameMap = {
  admin: "Admin",
  customer: "Pelanggan",
  "umkm-owner": "Pemilik UMKM",
};

const formatRoleName = (roleName) => {
  return roleNameMap[roleName] || roleName;
};

const handleSearch = () => {
  currentPage.value = 1;
  loadUsers();
};

function highlightText(text) {
  if (!searchQuery.value.trim() || !text) return text;
  const q = searchQuery.value.trim();
  const re = new RegExp(`(${q})`, "gi");
  return String(text).replace(
    re,
    '<span class="bg-merchant-primary/20 text-merchant-primary font-bold px-1 rounded">$1</span>',
  );
}

// Modal methods
const openExportModal = () => {
  console.log("openExportModal called in customers/Index.vue");
  showExportModal.value = true;
};
const closeExportModal = () => (showExportModal.value = false);

const getMerchantSummary = (merchants) => {
  const list = Array.isArray(merchants) ? merchants : [];
  const firstName = list[0]?.name || "-";
  const truncatedName =
    firstName.length > 10 ? firstName.substring(0, 15) + "..." : firstName;
  const extra = Math.max(0, list.length - 1);

  return {
    first: truncatedName,
    fullName: firstName,
    extra,
    extraNames: list
      .slice(1)
      .map((m) => m?.name)
      .filter(Boolean),
  };
};

const exportPDF = async () => {
  exportLoading.value = true; // ✅ Set loading to true
  try {
    const response = await api.get("/api/admin/users/export-pdf", {
      responseType: "blob",
      params: {
        status: activeFilters.value.status,
        role: activeFilters.value.role,
        search: searchQuery.value,
      },
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `users-report-${new Date().toISOString().split("T")[0]}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan users berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false; // ✅ Set loading to false
  }
};

const goToDetail = (user) => {
  router.push({
    name: "Admin - Customer Detail",
    params: { id: user.id },
    query: { tab: "customers" },
  });
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

const emit = defineEmits(["create"]);

const goToCreate = () => {
  emit("create");
};

const handleSortChange = ({ key, dir }) => {
  sortBy.value = key;
  sortDir.value = dir;
  currentPage.value = 1;
  loadUsers();
};

// ✅ Inject the register function from parent
const registerExportModal = inject("registerExportModal", null);

// ✅ Register export modal callback with parent on mount
onMounted(() => {
  loadUsers();

  // Register the export modal function with parent
  if (registerExportModal) {
    console.log("Registering export modal callback for customers");
    registerExportModal(openExportModal);
  } else {
    console.warn("registerExportModal not provided by parent");
  }
});

watch(currentPage, () => loadUsers());

let searchDebounceTimer = null;
watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadUsers();
  }, 400);
});
</script>

<template>
  <div class="p-4 sm:p-6">
    <!-- Search & Toolbar -->
    <div class="space-y-2 sm:space-y-4 mb-4 bg-white">
      <div class="sm:flex sm:items-center sm:gap-4 pb-1">
        <div class="flex-1 mb-2 sm:mb-0">
          <TextField
            name="search"
            variant="merchant"
            v-model="searchQuery"
            placeholder="Cari user"
            icon="pi-search"
            @keyup.enter="handleSearch"
          />
        </div>

        <Button
          :variant="activeFilters.role ? 'merchant' : 'muted-outline'"
          size="md"
          class="w-full sm:w-auto mb-2 sm:mb-0"
          @click="toggleRoleFilter"
        >
          <i :class="['pi', getRoleIcon, 'mr-2']"></i>
          {{ getRoleLabel }}
        </Button>

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

    <!-- Desktop Table -->
    <div class="hidden sm:block">
      <AdminTable
        :items="users"
        :columns="tableColumns"
        :actions="tableActions"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :pagination-info="paginationInfo"
        :show-checkbox="false"
        :sort-by="sortBy"
        :sort-dir="sortDir"
        empty-message="Tidak ada user yang ditemukan"
        @row-click="goToDetail"
        @page-change="goToPage"
        @next-page="nextPage"
        @prev-page="prevPage"
        @sort-change="handleSortChange"
      >
        <template #cell-photo="{ item }">
          <div
            class="w-10 h-10 rounded-full bg-merchant-primary/10 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="item.profile_picture_path"
              :src="getUserProfileUrl(item, 'thumb')"
              :alt="item.name"
              class="w-full h-full object-cover"
              @error="
                (e) => {
                  console.error(
                    'Image load error for user:',
                    item.id,
                    item.name,
                  );
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span class='text-merchant-primary font-semibold text-sm'>${item.name?.charAt(0)?.toUpperCase() || 'U'}</span>`;
                }
              "
            />
            <span v-else class="text-merchant-primary font-semibold text-sm">
              {{ item.name?.charAt(0)?.toUpperCase() || "U" }}
            </span>
          </div>
        </template>

        <template #cell-name="{ item }">
          <div class="min-w-0">
            <p
              class="text-sm font-semibold text-black truncate"
              v-html="highlightText(item.name || '-')"
            ></p>
            <p
              class="text-xs text-muted-foreground truncate"
              v-html="highlightText(item.email || '-')"
            ></p>
          </div>
        </template>

        <template #cell-nik="{ item }">
          <span
            class="text-sm text-black"
            v-html="highlightText(item.nik || '-')"
          ></span>
        </template>

        <template #cell-roles="{ item }">
          <div class="flex flex-col gap-1">
            <span
              v-for="roleName in item.roles || []"
              :key="roleName"
              class="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap w-fit"
            >
              {{ formatRoleName(roleName) }}
            </span>
            <span
              v-if="!item.roles || item.roles.length === 0"
              class="text-xs text-muted-foreground"
              >-</span
            >
          </div>
        </template>

        <template #cell-merchants="{ item }">
          <div class="min-w-0">
            <div
              v-if="item.merchants && item.merchants.length"
              class="flex items-center gap-1 min-w-0"
            >
              <span
                class="inline-flex items-center px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-xs font-medium truncate max-w-[180px]"
                :title="getMerchantSummary(item.merchants).first"
              >
                <i class="pi pi-building text-xs mr-1.5"></i>
                {{ getMerchantSummary(item.merchants).first }}
              </span>

              <span
                v-if="getMerchantSummary(item.merchants).extra > 0"
                class="text-xs text-muted-foreground font-medium"
                :title="
                  getMerchantSummary(item.merchants).extraNames.join(', ')
                "
              >
                +{{ getMerchantSummary(item.merchants).extra }}
              </span>
            </div>
            <span v-else class="text-xs text-muted-foreground">-</span>
          </div>
        </template>

        <template #cell-status="{ item }">
          <StatusLabel :status="item.status" variant="user" size="sm" />
        </template>

        <template #cell-actions="{ item }">
          <Button
            @click.stop="goToDetail(item)"
            variant="muted-outline"
            size="sm"
          >
            <i class="pi pi-eye"></i>
          </Button>
        </template>
      </AdminTable>
    </div>

    <!-- Mobile List -->
    <div class="sm:hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-merchant-primary"></i>
      </div>

      <div v-else-if="!users || users.length === 0" class="text-center py-12">
        <i class="pi pi-users text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">Tidak ada user</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="u in users"
          :key="u.id"
          @click="goToDetail(u)"
          class="bg-white rounded-lg shadow-sm p-4 active:bg-gray-50 transition"
        >
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-12 h-12 rounded-full bg-merchant-primary/10 flex items-center justify-center shrink-0 overflow-hidden"
            >
              <img
                v-if="u.profile_picture_path"
                :src="getUserProfileUrl(u, 'thumb')"
                :alt="u.name"
                class="w-full h-full object-cover"
                @error="
                  (e) => {
                    console.error('Image load error for user:', u.id, u.name);
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span class='text-merchant-primary font-semibold'>${u.name?.charAt(0)?.toUpperCase() || 'U'}</span>`;
                  }
                "
              />
              <span v-else class="text-merchant-primary font-semibold">
                {{ u.name?.charAt(0)?.toUpperCase() || "U" }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="font-semibold text-gray-900 truncate"
                v-html="highlightText(u.name)"
              ></p>
              <p
                class="text-sm text-gray-600 truncate"
                v-html="highlightText(u.email)"
              ></p>
              <p
                class="text-xs text-gray-500 truncate"
                v-html="highlightText(u.phone || '-')"
              ></p>
            </div>

            <StatusLabel :status="u.status" variant="user" size="sm" />
          </div>

          <div class="flex items-center justify-between text-xs border-t pt-2">
            <span class="text-gray-600">
              <i class="pi pi-building mr-1"></i>
              {{ u.merchants_count || 0 }} Merchant
            </span>
            <span class="text-gray-600">
              <i class="pi pi-id-card mr-1"></i>
              {{ (u.roles && u.roles[0]) || "-" }}
            </span>
          </div>
        </div>
      </div>

      <MobilePagination
        v-if="users && users.length > 0"
        class="mt-4"
        :current-page="currentPage"
        :total-pages="totalPages"
        @prev="prevPage"
        @next="nextPage"
        @go-to="goToPage"
      />
    </div>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan Users"
      subtitle="Unduh laporan data users dalam format PDF"
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
                <li>Data lengkap users (Nama, Email, Phone, NIK)</li>
                <li>Role dan status users</li>
                <li>Informasi UMKM yang dimiliki</li>
                <li>Filter yang diterapkan (Status, Role, Pencarian)</li>
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

    <!-- Status Change Modal -->
    <ResponsiveModal
      :show="showStatusModal"
      @close="showStatusModal = false"
      title="Ubah Status Pengguna"
      :subtitle="selectedUser ? `${selectedUser.name} · ${selectedUser.email}` : ''"
    >
      <div class="space-y-4" v-if="selectedUser">
        <!-- Current Status Info -->
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <i class="pi pi-user text-gray-500"></i>
          <div>
            <p class="text-xs text-gray-500">Status saat ini</p>
            <StatusLabel :status="selectedUser.status" variant="user" size="sm" />
          </div>
        </div>

        <!-- Status Options -->
        <div>
          <p class="text-sm font-medium text-gray-700 mb-3">Pilih status baru:</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in statusChangeOptions"
              :key="opt.value"
              @click="newStatus = opt.value"
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                newStatus === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              ]"
            >
              <i :class="['pi', newStatus === opt.value ? 'pi-check-circle' : 'pi-circle', 'text-sm']"></i>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Warning for suspend -->
        <div v-if="newStatus === 'suspended'" class="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <i class="pi pi-exclamation-triangle text-red-500 text-sm mt-0.5"></i>
          <p class="text-xs text-red-700">Pengguna yang dibekukan akan langsung logout dan tidak bisa login kembali sampai statusnya diubah.</p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-2">
          <button
            @click="showStatusModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            @click="confirmStatusChange"
            :disabled="statusChangeLoading || newStatus === selectedUser.status"
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
