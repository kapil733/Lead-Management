import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsEmployee } from "./helpers/auth";

test.describe("auth + RBAC", () => {
  test("admin lands on dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("employee lands on app home and is blocked from admin", async ({
    page,
  }) => {
    await loginAsEmployee(page);
    await expect(page).toHaveURL(/\/app\/?$/);
    await expect(page.locator("#main-content")).toBeVisible();

    await page.goto("/admin/dashboard");
    // Middleware / layout redirects employees away from /admin
    await page.waitForURL(/\/app/);
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test("skip link is present for keyboard users", async ({ page }) => {
    await loginAsAdmin(page);
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeAttached();
  });
});
