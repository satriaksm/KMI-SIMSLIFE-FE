<template>
  <div v-if="user" class="p-4 sm:p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- User Profile Card - Modern Design -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="p-6">
          <div class="flex flex-col sm:flex-row gap-6">
            <!-- Avatar Section -->
            <div class="shrink-0">
              <div class="w-32 h-32 rounded-full bg-admin-primary/10 flex items-center justify-center border-2 border-gray-200 overflow-hidden">
                <img
                  v-if="user.profile_picture_path"
                  :src="getUserProfileUrl(user)"
                  :alt="user.name"
                  class="w-full h-full object-cover"
                  @error="(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class='text-5xl font-bold text-admin-primary'>${user.name?.charAt(0).toUpperCase()}</span>`; }"
                />
                <span v-else class="text-5xl font-bold text-admin-primary">
                  {{ user.name?.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>

            <!-- User Info Section -->
            <div class="flex-1">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ user.name }}</h2>
                  <p class="text-gray-600">{{ user.email }}</p>
                </div>
                <StatusLabel :status="user.computed_status || user.status" variant="user" />
              </div>

              <!-- Contact Info Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-admin-primary/10 rounded-lg">
                    <i class="pi pi-phone text-admin-primary"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Telepon</p>
                    <p class="font-medium text-gray-900">{{ user.phone || "-" }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="p-2 bg-admin-primary/10 rounded-lg">
                    <i class="pi pi-id-card text-admin-primary"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">NIK</p>
                    <p class="font-medium text-gray-900">{{ user.nik || "-" }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="p-2 bg-admin-primary/10 rounded-lg">
                    <i class="pi pi-verified text-admin-primary"></i>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Status Verifikasi</p>
                    <p class="font-medium text-gray-900">
                      {{ user.email_verified_at ? "Email Terverifikasi" : "Belum Verifikasi" }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Roles Section -->
              <div class="mt-4 pt-4 border-t border-gray-100">
                <p class="text-sm font-medium text-gray-700 mb-2">Roles:</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="role in user.roles || []"
                    :key="role.id || role.name"
                    class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium"
                  >
                    {{ role.name || role }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overview Section -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">Ringkasan Aktivitas</h3>

        <!-- Login Chart -->
        <div class="border border-gray-200 rounded-xl p-4 mb-5">
          <div class="flex items-start justify-between gap-4 mb-2">
            <div>
              <p class="text-sm font-semibold text-gray-800">Data Login Pengguna (30 Hari)</p>
              <p class="text-xs text-gray-500 mt-1">Grafik aktivitas login user dalam 30 hari terakhir</p>
            </div>
          </div>
          <div ref="loginChartEl" class="w-full h-60"></div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-blue-100 rounded-lg">
                <i class="pi pi-building text-blue-600"></i>
              </div>
              <p class="text-xs text-gray-600 font-medium">UMKM</p>
            </div>
            <p class="text-2xl font-bold text-gray-900">
              {{ user.merchants_count ?? (user.merchants?.length || 0) }}
            </p>
          </div>

          <div class="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-green-100 rounded-lg">
                <i class="pi pi-comments text-green-600"></i>
              </div>
              <p class="text-xs text-gray-600 font-medium">Postingan Komunitas</p>
            </div>
            <p class="text-2xl font-bold text-gray-900">{{ user.community_posts_count ?? 0 }}</p>
          </div>

          <div class="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-purple-100 rounded-lg">
                <i class="pi pi-comment text-purple-600"></i>
              </div>
              <p class="text-xs text-gray-600 font-medium">Komentar Postingan</p>
            </div>
            <p class="text-2xl font-bold text-gray-900">{{ user.post_comments_count ?? 0 }}</p>
          </div>
        </div>
      </div>

      <!-- Merchants Section - Modern Grid -->
      <div v-if="(user.merchants_count ?? (user.merchants?.length || 0)) > 0" class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              UMKM Terdaftar
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ user.merchants_count ?? (user.merchants?.length || 0) }} UMKM dimiliki user ini
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="merchant in (user.merchants || [])"
            :key="merchant.id"
            class="border border-gray-200 rounded-xl p-5 hover:border-merchant-primary hover:shadow-md transition-all group"
          >
            <!-- Header with Logo and Info -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3 flex-1">
                <div class="relative">
                  <div
                    v-if="merchant.logo_path"
                    class="w-14 h-14 rounded-full bg-merchant-primary/10 flex items-center justify-center overflow-hidden border-2 border-gray-200"
                  >
                    <img
                      :src="getMerchantLogoUrl(merchant)"
                      alt="Logo"
                      class="w-full h-full object-cover"
                      @error="(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class='text-xl font-bold text-merchant-primary'>${merchant.name?.charAt(0).toUpperCase()}</span>`; }"
                    />
                  </div>
                  <div
                    v-else
                    class="w-14 h-14 rounded-full bg-merchant-primary/10 flex items-center justify-center border-2 border-gray-200"
                  >
                    <span class="text-xl font-bold text-merchant-primary">
                      {{ merchant.name?.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-gray-900 truncate mb-1" :title="merchant.name">
                    {{ merchant.name }}
                  </h4>
                  <p class="text-xs text-gray-500 truncate" :title="merchant.slug">
                    @{{ merchant.slug }}
                  </p>
                  <StatusLabel :status="merchant.status" variant="merchant" size="xs" class="mt-1" />
                </div>
              </div>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 mb-1">Segmentasi</p>
                <div class="flex items-center gap-1">
                  <i class="pi pi-tag text-xs text-merchant-primary"></i>
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ merchant.segmentation?.name || 'N/A' }}
                  </p>
                </div>
              </div>

              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 mb-1">Paguyuban</p>
                <div class="flex items-center gap-1">
                  <i class="pi pi-users text-xs text-merchant-primary"></i>
                  <p class="text-sm font-medium text-gray-900 truncate" :title="merchant.paguyuban?.name">
                    {{ merchant.paguyuban?.name || 'Tidak ada' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Contact Info -->
            <div v-if="merchant.phone" class="flex items-center gap-2 text-xs text-gray-600 mb-3">
              <i class="pi pi-phone"></i>
              <span>{{ merchant.phone }}</span>
            </div>

            <!-- Stats Bar -->
            <div class="pt-3 border-t border-gray-100 mb-3">
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <i class="pi pi-box"></i>
                  {{ merchant.products_count ?? (merchant.products?.length || 0) }} Produk
                </span>
                <span class="flex items-center gap-1">
                  <i class="pi pi-ticket"></i>
                  {{ merchant.vouchers_count ?? 0 }} Voucher
                </span>
              </div>
            </div>

            <!-- Approval Actions (if pending) -->
            <div v-if="merchant.status === 'pending'" class="mb-3 flex gap-2">
              <Button @click="confirmApprove(merchant)" variant="success" size="sm" class="flex-1">
                <i class="pi pi-check mr-1"></i>
                Approve
              </Button>
              <Button @click="confirmReject(merchant)" variant="danger" size="sm" class="flex-1">
                <i class="pi pi-times mr-1"></i>
                Reject
              </Button>
            </div>

            <!-- Detail Button -->
            <Button
              @click="router.push({ name: 'Admin - Merchant Detail', params: { id: merchant.id } })"
              variant="merchant-outline"
              size="sm"
              block
            >
              <i class="pi pi-eye mr-2"></i>
              Lihat Detail UMKM
            </Button>

            <!-- Timeline Info
            <div class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <p class="mb-1">Registered:</p>
                <p class="font-medium text-gray-700">
                  {{ new Date(merchant.created_at).toLocaleDateString("id-ID") }}
                </p>
              </div>
              <div v-if="merchant.response_at">
                <p class="mb-1">Reviewed:</p>
                <p class="font-medium text-gray-700">
                  {{ new Date(merchant.response_at).toLocaleDateString("id-ID") }}
                </p>
              </div>
            </div> -->
          </div>
        </div>
      </div>

      <!-- No Merchants -->
      <div v-else class="bg-white rounded-lg shadow-sm p-6">
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-building text-3xl text-gray-400"></i>
          </div>
          <p class="text-gray-600 font-medium mb-2">Belum ada UMKM terdaftar</p>
          <p class="text-sm text-gray-500">Pengguna ini belum memiliki UMKM</p>
        </div>
      </div>

      <!-- Timeline
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">Timeline</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 rounded-lg">
              <i class="pi pi-calendar-plus text-green-600"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">User Registered</p>
              <p class="font-medium text-gray-900">{{ new Date(user.created_at).toLocaleString("id-ID") }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <i class="pi pi-clock text-blue-600"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">Last Updated</p>
              <p class="font-medium text-gray-900">{{ new Date(user.updated_at).toLocaleString("id-ID") }}</p>
            </div>
          </div>
        </div>
      </div> -->
    </div>

    <!-- Approve Modal -->
    <ResponsiveModal :show="showApproveModal" @close="showApproveModal = false" title="Konfirmasi Approval">
      <p class="text-sm text-gray-600 mb-4">
        Apakah Anda yakin ingin meng-approve merchant <strong>{{ selectedMerchant?.name }}</strong>?
      </p>
      <p class="text-xs text-gray-500">Owner merchant akan dapat mengakses dashboard dan mengelola produk.</p>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showApproveModal = false" variant="secondary">Batal</Button>
          <Button @click="handleApprove" variant="success" :disabled="loading">
            <i class="pi pi-check mr-2"></i>
            {{ loading ? "Memproses..." : "Approve" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Reject Modal -->
    <ResponsiveModal :show="showRejectModal" @close="showRejectModal = false" title="Konfirmasi Penolakan">
      <p class="text-sm text-gray-600 mb-4">
        Mengapa Anda menolak merchant <strong>{{ selectedMerchant?.name }}</strong>?
      </p>
      <textarea
        v-model="rejectReason"
        rows="4"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary"
        placeholder="Masukkan alasan penolakan..."
      />
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showRejectModal = false" variant="secondary">Batal</Button>
          <Button @click="handleReject" variant="danger" :disabled="loading || !rejectReason.trim()">
            <i class="pi pi-times mr-2"></i>
            {{ loading ? "Memproses..." : "Tolak" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Export Modal -->
    <ResponsiveModal
      :show="showExportModal"
      @close="closeExportModal"
      title="Export Detail User"
      subtitle="Unduh laporan detail user dalam format PDF"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-900 font-medium mb-1">Laporan akan mencakup:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Profil lengkap user (Nama, Email, Phone, NIK, Roles)</li>
                <li>Statistik aktivitas (UMKM, Postingan, Komentar)</li>
                <li>Trend login (30 hari terakhir)</li>
                <li>Daftar UMKM yang dimiliki</li>
                <li>Informasi timestamp dan verifikasi</li>
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
      <i class="pi pi-spin pi-spinner text-4xl text-admin-primary mb-4"></i>
      <p class="text-gray-600">Memuat data user...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import ApexCharts from "apexcharts";
import api from "@/libs/axios";
import { useUsers } from "@/composables/useUsers";
import { getUserProfileUrl } from "@/libs/getImageUrl"; // ✅ ADD import
import { getMerchantLogoUrl } from "@/libs/getImageUrl"; // ✅ ADD import

import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";

// Router & utils
const router = useRouter();
const route = useRoute();
const toast = useToast();

const { fetchUserDetail, approveMerchant, rejectMerchant, loading } = useUsers();

// ✅ Inject the registration function from parent
const registerExportModal = inject('registerExportModal', null);

// =======================
// STATE
// =======================
const detail = ref(null);
const user = computed(() => detail.value?.user ?? null);
const permissions = computed(() => detail.value?.permissions ?? null);

// Approve / Reject UI state
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const selectedMerchant = ref(null);
const rejectReason = ref("");

// Login chart
const loginTrend = ref([]);
const loginChartEl = ref(null);
const loginChartInstance = ref(null);

// Export state
const showExportModal = ref(false);
const exportLoading = ref(false);

// =======================
// HELPERS
// =======================
const normalizeDetailPayload = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  if (payload?.user) return payload;

  if (payload?.id) {
    return {
      user: payload,
      permissions: null,
      status_history: [],
      admin_actions: [],
      reports: [],
      alerts: [],
    };
  }
  return null;
};

const waitForElementSize = async (el, maxFrames = 20) => {
  if (!el) return false;
  const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
  let frames = 0;
  while (el.offsetWidth === 0 && frames < maxFrames) {
    await raf();
    frames++;
  }
  await nextTick();
  return true;
};

const formatISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatLabel = (iso) => {
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }); // e.g. "21 Des"
};

// =======================
// DATA FETCH
// =======================
const loadUser = async () => {
  try {
    const res = await fetchUserDetail(route.params.id);
    const payload = normalizeDetailPayload(res);
    if (!payload?.user) throw new Error("Invalid user payload");
    detail.value = payload;
  } catch (e) {
    console.error(e);
    toast.error("Gagal memuat detail user");
    router.push({ name: "Admin - Users" });
  }
};

/**
 * Fetch login trend from API and normalise to 30-day series.
 * Ensures there is always 30 points (oldest -> newest).
 */
const fetchLoginTrend = async () => {
  try {
    const res = await api.get(`/api/admin/users/${route.params.id}/login-trend`, {
      params: { days: 30 },
    });
    const raw = res?.data?.data?.series || [];

    // convert raw to map keyed by ISO date (YYYY-MM-DD) -> total
    const map = {};
    raw.forEach((r) => {
      if (!r) return;
      // assume r.date is YYYY-MM-DD or parsable
      const key = String(r.date).slice(0, 10);
      map[key] = Number(r.total || 0);
    });

    // build 30-day array oldest -> newest
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = formatISO(d);
      series.push({
        date: iso,
        label: formatLabel(iso),
        total: map[iso] ?? 0,
      });
    }
    loginTrend.value = series;
  } catch (e) {
    console.error("Login trend error", e);
    // fallback: 30 zeros
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = formatISO(d);
      series.push({ date: iso, label: formatLabel(iso), total: 0 });
    }
    loginTrend.value = series;
  }
};

// =======================
// CHART
// =======================
const renderLoginChart = async () => {
  if (!loginChartEl.value) return;

  await waitForElementSize(loginChartEl.value);

  const labels = loginTrend.value.map((d) => d.label);
  const data = loginTrend.value.map((d) => Number(d.total || 0));

  // compute max similar to Statistic.vue helper (simple approach)
  const computeMax = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 10;
    const max = Math.max(...arr, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / magnitude) * magnitude;
  };
  const yMax = computeMax(data) * 1.15;

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
    series: [{ name: "Login", type: "area", data }],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { enabled: true, opacityFrom: 0.55, opacityTo: 0 },
    },
    markers: { size: 0, hover: { size: 7, sizeOffset: 3 } },
    colors: ["#44a4b4"],
    dataLabels: { enabled: false },
    xaxis: {
      type: "category",
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px", fontWeight: 500, colors: "#64748b" } },
    },
    yaxis: [
      {
        seriesName: "Login",
        title: { text: "Total Login", style: { fontSize: "14px", fontWeight: 600, color: "#64748b" } },
        max: yMax,
        min: 0,
        forceNiceScale: true,
        labels: { formatter: (v) => Math.round(v), style: { fontSize: "12px", colors: "#64748b" } },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [{ formatter: (val) => `${Math.round(val)} login` }],
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      borderColor: "#f1f5f9",
    },
    legend: { show: false },
  };

  if (loginChartInstance.value) {
    await loginChartInstance.value.updateOptions(
      {
        xaxis: options.xaxis,
        yaxis: options.yaxis,
        chart: options.chart,
      },
      false,
      true
    );
    await loginChartInstance.value.updateSeries(options.series, true);
  } else {
    loginChartInstance.value = new ApexCharts(loginChartEl.value, options);
    await loginChartInstance.value.render();
  }
};

// Export methods
const openExportModal = () => (showExportModal.value = true);
const closeExportModal = () => (showExportModal.value = false);

const exportPDF = async () => {
  exportLoading.value = true;
  try {
    const response = await api.get(`/api/admin/users/${route.params.id}/export-pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `user-detail-${route.params.id}-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success("Laporan user detail berhasil diunduh");
    closeExportModal();
  } catch (error) {
    console.error("Export PDF failed:", error);
    toast.error(error.response?.data?.message || "Gagal mengunduh laporan");
  } finally {
    exportLoading.value = false;
  }
};

// =======================
// APPROVE / REJECT HANDLERS
// =======================
const confirmApprove = (merchant) => {
  selectedMerchant.value = merchant;
  showApproveModal.value = true;
};

const confirmReject = (merchant) => {
  selectedMerchant.value = merchant;
  rejectReason.value = "";
  showRejectModal.value = true;
};

const handleApprove = async () => {
  try {
    await approveMerchant(selectedMerchant.value.id);
    showApproveModal.value = false;
    await loadUser();
    // refresh trend after possible changes
    await fetchLoginTrend();
    await renderLoginChart();
  } catch (error) {
    console.error("Approve failed:", error);
    toast.error("Approve gagal");
  }
};

const handleReject = async () => {
  if (!rejectReason.value.trim()) {
    toast.warning("Alasan penolakan wajib diisi");
    return;
  }

  try {
    await rejectMerchant(selectedMerchant.value.id, rejectReason.value);
    showRejectModal.value = false;
    await loadUser();
    await fetchLoginTrend();
    await renderLoginChart();
  } catch (error) {
    console.error("Reject failed:", error);
    toast.error("Reject gagal");
  }
};

// =======================
// LIFECYCLE & WATCHERS
// =======================
const destroyChart = async () => {
  if (loginChartInstance.value) {
    try {
      await loginChartInstance.value.destroy();
    } catch (e) {
      // ignore
    }
    loginChartInstance.value = null;
  }
};

watch(
  () => route.params.id,
  async () => {
    // when switching user, destroy old chart and reload everything
    await destroyChart();
    detail.value = null;
    await loadUser();
    await fetchLoginTrend();
    await nextTick();
    await renderLoginChart();
  },
  { immediate: true }
);

onMounted(async () => {
  // ✅ Register export callback with parent
  if (typeof registerExportModal === 'function') {
    registerExportModal(openExportModal);
    console.log('Customer Detail: Export callback registered');
  }
});

onUnmounted(async () => {
  await destroyChart();
});
</script>
