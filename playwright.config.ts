import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "ar-EG",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: "tests/e2e/.auth/host.json",
  },
  projects: [
    { name: "host-desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    {
      name: "guest-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        channel: "chrome",
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DEV_LOGIN_ENABLED: "true" },
  },
});
