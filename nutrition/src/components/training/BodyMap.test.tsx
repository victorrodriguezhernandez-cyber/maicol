import { describe, it, expect } from "vitest";
import { BODY_MAP_COVERAGE } from "./BodyMap";
import { MUSCLE_ICON_COVERAGE } from "./MuscleIcon";
import { MUSCLE_GROUPS, MUSCLE_LABELS, VOLUME_LANDMARKS } from "@/lib/training/muscles";
import { TIER_COLORS, TIER_EDGE, TIER_LABELS, TIERS } from "@/lib/training/levels";

/**
 * El contrato entre la taxonomía, el dibujo y los iconos.
 *
 * Añadir un músculo a `MUSCLE_GROUPS` (y al dominio de Postgres) sin
 * dibujarlo no rompe nada en tiempo de ejecución: el mapa simplemente no
 * pinta esa zona y el usuario ve un hueco sin saber por qué. Estos tests
 * convierten ese despiste silencioso en un fallo ruidoso.
 */
describe("contrato del mapa muscular", () => {
  const dibujados = new Set([...BODY_MAP_COVERAGE.frente, ...BODY_MAP_COVERAGE.espalda]);

  it("dibuja los 17 músculos entre las dos vistas", () => {
    expect(MUSCLE_GROUPS.filter((m) => !dibujados.has(m))).toEqual([]);
  });

  it("no dibuja ningún músculo que no exista en la taxonomía", () => {
    expect(
      [...dibujados].filter((m) => !(MUSCLE_GROUPS as readonly string[]).includes(m)),
    ).toEqual([]);
  });

  it("cada músculo tiene icono propio", () => {
    // El icono de un músculo es su silueta recortada del mapa, así que si
    // falta uno la lista enseña un hueco donde los demás llevan una forma.
    expect(MUSCLE_GROUPS.filter((m) => !MUSCLE_ICON_COVERAGE.includes(m))).toEqual([]);
  });

  it("cada músculo tiene nombre legible y rango de volumen", () => {
    for (const muscle of MUSCLE_GROUPS) {
      expect(MUSCLE_LABELS[muscle]).toBeTruthy();
      expect(VOLUME_LANDMARKS[muscle]).toBeTruthy();
    }
  });

  it("los músculos de sólo-espalda no aparecen en la vista frontal", () => {
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

describe("colores de rango", () => {
  it("cada rango tiene color, borde y nombre", () => {
    for (const tier of TIERS) {
      expect(TIER_COLORS[tier]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(TIER_EDGE[tier]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(TIER_LABELS[tier]).toBeTruthy();
    }
  });

  it("los cinco rangos son colores distintos entre sí", () => {
    // Dos rangos del mismo color harían el mapa ilegible sin que nada
    // fallara.
    const colores = TIERS.map((t) => TIER_COLORS[t].toLowerCase());
    expect(new Set(colores).size).toBe(TIERS.length);
  });
});
