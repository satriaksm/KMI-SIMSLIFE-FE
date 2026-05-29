import { ref } from "vue";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";

export function useReports() {
  const reports = ref([]);
  const loading = ref(false);
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const toast = useToast();

  // ─────────────────────────────────────────
  // ADMIN: Fetch all reports
  // ─────────────────────────────────────────
  const fetchReports = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get("/api/admin/reports", { params });
      if (response.data.data) {
        reports.value = response.data.data;
        pagination.value = {
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          per_page: response.data.per_page,
          total: response.data.total,
        };
      }
    } catch (error) {
      console.error("[useReports] Fetch failed:", error);
      toast.error("Gagal memuat data laporan");
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // ADMIN: Fetch single report detail
  // ─────────────────────────────────────────
  const fetchReportDetail = async (id) => {
    loading.value = true;
    try {
      const response = await api.get(`/api/admin/reports/${id}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("[useReports] Detail fetch failed:", error);
      toast.error("Gagal memuat detail laporan");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // ADMIN: Review report (in_review / resolved / dismissed)
  // ─────────────────────────────────────────
  const reviewReport = async (id, data) => {
    loading.value = true;
    try {
      const response = await api.patch(`/api/admin/reports/${id}/review`, data);
      toast.success("Laporan berhasil diperbarui!");
      return response.data;
    } catch (error) {
      console.error("[useReports] Review failed:", error);
      toast.error("Gagal memperbarui laporan");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // ADMIN: Take action (warn/suspend/archive/delete)
  // ─────────────────────────────────────────
  const takeAction = async (id, actionType, reason) => {
    loading.value = true;
    try {
      const response = await api.post(`/api/admin/reports/${id}/take-action`, {
        action_type: actionType,
        reason: reason,
      });
      toast.success("Tindakan berhasil diambil!");
      return response.data;
    } catch (error) {
      console.error("[useReports] Take action failed:", error);
      const msg = error.response?.data?.message || "Gagal mengambil tindakan";
      toast.error(msg);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // ADMIN: Fetch appeals for a report
  // ─────────────────────────────────────────
  const fetchAppeals = async (reportId) => {
    try {
      const response = await api.get(`/api/admin/reports/${reportId}/appeals`);
      return response.data?.data ?? [];
    } catch (error) {
      console.error("[useReports] Fetch appeals failed:", error);
      return [];
    }
  };

  // ─────────────────────────────────────────
  // ADMIN: Review an appeal (accept/reject)
  // ─────────────────────────────────────────
  const reviewAppeal = async (reportId, appealId, status, adminResponse) => {
    loading.value = true;
    try {
      const response = await api.patch(
        `/api/admin/reports/${reportId}/appeals/${appealId}/review`,
        { status, admin_response: adminResponse }
      );
      toast.success("Sanggahan berhasil ditinjau!");
      return response.data;
    } catch (error) {
      console.error("[useReports] Review appeal failed:", error);
      toast.error("Gagal meninjau sanggahan");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // USER: Submit appeal/sanggahan
  // ─────────────────────────────────────────
  const submitAppeal = async (reportId, appealText) => {
    loading.value = true;
    try {
      const response = await api.post(`/api/reports/${reportId}/appeal`, {
        appeal_text: appealText,
      });
      toast.success("Sanggahan berhasil dikirim!");
      return response.data;
    } catch (error) {
      console.error("[useReports] Submit appeal failed:", error);
      const msg = error.response?.data?.message || "Gagal mengirim sanggahan";
      toast.error(msg);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ─────────────────────────────────────────
  // USER: Get my appeals for a report
  // ─────────────────────────────────────────
  const fetchMyAppeals = async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/appeals`);
      return response.data?.data ?? [];
    } catch (error) {
      console.error("[useReports] Fetch my appeals failed:", error);
      return [];
    }
  };

  // ─────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────
  const exportReportsPdf = async (params = {}) => {
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      const query = new URLSearchParams(cleanParams).toString();
      window.open(`/api/admin/reports/export-pdf${query ? `?${query}` : ""}`, "_blank");
    } catch (error) {
      console.error("[useReports] Export PDF failed:", error);
      toast.error("Gagal mengexport PDF");
    }
  };

  const exportReportDetailPdf = async (id) => {
    try {
      window.open(`/api/admin/reports/${id}/export-pdf`, "_blank");
    } catch (error) {
      console.error("[useReports] Export detail PDF failed:", error);
      toast.error("Gagal mengexport PDF");
    }
  };

  return {
    reports,
    loading,
    pagination,
    fetchReports,
    fetchReportDetail,
    reviewReport,
    takeAction,
    fetchAppeals,
    reviewAppeal,
    submitAppeal,
    fetchMyAppeals,
    exportReportsPdf,
    exportReportDetailPdf,
  };
}
