<script setup>
// ======================================================
// IMPORTS
// ======================================================
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import { useAuthStore } from "@/stores/auth";
import { Form, useForm } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useCategories } from "@/composables/useCategories";
import { useProducts } from "@/composables/useProducts";

// === SHARED COMPOSABLES (SAMA DENGAN CREATE) ===
import { useProductImages } from "@/composables/product/forms/useProductImages";
import { useProductVariants } from "@/composables/product/forms/useProductVariants";
import { useProductCombinations } from "@/composables/product/forms/useProductCombinations";
import { useProductAddons } from "@/composables/product/forms/useProductAddons";

// ======================================================
// BASIC SETUP
// ======================================================
const isDev = import.meta.env.DEV;
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_COMBINATIONS = 50;
const maxVariants = 2;
const maxOptions = 50;
const maxAddOnGroups = 10;
const maxAddOnOptions = 10;

const productSlug = computed(() => route.params.slug);
const currentMerchantSlug = computed(() => {
  return route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug || null;
});
const currentMerchantId = ref(null);

watch(
  () => route.params?.merchantSlug,
  (slug) => {
    const slugValue = slug ? String(slug) : authStore.merchantSlug;
    const merchant = slugValue
      ? authStore.getMerchantBySlug(slugValue)
      : authStore.activeMerchant;

    currentMerchantId.value = merchant?.id ?? null;
  },
  { immediate: true },
);

// ======================================================
// STATE
// ======================================================
const name = ref("");
const description = ref("");
const selectedCategory = ref(null);
const selectedSubCategories = ref([]);
const loading = ref(false);
const loadingData = ref(true);

// ======================================================
// CATEGORIES
// ======================================================
const {
  categoriesLevel1,
  categoriesLevel2,
  loadingLevel1,
  loadingLevel2,
  fetchLevel1Categories,
  fetchSubCategories,
} = useCategories();

// ======================================================
// PRODUCT FETCH
// ======================================================
const { fetchProductDetail, editProduct } = useProducts();

// ======================================================
// COMPOSABLES (CREATE-STYLE)
// ======================================================
const formSku = computed({
  get: () => values.sku,
  set: (val) => setFieldValue("sku", val),
});

const formPrice = computed({
  get: () => values.price,
  set: (val) => setFieldValue("price", Number(val)),
});

const formStock = computed({
  get: () => values.stock,
  set: (val) => setFieldValue("stock", Number(val)),
});

const {
  productImages,
  coverImageIndex,
  fileInput,
  triggerFileInput,
  handleImageUpload,
  removeImage,
  onDragStart,
  onDrop,
  onDragOver,
  onDragEnd,
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
  addVariantEdit,
  removeVariant,
  addOptionEdit,
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
  setCombinationsFromBackend,
} = useProductCombinations({
  variants,
  useVariants,
  maxCombinations: MAX_COMBINATIONS,
  toast,
});

const {
  addOnGroups,
  expandedAddOnGroups,
  addAddOnGroupEdit,
  removeAddOnGroupEdit,
  addAddOnOptionEdit,
  removeAddOnOption,
  toggleAddOnGroupExpand,
  isAddOnGroupExpandedEdit,
} = useProductAddons({
  toast,
  maxGroups: maxAddOnGroups,
  maxOptions: maxAddOnOptions,
});

useBodyScrollLock(showCombinationsModal);

// ======================================================
// VEE VALIDATE (TIDAK DIUBAH)
// ======================================================
const schema = computed(() => {
  const baseSchema = {
    name: yup.string().required("Nama produk wajib diisi"),
    description: yup.string().required("Deskripsi wajib diisi"),
    category_id: yup.number().required("Kategori utama wajib dipilih"),
    sku: useVariants.value
      ? yup.string().max(100, "SKU maksimal 100 karakter").nullable()
      : yup.string().max(100, "SKU maksimal 100 karakter"),
    price: useVariants.value
      ? yup.number().min(0, "Harga minimal 0").nullable()
      : yup.number().min(0, "Harga minimal 0").required("Harga wajib diisi"),
    stock: useVariants.value
      ? yup
          .number()
          .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
          .nullable()
          .typeError("Stok harus berupa angka")
          .integer("Stok harus bilangan bulat")
          .min(0, "Stok tidak boleh negatif")
          .max(9999, "Stok maksimal 9999")
      : yup
          .number()
          .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
          .nullable()
          .typeError("Stok wajib diisi")
          .integer("Stok harus bilangan bulat")
          .min(0, "Stok tidak boleh negatif")
          .max(9999, "Stok maksimal 9999")
          .required("Stok wajib diisi"),
    min_purchase: yup
      .number()
      .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
      .nullable()
      .typeError("Minimal pembelian wajib diisi")
      .integer("Minimal pembelian harus bilangan bulat")
      .min(1, "Minimal pembelian tidak boleh 0")
      .required("Minimal pembelian wajib diisi"),
    bulkStock: yup
      .number()
      .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
      .nullable()
      .typeError("Stok harus berupa angka")
      .integer("Stok harus bilangan bulat")
      .min(0, "Stok tidak boleh negatif")
      .max(9999, "Stok maksimal 9999"),
  };

  if (useVariants.value && combinations.value && combinations.value.length > 0) {
    combinations.value.forEach((_, index) => {
      baseSchema[`combination_${index}_price`] = yup
        .number()
        .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
        .nullable()
        .typeError("Harga wajib diisi")
        .min(0, "Harga minimal 0")
        .required("Harga wajib diisi");

      baseSchema[`combination_${index}_stock`] = yup
        .number()
        .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)))
        .nullable()
        .typeError("Stok wajib diisi")
        .integer("Stok harus bilangan bulat")
        .min(0, "Stok tidak boleh negatif")
        .max(9999, "Stok maksimal 9999")
        .required("Stok wajib diisi");
    });
  }

  return yup.object(baseSchema);
});

// ============================================================
// VEE-VALIDATE SETUP
// ============================================================
const { handleSubmit, errors, values, setFieldValue, validate } = useForm({
  validationSchema: schema,
  keepValuesOnUnmount: true,
  initialValues: {
    name: "",
    description: "",
    category_id: null,
    min_purchase: 1,
    sku: "",
    price: 0,
    stock: 0,
    bulkStock: null,
  },
});

// ======================================================
// WATCHERS (TETAP ADA)
// ======================================================
watch(name, (v) => setFieldValue("name", v));
watch(description, (v) => setFieldValue("description", v));

watch(selectedCategory, async (v) => {
  setFieldValue("category_id", v);
  if (v) await fetchSubCategories(v);
});

// ======================================================
// POPULATE EDIT DATA
// ======================================================
const canAddSubCategory = computed(
  () => selectedSubCategories.value.length < 4,
);

const getAvailableSubCategories = (currentIndex) => {
  return categoriesLevel2.value.filter(cat => {
    return !selectedSubCategories.value.some((selectedVal, idx) => {
      return idx !== currentIndex && selectedVal === cat.value;
    });
  });
};
const canAddAddOnGroup = computed(
  () => addOnGroups.value.length < maxAddOnGroups,
);

const combinationsExceedLimit = computed(
  () => totalCombinations.value > MAX_COMBINATIONS,
);

const allCombinationsSelected = computed(() => {
  return (
    combinations.value.length > 0 &&
    selectedCombinations.value.size === combinations.value.length
  );
});
const populateFormFromProduct = async (product) => {
  name.value = product.name;
  description.value = product.description;
  setFieldValue("min_purchase", product.min_purchase);

  // CATEGORY
  if (product.categories?.length) {
    selectedCategory.value = product.categories[0].id;
    await fetchSubCategories(selectedCategory.value);
    selectedSubCategories.value = product.categories.slice(1).map((c) => c.id);
  }

  // IMAGES
  productImages.value = product.images.map((img) => ({
    id: img.id,
    preview: img.medium_url || img.thumb_url || img.src_url,
    existing: true,
  }));
  const coverIdx = product.images.findIndex((i) => i.is_cover);
  coverImageIndex.value = coverIdx >= 0 ? coverIdx : 0;

  // VARIANTS
  if (product.options?.length) {
    useVariants.value = true;

    variants.value = product.options.map((opt) => {
      const clientKey = crypto.randomUUID();

      variantNames.value[clientKey] = opt.option_name;
      variantUsesImages.value[clientKey] = opt.uses_image ? 1 : 0;

      return {
        id: opt.id, // untuk backend
        clientKey, // untuk frontend
        name: opt.option_name,
        options: opt.values.map((v) => ({
          id: v.id,
          clientKey: crypto.randomUUID(),
          name: v.option_value,
          // useProductVariants expects `images` to be an array (max 1) with {preview,...}
          images: v?.src_url
            ? [
                {
                  id: v.id,
                  preview: v.thumb_url || v.src_url,
                  existing: true,
                  image_url: v.image_url ?? null,
                  image_path: v.image_path ?? null,
                },
              ]
            : [],
        })),
      };
    });

    if (product.variants?.length) {
      setCombinationsFromBackend(product.variants);
    }
  } else {
    // Produk tanpa variants - populate SKU, price, stock
    useVariants.value = false;

    // Jika ada 1 variant di backend (hasil dari variant OFF), ambil datanya
    if (product.variants?.length === 1) {
      const variant = product.variants[0];
      setFieldValue("sku", variant.sku || "");
      setFieldValue("price", Number(variant.price) || 0);
      setFieldValue("stock", Number(variant.stock) || 0);
    } else {
      // Fallback ke data produk langsung
      setFieldValue("sku", product.sku || "");
      setFieldValue("price", product.price || 0);
      setFieldValue("stock", product.stock || 0);
    }
  }

  // ADDONS
  if (product.addon_groups) {
    addOnGroups.value = product.addon_groups.map((g) => {
      const groupClientKey = crypto.randomUUID();

      return {
        id: g.id, // backend
        clientKey: groupClientKey, // 🔥 WAJIB
        name: g.addon_group_name,
        min_selection: g.min_selection,
        max_selection: g.max_selection,
        options: g.options.map((o) => ({
          id: o.id, // backend
          clientKey: crypto.randomUUID(), // 🔥 WAJIB
          name: o.addon.addon_name,
          price: Number(o.addon_price),
        })),
      };
    });
  }
};

// ======================================================
// FETCH DATA
// ======================================================
const fetchProductData = async () => {
  loadingData.value = true;
  try {
    if (!currentMerchantSlug.value)
      throw new Error("merchantSlug tidak ditemukan");
    const product = await fetchProductDetail(
      currentMerchantSlug.value,
      productSlug.value,
    );
    await populateFormFromProduct(product);
  } catch (error) {
    if (isDev) {
      console.error("Fetch product error:", error);
    }
    toast.error("Gagal memuat produk");
    router.push(`/merchant-center/${currentMerchantSlug.value}/products`);
  } finally {
    loadingData.value = false;
  }
};

// ======================================================
// Sync Combinations to Vee-Validate
// ======================================================
watch(
  combinations,
  (newCombos) => {
    newCombos.forEach((combo, index) => {
      setFieldValue(`combination_${index}_price`, combo.price);
      setFieldValue(`combination_${index}_stock`, combo.stock);
      setFieldValue(`combination_${index}_sku`, combo.sku);
    });
  },
  { deep: true }
);

// ======================================================
// SUBMIT (LOGIC LAMA DIPERTAHANKAN)
// ======================================================
const onSubmit = handleSubmit(
  async (values) => {
    if (!useVariants.value && values.stock > 9999) {
      toast.error("Stok tidak boleh melebihi 9999");
      return;
    }

    if (useVariants.value && totalCombinations.value > MAX_COMBINATIONS) {
      toast.error(`Kombinasi varian maksimal ${MAX_COMBINATIONS}`);
      return;
    }
    const hasTooManyAddonOptions = addOnGroups.value.some(
      (group) => group.options.length > maxAddOnOptions,
    );

    if (hasTooManyAddonOptions) {
      toast.error(`Setiap grup add-on maksimal ${maxAddOnOptions} opsi`);
      return;
    }
    // === 1) Validasi dengan Yup langsung (deterministik, gak tergantung field registration) ===
    try {
      // validasi semua field di values berdasarkan schema
      await schema.value.validate(values, { abortEarly: false });
    } catch (yupError) {
      // yupError adalah ValidationError
      const messages = (yupError.inner || [])
        .map((e) => e.message)
        .filter(Boolean);

      // fallback jika inner kosong tapi ada message tunggal
      if (messages.length === 0 && yupError.message) {
        messages.push(yupError.message);
      }

      // pastikan yang dikirim ke toast adalah string (hindari passing object)
      const firstMsg = String(
        messages[0] || "Mohon lengkapi semua field yang wajib diisi",
      );
      toast.error(firstMsg);
      return;
    }

    // === 2) Lanjut validasi kustom yang tergantung UI (gambar, variants, add-ons) ===
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
        toast.error(`Kombinasi maksimal ${MAX_COMBINATIONS}`);
        return;
      }

      const hasInvalidCombo = combinations.value.some(
        (c) => c.price < 0 || c.stock < 0,
      );
      if (hasInvalidCombo) {
        toast.error("Harga dan stok tidak boleh negatif");
        return;
      }

      const hasExcessiveStockCombo = combinations.value.some(
        (c) => c.stock > 9999,
      );
      if (hasExcessiveStockCombo) {
        toast.error("Stok variasi tidak boleh melebihi 9999");
        return;
      }
    }

    // Validasi add-on groups
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

    const oversizedImage = productImages.value.find(
      (img) => img.file && img.file.size > MAX_IMAGE_SIZE_BYTES,
    );

    if (oversizedImage) {
      toast.error(`Ukuran gambar maksimal ${MAX_IMAGE_SIZE_MB} MB`);
      return;
    }

    if (productImages.value.length > MAX_IMAGES) {
      toast.error("Maksimal upload 6 foto produk");
      return;
    }
    loading.value = true;

    try {
      const formData = new FormData();

      // Basic Info
      formData.append("_method", "PUT");
      formData.append("name", values.name);
      formData.append("description", values.description);
      formData.append("category_id", values.category_id);
      formData.append("min_purchase", values.min_purchase);

      // Sub Categories
      selectedSubCategories.value.forEach((subCat, index) => {
        formData.append(`sub_categories[${index}]`, subCat);
      });

      // ✅ Images - separate existing and new
      let existingIndex = 0;
      let newIndex = 0;

      productImages.value.forEach((img, index) => {
        if (img.existing) {
          formData.append(`existing_images[${existingIndex}][id]`, img.id);
          formData.append(`existing_images[${existingIndex}][order]`, index);
          formData.append(
            `existing_images[${existingIndex}][is_cover]`,
            index === coverImageIndex.value ? 1 : 0,
          );
          existingIndex++;
        } else {
          formData.append(`images[${newIndex}][file]`, img.file);
          formData.append(`images[${newIndex}][order]`, index);
          newIndex++;
        }
      });

      formData.append("cover_image_index", coverImageIndex.value);

      // ✅ Variants or direct pricing (SAMA SEPERTI CREATE)
      if (useVariants.value) {
        variants.value.forEach((variant, vIndex) => {
          if (variant.id) {
            formData.append(`variants[${vIndex}][id]`, variant.id);
          }
          formData.append(`variants[${vIndex}][name]`, variant.name);
          formData.append(
            `variants[${vIndex}][uses_images]`,
            variantUsesImages.value[variant.clientKey] || 0,
          );

          variant.options.forEach((opt, oIndex) => {
            if (opt.name.trim()) {
              if (opt.id) {
                formData.append(
                  `variants[${vIndex}][options][${oIndex}][id]`,
                  opt.id,
                );
              }
              formData.append(
                `variants[${vIndex}][options][${oIndex}][name]`,
                opt.name.trim(),
              );

              if (
                variantUsesImages.value[variant.clientKey] === 1 &&
                opt.images.length > 0
              ) {
                opt.images.forEach((img, iIndex) => {
                  if (img.existing) {
                    formData.append(
                      `variants[${vIndex}][options][${oIndex}][existing_images][${iIndex}][id]`,
                      img.id,
                    );
                  } else {
                    formData.append(
                      `variants[${vIndex}][options][${oIndex}][images][${iIndex}][file]`,
                      img.file,
                    );
                  }
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
          // If this combination comes from backend, keep the id so BE updates (no delete+recreate)
          if (combo.id)
            formData.append(`combinations[${cIndex}][id]`, combo.id);
          formData.append(`combinations[${cIndex}][sku]`, combo.sku || "");
          formData.append(`combinations[${cIndex}][price]`, combo.price);
          formData.append(`combinations[${cIndex}][stock]`, combo.stock);

          // 🔑 attributes pakai option_value_id
          combo.attributes.forEach((attr, aIndex) => {
            if (attr.option_value_id) {
              formData.append(
                `combinations[${cIndex}][attributes][${aIndex}][option_value_id]`,
                attr.option_value_id,
              );
            }
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
        formData.append("sku", values.sku || "");
        formData.append("price", values.price);
        formData.append("stock", values.stock);
      }

      // ✅ Add-on groups (SAMA SEPERTI CREATE)
      addOnGroups.value.forEach((group, gIndex) => {
        if (group.name.trim()) {
          if (Number.isInteger(group.id)) {
            formData.append(`add_on_groups[${gIndex}][id]`, group.id);
          }
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
              if (Number.isInteger(opt.id)) {
                formData.append(
                  `add_on_groups[${gIndex}][options][${oIndex}][id]`,
                  opt.id,
                );
              }
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

      if (!currentMerchantSlug.value)
        throw new Error("merchantSlug tidak ditemukan");

      // Laravel route expects PUT/PATCH; use method override for multipart
      if (typeof formData.has === "function" && !formData.has("_method")) {
        formData.append("_method", "PUT");
      }

      // ✅ API Call (via composable)
      await editProduct(currentMerchantSlug.value, productSlug.value, formData);

      // Redirect setelah update
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
      } else {
        // ✅ Show detailed error message
        const errorMsg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Gagal memperbarui produk";

        toast.error(errorMsg);
      }
    } finally {
      loading.value = false;
    }
  },
  (errorsFromVee) => {
    // Helper: ambil pesan string pertama dari berbagai shape error
    function getFirstErrorMessage(errObj) {
      if (!errObj) return null;

      // jika sudah string
      if (typeof errObj === "string") return errObj;

      // jika ada field 'errors' yang berupa object mapping field -> message(s)
      if (errObj.errors && typeof errObj.errors === "object") {
        const vals = Object.values(errObj.errors);
        for (const v of vals) {
          if (typeof v === "string") return v;
          if (Array.isArray(v) && v.length) return String(v[0]);
          if (v && v.message) return String(v.message);
        }
      }

      // jika ada 'results' (vee-validate might provide nested result objects)
      if (errObj.results && typeof errObj.results === "object") {
        const vals = Object.values(errObj.results);
        for (const r of vals) {
          // many shapes: r may have .errors (array) or .message
          if (r && r.errors && Array.isArray(r.errors) && r.errors.length)
            return String(r.errors[0]);
          if (r && r.message) return String(r.message);
        }
      }

      // fallback: try to flatten top-level object values
      if (typeof errObj === "object") {
        const vals = Object.values(errObj);
        for (const v of vals) {
          if (typeof v === "string") return v;
          if (Array.isArray(v) && v.length && typeof v[0] === "string")
            return v[0];
          if (v && typeof v === "object") {
            // dive one level
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

    // Pastikan kita kirim string, bukan object
    toast.error(String(firstMsg));
  },
);

// ======================================================
// LIFECYCLE
// ======================================================
onMounted(async () => {
  await fetchLevel1Categories();
  await fetchProductData();
});
const breadcrumbItems = computed(() => [
  {
    label: "Produk",
    path: `/merchant-center/${currentMerchantSlug.value}/products`,
  },
  {
    label: "Edit Produk",
  },
]);
const formMinPurchase = computed({
  get: () => values.min_purchase,
  set: (val) => setFieldValue("min_purchase", val),
});
</script>

<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader title="Edit Produk" />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-30 hidden py-6 bg-gray-50 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-6 lg:px-8 gap-y-2 gap-x-4"
      >
        <div>
          <!-- ✅ Use Breadcrumb Component -->
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="text-xs text-muted-foreground lg:text-sm">
            {{ loadingData ? "Memuat data produk..." : name || "Edit Produk" }}
          </p>
        </div>

        <div v-if="!loadingData" class="flex items-center gap-3">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :loading="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile -->
    <div class="h-[72px] sm:h-0"></div>

    <!-- ✅ Loading State - IMPROVED -->
    <div
      v-if="loadingData"
      class="flex flex-col items-center justify-center gap-3 py-20"
    >
      <div
        class="w-12 h-12 border-4 border-gray-300 rounded-full border-t-merchant-primary animate-spin"
      ></div>
      <p class="text-sm text-muted-foreground">Memuat data produk...</p>
    </div>

    <!-- ✅ Content (Only show when data loaded) -->
    <div v-else class="px-4 pt-4 mx-auto sm:px-6 sm:py-6 sm:pt-0">
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

      <Form ref="formRef" :validation-schema="schema" @submit="onSubmit">
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

          <div
            class="grid grid-cols-3 gap-3 mb-3 sm:grid-cols-4 lg:grid-cols-6"
          >
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

              <div
                class="absolute flex items-center justify-center w-6 h-6 rounded-full pointer-events-none top-2 right-2 bg-black/60"
              >
                <i class="text-xs text-white pi pi-arrows-alt"></i>
              </div>

              <div
                v-if="index === coverImageIndex"
                class="absolute top-2 left-2 px-2 py-1 bg-merchant-primary text-white text-[10px] font-semibold rounded-full flex items-center gap-1"
              >
                <i class="pi pi-star-fill"></i>
                <span>Cover</span>
              </div>

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
            placeholder="Contoh: Sandal Jepit"
            v-model="name"
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

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              name="category_id"
              label="Kategori Utama"
              :options="categoriesLevel1"
              v-model="selectedCategory"
              :loading="loadingLevel1"
              required
            />

            <div v-if="selectedCategory">
              <label class="block mb-2 text-sm font-bold text-black">
                Sub Kategori
                <span class="text-xs font-normal text-muted-foreground"
                  >(Maks. 4)</span
                >
              </label>

              <!-- ✅ Loading State for Level 2 -->
              <div
                v-if="loadingLevel2"
                class="px-3 py-4 text-center border border-gray-200 rounded-lg bg-gray-50"
              >
                <div
                  class="w-5 h-5 mx-auto mb-2 border-2 border-gray-300 rounded-full border-t-merchant-primary animate-spin"
                ></div>
                <p class="text-xs text-muted-foreground">
                  Memuat sub kategori...
                </p>
              </div>

              <!-- ✅ Empty State -->
              <div
                v-else-if="!loadingLevel2 && categoriesLevel2.length === 0"
                class="px-3 py-4 text-center border border-gray-200 rounded-lg bg-gray-50"
              >
                <i class="block mb-2 text-2xl text-gray-300 pi pi-inbox"></i>
                <p class="text-xs text-gray-500">
                  Tidak ada sub kategori tersedia
                </p>
              </div>

              <!-- ✅ Sub Categories List -->
              <div v-else class="space-y-2">
                <div class="mb-2 space-y-2">
                  <div
                    v-for="(subCat, index) in selectedSubCategories"
                    :key="index"
                    class="flex items-center gap-2"
                  >
                    <div class="flex-1">
                      <SelectField
                        :name="`sub_category_${index}`"
                        :options="getAvailableSubCategories(index)"
                        v-model="selectedSubCategories[index]"
                        placeholder="Pilih sub kategori"
                        variant="merchant"
                      />
                    </div>
                    <button
                      @click="selectedSubCategories.splice(index, 1)"
                      type="button"
                      class="flex items-center justify-center transition w-9 h-9 rounded-xl bg-danger-background text-danger-foreground hover:bg-red-100"
                    >
                      <i class="text-sm pi pi-trash"></i>
                    </button>
                  </div>
                </div>

                <button
                  v-if="canAddSubCategory"
                  @click="selectedSubCategories.push('')"
                  type="button"
                  class="flex items-center gap-1 text-sm font-medium text-merchant-primary hover:underline"
                >
                  <i class="text-xs pi pi-plus"></i>
                  Tambah Sub Kategori
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pengaturan Varian -->
        <div
          class="p-4 mb-2 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <label
            @click="useVariants = !useVariants"
            class="flex items-center justify-between cursor-pointer"
          >
            <div>
              <h3 class="text-sm font-semibold text-black">Gunakan Variasi</h3>
              <p class="text-xs text-muted-foreground">
                Produk dengan ukuran, warna, dll
              </p>
            </div>

            <div
              :class="[
                'relative w-11 h-6 rounded-full transition',
                useVariants ? 'bg-merchant-primary' : 'bg-gray-300',
              ]"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  useVariants ? 'translate-x-6' : 'translate-x-1',
                ]"
              ></span>
            </div>
          </label>
        </div>

        <!-- Variasi Section (jika useVariants true) -->
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
              @click="addVariantEdit"
              type="button"
              class="flex items-center gap-1 text-sm text-merchant-primary hover:underline"
            >
              <i class="pi pi-plus"></i>
              Tambah
            </button>
          </div>

          <!-- Variants Grid - PERBAIKAN TextField dengan v-model unik -->
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              v-for="(variant, vIndex) in variants"
              :key="variant.clientKey"
              class="overflow-hidden transition bg-white border-2 border-gray-200 rounded-xl hover:border-merchant-primary/50"
            >
              <!-- Variant Header -->
              <div class="p-4 space-y-4 bg-white">
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

                <!-- PERBAIKAN: TextField dengan name unique per variant -->
                <div>
                  <TextField
                    :name="`variant_name_${variant.clientKey}`"
                    type="text"
                    v-model="variantNames[variant.clientKey]"
                    @input="variant.name = variantNames[variant.clientKey]"
                    :label="`Nama Varian`"
                    :placeholder="`Contoh: ${
                      vIndex === 0 ? 'Warna' : 'Ukuran'
                    }`"
                    required
                  />
                </div>

                <div v-if="vIndex === 0">
                  <label
                    @click="toggleVariantImages(variant.clientKey)"
                    class="flex items-center justify-between px-4 py-3 transition border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div class="flex items-center gap-2">
                      <i class="pi pi-image text-merchant-primary"></i>
                      <span class="text-sm font-medium text-gray-700"
                        >Gunakan foto untuk varian ini</span
                      >
                    </div>
                    <div
                      :class="[
                        'relative w-11 h-6 rounded-full transition shrink-0',
                        variantUsesImages[variant.clientKey]
                          ? 'bg-merchant-primary'
                          : 'bg-gray-300',
                      ]"
                    >
                      <span
                        :class="[
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          variantUsesImages[variant.clientKey]
                            ? 'translate-x-6'
                            : 'translate-x-1',
                        ]"
                      ></span>
                    </div>
                  </label>
                </div>

                <!-- Accordion Toggle -->
                <button
                  @click="toggleVariantExpand(variant.clientKey)"
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
                      isVariantExpanded(variant.clientKey)
                        ? 'pi-chevron-up'
                        : 'pi-chevron-down',
                    ]"
                  ></i>
                </button>
              </div>

              <!-- Accordion Content - tetap sama seperti sebelumnya -->
              <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="max-h-[2000px] opacity-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-[2000px] opacity-100"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="isVariantExpanded(variant.clientKey)"
                  class="overflow-hidden border-t border-gray-200"
                >
                  <div class="p-4 pt-3 space-y-3 bg-gray-50">
                    <div
                      class="flex items-center justify-between pb-2 border-b border-gray-300"
                    >
                      <label
                        class="text-xs font-bold tracking-wide text-black uppercase"
                      >
                        Daftar Opsi
                      </label>
                      <button
                        @click="addOptionEdit(vIndex)"
                        type="button"
                        class="flex items-center gap-1 text-xs font-semibold text-merchant-primary hover:underline"
                      >
                        <i class="pi pi-plus text-[10px]"></i>
                        Tambah
                      </button>
                    </div>

                    <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      <div
                        v-for="(option, oIndex) in variant.options"
                        :key="option.clientKey || option.id"
                        class="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5 hover:shadow-md transition-shadow"
                      >
                        <div class="flex items-start gap-2.5">
                          <div
                            class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          >
                            {{ oIndex + 1 }}
                          </div>
                          <div class="flex-1 space-y-2.5">
                            <input
                              v-model="option.name"
                              type="text"
                              :placeholder="`Contoh: ${
                                vIndex === 0 ? 'Merah' : 'S'
                              }`"
                              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-merchant-primary focus:border-transparent placeholder:text-muted-foreground bg-white"
                            />

                            <div
                              v-if="
                                vIndex === 0 &&
                                variantUsesImages[variant.clientKey]
                              "
                            >
                              <label
                                class="text-xs font-semibold text-gray-600 mb-1.5 block"
                              >
                                Foto Opsi
                              </label>

                              <div
                                v-if="
                                  option.images.length > 0 || option.src_url
                                "
                                class="relative w-20 h-20 overflow-hidden border-2 border-gray-200 rounded-lg group"
                              >
                                <img
                                  :src="
                                    option.images?.[0]?.preview ||
                                    option.src_url
                                  "
                                  class="object-cover w-full h-full"
                                />
                                <button
                                  v-if="option.images.length > 0"
                                  @click="removeOptionImage(vIndex, oIndex, 0)"
                                  type="button"
                                  class="absolute inset-0 flex items-center justify-center transition opacity-0 bg-black/60 group-hover:opacity-100"
                                >
                                  <i class="text-sm text-white pi pi-trash"></i>
                                </button>
                              </div>

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

                    <button
                      @click="addOptionEdit(vIndex)"
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
              <button
                @click="openCombinationsModal"
                type="button"
                :disabled="totalCombinations === 0"
                class="w-full sm:w-auto px-5 py-2.5 bg-merchant-primary text-white text-sm font-semibold rounded-lg hover:bg-merchant-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm"
              >
                <i class="mr-2 pi pi-cog"></i>
                Atur Harga & Stok
              </button>
            </div>
            <p
              v-if="combinationsExceedLimit"
              class="flex items-center gap-1 mt-2 text-xs font-medium text-danger-foreground"
            >
              <i class="pi pi-exclamation-triangle"></i>
              Kombinasi melebihi batas maksimal ({{ maxOptions }}) Kombinasi
              melebihi batas maksimal ({{ MAX_COMBINATIONS }})
            </p>
          </div>
        </div>

        <!-- Harga & Stok (tanpa variasi) -->
        <div
          v-if="!useVariants"
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-tag text-merchant-primary"></i>
            Harga & Stok
          </h3>
          <TextField
            name="sku"
            label="SKU (Opsional)"
            type="text"
            placeholder="Contoh: PRD-001"
            v-model="formSku"
          />
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- ✅ FIXED: Gunakan computed v-model -->

            <TextField
              name="price"
              label="Harga"
              type="number"
              placeholder="0"
              prefix="Rp"
              v-model="formPrice"
              required
            />
            <TextField
              name="stock"
              label="Stok"
              type="number"
              placeholder="0"
              min="0"
              max="9999"
              v-model="formStock"
              required
            />
          </div>
        </div>

        <!-- TAMBAHKAN: Add-on Groups Section -->
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
              @click="addAddOnGroupEdit"
              type="button"
              class="flex items-center gap-1 text-sm font-semibold text-merchant-primary hover:underline"
            >
              <i class="pi pi-plus"></i>
              Tambah
            </button>
          </div>

          <!-- Grid Layout untuk Desktop -->
          <div
            v-if="addOnGroups.length > 0"
            class="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div
              v-for="(group, gIndex) in addOnGroups"
              :key="group.clientKey"
              class="overflow-hidden transition bg-white border-2 border-gray-200 rounded-xl hover:border-merchant-primary/50"
            >
              <!-- Group Header -->
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
                      class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
                    >
                      <i class="pi pi-list text-[10px]"></i>
                      {{ group.min_selection }}-{{ group.max_selection }}
                      pilihan
                    </span>
                  </div>
                  <button
                    @click="removeAddOnGroupEdit(gIndex)"
                    type="button"
                    class="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 bg-danger-background text-danger-foreground hover:bg-red-100"
                  >
                    <i class="text-sm pi pi-trash"></i>
                  </button>
                </div>

                <!-- Group Name -->
                <TextField
                  :name="`addon_group_name_${group.clientKey}`"
                  v-model="group.name"
                  label="Nama Grup Add-on"
                  placeholder="Contoh: Tingkat Kepedasan, Topping"
                  required
                />

                <!-- Settings -->
                <div class="space-y-2">
                  <!-- Min/Max Selection -->
                  <div
                    class="p-3 space-y-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <label class="block text-xs font-semibold text-gray-700">
                      Aturan Pemilihan
                    </label>

                    <div class="grid grid-cols-2 gap-3">
                      <!-- Min Selection -->
                      <div>
                        <TextField
                          :name="`addon_group_${group.clientKey}_min_selection`"
                          label="Minimal Pilihan"
                          v-model.number="group.min_selection"
                          type="number"
                          min="0"
                          :max="group.max_selection"
                          placeholder="0"
                          suffix="opsi"
                          :labelBold="false"
                        />
                        <p class="text-[10px] text-gray-500 mt-1">
                          0 = opsional
                        </p>
                      </div>

                      <!-- Max Selection -->
                      <div>
                        <TextField
                          :name="`addon_group_${group.clientKey}_max_selection`"
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
                </div>

                <!-- Accordion Toggle Button -->
                <button
                  @click="toggleAddOnGroupExpand(group.clientKey)"
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
                      isAddOnGroupExpandedEdit(group.clientKey)
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
                  v-if="isAddOnGroupExpandedEdit(group.clientKey)"
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
                        @click="addAddOnOptionEdit(gIndex)"
                        type="button"
                        :disabled="group.options.length >= maxAddOnOptions"
                        class="flex items-center gap-1 text-xs font-semibold text-merchant-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i class="pi pi-plus text-[10px]"></i>
                        Tambah
                      </button>
                    </div>

                    <!-- Options List -->
                    <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      <div
                        v-for="(option, oIndex) in group.options"
                        :key="option.clientKey"
                        class="p-3 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
                      >
                        <div class="flex items-start gap-2.5">
                          <div
                            class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          >
                            {{ oIndex + 1 }}
                          </div>

                          <div class="flex-1 space-y-2.5">
                            <!-- Option Name -->
                            <TextField
                              :name="`addon_group_${group.clientKey}_option_${option.clientKey}_name`"
                              v-model="option.name"
                              :placeholder="`Contoh: ${
                                gIndex === 0 ? 'Tidak Pedas' : 'Daging Asap'
                              }`"
                              :hideLabel="true"
                              variant="primary"
                            />

                            <!-- Price -->
                            <TextField
                              :name="`addon_group_${group.clientKey}_option_${option.clientKey}_price`"
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

                    <!-- Add Option Button -->
                    <button
                      @click="addAddOnOptionEdit(gIndex)"
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

          <!-- Empty State -->
          <div
            v-else
            class="px-4 py-8 text-center border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
          >
            <i class="block mb-3 text-4xl text-gray-300 pi pi-plus-circle"></i>
            <p class="mb-3 text-sm text-gray-500">
              Belum ada grup add-on ditambahkan
            </p>
            <button
              @click="addAddOnGroupEdit"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition rounded-lg bg-merchant-primary hover:bg-merchant-primary/90"
            >
              <i class="pi pi-plus"></i>
              Tambah Grup Pertama
            </button>
          </div>
        </div>

        <!-- Min Purchase & Condition -->
        <div
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <TextField
            name="min_purchase"
            label="Minimal Jumlah Pembelian"
            type="number"
            placeholder="1"
            v-model="formMinPurchase"
            required
          />
        </div>

        <!-- Submit Button Desktop -->
        <div class="justify-end hidden gap-3 sm:flex">
          <Button type="submit" variant="merchant" size="md" :loading="loading">
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>

        <!-- Submit Button Mobile -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <Button type="submit" :loading="loading" variant="merchant" block>
            Simpan Perubahan
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
      :show-footer="true"
      @close="closeCombinationsModal"
    >
      <!-- Bulk Edit Section -->
      <div
        class="p-4 mb-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
      >
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

      <!-- Combinations List -->
      <div class="space-y-4">
        <div
          v-for="(combo, cIndex) in combinations"
          :key="cIndex"
          @click="toggleCombinationSelection(cIndex)"
          class="p-4 transition bg-white border-2 cursor-pointer rounded-xl hover:shadow-md"
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
            <TextField
              label="SKU (Opsional)"
              :name="`combination_${cIndex}_sku`"
              v-model="combo.sku"
              type="text"
              placeholder="Masukkan SKU"
              :labelBold="false"
            />

            <div class="grid grid-cols-2 gap-3">
              <TextField
                label="Harga"
                :name="`combination_${cIndex}_price`"
                v-model.number="combo.price"
                type="number"
                min="0"
                placeholder="0"
                prefix="Rp"
                :labelBold="false"
                required
              />

              <TextField
                label="Stok"
                :name="`combination_${cIndex}_stock`"
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

      <!-- Footer -->
      <template #footer>
        <Button
          @click="closeCombinationsModal"
          type="button"
          variant="merchant"
          block
        >
          Selesai
        </Button>
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
</style>
