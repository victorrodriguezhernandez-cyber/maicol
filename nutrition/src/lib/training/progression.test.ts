import { describe, it, expect } from "vitest";
import {
  incrementoMinimo,
  objetivoDeEjercicio,
  RANGO_POR_FOCO,
  recomendarCarga,
} from "./progression";
import type { ObjetivoEjercicio, SerieHecha } from "./progression";
import type { Equipment } from "./types";

/**
 * Lo que se fija aquí no es "el consejo suena razonable", es que cada
 * recomendación salga de una regla escrita y venga con el número que la
 * justifica (regla 9 del proyecto). Un consejo de carga que no se puede
 * defender es peor que no dar ninguno: se sigue igual y no se puede
 * discutir.
 */

const objetivo: ObjetivoEjercicio = { sets: 3, repsMin: 8, repsMax: 12, rir: 2 };

function serie(setNumber: number, reps: number, weightKg: number | null, extra?: Partial<SerieHecha>): SerieHecha {
  return { setNumber, reps, weightKg, rir: null, setType: "normal", ...extra };
}

describe("incrementoMinimo", () => {
  it("da un salto cargable en cada material", () => {
    expect(incrementoMinimo("barra")).toBe(2.5);
    expect(incrementoMinimo("mancuernas")).toBe(2);
    expect(incrementoMinimo("kettlebell")).toBe(4);
    expect(incrementoMinimo("disco")).toBe(1.25);
  });

  it("es 0 donde no hay peso que subir", () => {
    for (const eq of ["peso_corporal", "banda", "otro"] as Equipment[]) {
      expect(incrementoMinimo(eq), eq).toBe(0);
    }
  });
});

describe("objetivoDeEjercicio", () => {
  const porDefecto = { repsMin: 10, repsMax: 15 };

  it("lo que pauta la rutina manda siempre", () => {
    const o = objetivoDeEjercicio(objetivo, porDefecto, 3, { foco: "fuerza", equipment: "barra" });
    expect(o).toEqual(objetivo);
  });

  it("sin rutina, un objetivo de fuerza acorta el rango", () => {
    const o = objetivoDeEjercicio(null, porDefecto, 3, { foco: "fuerza", equipment: "barra" });
    expect(o.repsMin).toBe(4);
    expect(o.repsMax).toBe(6);
  });

  it("no aplica el rango del objetivo a ejercicios sin peso", () => {
    // "Haz 4-6 planchas" no significa nada: el continuo fuerza-resistencia
    // va de cuánta carga mueves.
    const o = objetivoDeEjercicio(null, porDefecto, 3, {
      foco: "fuerza",
      equipment: "peso_corporal",
    });
    expect(o.repsMin).toBe(porDefecto.repsMin);
    expect(o.repsMax).toBe(porDefecto.repsMax);
  });

  it("sin objetivo guardado usa el rango propio del ejercicio", () => {
    const o = objetivoDeEjercicio(null, porDefecto, 3, { foco: null, equipment: "barra" });
    expect(o.repsMin).toBe(porDefecto.repsMin);
  });

  it("nunca pide menos de 3 series en una sesión libre", () => {
    expect(objetivoDeEjercicio(null, porDefecto, 1).sets).toBe(3);
    expect(objetivoDeEjercicio(null, porDefecto, 5).sets).toBe(5);
  });

  it("cada foco trae su explicación", () => {
    for (const foco of Object.keys(RANGO_POR_FOCO) as (keyof typeof RANGO_POR_FOCO)[]) {
      const r = RANGO_POR_FOCO[foco];
      expect(r.nota.length, foco).toBeGreaterThan(0);
      expect(r.repsMin, foco).toBeLessThan(r.repsMax);
    }
  });
});

describe("recomendarCarga", () => {
  it("sin historial no inventa un peso", () => {
    const r = recomendarCarga([], objetivo, "mancuernas");
    expect(r.cambio).toBe("sin_datos");
    // Regla 11: no se simula un dato. Si no hay de dónde sacarlo, se dice.
    expect(r.weightKg).toBeNull();
    expect(r.reps).toBe(objetivo.repsMin);
  });

  /**
   * El caso que motivó todo esto: 10×14, 8×14, 8×12.
   *
   * La intuición ("mejor 3×8 con 14") no cuadra con los números: lo que
   * hizo fueron 348 kg de volumen en 26 repeticiones y 3×8 con 14 son
   * 336 en 24. Lo que sí dice el historial es que la primera serie se
   * fue de rosca, así que el consejo es sostener 14 kg en las tres.
   */
  it("bajar el peso a media sesión no baja la recomendación: la consolida", () => {
    const r = recomendarCarga(
      [serie(1, 10, 14), serie(2, 8, 14), serie(3, 8, 12)],
      objetivo,
      "mancuernas",
    );
    expect(r.cambio).toBe("consolida");
    expect(r.weightKg).toBe(14);
    // 10×14 + 8×14 + 8×12 = 348 kg. Tres series de 8 con 14 son 336: menos
    // trabajo del que ya hizo. El suelo de no-retroceso lo sube a 9.
    expect(r.reps).toBe(9);
    expect(r.reps * 3 * 14).toBeGreaterThanOrEqual(348);
  });

  /**
   * El caso que rompió la versión anterior, con sus números reales:
   * curl de muñeca, 13×10 kg, 10×10 kg, 10×8 kg, rango 8-12.
   *
   * La regla de "al bajar el peso vuelve al suelo del rango" daba 3×8 con
   * 10 kg = 240 kg, contra los 310 que ya había movido. Un consejo de
   * progresión que hace entrenar MENOS con el mismo peso está mal, por
   * muy bien que suene la explicación.
   */
  it("nunca manda hacer menos trabajo del que ya hiciste con ese peso", () => {
    const r = recomendarCarga(
      [serie(1, 13, 10), serie(2, 10, 10), serie(3, 10, 8)],
      objetivo,
      "mancuernas",
    );
    expect(r.weightKg).toBe(10);
    expect(r.reps).toBe(11);
    expect(r.reps * 3 * 10).toBeGreaterThan(13 * 10 + 10 * 10 + 10 * 8);
  });

  it("no pide sostener fatigado más de lo que dio en fresco", () => {
    // 9 en la primera serie: por mucho que salgan las cuentas, el objetivo
    // no puede pasar de 9 en las tres.
    const r = recomendarCarga(
      [serie(1, 9, 20), serie(2, 9, 20), serie(3, 9, 16)],
      { sets: 3, repsMin: 8, repsMax: 12, rir: null },
      "barra",
    );
    expect(r.reps).toBeLessThanOrEqual(9);
  });

  it("el suelo de no-retroceso nunca se salta el tope del rango", () => {
    // Si las cuentas pidieran más de repsMax, lo que toca es subir peso,
    // no inflar repeticiones fuera del rango pautado.
    const r = recomendarCarga(
      [serie(1, 30, 20), serie(2, 6, 20), serie(3, 6, 20)],
      { sets: 3, repsMin: 8, repsMax: 12, rir: null },
      "barra",
    );
    expect(r.reps).toBeLessThanOrEqual(12);
  });

  it("sube sólo cuando TODAS las series llegan al tope del rango", () => {
    const r = recomendarCarga(
      [serie(1, 12, 14, { rir: 2 }), serie(2, 12, 14, { rir: 2 }), serie(3, 12, 14, { rir: 2 })],
      objetivo,
      "mancuernas",
    );
    expect(r.cambio).toBe("sube");
    expect(r.weightKg).toBe(16); // 14 + el salto de mancuerna
    expect(r.reps).toBe(8); // y se vuelve al suelo del rango
  });

  it("una sola serie por debajo del tope basta para no subir", () => {
    const r = recomendarCarga(
      [serie(1, 12, 14), serie(2, 12, 14), serie(3, 11, 14)],
      objetivo,
      "mancuernas",
    );
    expect(r.cambio).toBe("mantiene");
    expect(r.weightKg).toBe(14);
    expect(r.reps).toBe(12);
  });

  it("no sube si el RIR pautado no se respetó", () => {
    // Llegó a 12 en las tres, pero al fallo (RIR 0) con un RIR 2 pautado:
    // subir el peso encima de eso es pedir un fallo técnico.
    const r = recomendarCarga(
      [serie(1, 12, 14, { rir: 0 }), serie(2, 12, 14, { rir: 0 }), serie(3, 12, 14, { rir: 0 })],
      objetivo,
      "mancuernas",
    );
    expect(r.cambio).toBe("mantiene");
    expect(r.weightKg).toBe(14);
  });

  it("no sube si faltaron series, aunque las hechas llegaran al tope", () => {
    const r = recomendarCarga([serie(1, 12, 14), serie(2, 12, 14)], objetivo, "mancuernas");
    expect(r.cambio).toBe("mantiene");
    expect(r.weightKg).toBe(14);
    expect(r.detalle.join(" ")).toContain("2 de las 3 series");
  });

  it("por debajo del mínimo del rango el peso se queda donde está", () => {
    const r = recomendarCarga(
      [serie(1, 8, 20), serie(2, 6, 20), serie(3, 5, 20)],
      objetivo,
      "barra",
    );
    expect(r.cambio).toBe("mantiene");
    expect(r.weightKg).toBe(20);
    expect(r.reps).toBe(8);
  });

  it("avisa de la caída de rendimiento con el porcentaje y el umbral", () => {
    // 10 → 5 es un 50%, muy por encima del 25% del corte.
    const r = recomendarCarga(
      [serie(1, 10, 20), serie(2, 7, 20), serie(3, 5, 20)],
      objetivo,
      "barra",
    );
    const texto = r.detalle.join(" ");
    expect(texto).toContain("50%");
    expect(texto).toContain("25%");
  });

  it("no avisa de caída cuando el descenso es normal", () => {
    const r = recomendarCarga(
      [serie(1, 12, 20), serie(2, 11, 20), serie(3, 10, 20)],
      objetivo,
      "barra",
    );
    expect(r.detalle.join(" ")).not.toContain("25%");
  });

  it("ignora calentamiento y dropset al decidir la carga", () => {
    // El calentamiento flojo y el dropset final no deben hacer parecer
    // que el peso de trabajo fue menor del que fue.
    const r = recomendarCarga(
      [
        serie(1, 15, 6, { setType: "calentamiento" }),
        serie(2, 12, 14, { rir: 2 }),
        serie(3, 12, 14, { rir: 2 }),
        serie(4, 12, 14, { rir: 2 }),
        serie(5, 15, 8, { setType: "dropset" }),
      ],
      objetivo,
      "mancuernas",
    );
    expect(r.cambio).toBe("sube");
    expect(r.weightKg).toBe(16);
  });

  it("en peso corporal progresa en repeticiones, no en kilos", () => {
    const r = recomendarCarga(
      [serie(1, 12, null), serie(2, 12, null), serie(3, 12, null)],
      { ...objetivo, rir: null },
      "peso_corporal",
    );
    expect(r.cambio).toBe("sube");
    expect(r.weightKg).toBeNull();
    expect(r.reps).toBe(13);
  });

  it("redondea a un peso que se puede cargar de verdad", () => {
    // 21,3 kg en barra no existe: el consejo tiene que poder ejecutarse.
    const r = recomendarCarga(
      [serie(1, 10, 21.3), serie(2, 10, 21.3), serie(3, 10, 21.3)],
      objetivo,
      "barra",
    );
    expect((r.weightKg! / 2.5) % 1).toBe(0);
  });

  it("lee las series en orden aunque lleguen desordenadas", () => {
    const desordenadas = [serie(3, 8, 12), serie(1, 10, 14), serie(2, 8, 14)];
    const r = recomendarCarga(desordenadas, objetivo, "mancuernas");
    expect(r.cambio).toBe("consolida");
    expect(r.weightKg).toBe(14); // el de la PRIMERA serie, no el de la última
  });

  it("toda recomendación viene con su explicación y su título", () => {
    const casos: SerieHecha[][] = [
      [],
      [serie(1, 12, 14, { rir: 2 }), serie(2, 12, 14, { rir: 2 }), serie(3, 12, 14, { rir: 2 })],
      [serie(1, 10, 14), serie(2, 8, 14), serie(3, 8, 12)],
      [serie(1, 6, 20), serie(2, 6, 20), serie(3, 5, 20)],
      [serie(1, 9, 20), serie(2, 9, 20), serie(3, 9, 20)],
    ];
    for (const previas of casos) {
      const r = recomendarCarga(previas, objetivo, "mancuernas");
      expect(r.titulo.length, JSON.stringify(previas)).toBeGreaterThan(0);
      expect(r.detalle.length, JSON.stringify(previas)).toBeGreaterThan(0);
      for (const linea of r.detalle) expect(linea.trim().length).toBeGreaterThan(0);
    }
  });
});
