import { test, expect } from "playwright/test";

const merchantSlug = "demo-merchant";
const FE_ORIGIN = "http://127.0.0.1:5173";

const corsHeaders = {
  "access-control-allow-origin": FE_ORIGIN,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers":
    "Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept",
  "access-control-max-age": "600",
};

function fulfillJson(route, status, data) {
  return route.fulfill({
    status,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildUser(overrides = {}) {
  return {
    id: 1,
    name: "Merchant Owner",
    email: "merchant@example.com",
    phone: null,
    profile_picture: null,
    roles: ["umkm-owner"],
    merchants: [
      {
        id: 101,
        slug: merchantSlug,
        name: "Demo Merchant",
        status: "approved",
        segmentation: { id: 1, name: "Produk" },
      },
    ],
    ...overrides,
  };
}

async function seedAuthStorage(page, user, selectedSlug = merchantSlug) {
  await page.addInitScript(
    ({ userValue, selected }) => {
      localStorage.setItem("user", JSON.stringify(userValue));
      localStorage.setItem("selected_merchant_slug", String(selected || ""));
    },
    { userValue: user, selected: selectedSlug },
  );
}

async function mockAuthMe(page, user) {
  await page.route("**/api/me", async (route) => {
    const method = route.request().method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (method !== "GET") return route.fallback();
    return fulfillJson(route, 200, user);
  });
}

async function mockMerchantVouchersApi(page, slug, state) {
  // Specific merchant vouchers endpoints
  await page.route(`**/api/merchant/${slug}/vouchers**`, async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    if (method === "GET") {
      return fulfillJson(route, 200, {
        data: state.vouchers,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 25,
          total: state.vouchers.length,
        },
      });
    }

    if (
      method === "POST" &&
      request.url().includes(`/api/merchant/${slug}/vouchers`)
    ) {
      if (typeof state.onCreate === "function") {
        return state.onCreate(route);
      }

      const payload = request.postDataJSON?.() ?? {};
      state.lastCreatePayload = payload;

      const created = {
        id: state.nextId++,
        voucher_name: payload.voucher_name,
        voucher_code: payload.voucher_code,
        voucher_description: payload.voucher_description,
        voucher_type: payload.voucher_type,
        value: payload.value,
        voucher_start_date: payload.voucher_start_date,
        voucher_end_date: payload.voucher_end_date,
        min_purchase_amount: payload.min_purchase_amount ?? 0,
        max_discount_amount: payload.max_discount_amount ?? 0,
        usage_limit_per_user: payload.usage_limit_per_user ?? 1,
        usage_limit: payload.usage_limit ?? 0,
        voucher_status: "active",
        is_expired: false,
        usage: "0/0",
      };

      state.vouchers.unshift(created);

      return fulfillJson(route, 200, { data: created });
    }

    return route.fallback();
  });

  // Helpful: stub common merchant logo endpoints to avoid hitting BE
  await page.route("**/api/merchant-logo/**", async (route) => {
    return route.fulfill({ status: 200, headers: corsHeaders, body: "" });
  });
  await page.route("**/api/merchant-banner/**", async (route) => {
    return route.fulfill({ status: 200, headers: corsHeaders, body: "" });
  });

  // Catch-all for other API calls (so tests stay deterministic even if BE is down)
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // IMPORTANT: this glob also matches frontend module URLs like
    // /src/services/api/voucher.js. Only intercept real backend API paths.
    try {
      const pathname = new URL(url).pathname;
      if (!pathname.startsWith("/api/") && !pathname.startsWith("/sanctum/")) {
        return route.fallback();
      }
    } catch {
      // If URL parsing fails, don't risk breaking the app.
      return route.fallback();
    }

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    // allow /api/me and merchant/vouchers mocked above
    if (url.includes("/api/me")) return route.fallback();
    if (url.includes(`/api/merchant/${slug}/vouchers`)) return route.fallback();

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}

async function gotoVoucherCreate(page, slug) {
  await page.goto(`/merchant-center/${slug}/vouchers/create`);
  await expect(page).toHaveURL(
    new RegExp(`/merchant-center/${slug}/vouchers/create`),
  );
  await expect(page.getByLabel("Nama Voucher")).toBeVisible({
    timeout: 15_000,
  });
}

async function expectVoucherListed(page, { code, name }) {
  // Ensure index page has rendered
  await expect(page.getByText("Kelola voucher promo.")).toBeVisible({
    timeout: 15_000,
  });

  // Let initial fetch/render settle (Index.vue triggers async load on mount/watch)
  await page.waitForLoadState("networkidle", { timeout: 15_000 });

  const table = page.getByRole("table");
  if ((await table.count()) > 0) {
    if (code) await expect(table).toContainText(code);
    if (name) await expect(table).toContainText(name);
    return;
  }

  // Mobile layout: assert a visible element contains the text
  if (code) {
    await expect(
      page.locator(`:visible:has-text("${code}")`).first(),
    ).toBeVisible({ timeout: 15_000 });
  }
  if (name) {
    await expect(
      page.locator(`:visible:has-text("${name}")`).first(),
    ).toBeVisible({ timeout: 15_000 });
  }
}

test.describe("Merchant Voucher - create flow", () => {
  test("create percent voucher -> redirect -> appears in index list", async ({
    page,
  }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 5001, lastCreatePayload: null };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    await gotoVoucherCreate(page, merchantSlug);

    await page.getByLabel("Nama Voucher").fill("Voucher Diskon 10% (E2E)");
    await page.getByLabel("Kode Voucher").fill("DISKON10E2E");
    await page.getByLabel("Deskripsi").fill("Voucher testing playwright");

    await page.getByLabel("Tipe Voucher").selectOption("percent");
    await page.getByLabel("Nilai").fill("10");
    await page.getByLabel("Minimal Pembelian").fill("10000");

    // percent => max_discount_amount should exist
    await expect(page.locator("#max_discount_amount")).toHaveCount(1);
    await page.getByLabel("Maksimal Besaran Diskon").fill("5000");

    await page.getByLabel("Pemakaian Per User").fill("1");
    await page.getByLabel("Total Stok Voucher").fill("100");
    await page.getByLabel("Tanggal Mulai Berlaku").fill(toLocalISODate(start));
    await page.getByLabel("Tanggal Kadaluarsa").fill(toLocalISODate(end));

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await page.waitForURL(`**/merchant-center/${merchantSlug}/vouchers`);

    await page.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        r.url().includes(`/api/merchant/${merchantSlug}/vouchers`) &&
        r.status() === 200,
    );

    await expectVoucherListed(page, {
      code: "DISKON10E2E",
      name: "Voucher Diskon 10% (E2E)",
    });
  });

  test("create fixed voucher does NOT send max_discount_amount", async ({
    page,
  }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 6001, lastCreatePayload: null };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 3);

    await gotoVoucherCreate(page, merchantSlug);

    await page.getByLabel("Nama Voucher").fill("Voucher Potongan 2000 (E2E)");
    await page.getByLabel("Kode Voucher").fill("POT2000E2E");
    await page.getByLabel("Deskripsi").fill("Fixed voucher playwright");

    await page.getByLabel("Tipe Voucher").selectOption("fixed");
    await page.getByLabel("Nilai").fill("2000");
    await page.getByLabel("Minimal Pembelian").fill("0");

    // fixed => max_discount_amount should NOT exist
    await expect(page.locator("#max_discount_amount")).toHaveCount(0);

    await page.getByLabel("Pemakaian Per User").fill("2");
    await page.getByLabel("Total Stok Voucher").fill("10");
    await page.getByLabel("Tanggal Mulai Berlaku").fill(toLocalISODate(start));
    await page.getByLabel("Tanggal Kadaluarsa").fill(toLocalISODate(end));

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await page.waitForURL(`**/merchant-center/${merchantSlug}/vouchers`);
    expect(state.lastCreatePayload).toBeTruthy();
    expect(state.lastCreatePayload).not.toHaveProperty("max_discount_amount");

    await expectVoucherListed(page, { code: "POT2000E2E" });
  });

  test("client validation: required fields prevent POST", async ({ page }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 7001, lastCreatePayload: null };
    let postCalled = false;

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);

    state.onCreate = async (route) => {
      postCalled = true;
      return route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "POST should not be called" }),
      });
    };
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherCreate(page, merchantSlug);

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    // Small delay to ensure no async submit sneaks in
    await page.waitForTimeout(300);
    expect(postCalled).toBe(false);

    // Still on create page (no successful navigation)
    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/create`),
    );
  });

  test("validation: shows required messages on empty submit", async ({
    page,
  }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 7101, lastCreatePayload: null };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherCreate(page, merchantSlug);

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await expect(page.getByText("Nama voucher wajib diisi")).toBeVisible();
    await expect(page.getByText("Kode voucher wajib diisi")).toBeVisible();
    await expect(page.getByText("Deskripsi wajib diisi")).toBeVisible();

    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/create`),
    );
  });

  test("validation: voucher code cannot contain spaces (blocks POST)", async ({
    page,
  }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 7201, lastCreatePayload: null };
    let postCalled = false;

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);

    state.onCreate = async (route) => {
      postCalled = true;
      return route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "POST should not be called" }),
      });
    };
    await mockMerchantVouchersApi(page, merchantSlug, state);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 2);

    await gotoVoucherCreate(page, merchantSlug);

    await page.getByLabel("Nama Voucher").fill("Voucher Spasi (E2E)");
    await page.getByLabel("Kode Voucher").fill("DISKON 10");
    await page.getByLabel("Deskripsi").fill("Kode voucher mengandung spasi");

    await page.getByLabel("Nilai").fill("10");
    await page.getByLabel("Pemakaian Per User").fill("1");
    await page.getByLabel("Tanggal Mulai Berlaku").fill(toLocalISODate(start));
    await page.getByLabel("Tanggal Kadaluarsa").fill(toLocalISODate(end));

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await expect(
      page.getByText("Kode voucher tidak boleh mengandung spasi"),
    ).toBeVisible();

    await page.waitForTimeout(300);
    expect(postCalled).toBe(false);
    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/create`),
    );
  });

  test("invalid merchant slug redirects to merchant-register", async ({
    page,
  }) => {
    const user = buildUser({
      merchants: [
        {
          id: 999,
          slug: "other-merchant",
          name: "Other Merchant",
          status: "approved",
          segmentation: { id: 1, name: "Produk" },
        },
      ],
    });

    await seedAuthStorage(page, user, "other-merchant");
    await mockAuthMe(page, user);

    await page.goto(`/merchant-center/not-owned/vouchers/create`);
    // Current router behavior: guard sends to /merchant-register, but that page
    // is customer-only, so merchant users end up redirected to home (/).
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  test("API error on create shows toast and stays on create page", async ({
    page,
  }) => {
    const user = buildUser();
    const state = { vouchers: [], nextId: 8001, lastCreatePayload: null };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);

    state.onCreate = async (route) => {
      return route.fulfill({
        status: 422,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "Kode voucher sudah digunakan" }),
      });
    };
    await mockMerchantVouchersApi(page, merchantSlug, state);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 1);

    await gotoVoucherCreate(page, merchantSlug);

    await page.getByLabel("Nama Voucher").fill("Voucher Error (E2E)");
    await page.getByLabel("Kode Voucher").fill("DUPLICATE");
    await page.getByLabel("Deskripsi").fill("Should fail");
    await page.getByLabel("Nilai").fill("10");
    await page.getByLabel("Pemakaian Per User").fill("1");
    await page.getByLabel("Tanggal Mulai Berlaku").fill(toLocalISODate(start));
    await page.getByLabel("Tanggal Kadaluarsa").fill(toLocalISODate(end));

    await page
      .getByRole("button", { name: /^Simpan$/ })
      .first()
      .click();

    await expect(page.getByText("Kode voucher sudah digunakan")).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/create`),
    );
  });
});
