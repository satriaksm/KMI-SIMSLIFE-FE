import { ref, computed } from "vue";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";

// Module-level cache for level 1 categories (rarely change)
let cachedLevel1 = null;

export function useCategories() {
  const toast = useToast();

  const categoriesLevel1 = ref([]);
  const categoriesLevel2 = ref([]);
  const categoriesLevel2Map = ref({});
  const loadingLevel1 = ref(true);
  const loadingLevel2 = ref(false);

  /**
   * ✅ HELPER: Normalize category format
   */
  const normalizeCategory = (category) => {
    if (!category) return null;

    // Support both formats: {id, name} or {value, label}
    return {
      id: category.id || category.value,
      name: category.name || category.label,
      slug: category.slug,
      image_path: category.image_path,
      // Keep original format for backward compatibility
      value: category.value || category.id,
      label: category.label || category.name,
    };
  };

  /**
   * ✅ UPDATED: Fetch level 1 categories with normalization
   */
  const fetchLevel1Categories = async () => {
    if (cachedLevel1) {
      categoriesLevel1.value = cachedLevel1;
      loadingLevel1.value = false;
      return;
    }

    loadingLevel1.value = true;
    try {
      const response = await api.get("/api/public/categories/level-1");

      if (response.data.success) {
        categoriesLevel1.value = (response.data.data || [])
          .map(normalizeCategory)
          .filter(Boolean);
        cachedLevel1 = categoriesLevel1.value;
      } else {
        throw new Error(response.data.message || "Failed to fetch categories");
      }
    } catch (error) {
      toast.error("Gagal memuat kategori");
      categoriesLevel1.value = [];
    } finally {
      loadingLevel1.value = false;
    }
  };

  /**
   * ✅ UPDATED: Fetch sub-categories with normalization
   */
  const fetchSubCategories = async (parentId) => {
    if (!parentId) {
      categoriesLevel2.value = [];
      return;
    }

    loadingLevel2.value = true;
    try {
      const response = await api.get(
        `/api/public/categories/${parentId}/sub-categories`,
      );

      if (response.data.success) {
        // ✅ Normalize all sub-categories
        categoriesLevel2.value = (response.data.data || [])
          .map(normalizeCategory)
          .filter(Boolean);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch sub-categories",
        );
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.warning("Kategori tidak memiliki sub-kategori");
      } else {
        toast.error("Gagal memuat sub-kategori");
      }

      categoriesLevel2.value = [];
    } finally {
      loadingLevel2.value = false;
    }
  };

  const fetchMultiSubCategories = async (parentId) => {
    if (!parentId || categoriesLevel2Map.value[parentId]) return;

    loadingLevel2.value = true;
    try {
      const response = await api.get(
        `/api/public/categories/${parentId}/sub-categories`,
      );

      if (response.data.success) {
        categoriesLevel2Map.value[parentId] = (response.data.data || [])
          .map(normalizeCategory)
          .filter(Boolean);
      }
    } catch (error) {
      toast.error("Gagal memuat sub-kategori");
    } finally {
      loadingLevel2.value = false;
    }
  };
  /**
   * Search categories
   */
  const searchCategories = async (query) => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await api.get("/api/public/categories/search", {
        params: { q: query },
      });

      if (response.data.success) {
        // ✅ Normalize search results
        return (response.data.data || [])
          .map(normalizeCategory)
          .filter(Boolean);
      }
      return [];
    } catch (error) {
      toast.error("Gagal mencari kategori");
      return [];
    }
  };

  return {
    // State
    categoriesLevel1,
    categoriesLevel2,
    categoriesLevel2Map,
    loadingLevel1,
    loadingLevel2,

    // Methods
    fetchLevel1Categories,
    fetchSubCategories,
    fetchMultiSubCategories,
    searchCategories,
  };
}
