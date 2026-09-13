import { test, expect } from "@playwright/test";

// Smoke test: /login is the one route that renders without a real
// Supabase session (see src/app/(auth)/login/page.tsx) — it only talks
// to Supabase on submit — so it's a safe target that doesn't need real
// credentials, just the placeholder env vars in .env.local.
test("la página de login se renderiza", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("textbox", { name: /usuario/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
});
