/**
 * Universal helper to format payment method and channel/paid_channel to a clean label.
 * Used for both product and service orders.
 *
 * @param {Object} order - Order object containing payment_method and channel information
 * @returns {string} Clean, friendly payment method label
 */
export function formatPaymentLabel(order) {
  if (!order) return "—";

  // Resolve raw method
  const rawMethod = String(
    order.payment_method_snapshot ||
    order.payment_method ||
    order.meta?.payment_method ||
    order.payment?.payment_method ||
    ""
  ).toUpperCase().trim();

  // Resolve actual payment channel based on strict priority order:
  // 1. order.payment?.paid_channel
  // 2. order.paid_channel
  // 3. order.payment_channel
  // 4. order.channel
  // 5. order.payment?.channel
  // 6. order.payment?.payment_channel
  // 7. order.payment?.xendit_payment_method
  // 8. order.payment?.payment_method
  let rawChannel = "";
  const priorities = [
    order.payment?.paid_channel,
    order.paid_channel,
    order.payment_channel,
    order.channel,
    order.payment?.channel,
    order.payment?.payment_channel,
    order.payment?.xendit_payment_method,
    order.payment?.payment_method
  ];

  for (const val of priorities) {
    if (val && typeof val === "string") {
      const cleanVal = val.toUpperCase().trim();
      if (cleanVal && cleanVal !== "XENDIT" && cleanVal !== "ONLINE" && cleanVal !== "ONLINE_XENDIT" && cleanVal !== "TRANSFER") {
        rawChannel = cleanVal;
        break;
      }
    }
  }

  // Handle Cash on Delivery
  if (rawMethod === "COD" || rawMethod.includes("COD") || rawMethod === "TUNAI" || rawMethod === "BAYAR DI TEMPAT" || rawChannel === "COD") {
    return "COD - Bayar di Tempat";
  }

  // Formatting mapping table
  const labels = {
    QRIS: "QRIS",
    BCA: "BCA VA",
    BCA_VA: "BCA VA",
    "BCA VA": "BCA VA",
    BNI: "BNI VA",
    BNI_VA: "BNI VA",
    "BNI VA": "BNI VA",
    BRI: "BRI VA",
    BRI_VA: "BRI VA",
    "BRI VA": "BRI VA",
    MANDIRI: "Mandiri VA",
    MANDIRI_VA: "Mandiri VA",
    "MANDIRI VA": "Mandiri VA",
    PERMATA: "Permata VA",
    PERMATA_VA: "Permata VA",
    "PERMATA VA": "Permata VA",
    CIMB: "CIMB VA",
    CIMB_VA: "CIMB VA",
    "CIMB VA": "CIMB VA",
    SAHABAT_SAMPOERNA: "Sahabat Sampoerna VA",
    OVO: "OVO",
    DANA: "DANA",
    SHOPEEPAY: "ShopeePay",
    GOPAY: "GoPay",
    LINKAJA: "LinkAja",
    ALFAMART: "Alfamart",
    INDOMARET: "Indomaret",
  };

  // If a valid channel is resolved, format it
  if (rawChannel) {
    const matchedLabel = labels[rawChannel];
    if (matchedLabel) {
      return matchedLabel;
    }
    const cleanStr = rawChannel.replace(/^(XENDIT|ONLINE|ONLINE_XENDIT|TRANSFER)\s*[-_]\s*/i, "").trim();
    if (cleanStr && cleanStr !== "PENDING" && cleanStr !== "UNPAID" && cleanStr !== "PAID") {
      if (["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "CIMB"].includes(cleanStr)) {
        return cleanStr + " VA";
      }
      if (cleanStr === "SHOPEEPAY") return "ShopeePay";
      return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1).toLowerCase();
    }
  }

  // If only generic provider like XENDIT exists without actual channel yet
  const genericGatewayNames = ["XENDIT", "ONLINE", "ONLINE_XENDIT", "TRANSFER", "BANK", "ONLINE_PAYMENT"];
  const isGeneric = genericGatewayNames.includes(rawMethod) || rawMethod === "";

  if (isGeneric) {
    return "Xendit";
  }

  // Fallback to method label if not generic
  const matchedMethodLabel = labels[rawMethod];
  if (matchedMethodLabel) {
    return matchedMethodLabel;
  }

  return "Transfer Bank";
}
