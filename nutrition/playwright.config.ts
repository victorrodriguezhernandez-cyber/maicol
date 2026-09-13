import { defineConfig, devices } from "@playwright/test";

/**
 * Config de Playwright para tests E2E de `nutrition`.
 * Ver https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // This environment pins a pre-installed Chromium build that doesn't
    // always match the exact revision this @playwright/test version would
    // try to download (see /opt/pw-browsers). Point at the stable symlink
    // instead of relying on Playwright's own version-pinned lookup.
    launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
      ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` }
      : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Plain `next dev` (Turbopack) errors out here because
    // @ducanh2912/next-pwa injects a `webpack` config block, and Next 16
    // refuses to guess between bundlers when one isn't picked explicitly
    // — same reason `npm run build` already forces `--webpack` (see
    // CLAUDE.md). Match that here so the E2E server actually starts.
    command: "npm run dev -- --webpack",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
