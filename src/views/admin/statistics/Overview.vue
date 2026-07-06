<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";

const router = useRouter();
const toast = useToast();

const props = defineProps({
  initialStats: {
    type: Object,
    default: null,
  },
});

// State
const selectedPeriod = ref("last_30_days");
const stats = ref(props.initialStats);
const loading = ref(false);

// Format helpers
const formatNumber = (num) => {
  return new Intl.NumberFormat("id-ID").format(num || 0);
};

const calculateGrowth = (current, previous) => {
  if (previous === null || previous === undefined || previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

const getGrowthColorClass = (growth) => {
  const growthNum = parseFloat(growth);
  if (growthNum > 0) return "bg-green-100 text-green-700";
  if (growthNum < 0) return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

// Computed data
const overviewCards = computed(() => [
  {
    id: "users",
    icon: "pi-users",
    label: "Pengguna Aktif",
    current: stats.value?.overview?.users?.current || 0,
    previous: stats.value?.overview?.users?.previous,
    route: { name: "Admin - Users" },
  },
  {
    id: "transactions",
    icon: "pi-shopping-cart",
    label: "Transaksi",
    current: stats.value?.overview?.transactions?.current || 0,
    previous: stats.value?.overview?.transactions?.previous,
    route: null,
  },
  {
    id: "products",
    icon: "pi-box",
    label: "Produk",
    current: stats.value?.overview?.products?.current || 0,
    previous: stats.value?.overview?.products?.previous,
    route: { name: "Admin - Products" },
  },
  {
    id: "pending_reports",
    icon: "pi-exclamation-triangle",
    label: "Laporan",
    current: stats.value?.overview?.pending_reports?.current || 0,
    previous: stats.value?.overview?.pending_reports?.previous,
    route: { name: "Admin - Reports" },
  },
]);

// Methods
const loadOverviewStats = async () => {
  loading.value = true;
  try {
    const response = await api.get("/api/admin/dashboard/statistics", {
      params: { period: selectedPeriod.value },
    });

    if (!response || !response.data) {
      throw new Error("Empty response from server");
    }

    stats.value = response.data?.data ?? response.data;
  } catch (error) {
    console.error("[Overview] Failed to load statistics:", error);

    if (error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("adminToken");
      router.push({ name: "Admin - Login" });
      return;
    }

    toast.error("Gagal memuat statistik overview");
  } finally {
    loading.value = false;
  }
};

const handleCardClick = (route) => {
  if (route) {
    router.push(route);
  }
};

// Watch for period changes
watch(selectedPeriod, () => {
  loadOverviewStats();
});

// Watch for prop changes (initial load from parent)
watch(
  () => props.initialStats,
  (newStats) => {
    if (newStats && !stats.value) {
      stats.value = newStats;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <!-- Header with Filter -->
    <div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <select
            v-model="selectedPeriod"
            class="px-3 py-2 sm:px-4 border border-gray-300 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 focus:ring-2 focus:ring-merchant-primary focus:border-transparent transition w-full sm:w-auto"
        >
        <option value="last_30_days">30 Hari Terakhir</option>
        <option value="all_time">Semua Waktu</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 md:gap-6">
      <div
        v-for="i in 4"
        :key="i"
        class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 md:p-6 animate-pulse"
      >
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg sm:rounded-xl mb-3"></div>
        <div class="mt-3 sm:mt-5 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- Cards Grid -->
    <div v-else class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 md:gap-6">
      <div
        v-for="card in overviewCards"
        :key="card.id"
        @click="handleCardClick(card.route)"
        class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 md:p-6 hover:shadow-lg hover:border-merchant-primary/20 cursor-pointer transition-all duration-300 group"
      >
        <div
          class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-merchant-primary/10 rounded-lg sm:rounded-xl mb-3 sm:mb-0 transition-colors"
        >
          <i
            :class="[
              'pi',
              card.icon,
              'text-xl sm:text-2xl text-gray-800 group-hover:text-merchant-primary transition-colors',
            ]"
          ></i>
        </div>
        <div class="mt-3 sm:mt-5">
          <span class="text-xs sm:text-sm text-gray-500 block">{{ card.label }}</span>
          <h4 class="mt-1 sm:mt-2 font-bold text-gray-800 text-lg sm:text-2xl">
            {{ formatNumber(card.current) }}
          </h4>
          <span
            v-if="selectedPeriod === 'last_30_days' && card.previous !== null"
            :class="[
              'inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 sm:pl-2 sm:pr-2.5 text-xs sm:text-sm font-medium mt-2',
              getGrowthColorClass(calculateGrowth(card.current, card.previous)),
            ]"
          >
            <svg
              v-if="parseFloat(calculateGrowth(card.current, card.previous)) >= 0"
              class="fill-current"
              width="10"
              height="10"
              viewBox="0 0 12 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M5.56462 1.62393C5.70193 1.47072 5.90135 1.37432 6.12329 1.37432C6.1236 1.37432 6.12391 1.37432 6.12422 1.37432C6.31631 1.37415 6.50845 1.44731 6.65505 1.59381L9.65514 4.5918C9.94814 4.88459 9.94831 5.35947 9.65552 5.65246C9.36273 5.94546 8.88785 5.94562 8.59486 5.65283L6.87329 3.93247L6.87329 10.125C6.87329 10.5392 6.53751 10.875 6.12329 10.875C5.70908 10.875 5.37329 10.5392 5.37329 10.125L5.37329 3.93578L3.65516 5.65282C3.36218 5.94562 2.8873 5.94547 2.5945 5.65248C2.3017 5.35949 2.30185 4.88462 2.59484 4.59182L5.56462 1.62393Z"
              />
            </svg>
            <svg
              v-else
              class="fill-current"
              width="10"
              height="10"
              viewBox="0 0 12 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M5.31462 10.3761C5.45194 10.5293 5.65136 10.6257 5.87329 10.6257C5.8736 10.6257 5.8739 10.6257 5.87421 10.6257C6.0663 10.6259 6.25845 10.5527 6.40505 10.4062L9.40514 7.4082C9.69814 7.11541 9.69831 6.64054 9.40552 6.34754C9.11273 6.05454 8.63785 6.05438 8.34486 6.34717L6.62329 8.06753L6.62329 1.875C6.62329 1.46079 6.28751 1.125 5.87329 1.125C5.45908 1.125 5.12329 1.46079 5.12329 1.875L5.12329 8.06422L3.40516 6.34719C3.11218 6.05439 2.6373 6.05454 2.3445 6.34752C2.0517 6.64051 2.05185 7.11538 2.34484 7.40818L5.31462 10.3761Z"
              />
            </svg>
            {{ Math.abs(calculateGrowth(card.current, card.previous)) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>