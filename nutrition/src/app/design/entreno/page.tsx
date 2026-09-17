import { notFound } from "next/navigation";
import { SessionLogger } from "@/components/training/SessionLogger";
import type {
  ExerciseRow,
  SessionExercise,
  TrainingSessionRow,
  WorkoutSetRow,
} from "@/lib/training/types";
import {
  objetivoDeEjercicio,
  recomendarCarga,
  seriesDesdePrevias,
} from "@/lib/training/progression";
import { prescribirRango } from "@/lib/training/prescripcion";

/**
 * Vista previa del registro de entreno — SOLO en desarrollo.
 *
 * Monta el componente REAL con datos de ejemplo. Existe porque la
 * pantalla de entreno sólo se ve con sesión iniciada y con un entreno
 * abierto, así que revisarla de verdad exigía montar ese estado a mano
 * cada vez. Los botones llaman a las Server Actions de verdad y fallarán
 * contra estos ids inventados: esto es para mirar, no para usar.
 */
export default function PreviewEntrenoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <p className="mb-6 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
        Vista previa con datos inventados. Sólo existe en desarrollo.
      </p>
      <SessionLogger session={SESSION} exercises={EXERCISES} />
    </main>
  );
}

const SESSION: TrainingSessionRow = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "demo",
  session_date: "2026-09-13",
  session_type: null,
  duration_min: null,
  notes: null,
  routine_id: null,
  routine_day_id: null,
  title: "Empuje A",
  started_at: "2026-09-13T18:00:00Z",
  finished_at: null,
  status: "en_curso",
  perceived_effort: null,
  bodyweight_kg: 78.4,
  created_at: "2026-09-13T18:00:00Z",
};

function exercise(partial: Partial<ExerciseRow> & { id: string; name: string }): ExerciseRow {
  return {
    user_id: null,
    name_normalized: partial.name.toLowerCase(),
    primary_muscle: "pecho",
    secondary_muscles: ["triceps", "deltoide_anterior"],
    equipment: "barra",
    mechanic: "compuesto",
    pattern: "empuje_horizontal",
    is_unilateral: false,
    tracks_weight: true,
    tracks_reps: true,
    tracks_duration: false,
    default_reps_min: 6,
    default_reps_max: 10,
    default_duration_min: null,
    default_duration_max: null,
    default_rest_seconds: 150,
    cues: null,
    how_to: null,
    mistakes: null,
    is_common: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

function set(
  n: number,
  partial: Partial<WorkoutSetRow> = {},
  exercisePosition = 1,
): WorkoutSetRow {
  return {
    id: `set-${exercisePosition}-${n}`,
    session_id: SESSION.id,
    exercise_id: `ex-${exercisePosition}`,
    exercise_position: exercisePosition,
    set_number: n,
    set_type: "normal",
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    rir: null,
    rest_taken_seconds: null,
    notes: null,
    completed_at: null,
    created_at: "2026-09-13T18:00:00Z",
    ...partial,
  };
}

/**
 * La recomendación NO se escribe a mano en el fixture: se calcula con el
 * mismo motor que en producción, para que esta pantalla enseñe lo que se
 * va a ver de verdad y no una versión bonita inventada (regla 11).
 */
function conRecomendacion(
  e: Omit<SessionExercise, "recomendacion" | "prescripcion" | "fuenteDelRango">,
): SessionExercise {
  const previas = seriesDesdePrevias(e.previous);
  const prescripcion = prescribirRango(e.exercise, "hipertrofia", "mantener");
  const { objetivo, fuente } = objetivoDeEjercicio(e.target, prescripcion, previas.length);
  return {
    ...e,
    prescripcion,
    fuenteDelRango: fuente,
    recomendacion: recomendarCarga(previas, objetivo, e.exercise.equipment),
  };
}

const EXERCISES: SessionExercise[] = [
  conRecomendacion({
    exercise: exercise({
      id: "ex-1",
      name: "Press de banca con barra",
      cues: "Omóplatos juntos y hundidos contra el banco durante toda la serie. La barra baja a la línea del pezón, no al cuello.",
    }),
    position: 1,
    sets: [
      set(1, { set_type: "calentamiento", weight_kg: 40, reps: 10, completed_at: "2026-09-13T18:02:00Z" }),
      set(2, { weight_kg: 72.5, reps: 8, rir: 2, completed_at: "2026-09-13T18:06:00Z" }),
      set(3, { weight_kg: 72.5, reps: 7, completed_at: "2026-09-13T18:10:00Z", notes: "La última se fue un poco hacia el cuello." }),
      set(4),
    ],
    target: { sets: 3, repsMin: 6, repsMax: 8, durationMin: null, durationMax: null, rir: 2, restSeconds: 150, notes: null },
    previous: new Map([
      [2, { weightKg: 70, reps: 8, durationSeconds: null, rir: 2, setType: "normal" as const }],
      [3, { weightKg: 70, reps: 8, durationSeconds: null, rir: 2, setType: "normal" as const }],
      [4, { weightKg: 70, reps: 6, durationSeconds: null, rir: 0, setType: "normal" as const }],
    ]),
  }),
  conRecomendacion({
    exercise: exercise({
      id: "ex-2",
      name: "Press inclinado con mancuernas",
      equipment: "mancuernas",
      default_reps_min: 8,
      default_reps_max: 12,
      default_rest_seconds: 120,
    }),
    position: 2,
    sets: [set(1, {}, 2), set(2, {}, 2), set(3, {}, 2)],
    target: { sets: 3, repsMin: 8, repsMax: 12, durationMin: null, durationMax: null, rir: 1, restSeconds: 120, notes: "Banco a 30°." },
    previous: new Map([
      [1, { weightKg: 26, reps: 11, durationSeconds: null, rir: 1, setType: "normal" as const }],
      [2, { weightKg: 26, reps: 10, durationSeconds: null, rir: 0, setType: "normal" as const }],
      [3, { weightKg: 24, reps: 10, durationSeconds: null, rir: 0, setType: "normal" as const }],
    ]),
  }),
];
