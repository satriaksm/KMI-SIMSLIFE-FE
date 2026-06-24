/**
 * Universal helper to format payment method and channel/paid_channel to a clean label.
 * Used for both product and service orders.
 *
 * @param {Object} order - Order object containing payment_method and channel information
 * @returns {string} Clean, friendly payment method label
 */
export function formatPaymentLabel(order) {
  if (!order) return "—";

  // Resolve method and channel, checking snapshots first
  const method = String(
    order.payment_method_snapshot ||
    order.payment_method ||
    order.meta?.payment_method ||
    order.payment?.payment_method ||
    ""
  ).toUpperCase().trim();

  const channel = String(
    order.payment_channel_snapshot ||
    order.payment_channel ||
    order.channel_code ||
    order.paid_channel ||
    order.payment?.payment_channel ||
    order.payment?.channel_code ||
    order.payment?.payment_method || // in some formats, payment_method in relation holds channel
    ""
  ).toUpperCase().trim();

  // Handle Cash on Delivery
  if (method === "COD" || method.includes("COD") || method === "TUNAI" || method === "BAYAR DI TEMPAT") {
    return "COD - Bayar di Tempat";
  }

  // Determine the primary code to map
  // If the method is a generic/gateway name, prefer the specific channel
  const genericGatewayNames = ["XENDIT", "ONLINE", "ONLINE_XENDIT", "TRANSFER", "BANK", "ONLINE_PAYMENT"];
  const isGeneric = genericGatewayNames.includes(method) || method === "";
  const primaryCode = (isGeneric && channel) ? channel : (method || channel);

  // Label mapping table
  const labels = {
    QRIS: "QRIS",
    BCA: "BCA",
    BCA_VA: "BCA",
    "BCA VA": "BCA",
    BNI: "BNI",
    BNI_VA: "BNI",
    "BNI VA": "BNI",
    BRI: "BRI",
    BRI_VA: "BRI",
    "BRI VA": "BRI",
    MANDIRI: "MANDIRI",
    MANDIRI_VA: "MANDIRI",
    "MANDIRI VA": "MANDIRI",
    PERMATA: "PERMATA",
    PERMATA_VA: "PERMATA",
    "PERMATA VA": "PERMATA",
    CIMB: "CIMB",
    CIMB_VA: "CIMB",
    "CIMB VA": "CIMB",
    SAHABAT_SAMPOERNA: "Sahabat Sampoerna",
    OVO: "OVO",
    DANA: "DANA",
    SHOPEEPAY: "ShopeePay",
    GOPAY: "GoPay",
    LINKAJA: "LinkAja",
    ALFAMART: "Alfamart",
    INDOMARET: "Indomaret",
  };

  const matchedLabel = labels[primaryCode];
  if (matchedLabel) {
    return matchedLabel;
  }

  // Fallback cleanup: remove gateway prefix if any
  const cleanStr = primaryCode.replace(/^(XENDIT|ONLINE|ONLINE_XENDIT|TRANSFER)\s*[-_]\s*/i, "").trim();
  if (cleanStr && cleanStr !== "PENDING" && cleanStr !== "UNPAID" && cleanStr !== "PAID") {
    return cleanStr;
  }

  return "Transfer Bank";
}
