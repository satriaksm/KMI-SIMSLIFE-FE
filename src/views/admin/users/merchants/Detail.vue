<script setup>
import { ref, onMounted, nextTick, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import ApexCharts from "apexcharts";
import { getMerchantLogoUrl, getEventBannerUrl } from "@/libs/getImageUrl"; // ✅ ADD getEventBannerUrl

const route = useRoute();
const router = useRouter();
const toast = useToast();

const merchant = ref(null);
const loading = ref(true);
const ordersChartEl = ref(null);
const ordersChart = ref(null);
const productChartEl = ref(null);
const productChart = ref(null);

const showExportModal = ref(false);
const exportLoading = ref(false);

const registerExportModal = inject('registerExportModal', null);

const loadMerchant = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/api/admin/merchants/${route.params.id}`);
    merchant.value = res.data.data;
    console.log('Merchant loaded:', merchant.value); // Debug
  } catch (e) {
    console.error('Failed to load merchant:', e);
    toast.error("Gagal memuat detail merchant");
    router.push({ name: "Admin - Merchants List" });
  } finally {
    loading.value = false;
  }
};

const loadStatistics = async () => {
  try {
    const res = await api.get(`/api/admin/merchants/${route.params.id}/statistics`);
    
    //  Wait for DOM to be ready before rendering charts
    await nextTick();
    
    //  Verify elements exist before rendering
    if (ordersChartEl.value && productChartEl.value) {
      await renderOrdersChart(res.data.orders);
      renderProductChart(res.data.product_orders);
    } else {
      console.warn('Chart elements not ready yet');
      //  Retry after a short delay
      setTimeout(async () => {
        if (ordersChartEl.value && productChartEl.value) {
          await renderOrdersChart(res.data.orders);
          renderProductChart(res.data.product_orders);
        }
      }, 100);
    }
  } catch (e) {
    console.error('Failed to load statistics:', e);
    toast.error("Gagal memuat statistik merchant");
  }
};

// --- CHART LOGIC SAMA DENGAN Statistic.vue ---
const formatCurrency = (num) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
};

//  ADD: Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return '-';
  }
};

const computeMax = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 10;
  const max = Math.max(...arr, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitude) * magnitude;
};

const waitForElementSize = async (el, maxFrames = 20) => {
  if (!el) return;
  const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
  let frames = 0;
  while (el.offsetWidth === 0 && frames < maxFrames) {
    await raf();
    frames++;
  }
  await nextTick();
};

async function renderOrdersChart(orders) {
  //  Add safety check
  if (!ordersChartEl.value) {
    console.error('ordersChartEl not found');
    throw new Error('Element not found');
  }

  await waitForElementSize(ordersChartEl.value);

  // Bangun 7 hari terakhir (oldest -> newest)
  const today = new Date();
  let labels = [];
  let ordersMap = {};
  if (Array.isArray(orders)) {
    orders.forEach((o) => {
      ordersMap[o.date] = Number(o.total || 0);
    });
  }
  let ordersData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    labels.push(iso);
    ordersData.push(ordersMap[iso] ?? 0);
  }
  const ordersMax = computeMax(ordersData) * 1.15;

  if (ordersChartEl.value) {
    ordersChartEl.value.innerHTML = "";
  }

  const options = {
    chart: {
      type: "area",
      height: 240,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 1200,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 800 },
      },
    },
    stroke: { curve: "smooth", width: [3] },
    fill: {
      type: "gradient",
      gradient: { enabled: true, opacityFrom: 0.55, opacityTo: 0 },
    },
    markers: {
      size: 0,
      hover: { size: 7, sizeOffset: 3 },
    },
    colors: ["#44a4b4"],
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      y: [{ formatter: (val) => `${Math.round(val)} pesanan` }],
      x: {
        formatter: function (val) {
          const d = new Date(val);
          if (!isNaN(d)) {
            return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
              .toString()
              .padStart(2, "0")}/${d.getFullYear()}`;
          }
          // fallback jika gagal parse
          return val;
        },
      },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      borderColor: "#f1f5f9",
    },
    legend: {
      show: false,
    },
    xaxis: {
      type: "category",
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "12px", fontWeight: 500, colors: "#64748b" },
        formatter: function (val) {
          // val = "2025-12-24" → tampilkan "24/12"
          const d = new Date(val);
          if (!isNaN(d)) {
            return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
              .toString()
              .padStart(2, "0")}`;
          }
          // fallback jika gagal parse
          return val?.slice(8, 10) + "/" + val?.slice(5, 7);
        },
      },
    },
    yaxis: [
      {
        seriesName: "Pesanan",
        min: 0,
        title: { text: "Pesanan", style: { fontSize: "14px", fontWeight: 600, color: "#64748b" } },
        max: ordersMax,
        labels: {
          formatter: (v) => Math.round(v),
          style: { fontSize: "12px", colors: "#64748b" },
        },
      },
    ],
    series: [
      { name: "Pesanan", type: "area", data: ordersData },
    ],
    noData: {
      text: "Tidak ada data pesanan/pendapatan",
      align: "center",
      verticalAlign: "middle",
      style: { color: "#64748b", fontSize: "16px" },
    },
  };

  if (ordersChart.value) {
    await ordersChart.value.updateOptions(
      {
        xaxis: options.xaxis,
        yaxis: options.yaxis,
        series: options.series,
      },
      false,
      true
    );
    await ordersChart.value.updateSeries(options.series, true);
  } else {
    ordersChart.value = new ApexCharts(ordersChartEl.value, options);
    await ordersChart.value.render();
  }
}

function renderProductChart(productOrders) {
  //  Add safety check
  if (!productChartEl.value) {
    console.error('productChartEl not found');
    return;
  }

  let categories = [];
  let seriesData = [];
  let fullCategories = [];
  if (!Array.isArray(productOrders) || productOrders.length === 0) {
    categories = ["-"];
    seriesData = [0];
    fullCategories = ["-"];
  } else {
    fullCategories = productOrders.map((p) => p.category);
    categories = fullCategories.map((cat) =>
      cat.length > 3 ? cat.slice(0, 3) + ".." : cat
    );
    seriesData = productOrders.map((p) => p.total);
  }

  productChart.value = new ApexCharts(productChartEl.value, {
    chart: { type: "bar", height: 195, toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "12px", fontWeight: 500, colors: "#64748b" },
        formatter: function (val, idx) {
          return val;
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: {
        enabled: true,
        formatter: function (val, opts) {
          return fullCategories[opts.dataPointIndex] || val;
        }
      }
    },
    yaxis: {
      min: 0,
      title: { text: "Total Order", style: { fontSize: "14px", fontWeight: 600, color: "#64748b" } },
      labels: { style: { fontSize: "12px", colors: "#64748b" } },
    },
    series: [{ name: "Order", data: seriesData }],
    plotOptions: { bar: { borderRadius: 5, columnWidth: "39%" } },
    colors: ["#44a4b4"],
    dataLabels: { enabled: false },
    grid: { yaxis: { lines: { show: true } }, borderColor: "#f1f5f9" },
    tooltip: {
      y: { formatter: (val) => `${val} order` },
      x: {
        formatter: function (val, opts) {
          return fullCategories[opts.dataPointIndex] || val;
        }
      }
    },
    noData: {
      text: "Tidak ada data kategori",
      align: "center",
      verticalAlign: "middle",
      style: { color: "#64748b", fontSize: "16px" },
    },
  });
  productChart.value.render();
}

// Export methods
const openExportModal = () => {
  console.log('Opening export modal');
  showExportModal.value = true;
};

const closeExportModal = () => {
  showExportModal.value = false;
};

const exportPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get(`/api/admin/merchants/${route.params.id}/export-pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `merchant-detail-${route.params.id}-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan merchant detail berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

function getSegmentationColor(segmentationName) {
  switch ((segmentationName || "").toLowerCase()) {
    case "umkm toko":
      return { bg: "rgba(68,164,180,0.1)", text: "#44a4b4" };
    case "umkm kuliner":
      return { bg: "rgba(244,196,108,0.1)", text: "#f4c46c" };
    case "umkm jasa":
      return { bg: "rgba(255,94,94,0.1)", text: "#ff5e5e" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280" };
  }
}

onMounted(async () => {
  loading.value = true;
  await loadMerchant();
  
  //  Wait for merchant data to be loaded and DOM to update
  await nextTick();
  
  //  Double check elements exist
  await new Promise(resolve => setTimeout(resolve, 50));
  
  await loadStatistics();
  loading.value = false;
  
  //  Register export callback with parent
  if (typeof registerExportModal === 'function') {
    registerExportModal(openExportModal);
    console.log('Merchant Detail: Export callback registered');
  } else {
    console.warn('registerExportModal function not available from parent');
  }
});
</script>

<template>
  <div v-if="merchant && !loading" class="p-4 sm:p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- ✅ Merchant Profile Card - Modern Design like MerchantInfo.vue -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <!-- Cover & Logo -->
        <div class="relative mb-2 overflow-visible bg-white sm:mb-4">
          <div class="relative w-full overflow-hidden sm:rounded-t-2xl aspect-24/9 lg:aspect-4/1">
            <img
              v-if="merchant.banner_url"
              :src="merchant.banner_url"
              alt="Cover"
              class="absolute inset-0 object-cover w-full h-full"
            />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted-background to-muted-foreground"
            >
              <svg class="w-12 h-12 text-white sm:w-16 sm:h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 19V5h14v14H5zm8-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-6 7l3-4 2.5 3 3.5-5 4 6H7z" />
              </svg>
            </div>
          </div>

          <div class="absolute -bottom-10 sm:-bottom-12 left-6 sm:left-8">
            <div v-if="merchant.logo_path" class="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-merchant-primary/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              <img 
                :src="getMerchantLogoUrl(merchant)"
                alt="Logo"
                class="w-full h-full object-cover"
                @error="(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class='text-3xl sm:text-5xl font-bold text-merchant-primary'>${merchant.name?.charAt(0).toUpperCase()}</span>`; }"
              />
            </div>
            <div v-else class="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-merchant-primary/10 flex items-center justify-center border-4 border-white shadow-lg">
              <span class="text-3xl sm:text-5xl font-bold text-merchant-primary">
                {{ merchant.name?.charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Info Content -->
        <div class="pt-14 sm:pt-16 p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ merchant.name }}</h2>
              <p class="text-gray-600 text-sm mb-2">{{ merchant.slug }}</p>
              <StatusLabel :status="merchant.status" variant="merchant" size="sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-user text-merchant-primary"></i>
              <div>
                <p class="text-xs text-gray-500">Owner</p>
                <p class="font-medium">{{ merchant.user?.name || "-" }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-envelope text-merchant-primary"></i>
              <div>
                <p class="text-xs text-gray-500">Email</p>
                <p class="font-medium">{{ merchant.user?.email || "-" }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-phone text-merchant-primary"></i>
              <div>
                <p class="text-xs text-gray-500">Telepon</p>
                <p class="font-medium">{{ merchant.phone || "-" }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-tag text-merchant-primary"></i>
              <div>
                <p class="text-xs text-gray-500">Segmentasi</p>
                <StatusLabel
                  :status="merchant.segmentation?.code || merchant.segmentation?.name?.toLowerCase().replace(/\s/g, '_')"
                  :label="merchant.segmentation?.name"
                  variant="segmentation"
                  size="sm"
                />
              </div>
            </div>
            <div v-if="merchant.paguyuban" class="flex items-center gap-2 sm:col-span-2">
              <i class="pi pi-users text-merchant-primary"></i>
              <div>
                <p class="text-xs text-gray-500">Paguyuban</p>
                <p class="font-medium">{{ merchant.paguyuban.name }}</p>
              </div>
            </div>
          </div>

          <div v-if="merchant.description" class="mt-4 pt-4 border-t">
            <p class="text-xs text-gray-500 mb-1">Deskripsi</p>
            <p class="text-sm text-gray-700">{{ merchant.description }}</p>
          </div>
        </div>

        <!-- Address Section -->
        <div v-if="merchant.primary_address" class="px-6 pb-6">
          <h3 class="text-sm font-semibold text-gray-800 mb-4">Alamat</h3>
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-map-marker text-merchant-primary"></i>
              <span class="font-semibold text-sm">{{ merchant.primary_address.label || 'Alamat Utama' }}</span>
            </div>
            <p class="text-sm text-gray-700 mb-2">{{ merchant.primary_address.detail || '-' }}</p>
            <div class="text-xs text-gray-500 space-y-1">
              <p>{{ merchant.primary_address.village?.name }}, {{ merchant.primary_address.district?.name }}</p>
              <p>{{ merchant.primary_address.city?.name }}, {{ merchant.primary_address.province?.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">Statistik</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Total Products -->
          <div class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 hover:shadow-lg hover:border-[#058895]/20 cursor-pointer transition-all duration-300 group">
            <div class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#058895]/10 group-hover:bg-[#058895]/15 rounded-xl sm:rounded-2xl mb-4 transition-colors">
              <i class="pi pi-box text-2xl sm:text-3xl text-[#058895] transition-colors"></i>
            </div>
            <div>
              <span class="text-xs sm:text-sm text-gray-500 block mb-1">Total Products</span>
              <h4 class="font-bold text-gray-800 text-2xl sm:text-3xl mb-1">
                {{ merchant.products_count ?? 0 }}
              </h4>
            </div>
          </div>

          <!-- Total Vouchers -->
          <div class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 hover:shadow-lg hover:border-[#058895]/20 cursor-pointer transition-all duration-300 group">
            <div class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#058895]/10 group-hover:bg-[#058895]/15 rounded-xl sm:rounded-2xl mb-4 transition-colors">
              <i class="pi pi-ticket text-2xl sm:text-3xl text-[#058895] transition-colors"></i>
            </div>
            <div>
              <span class="text-xs sm:text-sm text-gray-500 block mb-1">Total Vouchers</span>
              <h4 class="font-bold text-gray-800 text-2xl sm:text-3xl mb-1">
                {{ merchant.vouchers_count ?? 0 }}
              </h4>
            </div>
          </div>

          <!-- Total Events -->
          <div class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 hover:shadow-lg hover:border-[#058895]/20 cursor-pointer transition-all duration-300 group">
            <div class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-[#058895]/10 group-hover:bg-[#058895]/15 rounded-xl sm:rounded-2xl mb-4 transition-colors">
              <i class="pi pi-calendar text-2xl sm:text-3xl text-[#058895] transition-colors"></i>
            </div>
            <div>
              <span class="text-xs sm:text-sm text-gray-500 block mb-1">Total Events</span>
              <h4 class="font-bold text-gray-800 text-2xl sm:text-3xl mb-1">
                {{ merchant.events_count ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Line Chart -->
          <div class="border border-gray-200 rounded-xl p-4 flex flex-col">
            <div class="flex items-start justify-between gap-4 mb-2">
              <div>
                <p class="text-sm font-semibold text-gray-800">Total Transaksi 30 Hari Terakhir</p>
              </div>
            </div>
            <div ref="ordersChartEl" class="w-full h-60" style="min-height: 240px;"></div>
          </div>
          
          <!-- Bar Chart -->
          <div class="border border-gray-200 rounded-xl p-4 flex flex-col">
            <div class="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 class="text-sm font-semibold text-gray-800">Produk Terorder per Kategori (30 Hari)</h3>
                <p class="mt-1 text-gray-500 text-xs">Total order per kategori produk</p>
              </div>
            </div>
            <div ref="productChartEl" class="w-full h-60" style="min-height: 195px;"></div>
          </div>
        </div>
      </div>

      <!-- Vouchers Section -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Voucher</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ merchant.vouchers?.length || 0 }} voucher terdaftar
            </p>
          </div>
        </div>
        
        <!-- Vouchers Grid -->
        <div v-if="merchant.vouchers && merchant.vouchers.length > 0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="voucher in merchant.vouchers"
              :key="voucher.id"
              class="border border-gray-200 rounded-xl p-5 hover:border-merchant-primary hover:shadow-md transition-all group"
            >
              <!-- Voucher content -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="p-2 bg-merchant-primary/10 rounded-lg">
                      <i class="pi pi-ticket text-merchant-primary text-lg"></i>
                    </div>
                    <div>
                      <h4 class="font-semibold text-gray-900">{{ voucher.voucher_code }}</h4>
                      <StatusLabel :status="voucher.voucher_status" variant="voucher" size="xs" />
                    </div>
                  </div>
                </div>
              </div>
              
              <p class="text-sm text-gray-600 mb-4 line-clamp-2">
                {{ voucher.voucher_description || 'Tidak ada deskripsi' }}
              </p>
              
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500 mb-1">Tipe</p>
                  <p class="text-sm font-medium text-gray-900">
                    {{ voucher.voucher_type === 'percent' ? 'Persentase' : 'Nominal' }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500 mb-1">Nilai</p>
                  <p class="text-sm font-medium text-merchant-primary">
                    {{ voucher.voucher_type === 'percent' ? voucher.value + '%' : formatCurrency(voucher.value) }}
                  </p>
                </div>
              </div>

              <div class="pt-3 border-t border-gray-100">
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <i class="pi pi-shopping-cart"></i>
                    Min: {{ formatCurrency(voucher.min_purchase_amount || 0) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <i class="pi pi-chart-line"></i>
                    {{ voucher.usages_count || 0 }} / {{ voucher.usage_limit || '∞' }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <i class="pi pi-calendar"></i>
                  <span>{{ formatDate(voucher.voucher_start_date) }}</span>
                  <span>-</span>
                  <span>{{ formatDate(voucher.voucher_end_date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-ticket text-3xl text-gray-400"></i>
          </div>
          <p class="text-gray-600 font-medium mb-2">Belum ada voucher terdaftar</p>
          <p class="text-sm text-gray-500">Merchant ini belum memiliki voucher</p>
        </div>
      </div>

      <!-- Events Section -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Events</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ merchant.events?.length || 0 }} event terdaftar
            </p>
          </div>
        </div>
        
        <!-- Events Grid (when data exists) -->
        <div v-if="merchant.events && merchant.events.length > 0">
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div
              v-for="event in merchant.events"
              :key="event.id"
              class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-merchant-primary/40 hover:shadow-lg cursor-pointer"
              @click="router.push({ name: 'Admin - Event Detail', params: { id: event.id } })"
            >
              <!-- Banner 4:1 -->
              <div class="relative w-full overflow-hidden bg-gray-100 aspect-[4/1]">
                <img
                  v-if="event.banner_img_path"
                  :src="getEventBannerUrl(event)"
                  :alt="event.event_name"
                  class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  @error="(e) => (e.target.src = '/placeholder-banner.png')"
                />

                <div v-else class="flex h-full w-full items-center justify-center">
                  <i class="pi pi-calendar text-4xl text-gray-300"></i>
                </div>

                <!-- subtle overlay -->
                <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                <!-- Status badge floating -->
                <div class="absolute left-4 top-4">
                  <StatusLabel :status="event.status" variant="event" size="xs" />
                </div>
              </div>

              <!-- Content -->
              <div class="p-5">
                <div class="flex items-start justify-between gap-3">
                  <h4 class="min-w-0 text-base font-semibold text-gray-900 truncate group-hover:text-merchant-primary transition">
                    {{ event.event_name }}
                  </h4>

                  <!-- Arrow icon -->
                  <i class="pi pi-arrow-up-right text-sm text-gray-400 transition group-hover:text-merchant-primary"></i>
                </div>

                <p class="mt-2 text-sm text-gray-600 line-clamp-2">
                  {{ event.event_description || '-' }}
                </p>

                <!-- Date Row -->
                <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div class="inline-flex items-center gap-2 text-xs text-gray-500">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-merchant-primary/10 text-merchant-primary">
                      <i class="pi pi-calendar text-xs"></i>
                    </div>

                    <div class="leading-tight">
                      <p class="font-medium text-gray-700">
                        {{ new Date(event.event_start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) }}
                        -
                        {{ new Date(event.event_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}
                      </p>
                      <p class="text-[11px] text-gray-400">
                        Jadwal event
                      </p>
                    </div>
                  </div>

                  <!-- optional: small tag -->
                  <span class="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    Event
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>


        <!-- Empty State for Events -->
        <div v-else class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-calendar text-3xl text-gray-400"></i>
          </div>
          <p class="text-gray-600 font-medium mb-2">Belum ada event terdaftar</p>
          <p class="text-sm text-gray-500">
            Merchant ini belum berpartisipasi dalam event apapun
          </p>
        </div>
      </div>

      <!-- ✅ Products Section -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Products</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ merchant.products?.length || 0 }} produk terdaftar
            </p>
          </div>
        </div>

        <!-- Desktop Table -->
        <div v-if="merchant.products && merchant.products.length > 0" class="hidden sm:block">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="product in merchant.products" :key="product.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ product.name }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ product.slug }}</p>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ product.sku || '-' }}</td>
                  <td class="px-4 py-3">
                    <div v-if="product.categories && product.categories.length > 0" class="flex flex-wrap gap-1">
                      <span class="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {{ product.categories[0].name }}
                      </span>
                      <span 
                        v-if="product.categories.length > 1"
                        class="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                        :title="product.categories.slice(1).map(c => c.name).join(', ')"
                      >
                        +{{ product.categories.length - 1 }}
                      </span>
                    </div>
                    <span v-else class="text-sm text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    {{ product.price ? formatCurrency(product.price) : '-' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500 text-center">{{ product.stock ?? 0 }}</td>
                  <td class="px-4 py-3">
                    <StatusLabel :status="product.status" variant="product" size="sm" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Mobile Cards -->
        <div v-if="merchant.products && merchant.products.length > 0" class="sm:hidden space-y-4">
          <div
            v-for="product in merchant.products"
            :key="product.id"
            class="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate">{{ product.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ product.slug }}</p>
              </div>
              <StatusLabel :status="product.status" variant="product" size="sm" />
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="bg-gray-50 rounded-lg p-2">
                <p class="text-xs text-gray-500">SKU</p>
                <p class="text-sm font-medium text-gray-900">{{ product.sku || '-' }}</p>
              </div>
              <div class="bg-gray-50 rounded-lg p-2">
                <p class="text-xs text-gray-500">Stok</p>
                <p class="text-sm font-medium text-gray-900">{{ product.stock ?? 0 }}</p>
              </div>
            </div>

            <div class="mb-3">
              <p class="text-xs text-gray-500 mb-1">Harga</p>
              <p class="text-base font-bold text-merchant-primary">
                {{ product.price ? formatCurrency(product.price) : '-' }}
              </p>
            </div>

            <div v-if="product.categories && product.categories.length > 0" class="pt-3 border-t">
              <p class="text-xs text-gray-500 mb-2">Kategori</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="category in product.categories"
                  :key="category.id"
                  class="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {{ category.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-box text-3xl text-gray-400"></i>
          </div>
          <p class="text-gray-600 font-medium mb-2">Belum ada produk terdaftar</p>
          <p class="text-sm text-gray-500">Merchant ini belum menambahkan produk</p>
        </div>
      </div>

      <!-- Timeline
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4">Timeline</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Merchant Registered</p>
            <p class="font-medium">{{ new Date(merchant.created_at).toLocaleString("id-ID") }}</p>
          </div>
          <div v-if="merchant.response_at">
            <p class="text-sm text-gray-500">Reviewed</p>
            <p class="font-medium">{{ new Date(merchant.response_at).toLocaleString("id-ID") }}</p>
          </div>
        </div>
      </div> -->
    </div>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Detail Merchant"
      subtitle="Unduh laporan detail merchant dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">Laporan akan mencakup:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Profil lengkap merchant (Nama, Owner, Segmentasi)</li>
                <li>Statistik (Products, Vouchers, Events)</li>
                <li>Daftar products yang dimiliki</li>
                <li>Alamat merchant</li>
                <li>Informasi timestamp dan status</li>
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

  <!-- Loading -->
  <div v-else class="flex items-center justify-center py-12">
    <div class="text-center">
      <i class="pi pi-spin pi-spinner text-4xl text-merchant-primary mb-4"></i>
      <p class="text-gray-600">Memuat data merchant...</p>
    </div>
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