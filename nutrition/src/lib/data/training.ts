import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExerciseRow,
  RoutineRow,
  RoutineDayRow,
  RoutineExerciseRow,
  TrainingSessionRow,
  WorkoutSetRow,
  SessionExercise,
} from "@/lib/training/types";
import type { MuscleGroup } from "@/lib/training/muscles";
import { computeWeeklyVolume, type MuscleVolume } from "@/lib/training/volume";
import { computeExerciseRecords, type ExerciseRecords, type CompletedSet } from "@/lib/training/records";

/**
 * Lecturas del apartado de entreno. Todas reciben el cliente de Supabase
 * ya autenticado, igual que `data/nutrition.ts`, y todas confían en RLS
 * para el filtrado por usuario: el `.eq("user_id", ...)` que verás en
 * algunas es para que el índice trabaje, no como control de acceso.
 */

const EXERCISE_COLUMNS =
  "id, user_id, name, name_normalized, primary_muscle, secondary_muscles, equipment, mechanic, pattern, is_unilateral, default_reps_min, default_reps_max, default_rest_seconds, cues, is_active, created_at";

export interface ExerciseFilters {
  query?: string;
  muscle?: MuscleGroup;
  equipment?: string;
  mechanic?: string;
  /** Sólo los que ha creado el usuario. */
  mineOnly?: boolean;
}

/** Minúsculas y sin acentos, igual que el trigger de la base de datos. */
export function normalizeExerciseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function searchExercises(
  supabase: SupabaseClient,
  filters: ExerciseFilters = {},
  limit = 200,
): Promise<ExerciseRow[]> {
  let q = supabase
    .from("exercises")
    .select(EXERCISE_COLUMNS)
    .eq("is_active", true)
    .order("name")
    .limit(limit);

  if (filters.query?.trim()) {
    // `%texto%` en la columna normalizada: el índice de trigramas sirve
    // esta búsqueda aunque el usuario escriba por el medio del nombre
    // ("banca" encuentra "Press de banca con barra").
    q = q.ilike("name_normalized", `%${normalizeExerciseName(filters.query)}%`);
  }
  if (filters.muscle) q = q.eq("primary_muscle", filters.muscle);
  if (filters.equipment) q = q.eq("equipment", filters.equipment);
  if (filters.mechanic) q = q.eq("mechanic", filters.mechanic);
  if (filters.mineOnly) q = q.not("user_id", "is", null);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ExerciseRow[];
}

/**
 * Ejercicios que trabajan un músculo, sea como objetivo o como secundario.
 *
 * Es lo que se abre al tocar un músculo en el mapa corporal, así que tiene
 * que incluir los secundarios: si tocas "tríceps" y sólo te salen
 * extensiones, la app te está escondiendo que el press de banca también
 * cuenta.
 */
export async function getExercisesForMuscle(
  supabase: SupabaseClient,
  muscle: MuscleGroup,
): Promise<{ primary: ExerciseRow[]; secondary: ExerciseRow[] }> {
  const [primaryRes, secondaryRes] = await Promise.all([
    supabase
      .from("exercises")
      .select(EXERCISE_COLUMNS)
      .eq("is_active", true)
      .eq("primary_muscle", muscle)
      .order("name"),
    supabase
      .from("exercises")
      .select(EXERCISE_COLUMNS)
      .eq("is_active", true)
      .contains("secondary_muscles", [muscle])
      .order("name"),
  ]);
  if (primaryRes.error) throw primaryRes.error;
  if (secondaryRes.error) throw secondaryRes.error;
  return {
    primary: (primaryRes.data ?? []) as unknown as ExerciseRow[],
    secondary: (secondaryRes.data ?? []) as unknown as ExerciseRow[],
  };
}

export async function getExercise(
  supabase: SupabaseClient,
  id: string,
): Promise<ExerciseRow | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ExerciseRow) ?? null;
}

export interface RoutineWithDays extends RoutineRow {
  routine_days: (RoutineDayRow & {
    routine_exercises: (RoutineExerciseRow & { exercises: ExerciseRow })[];
  })[];
}

export async function getRoutines(
  supabase: SupabaseClient,
  userId: string,
  { includeArchived = false } = {},
): Promise<RoutineRow[]> {
  let q = supabase
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (!includeArchived) q = q.is("archived_at", null);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RoutineRow[];
}

/**
 * Una rutina entera en una sola consulta anidada.
 *
 * PostgREST resuelve los tres niveles (rutina → días → ejercicios →
 * catálogo) en un solo viaje. Hacerlo con cuatro consultas encadenadas
 * sería el n+1 clásico y se notaría en el móvil con datos.
 */
export async function getRoutineWithDays(
  supabase: SupabaseClient,
  routineId: string,
): Promise<RoutineWithDays | null> {
  const { data, error } = await supabase
    .from("routines")
    .select(
      `*, routine_days(*, routine_exercises(*, exercises(${EXERCISE_COLUMNS})))`,
    )
    .eq("id", routineId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const routine = data as unknown as RoutineWithDays;
  // PostgREST no garantiza el orden de las relaciones anidadas; el orden
  // aquí es parte del significado (día 1, día 2...), así que se ordena.
  routine.routine_days.sort((a, b) => a.position - b.position);
  for (const day of routine.routine_days) {
    day.routine_exercises.sort((a, b) => a.position - b.position);
  }
  return routine;
}

export async function getActiveRoutine(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoutineWithDays | null> {
  const { data, error } = await supabase
    .from("routines")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return getRoutineWithDays(supabase, data.id as string);
}

export async function getOpenSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<TrainingSessionRow | null> {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "en_curso")
    .maybeSingle();
  if (error) throw error;
  return (data as TrainingSessionRow) ?? null;
}

export async function getRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 12,
): Promise<(TrainingSessionRow & { workout_sets: WorkoutSetRow[] })[]> {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*, workout_sets(*)")
    .eq("user_id", userId)
    .neq("status", "en_curso")
    .order("session_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as (TrainingSessionRow & { workout_sets: WorkoutSetRow[] })[];
}

/**
 * Una sesión montada para la pantalla de registro: cada ejercicio con sus
 * series de hoy, su objetivo si viene de una rutina, y lo que se hizo la
 * última vez.
 */
export async function getSessionDetail(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ session: TrainingSessionRow; exercises: SessionExercise[] } | null> {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select(`*, exercises(${EXERCISE_COLUMNS})`)
    .eq("session_id", sessionId)
    .order("exercise_position")
    .order("set_number");
  if (setsError) throw setsError;

  const rows = (sets ?? []) as unknown as (WorkoutSetRow & { exercises: ExerciseRow })[];

  // Objetivos de la rutina, si la sesión salió de un día de rutina.
  const targets = new Map<string, SessionExercise["target"]>();
  if ((session as TrainingSessionRow).routine_day_id) {
    const { data: planned } = await supabase
      .from("routine_exercises")
      .select("*")
      .eq("routine_day_id", (session as TrainingSessionRow).routine_day_id!);
    for (const p of (planned ?? []) as RoutineExerciseRow[]) {
      targets.set(p.exercise_id, {
        sets: p.target_sets,
        repsMin: p.target_reps_min,
        repsMax: p.target_reps_max,
        rir: p.target_rir,
        restSeconds: p.rest_seconds,
        notes: p.notes,
      });
    }
  }

  const byPosition = new Map<number, { exercise: ExerciseRow; sets: WorkoutSetRow[] }>();
  for (const row of rows) {
    const { exercises: exercise, ...set } = row;
    const entry = byPosition.get(set.exercise_position);
    if (entry) entry.sets.push(set as WorkoutSetRow);
    else byPosition.set(set.exercise_position, { exercise, sets: [set as WorkoutSetRow] });
  }

  const exerciseIds = [...new Set(rows.map((r) => r.exercise_id))];
  const previousByExercise = await getPreviousPerformance(
    supabase,
    exerciseIds,
    sessionId,
  );

  const exercises: SessionExercise[] = [...byPosition.entries()]
    .sort(([a], [b]) => a - b)
    .map(([position, { exercise, sets: exerciseSets }]) => ({
      exercise,
      position,
      sets: exerciseSets,
      target: targets.get(exercise.id) ?? null,
      previous: previousByExercise.get(exercise.id) ?? new Map(),
    }));

  return { session: session as TrainingSessionRow, exercises };
}

/**
 * La columna "PREVIA": qué se hizo en cada serie de cada ejercicio la
 * última vez que se entrenó.
 *
 * "La última vez" es la sesión completada más reciente en la que aparece
 * ese ejercicio — no la media, ni la mejor. Lo que quieres ver al ir a
 * cargar la barra es con cuánto la cargaste el otro día.
 *
 * Se excluye la sesión actual para que las series que acabas de meter hoy
 * no se enseñen como "previa" de sí mismas.
 */
async function getPreviousPerformance(
  supabase: SupabaseClient,
  exerciseIds: string[],
  excludeSessionId: string,
): Promise<Map<string, Map<number, { weightKg: number | null; reps: number | null }>>> {
  const result = new Map<string, Map<number, { weightKg: number | null; reps: number | null }>>();
  if (exerciseIds.length === 0) return result;

  // Una sola consulta para todos los ejercicios; se agrupa en memoria.
  // El límite es generoso porque hay que llegar hasta la sesión anterior
  // de cada ejercicio, que puede estar a varias sesiones de distancia.
  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, session_id, set_number, weight_kg, reps, completed_at, set_type")
    .in("exercise_id", exerciseIds)
    .neq("session_id", excludeSessionId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(600);
  if (error) throw error;

  const lastSessionPerExercise = new Map<string, string>();
  for (const row of (data ?? []) as {
    exercise_id: string;
    session_id: string;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    set_type: string;
  }[]) {
    if (row.set_type === "calentamiento") continue;

    const known = lastSessionPerExercise.get(row.exercise_id);
    if (known === undefined) lastSessionPerExercise.set(row.exercise_id, row.session_id);
    else if (known !== row.session_id) continue; // ya vamos por sesiones más viejas

    let perSet = result.get(row.exercise_id);
    if (!perSet) {
      perSet = new Map();
      result.set(row.exercise_id, perSet);
    }
    if (!perSet.has(row.set_number)) {
      perSet.set(row.set_number, { weightKg: row.weight_kg, reps: row.reps });
    }
  }

  return result;
}

/**
 * Volumen semanal por músculo entre dos fechas.
 *
 * Trae las series con el ejercicio anidado para saber a qué músculos van,
 * y delega el reparto en `computeWeeklyVolume` — que es donde están
 * escritas y probadas las reglas (media serie para los secundarios, el
 * calentamiento no cuenta).
 */
export async function getVolumeBetween(
  supabase: SupabaseClient,
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<MuscleVolume[]> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("set_type, exercises!inner(primary_muscle, secondary_muscles), training_sessions!inner(user_id)")
    .eq("training_sessions.user_id", userId)
    .not("completed_at", "is", null)
    .gte("completed_at", fromIso)
    .lte("completed_at", toIso);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    set_type: string;
    exercises: { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[] };
  }[];

  return computeWeeklyVolume(
    rows.map((r) => ({
      setType: r.set_type,
      primaryMuscle: r.exercises.primary_muscle,
      secondaryMuscles: r.exercises.secondary_muscles ?? [],
    })),
  );
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  date: string;
  sets: WorkoutSetRow[];
}

/**
 * El historial completo de un ejercicio, agrupado por sesión, más sus
 * récords. Es la pantalla que responde a "¿cuánto movía hace tres meses?".
 */
export async function getExerciseHistory(
  supabase: SupabaseClient,
  exerciseId: string,
  limitSessions = 60,
): Promise<{ history: ExerciseHistoryEntry[]; records: ExerciseRecords }> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*, training_sessions!inner(id, session_date, status)")
    .eq("exercise_id", exerciseId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limitSessions * 12);
  if (error) throw error;

  const rows = (data ?? []) as unknown as (WorkoutSetRow & {
    training_sessions: { id: string; session_date: string; status: string };
  })[];

  const bySession = new Map<string, ExerciseHistoryEntry>();
  const completed: CompletedSet[] = [];

  for (const row of rows) {
    const { training_sessions: session, ...set } = row;
    let entry = bySession.get(session.id);
    if (!entry) {
      entry = { sessionId: session.id, date: session.session_date, sets: [] };
      bySession.set(session.id, entry);
    }
    entry.sets.push(set as WorkoutSetRow);

    completed.push({
      id: set.id,
      weightKg: set.weight_kg,
      reps: set.reps,
      durationSeconds: set.duration_seconds,
      setType: set.set_type,
      completedAt: set.completed_at!,
      sessionId: session.id,
    });
  }

  const history = [...bySession.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitSessions);
  for (const entry of history) entry.sets.sort((a, b) => a.set_number - b.set_number);

  return { history, records: computeExerciseRecords(completed) };
}

/** Las series completadas de un ejercicio, para detectar récords nuevos. */
export async function getCompletedSetsForExercise(
  supabase: SupabaseClient,
  exerciseId: string,
  excludeSetId?: string,
): Promise<CompletedSet[]> {
  let q = supabase
    .from("workout_sets")
    .select("id, weight_kg, reps, duration_seconds, set_type, completed_at, session_id")
    .eq("exercise_id", exerciseId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(800);
  if (excludeSetId) q = q.neq("id", excludeSetId);

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as {
    id: string;
    weight_kg: number | null;
    reps: number | null;
    duration_seconds: number | null;
    set_type: string;
    completed_at: string;
    session_id: string;
  }[]).map((r) => ({
    id: r.id,
    weightKg: r.weight_kg,
    reps: r.reps,
    durationSeconds: r.duration_seconds,
    setType: r.set_type,
    completedAt: r.completed_at,
    sessionId: r.session_id,
  }));
}
