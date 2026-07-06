<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { Line, Bar, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

import { useEventAnalytics } from "@/composables/useEventAnalytics";

const props = defineProps({ eventId: { type: [Number, String], required: true } });
const { analytics, loading, error, fetchEventAnalytics } = useEventAnalytics();

onMounted(() => fetchEventAnalytics(props.eventId));
watch(() => props.eventId, (id) => fetchEventAnalytics(id));

const formatCurrency = (val) => {
  if (!val && val !== 0) return "Rp 0";
  return "Rp " + Number(val).toLocaleString("id-ID");
};
const formatNum = (val) => Number(val || 0).toLocaleString("id-ID");

// ── CHART: Daily Trend ──────────────────────────────────────────────────────
const dailyTrendChart = computed(() => {
  const days = analytics.value?.daily_trend || [];
  return {
    labels: days.map(d => new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })),
    datasets: [
      {
        label: "Transaksi",
        data: days.map(d => d.transactions),
        borderColor: "#7C3AED",
        backgroundColor: "rgba(124,58,237,0.08)",
        tension: 0.4,
        fill: true,
        yAxisID: "y",
      },
      {
        label: "Pendapatan (Rp)",
        data: days.map(d => d.revenue),
        borderColor: "#10B981",
        backgroundColor: "rgba(16,185,129,0.08)",
        tension: 0.4,
        fill: true,
        yAxisID: "y1",
      },
    ],
  };
});

const dailyTrendOptions = {
  responsive: true,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { position: "top" }, title: { display: false } },
  scales: {
    y:  { type: "linear", display: true, position: "left",  grid: { color: "#f3f4f6" }, ticks: { color: "#6b7280" } },
    y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#6b7280", callback: v => "Rp " + (v / 1000).toFixed(0) + "K" } },
  },
};

// ── CHART: Top Merchants Revenue ─────────────────────────────────────────────
const topMerchantsChart = computed(() => {
  const list = analytics.value?.top_merchants_revenue || [];
  const colors = ["#7C3AED","#6D28D9","#5B21B6","#4C1D95","#3730A3"];
  return {
    labels: list.map(m => m.name),
    datasets: [{ label: "Pendapatan (Rp)", data: list.map(m => m.total_revenue), backgroundColor: colors, borderRadius: 8 }],
  };
});

const barOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#6b7280" } },
    y: { grid: { color: "#f3f4f6" }, ticks: { color: "#6b7280", callback: v => "Rp " + (v / 1000).toFixed(0) + "K" } },
  },
};

// ── CHART: Top Categories ─────────────────────────────────────────────────
const categoriesChart = computed(() => {
  const list = analytics.value?.top_categories || [];
  const palette = ["#7C3AED","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4"];
  return {
    labels: list.map(c => c.category_name),
    datasets: [{ data: list.map(c => c.total_qty), backgroundColor: palette.slice(0, list.length), borderWidth: 2, borderColor: "#fff" }],
  };
});

const doughnutOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom", labels: { padding: 16, font: { size: 12 } } } },
  cutout: "68%",
};

// ── CHART: Rating Distribution ───────────────────────────────────────────────
const ratingChart = computed(() => {
  const dist = analytics.value?.rating?.distribution || {};
  return {
    labels: ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"],
    datasets: [{ data: [dist[1]||0, dist[2]||0, dist[3]||0, dist[4]||0, dist[5]||0],
      backgroundColor: ["#EF4444","#F97316","#F59E0B","#84CC16","#10B981"],
      borderWidth: 2, borderColor: "#fff" }],
  };
});

// summary cards config
const summaryCards = computed(() => {
  const s = analytics.value?.summary;
  if (!s) return [];
  return [
    { icon: "pi-shopping-cart", color: "bg-violet-100 text-violet-700", label: "Total Transaksi",      value: formatNum(s.total_transactions) },
    { icon: "pi-check-circle",  color: "bg-green-100 text-green-700",   label: "Transaksi Selesai",    value: formatNum(s.completed_orders) },
    { icon: "pi-wallet",        color: "bg-emerald-100 text-emerald-700", label: "Total Pendapatan",   value: formatCurrency(s.total_revenue) },
    { icon: "pi-tag",           color: "bg-orange-100 text-orange-700",  label: "Total Diskon",        value: formatCurrency(s.total_discount) },
    { icon: "pi-users",         color: "bg-blue-100 text-blue-700",      label: "Pembeli Unik",        value: formatNum(s.unique_buyers) },
    { icon: "pi-shop",          color: "bg-fuchsia-100 text-fuchsia-700", label: "UMKM Aktif",         value: formatNum(s.active_merchants) },
    { icon: "pi-ticket",        color: "bg-cyan-100 text-cyan-700",      label: "Voucher Digunakan",   value: formatNum(s.voucher_usage_count) },
    { icon: "pi-percentage",    color: "bg-rose-100 text-rose-700",      label: "Tingkat Pakai Voucher", value: s.voucher_usage_rate + "%" },
  ];
});
</script>

<template>
  <div class="space-y-8 pb-10">

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-12 h-12 border-4 border-merchant-primary/30 border-t-merchant-primary rounded-full animate-spin"></div>
      <p class="text-sm text-gray-500 font-medium">Memuat analisis event...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <i class="pi pi-exclamation-circle text-4xl text-red-400 mb-3"></i>
      <p class="text-red-700 font-bold">{{ error }}</p>
    </div>

    <!-- No data (no transactions) -->
    <div v-else-if="analytics && analytics.summary.total_transactions === 0" class="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-16 text-center">
      <i class="pi pi-chart-bar text-5xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-bold text-gray-700 mb-2">Belum Ada Data Transaksi</h3>
      <p class="text-sm text-gray-500">Analisis akan tersedia setelah event memiliki transaksi.</p>
    </div>

    <template v-else-if="analytics">

      <!-- ── 1. SUMMARY CARDS ─────────────────────────────────────────── -->
      <div>
        <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="pi pi-chart-pie text-merchant-primary"></i> Ringkasan Umum
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="card in summaryCards" :key="card.label"
               class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.color]">
              <i :class="['pi text-lg', card.icon]"></i>
            </div>
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{{ card.label }}</p>
            <p class="text-xl font-black text-gray-900 truncate">{{ card.value }}</p>
          </div>
        </div>
        <!-- Avg stats row -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div class="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white">
            <p class="text-xs font-bold opacity-70 uppercase mb-1">Rata-rata Nilai Transaksi</p>
            <p class="text-2xl font-black">{{ formatCurrency(analytics.summary.avg_transaction) }}</p>
          </div>
          <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <p class="text-xs font-bold opacity-70 uppercase mb-1">Rata-rata Spend / Pembeli</p>
            <p class="text-2xl font-black">{{ formatCurrency(analytics.buyer_behavior.avg_spend_per_buyer) }}</p>
          </div>
          <div class="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white">
            <p class="text-xs font-bold opacity-70 uppercase mb-1">Tingkat Pembelian Ulang</p>
            <p class="text-2xl font-black">{{ analytics.buyer_behavior.repeat_buyer_rate }}%</p>
            <p class="text-xs opacity-70">{{ formatNum(analytics.buyer_behavior.repeat_buyers) }} dari {{ formatNum(analytics.buyer_behavior.unique_buyers) }} pembeli</p>
          </div>
        </div>
      </div>

      <!-- ── 2. DAILY TREND CHART ────────────────────────────────────── -->
      <div v-if="analytics.daily_trend.length > 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <i class="pi pi-chart-line text-merchant-primary"></i> Tren Transaksi Harian
        </h2>
        <Line :data="dailyTrendChart" :options="dailyTrendOptions" class="max-h-72" />
      </div>

      <!-- ── 3. TOP MERCHANTS + VOUCHER ─────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Top Merchants Revenue Chart -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-shop text-merchant-primary"></i> UMKM Pendapatan Terbanyak
          </h2>
          <Bar v-if="analytics.top_merchants_revenue.length" :data="topMerchantsChart" :options="barOptions" class="max-h-64" />
          <p v-else class="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        </div>

        <!-- Top Merchants Transactions Table -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-list text-merchant-primary"></i> Ranking UMKM
          </h2>
          <div class="space-y-3">
            <div v-for="(m, i) in analytics.top_merchants_revenue" :key="m.merchant_id"
                 class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors">
              <span class="w-7 h-7 rounded-full bg-merchant-primary/10 text-merchant-primary text-xs font-black flex items-center justify-center shrink-0">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
                <p class="text-[10px] text-gray-400">{{ m.segmentation }} • {{ formatNum(m.total_orders) }} transaksi</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-black text-emerald-600">{{ formatCurrency(m.total_revenue) }}</p>
                <p class="text-[10px] text-gray-400">{{ formatNum(m.unique_buyers) }} pembeli</p>
              </div>
            </div>
            <p v-if="!analytics.top_merchants_revenue.length" class="text-sm text-gray-400 text-center py-4">Belum ada data</p>
          </div>
          <!-- Inactive merchants badge -->
          <div v-if="analytics.inactive_merchants.length" class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <p class="text-xs font-bold text-orange-700">
              <i class="pi pi-exclamation-triangle mr-1"></i>
              {{ analytics.inactive_merchants.length }} UMKM belum ada transaksi:
              {{ analytics.inactive_merchants.map(m => m.name).join(", ") }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── 4. PRODUCTS + CATEGORIES ───────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Top Products -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-box text-merchant-primary"></i> Produk Terlaris
          </h2>
          <div class="space-y-2">
            <div v-for="(p, i) in analytics.top_products" :key="p.product_id"
                 class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <span class="w-6 h-6 rounded-full bg-merchant-primary/10 text-merchant-primary text-[10px] font-black flex items-center justify-center shrink-0">{{ i+1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ p.product_name }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ p.merchant_name }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold text-gray-900">{{ formatNum(p.total_qty) }} unit</p>
                <p class="text-[10px] text-emerald-600 font-bold">{{ formatCurrency(p.total_revenue) }}</p>
              </div>
            </div>
            <p v-if="!analytics.top_products.length" class="text-sm text-gray-400 text-center py-4">Belum ada data</p>
          </div>
        </div>

        <!-- Category Doughnut -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-tag text-merchant-primary"></i> Kategori Terlaris
          </h2>
          <div v-if="analytics.top_categories.length" class="flex flex-col items-center">
            <Doughnut :data="categoriesChart" :options="doughnutOptions" class="max-h-56 max-w-56" />
          </div>
          <p v-else class="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        </div>
      </div>

      <!-- ── 5. VOUCHER STATS ────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="pi pi-ticket text-merchant-primary"></i> Analisis Voucher
        </h2>
        <div v-if="analytics.voucher_stats.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">Kode</th>
                <th class="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">Tipe</th>
                <th class="text-right py-2 px-3 text-xs font-bold text-gray-400 uppercase">Nilai</th>
                <th class="text-right py-2 px-3 text-xs font-bold text-gray-400 uppercase">Dipakai</th>
                <th class="text-right py-2 px-3 text-xs font-bold text-gray-400 uppercase">Total Diskon</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in analytics.voucher_stats" :key="v.voucher_id"
                  class="border-b border-gray-50 hover:bg-gray-50">
                <td class="py-2.5 px-3 font-bold text-gray-900">{{ v.voucher_code }}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="v.voucher_type === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
                    {{ v.voucher_type === 'percent' ? 'Persentase' : 'Nominal' }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-right font-bold text-gray-700">{{ v.voucher_type === 'percent' ? v.value + '%' : formatCurrency(v.value) }}</td>
                <td class="py-2.5 px-3 text-right">
                  <span class="font-black text-gray-900">{{ formatNum(v.usage_count) }}</span>
                  <span class="text-gray-400 text-xs"> kali</span>
                </td>
                <td class="py-2.5 px-3 text-right font-bold text-emerald-600">{{ formatCurrency(v.total_discount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm text-gray-400 text-center py-6">Belum ada voucher yang digunakan</p>
      </div>

      <!-- ── 6. RATING + PAYMENT ─────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Rating -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-star text-merchant-primary"></i> Kepuasan Pelanggan
          </h2>
          <div v-if="analytics.rating.total_reviews > 0">
            <div class="flex items-center gap-6 mb-6">
              <div class="text-center">
                <p class="text-5xl font-black text-gray-900">{{ analytics.rating.avg_rating }}</p>
                <div class="flex gap-0.5 justify-center mt-1">
                  <i v-for="s in 5" :key="s" class="pi pi-star-fill text-sm" :class="s <= Math.round(analytics.rating.avg_rating) ? 'text-amber-400' : 'text-gray-200'"></i>
                </div>
                <p class="text-xs text-gray-400 mt-1">{{ formatNum(analytics.rating.total_reviews) }} ulasan</p>
              </div>
              <div class="flex-1 space-y-1.5">
                <div v-for="s in [5,4,3,2,1]" :key="s" class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 w-4">{{ s }}★</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div class="h-full rounded-full bg-amber-400 transition-all"
                         :style="{ width: analytics.rating.total_reviews > 0 ? ((analytics.rating.distribution[s] / analytics.rating.total_reviews) * 100) + '%' : '0%' }">
                    </div>
                  </div>
                  <span class="text-xs text-gray-400 w-4">{{ analytics.rating.distribution[s] }}</span>
                </div>
              </div>
            </div>
            <!-- Per merchant ratings -->
            <div class="space-y-2">
              <div v-for="m in analytics.rating.per_merchant" :key="m.merchant_id"
                   class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
                  <p class="text-[10px] text-gray-400">{{ m.review_count }} ulasan</p>
                </div>
                <div class="flex items-center gap-1">
                  <i class="pi pi-star-fill text-amber-400 text-xs"></i>
                  <span class="text-sm font-black text-gray-900">{{ m.avg_rating }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <i class="pi pi-star text-4xl text-gray-200 mb-2"></i>
            <p class="text-sm text-gray-400">Belum ada ulasan</p>
          </div>
        </div>

        <!-- Payment Methods + Segmentation -->
        <div class="space-y-6">
          <!-- Payment -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 class="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i class="pi pi-credit-card text-merchant-primary"></i> Metode Pembayaran
            </h2>
            <div class="space-y-2">
              <div v-for="p in analytics.payment_methods" :key="p.payment_method" class="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <span class="text-sm font-bold text-gray-700 capitalize">{{ p.payment_method || 'N/A' }}</span>
                <span class="text-sm font-black text-merchant-primary">{{ formatNum(p.count) }}x</span>
              </div>
            </div>
          </div>
          <!-- Segmentation -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 class="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i class="pi pi-sitemap text-merchant-primary"></i> Distribusi Segmentasi UMKM
            </h2>
            <div class="space-y-2">
              <div v-for="seg in analytics.segmentation_distribution" :key="seg.segmentation"
                   class="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <span class="text-sm font-bold text-gray-700">{{ seg.segmentation }}</span>
                <span class="px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary text-xs font-black rounded-full">{{ seg.count }} UMKM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
