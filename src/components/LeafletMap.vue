<script setup>
/**
 * LeafletMap / MapPicker
 * - v-model:lat, v-model:lng
 * - Marker draggable
 * - Klik map set lokasi
 * - Geolocation (HTTPS / localhost)
 * - Placeholder overlay (saat belum ada lokasi)
 */

import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
} from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/libs/axios";
import {
  getUmkmMarkerColorByVariant,
  getUmkmStoreIcon,
} from "@/libs/leafletIcons";

/* ================= PROPS & EMITS ================= */
const props = defineProps({
  lat: { type: [Number, String, null], default: null },
  lng: { type: [Number, String, null], default: null },
  zoom: { type: Number, default: 14 },
  height: { type: String, default: "280px" },
  readonly: { type: Boolean, default: false },
  variant: { type: String, default: "primary" }, // primary | merchant
  showMyLocation: { type: Boolean, default: false },
  // Optional: parent can provide explicit my-location coords so map
  // will display both markers and fit bounds deterministically.
  myLat: { type: [Number, String, null], default: null },
  myLng: { type: [Number, String, null], default: null },
});

const emit = defineEmits(["update:lat", "update:lng"]);

/* ================= STATE ================= */
const mapEl = ref(null);
const wrapperEl = ref(null);
let map = null;
let marker = null;
let myMarker = null;
let resizeObserver = null;

const geoError = ref("");
const isLocating = ref(false);

const isSecure = window.isSecureContext === true;
const isGeoSupported = "geolocation" in navigator;
const canUseGeo = computed(() => isSecure && isGeoSupported && !props.readonly);

function createMyLocationIcon() {
  return L.divIcon({
    className: "my-location-icon",
    html: '<div class="w-4 h-4 border-2 border-white rounded-full shadow-md bg-primary"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/* ================= STYLE COMPUTED ================= */
const borderColorClass = computed(() =>
  props.variant === "merchant" ? "border-merchant-primary" : "border-primary",
);

const buttonTextClass = computed(() =>
  props.variant === "merchant"
    ? "text-merchant-primary hover:bg-merchant-primary/5"
    : "text-primary hover:bg-primary/5",
);

const buttonBorderClass = computed(() =>
  props.variant === "merchant" ? "border-merchant-primary" : "border-primary",
);

/* ================= TILE CONFIG ================= */
const tileUrl =
  import.meta.env.VITE_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const attribution =
  import.meta.env.VITE_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

/* ================= HELPERS ================= */
function normalize(val) {
  if (val === null || val === undefined) return null;
  return typeof val === "string" ? parseFloat(val) : val;
}

function setMarker(latlng) {
  if (!map) return;

  const storeIcon = getUmkmStoreIcon(
    getUmkmMarkerColorByVariant(props.variant),
  );

  if (!marker) {
    marker = L.marker(latlng, {
      draggable: !props.readonly,
      icon: storeIcon,
    }).addTo(map);

    if (!props.readonly) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        emit("update:lat", +lat.toFixed(6));
        emit("update:lng", +lng.toFixed(6));
      });
    }
  } else {
    marker.setLatLng(latlng);
    marker.setIcon(storeIcon);
  }
}

function updateLatLng(lat, lng, setView = false) {
  const latNum = normalize(lat);
  const lngNum = normalize(lng);
  if (latNum == null || lngNum == null || !map) return;

  const latlng = L.latLng(latNum, lngNum);
  setMarker(latlng);
  if (setView) map.setView(latlng, props.zoom);
}

function resetMarker() {
  if (marker && map) {
    map.removeLayer(marker);
    marker = null;
  }
  emit("update:lat", null);
  emit("update:lng", null);
}

function invalidateMapSize(refitAfter = false) {
  if (!map) return;
  nextTick(() => {
    requestAnimationFrame(() => {
      map?.invalidateSize(true);
      // Re-apply fit after the map knows its real dimensions.
      if (refitAfter && (marker || myMarker)) {
        setTimeout(() => fitToMarkers(), 80);
      }
    });
  });
}

async function getMyCoordinates() {
  // If parent explicitly provided coordinates, use them and skip
  // profile / browser geolocation.
  if (props.myLat != null && props.myLng != null) {
    const lat = normalize(props.myLat);
    const lng = normalize(props.myLng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  // 1) Prefer saved address from profile if user is logged in.
  try {
    const res = await api.get("api/profile/address");
    const addr = res?.data?.data;

    const lat = parseFloat(addr?.latitude);
    const lng = parseFloat(addr?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  } catch (e) {
    // ignore (likely 401 if not logged in)
  }

  // 2) Fallback: browser geolocation (requires HTTPS / localhost)
  if (!isSecure || !isGeoSupported) return null;

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
}

function setMyMarker(latlng) {
  if (!map) return;

  if (!myMarker) {
    myMarker = L.marker(latlng, { icon: createMyLocationIcon() })
      .addTo(map)
      .bindPopup(
        `
        <div class="popup-card popup-card--me">
          <div class="popup-card__body">
            <div class="popup-me__badge">Anda</div>
            <div class="popup-me__title">Alamat Anda</div>
          </div>
        </div>`,
      );
  } else {
    myMarker.setLatLng(latlng);
  }
}

function fitToMarkers() {
  if (!map) return;
  const points = [];

  if (marker) points.push(marker.getLatLng());
  if (myMarker) points.push(myMarker.getLatLng());

  if (points.length === 0) return;
  if (points.length === 1) {
    map.setView(points[0], props.zoom);
    return;
  }

  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, {
    padding: [24, 24],
    // Respect zoom prop as an upper bound.
    maxZoom: Number.isFinite(Number(props.zoom)) ? Number(props.zoom) : 15,
  });
}

/* ================= GEOLOCATION ================= */
function locateMe() {
  geoError.value = "";

  if (!canUseGeo.value) {
    geoError.value = isSecure
      ? "Geolocation tidak didukung browser."
      : "Geolocation memerlukan HTTPS atau localhost.";
    return;
  }

  isLocating.value = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      emit("update:lat", +latitude.toFixed(6));
      emit("update:lng", +longitude.toFixed(6));
      updateLatLng(latitude, longitude, true);
      isLocating.value = false;
    },
    (err) => {
      geoError.value =
        err.code === 1
          ? "Akses lokasi ditolak."
          : err.code === 2
            ? "Lokasi tidak tersedia."
            : "Gagal mengambil lokasi.";
      isLocating.value = false;
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

/* ================= LIFECYCLE ================= */
onMounted(async () => {
  await nextTick();

  // FIX ICON PATH (Vite)
  const iconRetinaUrl = new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url,
  ).toString();
  const iconUrl = new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url,
  ).toString();
  const shadowUrl = new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url,
  ).toString();

  L.Marker.prototype.options.icon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const startLat = normalize(props.lat) ?? -2.5;
  const startLng = normalize(props.lng) ?? 118.0;

  map = L.map(mapEl.value).setView([startLat, startLng], props.zoom);
  L.tileLayer(tileUrl, { attribution }).addTo(map);

  // If initial coordinates exist, center map to marker location.
  if (props.lat != null && props.lng != null) {
    updateLatLng(props.lat, props.lng, true);
  }

  if (props.showMyLocation) {
    // If parent passed myLat/myLng they will be preferred inside getMyCoordinates().
    const coords = await getMyCoordinates();
    if (coords) {
      setMyMarker(L.latLng(coords.lat, coords.lng));
      // If both markers exist, show them together.
      fitToMarkers();
    }
  }

  if (!props.readonly) {
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      emit("update:lat", +lat.toFixed(6));
      emit("update:lng", +lng.toFixed(6));
      setMarker(e.latlng);
    });
  }

  // 🔥 FIX: when mounted in hidden container (e.g. v-show tab), tiles can render grey.
  // Invalidate once, and again whenever the container becomes visible/resizes.
  setTimeout(() => {
    invalidateMapSize(true);
  }, 300);

  if (typeof ResizeObserver !== "undefined" && wrapperEl.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (!rect) return;
      // Only invalidate when the container has real size (e.g. tab just became visible).
      if (rect.width > 0 && rect.height > 0) {
        invalidateMapSize(true);
      }
    });

    resizeObserver.observe(wrapperEl.value);
  }
});

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (lat != null && lng != null) {
      // If coords arrive after mount (API load), center map on first marker.
      const shouldSetView = marker == null;
      updateLatLng(lat, lng, shouldSetView);

      // If my marker is shown, keep both visible.
      if (props.showMyLocation && myMarker) {
        fitToMarkers();
      }
    }
  },
);

// Watch for parent-provided my-location coordinates and render myMarker accordingly.
watch(
  () => [props.myLat, props.myLng],
  ([mLat, mLng]) => {
    const latNum = normalize(mLat);
    const lngNum = normalize(mLng);
    if (latNum != null && lngNum != null && map) {
      setMyMarker(L.latLng(latNum, lngNum));
      // Ensure both markers are visible when both exist.
      fitToMarkers();
    } else if (map && myMarker) {
      // remove myMarker if coords cleared
      map.removeLayer(myMarker);
      myMarker = null;
    }
  },
);

watch(
  () => props.zoom,
  (z) => {
    if (!map) return;
    const nextZoom = Number(z);
    if (!Number.isFinite(nextZoom)) return;
    map.setZoom(nextZoom);
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect?.();
  resizeObserver = null;
  if (myMarker && map) {
    map.removeLayer(myMarker);
    myMarker = null;
  }
  map?.remove();
});
</script>

<template>
  <div class="h-full">
    <!-- MAP WRAPPER -->
    <div
      ref="wrapperEl"
      class="relative w-full h-full overflow-hidden border rounded-xl"
      :class="borderColorClass"
    >
      <!-- MAP -->
      <div ref="mapEl" class="absolute inset-0 z-0"></div>

      <!-- PLACEHOLDER OVERLAY -->
      <div
        v-if="lat == null || lng == null"
        class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        :class="
          variant === 'merchant'
            ? 'bg-linear-to-br from-green-200 to-green-400'
            : 'bg-gray-100'
        "
      >
        <div class="text-center">
          <svg
            class="w-12 h-12 mx-auto mb-2 text-red-600 md:w-16 md:h-16"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
          </svg>
          <p class="text-sm font-medium text-gray-700">Pilih lokasi di peta</p>
        </div>
      </div>
    </div>
  </div>
</template>
