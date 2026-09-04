// composables/useProducts.js
import { ref } from "vue";
import * as ProductService from "@/services/api/product";
import { useToast } from "vue-toastification";
import { saveBlob } from "@/libs/saveBlob.js";

export function useProducts() {
  const isDev = import.meta.env.DEV;
  const toast = useToast();
  const products = ref([]);
  const loading = ref(false);
  const loadingFetchProducts = ref(true);
  const loadingExport = ref(false);
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Track last request to prevent duplicates
  let lastRequestParams = null;
  let pendingRequest = null;

  /* =====================================================
   * UMKM OWNER METHODS
   * ===================================================== */
  const fetchProducts = async ({
    merchantSlug,
    searchQuery = "",
    status = "",
    category = "",
    minPrice = null,
    maxPrice = null,
    minStock = null,
    maxStock = null,
    sortBy = "newest",
    perPage = 10,
    page = 1,
  } = {}) => {
    if (!merchantSlug) {
      toast.error("Merchant slug diperlukan untuk memuat produk");
      return;
    }

    const requestSignature = JSON.stringify({
      merchantSlug,
      searchQuery,
      status,
      category,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      sortBy,
      perPage,
      page,
    });

    // jika request sedang berjalan dengan signature sama, kembalikan promise yang sama
    if (
      loadingFetchProducts.value &&
      lastRequestParams === requestSignature &&
      pendingRequest
    ) {
      return pendingRequest;
    }

    // jika request sama dengan request terakhir yang selesai -> pakai cache lokal
    if (lastRequestParams === requestSignature && !loadingFetchProducts.value) {
      return { data: products.value, meta: pagination.value };
    }

    lastRequestParams = requestSignature;
    loadingFetchProducts.value = true;

    const params = {
      q: searchQuery || undefined,
      status: status || undefined,
      category_id: category || undefined,
      min_price: minPrice ?? undefined,
      max_price: maxPrice ?? undefined,
      min_stock: minStock ?? undefined,
      max_stock: maxStock ?? undefined,
      sort_by: sortBy || "newest",
      per_page: perPage,
      page,
    };
    Object.keys(params).forEach(
      (k) => params[k] === undefined && delete params[k],
    );

    // Buat pendingRequest sebagai promise yang mengembalikan `data` (konsisten)
    pendingRequest = (async () => {
      try {
        const data = await ProductService.getProducts(merchantSlug, params);
        const payload = data.data || data;

        products.value = payload.data || payload;

        if (data.meta) {
          pagination.value = {
            current_page: data.meta.current_page,
            last_page: data.meta.last_page,
            per_page: data.meta.per_page,
            total: data.meta.total,
          };
        }

        return data;
      } catch (error) {
        toast.error("Gagal memuat produk");
        lastRequestParams = null;
        throw error;
      } finally {
        loadingFetchProducts.value = false;
        pendingRequest = null;
      }
    })();

    return pendingRequest;
  };

  const fetchProductDetail = async (merchantSlug, productSlug) => {
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      const payload = await ProductService.getProductDetail(
        merchantSlug,
        productSlug,
      );
      if (!payload) throw new Error("Product data tidak ditemukan");

      // Normalisasi struktur agar konsisten dipakai component (camelCase)
      const data = payload.data ?? payload;

      // BE mengirim snake_case: addon_groups
      if (data?.addon_groups && !data.addonGroups) {
        data.addonGroups = data.addon_groups;
      }

      // Pastikan images selalu array
      if (!Array.isArray(data?.images)) {
        data.images = data.images ? [data.images] : [];
      }

      return data;
    } catch (err) {
      toast.error("Gagal memuat detail produk");
      throw err;
    }
  };

  const exportPDF = async (merchantSlug, params = {}) => {
    if (loadingExport.value) return;
    loadingExport.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      const res = await ProductService.exportPDF(merchantSlug, params);

      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename =
        match?.[1] ||
        `products-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, "")}.pdf`;

      saveBlob(res.data, filename);
      toast.success("Export PDF berhasil diunduh");
    } catch (err) {
      if (err.response?.data instanceof Blob && err.response.data.type?.includes("json")) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          toast.error(json.message || "Gagal export PDF");
        } catch {
          toast.error("Gagal export PDF");
        }
      } else {
        toast.error(err.response?.data?.message || "Gagal export PDF");
      }
      throw err;
    } finally {
      loadingExport.value = false;
    }
  };

  const exportExcel = async (merchantSlug, params = {}) => {
    if (loadingExport.value) return;
    loadingExport.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      const res = await ProductService.exportExcel(merchantSlug, params);

      // Ambil nama file dari header jika ada
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename =
        match?.[1] ||
        `products-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, "")}.xlsx`;

      saveBlob(res.data, filename);
      toast.success("Export Excel berhasil diunduh");
    } catch (err) {
      if (err.response?.data instanceof Blob && err.response.data.type?.includes("json")) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          toast.error(json.message || "Gagal export Excel");
        } catch {
          toast.error("Gagal export Excel");
        }
      } else {
        toast.error(err.response?.data?.message || "Gagal export Excel");
      }
      throw err;
    } finally {
      loadingExport.value = false;
    }
  };

  const createProduct = async (merchantSlug, payload) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      if (!payload) throw new Error("payload diperlukan");

      const res = await ProductService.createProduct(merchantSlug, payload);

      // Normalize possible shapes
      const created = res?.data?.data ?? res?.data ?? res;

      // Optimistic update local list if it looks like a product object
      if (created && typeof created === "object" && !Array.isArray(created)) {
        const slug = created.slug;
        if (slug && !products.value.some((p) => p?.slug === slug)) {
          products.value = [created, ...products.value];
          pagination.value.total = Number(pagination.value.total || 0) + 1;
        }
      }

      toast.success("Produk berhasil ditambahkan");
      return created;
    } catch (error) {
      if (isDev) {
        console.error("[useProducts] createProduct failed:", error);
      }
      toast.error(error.response?.data?.message || "Gagal menambahkan produk");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const editProduct = async (merchantSlug, productSlug, payload) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      if (!productSlug) throw new Error("productSlug diperlukan");
      if (!payload) throw new Error("payload diperlukan");

      const res = await ProductService.editProduct(
        merchantSlug,
        productSlug,
        payload,
      );

      const updated = res?.data?.data ?? res?.data ?? res;

      // Try to keep local list in sync if possible
      if (updated && typeof updated === "object" && !Array.isArray(updated)) {
        const updatedSlug = updated.slug ?? productSlug;
        const idx = products.value.findIndex((p) => p?.slug === updatedSlug);
        if (idx !== -1) {
          products.value[idx] = { ...products.value[idx], ...updated };
        }
      }

      toast.success("Produk berhasil diperbarui");
      return updated;
    } catch (error) {
      if (isDev) {
        console.error("[useProducts] editProduct failed:", error);
      }
      toast.error(error.response?.data?.message || "Gagal memperbarui produk");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const deleteProduct = async (merchantSlug, productSlug) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      await ProductService.deleteProduct(merchantSlug, productSlug);
      products.value = products.value.filter((p) => p.slug !== productSlug);
      pagination.value.total = Math.max(0, pagination.value.total - 1);
      toast.success("Produk berhasil dihapus");
    } catch (error) {
      toast.error("Gagal menghapus produk");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const updateProductStatus = async (merchantSlug, productSlug, status) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      await ProductService.editStatus(merchantSlug, productSlug, status);
      const index = products.value.findIndex((p) => p.slug === productSlug);
      if (index !== -1) products.value[index].status = status;
    } catch (error) {
      if (isDev) {
        console.error(error);
      }
      toast.error("Gagal memperbarui status produk");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const bulkDeleteProducts = async (merchantSlug, productSlugs) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      await ProductService.deleteBulk(merchantSlug, productSlugs);
      products.value = products.value.filter(
        (p) => !productSlugs.includes(p.slug),
      );
      pagination.value.total = Math.max(
        0,
        pagination.value.total - productSlugs.length,
      );
    } catch (error) {
      toast.error("Gagal menghapus produk secara massal");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const bulkUpdateStatus = async (merchantSlug, productSlugs, status) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      await ProductService.editBulkStatus(merchantSlug, productSlugs, status);
      products.value.forEach((product) => {
        if (productSlugs.includes(product.slug)) {
          product.status = status;
        }
      });
    } catch (error) {
      toast.error("Gagal memperbarui status produk secara massal");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /* =====================================================
   * PUBLIC
   * ===================================================== */
  const fetchPublicProductDetail = async (slug) => {
    loading.value = true;
    try {
      if (!slug || typeof slug !== "string") throw new Error("Invalid slug");

      const payload = await ProductService.getPublicProductDetail(slug);

      const productObj = payload.data?.product ?? null;
      const merchantObj = payload.data?.merchant ?? null;
      if (!productObj) {
        return {
          product: null,
          price_range: { min: null, max: null },
          total_stock: 0,
          has_variants: false,
          has_addons: false,
          combinations: [],
          option_labels: { option1: null, option2: null },
          min_purchase: 1,
          merchant_address: null,
          related_products: [],
          productImages: [],
          sizes: [],
          variants: [],
          stockCombinations: [],
          selectedSize: null,
          selectedVariant: null,
          addonGroups: [],
          selectedAddons: [],
        };
      }

      // Keep compatibility with existing UI code that still reads product.merchant
      // (merchant is no longer nested in API response under product)
      if (merchantObj && !productObj.merchant) {
        productObj.merchant = merchantObj;
      }

      // mapping (sama seperti implementasimu)
      const variantsFromBackend = productObj.variants ?? [];

      // price_range is now provided by API under product.price_range
      // fallback: derive from variants.price
      const derivedMin = variantsFromBackend.length
        ? Math.min(...variantsFromBackend.map((v) => Number(v.price ?? 0)))
        : null;
      const derivedMax = variantsFromBackend.length
        ? Math.max(...variantsFromBackend.map((v) => Number(v.price ?? 0)))
        : null;

      const apiPriceRange =
        productObj.price_range ?? productObj.priceRange ?? null;
      const priceRange = {
        min: apiPriceRange?.min ?? derivedMin,
        max: apiPriceRange?.max ?? derivedMax,
      };

      const imgs = Array.isArray(productObj.images)
        ? productObj.images.slice()
        : [];
      imgs.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const productImages = imgs.length
        ? imgs.map((img) => img?.src_url || null).filter(Boolean)
        : productObj.cover_image?.src_url
          ? [productObj.cover_image.src_url]
          : [];

      const options = Array.isArray(productObj.options)
        ? productObj.options
        : [];
      const opt1 = options[0] ?? null;
      const opt2 = options[1] ?? null;

      const sizesRes = (opt1?.values ?? [])
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((v) => ({ id: v.id, name: v.option_value, priceAdd: 0 }));
      const variantsRes = (opt2?.values ?? [])
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((v) => ({ id: v.id, name: v.option_value, priceAdd: 0 }));

      // combinations is now provided by API under product.combinations
      const rawCombinations = Array.isArray(productObj.combinations)
        ? productObj.combinations
        : Array.isArray(payload.data?.combinations)
          ? payload.data?.combinations
          : [];
      const combinations = rawCombinations.map((c) => ({
        product_variant_id: c.product_variant_id ?? null,
        sizeId: Number(c.sizeId ?? 0),
        variantId: Number(c.variantId ?? 0),
        price: Number(c.price ?? productObj.price ?? 0),
        stock: Number(c.stock ?? 0),
        sku: c.sku ?? null,
      }));

      const stockCombinations = combinations.map((c) => ({ ...c }));

      const sizeWithStock = sizesRes.find((s) =>
        stockCombinations.some(
          (c) => Number(c.sizeId) === Number(s.id) && Number(c.stock) > 0,
        ),
      );
      const selectedSize = sizeWithStock ?? sizesRes[0] ?? null;

      let selectedVariant = null;
      if (variantsRes.length > 0) {
        const sizeKey = selectedSize?.id ?? 0;
        const variantWithStock = variantsRes.find((v) =>
          stockCombinations.some(
            (c) =>
              Number(c.sizeId) === Number(sizeKey) &&
              Number(c.variantId) === Number(v.id) &&
              Number(c.stock) > 0,
          ),
        );
        selectedVariant = variantWithStock ?? variantsRes[0] ?? null;
      }
      // 1) normalisasi option values pada productObj.options (simpan image_url/image_path)
      const normalizedOptions = options.map((opt) => ({
        id: opt.id, // product_option id (group)
        product_id: opt.product_id,
        option_name: opt.option_name ?? opt.name,
        uses_image: !!opt.uses_image,
        values: (opt.values ?? []).map((v) => {
          const preview =
            v.src_url ||
            v.image_url ||
            (v.image_path
              ? typeof absoluteImagePath === "function"
                ? absoluteImagePath(v.image_path)
                : _absoluteImagePath(v.image_path)
              : null) ||
            null;

          return {
            // KEEP db id here — this is the DB identifier we will use for image endpoint
            dbId: v.id, // <-- sangat penting: id dari DB (product_option_value.id)
            id: v.id, // juga keep id if other code expects it
            product_option_id: v.product_option_id,
            option_value: v.option_value,
            image_path: v.image_path ?? null,
            image_url: v.src_url ?? v.image_url ?? null,
            src_url: v.src_url ?? null,
            preview, // convenience
          };
        }),
      }));

      // 2) normalisasi variants: buat property `options` yang dipakai template
      // backend punya `option_values` (lihat payload). Map itu ke struktur yang template pakai.
      const normalizedVariants = (productObj.variants ?? []).map((v) => {
        const optionValues = v.option_values ?? v.optionValues ?? [];
        const optionsForTemplate = optionValues.map((val) => {
          const preview =
            val.image_url ||
            (val.image_path
              ? typeof absoluteImagePath === "function"
                ? absoluteImagePath(val.image_path)
                : _absoluteImagePath(val.image_path)
              : null) ||
            null;

          const imagesArray = [];
          if (preview) {
            imagesArray.push({
              preview,
              image_url: val.image_url ?? null,
              image_path: val.image_path ?? null,
              existing: true,
            });
          }

          return {
            // CRITICAL: use DB id here so getVariantImageUrl works with val.id
            dbId: val.id,
            id: val.id, // keep for compatibility
            name: val.option_value ?? val.name ?? "",
            image_path: val.image_path ?? null,
            image_url: val.image_url ?? null,
            images: imagesArray,
          };
        });

        return {
          ...v,
          display_image: v.display_image ?? null,
          options: optionsForTemplate,
        };
      });

      const addonGroups =
        Array.isArray(productObj.addon_groups) && productObj.addon_groups.length
          ? productObj.addon_groups.map((g) => ({
              id: g.id,
              name: g.addon_group_name || g.name,
              description: g.description || null,
              required: Number(g.min_selection ?? 0) > 0,
              maxSelection: Number(g.max_selection ?? 1),
              items: Array.isArray(g.options)
                ? g.options.map((opt) => ({
                    id: opt.id,
                    addon_id: opt.addon_id,
                    name: opt.addon?.addon_name || opt.name,
                    price: Number(opt.addon_price ?? 0),
                    description: opt.description || null,
                    available:
                      opt.addon_stock == null || Number(opt.addon_stock) > 0,
                  }))
                : [],
            }))
          : [];

      const selectedAddons = [];
      if (addonGroups.length) {
        addonGroups.forEach((group) => {
          if (
            group.required &&
            group.maxSelection === 1 &&
            group.items.length
          ) {
            const firstAvailable = group.items.find((it) => it.available);
            if (firstAvailable) selectedAddons.push(firstAvailable);
          }
        });
      }

      // API no longer provides primary_address here; keep null unless future payload adds it
      const merchant_address =
        productObj.merchant_address ?? merchantObj?.address ?? null;

      const related_products = Array.isArray(payload.data?.related_products)
        ? payload.data?.related_products
        : [];

      const total_stock = Number(
        productObj.total_stock ??
          variantsFromBackend.reduce((acc, v) => acc + Number(v.stock ?? 0), 0),
      );
      const has_variants =
        typeof productObj.has_variants === "boolean"
          ? productObj.has_variants
          : variantsFromBackend.length > 0;
      const has_addons =
        typeof productObj.has_addons === "boolean"
          ? productObj.has_addons
          : Array.isArray(productObj.addon_groups) &&
            productObj.addon_groups.length > 0;
      const option_labels = productObj.option_labels ?? {
        option1: opt1 ? opt1.option_name : null,
        option2: opt2 ? opt2.option_name : null,
      };
      const min_purchase = Number(productObj.min_purchase ?? 1);

      return {
        product: productObj,
        price_range: priceRange,
        total_stock,
        has_variants,
        has_addons,
        combinations,
        option_labels,
        min_purchase,
        merchant_address,
        related_products,

        productImages,
        sizes: sizesRes,
        // keep variantsRes (option2 values) in case other logic depends on it
        variantValues: variantsRes,
        // MAIN: normalizedVariants for UI usage (each variant includes .options array)
        variants: normalizedVariants,

        stockCombinations,
        selectedSize,
        selectedVariant,
        addonGroups,
        selectedAddons,
        optionDefinitions: normalizedOptions,
      };
    } catch (err) {
      toast.error("Gagal memuat detail produk");
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPublicMerchantProducts = async (merchantSlug, limit = 10) => {
    loading.value = true;
    try {
      if (!merchantSlug) throw new Error("merchantSlug diperlukan");
      const data = await ProductService.getPublicMerchantProducts(
        merchantSlug,
        { limit },
      );
      return data.data || [];
    } catch (error) {
      if (isDev) {
        console.error(error);
      }
      toast.error("Gagal memuat produk merchant");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    products,
    loadingExport,
    loadingFetchProducts,
    loading,
    pagination,

    // UMKM OWNER METHODS
    fetchProducts,
    fetchProductDetail,
    createProduct,
    editProduct,
    updateProductStatus,
    deleteProduct,
    bulkDeleteProducts,
    bulkUpdateStatus,
    exportPDF,
    exportExcel,

    // PUBLIC METHODS
    fetchPublicProductDetail,
    fetchPublicMerchantProducts,
  };
}
