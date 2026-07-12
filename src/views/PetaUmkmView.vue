<template>
  <div class="relative z-0">
    <!-- SEARCH + FILTER (DESKTOP) -->
    <div
      class="fixed z-40 justify-center hidden w-full p-4 -translate-x-1/2 pointer-events-none sm:flex sm:top-16 top-24 left-1/2"
    >
      <div class="flex items-start w-full max-w-3xl gap-4 pointer-events-auto">
        <!-- SEARCH BAR -->
        <div class="relative flex-1">
          <div class="relative w-full">
            <span class="absolute z-10 text-gray-400 -translate-y-1/2 pointer-events-none left-4 top-1/2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 10.5 18a7.5 7.5 0 0 0 6.15-3.35Z" />
              </svg>
            </span>
            <TextField
              v-model="query"
              @update:modelValue="search"
              name="search-desktop"
              placeholder="Cari warung, toko, atau jasa..."
              hideLabel
              autocomplete="off"
              customClass="!pl-11 !h-12 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white rounded-2xl border-none ring-1 ring-black/5"
            />
            <button v-if="query" @click="query = ''; results = []" class="absolute z-10 flex items-center justify-center w-6 h-6 text-gray-400 transition -translate-y-1/2 bg-gray-100 rounded-full right-4 top-1/2 hover:text-gray-700">
              <i class="text-xs pi pi-times"></i>
            </button>
          </div>

          <!-- HASIL PENCARIAN DESKTOP -->
          <transition name="fade">
            <ul
              v-if="results.length"
              class="absolute left-0 right-0 z-50 mt-2 overflow-y-auto bg-white shadow-2xl rounded-2xl max-h-[60vh] border border-gray-100 divide-y divide-gray-50"
            >
              <li
                v-for="item in results"
                :key="item.id"
                @click="goTo(item)"
                class="flex items-center justify-between gap-3 p-3 transition-colors cursor-pointer hover:bg-gray-50"
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
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z" />
                  </svg>

                <!-- INFO -->
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ item.name }}
                  </div>
                  <div v-if="item.description" class="mt-0.5 text-[11px] text-gray-500 truncate">
                    {{ item.description }}
                  </div>
                  <div class="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span class="font-bold text-merchant-primary">{{ item.segmentation?.name || "UMKM" }}</span>
                    <span v-if="calculateDistance(item)" class="flex items-center gap-1">
                      <i class="text-red-500 pi pi-map-marker text-[10px]"></i>
                      {{ calculateDistance(item) }}
                    </span>
                    <StatusLabel 
                      :status="item.is_open_now ? 'success' : 'danger'" 
                      variant="general" 
                      :label="item.is_open_now ? 'Buka' : 'Tutup'" 
                      size="xs" 
                      :showIcon="false"
                    />
                  </div>
                </div>
                </div>
              </li>
            </ul>
          </transition>
        </div>

        <!-- FILTER BUTTONS DESKTOP -->
        <div class="flex gap-2 shrink-0">
          <button
            @click="setFilter(2)"
            class="flex items-center gap-2 px-4 h-12 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 2 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="KulinerIcon" class="w-5 h-5" alt="Kuliner" /> Kuliner
          </button>
          <button
            @click="setFilter(3)"
            class="flex items-center gap-2 px-4 h-12 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 3 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="JasaIcon" class="w-5 h-5" alt="Jasa" /> Jasa
          </button>
          <button
            @click="setFilter(1)"
            class="flex items-center gap-2 px-4 h-12 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 1 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="TokoIcon" class="w-5 h-5" alt="Toko" /> Toko
          </button>
        </div>
      </div>
    </div>

    <!-- SEARCH + FILTER (MOBILE) -->
    <div class="fixed left-0 z-40 w-full px-3 pointer-events-none sm:hidden top-8">
      <div class="flex flex-col w-full gap-3 mx-auto pointer-events-auto">
        
        <!-- SEARCH BAR -->
        <div class="relative w-full">
          <span class="absolute z-10 text-gray-400 -translate-y-1/2 pointer-events-none left-4 top-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 10.5 18a7.5 7.5 0 0 0 6.15-3.35Z" />
            </svg>
          </span>
          <TextField
            v-model="query"
            @update:modelValue="search"
            name="search-mobile"
            placeholder="Cari UMKM..."
            hideLabel
            autocomplete="off"
            customClass="!pl-11 !h-12 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white rounded-2xl border-none ring-1 ring-black/5"
          />
          <button v-if="query" @click="query = ''; results = []" class="absolute z-10 flex items-center justify-center w-6 h-6 text-gray-400 transition -translate-y-1/2 bg-gray-100 rounded-full right-4 top-1/2 hover:text-gray-700">
            <i class="text-xs pi pi-times"></i>
          </button>
        </div>

        <!-- FILTER MOBILE (HORIZONTAL SCROLL) -->
        <div class="flex gap-2 pb-1 overflow-x-auto hide-scrollbar">
          <button
            @click="setFilter(2)"
            class="flex items-center justify-center flex-1 gap-2 px-4 h-10 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 2 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="KulinerIcon" class="w-5 h-5" alt="Kuliner" /> Kuliner
          </button>
          <button
            @click="setFilter(3)"
            class="flex items-center justify-center flex-1 gap-2 px-4 h-10 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 3 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="JasaIcon" class="w-5 h-5" alt="Jasa" /> Jasa
          </button>
          <button
            @click="setFilter(1)"
            class="flex items-center justify-center flex-1 gap-2 px-4 h-10 text-sm font-medium transition-all duration-300 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] whitespace-nowrap border-none text-white"
            :class="activeSeg === 1 ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'"
          >
            <img :src="TokoIcon" class="w-5 h-5" alt="Toko" /> Toko
          </button>
        </div>

        <!-- HASIL PENCARIAN MOBILE DROPDOWN (STATIC - BELOW FILTER) -->
        <transition name="fade">
          <div
            v-if="results.length"
            class="w-full mt-1 overflow-y-auto p-2 space-y-1 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 max-h-[50vh]"
          >
            <div
              v-for="item in results"
              :key="item.id"
              @click="goTo(item)"
              class="flex gap-3 p-3 transition bg-white border border-gray-50 rounded-xl active:bg-gray-50"
            >
              <img
                loading="lazy"
                v-if="item.logo_url"
                :src="getThumbLogoUrl(item.logo_url)"
                class="object-cover w-16 h-16 bg-gray-200 rounded-lg shrink-0"
                alt="Foto UMKM"
              />
              <svg
                v-else
                class="w-16 h-16 p-2 text-gray-300 bg-gray-100 rounded-lg shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z" />
              </svg>

              <div class="flex flex-col justify-center flex-1 min-w-0 gap-1">
                <h3 class="text-sm font-semibold truncate">{{ item.name }}</h3>
                <p v-if="item.description" class="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                  {{ item.description }}
                </p>
                <div class="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600">
                  <span class="font-bold text-merchant-primary">{{ item.segmentation?.name || "UMKM" }}</span>
                  <span v-if="calculateDistance(item)" class="flex items-center gap-1">
                    <i class="text-red-500 pi pi-map-marker text-[10px]"></i>
                    {{ calculateDistance(item) }}
                  </span>
                  <StatusLabel 
                    :status="item.is_open_now ? 'success' : 'danger'" 
                    variant="general" 
                    :label="item.is_open_now ? 'Buka' : 'Tutup'" 
                    size="xs" 
                    :showIcon="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </transition>

      </div>
    </div>

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
import StatusLabel from "@/components/common/StatusLabel.vue";

import TokoIcon from "@/assets/icons/Toko.svg";
import KulinerIcon from "@/assets/icons/Kuliner.svg";
import JasaIcon from "@/assets/icons/Jasa.svg";

const toast = useToast();
export default {
  name: "MapComponent",
  components: { TextField, StatusLabel },

  data() {
    return {
      TokoIcon,
      KulinerIcon,
      JasaIcon,
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
    this.map = L.map("map", { zoomControl: false, attributionControl: false }).setView(
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

    getMerchantMarkerIcon(merchant) {
      const key = String(merchant.id || "default");
      if (this.merchantIconCache[key]) return this.merchantIconCache[key];

      const color = "#058895"; // color merchant-primary

      const logoUrl = merchant.logo_url ? this.getThumbLogoUrl(merchant.logo_url) : "";
      const innerHtml = logoUrl
        ? `<span class="umkm-marker__logo-wrap">
             <img class="umkm-marker__logo" src="${logoUrl}" loading="lazy" referrerpolicy="no-referrer" />
           </span>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
            </svg>`;

      const icon = L.divIcon({
        className: "umkm-marker-icon",
        html: `
          <div class="umkm-marker" style="--umkm-marker-color: ${color}">
            ${innerHtml}
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48],
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
        html: '<div class="w-5 h-5 border-2 border-white rounded-full shadow-md bg-primary"></div>',
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

        const icon = this.getMerchantMarkerIcon(item);
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
          ? `<div class="popup-gmaps__distance" style="display:flex; align-items:center; gap: 4px;">
              <i class="pi pi-map-marker" style="color: #f87171;"></i>
             ${distance}</div>`
          : "";

        const avgRating = item.rating_summary?.average_rating;
        const ratingInfo = avgRating > 0
          ? `<div class="popup-gmaps__rating" style="display:flex; align-items:center; gap: 4px; font-size: 12px; color: rgba(0,0,0,0.7);">
              <i class="pi pi-star-fill" style="color: #fbbf24;"></i>
             ${avgRating}</div>`
          : "";

        const openStatus = item.is_open_now
          ? `<span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600;">Buka</span>`
          : `<span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600;">Tutup</span>`;

        const descInfo = item.description 
          ? `<div style="font-size: 11px; color: #6b7280; margin: 4px 0 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">
               ${item.description}
             </div>` 
          : "";

        const popup = `
          <div class="popup-card">
            <div class="popup-card__body">
              ${logoTag}
              <div class="popup-gmaps__title" style="margin-bottom: ${item.description ? '2px' : '6px'};">
                ${item.name}
              </div>
              ${descInfo}
              <div class="popup-gmaps__meta" style="display:flex; gap:10px; align-items:center; justify-content:center; flex-wrap:wrap; margin-top: 4px;">
                <span class="popup-gmaps__badge">${segmentation}</span>
                ${openStatus}
                ${ratingInfo}
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

        // Tambahkan event click agar saat marker di-klik, popup-nya juga ke tengah layar
        marker.on('click', () => {
          const currentZoom = this.map.getZoom();
          const targetPoint = this.map.project([lat, lng], currentZoom);
          targetPoint.y -= 150; // offset ke atas
          const targetLatLng = this.map.unproject(targetPoint, currentZoom);
          
          this.map.setView(targetLatLng, currentZoom, { animate: true });
        });

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

      const targetZoom = 18;
      
      // Gunakan project/unproject untuk menggeser center point agar popup berada di tengah layar
      const targetPoint = this.map.project([lat, lng], targetZoom);
      // Popup kita cukup tinggi + ada anchor marker, geser center map ke atas sekitar 150px
      targetPoint.y -= 150; 
      const targetLatLng = this.map.unproject(targetPoint, targetZoom);

      this.map.setView(targetLatLng, targetZoom);

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
/* Utilities */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

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
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: var(--umkm-marker-color, #058895);
  border: 3px solid var(--umkm-marker-color, #058895);
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
  border-top: 12px solid var(--umkm-marker-color, #058895);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25));
}

.umkm-marker svg {
  width: 18px;
  height: 18px;
  display: block;
}

.umkm-marker__logo-wrap {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--umkm-marker-color);
}

.umkm-marker__logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
