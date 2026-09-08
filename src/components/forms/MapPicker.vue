<script setup>
/**
MapPicker — Pilih lokasi di peta (Leaflet) dengan marker draggable

Contoh pakai (aman untuk parser, tanpa tag <template> asli):
// Parent component (setup)
import { ref } from 'vue';
const lat = ref(null);
const lng = ref(null);

// Template:
&lt;MapPicker v-model:lat="lat" v-model:lng="lng" :zoom="14" height="300px" variant="merchant" /&gt;
&lt;p class="text-xs text-gray-500"&gt;Lat: {{ lat }} | Lng: {{ lng }}&lt;/p&gt;

Props:
- lat: number|string|null => koordinat latitude (dua arah via v-model:lat)
- lng: number|string|null => koordinat longitude (dua arah via v-model:lng)
- zoom: number (default 13) => tingkat zoom
- height: string (default "280px") => tinggi peta (CSS unit)
- readonly: boolean => nonaktifkan drag marker dan klik peta
- variant: string (default "primary") => "primary" | "user" | "merchant"

Events:
- update:lat(number|null)
- update:lng(number|null)

Catatan:
- Tombol "Gunakan lokasi saya" memerlukan HTTPS atau localhost (geolocation API).
- Klik di peta untuk menaruh/memindah marker (jika readonly=false).
- Drag marker untuk memperbarui lat/lng (jika readonly=false).
*/
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getUmkmMarkerColorByVariant,
  getUmkmStoreIcon,
} from "@/libs/leafletIcons";

const props = defineProps({
  lat: { type: [Number, String, null], default: null },
  lng: { type: [Number, String, null], default: null },
  zoom: { type: Number, default: 13 },
  height: { type: String, default: "280px" },
  readonly: { type: Boolean, default: false },
  variant: { type: String, default: "primary" }, // primary | user | merchant
});
const emit = defineEmits(["update:lat", "update:lng", "manual-change"]);

const mapEl = ref(null);
let map;
let marker;

const tileUrl =
  import.meta.env.VITE_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution =
  import.meta.env.VITE_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

// Tambahan state
const geoError = ref("");
const isLocating = ref(false);
const isSecure = window.isSecureContext === true;
const isGeoSupported = "geolocation" in navigator;
const canUseGeo = computed(() => isSecure && isGeoSupported && !props.readonly);

const borderColorClass = computed(() => {
  return props.variant === "merchant"
    ? "border-merchant-primary"
    : "border-primary";
});

const buttonTextClass = computed(() => {
  return props.variant === "merchant"
    ? "text-merchant-primary hover:bg-merchant-primary/5"
    : "text-primary hover:bg-primary/5";
});

const buttonBorderClass = computed(() => {
  return props.variant === "merchant"
    ? "border-merchant-primary"
    : "border-primary";
});

function setMarker(latlng) {
  if (!map) return;

  // Untuk halaman alamat pelanggan: gunakan default Leaflet marker (user marker).
  // Custom UMKM/merchant marker hanya dipakai jika variant === "merchant".
  const shouldUseMerchantIcon = props.variant === "merchant";
  const merchantIcon = shouldUseMerchantIcon
    ? getUmkmStoreIcon(getUmkmMarkerColorByVariant(props.variant))
    : null;
  const defaultIcon = L.Marker.prototype.options.icon;

  if (!marker) {
    marker = L.marker(latlng, {
      draggable: !props.readonly,
      ...(merchantIcon ? { icon: merchantIcon } : {}),
    }).addTo(map);
    if (!props.readonly) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        const finalLat = +lat.toFixed(6);
        const finalLng = +lng.toFixed(6);
        emit("update:lat", finalLat);
        emit("update:lng", finalLng);
        emit("manual-change", { lat: finalLat, lng: finalLng });
      });
    }
  } else {
    marker.setLatLng(latlng);
    marker.setIcon(merchantIcon || defaultIcon);
  }
}

function updateLatLng(lat, lng, setView = false) {
  if (!map || lat == null || lng == null) return;
  const latNum = typeof lat === "string" ? parseFloat(lat) : lat;
  const lngNum = typeof lng === "string" ? parseFloat(lng) : lng;
  const latlng = L.latLng(latNum, lngNum);
  setMarker(latlng);
  if (setView) map.setView(latlng, props.zoom);
}

function locateMe() {
  geoError.value = "";
  if (!canUseGeo.value) {
    geoError.value = isSecure
      ? "Geolocation tidak didukung browser."
      : "Geolocation memerlukan HTTPS atau localhost.";
    return;
  }

  isLocating.value = true;

  const onSuccess = (pos) => {
    const { latitude, longitude } = pos.coords;
    const finalLat = +latitude.toFixed(6);
    const finalLng = +longitude.toFixed(6);
    emit("update:lat", finalLat);
    emit("update:lng", finalLng);
    emit("manual-change", { lat: finalLat, lng: finalLng });
    updateLatLng(latitude, longitude, true);
    isLocating.value = false;
  };

  const onFinalError = (err) => {
    if (err.code === 1) {
      geoError.value =
        "Akses lokasi ditolak. Izinkan di Site settings browser.";
    } else if (err.code === 2) {
      geoError.value = "Lokasi akurat Anda tidak dapat ditentukan.";
    } else if (err.code === 3) {
      geoError.value = "Permintaan lokasi timeout. Coba lagi.";
    } else {
      geoError.value = "Gagal mengambil lokasi.";
    }
    console.warn("Geolocation error:", err);
    isLocating.value = false;
  };

  const tryHighAccuracy = () => {
    navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (err) => {
      if (err.code === 2 || err.code === 3) {
        tryHighAccuracy();
      } else {
        onFinalError(err);
      }
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

function resetMarker() {
  if (!map) return;
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  emit("update:lat", null);
  emit("update:lng", null);
}

onMounted(() => {
  const iconRetinaUrl = new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString();
  const iconUrl = new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url
  ).toString();
  const shadowUrl = new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString();
  L.Marker.prototype.options.icon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const startLat = props.lat ?? -7.539493;
  const startLng = props.lng ?? 110.80573;

  map = L.map(mapEl.value, { attributionControl: false }).setView([startLat, startLng], props.zoom);
  L.tileLayer(tileUrl, { attribution }).addTo(map);

  if (props.lat != null && props.lng != null) {
    setMarker([props.lat, props.lng]);
  }

  if (!props.readonly) {
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const finalLat = +lat.toFixed(6);
      const finalLng = +lng.toFixed(6);
      emit("update:lat", finalLat);
      emit("update:lng", finalLng);
      emit("manual-change", { lat: finalLat, lng: finalLng });
      setMarker(e.latlng);
    });
  }
});

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (lat != null && lng != null) updateLatLng(lat, lng, false);
  }
);

onBeforeUnmount(() => {
  if (map) map.remove();
});

function panTo(lat, lng, zoomLvl = null) {
  if (lat != null && lng != null) {
    updateLatLng(lat, lng, false);
    if (map) map.setView([lat, lng], zoomLvl || props.zoom);
  }
}

defineExpose({ panTo, locateMe });
</script>

<template>
  <div class="space-y-2">
    <div
      ref="mapEl"
      :class="[
        'w-full rounded-xl overflow-hidden border',
        borderColorClass,
        'leaflet-z-fix',
      ]"
      :style="{ height }"
    />
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <button
          type="button"
          @click="locateMe"
          :disabled="!canUseGeo || isLocating"
          :class="[
            'px-3 py-2 text-sm font-semibold rounded-lg border',
            buttonBorderClass,
            buttonTextClass,
            'disabled:opacity-60',
          ]"
          :aria-busy="isLocating ? 'true' : 'false'"
          :title="
            !isSecure
              ? 'Butuh HTTPS/localhost'
              : !isGeoSupported
              ? 'Geolocation tidak didukung'
              : ''
          "
        >
          {{ isLocating ? "Mencari lokasi..." : "Gunakan lokasi saya" }}
        </button>
        <button
          v-if="!readonly"
          type="button"
          @click="resetMarker"
          class="px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>
      <p v-if="geoError" class="text-xs text-red-600">{{ geoError }}</p>
      <p v-else-if="!isSecure" class="text-xs text-amber-600">
        Tips: buka lewat HTTPS atau localhost agar geolocation bisa diakses.
      </p>
    </div>
  </div>
</template>

<style scoped>
/*
  Leaflet default z-index cukup tinggi (controls sampai 1000) dan bisa
  menutupi elemen UI lain (loading overlay, tombol fixed, modal).
  Kita turunkan semuanya di dalam MapPicker supaya selalu berada di bawah
  komponen lain yang pakai z-40/z-50, dll.
*/
.leaflet-z-fix {
  position: relative;
  z-index: 0;
}

.leaflet-z-fix :deep(.leaflet-pane),
.leaflet-z-fix :deep(.leaflet-control),
.leaflet-z-fix :deep(.leaflet-top),
.leaflet-z-fix :deep(.leaflet-bottom) {
  z-index: 0 !important;
}

/* Popup/tooltip juga kadang punya z-index tinggi */
.leaflet-z-fix :deep(.leaflet-tooltip),
.leaflet-z-fix :deep(.leaflet-popup) {
  z-index: 0 !important;
}
</style>