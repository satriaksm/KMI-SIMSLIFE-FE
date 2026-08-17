import api from "@/libs/axios";

export function createOrderInvoice(orderId) {
  return api.post(`/api/payments/${orderId}/invoice`);
}

export function getOrderPaymentStatus(orderId) {
  return api.get(`/api/payments/${orderId}/status`);
}

/**
 * Verifikasi pembayaran langsung ke Xendit (digunakan setelah redirect balik dari Xendit)
 * BE akan cek status invoice ke Xendit API dan update order jika sudah PAID
 */
export function verifyOrderPayment(orderId) {
  return api.post(`/api/payments/${orderId}/verify`);
}

export function cancelOrderPayment(orderId) {
  return api.post(`/api/payments/${orderId}/cancel`);
}
