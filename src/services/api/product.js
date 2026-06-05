import api from "@/libs/axios";

/* =====================================================
 * PUBLIC PRODUCTS
 * ===================================================== */
export async function getPublicProductDetail(slug) {
  const { data } = await api.get(`/api/public/products/${slug}`);
  return data;
}

export async function getPublicMerchantProducts(merchantSlug, params = {}) {
  const { data } = await api.get(
    `/api/public/merchants/${merchantSlug}/products`,
    { params },
  );
  return data;
}

/* =====================================================
 * ADMIN MERCHANT PRODUCTS
 * ===================================================== */
export async function getProducts(merchantSlug, params = {}) {
  const { data } = await api.get(`/api/merchant/${merchantSlug}/products`, {
    params,
  });
  return data;
}

export async function getProductDetail(merchantSlug, slug) {
  const { data } = await api.get(
    `/api/merchant/${merchantSlug}/products/${slug}`,
  );
  return data;
}

export async function createProduct(merchantSlug, payload) {
  const { data } = await api.post(
    `/api/merchant/${merchantSlug}/products`,
    payload,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
}

export async function editProduct(merchantSlug, slug, payload) {
  const { data } = await api.post(
    `/api/merchant/${merchantSlug}/products/${slug}`,
    payload,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
}

export async function editStatus(merchantSlug, slug, status) {
  const { data } = await api.patch(
    `/api/merchant/${merchantSlug}/products/${slug}/status`,
    { status },
  );
  return data;
}
export async function deleteProduct(merchantSlug, slug) {
  const { data } = await api.delete(
    `/api/merchant/${merchantSlug}/products/${slug}`,
  );
  return data;
}

export async function deleteBulk(merchantSlug, productSlugs = []) {
  const { data } = await api.post(
    `/api/merchant/${merchantSlug}/products/bulk-delete`,
    {
      product_slugs: productSlugs,
    },
  );
  return data;
}

export async function editBulkStatus(merchantSlug, productSlugs = [], status) {
  const { data } = await api.post(
    `/api/merchant/${merchantSlug}/products/bulk-update-status`,
    {
      product_slugs: productSlugs,
      status,
    },
  );
  return data;
}

export async function exportPDF(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/products/export/pdf`, {
    params,
    responseType: "blob",
  });
}

export async function exportExcel(merchantSlug, params = {}) {
  return api.get(`/api/merchant/${merchantSlug}/products/export/excel`, {
    params,
    responseType: "blob",
  });
}
