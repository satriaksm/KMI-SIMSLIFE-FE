<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header - FIXED -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 border-b border-gray-100 sm:border-0"
    >
      <div class="flex items-center gap-3">
        <!-- Hamburger Button (Mobile) -->
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background sm:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>

        <div>
          <!-- ✅ Desktop: Show breadcrumb -->
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="merchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Kelola dan unduh riwayat transaksi {{ currentMerchantName }}
            </p>
          </div>

          <!-- ✅ Mobile: Show simple title -->
          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Laporan Transaksi
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 sm:gap-3 items-center">

                <Button
          @click="showExportModal = true"
          variant="merchant-outline"
          size="sm"
          customClass="!hidden sm:!inline"
        >
          <i class="pi pi-download"></i>
          <span class="hidden ml-2 sm:inline">Export</span>
        </Button>

                <Button
          @click="showExportModal = true"
          variant="merchant-outline"
          size="md"
          customClass="sm:!hidden"
        >
          <i class="pi pi-download"></i>
        </Button>


      </div>
    </div>

    <!-- Export Modal -->
    <ResponsiveModal
      v-model:show="showExportModal"
      title="Export Data"
      show-footer
      footer-class="sm:hidden"
      @close="showExportModal = false"
    >
      <div class="space-y-3">
        <button
          @click="handleExport('pdf')"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
          :class="
            loadingExport
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-danger-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-file-pdf text-danger-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Export ke PDF
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Download laporan transaksi dalam format PDF
            </p>
          </div>
        </button>

        <button
          @click="handleExport('excel')"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-muted-background rounded-xl hover:bg-muted-background hover:border-merchant-primary group"
          :class="
            loadingExport
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-muted-background hover:border-merchant-primary'
          "
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-lg shrink-0 bg-success-background group-hover:scale-110"
          >
            <i class="text-2xl pi pi-file-excel text-success-foreground"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-black sm:text-base">
              Export ke Excel
            </h4>
            <p class="text-xs sm:text-sm text-muted-foreground">
              Download dalam format Excel (.xlsx)
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="showExportModal = false" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- Spacer untuk kompensasi fixed header -->
    <div class="h-24 sm:h-0"></div>

    <div class="px-4 py-0 space-y-2 sm:px-6 sm:py-6">
    <!-- STICKY WRAPPER UNTUK FILTER DAN SUMMARY -->
    <div class=" z-10 top-[88px] sm:top-0 bg-gray-50 pt-0 pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 space-y-2 mb-4">
      <!-- Action Bar: Filter -->
      <div class="flex items-center justify-between gap-3 p-4 bg-white border border-gray-200 shadow-sm rounded-2xl">
        <div class="text-sm font-medium text-gray-700">
          Filter Data Laporan
        </div>
        <div class="flex gap-2">
          <Button
            variant="merchant-outline"
            @click="showFilterModal = true"
            size="md"
          >
            <i class="pi pi-sliders-h"></i>
            <span class="hidden ml-2 sm:inline">Filter</span>
          </Button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div class="flex items-center gap-2 sm:gap-4">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-500">
              <i class="text-xl pi pi-shopping-cart"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Total Transaksi</p>
              <p class="text-2xl font-bold text-gray-900">
                <span v-if="loading" class="text-gray-300 animate-pulse">---</span>
                <span v-else>{{ summary.total_transactions }}</span>
              </p>
            </div>
          </div>
        </div>
        
        <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div class="flex items-center gap-4">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-500">
              <i class="text-xl pi pi-money-bill"></i>
            </div>
            <div>
              <p class="text-xs sm:text-sm font-medium text-gray-500">Pendapatan Bersih</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900">
                <span v-if="loading" class="text-gray-300 animate-pulse">---</span>
                <span v-else>Rp {{ formatIDR(summary.total_revenue) }}</span>
              </p>
              <p class="text-[8px] sm:text-[10px] text-gray-400 mt-1">Hanya pesanan selesai (completed)</p>
            </div>
          </div>
        </div>
        <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 text-orange-500">
              <i class="text-xl pi pi-wallet"></i>
            </div>
            <div>
              <p class="text-xs sm:text-sm font-medium text-gray-500">Saldo Bisa Ditarik</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900">
                <span v-if="loading" class="text-gray-300 animate-pulse">---</span>
                <span v-else>Rp {{ formatIDR(walletStats?.balance_withdrawable || 0) }}</span>
              </p>
              <p class="text-[8px] sm:text-[10px] text-gray-400 mt-1">Pesanan selesai setelah 24jam</p>
            </div>
          </div>
          <div>
            <Button
              @click="requestPayoutAction"
              variant="merchant"
              size="sm"
              :disabled="!canWithdraw || requestingPayout"
            >
              <i class="pi" :class="requestingPayout ? 'pi-spin pi-spinner' : 'pi-wallet'"></i>
              <span class="ml-2 hidden lg:inline">Tarik Saldo</span>
              <span class="ml-2 lg:hidden">Tarik</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="hidden sm:block">
      <MerchantTable
        :items="transactions"
        :columns="tableColumns"
        :loading="loading"
        :showCheckbox="false"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :paginationInfo="paginationInfo"
        @page-change="handlePageChange"
        emptyMessage="Tidak ada transaksi ditemukan untuk filter ini."
      >
        <template #cell-order_code="{ item }">
          <div class="font-semibold text-gray-900 text-sm">{{ item.order_code }}</div>
        </template>
        <template #cell-created_at="{ item }">
          <div class="text-gray-900 text-sm">
          {{ formatDate(item.created_at) }}
              <div class="text-xs text-gray-400">
                {{ formatTime(item.created_at) }}
              </div>
          </div> 
        </template>
        <template #cell-customer_name="{ item }">
              <div class="text-sm font-medium text-gray-800">
                {{ item.customer_name }}
              </div>        </template>
        <template #cell-delivery_type="{ item }">
          <span class="px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-600 bg-gray-100 border border-gray-200 rounded-md uppercase">
            {{ item.delivery_type }}
          </span>
        </template>
        <template #cell-status="{ item }">
          <StatusLabel v-bind="statusProps(item.status)" />
        </template>
        <template #cell-gross_amount="{ item }">
                      <div class="text-sm  text-gray-800">
              Rp {{ formatIDR(item.gross_amount) }}
            </div>
        </template>
        <template #cell-platform_fee="{ item }">
          <span class="text-sm text-red-500">- Rp {{ formatIDR(item.platform_fee) }}</span>
        </template>
        <template #cell-net_amount="{ item }">
          <div class="text-sm font-bold text-gray-900">Rp {{ formatIDR(item.net_amount) }}</div>
        </template>
      </MerchantTable>
    </div>

    <!-- Mobile Table (Cards) -->
    <div class="sm:hidden space-y-4">
      <div v-if="loading" v-for="n in 3" :key="n" class="p-4 bg-white border border-gray-100 shadow-sm rounded-xl animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div v-else-if="transactions.length === 0" class="p-8 text-center bg-white border border-gray-100 shadow-sm rounded-xl">
        <i class="pi pi-inbox text-4xl mb-3 text-gray-300"></i>
        <p class="text-sm text-gray-500">Tidak ada transaksi ditemukan.</p>
      </div>
      <div
        v-else
        v-for="order in transactions"
        :key="order.id"
        class="p-4 bg-white border border-gray-100 shadow-sm rounded-xl"
      >
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-sm font-bold text-gray-900">{{ order.order_code }}</div>
            <div class="text-xs text-gray-500">{{ formatDate(order.created_at) }}</div>
          </div>
          <StatusLabel v-bind="statusProps(order.status)" />
        </div>
        
        <div class="flex items-center justify-between py-2 border-y border-gray-50 mb-3">
          <div>
            <div class="text-[10px] text-gray-400">Pembeli</div>
            <div class="text-xs font-medium text-gray-800">{{ order.customer_name }}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-gray-400">Tipe</div>
            <span class="px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-gray-600 bg-gray-100 rounded uppercase">
              {{ order.delivery_type }}
            </span>
          </div>
        </div>
        
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-gray-500">Gross</span>
          <span class="text-xs">Rp {{ formatIDR(order.gross_amount) }}</span>
        </div>
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-50">
          <span class="text-xs text-gray-500">Platform Fee</span>
          <span class="text-xs text-red-500">- Rp {{ formatIDR(order.platform_fee) }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-700">Pendapatan</span>
          <span class="text-sm font-bold text-merchant-primary">Rp {{ formatIDR(order.net_amount) }}</span>
        </div>
      </div>

          <div
      v-if="!loading && transactions.length > 0"
      class=" pb-4 sm:hidden"
    >
      <MobilePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      />
    </div>
    </div>
    
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan Laporan"
      show-footer
      @close="showFilterModal = false"
    >
      <div class="space-y-6">
        <!-- ===== FILTER SECTION ===== -->
        <div class="space-y-4">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
            <i class="pi pi-filter text-merchant-primary"></i>
            Filter Data
          </h3>

          <SelectField
            name="status"
            label="Status Pesanan"
            v-model="filters.status"
            :options="statusOptions"
            variant="merchant"
            placeholder="Semua Status"
          />

          <div class="grid grid-cols-2 gap-3">
            <TextField
              name="start_date"
              type="date"
              label="Mulai"
              v-model="filters.start_date"
              variant="merchant"
            />
            <TextField
              name="end_date"
              type="date"
              label="Sampai"
              v-model="filters.end_date"
              variant="merchant"
            />
          </div>
        </div>

        <!-- ===== SORT SECTION ===== -->
        <div class="pt-6 space-y-4 border-t border-muted-foreground/30">
          <h3
            class="flex items-center gap-2 text-sm font-bold tracking-wide text-black uppercase"
          >
            <i class="pi pi-sort-alt text-merchant-primary"></i>
            Urutkan Berdasarkan
          </h3>

          <!-- Sort by Date -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">
              <i class="mr-1 text-xs pi pi-calendar"></i>
              Waktu Transaksi
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="filters.sort_by = 'newest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  filters.sort_by === 'newest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-down-alt"></i>
                Terbaru
              </button>
              <button
                @click="filters.sort_by = 'oldest'"
                type="button"
                class="px-4 py-3 text-sm font-medium transition border-2 rounded-lg"
                :class="
                  filters.sort_by === 'oldest'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                "
              >
                <i class="mr-1 text-xs pi pi-sort-amount-up"></i>
                Terlama
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3">
          <Button @click="resetFilter" variant="muted-outline" block>
            <i class="mr-2 pi pi-refresh"></i>
            Reset
          </Button>
          <Button @click="applyFilter" block variant="merchant">
            <i class="mr-2 pi pi-check"></i>
            Terapkan
          </Button>
        </div>
      </template>
    </ResponsiveModal>

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
            {{ new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(currentMerchant?.balance_withdrawable || 0) }}
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
            :loading="requestingPayout"
            customClass="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Tarik Sekarang
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { getMerchantTransactionsReport, exportMerchantReportPdf, exportMerchantReportExcel } from '@/services/api/report';
import { saveBlob } from "@/libs/saveBlob.js";
import api from "@/libs/axios";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { formatTime, formatDate } from "@/libs/format.js";
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emit = defineEmits(["toggle-sidebar"]);

const loadingExport = ref(false);

const loading = ref(true);
const transactions = ref([]);
const summary = ref({
  total_transactions: 0,
  total_revenue: 0,
});
const walletStats = ref({
  balance_available: 0,
  balance_pending: 0,
  balance_held: 0,
  balance_withdrawable: 0,
});

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review";
    case "pending":
      if (o.payment_method === 'COD') return "waiting_review";
      return beStatus;
    case "responsed":
    case "accepted":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "undelivered":
      return "undelivered";
    default:
      return beStatus;
  }
}

function statusProps(beStatus) {
  const status = mapApiStatus(beStatus, { payment_method: 'Transfer', delivery_type: 'delivery' }); 
  switch (status) {
    case "pending":
      return { status: "pending", variant: "order" };
    case "waiting_review":
      return { status: "paid", variant: "order" };
    case "processing":
      return { status: "processed", variant: "order", label: "Diproses" };
    case "ready":
      return { status: "ready", variant: "order", label: "Siap Diambil" };
    case "shipped":
      return { status: "shipped", variant: "order", label: "Dikirim" };
    case "completed":
      return { status: "completed", variant: "order", label: "Selesai" };
    case "cancelled":
      return { status: "cancelled", variant: "order", label: "Dibatalkan Pembeli" };
    case "rejected":
      return { status: "cancelled", variant: "order", label: "Ditolak Penjual" };
    case "undelivered":
      return { status: "cancelled", variant: "order", label: "Gagal Kirim" };
    default:
      return { status: "pending", variant: "order", label: status };
  }
}

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const filters = ref({
  start_date: '',
  end_date: '',
  status: 'all',
  sort_by: 'newest'
});

const showFilterModal = ref(false);
const showExportModal = ref(false);
const showPayoutModal = ref(false);

const currentPage = ref(1);
const totalPages = ref(1);
const perPage = ref(10);
const paginationInfo = ref({
  start: 0,
  end: 0,
  total: 0,
  per_page: 10
});

const statusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu Pembayaran (Pending)" },
  { value: "paid", label: "Dibayar (Paid)" },
  { value: "responsed", label: "Diproses (Responsed)" },
  { value: "delivered", label: "Dikirim (Delivered)" },
  { value: "completed", label: "Selesai (Completed)" },
  { value: "cancelled", label: "Dibatalkan (Cancelled)" },
];

const merchantSlug = route.params.merchantSlug || authStore.merchantSlug;

const breadcrumbItems = computed(() => [{ label: "Laporan" }]);

const currentMerchant = computed(() => authStore.getMerchantBySlug(merchantSlug));
const currentMerchantName = computed(() => currentMerchant.value?.name || "UMKM");
const canWithdraw = computed(() => walletStats.value.balance_withdrawable >= 10000);

const requestingPayout = ref(false);

const requestPayoutAction = () => {
  if (!canWithdraw.value) {
    toast.error("Saldo yang dapat ditarik minimal Rp 10.000");
    return;
  }
  showPayoutModal.value = true;
};

const confirmPayout = async () => {
  try {
    requestingPayout.value = true;
    const res = await api.post(`/api/merchant/${merchantSlug}/payouts`, {
      amount: walletStats.value.balance_withdrawable
    });
    toast.success(res.data?.meta?.message || "Penarikan berhasil diajukan.");
    showPayoutModal.value = false;
    await authStore.fetchUserAndMerchants(); 
    await fetchData(); // Refresh data to get latest wallet stats
  } catch (err) {
    toast.error(err.response?.data?.meta?.message || err.response?.data?.message || "Gagal mengajukan penarikan saldo.");
  } finally {
    requestingPayout.value = false;
  }
};

const tableColumns = [
  { key: "order_code", label: "ID Pesanan" },
  { key: "created_at", label: "Tanggal" },
  { key: "customer_name", label: "Pembeli" },
  { key: "delivery_type", label: "Tipe" },
  { key: "status", label: "Status" },
  { key: "gross_amount", label: "Gross (Kotor)", align: "right" },
  { key: "platform_fee", label: "Platform Fee", align: "right" },
  { key: "net_amount", label: "Pendapatan Bersih", align: "right" },
];

const fetchData = async () => {
  if (!merchantSlug) return;
  
  loading.value = true;
  try {
    const params = {
      start_date: filters.value.start_date,
      end_date: filters.value.end_date,
      status: filters.value.status,
      sort_by: filters.value.sort_by,
      page: currentPage.value,
      per_page: perPage.value
    };
    
    const { data: res } = await getMerchantTransactionsReport(merchantSlug, params);
    
    // Ensure we parse transactions from the correct path since API wraps in data object
    transactions.value = res.data?.transactions || res.transactions || [];
    summary.value = res.data?.summary || res.summary || summary.value;
    walletStats.value = res.data?.wallet || res.wallet || walletStats.value;
    
    // Handle pagination meta
    const meta = res.meta?.pagination || res.data?.pagination || {};
    totalPages.value = meta.last_page || 1;
    currentPage.value = meta.current_page || 1;
    perPage.value = meta.per_page || 10;
    
    paginationInfo.value = {
      start: (currentPage.value - 1) * perPage.value + (transactions.value.length ? 1 : 0),
      end: (currentPage.value - 1) * perPage.value + transactions.value.length,
      total: meta.total || transactions.value.length,
      per_page: perPage.value
    };

  } catch (error) {
    console.error('Fetch error:', error);
    toast.error('Gagal memuat laporan transaksi');
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchData();
};

const applyFilter = () => {
  showFilterModal.value = false;
  currentPage.value = 1;
  fetchData();
};

const resetFilter = () => {
  filters.value = {
    start_date: '',
    end_date: '',
    status: 'all',
    sort_by: 'newest'
  };
  showFilterModal.value = false;
  currentPage.value = 1;
  fetchData();
};

const handleExport = async (type) => {
  if (!merchantSlug || loadingExport.value) return;
  
  loadingExport.value = true;
  showExportModal.value = false;
  
  try {
    const params = {
      start_date: filters.value.start_date,
      end_date: filters.value.end_date,
      status: filters.value.status,
      sort_by: filters.value.sort_by,
    };
    
    let res;
    if (type === 'pdf') {
      const res = await exportMerchantReportPdf(merchantSlug, params);
      saveBlob(res.data, `Laporan_Transaksi_${merchantSlug}_${formatDateForInput(new Date())}.pdf`);
    } else {
      const res = await exportMerchantReportExcel(merchantSlug, params);
      saveBlob(res.data, `Laporan_Transaksi_${merchantSlug}_${formatDateForInput(new Date())}.xlsx`);
    }
    
    toast.success(`Laporan ${type.toUpperCase()} berhasil diunduh`);
    showExportModal.value = false;
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Gagal mengunduh laporan. Silakan coba lagi.');
  } finally {
    loadingExport.value = false;
  }
};

const formatIDR = (value) => {
  return Number(value || 0).toLocaleString('id-ID');
};



const getStatusText = (status) => {
  const map = {
    pending: 'Menunggu',
    paid: 'Dibayar',
    responsed: 'Diproses',
    delivered: 'Dikirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };
  return map[status] || status;
};

const getStatusBadgeClass = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    responsed: 'bg-purple-100 text-purple-800',
    delivered: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

onMounted(() => {
  fetchData();
});
</script>
