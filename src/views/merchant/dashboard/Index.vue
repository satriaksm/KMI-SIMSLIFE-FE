<script setup>
import { useRoute } from "vue-router";
import { onMounted, ref, computed, nextTick } from "vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import Button from "@/components/common/Button.vue";
import api from "@/libs/axios";
import Chart from "chart.js/auto";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";

const isDev = import.meta.env.DEV;
const route = useRoute();
const emit = defineEmits(["toggle-sidebar"]);
const loading = ref(true);
const withdrawing = ref(false);
const showPayoutModal = ref(false);
const authStore = useAuthStore();
const toast = useToast();

// ======================
// STATE
// ======================
const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

const currentMerchantName = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return merchant?.name || "UMKM";
});

const currentMerchantSegmentation = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return merchant?.segmentation ?? null;
});

const isJasaMerchant = computed(() => {
  const segId = Number(currentMerchantSegmentation.value?.id);
  const segName = String(currentMerchantSegmentation.value?.name ?? "");
  return segId === 3 || segName.toLowerCase().includes("jasa");
});

const catalogLabel = computed(() => (isJasaMerchant.value ? "Jasa" : "Produk"));

const breadcrumbItems = computed(() => [
  {
    label: "Dashboard",
  },
]);
const dashboardStats = ref([]);
const orderStats = ref(null);
const walletStats = ref(null);

const statusChart = ref(null);
const categoryChart = ref(null);
const STATUS_COLORS = [
  "#22c55e", // green-500 → Published (aktif)
  "#f59e0b", // amber-500 → Draft
  "#f87171", // red-400 → Archived
];
const CATEGORY_COLORS = [
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500
  "#a855f7", // violet-500
  "#64748b", // slate-500 → Lainnya
];

// ======================
// CHART REFS
// ======================
const statusChartRef = ref(null);
const categoryChartRef = ref(null);

// ======================
// CARD GROUPING
// ======================
const primaryStats = computed(() => dashboardStats.value.slice(0, 4));
const secondaryStats = computed(() => dashboardStats.value.slice(4));

// ======================
// INIT EMPTY CHARTS
// ======================
const createStatusChart = (labels, data) => {
  statusChart.value?.destroy();

  statusChart.value = new Chart(statusChartRef.value, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: STATUS_COLORS,
        },
      ],
    },
    options: {
      animation: {
        duration: 700,
        easing: "easeOutQuart",
      },
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
    },
  });
};

const createCategoryChart = (labels, data) => {
  categoryChart.value?.destroy();

  const colors = labels.map(
    (_, i) => CATEGORY_COLORS[i] || CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
  );

  categoryChart.value = new Chart(categoryChartRef.value, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors, // ✅ INI KUNCI
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: "easeOutCubic",
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 16,
          },
        },
      },
    },
  });
};

const fetchDashboard = async () => {
  try {
    loading.value = true;

    if (!currentMerchantSlug.value) {
      throw new Error("merchantSlug tidak ditemukan di route params");
    }
    const response = await api.get(
      `/api/merchant/${currentMerchantSlug.value}/dashboard`,
    );

    const data = response?.data?.data || {};
    const voucherStats = data.voucher_stats || {};
    
    orderStats.value = data.order_stats || null;
    walletStats.value = data.wallet || null;

    const label = catalogLabel.value;
    const catalogIcon = isJasaMerchant.value ? "pi pi-briefcase" : "pi pi-box";

    const stats = [
      {
        title: `Total ${label}`,
        value: data.stats.total,
        icon: catalogIcon,
        color: "bg-blue-100 text-blue-600",
      },
      {
        title: `${label} Dipublish`,
        value: data.stats.published,
        icon: "pi pi-check-circle",
        color: "bg-green-100 text-green-600",
      },
      {
        title: `${label} Draft`,
        value: data.stats.draft,
        icon: "pi pi-file-edit",
        color: "bg-yellow-100 text-yellow-600",
      },
      {
        title: `${label} Diarsipkan`,
        value: data.stats.archived,
        icon: "pi pi-folder-open",
        color: "bg-red-100 text-red-600",
      },
    ];

    // Untuk UMKM Jasa, info stok tidak relevan
    if (!isJasaMerchant.value) {
      stats.push(
        {
          title: "Stok Menipis",
          value: data.stats.low_stock,
          icon: "pi pi-exclamation-triangle",
          color: "bg-yellow-100 text-yellow-600",
        },
        {
          title: "Stok Habis",
          value: data.stats.out_of_stock,
          icon: "pi pi-exclamation-triangle",
          color: "bg-red-100 text-red-600",
        },
      );
    }

    // ======================
    // VOUCHER STATS
    // ======================
    stats.push(
      {
        title: "Total Voucher",
        value: voucherStats.total ?? 0,
        icon: "pi pi-tag",
        color: "bg-blue-100 text-blue-600",
      },
      {
        title: "Voucher Aktif",
        value: voucherStats.active ?? 0,
        icon: "pi pi-check-circle",
        color: "bg-green-100 text-green-600",
      },
      {
        title: "Voucher Tidak Aktif",
        value: voucherStats.inactive ?? 0,
        icon: "pi pi-times-circle",
        color: "bg-red-100 text-red-600",
      },
      {
        title: "Voucher Kadaluarsa",
        value: voucherStats.expired ?? 0,
        icon: "pi pi-clock",
        color: "bg-yellow-100 text-yellow-600",
      },
      {
        title: "Voucher Terpakai",
        value: voucherStats.used ?? 0,
        icon: "pi pi-chart-line",
        color: "bg-purple-100 text-purple-600",
      },
    );

    dashboardStats.value = stats;

    // ⬇️ PENTING
    loading.value = false;
    await nextTick(); // tunggu canvas benar-benar muncul

    // ======================
    // CREATE CHARTS (AMAN)
    // ======================
    if (
      data.charts?.status &&
      statusChartRef.value instanceof HTMLCanvasElement
    ) {
      createStatusChart(data.charts.status.labels, data.charts.status.data);
    }

    if (
      data.charts?.category &&
      categoryChartRef.value instanceof HTMLCanvasElement
    ) {
      createCategoryChart(
        data.charts.category.labels,
        data.charts.category.datasets[0].data,
      );
    }
  } catch (err) {
    if (isDev) {
      console.error("Dashboard fetch error:", err);
    }
    loading.value = false;
  }
};

const requestPayout = () => {
  if (!walletStats.value?.balance_withdrawable || walletStats.value.balance_withdrawable < 10000) {
    toast.error("Saldo yang dapat ditarik minimal Rp 10.000");
    return;
  }
  showPayoutModal.value = true;
};

const confirmPayout = async () => {
  try {
    withdrawing.value = true;
    const response = await api.post(`/api/merchant/${currentMerchantSlug.value}/payouts`, {
      amount: walletStats.value.balance_withdrawable
    });
    toast.success("Penarikan berhasil diajukan");
    showPayoutModal.value = false;
    // Refresh stats
    await fetchDashboard();
  } catch (err) {
    toast.error(err.response?.data?.message || "Gagal mengajukan penarikan");
  } finally {
    withdrawing.value = false;
  }
};

// ======================
// LIFECYCLE
// ======================
onMounted(fetchDashboard);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- HEADER -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 rounded-full sm:hidden hover:bg-gray-100"
        >
          <i class="pi pi-bars"></i>
        </button>
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ringkasan kondisi katalog {{ currentMerchantName }}
          </p>
        </div>
      </div>
    </div>

    <!-- spacer -->
    <div class="h-24 sm:h-0"></div>
    <!-- ✅ FIXED: Loading State -->
    <div
      v-if="loading"
      class="flex justify-center items-center min-h-[80dvh] w-full rounded-lg mx-0"
    >
      <div
        class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
      ></div>
    </div>

    <div v-else>
      <!-- ======================
         PESANAN & KEUANGAN
      ====================== -->
      <div class="px-4 mt-2 sm:px-6 sm:mt-6" v-if="orderStats && walletStats">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Pesanan & Keuangan</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div class="flex items-center justify-center w-10 h-10 mb-2 rounded-xl bg-orange-100 text-orange-600">
              <i class="pi pi-clock"></i>
            </div>
            <p class="text-xs text-muted-foreground">Menunggu Konfirmasi</p>
            <p class="text-xl font-bold text-gray-900">{{ orderStats.pending }}</p>
          </div>
          <div class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div class="flex items-center justify-center w-10 h-10 mb-2 rounded-xl bg-blue-100 text-blue-600">
              <i class="pi pi-shopping-bag"></i>
            </div>
            <p class="text-xs text-muted-foreground">Pesanan Hari Ini</p>
            <p class="text-xl font-bold text-gray-900">{{ orderStats.today }}</p>
          </div>
          <div class="flex flex-col justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div>
              <div class="flex items-center justify-center w-10 h-10 mb-2 rounded-xl bg-green-100 text-green-600">
                <i class="pi pi-wallet"></i>
              </div>
              <p class="text-xs text-muted-foreground">Saldo Dapat Ditarik</p>
              <p class="text-lg font-bold text-gray-900">{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(walletStats.balance_withdrawable) }}</p>
              <div v-if="walletStats.balance_held > 0" class="mt-1 text-[10px] text-gray-500">
                Tertahan (24j): {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(walletStats.balance_held) }}
              </div>
            </div>
            <button 
              @click="requestPayout" 
              :disabled="withdrawing || walletStats.balance_withdrawable < 10000"
              class="w-full mt-3 py-1.5 px-3 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
            >
              <i v-if="withdrawing" class="pi pi-spinner animate-spin"></i>
              <span v-else>Tarik Saldo</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ======================
         PRIMARY STATS
    ====================== -->
      <div class="px-4 mt-4 sm:px-6 sm:mt-6">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Katalog & Produk</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="(stat, i) in primaryStats"
            :key="i"
            class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl"
          >
            <div
              class="flex items-center justify-center w-10 h-10 mb-2 rounded-xl"
              :class="stat.color"
            >
              <i :class="stat.icon"></i>
            </div>
            <p class="text-xs text-muted-foreground">{{ stat.title }}</p>
            <p class="text-xl font-bold text-gray-900">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- ======================
         SECONDARY STATS (SCROLL)
    ====================== -->
      <div class="px-4 mt-6 sm:px-6">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Voucher & Stok Lainnya</h2>
        <div class="flex gap-3 pb-2 overflow-x-auto scrollbar-hide">
          <div
            v-for="(stat, i) in secondaryStats"
            :key="i"
            class="p-4 bg-white border border-gray-100 shadow-sm min-w-40 rounded-2xl"
          >
            <div
              class="flex items-center justify-center mb-2 w-9 h-9 rounded-xl"
              :class="stat.color"
            >
              <i :class="stat.icon"></i>
            </div>
            <p class="text-xs text-muted-foreground">{{ stat.title }}</p>
            <p class="text-lg font-semibold text-gray-900">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- ======================
         CHARTS
    ====================== -->
      <div class="px-4 mt-8 mb-4 space-y-4 sm:px-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="p-4 bg-white shadow-sm rounded-2xl">
            <h3 class="mb-3 text-sm font-semibold">
              Status {{ catalogLabel }}
            </h3>
            <div class="relative h-[220px]">
              <canvas ref="statusChartRef"></canvas>
            </div>
          </div>

          <div class="p-4 bg-white shadow-sm rounded-2xl">
            <h3 class="mb-3 text-sm font-semibold">
              {{ catalogLabel }} per Kategori
            </h3>
            <div class="relative h-[220px]">
              <canvas ref="categoryChartRef"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Penarikan -->
    <ResponsiveModal
      v-model:show="showPayoutModal"
      title="Tarik Saldo"
      @close="showPayoutModal = false"
    >
      <div class="p-4 space-y-4">
        <div class="p-4 rounded-xl bg-green-50 border border-green-100 flex flex-col items-center justify-center">
          <p class="text-sm text-green-800 mb-1">Nominal Penarikan</p>
          <p class="text-2xl font-bold text-green-900">
            {{ new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(walletStats?.balance_withdrawable || 0) }}
          </p>
        </div>
        <div class="px-4 py-3 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl">
          <p class="font-medium">Informasi Penarikan:</p>
          <ul class="mt-1 ml-4 list-disc space-y-0.5 opacity-90">
            <li>Biaya admin + VAT (Rp 4.440) akan dipotong dari nominal di atas.</li>
            <li>Dana yang diterima di bank adalah nominal di atas dikurangi Rp 4.440.</li>
            <li>Minimal nominal penarikan adalah Rp 14.440.</li>
          </ul>
        </div>
        <p class="text-sm text-gray-600 text-center mt-4">
          Dana akan ditransfer ke rekening bank yang terdaftar di profil toko Anda. Proses ini mungkin memakan waktu beberapa saat.
        </p>
        <div class="flex gap-3 mt-6">
          <Button
            variant="muted-outline"
            @click="showPayoutModal = false"
            customClass="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            @click="confirmPayout"
            :loading="withdrawing"
            customClass="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Tarik Sekarang
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
