<script setup>
import { ref, onMounted, watch } from "vue";
import { Carousel, Slide, Navigation } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/libs/axios";
import { getMerchantBannerUrl } from "@/libs/getImageUrl";

const merchants = ref([]);
const loading = ref(true);
const map = ref(null);
const markers = ref([]);
const currentSlide = ref(0);

// Carousel config
const carouselConfig = {
  itemsToShow: 1,
  wrapAround: true,
  autoplay: 4000,
  pauseAutoplayOnHover: true,
  snapAlign: "center",
  mouseDrag: true,
  touchDrag: true,
};

// Initialize map
const initMap = () => {
  if (map.value) return;

  const mapElement = document.getElementById("home-map-preview");
  if (!mapElement) return;

  // Default center: Yogyakarta
  map.value = L.map("home-map-preview", {
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: true,
    touchZoom: true,
  }).setView([-7.5420536, 110.8082958], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map.value);
};

// =====================
// MAP MARKER + POPUP UI
// =====================

// segmentation name normalizer
const getSegmentationKey = (merchant) => {
  const raw = (merchant?.segmentation?.name || "").toLowerCase().trim();

  // kamu bisa tambahin mapping sesuai data asli backend kamu
  if (raw.includes("toko")) return "toko";
  if (raw.includes("kuliner")) return "kuliner";
  if (raw.includes("jasa")) return "jasa";

  // default fallback
  return "jasa";
};

const getMarkerColorBySegmentation = (merchant) => {
  const key = getSegmentationKey(merchant);

  switch (key) {
    case "toko":
      return "#ffa30e"; // primary
    case "kuliner":
      return "#0894eb"; // secondary
    case "jasa":
    default:
      return "#058895"; // merchant-primary
  }
};

const renderMarkerIcon = (merchant, isActive = false) => {
  const color = getMarkerColorBySegmentation(merchant);
  const logo = merchant?.logo_url ? String(merchant.logo_url) : "";

  const innerHtml = logo
    ? `<span class="umkm-marker__logo-wrap">
        <img class="umkm-marker__logo" src="${logo}" loading="lazy" referrerpolicy="no-referrer" />
      </span>`
    : `...svg...`;

  return L.divIcon({
    className: "umkm-marker-icon",
    html: `<div class="umkm-marker ${isActive ? "active" : ""}" style="--umkm-marker-color:${color}">${innerHtml}</div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
};

const initMarkers = () => {
  if (!map.value || merchants.value.length === 0) return;

  // bersihin marker lama kalau ada (hanya untuk case re-init)
  markers.value.forEach((m) => m.remove());
  markers.value = [];

  merchants.value.forEach((merchant, index) => {
    const lat = parseFloat(merchant.latitude);
    const lng = parseFloat(merchant.longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const marker = L.marker([lat, lng], {
      icon: renderMarkerIcon(merchant, index === currentSlide.value),
    }).addTo(map.value);
    // klik marker → sync carousel
    marker.on("click", () => {
      slideTo(index);
    });

    markers.value.push(marker);
  });
};

const setActiveMarker = (index, initial = false) => {
  if (!map.value || markers.value.length === 0) return;

  markers.value.forEach((marker, i) => {
    const merchant = merchants.value[i];
    if (!merchant) return;
    marker.setIcon(renderMarkerIcon(merchant, i === index));
  });

  const activeMarker = markers.value[index];
  const activeMerchant = merchants.value[index];

  // flyTo & open popup aktif
  if (activeMarker && activeMerchant) {
    const lat = parseFloat(activeMerchant.latitude);
    const lng = parseFloat(activeMerchant.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      map.value.flyTo([lat, lng], 18, {
        animate: true,
        duration: initial ? 0.8 : 1,
      });
    }
  }
};

const updateMapMarkers = () => {
  // tidak rebuild, cuma update active state + popup
  setActiveMarker(currentSlide.value);
};

const loadMerchants = async () => {
  loading.value = true;

  try {
    const params = {};

    const response = await api.get("/api/public/home/map-carousel-merchants", {
      params,
    });
    merchants.value = (response.data.data || []).filter(
      (m) => m.latitude && m.longitude,
    );

    // Initialize map and markers after merchants loaded
    if (merchants.value.length > 0) {
      setTimeout(() => {
        initMap();
        initMarkers();
      }, 100);
    }
  } catch (error) {
    merchants.value = [];
  } finally {
    loading.value = false;
  }
};

watch(currentSlide, (newIndex) => {
  updateMapMarkers();
});

const slideTo = (index) => {
  currentSlide.value = index;
};

onMounted(async () => {
  await loadMerchants();
});
</script>

<template>
  <section id="map-preview" class="relative py-8 bg-gray-50 sm:py-16">
    <div class="px-4 mx-auto max-w-7xl sm:px-6">
      <!-- Section Header -->
      <div class="mb-6 text-center sm:mb-10">
        <h2 class="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
          Jelajahi UMKM di Peta
        </h2>
        <p class="text-sm text-gray-600 sm:text-base">
          Temukan lokasi merchant lokal melalui peta interaktif
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <i class="text-4xl pi pi-spin pi-spinner text-primary"></i>
      </div>

      <!-- Map + Carousel Layout -->
      <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <!-- Map Preview -->
        <div
          class="relative overflow-hidden bg-white border border-gray-200 shadow-lg lg:col-span-2 rounded-2xl"
        >
          <div
            id="home-map-preview"
            class="w-full h-60 sm:h-[360px] lg:h-[400px]"
          ></div>

          <!-- View Full Map Button - -->
          <div class="absolute z-40 top-4 right-4">
            <router-link
              to="/map"
              class="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-merchant-primary font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg border-2 border-merchant-primary transition-all duration-300 hover:scale-105"
            >
              <i class="text-base pi pi-map"></i>
              <span class="hidden sm:inline">Lihat Peta Lengkap</span>
              <span class="sm:hidden">Peta</span>
            </router-link>
          </div>
        </div>

        <!-- Merchant Carousel  -->
        <div class="relative lg:col-span-1">
          <div class="lg:sticky lg:top-4">
            <!-- DESKTOP -->
            <div class="hidden lg:flex lg:flex-col lg:space-y-4">
              <!-- Main Carousel Desktop  -->
              <div class="shrink-0">
                <Carousel
                  v-if="merchants.length > 0"
                  id="merchant-carousel-desktop"
                  v-bind="carouselConfig"
                  v-model="currentSlide"
                  class="[&_.carousel__prev]:hidden [&_.carousel__next]:hidden"
                >
                  <Slide v-for="merchant in merchants" :key="merchant.id">
                    <router-link
                      :to="{
                        name: 'Merchant Detail',
                        params: { slug: merchant.slug || merchant.id },
                      }"
                      class="block w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                    >
                      <!-- Banner/Cover -->
                      <div
                        class="relative overflow-hidden aspect-video bg-linear-to-br from-primary/10 to-merchant-primary/10"
                      >
                        <img
                          v-if="merchant.cover_path"
                          :src="getMerchantBannerUrl(merchant)"
                          :alt="merchant.name"
                          class="object-cover w-full h-full"
                        />
                        <div
                          v-else
                          class="flex items-center justify-center w-full h-full"
                        >
                          <i
                            class="text-5xl pi pi-shop text-merchant-primary/30"
                          ></i>
                        </div>

                        <!-- Segmentation Badge -->
                        <div
                          v-if="merchant.segmentation"
                          class="absolute top-3 left-3 bg-merchant-primary/90 backdrop-blur-sm text-white font-semibold text-xs px-3 py-1.5 rounded-full"
                        >
                          {{ merchant.segmentation.name }}
                        </div>
                      </div>

                      <!-- Merchant Info -->
                      <div class="p-3">
                        <div class="flex items-start gap-2 mb-2">
                          <div class="shrink-0">
                            <div
                              v-if="merchant.logo_url"
                              class="relative z-20 w-12 h-12 -mt-6 overflow-hidden bg-white border-2 border-white rounded-lg shadow-md"
                            >
                              <img
                                :src="merchant.logo_url"
                                :alt="merchant.name"
                                class="object-cover w-full h-full"
                              />
                            </div>
                            <div
                              v-else
                              class="relative z-20 flex items-center justify-center w-12 h-12 -mt-6 border-2 border-white rounded-lg shadow-md bg-muted-background"
                            >
                              <i
                                class="text-xl pi pi-shop text-merchant-primary"
                              ></i>
                            </div>
                          </div>

                          <div class="flex-1 min-w-0">
                            <h3
                              class="mb-1 text-sm font-bold text-gray-900 line-clamp-1"
                              :title="merchant.name"
                            >
                              {{ merchant.name }}
                            </h3>
                            <div
                              class="flex items-center gap-1 text-[10px] text-gray-500"
                            >
                              <i
                                class="text-xs pi pi-shopping-bag text-merchant-primary"
                              ></i>
                              <span
                                >{{ merchant.products_count || 0 }} Produk</span
                              >
                            </div>
                          </div>
                        </div>

                        <!-- Location Info -->
                        <div v-if="merchant.primary_address" class="space-y-1">
                          <div
                            v-if="merchant.distance_km"
                            class="flex items-center gap-1 text-[10px] text-gray-600"
                          >
                            <i
                              class="text-xs pi pi-map-marker text-danger-foreground"
                            ></i>
                            <span class="font-medium"
                              >{{ merchant.distance_km }} km</span
                            >
                          </div>

                          <div
                            class="flex items-start gap-1 text-[10px] text-gray-500"
                          >
                            <i class="pi pi-home text-xs shrink-0 mt-0.5"></i>
                            <span class="line-clamp-1">
                              {{ merchant.primary_address.detail }},
                              {{ merchant.primary_address.village?.name }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </router-link>
                  </Slide>
                </Carousel>
              </div>

              <!-- Thumbnails Desktop  -->
              <div v-if="merchants.length > 1" class="h-25 shrink-0">
                <Carousel
                  id="merchant-thumbnails-desktop"
                  :items-to-show="3"
                  :wrap-around="true"
                  :snap-align="'center'"
                  v-model="currentSlide"
                  class="h-full [&_.carousel__prev]:top-1/2 [&_.carousel__prev]:-translate-y-1/2 [&_.carousel__prev]:w-6 [&_.carousel__prev]:h-6 [&_.carousel__prev]:bg-merchant-primary/70 [&_.carousel__prev]:rounded-full [&_.carousel__next]:top-1/2 [&_.carousel__next]:-translate-y-1/2 [&_.carousel__next]:w-6 [&_.carousel__next]:h-6 [&_.carousel__next]:bg-merchant-primary/70 [&_.carousel__next]:rounded-full"
                >
                  <Slide
                    v-for="(merchant, index) in merchants"
                    :key="`thumb-desktop-${merchant.id}`"
                  >
                    <template #default="{ isActive }">
                      <div
                        class="w-full h-full px-1 transition-all"
                        @click="slideTo(index)"
                      >
                        <div
                          class="relative h-full overflow-hidden transition-all duration-300 bg-white border-2 rounded-lg cursor-pointer group"
                          :class="
                            isActive
                              ? 'border-merchant-primary shadow-md'
                              : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-merchant-primary/50'
                          "
                        >
                          <div
                            class="relative overflow-hidden aspect-video bg-linear-to-br from-primary/5 to-merchant-primary/5"
                          >
                            <img
                              v-if="merchant.cover_path"
                              :src="getMerchantBannerUrl(merchant)"
                              :alt="merchant.name"
                              class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                            />
                            <div
                              v-else
                              class="flex items-center justify-center w-full h-full"
                            >
                              <i
                                class="text-lg pi pi-shop text-merchant-primary/30"
                              ></i>
                            </div>

                            <div
                              v-if="isActive"
                              class="absolute inset-0 border-2 rounded-t-lg border-merchant-primary"
                            ></div>
                          </div>

                          <div class="p-1 bg-white">
                            <p
                              class="text-[9px] font-semibold text-center truncate"
                              :class="
                                isActive
                                  ? 'text-merchant-primary'
                                  : 'text-gray-700'
                              "
                            >
                              {{ merchant.name }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Slide>

                  <template #addons>
                    <Navigation />
                  </template>
                </Carousel>
              </div>
            </div>

            <!-- MOBILE/TABLET -->
            <div class="flex gap-3 lg:hidden h-60 sm:h-[360px]">
              <!-- Main Carousel Mobile/Tablet -->
              <div class="min-w-0 flex-2 sm:flex-3">
                <Carousel
                  v-if="merchants.length > 0"
                  id="merchant-carousel-mobile"
                  v-bind="carouselConfig"
                  v-model="currentSlide"
                  class="h-full [&_.carousel__prev]:hidden [&_.carousel__next]:hidden"
                >
                  <Slide v-for="merchant in merchants" :key="merchant.id">
                    <router-link
                      :to="{
                        name: 'Merchant Detail',
                        params: { slug: merchant.slug || merchant.id },
                      }"
                      class="block w-full h-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                    >
                      <!-- Banner/Cover -->
                      <div
                        class="relative h-32 overflow-hidden sm:h-68 bg-linear-to-br from-primary/10 to-merchant-primary/10"
                      >
                        <img
                          v-if="merchant.cover_path"
                          :src="getMerchantBannerUrl(merchant)"
                          :alt="merchant.name"
                          class="object-cover w-full h-full"
                        />
                        <div
                          v-else
                          class="flex items-center justify-center w-full h-full"
                        >
                          <i
                            class="text-4xl pi pi-shop sm:text-5xl text-merchant-primary/30"
                          ></i>
                        </div>

                        <!-- Segmentation Badge -->
                        <div
                          v-if="merchant.segmentation"
                          class="absolute top-2 left-2 bg-merchant-primary/90 ba ckdrop-blur-sm text-white font-semibold text-[10px] px-2 py-1 rounded-full"
                        >
                          {{ merchant.segmentation.name }}
                        </div>
                      </div>

                      <!-- Merchant Info -->
                      <div class="p-3">
                        <div class="flex items-start gap-2 mb-2">
                          <div class="shrink-0">
                            <div
                              v-if="merchant.logo_url"
                              class="relative z-20 w-10 h-10 -mt-5 overflow-hidden bg-white border-2 border-white rounded-lg shadow-md sm:w-12 sm:h-12 sm:-mt-6"
                            >
                              <img
                                :src="merchant.logo_url"
                                :alt="merchant.name"
                                class="object-cover w-full h-full"
                              />
                            </div>
                            <div
                              v-else
                              class="relative z-20 flex items-center justify-center w-10 h-10 -mt-5 border-2 border-white rounded-lg shadow-md sm:w-12 sm:h-12 sm:-mt-6 bg-muted-background"
                            >
                              <i
                                class="text-lg pi pi-shop sm:text-xl text-merchant-primary"
                              ></i>
                            </div>
                          </div>

                          <div class="flex-1 min-w-0">
                            <h3
                              class="mb-1 text-xs font-bold text-gray-900 sm:text-sm line-clamp-2"
                              :title="merchant.name"
                            >
                              {{ merchant.name }}
                            </h3>
                            <div
                              class="flex items-center gap-1 text-[10px] text-gray-500"
                            >
                              <i
                                class="text-xs pi pi-shopping-bag text-merchant-primary"
                              ></i>
                              <span
                                >{{ merchant.products_count || 0 }} Produk</span
                              >
                            </div>
                          </div>
                        </div>

                        <!-- Location Info -->
                        <div v-if="merchant.primary_address" class="space-y-1">
                          <div
                            v-if="merchant.distance_km"
                            class="flex items-center gap-1 text-[10px] text-gray-600"
                          >
                            <i
                              class="text-xs pi pi-map-marker text-danger-foreground"
                            ></i>
                            <span class="font-medium"
                              >{{ merchant.distance_km }} km</span
                            >
                          </div>

                          <div
                            class="flex items-start gap-1 text-[10px] text-gray-500"
                          >
                            <i class="pi pi-home text-xs shrink-0 mt-0.5"></i>
                            <span class="line-clamp-2">
                              {{ merchant.primary_address.detail }},
                              {{ merchant.primary_address.village?.name }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </router-link>
                  </Slide>
                </Carousel>
              </div>

              <!-- Thumbnails Mobile/Tablet (VERTICAL CAROUSEL) -->
              <div
                v-if="merchants.length > 1"
                class="flex-1 sm:flex-1 max-w-[100px] sm:max-w-[120px] h-full"
              >
                <Carousel
                  id="merchant-thumbnails-mobile"
                  v-model="currentSlide"
                  :dir="'ttb'"
                  :items-to-show="3"
                  :wrap-around="true"
                  snap-align="center"
                  :height="'100%'"
                  :touch-drag="true"
                  :transition="300"
                  class="h-full [&_.carousel__prev]:w-6 [&_.carousel__prev]:h-6 [&_.carousel__prev]:rounded-full [&_.carousel__next]:w-6 [&_.carousel__next]:h-6 [&_.carousel__next]:rounded-full"
                >
                  <Slide
                    v-for="(merchant, index) in merchants"
                    :key="`thumb-mobile-${merchant.id}`"
                  >
                    <template #default="{ isActive }">
                      <div
                        class="w-full h-full px-1 transition-all cursor-pointer"
                        @click="slideTo(index)"
                      >
                        <div
                          class="relative h-full overflow-hidden transition-all duration-300 bg-white border-2 rounded-lg"
                          :class="
                            isActive
                              ? 'border-merchant-primary shadow-md'
                              : 'border-gray-200 opacity-80 hover:opacity-100 hover:border-merchant-primary/50'
                          "
                        >
                          <div
                            class="relative overflow-hidden aspect-5/4 bg-linear-to-br from-primary/5 to-merchant-primary/5"
                          >
                            <img
                              v-if="merchant.cover_path"
                              :src="getMerchantBannerUrl(merchant)"
                              :alt="merchant.name"
                              class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                            />
                            <div
                              v-else
                              class="flex items-center justify-center w-full h-full"
                            >
                              <i
                                class="text-lg pi pi-shop text-merchant-primary/30"
                              ></i>
                            </div>
                          </div>

                          <div class="p-1 bg-white">
                            <p
                              class="text-[9px] font-semibold text-center truncate"
                              :class="
                                isActive
                                  ? 'text-merchant-primary'
                                  : 'text-gray-700'
                              "
                            >
                              {{ merchant.name }}
                            </p>
                          </div>

                          <!-- Active border decoration -->
                          <div
                            v-if="isActive"
                            class="absolute inset-0 border-2 rounded-lg pointer-events-none border-merchant-primary"
                          ></div>
                        </div>
                      </div>
                    </template>
                  </Slide>

                  <template #addons>
                    <Navigation />
                  </template>
                </Carousel>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="merchants.length === 0"
              class="flex flex-col items-center justify-center p-6 text-center bg-white border border-gray-200 rounded-2xl"
            >
              <i class="mb-3 text-4xl text-gray-300 pi pi-map-marker"></i>
              <p class="mb-1 font-semibold text-gray-700">Tidak ada UMKM</p>
              <p class="text-xs text-gray-500">Belum ada merchant terdaftar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Leaflet container */
:deep(.leaflet-container) {
  font-family: inherit;
}

/*
  OPTIONAL BUT RECOMMENDED:
  Leaflet default z-index itu tinggi (controls bisa 1000+),
  kadang nutup tombol / modal / overlay.
  Ini bikin konsisten seperti MapPicker kamu.
*/
#home-map-preview {
  position: relative;
  z-index: 0;
}

#home-map-preview :deep(.leaflet-pane),
#home-map-preview :deep(.leaflet-control),
#home-map-preview :deep(.leaflet-top),
#home-map-preview :deep(.leaflet-bottom) {
  z-index: 0 !important;
}

/* UMKM Marker */
:deep(.umkm-marker-icon) {
  background: transparent !important;
  border: 0 !important;
}

:deep(.umkm-marker) {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: var(--umkm-marker-color);
  border: var(--umkm-marker-color);
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.22),
    0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.umkm-marker::after) {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -12px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 16px solid var(--umkm-marker-color);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25));
}

:deep(.umkm-marker__logo-wrap) {
  width: 42px;
  height: 42px;
  border-radius: 9999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--umkm-marker-color);
}

:deep(.umkm-marker__logo) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.umkm-marker svg {
  width: 18px;
  height: 18px;
  display: block;
}

.umkm-marker.active {
  animation: pulse-marker 2s infinite;
}

@keyframes pulse-marker {
  0%,
  100% {
    box-shadow:
      0 10px 18px rgba(0, 0, 0, 0.22),
      0 2px 6px rgba(0, 0, 0, 0.15),
      0 0 0 0 var(--umkm-marker-color);
  }
  50% {
    box-shadow:
      0 10px 18px rgba(0, 0, 0, 0.22),
      0 2px 6px rgba(0, 0, 0, 0.15),
      0 0 0 10px transparent;
  }
}
</style>
