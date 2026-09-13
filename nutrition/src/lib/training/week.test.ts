import { describe, it, expect } from "vitest";
import { weekBounds, parseLocalDate, formatWeekday, weekLabel } from "./week";

describe("weekBounds", () => {
  it("la semana empieza el lunes", () => {
    // 2026-09-13 es domingo.
    const { start, end } = weekBounds(new Date(2026, 8, 13, 15, 30));
    expect(start.getDay()).toBe(1); // lunes
    expect(start.getDate()).toBe(7); // lunes 7 de septiembre
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(13); // domingo 13, hasta el final del día
    expect(end.getHours()).toBe(23);
  });

  it("un domingo cae en SU semana, no en la siguiente", () => {
    // El fallo clásico de usar getDay() sin corregir: el entreno del
    // domingo se contaría en la semana que viene y el volumen semanal
    // saldría partido en dos.
    const domingo = new Date(2026, 8, 13, 20, 0);
    const { start, end } = weekBounds(domingo);
    expect(domingo.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(domingo.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it("un lunes a primera hora ya está dentro de su semana", () => {
    const lunes = new Date(2026, 8, 7, 0, 1);
    const { start, end } = weekBounds(lunes);
    expect(start.getDate()).toBe(7);
    expect(lunes.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(lunes.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it("cubre exactamente siete días", () => {
    const { start, end } = weekBounds(new Date(2026, 8, 10));
    const days = (end.getTime() - start.getTime() + 1) / 86_400_000;
    expect(days).toBe(7);
  });
});

describe("parseLocalDate", () => {
  it("lee YYYY-MM-DD como día local y no como UTC", () => {
    // new Date("2026-09-13") sería medianoche UTC, que en España cae el
    // día 12 a las 22:00 y haría que el historial enseñara otro día.
    const d = parseLocalDate("2026-09-13");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(13);
  });
});

describe("formatWeekday", () => {
  it("nombra en relativo lo cercano", () => {
    const hoy = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    expect(formatWeekday(iso(hoy))).toBe("Hoy");

    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    expect(formatWeekday(iso(ayer))).toBe("Ayer");
  });

  it("pone fecha a lo lejano", () => {
    const viejo = new Date();
    viejo.setDate(viejo.getDate() - 30);
    const iso = `${viejo.getFullYear()}-${String(viejo.getMonth() + 1).padStart(2, "0")}-${String(viejo.getDate()).padStart(2, "0")}`;
    expect(formatWeekday(iso)).toMatch(/,\s\d+\s\w+/);
  });
});

describe("weekLabel", () => {
  it("habla como una persona", () => {
    expect(weekLabel(0)).toBe("Esta semana");
    expect(weekLabel(1)).toBe("La semana pasada");
    expect(weekLabel(4)).toBe("Hace 4 semanas");
  });
});
