<script setup>
import { ref, computed, watch } from "vue";
import ReportButton from "@/components/ReportButton.vue";

const imageError = ref(false);

const props = defineProps({
  product: {
    type: Object,
    required: true,
    default: () => ({
      id: 1,
      name: "Nama Produk",
      description: "Deskripsi produk singkat",
      min_price: 0,
      max_price: 0,
      cover_image: null,
      merchant: null,
      rating: 4.4,
      distance: 2,
    }),
  },
  customClass: {
    type: String,
    default: "max-w-xs",
  },
});

// Format harga ke Rupiah
const formatIDR = (v) =>
  Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });
// Format harga dengan range
const formattedPrice = computed(() => {
  const fixed = Number(props.product?.fixed_price || 0);
  const base = Number(props.product?.base_price || 0);

  if (fixed > 0) {
    return `Rp ${formatIDR(fixed)}`;
  }

  if (base > 0) {
    return `Mulai Rp ${formatIDR(base)}`;
  }

  // Fallback to generic min/max range (used by products and some jasa payloads).
  const minPrice = Number(props.product?.min_price || 0);
  const maxPrice = Number(props.product?.max_price || 0);

  if (!minPrice && !maxPrice) return "Rp 0";

  const minFormatted = formatIDR(minPrice);
  const maxFormatted = formatIDR(maxPrice);

  // Jika harga sama, tampilkan sekali saja
  if (minPrice === maxPrice) {
    return `Rp ${minFormatted}`;
  }

  // Jika berbeda, tampilkan range
  return `Rp ${minFormatted} - Rp ${maxFormatted}`;
});

// Get image URL
const productImageUrl = computed(() => {
  if (imageError.value) return null;

  if (props.product.cover_image) {
    return props.product.cover_image.src_url || props.product.cover_image;
  }
  return null;
});

const distanceKm = computed(() => {
  const raw =
    props.product?.distance_km ??
    props.product?.distanceKm ??
    props.product?.distance;
  const num = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(num) ? num : null;
});

const formattedDistanceKm = computed(() => {
  if (distanceKm.value == null) return null;
  // tampilkan 1 angka desimal agar stabil di UI
  return `${distanceKm.value.toFixed(1)} km`;
});

watch(
  () => props.product?.id,
  () => {
    imageError.value = false;
  }
);
</script>

<template>
  <div
    :class="`    group
    flex flex-col rounded-2xl
    border border-gray-200
    bg-white
    shadow-sm
    overflow-hidden
    transition-transform duration-300 ease-out
    hover:-translate-y-1 hover:shadow-md
    cursor-pointer
    min-w-[161px]
    ${customClass} `"
  >
    <!-- Product Image (1:1 aspect ratio) -->
    <!-- Image Container -->
      <div class="relative aspect-[1/1] overflow-hidden bg-gray-100">
        <img
          v-if="productImageUrl"
          :src="productImageUrl"
          :alt="product.name"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          @error="imageError = true"
        />
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300"
        >
          <i class="pi pi-image text-4xl"></i>
        </div>

        <!-- Event Tag -->
        <div v-if="product.event" class="absolute top-3 left-3 right-3 z-10">
          <div 
            @click.stop="$router.push({ name: 'Event Detail', params: { id: product.event.id } })"
            class="px-3 py-1.5 bg-primary/90 backdrop-blur-md text-white rounded-xl shadow-lg border border-white/20 flex items-center justify-between group/tag cursor-pointer hover:bg-primary transition-all"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <i class="pi pi-bolt text-[10px] animate-pulse"></i>
              <span class="text-[10px] font-black uppercase tracking-wider truncate">{{ product.event.name }}</span>
            </div>
            <div class="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px] font-black">
              {{ product.event.discount }}
            </div>
          </div>
        </div>

        <!-- Top Badges -->
      <div class="absolute top-2 right-2 z-10">
        <ReportButton
          reportable-type="product"
          :reportable-id="product.id"
          :reportable-name="product.name"
        />
      </div>
    </div>

    <!-- Product Info -->
    <div class="flex flex-col flex-1 px-3 py-3 bg-white sm:px-4 sm:py-3">
      <!-- Product Name -->
      <h3
        class="mb-1 text-xs font-semibold text-gray-900 line-clamp-2"
        :title="product.name"
      >
        {{ product.name }}
      </h3>

      <!-- Price -->
      <p class="mb-2 text-xs font-bold text-primary">
        {{ formattedPrice }}
      </p>

      <!-- Rating & Distance (auto push to bottom) -->
      <div
        v-if="product.merchant"
        class="mt-auto pt-2 text-[11px] text-gray-600"
      >
        <span
          v-if="product.merchant?.name"
          class="flex items-center gap-1 mb-1 truncate"
        >
          <i class="text-base pi pi-shop me-1 text-merchant-primary"></i>
          {{ product.merchant?.name ?? "Nama Toko" }}
        </span>
        <span v-if="formattedDistanceKm" class="flex items-center gap-1">
          <i class="text-base pi pi-map-marker me-1 text-danger-foreground"></i>
          {{ formattedDistanceKm }}
        </span>
      </div>
    </div>
  </div>
</template> 