import { describe, it, expect } from "vitest";
import {
  MUSCLE_GROUPS,
  MUSCLE_REGIONS,
  MUSCLE_REGION_ORDER,
  REGION_LABELS,
  isMuscleRegion,
  musclesInRegion,
} from "./muscles";

/**
 * Las zonas son la puerta de entrada al catálogo: son los únicos chips
 * que se enseñan para elegir un ejercicio. Una zona sin músculos, o un
 * músculo sin zona, deja ejercicios que EXISTEN y no se pueden encontrar
 * por ninguna vía salvo escribir el nombre exacto — y eso no da ningún
 * error, simplemente no aparecen.
 */
describe("zonas del cuerpo", () => {
  it("cada uno de los 17 músculos cae en una zona conocida", () => {
    for (const m of MUSCLE_GROUPS) {
      expect(MUSCLE_REGION_ORDER).toContain(MUSCLE_REGIONS[m]);
    }
  });

  it("ninguna zona se queda vacía", () => {
    for (const zona of MUSCLE_REGION_ORDER) {
      expect(musclesInRegion(zona).length).toBeGreaterThan(0);
    }
  });

  it("las zonas reparten los 17 músculos sin perder ni repetir ninguno", () => {
    const repartidos = MUSCLE_REGION_ORDER.flatMap((z) => musclesInRegion(z));
    expect(repartidos.length).toBe(MUSCLE_GROUPS.length);
    expect(new Set(repartidos).size).toBe(MUSCLE_GROUPS.length);
    expect([...repartidos].sort()).toEqual([...MUSCLE_GROUPS].sort());
  });

  it("cada zona tiene nombre para pantalla", () => {
    for (const zona of MUSCLE_REGION_ORDER) {
      expect(REGION_LABELS[zona]).toBeTruthy();
    }
  });

  it("los tres hombros caen en la misma zona", () => {
    // Es el caso que motivó agrupar: tres chips de hombro obligaban a
    // saber anatomía para buscar un press de hombro.
    expect(MUSCLE_REGIONS.deltoide_anterior).toBe("hombro");
    expect(MUSCLE_REGIONS.deltoide_lateral).toBe("hombro");
    expect(MUSCLE_REGIONS.deltoide_posterior).toBe("hombro");
    expect(musclesInRegion("hombro")).toHaveLength(3);
  });

  it("musclesInRegion respeta el orden canónico de MUSCLE_GROUPS", () => {
    // La lista se enseña tal cual; si el orden fuera el de inserción de
    // un objeto cambiaría al refactorizar sin que nadie se enterara.
    const pierna = musclesInRegion("pierna");
    const esperado = MUSCLE_GROUPS.filter((m) => MUSCLE_REGIONS[m] === "pierna");
    expect(pierna).toEqual(esperado);
  });

  it("isMuscleRegion sólo acepta zonas reales", () => {
    // Es lo que valida el parámetro `?zona=` del API, así que tiene que
    // rechazar cualquier cosa que llegue por la URL.
    expect(isMuscleRegion("hombro")).toBe(true);
    expect(isMuscleRegion("pierna")).toBe(true);
    expect(isMuscleRegion("deltoide_lateral")).toBe(false);
    expect(isMuscleRegion("")).toBe(false);
    expect(isMuscleRegion("'; drop table exercises; --")).toBe(false);
  });
});
