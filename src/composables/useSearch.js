import { ref } from "vue";
import { searchProducts, searchMerchants } from "@/services/api/search";
import { useToast } from "vue-toastification";
import { getImageUrl } from "@/libs/getImageUrl";

/**
 * Normalize jasa image payload to ensure full URLs in cover_img and images.
 * Applies to data from /api/public/search endpoint.
 */
const normalizeJasaImagePayload = (jasa) => {
  if (!jasa || typeof jasa !== "object") return jasa;
  const normalized = { ...jasa };
  if (normalized.cover_img && typeof normalized.cover_img === "object") {
    const srcUrl = normalized.cover_img.src_url || normalized.cover_img.url || normalized.cover_img.id
      ? getImageUrl(normalized.cover_img.src_url || normalized.cover_img.url || String(normalized.cover_img.id))
      : "";
    normalized.cover_img = { id: normalized.cover_img.id ?? null, url: srcUrl, src_url: srcUrl };
  }
  if (Array.isArray(normalized.images)) {
    normalized.images = normalized.images.map((image) => {
      if (!image || typeof image !== "object") return image;
      const srcUrl = image.src_url || image.url || image.image_path || image.id
        ? getImageUrl(image.src_url || image.url || image.image_path || String(image.id))
        : "";
      return { ...image, url: srcUrl, src_url: srcUrl };
    });
  }
  if (normalized.image) normalized.image = getImageUrl(normalized.image);
  return normalized;
};

export function useSearch() {
  const isDev = import.meta.env.DEV;
  const toast = useToast();

  // Produk
  const products = ref([]);
  const productsMeta = ref({});
  const loadingProducts = ref(false);

  // Jasa (returned by /api/public/search)
  const jasas = ref([]);
  const jasasMeta = ref({});

  // Merchant
  const merchants = ref([]);
  const merchantsMeta = ref({});
  const loadingMerchants = ref(false);

  // Search produk
  const fetchProducts = async (params = {}, append = false) => {
    loadingProducts.value = true;
    try {
      const data = await searchProducts(params);
      if (append) {
        products.value.push(...(data.data ?? []));
      } else {
        products.value = data.data ?? [];
      }
      productsMeta.value = data.meta ?? {};

      // Also hydrate jasa results if present (nested under meta by ApiResponse)
      const meta = data.meta ?? {};
      const rawJasas = meta.jasas ?? [];
      const normalizedJasas = rawJasas.map(normalizeJasaImagePayload);
      if (append) {
        jasas.value.push(...normalizedJasas);
      } else {
        jasas.value = normalizedJasas;
      }
      jasasMeta.value = meta.jasas_meta ?? {};
    } catch (err) {
      if (isDev) {
        console.error("Error fetching products:", err);
      }
      toast.error("Gagal memuat produk.");
      if (!append) {
        products.value = [];
        jasas.value = [];
        jasasMeta.value = {};
      }
    } finally {
      loadingProducts.value = false;
    }
  };

  // Search merchant
  const fetchMerchants = async (params = {}, append = false) => {
    loadingMerchants.value = true;
    try {
      const data = await searchMerchants(params);
      if (append) {
        merchants.value.push(...(data.data ?? []));
      } else {
        merchants.value = data.data ?? [];
      }
      merchantsMeta.value = data.meta ?? {};
    } catch (err) {
      if (isDev) {
        console.error("Error fetching merchants:", err);
      }
      toast.error("Gagal memuat UMKM.");
      if (!append) merchants.value = [];
    } finally {
      loadingMerchants.value = false;
    }
  };

  return {
    // Produk
    products,
    productsMeta,
    loadingProducts,
    fetchProducts,
    // Jasa
    jasas,
    jasasMeta,
    // Merchant
    merchants,
    merchantsMeta,
    loadingMerchants,
    fetchMerchants,
  };
}
