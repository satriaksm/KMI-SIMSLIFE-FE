import api from "@/libs/axios";

/**
 * Mendapatkan data laporan transaksi berdasarkan merchant slug
 */
export function getMerchantTransactionsReport(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/reports/transactions`, { params });
}

/**
 * Export PDF
 */
export function exportMerchantReportPdf(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/reports/transactions/export/pdf`, { params, responseType: 'blob' });
}

/**
 * Export Excel
 */
export function exportMerchantReportExcel(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/reports/transactions/export/excel`, { params, responseType: 'blob' });
}