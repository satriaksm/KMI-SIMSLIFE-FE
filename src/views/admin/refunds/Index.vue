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
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <!-- Status Tabs -->
        <template v-if="currentStatus">
          <div class="sm:hidden p-3">
            <select
              :value="currentStatus"
              @change="currentStatus = $event.target.value"
              class="block w-full px-4 py-2.5 bg-white border border-muted-foreground text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-merchant-primary focus:border-merchant-primary shadow-sm"
            >
              <option v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.name }}</option>
            </select>
          </div>

          <div class="hidden sm:flex border-b border-gray-200">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
              :class="
                currentStatus === tab.value
                  ? 'border-merchant-primary text-merchant-primary bg-merchant-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-black hover:border-gray-300'
              "
              @click="currentStatus = tab.value"
              type="button"
            >
              {{ tab.name }}
            </button>
          </div>
        </template>

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
            <span class="font-medium text-gray-900">{{ item.order?.order_code || item.order_id }}</span>
          </template>

          <template #cell-user="{ item }">
            <div class="font-medium text-gray-900">{{ item.order?.user?.name || 'Unknown' }}</div>
            <div class="text-xs text-gray-400">{{ item.order?.user?.email || '-' }}</div>
          </template>

          <template #cell-amount="{ item }">
            <span class="font-medium text-gray-900">{{ formatCurrency(item.amount) }}</span>
          </template>

          <template #cell-invoice="{ item }">
            <a :href="item.xendit_invoice_url" target="_blank" class="text-merchant-primary hover:text-merchant-primary-dark inline-flex items-center gap-1 font-medium bg-merchant-primary/5 px-2 py-1 rounded-md">
              Invoice <i class="pi pi-external-link text-xs"></i>
            </a>
          </template>

          <template #cell-actions="{ item }">
            <button
              v-if="item.refund_status === 'failed'"
              @click="openProcessModal(item)"
              class="text-merchant-primary hover:text-merchant-primary-dark font-semibold text-sm"
            >
              Proses Refund
            </button>
            <span v-else-if="item.refund_status === 'succeeded'" class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Selesai
            </span>
            <span v-else-if="item.refund_status === 'processing'" class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
              Processing
            </span>
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
        
        <form @submit.prevent="submitRefund" class="space-y-4">
          <div>
            <label for="bank_code" class="block text-sm font-medium leading-6 text-gray-900">Kode Bank / E-Wallet</label>
            <div class="mt-2">
              <select id="bank_code" v-model="form.bank_code" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:max-w-xs sm:text-sm sm:leading-6">
                <option value="" disabled>Pilih Bank</option>
                <option value="BCA">BCA</option>
                <option value="MANDIRI">Mandiri</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="PERMATA">Permata</option>
                <option value="CIMB">CIMB Niaga</option>
                <option value="OVO">OVO</option>
                <option value="DANA">DANA</option>
                <option value="SHOPEEPAY">ShopeePay</option>
                <option value="LINKAJA">LinkAja</option>
              </select>
            </div>
          </div>

          <div>
            <label for="account_number" class="block text-sm font-medium leading-6 text-gray-900">Nomor Rekening</label>
            <div class="mt-2">
              <input type="text" id="account_number" v-model="form.account_number" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <label for="account_name" class="block text-sm font-medium leading-6 text-gray-900">Nama Pemilik Rekening</label>
            <div class="mt-2">
              <input type="text" id="account_name" v-model="form.account_name" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
            </div>
          </div>
        </form>
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
import ResponsiveModal from '@/components/common/ResponsiveModal.vue';
import AdminTable from '@/components/common/AdminTable.vue';
import Button from '@/components/common/Button.vue';
import Breadcrumb from '@/components/merchant/Breadcrumb.vue';
import api from '@/libs/axios';
import { useToast } from 'vue-toastification';

const emit = defineEmits(["toggle-sidebar"]);

const breadcrumbItems = computed(() => {
  return [
    { label: "Manajemen Refund", path: { name: "Admin - Refunds" } }
  ];
});

const toast = useToast();

const tabs = [
  { name: 'Butuh Manual (Failed)', value: 'failed' },
  { name: 'Sedang Diproses (Processing)', value: 'processing' },
  { name: 'Berhasil (Succeeded)', value: 'succeeded' },
];

const currentStatus = ref('failed');
const refunds = ref([]);
const loading = ref(true);
const submitting = ref(false);

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
  { key: "invoice", label: "Invoice Xendit", sortable: false },
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

const fetchRefunds = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/api/admin/refunds', {
      params: {
        status: currentStatus.value,
        page: currentPage.value,
        per_page: perPage.value,
      },
    });
    refunds.value = data.data.data;
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

watch([currentStatus, currentPage], () => {
  if (currentStatus.value !== tabs.find(t => t.value === currentStatus.value)?.value) {
    currentPage.value = 1;
  }
  fetchRefunds();
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

onMounted(() => {
  fetchRefunds();
});
</script>
