import { describe, it, expect } from "vitest";
import { sufijoDeMarca } from "./busqueda-alimentos";

describe("sufijoDeMarca", () => {
  it("con una sola marca, la enseña: es ese producto", () => {
    expect(sufijoDeMarca("Pascual", 0)).toBe(" · Pascual");
    expect(sufijoDeMarca("Pascual", undefined)).toBe(" · Pascual");
  });

  it("agrupando varias, se calla la marca y dice cuántas hay", () => {
    // Poner "· Sello Rojo" en una fila que representa a nueve marcas
    // insinúa que ese es el producto, y no lo es más que los otros ocho.
    expect(sufijoDeMarca("Sello Rojo", 8)).toBe(" · 9 marcas con los mismos valores");
    expect(sufijoDeMarca("Pascual", 1)).toBe(" · 2 marcas con los mismos valores");
  });

  it("sin marca no pone nada", () => {
    expect(sufijoDeMarca(null, 0)).toBe("");
  });
});
