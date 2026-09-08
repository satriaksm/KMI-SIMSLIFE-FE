<script setup>
import { useRoute, useRouter } from "vue-router";
import { onMounted, ref, computed, nextTick, watch } from "vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import api from "@/libs/axios";
import Chart from "chart.js/auto";
import { useAuthStore } from "@/stores/auth";
import { formatDate, formatTime } from "@/libs/format.js";

const isDev = import.meta.env.DEV;
const route = useRoute();
const router = useRouter();
const emit = defineEmits(["toggle-sidebar"]);

const loading = ref(true);
const authStore = useAuthStore();

// ======================
// STATE
// ======================
const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

const currentMerchant = computed(() => authStore.getMerchantBySlug(currentMerchantSlug.value));
const currentMerchantName = computed(() => currentMerchant.value?.name || "UMKM");

const currentMerchantSegmentation = computed(() => {
  return currentMerchant.value?.segmentation ?? null;
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

const orderStats = ref({
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  cancelled: 0,
  today: 0,
});

const revenueStats = ref({
  total_revenue: 0,
  today_revenue: 0,
  this_month_revenue: 0,
  pending_revenue: 0,
});

const catalogStats = ref({
  total: 0,
  published: 0,
  draft: 0,
  archived: 0,
  low_stock: 0,
  out_of_stock: 0,
});

const voucherStats = ref({
  total: 0,
  active: 0,
  inactive: 0,
  expired: 0,
  used: 0,
});

const recentOrders = ref([]);
const chartDataRaw = ref(null);
const chartMode = ref("orders"); // 'orders' | 'revenue'

const chartInstance = ref(null);
const chartCanvasRef = ref(null);

// ======================
// FORMATTERS & HELPERS
// ======================
const formatIDR = (val) => {
  return Number(val || 0).toLocaleString("id-ID");
};

function statusProps(beStatus) {
  switch (beStatus) {
    case "pending":
      return { status: "pending", variant: "order", label: "Menunggu" };
    case "waiting_review":
    case "paid":
      return { status: "paid", variant: "order", label: "Menunggu Review" };
    case "processing":
    case "responsed":
    case "proses":
      return { status: "processed", variant: "order", label: "Diproses" };
    case "ready":
      return { status: "ready", variant: "order", label: "Siap Diambil" };
    case "shipped":
    case "delivered":
      return { status: "shipped", variant: "order", label: "Dikirim" };
    case "completed":
    case "selesai":
      return { status: "completed", variant: "order", label: "Selesai" };
    case "cancelled":
    case "batal":
    case "rejected":
    case "gagal":
      return { status: "cancelled", variant: "order", label: "Gagal/Batal" };
    default:
      return { status: "pending", variant: "order", label: beStatus };
  }
}

// ======================
// CHART RENDERING
// ======================
const renderChart = () => {
  if (!chartCanvasRef.value || !chartDataRaw.value) return;

  chartInstance.value?.destroy();

  const labels = chartDataRaw.value.labels || [];
  const isRevenue = chartMode.value === "revenue";
  const datasetData = isRevenue
    ? chartDataRaw.value.revenue_data || []
    : chartDataRaw.value.data || [];

  const ctx = chartCanvasRef.value.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);

  if (isRevenue) {
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
  } else {
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
  }

  chartInstance.value = new Chart(chartCanvasRef.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: isRevenue ? "Omset (Rp)" : "Jumlah Pesanan",
          data: datasetData,
          borderColor: isRevenue ? "#10b981" : "#3b82f6",
          backgroundColor: gradient,
          borderWidth: 2.5,
          pointBackgroundColor: isRevenue ? "#10b981" : "#3b82f6",
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          titleFont: { size: 12, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              if (isRevenue) {
                return ` Omset Selesai: Rp ${formatIDR(context.parsed.y)}`;
              }
              return ` Pesanan: ${context.parsed.y} transaksi`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(243, 244, 246, 1)",
          },
          ticks: {
            stepSize: isRevenue ? undefined : 1,
            callback: function (val) {
              if (isRevenue) {
                if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
                if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`;
                return `Rp ${val}`;
              }
              return val;
            },
            font: { size: 11 },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 11 },
          },
        },
      },
    },
  });
};

watch(chartMode, () => {
  renderChart();
});

// ======================
// FETCH DATA
// ======================
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

    orderStats.value = data.order_stats || orderStats.value;
    revenueStats.value = data.revenue_stats || revenueStats.value;
    catalogStats.value = data.stats || catalogStats.value;
    voucherStats.value = data.voucher_stats || voucherStats.value;
    recentOrders.value = data.recent_orders || [];
    chartDataRaw.value = data.charts?.orders || null;

    loading.value = false;
    await nextTick();
    renderChart();
  } catch (err) {
    if (isDev) {
      console.error("Dashboard fetch error:", err);
    }
    loading.value = false;
  }
};

const goToOrders = () => {
  router.push({ name: "Merchant - Orders", params: { merchantSlug: currentMerchantSlug.value } });
};

const goToReports = () => {
  router.push({ name: "Merchant - Reports", params: { merchantSlug: currentMerchantSlug.value } });
};

// ======================
// LIFECYCLE
// ======================
onMounted(fetchDashboard);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-12">
    <!-- HEADER -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 border-b border-gray-100 sm:border-0"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 rounded-full lg:hidden hover:bg-gray-100"
        >
          <i class="pi pi-bars"></i>
        </button>
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ringkasan omset dan aktivitas toko
          </p>
        </div>
      </div>

      <!-- Action Button: Refresh -->
      <div class="flex items-center gap-2">
        <Button
          @click="fetchDashboard"
          :disabled="loading"
          variant="merchant-outline"
          size="sm"
          customClass="!hidden md:!inline-flex"
        >
          <i :class="['pi pi-refresh text-xs sm:mr-1.5', { 'animate-spin': loading }]"></i>
          <span class="hidden sm:block">Segarkan</span>
        </Button>
        <Button
          @click="fetchDashboard"
          :disabled="loading"
          variant="merchant-outline"
          size="md"
          customClass="sm:hidden"
        >
          <i :class="['pi pi-refresh sm:mr-1.5', { 'animate-spin': loading }]"></i>
        </Button>
      </div>
    </div>

    <!-- spacer -->
    <div class="h-24 sm:h-0"></div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex justify-center items-center min-h-[70vh] w-full"
    >
      <div
        class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
      ></div>
    </div>

    <div v-else class="px-4 space-y-6 sm:px-6 mt-4 sm:mt-6 ">
      <!-- ==============================================
           1. REKAP OMSET & PENJUALAN TOKO
      =============================================== -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <i class="pi pi-chart-line text-merchant-primary"></i>
            <span>Rekap Omset Penjualan</span>
          </h2>
          <button
            @click="goToReports"
            class="text-xs font-semibold text-merchant-primary hover:underline flex items-center gap-1"
          >
            <span>Buka Laporan Transaksi</span>
            <i class="pi pi-arrow-right text-[10px]"></i>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Card 1: Total Omset Selesai -->
          <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">Total Omset Selesai</span>
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <i class="pi pi-money-bill text-sm"></i>
                </div>
              </div>
              <p class="text-xl sm:text-2xl font-bold text-gray-900">
                Rp {{ formatIDR(revenueStats.total_revenue) }}
              </p>
              <p class="text-[11px] text-emerald-600 font-medium mt-1">
                Dari {{ orderStats.completed }} pesanan berhasil
              </p>
            </div>
            <div class="pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Status pesanan:</span>
              <span class="font-semibold text-emerald-600">Selesai</span>
            </div>
          </div>

          <!-- Card 2: Omset Bulan Ini -->
          <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">Omset Bulan Ini</span>
                <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i class="pi pi-calendar text-sm"></i>
                </div>
              </div>
              <p class="text-xl sm:text-2xl font-bold text-gray-900">
                Rp {{ formatIDR(revenueStats.this_month_revenue) }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Akumulasi bulan berjalan</p>
            </div>
            <div class="pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Bulan ini:</span>
              <span class="font-semibold text-gray-800">{{ new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }}</span>
            </div>
          </div>

          <!-- Card 3: Omset Hari Ini -->
          <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">Omset Hari Ini</span>
                <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <i class="pi pi-clock text-sm"></i>
                </div>
              </div>
              <p class="text-xl sm:text-2xl font-bold text-gray-900">
                Rp {{ formatIDR(revenueStats.today_revenue) }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">
                {{ orderStats.today }} pesanan masuk hari ini
              </p>
            </div>
            <div class="pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Hari ini:</span>
              <span class="font-semibold text-gray-800">{{ formatDate(new Date()) }}</span>
            </div>
          </div>

          <!-- Card 4: Transaksi Berjalan -->
          <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">Transaksi Berjalan</span>
                <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <i class="pi pi-hourglass text-sm"></i>
                </div>
              </div>
              <p class="text-xl sm:text-2xl font-bold text-amber-600">
                Rp {{ formatIDR(revenueStats.pending_revenue) }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Estimasi nilai pesanan dalam proses</p>
            </div>
            <div class="pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Dalam proses:</span>
              <span class="font-semibold text-amber-600">{{ orderStats.processing + orderStats.pending }} pesanan</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ==============================================
           2. REKAP STATUS PESANAN MASUK
      =============================================== -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <i class="pi pi-shopping-bag text-merchant-primary"></i>
            <span>Status Pesanan Masuk</span>
          </h2>
          <button
            @click="goToOrders"
            class="text-xs font-semibold text-merchant-primary hover:underline flex items-center gap-1"
          >
            <span>Kelola Pesanan</span>
            <i class="pi pi-arrow-right text-[10px]"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <!-- Menunggu Konfirmasi -->
          <div
            @click="goToOrders"
            class="p-4 bg-white border border-gray-200/80 shadow-sm rounded-2xl hover:border-amber-400 cursor-pointer transition"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <i class="pi pi-clock text-sm"></i>
              </div>
              <span v-if="orderStats.pending > 0" class="flex h-2.5 w-2.5 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>
            <p class="text-xs text-gray-500 font-medium">Perlu Respon</p>
            <p class="text-xl font-bold text-gray-900 mt-0.5">{{ orderStats.pending }}</p>
          </div>

          <!-- Sedang Diproses -->
          <div
            @click="goToOrders"
            class="p-4 bg-white border border-gray-200/80 shadow-sm rounded-2xl hover:border-blue-400 cursor-pointer transition"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <i class="pi pi-sync text-sm"></i>
              </div>
            </div>
            <p class="text-xs text-gray-500 font-medium">Sedang Diproses</p>
            <p class="text-xl font-bold text-gray-900 mt-0.5">{{ orderStats.processing }}</p>
          </div>

          <!-- Pesanan Selesai -->
          <div
            @click="goToOrders"
            class="p-4 bg-white border border-gray-200/80 shadow-sm rounded-2xl hover:border-emerald-400 cursor-pointer transition"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i class="pi pi-check-circle text-sm"></i>
              </div>
            </div>
            <p class="text-xs text-gray-500 font-medium">Pesanan Selesai</p>
            <p class="text-xl font-bold text-gray-900 mt-0.5">{{ orderStats.completed }}</p>
          </div>

          <!-- Pesanan Dibatalkan / Gagal -->
          <div
            @click="goToOrders"
            class="p-4 bg-white border border-gray-200/80 shadow-sm rounded-2xl hover:border-red-400 cursor-pointer transition"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <i class="pi pi-times-circle text-sm"></i>
              </div>
            </div>
            <p class="text-xs text-gray-500 font-medium">Batal / Gagal</p>
            <p class="text-xl font-bold text-gray-900 mt-0.5">{{ orderStats.cancelled }}</p>
          </div>

          <!-- Total Seluruh Pesanan -->
          <div
            @click="goToOrders"
            class="p-4 bg-white border border-gray-200/80 shadow-sm rounded-2xl hover:border-gray-400 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                <i class="pi pi-inbox text-sm"></i>
              </div>
            </div>
            <p class="text-xs text-gray-500 font-medium">Total Pesanan</p>
            <p class="text-xl font-bold text-gray-900 mt-0.5">{{ orderStats.total }}</p>
          </div>
        </div>
      </div>

      <!-- ==============================================
           3. GRAFIK TREN 7 HARI & REKAP TRANSAKSI TERAKHIR
      =============================================== -->
      <div class="grid grid-cols-1 gap-2 sm:gap-6 lg:grid-cols-12">
        <!-- Chart Column (7 Hari Terakhir) -->
        <div class="lg:col-span-7 bg-white border border-gray-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900">
                Tren Transaksi 7 Hari Terakhir
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">
                Pantau volume pesanan dan pemasukan harian
              </p>
            </div>
            <!-- Toggle Mode -->
            <div class="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                @click="chartMode = 'orders'"
                :class="[
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition',
                  chartMode === 'orders'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                ]"
              >
                Pesanan
              </button>
              <button
                @click="chartMode = 'revenue'"
                :class="[
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition',
                  chartMode === 'revenue'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                ]"
              >
                Omset (Rp)
              </button>
            </div>
          </div>

          <!-- Canvas -->
          <div class="relative h-[250px] w-full">
            <canvas ref="chartCanvasRef"></canvas>
          </div>
        </div>

        <!-- Recent Transactions Column -->
        <div class="lg:col-span-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-bold text-gray-900">Transaksi Terbaru</h3>
                <p class="text-xs text-gray-500 mt-0.5">5 Pesanan terakhir yang masuk</p>
              </div>
              <button
                @click="goToOrders"
                class="text-xs font-semibold text-merchant-primary hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <!-- List of Recent Orders -->
            <div v-if="recentOrders.length === 0" class="py-10 text-center text-gray-400">
              <i class="pi pi-inbox text-3xl mb-2"></i>
              <p class="text-xs">Belum ada transaksi masuk.</p>
            </div>

            <div v-else class="divide-y divide-gray-100">
              <div
                v-for="item in recentOrders"
                :key="item.id"
                @click="goToOrders"
                class="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition cursor-pointer"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono text-xs font-bold text-gray-900 truncate">
                      {{ item.order_code }}
                    </span>
                    <span
                      class="px-1.5 py-0.2 text-[9px] font-semibold rounded"
                      :class="item.order_type === 'jasa' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'"
                    >
                      {{ item.order_type === 'jasa' ? 'Jasa' : 'Produk' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-700 font-medium truncate mt-0.5">
                    {{ item.customer_name }}
                  </p>
                  <p class="text-[11px] text-gray-400">
                    {{ formatDate(item.created_at) }} • {{ formatTime(item.created_at) }}
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <p class="text-xs font-bold text-gray-900">
                    Rp {{ formatIDR(item.total) }}
                  </p>
                  <div class="mt-1">
                    <StatusLabel v-bind="statusProps(item.status)" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-gray-100">
            <button
              @click="goToOrders"
              class="w-full py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition flex items-center justify-center gap-1"
            >
              <span>Buka Menu Pesanan</span>
              <i class="pi pi-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ==============================================
           4. RINGKASAN KATALOG & VOUCHER
      =============================================== -->
      <div class="grid grid-cols-1 gap-2 sm:gap-6 md:grid-cols-2">
        <!-- Katalog Box -->
        <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i :class="isJasaMerchant ? 'pi pi-briefcase' : 'pi pi-box'"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-900">Katalog {{ catalogLabel }}</h3>
                <p class="text-xs text-gray-500">Status tayang item katalog</p>
              </div>
            </div>
            <router-link
              :to="{ name: isJasaMerchant ? 'Merchant - Jasa Index' : 'Merchant - Product UMKM', params: { merchantSlug: currentMerchantSlug } }"
              class="text-xs font-semibold text-merchant-primary hover:underline"
            >
              Kelola
            </router-link>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 bg-gray-50 rounded-xl">
              <p class="text-lg font-bold text-gray-900">{{ catalogStats.total }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Total {{ catalogLabel }}</p>
            </div>
            <div class="p-3 bg-green-50/60 rounded-xl">
              <p class="text-lg font-bold text-green-700">{{ catalogStats.published }}</p>
              <p class="text-xs text-green-700 mt-0.5">Dipublish</p>
            </div>
            <div class="p-3 bg-amber-50/60 rounded-xl">
              <p class="text-lg font-bold text-amber-700">{{ catalogStats.draft }}</p>
              <p class="text-xs text-amber-700 mt-0.5">Draft</p>
            </div>
          </div>
        </div>

        <!-- Voucher Box -->
        <div class="p-5 bg-white border border-gray-200/80 shadow-sm rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <i class="pi pi-tag"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-900">Promosi & Voucher</h3>
                <p class="text-xs text-gray-500">Status penggunaan kupon diskon</p>
              </div>
            </div>
            <router-link
              :to="{ name: 'Merchant - Voucher', params: { merchantSlug: currentMerchantSlug } }"
              class="text-xs font-semibold text-merchant-primary hover:underline"
            >
              Kelola
            </router-link>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 bg-gray-50 rounded-xl">
              <p class="text-lg font-bold text-gray-900">{{ voucherStats.total }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Total Voucher</p>
            </div>
            <div class="p-3 bg-purple-50/60 rounded-xl">
              <p class="text-lg font-bold text-purple-700">{{ voucherStats.active }}</p>
              <p class="text-xs text-purple-700 mt-0.5">Sedang Aktif</p>
            </div>
            <div class="p-3 bg-blue-50/60 rounded-xl">
              <p class="text-lg font-bold text-blue-700">{{ voucherStats.used }}</p>
              <p class="text-xs text-blue-700 mt-0.5">Kali Digunakan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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