import { test, expect } from "playwright/test";
import "dotenv/config";

import {
  getFrontendBaseUrl,
  isFrontendOrigin,
  corsHeaders,
  fulfillJson,
  mockGuestAuthApi,
} from "./_authTestUtils.js";

async function gotoForgotPassword(page) {
  await page.goto(`${getFrontendBaseUrl(false)}/forgot-password`);
  await expect(
    page.getByRole("heading", { name: "Lupa Password" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel("Email")).toBeVisible();
}

test.describe("Auth - forgot password", () => {
  test("empty submit shows validation", async ({ page }) => {
    await mockGuestAuthApi(page);

    await gotoForgotPassword(page);
    await page.getByRole("button", { name: /Kirim Link Reset/i }).click();
    await expect(page.getByText("Email wajib diisi")).toBeVisible();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("submit success starts cooldown (mock)", async ({ page }) => {
    await mockGuestAuthApi(page);

    await page.route("**/api/auth/forgot-password", async (route) => {
      const req = route.request();
      const url = req.url();
      if (isFrontendOrigin(url)) return route.fallback();

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      }
      if (req.method() !== "POST") return route.fallback();

      const body = req.postDataJSON();
      expect(body).toMatchObject({ email: "pw.forgot@example.com" });

      // axios can only read custom headers if CORS exposes them
      return fulfillJson(
        route,
        200,
        { message: "Link sent", retry_after: 60 },
        {
          "retry-after": "60",
          "access-control-expose-headers": "retry-after",
        },
      );
    });

    await gotoForgotPassword(page);
    await page.getByLabel("Email").fill("pw.forgot@example.com");

    await page.getByRole("button", { name: /Kirim Link Reset/i }).click();

    // Cooldown UI appears (value can be 60 or 59 depending on timing).
    await expect(
      page.getByRole("button", { name: /Kirim Ulang \(\d+s\)/ }),
    ).toBeVisible();

    await expect(
      page.getByText(/Anda dapat meminta ulang dalam \d+ detik\./),
    ).toBeVisible();

    const lastEmail = await page.evaluate(() =>
      localStorage.getItem("fp_last_email"),
    );
    expect(lastEmail).toBe("pw.forgot@example.com");
  });
});
