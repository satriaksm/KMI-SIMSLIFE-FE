<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div
      class="fixed sm:static top-0 left-0 right-0 flex justify-between items-center py-6 px-4 sm:px-6 bg-white z-10 border-b border-gray-200 shadow-sm"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button
          @click="$emit('toggle-sidebar')"
          class="lg:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
          aria-label="Toggle sidebar"
          type="button"
        >
          <i class="pi pi-bars text-gray-600"></i>
        </button>

        <div class="min-w-0">
          <Breadcrumb :items="breadcrumbItems" />
          <p class="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
            Kelola antrean pengembalian dana untuk pesanan yang dibatalkan.
          </p>
        </div>
      </div>
    </div>

    <div class="h-[92px] sm:h-0"></div>

    <div class="px-4 p-4 sm:px-6">
      
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4" v-if="stats">
        <div class="bg-red-50/50 rounded-xl shadow-sm border border-red-200 p-4 flex flex-col justify-center relative overflow-hidden">
          <div class="absolute -right-4 -top-4 opacity-10">
            <i class="pi pi-exclamation-circle" style="font-size: 5rem"></i>
          </div>
          <div class="text-sm font-medium text-red-600 mb-1 relative z-10">Perlu Direfund</div>
          <div class="text-2xl font-bold text-gray-900 relative z-10">{{ formatCurrency(stats.failed_amount) }}</div>
          <div class="text-xs text-gray-500 mt-1 relative z-10">{{ stats.failed_count }} Antrean Transaksi</div>
        </div>
        <div class="bg-yellow-50/50 rounded-xl shadow-sm border border-yellow-200 p-4 flex flex-col justify-center relative overflow-hidden">
          <div class="absolute -right-4 -top-4 opacity-10">
            <i class="pi pi-spin pi-spinner" style="font-size: 5rem"></i>
          </div>
          <div class="text-sm font-medium text-yellow-600 mb-1 relative z-10">Sedang Diproses</div>
          <div class="text-2xl font-bold text-gray-900 relative z-10">{{ formatCurrency(stats.processing_amount) }}</div>
          <div class="text-xs text-gray-500 mt-1 relative z-10">{{ stats.processing_count }} Antrean Transaksi</div>
        </div>
        <div class="bg-green-50/50 rounded-xl shadow-sm border border-green-200 p-4 flex flex-col justify-center relative overflow-hidden">
          <div class="absolute -right-4 -top-4 opacity-10">
            <i class="pi pi-check-circle" style="font-size: 5rem"></i>
          </div>
          <div class="text-sm font-medium text-green-600 mb-1 relative z-10">Berhasil Dikembalikan</div>
          <div class="text-2xl font-bold text-gray-900 relative z-10">{{ formatCurrency(stats.succeeded_amount) }}</div>
          <div class="text-xs text-gray-500 mt-1 relative z-10">{{ stats.succeeded_count }} Transaksi</div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <!-- Status Tabs -->
        <template v-if="currentStatus">
          <div class="sm:hidden p-3 bg-gray-50 border-b border-gray-200">
            <select
              :value="currentStatus"
              @change="currentStatus = $event.target.value"
              class="block w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-merchant-primary shadow-sm"
            >
              <option v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</option>
            </select>
          </div>

          <div class="hidden sm:flex border-b border-gray-200 bg-gray-50/50">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
              :class="
                currentStatus === tab.value
                  ? 'border-merchant-primary text-merchant-primary bg-white'
                  : 'border-transparent text-muted-foreground hover:text-black hover:bg-gray-100'
              "
              @click="currentStatus = tab.value"
              type="button"
            >
              {{ tab.label }}
            </button>
          </div>
        </template>

        <!-- Advanced Filters -->
        <div class="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 border-b border-gray-100 bg-white">
          <div class="flex-1 min-w-0">
            <TextField
              name="search"
              v-model="searchQuery"
              placeholder="Cari ID Pesanan, Nama, atau Telepon..."
              variant="merchant"
            />
          </div>
          
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div class="w-[calc(50%-0.25rem)] sm:w-32">
              <SelectField
                name="sortFilter"
                v-model="sortBy"
                :options="sortOptions"
                placeholder="Urutkan"
                variant="merchant"
              />
            </div>
            
            <div class="w-[calc(50%-0.25rem)] sm:w-36">
              <input 
                type="date" 
                v-model="startDate"
                class="block w-full px-3 py-2 bg-white border border-merchant-primary/50 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-merchant-primary focus:border-merchant-primary shadow-sm"
                title="Tanggal Mulai"
              />
            </div>
            <span class="text-gray-400 hidden sm:inline">-</span>
            <div class="w-[calc(50%-0.25rem)] sm:w-36">
              <input 
                type="date" 
                v-model="endDate"
                class="block w-full px-3 py-2 bg-white border border-merchant-primary/50 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-merchant-primary focus:border-merchant-primary shadow-sm"
                title="Tanggal Akhir"
              />
            </div>

            <div class="flex w-[calc(50%-0.25rem)] sm:w-auto gap-2">
              <Button @click="fetchRefunds" variant="merchant-primary" customClass="h-[38px] px-3 flex-1 sm:flex-none" title="Refresh Data">
                <i class="pi pi-refresh" :class="{ 'animate-spin': loading }"></i>
              </Button>
              <Button @click="resetFilters" variant="merchant-outline" customClass="h-[38px] px-3 flex-1 sm:flex-none" title="Reset Filter">
                <i class="pi pi-filter-slash"></i>
              </Button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <AdminTable
          :items="refunds"
          :columns="tableColumns"
          :loading="loading"
          :current-page="currentPage"
          :total-pages="totalPages"
          :pagination-info="paginationInfo"
          :show-checkbox="false"
          empty-message="Tidak ada data refund dengan status ini."
          @page-change="goToPage"
          @next-page="nextPage"
          @prev-page="prevPage"
        >
          <template #cell-updated_at="{ item }">
            <span class="text-gray-500">{{ formatDate(item.updated_at) }}</span>
          </template>

          <template #cell-order="{ item }">
            <div>
              <span class="font-bold text-gray-900">{{ item.order?.order_code || item.order_id }}</span>
              <div class="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-[200px]" :title="getOrderItemsText(item)">
                {{ getOrderItemsText(item) }}
              </div>
            </div>
          </template>

          <template #cell-user="{ item }">
            <div class="font-medium text-gray-900">{{ item.order?.user?.name || 'Unknown' }}</div>
            <div class="text-xs text-gray-500">{{ item.order?.user?.email || '-' }}</div>
          </template>

          <template #cell-amount="{ item }">
            <span class="font-medium text-gray-900">{{ formatCurrency(item.amount) }}</span>
          </template>

          <template #cell-destination="{ item }">
            <div class="flex flex-col gap-1 items-start">
              <span v-if="item.refund_status === 'failed'" class="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-700/10 uppercase tracking-wider">
                Menunggu Manual
              </span>
              <span v-else-if="item.xendit_refund_id && item.xendit_refund_id.startsWith('disb-')" class="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wider">
                Manual Refund
              </span>
              <span v-else class="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">
                Auto Refund
              </span>
              
              <div class="text-xs text-gray-600 mt-1">
                <template v-if="item.refund_destination">
                  {{ item.refund_destination }}
                </template>
                <template v-else-if="item.raw_response?.payment_channel">
                  {{ item.raw_response.payment_channel }}
                </template>
                <template v-else>
                  {{ item.payment_method }}
                </template>
              </div>
            </div>
          </template>

          <template #cell-phone="{ item }">
            <a v-if="item.order?.user?.phone" :href="getWaLink(item)" target="_blank" class="text-green-600 hover:text-green-700 inline-flex items-center gap-1 font-medium bg-green-50 px-2 py-1 rounded-md transition-colors">
              <i class="pi pi-whatsapp"></i> {{ item.order?.user?.phone }}
            </a>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>

          <template #cell-actions="{ item }">
            <Button
              v-if="item.refund_status === 'failed'"
              @click="openProcessModal(item)"
              variant="merchant-outline"
              size="sm"
              customClass="font-semibold px-0 py-0"
            >
              Proses Refund
            </Button>
            <span v-else-if="item.refund_status === 'succeeded'" class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Selesai
            </span>
            <div v-else-if="item.refund_status === 'processing'" class="flex items-center gap-2">
              <span class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                Processing
              </span>
              <Button
                @click="checkRefundStatus(item)"
                variant="ghost"
                size="sm"
                :loading="syncingId === item.id"
                customClass="px-1 py-0 flex items-center gap-1"
                title="Cek sinkronisasi status ke Xendit"
              >
                <i class="pi pi-refresh" v-if="syncingId !== item.id"></i> Cek
              </Button>
            </div>
          </template>
        </AdminTable>
      </div>
    </div>

    <!-- Process Refund Modal -->
    <ResponsiveModal
      v-model:show="isModalOpen"
      title="Proses Refund Manual"
      size="md"
    >
      <div class="mt-2">
        <p class="text-sm text-gray-500 mb-4">
          Masukkan informasi rekening tujuan untuk refund pesanan <strong>{{ selectedItem?.order?.order_code }}</strong> senilai <strong>{{ formatCurrency(selectedItem?.amount || 0) }}</strong>. Dana akan ditarik langsung dari saldo Xendit sistem.
        </p>
        
        <Form @submit="submitRefund" class="space-y-4">
          <SelectField
            name="bank_code"
            label="Kode Bank / E-Wallet"
            :options="bankOptions"
            v-model="form.bank_code"
            required
            placeholder="Pilih Bank"
            variant="merchant"
          />

          <TextField
            name="account_number"
            label="Nomor Rekening"
            v-model="form.account_number"
            required
            placeholder="Masukkan nomor rekening"
            variant="merchant"
          />

          <TextField
            name="account_name"
            label="Nama Pemilik Rekening"
            v-model="form.account_name"
            required
            placeholder="Masukkan nama pemilik rekening"
            variant="merchant"
          />
        </Form>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end w-full">
          <Button @click="closeModal" variant="muted-outline">Batal</Button>
          <Button @click="submitRefund" :loading="submitting" variant="primary">Proses Disbursement</Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { Form } from 'vee-validate';
import ResponsiveModal from '@/components/common/ResponsiveModal.vue';
import AdminTable from '@/components/common/AdminTable.vue';
import Button from '@/components/common/Button.vue';
import TextField from '@/components/forms/TextField.vue';
import SelectField from '@/components/forms/SelectField.vue';
import Breadcrumb from '@/components/merchant/Breadcrumb.vue';
import api from '@/libs/axios';
import { useToast } from 'vue-toastification';

const emit = defineEmits(["toggle-sidebar"]);

const breadcrumbItems = computed(() => {
  return [
    { label: "Manajemen Refund" }
  ];
});

const toast = useToast();

const tabs = [
  { label: 'Butuh Manual (Failed)', value: 'failed' },
  { label: 'Sedang Diproses (Processing)', value: 'processing' },
  { label: 'Berhasil (Succeeded)', value: 'succeeded' },
];

const bankOptions = [
  { value: 'BCA', label: 'BCA' },
  { value: 'MANDIRI', label: 'Mandiri' },
  { value: 'BNI', label: 'BNI' },
  { value: 'BRI', label: 'BRI' },
  { value: 'PERMATA', label: 'Permata' },
  { value: 'CIMB', label: 'CIMB Niaga' },
  { value: 'OVO', label: 'OVO' },
  { value: 'DANA', label: 'DANA' },
  { value: 'SHOPEEPAY', label: 'ShopeePay' },
  { value: 'LINKAJA', label: 'LinkAja' },
];

const currentStatus = ref('failed');
const searchQuery = ref('');
const sortBy = ref('terbaru');
const startDate = ref('');
const endDate = ref('');

const sortOptions = [
  { label: 'Terbaru', value: 'terbaru' },
  { label: 'Terlama', value: 'terlama' },
  { label: 'Terbesar', value: 'terbesar' },
  { label: 'Terkecil', value: 'terkecil' },
];

const refunds = ref([]);
const stats = ref(null);
const loading = ref(true);
const submitting = ref(false);
const syncingId = ref(null);

const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = ref(15);

const isModalOpen = ref(false);
const selectedItem = ref(null);
const form = ref({
  bank_code: '',
  account_number: '',
  account_name: '',
});

const tableColumns = [
  { key: "updated_at", label: "Waktu", sortable: false },
  { key: "order", label: "Order ID", sortable: false },
  { key: "user", label: "Pelanggan", sortable: false },
  { key: "amount", label: "Nominal", sortable: false },
  { key: "destination", label: "Tipe & Tujuan", sortable: false },
  { key: "phone", label: "Telepon / WA", sortable: false },
  { key: "actions", label: "Aksi", sortable: false },
];

const paginationInfo = computed(() => {
  const start =
    totalItems.value === 0
      ? 0
      : (currentPage.value - 1) * perPage.value + 1;
  const end = Math.min(
    currentPage.value * perPage.value,
    totalItems.value,
  );
  return {
    start,
    end,
    total: totalItems.value,
    current_page: currentPage.value,
    per_page: perPage.value,
  };
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
const nextPage = () => {
  if (currentPage.value < totalPages.value) goToPage(currentPage.value + 1);
};
const prevPage = () => {
  if (currentPage.value > 1) goToPage(currentPage.value - 1);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getOrderItemsText = (item) => {
  if (!item?.order) return '-';
  
  const productItems = item.order.product_items || [];
  const jasaItems = item.order.jasa_items || [];
  
  const names = [];
  productItems.forEach(i => {
    if (i.product?.name) names.push(i.product.name);
    else if (i.product?.title) names.push(i.product.title);
  });
  
  jasaItems.forEach(i => {
    if (i.jasa?.title) names.push(i.jasa.title);
    else if (i.jasa?.name) names.push(i.jasa.name);
    else if (i.note) names.push(i.note);
  });
  
  return names.length > 0 ? names.join(', ') : 'Produk / Jasa';
};

const getWaLink = (item) => {
  const phone = item.order?.user?.phone;
  if (!phone) return '#';
  
  let formattedPhone = phone;
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }
  
  const orderCode = item.order?.order_code || item.order_id;
  const amount = formatCurrency(item.amount);
  
  let itemsDetail = '';
  const productItems = item.order?.product_items || [];
  const jasaItems = item.order?.jasa_items || [];
  
  productItems.forEach(i => {
    const name = i.product?.name || i.product?.title || 'Produk';
    itemsDetail += `- ${name} (${i.quantity}x)\n`;
  });
  
  jasaItems.forEach(i => {
    const name = i.jasa?.title || i.jasa?.name || i.note || 'Layanan Jasa';
    itemsDetail += `- ${name} (${i.quantity}x)\n`;
  });

  if (!itemsDetail) {
    itemsDetail = '- Detail tidak tersedia\n';
  }
  
  let text = '';
  
  if (item.refund_status === 'failed') {
    text = `Halo, pesanan Anda dengan detail berikut sedang dalam antrean pengembalian dana (refund):\n\n*ID Pesanan:* ${orderCode}\n*Item Pesanan:*\n${itemsDetail}\n*Total Refund:* ${amount}\n\nKarena metode pembayaran Anda tidak mendukung pengembalian otomatis, mohon informasikan rekening bank / e-wallet tujuan (Nama Bank, Nomor Rekening, dan Nama Pemilik) agar dana dapat segera kami transfer.`;
  } else if (item.refund_status === 'processing') {
    text = `Halo, kami ingin menginformasikan bahwa pengembalian dana (refund) untuk pesanan Anda sedang *diproses* oleh sistem:\n\n*ID Pesanan:* ${orderCode}\n*Item Pesanan:*\n${itemsDetail}\n*Total Refund:* ${amount}\n\nHarap menunggu karena proses transfer atau mutasi mungkin memakan sedikit waktu. Terima kasih atas kesabarannya.`;
  } else if (item.refund_status === 'succeeded') {
    const destinationText = item.refund_destination || item.raw_response?.payment_channel || item.payment_method || 'Tujuan Refund';
    text = `Halo! Kabar baik, pengembalian dana (refund) pesanan Anda telah *berhasil* dikirim oleh sistem:\n\n*ID Pesanan:* ${orderCode}\n*Item Pesanan:*\n${itemsDetail}\n*Total Refund:* ${amount}\n*Tujuan:* ${destinationText}\n\nSilakan cek saldo/mutasi rekening Anda secara berkala (catatan: untuk e-Wallet mungkin butuh antrean dari pihak bank/aplikasi maksimal 1-3 hari kerja). Terima kasih!`;
  } else {
    text = `Halo, terkait pesanan Anda:\n\n*ID Pesanan:* ${orderCode}\n*Item Pesanan:*\n${itemsDetail}\n*Total:* ${amount}`;
  }
  
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};

const fetchRefunds = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      per_page: perPage.value,
      status: currentStatus.value,
      search: searchQuery.value || undefined,
      sort: sortBy.value,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    };
    const { data } = await api.get('/api/admin/refunds', { params });
    refunds.value = data.data.data;
    stats.value = data.stats;
    currentPage.value = data.data.current_page;
    totalPages.value = data.data.last_page;
    totalItems.value = data.data.total;
  } catch (error) {
    toast.error('Gagal mengambil data refund');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  searchQuery.value = '';
  sortBy.value = 'terbaru';
  startDate.value = '';
  endDate.value = '';
};

watch([currentStatus, sortBy, startDate, endDate], () => {
  currentPage.value = 1;
  fetchRefunds();
});

watch(currentPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchRefunds();
  }
});

let searchTimeout;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchRefunds();
  }, 500);
});

const openProcessModal = (item) => {
  selectedItem.value = item;
  form.value = {
    bank_code: '',
    account_number: '',
    account_name: '',
  };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedItem.value = null;
};

const submitRefund = async () => {
  if (!form.value.bank_code || !form.value.account_number || !form.value.account_name) {
    toast.error('Harap lengkapi semua data bank tujuan');
    return;
  }

  submitting.value = true;
  try {
    const { data } = await api.post(`/api/admin/refunds/${selectedItem.value.id}/process`, form.value);
    toast.success(data.message || 'Refund berhasil diproses');
    closeModal();
    fetchRefunds();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal memproses refund');
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

const checkRefundStatus = async (item) => {
  if (syncingId.value) return;
  syncingId.value = item.id;
  try {
    const { data } = await api.post(`/api/admin/refunds/${item.id}/check-status`);
    toast.success(data.message || 'Status berhasil dicek');
    fetchRefunds();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal mengecek status');
    console.error(error);
  } finally {
    syncingId.value = null;
  }
};

onMounted(() => {
  fetchRefunds();
});
</script>
