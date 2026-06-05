<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/libs/axios';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import StatusLabel from '@/components/common/StatusLabel.vue';
import Button from '@/components/common/Button.vue';
import TextField from '@/components/forms/TextField.vue';
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import { getEventBannerUrl } from "@/libs/getImageUrl";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const events = ref([]);
const pagination = ref({});
const searchQuery = ref('');
const statusFilter = ref('');

// Merchant info
const currentMerchantSlug = computed(() => route.params.merchantSlug);
const currentMerchant = computed(() => authStore.getMerchantBySlug(currentMerchantSlug.value));

const breadcrumbItems = computed(() => [
  { label: "Daftar Event & Undangan" },
]);

const currentMerchantName = computed(() => {
  return currentMerchant.value?.name || "UMKM";
});

const resolveEventId = (event) => {
  if (event === null || event === undefined) return null;
  if (typeof event === 'number' || typeof event === 'string') {
    const parsed = Number(event);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const candidate = event?.id ?? event?.event_id ?? event?.event?.id;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const fetchEvents = async (page = 1) => {
  if (!currentMerchantSlug.value) return;
  
  loading.value = true;
  try {
    const response = await api.get(`/api/merchant/${currentMerchantSlug.value}/events`, {
      params: {
        merchant_id: currentMerchant.value?.id,
        page,
        q: searchQuery.value,
        invitation_status: statusFilter.value
      }
    });
    events.value = response.data.data;
    pagination.value = response.data.meta || response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    toast.error('Gagal memuat daftar event');
  } finally {
    loading.value = false;
  }
};

const goToEventDetail = (event) => {
  const eventId = resolveEventId(event);
  if (!eventId) {
    toast.error('ID Event tidak ditemukan');
    return;
  }
  router.push({
    name: 'Merchant - Event Detail',
    params: { merchantSlug: currentMerchantSlug.value, id: eventId }
  });
};

const handleApproval = async (event, status) => {
  const eventId = resolveEventId(event);
  if (!eventId) {
    toast.error('ID Event tidak ditemukan');
    return;
  }
  
  try {
    await api.post(`/api/merchant/${currentMerchantSlug.value}/events/${eventId}`, {
      merchant_id: currentMerchant.value?.id,
      event_id: eventId,
      status: status
    });
    toast.success(`Berhasil ${status === 'accepted' ? 'menyetujui' : 'menolak'} undangan`);
    fetchEvents();
  } catch (error) {
    console.error('Approval error:', error);
    toast.error('Gagal memproses undangan');
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

onMounted(() => {
  fetchEvents();
});

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Menunggu', value: 'pending' },
  { label: 'Disetujui', value: 'accepted' },
  { label: 'Ditolak', value: 'rejected' }
];

const tableColumns = [
  { key: 'event_name', label: 'Nama Event', sortable: false },
  { key: 'period', label: 'Periode', sortable: false },
  { key: 'vouchers_count', label: 'Voucher', sortable: false },
  { key: 'invitation_status', label: 'Status', sortable: false },
  { key: 'actions', label: 'Aksi', sortable: false },
];
</script>

<template>
  <div class="pb-20">
    <!-- Header Section -->
    <div class="px-4 py-6 bg-white sm:px-6 mb-6">
      <div class="flex items-center gap-3">
        <div>
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="currentMerchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Kelola partisipasi event {{ currentMerchantName }}
            </p>
          </div>

          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Daftar Event
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="px-4 sm:px-6 space-y-8">
      <!-- Filters Section -->
      <div class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div class="flex-1">
          <TextField
            name="search_event"
            v-model="searchQuery"
            placeholder="Cari nama event..."
            icon="pi pi-search"
            :hide-label="true"
            @input="fetchEvents(1)"
          />
        </div>
        <div class="w-full md:w-64 relative">
          <select
            v-model="statusFilter"
            @change="fetchEvents(1)"
            class="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-merchant-primary focus:outline-none appearance-none transition-all"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <i class="pi pi-filter absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <i class="pi pi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>
      </div>

      <!-- Desktop View (Table) -->
      <div class="hidden md:block">
        <MerchantTable
          :columns="tableColumns"
          :items="events"
          :loading="loading"
          @row-click="goToEventDetail"
        >
          <template #cell-event_name="{ item }">
            <div class="flex items-center gap-4 py-2">
              <div class="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-gray-50 bg-gray-50">
                <img 
                  v-if="item.banner_img_path" 
                  :src="getEventBannerUrl(item)" 
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-200">
                  <i class="pi pi-image"></i>
                </div>
              </div>
              <div>
                <p class="text-sm font-black text-gray-900 line-clamp-1">{{ item.event_name }}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[200px]">
                  {{ item.event_description || 'No Description' }}
                </p>
              </div>
            </div>
          </template>

          <template #cell-period="{ item }">
            <div class="text-[11px] font-bold text-gray-600">
              <p>{{ formatDate(item.event_start_date) }}</p>
              <p class="text-gray-300">s/d</p>
              <p>{{ formatDate(item.event_end_date) }}</p>
            </div>
          </template>

          <template #cell-vouchers_count="{ item }">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <i class="pi pi-ticket text-xs"></i>
              </div>
              <span class="text-xs font-black text-gray-900">{{ item.vouchers?.length || 0 }}</span>
            </div>
          </template>

          <template #cell-invitation_status="{ item }">
            <StatusLabel :status="item.invitation_status" variant="merchant" />
          </template>

          <template #cell-actions="{ item }">
            <div v-if="item.invitation_status === 'pending'" class="flex items-center gap-3" @click.stop>
              <button
                type="button"
                class="text-emerald-600 hover:text-emerald-700 transition bg-transparent border-0 p-0 focus:outline-none"
                title="Terima Undangan"
                @click.stop="handleApproval(item, 'accepted')"
              >
                <i class="pi pi-check text-base"></i>
              </button>
              <button
                type="button"
                class="text-red-500 hover:text-red-600 transition bg-transparent border-0 p-0 focus:outline-none"
                title="Tolak Undangan"
                @click.stop="handleApproval(item, 'rejected')"
              >
                <i class="pi pi-times text-base"></i>
              </button>
            </div>
            <div v-else class="flex items-center gap-2" @click.stop>
              <button
                type="button"
                class="text-merchant-primary hover:text-merchant-primary/80 transition bg-transparent border-0 p-0 focus:outline-none"
                title="Kelola Produk"
                @click.stop="goToEventDetail(item)"
              >
                <i class="pi pi-cog text-base"></i>
              </button>
            </div>
          </template>
        </MerchantTable>
      </div>

      <!-- Mobile View (Grid) -->
      <div class="md:hidden space-y-4">
        <div v-if="loading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="bg-white p-5 rounded-[2rem] border border-gray-100 animate-pulse h-32"></div>
        </div>
        <div v-else-if="events.length > 0" class="space-y-4">
          <div 
            v-for="event in events" 
            :key="resolveEventId(event) || event.id"
            class="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-4"
            @click="goToEventDetail(event)"
          >
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-gray-50 bg-gray-50">
                 <img v-if="event.banner_img_path" :src="getEventBannerUrl(event)" class="w-full h-full object-cover" />
                 <div v-else class="w-full h-full flex items-center justify-center text-gray-200">
                   <i class="pi pi-image text-xl"></i>
                 </div>
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-black text-gray-900 truncate">{{ event.event_name }}</h4>
                <p class="text-[10px] font-bold text-gray-400">{{ formatDate(event.event_start_date) }} - {{ formatDate(event.event_end_date) }}</p>
                <div class="mt-1">
                  <StatusLabel :status="event.invitation_status" variant="merchant" size="xs" />
                </div>
              </div>
            </div>
            
            <div v-if="event.invitation_status === 'pending'" class="flex gap-2" @click.stop>
               <Button @click.stop="handleApproval(event, 'accepted')" variant="merchant" block size="sm">Terima</Button>
               <Button @click.stop="handleApproval(event, 'rejected')" variant="danger-outline" block size="sm">Tolak</Button>
            </div>
            <Button v-else @click.stop="goToEventDetail(event)" variant="merchant-outline" block size="sm">Kelola Produk</Button>
          </div>
        </div>
        
        <div v-else class="bg-white rounded-[2rem] p-10 text-center border border-gray-100">
           <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">Belum ada event</p>
        </div>
      </div>

      <!-- Pagination Placeholder -->
      <div v-if="pagination.last_page > 1" class="flex justify-center mt-8">
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
