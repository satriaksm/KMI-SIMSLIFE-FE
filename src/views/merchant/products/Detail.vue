<script setup>
// filepath: /var/www/html/KMI-SIMSLIFE-FE/src/views/merchant/products/Detail.vue

import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue"; // ✅ ADD
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useProducts } from "@/composables/useProducts";

const { fetchProductDetail } = useProducts();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();
const showFullDescription = ref(false);
const descriptionRef = ref(null);
const isClamped = ref(false);

const currentMerchantSlug = computed(() => {
  return route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug || null;
});

// ===== Swipe state (mobile) =====
const touchStartX = ref(0);
const touchEndX = ref(0);
const swipeThreshold = 50; // px
const handleTouchStart = (e) => {
  if (!e.touches || e.touches.length === 0) return;
  touchStartX.value = e.touches[0].clientX;
};

const handleTouchMove = (e) => {
  if (!e.touches || e.touches.length === 0) return;
  touchEndX.value = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  const deltaX = touchEndX.value - touchStartX.value;

  if (Math.abs(deltaX) < swipeThreshold) return;

  if (deltaX > 0) {
    // swipe kanan → image sebelumnya
    prevImage();
  } else {
    // swipe kiri → image berikutnya
    nextImage();
  }

  // reset
  touchStartX.value = 0;
  touchEndX.value = 0;
};

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "Produk",
    path: `/merchant-center/${currentMerchantSlug.value}/products`,
  },
  {
    label: "Detail Produk",
  },
]);

const loading = ref(false);
const product = ref(null);
const currentImageIndex = ref(0);
const showVariantsModal = ref(false);
const showAddOnsModal = ref(false);

// Lock body scroll when modal is open
useBodyScrollLock(showVariantsModal);
useBodyScrollLock(showAddOnsModal);
const MAX_DESCRIPTION_HEIGHT = 96; // kira-kira 4 baris (4 x line-height 24px)

const checkClamp = async () => {
  await nextTick();
  const el = descriptionRef.value;
  if (!el) return;

  isClamped.value = el.scrollHeight > MAX_DESCRIPTION_HEIGHT + 2;
};
const DESCRIPTION_LIMIT = 300;

const normalizedDescription = computed(() => {
  const raw = product.value?.description;
  if (raw == null) return "";
  return String(raw).trim();
});

const isLongDescription = computed(() => {
  return (normalizedDescription.value.length || 0) > DESCRIPTION_LIMIT;
});

const displayedDescription = computed(() => {
  const desc = normalizedDescription.value;
  if (!desc) return "";

  if (showFullDescription.value) return desc;

  if (desc.length <= DESCRIPTION_LIMIT) return desc;
  return desc.slice(0, DESCRIPTION_LIMIT) + "...";
});

const mainCategory = computed(() => {
  if (!product.value?.categories) return null;
  return product.value.categories[0];
});

const subCategories = computed(() => {
  if (!product.value?.categories) return [];
  return product.value.categories.slice(1);
});

const priceRange = computed(() => {
  if (!product.value?.variants || product.value.variants.length === 0) {
    return "Rp 0";
  }

  const prices = product.value.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return formatPrice(min);
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`;
});

const stockRange = computed(() => {
  if (!product.value?.variants || product.value.variants.length === 0) {
    return { min: 0, max: 0, total: 0, display: "0" };
  }

  const stocks = product.value.variants.map((v) => v.stock);
  const min = Math.min(...stocks);
  const max = Math.max(...stocks);
  const total = stocks.reduce((sum, stock) => sum + stock, 0);

  return {
    min,
    max,
    total,
    display: min === max ? `${min}` : `${min} - ${max}`,
  };
});

const totalAddOnGroups = computed(() => {
  return product.value?.addonGroups?.length || 0;
});

const totalAddOnOptions = computed(() => {
  if (!product.value?.addonGroups) return 0;
  return product.value.addonGroups.reduce(
    (total, group) => total + (group.options?.length || 0),
    0,
  );
});

const addOnPriceRange = computed(() => {
  if (!product.value?.addonGroups || product.value.addonGroups.length === 0) {
    return null;
  }

  const prices = product.value.addonGroups.flatMap((group) =>
    (group.options || []).map((opt) => opt.addon_price || 0),
  );
  const nonZeroPrices = prices.filter((p) => p > 0);

  if (nonZeroPrices.length === 0) return null;

  const min = Math.min(...nonZeroPrices);
  const max = Math.max(...nonZeroPrices);

  if (min === max) {
    return `+${formatPrice(min)}`;
  }

  return `+${formatPrice(min)} - ${formatPrice(max)}`;
});

// ✅ Group variants by option value (for variant options display)
const variantsByOptionValue = computed(() => {
  if (!product.value?.variants) return {};

  const grouped = {};

  product.value.variants.forEach((variant) => {
    if (!variant.option_values) return;

    variant.option_values.forEach((optionValue) => {
      const key = `${optionValue.product_option_id}_${optionValue.id}`;
      if (!grouped[key]) {
        grouped[key] = {
          optionId: optionValue.product_option_id,
          optionName: optionValue.option_name,
          value: optionValue.option_value,
          valueId: optionValue.id,
          variants: [],
          totalStock: 0,
        };
      }
      grouped[key].variants.push(variant);
      grouped[key].totalStock += variant.stock;
    });
  });

  return grouped;
});

// ✅ Transform options data untuk display
const transformedOptions = computed(() => {
  if (!product.value?.options) return [];

  return product.value.options.map((option) => ({
    id: option.id,
    option_name: option.option_name,
    uses_image: option.uses_image,
    values: (option.values || []).map((value) => {
      // 1) value.thumb_url dari API (thumbnail)
      // 2) fallback value.src_url (langsung pakai jika ada)
      // 3) fallback value.image_url (absolute dari backend)
      const imageSrc = value.thumb_url || value.src_url || null;

      return {
        id: value.id,
        value: value.option_value,
        image: imageSrc,
        image_path: value.image_path ?? null,
        image_url: value.image_url ?? null,
      };
    }),
  }));
});

// ✅ Methods
const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "jt";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "rb";
  }
  return num.toString();
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const nextImage = () => {
  if (!product.value?.images) return;
  currentImageIndex.value =
    (currentImageIndex.value + 1) % product.value.images.length;
};

const prevImage = () => {
  if (!product.value?.images) return;
  currentImageIndex.value =
    currentImageIndex.value === 0
      ? product.value.images.length - 1
      : currentImageIndex.value - 1;
};

const selectImage = (index) => {
  currentImageIndex.value = index;
};

const openVariantsModal = () => {
  showVariantsModal.value = true;
};

const closeVariantsModal = () => {
  showVariantsModal.value = false;
};

const openAddOnsModal = () => {
  showAddOnsModal.value = true;
};

const closeAddOnsModal = () => {
  showAddOnsModal.value = false;
};

const goBack = () => {
  router.back();
};

const editProduct = () => {
  router.push(
    `/merchant-center/${currentMerchantSlug.value}/products/${route.params.slug}/edit`,
  );
};

const getSelectionTypeLabel = (group) => {
  if (group.min_selection === group.max_selection) {
    if (group.min_selection === 0) {
      return "Opsional";
    }
    return `Pilih ${group.min_selection}`;
  }
  return `${group.min_selection}-${group.max_selection} pilihan`;
};

const getVariantName = (variant) => {
  if (!variant.option_values || variant.option_values.length === 0) {
    return "Varian Default";
  }
  return variant.option_values.map((ov) => ov.option_value).join(" - ");
};

const loadDetail = async () => {
  loading.value = true;
  product.value = null;
  try {
    const slug = route.params.slug; // ✅ gunakan slug

    if (!currentMerchantSlug.value) {
      throw new Error("merchantSlug tidak ditemukan");
    }

    const data = await fetchProductDetail(currentMerchantSlug.value, slug);
    product.value = data;

    // reset index jika ada images
    if (product.value?.images && product.value.images.length > 0) {
      currentImageIndex.value = 0;
    }
    await checkClamp();
  } catch (err) {
    toast.error("Gagal memuat detail produk");
    const status = err?.response?.status;
    if (status === 404) {
      toast.error("Produk tidak ditemukan");
      router.push(`/merchant-center/${currentMerchantSlug.value}/products`);
    } else if (status === 403) {
      toast.error("Anda tidak memiliki akses ke produk ini");
      router.push(`/merchant-center/${currentMerchantSlug.value}/products`);
    } else {
      toast.error(err?.response?.data?.message || "Gagal memuat detail produk");
    }
  } finally {
    loading.value = false;
  }
};
watch(showFullDescription, async (val) => {
  // hanya cek saat kembali ke mode ringkas
  if (!val) {
    await checkClamp();
  }
});

// ✅ Mount
onMounted(() => {
  loadDetail();
  nextTick(() => {
    const el = descriptionRef.value;
    if (el) {
      isClamped.value = el.scrollHeight > el.clientHeight;
    }
  });
});
</script>

<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader title="Detail Produk" />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-30 hidden py-6 bg-gray-50 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-6 gap-y-2 gap-x-4"
      >
        <div>
          <!-- ✅ Use Breadcrumb Component -->
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="text-xs text-muted-foreground lg:text-sm">
            {{ product?.name || "Loading..." }}
          </p>
        </div>

        <div v-if="product" class="flex items-center gap-3">
          <Button @click="editProduct" variant="merchant" size="md">
            <i class="pi pi-pencil"></i>
            <span>Edit Produk</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile -->
    <div class="h-[72px] sm:h-0"></div>

    <!-- ✅ Loading State -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center gap-3 py-20"
    >
      <div
        class="w-12 h-12 border-4 border-gray-300 rounded-full border-t-merchant-primary animate-spin"
      ></div>
      <p class="text-sm text-muted-foreground">Memuat detail produk...</p>
    </div>

    <!-- ✅ Error State (product not loaded) -->
    <div
      v-else-if="!product"
      class="flex flex-col items-center justify-center py-20"
    >
      <i
        class="mb-4 text-5xl pi pi-exclamation-triangle text-danger-foreground"
      ></i>
      <p class="mb-2 text-lg font-semibold text-black">
        Produk Tidak Ditemukan
      </p>
      <Button @click="goBack" variant="muted-outline">
        <i class="mr-2 pi pi-arrow-left"></i>
        Kembali
      </Button>
    </div>

    <!-- ✅ Content - RESPONSIVE GRID -->
    <div v-else class="px-0 pb-6 mx-auto sm:px-4 lg:px-6">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Left Column (Images + Basic Info) -->
        <div class="space-y-2 lg:col-span-1 sm:space-y-4">
          <!-- Image Gallery Card -->
          <div v-if="product.images && product.images.length > 0">
            <!-- Main Image -->
            <div
              class="relative max-w-2xl mx-auto mb-4 -mt-4 overflow-hidden bg-gray-100 shadow-sm aspect-square sm:mt-0 sm:rounded-2xl"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            >
              <img
                v-if="product.images[currentImageIndex]?.src_url"
                :src="product.images[currentImageIndex].src_url"
                :alt="product.name"
                class="object-cover w-full h-full"
                @error="(e) => (e.target.style.display = 'none')"
              />
              <!-- Navigation Arrows -->
              <button
                v-if="product.images.length > 1"
                @click="prevImage"
                class="absolute items-center justify-center hidden w-10 h-10 text-gray-800 transition -translate-y-1/2 rounded-full shadow-lg left-3 top-1/2 bg-white/90 hover:bg-white backdrop-blur-sm active:scale-95 sm:flex"
              >
                <i class="text-sm font-bold pi pi-chevron-left"></i>
              </button>
              <button
                v-if="product.images.length > 1"
                @click="nextImage"
                class="absolute items-center justify-center hidden w-10 h-10 text-gray-800 transition -translate-y-1/2 rounded-full shadow-lg right-3 top-1/2 bg-white/90 hover:bg-white backdrop-blur-sm active:scale-95 sm:flex"
              >
                <i class="text-sm font-bold pi pi-chevron-right"></i>
              </button>
            </div>

            <!-- Thumbnails -->
            <div class="grid grid-cols-4 gap-2 px-4 sm:grid-cols-6">
              <button
                v-for="(image, index) in product.images"
                :key="image.id"
                @click="selectImage(index)"
                :class="{
                  'border-merchant-primary ring-2 ring-merchant-primary/20 scale-105':
                    currentImageIndex === index,
                  'border-gray-200 hover:border-merchant-primary/50 hover:scale-105':
                    currentImageIndex !== index,
                }"
                class="relative overflow-hidden transition border rounded-lg aspect-square"
              >
                <img
                  v-if="image.src_url"
                  :src="image.src_url"
                  :alt="`${product.name} ${index + 1}`"
                  class="object-cover w-full h-full"
                  @error="(e) => (e.target.style.display = 'none')"
                />
              </button>
            </div>
          </div>

          <!-- No Images State -->
          <div v-else>
            <p class="text-center text-gray-500">
              Tidak ada gambar untuk produk ini.
            </p>
          </div>
        </div>

        <!-- Right Column (Details) -->
        <div class="space-y-2 lg:col-span-1 sm:space-y-4">
          <!-- Product Name Card -->
          <div class="p-4 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <h2 class="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
              {{ product.name }}
            </h2>
            <p class="font-mono text-sm text-gray-500">
              SKU: {{ product.variants?.[0]?.sku || "-" }}
            </p>
          </div>

          <!-- Description Card - Desktop Only -->
          <div
            v-if="product.description"
            class="p-4 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm"
          >
            <h3
              class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900"
            >
              <i class="text-gray-400 pi pi-align-left"></i>
              Deskripsi Produk
            </h3>

            <p
              class="text-sm leading-relaxed text-gray-700 whitespace-pre-line"
            >
              {{ displayedDescription }}
            </p>

            <button
              v-if="isLongDescription"
              @click="showFullDescription = !showFullDescription"
              class="mt-2 text-sm font-semibold cursor-pointer text-merchant-primary hover:underline"
              type="button"
            >
              {{ showFullDescription ? "Sembunyikan" : "Lihat Selengkapnya" }}
            </button>
          </div>

          <!-- Status & Category Card -->
          <div class="p-4 space-y-3 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <!-- Status -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Status</span>
              <StatusLabel
                :status="product.status"
                variant="product"
                size="md"
              />
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100"></div>

            <!-- Main Category -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Kategori</span>
              <span class="text-sm font-medium text-gray-900">
                {{ mainCategory?.name || "-" }}
              </span>
            </div>

            <!-- Sub Categories -->
            <div v-if="subCategories.length > 0">
              <div class="mb-3 border-t border-gray-100"></div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-sm text-gray-600 shrink-0">Sub Kategori</span>
                <div class="flex flex-wrap gap-1.5 justify-end">
                  <span
                    v-for="cat in subCategories"
                    :key="cat.id"
                    class="inline-block px-2.5 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-xs font-medium"
                  >
                    {{ cat.name }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Min Purchase -->
            <div v-if="product.min_purchase">
              <div class="mb-3 border-t border-gray-100"></div>
              <div class="flex items-start justify-between gap-3 mt-3">
                <span class="text-sm text-gray-600 shrink-0"
                  >Minimal Pembelian</span
                >
                <span class="text-sm font-medium text-gray-900">
                  {{ product.min_purchase }} unit
                </span>
              </div>
            </div>
          </div>

          <!-- Variants, Price & Stock Card -->
          <button
            v-if="product.variants && product.variants.length > 0"
            @click="openVariantsModal"
            class="flex items-center justify-between w-full p-4 transition bg-white sm:p-6 hover:bg-gray-50 active:bg-gray-100 sm:rounded-xl sm:shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-merchant-primary/10"
              >
                <i class="pi pi-box text-merchant-primary"></i>
              </div>
              <div class="text-left">
                <p class="text-sm font-semibold text-gray-900">
                  Variasi, Harga & Stok
                </p>
                <p class="text-xs text-gray-500">
                  {{ priceRange }} | {{ product.variants.length }} varian |
                  {{ formatNumber(stockRange.total) }} stok
                </p>
              </div>
            </div>
            <i class="text-gray-400 pi pi-chevron-right"></i>
          </button>

          <!-- Add-ons Card -->
          <button
            v-if="totalAddOnGroups > 0"
            @click="openAddOnsModal"
            class="flex items-center justify-between w-full p-4 transition bg-white sm:p-6 hover:bg-gray-50 active:bg-gray-100 sm:rounded-xl sm:shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-merchant-primary/10"
              >
                <i class="pi pi-plus-circle text-merchant-primary"></i>
              </div>
              <div class="text-left">
                <p class="text-sm font-semibold text-gray-900">Grup Add-on</p>
                <p class="text-xs text-gray-500">
                  {{ totalAddOnGroups }} grup | {{ totalAddOnOptions }} opsi
                  <span v-if="addOnPriceRange"> | {{ addOnPriceRange }}</span>
                </p>
              </div>
            </div>
            <i class="text-gray-400 pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ Variants Modal -->
    <ResponsiveModal
      v-model:show="showVariantsModal"
      title="Variasi, Harga & Stok"
      show-footer
      footer-class="inline sm:hidden"
      @close="closeVariantsModal"
    >
      <div v-if="product">
        <!-- Summary Card -->
        <div
          class="p-4 mb-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
        >
          <div class="mb-3">
            <p class="mb-1 text-xs text-muted-foreground">Rentang Harga</p>
            <p class="text-base font-semibold truncate text-merchant-primary">
              {{ priceRange }}
            </p>
          </div>

          <div
            class="grid grid-cols-2 gap-4 pt-3 border-t border-merchant-primary/20"
          >
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Varian</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ product.variants.length }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Stok</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ formatNumber(stockRange.total) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Variant Options Section -->
        <div v-if="transformedOptions.length > 0" class="mb-6 space-y-4">
          <h3 class="text-sm font-semibold text-black">Opsi Variasi</h3>

          <div
            v-for="option in transformedOptions"
            :key="option.id"
            class="space-y-3"
          >
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-700">
                {{ option.option_name }}
              </h4>
              <span class="text-xs text-muted-foreground">
                {{ option.values.length }} pilihan
              </span>
            </div>

            <!-- Option Values Grid -->
            <div
              class="grid gap-2"
              :class="
                option.uses_image
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
              "
            >
              <div
                v-for="optionValue in option.values"
                :key="optionValue.id"
                class="p-3 transition bg-white border border-muted-background rounded-xl hover:border-merchant-primary/50 group"
              >
                <!-- With Image -->
                <div
                  v-if="option.uses_image && optionValue.image"
                  class="flex flex-col items-center gap-2"
                >
                  <div
                    class="w-full overflow-hidden transition bg-gray-100 rounded-lg aspect-square group-hover:ring-2 group-hover:ring-merchant-primary/30"
                  >
                    <img
                      v-if="optionValue.image"
                      :src="optionValue.image"
                      :alt="optionValue.value"
                      class="object-cover w-full h-full"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                  </div>
                  <div class="w-full text-center">
                    <p class="text-xs font-medium text-black truncate">
                      {{ optionValue.value }}
                    </p>
                    <p
                      v-if="
                        variantsByOptionValue[`${option.id}_${optionValue.id}`]
                      "
                      class="text-[10px] text-muted-foreground mt-0.5"
                    >
                      {{
                        formatNumber(
                          variantsByOptionValue[
                            `${option.id}_${optionValue.id}`
                          ].totalStock,
                        )
                      }}
                      unit
                    </p>
                  </div>
                </div>

                <!-- Without Image -->
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-2"
                >
                  <p class="text-sm font-medium text-center text-black">
                    {{ optionValue.value }}
                  </p>
                  <p
                    v-if="
                      variantsByOptionValue[`${option.id}_${optionValue.id}`]
                    "
                    class="text-[10px] text-muted-foreground mt-1"
                  >
                    {{
                      formatNumber(
                        variantsByOptionValue[`${option.id}_${optionValue.id}`]
                          .totalStock,
                      )
                    }}
                    unit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="my-6 border-t border-gray-200"></div>

        <!-- Variant List -->
        <div class="space-y-3">
          <h3
            class="sticky py-2 -mt-2 text-sm font-semibold text-black bg-white -top-4 z-5"
          >
            Daftar Kombinasi Varian
          </h3>

          <div
            v-for="variant in product.variants"
            :key="variant.id"
            class="overflow-hidden transition bg-white border border-muted-background rounded-xl hover:border-merchant-primary/50"
          >
            <div class="flex items-center gap-3 p-4">
              <!-- Variant Info -->
              <div class="flex-1 min-w-0">
                <!-- Header -->
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="flex-1 min-w-0">
                    <h4 class="mb-1 text-sm font-semibold text-black truncate">
                      {{ getVariantName(variant) }}
                    </h4>
                    <p class="font-mono text-xs truncate text-muted-foreground">
                      {{ variant.sku || "-" }}
                    </p>
                  </div>
                  <StatusLabel
                    :status="variant.stock > 0 ? 'published' : 'out_of_stock'"
                    variant="product"
                    size="xs"
                    :label="variant.stock > 0 ? 'Tersedia' : 'Habis'"
                  />
                </div>

                <!-- Details Grid -->
                <div class="grid grid-cols-2 gap-2 mb-3">
                  <div class="p-2 rounded-lg bg-muted-background">
                    <p class="text-xs text-muted-foreground mb-0.5">Harga</p>
                    <p class="text-sm font-bold truncate text-merchant-primary">
                      {{ formatPrice(variant.price) }}
                    </p>
                  </div>

                  <div class="p-2 rounded-lg bg-muted-background">
                    <p class="text-xs text-muted-foreground mb-0.5">Stok</p>
                    <p
                      :class="
                        variant.stock > 0
                          ? 'text-success-foreground'
                          : 'text-danger-foreground'
                      "
                      class="text-sm font-bold truncate"
                    >
                      {{ formatNumber(variant.stock) }} unit
                    </p>
                  </div>
                </div>

                <!-- Option Values -->
                <div
                  v-if="
                    variant.option_values && variant.option_values.length > 0
                  "
                  class="flex flex-wrap gap-1.5"
                >
                  <span
                    v-for="optionValue in variant.option_values"
                    :key="optionValue.id"
                    class="inline-flex items-center gap-1 px-2 py-0.5 bg-muted-background rounded-md text-xs"
                  >
                    <span class="font-medium text-black">{{
                      optionValue.option_value
                    }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <Button @click="closeVariantsModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- ✅ Add-ons Modal -->
    <ResponsiveModal
      v-model:show="showAddOnsModal"
      title="Grup Add-on"
      show-footer
      footer-class="inline sm:hidden"
      @close="closeAddOnsModal"
    >
      <div v-if="product && product.addonGroups">
        <!-- Summary Card -->
        <div
          class="p-4 mb-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
        >
          <div class="mb-3">
            <p class="mb-1 text-xs text-muted-foreground">
              Rentang Harga Add-on
            </p>
            <p class="text-base font-semibold truncate text-merchant-primary">
              {{ addOnPriceRange || "Semua Gratis" }}
            </p>
          </div>

          <div
            class="grid grid-cols-2 gap-4 pt-3 border-t border-merchant-primary/20"
          >
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Grup</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ totalAddOnGroups }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Opsi</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ totalAddOnOptions }}
              </p>
            </div>
          </div>
        </div>

        <!-- Add-on Groups List -->
        <div class="space-y-4">
          <div
            v-for="(group, gIndex) in product.addonGroups"
            :key="group.id"
            class="overflow-hidden bg-white border border-muted-background rounded-xl"
          >
            <!-- Group Header -->
            <div
              class="p-4 border-b bg-merchant-primary/5 border-merchant-primary/20"
            >
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1">
                  <h3 class="mb-2 text-sm font-bold text-black">
                    {{ gIndex + 1 }}. {{ group.addon_group_name }}
                  </h3>
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Required Badge -->
                    <StatusLabel
                      v-if="group.min_selection > 0"
                      status="merchant"
                      variant="general"
                      label="Wajib"
                      size="xs"
                      :show-icon="false"
                    />

                    <!-- Selection Type -->
                    <StatusLabel
                      status="warning"
                      variant="general"
                      :label="getSelectionTypeLabel(group)"
                      size="xs"
                      :show-icon="false"
                    />

                    <!-- Options Count -->
                    <StatusLabel
                      status="muted"
                      variant="general"
                      :label="`${group.options?.length || 0} opsi`"
                      size="xs"
                      :show-icon="false"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Options List -->
            <div class="p-4 space-y-2">
              <div
                v-for="(option, oIndex) in group.options"
                :key="option.id"
                class="flex items-center justify-between px-4 py-3 transition rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div class="flex items-center flex-1 min-w-0 gap-3">
                  <!-- Number Badge -->
                  <StatusLabel
                    status="processing"
                    variant="custom"
                    :label="`${oIndex + 1}`"
                    custom-class="text-white bg-merchant-primary"
                    size="xs"
                    :show-icon="false"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-black truncate">
                      {{ option.addon?.addon_name || option.addon_name || "-" }}
                    </p>
                  </div>
                </div>
                <div class="shrink-0">
                  <!-- Price Badge -->
                  <StatusLabel
                    v-if="option.addon_price > 0"
                    status="primary"
                    variant="general"
                    :label="`+${formatPrice(option.addon_price)}`"
                    size="sm"
                    :show-icon="false"
                  />
                  <StatusLabel
                    v-else
                    status="success"
                    variant="general"
                    label="Gratis"
                    size="sm"
                    :show-icon="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <Button @click="closeAddOnsModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
/* Custom scrollbar for modal */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth transitions */
img {
  transition: transform 0.3s ease;
}

button:active img {
  transform: scale(0.98);
}
</style>
