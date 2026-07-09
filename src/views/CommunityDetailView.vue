<template>
  <div class="max-w-3xl px-3 py-4 mx-auto sm:py-6 sm:px-6 md:px-8">
    <!-- No back button here, moving it inside the post card for better alignment -->


    <div v-if="loading" class="py-8 text-center">Loading...</div>

    <div v-else-if="post">
      <!-- Post card -->
      <div class="mb-5 sm:mb-6 overflow-hidden rounded-2xl shadow-md border"
        :class="[
          post.author?.is_super_admin ? 'border-secondary' :
          post.author?.is_admin ? 'border-secondary/40' :
          'border-gray-100'
        ]"
      >
        <!-- Role Striking Header -->
        <div v-if="post.author?.is_super_admin" class="bg-gradient-to-r from-secondary to-[#058895] px-4 py-2.5 flex items-center justify-between text-white border-b border-secondary/20">
          <img :src="LogoWithText" alt="Sumilir" class="h-4 w-auto object-contain brightness-0 invert pointer-events-none drop-shadow-sm" />
        </div>
        <div v-else-if="post.author?.is_admin" class="bg-gradient-to-r from-secondary/15 to-transparent px-4 py-2.5 flex items-center justify-between border-b border-secondary/10">
          <div class="flex items-center gap-1.5 font-bold text-[11px] text-secondary uppercase tracking-widest">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
            INFO ADMIN
          </div>
          <img :src="LogoWithText" alt="Sumilir" class="h-3.5 w-auto object-contain opacity-50 pointer-events-none grayscale contrast-200" />
        </div>

        <!-- Event Banner Hero (only for event posts) -->
        <div v-if="post.post_type === 'event' && (post.event?.banner_url || post.event?.banner_img_path || post.event?.event_name)"
          class="relative w-full h-48 sm:h-64 overflow-hidden"
          :style="!(post.event?.banner_url || post.event?.banner_img_path) ? 'background: linear-gradient(135deg, #ffa30e 0%, #0894eb 100%)' : ''">
          <img
            v-if="post.event?.banner_url || post.event?.banner_img_path"
            :src="post.event.banner_url || `/storage/${post.event.banner_img_path}`"
            :alt="post.event?.event_name"
            class="w-full h-full object-cover"
            @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          <!-- EVENT badge + views -->
          <div class="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <span class="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-secondary text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
              Event
              <img :src="LogoWithText" alt="Sumilir" class="h-3.5 object-contain" />
            </span>
            <span class="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white/90 text-[10px] px-2.5 py-1 rounded-full shadow-sm">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {{ post.views_count ?? 0 }}
            </span>
          </div>

          <!-- Event name + dates at bottom of banner -->
          <div class="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p v-if="post.event?.event_name" class="text-white font-bold text-lg sm:text-xl leading-snug drop-shadow mb-2">
              {{ post.event.event_name }}
            </p>
            <div v-if="post.event" class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-medium px-3 py-1 rounded-full">
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ post.event.event_start_date ? new Date(post.event.event_start_date).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) : '-' }}
              </span>
              <span v-if="post.event.event_end_date && post.event.event_end_date !== post.event.event_start_date"
                class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-medium px-3 py-1 rounded-full">
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                s/d {{ new Date(post.event.event_end_date).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Card body -->
        <div class="p-4 sm:p-5 md:p-6 bg-white">
          <div class="flex items-start gap-3 sm:gap-4">
            <!-- Avatar -->
            <div :class="['shrink-0', post.author?.is_super_admin || post.author?.is_admin ? 'rounded-full ring-2 ring-secondary/25 ring-offset-1' : 'rounded-full p-0.5 bg-secondary/20']">
              <UserAvatar :user="post.author" size="lg" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start w-full">
                <!-- author + badges + date -->
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <router-link :to="`/profile/${post.author?.id}`" class="text-sm font-semibold text-gray-900 hover:text-secondary transition-colors">
                      {{ post.author?.name }}
                    </router-link>
                    <span v-if="post.author?.is_super_admin"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-white">
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      Superadmin
                    </span>
                    <span v-else-if="post.author?.is_admin"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                      Admin
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-400">{{ formatDateTime(post.created_at) }}</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <ReportButton reportable-type="post" :reportable-id="post.id" :reportable-name="post.post_title || 'Postingan Komunitas'" />
                  <router-link to="/community" class="text-secondary hover:opacity-80 transition" title="Kembali ke Komunitas">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 sm:w-7 sm:h-7">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </router-link>
                </div>
              </div>

              <!-- Title -->
              <h1 class="mt-3 text-base font-bold leading-snug text-gray-900 sm:text-xl md:text-2xl">
                {{ post.post_title }}
              </h1>

              <!-- Content -->
              <div class="mt-2 sm:mt-3 text-[12px] sm:text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed">
                {{ post.post_content }}
              </div>
            </div>
          </div>

          <!-- Gallery -->
          <div class="mt-4 sm:mt-5">
            <div v-if="post.images && post.images.length">
              <div v-if="post.images.length === 1">
                <ResponsiveImage :src="post.images[0].src" :urls="post.images[0].urls"
                  customClass="object-cover w-full h-40 rounded-xl cursor-pointer sm:h-52 md:h-72 lg:h-96"
                  @click="openLightbox(post.images, 0)"
                  @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }" />
              </div>
              <div v-else-if="post.images.length === 2" class="grid grid-cols-2 gap-2">
                <ResponsiveImage v-for="(imgObj, i) in post.images.slice(0, 2)" :key="i"
                  :src="imgObj.src" :urls="imgObj.urls"
                  customClass="object-cover w-full h-32 rounded-xl cursor-pointer sm:h-40 md:h-56"
                  @click="openLightbox(post.images, i)"
                  @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }" />
              </div>
              <div v-else>
                <ResponsiveImage :src="post.images[0].src" :urls="post.images[0].urls"
                  customClass="object-cover w-full h-40 mb-2 rounded-xl cursor-pointer sm:h-52 md:h-72 lg:h-96"
                  @click="openLightbox(post.images, 0)"
                  @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }" />
                <div class="grid grid-cols-3 gap-2">
                  <div v-for="(imgObj, i) in post.images.slice(1, 4)" :key="i" class="relative">
                    <ResponsiveImage :src="imgObj.src" :urls="imgObj.urls"
                      customClass="object-cover w-full rounded-lg cursor-pointer h-18 sm:h-24 md:h-32"
                      @click="openLightbox(post.images, i + 1)"
                      @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }" />
                    <div v-if="i === 2 && post.images.length > 4"
                      class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white rounded-lg cursor-pointer bg-black/50 sm:text-sm"
                      @click.stop="openLightbox(post.images, i + 1)">
                      +{{ post.images.length - 4 }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Views footer -->
          <div class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ post.views_count ?? 0 }} kali dilihat
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
          <ResponsiveImage
            :src="lightbox.images[lightbox.index]?.src || lightbox.images[lightbox.index]"
            :urls="lightbox.images[lightbox.index]?.urls"
            customClass="max-h-[65vh] sm:max-h-[75vh] object-contain rounded-md"
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
import { useToast } from "vue-toastification";
import { getCommunityImageUrl } from '@/libs/getImageUrl';
import UserAvatar from "@/components/common/UserAvatar.vue";
import ResponsiveImage from "@/components/common/ResponsiveImage.vue";
import ReportButton from "@/components/ReportButton.vue";
import LogoWithText from "@/assets/icons/LogoWithText.png";
import LogoNoText from "@/assets/icons/LogoNoText.png";

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
        return {
          src: getCommunityImageUrl(item.id),
          urls: item.image_urls || item.urls || null
        };
      }
      
      // Fallback untuk backward compatibility
      if (typeof item === "string") {
        if (item.startsWith('http')) return { src: item, urls: null };
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const backendUrl = apiBaseUrl.replace(/\/api$/, '');
        
        if (item.startsWith('/storage/')) {
          return { src: `${backendUrl}${item}`, urls: null };
        }
        
        return { src: `${backendUrl}/storage/${item}`, urls: null };
      }
      
      return null;
    })
    .filter((img) => img && img.src);
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
