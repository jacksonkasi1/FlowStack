import { defineConfig, devices } from "@playwright/test";

// Browser smoke tests for the core user journey. `e2e/stack.mjs` starts an
// isolated stack (embedded PostgreSQL, production API build, mail catcher,
// production frontend build); nothing external is contacted.
const web = `http://localhost:${process.env.E2E_WEB_PORT || 14173}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: web, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/stack.mjs",
    url: web,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
