<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import api from "@/libs/axios";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// Get params from route: /review/:reviewableType/:orderId/:reviewableId
const reviewableType = computed(() => route.params.reviewableType || "service");
const orderId = computed(() => route.params.orderId ? Number(route.params.orderId) : null);
const reviewableId = computed(() => route.params.reviewableId ? Number(route.params.reviewableId) : null);

// Review form state
const reviewForm = ref({
  rating: 5,
  comment: "",
  is_anonymous: false,
});
const selectedFiles = ref([]);
const previewFiles = ref([]);
const loadingItem = ref(false);
const itemInfo = ref(null);
const submitting = ref(false);
const alreadyReviewed = ref(false);
const existingReview = ref(null);

// Allowed file types
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const maxFiles = 5;
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Validation constants
const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 500;

// Comment validation
const commentLength = computed(() => reviewForm.value.comment?.trim().length || 0);
const commentTooShort = computed(() => commentLength.value < MIN_COMMENT_LENGTH);
const commentTooLong = computed(() => commentLength.value > MAX_COMMENT_LENGTH);
const commentValid = computed(() => commentLength.value >= MIN_COMMENT_LENGTH && commentLength.value <= MAX_COMMENT_LENGTH);
const commentStatus = computed(() => {
  if (commentLength.value === 0) return 'empty';
  if (commentTooShort.value) return 'too-short';
  if (commentTooLong.value) return 'too-long';
  return 'valid';
});

// Can submit validation
const canSubmitReview = computed(() => {
  return (
    reviewForm.value.rating > 0 &&
    commentValid.value
  );
});

// Get label for reviewable type
const getTypeLabel = (type) => {
  const labels = {
    service: "Layanan Jasa",
    product: "Produk",
    food: "Menu Kuliner",
    merchant: "UMKM",
  };
  return labels[type] || "Item";
};

// Get icon for reviewable type
const getTypeIcon = (type) => {
  const icons = {
    service: "pi-wrench",
    product: "pi-shopping-bag",
    food: "pi-utensils",
    merchant: "pi-store",
  };
  return icons[type] || "pi-star";
};

// Set star rating
const setRating = (star) => {
  reviewForm.value.rating = star;
};

// Handle file selection
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || []);
  const currentCount = selectedFiles.value.length;

  // Check max files limit
  const remainingSlots = maxFiles - currentCount;
  if (remainingSlots <= 0) {
    toast.warning(`Maksimal ${maxFiles} file saja`);
    return;
  }

  const filesToAdd = files.slice(0, remainingSlots);
  let invalidFiles = 0;
  let oversizedFiles = 0;

  for (const file of filesToAdd) {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      invalidFiles++;
      continue;
    }
    // Check file size
    if (file.size > maxFileSize) {
      oversizedFiles++;
      continue;
    }

    selectedFiles.value.push(file);
    // Create preview URL
    if (file.type.startsWith('image/')) {
      previewFiles.value.push({
        file,
        url: URL.createObjectURL(file),
        type: 'image',
        name: file.name,
      });
    } else {
      previewFiles.value.push({
        file,
        url: URL.createObjectURL(file),
        type: 'video',
        name: file.name,
      });
    }
  }

  if (invalidFiles > 0) {
    toast.warning(`${invalidFiles} file tidak didukung`);
  }
  if (oversizedFiles > 0) {
    toast.warning(`${oversizedFiles} file terlalu besar (max 10MB)`);
  }

  // Reset input
  event.target.value = '';
};

// Remove file from selection
const removeFile = (index) => {
  // Revoke object URL to free memory
  if (previewFiles.value[index]?.url) {
    URL.revokeObjectURL(previewFiles.value[index].url);
  }
  selectedFiles.value.splice(index, 1);
  previewFiles.value.splice(index, 1);
};

// Submit review
const submitReview = async () => {
  // Prevent double submit
  if (submitting.value || alreadyReviewed.value) return;

  // Client-side validation
  if (!canSubmitReview.value) {
    if (!reviewForm.value.rating) {
      toast.error("Silakan pilih rating terlebih dahulu");
    } else if (commentTooShort.value) {
      toast.error(`Ulasan minimal ${MIN_COMMENT_LENGTH} karakter`);
    }
    return;
  }

  submitting.value = true;
  try {
    // Build FormData for file upload
    const formData = new FormData();
    formData.append('rating', reviewForm.value.rating);
    if (reviewForm.value.comment) {
      formData.append('comment', reviewForm.value.comment);
    }
    // title is optional — only send if not empty
    if (reviewForm.value.title) {
      formData.append('title', reviewForm.value.title);
    }
    formData.append('is_anonymous', reviewForm.value.is_anonymous ? '1' : '0');

    // Console.log full payload for debugging
    const payload = {
      rating: reviewForm.value.rating,
      title: reviewForm.value.title || null,
      comment: reviewForm.value.comment || null,
      is_anonymous: reviewForm.value.is_anonymous,
      media_count: selectedFiles.value.length,
    };
    console.log('[UniversalReview] Review Payload:', payload);

    // Add media files — key must be 'media[]' to match backend validation
    // Backend: 'media' => 'nullable|array|max:5'
    for (const file of selectedFiles.value) {
      formData.append('media[]', file);
    }

    // Determine endpoint based on type
    let endpoint = "";
    let config = { headers: { 'Content-Type': 'multipart/form-data' } };

    if (reviewableType.value === "service") {
      endpoint = `/api/jasa-orders/${orderId.value}/review`;
    } else {
      // For product, food, or general review
      if (existingReview.value && existingReview.value.id) {
        endpoint = `/api/ratings/${existingReview.value.id}`;
        formData.append('_method', 'PUT');
      } else {
        endpoint = `/api/ratings`;
      }
      formData.append('rateable_id', reviewableId.value);
      
      const typeMapping = {
        'product': 'App\\Models\\Product',
        'jasa': 'App\\Models\\Jasa'
      };
      formData.append('rateable_type', typeMapping[reviewableType.value] || reviewableType.value);
      if (route.query.merchantId) {
        formData.append('merchant_id', route.query.merchantId);
      }
      if (orderId.value) {
        formData.append('order_id', orderId.value);
      }
      if (route.query.orderItemId) {
        formData.append('order_item_id', route.query.orderItemId);
      }
    }

    console.log("[UniversalReview] Submitting review with selectedFiles:", selectedFiles.value.map(f => ({ name: f.name, size: f.size })));
    
    // Log FormData entries for review submission
    const entries = {};
    for (const [key, val] of formData.entries()) {
      if (val instanceof File) {
        entries[key] = `File: name=${val.name}, size=${val.size}`;
      } else {
        entries[key] = val;
      }
    }
    console.log("[UniversalReview] FormData Entries:", entries);

    const { data } = await api.post(endpoint, formData, config);

    console.log("[UniversalReview] Response received from submit:", data);

    // ApiResponse::success returns { message, data } — NOT { success }
    // data = axios response.data = { message: "...", data: { review, order } }
    toast.success(data?.message || 'Review berhasil dikirim!');
    alreadyReviewed.value = true;
    existingReview.value = data?.data?.review || data?.data || {};
    // Redirect back to order detail
    if (orderId.value) {
      router.push(`/orders/${orderId.value}`);
    } else {
      router.push("/orders");
    }
  } catch (error) {
    console.log("[UniversalReview] Response received:", error.response?.data || error);

    // Check for 409 Conflict (already reviewed)
    if (error.response?.status === 409 || (error.response?.data?.message || '').includes('sudah') && (error.response?.data?.message || '').includes('review')) {
      toast.info('Pesanan ini sudah diberi penilaian sebelumnya');
      alreadyReviewed.value = true;
      if (orderId.value) {
        setTimeout(() => router.push(`/orders/${orderId.value}`), 1500);
      } else {
        setTimeout(() => router.push('/orders'), 1500);
      }
      return;
    }

    // For other errors, log and show toast
    const message =
      error.response?.data?.message ||
      'Gagal mengirim review. Silakan coba lagi.';
    console.error("[UniversalReview] Error:", message);
    toast.error(message);
  } finally {
    submitting.value = false;
  }
};

// Go back
const goBack = () => {
  router.back();
};

// Check if service/product order already has a review
const checkExistingReview = async () => {
  if (!orderId.value) return;

  if (reviewableType.value === "service") {
    try {
      const { data } = await api.get(`/api/jasa-orders/${orderId.value}`);
      const order = data.data || data;
      if (order.review) {
        alreadyReviewed.value = true;
        existingReview.value = order.review;
        toast.info('Pesanan ini sudah diberi penilaian');
      }
    } catch (err) {
      console.log("[UniversalReview] Could not check existing review:", err);
    }
  } else {
    // For product or general review
    try {
      const { data: od } = await api.get(`/api/orders/${orderId.value}`);
      const o = od?.data ?? od ?? {};
      const orderItemIdVal = route.query.orderItemId ? Number(route.query.orderItemId) : null;
      
      // Find the specific item being reviewed
      const item = (o.items || []).find(it => it.id === orderItemIdVal || it.product_id === reviewableId.value);
      if (item && item.review) {
        existingReview.value = item.review;
        
        // If they can still update the review, prefill the form and set edit mode!
        if (item.can_update_review) {
          reviewForm.value.rating = item.review.rating || 5;
          reviewForm.value.comment = item.review.comment || "";
          reviewForm.value.title = item.review.title || "";
          reviewForm.value.is_anonymous = item.review.is_anonymous || false;
          // Set alreadyReviewed to false so they can submit update
          alreadyReviewed.value = false;
        } else {
          // If they cannot update anymore, show already reviewed screen
          alreadyReviewed.value = true;
          toast.info('Pesanan ini sudah diberi penilaian dan tidak dapat diubah lagi');
        }
      }
    } catch (err) {
      console.log("[UniversalReview] Could not check existing review for product:", err);
    }
  }
};

// Load item info for item card
const loadItemInfo = async () => {
  const type = reviewableType.value;
  const id = reviewableId.value;
  if (!id) return;
  if (type === "service") return;
  try {
    if (type === "product") {
      const { data: pd } = await api.get(`/api/products/${id}`);
      const p = pd?.data ?? pd ?? {};
      itemInfo.value = { name: p.name || "Produk", image: p.image_url || p.logo_url || null, icon: "pi-shopping-bag", typeLabel: "Produk" };
    } else if (type === "jasa") {
      const { data: jd } = await api.get(`/api/jasas/${id}`);
      const j = jd?.data ?? jd ?? {};
      itemInfo.value = { name: j.title || j.name || "Jasa", image: j.image_url || j.logo_url || null, icon: "pi-wrench", typeLabel: "Layanan" };
    }
  } catch(e) { console.warn("[UniversalReview] loadItemInfo:", e); }
};

// Initialize
onMounted(async () => {
  await Promise.all([checkExistingReview(), loadItemInfo()]);
});

// Watch for route param changes
watch(
  () => route.params.orderId,
  async (newOrderId) => {
    if (newOrderId) {
      alreadyReviewed.value = false;
      existingReview.value = null;
      await checkExistingReview();
    }
  }
);
</script>

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
            <h1 class="text-lg font-bold text-gray-900">Beri Rating dan Ulasan</h1>
            <p class="text-xs text-gray-500">Berikan penilaian Anda</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Already Reviewed Notice -->
    <div v-if="alreadyReviewed" class="max-w-4xl mx-auto px-4 py-6">
      <div class="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-check-circle text-3xl text-green-600"></i>
        </div>
        <h2 class="text-lg font-bold text-green-800 mb-2">Rating dan Ulasan Sudah Terkirim</h2>
        <p class="text-sm text-green-700 mb-4">
          Anda sudah memberikan rating dan ulasan untuk pesanan ini.
        </p>
        <div v-if="existingReview" class="bg-white rounded-xl p-4 mb-4 text-left">
          <div class="flex items-center gap-1 mb-2">
            <span v-for="n in 5" :key="n" class="text-lg">
              <i :class="n <= existingReview.rating ? 'pi pi-star-fill text-amber-400' : 'pi pi-star text-gray-300'"></i>
            </span>
          </div>
          <p v-if="existingReview.title" class="font-medium text-gray-800 mb-1">{{ existingReview.title }}</p>
          <p class="text-sm text-gray-600">{{ existingReview.comment || 'Tidak ada komentar' }}</p>
        </div>
        <button
          @click="router.push('/orders')"
          class="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
        >
          Kembali ke Riwayat Pesanan
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main v-else class="max-w-4xl mx-auto px-4 py-4">
      <!-- Review Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <!-- Review Content -->
        <div class="p-5">
          <!-- Type Indicator -->
          <div class="flex items-center gap-2 mb-4">
            <span
              class="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
            >
              <i :class="['pi', getTypeIcon(reviewableType), 'mr-1']"></i>
              {{ getTypeLabel(reviewableType) }}
            </span>
          </div>

          <!-- Star Rating -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Berikan Rating
            </label>
            <div class="flex items-center gap-2">
              <button
                v-for="star in 5"
                :key="star"
                @click="setRating(star)"
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
              {{
                {
                  1: "Sangat Buruk",
                  2: "Buruk",
                  3: "Cukup",
                  4: "Baik",
                  5: "Sangat Baik",
                }[reviewForm.rating] || "Pilih rating"
              }}
            </p>
          </div>

          
          <!-- Comment -->
          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Ulasan Lengkap
            </label>
            <textarea
              v-model="reviewForm.comment"
              rows="5"
              maxlength="500"
              placeholder="Ceritakan pengalaman Anda dengan layanan ini..."
              class="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/50 focus:border-merchant-primary resize-none transition"
              :class="{
                'border-gray-200': commentLength === 0,
                'border-red-300': commentLength > 0 && !commentValid,
                'border-green-400': commentValid
              }"
            ></textarea>
            <!-- Comment Counter -->
            <div class="mt-1.5 text-xs">
              <span v-if="commentLength === 0" class="text-gray-400">
                Minimal {{ MIN_COMMENT_LENGTH }} karakter
              </span>
              <span v-else-if="!commentValid" class="text-red-500 flex items-center gap-1">
                <span v-if="commentTooShort">❌ Minimal {{ MIN_COMMENT_LENGTH }} karakter ({{ commentLength }}/{{ MIN_COMMENT_LENGTH }})</span>
                <span v-else-if="commentTooLong">❌ Maksimal {{ MAX_COMMENT_LENGTH }} karakter ({{ commentLength }}/{{ MAX_COMMENT_LENGTH }})</span>
              </span>
              <span v-else class="text-green-600 flex items-center gap-1">
                ✅ Komentar sudah memenuhi syarat ({{ commentLength }}/{{ MAX_COMMENT_LENGTH }})
              </span>
            </div>
          </div>

          <!-- Anonymous Toggle -->
          <div class="mb-4">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <p class="text-sm font-medium text-gray-700">Tampilkan sebagai Anonim</p>
                <p class="text-xs text-gray-500">Nama Anda tidak akan terlihat di review</p>
              </div>
              <div class="relative">
                <input
                  type="checkbox"
                  v-model="reviewForm.is_anonymous"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition cursor-pointer"
                     @click="reviewForm.is_anonymous = !reviewForm.is_anonymous"></div>
                <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition peer-checked:translate-x-5"
                     :class="reviewForm.is_anonymous ? 'translate-x-5' : ''"></div>
              </div>
            </label>
          </div>

          <!-- Media Upload -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Foto/Video Review (opsional)
            </label>

            <!-- File Previews -->
            <div v-if="previewFiles.length > 0" class="grid grid-cols-3 gap-2 mb-3">
              <div
                v-for="(item, index) in previewFiles"
                :key="index"
                class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
              >
                <!-- Image Preview -->
                <img
                  v-if="item.type === 'image'"
                  :src="item.url"
                  :alt="item.name"
                  class="w-full h-full object-cover"
                />
                <!-- Video Preview -->
                <video
                  v-else
                  :src="item.url"
                  class="w-full h-full object-cover"
                  muted
                ></video>
                <!-- Remove Button -->
                <button
                  @click="removeFile(index)"
                  class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
                <!-- File Type Badge -->
                <span
                  class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded"
                >
                  <i v-if="item.type === 'video'" class="pi pi-video mr-0.5"></i>
                  {{ index + 1 }}
                </span>
              </div>
            </div>

            <!-- Upload Button -->
            <label
              v-if="previewFiles.length < maxFiles"
              class="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-merchant-primary hover:bg-merchant-primary/5 transition"
            >
              <i class="pi pi-camera text-gray-400"></i>
              <span class="text-sm text-gray-500">
                Tambahkan Foto/Video ({{ previewFiles.length }}/{{ maxFiles }})
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                class="hidden"
                @change="handleFileSelect"
              />
            </label>
            <p class="mt-1 text-xs text-gray-400">
              Format: JPG, PNG, GIF, WEBP, MP4, MOV (max 10MB per file)
            </p>
          </div>

          <!-- Tips -->
          <div class="bg-blue-50 rounded-xl p-3 mb-4">
            <p class="text-xs text-blue-700">
              <i class="pi pi-lightbulb mr-1"></i>
              <strong>Tips:</strong> Review yang detail dan jujur membantu
              pengguna lain dalam memilih layanan yang tepat.
            </p>
          </div>
        </div>

        <!-- Warning: review can only be updated once -->
        <div class="px-5 pb-3">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div class="flex items-start gap-2.5">
              <i class="pi pi-exclamation-triangle text-amber-500 mt-0.5 text-sm"></i>
              <div>
                <p class="text-xs font-semibold text-amber-700">Informasi Ulasan</p>
                <p class="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  Ulasan hanya dapat diperbarui 1 kali setelah dikirim.<br/>
                  Setelah pembaruan dilakukan, ulasan tidak dapat diubah kembali.
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
            @click="submitReview"
            :disabled="submitting || alreadyReviewed || !canSubmitReview"
            class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="submitting">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              Mengirim...
            </span>
            <span v-else>
              <i class="pi pi-send mr-2"></i>
              Kirim Review
            </span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>