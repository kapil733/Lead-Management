import type { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, "admin@demo.test", "Admin@12345");
  await page.waitForURL(/\/admin\//);
}

export async function loginAsEmployee(page: Page): Promise<void> {
  await loginAs(page, "priya@demo.test", "Caller@12345");
  await page.waitForURL(/\/app/);
}
