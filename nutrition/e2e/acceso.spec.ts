import { test, expect } from "@playwright/test";

/**
 * Access control: the tests that would catch someone accidentally
 * exposing this app's data.
 *
 * Every one of these asserts behaviour that was verified by hand during
 * the security pass. They exist so it stays verified — a redirect that
 * quietly stops happening is invisible until someone's diary is public.
 */

// Every route that must never render to someone without a session. Kept
// as data so adding a screen means adding one line here, not a new test.
const RUTAS_PRIVADAS = [
  "/",
  "/diario",
  "/progreso",
  "/progreso/medidas",
  "/progreso/fotos",
  "/ia",
  "/recetas",
  "/recetas/nueva",
  "/ajustes",
  "/ajustes/perfil",
  "/ajustes/objetivos",
  "/ajustes/alimentos",
  "/ajustes/seguridad",
  "/registrar/manual",
  "/registrar/buscar",
  "/registrar/foto",
  "/registrar/etiqueta",
  "/registrar/texto",
  "/registrar/voz",
  "/registrar/receta",
  "/registrar/favoritos",
];

test.describe("Sin sesión", () => {
  for (const ruta of RUTAS_PRIVADAS) {
    test(`${ruta} manda al login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("las rutas de API no devuelven datos", async ({ request }) => {
    // El middleware redirige al login antes de que el handler responda su
    // 401, así que lo que se comprueba es lo que de verdad importa: que
    // por ninguna de las dos vías salga un solo dato del usuario.
    for (const api of ["/api/export", "/api/recipes", "/api/foods/search?q=pollo"]) {
      const res = await request.get(api, { maxRedirects: 0 });
      expect([401, 302, 307], `${api} debería exigir sesión`).toContain(res.status());
      const cuerpo = await res.text();
      expect(cuerpo, `${api} no debe filtrar datos`).not.toContain("energy_kcal");
      expect(cuerpo).not.toContain("weight_kg");
    }
  });

  test("la guía de diseño no es accesible", async ({ page }) => {
    // Sólo existe en desarrollo. En un build de producción no debe
    // renderizarse nunca, ni siquiera con sesión.
    await page.goto("/design");
    await expect(page).not.toHaveURL(/\/design$/);
  });
});

test.describe("Login", () => {
  test("no filtra la cuenta al navegador", async ({ page }) => {
    // El email estuvo incrustado en el chunk público junto a la llamada de
    // signInWithPassword. Si alguien vuelve a moverlo al cliente, esto falla.
    await page.goto("/login");
    const html = await page.content();
    expect(html).not.toContain("@gmail.com");

    const scripts = await page.locator("script[src]").evaluateAll((els) =>
      els.map((e) => (e as HTMLScriptElement).src),
    );
    for (const src of scripts) {
      const res = await page.request.get(src);
      expect(await res.text()).not.toContain("@gmail.com");
    }
  });

  test("una contraseña incorrecta se rechaza con un mensaje, sin romper la página", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill("#username", "contraseña-incorrecta-de-prueba");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Usuario incorrecto.")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("el botón sólo se activa cuando hay algo escrito", async ({ page }) => {
    await page.goto("/login");
    const boton = page.getByRole("button", { name: "Entrar" });
    await expect(boton).toBeDisabled();
    await page.fill("#username", "algo");
    await expect(boton).toBeEnabled();
  });

  test("el navegador no habla directamente con Supabase Auth", async ({ page }) => {
    // El login se ejecuta en el servidor; si vuelve al cliente, el email
    // vuelve al bundle y esta petición reaparece.
    const llamadas: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("supabase.co/auth")) llamadas.push(r.url());
    });
    await page.goto("/login");
    await page.fill("#username", "otra-incorrecta");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);
    expect(llamadas).toEqual([]);
  });
});
