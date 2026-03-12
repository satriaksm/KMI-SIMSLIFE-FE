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
  await page.route(`**/api/merchant/${slug}/vouchers**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    const detailMatch = url.match(
      new RegExp(`/api/merchant/${slug}/vouchers/(\\d+)(?:/status)?(?:\\?|$)`),
    );

    // GET detail
    if (method === "GET" && detailMatch && !url.includes("/status")) {
      const id = Number(detailMatch[1]);
      const found = state.vouchers.find((v) => v.id === id);
      if (!found) return fulfillJson(route, 404, { message: "Not found" });
      return fulfillJson(route, 200, { data: found });
    }

    // PATCH status
    if (method === "PATCH" && url.includes("/status") && detailMatch) {
      const id = Number(detailMatch[1]);
      const payload = request.postDataJSON?.() ?? {};
      const nextStatus = payload.voucher_status;
      state.lastStatusPayload = payload;
      const index = state.vouchers.findIndex((v) => v.id === id);
      if (index === -1)
        return fulfillJson(route, 404, { message: "Not found" });
      state.vouchers[index] = {
        ...state.vouchers[index],
        voucher_status: nextStatus,
      };
      return fulfillJson(route, 200, { data: state.vouchers[index] });
    }

    // DELETE voucher
    if (method === "DELETE" && detailMatch && !url.includes("/status")) {
      const id = Number(detailMatch[1]);
      state.deletedIds.push(id);
      state.vouchers = state.vouchers.filter((v) => v.id !== id);
      return fulfillJson(route, 200, { message: "deleted" });
    }

    // Index list
    if (method === "GET" && url.includes(`/api/merchant/${slug}/vouchers`)) {
      const search = new URL(url).searchParams;
      const q = (search.get("q") || "").trim().toLowerCase();
      const data = q
        ? state.vouchers.filter(
            (v) =>
              String(v.voucher_name || "")
                .toLowerCase()
                .includes(q) ||
              String(v.voucher_code || "")
                .toLowerCase()
                .includes(q),
          )
        : state.vouchers;

      state.lastListQuery = q;
      return fulfillJson(route, 200, {
        data,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 25,
          total: data.length,
        },
      });
    }

    return route.fallback();
  });

  // Catch-all for other API calls
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    try {
      const pathname = new URL(url).pathname;
      if (!pathname.startsWith("/api/") && !pathname.startsWith("/sanctum/")) {
        return route.fallback();
      }
    } catch {
      return route.fallback();
    }

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    if (url.includes("/api/me")) return route.fallback();
    if (url.includes(`/api/merchant/${slug}/vouchers`)) return route.fallback();

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}

async function gotoVoucherIndex(page, slug) {
  await page.goto(`/merchant-center/${slug}/vouchers`);
  await expect(page).toHaveURL(new RegExp(`/merchant-center/${slug}/vouchers`));
  await expect(page.getByText("Kelola voucher promo.")).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

function rowByCode(page, code) {
  const table = page.locator("table");
  return table.locator("tr", { hasText: code }).first();
}

test.describe("Merchant Voucher - index page", () => {
  test("header create button navigates to create page", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const state = {
      vouchers: [
        {
          id: 2001,
          voucher_name: "Voucher Test Create Btn",
          voucher_code: "CREATEBTN",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 5000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);

    // Desktop button
    await page
      .getByRole("button", { name: /Tambah Voucher/i })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/create`),
    );
  });

  test("table edit button navigates to edit page", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const state = {
      vouchers: [
        {
          id: 2002,
          voucher_name: "Voucher Test Edit Btn",
          voucher_code: "EDITBTN",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 5000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);

    // Find the row and click the edit button
    const row = rowByCode(page, "EDITBTN");
    await row.locator('button[title="Edit Voucher"]').click();
    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/2002/edit`),
    );
  });

  test("voucher detail edit button navigates to edit page", async ({
    page,
  }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const state = {
      vouchers: [
        {
          id: 2002,
          voucher_name: "Voucher Test Edit Btn",
          voucher_code: "EDITBTN",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 5000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);

    // Find the row and click the detail button
    const row = rowByCode(page, "EDITBTN");
    await row.locator('button[title="Lihat Detail"]').click();

    const detailModal = page
      .locator("div.fixed")
      .filter({ has: page.locator('h2:has-text("Detail Voucher")') })
      .first();
    await expect(detailModal).toBeVisible();

    // Wait for the edit button to be visible in the modal
    const editBtn = detailModal.getByRole("button", { name: /^Edit$/ });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/2002/edit`),
    );
  });

  test("renders voucher list and supports search", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const state = {
      vouchers: [
        {
          id: 1001,
          voucher_name: "Voucher Diskon 10%",
          voucher_code: "DISKON10",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 5000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
        {
          id: 1002,
          voucher_name: "Voucher Nominal 2000",
          voucher_code: "POT2000",
          voucher_description: "desc",
          voucher_type: "fixed",
          value: 2000,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 0,
          usage_limit_per_user: 1,
          usage_limit: 10,
          voucher_status: "inactive",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);
    await expect(page.getByRole("table")).toContainText("DISKON10");
    await expect(page.getByRole("table")).toContainText("POT2000");

    await page.getByPlaceholder("Cari voucher").fill("pot2000");
    await page.getByPlaceholder("Cari voucher").press("Enter");

    await expect(page.getByRole("table")).toContainText("POT2000");
    await expect(page.getByRole("table")).not.toContainText("DISKON10");
    expect(state.lastListQuery).toBe("pot2000");
  });

  test("can open detail modal from table action", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 5);

    const state = {
      vouchers: [
        {
          id: 1101,
          voucher_name: "Voucher Detail (E2E)",
          voucher_code: "DETAIL1101",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 15,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 10000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);

    const row = rowByCode(page, "DETAIL1101");
    await row.locator('button[title="Lihat Detail"]').click();

    const detailModal = page
      .locator("div.fixed")
      .filter({ has: page.locator('h2:has-text("Detail Voucher")') })
      .first();

    await expect(
      detailModal.locator('h2:has-text("Detail Voucher")'),
    ).toBeVisible();
    await expect(
      detailModal.locator("p").filter({ hasText: "DETAIL1101" }).first(),
    ).toBeVisible();
  });

  test("can delete voucher from table action", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 5);

    const state = {
      vouchers: [
        {
          id: 1201,
          voucher_name: "Voucher Delete (E2E)",
          voucher_code: "DEL1201",
          voucher_description: "desc",
          voucher_type: "fixed",
          value: 2000,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 0,
          usage_limit_per_user: 1,
          usage_limit: 10,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);
    await expect(page.getByRole("table")).toContainText("DEL1201");

    const row = rowByCode(page, "DEL1201");
    await row.locator('button[title="Hapus Voucher"]').click();

    const deleteModal = page
      .locator("div.fixed")
      .filter({ has: page.locator('h2:has-text("Hapus Voucher")') })
      .first();

    await expect(
      deleteModal.locator('h2:has-text("Hapus Voucher")'),
    ).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "DELETE" &&
          r.url().includes(`/api/merchant/${merchantSlug}/vouchers/1201`) &&
          r.status() === 200,
      ),
      deleteModal.getByRole("button", { name: /Hapus Voucher/ }).click(),
    ]);

    await expect(deleteModal).toBeHidden({ timeout: 15_000 });

    expect(state.deletedIds).toEqual([1201]);
    await expect(page.locator("table tr", { hasText: "DEL1201" })).toHaveCount(
      0,
      { timeout: 15_000 },
    );
  });

  test("can change voucher status via modals", async ({ page }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 5);

    const state = {
      vouchers: [
        {
          id: 1301,
          voucher_name: "Voucher Status (E2E)",
          voucher_code: "STAT1301",
          voucher_description: "desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 0,
          max_discount_amount: 0,
          usage_limit_per_user: 1,
          usage_limit: 10,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastListQuery: "",
      lastStatusPayload: null,
      deletedIds: [],
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherIndex(page, merchantSlug);

    const row = rowByCode(page, "STAT1301");
    await row.locator('button[title="Ubah Status"]').click();
    await expect(page.getByText("Ubah Status Voucher")).toBeVisible();

    await page.getByRole("button", { name: "Tidak Aktif" }).click();
    await expect(page.getByText("Konfirmasi Ubah Status")).toBeVisible();

    await page.getByRole("button", { name: "Ubah Status" }).click();

    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    expect(state.lastStatusPayload).toEqual({ voucher_status: "inactive" });
    await expect(page.getByRole("table")).toContainText("Tidak Aktif");
  });
});
