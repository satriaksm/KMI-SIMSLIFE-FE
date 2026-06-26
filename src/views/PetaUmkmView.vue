<template>
  <div class="relative z-0">
    <!-- SEARCH + FILTER (DESKTOP) -->
    <div
      class="fixed z-40 justify-center hidden w-full p-3 -translate-x-1/2 sm:flex sm:top-16 top-24 left-1/2"
    >
      <div class="flex items-center w-full max-w-2xl gap-3">
        <!-- SEARCH BAR -->
        <div class="relative w-full">
          <TextField
            v-model="query"
            @update:modelValue="search"
            name="search-desktop"
            placeholder="Cari UMKM..."
            hideLabel
            autocomplete="off"
          />

          <!-- HASIL PENCARIAN DESKTOP -->
          <ul
            v-if="results.length"
            class="absolute left-0 right-0 z-50 mt-1 overflow-y-auto bg-white rounded-lg shadow-lg max-h-60 search-results-desktop"
          >
            <li
              v-for="item in results"
              :key="item.id"
              @click="goTo(item)"
              class="flex items-center justify-between gap-3 p-3 transition-colors border-b border-gray-100 cursor-pointer hover:bg-linear-to-r hover:from-primary/5 hover:to-primary/10 last:border-b-0"
            >
              <div class="flex items-center min-w-0 gap-3">
                <!-- IMAGE -->
                <img
                  loading="lazy"
                  v-if="item.logo_url"
                  :src="getThumbLogoUrl(item.logo_url)"
                  class="object-cover w-12 h-12 bg-gray-200 rounded-lg shrink-0"
                  alt="Foto UMKM"
                />
                <svg
                  v-else
                  class="w-12 h-12 p-2 text-gray-300 bg-gray-100 rounded-lg shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
                  />
                </svg>

                <!-- INFO -->
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {{ item.name }}
                  </div>
                  <div
                    class="flex items-center gap-2 mt-1 text-xs text-gray-600"
                  >
                    <span class="font-bold text-merchant-primary">{{
                      item.segmentation?.name || "UMKM"
                    }}</span>
                    <span
                      v-if="calculateDistance(item)"
                      class="flex items-center gap-1"
                    >
                      <i class="text-red-500 pi pi-map-marker"></i>
                      {{ calculateDistance(item) }}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- FILTER BUTTONS DESKTOP -->
        <div class="flex gap-2">
          <button
            @click="setFilter(2)"
            class="px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500 text-white': activeSeg === 2,
              'bg-white text-black': activeSeg !== 2,
            }"
          >
            Kuliner
          </button>
          <button
            @click="setFilter(3)"
            class="px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500 text-white': activeSeg === 3,
              'bg-white text-black': activeSeg !== 3,
            }"
          >
            Jasa
          </button>
          <button
            @click="setFilter(1)"
            class="px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500 text-white': activeSeg === 1,
              'bg-white text-black': activeSeg !== 1,
            }"
          >
            Toko
          </button>
        </div>
      </div>
    </div>

    <!-- SEARCH + FILTER (MOBILE) -->
    <div class="fixed left-0 z-40 w-full px-3 sm:hidden top-8">
      <div class="flex flex-col w-full gap-2 mx-auto">
        <!-- SEARCH BAR -->
        <div class="w-full">
          <TextField
            v-model="query"
            @update:modelValue="search"
            name="search-mobile"
            placeholder="Cari UMKM..."
            hideLabel
            autocomplete="off"
          />
        </div>

        <!-- FILTER MOBILE (HORIZONTAL SCROLL) -->
        <div class="flex gap-2 pb-1 overflow-x-auto">
          <button
            @click="setFilter(2)"
            class="w-full px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500 text-white': activeSeg === 2,
              'bg-white text-black': activeSeg !== 2,
            }"
          >
            Kuliner
          </button>
          <button
            @click="setFilter(3)"
            class="w-full px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500  text-white': activeSeg === 3,
              'bg-white text-black': activeSeg !== 3,
            }"
          >
            Jasa
          </button>
          <button
            @click="setFilter(1)"
            class="w-full px-4 py-2 text-sm transition rounded-full shadow"
            :class="{
              'bg-amber-500 text-white': activeSeg === 1,
              'bg-white text-black': activeSeg !== 1,
            }"
          >
            Toko
          </button>
        </div>
      </div>
    </div>

    <!-- HASIL PENCARIAN MOBILE SLIDE-UP -->
    <transition name="slide-up">
      <div
        v-if="results.length"
        class="sm:hidden fixed bottom-16 left-0 z-40 w-full max-h-[50vh] overflow-y-auto p-3 space-y-1 bg-white rounded-t-2xl shadow-[0_-4px_15px_rgba(0,0,0,0.2)]"
      >
        <div
          v-for="item in results"
          :key="item.id"
          @click="goTo(item)"
          class="flex gap-3 p-3 bg-white shadow rounded-xl active:bg-gray-100"
        >
          <img
            loading="lazy"
            v-if="item.logo_url"
            :src="getThumbLogoUrl(item.logo_url)"
            class="object-cover w-20 h-20 bg-gray-200 rounded-2xl shrink-0"
            alt="Foto UMKM"
          />
          <svg
            v-else
            class="w-20 h-20 p-2 text-gray-300 bg-gray-100 rounded-2xl shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
            />
          </svg>

          <div class="flex flex-col justify-center flex-1 gap-2">
            <h3 class="text-base font-semibold">{{ item.name }}</h3>
            <div class="flex items-center gap-2 text-xs text-gray-600">
              <span class="font-bold text-merchant-primary">{{
                item.segmentation?.name || "UMKM"
              }}</span>
              <span
                v-if="calculateDistance(item)"
                class="flex items-center gap-1"
              >
                <i class="text-red-500 pi pi-map-marker"></i>
                {{ calculateDistance(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- MAP FULLSCREEN RESPONSIVE -->
    <div id="map" class="relative z-0 w-full h-[95dvh] sm:h-[92dvh]"></div>
  </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";
import TextField from "@/components/forms/TextField.vue";

const toast = useToast();
export default {
  name: "MapComponent",
  components: { TextField },

  data() {
    return {
      map: null,
      markers: [],
      merchants: [],
      filtered: [],
      myMarker: null,
      myLocation: null,
      activeSeg: null,
      query: "",
      results: [],
      merchantIconCache: {},
    };
  },

  mounted() {
    this.map = L.map("map", { zoomControl: false }).setView(
      [-7.5420536, 110.8082958],
      15,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      this.map,
    );

    this.loadMyLocationMarker();
    this.loadMerchants();
  },

  methods: {
    getThumbLogoUrl(url) {
      const logo = url ? String(url) : "";
      if (logo && logo.includes('/api/')) {
        return `${logo.split('?')[0]}?size=thumb`;
      }
      return logo;
    },
    toRad(deg) {
      return (deg * Math.PI) / 180;
    },

    haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = this.toRad(lat2 - lat1);
      const dLng = this.toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(lat1)) *
          Math.cos(this.toRad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    calculateDistance(item) {
      if (!this.myLocation) return null;
      const itemLat = parseFloat(item.latitude);
      const itemLng = parseFloat(item.longitude);
      if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) return null;
      const distKm = this.haversineKm(
        this.myLocation.lat,
        this.myLocation.lng,
        itemLat,
        itemLng,
      );
      return distKm < 1
        ? `${(distKm * 1000).toFixed(0)}m`
        : `${distKm.toFixed(1)}km`;
    },

    getMerchantMarkerIcon(segmentationId) {
      const key = String(segmentationId ?? "default");
      if (this.merchantIconCache[key]) return this.merchantIconCache[key];

      const colorBySeg = {
        default: "#058895", // fallback
      };

      const color = colorBySeg[Number(segmentationId)] ?? colorBySeg.default;

      const icon = L.divIcon({
        className: "umkm-marker-icon",
        html: `
          <div class="umkm-marker" style="--umkm-marker-color: ${color}">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 10.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9.5"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3 10.5l2-7h14l2 7"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 21v-7h6v7"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
        popupAnchor: [0, -46],
      });

      this.merchantIconCache[key] = icon;
      return icon;
    },

    async loadMyLocationMarker() {
      const coords = await this.getMyCoordinates();
      if (!coords) return;

      this.myLocation = coords;

      const icon = L.divIcon({
        className: "my-location-icon",
        html: '<div class="w-4 h-4 border-2 border-white rounded-full shadow-md bg-primary"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (this.myMarker) {
        this.myMarker.setLatLng([coords.lat, coords.lng]);
        return;
      }

      const popup = `
        <div class="popup-card popup-card--me">
          <div class="popup-card__body">
            <div class="popup-me__badge">Anda</div>
            <div class="popup-me__title">Alamat Anda</div>
          </div>
        </div>`;
      this.myMarker = L.marker([coords.lat, coords.lng], { icon })
        .addTo(this.map)
        .bindPopup(popup);

      // ✅ RE-CENTER map to user's location if available
      this.map.setView([coords.lat, coords.lng], 15);
    },

    async getMyCoordinates() {
      // 1) Prefer saved address from profile if user is logged in.
      try {
        const res = await api.get("api/profile/address");
        const addr = res?.data?.data;

        const lat = parseFloat(addr?.latitude);
        const lng = parseFloat(addr?.longitude);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      } catch (e) {
        // ignore (likely 401 if not logged in)
      }

      // 2) Fallback: browser geolocation
      if (!navigator.geolocation) return null;

      return await new Promise((resolve) => {
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
    },

    async loadMerchants() {
      const res = await api.get("api/public/merchants/map");
      this.merchants = res.data.data;
      this.filtered = this.merchants;
      this.renderMarkers();
    },

    setFilter(segId) {
      // Toggle filter: jika sudah aktif, unselect
      if (this.activeSeg === segId) {
        this.activeSeg = null;
        this.filtered = this.merchants;
      } else {
        this.activeSeg = segId;
        this.filtered = this.merchants.filter(
          (m) => m.segmentation?.id === segId,
        );
      }
      this.results = [];
      this.renderMarkers();
    },

    renderMarkers() {
      this.markers.forEach((m) => this.map.removeLayer(m));
      this.markers = [];

      this.filtered.forEach((item) => {
        // Validasi koordinat sebelum membuat marker
        const lat = parseFloat(item.latitude);
        const lng = parseFloat(item.longitude);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

        const icon = this.getMerchantMarkerIcon(item.segmentation?.id);
        const marker = L.marker([lat, lng], { icon }).addTo(this.map);

        const logoTag = item.logo_url
          ? `<div class="popup-gmaps__img"><img src="${this.getThumbLogoUrl(item.logo_url)}" alt="${item.name}" loading="lazy" /></div>`
          : `<div class="popup-gmaps__img" style="background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
              <svg class="w-12 h-12 p-2 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z" />
              </svg>
            </div>`;
        const segmentation = item.segmentation?.name || "UMKM";
        const distance = this.calculateDistance(item);
        const distanceInfo = distance
          ? `<div class="popup-gmaps__distance">
              <i class="pi pi-map-marker" style="color: #f87171; margin-right: 2px;"></i>
             ${distance}</div>`
          : "";
        const popup = `
          <div class="popup-card">
            <div class="popup-card__body">
              ${logoTag}
              <div class="popup-gmaps__title">${item.name}</div>
              <div class="popup-gmaps__meta">
                <span class="popup-gmaps__badge">${segmentation}</span>
              ${distanceInfo}

              </div>
            </div>
            <div class="popup-card__footer">
              <button class="popup-route-btn">
                <span>Rute</span>
              </button>
            </div>
          </div>`;

        marker.bindPopup(popup);

        // Klik di dalam popup => navigasi ke detail merchant
        marker.on("popupopen", () => {
          const popupEl = marker.getPopup()?.getElement();
          const card = popupEl?.querySelector(".popup-card");
          if (!card) return;

          const routeBtn = popupEl?.querySelector(".popup-route-btn");
          if (routeBtn) {
            routeBtn.onclick = (e) => {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              this.openRouteToMerchant(item);
            };
          }

          const slugOrId = item.slug || item.id;
          card.onclick = () => {
            this.$router.push(`/merchant/${slugOrId}`);
          };
        });

        this.markers.push(marker);
      });
    },

    search() {
      if (this.query.length < 2) return (this.results = []);
      const key = this.query.toLowerCase();
      this.results = this.filtered.filter((m) =>
        m.name.toLowerCase().includes(key),
      );
    },

    goTo(item) {
      // Validasi koordinat sebelum setView dan marker
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      this.map.setView([lat, lng], 18);

      // Cari marker yang sudah ada berdasarkan koordinat
      const existingMarker = this.markers.find((marker) => {
        const markerLatLng = marker.getLatLng();
        return (
          Math.abs(markerLatLng.lat - lat) < 0.0001 &&
          Math.abs(markerLatLng.lng - lng) < 0.0001
        );
      });

      // Buka popup marker yang sudah ada
      if (existingMarker) {
        existingMarker.openPopup();
      }

      this.query = item.name;
      this.results = [];
    },

    openRouteToMerchant(item) {
      if (!this.myLocation) {
        toast.info("Lokasi Anda belum tersedia");
        return;
      }

      const originLat = this.myLocation.lat;
      const originLng = this.myLocation.lng;

      const destLat = parseFloat(item.latitude);
      const destLng = parseFloat(item.longitude);

      if (isNaN(destLat) || isNaN(destLng)) {
        alert("Lokasi UMKM tidak valid");
        return;
      }

      const url =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${originLat},${originLng}` +
        `&destination=${destLat},${destLng}` +
        `&travelmode=driving`;

      window.open(url, "_blank");
    },
  },
};
</script>

<style>
.leaflet-popup-content {
  margin: 0 !important;
}

.leaflet-popup-content-wrapper {
  border-radius: 16px !important;
  padding: 0 !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.leaflet-popup-tip {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

/* ===== Custom UMKM marker (store/shop) ===== */
.umkm-marker-icon {
  background: transparent !important;
  border: 0 !important;
}

.umkm-marker {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: var(--umkm-marker-color, #10b981);
  border: 3px solid rgba(255, 255, 255, 0.98);
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.22),
    0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.umkm-marker::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-top: 12px solid var(--umkm-marker-color, #10b981);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25));
}

.umkm-marker svg {
  width: 18px;
  height: 18px;
  display: block;
}

/* Custom close (x) button for Leaflet popup */
.leaflet-popup-close-button {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  font-size: 20px !important;
  color: rgba(0, 0, 0, 0.6) !important;
  opacity: 1 !important;
  z-index: 10 !important;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.15s;
}
.leaflet-popup-close-button:hover {
  color: var(--color-primary) !important;
  transform: scale(1.04);
}

/* Popup card base */
.popup-card {
  width: 220px;
  max-width: 240px;
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.popup-card__body {
  padding: 14px 14px 12px 14px;
  text-align: center;
}

/* Merchant popup */
.popup-gmaps__img {
  width: 72px;
  height: 72px;
  margin: 2px auto 10px auto;
  border-radius: 16px;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.popup-gmaps__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.popup-gmaps__title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 1);
  line-height: 1.25;
  word-break: break-word;
  margin-bottom: 6px;
}

.popup-gmaps__meta {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.popup-gmaps__badge {
  color: var(--color-merchant-primary);
  font-size: 12px;
  font-weight: 700;
}

.popup-gmaps__distance {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
}

/* My location popup */
.popup-card--me .popup-card__body {
  padding-top: 12px;
}

.popup-me__badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.popup-me__title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
}

/* Popup card footer */
.popup-card__footer {
  padding: 12px 14px 14px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
}

/* Rute button: large, easy to tap */
.popup-route-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 24px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffb300 0%, #ffa000 100%);
  color: #fff;
  border: none;
  border-radius: 9999px;
  box-shadow: 0 2px 8px rgba(255, 163, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.popup-route-btn:hover {
  background: linear-gradient(135deg, #ffa000 0%, #ff8c00 100%);
  box-shadow: 0 4px 12px rgba(255, 163, 0, 0.3);
  transform: translateY(-1px);
}

.popup-route-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(255, 163, 0, 0.2);
}

.popup-route-btn__icon {
  font-size: 16px;
  display: inline-block;
}

/* Mobile slide-up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Custom scrollbar untuk hasil pencarian desktop */
.search-results-desktop {
  scrollbar-width: thin;
  scrollbar-color: rgba(5, 136, 149, 0.3) transparent;
}

.search-results-desktop::-webkit-scrollbar {
  width: 6px;
}

.search-results-desktop::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}

.search-results-desktop::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(5, 136, 149, 0.4) 0%,
    rgba(5, 136, 149, 0.6) 100%
  );
  border-radius: 10px;
  transition: background 0.2s ease;
}

.search-results-desktop::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(5, 136, 149, 0.6) 0%,
    rgba(5, 136, 149, 0.8) 100%
  );
}

.search-results-desktop::-webkit-scrollbar-thumb:active {
  background: rgba(5, 136, 149, 0.9);
}
</style>
