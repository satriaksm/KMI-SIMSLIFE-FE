import api from "@/libs/axios";

/**
 * Get active shipping settings (base_cost, cost_per_km)
 */
export function getShippingSettings() {
  return api.get("/api/shipping/settings");
}

/**
 * Calculate shipping cost between a merchant and the customer's address.
 * @param {Object} payload - { merchant_id, address_id? }
 * @returns {{ delivery_fee, distance_km, base_cost, cost_per_km }}
 */
export function calculateShippingCost(payload) {
  return api.post("/api/shipping/calculate", payload);
}
