import { defineConfig, devices } from "@playwright/test";

const PHONE_VIEWPORT = { width: 360, height: 780 };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 5"], viewport: PHONE_VIEWPORT },
    },
  ],
});
