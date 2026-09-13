import { describe, it, expect } from "vitest";
import { BODY_MAP_COVERAGE } from "./BodyMap";
import { MUSCLE_GROUPS, MUSCLE_LABELS, VOLUME_LANDMARKS } from "@/lib/training/muscles";

/**
 * El contrato entre la taxonomía y el dibujo.
 *
 * Añadir un músculo a `MUSCLE_GROUPS` (y al dominio de Postgres) sin
 * dibujarlo no rompe nada en tiempo de ejecución: el mapa simplemente no
 * pinta esa zona y el usuario ve un hueco sin saber por qué. Este test es
 * lo que convierte ese despiste silencioso en un fallo ruidoso.
 */
describe("contrato del mapa muscular", () => {
  const dibujados = new Set([...BODY_MAP_COVERAGE.frente, ...BODY_MAP_COVERAGE.espalda]);

  it("dibuja los 17 músculos entre las dos vistas", () => {
    const sinDibujar = MUSCLE_GROUPS.filter((m) => !dibujados.has(m));
    expect(sinDibujar).toEqual([]);
  });

  it("no dibuja ningún músculo que no exista en la taxonomía", () => {
    const inventados = [...dibujados].filter(
      (m) => !(MUSCLE_GROUPS as readonly string[]).includes(m),
    );
    expect(inventados).toEqual([]);
  });

  it("cada músculo tiene nombre legible y rango de volumen", () => {
    for (const muscle of MUSCLE_GROUPS) {
      expect(MUSCLE_LABELS[muscle]).toBeTruthy();
      expect(VOLUME_LANDMARKS[muscle]).toBeTruthy();
    }
  });

  it("los músculos de sólo-espalda no aparecen en la vista frontal", () => {
    // Dorsal, tríceps, glúteo, isquios y lumbares no se ven de frente.
    // Pintarlos ahí daría una lectura falsa del mapa.
    for (const m of ["dorsal", "triceps", "gluteo", "isquiotibiales", "lumbares"] as const) {
      expect(BODY_MAP_COVERAGE.frente).not.toContain(m);
      expect(BODY_MAP_COVERAGE.espalda).toContain(m);
    }
  });

  it("los músculos de sólo-frente no aparecen en la vista trasera", () => {
    for (const m of ["pecho", "abdominales", "biceps", "cuadriceps", "aductores", "oblicuos"] as const) {
      expect(BODY_MAP_COVERAGE.espalda).not.toContain(m);
      expect(BODY_MAP_COVERAGE.frente).toContain(m);
    }
  });
});
