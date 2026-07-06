<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import ApexCharts from "apexcharts";

const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
});

// State
const donutChartMode = ref("merchants");
const donutChartEl = ref(null);
const donutChartInstance = ref(null);

// Config
const DONUT_DESTROY_STEPS = 10;
const DONUT_DESTROY_STEP_DURATION = 80;
const DONUT_CREATE_SPEED = 1000;

// Options
const donutModeOptions = [
  { value: "merchants", label: "Segmentasi UMKM" },
  { value: "products", label: "Kategori Produk" },
];

// Helpers
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatNumber = (num) => {
  return new Intl.NumberFormat("id-ID").format(num || 0);
};

const palette = (mode) => {
  return mode === "merchants"
    ? ["#194a7a", "#44a4b4", "#fcf4c4"]
    : ["#194a7a", "#44a4b4", "#f4c46c", "#fcf4c4", "#ff5e5e", "#147a6d"];
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

// Computed
const currentDistributionData = computed(() => {
  if (!props.stats) return [];
  return donutChartMode.value === "merchants"
    ? props.stats.merchants?.by_segmentation ?? []
    : props.stats.products?.by_category ?? [];
});

// Chart functions
const destroyDonutWithReverseAnimation = async () => {
  if (!donutChartInstance.value) return;

  try {
    const currentSeries = donutChartInstance.value.w?.config?.series || [];

    if (!Array.isArray(currentSeries) || currentSeries.length === 0) {
      await donutChartInstance.value.destroy();
      donutChartInstance.value = null;
      return;
    }

    for (let step = DONUT_DESTROY_STEPS; step >= 0; step--) {
      const progress = step / DONUT_DESTROY_STEPS;
      const shrinkingSeries = currentSeries.map((val) => Number(val) * progress);
      await donutChartInstance.value.updateSeries(shrinkingSeries, false);
      await sleep(DONUT_DESTROY_STEP_DURATION);
    }

    await donutChartInstance.value.updateSeries(currentSeries.map(() => 0), false);
    await sleep(100);

    await donutChartInstance.value.destroy();
    donutChartInstance.value = null;
  } catch (error) {
    console.error("Error during donut destroy:", error);
    try {
      if (donutChartInstance.value) {
        await donutChartInstance.value.destroy();
      }
    } catch (e) {
      // ignore
    }
    donutChartInstance.value = null;
  }
};

const applyDonutChart = async (labels, series, colors, total, mode) => {
  const options = {
    chart: {
      type: "donut",
      height: 380,
      fontFamily: "Inter, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: DONUT_CREATE_SPEED,
        animateGradually: { enabled: true, delay: 100 },
        dynamicAnimation: { enabled: true, speed: 800 },
      },
    },
    labels,
    colors,
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => Math.round(val) + "%",
      style: { fontSize: "12px", fontWeight: 600, colors: ["#fff"] },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { 
              show: true, 
              fontSize: "16px", 
              fontWeight: 600, 
              color: "#64748b" 
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: 700,
              color: "#1f2937",
              formatter: (val) => formatNumber(val),
            },
            total: {
              show: true,
              label: mode === "merchants" ? "Total UMKM" : "Total Produk",
              fontSize: "16px",
              fontWeight: 600,
              color: "#64748b",
              formatter: () => formatNumber(total),
            },
          },
        },
      },
    },
    responsive: [
      {
        breakpoint: 640,
        options: { 
          chart: { height: 320 },
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  value: { fontSize: "24px" },
                  total: { fontSize: "14px" },
                },
              },
            },
          },
        },
      },
    ],
  };

  donutChartInstance.value = new ApexCharts(donutChartEl.value, { ...options, series });
  await donutChartInstance.value.render();
};

const renderDonutChart = async () => {
  if (!donutChartEl.value) return;

  await waitForElementSize(donutChartEl.value);

  if (!props.stats) {
    if (donutChartEl.value) {
      donutChartEl.value.innerHTML = `<div class="py-8 text-center text-gray-500">⏳ Memuat data...</div>`;
    }
    return;
  }

  const mode = donutChartMode.value;
  const source =
    mode === "merchants"
      ? props.stats.merchants?.by_segmentation ?? []
      : props.stats.products?.by_category ?? [];

  const hasValidData = Array.isArray(source) && source.length > 0 && source.some((s) => (s.count || 0) > 0);

  if (!hasValidData) {
    if (donutChartEl.value) {
      donutChartEl.value.innerHTML = `<div class="py-8 text-center text-gray-500">Tidak ada data ${mode === "merchants" ? "merchant" : "produk"}</div>`;
    }
    return;
  }

  if (donutChartEl.value) {
    donutChartEl.value.innerHTML = "";
  }

  const labels = source.map((s) => s.name);
  const series = source.map((s) => Number(s.count || 0));
  const total = series.reduce((a, b) => a + b, 0);
  const colors = palette(mode);

  await applyDonutChart(labels, series, colors, total, mode);
};

// Watchers
watch(donutChartMode, async (newMode, oldMode) => {
  if (newMode === oldMode || !props.stats) return;

  if (donutChartInstance.value) {
    await destroyDonutWithReverseAnimation();
  }

  await sleep(150);
  await nextTick();
  await renderDonutChart();
});

watch(
  () => props.stats,
  async (val) => {
    if (val) {
      await nextTick();
      await renderDonutChart();
    }
  }
);

// Lifecycle
onMounted(async () => {
  await nextTick();
  if (props.stats) {
    await renderDonutChart();
  }
});

onUnmounted(async () => {
  if (donutChartInstance.value) {
    await destroyDonutWithReverseAnimation();
  }
});
</script>

<template>
  <div class="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 mb-4 sm:gap-5 sm:mb-6 md:flex-row md:items-center md:justify-between">
      <div class="w-full">
        <h3 class="text-base sm:text-lg font-semibold text-gray-800">Analisis Distribusi</h3>
        <p class="mt-1 text-gray-500 text-xs sm:text-sm">
          {{ donutChartMode === "merchants" ? "Distribusi segmentasi UMKM" : "Distribusi kategori produk (Top 5)" }}
        </p>
      </div>

      <!-- See Details Button -->
      <a
        href="#"
        class="inline-flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap font-medium  hover:text-merchant-primary transition"
      >
        Lihat detail
        <i class="pi pi-arrow-right text-xs"></i>
      </a>
    </div>

    <!-- Mode Toggle -->
    <div class="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 w-fit mb-6">
      <button
        v-for="option in donutModeOptions"
        :key="option.value"
        @click="donutChartMode = option.value"
        :class="[
          donutChartMode === option.value ? 'shadow-sm text-merchant-primary bg-merchant-primary/10' : 'text-gray-500',
          'px-3 py-1.5 font-medium rounded-md text-xs sm:text-sm whitespace-nowrap hover:text-merchant-primary hover:shadow-sm transition-all',
        ]"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Chart -->
    <div ref="donutChartEl" class="h-80 sm:h-[380px]"></div>
  </div>
</template>