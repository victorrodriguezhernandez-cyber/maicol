import { describe, it, expect } from "vitest";
import { localDayBoundsUtc, mealInstantForDate, todayLocalDateString } from "./format";

/**
 * Registrar en un día pasado es exactamente donde un fallo de zona
 * horaria no se ve: la comida se guarda, no da error, y aparece en el día
 * de al lado. Estos tests fijan la única garantía que importa — el
 * instante que se guarda cae DENTRO del día que pediste, mirado con la
 * misma función con la que la app lee ese día.
 */
describe("mealInstantForDate", () => {
  function caeDentro(date: string): boolean {
    const { start, end } = localDayBoundsUtc(date);
    const t = Date.parse(mealInstantForDate(date));
    return t >= Date.parse(start) && t <= Date.parse(end);
  }

  it("cae dentro del día pedido, también en los cambios de hora", () => {
    // Marzo y octubre son los domingos en los que España cambia la hora:
    // el día dura 23 o 25 horas y es donde se rompe anclar a medianoche.
    for (const date of [
      "2026-01-15",
      "2026-03-29",
      "2026-03-28",
      "2026-06-21",
      "2026-10-25",
      "2026-10-24",
      "2026-12-31",
    ]) {
      expect(caeDentro(date), date).toBe(true);
    }
  });

  it("para hoy usa la hora real, no mediodía", () => {
    const antes = Date.now();
    const t = Date.parse(mealInstantForDate(todayLocalDateString()));
    expect(t).toBeGreaterThanOrEqual(antes - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("sin fecha se comporta como hoy", () => {
    const t = Date.parse(mealInstantForDate(null));
    expect(Math.abs(t - Date.now())).toBeLessThan(1000);
  });
});
