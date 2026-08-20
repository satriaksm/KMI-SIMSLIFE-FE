/**
 * Parse moderation block payload from API error response.
 * @param {unknown} error - Axios error object
 * @returns {object|null}
 */
export function parseModerationBlockError(error) {
  const response = error?.response;
  if (!response || response.status !== 403) {
    return null;
  }

  const body = response.data ?? {};
  if (body.code !== "moderation_blocked") {
    return null;
  }

  const data = body.data ?? {};

  return {
    message:
      body.message ||
      "Anda tidak dapat mempublish produk ini karena terkena pelanggaran.",
    reportId: data.report_id ?? null,
    productName: data.product_name ?? null,
    productSlug: data.product_slug ?? null,
    adminNote: data.admin_note ?? null,
    canAppeal: data.can_appeal ?? true,
    hasPendingAppeal: data.has_pending_appeal ?? false,
    blocked: data.blocked ?? true,
  };
}

/**
 * Build moderation block info from product list item.
 * @param {object|null} product
 * @returns {object|null}
 */
export function getProductModerationBlock(product) {
  const block = product?.moderation_block;
  if (!block?.blocked) {
    return null;
  }

  return {
    message:
      "Anda tidak dapat mempublish produk ini karena terkena pelanggaran.",
    reportId: block.report_id ?? null,
    productName: product?.name ?? null,
    productSlug: product?.slug ?? null,
    adminNote: block.admin_note ?? null,
    canAppeal: block.can_appeal ?? true,
    hasPendingAppeal: block.has_pending_appeal ?? false,
    blocked: true,
  };
}

export function isProductPublishBlocked(product) {
  return Boolean(product?.moderation_block?.blocked);
}