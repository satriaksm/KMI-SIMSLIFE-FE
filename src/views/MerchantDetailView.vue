<template>
  <div class="">
    <!-- Loading State -->
    <div v-if="loading" class="w-full">
      <!-- Header Skeleton -->
      <div class="relative">
        <!-- Hero Skeleton -->
        <div
          class="relative w-full overflow-hidden bg-gray-200 animate-pulse aspect-24/9 lg:aspect-4/1"
          aria-hidden="true"
        ></div>

        <!-- Merchant Card Skeleton (Overlay) -->
        <div class="relative w-11/12 max-w-3xl mx-auto -mt-8">
          <div class="p-4 bg-white shadow-lg rounded-2xl">
            <div class="flex items-start gap-4">
              <div
                class="w-20 h-20 bg-gray-200 rounded-2xl animate-pulse shrink-0"
                aria-hidden="true"
              ></div>
              <div class="flex-1 min-w-0 pt-1">
                <div
                  class="w-2/3 h-6 bg-gray-200 rounded animate-pulse"
                  aria-hidden="true"
                ></div>
                <div class="flex items-center gap-2 mt-3">
                  <div
                    class="w-16 h-6 bg-gray-200 rounded-full animate-pulse"
                    aria-hidden="true"
                  ></div>
                  <div
                    class="w-24 h-4 bg-gray-200 rounded animate-pulse"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Skeleton -->
      <div class="px-4 mx-auto mt-6 max-w-7xl">
        <div
          class="flex gap-1 p-1 bg-white border border-gray-100 shadow-sm rounded-xl"
        >
          <div class="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div class="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      <!-- Content Skeleton (Grid) -->
      <div class="px-4 py-4 mx-auto max-w-7xl">
        <div
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <ProductCardSkeleton v-for="i in 12" :key="'merchant-skel-' + i" />
        </div>
      </div>
    </div>

    <template v-else-if="merchant">
      <!-- Header dengan Hero Image -->
      <div class="relative">
        <!-- Hero Background Image -->
        <div
          class="relative w-full overflow-hidden bg-linear-to-b from-gray-200 to-gray-100 aspect-24/9 lg:aspect-4/1"
        >
          <img
            v-if="merchant.banner_url"
            :src="merchant.banner_url"
            alt="Background"
            class="absolute inset-0 object-cover w-full h-full"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted-background to-muted-foreground"
            aria-hidden="true"
          >
            <span>
              <svg
                class="w-12 h-12 text-white sm:w-16 sm:h-16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 19V5h14v14H5zm8-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-6 7l3-4 2.5 3 3.5-5 4 6H7z"
                />
              </svg>
            </span>
          </div>

          <!-- Back Button -->
          <button
            @click="$router.back()"
            class="absolute flex items-center justify-center w-10 h-10 transition rounded-full shadow-lg sm:hidden top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <i class="text-gray-700 pi pi-arrow-left"></i>
          </button>
          <!-- Share Button (aligned right) -->
          <button
            type="button"
            @click="shareMerchant"
            class="absolute flex items-center justify-center w-10 h-10 transition rounded-full shadow-lg sm:hidden top-4 right-4 bg-white/90 backdrop-blur-sm hover:bg-white"
            aria-label="Bagikan toko"
            title="Bagikan"
          >
            <i class="text-lg pi pi-share-alt"></i>
          </button>
        </div>

        <!-- Card Info Toko (Overlay) -->
        <div class="relative w-11/12 max-w-3xl mx-auto -mt-8">
          <div class="p-4 bg-white shadow-lg rounded-2xl">
            <div class="flex items-start gap-4">
              <!-- Logo Toko -->
              <div
                class="flex items-center justify-center w-20 h-20 overflow-hidden border shadow-inner rounded-2xl bg-white/20 backdrop-blur-sm shrink-0 border-white/30"
              >
                <img
                  v-if="merchant.logo_url"
                  :src="merchant.logo_url"
                  alt="Logo Toko"
                  class="object-cover w-full h-full"
                />
                <span v-else>
                  <svg
                    class="w-20 h-20 p-2 text-gray-300 bg-gray-100 border-4 border-white shadow-lg rounded-2xl"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
                    />
                  </svg>
                </span>
              </div>

              <!-- Info Toko -->
              <div class="flex-1 min-w-0 pt-1">
                <h1 class="text-base font-bold text-black sm:text-xl">
                  {{ merchant.name }}
                </h1>

                <div class="mt-2.5 flex items-center gap-2">
                  <span
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-semibold shadow-sm',
                      merchant.is_open_now
                        ? 'bg-success-background text-success-foreground'
                        : 'bg-danger-background text-danger-foreground',
                    ]"
                  >
                    {{ merchant.is_open_now ? "Buka" : "Tutup" }}
                  </span>
                  <span class="text-xs font-bold text-merchant-primary">
                    {{ merchant.segmentation?.name || "UMKM" }}
                  </span>

                  <span
                    v-if="formattedDistanceKm"
                    class="flex items-center gap-1 text-xs font-semibold text-gray-500"
                  >
                    <i
                      class="text-sm pi pi-map-marker text-danger-foreground"
                    ></i>
                    {{ formattedDistanceKm }}
                  </span>
                </div>
              </div>

              <!-- Share Button (aligned right) -->
              <button
                type="button"
                @click="shareMerchant"
                class="hidden w-10 h-10 transition-all rounded-full sm:inline shrink-0 backdrop-blur-sm hover:bg-gray-100 active:scale-95"
                aria-label="Bagikan toko"
                title="Bagikan"
              >
                <i class="text-lg pi pi-share-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Menu dan Informasi -->
      <div class="px-4 mx-auto mt-2 sm:mt-6 max-w-7xl">
        <div
          class="flex gap-1 p-1 bg-white border border-gray-100 shadow-sm rounded-xl"
        >
          <button
            @click="activeTab = 'menu'"
            :class="[
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition',
              activeTab === 'menu'
                ? 'bg-secondary-hover text-white'
                : 'text-gray-600 hover:bg-secondary-hover hover:text-white',
            ]"
          >
            <span v-if="merchant.segmentation?.id === 1">Produk</span>
            <span v-else-if="merchant.segmentation?.id === 2">Menu</span>
            <span v-else>Layanan</span>
          </button>
          <button
            @click="activeTab = 'informasi'"
            :class="[
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition',
              activeTab === 'informasi'
                ? 'bg-secondary-hover text-white'
                : 'text-gray-600 hover:bg-secondary-hover hover:text-white',
            ]"
          >
            Informasi
          </button>
        </div>
      </div>

      <!-- Tab Content: Menu -->
      <div v-show="activeTab === 'menu'" class="px-4 py-4 mx-auto max-w-7xl">
        <!-- Empty State -->
        <div
          v-if="
            (menuKind === 'jasa' && jasaList.length === 0) ||
            (menuKind === 'product' && productList.length === 0)
          "
          class="p-8 text-center bg-white shadow-sm rounded-xl"
        >
          <i class="mb-3 text-4xl text-gray-300 pi pi-inbox"></i>
          <p class="text-gray-500">
            {{
              menuKind === "product"
                ? "Belum ada produk yang tersedia"
                : "Belum ada layanan yang tersedia"
            }}
          </p>
        </div>

        <!-- Grid Produk -->
        <div
          v-else-if="menuKind === 'product'"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <ProductCard
            v-for="product in productList"
            :key="product.id"
            :product="product"
            class="transition cursor-pointer hover:shadow-md"
            @click="goToProductDetail(product)"
          />

          <!-- SKELETON APPEND -->
          <template v-if="isLoadingMore">
            <ProductCardSkeleton
              v-for="i in 6"
              :key="'load-more-product-' + i"
            />
          </template>
        </div>

        <!-- Grid Jasa -->
        <div
          v-else
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <router-link
            v-for="jasa in jasaList"
            :key="jasa.id"
            :to="{ name: 'JasaDetail', params: { slug: jasa.slug || String(jasa.id) } }"
            class="block overflow-hidden transition bg-white border border-gray-200 shadow-sm rounded-2xl hover:shadow-md"
          >
            <!-- Gambar -->
            <div class="overflow-hidden bg-gray-100 h-28 sm:h-32">
              <img
                v-if="resolveJasaImage(jasa)"
                :src="resolveJasaImage(jasa)"
                :alt="jasa.title"
                class="object-cover w-full h-full"
              />
              <div
                v-else
                class="flex items-center justify-center w-full h-full"
              >
                <i class="text-3xl text-gray-300 pi pi-image"></i>
              </div>
            </div>

            <!-- Info -->
            <div class="px-3 py-2.5">
              <h3
                class="text-sm font-semibold leading-tight text-gray-900 line-clamp-2"
              >
                {{ jasa.title }}
              </h3>
              <p class="mt-1 text-sm font-bold text-secondary-hover">
                <template
                  v-if="jasa.fixed_price && Number(jasa.fixed_price) > 0"
                >
                  Rp {{ formatHarga(jasa.fixed_price) }}
                </template>
                <template
                  v-else-if="jasa.base_price && Number(jasa.base_price) > 0"
                >
                  Mulai Rp {{ formatHarga(jasa.base_price) }}
                </template>
                <template v-else>
                  <span class="text-xs font-normal text-gray-400"
                    >Hubungi untuk harga</span
                  >
                </template>
              </p>
            </div>
          </router-link>

          <!-- SKELETON APPEND -->
          <template v-if="isLoadingMore">
            <ProductCardSkeleton v-for="i in 6" :key="'load-more-jasa-' + i" />
          </template>
        </div>

        <!-- SENTINEL (Infinite Scroll) -->
        <div
          v-if="hasMore && activeTab === 'menu'"
          ref="loadMoreRef"
          class="h-1"
        ></div>
      </div>

      <!-- Tab Content: Informasi -->
      <div
        v-show="activeTab === 'informasi'"
        class="px-4 py-4 mx-auto space-y-4 max-w-7xl"
      >
        <!-- Tentang -->
        <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h3 class="mb-3 text-base font-bold text-gray-900">Tentang</h3>
          <p class="text-sm leading-relaxed text-gray-600">
            {{ merchant.description || "Belum ada deskripsi untuk toko ini." }}
          </p>
        </div>

        <!-- Jam Operasional -->
        <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h3 class="mb-3 text-base font-bold text-gray-900">
            Jam Operasional
          </h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="day in operationalHours"
              :key="day.name"
              class="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
            >
              <span class="text-sm font-medium text-gray-700">{{
                day.name
              }}</span>
              <span
                :class="[
                  'text-sm font-bold',
                  day.hours === 'Tutup' ? 'text-red-500' : 'text-gray-900',
                ]"
              >
                {{ day.hours }}
              </span>
            </div>
          </div>
        </div>

        <!-- Hubungi Penjual -->
        <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h3 class="mb-3 text-base font-bold text-gray-900">
            Hubungi Penjual
          </h3>
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full shrink-0"
            >
              <i class="text-green-600 pi pi-phone"></i>
            </div>
            <template v-if="merchant.phone">
              <a
                :href="`https://wa.me/${formatPhoneForWa(merchant.phone)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-medium text-green-700 transition hover:underline hover:text-green-800"
                title="Chat via WhatsApp"
              >
                {{ merchant.phone }}
              </a>
            </template>
            <template v-else>
              <span class="text-sm font-medium text-gray-700">-</span>
            </template>
          </div>
        </div>

        <!-- Alamat -->
        <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h3 class="mb-3 text-base font-bold text-gray-900">Alamat</h3>

          <!-- Map Integration -->
          <div
            class="relative w-full h-48 mb-3 overflow-hidden bg-gray-100 rounded-xl"
          >
            <LeafletMap
              v-if="hasCoordinates"
              :lat="latitude"
              :lng="longitude"
              :myLat="myLatitude"
              :myLng="myLongitude"
              :zoom="12"
              :showMyLocation="true"
              variant="merchant"
              :readonly="true"
              class="absolute inset-0"
            />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center bg-gray-200"
            >
              <i class="text-3xl text-gray-400 pi pi-map-marker"></i>
            </div>
          </div>

          <p class="mb-4 text-sm leading-relaxed text-gray-600">
            {{ merchantInfo.address }}
          </p>

          <!-- Rute Button -->
          <AppButton
            v-if="hasCoordinates"
            @click="openRouteToMerchant"
            type="button"
            variant="primary"
            class="w-full"
          >
            <span>Rute</span>
          </AppButton>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="flex flex-col items-center justify-center h-64 px-4">
      <i class="mb-3 text-4xl text-gray-300 pi pi-exclamation-circle"></i>
      <p class="text-center text-gray-500">Toko tidak ditemukan</p>
      <router-link
        to="/"
        class="mt-4 text-sm text-secondary-hover hover:underline"
      >
        Kembali ke Beranda
      </router-link>
    </div>

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
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import api from "@/libs/axios.js";
import { getImageUrl } from "@/libs/getImageUrl.js";
import { setMeta, setJsonLd } from "@/router/seo";
import LeafletMap from "@/components/LeafletMap.vue";
import ProductCard from "@/components/Card/ProductCard.vue";
import ProductCardSkeleton from "@/components/Card/ProductCardSkeleton.vue";
import AppButton from "@/components/common/Button.vue";
import { useToast } from "vue-toastification";
const toast = useToast();

// Format phone number for wa.me (remove non-digits, add country code if needed)
function formatPhoneForWa(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d]/g, "");
  // If starts with 0, replace with 62 (Indonesia country code)
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

const route = useRoute();
const router = useRouter();

const merchant = ref(null);
const jasaList = ref([]);
const productList = ref([]);
const loading = ref(true);
const activeTab = ref("menu");
const menuKind = ref("jasa"); // 'product' | 'jasa'

// Infinite scroll state (mirip SearchPage/ProductLayananHome)
const loadMoreRef = ref(null);
const observer = ref(null);
const currentPage = ref(1);
const perPage = 20;
const hasMore = ref(false);
const isLoadingMore = ref(false);
const isLoadMoreQueued = ref(false);

// Back to top
const showBackToTop = ref(false);

function handleScroll() {
  showBackToTop.value = window.scrollY > 300;

  // Fallback infinite scroll when IntersectionObserver doesn't fire
  if (activeTab.value !== "menu") return;
  if (!hasMore.value) return;
  if (loading.value) return;
  if (isLoadingMore.value) return;

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

// Sync data state
const merchantInfo = ref({
  address: "",
});
const operationalHours = ref([]);
const latitude = ref(null);
const longitude = ref(null);

const myLatitude = ref(null);
const myLongitude = ref(null);

// Cache unauthorized state so we don't keep calling /api/profile/address for guests.
const profileAddressUnauthorized = ref(false);

function setMyCoordinates(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  myLatitude.value = Number.isFinite(latNum) ? latNum : null;
  myLongitude.value = Number.isFinite(lngNum) ? lngNum : null;
}

async function loadMyCoordinatesFromProfile(
  { fallbackToDevice } = { fallbackToDevice: false },
) {
  // 1) Try profile address first (if available)
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
      setMyCoordinates(null, null);
    }
  }

  // 2) If no saved address (or unauthenticated), fall back to GPS when asked
  if (!fallbackToDevice) return false;
  return await requestMyLocation();
}

async function requestMyLocation() {
  if (hasMyCoordinates.value) return true;
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

function openRouteToMerchant() {
  if (!hasMyCoordinates.value) {
    // Try to get location first
    requestMyLocation().then((success) => {
      if (success) {
        openGoogleMapsRoute();
      } else {
        toast.info(
          "Lokasi Anda belum tersedia. Silakan aktifkan akses lokasi.",
        );
      }
    });
    return;
  }
  openGoogleMapsRoute();
}

function openGoogleMapsRoute() {
  const originLat = myLatitude.value;
  const originLng = myLongitude.value;

  const destLat = parseFloat(latitude.value);
  const destLng = parseFloat(longitude.value);

  if (isNaN(destLat) || isNaN(destLng)) {
    toast.info("Lokasi toko tidak valid");
    return;
  }

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&travelmode=driving`;

  window.open(url, "_blank");
}

const DAYS = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" },
  { key: "saturday", label: "Sabtu" },
  { key: "sunday", label: "Minggu" },
];

const hasCoordinates = computed(() => {
  const latNum = parseFloat(latitude.value);
  const lngNum = parseFloat(longitude.value);
  return Number.isFinite(latNum) && Number.isFinite(lngNum);
});

const hasMerchantCoordinates = computed(() => hasCoordinates.value);

const hasMyCoordinates = computed(() => {
  return (
    Number.isFinite(myLatitude.value) && Number.isFinite(myLongitude.value)
  );
});

// Helper function to get segmentation ID
function getSegmentationId(data) {
  const raw = data?.segmentation_id ?? data?.segmentation?.id ?? null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

// Check if merchant is a Jasa (Service) merchant
// Only Jasa merchants (segmentation id = 3) should have chat feature
const isJasaMerchant = computed(() => {
  const segId = getSegmentationId(merchant.value);
  return segId === 3;
});

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const distanceKm = computed(() => {
  if (!hasMyCoordinates.value) return null;
  if (!hasMerchantCoordinates.value) return null;

  const mLat = parseFloat(latitude.value);
  const mLng = parseFloat(longitude.value);
  if (!Number.isFinite(mLat) || !Number.isFinite(mLng)) return null;

  return haversineKm(myLatitude.value, myLongitude.value, mLat, mLng);
});

const formattedDistanceKm = computed(() => {
  if (distanceKm.value == null) return null;
  return `${distanceKm.value.toFixed(1)} km`;
});

// Format harga
const formatHarga = (value) => {
  if (!value) return "0";
  return Number(value).toLocaleString("id-ID");
};

function formatFullAddress(addr) {
  if (!addr) return "-";
  const detail = addr?.detail?.trim?.() || "";
  const village = addr?.village?.name || "";
  const district = addr?.district?.name || "";
  const city = addr?.city?.name || "";
  const province = addr?.province?.name || "";
  const parts = [detail, village, district, city, province].filter(
    (p) => typeof p === "string" && p.trim() !== "",
  );
  return parts.length ? parts.join(", ") : "-";
}

function pickSeoImage(m) {
  return m?.banner_url || m?.logo_url || "https://sumilir.web.id/og-image.png";
}

const shareMerchantUrl = computed(() => {
  const slug = route?.params?.slug || "";
  return `${window.location.origin}/merchant/${slug}`;
});

const shareMerchantText = computed(() => {
  const name = merchant.value?.name || "Toko";
  const seg = merchant.value?.segmentation?.name;
  return seg ? `${name} - ${seg}` : name;
});

async function shareMerchant() {
  const url = shareMerchantUrl.value;
  const title = merchant.value?.name || "Toko";
  const text = shareMerchantText.value;

  if (!url) return;

  // ✅ Native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      // user cancelled or not supported, fallback below
    }
  }

  // ✅ Fallback: copy to clipboard
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success("Link toko berhasil disalin");
      return;
    }
  } catch (e) {
    // ignore
  }

  // ✅ Last resort: prompt for manual copy
  window.prompt("Salin link toko:", url);
}

function applyMerchantSeo(merchantData, merchantSlug) {
  const name = merchantData?.name || "Toko";
  const segmentation = merchantData?.segmentation?.name || "UMKM";
  const descRaw = merchantData?.description || "";
  const addrText = merchantInfo.value?.address || "";

  const seoImage = pickSeoImage(merchantData);
  let seoImageAbs = seoImage;
  try {
    seoImageAbs = seoImage
      ? new URL(seoImage, window.location.origin).href
      : seoImage;
  } catch (e) {
    // keep as-is
  }

  const description =
    descRaw?.trim() ||
    [
      `${segmentation} di Sumilir.`,
      addrText ? `Alamat: ${addrText}.` : "",
      "Lihat produk atau layanan, informasi toko, dan jam operasional.",
    ]
      .filter(Boolean)
      .join(" ");

  const pageUrl = `${window.location.origin}/merchant/${merchantSlug}`;

  setMeta({
    title: `${name} | SUMILIR`,
    description,
    image: seoImage,
    url: pageUrl,
    type: "business.business",
  });

  const latNum = parseFloat(latitude.value);
  const lngNum = parseFloat(longitude.value);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url: pageUrl,
    image: seoImageAbs ? [seoImageAbs] : undefined,
    telephone: merchantData?.phone || undefined,
    address: addrText
      ? { "@type": "PostalAddress", streetAddress: addrText }
      : undefined,
    geo:
      Number.isFinite(latNum) && Number.isFinite(lngNum)
        ? { "@type": "GeoCoordinates", latitude: latNum, longitude: lngNum }
        : undefined,
  };

  // Remove undefined keys so JSON-LD is clean
  for (const k of Object.keys(jsonLd)) {
    if (jsonLd[k] === undefined) delete jsonLd[k];
  }
  setJsonLd("jsonld-merchant", jsonLd);
}

// Resolve gambar jasa
const resolveJasaImage = (jasa) => {
  // Prefer API-provided cover image URL (id-based) - sama seperti produk
  if (jasa?.cover_img?.id) {
    return getImageUrl(jasa.cover_img.id);
  }

  if (jasa?.cover_img?.src_url) {
    return getImageUrl(jasa.cover_img.src_url);
  }

  if (jasa?.cover_img?.url) {
    return getImageUrl(jasa.cover_img.url);
  }

  if (jasa?.cover_image && typeof jasa.cover_image === "object") {
    if (jasa.cover_image?.id) return getImageUrl(jasa.cover_image.id);
    if (jasa.cover_image?.src_url) return getImageUrl(jasa.cover_image.src_url);
    if (jasa.cover_image?.url) return getImageUrl(jasa.cover_image.url);
  }

  if (jasa.images && jasa.images.length > 0) {
    const coverImage =
      jasa.images.find((img) => img.is_cover) || jasa.images[0];

    // API returns url/src_url
    if (coverImage.id) return getImageUrl(coverImage.id);
    if (coverImage.src_url) return getImageUrl(coverImage.src_url);
    if (coverImage.url) return getImageUrl(coverImage.url);

  }

  return null;
};

const goToProductDetail = (product) => {
  if (!product?.slug) return;
  router.push({ name: "Product Detail", params: { slug: product.slug } });
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

  // Support: endpoints that wrap paginator in { data: { data: [], current_page, ... } }
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

function setupObserver() {
  if (observer.value) observer.value.disconnect();

  observer.value = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      if (activeTab.value !== "menu") return;
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

function resetInfiniteScroll() {
  currentPage.value = 1;
  hasMore.value = false;
  isLoadMoreQueued.value = false;
  if (observer.value) observer.value.disconnect();
}

async function queueLoadMore() {
  if (!hasMore.value) return;
  if (loading.value) return;
  if (isLoadingMore.value) return;
  if (isLoadMoreQueued.value) return;
  if (menuKind.value !== "product" && menuKind.value !== "jasa") return;

  isLoadMoreQueued.value = true;
  currentPage.value += 1;

  try {
    await fetchMerchantMenu(merchant.value, route.params.slug, {
      append: true,
    });
  } finally {
    isLoadMoreQueued.value = false;
  }
}

async function fetchMerchantMenu(
  merchantData,
  merchantSlug,
  { append } = { append: false },
) {
  const segId = getSegmentationId(merchantData);

  // Reset lists to avoid stale UI when navigating between merchants
  if (!append) {
    jasaList.value = [];
    productList.value = [];
    currentPage.value = 1;
    hasMore.value = false;
  }

  // 1/2 => toko/kuliner (produk)
  if (segId === 1 || segId === 2) {
    menuKind.value = "product";

    if (append) {
      isLoadingMore.value = true;
    }

    try {
      const { data } = await api.get(
        `/api/public/merchants/${merchantSlug}/products`,
        {
          params: { per_page: perPage, page: currentPage.value },
        },
      );

      const paginator = data?.products ?? data?.data ?? data;
      const parsed = parseLaravelPaginator(paginator);

      if (append) {
        productList.value.push(...(parsed.items ?? []));
      } else {
        productList.value = parsed.items ?? [];
      }

      hasMore.value = parsed.current < parsed.last;
      await ensureSentinelObserved();
    } finally {
      if (append) isLoadingMore.value = false;
    }
    return;
  }

  // 3 => jasa
  if (segId === 3) {
    menuKind.value = "jasa";

    if (append) {
      isLoadingMore.value = true;
    }

    try {
      const { data } = await api.get(
        `/api/public/merchants/${merchantSlug}/jasas`,
        {
          params: { per_page: perPage, page: currentPage.value },
        },
      );

      const parsed = parseLaravelPaginator(data);
      const mapped = (parsed.items ?? []).map((j) => ({
        ...j,
        // keep image resolver compat
        image: j?.image ?? null,
      }));

      if (append) {
        jasaList.value.push(...mapped);
      } else {
        jasaList.value = mapped;
      }

      hasMore.value = parsed.current < parsed.last;
      await ensureSentinelObserved();
    } finally {
      if (append) isLoadingMore.value = false;
    }
    return;
  }

  // Fallback: treat as product merchant
  menuKind.value = "product";

  if (append) {
    isLoadingMore.value = true;
  }

  try {
    const { data } = await api.get(
      `/api/public/merchants/${merchantSlug}/products`,
      {
        params: { per_page: perPage, page: currentPage.value },
      },
    );
    const paginator = data?.products ?? data?.data ?? data;
    const parsed = parseLaravelPaginator(paginator);

    if (append) {
      productList.value.push(...(parsed.items ?? []));
    } else {
      productList.value = parsed.items ?? [];
    }

    hasMore.value = parsed.current < parsed.last;
    await ensureSentinelObserved();
  } finally {
    if (append) isLoadingMore.value = false;
  }
}

// Fetch data merchant dan jasa-jasanya
const fetchMerchantData = async () => {
  loading.value = true;
  try {
    const merchantSlug = route.params.slug;

    // Fetch merchant detail (Standardized URL)
    const { data: merchantData } = await api.get(
      `/api/public/merchants/${merchantSlug}`,
    );
    const data = merchantData.data || merchantData;
    merchant.value = data;

    // Sync data similar to MerchantInfo.vue
    const primaryAddress =
      data?.primary_address ?? data?.primaryAddress ?? null;
    merchantInfo.value.address = formatFullAddress(primaryAddress);

    latitude.value = primaryAddress?.latitude ?? data?.latitude ?? null;
    longitude.value = primaryAddress?.longitude ?? data?.longitude ?? null;

    const hours = data.operational_hours ?? {};
    operationalHours.value = DAYS.map((day) => {
      const item = hours[day.key];
      if (!item || item.is_open === false) {
        return { name: day.label, hours: "Tutup" };
      }
      return { name: day.label, hours: `${item.open} - ${item.close}` };
    });

    // Dynamic SEO based on merchant data
    applyMerchantSeo(data, merchantSlug);

    // Fetch menu berdasarkan segmentation
    resetInfiniteScroll();
    await fetchMerchantMenu(data, merchantSlug, { append: false });

    await nextTick();
    setupObserver();
  } catch (error) {
    console.error("Error fetching merchant:", error);
    merchant.value = null;
    jasaList.value = [];
    productList.value = [];

    setMeta({
      title: "Toko tidak ditemukan | SUMILIR",
      description: "Toko tidak ditemukan atau sudah tidak tersedia.",
      url: window.location.origin + window.location.pathname,
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // Preload profile coordinates (no geolocation prompt).
  // If user has no saved address (or is unauthenticated), use GPS so distance/features still work.
  loadMyCoordinatesFromProfile({ fallbackToDevice: true });

  window.addEventListener("scroll", handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  if (observer.value) observer.value.disconnect();
});

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab !== "menu") {
      if (observer.value) observer.value.disconnect();
      return;
    }

    await nextTick();
    setupObserver();
  },
);

watch(() => route.params.slug, fetchMerchantData, { immediate: true });
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
