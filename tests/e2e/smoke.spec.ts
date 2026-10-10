import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsEmployee } from "./helpers/auth";

test.describe("smoke paths", () => {
  test("admin payroll runs page loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/payroll/runs/2026-09");
    await expect(
      page.getByRole("heading", { name: /Payroll · 2026-09/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Recalculate|Unlock|Lock/i }).first(),
    ).toBeVisible();
  });

  test("admin leads list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/leads");
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("employee completed page loads", async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/app/completed");
    await expect(page.locator("#main-content")).toBeVisible();
  });
});
