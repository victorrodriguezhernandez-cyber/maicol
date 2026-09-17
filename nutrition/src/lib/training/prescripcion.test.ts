import { describe, it, expect } from "vitest";
import {
  claseDeEjercicio,
  prescribirRango,
  rangoDesajustado,
  TABLA_RANGOS,
  type EjercicioParaPrescribir,
} from "./prescripcion";
import { TRAINING_FOCUS } from "./types";

const pressBanca: EjercicioParaPrescribir = {
  mechanic: "compuesto",
  primary_muscle: "pecho",
  equipment: "barra",
};
const curlMuñeca: EjercicioParaPrescribir = {
  mechanic: "aislamiento",
  primary_muscle: "antebrazo",
  equipment: "mancuernas",
};
const dominadas: EjercicioParaPrescribir = {
  mechanic: "compuesto",
  primary_muscle: "dorsal",
  equipment: "peso_corporal",
};
const curlFemoral: EjercicioParaPrescribir = {
  mechanic: "aislamiento",
  primary_muscle: "isquiotibiales",
  equipment: "maquina",
};

describe("claseDeEjercicio", () => {
  it("separa lo que se puede cargar de lo que no", () => {
    expect(claseDeEjercicio(pressBanca)).toBe("compuesto_pesado");
    // Un compuesto grande pero a peso corporal no admite series de 3: no
    // se puede subir de dos en dos kilos.
    expect(claseDeEjercicio(dominadas)).toBe("compuesto_ligero");
    expect(claseDeEjercicio(curlFemoral)).toBe("aislamiento_grande");
    expect(claseDeEjercicio(curlMuñeca)).toBe("aislamiento_pequeno");
  });
});

describe("prescribirRango", () => {
  /**
   * El caso concreto de la queja: la rutina ponía 8-12 en un curl de
   * muñeca. Para antebrazo, con objetivo de volumen, lo que toca es
   * 12-20 — y ahí el peso correcto es otro.
   */
  it("un curl de muñeca no lleva el mismo rango que un press de banca", () => {
    const banca = prescribirRango(pressBanca, "hipertrofia");
    const muñeca = prescribirRango(curlMuñeca, "hipertrofia");
    expect(banca.repsMax).toBeLessThan(muñeca.repsMin);
    expect(muñeca.repsMin).toBe(12);
    expect(muñeca.repsMax).toBe(20);
  });

  it("fuerza da rangos más cortos que volumen, y volumen que resistencia", () => {
    const f = prescribirRango(pressBanca, "fuerza");
    const h = prescribirRango(pressBanca, "hipertrofia");
    const r = prescribirRango(pressBanca, "resistencia");
    expect(f.repsMax).toBeLessThan(h.repsMax);
    expect(h.repsMax).toBeLessThan(r.repsMax);
  });

  it("en un músculo pequeño no baja a rangos de fuerza aunque el objetivo sea fuerza", () => {
    // Un peso para 4 repeticiones en un curl de muñeca lo paga la muñeca.
    const r = prescribirRango(curlMuñeca, "fuerza");
    expect(r.repsMin).toBeGreaterThanOrEqual(8);
  });

  /**
   * "Bajar grasa y ganar fuerza" es una combinación real y la app tiene
   * que tratarla distinto: en déficit, sostener ya es ganar.
   */
  it("en déficit deja más margen y lo dice", () => {
    const normal = prescribirRango(pressBanca, "fuerza", "mantener");
    const deficit = prescribirRango(pressBanca, "fuerza", "perder");
    expect(deficit.rir).toBe(normal.rir + 1);
    expect(deficit.enDeficit).toBe(true);
    expect(deficit.porque.join(" ")).toContain("déficit");
    // El rango NO cambia: lo que se protege en déficit es la carga.
    expect(deficit.repsMin).toBe(normal.repsMin);
    expect(deficit.repsMax).toBe(normal.repsMax);
  });

  it("en déficit quita una serie de los aislamientos, no de los compuestos", () => {
    expect(prescribirRango(curlMuñeca, "hipertrofia", "perder").sets).toBeLessThan(
      prescribirRango(curlMuñeca, "hipertrofia", "mantener").sets,
    );
    expect(prescribirRango(pressBanca, "hipertrofia", "perder").sets).toBe(
      prescribirRango(pressBanca, "hipertrofia", "mantener").sets,
    );
  });

  it("toda celda de la tabla es coherente y toda prescripción se explica", () => {
    const clases = ["compuesto_pesado", "compuesto_ligero", "aislamiento_grande", "aislamiento_pequeno"] as const;
    for (const foco of TRAINING_FOCUS) {
      for (const clase of clases) {
        const r = TABLA_RANGOS[foco][clase];
        expect(r.repsMin, `${foco}/${clase}`).toBeGreaterThan(0);
        expect(r.repsMin, `${foco}/${clase}`).toBeLessThan(r.repsMax);
        expect(r.sets, `${foco}/${clase}`).toBeGreaterThanOrEqual(2);
        expect(r.rir, `${foco}/${clase}`).toBeGreaterThanOrEqual(0);
      }
      // Regla 9: ninguna prescripción se queda sin explicación.
      const p = prescribirRango(pressBanca, foco);
      expect(p.porque.length, foco).toBeGreaterThan(0);
    }
  });
});

describe("rangoDesajustado", () => {
  it("no molesta por diferencias que no cambian el peso", () => {
    expect(rangoDesajustado({ repsMin: 8, repsMax: 12 }, { repsMin: 8, repsMax: 10 })).toBe(false);
  });

  it("avisa cuando la rutina pide otra cosa de verdad", () => {
    // 8-12 en un curl de muñeca contra los 12-20 que tocan.
    expect(rangoDesajustado({ repsMin: 8, repsMax: 12 }, { repsMin: 12, repsMax: 20 })).toBe(true);
  });
});
