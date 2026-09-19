import { describe, it, expect } from "vitest";
import {
  formatKg,
  formatPesaje,
  localDayBoundsUtc,
  mealInstantForDate,
  numeroATexto,
  parseNumeroEs,
  todayLocalDateString,
} from "./format";

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

/**
 * Un pesaje se enseña como se midió.
 *
 * El caso real que lo motivó: se registró 64,35 kg y la lista de pesajes
 * enseñaba "64,4 kg". El dato estaba bien guardado —la columna es
 * `numeric(5,2)`—, lo que redondeaba era la pantalla. Corregirle a
 * alguien el número que acaba de leer en su báscula es de las cosas que
 * más rápido te hacen desconfiar de una app.
 */
describe("formatPesaje", () => {
  it("no redondea el segundo decimal que sí mediste", () => {
    expect(formatPesaje(64.35)).toBe("64,35 kg");
    expect(formatPesaje(64.05)).toBe("64,05 kg");
    expect(formatPesaje(70.25)).toBe("70,25 kg");
  });

  it("no rellena con ceros lo que no medías", () => {
    // 64,10 en la base de datos es "me pesé 64,1", no "64,10".
    expect(formatPesaje(64.1)).toBe("64,1 kg");
    expect(formatPesaje(64.3)).toBe("64,3 kg");
  });

  it("mantiene siempre un decimal, aunque sea cero", () => {
    // "64 kg" a secas se lee como una cifra redondeada a ojo, que es lo
    // contrario de lo que dice un pesaje.
    expect(formatPesaje(64)).toBe("64,0 kg");
  });

  it("la tendencia sigue con un decimal: ahí el segundo sería inventado", () => {
    // `formatKg` no cambia. La tendencia es un valor CALCULADO (un EWMA),
    // no una medición, y enseñar 64,24 fingiría una precisión que el
    // número no tiene.
    expect(formatKg(64.2426)).toBe("64,2 kg");
    expect(formatKg(0.2426)).toBe("0,2 kg");
  });
});

/**
 * El caso que motivó esto: borras la cantidad de un ingrediente para
 * escribir otra y el campo se queda en 0 sin aceptar nada más.
 *
 * Dos causas, y las dos se ven aquí. Una, `Number("") || 0` convierte
 * "el campo está vacío" en "la cantidad es cero". Dos, en un teclado
 * español el separador decimal es la coma, y con `type="number"` una
 * coma hace que el navegador devuelva "" — lo tecleado se pierde.
 */
describe("parseNumeroEs", () => {
  it("distingue el campo vacío de un cero escrito", () => {
    // Esta es la línea entera del fallo: vacío NO es 0.
    expect(parseNumeroEs("")).toBeNull();
    expect(parseNumeroEs("   ")).toBeNull();
    expect(parseNumeroEs("0")).toBe(0);
  });

  it("acepta la coma decimal del teclado español", () => {
    expect(parseNumeroEs("64,5")).toBe(64.5);
    expect(parseNumeroEs("0,25")).toBe(0.25);
    // Y el punto también: un teclado de escritorio da punto.
    expect(parseNumeroEs("64.5")).toBe(64.5);
  });

  it("no cuela lo que no es un número", () => {
    expect(parseNumeroEs("abc")).toBeNull();
    expect(parseNumeroEs("1,2,3")).toBeNull();
    expect(parseNumeroEs("-")).toBeNull();
  });

  it("da la vuelta sin perder el valor", () => {
    for (const n of [200, 64.5, 0.25, 1]) {
      expect(parseNumeroEs(numeroATexto(n))).toBe(n);
    }
    expect(numeroATexto(64.5)).toBe("64,5");
  });
});
