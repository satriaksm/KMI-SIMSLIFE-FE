<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { Carousel, Slide } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";

import InfoteknoIcon from "@/assets/images/infotekno.png";
import SekolahVokasiUNSIcon from "@/assets/images/LOGO SV BIRU.png";
import PemkotSurakartaIcon from "@/assets/images/surakarta.png";

import TextField from "@/components/forms/TextField.vue";
import CategoryCard from "@/components/Card/CategoryCard.vue";
import MerchantCard from "@/components/Card/MerchantCard.vue";
import ProductCardSkeleton from "@/components/Card/ProductCardSkeleton.vue";
import MapPreviewSection from "@/components/home/MapPreviewSection.vue";
import AnimatedCounter from "@/components/common/AnimatedCounter.vue";
import Button from "@/components/common/Button.vue";

import jasaIcon from "@/assets/icons/Jasa.svg";
import kulinerIcon from "@/assets/icons/Kuliner.svg";
import tokoIcon from "@/assets/icons/Toko.svg";
import umkmIcon from "@/assets/icons/merchant.svg";
import komunitasIcon from "@/assets/icons/Komunitas.svg";
import WhiteWithText from "@/assets/icons/White-with-Text.png";

import api from "@/libs/axios.js";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { Form } from "vee-validate";
import { usePublicEvents } from "@/composables/usePublicEvents";
import { useHomeStatistics } from "@/composables/useHomeStatistics";
import { getEventBannerUrl } from "@/libs/getImageUrl";

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

function onMobileScroll() {
  mobileScrollY.value = window.scrollY;
}

function submitMobileSearch() {
  const q = (mobileSearchQuery.value || "").trim();
  if (!q) return;
  router.push({ path: "/search", query: { q } });
  mobileSearchQuery.value = "";
}

function goToCart() {
  router.push("/cart");
}

const searchInputRef = ref(null);

const replayMerchants = ref(0);
const replayProducts = ref(0);
const replayCategories = ref(0);

const searchQuery = ref("");
const isLoadingMerchants = ref(true);
const isLoadingBanner = ref(true);

// Fokus search bar jika dipicu dari CustomerLayout (?focusSearch=1)
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

// Banner carousel
const { events: eventBanners, fetchPublicEvents } = usePublicEvents();
const eventBannersProcessed = computed(() => {
  return (eventBanners.value || []).map((event) => ({
    ...event,
    bannerUrl: event.banner_url || getEventBannerUrl(event),
  }));
});

const goToEvent = () => {
  router.push({ name: "Event List" });
};

// Statistics with animated counter
const {
  statistics,
  loading: statsLoading,
  fetchStatistics,
} = useHomeStatistics();

// Carousel config
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

const navigates = ref([
  {
    label: "UMKM",
    icon: umkmIcon,
    to: { path: "/explore", query: { mode: "umkm" } },
  },
  {
    label: "Kuliner",
    icon: kulinerIcon,
    to: { path: "/explore", query: { mode: "kuliner" } },
  },
  {
    label: "Toko",
    icon: tokoIcon,
    to: { path: "/explore", query: { mode: "toko" } },
  },
  {
    label: "Jasa",
    icon: jasaIcon,
    to: { path: "/explore", query: { mode: "jasa" } },
  },
  {
    label: "Komunitas",
    icon: komunitasIcon,
    to: { name: "community" },
  },
]);

const recommendedMerchants = ref([]);

// Load recommended merchants
const loadRecommendedMerchants = async () => {
  isLoadingMerchants.value = true;

  try {
    const params = { limit: 10 };

    const response = await api.get("/api/public/home/recommended-merchants", {
      params,
    });
    recommendedMerchants.value = response.data.data || [];
  } catch (error) {
    console.error("Failed to load merchants:", error);
  } finally {
    isLoadingMerchants.value = false;
  }
};

// Submit search
const onSearch = () => {
  const q = (searchQuery.value || "").trim();
  if (!q) return;
  router.push({ path: "/search", query: { q } });
};

// Navigate to map
const viewMap = () => {
  router.push({ name: "Peta UMKM" });
};

onMounted(async () => {
  // Load banner events
  try {
    isLoadingBanner.value = true;
    await fetchPublicEvents();
  } catch (e) {
    console.error("Failed to load event banners:", e);
  } finally {
    isLoadingBanner.value = false;
  }

  // Load merchants
  await loadRecommendedMerchants();

  window.addEventListener("scroll", onMobileScroll, { passive: true });
  if (isAuthenticated.value && !isAdmin.value) {
    cartStore.fetchCartCount();
  }

  // Load statistics (uses 5-min cache)
  fetchStatistics();
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onMobileScroll);
});
</script>

<template>
  <div class="relative app-container">
    <!-- Mobile Sticky Search (slides in after hero search scrolls out) -->
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

    <!-- Hero -->
    <section id="hero" class="relative">
      <div
        class="relative w-full overflow-hidden bg-gray-100 aspect-3/1 sm:aspect-21/9 lg:aspect-24/9 xl:aspect-4/1"
      >
        <div
          v-if="isLoadingBanner"
          class="absolute inset-0 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <i class="text-4xl text-gray-400 pi pi-spin pi-spinner"></i>
          </div>
        </div>

        <Carousel
          v-else-if="eventBannersProcessed.length > 0"
          v-bind="carouselConfig"
          class="h-full"
        >
          <Slide v-for="event in eventBannersProcessed" :key="event.id">
            <div
              @click="goToEvent()"
              class="relative w-full h-full cursor-pointer group"
            >
              <img
                :src="event.bannerUrl"
                class="absolute inset-0 object-cover w-full h-full scale-110 blur-xl opacity-60"
                aria-hidden="true"
              />
              <img
                :src="event.bannerUrl"
                class="relative object-contain w-full h-full"
              />
            </div>
          </Slide>
        </Carousel>

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
        class="relative z-20 flex justify-center px-4 mx-auto -mt-6 sm:-mt-10 max-w-7xl"
      >
        <div class="w-full sm:w-[906px]">
          <div
            class="overflow-hidden bg-white border border-gray-200 shadow-lg sm:rounded-2xl rounded-xl"
          >
            <!-- Search -->
            <div class="p-4 border-b border-gray-100 sm:p-5">
              <Form @submit="onSearch">
                <div class="flex items-center w-full gap-2 sm:gap-3">
                  <TextField
                    name="search"
                    ref="searchInputRef"
                    :modelValue="searchQuery"
                    @update:modelValue="(v) => (searchQuery = v)"
                    placeholder="Cari produk, jasa, atau UMKM…"
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

            <!-- Categories -->
            <div class="p-4 sm:p-5 bg-gray-50/50">
              <div class="grid grid-cols-4 gap-3 sm:gap-4">
                <CategoryCard
                  v-for="cat in navigates"
                  :key="cat.label"
                  :label="cat.label"
                  :icon="cat.icon"
                  :to="cat.to"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- UMKM Section -->
    <section id="umkm-recommendation" class="relative py-8 sm:py-16">
      <div class="px-4 mx-auto max-w-7xl sm:px-6">
        <!-- Section Header -->
        <div class="flex items-center justify-between mb-6 sm:mb-10">
          <div>
            <h2 class="text-xl font-bold text-gray-900 sm:text-3xl">
              Temukan UMKM yang Kamu Butuhkan
            </h2>
            <p class="mt-1 text-sm text-gray-500 sm:text-base">
              Pilihan UMKM terbaik di Banyuanyar
            </p>
          </div>
          <router-link to="/explore?mode=umkm" class="hidden text-sm font-semibold sm:block text-primary hover:text-primary/80">
            Lihat Semua
          </router-link>
        </div>

        <!-- Skeleton Loading -->
        <div
          v-if="isLoadingMerchants"
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6"
        >
          <ProductCardSkeleton v-for="i in 10" :key="i" />
        </div>

        <!-- Merchants Grid -->
        <div v-else-if="recommendedMerchants.length > 0">
          <div
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6"
          >
            <MerchantCard
              v-for="merchant in recommendedMerchants"
              :key="merchant.id"
              :merchant="merchant"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-20 text-center">
          <i class="mb-4 text-6xl text-gray-300 pi pi-shop"></i>
          <p class="mb-2 text-lg font-semibold text-gray-700">
            Belum ada UMKM terdaftar
          </p>
          <p class="text-gray-500">Coba lagi nanti</p>
        </div>
      </div>
    </section>

    <!-- MAP PREVIEW SECTION -->
    <MapPreviewSection />

    <!-- STATISTICS SECTION -->
    <section class="relative py-12 bg-white sm:py-16">
      <div class="relative px-4 mx-auto max-w-7xl sm:px-6">
        <!-- Section Header -->
        <div class="mb-8 text-center sm:mb-12">
          <h3 class="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            Berkembang Bersama UMKM Banyuanyar Lainnya
          </h3>
          <p class="text-sm text-gray-600 sm:text-base">
            Ragam usaha dan layanan UMKM Banyuanyar kini terhimpun dalam satu
            platform. Mulai dari kebutuhan harian hingga layanan lokal, semuanya
            dapat diakses dengan lebih mudah, cepat, dan nyaman oleh masyarakat.
          </p>
        </div>

        <!-- Statistics Cards -->
        <div
          class="grid grid-cols-1 gap-6 sm:flex sm:items-stretch sm:divide-x sm:divide-gray-200 sm:gap-0"
        >
          <!-- Total Merchants -->
          <div
            class="relative overflow-hidden transition-all duration-300 bg-white group sm:flex-1 sm:px-6 sm:py-6 rounded-2xl sm:rounded-none sm:first:rounded-l-2xl sm:last:rounded-r-2xl"
            @mouseenter="replayMerchants++"
          >
            <div class="flex flex-col justify-center h-full p-6 sm:p-0">
              <!-- Counter -->
              <div
                class="mb-2 text-4xl font-bold text-center text-gray-900 transition-all duration-300 sm:text-5xl hover:text-secondary"
              >
                <AnimatedCounter
                  :value="statistics.total_merchants"
                  suffix="+"
                  :duration="1200"
                  :replayKey="replayMerchants"
                />
              </div>

              <!-- Label -->
              <div
                class="text-sm font-medium text-center text-gray-600 sm:text-base"
              >
                UMKM Terdaftar
              </div>
            </div>
          </div>

          <!-- Total Products -->
          <div
            class="relative overflow-hidden transition-all duration-300 bg-white group sm:flex-1 sm:px-6 sm:py-6 rounded-2xl sm:rounded-none sm:first:rounded-l-2xl sm:last:rounded-r-2xl"
            @mouseenter="replayProducts++"
          >
            <div class="flex flex-col justify-center h-full p-6 sm:p-0">
              <!-- Counter -->
              <div
                class="mb-2 text-4xl font-bold text-center text-gray-900 transition-all duration-300 sm:text-5xl hover:text-secondary"
              >
                <AnimatedCounter
                  :value="statistics.total_products"
                  suffix="+"
                  :duration="1200"
                  :replayKey="replayProducts"
                />
              </div>

              <!-- Label -->
              <div
                class="text-sm font-medium text-center text-gray-600 sm:text-base"
              >
                Produk & Jasa
              </div>
            </div>
          </div>

          <!-- Total Categories -->
          <div
            class="relative overflow-hidden transition-all duration-300 bg-white group sm:flex-1 sm:px-6 sm:py-6 rounded-2xl sm:rounded-none sm:first:rounded-l-2xl sm:last:rounded-r-2xl"
            @mouseenter="replayCategories++"
          >
            <div class="flex flex-col justify-center h-full p-6 sm:p-0">
              <!-- Counter -->
              <div
                class="mb-2 text-4xl font-bold text-center text-gray-900 transition-all duration-300 sm:text-5xl hover:text-secondary"
              >
                <AnimatedCounter
                  :value="statistics.total_categories"
                  suffix="+"
                  :duration="1200"
                  :replayKey="replayCategories"
                />
              </div>

              <!-- Label -->
              <div
                class="text-sm font-medium text-center text-gray-600 sm:text-base"
              >
                Kategori
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

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

    <!-- Footer -->
    <footer class="relative overflow-hidden text-white bg-primary">
      <div class="absolute inset-0 pointer-events-none opacity-10">
        <div
          class="absolute rounded-full w-72 h-72 -top-32 -left-32 bg-white/30 blur-3xl"
        ></div>
        <div
          class="absolute rounded-full w-96 h-96 -bottom-48 -right-40 bg-white/20 blur-3xl"
        ></div>
      </div>

      <div class="relative px-4 mx-auto max-w-7xl sm:px-6">
        <div class="grid gap-10 py-12 md:grid-cols-3 md:py-16">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <img :src="WhiteWithText" alt="SUMILIR" class="h-10" />
            </div>

            <p class="max-w-sm text-sm leading-relaxed text-white/80">
              SUMILIR adalah platform digital yang mempertemukan UMKM Banyuanyar
              dengan masyarakat, agar produk lokal lebih mudah ditemukan,
              dipercaya, dan dibeli.
            </p>

            <div class="flex items-center gap-3 mt-6">
              <img
                :src="InfoteknoIcon"
                alt="Infotekno"
                class="flex items-center justify-center h-16 p-2 transition-all duration-200 hover:bg-white/10 hover:scale-105"
                title="Infotekno"
              />
              <img
                :src="SekolahVokasiUNSIcon"
                alt="Sekolah Vokasi UNS"
                class="flex items-center justify-center h-16 transition-all duration-200 hover:bg-white/10 hover:scale-105"
                title="Sekolah Vokasi UNS"
              />
              <img
                :src="PemkotSurakartaIcon"
                alt="Pemkot Surakarta"
                class="flex items-center justify-center h-16 p-2 transition-all duration-200 hover:bg-white/10 hover:scale-105"
                title="Pemkot Surakarta"
              />
            </div>

            <!-- <div class="flex items-center gap-3 mt-6">
              <a
                href="https://www.facebook.com/pages/Kantor-Kelurahan-Banyuanyar"
                target="_blank"
                class="flex items-center justify-center w-10 h-10 transition border rounded-full border-white/20 hover:border-white/40 hover:bg-white/10"
                aria-label="Facebook"
              >
                <i class="text-lg pi pi-facebook"></i>
              </a>

              <a
                href="https://www.instagram.com/explore/locations/251082119/kantor-kelurahan-banyuanyar"
                target="_blank"
                class="flex items-center justify-center w-10 h-10 transition border rounded-full border-white/20 hover:border-white/40 hover:bg-white/10"
                aria-label="Instagram"
              >
                <i class="text-lg pi pi-instagram"></i>
              </a>
            </div>
            <p class="mt-4 text-xs text-white/60">
              Informasi & pembaruan kegiatan dapat diikuti melalui kanal resmi
              di atas.
            </p> -->
          </div>

          <div>
            <h4 class="text-base font-semibold tracking-wide">Navigasi</h4>
            <ul class="mt-4 space-y-3 text-sm">
              <li>
                <router-link
                  to="/explore?mode=UMKM"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i> Semua
                  UMKM
                </router-link>
              </li>
              <li>
                <router-link
                  to="/explore?mode=toko"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i>
                  Produk Toko
                </router-link>
              </li>
              <li>
                <router-link
                  to="/explore?mode=kuliner"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i>
                  Produk Kuliner
                </router-link>
              </li>
              <li>
                <router-link
                  to="/explore?mode=jasa"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i>
                  Layanan Jasa
                </router-link>
              </li>
              <li>
                <router-link
                  to="/map"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i> Peta UMKM
                </router-link>
              </li>
              <li>
                <router-link
                  to="/community"
                  class="inline-flex items-center gap-2 transition text-white/80 hover:text-white"
                >
                  <i class="text-xs pi pi-angle-right opacity-80"></i> Komunitas
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="text-base font-semibold tracking-wide">Informasi</h4>

            <div class="mt-4 space-y-4">
              <div class="flex gap-3 text-sm text-white/80">
                <i class="pi pi-map-marker mt-0.5 shrink-0 opacity-80"></i>
                <a
                  href="https://maps.google.com/?q=Jl.+Adi+Sumarmo+No.163,+Banyuanyar,+Kec.+Banjarsari,+Kota+Surakarta,+Jawa+Tengah+57137"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="transition hover:text-white"
                >
                  Kelurahan Banyuanyar, Surakarta, Jawa Tengah
                  <span class="block mt-1 text-xs text-white/60">
                    Jl. Adi Sumarmo No.163, Banyuanyar, Kec. Banjarsari, Kota
                    Surakarta, Jawa Tengah 57137
                  </span>
                </a>
              </div>
              <div class="flex gap-3 text-sm text-white/80">
                <i class="pi pi-phone mt-0.5 shrink-0 opacity-80"></i>
                <p>
                  <a
                    href="tel:+62882003634666"
                    class="transition hover:text-white"
                  >
                    0882-0036-34666 (Kelurahan Banyuanyar)
                  </a>
                  <br />
                  <a
                    href="tel:+6281931966044"
                    class="transition hover:text-white"
                  >
                    0819-3196-6044 (Fasilitator Pemerintahan)
                  </a>

                  <!-- <span class="block mt-1 text-xs text-white/60">
                  </span> -->
                </p>
              </div>
              <div class="flex gap-3 text-sm text-white/80">
                <i class="pi pi-envelope mt-0.5 shrink-0 opacity-80"></i>
                <p>
                  <a
                    href="mailto:kelh.banyuanyar@gmail.com"
                    class="transition hover:text-white"
                  >
                    kelh.banyuanyar@gmail.com
                  </a>
                  <!-- <span class="block mt-1 text-xs text-white/60">
                  </span> -->
                </p>
              </div>

              <div class="pt-2">
                <router-link
                  to="/merchant-register"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition bg-white rounded-xl text-primary hover:bg-white/90"
                >
                  <i class="text-xs pi pi-plus"></i>
                  Daftarkan UMKM
                </router-link>

                <p class="mt-2 text-xs text-white/60">
                  Ingin UMKM Anda tampil di SUMILIR? Ajukan melalui menu
                  pendaftaran UMKM atau datang langsung ke Kantor Kelurahan
                  Banyuanyar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
:deep(.carousel) {
  height: 100%;
}

:deep(.carousel__viewport) {
  height: 100%;
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

:deep(.carousel__viewport) {
  cursor: grab;
}

:deep(.carousel__viewport:active) {
  cursor: grabbing;
}
</style>
