import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("attendance grid interactions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/payroll/attendance?month=2026-09");
    await expect(page.getByTestId("attendance-grid")).toBeVisible();
  });

  test("Ctrl+Click marks Present", async ({ page }) => {
    // Prefer an unmarked editable cell for CE001 on a weekday (2026-09-07 Mon)
    const cell = page.getByTestId("cell-CE001-2026-09-07");
    await expect(cell).toBeVisible();
    await cell.click({ modifiers: ["ControlOrMeta"] });
    await expect(cell).toHaveAttribute("data-effective", "PRESENT");
    await expect(cell).toHaveText("P");
  });

  test("right-click opens cell context menu", async ({ page }) => {
    const cell = page.getByTestId("cell-CE001-2026-09-08");
    await cell.click({ button: "right" });
    const menu = page.getByTestId("attendance-context-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: /Absent/i }).click();
    await expect(cell).toHaveAttribute("data-effective", "ABSENT");
    await expect(cell).toHaveText("A");
  });
});
