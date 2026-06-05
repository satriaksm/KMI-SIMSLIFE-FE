import { ref } from "vue";
import api from "@/libs/axios";

// Module-level cache to avoid refetching on every component mount
let cachedStatistics = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useHomeStatistics() {
  const statistics = ref({
    total_merchants: 0,
    total_products: 0,
    total_categories: 0,
  });

  const loading = ref(false);
  const error = ref(null);

  const fetchStatistics = async (force = false) => {
    // Use cache if still valid
    if (
      !force &&
      cachedStatistics &&
      Date.now() - cacheTimestamp < CACHE_DURATION
    ) {
      statistics.value = cachedStatistics;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await api.get("/api/public/home/statistics");
      statistics.value = response.data;
      cachedStatistics = response.data;
      cacheTimestamp = Date.now();
    } catch (err) {
      error.value = err;
      console.error("Failed to fetch statistics:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    statistics,
    loading,
    error,
    fetchStatistics,
  };
}
