<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import Button from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import Overview from "./statistics/Overview.vue";
import Statistic from "./statistics/Statistic.vue";
import Distribution from "./statistics/Distribution.vue";
import RecentList from "./statistics/RecentList.vue";

const router = useRouter();
const toast = useToast();

// State
const loading = ref(true);
const stats = ref(null);
const chartLoading = ref(false);
const chartData = ref(null);
const showExportModal = ref(false);
const exportLoading = ref(false);

useBodyScrollLock(showExportModal);

// Load data
const loadStatistics = async () => {
  loading.value = true;
  try {
    const response = await api.get("/api/admin/dashboard/statistics", {
      params: { period: "last_30_days" }, 
    });

    if (!response || !response.data) {
      throw new Error("Empty response from server");
    }

    stats.value = response.data?.data ?? response.data;
  } catch (error) {

    if (error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("adminToken");
      router.push({ name: "Admin - Login" });
      return;
    }

    toast.error("Gagal memuat statistik dashboard");
  } finally {
    loading.value = false;
  }
};

const loadOrdersRevenue = async (params) => {
  chartLoading.value = true;
  try {
    const response = await api.get("/api/admin/dashboard/orders-revenue", { params });

    if (!response || !response.data) {
      throw new Error("Empty orders/revenue response");
    }

    chartData.value = response.data?.data ?? response.data;
  } catch (error) {
    toast.error("Gagal memuat data orders/revenue");
  } finally {
    chartLoading.value = false;
  }
};

// Event handlers
const handleStatisticFilterChange = (params) => {
  loadOrdersRevenue(params);
};

// Export handlers
const openExportModal = () => (showExportModal.value = true);
const closeExportModal = () => (showExportModal.value = false);

const exportPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get("/api/admin/dashboard/export-pdf", {
      responseType: "blob",
      params: { period: "last_30_days" },
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan dashboard berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

// Initial load
onMounted(async () => {
  await loadStatistics();
  await loadOrdersRevenue({
    period: "monthly",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <div class="text-center">
        <i class="pi pi-spin pi-spinner text-4xl text-merchant-primary mb-4"></i>
        <p class="text-gray-600">Memuat dashboard...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="stats">
      <!-- Header with Export Button -->
      <div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 class="text-2xl sm:text-3xl font-bold text-merchant-primary">Admin Dashboard</h1>
        
        <Button
          @click="openExportModal"
          variant="merchant"
          size="md"
          custom-class="!flex items-center gap-2 whitespace-nowrap"
        >
          <i class="pi pi-file-pdf"></i>
          <span>Export Laporan</span>
        </Button>
      </div>

      <!-- Section 1: Overview Cards -->
      <div class="mb-4 sm:mb-6">
        <Overview :initial-stats="stats" />
      </div>

      <!-- Section 2: Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Statistic
          :chart-data="chartData"
          :loading="chartLoading"
          @filter-change="handleStatisticFilterChange"
        />
        <Distribution :stats="stats" />
      </div>

      <!-- Section 3: Recent Lists -->
      <RecentList :stats="stats" />
    </div>

    <!-- Error State -->
    <div v-else class="flex items-center justify-center h-screen">
      <div class="text-center px-4">
        <i class="pi pi-exclamation-circle text-4xl sm:text-5xl text-red-500 mb-4"></i>
        <p class="text-lg sm:text-xl text-gray-700 mb-2">Gagal memuat dashboard</p>
        <button
          @click="loadStatistics"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm sm:text-base"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Laporan Dashboard"
      subtitle="Unduh laporan statistik dashboard dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">Laporan akan mencakup:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Overview statistik (Users, Paguyuban, Products, Reports)</li>
                <li>Distribusi produk berdasarkan kategori</li>
                <li>Distribusi merchant berdasarkan segmentasi</li>
                <li>10 Order terbaru</li>
                <li>10 Report terbaru</li>
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
  </div>
</template>