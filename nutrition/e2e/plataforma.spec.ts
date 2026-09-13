import { test, expect } from "@playwright/test";

/**
 * The app as a platform: security headers, the PWA manifest, the offline
 * fallback and the 404. None of this is visible while things work, which
 * is exactly why it needs a test — each of these was either missing or
 * wrong before the hardening pass.
 */

test("las cabeceras de seguridad llegan en cada respuesta", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
});

test("el manifiesto de la PWA es válido y describe la app", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  expect(manifest.name ?? manifest.short_name).toBeTruthy();
  expect(manifest.display).toBe("standalone");
  expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy();
});

test("existe la pantalla de respaldo sin conexión", async ({ page }) => {
  // El service worker sirve esta ruta cuando no hay red, así que no puede
  // depender de una sesión: no podría comprobarla sin conexión.
  await page.goto("/~offline");
  await expect(page.locator("body")).toContainText(/sin conexión|offline/i);
});

test("una ruta inexistente no rompe la aplicación", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto("/esta-ruta-no-existe-9f3ac1");
  // Sin sesión acaba en el login; lo que importa es que no explote.
  expect(errores).toEqual([]);
  await expect(page.locator("body")).toBeVisible();
});
