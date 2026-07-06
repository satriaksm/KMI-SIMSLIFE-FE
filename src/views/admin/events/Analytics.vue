<script setup>
import { ref, computed, onMounted, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";
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

// Premium Colors Array
const premiumColors = ["#194a7a", "#44a4b4", "#f4c46c", "#fcf4c4", "#ff5e5e", "#147a6d", "#7c3aed", "#10b981", "#f59e0b", "#ec4899"];

// Pagination states
const topMerchantsChartCount = ref(5);
const topMerchantsCount = ref(5);
const topProductsCount = ref(5);
const topCategoriesCount = ref(5);

// --- DATA PROCESSING & CHART OPTIONS ---

// 1. Daily Trend Area Chart
const processedTrend = computed(() => {
    const days = analytics.value?.daily_trend || [];
    if (days.length <= 30) {
        return days.map(d => ({
            date: d.date,
            label: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
            transactions: d.transactions,
            revenue: d.revenue
        }));
    }
    // Group by week if > 30 days
    const weeks = [];
    for(let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i+7);
        const trans = chunk.reduce((s, a) => s + a.transactions, 0);
        const rev = chunk.reduce((s, a) => s + a.revenue, 0);
        const start = new Date(chunk[0].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        const end = new Date(chunk[chunk.length-1].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        weeks.push({
            date: chunk[0].date,
            label: `${start} - ${end}`,
            transactions: trans,
            revenue: rev
        });
    }
    return weeks;
});

const trendOptions = computed(() => {
    const data = processedTrend.value;
    if(!data.length) return {};
    
    let maxTransIdx = 0;
    let maxRevIdx = 0;
    data.forEach((d, i) => {
        if(d.transactions > data[maxTransIdx].transactions) maxTransIdx = i;
        if(d.revenue > data[maxRevIdx].revenue) maxRevIdx = i;
    });

    return {
        chart: {
            type: "area",
            height: 350,
            fontFamily: "Inter, sans-serif",
            toolbar: { show: false },
            animations: { enabled: true, easing: 'easeinout', speed: 800 }
        },
        stroke: { curve: "smooth", width: [3, 3] },
        fill: {
            type: "gradient",
            gradient: { enabled: true, opacityFrom: 0.55, opacityTo: 0 },
        },
        colors: ["#44a4b4", "#194a7a"],
        dataLabels: { enabled: false },
        xaxis: {
            categories: data.map(d => d.label),
            labels: { style: { colors: "#64748b", fontSize: "12px" } }
        },
        yaxis: [
            {
                title: { text: "Pesanan", style: { color: "#44a4b4", fontWeight: 600 } },
                labels: { formatter: v => Math.round(v), style: { colors: "#64748b" } }
            },
            {
                opposite: true,
                title: { text: "Pendapatan (Rp)", style: { color: "#194a7a", fontWeight: 600 } },
                labels: { formatter: v => formatCurrency(v), style: { colors: "#64748b" } }
            }
        ],
        annotations: {
            points: [
                {
                    x: data[maxTransIdx].label,
                    y: data[maxTransIdx].transactions,
                    marker: { size: 6, fillColor: "#fff", strokeColor: "#44a4b4", strokeWidth: 2 },
                    label: {
                        text: "Pesanan Terbanyak",
                        style: { background: "#44a4b4", color: "#fff", padding: { left: 5, right: 5, top: 2, bottom: 2 } }
                    }
                },
                {
                    x: data[maxRevIdx].label,
                    y: data[maxRevIdx].revenue,
                    yAxisIndex: 1,
                    marker: { size: 6, fillColor: "#fff", strokeColor: "#194a7a", strokeWidth: 2 },
                    label: {
                        text: "Pendapatan Terbanyak",
                        style: { background: "#194a7a", color: "#fff", padding: { left: 5, right: 5, top: 2, bottom: 2 } }
                    }
                }
            ]
        },
        legend: { position: "top", horizontalAlign: "right", fontWeight: 500 },
        grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } }
    };
});

const trendSeries = computed(() => {
    return [
        { name: "Pesanan", type: "area", data: processedTrend.value.map(d => d.transactions) },
        { name: "Pendapatan (Rp)", type: "area", data: processedTrend.value.map(d => d.revenue) }
    ];
});


// 2. Bar Chart Top Merchants
const processedBarMerchants = computed(() => {
    const list = analytics.value?.top_merchants_revenue || [];
    return list.slice(0, topMerchantsChartCount.value).map(m => {
        let name = m.name;
        if(name.length > 7) name = name.substring(0, 7) + "...";
        return { name, revenue: m.total_revenue };
    });
});

const barOptions = computed(() => {
    return {
        chart: { type: 'bar', height: 350, fontFamily: "Inter, sans-serif", toolbar: {show: false} },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
        colors: premiumColors,
        dataLabels: { enabled: false },
        xaxis: {
            categories: processedBarMerchants.value.map(m => m.name),
            labels: { formatter: v => "Rp " + (v / 1000).toFixed(0) + "K", style: { colors: "#64748b" } }
        },
        yaxis: {
            labels: { style: { fontWeight: 600, colors: "#1e293b" } }
        },
        legend: { show: false },
        tooltip: {
            y: { formatter: v => formatCurrency(v) }
        },
        grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } }
    }
});

const barSeries = computed(() => {
    return [{
        name: "Pendapatan",
        data: processedBarMerchants.value.map(m => m.revenue)
    }];
});


// 3. Doughnut Top Categories
const processedCategories = computed(() => {
    const list = analytics.value?.top_categories || [];
    return list.slice(0, topCategoriesCount.value);
});

const doughnutOptions = computed(() => {
    return {
        chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
        labels: processedCategories.value.map(c => c.category_name),
        colors: premiumColors,
        plotOptions: { pie: { donut: { size: '65%' } } },
        dataLabels: { enabled: false },
        legend: { position: "bottom", fontWeight: 500 },
        stroke: { width: 2, colors: ['#fff'] }
    }
});

const doughnutSeries = computed(() => {
    return processedCategories.value.map(c => c.total_qty);
});


// Summary cards
const summaryCards = computed(() => {
  const s = analytics.value?.summary;
  if (!s) return [];
  return [
    { icon: "pi-shopping-cart", color: "bg-blue-50 text-blue-700 border-blue-100", label: "Total Transaksi",      value: formatNum(s.total_transactions) },
    { icon: "pi-check-circle",  color: "bg-teal-50 text-teal-700 border-teal-100",   label: "Transaksi Selesai",    value: formatNum(s.completed_orders) },
    { icon: "pi-wallet",        color: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Total Pendapatan",   value: formatCurrency(s.total_revenue) },
    { icon: "pi-tag",           color: "bg-orange-50 text-orange-700 border-orange-100",  label: "Total Diskon",        value: formatCurrency(s.total_discount) },
    { icon: "pi-users",         color: "bg-indigo-50 text-indigo-700 border-indigo-100",      label: "Total Pembeli",        value: formatNum(s.unique_buyers) },
    { icon: "pi-shop",          color: "bg-cyan-50 text-cyan-700 border-cyan-100", label: "UMKM Aktif",         value: formatNum(s.active_merchants) },
    { icon: "pi-ticket",        color: "bg-rose-50 text-rose-700 border-rose-100",      label: "Voucher Digunakan",   value: formatNum(s.voucher_usage_count) },
    { icon: "pi-percentage",    color: "bg-amber-50 text-amber-700 border-amber-100",      label: "Tingkat Pakai Voucher", value: s.voucher_usage_rate + "%" },
  ];
});

// Rank Helpers
const getRankClass = (idx) => {
    if(idx === 0) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200';
    if(idx === 1) return 'bg-gradient-to-r from-gray-50 to-slate-100 border-gray-300';
    if(idx === 2) return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300';
    return 'bg-white border-gray-100 hover:bg-gray-50';
}
const getRankBadgeClass = (idx) => {
    if(idx === 0) return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-2 border-amber-200 shadow-sm';
    if(idx === 1) return 'bg-gradient-to-br from-gray-400 to-slate-500 text-white border-2 border-gray-200 shadow-sm';
    if(idx === 2) return 'bg-gradient-to-br from-orange-400 to-amber-600 text-white border-2 border-orange-200 shadow-sm';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
}

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
          <i class="pi pi-chart-pie text-[#194a7a]"></i> Ringkasan Umum
        </h2>
        
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="card in summaryCards" :key="card.label"
               class="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all outline-none focus:outline-none">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center mb-3 border outline-none', card.color]">
              <i :class="['pi text-lg', card.icon]"></i>
            </div>
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{{ card.label }}</p>
            <p class="text-xl font-black text-gray-900 truncate">{{ card.value }}</p>
          </div>
        </div>
        
        <!-- Avg stats row (Clean Premium UI) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:border-[#194a7a]/20 transition-all">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                    <i class="pi pi-money-bill text-violet-600 text-lg"></i>
                </div>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata Nilai Transaksi</p>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ formatCurrency(analytics.summary.avg_transaction) }}</p>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:border-[#44a4b4]/20 transition-all">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-[#44a4b4]/10 flex items-center justify-center group-hover:bg-[#44a4b4]/20 transition-colors">
                    <i class="pi pi-credit-card text-[#44a4b4] text-lg"></i>
                </div>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-rata Spend / Pembeli</p>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ formatCurrency(analytics.buyer_behavior.avg_spend_per_buyer) }}</p>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:border-orange-200 transition-all">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <i class="pi pi-refresh text-orange-600 text-lg"></i>
                </div>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Tingkat Pembelian Ulang</p>
            </div>
            <div>
                <p class="text-2xl font-black text-gray-900">{{ analytics.buyer_behavior.repeat_buyer_rate }}%</p>
                <p class="text-xs text-gray-500 mt-1 font-medium">{{ formatNum(analytics.buyer_behavior.repeat_buyers) }} dari {{ formatNum(analytics.buyer_behavior.unique_buyers) }} pembeli</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 2. DAILY TREND CHART ────────────────────────────────────── -->
      <div v-if="analytics.daily_trend.length > 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <i class="pi pi-chart-line text-[#194a7a]"></i> Tren Transaksi Harian
        </h2>
        <VueApexCharts type="area" height="350" :options="trendOptions" :series="trendSeries" />
      </div>

      <!-- ── 3. TOP MERCHANTS + RANKING ─────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Top Merchants Revenue Chart -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <i class="pi pi-chart-bar text-[#194a7a]"></i> Pendapatan UMKM
              </h2>
          </div>
          <div v-if="analytics.top_merchants_revenue.length" class="flex-1">
              <VueApexCharts type="bar" height="300" :options="barOptions" :series="barSeries" />
              <button v-if="topMerchantsChartCount < analytics.top_merchants_revenue.length" 
                  @click="topMerchantsChartCount += 5" 
                  class="w-full mt-2 py-2 text-xs font-bold text-[#194a7a] bg-[#194a7a]/5 hover:bg-[#194a7a]/10 rounded-lg transition-colors">
                  Tampilkan Lebih Banyak
              </button>
          </div>
          <p v-else class="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        </div>

        <!-- Top Merchants Transactions Table -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-list text-[#194a7a]"></i> Ranking UMKM
          </h2>
          
          <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            <div v-for="(m, i) in analytics.top_merchants_revenue.slice(0, topMerchantsCount)" :key="m.merchant_id"
                 :class="['flex items-center gap-4 p-3 rounded-xl border transition-colors', getRankClass(i)]">
              <span :class="['w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 shadow-sm', getRankBadgeClass(i)]">
                  {{ i + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
                <p class="text-[10px] text-gray-500 font-medium">{{ m.segmentation }} • {{ formatNum(m.total_orders) }} transaksi</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-black text-emerald-600">{{ formatCurrency(m.total_revenue) }}</p>
                <p class="text-[10px] text-gray-500 font-medium">{{ formatNum(m.unique_buyers) }} pembeli</p>
              </div>
            </div>
            <p v-if="!analytics.top_merchants_revenue.length" class="text-sm text-gray-400 text-center py-4">Belum ada data</p>
          </div>
          
          <button v-if="topMerchantsCount < analytics.top_merchants_revenue.length" 
              @click="topMerchantsCount += 5" 
              class="w-full mt-4 py-2 text-xs font-bold text-[#194a7a] bg-[#194a7a]/5 hover:bg-[#194a7a]/10 rounded-lg transition-colors">
              Tampilkan Lebih Banyak
          </button>

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
            <i class="pi pi-box text-[#194a7a]"></i> Produk Terlaris
          </h2>
          <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            <div v-for="(p, i) in analytics.top_products.slice(0, topProductsCount)" :key="p.product_id"
                 :class="['flex items-center gap-4 p-3 rounded-xl border transition-colors', getRankClass(i)]">
              <span :class="['w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 shadow-sm', getRankBadgeClass(i)]">
                  {{ i + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ p.product_name }}</p>
                <p class="text-[10px] text-gray-500 truncate font-medium">{{ p.merchant_name }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold text-gray-900">{{ formatNum(p.total_qty) }} unit</p>
                <p class="text-[10px] text-emerald-600 font-black">{{ formatCurrency(p.total_revenue) }}</p>
              </div>
            </div>
            <p v-if="!analytics.top_products.length" class="text-sm text-gray-400 text-center py-4">Belum ada data</p>
          </div>
          
          <button v-if="topProductsCount < analytics.top_products.length" 
              @click="topProductsCount += 5" 
              class="w-full mt-4 py-2 text-xs font-bold text-[#194a7a] bg-[#194a7a]/5 hover:bg-[#194a7a]/10 rounded-lg transition-colors">
              Tampilkan Lebih Banyak
          </button>
        </div>

        <!-- Category Doughnut -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="pi pi-tag text-[#194a7a]"></i> Kategori Terlaris
          </h2>
          <div v-if="analytics.top_categories.length" class="flex-1 flex flex-col items-center justify-center">
            <VueApexCharts type="donut" height="300" :options="doughnutOptions" :series="doughnutSeries" class="w-full max-w-[300px]" />
            <button v-if="topCategoriesCount < analytics.top_categories.length" 
                @click="topCategoriesCount += 5" 
                class="w-full mt-4 py-2 text-xs font-bold text-[#194a7a] bg-[#194a7a]/5 hover:bg-[#194a7a]/10 rounded-lg transition-colors">
                Tampilkan Lebih Banyak
            </button>
          </div>
          <p v-else class="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        </div>
      </div>

      <!-- ── 5. VOUCHER STATS ────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 class="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="pi pi-ticket text-[#194a7a]"></i> Analisis Voucher
        </h2>
        <div v-if="analytics.voucher_stats.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">Kode</th>
                <th class="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">Tipe</th>
                <th class="text-right py-3 px-3 text-xs font-bold text-gray-400 uppercase">Nilai</th>
                <th class="text-right py-3 px-3 text-xs font-bold text-gray-400 uppercase">Dipakai</th>
                <th class="text-right py-3 px-3 text-xs font-bold text-gray-400 uppercase">Total Diskon</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in analytics.voucher_stats" :key="v.voucher_id"
                  class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-3 font-black text-gray-900">{{ v.voucher_code }}</td>
                <td class="py-3 px-3">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold" :class="v.voucher_type === 'percent' ? 'bg-[#44a4b4]/10 text-[#44a4b4]' : 'bg-[#194a7a]/10 text-[#194a7a]'">
                    {{ v.voucher_type === 'percent' ? 'Persentase' : 'Nominal' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right font-bold text-gray-700">{{ v.voucher_type === 'percent' ? v.value + '%' : formatCurrency(v.value) }}</td>
                <td class="py-3 px-3 text-right">
                  <span class="font-black text-gray-900">{{ formatNum(v.usage_count) }}</span>
                  <span class="text-gray-400 text-xs"> kali</span>
                </td>
                <td class="py-3 px-3 text-right font-black text-emerald-600">{{ formatCurrency(v.total_discount) }}</td>
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
            <i class="pi pi-star text-[#194a7a]"></i> Kepuasan Pelanggan
          </h2>
          <div v-if="analytics.rating.total_reviews > 0">
            <div class="flex items-center gap-6 mb-6">
              <div class="text-center">
                <p class="text-5xl font-black text-gray-900">{{ analytics.rating.avg_rating }}</p>
                <div class="flex gap-0.5 justify-center mt-1">
                  <i v-for="s in 5" :key="s" class="pi pi-star-fill text-sm" :class="s <= Math.round(analytics.rating.avg_rating) ? 'text-[#f4c46c]' : 'text-gray-200'"></i>
                </div>
                <p class="text-xs text-gray-400 mt-1 font-medium">{{ formatNum(analytics.rating.total_reviews) }} ulasan</p>
              </div>
              <div class="flex-1 space-y-2">
                <div v-for="s in [5,4,3,2,1]" :key="s" class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 w-4 font-bold">{{ s }}★</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div class="h-full rounded-full bg-[#f4c46c] transition-all"
                         :style="{ width: analytics.rating.total_reviews > 0 ? ((analytics.rating.distribution[s] / analytics.rating.total_reviews) * 100) + '%' : '0%' }">
                    </div>
                  </div>
                  <span class="text-xs text-gray-400 w-4 font-medium">{{ analytics.rating.distribution[s] }}</span>
                </div>
              </div>
            </div>
            <!-- Per merchant ratings -->
            <div class="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              <div v-for="m in analytics.rating.per_merchant" :key="m.merchant_id"
                   class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
                  <p class="text-[10px] text-gray-500 font-medium">{{ m.review_count }} ulasan</p>
                </div>
                <div class="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                  <i class="pi pi-star-fill text-[#f4c46c] text-[10px]"></i>
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
              <i class="pi pi-credit-card text-[#194a7a]"></i> Metode Pembayaran
            </h2>
            <div class="space-y-2">
              <div v-for="p in analytics.payment_methods" :key="p.payment_method" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#194a7a]/20 transition-colors">
                <span class="text-sm font-bold text-gray-700 capitalize">{{ p.payment_method || 'N/A' }}</span>
                <span class="text-sm font-black text-[#194a7a] bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{{ formatNum(p.count) }}x</span>
              </div>
            </div>
          </div>
          <!-- Segmentation -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 class="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i class="pi pi-sitemap text-[#194a7a]"></i> Distribusi Segmentasi UMKM
            </h2>
            <div class="space-y-2">
              <div v-for="seg in analytics.segmentation_distribution" :key="seg.segmentation"
                   class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#44a4b4]/20 transition-colors">
                <span class="text-sm font-bold text-gray-700">{{ seg.segmentation }}</span>
                <span class="px-3 py-1 bg-[#44a4b4]/10 text-[#44a4b4] text-xs font-black rounded-lg shadow-sm">{{ seg.count }} UMKM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
