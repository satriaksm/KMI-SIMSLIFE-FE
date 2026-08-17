import { ref } from "vue";
import api from "@/libs/axios";

export function useEventAnalytics() {
  const analytics = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchEventAnalytics = async (eventId) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get(`/api/admin/events/${eventId}/analytics`);
      analytics.value = res.data;
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.message || "Gagal memuat analisis event";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { analytics, loading, error, fetchEventAnalytics };
}
