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
 * Detail of a single service order (customer) — uses orders.id as primary ID
 * Endpoint: GET /api/jasa-orders/{id}
 */
export function getCustomerOrderDetail(orderId) {
  return api.get(`/api/jasa-orders/${orderId}`);
}

/**
 * Cancel jasa order (customer)
 * Endpoint: POST /api/jasa-orders/{orderId}/cancel
 */
export function cancelJasaOrder(orderId) {
  return api.post(`/api/jasa-orders/${orderId}/cancel`);
}

/**
 * Confirm jasa order completion (customer)
 * Endpoint: POST /api/jasa-orders/{orderId}/confirm
 */
export function confirmJasaOrder(orderId) {
  return api.post(`/api/jasa-orders/${orderId}/confirm`);
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
  
  return api.post(
    `/api/merchant/${merchantSlug}/orders/${orderId}/update-status`,
    { status: payload },
  );
}
