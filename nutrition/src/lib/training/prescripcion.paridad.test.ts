import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as app from "./prescripcion";
import * as edge from "../../../supabase/functions/_shared/prescripcion";
import { TRAINING_FOCUS } from "./types";
import { MUSCLE_GROUPS } from "./muscles";
import type { Equipment, Mechanic } from "./types";

/**
 * La misma garantía que `progression.paridad.test.ts`, para la tabla de
 * rangos: si el coach prescribiera 8-12 donde la pantalla prescribe
 * 12-20, el usuario no sabría a cuál hacer caso.
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
const MECANICAS: Mechanic[] = ["compuesto", "aislamiento"];
const DIRECCIONES = ["perder", "ganar", "mantener"] as const;

describe("paridad de la prescripción", () => {
  it("las dos copias prescriben lo mismo para todos los ejercicios posibles", () => {
    let combinaciones = 0;
    for (const primary_muscle of MUSCLE_GROUPS) {
      for (const mechanic of MECANICAS) {
        for (const equipment of EQUIPOS) {
          const ej = { primary_muscle, mechanic, equipment };
          expect(edge.claseDeEjercicio(ej)).toBe(app.claseDeEjercicio(ej));
          for (const foco of TRAINING_FOCUS) {
            for (const dir of DIRECCIONES) {
              expect(
                edge.prescribirRango(ej, foco, dir),
                `${primary_muscle}/${mechanic}/${equipment}/${foco}/${dir}`,
              ).toEqual(app.prescribirRango(ej, foco, dir));
              combinaciones++;
            }
          }
        }
      }
    }
    expect(combinaciones).toBe(
      MUSCLE_GROUPS.length * MECANICAS.length * EQUIPOS.length * TRAINING_FOCUS.length * 3,
    );
  });

  it("la tabla es la misma en las dos", () => {
    expect(edge.TABLA_RANGOS).toEqual(app.TABLA_RANGOS);
    expect(edge.SEPARACION_QUE_IMPORTA).toBe(app.SEPARACION_QUE_IMPORTA);
  });

  it("el cuerpo de las dos copias es literalmente el mismo", () => {
    const raiz = resolve(__dirname, "../../..");
    const appSrc = readFileSync(resolve(raiz, "src/lib/training/prescripcion.ts"), "utf8");
    const edgeSrc = readFileSync(
      resolve(raiz, "supabase/functions/_shared/prescripcion.ts"),
      "utf8",
    );
    const marca = "/** Hacia dónde va el peso corporal";
    expect(edgeSrc.slice(edgeSrc.indexOf(marca))).toBe(appSrc.slice(appSrc.indexOf(marca)));
  });
});
