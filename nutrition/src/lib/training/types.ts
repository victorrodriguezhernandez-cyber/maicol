import type { MuscleGroup } from "./muscles";

/**
 * Tipos de fila del apartado de entreno, escritos a mano igual que
 * `src/lib/supabase/types.ts` y por la misma razón: se leen mejor que los
 * generados y documentan lo que significa cada campo, no sólo su tipo.
 */

export type Equipment =
  | "barra"
  | "mancuernas"
  | "polea"
  | "maquina"
  | "peso_corporal"
  | "kettlebell"
  | "banda"
  | "disco"
  | "multipower"
  | "otro";

export type Mechanic = "compuesto" | "aislamiento";

export type MovementPattern =
  | "empuje_horizontal"
  | "empuje_vertical"
  | "tiron_horizontal"
  | "tiron_vertical"
  | "dominante_rodilla"
  | "dominante_cadera"
  | "aislamiento_brazo"
  | "aislamiento_hombro"
  | "aislamiento_pierna"
  | "core"
  | "transporte";

export type RoutineGoal = "fuerza" | "hipertrofia" | "resistencia" | "mantenimiento";
export type RoutineSource = "manual" | "ia_chat" | "ia_foto" | "plantilla";
export type SessionStatus = "en_curso" | "completada" | "abandonada";
export type SetType = "calentamiento" | "normal" | "dropset" | "backoff" | "fallo";

export interface ExerciseRow {
  id: string;
  user_id: string | null;
  name: string;
  name_normalized: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: Equipment;
  mechanic: Mechanic;
  pattern: MovementPattern;
  is_unilateral: boolean;
  default_reps_min: number;
  default_reps_max: number;
  default_rest_seconds: number;
  cues: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  goal: RoutineGoal;
  notes: string | null;
  source: RoutineSource;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineDayRow {
  id: string;
  routine_id: string;
  position: number;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface RoutineExerciseRow {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number | null;
  rest_seconds: number;
  notes: string | null;
  superset_group: string | null;
  created_at: string;
}

export interface TrainingSessionRow {
  id: string;
  user_id: string;
  session_date: string;
  session_type: string | null;
  duration_min: number | null;
  notes: string | null;
  routine_id: string | null;
  routine_day_id: string | null;
  title: string | null;
  started_at: string | null;
  finished_at: string | null;
  status: SessionStatus;
  perceived_effort: number | null;
  bodyweight_kg: number | null;
  created_at: string;
}

export interface WorkoutSetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_position: number;
  set_number: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rir: number | null;
  rest_taken_seconds: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Un ejercicio dentro de una sesión en curso, ya montado para la pantalla:
 * el ejercicio, sus series de hoy y lo que hiciste la última vez.
 */
export interface SessionExercise {
  exercise: ExerciseRow;
  position: number;
  sets: WorkoutSetRow[];
  /** Objetivo de la rutina, si la sesión viene de una. */
  target: {
    sets: number;
    repsMin: number;
    repsMax: number;
    rir: number | null;
    restSeconds: number;
    notes: string | null;
  } | null;
  /**
   * Lo que se hizo en este ejercicio la última vez, indexado por número
   * de serie. Es la columna "PREVIA": sin ella no sabes con qué peso
   * empezar, y es lo único que convierte un registro en una progresión.
   */
  previous: Map<number, { weightKg: number | null; reps: number | null }>;
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barra: "Barra",
  mancuernas: "Mancuernas",
  polea: "Polea",
  maquina: "Máquina",
  peso_corporal: "Peso corporal",
  kettlebell: "Kettlebell",
  banda: "Banda",
  disco: "Disco",
  multipower: "Multipower",
  otro: "Otro",
};

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  empuje_horizontal: "Empuje horizontal",
  empuje_vertical: "Empuje vertical",
  tiron_horizontal: "Tirón horizontal",
  tiron_vertical: "Tirón vertical",
  dominante_rodilla: "Dominante de rodilla",
  dominante_cadera: "Dominante de cadera",
  aislamiento_brazo: "Aislamiento de brazo",
  aislamiento_hombro: "Aislamiento de hombro",
  aislamiento_pierna: "Aislamiento de pierna",
  core: "Core",
  transporte: "Transporte",
};

export const GOAL_LABELS: Record<RoutineGoal, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Hipertrofia",
  resistencia: "Resistencia",
  mantenimiento: "Mantenimiento",
};

export const SOURCE_LABELS: Record<RoutineSource, string> = {
  manual: "Creada a mano",
  ia_chat: "Creada con la IA",
  ia_foto: "Importada de una foto",
  plantilla: "Desde plantilla",
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  calentamiento: "Calentamiento",
  normal: "Normal",
  dropset: "Dropset",
  backoff: "Backoff",
  fallo: "Al fallo",
};

/**
 * La letra que se enseña en la columna SERIE. El calentamiento sale como
 * "C" y no numerado, porque no cuenta para nada: mezclarlo en la
 * numeración haría que "serie 3" significara cosas distintas según el día.
 */
export function setLabel(set: WorkoutSetRow, ordinalAmongWorking: number): string {
  if (set.set_type === "calentamiento") return "C";
  if (set.set_type === "dropset") return "D";
  return String(ordinalAmongWorking);
}

/**
 * Un ejercicio se registra por tiempo cuando su patrón lo pide (planchas,
 * paseos del granjero, colgarse de la barra). Lo decide el patrón y no una
 * columna aparte para que no puedan contradecirse.
 */
export function isTimeBased(exercise: ExerciseRow): boolean {
  if (exercise.pattern === "transporte") return true;
  // Un ejercicio de core con rango 1-1 es un isométrico: no tiene sentido
  // pedir "1 repetición" de una plancha.
  return exercise.pattern === "core" && exercise.default_reps_max === 1;
}
