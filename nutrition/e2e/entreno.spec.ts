import { test, expect } from "@playwright/test";

/**
 * El apartado de entreno, desde fuera.
 *
 * Sin sesión no se puede llegar a nada: ni a las pantallas ni al API del
 * catálogo. Son once rutas nuevas y cada una es una puerta más, así que
 * se comprueban todas — la que se olvide de proteger no dará ningún error,
 * simplemente dejará entrar.
 */

const RUTAS_PRIVADAS = [
  "/entreno",
  "/entreno/rutinas",
  "/entreno/rutinas/nueva",
  "/entreno/ejercicios",
  "/entreno/ejercicios/nuevo",
  "/entreno/musculos",
  "/entreno/sesion/00000000-0000-0000-0000-000000000000",
  "/entreno/rutinas/00000000-0000-0000-0000-000000000000",
  "/entreno/ejercicios/00000000-0000-0000-0000-000000000000",
];

test.describe("Entreno sin sesión", () => {
  for (const ruta of RUTAS_PRIVADAS) {
    test(`${ruta} manda al login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("el buscador de ejercicios no devuelve el catálogo", async ({ request }) => {
    // `maxRedirects: 0` es imprescindible aquí: por defecto Playwright
    // sigue la redirección, acaba en /login y devuelve un 200 que parece
    // que el endpoint ha contestado. Lo que hay que comprobar es la
    // primera respuesta, no dónde termina el viaje.
    const res = await request.get("/api/exercises/search?q=press", { maxRedirects: 0 });
    // 401 desde el propio handler, o una redirección al login desde el
    // proxy. Cualquiera de las dos vale; un 200 con datos, no.
    expect([301, 302, 307, 308, 401]).toContain(res.status());
    expect(await res.text()).not.toContain("Press de banca");
  });

  test("la vista previa de entreno no existe en producción", async ({ page }) => {
    // /design/entreno monta el registro de series con datos inventados.
    // Es una herramienta de desarrollo: en producción tiene que ser un 404
    // o una redirección, nunca una pantalla con datos falsos.
    const res = await page.goto("/design/entreno");
    expect(res?.status() === 404 || page.url().includes("/login")).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("datos inventados");
  });
});
