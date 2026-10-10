import { defineConfig, devices } from "@playwright/test";

const port = 3010;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
