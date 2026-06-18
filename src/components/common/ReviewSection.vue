<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";

const props = defineProps({
  resourceType: {
    type: String,
    default: "jasa", // "jasa" or "merchant"
  },
  resourceId: {
    type: [String, Number],
    required: true,
  },
});

const toast = useToast();
const ratings = ref([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);
const expandedHistoryIds = ref([]);

// Get reviewer display name — uses reviewer_name from BE (BE appends reviewer_name: "Anonim" for anonymous)
const getReviewerDisplay = (rating) => {
  if (rating?.reviewer_name) {
    return { name: rating.reviewer_name, initial: rating.reviewer_name?.charAt(0).toUpperCase() || 'A' };
  }
  if (rating?.is_anonymous) {
    return { name: 'Anonim', initial: 'A' };
  }
  const name = rating?.user?.name || 'Pelanggan';
  return { name, initial: name.charAt(0).toUpperCase() || '?' };
};

// Get reviewer badge for anonymous reviews
const getReviewerBadge = (rating) => {
  return rating?.is_anonymous
    ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 ml-1">Anonim</span>'
    : '';
};

const fetchRatings = async (pageNum = 1) => {
  loading.value = true;
  try {
    let endpoint = "";
    if (props.resourceType === "jasa") {
      endpoint = `/api/public/jasas/${props.resourceId}/ratings?page=${pageNum}`;
    } else if (props.resourceType === "merchant") {
      endpoint = `/api/public/merchants/${props.resourceId}/ratings?page=${pageNum}`;
    } else if (props.resourceType === "product") {
      endpoint = `/api/public/products/${props.resourceId}/ratings?page=${pageNum}`;
    }

    if (!endpoint) {
      console.warn(`[ReviewSection] Invalid resourceType: ${props.resourceType}`);
      loading.value = false;
      return;
    }

    console.log(`[ReviewSection] Fetching ratings from: ${endpoint}`);
    const { data } = await api.get(endpoint);

    console.log('[ReviewSection] Raw API response:', JSON.stringify(data, null, 2));
    const newRatings = data?.data || data || [];

    console.log(`[ReviewSection] Extracted ratings: ${newRatings.length}`);
    if (newRatings.length > 0) {
      console.log(`[ReviewSection] First rating:`, JSON.stringify(newRatings[0], null, 2));
    }

    if (pageNum === 1) {
      ratings.value = newRatings;
    } else {
      ratings.value = [...ratings.value, ...newRatings];
    }

    hasMore.value = newRatings.length === 10;
  } catch (error) {
    console.error("Failed to fetch ratings:", error);
    toast.error("Gagal memuat ulasan");
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    page.value++;
    fetchRatings(page.value);
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getStarClass = (index, rating) => {
  return index < rating ? "text-yellow-400" : "text-gray-300";
};

// ===== Review Media Helpers =====

// Get all media for a rating — try all possible field names
const getReviewMedia = (rating) => {
  return (
    rating?.media ||
    rating?.review_media ||
    rating?.reviewMedia ||
    rating?.attachments ||
    []
  );
};

// Get public URL for a media item
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getMediaUrl = (media) => {
  if (!media) return null;

  // media_url: computed accessor from backend (full URL with /storage/)
  if (media.media_url && media.media_url.trim()) {
    const url = media.media_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // file_url: stored URL from DB (may be relative /storage/... or full)
  if (media.file_url && media.file_url.trim()) {
    const url = media.file_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // file_path: stored relative path (e.g. "review-media/abc.jpg")
  if (media.file_path && media.file_path.trim()) {
    const path = media.file_path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${API_BASE}${path}`;
    return `${API_BASE}/storage/${path}`;
  }

  // url: alternative field name
  if (media.url && media.url.trim()) {
    const url = media.url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  return null;
};

// Check if media item is an image
const isImage = (media) => {
  return (
    media?.file_type === 'image' ||
    (media?.mime_type && String(media.mime_type).startsWith('image/'))
  );
};

// Check if media item is a video
const isVideo = (media) => {
  return (
    media?.file_type === 'video' ||
    (media?.mime_type && String(media.mime_type).startsWith('video/'))
  );
};

// ===== Review History Helpers =====

// Check if rating has update history
const hasReviewHistory = (rating) => {
  const histories = rating?.histories || rating?.review_histories || [];
  return histories.length > 0;
};

// Get review histories
const getReviewHistories = (rating) => {
  return rating?.histories || rating?.review_histories || [];
};

// Toggle review history expansion
const toggleReviewHistory = (ratingId) => {
  const index = expandedHistoryIds.value.indexOf(ratingId);
  if (index === -1) {
    expandedHistoryIds.value.push(ratingId);
  } else {
    expandedHistoryIds.value.splice(index, 1);
  }
};

onMounted(() => {
  fetchRatings();
});

watch(
  () => [props.resourceType, props.resourceId],
  () => {
    page.value = 1;
    fetchRatings();
  }
);
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-800">Ulasan</h3>
      <span class="text-sm text-gray-500">{{ ratings.length }} ulasan</span>
    </div>

    <!-- Loading -->
    <div v-if="loading && ratings.length === 0" class="text-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
    </div>

    <!-- Empty State -->
    <div v-else-if="ratings.length === 0 && !loading" class="text-center py-8 bg-gray-50 rounded-xl">
      <i class="pi pi-star text-3xl text-gray-300 mb-2"></i>
      <p class="text-gray-500">Belum ada ulasan</p>
    </div>

    <!-- Ratings List -->
    <div v-else class="space-y-4">
      <div
        v-for="rating in ratings"
        :key="rating.id"
        class="bg-white rounded-xl p-4 border border-gray-100"
      >
        <div class="flex items-start gap-3">
          <!-- Avatar -->
          <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
            {{ getReviewerDisplay(rating).initial }}
          </div>

          <div class="flex-1">
            <!-- Header -->
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-gray-800">
                {{ getReviewerDisplay(rating).name }}
                <!-- Anonim badge -->
                <span v-if="rating.is_anonymous" class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 ml-1">
                  <i class="pi pi-eye-slash text-[8px] mr-0.5"></i>Anonim
                </span>
              </p>
              <span class="text-xs text-gray-400">{{ formatDate(rating.created_at) }}</span>
            </div>

            <!-- Stars -->
            <div class="flex items-center gap-0.5 mb-2">
              <i
                v-for="i in 5"
                :key="i"
                :class="['pi pi-star-fill text-sm', getStarClass(i - 1, rating.rating)]"
              ></i>
            </div>

            <!-- Title -->
            <p v-if="rating.title" class="font-medium text-gray-700 mb-1">
              {{ rating.title }}
            </p>

            <!-- Comment -->
            <p v-if="rating.comment" class="text-sm text-gray-600">
              {{ rating.comment }}
            </p>

            <!-- Review Media (photos/videos) -->
            <div
              v-if="getReviewMedia(rating).length > 0"
              class="mt-3 flex flex-wrap gap-2"
            >
              <template
                v-for="(media, idx) in getReviewMedia(rating)"
                :key="media.id || idx"
              >
                <!-- Image -->
                <img
                  v-if="isImage(media)"
                  :src="getMediaUrl(media)"
                  class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                  loading="lazy"
                  @error="(e) => { e.target.style.display = 'none'; console.error('Review image load error:', getMediaUrl(media)); }"
                />
                <!-- Video -->
                <video
                  v-else-if="isVideo(media)"
                  :src="getMediaUrl(media)"
                  controls
                  class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                  @error="(e) => { e.target.style.display = 'none'; console.error('Review video load error:', getMediaUrl(media)); }"
                />
              </template>
            </div>

            <!-- Merchant Reply -->
            <div v-if="rating.merchant_reply" class="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
              <div class="flex items-center gap-2 mb-1">
                <i class="pi pi-check-circle text-green-500"></i>
                <p class="text-xs font-semibold text-green-700">Tanggapan Merchant</p>
              </div>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ rating.merchant_reply }}</p>
              <p v-if="rating.merchant_reply_at" class="text-xs text-gray-400 mt-2">
                {{ formatDate(rating.merchant_reply_at) }}
              </p>
            </div>

            <!-- Updated Badge & History Toggle -->
            <div v-if="hasReviewHistory(rating)">
              <div class="mt-3 flex items-center gap-2">
                <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full">
                  <i class="pi pi-history"></i>
                  Ulasan diperbarui
                </span>
                <button
                  @click="toggleReviewHistory(rating.id)"
                  class="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <i :class="['pi', expandedHistoryIds.includes(rating.id) ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                  {{ expandedHistoryIds.includes(rating.id) ? 'Sembunyikan' : 'Lihat' }} Riwayat
                </button>
              </div>

              <!-- Expanded History -->
              <div v-if="expandedHistoryIds.includes(rating.id)" class="mt-3 space-y-3">
                <div
                  v-for="(history, index) in getReviewHistories(rating)"
                  :key="history.id || index"
                  class="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <!-- Before -->
                  <div class="mb-3">
                    <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Sebelum diperbarui</p>
                    <div class="flex items-center gap-1 mb-1">
                      <i
                        v-for="star in 5"
                        :key="'old-' + star"
                        class="pi text-xs"
                        :class="star <= Number(history.old_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                      ></i>
                    </div>
                    <p v-if="history.old_comment" class="text-sm text-gray-600">{{ history.old_comment }}</p>
                  </div>

                  <!-- Arrow -->
                  <div class="flex justify-center my-2">
                    <i class="pi pi-arrow-down text-gray-400 text-xs"></i>
                  </div>

                  <!-- After -->
                  <div>
                    <p class="text-xs font-semibold text-green-600 uppercase mb-1">Sesudah diperbarui</p>
                    <div class="flex items-center gap-1 mb-1">
                      <i
                        v-for="star in 5"
                        :key="'new-' + star"
                        class="pi text-xs"
                        :class="star <= Number(history.new_rating || 0) ? 'pi-star-fill text-orange-400' : 'pi-star text-gray-300'"
                      ></i>
                    </div>
                    <p v-if="history.new_comment" class="text-sm text-gray-600">{{ history.new_comment }}</p>
                  </div>

                  <!-- Date -->
                  <p class="text-xs text-gray-400 mt-2">
                    {{ formatDate(history.created_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <button
        v-if="hasMore"
        @click="loadMore"
        :disabled="loading"
        class="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
      >
        <span v-if="loading">Memuat...</span>
        <span v-else>Lihat lebih banyak</span>
      </button>
    </div>
  </div>
</template>