import { describe, it, expect } from "vitest";
import {
  computeMuscleLevel,
  tierForScore,
  explainLevel,
  overallLevel,
  summarizeLevels,
  TIERS,
  TIER_THRESHOLDS,
  MIN_SESSIONS_FOR_PROGRESSION,
  type MuscleStats,
} from "./levels";
import { MUSCLE_GROUPS, type MuscleGroup } from "./muscles";

function stats(partial: Partial<MuscleStats> = {}): MuscleStats {
  return {
    muscle: "pecho",
    weeksAtMev: 0,
    weeksObserved: 0,
    totalSets: 0,
    strengthGain: null,
    sessionsOnMainLift: 0,
    ...partial,
  };
}

describe("tierForScore", () => {
  it("respeta exactamente los cortes documentados", () => {
    expect(tierForScore(0)).toBe("sin_datos");
    expect(tierForScore(1)).toBe("bronce");
    expect(tierForScore(24)).toBe("bronce");
    expect(tierForScore(25)).toBe("plata");
    expect(tierForScore(44)).toBe("plata");
    expect(tierForScore(45)).toBe("oro");
    expect(tierForScore(64)).toBe("oro");
    expect(tierForScore(65)).toBe("platino");
    expect(tierForScore(84)).toBe("platino");
    expect(tierForScore(85)).toBe("diamante");
    expect(tierForScore(100)).toBe("diamante");
  });

  it("los cortes suben de forma estricta", () => {
    const orden = ["bronce", "plata", "oro", "platino", "diamante"] as const;
    for (let i = 1; i < orden.length; i += 1) {
      expect(TIER_THRESHOLDS[orden[i]]).toBeGreaterThan(TIER_THRESHOLDS[orden[i - 1]]);
    }
  });
});

describe("computeMuscleLevel", () => {
  it("sin entrenar nada se queda en sin_datos", () => {
    const level = computeMuscleLevel(stats());
    expect(level.tier).toBe("sin_datos");
    expect(level.score).toBe(0);
    expect(level.parts).toEqual({ constancia: null, volumen: null, progresion: null });
  });

  it("un componente sin datos NO cuenta como cero", () => {
    // Es la regla que hace que empezar no te hunda: con dos semanas
    // perfectas y sin historial de fuerza, la puntuación sale de lo que
    // hay, no de castigar lo que falta.
    const level = computeMuscleLevel(
      stats({ weeksAtMev: 2, weeksObserved: 2, totalSets: 24 }),
    );
    expect(level.parts.constancia).toBe(100);
    expect(level.parts.progresion).toBeNull();
    // Con constancia perfecta, la puntuación tiene que estar claramente
    // por encima de la mitad aunque el volumen acumulado sea bajo.
    expect(level.score).toBeGreaterThan(50);
  });

  it("la constancia se mide sobre las semanas observadas, no sobre ocho", () => {
    const dosDeDos = computeMuscleLevel(stats({ weeksAtMev: 2, weeksObserved: 2, totalSets: 24 }));
    const dosDeOcho = computeMuscleLevel(stats({ weeksAtMev: 2, weeksObserved: 8, totalSets: 24 }));
    expect(dosDeDos.parts.constancia).toBe(100);
    expect(dosDeOcho.parts.constancia).toBe(25);
    expect(dosDeDos.score).toBeGreaterThan(dosDeOcho.score);
  });

  it("el volumen es logarítmico: al principio sube rápido y luego cuesta", () => {
    const p = (n: number) =>
      computeMuscleLevel(stats({ totalSets: n, weeksAtMev: 1, weeksObserved: 1 })).parts.volumen!;
    const saltoTemprano = p(40) - p(20);
    const saltoTardio = p(420) - p(400);
    expect(saltoTemprano).toBeGreaterThan(saltoTardio * 5);
  });

  it("no mide progresión sin sesiones suficientes", () => {
    const pocas = computeMuscleLevel(
      stats({ totalSets: 40, strengthGain: 0.3, sessionsOnMainLift: MIN_SESSIONS_FOR_PROGRESSION - 1 }),
    );
    expect(pocas.parts.progresion).toBeNull();

    const bastantes = computeMuscleLevel(
      stats({ totalSets: 40, strengthGain: 0.3, sessionsOnMainLift: MIN_SESSIONS_FOR_PROGRESSION }),
    );
    expect(bastantes.parts.progresion).not.toBeNull();
  });

  it("una bajada de fuerza puntúa cero, nunca negativo", () => {
    // Una mala racha no debería borrar el trabajo acumulado.
    const level = computeMuscleLevel(
      stats({ totalSets: 100, weeksAtMev: 4, weeksObserved: 8, strengthGain: -0.2, sessionsOnMainLift: 6 }),
    );
    expect(level.parts.progresion).toBe(0);
    expect(level.score).toBeGreaterThan(0);
  });

  it("una progresión enorme no puntúa más que el techo", () => {
    const normal = computeMuscleLevel(
      stats({ totalSets: 100, weeksAtMev: 4, weeksObserved: 8, strengthGain: 0.5, sessionsOnMainLift: 6 }),
    );
    const bestial = computeMuscleLevel(
      stats({ totalSets: 100, weeksAtMev: 4, weeksObserved: 8, strengthGain: 5, sessionsOnMainLift: 6 }),
    );
    expect(normal.parts.progresion).toBe(100);
    expect(bestial.parts.progresion).toBe(100);
  });

  it("la puntuación nunca se sale de 0..100", () => {
    const extremo = computeMuscleLevel(
      stats({ weeksAtMev: 99, weeksObserved: 8, totalSets: 99999, strengthGain: 99, sessionsOnMainLift: 99 }),
    );
    expect(extremo.score).toBeLessThanOrEqual(100);
    expect(extremo.score).toBeGreaterThanOrEqual(0);
  });

  it("dice cuánto falta para el siguiente rango, y nada en el máximo", () => {
    const medio = computeMuscleLevel(stats({ weeksAtMev: 2, weeksObserved: 8, totalSets: 30 }));
    expect(medio.next).not.toBeNull();
    expect(medio.next!.pointsAway).toBeGreaterThan(0);

    const tope = computeMuscleLevel(
      stats({ weeksAtMev: 8, weeksObserved: 8, totalSets: 400, strengthGain: 0.5, sessionsOnMainLift: 10 }),
    );
    expect(tope.tier).toBe("diamante");
    expect(tope.next).toBeNull();
  });
});

describe("explainLevel", () => {
  it("todo nivel se puede justificar, en todos los músculos", () => {
    // La regla 9 del proyecto hecha test: si la app enseña un rango, tiene
    // que poder decir de dónde sale.
    for (const muscle of MUSCLE_GROUPS) {
      for (const s of [
        stats({ muscle }),
        stats({ muscle, weeksAtMev: 1, weeksObserved: 3, totalSets: 12 }),
        stats({ muscle, weeksAtMev: 8, weeksObserved: 8, totalSets: 300, strengthGain: 0.4, sessionsOnMainLift: 9 }),
      ]) {
        const nivel = computeMuscleLevel(s);
        const exp = explainLevel(nivel, s);
        expect(exp.title).toContain("·");
        expect(exp.lines.length).toBeGreaterThan(0);
        expect(exp.lines.every((l) => l.trim().length > 0)).toBe(true);
      }
    }
  });

  it("sin entrenar, dice exactamente qué hacer para salir de ahí", () => {
    const s = stats({ muscle: "pecho" });
    const exp = explainLevel(computeMuscleLevel(s), s);
    expect(exp.todo.join(" ")).toMatch(/\d+ series/);
  });

  it("explica que la progresión está pendiente en vez de contarla como cero", () => {
    const s = stats({ totalSets: 20, weeksAtMev: 2, weeksObserved: 2, sessionsOnMainLift: 1 });
    const exp = explainLevel(computeMuscleLevel(s), s);
    expect(exp.lines.join(" ")).toContain("pendiente");
    expect(exp.lines.join(" ")).toContain("no se puntúa como un cero");
  });
});

describe("overallLevel", () => {
  it("promedia sobre los 17 músculos, no sobre los entrenados", () => {
    // Nueve músculos en diamante y ocho sin tocar no es estar en diamante:
    // un físico es la media de todo el cuerpo.
    const perfectos = MUSCLE_GROUPS.slice(0, 9).map((m: MuscleGroup) =>
      computeMuscleLevel(
        stats({ muscle: m, weeksAtMev: 8, weeksObserved: 8, totalSets: 400, strengthGain: 0.5, sessionsOnMainLift: 10 }),
      ),
    );
    const resto = MUSCLE_GROUPS.slice(9).map((m: MuscleGroup) => computeMuscleLevel(stats({ muscle: m })));
    const general = overallLevel([...perfectos, ...resto]);
    expect(general.tier).not.toBe("diamante");
    expect(general.score).toBeLessThan(60);
  });
});

describe("summarizeLevels", () => {
  it("cuenta todos los rangos, incluidos los que están a cero", () => {
    const levels = MUSCLE_GROUPS.map((m: MuscleGroup) => computeMuscleLevel(stats({ muscle: m })));
    const resumen = summarizeLevels(levels);
    for (const t of TIERS) expect(resumen[t]).toBeGreaterThanOrEqual(0);
    expect(resumen.sin_datos).toBe(MUSCLE_GROUPS.length);
  });
});
