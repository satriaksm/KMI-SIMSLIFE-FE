import { test, expect } from "playwright/test";
import "dotenv/config";

import {
  getFrontendBaseUrl,
  corsHeaders,
  fulfillJson,
  isFrontendOrigin,
} from "../../auth/_authTestUtils.js";

const merchantSlug = "merchant-test";

function buildUmkmOwnerUser(overrides = {}) {
  return {
    id: 10,
    name: "UMKM Owner",
    email: "umkm.owner@example.com",
    phone: "081234567890",
    profile_picture: null,
    roles: ["umkm-owner"],
    merchants: [
      {
        id: 99,
        name: "Toko UMKM Test",
        slug: merchantSlug,
        status: "approved",
      },
    ],
    ...overrides,
  };
}

function buildMerchantProfile(overrides = {}) {
  return {
    name: "Toko UMKM Test",
    phone: "081234567890",
    description: "Deskripsi toko untuk testing",
    logo_url: "https://example.com/logo.png",
    banner_url: "https://example.com/banner.png",
    primary_address: {
      detail: "Jl. Test No 1",
      province_id: 1,
      city_id: 10,
      district_id: 100,
      village_id: 1000,
      latitude: -7.0,
      longitude: 110.0,
    },
    operational_hours: {
      monday: { is_open: true, open: "08:00", close: "17:00" },
      tuesday: { is_open: true, open: "08:00", close: "17:00" },
      wednesday: { is_open: true, open: "08:00", close: "17:00" },
      thursday: { is_open: true, open: "08:00", close: "17:00" },
      friday: { is_open: true, open: "08:00", close: "17:00" },
      saturday: { is_open: false },
      sunday: { is_open: false },
    },
    ...overrides,
  };
}

function toastLocator(page, textOrRegex) {
  return page
    .locator(".Vue-Toastification__toast")
    .filter({ hasText: textOrRegex });
}

async function mockMerchantEditApis(page, { merchant, user, update } = {}) {
  const resolvedUser = user || buildUmkmOwnerUser();
  const resolvedMerchant = merchant || buildMerchantProfile();

  await page.route("**/sanctum/csrf-cookie", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
  });

  await page.route("**/api/me", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, resolvedUser);
  });

  await page.route(`**/api/merchant/${merchantSlug}/profile`, async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, { data: resolvedMerchant });
  });

  await page.route(`**/api/merchant/${merchantSlug}/update`, async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "POST") return route.fallback();

    if (typeof update === "function") {
      return update(route, { merchant: resolvedMerchant, fulfillJson });
    }

    if (update && typeof update === "object") {
      return fulfillJson(
        route,
        update.status ?? 200,
        update.body ?? { data: { ...resolvedMerchant } },
        update.headers ?? {},
      );
    }

    return fulfillJson(route, 200, { data: { ...resolvedMerchant } });
  });

  // Location endpoints (minimal payloads)
  await page.route("**/api/public/locations/provinces**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, [{ id: 1, name: "Provinsi Test" }]);
  });
  await page.route("**/api/public/locations/cities/1**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, [{ id: 10, name: "Kota Test" }]);
  });
  await page.route("**/api/public/locations/districts/10**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, [{ id: 100, name: "Kecamatan Test" }]);
  });
  await page.route("**/api/public/locations/villages/100**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (route.request().method() !== "GET") return route.fallback();
    return fulfillJson(route, 200, [{ id: 1000, name: "Desa Test" }]);
  });

  // Catch-all
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();

    const method = route.request().method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    if (
      url.includes(`/api/merchant/${merchantSlug}/profile`) ||
      url.includes(`/api/merchant/${merchantSlug}/update`) ||
      url.includes("/api/public/locations/") ||
      url.includes("/api/me")
    ) {
      return route.fallback();
    }

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}

test.describe("Merchant - profile edit", () => {
  test("loads edit page and saves changes (mock)", async ({ page }) => {
    await mockMerchantEditApis(page);

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile/edit`,
    );

    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    // Inputs don't have associated <label for>, so use placeholders.
    await page
      .getByPlaceholder("Masukkan nama toko")
      .last()
      .fill("Toko UMKM Baru");
    await page
      .getByPlaceholder("Masukkan nomor kontak")
      .last()
      .fill("089999999999");
    await page
      .getByPlaceholder("Ceritakan tentang toko Anda...")
      .last()
      .fill("Deskripsi baru dari Playwright");

    const updateResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return (
          new URL(resp.url()).pathname ===
          `/api/merchant/${merchantSlug}/update`
        );
      } catch {
        return false;
      }
    });

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();
    await updateResponsePromise;

    await page.waitForURL(
      new RegExp(`/merchant-center/${merchantSlug}/profile$`),
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible();
  });

  test("shows toast error when name is empty (backend 422)", async ({
    page,
  }) => {
    await mockMerchantEditApis(page, {
      update: {
        status: 422,
        body: {
          message: "The given data was invalid.",
          errors: { name: ["Nama toko wajib diisi"] },
        },
      },
    });

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile/edit`,
    );

    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder("Masukkan nama toko").last().fill("");

    const updateResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return (
          new URL(resp.url()).pathname ===
          `/api/merchant/${merchantSlug}/update`
        );
      } catch {
        return false;
      }
    });

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();
    const resp = await updateResponsePromise;
    expect(resp.status()).toBe(422);

    await expect(toastLocator(page, /Nama toko wajib diisi/i)).toBeVisible();

    // Note: MerchantEdit currently navigates back even on error.
    await page.waitForURL(
      new RegExp(`/merchant-center/${merchantSlug}/profile$`),
      { timeout: 15_000 },
    );
  });

  test("shows toast error when province is cleared (backend 422)", async ({
    page,
  }) => {
    await mockMerchantEditApis(page, {
      update: {
        status: 422,
        body: {
          message: "The given data was invalid.",
          errors: { province_id: ["Provinsi wajib dipilih"] },
        },
      },
    });

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile/edit`,
    );

    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const provinceSelect = page.locator('select[id="form.province_id"]').last();
    await expect(provinceSelect).toBeVisible();
    await provinceSelect.selectOption("");

    const updateResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return (
          new URL(resp.url()).pathname ===
          `/api/merchant/${merchantSlug}/update`
        );
      } catch {
        return false;
      }
    });

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();
    const resp = await updateResponsePromise;
    expect(resp.status()).toBe(422);

    await expect(toastLocator(page, /Provinsi wajib dipilih/i)).toBeVisible();
    await page.waitForURL(
      new RegExp(`/merchant-center/${merchantSlug}/profile$`),
      { timeout: 15_000 },
    );
  });

  test("shows toast error when server fails (500)", async ({ page }) => {
    await mockMerchantEditApis(page, {
      update: {
        status: 500,
        body: { message: "Server sedang bermasalah" },
      },
    });

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile/edit`,
    );

    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await expect(toastLocator(page, /Server sedang bermasalah/i)).toBeVisible();
    await page.waitForURL(
      new RegExp(`/merchant-center/${merchantSlug}/profile$`),
      { timeout: 15_000 },
    );
  });
});
