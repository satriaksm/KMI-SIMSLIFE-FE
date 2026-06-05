import { test, expect } from "playwright/test";
import "dotenv/config";

const FE_ORIGIN = process.env.E2E_FE_ORIGIN || "http://127.0.0.1:5173";
const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:8000";

// Toggle mode:
// - default: mocked auth API (stable/deterministic)
// - set E2E_USE_REAL_API=1 to hit your real backend (/sanctum/csrf-cookie, /login, /api/me)
const USE_REAL_API =
  String(process.env.E2E_USE_REAL_API || "").toLowerCase() === "1" ||
  String(process.env.E2E_USE_REAL_API || "").toLowerCase() === "true";

// Real API credentials (recommended: set via env, not hardcoded)
// - E2E_ADMIN_LOGIN_EMAIL / E2E_ADMIN_LOGIN_PASSWORD
// - E2E_CUSTOMER_LOGIN_EMAIL / E2E_CUSTOMER_LOGIN_PASSWORD
//
// Optional local fallback (DO NOT COMMIT real secrets):
const ADMIN_REAL_EMAIL = process.env.E2E_ADMIN_LOGIN_EMAIL || "";
const ADMIN_REAL_PASSWORD = process.env.E2E_ADMIN_LOGIN_PASSWORD || "";
const CUSTOMER_REAL_EMAIL = process.env.E2E_CUSTOMER_LOGIN_EMAIL || "";
const CUSTOMER_REAL_PASSWORD = process.env.E2E_CUSTOMER_LOGIN_PASSWORD || "";

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

function isFrontendOrigin(urlString) {
  try {
    return new URL(urlString).origin === FE_ORIGIN;
  } catch {
    return false;
  }
}

function getFrontendBaseUrl(useRealApi = USE_REAL_API) {
  // Laravel Sanctum's XSRF cookie is domain-scoped (port is ignored).
  // If FE uses 127.0.0.1 but API uses localhost (or vice versa),
  // FE won't see `XSRF-TOKEN` in document.cookie and POST /login can return 419.
  if (!useRealApi) return FE_ORIGIN;
  if (process.env.E2E_FE_BASE_URL) return String(process.env.E2E_FE_BASE_URL);

  try {
    const apiHost = new URL(API_BASE_URL).hostname;
    const feUrl = new URL(FE_ORIGIN);
    feUrl.hostname = apiHost;
    return feUrl.origin;
  } catch {
    return FE_ORIGIN;
  }
}

function buildUser(overrides = {}) {
  return {
    id: 1,
    name: "Test User",
    email: "user@example.com",
    phone: null,
    profile_picture: null,
    roles: ["customer"],
    merchants: [],
    ...overrides,
  };
}

async function mockAuthApi(page, { user, onLogin } = {}) {
  const resolvedUser = user || buildUser();
  const session = { loggedIn: false };

  await page.route("**/sanctum/csrf-cookie", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();

    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    // Laravel usually returns 204 + sets cookies. For our mock, 204 is enough.
    return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
  });

  await page.route("**/login", async (route) => {
    const req = route.request();
    const url = req.url();
    if (isFrontendOrigin(url)) return route.fallback();

    if (req.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    if (req.method() !== "POST") return route.fallback();
    if (typeof onLogin === "function") return onLogin(route, session);

    // default login success
    session.loggedIn = true;
    return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
  });

  await page.route("**/api/me", async (route) => {
    const req = route.request();
    const url = req.url();
    if (isFrontendOrigin(url)) return route.fallback();

    if (req.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }
    if (req.method() !== "GET") return route.fallback();

    if (!session.loggedIn) {
      return fulfillJson(route, 401, { message: "Unauthenticated" });
    }

    return fulfillJson(route, 200, resolvedUser);
  });

  // Catch-all to keep tests deterministic if BE is down.
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (isFrontendOrigin(url)) return route.fallback();

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

    if (url.includes("/api/me") || url.includes("/sanctum/csrf-cookie")) {
      return route.fallback();
    }

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}

async function gotoLogin(page) {
  await page.goto(`${getFrontendBaseUrl()}/login`);
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Kata Sandi")).toBeVisible();
}

async function gotoLoginWithMode(page, useRealApi) {
  await page.goto(`${getFrontendBaseUrl(useRealApi)}/login`);
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Kata Sandi")).toBeVisible();
}

async function ensureRealApiCsrfCookie(page, useRealApi = USE_REAL_API) {
  if (!useRealApi) return;

  const origin = getFrontendBaseUrl(useRealApi);

  const res = await page.request.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    headers: {
      Origin: origin,
      Referer: `${origin}/`,
      Accept: "application/json",
    },
  });

  // Laravel usually returns 204; some setups return 200.
  expect([200, 204]).toContain(res.status());
}

test.describe("Auth - login", () => {
  test("login success (customer) redirects to /", async ({ page }) => {
    const useRealApi =
      USE_REAL_API && Boolean(CUSTOMER_REAL_EMAIL && CUSTOMER_REAL_PASSWORD);

    if (!useRealApi) {
      await mockAuthApi(page, {
        user: buildUser({ roles: ["customer"], merchants: [] }),
      });
    }

    await gotoLoginWithMode(page, useRealApi);

    // Some backends will return 419 if /sanctum/csrf-cookie wasn't called.
    // The app calls it too, but it is wrapped in try/catch; making it explicit keeps tests stable.
    await ensureRealApiCsrfCookie(page, useRealApi);

    await page
      .getByLabel("Email")
      .fill(useRealApi ? CUSTOMER_REAL_EMAIL : "customer@example.com");
    await page
      .getByLabel("Kata Sandi")
      .fill(useRealApi ? CUSTOMER_REAL_PASSWORD : "password");

    const loginResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return new URL(resp.url()).pathname === "/login";
      } catch {
        return false;
      }
    });

    await page.getByRole("button", { name: /^Masuk$/ }).click();

    if (useRealApi) {
      const loginResp = await loginResponsePromise;
      expect(
        loginResp.status(),
        `Real API /login must succeed (got ${loginResp.status()})`,
      ).toBeLessThan(400);
    }

    await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
      timeout: 15_000,
    });

    if (!useRealApi) {
      await expect(page).toHaveURL(/\/$/);
    }

    const userRaw = await page.evaluate(() => localStorage.getItem("user"));
    expect(userRaw).toBeTruthy();
  });

  test("login success (admin) redirects to /admin/dashboard", async ({
    page,
  }) => {
    const useRealApi =
      USE_REAL_API && Boolean(ADMIN_REAL_EMAIL && ADMIN_REAL_PASSWORD);

    if (!useRealApi) {
      await mockAuthApi(page, {
        user: buildUser({ roles: ["admin"], merchants: [] }),
      });
    }

    await gotoLoginWithMode(page, useRealApi);

    await ensureRealApiCsrfCookie(page, useRealApi);

    await page
      .getByLabel("Email")
      .fill(useRealApi ? ADMIN_REAL_EMAIL : "admin@example.com");
    await page
      .getByLabel("Kata Sandi")
      .fill(useRealApi ? ADMIN_REAL_PASSWORD : "password");

    const loginResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return new URL(resp.url()).pathname === "/login";
      } catch {
        return false;
      }
    });

    await page.getByRole("button", { name: /^Masuk$/ }).click();

    if (useRealApi) {
      const loginResp = await loginResponsePromise;
      expect(
        loginResp.status(),
        `Real API /login must succeed (got ${loginResp.status()})`,
      ).toBeLessThan(400);
    }

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test("invalid credentials shows error message (mock)", async ({ page }) => {
    // Always run this in mock mode to keep it deterministic.

    await mockAuthApi(page, {
      user: buildUser({ roles: ["customer"], merchants: [] }),
      onLogin: async (route) => {
        return fulfillJson(route, 401, {
          message: "Email atau password salah",
        });
      },
    });

    await gotoLoginWithMode(page, false);
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Kata Sandi").fill("wrong");
    await page.getByRole("button", { name: /^Masuk$/ }).click();

    await expect(
      page.locator("div.bg-red-100", { hasText: "Email atau password salah" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
