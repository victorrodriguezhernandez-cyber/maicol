import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as app from "./progression";
import * as edge from "../../../supabase/functions/_shared/progresion";
import type { ObjetivoEjercicio, SerieHecha } from "./progression";
import type { Equipment, SetType } from "./types";

/**
 * Las dos copias del motor tienen que dar la MISMA respuesta.
 *
 * `supabase/functions/_shared/progresion.ts` es una copia deliberada de
 * `progression.ts` porque los Edge Functions son un deployable Deno
 * aparte y no pueden importar de `src/` (misma razón que `_shared/trend.ts`,
 * regla 3). El riesgo de duplicar es que una se toque y la otra no: el
 * coach diría "sube a 16 kg" y la pantalla del entreno otra cosa, que es
 * peor que no responder.
 *
 * Esto pasa los mismos casos por las dos y falla en cuanto divergen.
 */

const EQUIPOS: Equipment[] = [
  "barra",
  "mancuernas",
  "polea",
  "maquina",
  "peso_corporal",
  "kettlebell",
  "banda",
  "disco",
  "multipower",
  "otro",
];

const OBJETIVOS: ObjetivoEjercicio[] = [
  { sets: 3, repsMin: 8, repsMax: 12, rir: 2 },
  { sets: 4, repsMin: 4, repsMax: 6, rir: null },
  { sets: 3, repsMin: 15, repsMax: 20, rir: 1 },
];

function s(n: number, reps: number, kg: number | null, rir: number | null, t: SetType): SerieHecha {
  return { setNumber: n, reps, weightKg: kg, durationSeconds: null, rir, setType: t };
}

const HISTORIALES: SerieHecha[][] = [
  [],
  [s(1, 10, 14, null, "normal"), s(2, 8, 14, null, "normal"), s(3, 8, 12, null, "normal")],
  [s(1, 12, 14, 2, "normal"), s(2, 12, 14, 2, "normal"), s(3, 12, 14, 2, "normal")],
  [s(1, 12, 14, 0, "normal"), s(2, 12, 14, 0, "normal"), s(3, 12, 14, 0, "normal")],
  [s(1, 6, 20, null, "normal"), s(2, 5, 20, null, "normal"), s(3, 4, 20, null, "normal")],
  [s(1, 20, 7.5, null, "calentamiento"), s(2, 9, 21.3, 1, "normal"), s(3, 9, 21.3, 1, "backoff")],
  [s(1, 12, null, null, "normal"), s(2, 12, null, null, "normal"), s(3, 12, null, null, "normal")],
  [s(3, 8, 12, null, "normal"), s(1, 10, 14, null, "normal"), s(2, 8, 14, null, "fallo")],
];

describe("paridad entre la copia de la app y la del Edge Function", () => {
  it("recomendarCarga da lo mismo en las dos, en todas las combinaciones", () => {
    let combinaciones = 0;
    for (const previas of HISTORIALES) {
      for (const objetivo of OBJETIVOS) {
        for (const eq of EQUIPOS) {
          const etiqueta = `${eq} · ${objetivo.repsMin}-${objetivo.repsMax} · ${previas.length} series`;
          expect(edge.recomendarCarga(previas, objetivo, eq), etiqueta).toEqual(
            app.recomendarCarga(previas, objetivo, eq),
          );
          combinaciones++;
        }
      }
    }
    // Que no se quede en cero por un fixture vacío sin que nadie lo note.
    expect(combinaciones).toBe(HISTORIALES.length * OBJETIVOS.length * EQUIPOS.length);
  });

  it("incrementoMinimo y los rangos por foco coinciden", () => {
    for (const eq of EQUIPOS) {
      expect(edge.incrementoMinimo(eq), eq).toBe(app.incrementoMinimo(eq));
    }
  });

  /**
   * Compara el texto de las dos copias saltándose la cabecera, que es lo
   * único que puede diferir. Los casos de arriba cubren el comportamiento;
   * esto cubre lo que los casos no tocan — un comentario corregido en una
   * copia y no en la otra, una constante nueva sin caso todavía.
   */
  it("el cuerpo de las dos copias es literalmente el mismo", () => {
    const raiz = resolve(__dirname, "../../..");
    const appSrc = readFileSync(resolve(raiz, "src/lib/training/progression.ts"), "utf8");
    const edgeSrc = readFileSync(
      resolve(raiz, "supabase/functions/_shared/progresion.ts"),
      "utf8",
    );
    const marca = "/** Una serie ya registrada";
    expect(edgeSrc.slice(edgeSrc.indexOf(marca))).toBe(appSrc.slice(appSrc.indexOf(marca)));
  });
});
