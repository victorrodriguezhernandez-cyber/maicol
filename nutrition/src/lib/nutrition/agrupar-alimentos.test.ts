import { describe, it, expect } from "vitest";
import {
  agruparAlimentos,
  coincideConLaBusqueda,
  limpiarNombre,
  palabrasDeContenido,
  type AlimentoAgrupable,
} from "./agrupar-alimentos";

/**
 * Todos los casos de aquí salieron de buscar de verdad en Open Food
 * Facts, no de imaginármelos: las nueve leches, la errata de superSol,
 * el "Alimento a base de almendras" cuya marca es "Lonco leche" y el
 * nombre con un salto de línea y un código dentro.
 */

function leche(nombre: string, marca: string | null, kcal: number, p: number, c: number, g: number): AlimentoAgrupable {
  return { nombre, marca, energyKcal: kcal, proteinG: p, carbohydratesG: c, fatG: g };
}

describe("agruparAlimentos", () => {
  it("junta la misma leche de cinco marcas en una sola fila", () => {
    const grupos = agruparAlimentos([
      leche("Leche entera", "Pascual", 64, 3.2, 4.6, 3.6),
      leche("Leche entrera UHT", "superSol", 63, 3, 4.6, 3.6), // errata incluida
      leche("Leche Entera Leyma", "Leyma", 63, 3, 4.6, 3.6),
      leche("Puleva Leche Entera", "Puleva", 63, 3, 4.6, 3.6),
      leche("Leche", "Hacendado", 63, 3.1, 4.6, 3.6),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].repetidos).toBe(4);
  });

  it("no junta lo que de verdad es otro alimento", () => {
    const grupos = agruparAlimentos([
      leche("Leche entera", "Pascual", 64, 3.2, 4.6, 3.6),
      // Semidesnatada: 17 kcal menos. Es otra leche.
      leche("Leche semidesnatada", "Puleva", 46, 3.1, 4.7, 1.6),
      // Proteica: mismos carbos, casi el doble de proteína.
      leche("Leche proteica", "Central Lechera", 60, 5.9, 4.5, 1.8),
    ]);
    expect(grupos).toHaveLength(3);
  });

  it("no mezcla dos alimentos distintos por compartir una palabra de relleno", () => {
    // Mismos números exactos, pero uno es yogur y el otro kéfir.
    const grupos = agruparAlimentos([
      leche("Yogur natural", "Alteza", 59, 3.9, 4.9, 2.6),
      leche("Kéfir natural", "Alteza", 59, 3.9, 4.9, 2.6),
    ]);
    expect(grupos).toHaveLength(2);
  });

  it("el que representa al grupo es el que más datos trae", () => {
    const pobre: AlimentoAgrupable = leche("Leche entera", null, 64, 3.2, 4.6, 3.6);
    const rico: AlimentoAgrupable = {
      ...leche("Leche entera esterilizada", "Hacendado", 64, 3.2, 4.6, 3.6),
      saturatedFatG: 2.5,
      sugarsG: 4.6,
      sodiumMg: 47,
      saltG: 0.1,
    };
    const grupos = agruparAlimentos([pobre, rico]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].alimento.nombre).toBe("Leche entera esterilizada");
  });

  it("a igualdad de datos gana el nombre más corto y genérico", () => {
    const grupos = agruparAlimentos([
      leche("LECHE SEMIDESNATADA PULEVA BRIK 1 L", "Puleva", 46, 3.1, 4.7, 1.6),
      leche("Leche semidesnatada", null, 46, 3.1, 4.7, 1.6),
    ]);
    expect(grupos[0].alimento.nombre).toBe("Leche semidesnatada");
  });

  it("respeta el orden en el que llegaron", () => {
    const grupos = agruparAlimentos([
      leche("Yogur griego", "Sandra", 126, 4.4, 4.8, 10),
      leche("Yogur natural", "Alteza", 59, 3.9, 4.9, 2.6),
      leche("Yogur griego ligero", "Danone", 126, 4.4, 4.8, 10),
    ]);
    expect(grupos.map((g) => g.alimento.nombre)).toEqual(["Yogur griego", "Yogur natural"]);
    expect(grupos[0].repetidos).toBe(1);
  });

  it("una lista vacía no revienta", () => {
    expect(agruparAlimentos([])).toEqual([]);
  });
});

describe("palabrasDeContenido", () => {
  it("quita la marca, el envase y los números", () => {
    expect(palabrasDeContenido("LECHE SEMIDESNATADA PULEVA BRIK 1 L 5053", "Puleva")).toEqual([
      "leche",
      "semidesnatada",
    ]);
  });

  it("mantiene lo que sí distingue un alimento de otro", () => {
    expect(palabrasDeContenido("Yogur natural desnatado", "Alteza")).toEqual([
      "yogur",
      "natural",
      "desnatado",
    ]);
  });
});

describe("coincideConLaBusqueda", () => {
  it("descarta lo que sólo coincidía por la marca", () => {
    // Buscando "leche", con marca "Lonco leche": el producto es almendras.
    expect(coincideConLaBusqueda("Alimento a base de almendras", "leche")).toBe(false);
    expect(coincideConLaBusqueda("Crema", "leche")).toBe(false);
  });

  it("no se pone a opinar sobre lo que es relevante", () => {
    // "Chocolate con Leche" no es lo que probablemente buscabas, pero
    // LLEVA leche y lo puedes estar registrando. Filtrarlo sería que la
    // app decidiera por ti.
    expect(coincideConLaBusqueda("Chocolate con Leche", "leche")).toBe(true);
    expect(coincideConLaBusqueda("Dulce de leche clásico", "leche")).toBe(true);
  });

  it("con una búsqueda sin palabras útiles no descarta nada", () => {
    expect(coincideConLaBusqueda("Lo que sea", "de la")).toBe(true);
  });
});

describe("limpiarNombre", () => {
  it("deja en una línea los nombres que traen saltos y códigos", () => {
    expect(limpiarNombre("LECHE SEMIDESNATADA PULEVA BRIK 1\n5053")).toBe(
      "LECHE SEMIDESNATADA PULEVA BRIK 1 5053",
    );
    expect(limpiarNombre("  Leche   entera  ")).toBe("Leche entera");
  });
});
