import { expect } from "playwright/test";
import "dotenv/config";

export const FE_ORIGIN = process.env.E2E_FE_ORIGIN || "http://127.0.0.1:5173";
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL || "http://localhost:8000";

export const USE_REAL_API =
  String(process.env.E2E_USE_REAL_API || "").toLowerCase() === "1" ||
  String(process.env.E2E_USE_REAL_API || "").toLowerCase() === "true";

export const corsHeaders = {
  "access-control-allow-origin": FE_ORIGIN,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers":
    "Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept",
  "access-control-max-age": "600",
};

export function fulfillJson(route, status, data, extraHeaders = {}) {
  return route.fulfill({
    status,
    headers: { ...corsHeaders, ...(extraHeaders || {}) },
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

export function isFrontendOrigin(urlString) {
  try {
    return new URL(urlString).origin === FE_ORIGIN;
  } catch {
    return false;
  }
}

export function getFrontendBaseUrl(useRealApi = USE_REAL_API) {
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

export async function ensureRealApiCsrfCookie(page, useRealApi = USE_REAL_API) {
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

export async function mockGuestAuthApi(page, { onApiRoute } = {}) {
  // Keep app bootstrap deterministic: router.beforeEach -> authStore.initAuth -> GET /api/me
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
    return fulfillJson(route, 401, { message: "Unauthenticated" });
  });

  if (typeof onApiRoute === "function") {
    await onApiRoute({ fulfillJson });
  }

  // Catch-all to avoid accidental calls to real backend during tests.
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (isFrontendOrigin(url)) return route.fallback();

    const method = route.request().method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    }

    // Let explicitly mocked endpoints pass.
    if (url.includes("/api/me")) return route.fallback();

    return fulfillJson(route, 404, {
      message: "Mocked: endpoint not implemented",
    });
  });
}
