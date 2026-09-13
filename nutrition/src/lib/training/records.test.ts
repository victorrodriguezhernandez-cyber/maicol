import { describe, it, expect } from "vitest";
import {
  estimateOneRepMax,
  computeExerciseRecords,
  detectNewRecords,
  sessionVolumeKg,
  formatKg,
  formatDuration,
  ONE_RM_MAX_REPS,
  type CompletedSet,
} from "./records";

let n = 0;
function s(partial: Partial<CompletedSet>): CompletedSet {
  n += 1;
  return {
    id: `set-${n}`,
    weightKg: null,
    reps: null,
    durationSeconds: null,
    setType: "normal",
    completedAt: "2026-09-01T10:00:00Z",
    sessionId: "sesion-1",
    ...partial,
  };
}

describe("estimateOneRepMax", () => {
  it("con una repetición devuelve el peso tal cual", () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(100 * (1 + 1 / 30), 10);
  });

  it("aplica Epley exactamente", () => {
    // 100 kg × 5 → 100 × (1 + 5/30) = 116,666...
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.6667, 3);
    // 80 kg × 10 → 80 × (1 + 10/30) = 106,666...
    expect(estimateOneRepMax(80, 10)).toBeCloseTo(106.6667, 3);
  });

  it("no estima por encima de 12 repeticiones en vez de dar un número malo", () => {
    expect(estimateOneRepMax(60, ONE_RM_MAX_REPS)).not.toBeNull();
    expect(estimateOneRepMax(60, ONE_RM_MAX_REPS + 1)).toBeNull();
    expect(estimateOneRepMax(60, 30)).toBeNull();
  });

  it("rechaza entradas que no tienen sentido", () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(-10, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(100, 2.5)).toBeNull();
    expect(estimateOneRepMax(Number.NaN, 5)).toBeNull();
  });
});

describe("computeExerciseRecords", () => {
  it("encuentra el peso más alto", () => {
    const r = computeExerciseRecords([
      s({ weightKg: 80, reps: 5 }),
      s({ weightKg: 100, reps: 1 }),
      s({ weightKg: 90, reps: 3 }),
    ]);
    expect(r.heaviest?.weightKg).toBe(100);
  });

  it("a igual peso gana quien hizo más repeticiones", () => {
    const r = computeExerciseRecords([
      s({ weightKg: 100, reps: 3 }),
      s({ weightKg: 100, reps: 6 }),
    ]);
    expect(r.heaviest?.reps).toBe(6);
  });

  it("el mejor 1RM estimado puede no ser la serie más pesada", () => {
    // 100×1 → 103,3 ; 90×5 → 105. La segunda es mejor levantamiento
    // aunque pese menos, y eso es justo lo que aporta el 1RM estimado.
    const r = computeExerciseRecords([
      s({ weightKg: 100, reps: 1 }),
      s({ weightKg: 90, reps: 5 }),
    ]);
    expect(r.heaviest?.weightKg).toBe(100);
    expect(r.bestEstimatedOneRm?.weightKg).toBe(90);
    expect(r.bestEstimatedOneRm?.value).toBeCloseTo(105, 5);
  });

  it("ignora el calentamiento y los dropsets para los récords", () => {
    const r = computeExerciseRecords([
      s({ weightKg: 200, reps: 1, setType: "calentamiento" }),
      s({ weightKg: 180, reps: 5, setType: "dropset" }),
      s({ weightKg: 80, reps: 5 }),
    ]);
    expect(r.heaviest?.weightKg).toBe(80);
    expect(r.totalSets).toBe(1);
  });

  it("guarda el aguante más largo de los ejercicios por tiempo", () => {
    const r = computeExerciseRecords([
      s({ durationSeconds: 45 }),
      s({ durationSeconds: 70 }),
      s({ durationSeconds: 60 }),
    ]);
    expect(r.longestHold?.durationSeconds).toBe(70);
    expect(r.heaviest).toBeNull();
  });

  it("suma el volumen por sesión y se queda con la mejor", () => {
    const r = computeExerciseRecords([
      s({ weightKg: 100, reps: 5, sessionId: "a" }), // 500
      s({ weightKg: 100, reps: 5, sessionId: "a" }), // 500 → 1000
      s({ weightKg: 60, reps: 10, sessionId: "b" }), // 600
    ]);
    expect(r.bestSessionVolume?.sessionId).toBe("a");
    expect(r.bestSessionVolume?.volumeKg).toBe(1000);
  });

  it("sin series no inventa récords", () => {
    const r = computeExerciseRecords([]);
    expect(r.heaviest).toBeNull();
    expect(r.bestEstimatedOneRm).toBeNull();
    expect(r.mostReps).toBeNull();
    expect(r.longestHold).toBeNull();
    expect(r.bestSessionVolume).toBeNull();
    expect(r.totalSets).toBe(0);
  });
});

describe("detectNewRecords", () => {
  const historial = computeExerciseRecords([
    s({ weightKg: 80, reps: 8 }),
    s({ weightKg: 85, reps: 5 }),
  ]);

  it("canta el récord de peso cuando se supera", () => {
    const found = detectNewRecords(s({ weightKg: 90, reps: 3 }), historial);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("peso");
    expect(found[0].message).toContain("90");
    expect(found[0].previous).toContain("85");
  });

  it("no canta nada si no se supera nada", () => {
    expect(detectNewRecords(s({ weightKg: 80, reps: 5 }), historial)).toEqual([]);
  });

  it("nunca canta un récord en la primera serie del ejercicio", () => {
    // Sin historial, cualquier cosa sería "récord" — y celebrar la
    // primera vez que haces algo vacía de significado el badge.
    const sinHistorial = computeExerciseRecords([]);
    expect(detectNewRecords(s({ weightKg: 200, reps: 10 }), sinHistorial)).toEqual([]);
  });

  it("no canta el mismo logro dos veces con nombres distintos", () => {
    // 90×8 bate el peso Y el 1RM estimado; sólo debe salir uno.
    const found = detectNewRecords(s({ weightKg: 90, reps: 8 }), historial);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("peso");
  });

  it("canta el 1RM estimado cuando mejora sin subir el peso", () => {
    // 85×7 no bate los 85 kg (mismo peso, y el récord de peso exige
    // superarlo) pero sí mejora la marca estimada: 85×(1+7/30)=104,8
    // frente a 85×(1+5/30)=99,2.
    const found = detectNewRecords(s({ weightKg: 85, reps: 7 }), historial);
    expect(found.map((f) => f.kind)).toContain("1rm");
  });

  it("ignora un dropset por muy bestia que sea", () => {
    const found = detectNewRecords(
      s({ weightKg: 500, reps: 20, setType: "dropset" }),
      historial,
    );
    expect(found).toEqual([]);
  });

  it("canta el récord de tiempo en los ejercicios isométricos", () => {
    const previo = computeExerciseRecords([s({ durationSeconds: 60 })]);
    const found = detectNewRecords(s({ durationSeconds: 95 }), previo);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("tiempo");
    expect(found[0].message).toContain("1 min 35 s");
  });
});

describe("sessionVolumeKg", () => {
  it("suma peso por repeticiones de las series que cuentan", () => {
    expect(
      sessionVolumeKg([
        s({ weightKg: 100, reps: 5 }),
        s({ weightKg: 50, reps: 10 }),
      ]),
    ).toBe(1000);
  });

  it("descuenta el calentamiento", () => {
    expect(
      sessionVolumeKg([
        s({ weightKg: 100, reps: 10, setType: "calentamiento" }),
        s({ weightKg: 100, reps: 5 }),
      ]),
    ).toBe(500);
  });

  it("no intenta convertir a kilos las series sin peso", () => {
    expect(sessionVolumeKg([s({ durationSeconds: 60 }), s({ reps: 20 })])).toBe(0);
  });
});

describe("formato", () => {
  it("usa coma decimal y no arrastra ceros", () => {
    expect(formatKg(82.5)).toBe("82,5");
    expect(formatKg(80)).toBe("80");
    expect(formatKg(103.333333)).toBe("103,3");
  });

  it("escribe las duraciones en minutos y segundos", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(95)).toBe("1 min 35 s");
  });
});
