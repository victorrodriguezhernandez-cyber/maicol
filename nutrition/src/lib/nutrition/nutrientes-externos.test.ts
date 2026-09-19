import { describe, it, expect } from "vitest";
import {
  aGramos,
  aKcal,
  aMiligramos,
  construirExtras,
  numeroFinito,
  KJ_POR_KCAL,
} from "./nutrientes-externos";

/**
 * EL ERROR QUE ESTE MÓDULO EXISTE PARA IMPEDIR.
 *
 * Open Food Facts devuelve `sodium_100g: 0.159` — en gramos. La columna
 * de la app es `sodium_mg`. Copiar el número tal cual da 0,159 mg en vez
 * de 159: mil veces menos, sin ningún error, y con pinta de dato bueno
 * para siempre.
 */
describe("conversión de unidades", () => {
  it("el sodio de Open Food Facts (gramos) pasa a miligramos", () => {
    expect(aMiligramos(0.159, "g")).toBeCloseTo(159, 10);
    expect(aMiligramos(0.0428, "g")).toBeCloseTo(42.8, 10);
  });

  it("respeta la unidad declarada en vez de suponerla", () => {
    // El mismo número significa cosas distintas según la unidad, y por
    // eso la unidad se lee, no se asume.
    expect(aMiligramos(159, "mg")).toBeCloseTo(159, 10);
    expect(aMiligramos(0.159, "g")).toBeCloseTo(159, 10);
    expect(aGramos(1000, "mg")).toBeCloseTo(1, 10);
    expect(aGramos(1_000_000, "µg")).toBeCloseTo(1, 10);
    expect(aGramos(1_000_000, "mcg")).toBeCloseTo(1, 10);
  });

  it("descarta lo que no sabe interpretar en vez de arriesgarse", () => {
    // Un nutriente que falta se ve en pantalla y se puede corregir. Uno
    // equivocado por mil no se ve nunca.
    expect(aGramos(5, "cucharadas")).toBeNull();
    expect(aGramos(5, "%")).toBeNull();
    expect(aGramos("no consta", "g")).toBeNull();
    expect(aGramos(null, "g")).toBeNull();
    expect(aGramos(-3, "g")).toBeNull();
  });

  it("sin unidad asume gramos, que es lo que guardan estas fuentes", () => {
    expect(aGramos(2.5, undefined)).toBe(2.5);
    expect(aGramos(2.5, null)).toBe(2.5);
  });
});

describe("energía", () => {
  it("usa las kcal cuando vienen", () => {
    expect(aKcal({ kcal: 402, kj: 1691 })).toBe(402);
  });

  it("convierte desde kilojulios cuando sólo están esos", () => {
    // La etiqueta europea obliga a los kJ, y hay productos que sólo
    // traen eso. 1691 kJ / 4,184 = 404,2 kcal.
    expect(aKcal({ kj: 1691 })).toBeCloseTo(1691 / KJ_POR_KCAL, 10);
    expect(aKcal({ kj: 1691 })).toBeCloseTo(404.16, 1);
  });

  it("sin energía no se inventa un cero", () => {
    // 0 kcal es una afirmación sobre el alimento; "no lo sé" no lo es.
    expect(aKcal({})).toBeNull();
    expect(aKcal({ kcal: null, kj: undefined })).toBeNull();
  });
});

describe("numeroFinito", () => {
  it("no confunde el vacío con el cero", () => {
    expect(numeroFinito("")).toBeNull();
    expect(numeroFinito("   ")).toBeNull();
    expect(numeroFinito(0)).toBe(0);
  });

  it("acepta la coma decimal y rechaza lo que no es número", () => {
    expect(numeroFinito("4,5")).toBe(4.5);
    expect(numeroFinito("trazas")).toBeNull();
    expect(numeroFinito(Infinity)).toBeNull();
    expect(numeroFinito(NaN)).toBeNull();
  });
});

describe("construirExtras", () => {
  it("mete sólo lo que la fuente dijo de verdad", () => {
    const extras = construirExtras({
      trans_fat_g: 0,
      cholesterol_mg: 12,
      potassium_mg: null,
      vitamin_c_mg: undefined,
    });
    // El 0 de trans SÍ entra: la fuente lo afirmó.
    expect(extras).toEqual({ trans_fat_g: 0, cholesterol_mg: 12 });
    // Lo que no vino no aparece como 0, que sería afirmar algo que nadie
    // ha dicho.
    expect("potassium_mg" in extras).toBe(false);
    expect("vitamin_c_mg" in extras).toBe(false);
  });

  it("no cuela valores imposibles", () => {
    expect(construirExtras({ iron_mg: -1, zinc_mg: NaN })).toEqual({});
  });
});
