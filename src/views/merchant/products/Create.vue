<script setup>
// filepath: /var/www/html/KMI-SIMSLIFE-FE/src/views/merchant/products/Create.vue
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth"; // ✅ ADD: Import auth store
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import { Form, Field, useForm } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useProducts } from "@/composables/useProducts";
import { useCategories } from "@/composables/useCategories";
import { useProductImages } from "@/composables/product/forms/useProductImages";
import { useProductVariants } from "@/composables/product/forms/useProductVariants";
import { useProductCombinations } from "@/composables/product/forms/useProductCombinations";
import { useProductAddons } from "@/composables/product/forms/useProductAddons";

const isDev = import.meta.env.DEV;
const toast = useToast();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore(); // ✅ ADD: Get auth store
const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const name = ref("");
const description = ref("");

// Categories
const selectedCategory = ref(null);
const selectedSubCategories = ref([]);

// Variants
const maxVariants = 2;
const maxOptions = 50;

// Add-on Groups
const maxAddOnGroups = 10;
const maxAddOnOptions = 10;

// ✅ ADD: Deklarasi reactive values untuk form binding
const formPrice = ref(0);
const formStock = ref(0);
const formMinPurchase = ref(1);
const formSKU = ref("");

const { createProduct } = useProducts();

const {
  productImages,
  coverImageIndex,
  fileInput,
  triggerFileInput,
  handleImageUpload,
  removeImage,
  onDragStart,
  onDrop,
  onDragEnd,
  onDragOver,
} = useProductImages({
  maxImages: MAX_IMAGES,
  maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
  toast,
});

const {
  useVariants,
  variants,
  variantNames,
  variantUsesImages,
  canAddVariant,
  addVariant,
  removeVariant,
  addOption,
  removeOption,
  toggleVariantImages,
  toggleVariantExpand,
  isVariantExpanded,
  canAddVariantOption,
  handleOptionImageUpload,
  removeOptionImage,
} = useProductVariants({
  maxVariants,
  maxOptions,
  toast,
});

const {
  combinations,
  selectedCombinations,
  showCombinationsModal,
  bulkPrice,
  bulkStock,
  totalCombinations,
  toggleCombinationSelection,
  applyBulkEdit,
  openCombinationsModal,
  closeCombinationsModal,
  toggleAllCombinations,
} = useProductCombinations({
  variants,
  useVariants,
  maxOptions,
  toast,
});

const {
  addOnGroups,
  expandedAddOnGroups,
  addAddOnGroup,
  removeAddOnGroup,
  addAddOnOption,
  removeAddOnOption,
  toggleAddOnGroupExpand,
  isAddOnGroupExpanded,
} = useProductAddons({
  toast,
  maxGroups: maxAddOnGroups,
  maxOptions: maxAddOnOptions,
});

// ✅ FIXED: Get merchantId from route params
const currentMerchantSlug = computed(() => {
  return route?.params?.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug || null;
});

const currentMerchantId = computed(() => {
  const merchant = currentMerchantSlug.value
    ? authStore.getMerchantBySlug(currentMerchantSlug.value)
    : authStore.activeMerchant;

  return merchant?.id ?? null;
});

// ✅ ADD: Validate merchant ownership
const isValidMerchant = computed(() => {
  if (!currentMerchantSlug.value) return false;
  return !!authStore.getMerchantBySlug(currentMerchantSlug.value);
});

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "Produk",
    path: `/merchant-center/${currentMerchantSlug.value}/products`,
  },
  {
    label: "Tambah Produk",
  },
]);

// ✅ Use categories composable
const {
  categoriesLevel1,
  categoriesLevel2,
  loadingLevel1,
  loadingLevel2,
  fetchLevel1Categories,
  fetchSubCategories,
} = useCategories();

// ============================================================
// STATE MANAGEMENT
// ============================================================
const loading = ref(false);

// ✅ REMOVED: Hardcoded merchantId
// const merchantId = ref(1); // ❌ DELETE THIS

// Combinations
useBodyScrollLock(showCombinationsModal);

// ============================================================
// VALIDATION SCHEMA
// ============================================================
const schema = yup.object({
  name: yup.string().required("Nama produk wajib diisi"),
  description: yup.string().required("Deskripsi wajib diisi"),
  category_id: yup.number().required("Kategori utama wajib dipilih"),
  sku: yup
    .string()
    .max(100, "SKU maksimal 100 karakter")
    .when([], {
      is: () => !useVariants.value,
      then: (schema) => schema.nullable(),
    }),
  price: yup
    .number()
    .min(0, "Harga minimal 0")
    .when([], {
      is: () => !useVariants.value,
      then: (schema) => schema.required("Harga wajib diisi"),
    }),
  stock: yup
    .number()
    .integer("Stok harus bilangan bulat")
    .min(0, "Stok tidak boleh negatif")
    .max(9999, "Stok maksimal 9999")
    .when([], {
      is: () => !useVariants.value,
      then: (schema) => schema.required("Stok wajib diisi"),
    }),
  min_purchase: yup
    .number()
    .integer("Minimal pembelian harus bilangan bulat")
    .min(1, "Minimal pembelian minimal 1")
    .required("Minimal pembelian wajib diisi"),
});

// ============================================================
// VEE-VALIDATE SETUP
// ============================================================
const {
  handleSubmit: veeHandleSubmit,
  errors,
  values,
  setFieldValue,
  validate,
} = useForm({
  validationSchema: schema,
  initialValues: {
    name: "",
    description: "",
    category_id: null,
    min_purchase: 1,
    sku: "",
    price: 0,
    stock: 0,
  },
});

// ============================================================
// LIFECYCLE HOOKS
// ============================================================
onMounted(async () => {
  // ✅ ADD: Validate merchantId on mount
  if (!currentMerchantId.value) {
    toast.error("Merchant ID tidak valid");
    const fallbackSlug =
      currentMerchantSlug.value ??
      authStore.merchantSlug ??
      authStore.activeMerchant?.slug;
    router.push(
      fallbackSlug ? `/merchant-center/${fallbackSlug}` : "/merchant-register",
    );
    return;
  }

  // ✅ ADD: Validate merchant ownership
  if (!isValidMerchant.value) {
    toast.error("Anda tidak memiliki akses ke merchant ini");
    const fallbackSlug =
      currentMerchantSlug.value ??
      authStore.merchantSlug ??
      authStore.activeMerchant?.slug;
    router.push(
      fallbackSlug ? `/merchant-center/${fallbackSlug}` : "/merchant-register",
    );
    return;
  }

  await fetchLevel1Categories();
});

// ============================================================
// WATCHERS
// ============================================================
watch(useVariants, (enabled) => {
  if (!enabled) {
    // 🔥 RESET SEMUA STATE VARIANTS
    variants.value = [];
    combinations.value = [];
    selectedCombinations.value.clear();
    variantNames.value = {};
    variantUsesImages.value = {};
  }
});

// ✅ Sync selectedCategory dengan form
watch(name, (newName) => {
  setFieldValue("name", newName);
});
watch(description, (newDesc) => {
  setFieldValue("description", newDesc);
});

watch(selectedCategory, async (newCat) => {
  setFieldValue("category_id", newCat);

  if (newCat) {
    await fetchSubCategories(newCat);
  } else {
    categoriesLevel2.value = [];
  }
  selectedSubCategories.value = [];
});

watch(
  () => values.sku,
  (newVal) => {
    formSKU.value = newVal || "";
  },
);
// ✅ Sync form values dengan reactive variables (untuk v-model)
watch(
  () => values.price,
  (newVal) => {
    formPrice.value = newVal || 0;
  },
);

watch(
  () => values.stock,
  (newVal) => {
    formStock.value = newVal || 0;
  },
);

watch(
  () => values.min_purchase,
  (newVal) => {
    formMinPurchase.value = newVal || 1;
  },
);

watch(formSKU, (newVal) => {
  setFieldValue("sku", newVal);
});
// ✅ Sync reactive variables kembali ke form (two-way binding)
watch(formPrice, (newVal) => {
  setFieldValue("price", newVal);
});

watch(formStock, (newVal) => {
  setFieldValue("stock", newVal);
});

watch(formMinPurchase, (newVal) => {
  setFieldValue("min_purchase", newVal);
});

// ============================================================
// COMPUTED PROPERTIES
// ============================================================
const canAddSubCategory = computed(
  () => selectedSubCategories.value.length < 4,
);
const canAddAddOnGroup = computed(
  () => addOnGroups.value.length < maxAddOnGroups,
);

const combinationsExceedLimit = computed(
  () => totalCombinations.value > maxOptions,
);

const allCombinationsSelected = computed(() => {
  return (
    combinations.value.length > 0 &&
    selectedCombinations.value.size === combinations.value.length
  );
});

// ============================================================
// SUBMIT HANDLER
// ============================================================
const onSubmit = veeHandleSubmit(
  async (values) => {
    const oversizedImage = productImages.value.find(
      (img) => img.file.size > MAX_IMAGE_SIZE_BYTES,
    );

    if (oversizedImage) {
      toast.error(
        `Ukuran gambar tidak boleh lebih dari ${MAX_IMAGE_SIZE_MB} MB`,
      );
      return;
    }

    if (productImages.value.length > MAX_IMAGES) {
      toast.error("Maksimal upload 6 foto produk");
      return;
    }
    // ✅ ADD: Validate merchantId before submission
    if (!currentMerchantId.value) {
      toast.error("Merchant ID tidak ditemukan");
      return;
    }

    // ✅ ADD: Validate merchant ownership before submission
    if (!isValidMerchant.value) {
      toast.error("Anda tidak memiliki akses ke merchant ini");
      return;
    }

    if (!useVariants.value && values.stock > 9999) {
      toast.error("Stok maksimal 9999");
      return;
    }

    // Kombinasi
    if (useVariants.value && totalCombinations.value > maxOptions) {
      toast.error(`Kombinasi maksimal ${maxOptions}`);
      return;
    }

    // Add-on groups
    if (addOnGroups.value.length > maxAddOnGroups) {
      toast.error(`Maksimal ${maxAddOnGroups} grup add-on`);
      return;
    }

    // Add-on options
    const invalidAddonOption = addOnGroups.value.some(
      (g) => g.options.length > maxAddOnOptions,
    );
    if (invalidAddonOption) {
      toast.error(`Maksimal ${maxAddOnOptions} opsi per grup add-on`);
      return;
    }

    // === 1) Validasi dengan Yup ===
    try {
      await schema.validate(values, { abortEarly: false });
    } catch (yupError) {
      const messages = (yupError.inner || [])
        .map((e) => e.message)
        .filter(Boolean);

      if (messages.length === 0 && yupError.message) {
        messages.push(yupError.message);
      }

      const firstMsg = String(
        messages[0] || "Mohon lengkapi semua field yang wajib diisi",
      );
      toast.error(firstMsg);
      return;
    }

    // === 2) Validasi kustom ===
    if (productImages.value.length === 0) {
      toast.error("Minimal tambahkan 1 foto produk");
      return;
    }

    if (useVariants.value) {
      if (variants.value.length === 0) {
        toast.error("Minimal tambahkan 1 varian");
        return;
      }
      const hasVariantWithAtLeastTwoOptions = variants.value.some((variant) => {
        const validOptionsCount = variant.options.filter(
          (opt) => opt.name && opt.name.trim(),
        ).length;

        return validOptionsCount >= 2;
      });

      if (!hasVariantWithAtLeastTwoOptions) {
        toast.error(
          "Jika menggunakan variasi, minimal salah satu varian harus memiliki 2 pilihan atau lebih",
        );
        return;
      }

      const hasEmptyVariantName = variants.value.some((v) => !v.name.trim());
      if (hasEmptyVariantName) {
        toast.error("Semua nama varian harus diisi");
        return;
      }

      const hasEmptyOptions = variants.value.some(
        (v) => v.options.filter((opt) => opt.name.trim()).length === 0,
      );
      if (hasEmptyOptions) {
        toast.error("Setiap varian harus memiliki minimal 1 opsi");
        return;
      }

      if (combinationsExceedLimit.value) {
        toast.error(`Kombinasi maksimal ${maxOptions}`);
        return;
      }

      const hasInvalidCombo = combinations.value.some(
        (c) => c.price < 0 || c.stock < 0,
      );
      if (hasInvalidCombo) {
        toast.error("Harga dan stok tidak boleh negatif");
        return;
      }
    }

    if (addOnGroups.value.length > 0) {
      const hasInvalidGroup = addOnGroups.value.some((group) => {
        if (!group.name.trim()) return true;

        const validOptions = group.options.filter(
          (opt) => opt.name.trim() && opt.price >= 0,
        );
        if (validOptions.length === 0) return true;

        if (group.min_selection < 0 || group.max_selection < 1) return true;
        if (group.min_selection > group.max_selection) return true;
        if (group.max_selection > validOptions.length) return true;

        return false;
      });

      if (hasInvalidGroup) {
        toast.error(
          "Pastikan setiap grup add-on memiliki nama, minimal 1 opsi valid, dan pengaturan min/max yang benar",
        );
        return;
      }
    }

    loading.value = true;

    try {
      const formData = new FormData();

      if (!currentMerchantSlug.value) {
        throw new Error("merchantSlug tidak ditemukan");
      }

      formData.append("name", values.name);
      formData.append("description", values.description);
      const categoryIds = [
        values.category_id,
        ...selectedSubCategories.value.filter(Boolean),
      ];

      categoryIds.forEach((catId, index) => {
        formData.append(`category_ids[${index}]`, catId);
      });
      formData.append("min_purchase", values.min_purchase);
      formData.append("status", "draft");

      // Product Images
      productImages.value.forEach((img, index) => {
        formData.append(`images[${index}][file]`, img.file);
        formData.append(`images[${index}][order]`, index);
      });
      formData.append("cover_image_index", coverImageIndex.value);

      // Variants or Direct Pricing
      if (useVariants.value === true && variants.value.length > 0) {
        variants.value.forEach((variant, vIndex) => {
          formData.append(`variants[${vIndex}][name]`, variant.name);
          formData.append(
            `variants[${vIndex}][uses_images]`,
            variantUsesImages.value[variant.id] || 0,
          );

          variant.options.forEach((opt, oIndex) => {
            if (opt.name.trim()) {
              formData.append(
                `variants[${vIndex}][options][${oIndex}][name]`,
                opt.name.trim(),
              );

              if (
                variantUsesImages.value[variant.id] === 1 &&
                opt.images.length > 0
              ) {
                opt.images.forEach((img, iIndex) => {
                  formData.append(
                    `variants[${vIndex}][options][${oIndex}][images][${iIndex}][file]`,
                    img.file,
                  );
                });
              }
            }
          });
        });

        combinations.value.forEach((combo, cIndex) => {
          formData.append(
            `combinations[${cIndex}][combination]`,
            combo.combination,
          );
          formData.append(`combinations[${cIndex}][sku]`, combo.sku || "");
          formData.append(`combinations[${cIndex}][price]`, combo.price);
          formData.append(`combinations[${cIndex}][stock]`, combo.stock);

          combo.attributes.forEach((attr, aIndex) => {
            formData.append(
              `combinations[${cIndex}][attributes][${aIndex}][name]`,
              attr.name,
            );
            formData.append(
              `combinations[${cIndex}][attributes][${aIndex}][value]`,
              attr.value,
            );
          });
        });
      } else {
        if (formSKU.value) {
          formData.append("sku", formSKU.value);
        }
        formData.append("price", String(formPrice.value));
        formData.append("stock", String(formStock.value));
      }

      // Add-on Groups
      addOnGroups.value.forEach((group, gIndex) => {
        if (group.name.trim()) {
          formData.append(`add_on_groups[${gIndex}][name]`, group.name.trim());
          formData.append(
            `add_on_groups[${gIndex}][min_selection]`,
            group.min_selection,
          );
          formData.append(
            `add_on_groups[${gIndex}][max_selection]`,
            group.max_selection,
          );

          group.options.forEach((opt, oIndex) => {
            if (opt.name.trim()) {
              formData.append(
                `add_on_groups[${gIndex}][options][${oIndex}][name]`,
                opt.name.trim(),
              );
              formData.append(
                `add_on_groups[${gIndex}][options][${oIndex}][price]`,
                opt.price,
              );
            }
          });
        }
      });

      if (isDev) {
        console.log("useVariants:", useVariants.value);
        console.log("variants:", variants.value);
      }
      // API Call (via composable)
      await createProduct(currentMerchantSlug.value, formData);

      // ✅ FIXED: Redirect dengan merchantId yang benar
      router.push(`/merchant-center/${currentMerchantSlug.value}/products`);
    } catch (error) {
      if (error.response?.status === 422) {
        const data = error.response.data;

        // 1️⃣ Prioritaskan message dari backend
        if (data?.message) {
          toast.error(data.message);
          return;
        }

        // 2️⃣ Fallback: Laravel validation errors
        if (data?.errors && typeof data.errors === "object") {
          const firstError = Object.values(data.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            toast.error(firstError[0]);
            return;
          }
        }

        // 3️⃣ Fallback terakhir
        toast.error("Validasi gagal");
      } else if (error.response?.status === 403) {
        toast.error("Anda tidak memiliki akses ke merchant ini");
      } else {
        toast.error(
          error.response?.data?.message || "Gagal menambahkan produk",
        );
      }
    } finally {
      loading.value = false;
    }
  },
  (errorsFromVee) => {
    function getFirstErrorMessage(errObj) {
      if (!errObj) return null;
      if (typeof errObj === "string") return errObj;

      if (errObj.errors && typeof errObj.errors === "object") {
        const vals = Object.values(errObj.errors);
        for (const v of vals) {
          if (typeof v === "string") return v;
          if (Array.isArray(v) && v.length) return String(v[0]);
          if (v && v.message) return String(v.message);
        }
      }

      if (errObj.results && typeof errObj.results === "object") {
        const vals = Object.values(errObj.results);
        for (const r of vals) {
          if (r && r.errors && Array.isArray(r.errors) && r.errors.length)
            return String(r.errors[0]);
          if (r && r.message) return String(r.message);
        }
      }

      if (typeof errObj === "object") {
        const vals = Object.values(errObj);
        for (const v of vals) {
          if (typeof v === "string") return v;
          if (Array.isArray(v) && v.length && typeof v[0] === "string")
            return v[0];
          if (v && typeof v === "object") {
            const inner = Object.values(v).find(
              (iv) =>
                typeof iv === "string" || (Array.isArray(iv) && iv.length),
            );
            if (typeof inner === "string") return inner;
            if (Array.isArray(inner)) return String(inner[0]);
          }
        }
      }

      return null;
    }

    const firstMsg =
      getFirstErrorMessage(errorsFromVee) ||
      "Mohon lengkapi semua field yang wajib diisi";

    toast.error(String(firstMsg));
  },
);
</script>

<!-- Template unchanged, just ensure mobile header back button uses dynamic route -->
<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader
      title="Tambah Produk"
      :backRoute="`/merchant-center/${currentMerchantSlug}/products`"
    />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-50 hidden py-6 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-6 gap-y-2 gap-x-4"
      >
        <div>
          <!-- ✅ Use Breadcrumb Component -->
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="text-xs text-muted-foreground sm:text-sm">
            Lengkapi informasi produk Anda.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :disabled="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile Only -->
    <div class="h-[72px] sm:h-0"></div>

    <!-- Container Responsive -->
    <div class="px-4 pt-4 mx-auto sm:px-6 sm:py-6 sm:pt-0">
      <!-- ✅ UPDATED: Info Banner -->
      <div
        class="p-4 mb-2 border border-blue-200 sm:mb-4 bg-blue-50 rounded-xl"
      >
        <div class="flex gap-3">
          <i
            class="pi pi-info-circle text-merchant-primary text-lg shrink-0 mt-0.5"
          ></i>
          <div class="flex-1">
            <h4 class="mb-1 text-sm font-semibold text-merchant-primary">
              Informasi Penting
            </h4>
            <ul class="pl-4 space-y-1 text-xs list-disc text-merchant-primary">
              <li>
                Upload minimal 1 foto produk, maksimal 6 foto (maksimal 5 MB per
                foto).
              </li>
              <li>
                Kategori utama wajib dipilih, sub-kategori opsional (maksimal
                4).
              </li>
              <li>SKU produk bersifat opsional.</li>
              <li>Stok maksimal 9.999 per produk/varian.</li>
              <li>Minimal pembelian tidak boleh kurang dari 1.</li>
              <li>
                <b>Variasi Produk:</b>
                <ul class="pl-4 mt-1 list-disc">
                  <li>Maksimal 2 variasi, total kombinasi maksimal 50.</li>
                  <li>
                    Jika menggunakan variasi, minimal salah satu varian harus
                    memiliki 2 opsi.
                  </li>
                  <li>
                    Jika menggunakan variasi, atur SKU, harga, dan stok di
                    setiap kombinasi.
                  </li>
                  <li>Hanya variasi pertama yang dapat memiliki gambar.</li>
                </ul>
              </li>
              <li>
                <b>Grup Add-on (Opsional):</b>
                <ul class="pl-4 mt-1 list-disc">
                  <li>Maksimal 10 grup, maksimal 10 opsi per grup.</li>
                  <li>
                    Setiap grup add-on memiliki pengaturan minimal dan maksimal
                    pilihan:
                    <ul class="pl-4 mt-1 list-disc">
                      <li>
                        <b>Min (Minimal Pilihan):</b> Jumlah minimum opsi yang
                        harus dipilih pembeli dari grup ini.
                      </li>
                      <li>
                        <b>Max (Maksimal Pilihan):</b> Jumlah maksimum opsi yang
                        dapat dipilih pembeli dari grup ini.
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <!-- ✅ FIXED: Remove ref, use @submit -->
      <Form @submit="onSubmit">
        <!-- Foto Produk -->
        <div
          class="p-4 mb-2 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3
            class="flex items-center gap-2 mb-3 text-sm font-semibold text-black"
          >
            <i class="pi pi-image text-merchant-primary"></i>
            Foto Produk
            <span class="text-xs font-normal text-danger-foreground">*</span>
          </h3>

          <!-- Image Grid - RESPONSIVE -->
          <div class="grid grid-cols-3 gap-3 mb-3 sm:grid-cols-4">
            <div
              v-for="(img, index) in productImages"
              :key="img.id"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover="onDragOver"
              @drop="onDrop($event, index)"
              @dragend="onDragEnd"
              class="relative overflow-hidden border-2 cursor-move aspect-square rounded-xl group"
              :class="
                index === coverImageIndex
                  ? 'border-merchant-primary ring-2 ring-merchant-primary/20'
                  : 'border-gray-200'
              "
            >
              <img
                :src="img.preview"
                class="object-cover w-full h-full pointer-events-none"
              />

              <!-- Drag Handle -->
              <div
                class="absolute flex items-center justify-center w-6 h-6 rounded-full pointer-events-none top-2 right-2 bg-black/60"
              >
                <i class="text-xs text-white pi pi-arrows-alt"></i>
              </div>

              <!-- Cover Badge -->
              <div
                v-if="index === coverImageIndex"
                class="absolute top-2 left-2 px-2 py-1 bg-merchant-primary text-white text-[10px] font-semibold rounded-full flex items-center gap-1"
              >
                <i class="pi pi-star-fill"></i>
                <span>Cover</span>
              </div>

              <!-- Actions -->
              <div
                class="absolute inset-0 flex items-center justify-center gap-2 transition opacity-0 bg-black/50 group-hover:opacity-100"
              >
                <button
                  @click.stop="removeImage(index)"
                  type="button"
                  class="flex items-center justify-center w-8 h-8 transition bg-white rounded-full hover:scale-110"
                >
                  <i class="text-sm pi pi-trash text-danger-foreground"></i>
                </button>
              </div>
            </div>

            <!-- Add Button -->
            <button
              v-if="productImages.length < 6"
              @click="triggerFileInput"
              type="button"
              class="flex flex-col items-center justify-center gap-2 transition border-2 border-gray-300 border-dashed aspect-square rounded-xl hover:border-merchant-primary hover:bg-merchant-primary/5"
            >
              <i class="text-2xl pi pi-plus text-merchant-primary"></i>
              <span class="text-xs text-muted-foreground">Tambah</span>
            </button>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleImageUpload"
          />

          <p class="text-xs text-muted-foreground">
            <i class="pi pi-info-circle"></i>
            Drag gambar untuk mengubah urutan. Foto pertama menjadi cover. Maks
            6 foto dengan masing-masing ukuran maksimal
            {{ MAX_IMAGE_SIZE_MB }} MB. Gunakan gambar dengan rasio 1:1 untuk
            hasil terbaik.
          </p>
        </div>

        <!-- Info Dasar -->
        <div
          class="p-4 mb-2 space-y-3 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-info-circle text-merchant-primary"></i>
            Informasi Dasar
          </h3>

          <TextField
            name="name"
            label="Nama Produk"
            v-model="name"
            placeholder="Contoh: Sandal Jepit"
            required
          />
          <TextField
            name="description"
            label="Deskripsi"
            v-model="description"
            textarea
            :rows="4"
            placeholder="Jelaskan detail produk Anda"
            required
          />

          <!-- ✅ UPDATED: Kategori Section dengan Loading State -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <!-- Level 1 Category -->
            <div class="relative">
              <SelectField
                name="category_id"
                label="Kategori Utama"
                :options="categoriesLevel1"
                v-model="selectedCategory"
                :disabled="loadingLevel1"
                required
              />

              <!-- Empty State -->
              <p
                v-if="!loadingLevel1 && categoriesLevel1.length === 0"
                class="flex items-center gap-1 mt-1 text-xs text-amber-600"
              >
                <i class="pi pi-exclamation-triangle"></i>
                Tidak ada kategori tersedia
              </p>
            </div>

            <!-- Sub Categories -->
            <div v-if="selectedCategory">
              <label class="block mb-2 text-sm font-medium text-gray-700">
                Sub Kategori
                <span class="text-xs font-normal text-muted-foreground"
                  >(Maks. 4)</span
                >
              </label>

              <!-- Loading State -->
              <div
                v-if="loadingLevel2"
                class="flex items-center justify-center py-4 text-sm text-gray-500"
              >
                <i class="mr-2 pi pi-spin pi-spinner text-merchant-primary"></i>
                Memuat sub-kategori...
              </div>

              <!-- Empty State -->
              <div
                v-else-if="!loadingLevel2 && categoriesLevel2.length === 0"
                class="px-3 py-4 text-center border border-gray-200 rounded-lg bg-gray-50"
              >
                <i class="block mb-2 text-2xl text-gray-300 pi pi-inbox"></i>
                <p class="text-xs text-gray-500">
                  Kategori ini tidak memiliki sub-kategori
                </p>
              </div>

              <!-- Sub-category List -->
              <div v-else class="mb-2 space-y-2">
                <div
                  v-for="(subCat, index) in selectedSubCategories"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <select
                    v-model="selectedSubCategories[index]"
                    class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-merchant-primary focus:border-transparent"
                  >
                    <option value="" disabled>Pilih sub kategori</option>
                    <option
                      v-for="cat in categoriesLevel2"
                      :key="cat.value"
                      :value="cat.value"
                      :disabled="selectedSubCategories.includes(cat.value)"
                    >
                      {{ cat.label }}
                    </option>
                  </select>
                  <button
                    @click="selectedSubCategories.splice(index, 1)"
                    type="button"
                    class="flex items-center justify-center w-8 h-8 transition rounded-lg bg-danger-background text-danger-foreground hover:bg-red-100"
                  >
                    <i class="text-sm pi pi-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Add Sub-category Button -->
              <button
                v-if="canAddSubCategory && categoriesLevel2.length > 0"
                @click="selectedSubCategories.push('')"
                type="button"
                class="flex items-center gap-1 text-sm text-merchant-primary hover:underline"
              >
                <i class="text-xs pi pi-plus"></i>
                Tambah Sub Kategori
              </button>
            </div>
          </div>
        </div>

        <!-- Variasi Toggle -->
        <div
          class="p-4 mb-2 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <label
            class="flex items-center justify-between cursor-pointer"
            @click="useVariants = !useVariants"
          >
            <div>
              <h3 class="text-sm font-semibold text-black">Gunakan Variasi</h3>
              <p class="text-xs text-muted-foreground">
                Produk dengan ukuran, warna, dll
              </p>
            </div>
            <div
              :class="[
                'relative w-12 h-6 rounded-full transition shrink-0',
                useVariants ? 'bg-merchant-primary' : 'bg-gray-300',
              ]"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  useVariants ? 'translate-x-7' : 'translate-x-1',
                ]"
              ></span>
            </div>
          </label>
        </div>

        <!-- Variasi Section -->
        <div
          v-if="useVariants"
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <div class="flex items-center justify-between">
            <h3
              class="flex items-center gap-2 text-sm font-semibold text-black"
            >
              <i class="pi pi-box text-merchant-primary"></i>
              Varian
              <span class="text-sm font-normal text-muted-foreground"
                >(Maks. 2)</span
              >
            </h3>
            <button
              v-if="canAddVariant"
              @click="addVariant"
              type="button"
              class="flex items-center gap-1 text-sm text-merchant-primary hover:underline"
            >
              <i class="pi pi-plus"></i>
              Tambah
            </button>
          </div>

          <!-- RESPONSIVE GRID dengan Accordion - PERBAIKAN -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              v-for="(variant, vIndex) in variants"
              :key="variant.id"
              class="overflow-hidden transition bg-white border-2 border-gray-200 rounded-xl hover:border-merchant-primary/50"
            >
              <!-- Variant Header - Always Visible -->
              <div class="p-4 space-y-4 bg-white">
                <!-- Top Bar: Label + Delete Button -->
                <div
                  class="flex items-center justify-between pb-3 border-b border-gray-100"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="px-3 py-1 text-xs font-bold text-white rounded-full bg-merchant-primary"
                    >
                      Varian {{ vIndex + 1 }}
                    </span>
                    <span
                      v-if="
                        variant.options.filter((opt) => opt.name.trim())
                          .length > 0
                      "
                      class="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
                    >
                      {{
                        variant.options.filter((opt) => opt.name.trim()).length
                      }}
                      opsi
                    </span>
                  </div>
                  <button
                    @click="removeVariant(vIndex)"
                    type="button"
                    class="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 bg-danger-background text-danger-foreground hover:bg-red-100"
                  >
                    <i class="text-sm pi pi-trash"></i>
                  </button>
                </div>

                <!-- PERBAIKAN: Input Nama Varian dengan identifier unik -->
                <div>
                  <TextField
                    :name="`variant_name_${variant.id}`"
                    type="text"
                    v-model="variantNames[variant.id]"
                    @input="variant.name = variantNames[variant.id]"
                    :label="`Nama Varian`"
                    :placeholder="`Contoh: ${
                      vIndex === 0 ? 'Warna' : 'Ukuran'
                    }`"
                    required
                  />
                </div>

                <!-- ✅ FIXED: Toggle images dengan 0/1 -->
                <div v-if="vIndex === 0">
                  <label
                    @click="toggleVariantImages(variant.id)"
                    class="flex items-center justify-between px-4 py-3 transition border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div class="flex items-center gap-2">
                      <i class="pi pi-image text-merchant-primary"></i>
                      <span class="text-sm font-medium text-gray-700">
                        Gunakan foto untuk varian ini
                      </span>
                    </div>
                    <!-- ✅ FIXED: Check dengan === 1 -->
                    <div
                      :class="[
                        'relative w-11 h-6 rounded-full transition shrink-0',
                        variantUsesImages[variant.id] === 1
                          ? 'bg-merchant-primary'
                          : 'bg-gray-300',
                      ]"
                    >
                      <span
                        :class="[
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          variantUsesImages[variant.id] === 1
                            ? 'translate-x-6'
                            : 'translate-x-1',
                        ]"
                      ></span>
                    </div>
                  </label>
                </div>

                <!-- Accordion Toggle Button -->
                <button
                  @click="toggleVariantExpand(variant.id)"
                  type="button"
                  class="flex items-center justify-between w-full px-4 py-3 transition border rounded-lg bg-merchant-primary/5 border-merchant-primary/20 hover:bg-merchant-primary/10"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-list text-merchant-primary"></i>
                    <span class="text-sm font-semibold text-black">
                      Kelola Opsi
                      <span class="ml-1 text-muted-foreground">
                        ({{
                          variant.options.filter((opt) => opt.name.trim())
                            .length
                        }})
                      </span>
                    </span>
                  </div>
                  <i
                    :class="[
                      'pi text-merchant-primary transition-transform duration-300',
                      isVariantExpanded(variant.id)
                        ? 'pi-chevron-up'
                        : 'pi-chevron-down',
                    ]"
                  ></i>
                </button>
              </div>

              <!-- Accordion Content - tetap sama -->
              <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="max-h-[2000px] opacity-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-[2000px] opacity-100"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="isVariantExpanded(variant.id)"
                  class="overflow-hidden border-t border-gray-200"
                >
                  <div class="p-4 pt-3 space-y-3 bg-gray-50">
                    <!-- Header Opsi dengan Border -->
                    <div
                      class="flex items-center justify-between pb-2 border-b border-gray-300"
                    >
                      <label
                        class="text-xs font-bold tracking-wide text-black uppercase"
                      >
                        Daftar Opsi
                      </label>
                      <button
                        @click="addOption(vIndex)"
                        :disabled="!canAddVariantOption(vIndex)"
                        type="button"
                        class="flex items-center gap-1 text-xs font-semibold text-merchant-primary hover:underline"
                      >
                        <i class="pi pi-plus text-[10px]"></i>
                        Tambah
                      </button>
                    </div>

                    <!-- List Opsi dengan Scroll -->
                    <div
                      v-if="isVariantExpanded(variant.id)"
                      class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1"
                    >
                      <div
                        v-for="(option, oIndex) in variant.options"
                        :key="option.id"
                        class="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5 hover:shadow-md transition-shadow"
                      >
                        <!-- Opsi Input dengan Number Badge -->
                        <div class="flex items-start gap-2.5">
                          <div
                            class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          >
                            {{ oIndex + 1 }}
                          </div>
                          <div class="flex-1 space-y-2.5">
                            <!-- UPDATED: Gunakan TextField -->
                            <TextField
                              :name="`variant_${variant.id}_option_${option.id}_name`"
                              v-model="option.name"
                              :placeholder="`Contoh: ${
                                vIndex === 0 ? 'Merah' : 'S'
                              }`"
                              :hideLabel="true"
                              variant="primary"
                            />

                            <!-- ✅ FIXED: Check dengan === 1 -->
                            <!-- Option Image (hanya jika varian 1 & uses_images === 1) -->
                            <div
                              v-if="
                                vIndex === 0 &&
                                variantUsesImages[variant.id] === 1
                              "
                            >
                              <label
                                class="text-xs font-semibold text-gray-600 mb-1.5 block"
                              >
                                Foto Opsi
                              </label>

                              <!-- Image Preview -->
                              <div
                                v-if="option.images.length > 0"
                                class="relative w-20 h-20 overflow-hidden border-2 border-gray-200 rounded-lg group"
                              >
                                <img
                                  :src="option.images[0].preview"
                                  class="object-cover w-full h-full"
                                />
                                <button
                                  @click="removeOptionImage(vIndex, oIndex, 0)"
                                  type="button"
                                  class="absolute inset-0 flex items-center justify-center transition opacity-0 bg-black/60 group-hover:opacity-100"
                                >
                                  <i class="text-sm text-white pi pi-trash"></i>
                                </button>
                              </div>

                              <!-- Upload Button -->
                              <label
                                v-else
                                class="flex flex-col items-center justify-center w-20 h-20 gap-1 transition border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-merchant-primary hover:bg-merchant-primary/5"
                              >
                                <i
                                  class="text-lg pi pi-plus text-merchant-primary"
                                ></i>
                                <span
                                  class="text-[10px] text-gray-500 font-medium"
                                >
                                  Upload
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  class="hidden"
                                  @change="
                                    handleOptionImageUpload(
                                      vIndex,
                                      oIndex,
                                      $event,
                                    )
                                  "
                                />
                              </label>
                            </div>
                          </div>

                          <!-- Delete Button -->
                          <button
                            v-if="variant.options.length > 1"
                            @click="removeOption(vIndex, oIndex)"
                            type="button"
                            class="w-8 h-8 rounded-lg bg-danger-background text-danger-foreground hover:bg-red-100 flex items-center justify-center transition shrink-0 mt-0.5"
                          >
                            <i class="text-sm pi pi-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Add Option Button (Bottom) -->
                    <button
                      @click="addOption(vIndex)"
                      type="button"
                      class="w-full py-2.5 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-merchant-primary font-bold hover:border-merchant-primary hover:bg-white transition flex items-center justify-center gap-2"
                    >
                      <i class="text-xs pi pi-plus"></i>
                      Tambah Opsi Baru
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- Combinations Summary -->
          <div
            v-if="variants.length > 0"
            class="p-4 border-2 bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
          >
            <div
              class="flex flex-wrap items-start justify-between gap-3 sm:flex-row sm:items-center"
            >
              <div>
                <p class="text-sm font-semibold text-merchant-primary">
                  Total Kombinasi
                </p>
                <p class="text-xs text-gray-600">
                  {{ totalCombinations }} kombinasi akan dibuat
                </p>
              </div>
              <Button
                @click="openCombinationsModal"
                :disabled="totalCombinations === 0"
                variant="merchant"
              >
                <i class="pi pi-cog"></i>
                Atur Harga & Stok
              </Button>
            </div>
            <p
              v-if="combinationsExceedLimit"
              class="flex items-center gap-1 mt-2 text-xs font-medium text-danger-foreground"
            >
              <i class="pi pi-exclamation-triangle"></i>
              Kombinasi melebihi batas maksimal ({{ maxOptions }})
            </p>
          </div>
        </div>

        <!-- Harga & Stok (tanpa variasi) - PERBAIKAN dengan v-model.number -->
        <div
          v-if="!useVariants"
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-tag text-merchant-primary"></i>
            Harga & Stok
          </h3>

          <div class="space-y-4">
            <!-- ✅ NEW: SKU Input -->
            <TextField
              name="sku"
              label="SKU (Opsional)"
              type="text"
              placeholder="Contoh: PRD-001"
              v-model="formSKU"
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="price"
                label="Harga"
                type="number"
                placeholder="0"
                prefix="Rp"
                v-model.number="formPrice"
                required
              />
              <TextField
                name="stock"
                label="Stok"
                type="number"
                placeholder="0"
                v-model.number="formStock"
                min="0"
                max="9999"
                required
              />
            </div>
          </div>
        </div>

        <!-- UPDATED: Add-on Groups Section dengan Grid Layout -->
        <div
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3
                class="flex items-center gap-2 text-sm font-semibold text-black"
              >
                <i class="pi pi-plus-circle text-merchant-primary"></i>
                Grup Add-on (Opsional)
                <span class="text-sm font-normal text-muted-foreground"
                  >(Maks. {{ maxAddOnGroups }})</span
                >
              </h3>
              <p class="mt-1 text-xs text-muted-foreground">
                Kelompokkan add-on berdasarkan kategori (contoh: tingkat
                kepedasan, topping)
              </p>
            </div>
            <button
              v-if="canAddAddOnGroup"
              @click="addAddOnGroup"
              type="button"
              class="flex items-center gap-1 text-sm font-semibold text-merchant-primary hover:underline"
            >
              <i class="pi pi-plus"></i>
              Tambah Grup
            </button>
          </div>

          <!-- UPDATED: Grid Layout untuk Desktop -->
          <div
            v-if="addOnGroups.length > 0"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div
              v-for="(group, gIndex) in addOnGroups"
              :key="group.id"
              class="overflow-hidden transition bg-white border-2 border-gray-200 rounded-xl hover:border-merchant-primary/50"
            >
              <!-- Group Header - Always Visible -->
              <div class="p-4 space-y-4 bg-white">
                <!-- Header: Badge + Delete -->
                <div
                  class="flex items-center justify-between pb-3 border-b border-gray-100"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="px-3 py-1 text-xs font-bold text-white rounded-full bg-merchant-primary"
                    >
                      Grup {{ gIndex + 1 }}
                    </span>
                    <span
                      v-if="group.is_required || group.min_selection > 0"
                      class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
                    >
                      <i class="pi pi-exclamation-circle text-[10px]"></i>
                      Wajib
                    </span>
                    <span
                      v-if="group.max_selection > 0"
                      class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
                    >
                      <i class="pi pi-list text-[10px]"></i>
                      {{ group.min_selection }}-{{ group.max_selection }}
                      pilihan
                    </span>
                  </div>
                  <button
                    @click="removeAddOnGroup(gIndex)"
                    type="button"
                    class="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 bg-danger-background text-danger-foreground hover:bg-red-100"
                  >
                    <i class="text-sm pi pi-trash"></i>
                  </button>
                </div>

                <!-- Group Name -->
                <TextField
                  :name="`addon_group_name_${group.id}`"
                  v-model="group.name"
                  label="Nama Grup Add-on"
                  placeholder="Contoh: Tingkat Kepedasan, Topping"
                  required
                />

                <!-- Min/Max Selection Settings -->
                <div
                  class="p-3 space-y-3 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <label class="block text-xs font-semibold text-gray-700">
                    Aturan Pemilihan
                  </label>

                  <div class="grid grid-cols-2 gap-3">
                    <!-- UPDATED: Min Selection -->
                    <div>
                      <TextField
                        :name="`addon_group_${group.id}_min_selection`"
                        label="Minimal Pilihan"
                        v-model.number="group.min_selection"
                        type="number"
                        min="0"
                        :max="group.max_selection"
                        placeholder="0"
                        suffix="opsi"
                        :labelBold="false"
                      />
                      <p class="text-[10px] text-gray-500 mt-1">0 = opsional</p>
                    </div>

                    <!-- UPDATED: Max Selection -->
                    <div>
                      <TextField
                        :name="`addon_group_${group.id}_max_selection`"
                        label="Maksimal Pilihan"
                        v-model.number="group.max_selection"
                        type="number"
                        :min="Math.max(1, group.min_selection)"
                        :max="
                          group.options.filter((opt) => opt.name.trim())
                            .length || 1
                        "
                        placeholder="1"
                        suffix="opsi"
                        :labelBold="false"
                      />
                    </div>
                  </div>

                  <!-- Quick Presets -->
                  <div
                    class="flex flex-wrap gap-2 pt-2 border-t border-gray-200"
                  >
                    <button
                      @click="
                        group.min_selection = 0;
                        group.max_selection = 1;
                      "
                      type="button"
                      class="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-medium text-gray-700 hover:bg-gray-50 hover:border-merchant-primary transition"
                    >
                      <i class="pi pi-circle text-[8px] mr-1"></i>
                      Pilih 1 (Optional)
                    </button>
                    <button
                      @click="
                        group.min_selection = 1;
                        group.max_selection = 1;
                      "
                      type="button"
                      class="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-medium text-gray-700 hover:bg-gray-50 hover:border-merchant-primary transition"
                    >
                      <i class="pi pi-exclamation-circle text-[8px] mr-1"></i>
                      Wajib Pilih 1
                    </button>
                    <button
                      @click="
                        group.min_selection = 0;
                        group.max_selection =
                          group.options.filter((opt) => opt.name.trim())
                            .length || 99;
                      "
                      type="button"
                      class="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-medium text-gray-700 hover:bg-gray-50 hover:border-merchant-primary transition"
                    >
                      <i class="pi pi-check-square text-[8px] mr-1"></i>
                      Multi-pilih
                    </button>
                  </div>

                  <!-- Validation Warning -->
                  <div
                    v-if="group.min_selection > group.max_selection"
                    class="flex items-start gap-2 p-2 border border-red-200 rounded-lg bg-red-50"
                  >
                    <i
                      class="pi pi-exclamation-triangle text-red-600 text-xs mt-0.5"
                    ></i>
                    <p class="text-[10px] text-red-700 flex-1">
                      Minimal tidak boleh lebih besar dari maksimal
                    </p>
                  </div>
                </div>

                <!-- Accordion Toggle Button -->
                <button
                  @click="toggleAddOnGroupExpand(group.id)"
                  type="button"
                  class="flex items-center justify-between w-full px-4 py-3 transition border rounded-lg bg-merchant-primary/5 border-merchant-primary/20 hover:bg-merchant-primary/10"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-list text-merchant-primary"></i>
                    <span class="text-sm font-semibold text-black">
                      Kelola Opsi
                      <span class="ml-1 text-muted-foreground">
                        ({{
                          group.options.filter((opt) => opt.name.trim()).length
                        }})
                      </span>
                    </span>
                  </div>
                  <i
                    :class="[
                      'pi text-merchant-primary transition-transform duration-300',
                      isAddOnGroupExpanded(group.id)
                        ? 'pi-chevron-up'
                        : 'pi-chevron-down',
                    ]"
                  ></i>
                </button>
              </div>

              <!-- Accordion Content - Options List -->
              <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="max-h-[2000px] opacity-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-[2000px] opacity-100"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="isAddOnGroupExpanded(group.id)"
                  class="overflow-hidden border-t border-gray-200"
                >
                  <div class="p-4 pt-3 space-y-3 bg-gray-50">
                    <!-- Options Header -->
                    <div
                      class="flex items-center justify-between pb-2 border-b border-gray-300"
                    >
                      <label
                        class="text-xs font-bold tracking-wide text-black uppercase"
                      >
                        Daftar Opsi
                      </label>
                      <button
                        @click="addAddOnOption(gIndex)"
                        type="button"
                        :disabled="group.options.length >= maxAddOnOptions"
                        class="flex items-center gap-1 text-xs font-semibold text-merchant-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i class="pi pi-plus text-[10px]"></i>
                        Tambah
                      </button>
                    </div>

                    <!-- Options List with Scroll -->
                    <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      <div
                        v-for="(option, oIndex) in group.options"
                        :key="option.id"
                        class="p-3 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
                      >
                        <div class="flex items-start gap-2.5">
                          <div
                            class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          >
                            {{ oIndex + 1 }}
                          </div>

                          <div class="flex-1 space-y-2.5">
                            <!-- UPDATED: Option Name -->
                            <TextField
                              :name="`addon_group_${group.id}_option_${option.id}_name`"
                              v-model="option.name"
                              :placeholder="`Contoh: ${
                                gIndex === 0 ? 'Tidak Pedas' : 'Daging Asap'
                              }`"
                              :hideLabel="true"
                              variant="primary"
                            />

                            <!-- UPDATED: Price -->
                            <TextField
                              :name="`addon_group_${group.id}_option_${option.id}_price`"
                              label="Harga Tambahan"
                              v-model.number="option.price"
                              type="number"
                              min="0"
                              placeholder="0"
                              prefix="Rp"
                              :labelBold="false"
                            />
                            <p
                              v-if="option.price === 0"
                              class="flex items-center gap-1 -mt-1 text-xs text-gray-500"
                            >
                              <i class="pi pi-info-circle text-[10px]"></i>
                              Gratis (Rp 0)
                            </p>
                          </div>

                          <!-- Delete Button -->
                          <button
                            v-if="group.options.length > 1"
                            @click="removeAddOnOption(gIndex, oIndex)"
                            type="button"
                            class="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 flex items-center justify-center transition shrink-0 mt-0.5"
                          >
                            <i class="text-sm pi pi-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Add Option Button (Bottom) -->
                    <button
                      @click="addAddOnOption(gIndex)"
                      type="button"
                      :disabled="group.options.length >= maxAddOnOptions"
                      class="w-full py-2.5 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-merchant-primary font-bold hover:border-merchant-primary hover:bg-white transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i class="text-xs pi pi-plus"></i>
                      Tambah Opsi Baru
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- Empty State (tetap sama) -->
          <div
            v-else
            class="px-4 py-8 text-center border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
          >
            <i class="block mb-3 text-4xl text-gray-300 pi pi-plus-circle"></i>
            <p class="mb-3 text-sm text-gray-500">
              Belum ada grup add-on ditambahkan
            </p>
            <button
              @click="addAddOnGroup"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition rounded-lg bg-merchant-primary hover:bg-merchant-primary/90"
            >
              <i class="pi pi-plus"></i>
              Tambah Grup Pertama
            </button>
          </div>
        </div>

        <!-- Min Purchase -->
        <div
          class="p-4 mb-2 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <TextField
            name="min_purchase"
            label="Minimal Jumlah Pembelian"
            type="number"
            placeholder="1"
            v-model.number="formMinPurchase"
            required
          />
        </div>

        <!-- ✅ FIXED: Desktop Submit Button -->
        <div class="justify-end hidden sm:flex">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :disabled="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan" }}</span>
          </Button>
        </div>

        <!-- ✅ FIXED: Mobile Submit Button -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <Button type="submit" :loading="loading" variant="merchant" block>
            Simpan
          </Button>
        </div>
      </Form>
    </div>

    <!-- UPDATED: Combinations Modal menggunakan ResponsiveModal -->
    <ResponsiveModal
      v-model:show="showCombinationsModal"
      title="Atur Harga & Stok"
      :subtitle="
        selectedCombinations.size > 0
          ? `${selectedCombinations.size} kombinasi dipilih`
          : null
      "
      show-footer
      @close="closeCombinationsModal"
    >
      <!-- Bulk Edit Section -->
      <div
        class="px-2 py-4 mb-4 border sm:px-0 bg-merchant-primary/5 border-muted-background rounded-xl"
      >
        <div class="px-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-semibold text-black">Edit Massal</h3>
            <label
              class="flex items-center gap-2 cursor-pointer"
              @click="toggleAllCombinations"
            >
              <div
                class="flex items-center justify-center w-5 h-5 transition border-2 rounded"
                :class="
                  allCombinationsSelected
                    ? 'bg-merchant-primary border-merchant-primary'
                    : 'border-gray-300'
                "
              >
                <i
                  v-if="allCombinationsSelected"
                  class="text-xs text-white pi pi-check"
                ></i>
              </div>
              <span class="text-xs font-medium text-gray-700">Pilih Semua</span>
            </label>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <TextField
                label="Harga untuk Terpilih"
                name="bulkPrice"
                v-model.number="bulkPrice"
                type="number"
                min="0"
                placeholder="0"
                prefix="Rp"
                :labelBold="false"
              />

              <TextField
                label="Stok untuk Terpilih"
                name="bulkStock"
                v-model.number="bulkStock"
                type="number"
                min="0"
                max="9999"
                placeholder="0"
                suffix="pcs"
                :labelBold="false"
              />
            </div>

            <Button
              @click="applyBulkEdit"
              size="sm"
              variant="merchant"
              customClass="!w-full"
              :disabled="selectedCombinations.size === 0"
            >
              <span v-if="selectedCombinations.size > 0">
                Terapkan ke {{ selectedCombinations.size }} Kombinasi
              </span>
              <span v-else>Terapkan</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- Combinations List -->
      <div class="grid grid-cols-1 gap-4">
        <div
          v-for="(combo, cIndex) in combinations"
          :key="cIndex"
          @click="toggleCombinationSelection(cIndex)"
          class="p-4 transition bg-white border-2 cursor-pointer rounded-xl"
          :class="
            selectedCombinations.has(cIndex)
              ? 'border-merchant-primary bg-merchant-primary/5'
              : 'border-gray-200'
          "
        >
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 mt-0.5"
              :class="
                selectedCombinations.has(cIndex)
                  ? 'bg-merchant-primary border-merchant-primary'
                  : 'border-gray-300'
              "
            >
              <i
                v-if="selectedCombinations.has(cIndex)"
                class="text-xs text-white pi pi-check"
              ></i>
            </div>
            <h4 class="flex-1 text-sm font-semibold text-black">
              {{ combo.combination }}
            </h4>
          </div>

          <div class="pl-8 space-y-3" @click.stop>
            <!-- ✅ FIXED: Unique name dengan cIndex -->
            <TextField
              :name="`combination_${cIndex}_sku`"
              label="SKU (Opsional)"
              v-model="combo.sku"
              type="text"
              placeholder="Masukkan SKU"
              :labelBold="false"
            />

            <div class="grid grid-cols-2 gap-3">
              <!-- ✅ FIXED: Unique name untuk price -->
              <TextField
                :name="`combination_${cIndex}_price`"
                label="Harga"
                v-model.number="combo.price"
                type="number"
                min="0"
                placeholder="0"
                prefix="Rp"
                :labelBold="false"
                required
              />

              <!-- ✅ FIXED: Unique name untuk stock -->
              <TextField
                :name="`combination_${cIndex}_stock`"
                label="Stok"
                v-model.number="combo.stock"
                type="number"
                min="0"
                max="9999"
                placeholder="0"
                suffix="pcs"
                :labelBold="false"
                required
              />
            </div>
          </div>
        </div>
      </div>
      <!-- Footer Actions (Mobile Only) -->
      <template #footer>
        <div class="flex gap-3">
          <Button @click="closeCombinationsModal" block variant="merchant">
            Selesai
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
/* Custom scrollbar untuk opsi list */
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

/* Smooth accordion animation */
/* .transition-all {
  transition-property: max-height, opacity;
} */
</style>
