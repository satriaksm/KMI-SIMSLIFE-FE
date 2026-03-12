import { test, expect } from "playwright/test";
import "dotenv/config";

import { getFrontendBaseUrl, mockGuestAuthApi } from "./_authTestUtils.js";

async function gotoVerify(page, query = "") {
  await page.goto(`${getFrontendBaseUrl(false)}/verify-email${query}`);
  await expect(
    page.getByRole("heading", { name: "Verifikasi Email" }),
  ).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Auth - email verification", () => {
  test("renders status banners based on query", async ({ page }) => {
    await mockGuestAuthApi(page);

    await gotoVerify(page, "?status=verified");
    await expect(
      page.getByText(
        "Email Anda berhasil diverifikasi. Silakan masuk untuk melanjutkan.",
      ),
    ).toBeVisible();

    await gotoVerify(page, "?status=already_verified");
    await expect(
      page.getByText("Email sudah terverifikasi. Anda dapat langsung masuk."),
    ).toBeVisible();

    await gotoVerify(page, "?status=invalid");
    await expect(
      page.getByText(
        "Link verifikasi tidak valid atau sudah kadaluarsa. Kirim ulang link verifikasi.",
      ),
    ).toBeVisible();
  });

  test("login button navigates to /login", async ({ page }) => {
    await mockGuestAuthApi(page);

    await gotoVerify(page, "?status=verified");
    await page.getByRole("button", { name: "Ke Halaman Login" }).click();
    await page.waitForURL(/\/login$/, { timeout: 15_000 });
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
