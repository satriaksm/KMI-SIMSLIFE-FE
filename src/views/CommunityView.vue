<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Banner community -->
    <header
      class="relative w-full h-[120px] sm:h-[300px] md:h-[360px] bg-secondary overflow-hidden flex items-center"
    >
      <div
        class="relative z-10 flex flex-col justify-center w-full h-full pl-4 pr-2 sm:pl-8 md:pl-12 lg:pl-36"
      >
        <h1
          class="font-bold text-white text-[24px] sm:text-[36px] lg:text-[72px] tracking-widest leading-none font-inter text-left"
        >
          KOMUNITAS
        </h1>
        <p class="sr-only">
          Komunitas UMKM lokal Banyuanyar di Sumilir untuk berbagi informasi,
          diskusi, dan promosi antar pelaku usaha dan masyarakat.
        </p>

        <div class="flex items-center mt-2">
          <span
            class="block text-white text-[10px] sm:text-[18px] md:text-[28px] font-normal tracking-[0.3em] text-left min-h-6 sm:min-h-8 md:min-h-8 font-inter"
          >
            {{ animatedText }}
          </span>
          <span
            class="ml-2 inline-block w-0.5 mb-2 h-4 sm:h-6 md:h-7 bg-white rounded transition-none"
            :class="
              isTyping
                ? 'opacity-100'
                : caretVisible
                ? 'opacity-100'
                : 'opacity-0'
            "
            aria-hidden="true"
          />
        </div>
      </div>
      <img
        :src="bannerImg"
        alt="Komunitas UMKM Lokal Banyuanyar Sumilir"
        class="absolute inset-0 w-full h-[100px] md:top-10 md:h-60 lg:h-80 object-cover"
      />
    </header>

    <!-- Main layout -->
    <div class="relative w-full">
      <!-- Mobile/tablet menubar -->
      <div
        class="z-30 flex items-center justify-between gap-2 px-2 py-2 pt-4 bg-white border-b border-gray-100 rounded-lg lg:hidden"
        :class="
          isMenubarSticky
            ? 'fixed top-0 left-0 right-0 mx-4 max-w-[calc(100%-2rem)] rounded-full shadow-md'
            : 'relative'
        "
        ref="menubarRef"
      >
        <button
          @click="showCreatePost = true"
          class="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white transition rounded-full shadow bg-secondary hover:bg-secondary/90"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Buat Post</span>
        </button>
        <div
          class="flex items-center flex-1 px-2 py-1 mx-2 border border-gray-200 rounded-full shadow bg-gray-50"
        >
          <svg
            class="w-4 h-4 mr-1 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Cari postingan..."
            v-model="searchQuery"
            class="flex-1 text-xs text-gray-700 bg-transparent outline-none"
          />
        </div>
        <div class="relative">
          <button
            @click="toggleSortPopup"
            class="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white transition border rounded-full shadow bg-secondary"
            aria-haspopup="true"
            :aria-expanded="String(showSortPopup)"
          >
            <span v-if="sortActive === 'views_count'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
                />
              </svg>
            </span>
            <span v-else-if="sortActive === 'created_at_desc'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
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
            <span v-else-if="sortActive === 'created_at_asc'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
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
          <!-- Sort popup (mobile) -->
          <div
            v-if="showSortPopup"
            class="absolute right-0 z-50 w-32 py-2 bg-white border border-gray-100 shadow-lg top-10 rounded-xl"
          >
            <button
              class="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
              :class="
                sortActive === 'views_count'
                  ? 'bg-secondary/10 text-secondary font-bold'
                  : ''
              "
              @click="setSort('views_count')"
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
                <path
                  d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
                />
              </svg>
              Populer
            </button>
            <button
              class="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
              :class="
                sortActive === 'created_at_desc'
                  ? 'bg-secondary/10 text-secondary font-bold'
                  : ''
              "
              @click="setSort('created_at_desc')"
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
              class="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
              :class="
                sortActive === 'created_at_asc'
                  ? 'bg-secondary/10 text-secondary font-bold'
                  : ''
              "
              @click="setSort('created_at_asc')"
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

      <!-- Content (centered) -->
      <main
        class="max-w-3xl px-4 py-4 mx-auto"
        :class="isMenubarSticky ? 'mt-14' : ''"
      >
        <CreatePostModal
          v-if="showCreatePost"
          @close="showCreatePost = false"
          @created="fetchPosts"
        />

        <div v-if="loading" class="py-8 text-center">Loading...</div>

        <div v-else class="space-y-6">
          <div
            v-if="filteredPosts.length === 0"
            class="py-8 text-center text-gray-500"
          >
            Belum ada post.
          </div>

          <article
            v-for="post in filteredPosts"
            :key="post.id"
            class="p-5 bg-white shadow-md rounded-2xl"
          >
            <!-- header -->
            <div class="flex items-start gap-4 mb-4">
              <UserAvatar 
                :user="post.author" 
                size="lg"
              />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <router-link
                        :to="`/profile/${post.author?.id}`"
                        class="font-semibold hover:underline"
                      >
                        {{ post.author?.name }}
                      </router-link>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">
                      {{ formatDateTime(post.created_at) }}
                    </div>
                  </div>

                  <div class="text-gray-400" @click.stop>
                    <ReportButton
                      reportable-type="post"
                      :reportable-id="post.id"
                      :reportable-name="post.post_title || 'Postingan Komunitas'"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Title & content -->
            <div class="mb-3">
              <h2 class="font-bold">
                <router-link
                  :to="`/community/${post.post_slug}`"
                  class="hover:underline"
                  v-html="highlightText(post.post_title)"
                />
              </h2>
            </div>
            <div
              class="mb-4 text-gray-800 whitespace-pre-line text-[12px] sm:text-[14px] md:text-base"
              v-html="highlightText(post.post_content)"
            ></div>

            <div class="flex flex-wrap gap-2 mb-4">
              <span
                v-for="tag in extractHashtags(post.post_content)"
                :key="tag"
                class="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full"
                >#{{ tag }}</span
              >
            </div>

            <!-- Gallery  -->
            <div class="w-full mb-3">
              <div v-if="post.images && post.images.length" class="w-full">
                <!-- Single image -->
                <div v-if="post.images.length === 1">
                  <img
                    :src="post.images[0]"
                    alt=""
                    class="object-cover w-full h-48 rounded-lg cursor-pointer sm:h-56 md:h-72 lg:h-80"
                    loading="lazy"
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
                    class="object-cover w-full h-40 rounded-lg cursor-pointer sm:h-48 md:h-56"
                    loading="lazy"
                    @click="openLightbox(post.images, i)"
                    @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                  />
                </div>

                <!-- Three images -->
                <div v-else-if="post.images.length === 3">
                  <img
                    :src="post.images[0]"
                    alt="hero"
                    class="object-cover w-full h-48 mb-2 rounded-lg cursor-pointer sm:h-56 md:h-72 lg:h-80"
                    loading="lazy"
                    @click="openLightbox(post.images, 0)"
                    @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                  />
                  <div class="grid grid-cols-2 gap-2">
                    <img
                      v-for="(imgUrl, i) in post.images.slice(1, 3)"
                      :key="i"
                      :src="imgUrl"
                      class="object-cover w-full h-32 rounded-md cursor-pointer sm:h-40 md:h-44"
                      loading="lazy"
                      @click="openLightbox(post.images, i + 1)"
                      @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                    />
                  </div>
                </div>

                <!-- 4+ images -->
                <div v-else>
                  <img
                    :src="post.images[0]"
                    alt="hero"
                    class="object-cover w-full h-48 mb-2 rounded-lg cursor-pointer sm:h-56 md:h-72 lg:h-80"
                    loading="lazy"
                    @click="openLightbox(post.images, 0)"
                    @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                  />
                  <div class="gap-2">
                    <div class="grid grid-cols-3 gap-2 md:hidden">
                      <div
                        v-for="(imgUrl, i) in post.images.slice(1, 4)"
                        :key="i"
                        class="relative"
                      >
                        <img
                          :src="imgUrl"
                          class="object-cover w-full h-24 rounded-md cursor-pointer"
                          loading="lazy"
                          @click="openLightbox(post.images, i + 1)"
                          @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                        />
                        <div
                          v-if="i === 2 && post.images.length > 4"
                          class="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white rounded-md cursor-pointer bg-black/45"
                          @click.stop="openLightbox(post.images, i + 1)"
                        >
                          <span>+{{ post.images.length - 4 }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="hidden gap-2 md:grid md:grid-cols-3">
                      <div
                        v-for="(imgUrl, i) in post.images.slice(1, 4)"
                        :key="i"
                        class="relative"
                      >
                        <img
                          :src="imgUrl"
                          class="object-cover w-full h-40 rounded-md cursor-pointer md:h-44 lg:h-48"
                          loading="lazy"
                          @click="openLightbox(post.images, i + 1)"
                          @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
                        />
                        <div
                          v-if="i === 2 && post.images.length > 4"
                          class="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white rounded-md cursor-pointer bg-black/45"
                          @click.stop="openLightbox(post.images, i + 1)"
                        >
                          <span>+{{ post.images.length - 4 }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- actions -->
            <div class="pt-3 mt-2 border-t border-gray-100">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                  <router-link
                    :to="`/community/${post.post_slug}`"
                    class="flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-800"
                  >
                    <svg
                      class="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      />
                    </svg>
                    <span>{{ post.comments_count ?? 0 }} komentar</span>
                  </router-link>
                </div>

                <div class="text-[10px] text-gray-400">
                  {{ post.views_count ?? 0 }} views
                </div>
              </div>
            </div>
          </article>
        </div>
      </main>

      <!-- Desktop sidebar -->
      <aside
        class="hidden md:hidden lg:block w-[210px] xl:w-60 2xl:w-[360px] pt-6 z-30"
        :class="
          isSidebarSticky ? 'fixed top-20 right-4' : 'absolute right-4 top-2'
        "
        ref="sidebarRef"
      >
        <div
          class="flex flex-col gap-3 p-3 bg-white shadow rounded-xl xl:p-4 2xl:p-6 xl:gap-4 2xl:gap-6"
        >
          <!-- Buat Post Button -->
          <button
            @click="showCreatePost = true"
            class="flex items-center justify-center gap-2 rounded-full bg-secondary text-white hover:bg-secondary/90 px-3 xl:px-4 2xl:px-6 py-2 xl:py-2.5 2xl:py-3 font-semibold transition text-xs xl:text-sm 2xl:text-base w-full"
          >
            <svg
              class="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            Buat Post
          </button>

          <!-- Search + Sort -->
          <div class="flex items-center gap-2">
            <!-- Search container -->
            <div
              class="flex-1 flex items-center bg-gray-50 rounded-full px-2 py-1.5 xl:py-2 shadow border border-gray-200"
            >
              <svg
                class="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari postingan..."
                v-model="searchQuery"
                class="w-full px-0 text-xs text-gray-700 bg-transparent outline-none xl:text-sm 2xl:text-base"
              />
            </div>

            <!-- Sort button:-->
            <div class="relative">
              <button
                @click="toggleSortPopup"
                class="flex items-center justify-center text-sm text-white transition rounded-full shadow bg-secondary w-9 h-9 xl:w-10 xl:h-10 2xl:w-11 2xl:h-11 xl:text-base"
                aria-haspopup="true"
                :aria-expanded="String(showSortPopup)"
              >
                <svg
                  class="w-4 h-4 xl:w-5 xl:h-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 18h6M3 6h18M3 12h12" />
                </svg>
              </button>

              <!-- Sort popup -->
              <div
                v-if="showSortPopup"
                class="absolute right-0 z-50 py-2 bg-white border border-gray-100 shadow-lg top-12 rounded-xl w-28 xl:w-32 2xl:w-36"
              >
                <button
                  class="block w-full px-3 py-2 text-xs text-left xl:px-4 hover:bg-gray-100 xl:text-sm 2xl:text-base"
                  :class="
                    sortActive === 'views_count'
                      ? 'bg-secondary/10 text-secondary font-bold'
                      : ''
                  "
                  @click="setSort('views_count')"
                >
                  Populer
                </button>
                <button
                  class="block w-full px-3 py-2 text-xs text-left xl:px-4 hover:bg-gray-100 xl:text-sm 2xl:text-base"
                  :class="
                    sortActive === 'created_at_desc'
                      ? 'bg-secondary/10 text-secondary font-bold'
                      : ''
                  "
                  @click="setSort('created_at_desc')"
                >
                  Terbaru
                </button>
                <button
                  class="block w-full px-3 py-2 text-xs text-left xl:px-4 hover:bg-gray-100 xl:text-sm 2xl:text-base"
                  :class="
                    sortActive === 'created_at_asc'
                      ? 'bg-secondary/10 text-secondary font-bold'
                      : ''
                  "
                  @click="setSort('created_at_asc')"
                >
                  Terlama
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightbox.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div class="absolute inset-0" @click="closeLightbox"></div>

      <div class="relative z-10 w-full max-w-4xl px-4">
        <button
          class="absolute z-20 p-2 text-white rounded-full top-4 right-4 bg-black/30"
          @click="closeLightbox"
          aria-label="close"
        >
          ✕
        </button>

        <button
          v-if="lightbox.index > 0"
          class="absolute z-20 p-2 text-white -translate-y-1/2 rounded-full left-2 top-1/2 bg-black/30"
          @click.stop="prevImage"
          aria-label="previous"
        >
          ‹
        </button>

        <button
          v-if="lightbox.index < lightbox.images.length - 1"
          class="absolute z-20 p-2 text-white -translate-y-1/2 rounded-full right-2 top-1/2 bg-black/30"
          @click.stop="nextImage"
          aria-label="next"
        >
          ›
        </button>

        <div class="flex items-center justify-center">
          <img
            :src="lightbox.images[lightbox.index]"
            class="max-h-[80vh] object-contain rounded-md"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
            @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
          />
        </div>

        <div class="mt-3 text-sm text-center text-white">
          {{ lightbox.index + 1 }} / {{ lightbox.images.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  computed,
  watch,
} from "vue";
import CreatePostModal from "@/components/community/CreatePostModal.vue";
import api from "@/libs/axios";
import bannerImg from "@/assets/banner-community.png";
import { setMeta } from "@/router/seo";
import { getCommunityImageUrl } from '@/libs/getImageUrl'; // ✅ ADD
import UserAvatar from "@/components/common/UserAvatar.vue";
import ReportButton from "@/components/ReportButton.vue";

/* STATE */
const posts = ref([]);
const loading = ref(false);
const showCreatePost = ref(false);
const searchQuery = ref("");
const showSortPopup = ref(false);
const sortActive = ref("created_at_desc");

/* LIGHTBOX */
const lightbox = ref({ open: false, images: [], index: 0 });
let touchStartX = 0;
let touchEndX = 0;

/* STICKY */
const menubarRef = ref(null);
const isMenubarSticky = ref(false);
const sidebarRef = ref(null);
const isSidebarSticky = ref(false);
let sidebarInitialTop = 0;

/* TYPEWRITER */
const taglines = ["Saling Terhubung", "Saling Terbantu", "Peluang Untuk Semua"];
const animatedText = ref("");
let taglineIdx = 0;
let charIdx = 0;
let typingInterval = null;
let waitingTimeout = null;
const isTyping = ref(false);
const caretVisible = ref(true);
let caretInterval = null;

// ==================== COMPUTED ====================

const filteredPosts = computed(() => {
  if (!searchQuery.value.trim()) return posts.value;
  const q = searchQuery.value.trim().toLowerCase();
  return posts.value.filter(
    (post) =>
      post.post_title?.toLowerCase().includes(q) ||
      post.post_content?.toLowerCase().includes(q)
  );
});

// ==================== LIGHTBOX ====================

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

function openLightbox(imagesArray, startIndex = 0) {
  lightbox.value.images = Array.isArray(imagesArray) ? imagesArray : [];
  lightbox.value.index = Math.max(
    0,
    Math.min(startIndex, lightbox.value.images.length - 1)
  );
  lightbox.value.open = true;
  window.addEventListener("keydown", onKeydown);
}

function closeLightbox() {
  lightbox.value.open = false;
  window.removeEventListener("keydown", onKeydown);
}

function prevImage() {
  if (lightbox.value.index > 0) lightbox.value.index--;
}

function nextImage() {
  if (lightbox.value.index < lightbox.value.images.length - 1)
    lightbox.value.index++;
}

function onKeydown(e) {
  if (!lightbox.value.open) return;
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

// ✅ UPDATED: Helper function untuk image URL
function imageUrl(img) {
  if (!img) return "/placeholder.png";
  
  // Jika sudah berupa URL lengkap
  if (typeof img === "string") {
    if (img.startsWith('http')) return img;
    
    // Jika path relatif dari storage
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const backendUrl = apiBaseUrl.replace(/\/api$/, '');
    
    if (img.startsWith('/storage/')) {
      return `${backendUrl}${img}`;
    }
    
    return `${backendUrl}/storage/${img}`;
  }
  
  // Jika object dengan property
  if (typeof img === "object") {
    // Prioritas: image_url > url > path > file_path
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

// ✅ UPDATED: Normalize images dengan streaming API
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

// ✅ ADD: extractHashtags function
function extractHashtags(text = "") {
  const tags = [];
  try {
    const re = /#([a-zA-Z0-9_]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      tags.push(m[1]);
      if (tags.length >= 6) break;
    }
  } catch (e) {
    // silently fail
  }
  return tags;
}

// ==================== API ====================

async function fetchPosts() {
  loading.value = true;
  try {
    const res = await api.get("/api/community/posts");
    
    // ✅ Handle different response structures
    let rawPosts = [];
    if (Array.isArray(res.data)) rawPosts = res.data;
    else if (Array.isArray(res.data?.items)) rawPosts = res.data.items;
    else if (Array.isArray(res.data?.data)) rawPosts = res.data.data;
    else if (Array.isArray(res.data?.posts)) rawPosts = res.data.posts;
    else rawPosts = [];

    // ✅ Normalize posts with proper image URLs
    posts.value = rawPosts.map((p) => ({
      ...p,
      user: p.user || {},
      author: p.author || {},
      images: normalizeImages(p.images || []), // ✅ Normalize images
      comments_count: p.comments_count ?? 0,
      views_count: p.views_count ?? p.views ?? 0,
    }));
    
    console.log('[CommunityView] Posts loaded:', posts.value.length);
    console.log('[CommunityView] Sample image URLs:', posts.value[0]?.images);
  } catch (e) {
    console.error("[CommunityView] Failed to fetch posts:", e.message);
    posts.value = [];
  } finally {
    loading.value = false;
  }
}

// ==================== SORT ====================

function toggleSortPopup() {
  showSortPopup.value = !showSortPopup.value;
}

function setSort(type) {
  sortActive.value = type;
  showSortPopup.value = false;
  sortBy(type);
}

function sortBy(type, order = "desc") {
  if (type === "views_count") {
    posts.value = [...posts.value].sort(
      (a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)
    );
  } else if (type === "created_at_desc") {
    posts.value = [...posts.value].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } else if (type === "created_at_asc") {
    posts.value = [...posts.value].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }
}

// ==================== SEARCH HIGHLIGHT ====================

function highlightText(text) {
  if (!searchQuery.value.trim()) return text;
  const q = searchQuery.value.trim();
  const re = new RegExp(`(${q})`, "gi");
  return text.replace(
    re,
    '<span class="px-1 font-bold rounded bg-secondary/20 text-secondary">' +
      "$1" +
      "</span>"
  );
}

// ==================== STICKY LOGIC ====================

function handleMenubarScroll() {
  if (!menubarRef.value) return;
  const bannerHeight =
    window.innerWidth < 640 ? 120 : window.innerWidth < 768 ? 300 : 360;
  isMenubarSticky.value = window.scrollY >= bannerHeight;
}

function handleSidebarScroll() {
  if (!sidebarRef.value) return;

  if (sidebarInitialTop === 0 && sidebarRef.value) {
    const rect = sidebarRef.value.getBoundingClientRect();
    sidebarInitialTop = rect.top + window.scrollY;
  }

  const currentScroll = window.scrollY;
  const navbarHeight = 80;
  isSidebarSticky.value = currentScroll >= sidebarInitialTop - navbarHeight;
}

function handleScroll() {
  handleMenubarScroll();
  handleSidebarScroll();
}

// ==================== TYPEWRITER ====================

function startCaretBlink(intervalMs = 500) {
  if (caretInterval) clearInterval(caretInterval);
  caretInterval = setInterval(() => {
    caretVisible.value = !caretVisible.value;
  }, intervalMs);
}

function stopCaretBlink() {
  if (caretInterval) {
    clearInterval(caretInterval);
    caretInterval = null;
  }
  caretVisible.value = true;
}

function clearTimers() {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (waitingTimeout) {
    clearTimeout(waitingTimeout);
    waitingTimeout = null;
  }
  stopCaretBlink();
}

function typeTagline() {
  isTyping.value = true;
  stopCaretBlink();
  animatedText.value = "";
  charIdx = 0;

  typingInterval = setInterval(() => {
    if (charIdx < taglines[taglineIdx].length) {
      animatedText.value += taglines[taglineIdx][charIdx];
      charIdx++;
    } else {
      clearInterval(typingInterval);
      typingInterval = null;
      isTyping.value = false;
      waitingTimeout = setTimeout(() => {
        startCaretBlink(500);
        waitingTimeout = setTimeout(() => eraseTagline(), 3000);
      }, 300);
    }
  }, 60);
}

function eraseTagline() {
  stopCaretBlink();
  typingInterval = setInterval(() => {
    if (animatedText.value.length > 0) {
      animatedText.value = animatedText.value.slice(0, -1);
    } else {
      clearInterval(typingInterval);
      typingInterval = null;
      taglineIdx = (taglineIdx + 1) % taglines.length;
      waitingTimeout = setTimeout(() => typeTagline(), 300);
    }
  }, 30);
}

function startTypingCycle() {
  clearTimers();
  typeTagline();
}

// ==================== EVENT HANDLERS ====================

function onDocumentClick(e) {
  if (!showSortPopup.value) return;
  const btn = e.target.closest('[aria-haspopup="true"]');
  if (!btn) showSortPopup.value = false;
}

// ==================== LIFECYCLE ====================

onMounted(async () => {
  await nextTick();
  fetchPosts();
  startTypingCycle();

  window.addEventListener("scroll", handleScroll);
  document.addEventListener("click", onDocumentClick);

  nextTick(() => {
    if (sidebarRef.value) {
      const rect = sidebarRef.value.getBoundingClientRect();
      sidebarInitialTop = rect.top + window.scrollY;
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  document.removeEventListener("click", onDocumentClick);
  clearTimers();
});
</script>
