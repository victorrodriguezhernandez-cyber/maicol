import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * They run against a real production build (`next build` + `next start`),
 * not the dev server: the service worker, the security headers and the
 * Server Actions only behave like production in a production build, and
 * those are exactly what most of these tests assert.
 *
 * The viewport is an iPhone because that is the only device this app is
 * ever used on — a desktop-sized run would pass while the real thing is
 * broken.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3210",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "iphone",
      use: {
        ...devices["iPhone 14"],
        // Honest limitation: the iPhone descriptor defaults to WebKit,
        // which is the engine this app actually runs on in Safari — but
        // only Chromium is installed in CI/this container, so the tests
        // run the iPhone viewport, touch behaviour and user agent on
        // Chromium instead. That catches layout and flow regressions; it
        // would NOT catch a Safari-specific bug. Install WebKit
        // (`npx playwright install webkit`) on a machine that allows it
        // and drop this line to close that gap.
        browserName: "chromium",
        // CHROMIUM_PATH points at a Chromium that is already on the
        // machine. Needed where the installed browser build does not match
        // the one this @playwright/test version expects — without it
        // Playwright insists on downloading its own, which fails on a
        // locked-down runner. Unset on a normal dev machine and Playwright
        // resolves its own browser as usual.
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : undefined,
      },
    },
  ],

  // Reuse an already-running server when there is one, so a developer can
  // keep `npm run start` open and re-run tests without a rebuild each time.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- -p 3210",
        url: "http://127.0.0.1:3210/login",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
