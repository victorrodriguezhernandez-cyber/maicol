import { describe, it, expect } from "vitest";
import {
  computeWeeklyVolume,
  classifyVolume,
  explainVolume,
  volumeIntensity,
  formatSets,
  SECONDARY_SET_WEIGHT,
  type CountableSet,
} from "./volume";
import { MUSCLE_GROUPS, VOLUME_LANDMARKS, type MuscleGroup } from "./muscles";

function set(
  primary: MuscleGroup,
  secondary: MuscleGroup[] = [],
  setType = "normal",
): CountableSet {
  return { primaryMuscle: primary, secondaryMuscles: secondary, setType };
}

describe("computeWeeklyVolume", () => {
  it("devuelve siempre los 17 músculos, también los que están a cero", () => {
    const result = computeWeeklyVolume([set("pecho")]);
    expect(result).toHaveLength(MUSCLE_GROUPS.length);
    expect(result.find((r) => r.muscle === "gemelos")?.sets).toBe(0);
    expect(result.find((r) => r.muscle === "gemelos")?.status).toBe("sin_trabajo");
  });

  it("cuenta la serie entera para el músculo objetivo", () => {
    const result = computeWeeklyVolume([set("pecho"), set("pecho"), set("pecho")]);
    expect(result.find((r) => r.muscle === "pecho")?.directSets).toBe(3);
    expect(result.find((r) => r.muscle === "pecho")?.sets).toBe(3);
  });

  it("cuenta media serie para cada músculo secundario", () => {
    // 4 press de banca: 4 de pecho, y 4 × 0,5 = 2 de tríceps.
    const sets = Array.from({ length: 4 }, () =>
      set("pecho", ["triceps", "deltoide_anterior"]),
    );
    const result = computeWeeklyVolume(sets);
    expect(result.find((r) => r.muscle === "pecho")?.sets).toBe(4);
    expect(result.find((r) => r.muscle === "triceps")?.sets).toBe(4 * SECONDARY_SET_WEIGHT);
    expect(result.find((r) => r.muscle === "triceps")?.directSets).toBe(0);
    expect(result.find((r) => r.muscle === "triceps")?.indirectSets).toBe(2);
  });

  it("no cuenta las series de calentamiento", () => {
    const result = computeWeeklyVolume([
      set("pecho", [], "calentamiento"),
      set("pecho", [], "calentamiento"),
      set("pecho"),
    ]);
    expect(result.find((r) => r.muscle === "pecho")?.sets).toBe(1);
  });

  it("sí cuenta dropsets, backoffs y series al fallo", () => {
    const result = computeWeeklyVolume([
      set("biceps", [], "dropset"),
      set("biceps", [], "backoff"),
      set("biceps", [], "fallo"),
    ]);
    expect(result.find((r) => r.muscle === "biceps")?.sets).toBe(3);
  });

  it("no suma un músculo dos veces si aparece como primario y secundario", () => {
    const result = computeWeeklyVolume([set("pecho", ["pecho", "triceps"])]);
    expect(result.find((r) => r.muscle === "pecho")?.sets).toBe(1);
  });

  it("no cuenta dos veces un secundario repetido en el mismo ejercicio", () => {
    const result = computeWeeklyVolume([set("dorsal", ["biceps", "biceps"])]);
    expect(result.find((r) => r.muscle === "biceps")?.sets).toBe(SECONDARY_SET_WEIGHT);
  });

  it("suma trabajo directo e indirecto del mismo músculo", () => {
    // 2 press de banca (tríceps secundario) + 3 extensiones (tríceps
    // primario) = 3 + 1 = 4 series efectivas.
    const result = computeWeeklyVolume([
      set("pecho", ["triceps"]),
      set("pecho", ["triceps"]),
      set("triceps"),
      set("triceps"),
      set("triceps"),
    ]);
    const triceps = result.find((r) => r.muscle === "triceps");
    expect(triceps?.directSets).toBe(3);
    expect(triceps?.indirectSets).toBe(1);
    expect(triceps?.sets).toBe(4);
  });
});

describe("classifyVolume", () => {
  it("clasifica exactamente en los cortes documentados", () => {
    // Pecho: mev 10, mavMax 20, mrv 22.
    expect(classifyVolume(0, "pecho")).toBe("sin_trabajo");
    expect(classifyVolume(9.5, "pecho")).toBe("por_debajo");
    expect(classifyVolume(10, "pecho")).toBe("en_rango");
    expect(classifyVolume(20, "pecho")).toBe("en_rango");
    expect(classifyVolume(20.5, "pecho")).toBe("alto");
    expect(classifyVolume(22, "pecho")).toBe("alto");
    expect(classifyVolume(22.5, "pecho")).toBe("por_encima");
  });

  it("usa el rango propio de cada músculo, no uno global", () => {
    // 8 series: por debajo para el pecho (mev 10), en rango para los
    // lumbares (mev 2). Si hubiera un umbral único, esto fallaría.
    expect(classifyVolume(8, "pecho")).toBe("por_debajo");
    expect(classifyVolume(8, "lumbares")).toBe("en_rango");
  });

  it("todo músculo tiene un rango coherente", () => {
    for (const muscle of MUSCLE_GROUPS) {
      const l = VOLUME_LANDMARKS[muscle];
      expect(l.mev).toBeGreaterThan(0);
      expect(l.mavMin).toBeGreaterThanOrEqual(l.mev);
      expect(l.mavMax).toBeGreaterThan(l.mavMin);
      expect(l.mrv).toBeGreaterThanOrEqual(l.mavMax);
      expect(l.note.length).toBeGreaterThan(20);
    }
  });
});

describe("explainVolume", () => {
  it("toda etiqueta se puede justificar con números concretos", () => {
    // Esto es la regla del proyecto hecha test: si la app enseña un
    // juicio, tiene que poder respaldarlo.
    for (const muscle of MUSCLE_GROUPS) {
      for (const sets of [0, 1, VOLUME_LANDMARKS[muscle].mev, 100]) {
        const [v] = computeWeeklyVolume(
          Array.from({ length: Math.round(sets) }, () => set(muscle)),
        ).filter((r) => r.muscle === muscle);
        const explanation = explainVolume(v);
        expect(explanation.title).toContain("·");
        // Cómo se cuenta + la advertencia sobre variación individual
        // están siempre, pase lo que pase.
        expect(explanation.lines.length).toBeGreaterThanOrEqual(4);
        expect(explanation.lines.join(" ")).toContain("calentamiento");
      }
    }
  });

  it("menciona el trabajo indirecto sólo cuando lo hay", () => {
    const conIndirecto = computeWeeklyVolume([set("pecho", ["triceps"])]).find(
      (r) => r.muscle === "triceps",
    )!;
    expect(explainVolume(conIndirecto).lines[0]).toContain("secundario");

    const soloDirecto = computeWeeklyVolume([set("triceps")]).find(
      (r) => r.muscle === "triceps",
    )!;
    expect(explainVolume(soloDirecto).lines[0]).not.toContain("secundario");
  });
});

describe("volumeIntensity", () => {
  it("escala contra el techo del músculo, no contra la semana", () => {
    // 11 series de pecho (mrv 22) es la mitad de intensidad; 11 de
    // lumbares (mrv 16) es bastante más. Si se normalizara contra el
    // máximo de la semana, ambas darían 1.
    const pecho = computeWeeklyVolume(
      Array.from({ length: 11 }, () => set("pecho")),
    ).find((r) => r.muscle === "pecho")!;
    const lumbares = computeWeeklyVolume(
      Array.from({ length: 11 }, () => set("lumbares")),
    ).find((r) => r.muscle === "lumbares")!;

    expect(volumeIntensity(pecho)).toBeCloseTo(0.5, 5);
    expect(volumeIntensity(lumbares)).toBeGreaterThan(volumeIntensity(pecho));
  });

  it("nunca pasa de 1 ni baja de 0", () => {
    const enorme = computeWeeklyVolume(
      Array.from({ length: 200 }, () => set("pecho")),
    ).find((r) => r.muscle === "pecho")!;
    expect(volumeIntensity(enorme)).toBe(1);

    const vacio = computeWeeklyVolume([]).find((r) => r.muscle === "pecho")!;
    expect(volumeIntensity(vacio)).toBe(0);
  });
});

describe("formatSets", () => {
  it("enseña las medias series con coma decimal", () => {
    expect(formatSets(12)).toBe("12");
    expect(formatSets(7.5)).toBe("7,5");
    expect(formatSets(0)).toBe("0");
  });
});
