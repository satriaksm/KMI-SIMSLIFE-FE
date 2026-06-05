import { test, expect } from "playwright/test";
import "dotenv/config";

import {
  USE_REAL_API,
  getFrontendBaseUrl,
  isFrontendOrigin,
  corsHeaders,
  fulfillJson,
  mockGuestAuthApi,
} from "./_authTestUtils.js";

async function gotoRegister(page) {
  await page.goto(`${getFrontendBaseUrl(false)}/register`);
  await expect(page.getByRole("button", { name: /^Daftar$/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel("Nama Lengkap")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
}

test.describe("Auth - register", () => {
  test("empty submit shows validation messages", async ({ page }) => {
    // Always mock to keep tests deterministic.
    await mockGuestAuthApi(page);

    await gotoRegister(page);
    await page.getByRole("button", { name: /^Daftar$/ }).click();

    await expect(page.getByText("Nama wajib diisi")).toBeVisible();
    await expect(page.getByText("Email wajib diisi")).toBeVisible();
    await expect(page.getByText("NIK wajib diisi")).toBeVisible();
    await expect(page.getByText("No. Telepon wajib diisi")).toBeVisible();
    await expect(
      page.getByText("Kata sandi wajib diisi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Konfirmasi kata sandi wajib diisi", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("register success redirects to /login (mock)", async ({ page }) => {
    await mockGuestAuthApi(page);

    let receivedBody = null;
    await page.route("**/api/auth/register", async (route) => {
      const req = route.request();
      const url = req.url();
      if (isFrontendOrigin(url)) return route.fallback();

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      }
      if (req.method() !== "POST") return route.fallback();

      receivedBody = req.postDataJSON();
      return fulfillJson(route, 201, { message: "Registered" });
    });

    await gotoRegister(page);

    await page.getByLabel("Nama Lengkap").fill("Playwright User");
    await page.getByLabel("Email").fill("pw.user@example.com");
    await page.getByLabel("NIK").fill("1234567890123456");
    await page.getByLabel("No. Telepon").fill("081234567890");
    await page.getByLabel("Kata Sandi", { exact: true }).fill("Password1!");
    await page
      .getByLabel("Konfirmasi Kata Sandi", { exact: true })
      .fill("Password1!");

    const registerResponsePromise = page.waitForResponse((resp) => {
      if (resp.request().method() !== "POST") return false;
      try {
        return new URL(resp.url()).pathname === "/api/auth/register";
      } catch {
        return false;
      }
    });

    await page.getByRole("button", { name: /^Daftar$/ }).click();
    await registerResponsePromise;

    expect(receivedBody).toMatchObject({
      name: "Playwright User",
      email: "pw.user@example.com",
      nik: "1234567890123456",
      phone: "081234567890",
      password: "Password1!",
      password_confirmation: "Password1!",
    });

    await page.waitForURL(/\/login$/, { timeout: 15_000 });
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("register fails when email already registered (mock)", async ({
    page,
  }) => {
    await mockGuestAuthApi(page);

    await page.route("**/api/auth/register", async (route) => {
      const req = route.request();
      const url = req.url();
      if (isFrontendOrigin(url)) return route.fallback();

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      }
      if (req.method() !== "POST") return route.fallback();

      return fulfillJson(route, 422, {
        message: "The given data was invalid.",
        errors: {
          email: ["Email sudah terdaftar"],
        },
      });
    });

    await gotoRegister(page);

    await page.getByLabel("Nama Lengkap").fill("Playwright User");
    await page.getByLabel("Email").fill("duplicate@example.com");
    await page.getByLabel("NIK").fill("1234567890123456");
    await page.getByLabel("No. Telepon").fill("081234567890");
    await page.getByLabel("Kata Sandi", { exact: true }).fill("Password1!");
    await page
      .getByLabel("Konfirmasi Kata Sandi", { exact: true })
      .fill("Password1!");

    await page.getByRole("button", { name: /^Daftar$/ }).click();

    await expect(
      page.locator("div.bg-red-100", { hasText: "Email sudah terdaftar" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("register fails when NIK already registered (mock)", async ({
    page,
  }) => {
    await mockGuestAuthApi(page);

    await page.route("**/api/auth/register", async (route) => {
      const req = route.request();
      const url = req.url();
      if (isFrontendOrigin(url)) return route.fallback();

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      }
      if (req.method() !== "POST") return route.fallback();

      return fulfillJson(route, 422, {
        message: "The given data was invalid.",
        errors: {
          nik: ["NIK sudah terdaftar"],
        },
      });
    });

    await gotoRegister(page);

    await page.getByLabel("Nama Lengkap").fill("Playwright User");
    await page.getByLabel("Email").fill("pw.user@example.com");
    await page.getByLabel("NIK").fill("9999999999999999");
    await page.getByLabel("No. Telepon").fill("081234567890");
    await page.getByLabel("Kata Sandi", { exact: true }).fill("Password1!");
    await page
      .getByLabel("Konfirmasi Kata Sandi", { exact: true })
      .fill("Password1!");

    await page.getByRole("button", { name: /^Daftar$/ }).click();

    await expect(
      page.locator("div.bg-red-100", { hasText: "NIK sudah terdaftar" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});
