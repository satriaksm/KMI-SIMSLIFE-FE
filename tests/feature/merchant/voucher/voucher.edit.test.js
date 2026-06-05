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

    // Detail
    const detailMatch = url.match(
      new RegExp(`/api/merchant/${slug}/vouchers/(\\d+)(?:\\?|$)`),
    );
    if (method === "GET" && detailMatch) {
      const id = Number(detailMatch[1]);
      const found = state.vouchers.find((v) => v.id === id);
      if (!found) return fulfillJson(route, 404, { message: "Not found" });
      return fulfillJson(route, 200, { data: found });
    }

    // Edit
    if (method === "PUT" && detailMatch) {
      if (typeof state.onEdit === "function") return state.onEdit(route);

      const id = Number(detailMatch[1]);
      const payload = request.postDataJSON?.() ?? {};
      state.lastEditPayload = payload;

      const index = state.vouchers.findIndex((v) => v.id === id);
      if (index === -1)
        return fulfillJson(route, 404, { message: "Not found" });

      const updated = {
        ...state.vouchers[index],
        voucher_name: payload.voucher_name,
        voucher_code: payload.voucher_code,
        voucher_description: payload.voucher_description,
        voucher_type: payload.voucher_type,
        value: payload.value,
        voucher_start_date: payload.voucher_start_date,
        voucher_end_date: payload.voucher_end_date,
        min_purchase_amount: payload.min_purchase_amount ?? 0,
        usage_limit_per_user: payload.usage_limit_per_user ?? 1,
        usage_limit: payload.usage_limit ?? 0,
        max_discount_amount: payload.max_discount_amount ?? 0,
      };

      state.vouchers[index] = updated;
      return fulfillJson(route, 200, { data: updated });
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

async function gotoVoucherEdit(page, slug, id) {
  await page.goto(`/merchant-center/${slug}/vouchers/${id}/edit`);
  await expect(page).toHaveURL(
    new RegExp(`/merchant-center/${slug}/vouchers/${id}/edit`),
  );
  await expect(page.getByLabel("Nama Voucher")).toBeVisible({
    timeout: 15_000,
  });
}

async function expectVoucherListed(page, { code, name }) {
  await expect(page.getByText("Kelola voucher promo.")).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });

  const table = page.getByRole("table");
  if ((await table.count()) > 0) {
    if (code) await expect(table).toContainText(code);
    if (name) await expect(table).toContainText(name);
    return;
  }
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

test.describe("Merchant Voucher - edit flow", () => {
  test("loads detail, edits voucher, redirects to index and shows updated data", async ({
    page,
  }) => {
    const user = buildUser();

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const state = {
      vouchers: [
        {
          id: 9001,
          voucher_name: "Voucher Lama (E2E)",
          voucher_code: "LAMAE2E",
          voucher_description: "Old desc",
          voucher_type: "percent",
          value: 10,
          voucher_start_date: toLocalISODate(start),
          voucher_end_date: toLocalISODate(end),
          min_purchase_amount: 10000,
          max_discount_amount: 5000,
          usage_limit_per_user: 1,
          usage_limit: 100,
          voucher_status: "active",
          is_expired: false,
          usage: "0/0",
        },
      ],
      lastEditPayload: null,
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherEdit(page, merchantSlug, 9001);

    await expect(page.getByLabel("Kode Voucher")).toHaveValue("LAMAE2E");

    await page.getByLabel("Nama Voucher").fill("Voucher Baru (E2E)");
    await page.getByLabel("Kode Voucher").fill("BARUE2E");
    await page.getByLabel("Deskripsi").fill("Updated desc");

    await page.getByLabel("Tipe Voucher").selectOption("fixed");

    // fixed: max diskon field should be hidden (v-show)
    await expect(page.getByLabel("Maksimal Besaran Diskon")).toBeHidden();

    // Edit.vue renders 2 inputs with the same id/name via v-show; pick the visible one.
    await page.locator("input#value:visible").fill("2000");
    await page.getByLabel("Minimal Pembelian").fill("0");
    await page.getByLabel("Pemakaian Per User").fill("2");
    await page.getByLabel("Total Stok Voucher").fill("10");

    await page
      .getByRole("button", { name: /Simpan Perubahan/i })
      .first()
      .click();

    await page.waitForURL(`**/merchant-center/${merchantSlug}/vouchers`);

    expect(state.lastEditPayload).toBeTruthy();
    expect(state.lastEditPayload.voucher_type).toBe("fixed");

    await expectVoucherListed(page, {
      code: "BARUE2E",
      name: "Voucher Baru (E2E)",
    });
  });

  test("validation: shows required messages on empty submit (edit)", async ({
    page,
  }) => {
    const user = buildUser();
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const state = {
      vouchers: [
        {
          id: 9201,
          voucher_name: "Voucher Edit (E2E)",
          voucher_code: "EDITREQ",
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
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherEdit(page, merchantSlug, 9201);

    // Clear all required fields
    await page.getByLabel("Nama Voucher").fill("");
    await page.getByLabel("Kode Voucher").fill("");
    await page.getByLabel("Deskripsi").fill("");

    await page
      .getByRole("button", { name: /Simpan Perubahan/i })
      .first()
      .click();

    await expect(page.getByText("Nama voucher wajib diisi")).toBeVisible();
    await expect(page.getByText("Kode voucher wajib diisi")).toBeVisible();
    await expect(page.getByText("Deskripsi wajib diisi")).toBeVisible();

    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/9201/edit`),
    );
  });

  test("validation: voucher code cannot contain spaces (blocks PUT)", async ({
    page,
  }) => {
    const user = buildUser();
    let putCalled = false;

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 3);

    const state = {
      vouchers: [
        {
          id: 9101,
          voucher_name: "Voucher Edit (E2E)",
          voucher_code: "EDITOK",
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
    };

    state.onEdit = async (route) => {
      putCalled = true;
      return route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "PUT should not be called" }),
      });
    };

    await seedAuthStorage(page, user);
    await mockAuthMe(page, user);
    await mockMerchantVouchersApi(page, merchantSlug, state);

    await gotoVoucherEdit(page, merchantSlug, 9101);

    await page.getByLabel("Kode Voucher").fill("EDIT SPASI");

    await page
      .getByRole("button", { name: /Simpan Perubahan/i })
      .first()
      .click();

    await expect(
      page.getByText("Kode voucher tidak boleh mengandung spasi"),
    ).toBeVisible();

    await page.waitForTimeout(300);
    expect(putCalled).toBe(false);

    await expect(page).toHaveURL(
      new RegExp(`/merchant-center/${merchantSlug}/vouchers/9101/edit`),
    );
  });
});
