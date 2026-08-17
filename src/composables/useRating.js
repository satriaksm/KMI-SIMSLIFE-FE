import { ref, computed } from "vue";
import { publicApi } from "@/libs/axios";

/**
 * Composable untuk fetch rating summary (merchant atau jasa/product)
 * @param {string} resourceType - 'merchant' atau 'product' atau 'jasa'
 * @param {string|number} resourceId - slug (untuk merchant) atau id
 * @returns {Object} { ratingSummary, loading, error, fetchRating }
 */
export function useRating(resourceType, resourceId) {
  const ratingSummary = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchRating = async (id = resourceId) => {
    if (!id || !resourceType) return;

    loading.value = true;
    error.value = null;

    try {
      let endpoint = "";

      if (resourceType === "merchant") {
        // Merchant rating by slug: GET /api/public/merchants/{merchantSlug}/ratings/summary
        endpoint = `/api/public/merchants/${id}/ratings/summary`;
      } else if (resourceType === "jasa") {
        // Jasa rating summary: GET /api/public/jasas/{jasaId}/ratings/summary
        endpoint = `/api/public/jasas/${id}/ratings/summary`;
      } else if (resourceType === "product") {
        // Product rating summary: GET /api/public/products/{productId}/ratings/summary
        endpoint = `/api/public/products/${id}/ratings/summary`;
      }

      if (!endpoint) {
        throw new Error("Invalid resourceType");
      }

      const response = await publicApi.get(endpoint);
      // Handle both wrapped and unwrapped responses
      ratingSummary.value = response.data?.data || response.data || null;
    } catch (err) {
      console.error(`Failed to fetch ${resourceType} rating:`, err);
      // Tidak set error jika hanya 404 (belum ada rating), treat sebagai 0 rating
      if (err?.response?.status === 404) {
        ratingSummary.value = {
          average_rating: 0,
          total_ratings: 0,
        };
      } else {
        error.value = err?.response?.data?.message || err.message || "Failed to fetch rating";
      }
    } finally {
      loading.value = false;
    }
  };

  // Average rating
  const averageRating = computed(() => {
    return ratingSummary.value?.average_rating ?? 0;
  });

  // Total count of ratings
  const ratingCount = computed(() => {
    return ratingSummary.value?.total_ratings ?? 0;
  });

  // Display string (e.g., "4.5 (23)")
  const ratingDisplay = computed(() => {
    const avg = averageRating.value;
    const count = ratingCount.value;
    if (!avg || count === 0) return "Belum ada rating";
    return `${avg.toFixed(1)} (${count})`;
  });

  return {
    ratingSummary,
    loading,
    error,
    fetchRating,
    averageRating,
    ratingCount,
    ratingDisplay,
  };
}
