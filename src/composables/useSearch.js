import { ref } from "vue";
import { searchProducts, searchMerchants } from "@/services/api/search";
import { useToast } from "vue-toastification";

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
        products.value.push(...(data.data.products ?? []));
      } else {
        products.value = data.data.products ?? [];
      }
      productsMeta.value = data.meta.products_meta ?? {};

      // Also hydrate jasa results if present (nested under meta by ApiResponse)
      const meta = data.meta ?? {};
      if (append) {
        jasas.value.push(...(data.data.jasas ?? []));
      } else {
        jasas.value = data.data.jasas ?? [];
      }
      jasasMeta.value = data.meta.jasas_meta ?? {};
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
