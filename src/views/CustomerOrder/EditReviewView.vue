<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Perbarui Rating dan Ulasan</h1>
            <p class="text-xs text-gray-500">Ubah penilaian Anda</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Update Exhausted — 403 from backend -->
    <div v-if="isUpdateExhausted" class="max-w-4xl mx-auto px-4 py-8">
      <div class="bg-gray-100 border border-gray-300 rounded-2xl p-6 text-center">
        <div class="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-lock text-2xl text-gray-500"></i>
        </div>
        <h2 class="text-lg font-bold text-gray-800 mb-2">Pembaruan Sudah Digunakan</h2>
        <p class="text-sm text-gray-600 mb-6">
          Kesempatan pembaruan ulasan sudah digunakan.<br/>
          Ulasan Anda tidak dapat diubah lagi.
        </p>
        <button
          @click="goBack"
          class="px-6 py-2.5 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition"
        >
          Kembali
        </button>
      </div>
    </div>

    <!-- Main Form -->
    <main v-else-if="!loading" class="max-w-4xl mx-auto px-4 py-4">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        <!-- Item Info Header -->
        <div class="p-5 border-b border-gray-100">
          <div class="flex items-center gap-3 mb-3">
            <img
              v-if="itemImage"
              :src="itemImage"
              :alt="itemInfo.name"
              class="w-14 h-14 rounded-xl object-cover bg-gray-100"
              @error="onItemImageError"
            />
            <div v-else class="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <i class="pi text-gray-400" :class="itemInfo.icon"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ itemInfo.name || '-' }}</p>
              <p class="text-xs text-gray-500">{{ itemInfo.typeLabel }}</p>
            </div>
            <!-- Update count badge -->
            <span
              v-if="existingReview?.update_count > 0"
              class="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
            >
              Update {{ existingReview?.update_count }}x
            </span>
          </div>
          <p v-if="existingReview?.review_updated_at" class="text-xs text-gray-400">
            Terakhir diperbarui: {{ formatDate(existingReview?.review_updated_at) }}
          </p>
        </div>

        <!-- Star Rating -->
        <div class="p-5 border-b border-gray-100">
          <label class="block text-sm font-medium text-gray-700 mb-3">Rating</label>
          <div class="flex items-center gap-2">
            <button
              v-for="star in 5"
              :key="star"
              @click="reviewForm.rating = star"
              class="w-12 h-12 rounded-xl transition transform hover:scale-105"
              :class="
                star <= reviewForm.rating
                  ? 'bg-amber-400 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              "
            >
              <i class="pi pi-star-fill text-xl"></i>
            </button>
          </div>
          <p class="mt-2 text-sm text-gray-500">
            {{ { 1: 'Sangat Buruk', 2: 'Buruk', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' }[reviewForm.rating] || 'Pilih rating' }}
          </p>
        </div>

        <!-- Comment -->
        <div class="p-5 border-b border-gray-100">
          <label class="block text-sm font-medium text-gray-700 mb-2">Ulasan</label>
          <textarea
            v-model="reviewForm.comment"
            rows="5"
            maxlength="500"
            placeholder="Ceritakan pengalaman Anda..."
            class="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none transition"
            :class="{
              'border-gray-200': commentLength === 0,
              'border-red-300': commentLength > 0 && !commentValid,
              'border-green-400': commentValid
            }"
          ></textarea>
          <div class="mt-1.5 text-xs">
            <span v-if="commentLength === 0" class="text-gray-400">Minimal {{ MIN_COMMENT_LENGTH }} karakter</span>
            <span v-else-if="!commentValid" class="text-red-500">
              <span v-if="commentTooShort">Minimal {{ MIN_COMMENT_LENGTH }} karakter ({{ commentLength }}/{{ MIN_COMMENT_LENGTH }})</span>
              <span v-else>Maksimal {{ MAX_COMMENT_LENGTH }} karakter</span>
            </span>
            <span v-else class="text-green-600">({{ commentLength }}/{{ MAX_COMMENT_LENGTH }})</span>
          </div>
        </div>

        <!-- Media Upload -->
        <div class="p-5 border-b border-gray-100">
          <label class="block text-sm font-medium text-gray-700 mb-2">Foto/Video Review (opsional)</label>

          <!-- Existing review media preview -->
          <div v-if="existingReviewMedia.length > 0" class="grid grid-cols-3 gap-2 mb-3">
            <div
              v-for="(item, index) in existingReviewMedia"
              :key="'existing-' + index"
              class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img v-if="item.type === 'image'" :src="resolveReviewMediaUrl(item)" class="w-full h-full object-cover" />
              <video v-else :src="resolveReviewMediaUrl(item)" class="w-full h-full object-cover" muted></video>
              <button
                @click="removeExistingMedia(index)"
                class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
              >
                <i class="pi pi-times text-xs"></i>
              </button>
              <span class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">{{ index + 1 }}</span>
            </div>
          </div>

          <!-- New media preview -->
          <div v-if="newMediaPreviews.length > 0" class="grid grid-cols-3 gap-2 mb-3">
            <div
              v-for="(item, index) in newMediaPreviews"
              :key="'new-' + index"
              class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img v-if="item.type === 'image'" :src="item.url" class="w-full h-full object-cover" />
              <video v-else :src="item.url" class="w-full h-full object-cover" muted></video>
              <button
                @click="removeNewMedia(index)"
                class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
              >
                <i class="pi pi-times text-xs"></i>
              </button>
              <span class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                {{ existingReviewMedia.length + index + 1 }}
              </span>
            </div>
          </div>

          <label
            v-if="totalMediaCount < maxFiles"
            class="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition"
          >
            <i class="pi pi-camera text-gray-400"></i>
            <span class="text-sm text-gray-500">Tambahkan ({{ totalMediaCount }}/{{ maxFiles }})</span>
            <input type="file" accept="image/*,video/*" multiple class="hidden" @change="handleFileSelect" />
          </label>
          <p class="mt-1 text-xs text-gray-400">JPG, PNG, GIF, WEBP, MP4, MOV (max 10MB per file)</p>
        </div>

        <!-- Warning -->
        <div class="px-5 py-3">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div class="flex items-start gap-2.5">
              <i class="pi pi-exclamation-triangle text-amber-500 mt-0.5 text-sm"></i>
              <div>
                <p class="text-xs font-semibold text-amber-700">Informasi Ulasan</p>
                <p class="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  Ulasan hanya dapat diperbarui 1 kali setelah dikirim.<br/>
                  Setelah pembaruan dilakukan, ulasan tidak dapat diubah kembali.
                </p>
                <p class="mt-1.5 text-xs font-semibold text-orange-600">
                  Kesempatan pembaruan tersisa: {{ remainingUpdateCount }} kali
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            @click="goBack"
            class="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            @click="saveReview"
            :disabled="submitting || !canSaveReview"
            class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="submitting">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              Menyimpan...
            </span>
            <span v-else>
              <i class="pi pi-check mr-2"></i>
              Simpan Perubahan
            </span>
          </button>
        </div>
      </div>
    </main>

    <!-- Loading -->
    <div v-else class="max-w-4xl mx-auto px-4 py-8 flex justify-center">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 500;
const maxFiles = 5;
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

const ratingId = computed(() => route.params.ratingId ? Number(route.params.ratingId) : null);

// Form state
const reviewForm = ref({ rating: 5, comment: "", is_anonymous: false });
const existingReview = ref(null);
const loading = ref(true);
const submitting = ref(false);
const isUpdateExhausted = ref(false);

// Media state
const existingReviewMedia = ref([]); // { id, url, type }
const newMediaFiles = ref([]);        // File objects
const newMediaPreviews = ref([]);    // { url, type, name }
const removedMediaIds = ref([]);      // IDs of old media to remove
const itemImage = ref(null);
const itemImageError = ref(false);

// Comment validation
const commentLength = computed(() => reviewForm.value.comment?.trim().length || 0);
const commentTooShort = computed(() => commentLength.value < MIN_COMMENT_LENGTH);
const commentTooLong = computed(() => commentLength.value > MAX_COMMENT_LENGTH);
const commentValid = computed(() => commentLength.value >= MIN_COMMENT_LENGTH && commentLength.value <= MAX_COMMENT_LENGTH);
const canSaveReview = computed(() => reviewForm.value.rating > 0 && commentValid.value);
const remainingUpdateCount = computed(() => Math.max(0, 1 - (existingReview.value?.update_count ?? 0)));
const totalMediaCount = computed(() => existingReviewMedia.value.length + newMediaFiles.value.length);

// Universal item info from rateable
const itemInfo = computed(() => {
  const r = existingReview.value?.rateable;
  const type = existingReview.value?.rateable_type || "";
  const isProduct = type.includes("Product");
  const isJasa = type.includes("Jasa");

  return {
    name: r?.title || r?.name || r?.product_name || r?.jasa_title || "-",
    icon: isProduct ? "pi-shopping-bag" : isJasa ? "pi-wrench" : "pi-star",
    typeLabel: isProduct ? "Produk" : isJasa ? "Layanan Jasa" : "Item",
    isProduct,
    isJasa,
  };
});

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const onItemImageError = () => {
  itemImageError.value = true;
  itemImage.value = null;
};

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Resolve review media URL to the correct backend storage URL.
 * Handles legacy URLs pointing to frontend port (5173) and relative paths.
 */
const resolveReviewMediaUrl = (media) => {
  const raw = media?.file_url || media?.url || media?.media_url || media?.path || '';
  if (!raw) return '';

  // Fix legacy frontend port URLs
  if (raw.includes('localhost:5173/storage/')) {
    return raw.replace(/localhost:5173/, 'localhost:8000');
  }

  // Already a full URL — return as-is
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  // Relative path — prepend /storage/
  const clean = raw.startsWith('/') ? raw : `/${raw}`;
  if (clean.startsWith('/storage/')) {
    return `${API_BASE}${clean}`;
  }

  // raw path without /storage/ prefix
  return `${API_BASE}/storage/${raw.replace(/^storage\//, '')}`;
};

/**
 * Extract media URL from various possible field names.
 */
const extractMediaUrl = (media) => {
  return media.file_url || media.url || media.media_url || media.path || media.src_url || null;
};

/**
 * Extract media type from media object.
 */
const extractMediaType = (media) => {
  if (media.type === 'video' || media.file_type === 'video') return 'video';
  if (media.type === 'image' || media.file_type === 'image') return 'image';
  const mime = media.mime_type || media.mimeType || '';
  if (mime.startsWith('video/')) return 'video';
  return 'image';
};

/**
 * Load existing review media from multiple possible response fields.
 */
const loadExistingMedia = (review) => {
  existingReviewMedia.value = [];

  const sources = [
    review.media,
    review.review_media,
    review.images,
    review.attachments,
  ];

  sources.forEach((source) => {
    if (!source || !Array.isArray(source)) return;
    source.forEach((media) => {
      const url = extractMediaUrl(media);
      if (!url) return;
      // Avoid duplicates by id
      if (media.id && existingReviewMedia.value.some(m => m.id === media.id)) return;
      existingReviewMedia.value.push({
        id: media.id || null,
        url,
        type: extractMediaType(media),
        name: media.name || media.original_name || 'media',
      });
    });
  });
};

/**
 * Determine item image from multiple possible sources.
 */
const determineItemImage = (review) => {
  const candidates = [
    review.item_image,
    review.rateable?.image_url,
    review.rateable?.image,
    review.rateable?.cover_url,
    review.rateable?.logo_url,
    review.rateable?.thumbnail_url,
    review.rateable?.cover_img?.url,
    review.rateable?.cover_img?.image_url,
    (review.rateable?.images?.[0]?.url),
    (review.rateable?.images?.[0]?.image_url),
    review.jasa_order_item?.service_image,
    review.jasa_order_item?.image_url,
    review.order_item?.image_snapshot_path,
    review.order_item?.image_url,
    review.order_item?.product?.image_url,
    review.order_item?.product?.image,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

const loadReview = async () => {
  if (!ratingId.value) {
    toast.error("ID ulasan tidak ditemukan");
    router.push("/orders");
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.get(`/api/reviews/${ratingId.value}`);
    const review = data?.data ?? data;
    existingReview.value = review;
    reviewForm.value.rating = review.rating || 5;
    reviewForm.value.comment = review.comment || "";
    reviewForm.value.is_anonymous = !!review.is_anonymous;

    if ((review.is_update_exhausted || (review.update_count ?? 0) >= 1)) {
      isUpdateExhausted.value = true;
    }

    // Set item image
    itemImage.value = determineItemImage(review);
    itemImageError.value = false;

    // Load existing review media
    loadExistingMedia(review);
  } catch (error) {
    const status = error.response?.status;
    if (status === 403 || (error.response?.data?.message || '').includes('kesempatan')) {
      isUpdateExhausted.value = true;
      toast.error(error.response?.data?.message || "Kesempatan pembaruan ulasan sudah digunakan");
    } else {
      toast.error("Gagal memuat ulasan");
      router.push("/orders");
    }
  } finally {
    loading.value = false;
  }
};

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || []);
  const remaining = maxFiles - totalMediaCount.value;
  if (remaining <= 0) { toast.warning(`Maksimal ${maxFiles} file`); event.target.value = ''; return; }
  const toAdd = files.slice(0, remaining);
  let invalid = 0, oversized = 0;
  toAdd.forEach((file) => {
    if (!allowedTypes.includes(file.type)) { invalid++; return; }
    if (file.size > 10 * 1024 * 1024) { oversized++; return; }
    newMediaFiles.value.push(file);
    newMediaPreviews.value.push({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name,
    });
  });
  if (invalid > 0) toast.warning(`${invalid} file tidak didukung`);
  if (oversized > 0) toast.warning(`${oversized} file terlalu besar (max 10MB)`);
  event.target.value = '';
};

/**
 * Remove an existing (old) media from the review — mark for removal.
 */
const removeExistingMedia = (index) => {
  const media = existingReviewMedia.value[index];
  if (media?.id) {
    removedMediaIds.value.push(media.id);
  }
  existingReviewMedia.value.splice(index, 1);
};

/**
 * Remove a newly added file before upload.
 */
const removeNewMedia = (index) => {
  URL.revokeObjectURL(newMediaPreviews.value[index]?.url);
  newMediaFiles.value.splice(index, 1);
  newMediaPreviews.value.splice(index, 1);
};

const saveReview = async () => {
  if (submitting.value || !canSaveReview.value) return;
  if (commentTooShort.value) {
    toast.error(`Ulasan minimal ${MIN_COMMENT_LENGTH} karakter`);
    return;
  }

  submitting.value = true;
  try {
    const fd = new FormData();
    fd.append('rating', reviewForm.value.rating);
    if (reviewForm.value.comment) fd.append('comment', reviewForm.value.comment);
    fd.append('is_anonymous', reviewForm.value.is_anonymous ? '1' : '0');

    // Append new media files
    newMediaFiles.value.forEach((file) => fd.append('media', file));

    // Send removed media IDs if any
    if (removedMediaIds.value.length > 0) {
      fd.append('removed_media_ids', JSON.stringify(removedMediaIds.value));
    }

    fd.append('_method', 'PUT');
    const { data } = await api.post(`/api/reviews/${ratingId.value}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    toast.success(data?.message || "Ulasan berhasil diperbarui");
    isUpdateExhausted.value = true;

    // Redirect to order detail after short delay
    const orderId = existingReview.value?.order_id || route.query.order_id;
    setTimeout(() => {
      if (orderId) {
        router.push(`/orders/${orderId}`);
      } else {
        router.push('/orders');
      }
    }, 500);
  } catch (error) {
    const status = error.response?.status;
    if (status === 403 || (error.response?.data?.message || '').includes('kesempatan')) {
      isUpdateExhausted.value = true;
      toast.error(error.response?.data?.message || "Kesempatan pembaruan ulasan sudah digunakan");
    } else {
      toast.error(error.response?.data?.message || "Gagal memperbarui ulasan");
    }
  } finally {
    submitting.value = false;
  }
};

const goBack = () => router.back();

onMounted(loadReview);
</script>
