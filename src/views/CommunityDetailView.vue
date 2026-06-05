<template>
  <div class="max-w-3xl px-3 py-4 mx-auto sm:py-6 sm:px-6 md:px-8">
    <!-- No back button here, moving it inside the post card for better alignment -->


    <div v-if="loading" class="py-8 text-center">Loading...</div>

    <div v-else-if="post">
      <!-- Post card -->
      <div class="p-3 mb-5 bg-white rounded-lg shadow sm:p-5 md:p-6 sm:mb-6 relative">
        <div class="flex items-start gap-3 sm:gap-4">
          <!-- avatar -->
          <UserAvatar 
            :user="post.author" 
            size="lg"
          />

          <div class="flex-1">
            <div class="flex justify-between items-start w-full">
              <!-- author + date -->
              <div class="flex flex-col gap-0.5">
                <div class="text-[10px] sm:text-xs text-gray-500">
                  oleh
                  <span class="ml-1 font-medium text-gray-800">
                    {{ post.author?.name }}
                  </span>
                </div>
                <div class="mt-1 text-xs text-gray-500">
                  {{ formatDateTime(post.created_at) }}
                </div>
              </div>

              <!-- Action icons (Report & Back) -->
              <div class="flex items-center gap-3">
                <ReportButton
                  reportable-type="post"
                  :reportable-id="post.id"
                  :reportable-name="post.post_title || 'Postingan Komunitas'"
                />
                
                <!-- NEW Back Button aligned with user photo -->
                <router-link
                  to="/community"
                  class="text-secondary hover:text-secondary/80 transition-colors"
                  title="Kembali ke Komunitas"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 sm:w-7 sm:h-7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </router-link>
              </div>
            </div>

            <!-- title -->
            <h1
              class="mt-2 text-base font-semibold leading-snug text-gray-900 sm:mt-3 sm:text-xl md:text-2xl"
            >
              {{ post.post_title }}
            </h1>

            <!-- content -->
            <div
              class="mt-2 sm:mt-3 text-[11px] sm:text-sm md:text-base text-gray-800 whitespace-pre-line"
            >
              {{ post.post_content }}
            </div>
          </div>
        </div>

        <!-- gallery -->
        <div class="mt-4 sm:mt-5">
          <div v-if="post.images && post.images.length">
            <!-- Single image -->
            <div v-if="post.images.length === 1">
              <img
                :src="post.images[0]"
                class="object-cover w-full h-40 rounded-lg cursor-pointer sm:h-52 md:h-72 lg:h-96"
                @click="openLightbox(post.images, 0)"
                @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
              />
            </div>

            <!-- Two images -->
            <div v-else-if="post.images.length === 2" class="grid grid-cols-2 gap-2">
              <img
                v-for="(imgUrl, i) in post.images.slice(0, 2)"
                :key="i"
                :src="imgUrl"
                class="object-cover w-full h-32 rounded-lg cursor-pointer sm:h-40 md:h-56"
                @click="openLightbox(post.images, i)"
                @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
              />
            </div>

            <!-- 3+ images: hero + thumbnails -->
            <div v-else>
              <img
                :src="post.images[0]"
                class="object-cover w-full h-40 mb-2 rounded-lg cursor-pointer sm:h-52 md:h-72 lg:h-96"
                @click="openLightbox(post.images, 0)"
                @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
              />

              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="(imgUrl, i) in post.images.slice(1, 4)"
                  :key="i"
                  class="relative"
                >
                  <img
                    :src="imgUrl"
                    class="object-cover w-full rounded-md cursor-pointer h-18 sm:h-24 md:h-32"
                    @click="openLightbox(post.images, i + 1)"
                    @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                  />
                  <div
                    v-if="i === 2 && post.images.length > 4"
                    class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white rounded-md cursor-pointer bg-black/45 sm:text-sm md:text-base"
                    @click.stop="openLightbox(post.images, i + 1)"
                  >
                    +{{ post.images.length - 4 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comment section -->
      <section
        v-if="post"
        class="p-3 bg-white rounded-lg shadow mb-24 sm:p-5 md:p-6"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <h2 class="text-sm font-semibold sm:text-base">
            Komentar ({{ totalCommentsCount }})
          </h2>

          <!-- Sort komentar -->
          <div class="relative">
            <button
              @click="toggleCommentSort"
              class="flex items-center justify-center text-white transition rounded-full shadow bg-secondary w-9 h-9 sm:w-10 sm:h-10 hover:bg-secondary/90"
              aria-haspopup="true"
              :aria-expanded="String(showCommentSort)"
            >
              <span v-if="commentSort === 'newest'">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="M11 4h10" />
                  <path d="M11 8h7" />
                  <path d="M11 12h4" />
                </svg>
              </span>
              <span v-else>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="m3 8 4-4 4 4" />
                  <path d="M7 4v16" />
                  <path d="M11 12h10" />
                  <path d="M11 16h7" />
                  <path d="M11 20h4" />
                </svg>
              </span>
            </button>

            <div
              v-if="showCommentSort"
              class="absolute right-0 z-[1001] py-2 bg-white border border-gray-100 shadow-lg top-12 rounded-xl w-28 sm:w-32"
            >
              <button
                class="block w-full px-3 py-2 text-xs text-left transition sm:px-4 hover:bg-gray-100 sm:text-sm"
                :class="
                  commentSort === 'newest'
                    ? 'bg-secondary/10 text-secondary font-bold'
                    : ''
                "
                @click="setCommentSort('newest')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="inline w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="M11 4h10" />
                  <path d="M11 8h7" />
                  <path d="M11 12h4" />
                </svg>
                Terbaru
              </button>
              <button
                class="block w-full px-3 py-2 text-xs text-left transition sm:px-4 hover:bg-gray-100 sm:text-sm"
                :class="
                  commentSort === 'oldest'
                    ? 'bg-secondary/10 text-secondary font-bold'
                    : ''
                "
                @click="setCommentSort('oldest')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="inline w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="m3 8 4-4 4 4" />
                  <path d="M7 4v16" />
                  <path d="M11 12h10" />
                  <path d="M11 16h7" />
                  <path d="M11 20h4" />
                </svg>
                Terlama
              </button>
            </div>
          </div>
        </div>

        <!-- comment input -->
        <div class="mb-3 sm:mb-4">
          <CommentForm
            :postId="post.id"
            :parentId="replyState.parentId"
            :parentLabel="replyState.parentLabel"
            @added="onCommentAdded"
            @clearReply="clearReply"
          />
        </div>

        <!-- thread -->
        <div class="mt-2 space-y-3 sm:mt-3 sm:space-y-4">
          <CommentThread
            :comments="sortedComments"
            :postId="post.id"
            @replyRequest="onReplyRequest"
            @replyAdded="fetchComments"
          />
        </div>

        <!-- show more -->
        <div v-if="hasMore" class="mt-3 text-center sm:mt-4">
          <button
            @click="loadMore"
            class="text-xs font-medium text-secondary sm:text-sm hover:underline"
          >
            Show more ↓
          </button>
        </div>
      </section>
    </div>

    <div v-if="!loading && !post" class="py-8 text-center text-gray-500">
      Post tidak ditemukan.
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightbox.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 sm:p-4"
    >
      <div class="absolute inset-0" @click="closeLightbox"></div>

      <div class="relative z-10 w-full max-w-4xl">
        <button
          class="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 text-white bg-black/30 rounded-full p-1.5 sm:p-2 text-xs sm:text-sm"
          @click="closeLightbox"
          aria-label="close"
        >
          ✕
        </button>

        <button
          v-if="lightbox.index > 0"
          class="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 rounded-full p-1.5 sm:p-2 text-xs sm:text-sm"
          @click.stop="prevImage"
          aria-label="previous"
        >
          ‹
        </button>

        <button
          v-if="lightbox.index < lightbox.images.length - 1"
          class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 rounded-full p-1.5 sm:p-2 text-xs sm:text-sm"
          @click.stop="nextImage"
          aria-label="next"
        >
          ›
        </button>

        <div class="flex items-center justify-center">
          <img
            :src="lightbox.images[lightbox.index]"
            class="max-h-[65vh] sm:max-h-[75vh] object-contain rounded-md"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
            @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
          />
        </div>

        <div class="text-center text-[10px] sm:text-xs text-white mt-3">
          {{ lightbox.index + 1 }} / {{ lightbox.images.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/libs/axios";
import CommentForm from "@/components/community/CommentForm.vue";
import CommentThread from "@/components/community/CommentThread.vue";
import { getCommunityImageUrl } from '@/libs/getImageUrl'; // ✅ ADD
import UserAvatar from "@/components/common/UserAvatar.vue";
import ReportButton from "@/components/ReportButton.vue";

const route = useRoute();
const post = ref(null);
const comments = ref([]);
const loading = ref(false);
const page = ref(1);
const perPage = 10;
const hasMore = ref(false);

// Comment sort
const showCommentSort = ref(false);
const commentSort = ref("newest");
const commentSortLabel = computed(() =>
  commentSort.value === "newest" ? "Terbaru" : "Terlama"
);

// Lightbox
const lightbox = ref({ open: false, images: [], index: 0 });

// Reply state
const replyState = ref({ parentId: null, parentLabel: "" });

// Total comments count
let postsCommentCount = ref(0);

const totalCommentsCount = computed(() => postsCommentCount.value);

const sortedComments = computed(() => {
  const sorted = [...comments.value];
  if (commentSort.value === "newest") {
    return sorted.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } else {
    return sorted.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }
});

// ==================== COMMENT SORT ====================

function toggleCommentSort() {
  showCommentSort.value = !showCommentSort.value;
}

function setCommentSort(type) {
  commentSort.value = type;
  showCommentSort.value = false;
  localStorage.setItem("commentSort", type);
}

function sortComments() {
  if (commentSort.value === "newest") {
    comments.value = [...comments.value].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } else {
    comments.value = [...comments.value].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }
}

// ==================== LIGHTBOX ====================

let touchStartX = 0;
let touchEndX = 0;

function onTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}
function onTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const dx = touchStartX - touchEndX;
  const threshold = 40;
  if (dx > threshold) nextImage();
  else if (dx < -threshold) prevImage();
}

function openLightbox(images, idx = 0) {
  lightbox.value.images = images || [];
  lightbox.value.index = idx;
  lightbox.value.open = true;
  window.addEventListener("keydown", onKey);
}

function closeLightbox() {
  lightbox.value.open = false;
  window.removeEventListener("keydown", onKey);
}

function prevImage() {
  if (lightbox.value.index > 0) lightbox.value.index--;
}

function nextImage() {
  if (lightbox.value.index < lightbox.value.images.length - 1)
    lightbox.value.index++;
}

function onKey(e) {
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "ArrowRight") nextImage();
}

// ==================== HELPERS ====================

function formatDateTime(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return (
      dt.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) +
      " " +
      dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return d;
  }
}

// ✅ UPDATED: Helper function untuk image URL (same as CommunityView)
function imageUrl(img) {
  if (!img) return "/placeholder.png";
  
  if (typeof img === "string") {
    if (img.startsWith('http')) return img;
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const backendUrl = apiBaseUrl.replace(/\/api$/, '');
    
    if (img.startsWith('/storage/')) {
      return `${backendUrl}${img}`;
    }
    
    return `${backendUrl}/storage/${img}`;
  }
  
  if (typeof img === "object") {
    const imgPath = img.image_url || img.url || img.path || img.file_path;
    
    if (!imgPath) return "/placeholder.png";
    
    if (imgPath.startsWith('http')) return imgPath;
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const backendUrl = apiBaseUrl.replace(/\/api$/, '');
    
    if (imgPath.startsWith('/storage/')) {
      return `${backendUrl}${imgPath}`;
    }
    
    return `${backendUrl}/storage/${imgPath}`;
  }
  
  return "/placeholder.png";
}

// ✅ UPDATED: Normalize images dengan streaming API (same as CommunityView)
function normalizeImages(arr) {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .map((item) => {
      if (!item) return null;
      
      // ✅ Gunakan streaming API endpoint
      if (typeof item === "object" && item.id) {
        return getCommunityImageUrl(item.id);
      }
      
      // Fallback untuk backward compatibility
      if (typeof item === "string") {
        if (item.startsWith('http')) return item;
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const backendUrl = apiBaseUrl.replace(/\/api$/, '');
        
        if (item.startsWith('/storage/')) {
          return `${backendUrl}${item}`;
        }
        
        return `${backendUrl}/storage/${item}`;
      }
      
      return null;
    })
    .filter(Boolean);
}

// ==================== API ====================

async function fetchPost() {
  loading.value = true;
  try {
    const res = await api.get(`/api/community/posts/${route.params.slug}`);
    post.value = res.data?.data || res.data?.post || res.data;
    
    // ✅ Normalize images with proper URLs
    post.value.images = normalizeImages(
      post.value.images || post.value.post_images || []
    );
    
    console.log('[CommunityDetail] Post loaded:', post.value.post_title);
    console.log('[CommunityDetail] Images:', post.value.images);
  } catch (e) {
    console.error("[CommunityDetailView] Failed to fetch post:", e.message);
    post.value = null;
  } finally {
    loading.value = false;
  }
}

async function fetchComments(reset = true) {
  if (!post.value?.id) return;
  if (reset) page.value = 1;
  try {
    const res = await api.get(
      `/api/community/posts/${post.value.id}/comments`,
      {
        params: { page: page.value, per_page: perPage },
      }
    );
    const payload = res.data?.comments || [];
    if (reset) comments.value = normalizeComments(payload);
    else comments.value = comments.value.concat(normalizeComments(payload));
    hasMore.value = Array.isArray(payload) && payload.length >= perPage;

    postsCommentCount.value = res.data?.post?.comments_count || 0;

    sortComments();
  } catch (e) {
    console.error("[CommunityDetailView] Failed to fetch comments:", e.message);
  }
}

// ==================== NORMALIZATION ====================

function normalizeComments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((c) => ({
    id: c.id,
    content: c.comment_content,
    created_at: c.created_at,
    user: c.author || { id: c.author_id, name: c.author_name },
    replies: Array.isArray(c.replies) ? normalizeComments(c.replies) : [],
    replying_to: c.replying_to
      ? {
          user_id: c.replying_to.user_id,
          username: c.replying_to.username,
        }
      : null,
  }));
}

// ==================== COMMENT HANDLERS ====================

function onCommentAdded() {
  fetchComments(true);
}

function loadMore() {
  page.value += 1;
  fetchComments(false);
}

function onReplyRequest({ parentId, parentLabel }) {
  replyState.value = { parentId, parentLabel };
}

function clearReply() {
  replyState.value = { parentId: null, parentLabel: "" };
}

// ==================== LIFECYCLE ====================

onMounted(async () => {
  const savedSort = localStorage.getItem("commentSort");
  if (savedSort) commentSort.value = savedSort;

  await fetchPost();
  await fetchComments(true);

  document.addEventListener("click", (e) => {
    if (showCommentSort.value && !e.target.closest('[aria-haspopup="true"]')) {
      showCommentSort.value = false;
    }
  });
});
</script>
