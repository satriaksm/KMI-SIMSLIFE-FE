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
 * Cancel order (customer)
 */
export function cancelOrder(orderId) {
  return api.post(`/api/orders/${orderId}/cancel`);
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
 * Endpoint: GET /api/merchant/{merchantSlug}/jasa-orders
 * @param {string} merchantSlug
 * @param {Object} params - { status?, per_page?, page?, start_date?, end_date?, sort_by? }
 */
export function getMerchantOrders(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/jasa-orders`, { params });
}

/**
 * Detail of a single order (merchant)
 * Endpoint: GET /api/merchant/{merchantSlug}/jasa-orders/{orderId}
 */
export function getMerchantOrderDetail(merchantSlug, orderId) {
  return api.get(`/api/merchant/${merchantSlug}/jasa-orders/${orderId}`);
}

/**
 * List merchant PRODUCT orders (for toko/kuliner merchants)
 * Endpoint: GET /api/merchant/orders?merchant={slug}
 * @param {string} merchantSlug
 * @param {Object} params - { status?, per_page?, page?, start_date?, end_date?, sort_by? }
 */
export async function getMerchantProductOrders(merchantSlug, params = {}) {
  const queryParams = {
    merchant: merchantSlug,
    ...params,
  };

  try {
    const response = await api.get('/api/merchant/orders', { params: queryParams });
    return response;
  } catch (error) {
    // Graceful fallback - return empty if 405/404
    if (error?.response?.status === 405 || error?.response?.status === 404) {
      console.warn('[getMerchantProductOrders] Route not implemented - returning empty');
      return { data: { data: [], meta: { total: 0 } } };
    }
    throw error;
  }
}

/**
 * Detail of a single PRODUCT order (merchant)
 * Endpoint: GET /api/merchant/orders/{id}?merchant={slug}
 */
export async function getMerchantProductOrderDetail(merchantSlug, orderId) {
  const queryParams = {
    merchant: merchantSlug,
  };

  try {
    const response = await api.get(`/api/merchant/orders/${orderId}`, { params: queryParams });
    return response;
  } catch (error) {
    if (error?.response?.status === 405 || error?.response?.status === 404) {
      console.warn('[getMerchantProductOrderDetail] Route not implemented');
      return { data: null };
    }
    throw error;
  }
}

/**
 * Update order status (merchant)
 * Endpoint: PATCH /api/merchant/{merchantSlug}/jasa-orders/{orderId}/status
 * @param {string} merchantSlug
 * @param {number} orderId
 * @param {string|FormData} payload - status string or FormData with status + evidences
 */
export function updateOrderStatus(merchantSlug, orderId, payload) {
  if (payload instanceof FormData) {
    return api.patch(
      `/api/merchant/${merchantSlug}/jasa-orders/${orderId}/status`,
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  const data = typeof payload === 'object' && payload !== null ? payload : { status: payload };

  return api.patch(
    `/api/merchant/${merchantSlug}/jasa-orders/${orderId}/status`,
    data
  );
}
