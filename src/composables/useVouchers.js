import { ref } from "vue";
import api from "@/libs/axios";
import * as voucherApi from "@/services/api/voucher";
import { useToast } from "vue-toastification";

export function useVouchers() {
  const isDev = import.meta.env.DEV;
  const toast = useToast();
  const loading = ref(false);
  const loadingDetail = ref(false);
  const vouchers = ref([]);
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  /**
   * Fetch all vouchers (admin only)
   */
  const fetchVouchers = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get("/api/admin/vouchers", { params });

      const data = response.data;

      // Handle different response structures
      if (data.data) {
        vouchers.value = data.data;
        if (data.meta) {
          pagination.value = data.meta;
        } else if (data.pagination) {
          pagination.value = data.pagination;
        }
      } else if (Array.isArray(data)) {
        vouchers.value = data;
      } else {
        vouchers.value = [];
      }

      console.log("[useVouchers] Fetched:", vouchers.value.length, "vouchers");
      return vouchers.value;
    } catch (error) {
      console.error("[useVouchers] Fetch failed:", error);
      const message =
        error.response?.data?.message || "Gagal memuat data voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch single voucher detail
   */
  const fetchVoucherDetail = async (id) => {
    loading.value = true;
    try {
      const response = await api.get(`/api/admin/vouchers/${id}`);
      const voucher = response.data.data || response.data;
      console.log("[useVouchers] Voucher detail:", voucher);
      return voucher;
    } catch (error) {
      console.error("[useVouchers] Fetch detail failed:", error);
      const message =
        error.response?.data?.message || "Gagal memuat detail voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete voucher (admin only)
   */
  const deleteVoucher = async (id) => {
    loading.value = true;
    try {
      await api.delete(`/api/admin/vouchers/${id}`);
      toast.success("Voucher berhasil dihapus");
      console.log("[useVouchers] Deleted voucher:", id);
    } catch (error) {
      console.error("[useVouchers] Delete failed:", error);
      const message =
        error.response?.data?.message || "Gagal menghapus voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /* =====================================================
   * Merchant VOUCHERS
   * ===================================================== */

  const fetchMerchantVouchers = async (merchantSlug, params = {}) => {
    if (!merchantSlug) {
      toast.error("Merchant slug diperlukan untuk memuat voucher");
      throw new Error("Merchant slug is required to fetch vouchers");
    }

    loading.value = true;
    try {
      const res = await voucherApi.getMerchantVouchers(merchantSlug, params);
      vouchers.value = res.data || [];
      pagination.value = res.meta || pagination.value;
      if (isDev) {
        console.log(
          "[useVouchers] Fetched merchant vouchers:",
          vouchers.value.length,
        );
      }
      return vouchers.value;
    } catch (error) {
      if (isDev) {
        console.error("[useVouchers] Fetch merchant vouchers failed:", error);
      }
      const message =
        error.response?.data?.message || "Gagal memuat voucher merchant";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchMerchantVoucherDetail = async (merchantSlug, voucherId) => {
    if (!merchantSlug || !voucherId) {
      toast.error(
        "Merchant slug dan ID voucher diperlukan untuk memuat detail",
      );
      throw new Error("Merchant slug and voucher ID are required");
    }
    if (loadingDetail.value) return;
    loadingDetail.value = true;
    try {
      const voucher = await voucherApi.getMerchantVoucherDetail(
        merchantSlug,
        voucherId,
      );
      if (isDev) {
        console.log("[useVouchers] Fetched merchant voucher detail:", voucher);
      }
      return voucher;
    } catch (error) {
      if (isDev) {
        console.error(
          "[useVouchers] Fetch merchant voucher detail failed:",
          error,
        );
      }
      const message =
        error.response?.data?.message || "Gagal memuat detail voucher";
      toast.error(message);
      throw error;
    } finally {
      loadingDetail.value = false;
    }
  };

  const createMerchantVoucher = async (merchantSlug, payload) => {
    loading.value = true;
    try {
      const voucher = await voucherApi.createMerchantVoucher(
        merchantSlug,
        payload,
      );
      toast.success("Voucher berhasil dibuat");
      if (isDev) {
        console.log("[useVouchers] Created merchant voucher:", voucher);
      }
      return voucher;
    } catch (error) {
      if (isDev) {
        console.error("[useVouchers] Create merchant voucher failed:", error);
      }
      const message = error.response?.data?.message || "Gagal membuat voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const editMerchantVoucher = async (merchantSlug, voucherId, payload) => {
    loading.value = true;
    try {
      const voucher = await voucherApi.editMerchantVoucher(
        merchantSlug,
        voucherId,
        payload,
      );
      toast.success("Voucher berhasil diperbarui");
      if (isDev) {
        console.log("[useVouchers] Edited merchant voucher:", voucher);
      }
      return voucher;
    } catch (error) {
      if (isDev) {
        console.error("[useVouchers] Edit merchant voucher failed:", error);
      }
      const message =
        error.response?.data?.message || "Gagal memperbarui voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const editMerchantVoucherStatus = async (merchantSlug, voucherId, status) => {
    loading.value = true;
    try {
      const voucher = await voucherApi.editStatus(
        merchantSlug,
        voucherId,
        status,
      );
      toast.success("Status voucher berhasil diperbarui");
      if (isDev) {
        console.log(
          "[useVouchers] Edited merchant voucher status:",
          voucherId,
          status,
        );
      }
      return voucher;
    } catch (error) {
      if (isDev) {
        console.error(
          "[useVouchers] Edit merchant voucher status failed:",
          error,
        );
      }
      const message =
        error.response?.data?.message || "Gagal memperbarui status voucher";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const deleteMerchantVoucher = async (merchantSlug, voucherId) => {
    try {
      await voucherApi.deleteMerchantVoucher(merchantSlug, voucherId);
      toast.success("Voucher berhasil dihapus");
      if (isDev) {
        console.log(
          "[useVouchers] Deleted merchant voucher:",
          merchantSlug,
          voucherId,
        );
      }
    } catch (error) {
      if (isDev) {
        console.error("[useVouchers] Delete merchant voucher failed:", error);
      }
      const message =
        error.response?.data?.message || "Gagal menghapus voucher";
      toast.error(message);
      throw error;
    }
  };

  const bulkDeleteMerchantVoucher = async (merchantSlug, voucherIds = []) => {
    loading.value = true;
    try {
      await voucherApi.bulkDeleteMerchantVoucher(merchantSlug, voucherIds);
      if (isDev) {
        console.log(
          "[useVouchers] Bulk deleted merchant vouchers:",
          merchantSlug,
          voucherIds,
        );
      }
    } catch (error) {
      if (isDev) {
        console.error(
          "[useVouchers] Bulk delete merchant vouchers failed:",
          error,
        );
      }
      const message =
        error.response?.data?.message ||
        "Gagal menghapus voucher secara massal";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const editBulkStatus = async (merchantSlug, voucherIds = [], status) => {
    loading.value = true;
    try {
      await voucherApi.editBulkStatus(merchantSlug, voucherIds, status);
      if (isDev) {
        console.log(
          "[useVouchers] Bulk edited merchant voucher statuses:",
          merchantSlug,
          voucherIds,
          status,
        );
      }
    } catch (error) {
      if (isDev) {
        console.error(
          "[useVouchers] Bulk edit merchant voucher statuses failed:",
          error,
        );
      }
      const message =
        error.response?.data?.message ||
        "Gagal memperbarui status voucher secara massal";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /* =====================================================
   * Customer VOUCHERS
   * ===================================================== */
  const fetchVouchersByMerchant = async (merchantSlug) => {
    loading.value = true;
    try {
      const res = await voucherApi.getVouchersByMerchant(merchantSlug);
      vouchers.value = res.data || [];
      if (isDev) {
        console.log(
          "[useVouchers] Fetched customer vouchers by merchant:",
          vouchers.value.length,
        );
      }
      return vouchers.value;
    } catch (error) {
      if (isDev) {
        console.error(
          "[useVouchers] Fetch customer vouchers by merchant failed:",
          error,
        );
      }
      const message =
        error.response?.data?.message ||
        "Gagal memuat voucher UMKM untuk pelanggan";
      toast.error(message);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    vouchers,
    loading,
    loadingDetail,
    pagination,
    fetchVouchers,
    fetchVoucherDetail,
    deleteVoucher,
    fetchMerchantVouchers,
    fetchMerchantVoucherDetail,
    createMerchantVoucher,
    editMerchantVoucher,
    deleteMerchantVoucher,
    editMerchantVoucherStatus,
    bulkDeleteMerchantVoucher,
    editBulkStatus,
    fetchVouchersByMerchant,
  };
}
