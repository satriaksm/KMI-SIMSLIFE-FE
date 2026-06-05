<script setup>
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/libs/axios";
import { formatDateID } from "@/libs/format";
import ProductCard from "@/components/Card/ProductCard.vue";
import ProductCardSkeleton from "@/components/Card/ProductCardSkeleton.vue";
import { useToast } from "vue-toastification";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const event = ref(null);
const products = ref([]);
const loading = ref(true);
const loadingProducts = ref(false);

const formatIDR = (v) =>
  Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });

const fetchEventDetail = async () => {
  try {
    loading.value = true;
    const response = await api.get(`/api/public/events/${route.params.id}`);
    event.value = response.data.data;
  } catch (error) {
    console.error("Error fetching event detail:", error);
    toast.error("Gagal memuat detail event");
  } finally {
    loading.value = false;
  }
};

const copyVoucher = async (code) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Kode voucher disalin!");
  } catch (err) {
    toast.error("Gagal menyalin kode");
  }
};

const goToMerchant = (slug) => {
  router.push({ name: "Merchant Detail", params: { slug } });
};

const handleShare = async () => {
  const shareData = {
    title: event.value?.event_name || 'Event Seru di SUMILIR',
    text: event.value?.event_description || 'Cek event menarik ini di SUMILIR Banyuanyar!',
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link berhasil disalin!");
    }
  } catch (err) {
    console.error("Share failed:", err);
  }
};

const showAllVouchers = ref(false);
const displayedVouchers = computed(() => {
  if (!event.value?.vouchers) return [];
  return showAllVouchers.value 
    ? event.value.vouchers 
    : event.value.vouchers.slice(0, 2);
});

onMounted(() => {
  fetchEventDetail();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-32">
    <!-- Header Navigation -->
    <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button 
            @click="router.back()"
            class="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-primary transition-all"
          >
            <i class="pi pi-arrow-left text-sm"></i>
          </button>
          <h2 class="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">
            {{ loading ? 'Memuat Detail Event...' : event?.event_name }}
          </h2>
        </div>
        <button 
          @click="handleShare"
          class="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-primary transition-all"
        >
          <i class="pi pi-share-alt text-sm"></i>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="max-w-4xl mx-auto px-4 mt-8 space-y-8">
      <div class="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 animate-pulse">
        <div class="aspect-[21/9] bg-gray-100"></div>
        <div class="p-8 space-y-4">
          <div class="h-4 bg-gray-100 rounded w-32"></div>
          <div class="h-8 bg-gray-100 rounded w-3/4"></div>
          <div class="h-4 bg-gray-100 rounded w-full"></div>
          <div class="h-4 bg-gray-100 rounded w-full"></div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="event" class="max-w-5xl mx-auto px-4 -mt-16 relative z-10 space-y-12">
      <!-- Premium Banner Card -->
      <div class="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-gray-200/50 border border-gray-100 group">
        <div class="aspect-[21/9] relative overflow-hidden bg-gray-50">
          <img 
            :src="event.banner_url" 
            :alt="event.event_name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <!-- Glass Overlay for Date -->
          <div class="absolute bottom-6 left-8">
             <div class="flex items-center gap-2 px-5 py-2.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 text-white text-xs font-black uppercase tracking-widest shadow-xl">
              <i class="pi pi-calendar text-xs text-primary"></i>
              <span>{{ formatDateID(event.event_start_date) }} — {{ formatDateID(event.event_end_date) }}</span>
            </div>
          </div>
          
          <!-- Status Badge -->
          <div class="absolute top-6 right-8">
            <div class="px-4 py-2 bg-primary/90 backdrop-blur-md rounded-2xl text-white text-[10px] font-black uppercase tracking-tighter shadow-lg">
              Live Now
            </div>
          </div>
        </div>
        
        <div class="p-10 sm:p-12">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h1 class="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-[1.1]">
              {{ event.event_name }}
            </h1>
          </div>
          
          <div class="prose prose-lg max-w-none text-gray-500 leading-relaxed whitespace-pre-wrap font-medium">
            {{ event.event_description }}
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-10 border-t border-gray-50">
            <div class="text-center p-4 rounded-3xl bg-gray-50/50 border border-gray-50">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Merchant</p>
              <p class="text-xl font-black text-gray-900">{{ event.merchants?.length || 0 }}</p>
            </div>
            <div class="text-center p-4 rounded-3xl bg-gray-50/50 border border-gray-50">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Voucher</p>
              <p class="text-xl font-black text-gray-900">{{ event.vouchers?.length || 0 }}</p>
            </div>
            <div class="text-center p-4 rounded-3xl bg-gray-50/50 border border-gray-50">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Produk</p>
              <p class="text-xl font-black text-gray-900">{{ event.products?.length || 0 }}</p>
            </div>
            <div class="text-center p-4 rounded-3xl bg-gray-50/50 border border-gray-50">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hari Lagi</p>
              <p class="text-xl font-black text-primary">
                {{ Math.max(0, Math.ceil((new Date(event.event_end_date) - new Date()) / (1000 * 60 * 60 * 24))) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Vouchers Section -->
      <div v-if="event.vouchers?.length > 0" class="space-y-8">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-black text-gray-900 flex items-center gap-4">
            <span class="w-2.5 h-10 bg-primary rounded-full"></span>
            Klaim Voucher Spesial
          </h3>
        </div>
        
        <div class="grid gap-6 sm:grid-cols-2">
          <div 
            v-for="voucher in displayedVouchers" 
            :key="voucher.id"
            class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex gap-6 relative group hover:border-primary/20 hover:shadow-xl transition-all duration-500 overflow-hidden"
          >
            <!-- Decorative Background Element -->
            <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>

            <!-- Ticket Notches -->
            <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-50 border-r border-gray-100 rounded-full"></div>
            <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-50 border-l border-gray-100 rounded-full"></div>

            <div class="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 border border-primary/10">
              <i class="pi pi-ticket text-4xl text-primary"></i>
            </div>
            
            <div class="min-w-0 flex-1 flex flex-col justify-center">
              <div class="flex items-start justify-between mb-2">
                <h4 class="text-lg font-black text-gray-900 truncate tracking-tight">{{ voucher.voucher_name }}</h4>
                <div class="px-3 py-1 bg-primary/10 text-primary text-[11px] font-black rounded-xl uppercase shrink-0">
                   {{ voucher.voucher_type === 'percent' ? `-${voucher.value}%` : `-${formatIDR(voucher.value)}` }}
                </div>
              </div>
              
              <div class="flex items-center gap-3">
                <div class="text-xs font-mono font-black text-primary bg-primary/5 px-3 py-2 rounded-xl border border-primary/10 uppercase tracking-widest shadow-sm">
                  {{ voucher.voucher_code }}
                </div>
                <button 
                  @click="copyVoucher(voucher.voucher_code)"
                  class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <i class="pi pi-copy text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Show More/Less Button for Vouchers -->
        <div v-if="event.vouchers.length > 2" class="flex justify-center mt-8">
          <button 
            @click="showAllVouchers = !showAllVouchers"
            class="px-8 py-3 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2 group"
          >
            {{ showAllVouchers ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Lebih Banyak' }}
            <i class="pi transition-transform duration-300" :class="[showAllVouchers ? 'pi-chevron-up' : 'pi-chevron-down', 'group-hover:-translate-y-0.5']"></i>
          </button>
        </div>
      </div>

      <!-- Products Section -->
      <div class="space-y-8">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-black text-gray-900 flex items-center gap-4">
            <span class="w-2.5 h-10 bg-primary rounded-full"></span>
            Produk Terkait Event
          </h3>
        </div>

        <div v-if="event.products?.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <ProductCard 
            v-for="product in event.products" 
            :key="product.id" 
            :product="product"
          />
        </div>
        
        <!-- Empty State for Products -->
        <div v-else class="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
          <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i class="pi pi-shopping-bag text-3xl text-gray-300"></i>
          </div>
          <h4 class="text-xl font-black text-gray-900 mb-2">Belum Ada Produk Diskon</h4>
          <p class="text-gray-500 max-w-sm mx-auto">Saat ini belum ada produk yang terhubung dengan voucher event ini. Silakan cek kembali nanti!</p>
        </div>
      </div>

      <!-- Participating Merchants -->
      <div v-if="event.merchants?.length > 0" class="space-y-8">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-black text-gray-900 flex items-center gap-4">
            <span class="w-2.5 h-10 bg-primary rounded-full"></span>
            Merchant Terdaftar
          </h3>
        </div>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div 
            v-for="merchant in event.merchants" 
            :key="merchant.id"
            @click="goToMerchant(merchant.slug)"
            class="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center cursor-pointer group"
          >
            <div class="relative w-20 h-20 mx-auto mb-4 p-1 rounded-full border-2 border-gray-50 group-hover:border-primary/30 transition-all overflow-hidden bg-white">
              <img 
                v-if="merchant.logo_url" 
                :src="merchant.logo_url" 
                :alt="merchant.name"
                class="w-full h-full object-cover rounded-full"
              />
              <div v-else class="w-full h-full bg-gray-50 flex items-center justify-center rounded-full">
                <i class="pi pi-shop text-gray-300 text-2xl"></i>
              </div>
            </div>
            <h4 class="text-sm font-black text-gray-900 truncate group-hover:text-primary transition-colors">
              {{ merchant.name }}
            </h4>
            <p class="text-[10px] text-gray-400 font-bold mt-1 group-hover:text-gray-500">Lihat Toko <i class="pi pi-arrow-right ml-1"></i></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-primary {
  color: #10b981;
}
.bg-primary {
  background-color: #10b981;
}
.bg-primary\/5 {
  background-color: rgba(16, 185, 129, 0.05);
}
.bg-primary\/10 {
  background-color: rgba(16, 185, 129, 0.1);
}
.border-primary\/20 {
  border-color: rgba(16, 185, 129, 0.2);
}
.border-primary\/10 {
  border-color: rgba(16, 185, 129, 0.1);
}

/* Custom shadow for premium feel */
.shadow-sm {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}
</style>
