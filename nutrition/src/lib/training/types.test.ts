import { describe, it, expect } from "vitest";
import { numberWorkingSets, medicionDe, rangoDeMedicion } from "./types";
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
    tracks_weight: true,
    tracks_reps: true,
    tracks_duration: false,
    default_reps_min: 8,
    default_reps_max: 12,
    default_duration_min: null,
    default_duration_max: null,
    default_rest_seconds: 90,
    cues: null,
    how_to: null,
    mistakes: null,
    is_common: false,
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

describe("medicionDe", () => {
  it("un press pide peso y repeticiones", () => {
    expect(medicionDe(exercise({}))).toEqual({ peso: true, reps: true, tiempo: false });
  });

  it("una plancha pide sólo tiempo", () => {
    const plancha = exercise({
      pattern: "core",
      equipment: "peso_corporal",
      tracks_weight: false,
      tracks_reps: false,
      tracks_duration: true,
      default_reps_min: 1,
      default_reps_max: 1,
      default_duration_min: 30,
      default_duration_max: 60,
    });
    expect(medicionDe(plancha)).toEqual({ peso: false, reps: false, tiempo: true });
  });

  it("un paseo del granjero pide peso Y tiempo", () => {
    // Éste es el caso que motivó la migración 0008. Antes la medición se
    // deducía del patrón de movimiento: `transporte` valía por "esto va
    // por tiempo" y la pantalla escondía la columna de peso, así que los
    // kilos con los que de verdad caminas no tenían dónde apuntarse y el
    // dato se perdía. Peso y tiempo no son excluyentes.
    const granjero = exercise({
      pattern: "transporte",
      tracks_weight: true,
      tracks_reps: false,
      tracks_duration: true,
      default_reps_min: 1,
      default_reps_max: 1,
      default_duration_min: 20,
      default_duration_max: 45,
    });
    expect(medicionDe(granjero)).toEqual({ peso: true, reps: false, tiempo: true });
  });

  it("no deduce nada del patrón: lo lee del ejercicio", () => {
    // Un transporte que sí se cuenta por pasos/repeticiones es legítimo,
    // y la función tiene que respetarlo en vez de imponer el tiempo.
    const conReps = exercise({ pattern: "transporte", tracks_duration: false });
    expect(medicionDe(conReps).tiempo).toBe(false);
    expect(medicionDe(conReps).reps).toBe(true);
  });
});

describe("rangoDeMedicion", () => {
  it("en repeticiones devuelve el rango de repeticiones", () => {
    expect(rangoDeMedicion(exercise({}))).toEqual({ min: 8, max: 12, unidad: "reps" });
  });

  it("en un ejercicio de tiempo devuelve segundos", () => {
    const plancha = exercise({
      tracks_reps: false,
      tracks_duration: true,
      default_reps_min: 1,
      default_reps_max: 1,
      default_duration_min: 30,
      default_duration_max: 60,
    });
    expect(rangoDeMedicion(plancha)).toEqual({ min: 30, max: 60, unidad: "s" });
  });

  it("si mide tiempo pero también repeticiones, manda el rango de repeticiones", () => {
    // El número que se persigue es el de repeticiones; el tiempo ahí es
    // un dato más de la serie, no la pauta.
    const conAmbos = exercise({
      tracks_duration: true,
      default_duration_min: 20,
      default_duration_max: 40,
    });
    expect(rangoDeMedicion(conAmbos).unidad).toBe("reps");
  });
});
