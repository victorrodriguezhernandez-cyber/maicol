import { describe, it, expect } from "vitest";
import { tituloDeComida } from "./meal-title";

describe("tituloDeComida", () => {
  it("junta los ingredientes con 'con' cuando son dos", () => {
    // El caso que lo motivó: dictas "un vaso de leche con cereales" y la
    // comida se guarda como dos ingredientes. El título los vuelve a
    // juntar sin que nadie tenga que escribirlo.
    expect(tituloDeComida(null, ["Leche entera", "Cereales Kellogg's"])).toBe(
      "Leche entera con Cereales Kellogg's",
    );
  });

  it("con uno solo, el título es ese ingrediente", () => {
    expect(tituloDeComida(null, ["Leche entera"])).toBe("Leche entera");
  });

  it("con tres los enumera", () => {
    expect(tituloDeComida(null, ["Pollo", "Arroz", "Aguacate"])).toBe("Pollo, Arroz y Aguacate");
  });

  it("con muchos no repite la lista que ya está debajo", () => {
    expect(tituloDeComida(null, ["Pollo", "Arroz", "Aguacate", "Aceite", "Coca-Cola"])).toBe(
      "Pollo, Arroz y 3 más",
    );
  });

  it("un nombre puesto a mano manda sobre los ingredientes", () => {
    expect(tituloDeComida("Mi batido de siempre", ["Leche", "Plátano"])).toBe(
      "Mi batido de siempre",
    );
  });

  it("no se deja engañar por un nombre en blanco", () => {
    expect(tituloDeComida("   ", ["Leche", "Plátano"])).toBe("Leche con Plátano");
  });

  it("sin ingredientes no se inventa un título", () => {
    expect(tituloDeComida(null, [])).toBeNull();
    expect(tituloDeComida(null, ["  ", ""])).toBeNull();
  });
});
