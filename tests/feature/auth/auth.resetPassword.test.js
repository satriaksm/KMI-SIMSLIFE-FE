import { test, expect } from "playwright/test";
import "dotenv/config";

import {
  getFrontendBaseUrl,
  isFrontendOrigin,
  corsHeaders,
  fulfillJson,
  mockGuestAuthApi,
} from "./_authTestUtils.js";

async function gotoResetPassword(page, { token, email } = {}) {
  const base = `${getFrontendBaseUrl(false)}/reset-password`;
  const url = token
    ? `${base}/${encodeURIComponent(token)}?email=${encodeURIComponent(email || "")}`
    : base;

  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Reset Password" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel("Password Baru")).toBeVisible();
  await expect(page.getByLabel("Konfirmasi Password")).toBeVisible();
}

test.describe("Auth - reset password", () => {
  test("missing token/email does not call API (mock)", async ({ page }) => {
    await mockGuestAuthApi(page);

    let called = false;
    await page.route("**/api/auth/reset-password", async (route) => {
      const url = route.request().url();
      if (isFrontendOrigin(url)) return route.fallback();
      called = true;
      return fulfillJson(route, 500, { message: "Should not be called" });
    });

    await gotoResetPassword(page);

    await page.getByLabel("Password Baru").fill("newpassword");
    await page.getByLabel("Konfirmasi Password").fill("newpassword");

    await page.getByRole("button", { name: "Setel Ulang Password" }).click();

    // Form is valid but handler must bail out due to missing token/email.
    expect(called).toBe(false);
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("reset password success redirects to /login (mock)", async ({
    page,
  }) => {
    await mockGuestAuthApi(page);

    await page.route("**/api/auth/reset-password", async (route) => {
      const req = route.request();
      const url = req.url();
      if (isFrontendOrigin(url)) return route.fallback();

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      }
      if (req.method() !== "POST") return route.fallback();

      const body = req.postDataJSON();
      expect(body).toMatchObject({
        token: "token-123",
        email: "reset.user@example.com",
        password: "newpassword",
        password_confirmation: "newpassword",
      });

      return fulfillJson(route, 200, { message: "Password reset" });
    });

    await gotoResetPassword(page, {
      token: "token-123",
      email: "reset.user@example.com",
    });

    await page.getByLabel("Password Baru").fill("newpassword");
    await page.getByLabel("Konfirmasi Password").fill("newpassword");
    await page.getByRole("button", { name: "Setel Ulang Password" }).click();

    await page.waitForURL(/\/login$/, { timeout: 15_000 });
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
