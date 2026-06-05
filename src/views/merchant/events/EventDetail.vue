<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/libs/axios';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import StatusLabel from '@/components/common/StatusLabel.vue';
import Button from '@/components/common/Button.vue';
import ResponsiveModal from '@/components/common/ResponsiveModal.vue';
import TextField from '@/components/forms/TextField.vue';

import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import { getEventBannerUrl } from "@/libs/getImageUrl";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const event = ref(null);
const vouchers = ref([]);
const merchantProducts = ref([]);
const loadingProducts = ref(false);

// Selection state
const selectedVoucher = ref(null);
const showProductModal = ref(false);
const selectedProductIds = ref([]);
const searchQuery = ref('');
const voucherProductCounts = ref({});

const currentMerchantSlug = computed(() => route.params.merchantSlug);
const currentMerchant = computed(() => authStore.getMerchantBySlug(currentMerchantSlug.value));

const breadcrumbItems = computed(() => [
  { 
    label: "Daftar Event", 
    route: { name: 'Merchant - Event Index', params: { merchantSlug: currentMerchantSlug.value } } 
  },
  { label: "Detail Event" },
]);

const currentMerchantName = computed(() => {
  return currentMerchant.value?.name || "UMKM";
});

const merchantInitials = computed(() => {
  const name = String(currentMerchantName.value || "").trim();
  if (!name) return "M";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "M";
});

const normalizeProductId = (id) => {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
};

const isProductSelected = (id) => {
  const normalized = normalizeProductId(id);
  return normalized !== null && selectedProductIds.value.includes(normalized);
};

const getProductImageUrl = (product) => {
  return (
    product?.cover_image?.src_url ||
    product?.cover_image_url ||
    product?.cover_image?.url ||
    product?.image_url ||
    null
  );
};

const filteredProducts = computed(() => {
  if (!searchQuery.value) return merchantProducts.value;
  const q = searchQuery.value.toLowerCase();
  return merchantProducts.value.filter((p) =>
    p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
  );
});

const filteredProductIds = computed(() =>
  filteredProducts.value
    .map((product) => normalizeProductId(product.id))
    .filter((id) => id !== null),
);

const allFilteredSelected = computed(() => {
  if (!filteredProductIds.value.length) return false;
  return filteredProductIds.value.every((id) =>
    selectedProductIds.value.includes(id),
  );
});

const toggleSelectAll = () => {
  if (!filteredProductIds.value.length) return;
  if (allFilteredSelected.value) {
    selectedProductIds.value = selectedProductIds.value.filter(
      (id) => !filteredProductIds.value.includes(id),
    );
    return;
  }
  const next = new Set(selectedProductIds.value);
  filteredProductIds.value.forEach((id) => next.add(id));
  selectedProductIds.value = Array.from(next);
};

const fetchVoucherProductCounts = async () => {
  if (!currentMerchantSlug.value || vouchers.value.length === 0) {
    voucherProductCounts.value = {};
    return;
  }

  const results = await Promise.all(
    vouchers.value.map(async (voucher) => {
      try {
        const response = await api.get(
          `/api/merchant/${currentMerchantSlug.value}/vouchers/${voucher.id}/restricted-products`,
          { params: { merchant_id: currentMerchant.value?.id } },
        );
        const restricted = response.data?.data ?? response.data ?? [];
        return [voucher.id, restricted.length];
      } catch {
        return [voucher.id, 0];
      }
    }),
  );

  const counts = {};
  results.forEach(([id, count]) => {
    counts[id] = count;
  });
  voucherProductCounts.value = counts;
};

const fetchEventDetail = async () => {
  if (!currentMerchantSlug.value) return;
  
  loading.value = true;
  try {
    const response = await api.get(`/api/merchant/${currentMerchantSlug.value}/events/${route.params.id}`, {
      params: { merchant_id: currentMerchant.value?.id }
    });
    const eventData = response.data?.data ?? response.data;
    event.value = eventData;
    vouchers.value = eventData?.vouchers || [];
    await fetchVoucherProductCounts();
  } catch (error) {
    console.error('Error fetching event detail:', error);
    toast.error('Gagal memuat detail event');
    router.push({ name: 'Merchant - Event Index' });
  } finally {
    loading.value = false;
  }
};

const fetchMerchantProducts = async () => {
  if (!currentMerchantSlug.value) return;
  
  loadingProducts.value = true;
  try {
    const response = await api.get(`/api/merchant/${currentMerchantSlug.value}/products`, {
      params: { 
        merchant_id: currentMerchant.value?.id,
        per_page: 100 // Get many for selection
      }
    });
    merchantProducts.value = response.data?.data ?? response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    loadingProducts.value = false;
  }
};

const openProductManagement = async (voucher) => {
  selectedVoucher.value = voucher;
  selectedProductIds.value = [];
  showProductModal.value = true;
  
  // Fetch currently linked products for this voucher
  try {
    const response = await api.get(`/api/merchant/${currentMerchantSlug.value}/vouchers/${voucher.id}/restricted-products`, {
      params: { merchant_id: currentMerchant.value?.id }
    });
    const restricted = response.data?.data ?? response.data ?? [];
    selectedProductIds.value = restricted
      .map((product) => normalizeProductId(product.id))
      .filter((id) => id !== null);
    voucherProductCounts.value = {
      ...voucherProductCounts.value,
      [voucher.id]: selectedProductIds.value.length,
    };
  } catch (error) {
    console.error('Error fetching restricted products:', error);
  }
};

const handleSaveProducts = async () => {
  if (!selectedVoucher.value || !currentMerchantSlug.value) return;
  
  try {
    await api.post(`/api/merchant/${currentMerchantSlug.value}/vouchers/${selectedVoucher.value.id}/restricted-products`, {
      merchant_id: currentMerchant.value?.id,
      product_ids: selectedProductIds.value
    });
    toast.success('Daftar produk berhasil diperbarui');
    showProductModal.value = false;
    voucherProductCounts.value = {
      ...voucherProductCounts.value,
      [selectedVoucher.value.id]: selectedProductIds.value.length,
    };
  } catch (error) {
    console.error('Error saving products:', error);
    toast.error('Gagal memperbarui produk');
  }
};

const toggleProduct = (productId) => {
  const normalized = normalizeProductId(productId);
  if (normalized === null) return;
  const index = selectedProductIds.value.indexOf(normalized);
  if (index > -1) {
    selectedProductIds.value.splice(index, 1);
  } else {
    selectedProductIds.value.push(normalized);
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val);
};

onMounted(() => {
  fetchEventDetail();
  fetchMerchantProducts();
});
</script>

<template>
  <div class="pb-20">
    <!-- Header Section - CONSISTENT WITH PRODUCTS -->
    <div class="px-4 py-6 bg-white sm:px-6 mb-6">
      <div class="flex items-center gap-3">
        <div>
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="currentMerchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Pengaturan produk untuk event
            </p>
          </div>

          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Detail Event
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
      <!-- Main Content Skeleton -->
      <div v-if="loading" class="space-y-8">
         <div class="h-48 bg-gray-50 rounded-[3rem] animate-pulse"></div>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div v-for="i in 2" :key="i" class="h-64 bg-gray-50 rounded-[2.5rem] animate-pulse"></div>
         </div>
      </div>

    <div v-else class="space-y-12">
      <!-- Premium Banner Card -->
      <div v-if="event?.banner_img_path" class="w-full aspect-[21/7] rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm relative group">
        <img 
          :src="getEventBannerUrl(event)" 
          :alt="event.event_name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        <div class="absolute bottom-8 left-8">
           <div class="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-white text-[10px] font-black uppercase tracking-widest">
              Live Event Period
           </div>
        </div>
      </div>

      <!-- Description Card -->
      <div class="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-merchant-primary/5 rounded-full blur-3xl group-hover:bg-merchant-primary/10 transition-colors"></div>
        <h3 class="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
          <span class="w-2 h-8 bg-merchant-primary rounded-full"></span>
          Informasi Event
        </h3>
        <p class="text-gray-500 font-medium leading-relaxed whitespace-pre-wrap">
          {{ event?.event_description || 'Tidak ada deskripsi tersedia.' }}
        </p>
      </div>

      <!-- Vouchers List -->
      <div class="space-y-8">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-black text-gray-900 flex items-center gap-4">
            <span class="w-2.5 h-10 bg-merchant-primary rounded-full"></span>
            Voucher Event & Pengaturan Produk
          </h3>
        </div>

        <div v-if="vouchers.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div 
            v-for="voucher in vouchers" 
            :key="voucher.id"
            class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div class="flex items-start justify-between mb-8">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                  <i class="pi pi-ticket text-xl"></i>
                </div>
                <div>
                  <h4 class="text-lg font-black text-gray-900">{{ voucher.voucher_code }}</h4>
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ voucher.voucher_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-2xl font-black text-merchant-primary leading-none">
                   {{ voucher.voucher_type === 'percent' ? `${voucher.value}%` : formatCurrency(voucher.value) }}
                </p>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Potongan Harga</p>
              </div>
            </div>

            <div class="bg-gray-50/50 rounded-3xl p-6 border border-gray-50 mb-8">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-gray-600">Status Produk</p>
                <span class="px-3 py-1 bg-white border border-gray-100 rounded-xl text-xs font-black text-merchant-primary shadow-sm">
                   {{ voucherProductCounts[voucher.id] ?? 0 }} Produk
                </span>
              </div>
              <p class="text-xs text-gray-500 font-semibold">
                Produk terdaftar: {{ voucherProductCounts[voucher.id] ?? 0 }}
              </p>
              <p class="mt-1 text-xs text-gray-400 font-medium">Klik tombol di bawah untuk menentukan produk mana saja yang bisa menggunakan voucher ini.</p>
            </div>

            <Button 
              @click="openProductManagement(voucher)"
              variant="merchant" 
              block 
              size="lg"
              class="rounded-2xl"
            >
              <i class="pi pi-cog mr-2"></i>
              Atur Produk Berdiskon
            </Button>
          </div>
        </div>

        <div v-else class="bg-gray-50 rounded-[2.5rem] p-12 text-center border border-gray-200 border-dashed">
           <i class="pi pi-ticket text-4xl text-gray-200 mb-4"></i>
           <p class="text-gray-400 font-bold uppercase tracking-widest text-sm">Tidak ada voucher yang tersedia untuk event ini.</p>
        </div>
      </div>
    </div>

    <!-- Product Selection Modal -->
    <ResponsiveModal
      :show="showProductModal"
      @close="showProductModal = false"
      title="Pilih Produk untuk Voucher"
    >
      <div class="p-2 space-y-6">
        <div class="bg-merchant-primary/5 p-6 rounded-3xl border border-merchant-primary/10 mb-2">
           <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-merchant-primary">
                 <i class="pi pi-ticket text-xl"></i>
              </div>
              <div>
                 <h4 class="font-black text-gray-900">{{ selectedVoucher?.voucher_code }}</h4>
                 <p class="text-xs font-medium text-gray-500">Pilih produk yang akan mendapatkan diskon dari voucher ini.</p>
              </div>
           </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div class="flex-1">
            <TextField
              name="search_product"
              v-model="searchQuery"
              placeholder="Cari nama produk atau SKU..."
              icon="pi pi-search"
              :hide-label="true"
            />
          </div>
          <Button
            variant="muted-outline"
            size="sm"
            :disabled="filteredProducts.length === 0"
            customClass="!rounded-xl !px-4"
            @click="toggleSelectAll"
          >
            {{ allFilteredSelected ? 'Batalkan Pilihan' : 'Pilih Semua' }}
          </Button>
        </div>

        <div class="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          <div v-if="loadingProducts" class="py-10 text-center">
            <i class="pi pi-spin pi-spinner text-3xl text-merchant-primary animate-spin"></i>
          </div>
          <div v-else-if="filteredProducts.length === 0" class="py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            Tidak ada produk ditemukan
          </div>
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            @click="toggleProduct(product.id)"
            class="flex items-center gap-4 p-4 border rounded-3xl cursor-pointer transition-all hover:bg-gray-50 group"
            :class="isProductSelected(product.id) ? 'border-merchant-primary bg-merchant-primary/5 ring-1 ring-merchant-primary' : 'border-gray-100'"
          >
            <div class="relative w-6 h-6 flex items-center justify-center shrink-0">
               <div class="w-full h-full border-2 border-gray-300 rounded-lg bg-white group-hover:border-merchant-primary transition-all flex items-center justify-center"
                    :class="{'bg-merchant-primary border-merchant-primary': isProductSelected(product.id)}">
                 <i class="pi pi-check text-[10px] text-white opacity-0" :class="{'opacity-100': isProductSelected(product.id)}"></i>
                </div>
            </div>
            
             <div class="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-gray-100 bg-white">
               <img v-if="getProductImageUrl(product)" :src="getProductImageUrl(product)" class="w-full h-full object-cover" />
               <div v-else class="w-full h-full flex items-center justify-center bg-merchant-primary/10 text-merchant-primary font-black text-xl">
                  {{ currentMerchantName?.charAt(0)?.toUpperCase() || 'M' }}
               </div>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-black text-gray-900 truncate">{{ product.name }}</p>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{{ product.sku || 'No SKU' }} • {{ formatCurrency(product.price) }}</p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-4 p-2">
          <Button @click="showProductModal = false" variant="secondary" block>Batal</Button>
          <Button @click="handleSaveProducts" variant="merchant" block>Simpan Perubahan ({{ selectedProductIds.length }})</Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
