<template>
  <div class="min-h-screen">
    <!-- Mobile Sticky Search -->
    <transition
      enter-active-class="transition-all ease-out duration-250"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        class="sticky top-0 z-50 bg-white border-b border-gray-200 sm:hidden"
      >
        <div
          v-if="showMobileStickySearch"
          class="flex items-center gap-2 px-3 py-3"
          @focusin="stickySearchFocused = true"
          @focusout="stickySearchFocused = false"
        >
          <!-- SEARCH INPUT -->
          <form @submit.prevent="submitMobileSearch" class="flex-1">
            <div class="relative">
              <TextField
                :modelValue="mobileSearchQuery"
                @update:modelValue="(v) => (mobileSearchQuery = v)"
                name="mobileSearch"
                placeholder="Cari produk atau UMKM…"
                variant="primary"
              />
            </div>
          </form>
          <button
            v-if="!isAdmin"
            @click="goToCart"
            class="relative w-10 h-10 transition rounded-full hover:bg-gray-100 active:scale-95"
          >
            <i class="text-lg pi pi-shopping-cart"></i>

            <span
              v-if="cartCount > 0"
              class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {{ cartCount > 9 ? "9+" : cartCount }}
            </span>
          </button>
        </div>
      </div>
    </transition>
    <!-- HERO (banner + search bar) - disamakan dengan Home.vue -->
    <section id="hero" class="relative">
      <div
        class="relative w-full overflow-hidden bg-gray-100 aspect-3/1 sm:aspect-21/9 lg:aspect-24/9 xl:aspect-4/1"
      >
        <!-- Loading skeleton -->
        <div
          v-if="isLoadingBanner"
          class="absolute inset-0 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <i class="text-4xl text-gray-400 pi pi-spin pi-spinner"></i>
          </div>
        </div>

        <Carousel
          v-else-if="eventBanners.length > 0"
          v-bind="carouselConfig"
          class="h-full"
        >
          <Slide
            v-for="event in eventBanners"
            :key="`${event.id}-${event.updated_at}`"
          >
            <div
              class="relative w-full h-full group cursor-grab active:cursor-grabbing"
            >
              <ResponsiveImage
                :key="`banner-${event.id}-${event.updated_at}`"
                :src="getEventBannerUrl(event)"
                :urls="event.banner_urls"
                :alt="event.event_name"
                customClass="object-cover w-full h-full pointer-events-none select-none"
                draggable="false"
                @error="(e) => (e.target.src = '/placeholder.png')"
              />
            </div>
          </Slide>
        </Carousel>

        <!-- Fallback: No banners available -->
        <div
          v-else
          class="absolute inset-0 flex items-center justify-center bg-secondary"
        >
          <div class="px-4 text-center text-white">
            <i class="mb-4 text-5xl opacity-50 pi pi-calendar"></i>
            <p class="text-lg font-semibold">Belum ada event aktif</p>
          </div>
        </div>
      </div>

      <!-- Search Bar Container -->
      <div
        class="relative z-10 flex justify-center px-4 mx-auto mt-2 sm:-mt-10 max-w-7xl"
      >
        <div class="w-full sm:w-[906px]">
          <div
            class="overflow-hidden bg-white border border-gray-100 shadow-xl rounded-2xl"
          >
            <div class="p-4 border-b border-gray-100 sm:p-5">
              <Form @submit="onSearch">
                <div class="flex items-center w-full gap-2 sm:gap-3">
                  <TextField
                    name="search"
                    ref="searchInputRef"
                    :modelValue="searchQuery"
                    @update:modelValue="(v) => (searchQuery = v)"
                    :placeholder="searchPlaceholder"
                    :hideLabel="true"
                    variant="primary"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    class="px-3 text-sm sm:text-base sm:px-4"
                  >
                    Search
                  </Button>
                </div>
              </Form>
            </div>

            <div class="p-4 sm:p-5">
              <div class="grid grid-cols-4 gap-3 sm:gap-4">
                <button
                  v-for="nav in segmentNavigates"
                  :key="nav.label"
                  type="button"
                  class="flex flex-col items-center gap-2 p-3 transition bg-white border group rounded-xl"
                  :class="
                    activeMode === nav.mode
                      ? 'border-secondary/40 bg-secondary/10'
                      : 'border-transparent hover:border-secondary/30 hover:bg-secondary/20'
                  "
                  @click="selectMode(nav.mode)"
                >
                  <div
                    class="flex items-center justify-center w-12 h-12 transition rounded-lg sm:w-14 sm:h-14 group-hover:scale-105"
                    :class="
                      activeMode === nav.mode ? 'bg-secondary' : 'bg-primary'
                    "
                  >
                    <img
                      :src="nav.icon"
                      :alt="nav.label"
                      class="w-7 h-7 sm:w-8 sm:h-8"
                    />
                  </div>
                  <span
                    class="text-xs text-gray-700 sm:text-sm group-hover:text-secondary/70"
                  >
                    {{ nav.label }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <div class="p-4 mx-auto space-y-6 max-w-7xl">
      <!-- Pilih Kategori -->
      <section v-if="enableCategoryFilter && !isUmkmMode">
        <h2 class="mb-4 text-lg font-semibold">Pilih Kategori</h2>
        <div
          class="grid w-full grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 sm:gap-4"
        >
          <!-- Skeleton kategori saat load -->
          <template v-if="loadingCategories">
            <div
              v-for="i in categorySkeletonCount"
              :key="i"
              class="flex flex-col items-center justify-center w-full gap-2 p-2 bg-white border border-gray-200 shadow-sm rounded-2xl aspect-square"
            >
              <div
                class="w-12 h-12 bg-gray-200 rounded-xl sm:w-14 sm:h-14 animate-pulse"
              ></div>
              <div class="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </template>

          <template v-else>
            <!-- Kategori dari Backend (sebagian / semua) -->
            <template v-for="cat in displayedCategories" :key="cat.id">
              <button
                @click="selectCategory(cat.id)"
                class="flex flex-col items-center justify-center w-full gap-2 p-2 transition-all duration-200 aspect-square"
                :class="
                  selectedCategoryId === cat.id
                    ? 'scale-105'
                    : 'hover:scale-105'
                "
              >
                <div
                  class="flex items-center justify-center w-12 h-12 transition-all duration-200 border-2 sm:w-14 sm:h-14 rounded-xl aspect-square"
                  :class="
                    selectedCategoryId === cat.id
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-primary'
                  "
                >
                  <i class="text-xl pi pi-inbox"></i>
                </div>
                <span
                  class="text-xs leading-tight text-center text-gray-700 sm:text-sm line-clamp-2"
                  :title="cat.name"
                  >{{ cat.name }}</span
                >
              </button>
            </template>
            <!-- Tombol Semua / Tutup di paling kanan, tetap kotak -->
            <button
              @click="toggleShowAllCategories"
              class="flex flex-col items-center justify-center w-full gap-2 p-2 transition-all duration-200 hover:scale-105 aspect-square"
            >
              <div
                class="flex items-center justify-center w-12 h-12 transition-all duration-200 border-2 sm:w-14 sm:h-14 rounded-xl aspect-square"
                :class="
                  showAllCategories
                    ? 'bg-muted-foreground border-muted-forbg-muted-foreground text-white'
                    : 'bg-primary border-primary text-white'
                "
              >
                <i
                  :class="showAllCategories ? 'pi pi-times' : 'pi pi-th-large'"
                  class="text-xl"
                ></i>
              </div>
              <span
                class="text-xs font-medium leading-tight text-center text-gray-700 sm:text-sm"
                >{{ showAllCategories ? "Tutup" : "Semua" }}</span
              >
            </button>
          </template>
        </div>
      </section>

      <!-- Rekomendasi -->
      <section>
        <div class="flex flex-col gap-3 mb-4">
          <h2 class="text-lg font-semibold">
            {{ sectionTitle }}
          </h2>

          <!-- Sort chips (mirip SearchPage) -->
          <div class="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              v-for="opt in filteredInstantSorts"
              :key="opt.key"
              type="button"
              class="px-3 py-1.5 text-sm border rounded-full whitespace-nowrap transition"
              :class="
                activeInstantSorts.includes(opt.key)
                  ? 'bg-secondary text-white border-secondary'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-secondary/40'
              "
              @click="toggleInstantSort(opt.key)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loadingItems"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <ProductCardSkeleton v-for="i in 8" :key="i" class="w-full" />
        </div>

        <!-- Empty State -->
        <div v-else-if="isEmpty" class="py-8 text-center">
          <i class="mb-2 text-4xl text-gray-300 pi pi-inbox"></i>
          <p class="text-gray-500">{{ emptyText }}</p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <template v-if="isUmkmMode">
            <MerchantCard
              v-for="m in merchantList"
              :key="m.id"
              :merchant="m"
              class="w-full"
            />

            <!-- Append skeletons saat infinite scroll load more -->
            <template v-if="isLoadingMore">
              <ProductCardSkeleton v-for="i in 6" :key="`more-umkm-${i}`" />
            </template>
          </template>

          <template v-else>
            <router-link
              v-for="item in currentCardItems"
              :key="item.key"
              :to="item.to"
              class="block"
            >
              <ProductCard :product="item.product" customClass="w-full" />
            </router-link>

            <!-- Append skeletons saat infinite scroll load more -->
            <template v-if="isLoadingMore">
              <ProductCardSkeleton v-for="i in 6" :key="`more-items-${i}`" />
            </template>
          </template>
        </div>

        <!-- Sentinel untuk infinite scroll -->
        <div ref="loadMoreRef" v-if="hasMore && !loadingItems" class="h-1" />
      </section>
    </div>

    <!-- Floating Cart Button (Mobile only) -->
    <button
      v-if="isAuthenticated && !isAdmin && !showMobileStickySearch"
      type="button"
      @click="goToCart"
      aria-label="Keranjang"
      class="fixed z-40 flex items-center justify-center w-10 h-10 text-white transition-transform rounded-full shadow-lg sm:hidden top-3 right-3 bg-primary active:scale-95"
    >
      <i class="text-lg pi pi-shopping-cart" />
      <span
        v-if="cartCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-foreground text-white text-[10px] font-bold flex items-center justify-center leading-none"
      >
        {{ cartCount > 99 ? "99+" : cartCount }}
      </span>
    </button>

    <!-- BACK TO TOP BUTTON -->
    <button
      v-show="showBackToTop"
      @click="scrollToTop"
      class="fixed z-50 flex items-center justify-center transition duration-200 bg-white border-2 rounded-full shadow-sm cursor-pointer border-muted-foreground/20 hover:shadow-lg bottom-24 right-8 w-11 h-11 active:scale-90 hover:-translate-y-1"
      aria-label="Kembali ke atas"
    >
      <i class="text-xl pi pi-arrow-up text-secondary"></i>
    </button>
  </div>
</template>

<script setup>
// =========================
// IMPORTS
// =========================
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { Form } from "vee-validate";
import { Carousel, Slide } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";

import api from "@/libs/axios.js";
import { useToast } from "vue-toastification";
import { getImageUrl, getEventBannerUrl } from "@/libs/getImageUrl.js";
import { usePublicEvents } from "@/composables/usePublicEvents";
import { useRoute, useRouter } from "vue-router";
import { useSearch } from "@/composables/useSearch";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";

import TextField from "@/components/forms/TextField.vue";
import Button from "@/components/common/Button.vue";
import ProductCard from "@/components/Card/ProductCard.vue";
import ResponsiveImage from "@/components/common/ResponsiveImage.vue";
import ProductCardSkeleton from "@/components/Card/ProductCardSkeleton.vue";
import CategoryCard from "@/components/Card/CategoryCard.vue";
import MerchantCard from "@/components/Card/MerchantCard.vue";

import jasaIcon from "@/assets/icons/Jasa.svg";
import kulinerIcon from "@/assets/icons/Kuliner.svg";
import tokoIcon from "@/assets/icons/Toko.svg";
import merchantIcon from "@/assets/icons/merchant.svg";
import { data } from "autoprefixer";

// =========================
// STATE
// =========================
const toast = useToast();

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const cartStore = useCartStore();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);
const cartCount = computed(() => cartStore.totalItems);

// Mobile sticky search
const mobileScrollY = ref(0);
const mobileSearchQuery = ref("");
const stickySearchFocused = ref(false);

const showMobileStickySearch = computed(
  () => mobileScrollY.value > 80 || stickySearchFocused.value,
);

function submitMobileSearch() {
  const q = (mobileSearchQuery.value || "").trim();
  if (!q) return;
  router.push({ path: "/search", query: { q } });
  mobileSearchQuery.value = "";
}

function goToCart() {
  router.push("/cart");
}

// Nearest sorting needs user coordinates (reuse logic from SearchPage)
const myLatitude = ref(null);
const myLongitude = ref(null);

const {
  products,
  jasas,
  merchants,
  productsMeta,
  jasasMeta,
  merchantsMeta,
  loadingProducts,
  loadingMerchants,
  fetchProducts,
  fetchMerchants,
} = useSearch();

// If user is not authenticated, /api/profile/address will 401.
// Cache that fact so we don't keep hitting the endpoint.
const profileAddressUnauthorized = ref(false);

const profileCoordsLoaded = ref(false);
let profileCoordsPromise = null;

const searchInputRef = ref(null);
const searchQuery = ref("");

const categories = ref([]);
const loadingCategories = ref(true);
const selectedCategoryId = ref(null);
const showAllCategories = ref(false);

// Infinite scroll state (mirip SearchPage.vue)
const loadMoreRef = ref(null);
const observer = ref(null);
const currentPage = ref(1);
const perPage = 20;
const hasMore = ref(false);
const isLoadingMore = ref(false);
const isLoadMoreQueued = ref(false);

// Back to top
const showBackToTop = ref(false);
// Mode halaman: umkm | jasa | toko | kuliner
const activeMode = ref("umkm");

// ================= SORT (tanpa filter) =================
// Product/Jasa: nearest, cheapest, expensive, latest, oldest
// UMKM: nearest, open, latest, oldest
const activeInstantSorts = ref([]);

const enableCategoryFilter = false; // sesuai request: filternya tidak perlu

const instantSortOptions = [
  { key: "latest", label: "Terbaru", conflict: ["oldest"] },
  { key: "oldest", label: "Terlama", conflict: ["latest"] },
  { key: "nearest", label: "Terdekat", conflict: [] },
  {
    key: "cheapest",
    label: "Termurah",
    conflict: ["expensive"],
    itemOnly: true,
  },
  {
    key: "expensive",
    label: "Termahal",
    conflict: ["cheapest"],
    itemOnly: true,
  },
  { key: "open", label: "Buka", conflict: [], umkmOnly: true },
];

// banner carousel (samakan dengan Home.vue)
const isLoadingBanner = ref(true);
const { events: eventBanners, fetchPublicEvents } = usePublicEvents();

const carouselConfig = {
  itemsToShow: 1,
  wrapAround: true,
  autoplay: 5000,
  transition: 800,
  pauseAutoplayOnHover: true,
  snapAlign: "center",
  mouseDrag: true,
  touchDrag: true,
};

// =========================
// COMPUTED
// =========================
const hasMyCoordinates = computed(() => {
  return (
    Number.isFinite(myLatitude.value) && Number.isFinite(myLongitude.value)
  );
});

const isUmkmMode = computed(() => activeMode.value === "umkm");

// untuk skeleton grid kategori (isi penuh 1 baris)
const categorySkeletonCount = computed(() => gridColumns.value);

// Sisakan 1 kotak buat tombol "Semua/Tutup"
const maxCategoryTiles = computed(() => Math.max(0, gridColumns.value - 1));

const gridColumns = computed(() => {
  const w = viewportWidth.value;
  // Tailwind default breakpoints: sm=640, md=768, lg=1024, xl=1280, 2xl=1536
  if (w >= 1536) return 12;
  if (w >= 1280) return 10;
  if (w >= 1024) return 8;
  if (w >= 640) return 6;
  return 4;
});

const filteredInstantSorts = computed(() => {
  const isUmkm = activeMode.value === "umkm";
  return instantSortOptions.filter((o) => {
    if (o.umkmOnly) return isUmkm;
    if (o.itemOnly) return !isUmkm;
    return true;
  });
});

// =========================
// HELPERS
// =========================
function setMyCoordinates(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  myLatitude.value = Number.isFinite(latNum) ? latNum : null;
  myLongitude.value = Number.isFinite(lngNum) ? lngNum : null;
}

// =========================
// METHODS
// =========================
async function loadMyCoordinatesInternal(
  { allowDevice } = { allowDevice: false },
) {
  // 1) Prefer saved address (if logged in)
  if (!profileAddressUnauthorized.value) {
    try {
      const res = await api.get("api/profile/address");
      const addr = res?.data?.data;
      setMyCoordinates(addr?.latitude, addr?.longitude);
      if (hasMyCoordinates.value) return true;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        profileAddressUnauthorized.value = true;
      }
      // ignore (fallback to device if allowed)
      setMyCoordinates(null, null);
    }
  }

  // 2) Fallback: device geolocation (only when explicitly allowed)
  if (!allowDevice) return false;
  if (!navigator.geolocation) return false;

  const coords = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (typeof lat === "number" && typeof lng === "number") {
          resolve({ lat, lng });
        } else {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });

  if (!coords) return false;
  setMyCoordinates(coords.lat, coords.lng);
  return hasMyCoordinates.value;
}

async function preloadProfileCoordinates() {
  if (profileCoordsLoaded.value) return true;
  if (profileCoordsPromise) return await profileCoordsPromise;

  profileCoordsPromise = (async () => {
    try {
      return await loadMyCoordinatesInternal({ allowDevice: false });
    } finally {
      profileCoordsLoaded.value = true;
    }
  })();

  return await profileCoordsPromise;
}

async function ensureMyCoordinates({ allowDevice } = { allowDevice: true }) {
  if (hasMyCoordinates.value) return true;
  return await loadMyCoordinatesInternal({ allowDevice });
}

function handleScroll() {
  mobileScrollY.value = window.scrollY;
  showBackToTop.value = window.scrollY > 300;

  // Fallback infinite scroll (kalau IntersectionObserver tidak terpanggil)
  // Trigger ketika user sudah dekat dengan bawah halaman.
  const doc = document.documentElement;
  const nearBottom =
    window.innerHeight + window.scrollY >= doc.scrollHeight - 300;
  if (nearBottom) {
    queueLoadMore();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Submit search (samakan dengan Home.vue: redirect ke SearchPage)
const onSearch = () => {
  const q = (searchQuery.value || "").trim();
  if (!q) return;
  router.push({ path: "/search", query: { q } });
};

// =========================
// LIFECYCLE
// =========================

// Responsif: samakan slice kategori dengan jumlah kolom grid
// grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12
const viewportWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : 1024,
);

const updateViewportWidth = () => {
  viewportWidth.value = window.innerWidth;
};

function pickSecondarySort(excludeKey, allowed) {
  const allowList = Array.isArray(allowed)
    ? allowed
    : ["latest", "oldest", "cheapest", "expensive"];
  for (let i = activeInstantSorts.value.length - 1; i >= 0; i--) {
    const k = activeInstantSorts.value[i];
    if (k === excludeKey) continue;
    if (allowList.includes(k)) return k;
  }
  return undefined;
}

function pickNearestTieBreakersForProducts() {
  const hasCheapest = activeInstantSorts.value.includes("cheapest");
  const hasExpensive = activeInstantSorts.value.includes("expensive");
  const hasLatest = activeInstantSorts.value.includes("latest");
  const hasOldest = activeInstantSorts.value.includes("oldest");

  const priceSort = hasCheapest
    ? "cheapest"
    : hasExpensive
      ? "expensive"
      : undefined;
  const dateSort = hasLatest ? "latest" : hasOldest ? "oldest" : undefined;

  return {
    secondary: priceSort ?? dateSort,
    tertiary: priceSort && dateSort ? dateSort : undefined,
  };
}

function buildSortParamsForProducts() {
  const sortKey = activeInstantSorts.value.includes("nearest")
    ? "nearest"
    : pickSecondarySort(undefined, [
        "latest",
        "oldest",
        "cheapest",
        "expensive",
      ]);

  const secondarySort =
    sortKey === "nearest"
      ? pickNearestTieBreakersForProducts().secondary
      : undefined;

  const tertiarySort =
    sortKey === "nearest"
      ? pickNearestTieBreakersForProducts().tertiary
      : undefined;

  return {
    sort: typeof sortKey === "string" ? sortKey : undefined,
    secondary_sort: secondarySort,
    tertiary_sort: tertiarySort,
  };
}

function buildSortParamsForMerchants() {
  const sort = activeInstantSorts.value.find((s) =>
    ["latest", "oldest", "nearest"].includes(s),
  );

  const sortKey = activeInstantSorts.value.includes("nearest")
    ? "nearest"
    : sort;

  const secondarySort =
    sortKey === "nearest"
      ? pickSecondarySort("nearest", ["latest", "oldest"])
      : undefined;

  return {
    sort: sortKey || undefined,
    secondary_sort: secondarySort,
    is_open: activeInstantSorts.value.includes("open") ? 1 : undefined,
  };
}

async function toggleInstantSort(key) {
  const option = instantSortOptions.find((o) => o.key === key);
  if (!option) return;

  if (key === "nearest" && !hasMyCoordinates.value) {
    await preloadProfileCoordinates();
    const ok = await ensureMyCoordinates({ allowDevice: true });
    if (!ok) {
      toast.error(
        "Tidak bisa mengambil lokasi. Aktifkan izin lokasi atau lengkapi alamat (koordinat).",
      );
      return;
    }
  }

  if (option.conflict?.length) {
    activeInstantSorts.value = activeInstantSorts.value.filter(
      (k) => !option.conflict.includes(k),
    );
  }

  if (activeInstantSorts.value.includes(key)) {
    activeInstantSorts.value = activeInstantSorts.value.filter(
      (k) => k !== key,
    );
  } else {
    activeInstantSorts.value.push(key);
  }
}

const allowedModes = new Set(["umkm", "kuliner", "toko", "jasa"]);

// Terima activeMode dari Home via URL: /explore?mode=jasa|kuliner|toko|umkm
watch(
  () => route.query.mode,
  async (mode) => {
    if (!mode) return;
    const normalized = String(mode);
    if (!allowedModes.has(normalized)) return;
    if (activeMode.value === normalized) return;

    activeMode.value = normalized;
  },
  { immediate: true },
);

// Fokus search bar jika dipicu dari CustomerLayout (mirip Home.vue)
watch(
  () => route.query.focusSearch,
  async (val) => {
    if (!val) return;

    await nextTick();

    searchInputRef.value?.scrollIntoView();
    searchInputRef.value?.focus();

    const { focusSearch, ...rest } = route.query;
    router.replace({ query: rest });
  },
  { immediate: true },
);

// Tampilkan 4 kategori awal atau semua
const displayedCategories = computed(() => {
  if (showAllCategories.value) {
    return categories.value;
  }
  return categories.value.slice(0, maxCategoryTiles.value);
});

// Toggle show all categories
const toggleShowAllCategories = () => {
  showAllCategories.value = !showAllCategories.value;
  // Reset filter ke semua jika menutup
  if (!showAllCategories.value) {
    selectedCategoryId.value = null;
  }
};

const segmentNavigates = ref([
  { label: "UMKM", icon: merchantIcon, mode: "umkm" },
  { label: "Kuliner", icon: kulinerIcon, mode: "kuliner" },
  { label: "Toko", icon: tokoIcon, mode: "toko" },
  { label: "Jasa", icon: jasaIcon, mode: "jasa" },
]);

const modeToSegments = {
  kuliner: ["UMKM Kuliner"],
  toko: ["UMKM Toko"],
  jasa: null,
};

const selectMode = async (mode) => {
  if (activeMode.value === mode) return;
  activeMode.value = mode;
};

// Selected category name
const selectedCategoryName = computed(() => {
  if (!selectedCategoryId.value) return "Rekomendasi";
  const cat = categories.value.find((c) => c.id === selectedCategoryId.value);
  return cat?.name || "Kategori";
});

const sectionTitle = computed(() => {
  if (activeMode.value === "umkm") return "UMKM";

  const catName = selectedCategoryId.value ? selectedCategoryName.value : null;
  if (activeMode.value === "jasa") {
    return catName ? catName : "Layanan Jasa";
  }
  if (activeMode.value === "kuliner") {
    return catName ? catName : "Produk Kuliner";
  }
  if (activeMode.value === "toko") {
    return catName ? catName : "Produk Toko";
  }
  return catName ? catName : "Product & Layanan";
});

const searchPlaceholder = computed(() => {
  return "Cari produk, jasa, atau UMKM…";
});

function getJasaId(jasa) {
  return jasa?.jasa_id ?? jasa?.id;
}

const filteredJasaList = computed(() => jasas.value || []);

const filteredProductList = computed(() => products.value || []);
const merchantList = computed(() => merchants.value || []);
// Adapt jasa -> ProductCard shape (agar satu card bisa dipakai untuk jasa / product)
const jasaToProductCard = (jasa) => {
  const fixed = Number(jasa?.fixed_price || 0);
  const base = Number(jasa?.base_price || 0);
  const price = fixed > 0 ? fixed : base > 0 ? base : 0;

  const merchantFromJasa =
    jasa?.merchant ||
    (jasa?.merchant_name ? { name: jasa.merchant_name } : null) ||
    (jasa?.merchantName ? { name: jasa.merchantName } : null);

  return {
    id: getJasaId(jasa),
    name: jasa?.title || jasa?.name || "Layanan",
    type: "jasa",
    distance_km:
      typeof jasa?.distance_km === "number" ? jasa.distance_km : null,

    // Keep original price fields so ProductCard can render:
    // fixed_price => 'Rp ...' ; base_price => 'Mulai dari Rp ...'
    fixed_price: fixed || 0,
    base_price: base || 0,

    // Fallback compatibility for any UI relying on min/max.
    min_price: price,
    max_price: price,
    // Primary: cover_img (ProductCard now handles this)
    cover_img: jasa?.cover_img || null,
    // Fallback: cover_image (used by older code)
    cover_image: resolveJasaImage(jasa),
    merchant: merchantFromJasa,
  };
};

const cardItems = computed(() => {
  return (filteredJasaList.value || [])
    .filter((jasa) => typeof jasa?.slug === "string" && jasa.slug.trim())
    .map((jasa) => ({
      key: `jasa-${getJasaId(jasa)}`,
      to: { name: "JasaDetail", params: { slug: jasa.slug } },
      product: jasaToProductCard(jasa),
    }));
});

const productCardItems = computed(() => {
  return (filteredProductList.value || []).map((p) => ({
    key: `product-${p.id}`,
    to: { name: "Product Detail", params: { slug: p.slug } },
    product: p,
  }));
});

const currentCardItems = computed(() => {
  return activeMode.value === "jasa" ? cardItems.value : productCardItems.value;
});

const loadingItems = computed(() => {
  if (activeMode.value === "umkm") return loadingMerchants.value;
  return loadingProducts.value;
});

const isEmpty = computed(() => {
  if (loadingItems.value) return false;
  if (activeMode.value === "umkm") {
    return !merchantList.value || merchantList.value.length === 0;
  }
  return !currentCardItems.value || currentCardItems.value.length === 0;
});

const emptyText = computed(() => {
  if (activeMode.value === "umkm") {
    return "Belum ada UMKM";
  }
  if (activeMode.value === "jasa") {
    return "Belum ada layanan di kategori ini";
  }
  return "Belum ada produk di kategori ini";
});

// Select category
const selectCategory = (categoryId) => {
  selectedCategoryId.value =
    selectedCategoryId.value === categoryId ? null : categoryId;
};

// normalisasi path gambar jasa → URL lengkap dari backend (sama seperti produk)
const resolveJasaImage = (jasa) => {
  // Prioritas: API URL (cover_img.src_url, images[].src_url) > ID
  if (jasa?.cover_img?.id) return getImageUrl(jasa.cover_img.id);
  if (jasa?.cover_img?.src_url) return getImageUrl(jasa.cover_img.src_url);
  if (jasa?.cover_img?.url) return getImageUrl(jasa.cover_img.url);

  // Some endpoints return cover_image object: { id, src_url }
  if (jasa?.cover_image && typeof jasa.cover_image === "object") {
    if (jasa.cover_image?.id) return getImageUrl(jasa.cover_image.id);
    if (jasa.cover_image?.src_url) return getImageUrl(jasa.cover_image.src_url);
    if (jasa.cover_image?.url) return getImageUrl(jasa.cover_image.url);
  }

  // Prioritaskan relasi images (cover image)
  if (jasa.images && jasa.images.length > 0) {
    const coverImage =
      jasa.images.find((img) => img.is_cover) || jasa.images[0];
    if (coverImage.id) return getImageUrl(coverImage.id);
    if (coverImage.src_url) return getImageUrl(coverImage.src_url);
    if (coverImage.url) return getImageUrl(coverImage.url);
  }

  return "";
};

// format harga
const formatHarga = (value) => {
  if (!value) return "0";
  return Number(value).toLocaleString("id-ID");
};

// format hari operasional
const dayLabels = {
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
  7: "Min",
};

const formatOperatingDays = (operatingDays) => {
  if (!operatingDays) return "Buka Setiap Hari";
  const days = operatingDays
    .split(",")
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d));
  if (days.length === 0 || days.length === 7) return "Buka Setiap Hari";
  return days.map((d) => dayLabels[d] || d).join(", ");
};

function parseLaravelPaginator(payload) {
  // Support: array (legacy) OR Laravel paginator object
  if (Array.isArray(payload)) {
    return {
      items: payload,
      current: 1,
      last: 1,
    };
  }

  // Support: some endpoints may wrap paginator in { data: { data: [], current_page, ... } }
  const paginator =
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    Array.isArray(payload.data?.data)
      ? payload.data
      : payload;

  return {
    items: Array.isArray(paginator?.data) ? paginator.data : [],
    current: Number(
      paginator?.current_page ?? paginator?.meta?.current_page ?? 1,
    ),
    last: Number(paginator?.last_page ?? paginator?.meta?.last_page ?? 1),
  };
}

async function ensureSentinelObserved() {
  await nextTick();
  if (!observer.value) return;
  if (!loadMoreRef.value) return;
  if (!hasMore.value) return;
  observer.value.observe(loadMoreRef.value);
}

function resetInfiniteScroll() {
  currentPage.value = 1;
  hasMore.value = false;
  if (observer.value) observer.value.disconnect();
}

function setupObserver() {
  if (observer.value) observer.value.disconnect();

  observer.value = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      queueLoadMore();
    },
    {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    },
  );

  if (loadMoreRef.value) {
    observer.value.observe(loadMoreRef.value);
  }
}

async function queueLoadMore() {
  if (!hasMore.value) return;
  if (loadingItems.value) return;
  if (isLoadingMore.value) return;
  if (isLoadMoreQueued.value) return;

  isLoadMoreQueued.value = true;
  currentPage.value += 1;

  try {
    await loadMore();
  } finally {
    isLoadMoreQueued.value = false;
  }
}

async function loadMore() {
  // fetch next page (append)
  if (activeMode.value === "umkm") {
    await fetchMerchants({ append: true });
    return;
  }

  if (activeMode.value === "jasa") {
    await fetchJasas({ append: true });
    return;
  }

  await fetchProductsByMode({ append: true });
}

const fetchJasas = async ({ append } = { append: false }) => {
  await preloadProfileCoordinates();

  const sortParams = buildSortParamsForProducts();

  await fetchProducts(
    {
      q: undefined,
      segments: ["UMKM Jasa"],
      ...sortParams,
      lat: hasMyCoordinates.value ? myLatitude.value : undefined,
      lng: hasMyCoordinates.value ? myLongitude.value : undefined,
      page: String(currentPage.value),
      per_page: String(perPage),
    },
    append,
  );

  const current = Number(jasasMeta.value?.current_page ?? 1);
  const last = Number(jasasMeta.value?.last_page ?? 1);
  hasMore.value = current < last;

  await ensureSentinelObserved();
};

const fetchProductsByMode = async ({ append } = { append: false }) => {
  const segments = modeToSegments[activeMode.value];
  if (!segments) {
    products.value = [];
    hasMore.value = false;
    return;
  }

  await preloadProfileCoordinates();

  const sortParams = buildSortParamsForProducts();

  await fetchProducts(
    {
      q: undefined,
      segments,
      ...sortParams,
      lat: hasMyCoordinates.value ? myLatitude.value : undefined,
      lng: hasMyCoordinates.value ? myLongitude.value : undefined,
      page: String(currentPage.value),
      per_page: String(perPage),
    },
    append,
  );

  const current = Number(productsMeta.value?.current_page ?? 1);
  const last = Number(productsMeta.value?.last_page ?? 1);
  hasMore.value = current < last;

  await ensureSentinelObserved();
};

const fetchMerchantsExplore = async ({ append } = { append: false }) => {
  await preloadProfileCoordinates();

  const sortParams = buildSortParamsForMerchants();

  await fetchMerchants(
    {
      q: undefined,
      ...sortParams,
      lat: hasMyCoordinates.value ? myLatitude.value : undefined,
      lng: hasMyCoordinates.value ? myLongitude.value : undefined,
      page: String(currentPage.value),
      per_page: String(perPage),
    },
    append,
  );

  const current = Number(merchantsMeta.value?.current_page ?? 1);
  const last = Number(merchantsMeta.value?.last_page ?? 1);
  hasMore.value = current < last;

  await ensureSentinelObserved();
};

let isModeChanging = false;

watch(
  () => activeMode.value,
  async () => {
    isModeChanging = true;
    // reset UI filters saat mode berganti
    selectedCategoryId.value = null;
    showAllCategories.value = false;

    // Drop sort keys that are not applicable for the new mode
    const isUmkm = activeMode.value === "umkm";
    activeInstantSorts.value = activeInstantSorts.value.filter((k) => {
      if (k === "open") return isUmkm;
      if (k === "cheapest" || k === "expensive") return !isUmkm;
      return true;
    });

    resetInfiniteScroll();
    currentPage.value = 1;

    if (activeMode.value === "umkm") {
      await fetchMerchantsExplore();
    } else if (activeMode.value === "jasa") {
      await fetchJasas();
    } else {
      await fetchProductsByMode();
    }

    await nextTick();
    setupObserver();
    isModeChanging = false;
  },
);

watch(
  () => [...activeInstantSorts.value],
  async () => {
    if (isModeChanging) return;
    // reset pagination ketika sort berubah
    resetInfiniteScroll();
    currentPage.value = 1;

    if (activeMode.value === "umkm") {
      await fetchMerchantsExplore();
    } else if (activeMode.value === "jasa") {
      await fetchJasas();
    } else {
      await fetchProductsByMode();
    }

    await nextTick();
    setupObserver();
  },
);

watch(
  () => selectedCategoryId.value,
  async () => {
    // reset pagination ketika filter berubah
    resetInfiniteScroll();
    currentPage.value = 1;

    // server-side filter category
    if (activeMode.value === "toko" || activeMode.value === "kuliner") {
      await fetchProductsByMode();
      await nextTick();
      setupObserver();
      return;
    }

    if (activeMode.value === "jasa") {
      await fetchJasas();
      await nextTick();
      setupObserver();
    }
  },
);

// fetch data
onMounted(async () => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", updateViewportWidth, { passive: true });
  updateViewportWidth();

  if (isAuthenticated.value && !isAdmin.value) {
    cartStore.fetchCartCount();
  }

  // fetch banner event (independen dari fetch data jasa)
  isLoadingBanner.value = true;
  const bannerTask = fetchPublicEvents().catch((e) => {
    console.error("Gagal memuat banner event:", e);
    return [];
  });

  loadingCategories.value = true;
  try {
    const categoryRes = await api.get("/api/public/categories/level-1");

    // Ambil data categories dari response { success, message, data }
    categories.value = (categoryRes.data?.data ?? categoryRes.data ?? []).map(
      (c) => ({
        id: c.value ?? c.id,
        name: c.label ?? c.name,
        value: c.value ?? c.id,
        label: c.label ?? c.name,
      }),
    );
  } catch (e) {
    console.error("Gagal memuat data:", e);
    toast.error("Gagal memuat kategori. Silakan coba lagi nanti.");
  } finally {
    loadingCategories.value = false;
    await bannerTask.finally(() => {
      isLoadingBanner.value = false;
    });
  }

  // Fetch data sesuai mode aktif (default: jasa)
  resetInfiniteScroll();
  currentPage.value = 1;
  if (activeMode.value === "umkm") {
    await fetchMerchantsExplore();
  } else if (activeMode.value === "jasa") {
    await fetchJasas();
  } else {
    await fetchProductsByMode();
  }

  await nextTick();
  setupObserver();
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", updateViewportWidth);
  if (observer.value) observer.value.disconnect();
});
</script>

<style scoped>
:deep(.carousel) {
  height: 100%;
}

:deep(.carousel__viewport) {
  height: 100%;
  cursor: grab;
}

:deep(.carousel__viewport:active) {
  cursor: grabbing;
}

:deep(.carousel__track) {
  height: 100%;
}

:deep(.carousel__slide) {
  height: 100%;
}

:deep(.carousel__prev),
:deep(.carousel__next) {
  display: none !important;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
