import { ref } from "vue";
import api from "@/libs/axios";
import merchantService from "@/services/api/merchant";
import { useToast } from "vue-toastification";

export function useMerchants() {
  const isDev = import.meta.env.DEV;
  const merchants = ref([]);
  const merchant = ref(null);
  const loading = ref(false);
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const toast = useToast();

  // Fetch merchants (admin view)
  const fetchMerchants = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get("/api/admin/merchants", { params });

      if (response.data.data) {
        merchants.value = response.data.data;
        pagination.value = {
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          per_page: response.data.per_page,
          total: response.data.total,
        };
      }

      return merchants.value;
    } catch (error) {
      console.error("[useMerchants] Fetch failed:", error);
      toast.error("Gagal memuat data UMKM");
      merchants.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Fetch merchant detail
  const fetchMerchantDetail = async (id) => {
    loading.value = true;
    try {
      const response = await api.get(`/api/admin/merchants/${id}`);
      return response.data.data;
    } catch (error) {
      console.error("[useMerchants] Detail fetch failed:", error);
      toast.error("Gagal memuat detail UMKM");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Approve merchant
  const approveMerchant = async (id) => {
    loading.value = true;
    try {
      await api.patch(`/api/admin/merchants/${id}/approve`);
      toast.success("UMKM berhasil disetujui!");
    } catch (error) {
      console.error("[useMerchants] Approve failed:", error);
      toast.error(error.response?.data?.message || "Gagal approve UMKM");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Reject merchant
  const rejectMerchant = async (id, reason) => {
    loading.value = true;
    try {
      await api.patch(`/api/admin/merchants/${id}/reject`, {
        rejection_reason: reason,
      });
      toast.success("UMKM berhasil ditolak!");
    } catch (error) {
      console.error("[useMerchants] Reject failed:", error);
      toast.error(error.response?.data?.message || "Gagal reject UMKM");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // =========================
  // UMKM Owner API
  // =========================
  const fetchMerchantProfile = async (merchantSlug) => {
    loading.value = true;
    try {
      if (!merchantSlug) {
        throw new Error("Missing merchantSlug");
      }

      const data = await merchantService.getMerchantProfile(
        String(merchantSlug),
      );
      merchant.value = data.data;
      return merchant.value;
    } catch (error) {
      if (isDev) {
        console.error("[useMerchants] Owner fetch failed:", error);
      }
      toast.error("Gagal memuat data UMKM");
      merchant.value = null;
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const updateMerchantProfile = async (merchantSlug, payload) => {
    loading.value = true;
    try {
      if (!merchantSlug) {
        throw new Error("Missing merchantSlug");
      }

      const data = await merchantService.updateMerchantProfile(
        String(merchantSlug),
        payload,
      );
      toast.success("Profil UMKM berhasil diperbarui!");
      merchant.value = data.data ?? merchant.value;
      return merchant.value;
    } catch (error) {
      if (isDev) {
        console.error("[useMerchants] Owner update failed:", error);
      }
      toast.error("Gagal memperbarui profil UMKM");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const deleteMerchant = async (merchantSlug) => {
    loading.value = true;
    try {
      if (!merchantSlug) {
        throw new Error("Missing merchantSlug");
      }

      await merchantService.deleteMerchant(String(merchantSlug));
      toast.success("UMKM berhasil dihapus!");
      merchant.value = null;
    } catch (error) {
      if (isDev) {
        console.error("[useMerchants] Owner delete failed:", error);
      }
      toast.error("Gagal menghapus UMKM");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // =========================
  // Public API
  // =========================
  const fetchPublicMerchants = async (params = {}) => {
    loading.value = true;
    try {
      const data = await merchantService.getPublicMerchants(params);
      merchants.value = data.data || [];
      return merchants.value;
    } catch (error) {
      if (isDev) {
        console.error("[useMerchants] Public fetch failed:", error);
      }
      toast.error("Gagal memuat data UMKM publik");
      merchants.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    merchants,
    merchant,
    loading,
    pagination,

    // Admin methods
    fetchMerchants,
    fetchMerchantDetail,
    approveMerchant,
    rejectMerchant,

    // Public methods
    fetchPublicMerchants,

    // UMKM Owner methods
    fetchMerchantProfile,
    updateMerchantProfile,
    deleteMerchant,
  };
}
