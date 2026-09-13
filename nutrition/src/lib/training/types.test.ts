import { describe, it, expect } from "vitest";
import { numberWorkingSets, isTimeBased } from "./types";
import type { WorkoutSetRow, ExerciseRow, SetType } from "./types";

let n = 0;
function set(setType: SetType): WorkoutSetRow {
  n += 1;
  return {
    id: `s${n}`,
    session_id: "sesion",
    exercise_id: "ejercicio",
    exercise_position: 1,
    set_number: n,
    set_type: setType,
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    rir: null,
    rest_taken_seconds: null,
    notes: null,
    completed_at: null,
    created_at: "2026-09-13T10:00:00Z",
  };
}

function exercise(partial: Partial<ExerciseRow>): ExerciseRow {
  return {
    id: "e1",
    user_id: null,
    name: "Ejercicio",
    name_normalized: "ejercicio",
    primary_muscle: "pecho",
    secondary_muscles: [],
    equipment: "barra",
    mechanic: "compuesto",
    pattern: "empuje_horizontal",
    is_unilateral: false,
    default_reps_min: 8,
    default_reps_max: 12,
    default_rest_seconds: 90,
    cues: null,
    is_active: true,
    created_at: "2026-09-13T10:00:00Z",
    ...partial,
  };
}

describe("numberWorkingSets", () => {
  it("numera sólo las series de trabajo", () => {
    const sets = [set("normal"), set("normal"), set("normal")];
    const labels = numberWorkingSets(sets);
    expect(sets.map((s) => labels.get(s.id))).toEqual(["1", "2", "3"]);
  });

  it("el calentamiento sale como C y no consume número", () => {
    // Si el calentamiento contara, "la tercera serie" significaría cosas
    // distintas según cuántas de aproximación hicieras ese día, y
    // comparar entre sesiones dejaría de tener sentido.
    const sets = [set("calentamiento"), set("calentamiento"), set("normal"), set("normal")];
    const labels = numberWorkingSets(sets);
    expect(sets.map((s) => labels.get(s.id))).toEqual(["C", "C", "1", "2"]);
  });

  it("el dropset sale como D pero sí ocupa su sitio en la cuenta", () => {
    // Es trabajo efectivo (cuenta para el volumen), así que avanza la
    // numeración; sólo cambia la etiqueta, porque es un añadido a la
    // serie anterior y no una serie fresca.
    const sets = [set("normal"), set("dropset"), set("normal")];
    const labels = numberWorkingSets(sets);
    expect(sets.map((s) => labels.get(s.id))).toEqual(["1", "D", "3"]);
  });

  it("backoff y fallo se numeran como series normales", () => {
    const sets = [set("normal"), set("backoff"), set("fallo")];
    const labels = numberWorkingSets(sets);
    expect(sets.map((s) => labels.get(s.id))).toEqual(["1", "2", "3"]);
  });

  it("sin series devuelve un mapa vacío", () => {
    expect(numberWorkingSets([]).size).toBe(0);
  });
});

describe("isTimeBased", () => {
  it("los transportes se registran por tiempo", () => {
    expect(isTimeBased(exercise({ pattern: "transporte" }))).toBe(true);
  });

  it("un isométrico de core también", () => {
    // Una plancha con rango 1-1: pedir "1 repetición" no significa nada.
    expect(
      isTimeBased(exercise({ pattern: "core", default_reps_min: 1, default_reps_max: 1 })),
    ).toBe(true);
  });

  it("un abdominal normal se registra por repeticiones", () => {
    expect(
      isTimeBased(exercise({ pattern: "core", default_reps_min: 15, default_reps_max: 25 })),
    ).toBe(false);
  });

  it("un press no se registra por tiempo", () => {
    expect(isTimeBased(exercise({ pattern: "empuje_horizontal" }))).toBe(false);
  });
});
