import type { MuscleGroup } from "./muscles";
import type { FuenteDelRango, PreviousSet, Recomendacion } from "./progression";
import type { Prescripcion } from "./prescripcion";

export type { PreviousSet };

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
  /**
   * Qué se apunta de cada serie. Son tres interruptores independientes
   * porque se combinan: un paseo del granjero es peso Y tiempo, una
   * plancha sólo tiempo, un press peso y repeticiones.
   */
  tracks_weight: boolean;
  tracks_reps: boolean;
  tracks_duration: boolean;
  default_reps_min: number;
  default_reps_max: number;
  /** Rango por defecto en SEGUNDOS. Nulo si no se mide por tiempo. */
  default_duration_min: number | null;
  default_duration_max: number | null;
  default_rest_seconds: number;
  /** El recordatorio corto, para leer entre series. */
  cues: string | null;
  /**
   * Los pasos, en orden, para alguien que no ha hecho nunca el
   * ejercicio. Una línea por paso; la pantalla los numera. Es distinto
   * de `cues` porque un consejo no es una instrucción: "tumbado a lo
   * ancho del banco" sólo sirve si ya sabes qué es un pullover.
   */
  how_to: string | null;
  /** Fallos concretos de este ejercicio. Una línea por fallo. */
  mistakes: string | null;
  /**
   * Va en el apartado "Más comunes" del selector. Es una lista curada,
   * no una medida de uso: no hay datos de lo que usan otros usuarios
   * (RLS) y un ranking inventado sería un dato falso (regla 11).
   */
  is_common: boolean;
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
  /**
   * Objetivo en SEGUNDOS por serie. Nulo en casi todos: sólo lo usan los
   * ejercicios con `tracks_duration`. Cuál de los dos pares manda no lo
   * decide la rutina, lo decide el ejercicio (migración 0022).
   */
  target_duration_min: number | null;
  target_duration_max: number | null;
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
    /** En segundos, si la rutina pauta tiempo en este ejercicio. */
    durationMin: number | null;
    durationMax: number | null;
    rir: number | null;
    restSeconds: number;
    notes: string | null;
  } | null;
  /**
   * Lo que se hizo en este ejercicio la última vez, indexado por número
   * de serie. Es la columna "PREVIA": sin ella no sabes con qué peso
   * empezar, y es lo único que convierte un registro en una progresión.
   */
  previous: Map<number, PreviousSet>;
  /**
   * El rango de repeticiones que toca en ESTE ejercicio para tu objetivo,
   * con su explicación. Sale de `prescribirRango`, que mira el músculo,
   * el tipo de ejercicio, el material y si estás en déficit.
   */
  prescripcion: Prescripcion;
  /**
   * Si el rango con el que se ha juzgado la sesión es el de tu rutina o
   * el que toca por objetivo. `"objetivo"` significa que la app ha
   * corregido tu rutina porque se alejaba de verdad, y hay que decirlo.
   */
  fuenteDelRango: FuenteDelRango;
  /**
   * Qué peso y qué repeticiones tocan hoy, y por qué. Sale de
   * `recomendarCarga` (`src/lib/training/progression.ts`) leyendo
   * `previous` y el rango resuelto: nunca de la IA, para que la
   * explicación sea siempre la razón real (regla 9).
   */
  recomendacion: Recomendacion;
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

/**
 * Qué persigues entrenando. Es tuyo, no de una rutina concreta: si
 * cambias de rutina el objetivo sigue siendo el mismo.
 *
 * Se guardan VARIOS y en orden — "fuerza y volumen" es una respuesta
 * legítima y obligar a elegir uno falsearía el objetivo. El primero es
 * el principal y es el que manda cuando dos focos pedirían rangos de
 * repeticiones distintos.
 */
export type TrainingFocus =
  | "fuerza"
  | "hipertrofia"
  | "resistencia"
  | "mantenimiento"
  | "salud";

export const TRAINING_FOCUS: TrainingFocus[] = [
  "fuerza",
  "hipertrofia",
  "resistencia",
  "mantenimiento",
  "salud",
];

export const TRAINING_FOCUS_LABELS: Record<TrainingFocus, string> = {
  fuerza: "Ganar fuerza",
  hipertrofia: "Ganar volumen muscular",
  resistencia: "Ganar resistencia",
  mantenimiento: "Mantener lo que tengo",
  salud: "Moverme y estar bien",
};

/** Qué significa cada foco en la práctica, para no elegir a ciegas. */
export const TRAINING_FOCUS_HINTS: Record<TrainingFocus, string> = {
  fuerza: "Mover más peso. Series cortas y pesadas.",
  hipertrofia: "Más músculo. El rango clásico de repeticiones medias.",
  resistencia: "Aguantar más. Series largas con menos peso.",
  mantenimiento: "Conservar lo que ya tienes sin forzar la progresión.",
  salud: "Entrenar por moverte, sin una cifra que perseguir.",
};

export interface TrainingGoalRow {
  id: string;
  user_id: string;
  /** En orden: el primero es el principal. */
  focus: TrainingFocus[];
  /** Con tus palabras. Contexto para el coach, no para el algoritmo. */
  notes: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

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
 * La etiqueta de la columna SERIE para cada serie de un ejercicio.
 *
 * Las series de trabajo se numeran 1, 2, 3… y el calentamiento sale como
 * "C" sin numerar: si el calentamiento entrara en la cuenta, "la tercera
 * serie" significaría cosas distintas según cuántas de aproximación
 * hicieras ese día, y comparar entre sesiones dejaría de tener sentido.
 * El dropset sale como "D" por la misma razón — es un añadido a la serie
 * anterior, no una serie más.
 *
 * Devuelve un Map en vez de calcularse mientras se pinta cada fila: un
 * contador que se incrementa dentro del render es exactamente el patrón
 * que React rompe al re-renderizar a medias.
 */
export function numberWorkingSets(sets: WorkoutSetRow[]): Map<string, string> {
  const labels = new Map<string, string>();
  let working = 0;
  for (const set of sets) {
    if (set.set_type === "calentamiento") {
      labels.set(set.id, "C");
      continue;
    }
    working += 1;
    labels.set(set.id, set.set_type === "dropset" ? "D" : String(working));
  }
  return labels;
}

/** Qué columnas tiene que enseñar el registro de un ejercicio. */
export interface Medicion {
  peso: boolean;
  reps: boolean;
  tiempo: boolean;
}

/**
 * Qué mide este ejercicio.
 *
 * Antes esto se DEDUCÍA del patrón de movimiento: `transporte` valía por
 * "esto va por tiempo" y la pantalla escondía la columna de peso. Con eso,
 * un paseo del granjero —que es peso Y tiempo— no tenía dónde apuntar los
 * kilos y el dato se perdía. Deducirlo nunca podía salir bien: el patrón
 * dice cómo se mueve el cuerpo, no qué se apunta.
 *
 * Ahora lo declara cada ejercicio (migración 0008) y esta función sólo lo
 * lee.
 */
export function medicionDe(exercise: ExerciseRow): Medicion {
  return {
    peso: exercise.tracks_weight,
    reps: exercise.tracks_reps,
    tiempo: exercise.tracks_duration,
  };
}

/** Lo que pauta la rutina para un ejercicio, si viene de una. */
export interface ObjetivoDeRutina {
  repsMin: number;
  repsMax: number;
  durationMin: number | null;
  durationMax: number | null;
}

/**
 * El rango pautado y su unidad, para poder escribirlo en pantalla.
 *
 * Quién decide la unidad es el EJERCICIO, no la rutina: un ejercicio que
 * sólo mide tiempo se pauta en segundos aunque su fila de rutina tenga
 * `target_reps_min/max` a 1-1 (lo tienen, porque esas columnas son NOT
 * NULL — ver la migración 0022). Enseñar "1-1 reps" en una plancha era
 * justo el texto sin sentido que motivó todo esto.
 *
 * Con `target` gana lo que el usuario puso en su rutina; sin él, el
 * rango por defecto del ejercicio.
 */
export function rangoDeMedicion(
  exercise: ExerciseRow,
  target?: ObjetivoDeRutina | null,
): {
  min: number;
  max: number;
  unidad: "reps" | "s";
} {
  if (exercise.tracks_duration && !exercise.tracks_reps) {
    return {
      min: target?.durationMin ?? exercise.default_duration_min ?? 30,
      max: target?.durationMax ?? exercise.default_duration_max ?? 60,
      unidad: "s",
    };
  }
  return {
    min: target?.repsMin ?? exercise.default_reps_min,
    max: target?.repsMax ?? exercise.default_reps_max,
    unidad: "reps",
  };
}
