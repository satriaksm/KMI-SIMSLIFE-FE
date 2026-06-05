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
      village: { name: "Desa Test" },
      district: { name: "Kecamatan Test" },
      city: { name: "Kota Test" },
      province: { name: "Provinsi Test" },
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

async function mockMerchantApis(page, { merchant, user } = {}) {
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

  await page.route(`**/api/merchant/${merchantSlug}`, async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();

    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    if (route.request().method() !== "DELETE") return route.fallback();
    return fulfillJson(route, 200, { message: "Deleted" });
  });

  // Catch-all to keep tests deterministic.
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();

    const method = route.request().method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    // allow explicitly mocked endpoints
    if (
      url.includes(`/api/merchant/${merchantSlug}/profile`) ||
      url.includes(`/api/merchant/${merchantSlug}`) ||
      url.includes("/api/me")
    ) {
      return route.fallback();
    }

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}

test.describe("Merchant - profile info", () => {
  test("loads merchant profile and shows page", async ({ page }) => {
    await mockMerchantApis(page);

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile`,
    );

    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Toko UMKM Test", { exact: true }).first(),
    ).toBeVisible();
  });

  test("Edit UMKM navigates to edit page", async ({ page }) => {
    await mockMerchantApis(page);

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile`,
    );
    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole("button", { name: /Edit UMKM/ })
      .first()
      .click();
    await page.waitForURL(/\/merchant-center\/.+\/profile\/edit$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: /^Simpan$/ }).first(),
    ).toBeVisible();
  });

  test("delete merchant requires exact confirmation and calls API", async ({
    page,
  }) => {
    await mockMerchantApis(page);

    await page.goto(
      `${getFrontendBaseUrl(false)}/merchant-center/${merchantSlug}/profile`,
    );
    await expect(
      page.getByRole("heading", { name: "Informasi Toko" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole("button", { name: /Hapus UMKM/ })
      .first()
      .click();

    const modalHeading = page.getByRole("heading", {
      name: "Hapus UMKM",
    });
    await expect(modalHeading).toBeVisible();

    // Scope actions inside modal container
    const modalRoot = modalHeading.locator("..").locator("..").locator("..");
    await expect(modalRoot.getByText("Tindakan ini permanen")).toBeVisible();

    const deleteButton = modalRoot.getByRole("button", { name: /Hapus UMKM/ });
    await expect(deleteButton).toBeDisabled();

    await modalRoot
      .getByLabel("Ketik nama UMKM untuk konfirmasi")
      .fill("Salah Nama");
    await expect(deleteButton).toBeDisabled();

    await modalRoot
      .getByLabel("Ketik nama UMKM untuk konfirmasi")
      .fill("Toko UMKM Test");
    await expect(deleteButton).toBeEnabled();

    const deleteResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "DELETE") return false;
      try {
        return new URL(resp.url()).pathname === `/api/merchant/${merchantSlug}`;
      } catch {
        return false;
      }
    });

    await deleteButton.click();
    await deleteResponsePromise;

    // It should leave merchant-center page (it navigates to /profile in code).
    await page.waitForURL(
      (url) => !url.pathname.includes(`/merchant-center/${merchantSlug}`),
      {
        timeout: 15_000,
      },
    );
  });
});
