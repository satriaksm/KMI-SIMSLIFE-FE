import api from "@/libs/axios";

// ========================
// CUSTOMER
// ========================

/**
 * Checkout product from cart -> create order + Xendit invoice metadata
 */
export function checkoutProductFromCart(payload) {
  return api.post("/api/orders/products/checkout", payload);
}

/**
 * List customer orders (paginated)
 * @param {Object} params - { status?, per_page?, page? }
 */
export function getCustomerOrders(params = {}) {
  return api.get("/api/orders", { params });
}

/**
 * Detail of a single order (customer)
 */
export function getCustomerOrderDetail(orderId) {
  return api.get(`/api/orders/${orderId}`);
}

/**
 * Cancel order (customer)
 */
export function cancelOrder(orderId) {
  return api.post(`/api/orders/${orderId}/cancel`);
}

/**
 * Complete order (customer)
 */
export function completeOrder(orderId) {
  return api.post(`/api/orders/${orderId}/complete`);
}

// ========================
// MERCHANT
// ========================

/**
 * List merchant orders (paginated)
 * @param {string} merchantSlug
 * @param {Object} params - { status?, per_page?, page? }
 */
export function getMerchantOrders(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/orders`, { params });
}

/**
 * Detail of a single order (merchant)
 */
export function getMerchantOrderDetail(merchantSlug, orderId) {
  return api.get(`/api/merchant/${merchantSlug}/orders/${orderId}`);
}

/**
 * Update order status (merchant)
 * @param {string} merchantSlug
 * @param {number} orderId
 * @param {string} status - responsed|delivered|completed|cancelled
 */
export function updateOrderStatus(merchantSlug, orderId, payload) {
  if (payload instanceof FormData) {
    return api.post(
      `/api/merchant/${merchantSlug}/orders/${orderId}/update-status`,
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }
  const data = typeof payload === 'object' && payload !== null ? payload : { status: payload };

  return api.post(
    `/api/merchant/${merchantSlug}/orders/${orderId}/update-status`,
    data,
  );
}
