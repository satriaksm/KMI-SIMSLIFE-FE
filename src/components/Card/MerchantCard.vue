<template>
  <!-- Wrapper: relative positioning untuk menempatkan report button di luar router-link -->
  <div class="relative block overflow-hidden transition-shadow duration-300 bg-white border border-gray-200 rounded-xl hover:shadow-lg sm:max-w-xs">
    <!-- Router-link covers the whole card EXCEPT the report button area -->
    <router-link
      :to="{
        name: 'Merchant Detail',
        params: { slug: merchant.slug || merchant.id },
      }"
      class="block"
    >
      <!-- Logo/Image -->
      <div class="relative bg-muted-background aspect-square">
        <img
          v-if="merchant.logo_url"
          :src="merchant.logo_url"
          :alt="merchant.name"
          class="object-cover w-full h-full"
        />
        <div
          v-else
          class="flex items-center justify-center w-full h-full text-merchant-primary"
        >
          <i class="text-4xl pi pi-shop text-merchant-primary"></i>
        </div>

        <!-- Badge Segmentation -->
        <div
          v-if="merchant.segmentation"
          class="absolute px-2 py-1 text-xs font-medium rounded-full text-merchant-primary top-2 left-2 bg-white/90 backdrop-blur-sm"
        >
          {{ merchant.segmentation.name }}
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 sm:p-4 sm:py-3">
        <!-- Name -->
        <h3
          class="mb-1 text-sm font-bold text-black line-clamp-1"
          :title="merchant.name"
        >
          {{ merchant.name }}
        </h3>

        <!-- Products/Jasa Count - Dynamic label based on merchant type -->
        <div class="flex items-center gap-1 mb-1 text-[11px] text-gray-500 mt-2">
          <i class="text-base me-1 pi pi-shopping-bag text-primary"></i>
          <span class="line-clamp-1">
            {{ displayCount }} {{ displayLabel }}
          </span>
        </div>

        <!-- Location -->
        <div
          v-if="formattedDistanceKm"
          class="flex items-center gap-1 mb-1 text-[11px] text-gray-500"
        >
          <i class="text-base pi pi-map-marker me-1 text-danger-foreground"></i>
          <div>
            <span v-if="formattedDistanceKm">
              {{ formattedDistanceKm }}
            </span>
          </div>
        </div>

        <div
          v-if="merchant.primary_address"
          class="flex items-center gap-1 mb-1 text-[11px] text-gray-500"
        >
          <span
            class="line-clamp-1"
            :title="`${merchant.primary_address?.detail}, ${merchant.primary_address.village?.name}, ${merchant.primary_address.district?.name}, ${merchant.primary_address.city?.name}, ${merchant.primary_address.province?.name}`"
          >
            {{ merchant.primary_address?.detail }}
            {{ merchant.primary_address.village?.name }}
            {{ merchant.primary_address.district?.name }}
            {{ merchant.primary_address.city?.name }}
            {{ merchant.primary_address.province?.name }}
          </span>
        </div>
      </div>
    </router-link>

    <!-- Report Button: diletakkan di LUAR router-link agar tidak terkena navigasi -->
    <div class="absolute top-2 right-2 z-20" @click.stop.prevent>
      <ReportButton
        reportable-type="merchant"
        :reportable-id="merchant.id"
        :reportable-name="merchant.name"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import ReportButton from "@/components/ReportButton.vue";

const props = defineProps({
  merchant: {
    type: Object,
    required: true,
  },
});

const distanceKm = computed(() => {
  const raw =
    props.merchant?.distance_km ??
    props.merchant?.distanceKm ??
    props.merchant?.distance;
  const num = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(num) ? num : null;
});

const formattedDistanceKm = computed(() => {
  if (distanceKm.value == null) return null;
  return `${distanceKm.value.toFixed(1)} km`;
});

const primaryAddressString = computed(() => {
  const addr = props.merchant?.primary_address;
  if (!addr) return "";

  const parts = [];
  const detail = addr.detail ? String(addr.detail).trim() : "";
  if (detail) parts.push(detail);
  if (addr.village?.name) parts.push(String(addr.village.name));
  if (addr.district?.name) parts.push(String(addr.district.name));
  if (addr.city?.name) parts.push(String(addr.city.name));
  if (addr.province?.name) parts.push(String(addr.province.name));

  return parts.join(", ");
});

const merchantLogoUrl = computed(() => {
  const merchant = props.merchant;

  if (!merchant) return "";

  if (merchant.logo_url) {
    return merchant.logo_url;
  }

  if (merchant.id && merchant.logo_path) {
    return getMerchantLogoUrl(merchant);
  }

  if (merchant.logo_path) {
    return getImageUrl(merchant.logo_path);
  }

  return "";
});

// Tentukan apakah merchant ini tipe Jasa berdasarkan segmentation atau category
const isMerchantJasa = computed(() => {
  // Cek dari segmentation name
  const segmentName = String(props.merchant?.segmentation?.name || "").toLowerCase();
  // Cek dari category name
  const categoryName = String(props.merchant?.category?.name || props.merchant?.category_name || "").toLowerCase();
  // Cek dari business_type
  const businessType = String(props.merchant?.business_type || props.merchant?.type || "").toLowerCase();

  const hasJasaKeyword = segmentName.includes("jasa") || categoryName.includes("jasa") || businessType.includes("jasa");

  const jasasCount = Number(
    props.merchant?.jasas_count ??
      props.merchant?.services_count ??
      props.merchant?.jasa_count ??
      props.merchant?.total_services ??
      props.merchant?.service_count ??
      0,
  );
  const productsCount = Number(
    props.merchant?.products_count ??
      props.merchant?.total_products ??
      props.merchant?.product_count ??
      0,
  );

  // UMKM Jasa jika: ada keyword jasa ATAU hanya punya jasas_count
  return hasJasaKeyword || (jasasCount > 0 && productsCount === 0);
});

// Tampilkan counter yang sesuai
const displayCount = computed(() => {
  const productsCount = Number(
    props.merchant?.products_count ??
      props.merchant?.total_products ??
      props.merchant?.product_count ??
      0,
  );
  const jasasCount = Number(
    props.merchant?.jasas_count ??
      props.merchant?.services_count ??
      props.merchant?.jasa_count ??
      props.merchant?.total_services ??
      props.merchant?.service_count ??
      (isMerchantJasa.value ? productsCount : 0),
  );

  if (isMerchantJasa.value) {
    return jasasCount;
  }
  return productsCount;
});

// Tampilkan label yang sesuai
const displayLabel = computed(() => {
  return isMerchantJasa.value ? "Layanan Jasa" : "Produk";
});
</script>
