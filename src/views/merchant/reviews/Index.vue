<template>
  <div class="min-h-screen bg-gray-50 pb-6">
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
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
            Kelola dan pantau ulasan dari pelanggan.
          </p>
        </div>
      </div>
    </div>

    <div class="h-24 sm:h-0"></div>

    <!-- Content -->
    <div class="px-4 sm:px-6">
      <!-- Filters & Search -->
      <div class="py-4 space-y-4 border-b border-gray-200">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="relative flex-1">
            <i class="absolute left-3 top-3 pi pi-search text-gray-400 text-sm"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari ulasan..."
              class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary"
            />
          </div>

          <!-- Rating Filter -->
          <div class="flex gap-2 flex-wrap">
            <button
              @click="selectedRating = null"
              :class="[
                'px-3 py-2 text-xs font-medium rounded-lg transition',
                selectedRating === null
                  ? 'bg-merchant-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Semua ({{ totalReviews }})
            </button>
            <button
              v-for="star in [5, 4, 3, 2, 1]"
              :key="star"
              @click="selectedRating = star"
              :class="[
                'px-3 py-2 text-xs font-medium rounded-lg transition',
                selectedRating === star
                  ? 'bg-merchant-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              {{ star }}⭐ ({{ getReviewCountByRating(star) }})
            </button>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="mt-4 space-y-3">
        <div v-for="i in 3" :key="i" class="p-4 bg-white border border-gray-200 rounded-lg animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <!-- Reviews List -->
      <div v-else class="mt-4 space-y-3">
        <div
          v-if="filteredReviews.length === 0"
          class="py-12 text-center bg-white rounded-lg border border-gray-200"
        >
          <i class="pi pi-inbox text-5xl text-gray-300 mb-3 block"></i>
          <p class="text-gray-500 font-medium">Belum ada ulasan</p>
        </div>

        <div
          v-for="review in filteredReviews"
          :key="review.id"
          class="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
        >
          <!-- Review Header -->
          <div class="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="text-sm font-semibold text-gray-900">{{ review.user?.name || "Pelanggan" }}</h4>
                <span class="text-xs text-gray-500">{{ review.rateable?.title || review.rateable?.name || "Produk/Jasa" }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="flex gap-0.5">
                  <i
                    v-for="i in 5"
                    :key="i"
                    class="text-xs"
                    :class="i <= review.rating ? 'pi pi-star-fill text-amber-400' : 'pi pi-star text-gray-300'"
                  ></i>
                </span>
                <span class="text-xs text-gray-500">{{ formatDate(review.created_at) }}</span>
              </div>
            </div>
            <span class="text-xs text-gray-500">{{ review.rating }}/5.0</span>
          </div>

          <!-- Review Title -->
          <div v-if="review.title" class="mb-2">
            <p class="text-sm font-medium text-gray-900">{{ review.title }}</p>
          </div>

          <!-- Review Comment -->
          <div class="mb-3">
            <p class="text-sm text-gray-700 line-clamp-3">{{ review.comment }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button
              @click="replyToReview(review.id)"
              class="px-3 py-1 text-xs font-medium text-merchant-primary hover:bg-merchant-primary/5 rounded transition"
            >
              Balas
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import { useRoute } from "vue-router";
import { useReviews } from "@/composables/useReviews";

const route = useRoute();
const emit = defineEmits(["toggle-sidebar"]);

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

const breadcrumbItems = computed(() => [
  {
    label: "Review & Ulasan",
  },
]);

// Gunakan composable
const {
  reviews,
  loading,
  error,
  totalReviews,
  averageRating,
  ratingDistribution,
  fetchReviews,
  getReviewCountByRating,
  formatDate,
} = useReviews(currentMerchantSlug.value);

const searchQuery = ref("");
const selectedRating = ref(null);

// Fetch reviews saat component mounted
onMounted(() => {
  if (currentMerchantSlug.value) {
    fetchReviews(1);
  }
});

const filteredReviews = computed(() => {
  return reviews.value.filter((review) => {
    const matchesSearch =
      review.user?.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesRating = selectedRating.value === null || review.rating === selectedRating.value;

    return matchesSearch && matchesRating;
  });
});

const replyToReview = (reviewId) => {
  console.log("Reply to review:", reviewId);
  // TODO: Implement reply modal/form
};
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
