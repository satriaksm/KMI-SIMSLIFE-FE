<template>
  <div class="min-h-screen bg-gray-50 pb-6">
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6 shadow-sm border-b border-gray-100"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 rounded-full sm:hidden hover:bg-gray-100"
        >
          <i class="pi pi-bars"></i>
        </button>
        <div>
          <Breadcrumb :items="breadcrumbItems" :merchantId="currentMerchantSlug" />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Kelola dan pantau ulasan dari pelanggan untuk semua segmen usaha Anda.
          </p>
        </div>
      </div>
    </div>

    <div class="h-24 sm:h-0"></div>

    <!-- Content -->
    <div class="px-4 sm:px-6 max-w-7xl mx-auto mt-6">
      <!-- Segmentation Category Tabs -->
      <div v-if="categories.length > 1" class="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-1 overflow-x-auto scrollbar-hide border border-gray-100">
        <button
          v-for="cat in categories"
          :key="cat.value"
          @click="selectCategory(cat.value)"
          :class="[
            'flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-200',
            selectedCategory === cat.value
              ? 'bg-merchant-primary text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          ]"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 mb-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="relative flex-1">
            <i class="absolute left-3.5 top-3.5 pi pi-search text-gray-400 text-sm"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari ulasan berdasarkan isi komentar atau nama pelanggan..."
              class="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/20 focus:border-merchant-primary transition-all"
            />
          </div>

          <!-- Rating Star Filter -->
          <div class="flex gap-1.5 flex-wrap items-center">
            <span class="text-xs font-medium text-gray-500 mr-1">Filter Bintang:</span>
            <button
              @click="selectedRating = null"
              :class="[
                'px-3 py-2 text-xs font-semibold rounded-lg transition-all',
                selectedRating === null
                  ? 'bg-merchant-primary/10 text-merchant-primary'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              ]"
            >
              Semua ({{ totalReviews }})
            </button>
            <button
              v-for="star in [5, 4, 3, 2, 1]"
              :key="star"
              @click="selectedRating = star"
              :class="[
                'px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
                selectedRating === star
                  ? 'bg-merchant-primary/10 text-merchant-primary'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              ]"
            >
              {{ star }} <i class="pi pi-star-fill text-[10px] text-amber-400"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <p class="text-sm text-red-700 flex items-center gap-2">
          <i class="pi pi-exclamation-circle"></i> {{ error }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="p-6 bg-white border border-gray-100 rounded-2xl animate-pulse">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>

      <!-- Reviews List -->
      <div v-else class="space-y-4">
        <div
          v-if="filteredReviews.length === 0"
          class="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm"
        >
          <i class="pi pi-inbox text-6xl text-gray-200 mb-4 block"></i>
          <p class="text-gray-500 font-semibold text-sm">Tidak ada ulasan yang sesuai kriteria filter Anda</p>
        </div>

        <div
          v-for="review in filteredReviews"
          :key="review.id"
          class="p-6 bg-white border border-gray-100 shadow-xs rounded-2xl hover:shadow-md transition-all duration-300"
        >
          <!-- Review Card Header -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
            <div class="flex items-start gap-3">
              <!-- Avatar placeholder -->
              <div class="w-10 h-10 rounded-full bg-linear-to-tr from-merchant-primary/20 to-merchant-primary/5 flex items-center justify-center text-merchant-primary font-bold text-sm shrink-0 border border-merchant-primary/10">
                {{ getReviewerInitial(review) }}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="text-sm font-bold text-gray-900">{{ getReviewerName(review) }}</h4>
                  <span v-if="review.is_anonymous" class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    <i class="pi pi-eye-slash text-[8px] mr-0.5"></i>Anonim
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-merchant-primary/5 text-merchant-primary font-semibold">
                    {{ review.rateable?.title || review.rateable?.name || "Produk/Jasa" }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="flex gap-0.5">
                    <i
                      v-for="i in 5"
                      :key="i"
                      class="text-xs"
                      :class="i <= review.rating ? 'pi pi-star-fill text-amber-400' : 'pi pi-star text-gray-200'"
                    ></i>
                  </span>
                  <span class="text-xs text-gray-400">{{ formatDate(review.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="text-right sm:self-start">
              <span class="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">{{ review.rating }}.0 / 5.0</span>
            </div>
          </div>

          <!-- Review Title -->
          <div v-if="review.title" class="mb-2">
            <p class="text-sm font-bold text-gray-900">{{ review.title }}</p>
          </div>

          <!-- Review Comment -->
          <div class="mb-3 text-sm text-gray-700 leading-relaxed">
            <p class="whitespace-pre-line">{{ review.comment }}</p>
          </div>

          <!-- Media Attachments (Photos/Videos) -->
          <div v-if="review.media && review.media.length > 0" class="flex gap-2 mb-4 overflow-x-auto py-1">
            <div
              v-for="media in review.media"
              :key="media.id"
              class="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-100 group"
            >
              <img
                v-if="media.file_type === 'image'"
                :src="getReviewMediaUrl(media)"
                class="object-cover w-full h-full hover:scale-110 transition-transform duration-300 cursor-pointer"
                @click="openMediaWindow(getReviewMediaUrl(media))"
              />
              <video
                v-else
                :src="getReviewMediaUrl(media)"
                class="object-cover w-full h-full cursor-pointer"
                @click="openMediaWindow(getReviewMediaUrl(media))"
              ></video>
              <span v-if="media.file_type === 'video'" class="absolute bottom-1 right-1 bg-black/60 rounded-full p-1 text-[8px] text-white flex items-center justify-center">
                <i class="pi pi-play"></i>
              </span>
            </div>
          </div>

          <!-- Revision Badges and Times -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 p-3 bg-gray-50 rounded-xl text-[10px] text-gray-500 border border-gray-100">
            <div>
              <span class="text-gray-400 block uppercase tracking-wider font-semibold">Ulasan Dibuat</span>
              <span class="font-medium text-gray-800">{{ review.created_date || formatDate(review.created_at) }} <span class="text-gray-400">{{ review.created_time || '' }}</span></span>
            </div>
            <div v-if="review.review_updated_at || review.update_count > 0">
              <span class="text-amber-600 block uppercase tracking-wider font-semibold">Ulasan Diperbarui</span>
              <span class="font-medium text-gray-800">{{ review.updated_date || formatDate(review.review_updated_at) }} <span class="text-gray-400">{{ review.updated_time || '' }}</span></span>
            </div>
            <div v-if="review.merchant_reply">
              <span class="text-green-600 block uppercase tracking-wider font-semibold">Tanggapan Dikirim</span>
              <span class="font-medium text-gray-800">{{ review.replied_date || formatDate(review.merchant_reply_at) }} <span class="text-gray-400">{{ review.replied_time || '' }}</span></span>
            </div>
          </div>

          <!-- Merchant Reply Container -->
          <div v-if="review.merchant_reply" class="mt-4 p-4 bg-green-50/50 border border-green-100 rounded-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-24 h-24 bg-green-100/20 rounded-full -mr-8 -mt-8 flex items-center justify-center">
              <i class="pi pi-check-circle text-4xl text-green-500/20"></i>
            </div>
            <div class="flex items-center gap-2 mb-1.5 relative">
              <i class="pi pi-reply text-green-600"></i>
              <p class="text-xs font-bold text-green-700">Tanggapan Toko Anda</p>
            </div>
            <p class="text-sm text-gray-700 whitespace-pre-wrap relative leading-relaxed">{{ review.merchant_reply }}</p>
          </div>

          <!-- Expanded Review History (Additive & premium) -->
          <div v-if="hasReviewHistory(review)" class="mt-3">
            <button
              @click="toggleReviewHistory(review.id)"
              class="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
            >
              <i :class="['pi text-[10px]', expandedReviewIds.includes(review.id) ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
              {{ expandedReviewIds.includes(review.id) ? 'Sembunyikan' : 'Lihat' }} Riwayat Perubahan Ulasan ({{ getReviewHistories(review).length }})
            </button>

            <div v-if="expandedReviewIds.includes(review.id)" class="mt-3 space-y-3 pl-4 border-l-2 border-amber-200">
              <div
                v-for="(history, index) in getReviewHistories(review)"
                :key="history.id || index"
                class="p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-xs space-y-2 leading-relaxed"
              >
                <!-- Before -->
                <div>
                  <p class="font-bold text-gray-400 uppercase text-[9px] tracking-wider mb-1">Sebelum Perubahan</p>
                  <div class="flex items-center gap-1 mb-1">
                    <i
                      v-for="star in 5"
                      :key="'old-' + star"
                      class="pi text-[9px]"
                      :class="star <= Number(history.old_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-200'"
                    ></i>
                  </div>
                  <p v-if="history.old_comment" class="text-gray-600 italic">"{{ history.old_comment }}"</p>
                </div>

                <div class="flex justify-center py-1">
                  <i class="pi pi-arrow-down text-gray-300 text-xs"></i>
                </div>

                <!-- After -->
                <div>
                  <p class="font-bold text-merchant-primary uppercase text-[9px] tracking-wider mb-1">Sesudah Perubahan</p>
                  <div class="flex items-center gap-1 mb-1">
                    <i
                      v-for="star in 5"
                      :key="'new-' + star"
                      class="pi text-[9px]"
                      :class="star <= Number(history.new_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-200'"
                    ></i>
                  </div>
                  <p v-if="history.new_comment" class="text-gray-700 font-medium">"{{ history.new_comment }}"</p>
                </div>

                <!-- History date -->
                <p class="text-[9px] text-gray-400">
                  Diperbarui pada: {{ formatDate(history.created_at) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons / Tanggapi -->
          <div class="flex gap-2 mt-4 pt-4 border-t border-gray-50" v-if="!review.merchant_reply">
            <button
              @click="openReplyModal(review.id)"
              class="px-4 py-2 text-xs font-bold text-white bg-merchant-primary hover:bg-merchant-primary/95 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <i class="pi pi-reply"></i> Berikan Tanggapan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pager / Pagination if needed (handled simply) -->

    <!-- Responsive Reply Modal -->
    <ResponsiveModal
      v-model:show="showReplyModal"
      title="Tanggapi Ulasan Pelanggan"
      @close="showReplyModal = false"
    >
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tanggapan Toko Anda</label>
          <textarea
            v-model="replyMessage"
            rows="5"
            placeholder="Tulis tanggapan yang sopan untuk pelanggan Anda..."
            class="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/20 focus:border-merchant-primary transition-all"
            maxlength="1000"
          ></textarea>
          <div class="flex justify-between mt-1 text-[11px] text-gray-400">
            <span>Tanggapan hanya dapat dikirim 1 kali dan tidak dapat diubah kembali.</span>
            <span>{{ replyMessage.length }}/1000</span>
          </div>
        </div>

        <div class="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="muted-outline"
            @click="showReplyModal = false"
            customClass="flex-1 rounded-xl py-2.5"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            @click="submitReply"
            :loading="replying"
            :disabled="!replyMessage.trim()"
            customClass="flex-1 bg-merchant-primary hover:bg-merchant-primary/95 text-white rounded-xl py-2.5"
          >
            Kirim Tanggapan
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import Button from "@/components/common/Button.vue";
import { useRoute } from "vue-router";
import { useReviews } from "@/composables/useReviews";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth.js";

const route = useRoute();
const emit = defineEmits(["toggle-sidebar"]);
const toast = useToast();
const authStore = useAuthStore();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

const breadcrumbItems = computed(() => [
  {
    label: "Rating dan Ulasan",
  },
]);

// Gunakan composable dengan alias replyToReview
const {
  reviews,
  loading,
  error,
  totalReviews,
  fetchReviews,
  getReviewCountByRating,
  formatDate,
  replyToReview: replyToAction,
} = useReviews(currentMerchantSlug.value);

const searchQuery = ref("");
const selectedRating = ref(null);
const segmentationId = computed(() => {
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return Number(merchant?.segmentation?.id || merchant?.segmentation_id || 0);
});

const categories = computed(() => {
  if (segmentationId.value === 3) {
    return [
      { label: "Layanan Jasa", value: "jasa" },
    ];
  } else if (segmentationId.value === 1) {
    return [
      { label: "Produk Toko", value: "produk" },
    ];
  } else if (segmentationId.value === 2) {
    return [
      { label: "Kuliner", value: "kuliner" },
    ];
  }
  return [
    { label: "Semua Ulasan", value: "all" },
    { label: "Produk Toko", value: "produk" },
    { label: "Kuliner", value: "kuliner" },
    { label: "Layanan Jasa", value: "jasa" },
  ];
});

const selectedCategory = ref("all");
const expandedReviewIds = ref([]);

// Modal states
const showReplyModal = ref(false);
const selectedReviewId = ref(null);
const replyMessage = ref("");
const replying = ref(false);

const selectCategory = (val) => {
  selectedCategory.value = val;
  const filters = {};
  if (val !== "all") {
    filters.type = val;
  }
  fetchReviews(1, filters);
};

// Reactively watch segmentationId to fetch reviews and update categories/filters
watch(
  segmentationId,
  (newId) => {
    if (newId === 3) {
      selectedCategory.value = "jasa";
    } else if (newId === 1) {
      selectedCategory.value = "produk";
    } else if (newId === 2) {
      selectedCategory.value = "kuliner";
    } else {
      selectedCategory.value = "all";
    }

    const filters = {};
    if (selectedCategory.value !== "all") {
      filters.type = selectedCategory.value;
    }
    if (currentMerchantSlug.value) {
      fetchReviews(1, filters);
    }
  },
  { immediate: true }
);

const getReviewerName = (review) => {
  if (review?.is_anonymous) {
    return "Pengguna Anonim";
  }
  return review?.user?.name || "Pelanggan";
};

const getReviewerInitial = (review) => {
  const name = getReviewerName(review);
  return name?.charAt(0).toUpperCase() || "?";
};

const openReplyModal = (reviewId, existingReply = "") => {
  selectedReviewId.value = reviewId;
  replyMessage.value = existingReply;
  showReplyModal.value = true;
};

const submitReply = async () => {
  if (!replyMessage.value.trim() || replying.value) return;

  replying.value = true;
  try {
    await replyToAction(selectedReviewId.value, replyMessage.value);
    toast.success("Tanggapan ulasan berhasil dikirim!");
    showReplyModal.value = false;
    replyMessage.value = "";
    // Reload reviews
    selectCategory(selectedCategory.value);
  } catch (err) {
    console.error("Failed to submit reply:", err);
    toast.error(err?.response?.data?.message || "Gagal mengirim tanggapan ulasan");
  } finally {
    replying.value = false;
  }
};

const hasReviewHistory = (review) => {
  const histories = review?.histories || review?.review_histories || [];
  return histories.length > 0;
};

const getReviewHistories = (review) => {
  return review?.histories || review?.review_histories || [];
};

const toggleReviewHistory = (reviewId) => {
  const index = expandedReviewIds.value.indexOf(reviewId);
  if (index === -1) {
    expandedReviewIds.value.push(reviewId);
  } else {
    expandedReviewIds.value.splice(index, 1);
  }
};

const openMediaWindow = (url) => {
  window.open(url, "_blank");
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getReviewMediaUrl = (media) => {
  if (!media) return "";

  if (media.media_url && media.media_url.trim()) {
    const url = media.media_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  if (media.file_url && media.file_url.trim()) {
    const url = media.file_url;
    if (url.startsWith('http')) {
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        try {
          const parsedUrl = new URL(url);
          return `${API_BASE}${parsedUrl.pathname}${parsedUrl.search}`;
        } catch (e) {
          return url;
        }
      }
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE}${cleanUrl}`;
  }

  if (media.file_path && media.file_path.trim()) {
    const path = media.file_path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${API_BASE}${path}`;
    return `${API_BASE}/storage/${path}`;
  }

  if (media.url && media.url.trim()) {
    const url = media.url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  return "";
};

const filteredReviews = computed(() => {
  return reviews.value.filter((review) => {
    const reviewerName = getReviewerName(review);
    const matchesSearch =
      reviewerName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesRating = selectedRating.value === null || review.rating === selectedRating.value;

    return matchesSearch && matchesRating;
  });
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>